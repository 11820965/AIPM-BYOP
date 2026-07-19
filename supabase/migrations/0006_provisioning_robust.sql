-- =====================================================================
-- Casai · 0006_provisioning_robust
-- Make new-user provisioning work for EVERY sign-in method, incl. anonymous
--
-- Found live: an authenticated session could read worker_public, but had no
-- profile/household row — so the app could not treat it as a household.
-- Two causes:
--   1. The 0003 trigger was not provisioning users (re-created here to be
--      certain it exists and is correct).
--   2. The 0003 BACKFILL derived the display name from the email, which is
--      null for anonymous users, so it could never create their profile.
--      Fixed here with a null-safe fallback to 'Guest'.
--
-- Role is still assigned by the database (household), never by the client.
-- Idempotent and safe to re-run.
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
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    initcap(nullif(split_part(coalesce(new.email, ''), '@', 1), '')),
    'Guest'
  );

  insert into profile (id, role, display_name)
  values (new.id, 'household', chosen_name)
  on conflict (id) do nothing;

  insert into household (profile_id, name, zone, plan_code)
  values (new.id, chosen_name, 'Goregaon West', 'free')
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone (email or anonymous) currently without a profile.
insert into profile (id, role, display_name)
select
  u.id,
  'household',
  coalesce(initcap(nullif(split_part(coalesce(u.email, ''), '@', 1), '')), 'Guest')
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
