import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/lib/app/state";
import { Shield, QrCode, MessageCircle } from "lucide-react";
import { ReliabilityTimeline } from "@/components/worker/ReliabilityTimeline";

export const Route = createFileRoute("/worker/passport")({ component: WorkerPassport });

function WorkerPassport() {
  const app = useApp();
  return (
    <AppShell title="Your Passport">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in oklab, var(--purple) 50%, var(--background)))" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">{(app.name || "S")[0]}</div>
              <div>
                <div className="text-lg font-bold">{app.name || "Sunita Devi"}</div>
                <div className="text-xs opacity-80">CS-WK-2841 · Verified Pro</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {["Aadhaar verified", "Police verified", "Insured ₹2L"].map((b) => (
                <span key={b} className="rounded-full bg-white/15 px-2 py-1">{b}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Rating", "4.9★"], ["Jobs", "312"], ["On-time", "94%"], ["Earnings", "₹2.4L"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-1 text-xl font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
              <QrCode className="h-16 w-16" />
              <div className="mt-1 text-[11px] text-muted-foreground">Scan to verify</div>
            </div>
            <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(135deg, var(--gold), var(--amber))" }}>
              <div className="text-[10px] uppercase opacity-80">Credit score</div>
              <div className="mt-2 text-3xl font-bold">782</div>
              <div className="text-[11px]">Loan eligible ₹50,000</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Earnings Optimiser</h3>
            <p className="text-xs text-muted-foreground">Add 2 evening slots to grow income.</p>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Current</div>
                <div className="mt-1 text-2xl font-bold">₹24,000</div>
                <div className="mt-2 h-32 w-full rounded-md bg-muted" />
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Potential</div>
                <div className="mt-1 text-2xl font-bold" style={{ color: "var(--purple)" }}>₹38,500</div>
                <div className="mt-2 h-32 w-full rounded-md" style={{ background: "var(--purple)" }} />
              </div>
            </div>
          </div>

          {/* Reliability record */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: "var(--teal)" }} />
              <h3 className="text-sm font-semibold">Your reliability record</h3>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat k="On-time arrival" v="94%" />
              <Stat k="No-shows" v="0" />
              <Stat k="Avg check-in delay" v="4 min" />
            </div>
            <div className="mt-4">
              <ReliabilityTimeline seed={37} label="Last 30 days — your record" />
            </div>
          </div>

          {/* Community standing */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" style={{ color: "var(--teal)" }} />
              <h3 className="text-sm font-semibold">What households say about you</h3>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ["Punctual on time", 43],
                ["Authentic flavours", 38],
                ["Kitchen left clean", 29],
                ["Follows recipe", 24],
                ["Good with dietary restrictions", 19],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span>{k}</span>
                  <span className="text-xs text-muted-foreground">{v} households</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-3">
              <div className="text-sm">
                <div className="font-medium">You have 3 questions from households</div>
                <div className="text-xs text-muted-foreground">Answering helps you get more bookings</div>
              </div>
              <button className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>View and answer</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: "var(--teal)" }}>{v}</div>
    </div>
  );
}
