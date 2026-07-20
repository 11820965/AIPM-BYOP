import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Shield, QrCode } from "lucide-react";
import { ReliabilityTimeline } from "@/components/worker/ReliabilityTimeline";
import { useMyWorker } from "@/lib/data/worker-self";
import { formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkerRow } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/worker/passport")({ component: WorkerPassport });

function WorkerPassport() {
  const { data: worker, isLoading } = useMyWorker();

  if (!isSupabaseConfigured) return <AppShell title="Your Passport"><Msg>Supabase isn't configured.</Msg></AppShell>;
  if (isLoading) return <AppShell title="Your Passport"><div className="h-64 animate-pulse rounded-2xl border border-border bg-card" /></AppShell>;
  if (!worker) return <AppShell title="Your Passport"><Msg>Onboard as a worker first (Home tab) to get your passport.</Msg></AppShell>;
  return <AppShell title="Your Passport"><Passport worker={worker} /></AppShell>;
}

function Passport({ worker }: { worker: WorkerRow }) {
  const ekyc = worker.ekyc_status === "verified";
  const police = worker.police_check_status === "verified";

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        {/* Credential card */}
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in oklab, var(--purple) 50%, var(--background)))" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">{worker.full_name[0]}</div>
            <div>
              <div className="text-lg font-bold">{worker.full_name}</div>
              <div className="text-xs opacity-80">{worker.worker_id} · {worker.is_live ? "Verified Pro" : "Verification pending"}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <Badge on={ekyc}>Aadhaar {ekyc ? "verified" : "pending"}</Badge>
            <Badge on={police}>Police {police ? "verified" : "pending"}</Badge>
            <Badge on={worker.is_live}>Insured ₹2L</Badge>
          </div>
        </div>

        {/* Real stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard k="Rating" v={worker.rating ? `${worker.rating}★` : "New"} />
          <StatCard k="Jobs" v={String(worker.jobs_completed)} />
          <StatCard k="On-time" v={worker.reliability_score != null ? `${Math.round(worker.reliability_score * 100)}%` : "—"} />
          <StatCard k="This month" v={formatMoney(worker.earnings_month_minor)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
            <QrCode className="h-16 w-16" />
            <div className="mt-1 text-[11px] text-muted-foreground">Scan to verify</div>
          </div>
          {/* Credit score — the worker's own; households never see this */}
          {worker.credit_score != null ? (
            <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(135deg, var(--gold), var(--amber))" }}>
              <div className="text-[10px] uppercase opacity-80">Credit score</div>
              <div className="mt-2 text-3xl font-bold">{worker.credit_score}</div>
              <div className="text-[11px]">{worker.credit_score >= 700 ? "Loan eligible ₹50,000" : "Build history to unlock loans"}</div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Credit score</div>
              <div className="mt-2 text-sm text-muted-foreground">Builds as you complete jobs on Casai.</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: "var(--teal)" }} />
            <h3 className="text-sm font-semibold">Your reliability record</h3>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MiniStat k="On-time arrival" v={worker.reliability_score != null ? `${Math.round(worker.reliability_score * 100)}%` : "—"} />
            <MiniStat k="Jobs completed" v={String(worker.jobs_completed)} />
            <MiniStat k="Experience" v={worker.experience_years ? `${worker.experience_years} yr` : "New"} />
          </div>
          {worker.jobs_completed > 0 ? (
            <div className="mt-4">
              <ReliabilityTimeline seed={worker.jobs_completed} label="Last 30 days — your record" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Your day-by-day reliability timeline appears once you complete your first jobs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className="rounded-full px-2 py-1" style={{ background: on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)", opacity: on ? 1 : 0.7 }}>{children}</span>;
}
function StatCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-bold">{v}</div>
    </div>
  );
}
function MiniStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: "var(--teal)" }}>{v}</div>
    </div>
  );
}
function Msg({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{children}</div>;
}
