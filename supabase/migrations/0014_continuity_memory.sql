-- =====================================================================
-- Casai · 0014_continuity_memory
-- Continuity Memory v0 — "know before you go" (differentiator)
--
-- The point: whoever is assigned — the regular worker OR a promoted backup
-- — should arrive already knowing the home. A household records its context
-- once (dietary rules, entry instructions, routines, do's and don'ts); the
-- assigned worker sees a brief for THAT home, scoped to their booking.
--
-- v0 is deliberately rule-based, not an LLM: the household's structured
-- fields are surfaced as a readable card. Honest — no AI is pretending to
-- run. v1 swaps in Claude to turn messy free-text + past notes into natural
-- prose, behind the SAME function contract (booking_home_brief).
--
-- Privacy is the hard part and it lives in the database:
--   * household_preferences is readable/writable ONLY by the owning
--     household (and readable by ops for support) — a worker can never read
--     the raw table, so entry codes don't leak to every worker.
--   * booking_home_brief() is SECURITY DEFINER and returns a home's brief
--     only to the worker actually assigned to that booking (primary OR
--     backup), the owning household, or ops. Same trust-projection pattern
--     as worker_public / available_workers.
--
-- Depends on 0012 (backup_worker_id). Idempotent.
-- =====================================================================

create table if not exists household_preferences (
  household_id  uuid primary key references household (household_id) on delete cascade,
  dietary       text,   -- e.g. "Jain kitchen — no onion or garlic"
  access        text,   -- entry / gate instructions (sensitive — worker-scoped only)
  routines      text,   -- e.g. "Father takes BP meds at 8am; dog walked before 9"
  preferences   text,   -- do's and don'ts / how the home likes things done
  notes         text,   -- anything else
  updated_at    timestamptz not null default now()
);

comment on table household_preferences is
  'Continuity Memory: a home''s standing context. Never worker-readable '
  'directly; surfaced per-booking through booking_home_brief().';
comment on column household_preferences.access is
  'Entry/gate instructions. Sensitive — exposed only to the worker assigned '
  'to a live booking for this home, via the brief function.';

alter table household_preferences enable row level security;

-- The owning household reads and writes its own row; ops can read for support.
drop policy if exists hp_owner_all on household_preferences;
create policy hp_owner_all on household_preferences
  for all using (household_id = app_household_id())
  with check (household_id = app_household_id());

drop policy if exists hp_ops_read on household_preferences;
create policy hp_ops_read on household_preferences
  for select using (app_role() = 'ops');

grant select, insert, update on household_preferences to authenticated;

-- ---------- the household saves its context (upsert on its own row) ----------

create or replace function save_home_preferences(
  p_dietary text, p_access text, p_routines text, p_preferences text, p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare hh uuid;
begin
  hh := app_household_id();
  if hh is null then raise exception 'no household for this account'; end if;

  insert into household_preferences (household_id, dietary, access, routines, preferences, notes, updated_at)
  values (hh, p_dietary, p_access, p_routines, p_preferences, p_notes, now())
  on conflict (household_id) do update set
    dietary = excluded.dietary, access = excluded.access, routines = excluded.routines,
    preferences = excluded.preferences, notes = excluded.notes, updated_at = now();
end;
$$;

-- ---------- the worker's brief for a specific booking ----------

-- Returns the home's brief for one booking, but only to someone entitled to
-- see it: the assigned worker, the reserved backup worker, the owning
-- household, or ops. A worker therefore sees entry instructions only for a
-- home they are actually going to.
create or replace function booking_home_brief(p_booking_id uuid)
returns table (
  household_name text,
  dietary        text,
  access         text,
  routines       text,
  preferences    text,
  notes          text,
  booking_notes  text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare b record;
begin
  select * into b from booking where booking_id = p_booking_id;
  if not found then return; end if;

  -- coalesce each term to false: a NULL comparison (e.g. no backup reserved,
  -- or a household caller with no worker id) must read as "not a match", not
  -- leave the OR as NULL — otherwise `not (NULL)` is NULL and the guard fails
  -- open, handing the home's entry code to anyone.
  if not (
    coalesce(b.worker_id = app_worker_id(), false)
    or coalesce(b.backup_worker_id = app_worker_id(), false)
    or coalesce(b.household_id = app_household_id(), false)
    or coalesce(app_role() = 'ops', false)
  ) then
    raise exception 'not authorised for this home brief';
  end if;

  return query
    select h.name, hp.dietary, hp.access, hp.routines, hp.preferences, hp.notes, b.notes
    from household h
    left join household_preferences hp on hp.household_id = h.household_id
    where h.household_id = b.household_id;
end;
$$;

grant execute on function save_home_preferences(text, text, text, text, text) to authenticated;
grant execute on function booking_home_brief(uuid)                            to authenticated;
