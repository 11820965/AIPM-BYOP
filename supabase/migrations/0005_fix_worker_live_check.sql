-- =====================================================================
-- Casai · 0005_fix_worker_live_check
-- Bug fix — the verified-worker trigger was defeated by RLS
--
-- assert_worker_is_live() (0001) checks `select 1 from worker ... is_live`
-- before allowing a booking. It ran with the CALLER's privileges, so RLS
-- applied — and households have no read policy on the worker base table
-- (they read worker_public). The subquery therefore returned no rows for
-- every worker, and the trigger rejected ALL household bookings with
-- "not verified/live", verified or not.
--
-- Caught by tests/rls/bookings.test.mjs: the positive "can book a verified
-- worker" case failed, while the negative case passed for the wrong reason.
--
-- Fix: run the check as SECURITY DEFINER with a locked search_path, so this
-- integrity trigger sees the true worker state regardless of who is booking.
-- The intent is unchanged — a booking may only reference a live worker.
-- =====================================================================

create or replace function assert_worker_is_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from worker w where w.worker_id = new.worker_id and w.is_live) then
    raise exception 'worker % is not verified/live and cannot be booked', new.worker_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
