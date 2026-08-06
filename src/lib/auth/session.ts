import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Context } from "@/lib/app/context";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Session and context claim (P0 slice 0.4).
 *
 * This replaces `localStorage.gharseva.state.role` as the answer to "who is
 * this and what may they see".
 *
 * The important distinction: the role returned here is NOT what protects
 * data. It comes from `profile`, a table the caller can only read their own
 * row of, and every other read is independently filtered by RLS using the
 * same server-side role. So a tampered client can lie to its own UI and
 * gain nothing — the database will still return only its own rows.
 *
 * The UI uses this to route and to render; Postgres decides what is
 * actually readable.
 */

export type Session = {
  userId: string;
  email: string | null;
  /** Server-owned context. Never taken from the client. */
  role: Context;
  displayName: string;
};

const SESSION_KEY = ["session"] as const;

async function fetchSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user) return null;

  // RLS: profile_self_read — a user can read exactly one profile row, theirs.
  const { data, error } = await supabase
    .from("profile")
    .select("id, role, display_name, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  // Authenticated but no profile row yet => onboarding incomplete.
  if (!data) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.role as Context,
    displayName: data.display_name,
  };
}

export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });

  // Keep the cache honest across sign-in / sign-out / token refresh.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/**
 * Send a 6-digit code to an email address.
 *
 * Email OTP works today with no external dependency. Phone OTP needs an SMS
 * provider plus TRAI DLT registration — roughly six weeks of lead time — so
 * it is a P2 concern and deliberately not on the P0 path. The NRI flow uses
 * email anyway, which is the right channel for international users.
 */
export async function sendEmailOtp(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function signOutSession(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Guest sign-in (anonymous). The working way into the app while email OTP
 * is blocked by the free-tier template lock. The signup trigger provisions
 * the guest as a household; role stays server-assigned.
 */
export async function signInAsGuest(): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/**
 * Guest passcodes (demo). One guest entry, three passcodes — mirrors the
 * admin passcode. These are shown on the gate screen; they are not secrets,
 * just a way to pick which experience to demo. The server (become_guest)
 * re-validates and does the role elevation.
 */
export const GUEST_PASSCODES: Record<string, { role: Context; label: string }> = {
  "casai-home-2026": { role: "household", label: "Household" },
  "casai-worker-2026": { role: "worker", label: "Worker" },
  "casai-nri-2026": { role: "nri", label: "NRI" },
};

/**
 * Enter as a guest with a passcode. Signs in anonymously (a fresh guest),
 * then become_guest elevates to the passcode's context and seeds a coherent
 * demo state (verified worker + sample booking, or an NRI linked to a home).
 * Returns the role so the caller can route.
 */
export async function enterAsGuest(passcode: string): Promise<Context> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const code = passcode.trim();
  const match = GUEST_PASSCODES[code];
  if (!match) throw new Error("That passcode isn't recognised.");

  const { error: signErr } = await supabase.auth.signInAnonymously();
  if (signErr) throw signErr;
  const { error } = await supabase.rpc("become_guest", { p_passcode: code });
  if (error) throw error;
  return match.role;
}

/** Landing route for a context, used after sign-in. */
export function homeForRole(role: Context): string {
  switch (role) {
    case "worker":
      return "/worker";
    case "nri":
      return "/nri";
    case "ops":
      return "/ops";
    default:
      return "/app";
  }
}
