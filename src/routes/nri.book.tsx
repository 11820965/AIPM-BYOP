import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Star, Shield, HeartHandshake, Car, AlertCircle, Minus, Plus, Loader2 } from "lucide-react";
import { useWorkers, type WorkerCard } from "@/lib/data/workers";
import { useCreateBooking, slotToDatetime } from "@/lib/data/bookings";
import { useNriLink, useLinkedHousehold } from "@/lib/data/nri";
import { getService, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { ServiceCategory } from "@/lib/supabase/database.types";

type BookSearch = { cat?: string };
export const Route = createFileRoute("/nri/book")({
  component: NriBookPage,
  validateSearch: (s: Record<string, unknown>): BookSearch => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
});

const CATS: { id: ServiceCategory; icon: any }[] = [
  { id: "caregiver", icon: HeartHandshake },
  { id: "driver", icon: Car },
];
const DRIVER_SLOTS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];

function NriBookPage() {
  const search = Route.useSearch();
  const initialCat = (search.cat && CATS.some((c) => c.id === search.cat) ? search.cat : "caregiver") as ServiceCategory;
  const [cat, setCat] = useState<ServiceCategory>(initialCat);
  const [worker, setWorker] = useState<WorkerCard | null>(null);
  const [slot, setSlot] = useState<string>(DRIVER_SLOTS[1]);
  const [duration, setDuration] = useState<number>(cat === "caregiver" ? 7 : 2);
  const [notes, setNotes] = useState<string>("");
  const [payment, setPayment] = useState<"upi" | "card" | "cash">("card");
  const [error, setError] = useState<string>("");
  const nav = useNavigate();

  const { data: link } = useNriLink();
  const { data: household } = useLinkedHousehold(link?.household_id);
  const { data: workers = [], isLoading, error: loadError } = useWorkers(cat);
  const createBooking = useCreateBooking();

  useEffect(() => {
    if (workers.length === 0) setWorker(null);
    else if (!worker || !workers.some((w) => w.id === worker.id)) setWorker(workers[0]);
  }, [workers, worker]);

  const service = getService(cat);
  const isCaregiver = cat === "caregiver";
  const unit = isCaregiver ? "day" : "hr";
  const priceMinor = worker?.priceMinor ?? service.priceMinor;
  const subtotalMinor = priceMinor * duration;
  const discountMinor = duration >= 5 ? Math.round(subtotalMinor * 0.15) : 0;
  const totalMinor = subtotalMinor - discountMinor;

  const switchCat = (id: ServiceCategory) => {
    setCat(id);
    setWorker(null);
    setDuration(id === "caregiver" ? 7 : 2);
  };

  const confirm = async () => {
    setError("");
    if (!link) return setError("Link a household first (enter a code on the dashboard).");
    if (!worker) return setError("Select a pro first.");
    if (!household) return setError("Loading the linked household…");
    try {
      // slot_datetime: a caregiver engagement starts tomorrow 8am; a driver
      // uses the chosen time slot.
      const startIso = isCaregiver
        ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); })()
        : slotToDatetime(slot);
      await createBooking.mutateAsync({
        householdId: link.household_id, // book on behalf of the linked home
        workerId: worker.id,
        category: cat,
        slotDatetime: startIso,
        durationHours: duration, // caregiver: days; driver: hours
        totalMinor,
        currency: service.currency,
        serviceAddress: `${household.name}, ${household.zone}`,
        notes: notes.trim(),
        paymentMethod: payment,
      });
      nav({ to: "/nri" }); // the booking appears on the dashboard schedule
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the booking.");
    }
  };

  return (
    <AppShell title="Book for your family in India">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
        <aside className="space-y-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</h3>
          {CATS.map((c) => {
            const I = c.icon; const on = cat === c.id; const s = getService(c.id);
            return (
              <button key={c.id} onClick={() => switchCat(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition"
                style={{ borderColor: on ? "var(--amber)" : "var(--border)", background: on ? "color-mix(in oklab, var(--amber) 12%, transparent)" : "var(--card)" }}>
                <I className="h-4 w-4" style={{ color: on ? "var(--amber)" : "var(--muted-foreground)" }} />
                <span className="flex-1 font-medium">{s.displayName}</span>
                <span className="text-xs text-muted-foreground">{formatMoney(s.priceMinor)}/{s.unit === "day" ? "day" : "hr"}</span>
              </button>
            );
          })}
          <div className="mt-4 rounded-xl border-2 p-3 text-xs" style={{ borderColor: "var(--amber)" }}>
            <div className="font-semibold" style={{ color: "var(--amber)" }}>Booking on behalf</div>
            <div className="mt-1 text-muted-foreground">{household ? `${household.name} · ${household.zone}` : "Not linked yet"}</div>
          </div>
        </aside>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            {isLoading ? "Finding verified pros…" : `${workers.length} verified ${isCaregiver ? "caregivers" : "drivers"}`}
          </h3>
          {!isSupabaseConfigured && <ResultNote tone="error">Supabase isn't configured.</ResultNote>}
          {loadError && <ResultNote tone="error">Couldn't load pros. Try again.</ResultNote>}
          {!isLoading && !loadError && workers.length === 0 && (
            <ResultNote>No verified {isCaregiver ? "caregivers" : "drivers"} available yet.</ResultNote>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {workers.map((w, i) => (
              <div key={w.id} onClick={() => setWorker(w)}
                className="cursor-pointer rounded-2xl border bg-card p-4 transition hover:border-primary"
                style={{ borderColor: worker?.id === w.id ? "var(--amber)" : "var(--border)" }}>
                {i === 0 && <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>Most reliable</span>}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>{w.name[0]}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{w.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-current" style={{ color: "var(--gold)" }} /> {w.rating} · {w.jobs} jobs
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{w.reliability}% reliable · {w.zone}</div>
                  </div>
                  <Shield className="h-4 w-4" style={{ color: "var(--amber)" }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {w.ekycVerified && <Pill>eKYC</Pill>}
                  {w.policeVerified && <Pill>Police verified</Pill>}
                  <Pill>Trust {w.trust}/100</Pill>
                </div>
                <div className="mt-3 text-lg font-bold">{formatMoney(w.priceMinor)}<span className="text-xs font-normal text-muted-foreground">/{unit}</span></div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-sm font-semibold">Booking summary</h3>
          <div className="mt-3 space-y-3 text-sm">
            <Row k="Service" v={service.displayName} />
            <Row k="Pro" v={worker?.name ?? "—"} />
            {!isCaregiver && (
              <div className="rounded-lg bg-muted p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pick a slot</div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {DRIVER_SLOTS.map((s) => {
                    const on = slot === s;
                    return (
                      <button key={s} onClick={() => setSlot(s)} className="rounded-md py-1.5 text-[11px] transition"
                        style={{ background: on ? "var(--amber)" : "transparent", color: on ? "var(--background)" : "var(--foreground)", border: "1px solid " + (on ? "var(--amber)" : "var(--border)") }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{isCaregiver ? "Days" : "Hours"}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDuration((d) => Math.max(1, d - 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Minus className="h-3 w-3" /></button>
                <span className="w-16 text-center font-medium">{duration} {unit}{duration > 1 ? "s" : ""}</span>
                <button onClick={() => setDuration((d) => Math.min(isCaregiver ? 30 : 12, d + 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Plus className="h-3 w-3" /></button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Medications, routines, preferences…"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--amber)]" />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Payment</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["card", "upi", "cash"] as const).map((p) => {
                  const on = payment === p;
                  return (
                    <button key={p} onClick={() => setPayment(p)} className="rounded-md py-1.5 text-[11px] uppercase transition"
                      style={{ background: on ? "var(--amber)" : "transparent", color: on ? "var(--background)" : "var(--foreground)", border: "1px solid " + (on ? "var(--amber)" : "var(--border)") }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <Row k="Family updates" v={<span style={{ color: "var(--amber)" }}>Daily</span>} />
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="space-y-1 text-sm">
            <Row k="Subtotal" v={formatMoney(subtotalMinor)} />
            {discountMinor > 0 && <Row k={<span style={{ color: "var(--amber)" }}>5+ {unit}s discount (15%)</span>} v={<span style={{ color: "var(--amber)" }}>−{formatMoney(discountMinor)}</span>} />}
          </div>
          <div className="mt-2 flex items-center justify-between text-lg font-bold">
            <span>Total</span><span>{formatMoney(totalMinor)}</span>
          </div>
          {error && (
            <div className="my-2 flex items-start gap-2 rounded-lg border p-2 text-xs" style={{ borderColor: "var(--coral, #ff7a7a)", color: "var(--coral, #ff7a7a)" }}>
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <button disabled={createBooking.isPending || !worker || !link} onClick={confirm} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-60"
            style={{ background: "var(--amber)", color: "var(--background)" }}>
            {createBooking.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createBooking.isPending ? "Confirming…" : `Confirm booking · ${formatMoney(totalMinor)}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: "var(--amber)", background: "color-mix(in oklab, var(--amber) 14%, transparent)" }}>{children}</span>;
}
function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
function ResultNote({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return <div className="rounded-xl border border-border bg-card p-4 text-sm" style={{ color }}>{children}</div>;
}
