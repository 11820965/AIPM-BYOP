import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow } from "@/lib/supabase/database.types";
export type { BookingRow } from "@/lib/supabase/database.types";

/**
 * No-show insights — FRONT-END ONLY (AI-02 is not built).
 *
 * The engine that would produce these scores does not exist yet: it needs
 * booking history to train on and a notification pipeline to act. So the
 * cards are driven by the household's REAL upcoming bookings, but the risk
 * number is a deterministic client-side stand-in — clearly labelled
 * "simulated" in the UI. This makes the intended UX tangible without
 * pretending an AI is running.
 */

export type RiskBand = "low" | "med" | "high";
export type Factor = { label: string; level: "ok" | "watch" | "risk" };
export type Risk = { score: number; band: RiskBand; factors: Factor[] };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

/** Deterministic, illustrative risk — NOT a model. Stable per booking. */
export function assessRisk(b: BookingRow): Risk {
  const slot = new Date(b.slot_datetime);
  const hoursUntil = (slot.getTime() - Date.now()) / 3_600_000;
  const seed = (hash(b.booking_id) % 1000) / 1000; // 0–1, stable
  const day = slot.getDay();
  const weekend = day === 0 || day === 6;
  const rain = hash(b.booking_id + "w") % 4 === 0;

  let score = 0.10 + seed * 0.62;
  if (hoursUntil >= 0 && hoursUntil < 3) score += 0.10; // nearer slot, riskier
  if (weekend) score += 0.05;
  if (rain) score += 0.08;
  score = Math.max(0.05, Math.min(0.94, score));

  const band: RiskBand = score > 0.70 ? "high" : score >= 0.25 ? "med" : "low";
  const factors: Factor[] = [
    { label: "Worker on-time history", level: seed > 0.6 ? "risk" : seed > 0.33 ? "watch" : "ok" },
    { label: weekend ? "Weekend slot" : "Weekday slot", level: weekend ? "watch" : "ok" },
    { label: rain ? "Heavy rain forecast" : "Clear weather", level: rain ? "risk" : "ok" },
    { label: hoursUntil < 3 ? "Slot is imminent" : "Hours until slot", level: hoursUntil >= 0 && hoursUntil < 3 ? "watch" : "ok" },
  ];
  return { score, band, factors };
}

/** The household's own upcoming bookings (RLS returns only theirs). */
export function useUpcomingBookings() {
  return useQuery({
    queryKey: ["insights", "upcoming"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<BookingRow[]> => {
      if (!supabase) return [];
      const since = new Date(Date.now() - 3_600_000).toISOString(); // include the last hour
      const { data, error } = await supabase
        .from("booking")
        .select("*")
        .in("status", ["confirmed", "in_progress"])
        .gte("slot_datetime", since)
        .order("slot_datetime", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });
}

/** Names for a set of worker ids, for nicer cards. */
export function useWorkerNames(ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  return useQuery({
    queryKey: ["insights", "worker-names", key],
    enabled: isSupabaseConfigured && ids.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      if (!supabase || ids.length === 0) return {};
      const { data, error } = await supabase
        .from("worker_public")
        .select("worker_id, full_name")
        .in("worker_id", [...new Set(ids)]);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.worker_id] = r.full_name;
      return map;
    },
  });
}
