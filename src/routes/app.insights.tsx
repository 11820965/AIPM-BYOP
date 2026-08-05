import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useMemo } from "react";
import { Mic, ShieldAlert, ShieldCheck, Clock, UserCheck, BellRing, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  useUpcomingBookings, useWorkerMeta, useScoreBooking, useArrangeBackup, useResolveNoShow, useRunCheckpoint,
  bandOf, factorsFor, BAND_LABEL, type RiskBand, type Factor, type BookingRow, type WorkerMeta,
} from "@/lib/data/insights";
import type { ConfirmStatus } from "@/lib/supabase/database.types";
import { getService } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/app/insights")({ component: Insights });

const BAND_COLOR: Record<RiskBand, string> = { low: "var(--teal)", med: "var(--amber)", high: "var(--coral, #c0553f)" };
const DOT: Record<"ok" | "watch" | "risk", string> = { ok: "var(--teal)", watch: "var(--amber)", risk: "var(--coral, #c0553f)" };

function Insights() {
  return (
    <AppShell title="AI Insights">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <NoShowSection />

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Voice booking</h3>
          <div className="mt-4 flex flex-col items-center gap-4">
            <button className="pulse-glow flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--teal)" }}>
              <Mic className="h-10 w-10" style={{ color: "var(--background)" }} />
            </button>
            <div className="grid w-full grid-cols-2 gap-2">
              {["Book my usual cook", "Send my maid now", "Reschedule tomorrow", "Cancel today's driver"].map((c) => (
                <button key={c} className="rounded-full border border-border bg-card px-3 py-2 text-xs">{c}</button>
              ))}
            </div>
            <div className="w-full rounded-xl bg-muted p-3 text-xs">
              <span className="font-semibold" style={{ color: "var(--teal)" }}>Casai:</span> Done — Sunita confirmed for 9 AM tomorrow.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function NoShowSection() {
  const { data: bookings = [], isLoading, error } = useUpcomingBookings();
  const meta = useWorkerMeta([
    ...bookings.map((b) => b.worker_id),
    ...bookings.map((b) => b.backup_worker_id).filter((x): x is string => Boolean(x)),
  ]);
  const names = meta.data ?? {};

  // Sort worst-first by the REAL persisted score (unscored rows sink last).
  const sorted = useMemo(
    () => [...bookings].sort((a, z) => (z.no_show_risk_score ?? -1) - (a.no_show_risk_score ?? -1)),
    [bookings],
  );
  const top = sorted[0];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" style={{ color: "var(--coral, #c0553f)" }} />
        <h3 className="text-sm font-semibold">No-show risk · your upcoming bookings</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 16%, transparent)", color: "var(--teal)" }}>Live score</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Each booking is scored in the database from the worker's real reliability and track record, how soon the slot is, and weekday vs weekend. When risk is high you can put a backup on standby before the slot — and check-in or no-show resolves it for real.
        <span className="opacity-70"> (Heuristic score, not a trained model; production re-scores every 15 min.)</span>
      </p>

      {!isSupabaseConfigured && <Note>Supabase isn't configured.</Note>}
      {error && <Note tone="error">Couldn't load your bookings.</Note>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />}
      {!isLoading && !error && sorted.length === 0 && (
        <Note>No upcoming bookings. Book a service and its no-show risk will appear here.</Note>
      )}

      {sorted.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((b) => (
            <RiskCard key={b.booking_id} b={b} meta={names[b.worker_id]} backupName={b.backup_worker_id ? names[b.backup_worker_id]?.name : undefined} />
          ))}
        </div>
      )}

      {top && <EscalationPanel booking={top} names={names} />}
    </section>
  );
}

function RiskCard({ b, meta, backupName }: { b: BookingRow; meta?: WorkerMeta; backupName?: string }) {
  const score = useScoreBooking();
  const worker = meta?.name ?? b.worker_id;
  const when = new Date(b.slot_datetime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const scored = b.no_show_risk_score != null;
  const band: RiskBand = scored ? (b.risk_band ?? bandOf(b.no_show_risk_score!)) : "low";
  const color = BAND_COLOR[band];
  const pct = scored ? Math.round(b.no_show_risk_score! * 100) : 0;
  const factors: Factor[] = factorsFor(b, meta?.reliability ?? null);

  return (
    <div className="rounded-2xl border bg-card p-4" style={{ borderColor: band === "high" && scored ? color : "var(--border)", borderWidth: band === "high" && scored ? 2 : 1 }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{getService(b.service_category).displayName}</div>
          <div className="text-[11px] text-muted-foreground">{worker} · {when}</div>
        </div>
        <div className="text-right">
          {scored ? (
            <>
              <div className="text-xl font-bold" style={{ color }}>{pct}%</div>
              <div className="text-[10px] font-semibold" style={{ color }}>{BAND_LABEL[band]}</div>
            </>
          ) : (
            <button onClick={() => score.mutate(b.booking_id)} disabled={score.isPending} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">
              {score.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Score now
            </button>
          )}
        </div>
      </div>

      {scored && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="mt-3 space-y-1">
            {factors.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[f.level] }} />
                {f.label}
              </div>
            ))}
          </div>
        </>
      )}
      {!scored && <p className="mt-2 text-[11px] text-muted-foreground">Booked before scoring was enabled — score it to see the risk.</p>}

      {b.status === "replaced" ? (
        <div className="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 12%, transparent)", color: "var(--teal)" }}>
          <ShieldCheck className="h-3 w-3" /> Covered — backup dispatched
        </div>
      ) : backupName ? (
        <div className="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: "color-mix(in oklab, var(--amber) 14%, transparent)", color: "var(--amber)" }}>
          <ShieldCheck className="h-3 w-3" /> Backup on standby: {backupName}
        </div>
      ) : band === "high" && scored ? (
        <div className="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: "color-mix(in oklab, var(--coral,#c0553f) 12%, transparent)", color }}>
          <ShieldAlert className="h-3 w-3" /> Arrange a backup below
        </div>
      ) : null}
    </div>
  );
}

/**
 * The real escalation loop for the highest-risk booking. Every action here
 * hits the database: arrange_backup reserves a genuine standby, and
 * resolve_no_show either releases them (check-in) or promotes them (no-show).
 */
function EscalationPanel({ booking, names }: { booking: BookingRow; names: Record<string, WorkerMeta> }) {
  const arrange = useArrangeBackup();
  const resolve = useResolveNoShow();
  const checkpoint = useRunCheckpoint();

  const worker = names[booking.worker_id]?.name ?? "your worker";
  const backupName = booking.backup_worker_id ? names[booking.backup_worker_id]?.name ?? booking.backup_worker_id : null;
  const hasBackup = Boolean(booking.backup_worker_id);
  const status = booking.status;
  const checkedIn = status === "in_progress" && Boolean(booking.gps_checkin_time);
  const replaced = status === "replaced";
  const noBackupFree = arrange.isSuccess && arrange.data === null && !hasBackup;

  return (
    <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--coral, #c0553f)", background: "color-mix(in oklab, var(--coral,#c0553f) 6%, var(--card))" }}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" style={{ color: "var(--coral,#c0553f)" }} />
        <h4 className="text-sm font-semibold">Auto-escalation — {getService(booking.service_category).displayName} with {worker}</h4>
      </div>

      <ol className="mt-4 space-y-3 border-l-2 pl-4" style={{ borderColor: "color-mix(in oklab, var(--coral,#c0553f) 30%, var(--border))" }}>
        <StepRow icon={ShieldAlert} done title="Booking scored" sub={booking.no_show_risk_score != null ? `${Math.round(booking.no_show_risk_score * 100)}% — ${BAND_LABEL[booking.risk_band ?? bandOf(booking.no_show_risk_score)]}` : "score it on the card above"} when="on booking" />
        <StepRow icon={ShieldCheck} done={hasBackup || replaced} active={!hasBackup && !replaced && !checkedIn} title="Backup on standby" sub={hasBackup ? `${backupName} reserved — slot held` : replaced ? "was reserved and dispatched" : noBackupFree ? "no other worker is free at this slot" : "not arranged yet"} when="before slot" />
        <StepRow icon={BellRing} done={hasBackup || replaced} title="Household covered" sub={hasBackup || replaced ? "you'd be pre-alerted a backup is ready" : "arranged once a backup is on standby"} when="before slot" />
        <StepRow icon={Clock} done={checkedIn || replaced} active={hasBackup && !checkedIn && !replaced} title="At the slot" sub={checkedIn ? `${worker} checked in — backup released` : replaced ? `no check-in — ${backupName ?? "backup"} dispatched` : "awaiting GPS check-in"} when="at slot" />
      </ol>

      {/* Pre-slot confirmation checkpoint */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
        <div className="text-xs">
          <span className="font-semibold">Worker confirmation</span>
          <span className="mx-1 text-muted-foreground">·</span>
          <ConfirmLine status={booking.confirm_status ?? "pending"} backupName={backupName} />
        </div>
        {booking.confirm_status === "pending" && !replaced && !checkedIn && (
          <button onClick={() => checkpoint.mutate(booking.booking_id)} disabled={checkpoint.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
            {checkpoint.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />} Run T-45 checkpoint
          </button>
        )}
      </div>

      {/* Actions — the real loop */}
      {!hasBackup && !replaced && !checkedIn && (
        <div className="mt-4">
          <button onClick={() => arrange.mutate(booking.booking_id)} disabled={arrange.isPending} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--coral,#c0553f)" }}>
            {arrange.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Arrange backup now
          </button>
          {noBackupFree && <p className="mt-2 text-[11px] font-semibold" style={{ color: "var(--coral,#c0553f)" }}>No other {getService(booking.service_category).displayName.toLowerCase()} is free at this slot — try a different time.</p>}
        </div>
      )}

      {hasBackup && !checkedIn && !replaced && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">{backupName} is on standby. At the slot — what happens?</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => resolve.mutate({ bookingId: booking.booking_id, checkedIn: true })} disabled={resolve.isPending} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold disabled:opacity-60" style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>
              {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Worker checks in
            </button>
            <button onClick={() => resolve.mutate({ bookingId: booking.booking_id, checkedIn: false })} disabled={resolve.isPending} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold disabled:opacity-60" style={{ borderColor: "var(--coral,#c0553f)", color: "var(--coral,#c0553f)" }}>
              {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} No check-in
            </button>
          </div>
        </div>
      )}

      {checkedIn && (
        <Outcome color="var(--teal)" icon={CheckCircle2} title="All clear — false alarm, cheaply">
          {worker} checked in on time, so the standby was released and the slot is proceeding normally. The backup cost nothing but a heads-up.
        </Outcome>
      )}
      {replaced && (
        <Outcome color="var(--coral,#c0553f)" icon={ShieldCheck} title={`No-show prevented — ${backupName ?? "backup"} dispatched`}>
          No check-in by the deadline, so the standby was promoted into the slot. The booking now reads “replaced” and shows the backup as the assigned worker — the household is covered.
        </Outcome>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground opacity-70">
        These actions are real — they write to the database. In production the score refreshes on a 15-minute job and the backup is arranged automatically when risk crosses the threshold; here you trigger those steps. Notifications (push/SMS) are the remaining deferred piece.
      </p>
    </div>
  );
}

function StepRow({ icon: Icon, done, active, title, sub, when }: { icon: any; done?: boolean; active?: boolean; title: string; sub: string; when: string }) {
  const on = done || active;
  return (
    <li className="relative">
      <span className="absolute -left-[22px] top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: on ? "var(--coral,#c0553f)" : "var(--muted)" }}>
        {on && <Icon className="h-2.5 w-2.5 text-white" />}
      </span>
      <div className={"rounded-xl border p-3 transition " + (on ? "" : "opacity-40")} style={{ borderColor: active ? "var(--coral,#c0553f)" : "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{title}</div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{when}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </li>
  );
}

function Outcome({ color, icon: Icon, title, children }: { color: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border p-3" style={{ borderColor: color, background: `color-mix(in oklab, ${color} 8%, transparent)` }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

function ConfirmLine({ status, backupName }: { status: ConfirmStatus; backupName?: string | null }) {
  const armed = backupName ? ` — ${backupName} on standby` : " — arranging a backup";
  const map: Record<ConfirmStatus, { text: string; color: string }> = {
    pending: { text: "waiting on the worker to confirm they're coming", color: "var(--muted-foreground)" },
    confirmed: { text: "worker confirmed — on their way", color: "var(--teal)" },
    declined: { text: `worker declined early${armed}`, color: "var(--coral, #c0553f)" },
    expired: { text: `no answer by the cutoff${armed}`, color: "var(--amber)" },
  };
  const { text, color } = map[status] ?? map.pending;
  return <span style={{ color, fontWeight: 600 }}>{text}</span>;
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm" style={{ color }}>{children}</div>;
}
