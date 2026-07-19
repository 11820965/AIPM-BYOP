import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { useViewport } from "@/lib/app/state";
import { Star, Shield, Sparkles, ChefHat, Car, ChevronRight, AlertCircle, Minus, Plus, Loader2 } from "lucide-react";
import { useWorkers, type WorkerCard } from "@/lib/data/workers";
import { useCreateBooking, slotToDatetime } from "@/lib/data/bookings";
import { getService, formatServicePrice, formatMoney } from "@/lib/catalog/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/auth/session";
import type { ServiceCategory } from "@/lib/supabase/database.types";

type BookSearch = { cat?: string };
export const Route = createFileRoute("/app/book")({
  component: BookPage,
  validateSearch: (s: Record<string, unknown>): BookSearch => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
});

// Household categories only — caregiver lives in the NRI context.
// Icons + accent are presentation; label and price come from the catalog.
const CATS: { id: ServiceCategory; icon: any }[] = [
  { id: "cook", icon: ChefHat },
  { id: "maid", icon: Sparkles },
  { id: "driver", icon: Car },
];

const SLOTS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "Now"];

function BookPage() {
  const search = Route.useSearch();
  const initialCat = (search.cat && CATS.some((c) => c.id === search.cat) ? search.cat : "cook") as ServiceCategory;
  const [cat, setCat] = useState<ServiceCategory>(initialCat);
  const [worker, setWorker] = useState<WorkerCard | null>(null);
  const [slot, setSlot] = useState<string>(SLOTS[0]);
  const [duration, setDuration] = useState<number>(2);
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [payment, setPayment] = useState<"upi" | "card" | "cash">("upi");
  const [error, setError] = useState<string>("");
  const { isMobile } = useViewport();
  const nav = useNavigate();
  const { session } = useSession();
  const createBooking = useCreateBooking();

  // Workers now come from Postgres (worker_public), not a seed array.
  const { data: workers = [], isLoading, error: loadError } = useWorkers(cat);

  // Keep a valid selection as the list changes (category switch / load).
  useEffect(() => {
    if (workers.length === 0) {
      setWorker(null);
    } else if (!worker || !workers.some((w) => w.id === worker.id)) {
      setWorker(workers[0]);
    }
  }, [workers, worker]);

  const service = getService(cat);
  const priceMinor = worker?.priceMinor ?? service.priceMinor;
  const subtotalMinor = priceMinor * duration;
  const discountMinor = duration >= 3 ? Math.round(subtotalMinor * 0.12) : 0;
  const totalMinor = subtotalMinor - discountMinor;

  const confirm = async () => {
    setError("");
    if (!worker) return setError("Select a worker first.");
    if (!slot) return setError("Pick a time slot.");
    if (duration < 1) return setError("Duration must be at least 1 hour.");
    if (address.trim().length < 8) return setError("Enter a complete service address (8+ characters).");
    if (!session) return setError("Please sign in to confirm a booking.");

    try {
      // Real row in Postgres now, not localStorage. household_id, the
      // verified-worker check and the amount are all enforced server-side.
      const b = await createBooking.mutateAsync({
        workerId: worker.id,
        category: cat,
        slotDatetime: slotToDatetime(slot),
        durationHours: duration,
        totalMinor,
        currency: service.currency,
        serviceAddress: address.trim(),
        notes: notes.trim(),
        paymentMethod: payment,
      });
      nav({ to: "/app/booking/$id", params: { id: b.booking_id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the booking. Try again.");
    }
  };

  return (
    <AppShell title="Book a service">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
        <aside className="space-y-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</h3>
          {CATS.map((c) => {
            const I = c.icon; const on = cat === c.id;
            const s = getService(c.id);
            return (
              <button key={c.id} onClick={() => { setCat(c.id); setWorker(null); }}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition"
                style={{ borderColor: on ? "var(--teal)" : "var(--border)", background: on ? "color-mix(in oklab, var(--teal) 12%, transparent)" : "var(--card)" }}>
                <I className="h-4 w-4" style={{ color: on ? "var(--teal)" : "var(--muted-foreground)" }} />
                <span className="flex-1 font-medium">{s.displayName}</span>
                <span className="text-xs text-muted-foreground">{formatServicePrice(s)}</span>
              </button>
            );
          })}
          {!isMobile && (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</h4>
              <Toggle label="Verified only" />
              <Slider label="Min rating" value="4.5★" />
              <Slider label="Min reliability" value="90%" />
              <Toggle label="Available today" />
            </div>
          )}
        </aside>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            {isLoading ? "Finding workers near you…" : `${workers.length} verified near you`}
          </h3>

          {!isSupabaseConfigured && <NotConfigured />}
          {isSupabaseConfigured && loadError && (
            <ResultNote tone="error">
              Couldn't load workers. Check your connection and try again.
            </ResultNote>
          )}
          {isSupabaseConfigured && isLoading && <WorkerSkeletons />}
          {isSupabaseConfigured && !isLoading && !loadError && workers.length === 0 && (
            <ResultNote>No verified {service.displayName.toLowerCase()} available in your zone yet.</ResultNote>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {workers.map((w, i) => (
              <div key={w.id}
                onClick={() => setWorker(w)}
                className="cursor-pointer rounded-2xl border bg-card p-4 transition hover:border-primary"
                style={{ borderColor: worker?.id === w.id ? "var(--teal)" : "var(--border)" }}>
                {/* Honest label: the list is ordered by reliability. AI-ranked
                    matching is P4 — there is no model to rank on yet. */}
                {i === 0 && <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>Most reliable</span>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                    className="flex h-12 w-12 items-center justify-center rounded-full font-semibold"
                    style={{ background: "var(--teal)", color: "var(--background)" }}
                    aria-label={`Open ${w.name}'s profile`}
                  >{w.name[0]}</button>
                  <div className="flex-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                      className="font-semibold hover:underline"
                    >{w.name}</button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-current" style={{ color: "var(--gold)" }} /> {w.rating} · {w.jobs} jobs
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 16%, transparent)", color: "var(--teal)" }}>
                        {w.reliability}% reliable
                      </span>
                    </div>
                  </div>
                  <Shield className="h-4 w-4" style={{ color: "var(--teal)" }} />
                </div>

                {/* Verification badges — now driven by real status, not a
                    seed array. A worker only appears here if is_live, so both
                    are verified; shown for the trust signal they carry. */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {w.ekycVerified && <Pill color="var(--teal)" bg="color-mix(in oklab, var(--teal) 14%, transparent)">eKYC</Pill>}
                  {w.policeVerified && <Pill color="var(--teal)" bg="color-mix(in oklab, var(--teal) 14%, transparent)">Police verified</Pill>}
                  <Pill color="var(--purple)" bg="color-mix(in oklab, var(--purple) 14%, transparent)">Trust {w.trust}/100</Pill>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div className="text-lg font-bold">{formatMoney(w.priceMinor)}<span className="text-xs font-normal text-muted-foreground">/hr</span></div>
                  <button onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--teal)" }}>
                    View profile <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-sm font-semibold">Booking summary</h3>
          <div className="mt-3 space-y-3 text-sm">
            <Row k="Service" v={service.displayName} />
            <Row k="Worker" v={worker?.name ?? "—"} />
            <div className="rounded-lg bg-muted p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pick a slot</div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {SLOTS.map((s) => {
                  const on = slot === s;
                  return (
                    <button key={s} onClick={() => setSlot(s)} className="rounded-md py-1.5 text-[11px] transition"
                      style={{ background: on ? "var(--teal)" : "transparent", color: on ? "var(--background)" : "var(--foreground)", border: "1px solid " + (on ? "var(--teal)" : "var(--border)") }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDuration((d) => Math.max(1, d - 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Minus className="h-3 w-3" /></button>
                <span className="w-14 text-center font-medium">{duration} hr{duration > 1 ? "s" : ""}</span>
                <button onClick={() => setDuration((d) => Math.min(12, d + 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Plus className="h-3 w-3" /></button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Service address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat 402, Sunshine Apt, Andheri W"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--teal)]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Notes for worker (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Gate code, preferences, allergies…"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--teal)]" />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Payment</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["upi", "card", "cash"] as const).map((p) => {
                  const on = payment === p;
                  return (
                    <button key={p} onClick={() => setPayment(p)} className="rounded-md py-1.5 text-[11px] uppercase transition"
                      style={{ background: on ? "var(--teal)" : "transparent", color: on ? "var(--background)" : "var(--foreground)", border: "1px solid " + (on ? "var(--teal)" : "var(--border)") }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <Row k="SLA" v={<span style={{ color: "var(--teal)" }}>15-min response</span>} />
            <Row k="Insurance" v={<span style={{ color: "var(--teal)" }}>Included</span>} />
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="space-y-1 text-sm">
            <Row k="Subtotal" v={formatMoney(subtotalMinor)} />
            {discountMinor > 0 && <Row k={<span style={{ color: "var(--teal)" }}>3hr+ discount (12%)</span>} v={<span style={{ color: "var(--teal)" }}>−{formatMoney(discountMinor)}</span>} />}
          </div>
          <div className="mt-2 flex items-center justify-between text-lg font-bold">
            <span>Total</span><span>{formatMoney(totalMinor)}</span>
          </div>
          {duration < 3 && (
            <div className="my-3 rounded-lg border p-2 text-xs" style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>
              💡 Tip: Book for 3+ hours and save 12%.
            </div>
          )}
          {error && (
            <div className="my-2 flex items-start gap-2 rounded-lg border p-2 text-xs" style={{ borderColor: "var(--coral, #ff7a7a)", color: "var(--coral, #ff7a7a)" }}>
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <button disabled={createBooking.isPending || !worker} onClick={confirm} className="mt-3 h-12 w-full rounded-xl font-semibold disabled:opacity-60"
            style={{ background: "var(--teal)", color: "var(--background)" }}>
            {createBooking.isPending ? "Confirming…" : `Confirm booking · ${formatMoney(totalMinor)}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span className="rounded-full px-2 py-0.5 font-medium" style={{ color, background: bg }}>{children}</span>;
}
function WorkerSkeletons() {
  // A skeleton, never a blank screen (SAD §12 / accessibility NFR).
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2.5 w-32 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 h-2.5 w-40 rounded bg-muted" />
          <div className="mt-3 h-5 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
function ResultNote({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm" style={{ color }}>
      {tone === "error" && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
function NotConfigured() {
  return (
    <ResultNote tone="error">
      Supabase isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.
    </ResultNote>
  );
}
function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
function Toggle({ label }: { label: string }) {
  const [on, set] = useState(true);
  return (
    <button onClick={() => set(!on)} className="flex w-full items-center justify-between text-xs">
      <span>{label}</span>
      <span className="h-5 w-9 rounded-full p-0.5" style={{ background: on ? "var(--teal)" : "var(--muted)" }}>
        <span className="block h-4 w-4 rounded-full bg-white transition" style={{ transform: on ? "translateX(16px)" : "translateX(0)" }} />
      </span>
    </button>
  );
}
function Slider({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="font-medium">{value}</span></div>
      <input type="range" className="w-full accent-[var(--teal)]" defaultValue={70} />
    </div>
  );
}
