import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { Wallet, TrendingUp, Download, ArrowUpRight, Banknote, Landmark, Sparkles } from "lucide-react";

export const Route = createFileRoute("/worker/earnings")({ component: WorkerEarnings });

type Range = "week" | "month" | "year";

const WEEK = [
  { d: "Mon", v: 540 }, { d: "Tue", v: 620 }, { d: "Wed", v: 360 },
  { d: "Thu", v: 720 }, { d: "Fri", v: 420 }, { d: "Sat", v: 680 }, { d: "Sun", v: 480 },
];

const PAYOUTS = [
  { id: "p1", date: "12 Jul 2026", amt: 4820, method: "HDFC ****4521", status: "Paid" },
  { id: "p2", date: "5 Jul 2026", amt: 4210, method: "HDFC ****4521", status: "Paid" },
  { id: "p3", date: "28 Jun 2026", amt: 5140, method: "HDFC ****4521", status: "Paid" },
  { id: "p4", date: "21 Jun 2026", amt: 3920, method: "HDFC ****4521", status: "Paid" },
];

const BREAKDOWN = [
  { k: "Cook", pct: 62, amt: 15240, color: "var(--purple)" },
  { k: "Cleaning", pct: 28, amt: 6880, color: "var(--teal)" },
  { k: "Tips & bonuses", pct: 10, amt: 2460, color: "var(--gold)" },
];

function WorkerEarnings() {
  const [range, setRange] = useState<Range>("week");
  const max = Math.max(...WEEK.map((w) => w.v));
  const total = range === "week" ? 3820 : range === "month" ? 24580 : 268400;
  const delta = range === "week" ? "+12%" : range === "month" ? "+18%" : "+34%";
  return (
    <AppShell title="Earnings">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["week", "month", "year"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="rounded-full border px-4 py-1.5 text-xs font-semibold capitalize"
              style={{
                borderColor: range === r ? "var(--purple)" : "var(--border)",
                background: range === r ? "color-mix(in oklab, var(--purple) 14%, transparent)" : "transparent",
                color: range === r ? "var(--purple)" : "var(--foreground)",
              }}
            >
              This {r}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in oklab, var(--purple) 40%, var(--background)))" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">Total earnings · this {range}</div>
                <div className="mt-2 text-4xl font-bold">₹{total.toLocaleString("en-IN")}</div>
                <div className="mt-1 flex items-center gap-1 text-xs opacity-90">
                  <ArrowUpRight className="h-3.5 w-3.5" /> {delta} vs last {range}
                </div>
              </div>
              <Wallet className="h-10 w-10 opacity-70" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              {[["Bookings", "18"], ["Hours", "42"], ["Avg / booking", "₹212"]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/10 p-3">
                  <div className="opacity-70">{k}</div>
                  <div className="mt-1 text-lg font-bold">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Daily earnings</h3>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            <div className="flex h-40 items-end gap-3">
              {WEEK.map((w) => (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-[10px] text-muted-foreground">₹{w.v}</div>
                  <div className="w-full rounded-t-md" style={{ height: `${(w.v / max) * 100}%`, background: "var(--purple)", opacity: 0.85 }} />
                  <div className="text-[10px] text-muted-foreground">{w.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Earnings by service</h3>
            <div className="mt-4 space-y-3">
              {BREAKDOWN.map((b) => (
                <div key={b.k}>
                  <div className="flex justify-between text-xs">
                    <span>{b.k}</span>
                    <span className="text-muted-foreground">₹{b.amt.toLocaleString("en-IN")} · {b.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Wallet balance</h3>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-3xl font-bold">₹4,820</div>
            <div className="text-xs text-muted-foreground">Next payout: Fri 17 Jul</div>
            <button className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--purple)", color: "var(--background)" }}>
              Withdraw now
            </button>
            <button className="mt-2 w-full rounded-xl border border-border py-2 text-xs">Change payout method</button>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--gold)", background: "color-mix(in oklab, var(--gold) 8%, var(--card))" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--gold)" }} />
              <h3 className="text-sm font-semibold">AI Optimiser</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Add 2 evening slots on Tue & Thu to earn <span className="font-bold text-foreground">₹14,500 more</span> per month.
            </p>
            <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Unlock slots
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent payouts</h3>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {PAYOUTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium">₹{p.amt.toLocaleString("en-IN")}</div>
                    <div className="text-[11px] text-muted-foreground">{p.date} · {p.method}</div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)", color: "var(--teal)" }}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
