-- =====================================================================
-- Casai · 0013_worker_confirmation
-- The pre-slot "are you coming?" checkpoint (AI-02, lead-time layer)
--
-- Waiting until the slot to notice a no-show is too late — the backup can't
-- travel in time. This adds an earlier signal: the assigned worker is asked
-- to confirm attendance ahead of the slot. What the worker does with it
-- feeds the SAME arm decision the no-show loop already makes:
--
--   confirmed  → they're coming; no backup needed
--   declined   → an honest early out → arm a backup NOW (full lead time)
--   no answer  → silence is a risk → the checkpoint expires it and arms one
--
-- To let both the household's arrange_backup AND a worker's decline reserve
-- a backup, the reservation logic is lifted out of arrange_backup (0012)
-- into _reserve_backup(); arrange_backup now guards then delegates. Worker
-- writes go through confirm_booking(), gated to the assigned worker.
--
-- Prototype honesty: no push/SMS yet (the worker sees an in-app card when
-- they open the app); no cron, so the timeout is applied by
-- run_confirm_checkpoint() (a demo stand-in for the T-45 background job).
-- Idempotent.
-- =====================================================================

-- ---------- columns ----------

alter table booking
  add column if not exists confirm_status text
    check (confirm_status in ('pending', 'confirmed', 'declined', 'expired'))
    default 'pending',
  add column if not exists confirm_responded_at timestamptz;

comment on column booking.confirm_status is
  'Pre-slot attendance check. pending until the worker answers; declined or '
  'expired arms a backup early via _reserve_backup().';

-- ---------- reservation, lifted out of arrange_backup ----------

-- The pure "reserve the best free backup" step, with NO ownership guard —
-- callers guard. Same rule as 0012: a live worker of the same category, not
-- the assigned one, free within 2h of the slot, best reliability first.
create or replace function _reserve_backup(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b record; pick text;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then return null; end if;

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

-- arrange_backup keeps its household/ops guard, then delegates.
create or replace function arrange_backup(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare hh uuid;
begin
  select household_id into hh from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if not (hh = app_household_id() or app_role() = 'ops') then
    raise exception 'not authorised for booking %', p_booking_id;
  end if;
  return _reserve_backup(p_booking_id);
end;
$$;

-- ---------- the worker's answer ----------

-- The assigned worker confirms or declines. A decline is the best signal we
-- can get — it buys full lead time — so it arms a backup immediately.
create or replace function confirm_booking(p_booking_id uuid, p_coming boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b record; new_status text;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if b.worker_id is distinct from app_worker_id() then
    raise exception 'not your booking';
  end if;

  new_status := case when p_coming then 'confirmed' else 'declined' end;
  update booking
    set confirm_status = new_status, confirm_responded_at = now()
  where booking_id = p_booking_id;

  if not p_coming then
    perform _reserve_backup(p_booking_id);  -- honest early out → arm now
  end if;
  return new_status;
end;
$$;

-- ---------- the timeout (stand-in for the T-45 cron) ----------

-- If the worker still hasn't answered once the slot is inside the cutoff
-- (slot − 45 min), silence is treated as a risk: mark expired and arm a
-- backup. Guarded to the owning household (or ops). Before the cutoff it is
-- a no-op and the booking stays pending.
create or replace function run_confirm_checkpoint(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b record;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then raise exception 'booking % not found', p_booking_id; end if;
  if not (b.household_id = app_household_id() or app_role() = 'ops') then
    raise exception 'not authorised for booking %', p_booking_id;
  end if;

  if b.confirm_status = 'pending' and now() >= b.slot_datetime - interval '45 minutes' then
    update booking set confirm_status = 'expired' where booking_id = p_booking_id;
    perform _reserve_backup(p_booking_id);
    return 'expired';
  end if;
  return b.confirm_status;
end;
$$;

-- ---------- grants ----------

grant execute on function _reserve_backup(uuid)            to authenticated;
grant execute on function confirm_booking(uuid, boolean)   to authenticated;
grant execute on function run_confirm_checkpoint(uuid)     to authenticated;
