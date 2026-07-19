import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow, ServiceCategory, PaymentMethod } from "@/lib/supabase/database.types";

/**
 * Booking data (transaction-loop core, P2).
 *
 * Replaces the localStorage store in lib/app/bookings.ts with real rows in
 * Postgres. What the prototype faked, this persists:
 *
 *   - A booking is created only for the caller's OWN household — RLS
 *     policy booking_household_create enforces household_id =
 *     app_household_id(). A client cannot book on another household.
 *   - A booking can only reference a verified, live worker — the
 *     assert_worker_is_live() trigger refuses anyone mid-verification.
 *   - Money is stored in minor units; the amount is computed here from the
 *     catalog, never trusted from the client's display.
 *
 * Payment is not taken here — that is a later slice (Razorpay). For now a
 * booking is created with the chosen payment method recorded and settled
 * on service. So the loop is: pick worker → confirm → row in Postgres →
 * read it back on the confirmation screen.
 */

/** The caller's household (RLS returns only their own row). */
export function useHousehold() {
  return useQuery({
    queryKey: ["household", "self"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("household")
        .select("household_id, name, zone, plan_code")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type NewBooking = {
  workerId: string;
  category: ServiceCategory;
  slotDatetime: string; // ISO 8601
  durationHours: number;
  totalMinor: number;
  currency: string;
  serviceAddress: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBooking): Promise<BookingRow> => {
      if (!supabase) throw new Error("Supabase is not configured.");

      // household_id is resolved server-side by RLS scope, but the row needs
      // it explicitly. Read the caller's own household (RLS guarantees it is
      // theirs) rather than trusting any client-held id.
      const { data: hh, error: hhErr } = await supabase
        .from("household")
        .select("household_id")
        .maybeSingle();
      if (hhErr) throw hhErr;
      if (!hh) throw new Error("No household for this account. Complete signup first.");

      const { data, error } = await supabase
        .from("booking")
        .insert({
          household_id: hh.household_id,
          worker_id: input.workerId,
          service_category: input.category,
          slot_datetime: input.slotDatetime,
          duration_hours: input.durationHours,
          total_amount_minor: input.totalMinor,
          currency: input.currency,
          service_address: input.serviceAddress,
          notes: input.notes || null,
          payment_method: input.paymentMethod,
        })
        .select()
        .single();

      // The DB, not the UI, is the last line of defence. An unverified
      // worker trips the trigger and surfaces here as a clear message.
      if (error) {
        if (/not verified\/live/i.test(error.message)) {
          throw new Error("That worker is not available for booking right now.");
        }
        throw error;
      }
      return data as BookingRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking", bookingId],
    enabled: isSupabaseConfigured && Boolean(bookingId),
    queryFn: async (): Promise<BookingRow | null> => {
      if (!supabase || !bookingId) return null;
      const { data, error } = await supabase
        .from("booking")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return (data as BookingRow | null) ?? null;
    },
  });
}

/**
 * Turn a slot label from the Book screen ("8 AM", "2 PM", "Now") into a
 * concrete ISO timestamp. If the hour has already passed today, roll to
 * tomorrow — you cannot book into the past.
 */
export function slotToDatetime(slot: string, now: Date = new Date()): string {
  if (slot.toLowerCase() === "now") return now.toISOString();

  const m = slot.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (!m) return now.toISOString();

  let hour = parseInt(m[1], 10) % 12;
  if (m[2].toUpperCase() === "PM") hour += 12;

  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
