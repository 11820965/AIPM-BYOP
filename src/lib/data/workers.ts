import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ServiceCategory, WorkerPublic } from "@/lib/supabase/database.types";
import { getService } from "@/lib/catalog/catalog";

/**
 * Worker data (P0 slice 0.7).
 *
 * Replaces the hard-coded WORKERS array in lib/worker/data.ts.
 *
 * Reads `worker_public`, never the `worker` table. The view has no
 * credit_score and no earnings columns, so a household's UI cannot render
 * a worker's financial record even by accident — the leak is closed in the
 * data layer, in the type system, and in RLS.
 *
 * `worker_public` is also filtered to `is_live`, so unverified workers are
 * never bookable or even visible. That rule lives in the database (a
 * generated column plus a booking trigger), not in a filter here that
 * someone could forget.
 */

export type WorkerCard = {
  id: string;
  name: string;
  category: ServiceCategory;
  zone: string;
  rating: number;
  reliability: number;
  trust: number;
  jobs: number;
  yearsExp: number;
  ekycVerified: boolean;
  policeVerified: boolean;
  /** From the catalog — never stored on the worker. */
  priceMinor: number;
};

function toCard(row: WorkerPublic): WorkerCard {
  return {
    id: row.worker_id,
    name: row.full_name,
    category: row.service_category,
    zone: row.zone,
    rating: row.rating ?? 0,
    // stored 0–1, shown as a percentage
    reliability: Math.round((row.reliability_score ?? 0) * 100),
    trust: row.trust_score ?? 0,
    jobs: row.jobs_completed,
    yearsExp: row.experience_years ?? 0,
    ekycVerified: row.ekyc_status === "verified",
    policeVerified: row.police_check_status === "verified",
    priceMinor: getService(row.service_category).priceMinor,
  };
}

export type WorkerFilters = {
  minRating?: number;
  minReliability?: number; // 0–100
};

export function useWorkers(category: ServiceCategory, filters: WorkerFilters = {}) {
  const { minRating = 0, minReliability = 0 } = filters;

  return useQuery({
    queryKey: ["workers", category, minRating, minReliability],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<WorkerCard[]> => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("worker_public")
        .select("*")
        .eq("service_category", category)
        .gte("rating", minRating)
        .gte("reliability_score", minReliability / 100)
        // AI-01 ranks this list in P4. Until a model exists there is
        // nothing to learn from, so order by the strongest real signal we
        // have rather than invent a match score.
        .order("reliability_score", { ascending: false })
        .order("rating", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(toCard);
    },
  });
}

export function useWorker(workerId: string | undefined) {
  return useQuery({
    queryKey: ["worker", workerId],
    enabled: isSupabaseConfigured && Boolean(workerId),
    queryFn: async (): Promise<WorkerCard | null> => {
      if (!supabase || !workerId) return null;
      const { data, error } = await supabase
        .from("worker_public")
        .select("*")
        .eq("worker_id", workerId)
        .maybeSingle();
      if (error) throw error;
      return data ? toCard(data as WorkerPublic) : null;
    },
  });
}
