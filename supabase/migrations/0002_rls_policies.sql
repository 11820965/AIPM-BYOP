-- =====================================================================
-- Casai · 0002_rls_policies
-- Phase P0 · slice 0.3 — bounded-context boundaries, enforced by Postgres
--
-- This migration IS the authorization layer (SAD §07, §12).
-- In the prototype, context was `localStorage.gharseva.state.role` — a
-- string anyone could edit to reach any context. Here the boundary lives
-- in the database, so a tampered client changes nothing.
--
-- Rule: deny by default. A context gets a policy only where it has a
-- legitimate need. `churn_score` has no household policy ON PURPOSE.
-- =====================================================================

alter table profile         enable row level security;
alter table household       enable row level security;
alter table worker          enable row level security;
alter table booking         enable row level security;
alter table nri_link        enable row level security;
alter table churn_score     enable row level security;
alter table service_catalog enable row level security;
alter table plan_catalog    enable row level security;

-- ---------- table grants ----------
-- RLS filters ROWS; GRANT controls TABLE access. Both are required, and
-- they do different jobs. Supabase pre-grants `authenticated` by default,
-- but relying on a platform default for the authorization layer is
-- fragile — these grants are explicit so the schema is self-contained and
-- behaves identically on any Postgres.
--
-- Everything below grants to the single `authenticated` role; per-user
-- logic is RLS's job (this is the Supabase model — role != context).

grant usage on schema public to authenticated;

-- Readable, then narrowed by policy.
grant select on profile, household, worker, booking, nri_link, churn_score
  to authenticated;

grant update on household to authenticated;
grant update on worker to authenticated;
grant insert, update on booking to authenticated;
grant insert, update, delete on nri_link to authenticated;

-- Catalog is READ-ONLY to every application user, including ops.
-- Deliberately no write grant: a price change must not be reachable from
-- the client role at all. Ops edits pricing through admin tooling on the
-- service role, which bypasses RLS. This makes "a household cannot change
-- a price" a permission error rather than a silently-zero-row update.
grant select on service_catalog, plan_catalog to authenticated;

-- ---------- context helpers ----------
-- SECURITY DEFINER so policies can read `profile` without recursing into
-- profile's own RLS. Locked search_path to prevent shadowing attacks.

create or replace function app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profile where id = auth.uid();
$$;

create or replace function app_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select h.household_id
  from household h
  join profile p on p.id = h.profile_id
  where p.id = auth.uid();
$$;

create or replace function app_worker_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select w.worker_id
  from worker w
  join profile p on p.id = w.profile_id
  where p.id = auth.uid();
$$;

-- Households an NRI is consented to monitor.
create or replace function app_linked_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.household_id
  from nri_link l
  where l.nri_profile = auth.uid()
    and l.linked_at is not null;
$$;

-- ---------- profile ----------

create policy profile_self_read on profile
  for select using (id = auth.uid());

create policy profile_ops_read on profile
  for select using (app_role() = 'ops');

-- ---------- catalog: pricing is public to any signed-in user ----------
-- One source, readable everywhere, writable by nobody but ops.

create policy catalog_service_read on service_catalog
  for select using (auth.uid() is not null and active);

create policy catalog_plan_read on plan_catalog
  for select using (auth.uid() is not null and active);

-- No write policy by design: there is no write GRANT for `authenticated`
-- either. Pricing changes go through the service role, off the client path.

-- ---------- household ----------

create policy household_self_read on household
  for select using (profile_id = auth.uid());

create policy household_self_update on household
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- An NRI may read ONLY the household they are consent-linked to.
create policy household_nri_read on household
  for select using (
    app_role() = 'nri' and household_id in (select app_linked_household_ids())
  );

create policy household_ops_read on household
  for select using (app_role() = 'ops');

-- ---------- worker ----------
-- The base table carries credit_score + earnings, so households must NOT
-- read it. They browse `worker_public` (below) instead. This is the fix
-- for the prototype exposing a worker's credit score and loan eligibility
-- on a household-reachable /app/passport.

create policy worker_self_read on worker
  for select using (profile_id = auth.uid());

create policy worker_self_update on worker
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy worker_ops_all on worker
  for all using (app_role() = 'ops') with check (app_role() = 'ops');

-- Curated projection: verification + performance signals only.
-- No credit_score. No earnings. No profile_id.
create view worker_public
with (security_invoker = off) as
  select
    worker_id,
    full_name,
    service_category,
    zone,
    ekyc_status,
    police_check_status,
    jobs_completed,
    rating,
    reliability_score,
    trust_score,
    experience_years
  from worker
  where is_live;

comment on view worker_public is
  'The only worker projection households/NRIs may read. Financial columns '
  'are absent by construction, not by a WHERE clause someone can forget.';

revoke all on worker_public from anon, authenticated;
grant select on worker_public to authenticated;

-- ---------- booking ----------

create policy booking_household_read on booking
  for select using (household_id = app_household_id());

create policy booking_household_create on booking
  for insert with check (household_id = app_household_id());

-- A worker sees the jobs assigned to them — and nothing else.
create policy booking_worker_read on booking
  for select using (worker_id = app_worker_id());

create policy booking_worker_checkin on booking
  for update using (worker_id = app_worker_id()) with check (worker_id = app_worker_id());

-- An NRI sees bookings for their linked household (the dual-timezone feed).
create policy booking_nri_read on booking
  for select using (
    app_role() = 'nri' and household_id in (select app_linked_household_ids())
  );

create policy booking_ops_all on booking
  for all using (app_role() = 'ops') with check (app_role() = 'ops');

-- ---------- nri_link ----------

create policy nri_link_own_read on nri_link
  for select using (nri_profile = auth.uid());

create policy nri_link_own_write on nri_link
  for all using (nri_profile = auth.uid()) with check (nri_profile = auth.uid());

-- The parents' household can see (and revoke) who monitors them: consent
-- is two-sided, so it must be visible from both ends.
create policy nri_link_household_read on nri_link
  for select using (household_id = app_household_id());

create policy nri_link_ops_read on nri_link
  for select using (app_role() = 'ops');

-- ---------- churn_score · OPS ONLY ----------
-- NOTE: there is deliberately no household/worker/nri policy here.
-- RLS denies by default, so the absence of a policy *is* the control.
-- tests/rls asserts this and CI fails if anyone adds one.

create policy churn_ops_all on churn_score
  for all using (app_role() = 'ops') with check (app_role() = 'ops');
