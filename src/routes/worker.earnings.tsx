import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Wallet, Banknote } from "lucide-react";
import { useMyWorker, useMyWorkerBookings } from "@/lib/data/worker-self";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow, ServiceCategory } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/worker/earnings")({ component: WorkerEarnings });

function WorkerEarnings() {
  const { data: worker } = useMyWorker();
  const { data: bookings = [], isLoading } = useMyWorkerBookings();

  if (!isSupabaseConfigured) return <AppShell title="Earnings"><Note>Supabase isn't configured.</Note></AppShell>;
  if (!worker) return <AppShell title="Earnings"><Note>Onboard as a worker first (Home tab).</Note></AppShell>;

  const completed = bookings.filter((b) => b.status === "completed");
  const earnedMinor = completed.reduce((s, b) => s + b.total_amount_minor, 0);
  const avgMinor = completed.length ? Math.round(earnedMinor / completed.length) : 0;

  // Real per-category split from completed bookings.
  const byCat = new Map<ServiceCategory, number>();
  for (const b of completed) byCat.set(b.service_category, (byCat.get(b.service_category) ?? 0) + b.total_amount_minor);
  const breakdown = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <AppShell title="Earnings">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* This month — the worker record is the source of truth */}
          <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in oklab, var(--purple) 40%, var(--background)))" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">Earned this month</div>
                <div className="mt-2 text-4xl font-bold">{formatMoney(worker.earnings_month_minor)}</div>
              </div>
              <Wallet className="h-10 w-10 opacity-70" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <MiniTile k="Jobs done" v={String(worker.jobs_completed)} />
              <MiniTile k="Completed value" v={formatMoney(earnedMinor)} />
              <MiniTile k="Avg / booking" v={avgMinor ? formatMoney(avgMinor) : "—"} />
            </div>
          </div>

          {/* Earnings by service — real, from completed bookings */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Earnings by service</h3>
            {isLoading && <div className="mt-3 h-16 animate-pulse rounded-xl bg-muted" />}
            {!isLoading && breakdown.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No completed jobs yet — your earnings by service will appear here.</p>
            )}
            <div className="mt-4 space-y-3">
              {breakdown.map(([cat, minor]) => {
                const pct = Math.round((minor / earnedMinor) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs">
                      <span>{getService(cat).displayName}</span>
                      <span className="text-muted-foreground">{formatMoney(minor)} · {pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--purple)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Wallet</h3>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-3xl font-bold">{formatMoney(worker.earnings_month_minor)}</div>
            <div className="text-xs text-muted-foreground">Earned this month</div>
            {/* Honest: payouts need the payments integration (P2) */}
            <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
              Weekly bank payouts and withdrawals arrive with the payments release. Until then,
              earnings accrue against completed jobs.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Recent completed jobs</h3>
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <div className="space-y-3">
                {completed.slice(0, 5).map((b: BookingRow) => (
                  <div key={b.booking_id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{formatMoney(b.total_amount_minor, b.currency as "INR" | "USD")}</div>
                      <div className="text-[11px] text-muted-foreground">{getService(b.service_category).displayName} · {new Date(b.slot_datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)", color: "var(--teal)" }}>Completed</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function MiniTile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <div className="opacity-70">{k}</div>
      <div className="mt-1 text-lg font-bold">{v}</div>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{children}</div>;
}
