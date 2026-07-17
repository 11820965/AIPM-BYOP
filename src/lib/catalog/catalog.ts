/**
 * Service catalog — the single source of truth for price (SAD ADR-04).
 *
 * The prototype hard-coded prices per screen and they disagreed: home tiles
 * advertised "From ₹199" while the Book screen charged ₹220/hr. A price that
 * changes between the tile and the checkout attacks the product's core
 * promise ("no surprises") at the exact moment trust is being decided.
 *
 * These values mirror supabase/seed.sql — one canonical row per category.
 * P0.7 replaces the constant below with a query against `service_catalog`;
 * the exported API stays identical, so screens do not change again.
 *
 * Money is in MINOR units (paise) — never floats, never per-screen literals.
 */

export type ServiceCategory = "cook" | "maid" | "driver" | "caregiver";
export type PriceUnit = "hour" | "day" | "visit";

export type CatalogEntry = {
  category: ServiceCategory;
  displayName: string;
  priceMinor: number;
  currency: "INR" | "USD";
  unit: PriceUnit;
  minUnits: number;
};

/** Mirrors supabase/seed.sql. Do not edit here alone — change both. */
const CATALOG: Record<ServiceCategory, CatalogEntry> = {
  cook: {
    category: "cook",
    displayName: "Cook",
    priceMinor: 22000, // ₹220.00/hr
    currency: "INR",
    unit: "hour",
    minUnits: 1,
  },
  maid: {
    category: "maid",
    displayName: "Maid",
    priceMinor: 18000, // ₹180.00/hr
    currency: "INR",
    unit: "hour",
    minUnits: 1,
  },
  driver: {
    category: "driver",
    displayName: "Driver",
    priceMinor: 25000, // ₹250.00/hr
    currency: "INR",
    unit: "hour",
    minUnits: 1,
  },
  // Elder care. Sold in the NRI context only, priced per day.
  caregiver: {
    category: "caregiver",
    displayName: "Caregiver (24/7)",
    priceMinor: 38000, // ₹380.00/day
    currency: "INR",
    unit: "day",
    minUnits: 1,
  },
};

export function getService(category: ServiceCategory): CatalogEntry {
  return CATALOG[category];
}

export function listServices(categories: ServiceCategory[]): CatalogEntry[] {
  return categories.map(getService);
}

const SYMBOL: Record<CatalogEntry["currency"], string> = { INR: "₹", USD: "$" };

/** 22000 → "₹220" ; 22050 → "₹220.50" */
export function formatMoney(minor: number, currency: CatalogEntry["currency"] = "INR"): string {
  const major = minor / 100;
  const hasPaise = minor % 100 !== 0;
  return (
    SYMBOL[currency] +
    major.toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

const UNIT_SUFFIX: Record<PriceUnit, string> = { hour: "/hr", day: "/day", visit: "/visit" };

/** The canonical way to render a service price. Used by every surface. */
export function formatServicePrice(entry: CatalogEntry): string {
  return formatMoney(entry.priceMinor, entry.currency) + UNIT_SUFFIX[entry.unit];
}

/** "From ₹220/hr" — the entry-price form used on tiles. */
export function formatFromPrice(entry: CatalogEntry): string {
  return `From ${formatServicePrice(entry)}`;
}
