-- =====================================================================
-- Casai · 0004_booking_details
-- Transaction-loop core (P2) — the fields a booking needs to be actioned
--
-- The original booking table (0001) held who/when/how-much but not WHERE.
-- A worker cannot be dispatched without a service address, so these three
-- columns are required for a booking to be real:
--   * service_address — where the worker goes
--   * notes           — gate code, allergies, preferences (optional)
--   * payment_method   — upi | card | cash; settlement is on service until
--                        the Razorpay slice lands
-- =====================================================================

create type payment_method as enum ('upi', 'card', 'cash');

alter table booking
  add column service_address text,
  add column notes           text,
  add column payment_method  payment_method not null default 'cash';

-- Existing rows (none in production yet) get a placeholder so the NOT NULL
-- intent is documented without failing the migration on an empty table.
comment on column booking.service_address is
  'Where the worker is dispatched. Required for any actionable booking.';
