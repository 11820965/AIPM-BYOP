/**
 * Database types — hand-written to mirror supabase/migrations/*.sql.
 *
 * Once the project exists these can be generated instead:
 *   npx supabase gen types typescript --project-id <ref> > database.types.ts
 *
 * Note what is NOT here: `worker` is not exposed as a readable table to the
 * app. Households read `worker_public`, a view with no credit_score and no
 * earnings columns. Typing it this way means a component cannot even ask
 * for a worker's financial data — the leak is closed in the type system as
 * well as in RLS.
 */

export type UserRole = "household" | "worker" | "nri" | "ops";
export type ServiceCategory = "cook" | "maid" | "driver" | "caregiver";
export type VerificationStatus = "pending" | "verified" | "failed";
export type BookingStatus =
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "replaced";

/** The browsable worker projection — trust signals only. */
export type WorkerPublic = {
  worker_id: string;
  full_name: string;
  service_category: ServiceCategory;
  zone: string;
  ekyc_status: VerificationStatus;
  police_check_status: VerificationStatus;
  jobs_completed: number;
  rating: number | null;
  reliability_score: number | null;
  trust_score: number | null;
  experience_years: number | null;
};

export type ServiceCatalogRow = {
  category: ServiceCategory;
  display_name: string;
  price_minor: number;
  currency: "INR" | "USD";
  unit: "hour" | "day" | "visit";
  min_units: number;
  active: boolean;
};

export type PlanCatalogRow = {
  code: string;
  display_name: string;
  price_minor: number;
  currency: "INR" | "USD";
  audience: UserRole;
  active: boolean;
};

export type ProfileRow = {
  id: string;
  role: UserRole;
  display_name: string;
  created_at: string;
};

export type HouseholdRow = {
  household_id: string;
  profile_id: string;
  name: string;
  zone: string;
  plan_code: string;
  created_at: string;
};

export type PaymentMethod = "upi" | "card" | "cash";

export type BookingRow = {
  booking_id: string;
  household_id: string;
  worker_id: string;
  service_category: ServiceCategory;
  slot_datetime: string;
  duration_hours: number;
  status: BookingStatus;
  gps_checkin_time: string | null;
  sla_breach: boolean;
  total_amount_minor: number;
  currency: string;
  service_address: string | null;
  notes: string | null;
  payment_method: PaymentMethod;
  created_at: string;
};

// Shaped to satisfy supabase-js's GenericSchema so insert/update payloads
// type-check (each table needs Row/Insert/Update/Relationships; the schema
// needs Views/Functions/Enums/CompositeTypes).
export type Database = {
  public: {
    Tables: {
      profile: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow>; Relationships: [] };
      household: { Row: HouseholdRow; Insert: Partial<HouseholdRow>; Update: Partial<HouseholdRow>; Relationships: [] };
      booking: { Row: BookingRow; Insert: Partial<BookingRow>; Update: Partial<BookingRow>; Relationships: [] };
      // read-only to app roles (see 0002 grants) — insert/update kept as Row
      // shape so the generic resolves, but the DB refuses writes.
      service_catalog: { Row: ServiceCatalogRow; Insert: Partial<ServiceCatalogRow>; Update: Partial<ServiceCatalogRow>; Relationships: [] };
      plan_catalog: { Row: PlanCatalogRow; Insert: Partial<PlanCatalogRow>; Update: Partial<PlanCatalogRow>; Relationships: [] };
    };
    Views: {
      worker_public: { Row: WorkerPublic; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
