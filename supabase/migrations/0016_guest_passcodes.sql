-- =====================================================================
-- Casai · 0016_guest_passcodes
-- One guest entry, three passcodes — mirrors the admin passcode gate
--
-- Instead of three separate guest buttons, the landing now has a single
-- "Guest user" that opens a passcode gate (like Admin → become_ops). One
-- passcode per consumer context routes the guest into that experience:
--
--   casai-home-2026   → household (already provisioned on anonymous sign-in)
--   casai-worker-2026 → worker   (become_guest_worker: verified + sample job)
--   casai-nri-2026    → nri      (become_guest_nri: linked home to monitor)
--
-- Demo passcodes only — like the admin one, a deliberately simple stand-in.
-- Role is still server-assigned inside this SECURITY DEFINER function; a
-- client cannot set its own role. Returns the role so the UI can route.
-- Idempotent. Depends on 0015 (become_guest_worker / become_guest_nri).
-- =====================================================================

create or replace function become_guest(p_passcode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_passcode = 'casai-home-2026' then
    -- Anonymous sign-in already provisions a household; nothing to elevate.
    update profile set role = 'household' where id = auth.uid();
    return 'household';
  elsif p_passcode = 'casai-worker-2026' then
    perform become_guest_worker();
    return 'worker';
  elsif p_passcode = 'casai-nri-2026' then
    perform become_guest_nri();
    return 'nri';
  else
    raise exception 'invalid guest passcode';
  end if;
end;
$$;

grant execute on function become_guest(text) to authenticated;
