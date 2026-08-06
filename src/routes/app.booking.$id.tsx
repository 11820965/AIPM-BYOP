import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CheckCircle2, MapPin, Clock, Phone, MessageCircle, Shield, X, Home, Calendar, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { useBooking } from "@/lib/data/bookings";
import { useWorker } from "@/lib/data/workers";
import { useBookingBrief, briefHasContent, useComposedBrief } from "@/lib/data/continuity";
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

        {!cancelled && <WorkerBriefPreview bookingId={booking.booking_id} workerName={workerName} />}

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

/**
 * Continuity Memory — the household's preview of the exact "before you
 * arrive" brief their worker (or a backup) will see. The household owns the
 * booking, so booking_home_brief() returns it to them too. Shows the
 * Claude-written v1 prose when a key is set, else the rule-based v0 fields.
 */
function WorkerBriefPreview({ bookingId, workerName }: { bookingId: string; workerName: string }) {
  const { data: brief } = useBookingBrief(bookingId);
  const { data: ai, isLoading: aiLoading } = useComposedBrief(brief);
  const hasContent = briefHasContent(brief);
  const prose = ai?.prose ?? null;

  const fields: [string, string | null | undefined][] = [
    ["Getting in", brief?.access],
    ["Food & kitchen", brief?.dietary],
    ["Routines", brief?.routines],
    ["How they like things", brief?.preferences],
    ["Notes", brief?.notes],
    ["For this visit", brief?.booking_notes],
  ];

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "color-mix(in oklab, var(--teal) 45%, var(--border))", background: "color-mix(in oklab, var(--teal) 7%, var(--card))" }}>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4" style={{ color: "var(--teal)" }} />
        <h3 className="text-sm font-semibold">Before {workerName} arrives — the brief they'll see</h3>
      </div>

      {!hasContent ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't added your home details yet.{" "}
          <Link to="/app/home" className="font-semibold" style={{ color: "var(--teal)" }}>Fill in My home</Link>{" "}
          so whoever comes — {workerName} or a backup — arrives already knowing your home.
        </p>
      ) : aiLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing the brief…</div>
      ) : prose ? (
        <div className="mt-3 space-y-1.5 text-sm">
          {prose.split("\n").map((line, i) => {
            const t = line.replace(/^[-•]\s*/, "").trim();
            if (!t) return null;
            return <div key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--teal)" }} /><span>{t}</span></div>;
          })}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 text-sm">
          {fields.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</div>
              <div>{v}</div>
            </div>
          ))}
        </div>
      )}

      {hasContent && (
        <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground opacity-70">
          {prose
            ? <><Sparkles className="h-3 w-3" /> AI brief · written by Claude from your notes</>
            : <>Rule-based brief (v0) · set ANTHROPIC_API_KEY for the Claude-written version</>}
        </p>
      )}
    </div>
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
