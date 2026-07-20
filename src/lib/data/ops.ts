import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkerRow } from "@/lib/supabase/database.types";

/**
 * Ops data (P1/P5) — the admin worker-verification console.
 *
 * Ops has full read/write on the worker table via RLS (worker_ops_all).
 * A household or worker cannot reach any of this — the queries below simply
 * return nothing for them.
 */

/** Elevate the current session to ops with the admin passcode. */
export function useBecomeOps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (passcode: string): Promise<boolean> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.rpc("become_ops", { p_passcode: passcode });
      if (error) throw new Error(error.message || "Invalid admin passcode.");
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["ops"] });
    },
  });
}

/** Workers awaiting verification (not yet live). Ops-only via RLS. */
export function usePendingWorkers() {
  return useQuery({
    queryKey: ["ops", "pending-workers"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<WorkerRow[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("worker")
        .select("*")
        .eq("is_live", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkerRow[];
    },
  });
}

/** Approve a worker: marks eKYC + police verified (→ is_live true). */
export function useVerifyWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workerId: string): Promise<void> => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.rpc("verify_worker", { p_worker_id: workerId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops"] });
    },
  });
}
