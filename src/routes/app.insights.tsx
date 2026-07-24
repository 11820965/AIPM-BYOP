import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useMemo, useState } from "react";
import { Mic, ShieldAlert, ShieldCheck, Clock, UserCheck, BellRing, Play, RotateCcw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useUpcomingBookings, useWorkerNames, assessRisk, type RiskBand, type BookingRow } from "@/lib/data/insights";
import { getService } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/app/insights")({ component: Insights });

const BAND_COLOR: Record<RiskBand, string> = { low: "var(--teal)", med: "var(--amber)", high: "var(--coral, #c0553f)" };
const BAND_LABEL: Record<RiskBand, string> = { low: "Low risk", med: "Medium risk", high: "High risk" };
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
  const { data: names = {} } = useWorkerNames(bookings.map((b) => b.worker_id));

  // Stable risk per booking; sort worst-first.
  const scored = useMemo(
    () => bookings.map((b) => ({ b, risk: assessRisk(b) })).sort((a, z) => z.risk.score - a.risk.score),
    [bookings],
  );
  const top = scored[0];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" style={{ color: "var(--coral, #c0553f)" }} />
        <h3 className="text-sm font-semibold">No-show risk · your upcoming bookings</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>Simulated</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Casai scores each upcoming booking for the chance the worker doesn't show, and pre-arranges a backup when the risk is high — before the slot.
        <span className="opacity-70"> (Illustrative preview — the prediction model isn't live yet.)</span>
      </p>

      {!isSupabaseConfigured && <Note>Supabase isn't configured.</Note>}
      {error && <Note tone="error">Couldn't load your bookings.</Note>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />}
      {!isLoading && !error && scored.length === 0 && (
        <Note>No upcoming bookings. Book a service and its no-show risk will appear here.</Note>
      )}

      {scored.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scored.map(({ b, risk }) => (
            <RiskCard key={b.booking_id} b={b} worker={names[b.worker_id] ?? b.worker_id} pct={Math.round(risk.score * 100)} band={risk.band} factors={risk.factors} />
          ))}
        </div>
      )}

      {top && <EscalationDemo booking={top.b} worker={names[top.b.worker_id] ?? "your worker"} band={top.risk.band} pct={Math.round(top.risk.score * 100)} />}
    </section>
  );
}

function RiskCard({ b, worker, pct, band, factors }: { b: BookingRow; worker: string; pct: number; band: RiskBand; factors: { label: string; level: "ok" | "watch" | "risk" }[] }) {
  const color = BAND_COLOR[band];
  const when = new Date(b.slot_datetime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="rounded-2xl border bg-card p-4" style={{ borderColor: band === "high" ? color : "var(--border)", borderWidth: band === "high" ? 2 : 1 }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{getService(b.service_category).displayName}</div>
          <div className="text-[11px] text-muted-foreground">{worker} · {when}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color }}>{pct}%</div>
          <div className="text-[10px] font-semibold" style={{ color }}>{BAND_LABEL[band]}</div>
        </div>
      </div>
      {/* mini risk meter */}
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
      {band === "high" && (
        <div className="mt-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: "color-mix(in oklab, var(--coral,#c0553f) 12%, transparent)", color }}>
          <ShieldAlert className="h-3 w-3" /> Backup will be pre-arranged
        </div>
      )}
    </div>
  );
}

type Step = { icon: any; title: string; sub: string; when: string };

function EscalationDemo({ worker, pct }: { booking: BookingRow; worker: string; band: RiskBand; pct: number }) {
  const backup = "Kavita R.";
  const STEPS: Step[] = [
    { icon: ShieldAlert, title: `Risk crosses 0.70 (${Math.max(pct, 72)}%)`, sub: `${worker} flagged high-risk during the 15-min re-score`, when: "~1h before slot" },
    { icon: ShieldCheck, title: "Backup put on standby", sub: `${backup} reserved and notified — slot held`, when: "~1h before" },
    { icon: BellRing, title: "Household pre-alerted", sub: `"We're watching your booking, ${backup} is ready"`, when: "~1h before" },
    { icon: Clock, title: "Slot time — awaiting GPS check-in", sub: "Does the worker arrive and check in?", when: "at slot" },
  ];

  const [step, setStep] = useState(-1);   // -1 idle; 0..3 running; 4 resolved
  const [playing, setPlaying] = useState(false);
  const [outcome, setOutcome] = useState<null | "checkin" | "noshow">(null);

  function play() {
    setOutcome(null);
    setPlaying(true);
    setStep(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) { clearInterval(id); setPlaying(false); setStep(STEPS.length - 1); }
      else setStep(i);
    }, 900);
  }
  function reset() { setStep(-1); setPlaying(false); setOutcome(null); }

  const atSlot = step >= STEPS.length - 1 && !playing;

  return (
    <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--coral, #c0553f)", background: "color-mix(in oklab, var(--coral,#c0553f) 6%, var(--card))" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" style={{ color: "var(--coral,#c0553f)" }} />
          <h4 className="text-sm font-semibold">Auto-escalation — how Casai responds</h4>
        </div>
        {step === -1 ? (
          <button onClick={play} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--coral,#c0553f)" }}>
            <Play className="h-3.5 w-3.5" /> Run the flow
          </button>
        ) : (
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {step === -1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Press play to watch the pre-emptive escalation for the highest-risk booking — backup on standby before the slot, then resolved by GPS check-in.
        </p>
      )}

      {step >= 0 && (
        <ol className="mt-4 space-y-3 border-l-2 pl-4" style={{ borderColor: "color-mix(in oklab, var(--coral,#c0553f) 30%, var(--border))" }}>
          {STEPS.map((s, i) => {
            const done = i < step || (i === step && !playing) || i <= step;
            const active = i === step;
            const Icon = s.icon;
            return (
              <li key={i} className="relative">
                <span className="absolute -left-[22px] top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: i <= step ? "var(--coral,#c0553f)" : "var(--muted)" }}>
                  {i <= step && <Icon className="h-2.5 w-2.5 text-white" />}
                </span>
                <div className={"rounded-xl border p-3 transition " + (i <= step ? "" : "opacity-40")} style={{ borderColor: active ? "var(--coral,#c0553f)" : "var(--border)", background: "var(--card)" }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{s.title}</div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.when}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* outcome branch — appears once we reach the slot */}
      {atSlot && outcome === null && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">At the slot — what happens?</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setOutcome("checkin")} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold" style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>
              <UserCheck className="h-4 w-4" /> Worker checks in
            </button>
            <button onClick={() => setOutcome("noshow")} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold" style={{ borderColor: "var(--coral,#c0553f)", color: "var(--coral,#c0553f)" }}>
              <XCircle className="h-4 w-4" /> No check-in
            </button>
          </div>
        </div>
      )}

      {atSlot && outcome === "checkin" && (
        <Outcome color="var(--teal)" icon={CheckCircle2} title="All clear — false alarm, cheaply">
          {worker} checked in on time. {backup} is released from standby, the SLA timer disarms, and the household is told “{worker} has arrived.” No disruption, no cost beyond a heads-up.
        </Outcome>
      )}
      {atSlot && outcome === "noshow" && (
        <Outcome color="var(--coral,#c0553f)" icon={ShieldCheck} title={`No-show prevented — ${backup} dispatched`}>
          No GPS check-in by the deadline, so {backup} — already on standby — is dispatched immediately. The booking flips to “replaced,” and the household is covered often before they'd have noticed. This is why the backup was arranged early.
        </Outcome>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground opacity-70">
        Front-end walkthrough of the intended flow. The live version runs as a background job every 15 minutes and needs the notification + backup-dispatch services (deferred).
      </p>
    </div>
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

function Note({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm" style={{ color }}>{children}</div>;
}
