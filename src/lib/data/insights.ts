import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow, RiskBand } from "@/lib/supabase/database.types";
export type { BookingRow, RiskBand } from "@/lib/supabase/database.types";

/**
 * No-show insights — the loop is REAL now (0012).
 *
 * The risk number is no longer a client stand-in: every booking is scored
 * in the database at insert (booking_autoscore) from the worker's actual
 * reliability + track record, the slot's imminence, and weekday/weekend.
 * This layer reads that persisted score and drives the three engine calls:
 *
 *   - score_booking()   re-score on demand (stands in for the 15-min job)
 *   - arrange_backup()  reserve a real standby worker before the slot
 *   - resolve_no_show() check-in releases the backup; a no-show promotes it
 *
 * Still honest about the prototype: the score is a heuristic (no history to
 * train on yet), the re-score/escalation cadence is triggered from the UI
 * rather than a background job, and there is no push/SMS — the loop is
 * visible in-app.
 */

export type Factor = { label: string; level: "ok" | "watch" | "risk" };

export const BAND_LABEL: Record<RiskBand, string> = {
  low: "Low risk", med: "Medium risk", high: "High risk",
};

/** Band from a 0–1 score — mirrors _risk_band() in the database. */
export function bandOf(score: number): RiskBand {
  return score > 0.70 ? "high" : score >= 0.25 ? "med" : "low";
}

/**
 * An honest, client-side explanation of the score using the same signals
 * the server heuristic uses (worker reliability, slot imminence, weekend).
 * The number comes from the DB; this only narrates *why*.
 */
export function factorsFor(b: BookingRow, reliability: number | null): Factor[] {
  const slot = new Date(b.slot_datetime);
  const hoursUntil = (slot.getTime() - Date.now()) / 3_600_000;
  const day = slot.getDay();
  const weekend = day === 0 || day === 6;
  const imminent = hoursUntil >= 0 && hoursUntil < 3;

  return [
    reliability == null
      ? { label: "New worker — thin track record", level: "watch" }
      : {
          label: `Worker reliability ${Math.round(reliability * 100)}%`,
          level: reliability >= 0.95 ? "ok" : reliability >= 0.85 ? "watch" : "risk",
        },
    { label: weekend ? "Weekend slot" : "Weekday slot", level: weekend ? "watch" : "ok" },
    {
      label: imminent ? "Slot is imminent" : "Hours until slot",
      level: imminent ? "watch" : "ok",
    },
  ];
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
        .in("status", ["confirmed", "in_progress", "replaced"])
        .gte("slot_datetime", since)
        .order("slot_datetime", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });
}

export type WorkerMeta = { name: string; reliability: number | null };

/** Name + reliability for a set of worker ids, for the risk cards. */
export function useWorkerMeta(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))].sort();
  const key = uniq.join(",");
  return useQuery({
    queryKey: ["insights", "worker-meta", key],
    enabled: isSupabaseConfigured && uniq.length > 0,
    queryFn: async (): Promise<Record<string, WorkerMeta>> => {
      if (!supabase || uniq.length === 0) return {};
      const { data, error } = await supabase
        .from("worker_public")
        .select("worker_id, full_name, reliability_score")
        .in("worker_id", uniq);
      if (error) throw error;
      const map: Record<string, WorkerMeta> = {};
      for (const r of data ?? []) {
        map[r.worker_id] = { name: r.full_name, reliability: r.reliability_score };
      }
      return map;
    },
  });
}

/** Re-score a booking (invalidates the upcoming list on success). */
export function useScoreBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<number> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("score_booking", { p_booking_id: bookingId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

/** Reserve a standby worker. Resolves to the backup's id, or null if none free. */
export function useArrangeBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<string | null> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("arrange_backup", { p_booking_id: bookingId });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

/**
 * Run the pre-slot checkpoint on a booking (the T-45 timeout, triggered
 * here by hand since the prototype has no cron). If the worker never
 * answered and the cutoff has passed, it expires the booking and arms a
 * backup; otherwise it returns the current confirmation status unchanged.
 */
export function useRunCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string): Promise<string> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("run_confirm_checkpoint", { p_booking_id: bookingId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}

/** Resolve the slot: checked-in releases the backup; a no-show promotes it. */
export function useResolveNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string; checkedIn: boolean }): Promise<string> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("resolve_no_show", {
        p_booking_id: input.bookingId,
        p_checked_in: input.checkedIn,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}
