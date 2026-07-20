-- =====================================================================
-- Casai · 0010_ops_verification
-- The Ops context — an admin who verifies workers
--
-- Closes the worker lifecycle. A self-onboarded worker starts PENDING and
-- is not bookable (0009); this adds the ops path that reviews eKYC + police
-- and flips them to verified — after which is_live becomes true and they
-- appear in worker_public.
--
-- Ops already has full read/write on the worker table (worker_ops_all,
-- 0002). This migration adds:
--   * become_ops(passcode) — demo admin sign-in. Role stays server-assigned;
--     a shared passcode gates elevation. In production, ops accounts are
--     provisioned by an administrator, not self-claimed — this is a
--     deliberately simple stand-in for the BYOP build.
--   * verify_worker(worker_id) — ops-only; marks eKYC + police verified.
--
-- Idempotent.
-- =====================================================================

create or replace function become_ops(p_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Demo admin passcode. Not a production auth mechanism.
  if p_passcode is distinct from 'casai-admin-2026' then
    raise exception 'invalid admin passcode';
  end if;
  update profile set role = 'ops' where id = auth.uid();
  return true;
end;
$$;

create or replace function verify_worker(p_worker_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if app_role() <> 'ops' then
    raise exception 'only ops can verify workers';
  end if;

  update worker
    set ekyc_status = 'verified',
        police_check_status = 'verified'
  where worker_id = p_worker_id;

  if not found then
    raise exception 'worker % not found', p_worker_id;
  end if;
end;
$$;

grant execute on function become_ops(text) to authenticated;
grant execute on function verify_worker(text) to authenticated;
