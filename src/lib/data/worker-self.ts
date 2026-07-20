import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkerRow, BookingRow, ServiceCategory } from "@/lib/supabase/database.types";

/**
 * The worker's view of their OWN data (worker context, P1/P2).
 *
 * A worker reads their full worker record — including credit score and
 * earnings — via worker_self_read (profile_id = auth.uid()). Households
 * cannot reach this table at all; they see worker_public, which omits the
 * financial columns. Same data, two projections, enforced by RLS.
 */

/** The caller's own worker record, or null if they aren't a worker yet. */
export function useMyWorker() {
  return useQuery({
    queryKey: ["worker", "self"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<WorkerRow | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("worker")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as WorkerRow | null) ?? null;
    },
  });
}

/** Bookings assigned to the caller (booking_worker_read filters to theirs). */
export function useMyWorkerBookings() {
  return useQuery({
    queryKey: ["worker", "bookings"],
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

/** Onboard as a worker: mints a pending worker record + elevates the role. */
export function useBecomeWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; category: ServiceCategory; zone: string }) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("become_worker", {
        p_name: input.name,
        p_category: input.category,
        p_zone: input.zone,
      });
      if (error) throw error;
      return data as string; // worker_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["worker"] });
    },
  });
}
