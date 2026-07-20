import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MapPin, Wallet, ShieldCheck, Clock, Loader2, BadgeCheck } from "lucide-react";
import { useMyWorker, useMyWorkerBookings, useBecomeWorker } from "@/lib/data/worker-self";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { ServiceCategory } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/worker/")({ component: WorkerHome });

function WorkerHome() {
  const { data: worker, isLoading } = useMyWorker();

  if (!isSupabaseConfigured) {
    return <AppShell title="Today"><Notice>Supabase isn't configured.</Notice></AppShell>;
  }
  if (isLoading) {
    return <AppShell title="Today"><div className="h-40 animate-pulse rounded-2xl border border-border bg-card" /></AppShell>;
  }
  if (!worker) return <AppShell title="Become a verified pro"><Onboard /></AppShell>;
  return <AppShell title="Today"><Dashboard worker={worker} /></AppShell>;
}

/** Not a worker yet — the onboarding entry (become_worker). */
function Onboard() {
  const become = useBecomeWorker();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("cook");
  const [zone, setZone] = useState("Goregaon West");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await become.mutateAsync({ name: name.trim(), category, zone: zone.trim() });
      // useMyWorker refetches → renders the dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start onboarding.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border-2 p-6" style={{ borderColor: "var(--purple)" }}>
        <BadgeCheck className="h-8 w-8" style={{ color: "var(--purple)" }} />
        <h2 className="mt-3 text-xl font-bold">Earn as a verified pro</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly payouts, insurance on every gig, and a portable passport that proves your
          track record. Start with the basics — verification comes next.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Sunita Devi"
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-[var(--purple)]" />
          </Field>
          <Field label="Service">
            <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-[var(--purple)]">
              <option value="cook">Cook</option>
              <option value="maid">Maid</option>
              <option value="driver">Driver</option>
              <option value="caregiver">Caregiver</option>
            </select>
          </Field>
          <Field label="Zone">
            <input value={zone} onChange={(e) => setZone(e.target.value)} required
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-[var(--purple)]" />
          </Field>
          {error && <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>{error}</div>}
          <button type="submit" disabled={become.isPending || !name.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--purple)", color: "var(--background)" }}>
            {become.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {become.isPending ? "Creating your profile…" : "Start onboarding"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ worker }: { worker: import("@/lib/supabase/database.types").WorkerRow }) {
  const { data: bookings = [], isLoading } = useMyWorkerBookings();
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "in_progress");
  const active = upcoming[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Namaste, {worker.full_name.split(" ")[0]}</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{worker.worker_id}</span>
          {worker.is_live ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)", color: "var(--teal)" }}>
              <ShieldCheck className="h-3 w-3" /> Verified Pro
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--amber) 18%, transparent)", color: "var(--amber)" }}>
              Verification in progress
            </span>
          )}
        </div>
      </div>

      {!worker.is_live && (
        <Notice tone="amber">
          Your eKYC and police verification are being reviewed (usually 24–48h). You'll start
          receiving bookings the moment it clears.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat k="Rating" v={worker.rating ? `${worker.rating}★` : "New"} c="var(--gold)" />
        <Stat k="Jobs" v={String(worker.jobs_completed)} c="var(--teal)" />
        <Stat k="On-time" v={worker.reliability_score != null ? `${Math.round(worker.reliability_score * 100)}%` : "—"} c="var(--teal)" />
        <Stat k="This month" v={formatMoney(worker.earnings_month_minor)} c="var(--purple)" />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Today &amp; upcoming</h3>
        {isLoading && <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />}
        {!isLoading && upcoming.length === 0 && (
          <Notice>No jobs assigned yet. They'll appear here as households book you.</Notice>
        )}
        {active && (
          <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--purple)", background: "color-mix(in oklab, var(--purple) 10%, transparent)" }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--purple)" }}>Next booking</div>
            <h3 className="mt-1 text-lg font-bold">{getService(active.service_category).displayName} · {active.duration_hours} {active.service_category === "caregiver" ? "days" : "hrs"}</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {new Date(active.slot_datetime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}
            </div>
            {active.service_address && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {active.service_address}
              </div>
            )}
            <div className="mt-2 text-sm font-bold" style={{ color: "var(--purple)" }}>{formatMoney(active.total_amount_minor, active.currency as "INR" | "USD")}</div>
          </div>
        )}
        {upcoming.length > 1 && (
          <div className="mt-2 space-y-2">
            {upcoming.slice(1).map((b) => (
              <div key={b.booking_id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">{getService(b.service_category).displayName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.slot_datetime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--purple)" }}>{formatMoney(b.total_amount_minor, b.currency as "INR" | "USD")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Wallet</h3>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-3xl font-bold">{formatMoney(worker.earnings_month_minor)}</div>
        <div className="text-xs text-muted-foreground">Earned this month · payouts weekly</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Stat({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: c }}>{v}</div>
    </div>
  );
}
function Notice({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  const color = tone === "amber" ? "var(--amber)" : "var(--muted-foreground)";
  const border = tone === "amber" ? "var(--amber)" : "var(--border)";
  return <div className="rounded-2xl border bg-card p-4 text-sm" style={{ color, borderColor: border }}>{children}</div>;
}
