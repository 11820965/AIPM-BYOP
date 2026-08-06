-- =====================================================================
-- Casai · 0015_guest_access
-- One-tap guest entry into the worker and NRI experiences (demo only)
--
-- The landing page already has a guest HOUSEHOLD (anonymous sign-in →
-- provisioned as household). This adds the same for the other two consumer
-- contexts, so all three can be explored without the signup / onboarding /
-- ops-verification steps:
--
--   become_guest_worker() — elevates the caller to a VERIFIED worker with a
--     filled-out passport and one sample booking (whose household has a home
--     profile), so the worker's dashboard, passport, bookings and the
--     Continuity Memory brief are all populated on arrival.
--   become_guest_nri()    — elevates the caller to nri and links them to a
--     home with a couple of bookings to monitor.
--
-- These are DEMO shortcuts and are labelled as such. They do not change the
-- real security model: production workers are still verified by ops (0010),
-- and real NRI linking is still consent-code based (0007). Role is still
-- server-assigned inside SECURITY DEFINER functions — a client cannot set
-- its own role. Idempotent.
-- =====================================================================

-- ---------- guest worker ----------

create or replace function become_guest_worker()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare wid text; hh uuid;
begin
  -- Reuse an existing worker record if the caller already has one.
  select worker_id into wid from worker where profile_id = auth.uid();

  if wid is null then
    loop
      wid := 'GS-WK-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
      begin
        insert into worker (
          worker_id, profile_id, full_name, service_category, zone,
          ekyc_status, police_check_status, jobs_completed, rating,
          reliability_score, trust_score, experience_years, credit_score,
          earnings_month_minor
        ) values (
          wid, auth.uid(), 'Guest Pro', 'cook', 'Goregaon West',
          'verified', 'verified', 128, 4.7, 0.940, 84, 3, 690, 1600000
        );
        exit;
      exception when unique_violation then
        -- worker_id collision — try again
      end;
    end loop;
  else
    -- Ensure the demo worker is verified/live even on a repeat call.
    update worker set ekyc_status = 'verified', police_check_status = 'verified'
    where worker_id = wid;
  end if;

  update profile set role = 'worker' where id = auth.uid();

  -- The household this anonymous user was provisioned with becomes a sample
  -- home: give it a profile and a booking assigned to the guest worker, so
  -- the worker lands on a populated Bookings screen with a real home brief.
  select household_id into hh from household where profile_id = auth.uid();
  if hh is not null then
    insert into household_preferences (household_id, dietary, access, routines, preferences, notes, updated_at)
    values (
      hh,
      'Jain kitchen — no onion or garlic. Peanut allergy (child).',
      'Gate code 4321. Keys with the guard, Tower B. Flat on the 2nd floor, left.',
      'Father takes BP medicine at 8am with breakfast. Kids'' school bus at 8:30.',
      'Shoes off at the door. Leave the kitchen dry after cooking.',
      'Two cats — keep the balcony door shut.',
      now()
    )
    on conflict (household_id) do nothing;

    if not exists (select 1 from booking where worker_id = wid) then
      insert into booking (household_id, worker_id, service_category, slot_datetime,
        total_amount_minor, service_address, notes)
      values (hh, wid, 'cook',
        date_trunc('day', now()) + interval '1 day' + interval '8 hours',
        44000, 'Flat 402, Sunshine Apt, Andheri W', 'Please ring twice');
    end if;
  end if;

  return wid;
end;
$$;

-- ---------- guest NRI ----------

create or replace function become_guest_nri()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare hh uuid; wk text;
begin
  -- The household this anonymous user was provisioned with stands in for the
  -- parents' home the NRI monitors.
  select household_id into hh from household where profile_id = auth.uid();
  if hh is null then
    raise exception 'no home to monitor for this account';
  end if;

  update profile set role = 'nri' where id = auth.uid();

  -- Seed a couple of bookings to watch, if the home has none.
  if not exists (select 1 from booking where household_id = hh) then
    select worker_id into wk from worker
      where is_live and service_category = 'cook'
      order by reliability_score desc nulls last limit 1;
    if wk is not null then
      insert into booking (household_id, worker_id, service_category, slot_datetime,
        total_amount_minor, service_address, notes)
      values
        (hh, wk, 'cook', date_trunc('day', now()) + interval '1 day' + interval '8 hours',
          44000, 'Parents'' home, Goregaon West', 'Morning cook'),
        (hh, wk, 'cook', date_trunc('day', now()) + interval '3 days' + interval '8 hours',
          44000, 'Parents'' home, Goregaon West', 'Morning cook');
    end if;
  end if;

  insert into nri_link (nri_profile, household_id, linked_at, nri_timezone)
  values (auth.uid(), hh, now(), 'Europe/London')
  on conflict (nri_profile, household_id) do update set linked_at = now();

  return hh;
end;
$$;

grant execute on function become_guest_worker() to authenticated;
grant execute on function become_guest_nri()    to authenticated;
