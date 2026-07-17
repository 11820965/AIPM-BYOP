import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Shield, Star, QrCode } from "lucide-react";
import { WORKERS, getWorker, type WorkerType } from "@/lib/worker/data";

type PassportSearch = { w?: string };
export const Route = createFileRoute("/app/passport")({
  component: Passport,
  validateSearch: (s: Record<string, unknown>): PassportSearch => ({
    w: typeof s.w === "string" ? s.w : undefined,
  }),
});

const SKILLS: Record<WorkerType, string[]> = {
  cook: ["North Indian", "South Indian", "Jain", "Diabetic", "Hygiene+"],
  maid: ["Deep cleaning", "Laundry", "Dish wash", "Child-safe", "Hygiene+"],
  driver: ["Sedan", "SUV", "Highway", "City", "Defensive driving"],
  nurse: ["Elder care", "Post-op", "Vitals", "Medication", "First aid"],
  caregiver: ["24/7 live-in", "Elder companion", "Medication", "Mobility support", "Family updates"],
};
const CODE: Record<WorkerType, string> = { cook: "CK", maid: "MD", driver: "DR", nurse: "NR", caregiver: "CG" };

function Passport() {
  const { w: wid } = Route.useSearch();
  const worker = wid ? getWorker(wid) : WORKERS[0];
  const workerName = worker.name;
  const role = worker.type.charAt(0).toUpperCase() + worker.type.slice(1);
  const code = `GS-${CODE[worker.type]}-${(worker.id.length * 1373 % 9000 + 1000)}`;
  return (
    <AppShell title="Worker Passport">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, var(--teal), color-mix(in oklab, var(--teal) 50%, var(--background)))" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">{workerName[0]}</div>
              <div>
                <div className="text-lg font-bold">{workerName}</div>
                <div className="text-xs opacity-80">{code} · {role} · Verified Pro</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {["Aadhaar verified", "Police verified", "Insured ₹2L"].map((b) => (
                <span key={b} className="rounded-full bg-white/15 px-2 py-1">{b}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Rating", `${worker.rating}★`], ["Jobs", String(worker.jobs)], ["On-time", `${worker.reliability}%`], ["Experience", `${worker.yearsExp} yr`]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-1 text-xl font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</div>
            <div className="flex flex-wrap gap-2">
              {SKILLS[worker.type].map((s) => (
                <span key={s} className="rounded-full border border-border px-2 py-1 text-xs">{s}</span>
              ))}
            </div>
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
                <div className="mt-1 text-2xl font-bold" style={{ color: "var(--teal)" }}>₹38,500</div>
                <div className="mt-2 h-32 w-full rounded-md" style={{ background: "var(--teal)" }} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Certifications</h3>
            <div className="mt-3 space-y-3">
              {[["Hygiene+ Pro", 80], ["Elder care basics", 35], ["Knife skills", 0]].map(([k, p]) => (
                <div key={k as string} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{k}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: "var(--teal)" }} />
                    </div>
                  </div>
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs">Enroll</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Booking history</h3>
            <svg viewBox="0 0 400 80" className="mt-3 h-20 w-full">
              {Array.from({ length: 30 }).map((_, i) => {
                const h = 20 + Math.sin(i * 0.7) * 18 + (i % 4) * 6;
                return <rect key={i} x={i * 13} y={80 - h} width={9} height={h} rx={2} fill="var(--teal)" opacity={0.7} />;
              })}
            </svg>
            <div className="text-xs text-muted-foreground">Last 30 days</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
