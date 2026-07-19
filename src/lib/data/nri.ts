import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow } from "@/lib/supabase/database.types";

/**
 * NRI data (P3) — the linked-household view.
 *
 * Everything here depends on a real nri_link row (0007). The dashboard shows
 * the linked household's actual bookings, each stamped in both IST and the
 * NRI's own timezone — which is read from the link, never assumed (the
 * prototype hard-coded PST for a UK user; SAD §10.4).
 */

export type NriLink = {
  household_id: string;
  nri_timezone: string;
  linked_at: string | null;
};

/** The household this NRI is linked to (null until they redeem a code). */
export function useNriLink() {
  return useQuery({
    queryKey: ["nri", "link"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<NriLink | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("nri_link")
        .select("household_id, nri_timezone, linked_at")
        .not("linked_at", "is", null)
        .maybeSingle();
      if (error) throw error;
      return (data as NriLink) ?? null;
    },
  });
}

/** The linked household's details (RLS: household_nri_read). */
export function useLinkedHousehold(householdId: string | undefined) {
  return useQuery({
    queryKey: ["nri", "household", householdId],
    enabled: isSupabaseConfigured && Boolean(householdId),
    queryFn: async () => {
      if (!supabase || !householdId) return null;
      const { data, error } = await supabase
        .from("household")
        .select("household_id, name, zone")
        .eq("household_id", householdId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The linked household's bookings — RLS returns only the linked one's. */
export function useLinkedBookings() {
  return useQuery({
    queryKey: ["nri", "bookings"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<BookingRow[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("booking")
        .select("*")
        .order("slot_datetime", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });
}

/** Household action: mint a consent code to share with a family member. */
export function useGenerateInvite() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("generate_nri_invite");
      if (error) throw error;
      return data as string;
    },
  });
}

/** NRI action: redeem a code → become nri, linked to the household. */
export function useRedeemInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, timezone }: { code: string; timezone: string }) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("redeem_nri_invite", {
        p_code: code,
        p_timezone: timezone,
      });
      if (error) {
        // Surface the DB's clear guard messages verbatim (invalid / used /
        // expired / own household); fall back to a generic line otherwise.
        throw new Error(error.message || "Could not link with that code.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["nri"] });
    },
  });
}

/** The viewer's local timezone, for the redeem default. */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Render an instant in a timezone as e.g. "10:00 AM". */
export function timeIn(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}

/** Short timezone label, e.g. "IST", "GMT+1". */
export function tzAbbrev(iso: string, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}
