-- =====================================================================
-- Casai · 0003_new_user_provisioning
-- Phase P0 · slice 0.4 — server-assigned context on signup
--
-- Found while wiring auth against the live project: a user could
-- authenticate and then have no `profile` row, so no context, so no
-- access to anything. Nothing in 0001/0002 creates that row, and the
-- local RLS tests could not surface it because they seeded profiles
-- directly.
--
-- The tempting fix is to let the client insert its own profile. That
-- would be a serious hole: `profile.role` is what every RLS policy in
-- 0002 keys off, so a client able to write it could simply claim
-- role='ops' and read every household's churn score. Slice 0.6 removed
-- client-owned roles from the UI; this must not reintroduce one at the
-- database.
--
-- So the role is assigned HERE, by the database, on signup:
--
--   * Everyone starts as 'household'. It is the least-privileged
--     context and the only one that self-serves.
--   * 'worker' is granted by ops after eKYC + police verification
--     clears (P1) — it must be earned, not chosen.
--   * 'nri' is granted when a consent link to a household is
--     established (P3).
--   * 'ops' is never self-serve and is only ever set by ops through the
--     service role.
--
-- There is still no INSERT policy on `profile`, and that is deliberate.
-- This function runs as SECURITY DEFINER, so it is the only path that
-- can create one.
-- =====================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
begin
  -- raw_user_meta_data is client-supplied and therefore untrusted. A
  -- display name is harmless (it only ever renders as text); role is not,
  -- and is deliberately not read from here.
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    initcap(split_part(new.email, '@', 1)),
    'Guest'
  );

  insert into profile (id, role, display_name)
  values (new.id, 'household', chosen_name)
  on conflict (id) do nothing;

  -- Every household profile needs a household row: it is the tenant that
  -- bookings, plans and RLS scoping hang off (app_household_id() in 0002
  -- returns null without it, which would deny the user their own data).
  insert into household (profile_id, name, zone, plan_code)
  values (new.id, chosen_name, 'Goregaon West', 'free')
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

comment on function handle_new_user is
  'Assigns context on signup. Role is hard-coded to household — never '
  'taken from client metadata. Elevation is an ops action.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Backfill: any users created before this trigger existed.
-- Safe to re-run.
-- ---------------------------------------------------------------------
insert into profile (id, role, display_name)
select u.id, 'household', initcap(split_part(u.email, '@', 1))
from auth.users u
left join profile p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into household (profile_id, name, zone, plan_code)
select p.id, p.display_name, 'Goregaon West', 'free'
from profile p
left join household h on h.profile_id = p.id
where h.household_id is null
  and p.role = 'household'
on conflict (profile_id) do nothing;
