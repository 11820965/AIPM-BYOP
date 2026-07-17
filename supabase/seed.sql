-- =====================================================================
-- Casai · seed
-- Beachhead: Goregaon West → Andheri corridor, Mumbai.
--
-- This file is where the prototype's pricing inconsistency dies.
-- Live app today:  home tiles "From ₹199"  vs  Book screen "₹220/hr".
-- Canonical here:  ₹220/hr, one row, one source (ADR-04).
-- All amounts are MINOR units: ₹220.00 => 22000 paise.
-- =====================================================================

-- ---------- services ----------

insert into service_catalog (category, display_name, price_minor, currency, unit, min_units) values
  ('cook',      'Cook',              22000, 'INR', 'hour', 1),
  ('maid',      'Maid',              18000, 'INR', 'hour', 1),
  ('driver',    'Driver',            25000, 'INR', 'hour', 1),
  -- Elder-care category. Sold in the NRI context only, priced per day.
  ('caregiver', 'Caregiver (24/7)',  38000, 'INR', 'day',  1)
on conflict (category) do update set
  price_minor = excluded.price_minor,
  currency    = excluded.currency,
  unit        = excluded.unit;

-- ---------- plans ----------
-- Household plans bill in INR. NRI Care+ bills in USD.
-- Two currencies, one catalog — which is exactly why Payments needs two
-- gateways behind one ledger (ADR-08).

insert into plan_catalog (code, display_name, price_minor, currency, audience) values
  ('free',        'Free',             0,      'INR', 'household'),
  ('lite',        'Lite',             149900, 'INR', 'household'),
  ('family',      'Family',           349900, 'INR', 'household'),
  ('care_plus',   'Care+',            599900, 'INR', 'household'),
  -- NRI tiers, priced in USD as the live /register/nri flow does.
  ('nri_basic',   'Basic monitoring', 1500,   'USD', 'nri'),
  ('nri_care_plus','Care+',           4900,   'USD', 'nri')
on conflict (code) do update set
  price_minor = excluded.price_minor,
  currency    = excluded.currency;

-- ---------- workers ----------
-- Canonical stats live here and ONLY here. The prototype showed the same
-- worker as 312 / 347 / 412 jobs on three screens; there is now one number.
--
-- Meena is bookable (both checks verified => is_live true).
-- Kamla is mid-verification: police check pending => is_live false, so the
-- booking trigger will refuse her. That asymmetry is deliberate — it lets
-- the P0 tests prove the "verified workers only" rule structurally.

insert into worker (
  worker_id, full_name, service_category, zone,
  ekyc_status, police_check_status,
  jobs_completed, rating, reliability_score, trust_score, experience_years,
  credit_score, earnings_month_minor
) values
  ('GS-WK-2841', 'Meena S.',    'cook',      'Goregaon West',
   'verified', 'verified', 347, 4.9, 0.970, 91, 8, 782, 2400000),

  ('GS-WK-2907', 'Sunita Devi', 'caregiver', 'Bengaluru South',
   'verified', 'verified', 412, 4.9, 0.980, 94, 6, 771, 2400000),

  ('GS-WK-3112', 'Asha R.',     'maid',      'Andheri West',
   'verified', 'verified', 128, 4.7, 0.940, 84, 3, 690, 1600000),

  ('GS-WK-3340', 'Rakesh P.',   'driver',    'Goregaon West',
   'verified', 'verified', 205, 4.7, 0.955, 86, 5, 704, 1900000),

  -- not yet police-verified => must be unbookable
  ('GS-WK-3501', 'Kamla Bai',   'caregiver', 'Bengaluru East',
   'verified', 'pending',  287, 4.8, 0.960, 88, 7, 733, 2100000)
on conflict (worker_id) do nothing;
