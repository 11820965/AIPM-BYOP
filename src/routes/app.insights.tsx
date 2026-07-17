import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Mic, AlertTriangle, TrendingUp } from "lucide-react";
import { useViewport } from "@/lib/app/state";

export const Route = createFileRoute("/app/insights")({ component: Insights });

function Gauge({ score }: { score: number }) {
  const angle = (score / 100) * 180 - 90;
  const color = score > 60 ? "var(--coral)" : score > 40 ? "var(--amber)" : "var(--teal)";
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 120 }}>
      <svg viewBox="0 0 200 120">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251} 251`} />
        <line x1="100" y1="100" x2={100 + 70 * Math.cos((angle * Math.PI) / 180)} y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill={color} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Churn risk</div>
      </div>
    </div>
  );
}

function Insights() {
  const { isMobile } = useViewport();
  const score = 34;
  return (
    <AppShell title="AI Insights">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
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

          <section>
            <h3 className="mb-3 text-sm font-semibold">No-show prediction</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {[["Tue cook", "Low", "12%", "var(--teal)"], ["Wed driver", "Med", "38%", "var(--amber)"], ["Sat clean", "High", "71%", "var(--coral)"]].map(([k, l, p, c]) => (
                <div key={k} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="mt-1 text-lg font-bold" style={{ color: c as string }}>{p}</div>
                  <div className="text-[11px]" style={{ color: c as string }}>{l} risk</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">AI roadmap</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {["Auto-reorder essentials", "Predictive AC service", "Family menu planner"].map((r) => (
                <div key={r} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Coming</div>
                  <div className="text-sm font-medium">{r}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Churn Risk Score</h3>
          <Gauge score={score} />
          <div className="space-y-2 text-xs">
            {[
              ["Booking frequency", "+8%", "var(--teal)"],
              ["Last rating drop", "-0.2", "var(--coral)"],
              ["Reschedules (30d)", "2", "var(--amber)"],
              ["Plan upgrade signal", "Yes", "var(--teal)"],
              ["Complaint open", "0", "var(--teal)"],
              ["Worker switches", "1", "var(--amber)"],
            ].map(([k, v, c]) => (
              <div key={k} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold" style={{ color: c as string }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>Send offer</button>
            <button className="rounded-md border border-border px-3 py-1.5 text-xs">Call household</button>
            <button className="rounded-md border border-border px-3 py-1.5 text-xs">Add backup</button>
          </div>
          {!isMobile && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">30-day trend</div>
              <svg viewBox="0 0 300 60" className="h-16 w-full">
                <polyline fill="none" stroke="var(--teal)" strokeWidth="2"
                  points={Array.from({ length: 30 }).map((_, i) => `${i * 10},${40 - Math.sin(i * 0.4) * 15 - (i / 30) * 6}`).join(" ")} />
              </svg>
            </div>
          )}
          {score > 60 && (
            <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", background: "color-mix(in oklab, var(--coral) 12%, transparent)" }}>
              <AlertTriangle className="mb-1 h-4 w-4" /> High risk — recommend retention offer.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
