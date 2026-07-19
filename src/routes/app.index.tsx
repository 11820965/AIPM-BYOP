import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { useApp, useViewport } from "@/lib/app/state";
import { getService, formatFromPrice } from "@/lib/catalog/catalog";
import { useGenerateInvite } from "@/lib/data/nri";
import { Globe2, Loader2 } from "lucide-react";
import {
  ChefHat, Sparkles, Car,
  Brain, TrendingUp, Shield, Check, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({ component: HomePage });

// Icons + accent only. Name and price come from the catalog — the tile is
// not allowed to have an opinion about what a cook costs.
const FEATURES = [
  { icon: ChefHat, cat: "cook", color: "var(--teal)" },
  { icon: Sparkles, cat: "maid", color: "var(--gold)" },
  { icon: Car, cat: "driver", color: "var(--amber)" },
] as const;

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
              const service = getService(f.cat);
              return (
                <Link key={f.cat} to="/app/book" search={{ cat: f.cat }} className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${f.color} 18%, transparent)`, color: f.color }}>
                    <I className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">{service.displayName}</div>
                  {/* Was a hard-coded "From ₹199" while /app/book charged ₹220/hr. */}
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatFromPrice(service)}</div>
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

          {/* Invite a family member abroad (NRI linking, 0007) */}
          <InviteFamily />

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

        {/*
          REMOVED — operations metrics (NSM 1.8, SLA breach 2.1%, worker
          availability 78%, churn risk 34).

          These rendered on the household's own home screen, which meant a
          customer could read the churn score Casai keeps about them, next
          to the plans it wants them to buy. They belong to the ops context
          (/ops, phase P5) and are now unreachable from here by design:
          churn_score has no household RLS policy at all, so the database
          returns nothing even if a query is attempted.

          See SAD §02 (debt) and supabase/migrations/0002_rls_policies.sql.
        */}
      </div>
    </AppShell>
  );
}

function InviteFamily() {
  const generate = useGenerateInvite();
  const [code, setCode] = useState<string | null>(null);

  async function onInvite() {
    try {
      setCode(await generate.mutateAsync());
    } catch {
      /* surfaced below via generate.isError */
    }
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border p-4"
      style={{ borderColor: "color-mix(in oklab, var(--amber) 35%, var(--border))" }}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklab, var(--amber) 20%, transparent)", color: "var(--amber)" }}>
        <Globe2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Invite family abroad</div>
        {code ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Share this code (valid 10 min): <span className="font-mono text-base font-bold tracking-widest" style={{ color: "var(--amber)" }}>{code}</span>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-muted-foreground">Let an NRI family member monitor this home across timezones.</div>
        )}
        {generate.isError && <div className="mt-1 text-xs" style={{ color: "var(--coral)" }}>Couldn't create a code. Are you signed in?</div>}
      </div>
      <button onClick={onInvite} disabled={generate.isPending}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
        style={{ background: "var(--amber)", color: "var(--background)" }}>
        {generate.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {code ? "New code" : "Get code"}
      </button>
    </div>
  );
}
