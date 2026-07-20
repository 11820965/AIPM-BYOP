import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Star, MapPin, IdCard, CheckCircle2, Shield, Award, Clock } from "lucide-react";
import { useMyWorker } from "@/lib/data/worker-self";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkerRow } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/worker/profile")({ component: WorkerProfile });

function WorkerProfile() {
  const { data: worker, isLoading } = useMyWorker();
  if (!isSupabaseConfigured) return <AppShell title="Profile"><Note>Supabase isn't configured.</Note></AppShell>;
  if (isLoading) return <AppShell title="Profile"><div className="h-64 animate-pulse rounded-2xl border border-border bg-card" /></AppShell>;
  if (!worker) return <AppShell title="Profile"><Note>Onboard as a worker first (Home tab).</Note></AppShell>;
  return <AppShell title="Profile"><Profile worker={worker} /></AppShell>;
}

function Profile({ worker }: { worker: WorkerRow }) {
  const ekyc = worker.ekyc_status === "verified";
  const police = worker.police_check_status === "verified";
  const badges: [string, boolean][] = [
    ["Aadhaar verified", ekyc],
    ["Police verified", police],
    ["Insured ₹2L", worker.is_live],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white" style={{ background: "var(--purple)" }}>
            {worker.full_name[0]}
          </div>
          <h2 className="mt-3 text-lg font-bold">{worker.full_name}</h2>
          <div className="text-xs text-muted-foreground">{getService(worker.service_category).displayName} · {worker.zone}</div>
          <div className="text-[11px] text-muted-foreground font-mono">{worker.worker_id}</div>
          <div className="mt-3 flex items-center justify-center gap-1 text-sm">
            {worker.rating != null ? (
              <>
                <Star className="h-4 w-4 fill-current" style={{ color: "var(--gold)" }} />
                <span className="font-semibold">{worker.rating}</span>
                <span className="text-muted-foreground">· {worker.jobs_completed} jobs</span>
              </>
            ) : (
              <span className="text-muted-foreground">New pro · {worker.jobs_completed} jobs</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {badges.map(([b, on]) => (
              <span key={b} className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"
                style={{ background: on ? "color-mix(in oklab, var(--teal) 14%, transparent)" : "var(--muted)", color: on ? "var(--teal)" : "var(--muted-foreground)" }}>
                <CheckCircle2 className="h-3 w-3" />{on ? b : b.replace("verified", "pending")}
              </span>
            ))}
          </div>
          <Link to="/worker/passport" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-semibold">
            <IdCard className="h-4 w-4" /> View Worker Passport
          </Link>
        </div>

        {/* Credit score — the worker's own */}
        {worker.credit_score != null ? (
          <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--gold), var(--amber))" }}>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Casai credit score</div>
            <div className="mt-2 text-4xl font-bold">{worker.credit_score}</div>
            <div className="text-xs">{worker.credit_score >= 700 ? "Loan eligible up to ₹50,000" : "Build history to unlock loans"}</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Casai credit score</div>
            <p className="mt-2 text-sm text-muted-foreground">Builds from your booking consistency and earnings as you complete jobs — then unlocks NBFC loans.</p>
          </div>
        )}
      </aside>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Professional details</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Detail k="Primary service" v={getService(worker.service_category).displayName} />
            <Detail k="Base rate" v={`${formatMoney(getService(worker.service_category).priceMinor)}/${getService(worker.service_category).unit === "day" ? "day" : "hr"}`} />
            <Detail k="Zone" v={worker.zone} />
            <Detail k="Experience" v={worker.experience_years ? `${worker.experience_years} yr` : "New"} />
          </div>
        </div>

        {/* These need their own tables — honest "coming" rather than fake data */}
        <Placeholder icon={Award} title="Skill certifications"
          body="The Casai Skill Academy — enrol in Hygiene+ Pro, Elder care and more to raise your booking rate — arrives in a later release." />
        <Placeholder icon={Clock} title="Availability & service areas"
          body="Set your weekly slots and the zones you cover once scheduling ships. For now your zone is set from onboarding." />
        <Placeholder icon={Shield} title="KYC & documents"
          body={ekyc && police
            ? "Your Aadhaar and police verification are complete."
            : "eKYC and police verification are handled during onboarding and reviewed by the Casai ops team."} />
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 font-medium">{v}</div>
    </div>
  );
}
function Placeholder({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: "var(--purple)" }} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{children}</div>;
}
