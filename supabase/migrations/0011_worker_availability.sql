-- =====================================================================
-- Casai · 0011_worker_availability
-- Availability-aware worker listing for the 15-day booking window
--
-- A household picks a date + time up to 14 days ahead; the Book screen
-- should show which verified workers are actually free then. A household
-- cannot read other households' bookings (privacy — booking_household_read
-- only returns their own), so availability can't be computed client-side.
--
-- available_workers() is SECURITY DEFINER: it checks the booking table for
-- conflicts across all households but returns ONLY a boolean `available`
-- flag per worker — never who booked them or when. Same trust projection as
-- worker_public (no credit score / earnings), plus availability.
--
-- A worker counts as unavailable if they have a confirmed/in-progress
-- booking within 2 hours of the requested slot.
-- =====================================================================

create or replace function available_workers(p_category service_category, p_slot timestamptz)
returns table (
  worker_id           text,
  full_name           text,
  service_category    service_category,
  zone                text,
  ekyc_status         verification_status,
  police_check_status verification_status,
  jobs_completed      integer,
  rating              numeric,
  reliability_score   numeric,
  trust_score         integer,
  experience_years    integer,
  available           boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.worker_id, w.full_name, w.service_category, w.zone,
    w.ekyc_status, w.police_check_status, w.jobs_completed,
    w.rating, w.reliability_score, w.trust_score, w.experience_years,
    not exists (
      select 1 from booking b
      where b.worker_id = w.worker_id
        and b.status in ('confirmed', 'in_progress')
        and abs(extract(epoch from (b.slot_datetime - p_slot))) < 7200  -- within 2h
    ) as available
  from worker w
  where w.service_category = p_category
    and w.is_live
  order by w.reliability_score desc nulls last, w.rating desc nulls last;
$$;

grant execute on function available_workers(service_category, timestamptz) to authenticated;
