import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { HouseholdPreferencesRow, HomeBrief } from "@/lib/supabase/database.types";

/**
 * Continuity Memory v0 (0014).
 *
 * A household records its home's context once; the worker assigned to a
 * booking — primary OR promoted backup — sees a brief for that home. The
 * privacy scoping lives in the database: households read/write only their
 * own preferences row, and booking_home_brief() (SECURITY DEFINER) returns
 * a home's brief only to someone actually going there.
 *
 * v0 assembles the brief from structured fields — honest, rule-based. v1
 * swaps in an LLM behind the same booking_home_brief() contract.
 */

export type HomePreferences = {
  dietary: string;
  access: string;
  routines: string;
  preferences: string;
  notes: string;
};

/** The caller's own home preferences (RLS returns only their row), or null. */
export function useHomePreferences() {
  return useQuery({
    queryKey: ["home-preferences", "self"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<HouseholdPreferencesRow | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("household_preferences")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as HouseholdPreferencesRow | null) ?? null;
    },
  });
}

/** Upsert the caller's home preferences (save_home_preferences). */
export function useSaveHomePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: HomePreferences): Promise<void> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.rpc("save_home_preferences", {
        p_dietary: p.dietary || null,
        p_access: p.access || null,
        p_routines: p.routines || null,
        p_preferences: p.preferences || null,
        p_notes: p.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-preferences"] });
      qc.invalidateQueries({ queryKey: ["home-brief"] });
    },
  });
}

/**
 * The "know before you go" brief for one booking. Returns null when the
 * caller isn't entitled to it (the function raises; we surface it as no
 * brief rather than an error card).
 */
export function useBookingBrief(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["home-brief", bookingId],
    enabled: isSupabaseConfigured && Boolean(bookingId),
    queryFn: async (): Promise<HomeBrief | null> => {
      if (!supabase || !bookingId) return null;
      const { data, error } = await supabase.rpc("booking_home_brief", { p_booking_id: bookingId });
      if (error) throw error;
      const rows = (data as HomeBrief[] | null) ?? [];
      return rows[0] ?? null;
    },
  });
}

/** Does a brief carry any real content worth showing? */
export function briefHasContent(b: HomeBrief | null | undefined): boolean {
  if (!b) return false;
  return Boolean(b.dietary || b.access || b.routines || b.preferences || b.notes || b.booking_notes);
}
