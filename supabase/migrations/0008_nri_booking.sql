-- =====================================================================
-- Casai · 0008_nri_booking
-- Let an NRI book care ON BEHALF of the household they are linked to (P3)
--
-- booking_household_create (0002) only allows household_id =
-- app_household_id() — i.e. a household booking for itself. An NRI has
-- their own (vestigial) household from signup, so that check would reject
-- a booking for the PARENTS' household. This adds the missing path:
-- an NRI may create a booking only for a household they are consent-linked
-- to (app_linked_household_ids from 0002). The worker-verified trigger and
-- the amount rules still apply.
--
-- Also: caregiver engagements are multi-DAY, not hourly. duration_hours was
-- capped at 8 for hourly services; relaxed to 30 so the same column can
-- hold a caregiver's day count (numeric(3,1) holds up to 99.9). The unit is
-- read from the service category — days for caregiver, hours otherwise.
--
-- Idempotent.
-- =====================================================================

drop policy if exists booking_nri_create on booking;
create policy booking_nri_create on booking
  for insert with check (
    app_role() = 'nri'
    and household_id in (select app_linked_household_ids())
  );

alter table booking drop constraint if exists booking_duration_hours_check;
alter table booking add constraint booking_duration_hours_check
  check (duration_hours between 1 and 30);
