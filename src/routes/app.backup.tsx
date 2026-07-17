import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { WORKERS, type WorkerType } from "@/lib/worker/data";
import {
  ChefHat, Sparkles, Car, HeartPulse, ShieldCheck,
  CalendarDays, Clock, Zap, Bell, Check, Star, ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/app/backup")({ component: BackupPage });

const CATS: { id: WorkerType; label: string; icon: any; color: string; primary: string; reason: string }[] = [
  { id: "cook", label: "Cook", icon: ChefHat, color: "var(--teal)", primary: "Meena S.", reason: "On leave Sat–Sun" },
  { id: "maid", label: "Maid", icon: Sparkles, color: "var(--gold)", primary: "Lakshmi R.", reason: "Festival break next week" },
  { id: "driver", label: "Driver", icon: Car, color: "var(--amber)", primary: "Rakesh P.", reason: "Available — pre-book anyway" },
  { id: "nurse", label: "Nurse", icon: HeartPulse, color: "var(--purple)", primary: "Asha M.", reason: "Recommended for elder care continuity" },
];

const TRIGGERS = [
  { id: "leave", label: "When primary worker takes leave", icon: CalendarDays },
  { id: "late", label: "When primary is >15 min late", icon: Clock },
  { id: "noshow", label: "On a no-show", icon: Zap },
  { id: "manual", label: "Only when I confirm", icon: Bell },
];

function BackupPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Record<WorkerType, boolean>>({
    cook: true, maid: false, driver: false, nurse: false, caregiver: false,
  });
  const [trigger, setTrigger] = useState<string>("leave");
  const [window, setWindow] = useState<"24h" | "7d" | "30d" | "always">("7d");

  const activeCount = Object.values(selected).filter(Boolean).length;
  const backups = useMemo(() => {
    return (Object.keys(selected) as WorkerType[])
      .filter((k) => selected[k])
      .map((k) => ({
        cat: k,
        candidates: WORKERS.filter((w) => w.type === k).concat(
          // synthesize 1-2 extra fallbacks per type
          [
            { ...WORKERS.find((w) => w.type === k)!, id: `${k}-b2`, name: altName(k, 1), match: 88, jobs: 142, rating: 4.7 },
            { ...WORKERS.find((w) => w.type === k)!, id: `${k}-b3`, name: altName(k, 2), match: 84, jobs: 96,  rating: 4.6 },
          ],
        ),
      }));
  }, [selected]);

  return (
    <AppShell title="Pre-book Backup">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Hero */}
          <section className="rounded-2xl border border-border p-5"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--teal) 14%, var(--card)), var(--card))" }}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklab, var(--teal) 22%, transparent)", color: "var(--teal)" }}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Never miss a day — your home, always covered.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pre-book vetted backup workers across every service. We auto-assign the best match the moment your primary worker is unavailable.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Pill>0 disruption</Pill>
                  <Pill>Same zone, ≤15 min</Pill>
                  <Pill>Verified passport</Pill>
                  <Pill>No extra fee until activated</Pill>
                </div>
              </div>
            </div>
          </section>

          {/* Category select */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">1. Choose services to back up</h3>
              <span className="text-[11px] text-muted-foreground">{activeCount} selected</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATS.map((c) => {
                const I = c.icon;
                const on = selected[c.id];
                return (
                  <button key={c.id} onClick={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))}
                    className="rounded-2xl border p-3 text-left transition"
                    style={{ borderColor: on ? c.color : "var(--border)", background: on ? `color-mix(in oklab, ${c.color} 10%, var(--card))` : "var(--card)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${c.color} 18%, transparent)`, color: c.color }}>
                        <I className="h-4 w-4" />
                      </div>
                      {on && <Check className="h-4 w-4" style={{ color: c.color }} />}
                    </div>
                    <div className="mt-2 text-sm font-semibold">{c.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">Primary: {c.primary}</div>
                    <div className="mt-1 text-[11px]" style={{ color: c.color }}>{c.reason}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Trigger */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">2. When should we auto-activate backup?</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRIGGERS.map((t) => {
                const I = t.icon;
                const on = trigger === t.id;
                return (
                  <button key={t.id} onClick={() => setTrigger(t.id)}
                    className="flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition"
                    style={{ borderColor: on ? "var(--teal)" : "var(--border)", background: on ? "color-mix(in oklab, var(--teal) 10%, var(--card))" : "var(--card)" }}>
                    <I className="h-4 w-4" style={{ color: "var(--teal)" }} />
                    <span className="flex-1">{t.label}</span>
                    <span className="h-4 w-4 rounded-full border" style={{ borderColor: on ? "var(--teal)" : "var(--border)", background: on ? "var(--teal)" : "transparent" }} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Window */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">3. Coverage window</h3>
            <div className="flex flex-wrap gap-2">
              {(["24h","7d","30d","always"] as const).map((w) => (
                <button key={w} onClick={() => setWindow(w)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={{ borderColor: window === w ? "var(--teal)" : "var(--border)", background: window === w ? "var(--teal)" : "transparent", color: window === w ? "var(--background)" : "var(--foreground)" }}>
                  {w === "24h" ? "Next 24 hours" : w === "7d" ? "Next 7 days" : w === "30d" ? "Next 30 days" : "Always on"}
                </button>
              ))}
            </div>
          </section>

          {/* Backup roster */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Your backup roster</h3>
            {backups.length === 0 && (
              <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                Select at least one service above to see backup candidates.
              </div>
            )}
            <div className="space-y-4">
              {backups.map((b) => {
                const meta = CATS.find((c) => c.id === b.cat)!;
                const I = meta.icon;
                return (
                  <div key={b.cat}>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <I className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      {meta.label} backup queue
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {b.candidates.slice(0, 3).map((w, idx) => (
                        <div key={w.id} className="rounded-xl border border-border p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: `color-mix(in oklab, ${meta.color} 22%, transparent)`, color: meta.color }}>
                              {w.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-sm font-semibold">{w.name}</div>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Star className="h-3 w-3" style={{ color: "var(--gold)" }} />
                                {w.rating} · {w.jobs} jobs
                              </div>
                            </div>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ background: idx === 0 ? meta.color : "var(--muted)", color: idx === 0 ? "var(--background)" : "var(--muted-foreground)" }}>
                              #{idx + 1}
                            </span>
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">{w.zone} · ₹{w.price}/hr</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Summary rail */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Summary</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Services covered" value={`${activeCount} of 4`} />
              <Row label="Auto-activation" value={TRIGGERS.find((t) => t.id === trigger)!.label.replace(/^When /, "")} />
              <Row label="Window" value={window === "always" ? "Always on" : window === "24h" ? "Next 24 hours" : window === "7d" ? "Next 7 days" : "Next 30 days"} />
              <Row label="Standby fee" value="Free" accent />
              <Row label="Activation fee" value="Pay only if used" />
            </div>
            <button onClick={() => navigate({ to: "/app/book", search: { cat: "cook" } })}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--teal)", color: "var(--background)" }}>
              Confirm backup plan <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/app/book" search={{ cat: "cook" }} className="mt-2 block text-center text-[11px] text-muted-foreground hover:text-foreground">
              Or book a one-off backup now
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">How it works</div>
            <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li><span className="font-semibold text-foreground">1.</span> We track your primary worker's calendar.</li>
              <li><span className="font-semibold text-foreground">2.</span> Trigger fires (leave / late / no-show).</li>
              <li><span className="font-semibold text-foreground">3.</span> Top backup is dispatched in ≤15 min.</li>
              <li><span className="font-semibold text-foreground">4.</span> You're notified — approve or auto-confirm.</li>
            </ol>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card/60 px-2.5 py-1">{children}</span>;
}
function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-semibold" style={{ color: accent ? "var(--teal)" : undefined }}>{value}</span>
    </div>
  );
}

function altName(t: WorkerType, i: number) {
  const pool: Record<WorkerType, string[]> = {
    cook: ["Suman K.", "Radha B."],
    maid: ["Geeta N.", "Pooja D."],
    driver: ["Imran S.", "Vikas T."],
    nurse: ["Kavita J.", "Mary T."],
    caregiver: ["Sunita D.", "Kamla B."],
  };
  return pool[t][i] ?? "Backup";
}