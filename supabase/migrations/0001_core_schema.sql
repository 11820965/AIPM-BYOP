-- =====================================================================
-- Casai · 0001_core_schema
-- Phase P0 · slice 0.2 — core relational schema
--
-- Design notes (see SAD §09 Data architecture):
--   * Money is stored in MINOR units (paise / cents) as integers.
--     Never floats — this is booking money and worker payouts.
--   * `worker` is the SINGLE OWNER of worker stats. No other table or
--     surface may store or recompute jobs / rating / reliability.
--     This is the fix for the prototype's 312 / 347 / 412 divergence.
--   * `service_catalog` / `plan_catalog` are the SINGLE SOURCE for price
--     (ADR-04). No screen hard-codes a price. This kills ₹199 vs ₹220.
--   * `churn_score` is ops-only. It has NO household policy in 0002 —
--     that absence is the fix for the consumer-facing ops leak.
-- =====================================================================

-- ---------- enums ----------

create type user_role as enum ('household', 'worker', 'nri', 'ops');

-- 'caregiver' is the elder-care category that lives in the NRI context.
-- The household contexts sells cook/maid/driver only (matches live app).
create type service_category as enum ('cook', 'maid', 'driver', 'caregiver');

create type verification_status as enum ('pending', 'verified', 'failed');

create type booking_status as enum (
  'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'replaced'
);

-- ---------- identity ----------

-- Links a Supabase auth user to exactly one bounded context.
-- This is the server-side context claim that replaces the prototype's
-- localStorage `gharseva.state.role` string.
create table profile (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          user_role   not null,
  display_name  text        not null,
  created_at    timestamptz not null default now()
);

comment on table profile is
  'Server-owned role/context. Never trust a client-supplied role.';

-- ---------- catalog (single source of truth for price) ----------

create table service_catalog (
  category      service_category primary key,
  display_name  text        not null,
  price_minor   integer     not null check (price_minor > 0),
  currency      char(3)     not null default 'INR',
  unit          text        not null check (unit in ('hour', 'day', 'visit')),
  min_units     numeric(3,1) not null default 1,
  active        boolean     not null default true
);

comment on table service_catalog is
  'The only place a service price exists. Clients read; never hard-code.';

create table plan_catalog (
  code          text        primary key,
  display_name  text        not null,
  price_minor   integer     not null check (price_minor >= 0),
  currency      char(3)     not null,
  audience      user_role   not null,
  active        boolean     not null default true
);

comment on table plan_catalog is
  'Household plans bill in INR; NRI Care+ bills in USD. Currency is per-row '
  'because the ₹/$ split is a product fact (ADR-08).';

-- ---------- household ----------

create table household (
  household_id  uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references profile (id) on delete cascade,
  name          text not null,
  zone          text not null,
  plan_code     text not null default 'free' references plan_catalog (code),
  created_at    timestamptz not null default now()
);

create index household_zone_idx on household (zone);

-- ---------- worker ----------

create table worker (
  worker_id             text primary key,  -- GS-WK-XXXX, printed on the passport
  profile_id            uuid unique references profile (id) on delete set null,
  full_name             text not null,
  service_category      service_category not null,
  zone                  text not null,

  -- verification: both must pass before a worker is bookable
  ekyc_status           verification_status not null default 'pending',
  police_check_status   verification_status not null default 'pending',

  -- canonical stats — SINGLE SOURCE. Nothing else may store these.
  jobs_completed        integer not null default 0 check (jobs_completed >= 0),
  rating                numeric(2,1) check (rating between 1.0 and 5.0),
  reliability_score     numeric(4,3) check (reliability_score between 0 and 1),
  trust_score           integer check (trust_score between 0 and 100),
  experience_years      integer check (experience_years >= 0),

  -- worker-scoped financial data. NEVER exposed to households.
  -- (The prototype leaked this on a household-reachable /app/passport.)
  credit_score          integer check (credit_score between 300 and 900),
  earnings_month_minor  integer not null default 0,

  -- Structural enforcement of "bookings only when verified" (PRD).
  -- A worker cannot be made bookable by application code forgetting a check.
  is_live boolean generated always as (
    ekyc_status = 'verified' and police_check_status = 'verified'
  ) stored,

  created_at            timestamptz not null default now()
);

create index worker_zone_category_idx on worker (zone, service_category) where is_live;

comment on column worker.is_live is
  'Generated: verified eKYC AND police check. The booking FK trigger depends on it.';
comment on column worker.credit_score is
  'Worker-scoped only. Gated on canonical stats before any NBFC use (SAD §09).';

-- ---------- booking ----------

create table booking (
  booking_id        uuid primary key default gen_random_uuid(),
  household_id      uuid not null references household (household_id) on delete cascade,
  worker_id         text not null references worker (worker_id),
  service_category  service_category not null,
  slot_datetime     timestamptz not null,
  duration_hours    numeric(3,1) not null default 2 check (duration_hours between 1 and 8),
  status            booking_status not null default 'confirmed',

  -- null until the worker physically arrives; drives reliability + the NRI alert
  gps_checkin_time  timestamptz,

  sla_breach        boolean not null default false,
  total_amount_minor integer not null check (total_amount_minor >= 0),
  currency          char(3) not null default 'INR',
  created_at        timestamptz not null default now()
);

create index booking_household_idx on booking (household_id, slot_datetime desc);
create index booking_worker_idx    on booking (worker_id, slot_datetime desc);

-- A booking may only ever reference a verified, live worker.
create or replace function assert_worker_is_live()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from worker w where w.worker_id = new.worker_id and w.is_live) then
    raise exception 'worker % is not verified/live and cannot be booked', new.worker_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger booking_requires_live_worker
  before insert or update of worker_id on booking
  for each row execute function assert_worker_is_live();

-- ---------- NRI linking ----------

create table nri_link (
  link_id       uuid primary key default gen_random_uuid(),
  nri_profile   uuid not null references profile (id) on delete cascade,
  household_id  uuid not null references household (household_id) on delete cascade,
  -- consent code generated by the PARENTS' household; both sides opt in
  consent_code  text,
  linked_at     timestamptz,
  expires_at    timestamptz,
  -- IANA zone of the NRI, e.g. 'Europe/London'. Resolved from profile, never
  -- hard-coded — this is the fix for the live app showing PST for a UK signup.
  nri_timezone  text not null default 'UTC',
  unique (nri_profile, household_id)
);

comment on column nri_link.nri_timezone is
  'Delivery timezone for dual-timestamp alerts. Prototype hard-coded PST — bug.';

-- ---------- ops-only ----------

-- Deliberately has NO household RLS policy in 0002.
create table churn_score (
  household_id  uuid primary key references household (household_id) on delete cascade,
  score         integer not null check (score between 0 and 100),
  computed_at   timestamptz not null default now()
);

comment on table churn_score is
  'OPS ONLY. The prototype rendered this to households on /app and '
  '/app/insights. There is intentionally no household policy.';
