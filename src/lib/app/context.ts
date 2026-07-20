import { useRouterState } from "@tanstack/react-router";
import { Home, CalendarCheck, IdCard, Sparkles, Wallet, Briefcase, History, ShieldCheck } from "lucide-react";

/**
 * Bounded contexts (SAD §05).
 *
 * Casai serves four audiences whose data must not mix. Each owns a route
 * namespace, and that namespace — not client state — decides which shell,
 * nav and accent a page gets.
 *
 * Why this module exists
 * ----------------------
 * The prototype derived the shell from `localStorage.gharseva.state.role`.
 * Two consequences, both real:
 *
 *   1. Security — the role was a string any visitor could edit to reach
 *      another context's UI.
 *   2. Correctness — the role could desync from the route. Visiting
 *      /worker while role was still "nri" rendered a worker page inside
 *      the household nav. That is the bug observed in the live app; it was
 *      never a missing worker nav (AppShell always had one).
 *
 * The route is unambiguous, so the route decides presentation. Server-side
 * authorization is a separate concern and is enforced by Postgres RLS
 * (supabase/migrations/0002) plus the session claim wired in P0.4 — the
 * UI must never be the thing keeping contexts apart.
 */
export type Context = "household" | "worker" | "nri" | "ops";

export type NavItem = { to: string; label: string; icon: any };

/** Longest-prefix wins; order matters only for readability here. */
const ROUTE_PREFIX: ReadonlyArray<readonly [string, Context]> = [
  ["/app", "household"],
  ["/worker", "worker"],
  ["/nri", "nri"],
  ["/ops", "ops"],
] as const;

/**
 * Resolve the context that owns a path.
 * Returns null for routes outside any context (landing, /register/*),
 * which render their own shell.
 */
export function contextForPath(pathname: string): Context | null {
  for (const [prefix, context] of ROUTE_PREFIX) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return context;
  }
  return null;
}

export function useRouteContext(): Context | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return contextForPath(pathname);
}

/**
 * Navigation per context.
 *
 * Household deliberately has NO Passport entry. The Passport is the
 * worker's professional identity and carries their credit score and loan
 * eligibility; the prototype listed /app/passport in the household nav,
 * which is how a household could reach a worker's financial record.
 * The database refuses that read (worker_public has no financial columns);
 * this removes the door as well as locking it.
 */
export const NAV_BY_CONTEXT: Record<Context, NavItem[]> = {
  household: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/app/book", label: "Book", icon: CalendarCheck },
    { to: "/app/insights", label: "Insights", icon: Sparkles },
  ],
  worker: [
    { to: "/worker", label: "Home", icon: Home },
    { to: "/worker/bookings", label: "Bookings", icon: CalendarCheck },
    { to: "/worker/passport", label: "Passport", icon: IdCard },
    { to: "/worker/earnings", label: "Earnings", icon: Wallet },
    { to: "/worker/profile", label: "Profile", icon: Briefcase },
  ],
  nri: [
    { to: "/nri", label: "Dashboard", icon: Home },
    { to: "/nri/book", label: "Book", icon: CalendarCheck },
    { to: "/nri/history", label: "History", icon: History },
  ],
  ops: [
    { to: "/ops", label: "Verification", icon: ShieldCheck },
  ],
};

const ACCENT: Record<Context, string> = {
  household: "var(--teal)",
  worker: "var(--purple)",
  nri: "var(--amber)",
  ops: "var(--coral)",
};

export function accentForContext(context: Context | null): string {
  return context ? ACCENT[context] : ACCENT.household;
}

/** Label under the user's name in the sidebar. */
export function planLabelForContext(context: Context | null): string {
  switch (context) {
    case "worker":
      return "Verified Pro";
    case "nri":
      return "Care+ Plan";
    case "ops":
      return "Operations";
    default:
      return "Casai Plus";
  }
}
