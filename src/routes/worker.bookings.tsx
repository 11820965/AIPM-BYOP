import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { MapPin, Clock, BookOpen, Utensils, KeyRound, ListChecks, StickyNote, Sparkles, Loader2 } from "lucide-react";
import { useMyWorkerBookings } from "@/lib/data/worker-self";
import { useBookingBrief, briefHasContent, useComposedBrief } from "@/lib/data/continuity";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { BookingRow } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/worker/bookings")({ component: WorkerBookings });

type Tab = "today" | "upcoming" | "history";

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function WorkerBookings() {
  const { data: bookings = [], isLoading, error } = useMyWorkerBookings();
  const [tab, setTab] = useState<Tab>("today");
  const now = new Date();

  const active = (b: BookingRow) => b.status === "confirmed" || b.status === "in_progress";
  const today = bookings.filter((b) => active(b) && isSameDay(new Date(b.slot_datetime), now));
  const upcoming = bookings.filter((b) => active(b) && new Date(b.slot_datetime) > now && !isSameDay(new Date(b.slot_datetime), now));
  const history = bookings.filter((b) => ["completed", "cancelled", "no_show", "replaced"].includes(b.status));

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: "today", label: "Today", count: today.length },
    { k: "upcoming", label: "Upcoming", count: upcoming.length },
    { k: "history", label: "History", count: history.length },
  ];

  const shown = tab === "today" ? today : tab === "upcoming" ? upcoming : history;

  return (
    <AppShell title="Bookings">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition"
              style={{ borderColor: on ? "var(--purple)" : "var(--border)", background: on ? "color-mix(in oklab, var(--purple) 14%, transparent)" : "transparent", color: on ? "var(--purple)" : "var(--foreground)" }}>
              {t.label}
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t.count}</span>
            </button>
          );
        })}
      </div>

      {!isSupabaseConfigured && <Note>Supabase isn't configured.</Note>}
      {error && <Note tone="error">Couldn't load your bookings. Try again.</Note>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />}

      {!isLoading && !error && shown.length === 0 && (
        <Note>
          {tab === "history"
            ? "No completed jobs yet. Finished bookings will appear here."
            : "No jobs here yet. Verified workers receive bookings as households book them."}
        </Note>
      )}

      {tab !== "history" && shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((b, i) => {
            const primary = tab === "today" && i === 0;
            return (
              <div key={b.booking_id} className="rounded-2xl border p-5"
                style={{ borderColor: primary ? "var(--purple)" : "var(--border)", borderWidth: primary ? 2 : 1, background: primary ? "color-mix(in oklab, var(--purple) 8%, var(--card))" : "var(--card)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {primary && <span className="mb-1 inline-block text-[10px] uppercase tracking-wider" style={{ color: "var(--purple)" }}>Next up</span>}
                    <h3 className="text-lg font-bold">{getService(b.service_category).displayName} · {b.duration_hours} {b.service_category === "caregiver" ? "days" : "hrs"}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(b.slot_datetime).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                      {b.service_address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{b.service_address}</span>}
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: "var(--purple)" }}>{formatMoney(b.total_amount_minor, b.currency as "INR" | "USD")}</span>
                </div>
                <HomeBriefCard bookingId={b.booking_id} />
              </div>
            );
          })}
        </div>
      )}

      {tab === "history" && history.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.booking_id} className="border-t border-border">
                  <td className="px-4 py-3">{new Date(b.slot_datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getService(b.service_category).displayName}</td>
                  <td className="px-4 py-3 capitalize">{b.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(b.total_amount_minor, b.currency as "INR" | "USD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

/**
 * "Before you arrive — this home." Continuity Memory (0014): the brief the
 * assigned worker (or a promoted backup) sees for a booking, so a swap-in
 * arrives already knowing the home. Renders nothing until there's content.
 */
function HomeBriefCard({ bookingId }: { bookingId: string }) {
  const { data: brief } = useBookingBrief(bookingId);
  const { data: ai, isLoading: aiLoading } = useComposedBrief(brief);
  if (!briefHasContent(brief) || !brief) return null;

  const prose = ai?.prose ?? null;
  const rows: { icon: any; label: string; value: string | null }[] = [
    { icon: Utensils, label: "Food & kitchen", value: brief.dietary },
    { icon: KeyRound, label: "Getting in", value: brief.access },
    { icon: Clock, label: "Routines", value: brief.routines },
    { icon: ListChecks, label: "How they like things", value: brief.preferences },
    { icon: StickyNote, label: "Notes", value: brief.notes },
    { icon: StickyNote, label: "For this visit", value: brief.booking_notes },
  ].filter((r) => r.value);

  return (
    <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--teal) 45%, var(--border))", background: "color-mix(in oklab, var(--teal) 7%, var(--card))" }}>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4" style={{ color: "var(--teal)" }} />
        <h4 className="text-sm font-semibold">Before you arrive — {brief.household_name}'s home</h4>
      </div>

      {aiLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing your brief…
        </div>
      )}

      {!aiLoading && prose ? (
        // v1 — Claude-composed brief
        <div className="mt-3 space-y-1.5 text-sm">
          {prose.split("\n").map((line, i) => {
            const t = line.replace(/^[-•]\s*/, "").trim();
            if (!t) return null;
            return (
              <div key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--teal)" }} />
                <span>{t}</span>
              </div>
            );
          })}
        </div>
      ) : (
        // v0 fallback — the structured fields, surfaced as-is
        !aiLoading && (
          <div className="mt-3 space-y-2.5">
            {rows.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i} className="flex gap-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--teal)" }} />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</div>
                    <div className="text-sm">{r.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground opacity-70">
        {prose ? <><Sparkles className="h-3 w-3" /> AI brief · written by Claude from the household's notes</> : <>Shared by the household so whoever comes knows the home · rule-based brief (v0)</>}
      </p>
    </div>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm" style={{ color }}>{children}</div>;
}
