-- =====================================================================
-- Casai · 0009_worker_onboarding
-- Server-controlled worker identity — the worker context's foundation
--
-- Mirrors the NRI pattern (0007): becoming a worker is a role change, and
-- role is never client-writable. A user onboards via become_worker(), which
-- mints a worker record tied to their profile and elevates their role.
--
-- The new worker starts PENDING (ekyc + police), so is_live is false and
-- they are NOT bookable and NOT in worker_public until ops verification
-- clears (P1). This preserves the "verified workers only" guarantee: this
-- function cannot mint a bookable worker, only a pending one. The worker
-- can still see their OWN record and track verification (worker_self_read).
--
-- Idempotent: a second call returns the caller's existing worker id.
-- =====================================================================

create or replace function become_worker(
  p_name     text,
  p_category service_category,
  p_zone     text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  wid      text;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'a name is required';
  end if;

  -- Idempotent — one worker record per profile.
  select worker_id into existing from worker where profile_id = auth.uid();
  if existing is not null then
    update profile set role = 'worker' where id = auth.uid();
    return existing;
  end if;

  loop
    wid := 'GS-WK-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    begin
      insert into worker (
        worker_id, profile_id, full_name, service_category, zone,
        ekyc_status, police_check_status, jobs_completed, earnings_month_minor,
        experience_years
      ) values (
        wid, auth.uid(), trim(p_name), p_category, p_zone,
        'pending', 'pending', 0, 0, 0
      );
      exit;
    exception when unique_violation then
      -- worker_id collision — try again
    end;
  end loop;

  -- Role elevation happens only after the record exists.
  update profile set role = 'worker' where id = auth.uid();

  return wid;
end;
$$;

grant execute on function become_worker(text, service_category, text) to authenticated;
