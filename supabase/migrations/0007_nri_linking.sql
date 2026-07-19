-- =====================================================================
-- Casai · 0007_nri_linking
-- Household ↔ NRI consent linking, and server-controlled role elevation
--
-- The NRI value prop ("know my parents' home is staffed, across timezones")
-- depends on an NRI being linked to a specific household — and on both
-- sides consenting. Modelled as the live app describes it: the parents'
-- household generates a short-lived code; the NRI redeems it.
--
-- Security posture (continues the theme from 0002/0003):
--   * Becoming an NRI is a ROLE CHANGE, and role is never client-writable.
--     Elevation happens only inside redeem_nri_invite(), a SECURITY DEFINER
--     function that first proves the caller holds a valid, unexpired,
--     unused code. A client cannot set its own role to 'nri'.
--   * A code is single-use, time-boxed (10 min), and cannot link a
--     household to itself.
-- =====================================================================

create table nri_invite (
  code          text primary key,
  household_id  uuid not null references household (household_id) on delete cascade,
  created_by    uuid not null references profile (id) on delete cascade,
  expires_at    timestamptz not null,
  redeemed_at   timestamptz,
  redeemed_by   uuid references profile (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index nri_invite_household_idx on nri_invite (household_id);

alter table nri_invite enable row level security;

grant select, insert on nri_invite to authenticated;

-- The household sees and creates only its OWN invites. The NRI never reads
-- this table directly — redemption goes through the definer function below,
-- so a stranger cannot enumerate or probe codes.
create policy nri_invite_household_read on nri_invite
  for select using (household_id = app_household_id());

create policy nri_invite_ops_read on nri_invite
  for select using (app_role() = 'ops');

-- ---------------------------------------------------------------------
-- Generate a code for the caller's household. Returns the 6-digit code.
-- ---------------------------------------------------------------------
create or replace function generate_nri_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hh   uuid;
  code text;
begin
  hh := app_household_id();
  if hh is null then
    raise exception 'only a household can invite a family member';
  end if;

  -- 6-digit, retried on the vanishingly rare collision
  loop
    code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into nri_invite (code, household_id, created_by, expires_at)
      values (code, hh, auth.uid(), now() + interval '10 minutes');
      exit;
    exception when unique_violation then
      -- try another code
    end;
  end loop;

  return code;
end;
$$;

-- ---------------------------------------------------------------------
-- Redeem a code: elevates the caller to 'nri' and links them to the
-- inviting household. This is the ONLY path to the nri role.
-- ---------------------------------------------------------------------
create or replace function redeem_nri_invite(p_code text, p_timezone text default 'UTC')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv nri_invite;
begin
  select * into inv from nri_invite where code = p_code;

  if inv.code is null then
    raise exception 'invalid code';
  end if;
  if inv.redeemed_at is not null then
    raise exception 'this code has already been used';
  end if;
  if inv.expires_at < now() then
    raise exception 'this code has expired';
  end if;
  if inv.household_id = app_household_id() then
    raise exception 'you cannot link your own household';
  end if;

  -- Role change — server-side, only after the code is proven valid.
  update profile set role = 'nri' where id = auth.uid();

  insert into nri_link (nri_profile, household_id, consent_code, linked_at, expires_at, nri_timezone)
  values (auth.uid(), inv.household_id, p_code, now(), inv.expires_at, coalesce(nullif(p_timezone, ''), 'UTC'))
  on conflict (nri_profile, household_id)
  do update set linked_at = now(), nri_timezone = excluded.nri_timezone;

  update nri_invite set redeemed_at = now(), redeemed_by = auth.uid() where code = p_code;

  return json_build_object('household_id', inv.household_id, 'linked', true);
end;
$$;

grant execute on function generate_nri_invite() to authenticated;
grant execute on function redeem_nri_invite(text, text) to authenticated;
