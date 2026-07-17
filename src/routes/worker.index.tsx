import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp, useViewport } from "@/lib/app/state";
import { MapPin, Navigation, Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/worker/")({ component: WorkerHome });

function WorkerHome() {
  const app = useApp();
  const { isMobile } = useViewport();
  return (
    <AppShell title="Today">
      {!isMobile && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Namaste, {app.name || "Sunita"}</h2>
          <p className="text-sm text-muted-foreground">3 bookings today · ₹720 expected</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr_1fr]">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {[["Today earnings", "₹540", "var(--purple)"], ["Bookings", "3", "var(--teal)"], ["Rating", "4.9★", "var(--gold)"], ["Acceptance", "96%", "var(--teal)"]].map(([k, v, c]) => (
            <div key={k} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1 text-2xl font-bold" style={{ color: c as string }}>{v}</div>
            </div>
          ))}
        </section>
        <section className="space-y-4">
          <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--purple)", background: "color-mix(in oklab, var(--purple) 10%, transparent)" }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--purple)" }}>Active booking</div>
            <h3 className="mt-1 text-lg font-bold">Cook · 2 hrs · Priya S.</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> A-402, Lotus Heights · 1.2 km
            </div>
            <div className="mt-3 h-32 overflow-hidden rounded-xl bg-muted">
              <svg viewBox="0 0 400 120" className="h-full w-full">
                <rect width="400" height="120" fill="#1a2942" />
                <path d="M 20 100 Q 200 20 380 60" fill="none" stroke="var(--purple)" strokeWidth="3" strokeDasharray="6 4" />
                <circle cx="20" cy="100" r="6" fill="var(--purple)" />
                <circle cx="380" cy="60" r="6" fill="var(--teal)" />
              </svg>
            </div>
            <button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold" style={{ background: "var(--purple)", color: "var(--background)" }}>
              <Navigation className="h-4 w-4" /> Get directions
            </button>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Upcoming</h3>
            <div className="space-y-2">
              {[["2:00 PM", "Cleaning · Sharma family", "₹360"], ["6:30 PM", "Cook · Iyer residence", "₹440"]].map(([t, s, p]) => (
                <div key={s} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <div className="text-sm font-medium">{s}</div>
                    <div className="text-xs text-muted-foreground">{t}</div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--purple)" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Wallet</h3>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-3xl font-bold">₹4,820</div>
            <div className="text-xs text-muted-foreground">Next payout in 3 days</div>
            <div className="mt-3 space-y-1.5 text-xs">
              {[["Mon", "₹540"], ["Sat", "₹680"], ["Fri", "₹420"], ["Thu", "₹720"], ["Wed", "₹360"]].map(([d, a]) => (
                <div key={d} className="flex justify-between"><span className="text-muted-foreground">{d}</span><span>{a}</span></div>
              ))}
            </div>
          </div>
          {!isMobile && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: "var(--purple)" }} />
                <h3 className="text-sm font-semibold">AI Earnings Optimiser</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Current</div>
                  <div className="my-1 h-20 rounded-md bg-muted" />
                  <div className="font-bold">₹24,000</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Potential</div>
                  <div className="my-1 h-20 rounded-md" style={{ background: "var(--purple)" }} />
                  <div className="font-bold" style={{ color: "var(--purple)" }}>₹38,500</div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
