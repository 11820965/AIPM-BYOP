import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CheckCircle2, MapPin, Clock, Phone, MessageCircle, Shield, X, Home, Calendar } from "lucide-react";
import { useBooking } from "@/lib/data/bookings";
import { useWorker } from "@/lib/data/workers";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import type { BookingStatus } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/app/booking/$id")({ component: BookingPage });

// The real lifecycle from the booking table's status enum. The prototype's
// "enroute" step is not a stored status, so it is not shown as a fake stage.
const STEPS: { key: BookingStatus; label: string }[] = [
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

function BookingPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: booking, isLoading, error } = useBooking(id);
  const { data: worker } = useWorker(booking?.worker_id);

  if (isLoading) {
    return (
      <AppShell title="Booking">
        <div className="mx-auto max-w-2xl">
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </AppShell>
    );
  }

  if (error || !booking) {
    return (
      <AppShell title="Booking">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {error ? "Couldn't load this booking." : "Booking not found."}
          </p>
          <Link to="/app/book" className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>Book again</Link>
        </div>
      </AppShell>
    );
  }

  const cancelled = booking.status === "cancelled" || booking.status === "no_show";
  const stepIdx = cancelled ? -1 : STEPS.findIndex((s) => s.key === booking.status);
  const service = getService(booking.service_category);
  const workerName = worker?.name ?? booking.worker_id;
  const slotLabel = new Date(booking.slot_datetime).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

  return (
    <AppShell title="Booking">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)" }}>
            {cancelled
              ? <X className="h-8 w-8" style={{ color: "var(--coral, #ff7a7a)" }} />
              : <CheckCircle2 className="h-8 w-8" style={{ color: "var(--teal)" }} />}
          </div>
          <h2 className="text-xl font-bold">{cancelled ? "Booking cancelled" : "Booking confirmed"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {cancelled ? "No charges applied." : `${workerName} is booked for ${slotLabel}`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Booking ID · <span className="font-mono">{booking.booking_id.slice(0, 8)}</span></p>
        </div>

        {!cancelled && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">Status</h3>
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: done ? "var(--teal)" : "var(--muted)", color: done ? "var(--background)" : "var(--muted-foreground)" }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={"text-sm " + (active ? "font-semibold" : done ? "" : "text-muted-foreground")}>{s.label}</span>
                    {active && <span className="ml-auto text-[10px] font-semibold" style={{ color: "var(--teal)" }}>NOW</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Details</h3>
          <div className="space-y-2.5 text-sm">
            <Row icon={<Calendar className="h-4 w-4" />} k="Service" v={`${service.displayName} · ${booking.duration_hours} hr${booking.duration_hours > 1 ? "s" : ""}`} />
            <Row icon={<Clock className="h-4 w-4" />} k="Slot" v={slotLabel} />
            {booking.service_address && <Row icon={<MapPin className="h-4 w-4" />} k="Address" v={booking.service_address} />}
            {booking.notes && <Row icon={<MessageCircle className="h-4 w-4" />} k="Notes" v={booking.notes} />}
            <Row icon={<Shield className="h-4 w-4" />} k="Payment" v={`${booking.payment_method.toUpperCase()} · ${formatMoney(booking.total_amount_minor, booking.currency as "INR" | "USD")}`} />
          </div>
        </div>

        {!cancelled && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Worker</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>
                {workerName[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{workerName}</div>
                <Link to="/app/worker/$id" params={{ id: booking.worker_id }} className="text-xs" style={{ color: "var(--teal)" }}>View profile</Link>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border" aria-label="Call"><Phone className="h-4 w-4" /></button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border" aria-label="Message"><MessageCircle className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => nav({ to: "/app" })} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold">
            <Home className="mr-2 inline h-4 w-4" /> Home
          </button>
          <Link to="/app/book" className="flex-1 rounded-xl py-3 text-center text-sm font-semibold"
            style={{ background: "var(--teal)", color: "var(--background)" }}>
            Book again
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ icon, k, v }: { icon: React.ReactNode; k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
        <div className="font-medium">{v}</div>
      </div>
    </div>
  );
}
