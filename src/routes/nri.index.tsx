import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HeartHandshake, Car, ArrowRight, Loader2, ShieldCheck, Clock } from "lucide-react";
import {
  useNriLink, useLinkedHousehold, useLinkedBookings, useRedeemInvite,
  localTimezone, timeIn, tzAbbrev,
} from "@/lib/data/nri";
import { getService } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/nri/")({ component: NriDash });

const IST = "Asia/Kolkata";

function NriDash() {
  const { data: link, isLoading } = useNriLink();

  if (!isSupabaseConfigured) {
    return <AppShell title="Family at Home"><Notice>Supabase isn't configured.</Notice></AppShell>;
  }
  if (isLoading) {
    return <AppShell title="Family at Home"><div className="h-40 animate-pulse rounded-2xl border border-border bg-card" /></AppShell>;
  }
  if (!link) return <AppShell title="Family at Home"><LinkHousehold /></AppShell>;
  return <AppShell title="Family at Home"><LinkedDashboard link={link} /></AppShell>;
}

/** Not linked yet — redeem the code the family shared. */
function LinkHousehold() {
  const nav = useNavigate();
  const redeem = useRedeemInvite();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await redeem.mutateAsync({ code: code.trim(), timezone: localTimezone() });
      nav({ to: "/nri" }); // re-renders into the linked dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link with that code.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border-2 p-6" style={{ borderColor: "var(--amber)" }}>
        <ShieldCheck className="h-8 w-8" style={{ color: "var(--amber)" }} />
        <h2 className="mt-3 text-xl font-bold">Link your family's home</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask whoever manages the home in India to open Casai and share a 6-digit code
          (Home → “Invite family abroad”). Enter it here to start monitoring.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            inputMode="numeric" maxLength={6} autoFocus value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="h-14 w-full rounded-xl border border-border bg-input text-center text-2xl font-semibold tracking-[0.4em] outline-none focus:border-[var(--amber)]"
          />
          {error && <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>{error}</div>}
          <button type="submit" disabled={redeem.isPending || code.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--amber)", color: "var(--background)" }}>
            {redeem.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {redeem.isPending ? "Linking…" : "Link household"}
          </button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Your timezone ({localTimezone()}) is saved so alerts show your local time alongside IST.
        </p>
      </div>
    </div>
  );
}

function LinkedDashboard({ link }: { link: { household_id: string; nri_timezone: string } }) {
  const { data: household } = useLinkedHousehold(link.household_id);
  const { data: bookings = [], isLoading } = useLinkedBookings();
  const tz = link.nri_timezone;

  const completed = bookings.filter((b) => b.status === "completed").length;
  const noShows = bookings.filter((b) => b.status === "no_show").length;
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "in_progress");

  return (
    <div className="space-y-6">
      {/* Book care for the family */}
      <section className="rounded-2xl border p-5"
        style={{ borderColor: "color-mix(in oklab, var(--amber) 35%, var(--border))", background: "linear-gradient(135deg, color-mix(in oklab, var(--amber) 12%, var(--card)), var(--card))" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--amber)" }}>Recommended for your family</div>
            <h2 className="mt-1 text-lg font-bold">Book care for {household?.name ?? "your family"}</h2>
            <p className="text-xs text-muted-foreground">Verified caregivers and drivers in {household?.zone ?? "India"}.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/nri/book" search={{ cat: "caregiver" }} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>
              <HeartHandshake className="h-4 w-4" /> Book caregiver
            </Link>
            <Link to="/nri/book" search={{ cat: "driver" }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
              <Car className="h-4 w-4" /> Book driver
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--amber)" }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--amber)" }}>Linked household</div>
            <div className="mt-1 text-base font-bold">{household?.name ?? "…"}</div>
            <div className="text-xs text-muted-foreground">{household?.zone}</div>
            <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>Linked · alerts in {tzAbbrev(new Date().toISOString(), tz)}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat k="Upcoming" v={String(upcoming.length)} c="var(--amber)" />
            <Stat k="Completed" v={String(completed)} c="var(--teal)" />
            <Stat k="No-shows" v={String(noShows)} c="var(--coral)" />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Schedule · {household?.zone ?? "India"}</h3>
          {isLoading && <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />}
          {!isLoading && bookings.length === 0 && (
            <Notice>No bookings yet for this home. Book a caregiver above and it will appear here.</Notice>
          )}
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {bookings.map((b) => {
              const svc = getService(b.service_category);
              const c = b.status === "completed" ? "var(--teal)" : b.status === "no_show" ? "var(--coral)" : b.status === "in_progress" ? "var(--amber)" : "var(--muted-foreground)";
              return (
                <li key={b.booking_id} className="relative rounded-xl border border-border bg-card p-4">
                  <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full" style={{ background: c }} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{svc.displayName}</div>
                      {/* Dual timezone — IST and the NRI's own, from the link */}
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeIn(b.slot_datetime, IST)} {tzAbbrev(b.slot_datetime, IST)}
                        <span className="opacity-60">· your time</span>
                        {timeIn(b.slot_datetime, tz)} {tzAbbrev(b.slot_datetime, tz)}
                      </div>
                    </div>
                    <span className="rounded-full px-2 py-1 text-[10px] font-semibold capitalize" style={{ background: `color-mix(in oklab, ${c} 18%, transparent)`, color: c }}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Stat({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: c }}>{v}</div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{children}</div>;
}
