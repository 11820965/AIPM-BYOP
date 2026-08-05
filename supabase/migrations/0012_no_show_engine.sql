-- =====================================================================
-- Casai · 0012_no_show_engine
-- The no-show loop, made real (AI-02, prototype tier)
--
-- The insights screen scored bookings with a client-side stand-in. This
-- moves the loop into the database, where it can be trusted and acted on:
--
--   1. SCORE   every booking is scored at insert from REAL signals — the
--              assigned worker's reliability + track record, how imminent
--              the slot is, weekend vs weekday. A heuristic, not a trained
--              model (there is no booking history to learn from yet), but
--              a real number persisted on the row, not a UI guess.
--   2. ESCALATE arrange_backup() reserves a real second worker — the best
--              live pro of the same category who is actually free at that
--              slot — and records them as backup_worker_id. This is the
--              "standby before the slot" step, now an actual row.
--   3. RESOLVE  resolve_no_show() closes the loop: a check-in releases the
--              backup; a no-show promotes the standby into the slot
--              (status → replaced) or, if none was free, marks no_show.
--
-- What stays honest about the prototype: scoring is a heuristic; the
-- re-score/escalation cadence (a 15-min background job in production) is
-- triggered from the UI here; there is no push/SMS pipeline — the loop is
-- visible in-app.
--
-- All writes go through SECURITY DEFINER functions that check the caller
-- owns the booking (or is ops), because households have no UPDATE policy on
-- booking — the same "the database is the last line of defence" posture as
-- the rest of the schema. Idempotent.
-- =====================================================================

-- ---------- columns ----------

alter table booking
  add column if not exists no_show_risk_score numeric(4,3)
    check (no_show_risk_score between 0 and 1),
  add column if not exists risk_band text
    check (risk_band in ('low', 'med', 'high')),
  add column if not exists backup_worker_id text references worker (worker_id),
  add column if not exists risk_scored_at timestamptz;

comment on column booking.no_show_risk_score is
  'Heuristic 0–1 chance the assigned worker no-shows. Set at insert by '
  'booking_autoscore; re-computable via score_booking(). Not a trained model.';
comment on column booking.backup_worker_id is
  'Standby worker reserved by arrange_backup when risk is high. Promoted '
  'into worker_id by resolve_no_show if the primary never checks in.';

-- ---------- scoring ----------

-- Band thresholds mirror the client stand-in they replace, so the UI reads
-- the same whether a row was scored here or (for legacy rows) client-side.
create or replace function _risk_band(p_score numeric)
returns text
language sql
immutable
as $$
  select case
    when p_score > 0.70 then 'high'
    when p_score >= 0.25 then 'med'
    else 'low'
  end;
$$;

-- SECURITY DEFINER: reads the worker base table (reliability + jobs), which
-- households cannot read directly (they see worker_public). Returns only a
-- number — no worker financials leak through it.
create or replace function _booking_risk(p_worker_id text, p_slot timestamptz)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  w           record;
  base        numeric;
  hours_until numeric;
begin
  select reliability_score, jobs_completed
    into w
  from worker
  where worker_id = p_worker_id;

  -- A 0.97-reliable worker starts at 0.03; an unknown/new one at a wary 0.35.
  base := coalesce(1 - w.reliability_score, 0.35);
  -- Thin track record — less certainty they turn up.
  if coalesce(w.jobs_completed, 0) < 20 then base := base + 0.15; end if;
  -- Imminent slots carry more risk (no time to recover a silent worker).
  hours_until := extract(epoch from (p_slot - now())) / 3600.0;
  if hours_until >= 0 and hours_until < 3 then base := base + 0.10; end if;
  -- Weekend absenteeism runs higher.
  if extract(dow from p_slot) in (0, 6) then base := base + 0.05; end if;

  return round(greatest(0.05, least(0.95, base)), 3);
end;
$$;

-- Score every booking as it is created. BEFORE INSERT so the score lands on
-- the row itself (RETURNING sees it) with no second write and no RLS dance.
create or replace function booking_autoscore()
returns trigger
language plpgsql
as $$
declare s numeric;
begin
  s := _booking_risk(new.worker_id, new.slot_datetime);
  new.no_show_risk_score := s;
  new.risk_band          := _risk_band(s);
  new.risk_scored_at      := now();
  return new;
end;
$$;

drop trigger if exists booking_autoscore_ins on booking;
create trigger booking_autoscore_ins
  before insert on booking
  for each row execute function booking_autoscore();

-- Manual re-score (the UI's "re-score" action; stands in for the 15-min job).
create or replace function score_booking(p_booking_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare b record; s numeric;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if not (b.household_id = app_household_id() or app_role() = 'ops') then
    raise exception 'not authorised for booking %', p_booking_id;
  end if;

  s := _booking_risk(b.worker_id, b.slot_datetime);
  update booking
    set no_show_risk_score = s, risk_band = _risk_band(s), risk_scored_at = now()
  where booking_id = p_booking_id;
  return s;
end;
$$;

-- ---------- escalation ----------

-- Reserve a standby: the best live worker of the same category who is NOT
-- the assigned one and is actually free at the slot (same 2-hour conflict
-- window as available_workers). Returns the chosen worker_id, or null if
-- no one is free — the honest "nobody available" case the UI must handle.
create or replace function arrange_backup(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b record; pick text;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if not (b.household_id = app_household_id() or app_role() = 'ops') then
    raise exception 'not authorised for booking %', p_booking_id;
  end if;

  select w.worker_id
    into pick
  from worker w
  where w.service_category = b.service_category
    and w.is_live
    and w.worker_id <> b.worker_id
    and not exists (
      select 1 from booking bk
      where bk.worker_id = w.worker_id
        and bk.status in ('confirmed', 'in_progress')
        and abs(extract(epoch from (bk.slot_datetime - b.slot_datetime))) < 7200
    )
  order by w.reliability_score desc nulls last, w.rating desc nulls last
  limit 1;

  update booking set backup_worker_id = pick where booking_id = p_booking_id;
  return pick;
end;
$$;

-- ---------- resolve ----------

-- Close the loop at (or after) the slot.
--   checked_in = true  → primary arrived: stamp check-in, release the backup.
--   checked_in = false → primary is a no-show:
--        backup reserved  → promote them (status = replaced, they become the
--                           worker_id; the live-worker trigger re-validates).
--        no backup        → status = no_show, sla_breach = true.
create or replace function resolve_no_show(p_booking_id uuid, p_checked_in boolean)
returns booking_status
language plpgsql
security definer
set search_path = public
as $$
declare b record; new_status booking_status;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if not (b.household_id = app_household_id() or app_role() = 'ops') then
    raise exception 'not authorised for booking %', p_booking_id;
  end if;

  if p_checked_in then
    update booking
      set gps_checkin_time = now(), status = 'in_progress', backup_worker_id = null
    where booking_id = p_booking_id
    returning status into new_status;
  elsif b.backup_worker_id is not null then
    update booking
      set worker_id = b.backup_worker_id, backup_worker_id = null, status = 'replaced'
    where booking_id = p_booking_id
    returning status into new_status;
  else
    update booking
      set status = 'no_show', sla_breach = true
    where booking_id = p_booking_id
    returning status into new_status;
  end if;

  return new_status;
end;
$$;

-- ---------- grants ----------

grant execute on function _risk_band(numeric)                     to authenticated;
grant execute on function _booking_risk(text, timestamptz)        to authenticated;
grant execute on function score_booking(uuid)                     to authenticated;
grant execute on function arrange_backup(uuid)                    to authenticated;
grant execute on function resolve_no_show(uuid, boolean)          to authenticated;
