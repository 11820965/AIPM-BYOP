import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp, useViewport } from "@/lib/app/state";
import {
  ChefHat, Sparkles, Car,
  Brain, TrendingUp, Shield, Check, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({ component: HomePage });

const FEATURES = [
  { icon: ChefHat, label: "Cook", cat: "cook", color: "var(--teal)" },
  { icon: Sparkles, label: "Maid", cat: "maid", color: "var(--gold)" },
  { icon: Car, label: "Driver", cat: "driver", color: "var(--amber)" },
];

type Insight = { icon: any; t: string; a: string; to?: string; search?: Record<string, string> };
const INSIGHTS: Insight[] = [
  { icon: Brain, t: "Your cook is due to take leave Sat", a: "Pre-book backup", to: "/app/backup" },
  { icon: TrendingUp, t: "Save ₹600/mo by switching maid plan", a: "View" },
  { icon: Shield, t: "Meena's reliability score is 97% across 347 bookings. She has never no-showed in your zone.", a: "View her profile", to: "/app/worker/meena" },
];

const PLANS = [
  { name: "Lite", price: 1499, freq: "/mo", perks: ["8 hrs cook or maid", "Priority booking", "Free cancellation"], color: "var(--teal)" },
  { name: "Family", price: 3499, freq: "/mo", perks: ["24 hrs across services", "Same worker guarantee", "Backup worker on leave", "10% off extra hrs"], color: "var(--gold)", popular: true },
  { name: "Care+", price: 5999, freq: "/mo", perks: ["40 hrs across services", "Dedicated coordinator", "Priority scheduling", "20% off extra hrs"], color: "var(--purple)" },
];

function Sparkline() {
  const pts = [10, 14, 12, 18, 22, 19, 26, 23, 30, 28, 34, 31];
  const max = 34;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${i * 16},${40 - (p / max) * 36}`).join(" ");
  return (
    <svg viewBox="0 0 180 40" className="h-10 w-full">
      <path d={d} fill="none" stroke="var(--teal)" strokeWidth="2" />
    </svg>
  );
}

function HomePage() {
  const app = useApp();
  const { isMobile } = useViewport();

  return (
    <AppShell title="Home">
      {!isMobile && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Good morning, {app.name || "Priya"}</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr_280px]">
        {/* AI Insights */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="pulse-glow h-3 w-3 rounded-full" style={{ background: "var(--teal)" }} />
            <h3 className="text-sm font-semibold">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {INSIGHTS.map((it) => {
              const I = it.icon;
              return (
                <div key={it.t} className="rounded-xl bg-muted p-3">
                  <div className="flex items-start gap-2">
                    <I className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--teal)" }} />
                    <div className="flex-1 text-sm">{it.t}</div>
                  </div>
                  {it.to ? (
                    <Link to={it.to as any} search={it.search as any} className="mt-2 block w-full rounded-md py-1.5 text-center text-xs font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>{it.a}</Link>
                  ) : (
                    <button className="mt-2 w-full rounded-md py-1.5 text-xs font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>{it.a}</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature grid */}
        <section>
          <h3 className="mb-3 text-sm font-semibold">What can we help with?</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f) => {
              const I = f.icon;
              return (
                <Link key={f.label} to="/app/book" search={{ cat: f.cat }} className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${f.color} 18%, transparent)`, color: f.color }}>
                    <I className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">From ₹199</div>
                </Link>
              );
            })}
          </div>

          {/* Pre-book backup banner */}
          <Link to="/app/backup" className="mt-4 flex items-center gap-3 rounded-2xl border p-4 transition hover:border-[var(--teal)]"
            style={{ borderColor: "color-mix(in oklab, var(--teal) 35%, var(--border))", background: "linear-gradient(135deg, color-mix(in oklab, var(--teal) 12%, var(--card)), var(--card))" }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklab, var(--teal) 22%, transparent)", color: "var(--teal)" }}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">Pre-book Backup</div>
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--teal)", color: "var(--background)" }}>NEW</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Always-on coverage across cook, maid, and driver. Free until activated.</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Subscription plans */}
          <div className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Monthly subscription plans</h3>
              <span className="text-[11px] text-muted-foreground">Save up to 25% vs hourly</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.name} className="relative rounded-2xl border bg-card p-4"
                  style={{ borderColor: p.popular ? p.color : "var(--border)" }}>
                  {p.popular && (
                    <span className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: p.color, color: "var(--background)" }}>POPULAR</span>
                  )}
                  <div className="text-sm font-semibold" style={{ color: p.color }}>{p.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">₹{p.price.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground">{p.freq}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-1.5 text-xs">
                        <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: p.color }} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-4 h-9 w-full rounded-lg text-xs font-semibold"
                    style={{ background: p.popular ? p.color : "transparent", color: p.popular ? "var(--background)" : p.color, border: "1px solid " + p.color }}>
                    Choose {p.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick stats */}
        {!isMobile && (
          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">NSM</div>
              <div className="mt-1 text-2xl font-bold">1.8</div>
              <div className="text-xs text-muted-foreground">bookings / household / month</div>
              <Sparkline />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Stat label="SLA breach" value="2.1%" color="var(--teal)" />
              <Stat label="Worker availability" value="78%" color="var(--teal)" />
              <Stat label="Churn risk" value="34" color="var(--teal)" />
            </div>
          </aside>
        )}
        {isMobile && (
          <aside className="grid grid-cols-2 gap-3">
            <MiniStat label="NSM" value="1.8" />
            <MiniStat label="SLA" value="2.1%" />
            <MiniStat label="Avail." value="78%" />
            <MiniStat label="Churn" value="34" />
          </aside>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold" style={{ color: "var(--teal)" }}>{value}</div>
    </div>
  );
}
