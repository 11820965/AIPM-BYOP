import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase client (P0 slice 0.4).
 *
 * The anon key is public by design — it ships in the client bundle and
 * identifies the project without authorising anything. Every row this
 * client can reach is decided by Row Level Security
 * (supabase/migrations/0002_rls_policies.sql), which is why the boundary
 * was built and tested before the client was wired.
 *
 * The service_role key must never appear in this codebase. It bypasses RLS
 * entirely and would undo the whole authorization model.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether the project has been provisioned and wired.
 *
 * The app must not white-screen when it hasn't been. Screens check this and
 * render a configuration notice instead — an honest empty state beats a
 * broken one, and beats silently falling back to hard-coded data, which is
 * how the prototype came to look finished while being fictional.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Use where a client is required and absence is a programming error. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and set " +
        "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}
