import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { Star, Shield, HeartHandshake, Car, ChevronRight, AlertCircle, Minus, Plus } from "lucide-react";
import { WORKERS, type Worker } from "@/lib/worker/data";
import { createBooking } from "@/lib/app/bookings";

type BookSearch = { cat?: string };
export const Route = createFileRoute("/nri/book")({
  component: NriBookPage,
  validateSearch: (s: Record<string, unknown>): BookSearch => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
});

const CATS = [
  { id: "caregiver", label: "Caregiver (24/7)", icon: HeartHandshake, price: "₹380/day" },
  { id: "driver", label: "Driver", icon: Car, price: "₹260/hr" },
];

const CAREGIVER_SLOTS = ["Weekdays", "Weekends", "Full week", "Live-in", "Nights", "Days"];
const DRIVER_SLOTS = ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];

function NriBookPage() {
  const search = Route.useSearch();
  const initialCat = search.cat && CATS.some((c) => c.id === search.cat) ? search.cat : "caregiver";
  const [cat, setCat] = useState<string>(initialCat);
  const initialList = WORKERS.filter((w) => w.type === cat);
  const [worker, setWorker] = useState<Worker>(initialList[0] ?? WORKERS[0]);
  const slots = cat === "caregiver" ? CAREGIVER_SLOTS : DRIVER_SLOTS;
  const [slot, setSlot] = useState<string>(slots[0]);
  const [duration, setDuration] = useState<number>(cat === "caregiver" ? 7 : 2);
  const [address, setAddress] = useState<string>("A-402 Lotus Heights, Bengaluru");
  const [notes, setNotes] = useState<string>("");
  const [payment, setPayment] = useState<"upi" | "card" | "cash">("card");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();

  const visible = WORKERS.filter((w) => w.type === cat);
  const shown = visible.length ? visible : WORKERS;

  const unitLabel = cat === "caregiver" ? "day" : "hr";
  const subtotal = worker.price * duration;
  const discount = duration >= 5 ? Math.round(subtotal * 0.15) : 0;
  const total = subtotal - discount;

  const confirm = () => {
    setError("");
    if (!slot) return setError("Pick a schedule.");
    if (duration < 1) return setError("Duration must be at least 1.");
    if (address.trim().length < 8) return setError("Enter a complete service address (8+ characters).");
    setSubmitting(true);
    const b = createBooking({
      workerId: worker.id,
      workerName: worker.name,
      service: CATS.find((c) => c.id === cat)?.label || cat,
      slot, duration, address: address.trim(), notes: notes.trim(), payment, total,
    });
    setTimeout(() => nav({ to: "/app/booking/$id", params: { id: b.id } }), 300);
  };

  const switchCat = (id: string) => {
    setCat(id);
    const next = WORKERS.find((w) => w.type === id);
    if (next) setWorker(next);
    setSlot(id === "caregiver" ? CAREGIVER_SLOTS[0] : DRIVER_SLOTS[0]);
    setDuration(id === "caregiver" ? 7 : 2);
  };

  return (
    <AppShell title="Book for your family in India">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
        <aside className="space-y-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</h3>
          {CATS.map((c) => {
            const I = c.icon; const on = cat === c.id;
            return (
              <button key={c.id} onClick={() => switchCat(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition"
                style={{ borderColor: on ? "var(--amber)" : "var(--border)", background: on ? "color-mix(in oklab, var(--amber) 12%, transparent)" : "var(--card)" }}>
                <I className="h-4 w-4" style={{ color: on ? "var(--amber)" : "var(--muted-foreground)" }} />
                <span className="flex-1 font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{c.price}</span>
              </button>
            );
          })}
          <div className="mt-4 rounded-xl border-2 p-3 text-xs" style={{ borderColor: "var(--amber)" }}>
            <div className="font-semibold" style={{ color: "var(--amber)" }}>Booking on behalf</div>
            <div className="mt-1 text-muted-foreground">Iyer Residence · Bengaluru</div>
          </div>
        </aside>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{shown.length} verified pros in Bengaluru</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map((w, i) => (
              <div key={w.id}
                onClick={() => setWorker(w)}
                className="cursor-pointer rounded-2xl border bg-card p-4 transition hover:border-primary"
                style={{ borderColor: worker.id === w.id ? "var(--amber)" : "var(--border)" }}>
                {i === 0 && <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>Top match</span>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                    className="flex h-12 w-12 items-center justify-center rounded-full font-semibold"
                    style={{ background: "var(--amber)", color: "var(--background)" }}
                    aria-label={`Open ${w.name}'s passport`}
                  >{w.name[0]}</button>
                  <div className="flex-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                      className="font-semibold hover:underline"
                    >{w.name}</button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-current" style={{ color: "var(--gold)" }} /> {w.rating} · {w.jobs} jobs
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{w.specialty} · {w.zone}</div>
                  </div>
                  <Shield className="h-4 w-4" style={{ color: "var(--amber)" }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  <Pill color="var(--amber)" bg="color-mix(in oklab, var(--amber) 14%, transparent)">eKYC</Pill>
                  <Pill color="var(--amber)" bg="color-mix(in oklab, var(--amber) 14%, transparent)">Police verified</Pill>
                  {w.badges.map((b) => (
                    <Pill key={b.label} color={b.color} bg={`color-mix(in oklab, ${b.color} 14%, transparent)`}>{b.label}</Pill>
                  ))}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div className="text-lg font-bold">₹{w.price}<span className="text-xs font-normal text-muted-foreground">/{unitLabel}</span></div>
                  <button onClick={(e) => { e.stopPropagation(); nav({ to: "/app/worker/$id", params: { id: w.id } }); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--amber)" }}>
                    View passport <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-sm font-semibold">Booking summary</h3>
          <div className="mt-3 space-y-3 text-sm">
            <Row k="Service" v={CATS.find((c) => c.id === cat)?.label || ""} />
            <Row k="Worker" v={worker.name} />
            <div className="rounded-lg bg-muted p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {cat === "caregiver" ? "Schedule" : "Pick a slot"}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {slots.map((s) => {
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{cat === "caregiver" ? "Days" : "Hours"}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDuration((d) => Math.max(1, d - 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Minus className="h-3 w-3" /></button>
                <span className="w-14 text-center font-medium">{duration}{cat === "caregiver" ? " day" : " hr"}{duration > 1 ? "s" : ""}</span>
                <button onClick={() => setDuration((d) => Math.min(cat === "caregiver" ? 30 : 12, d + 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border"><Plus className="h-3 w-3" /></button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Family address in India</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--amber)]" />
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
            <Row k="SLA" v={<span style={{ color: "var(--amber)" }}>15-min response</span>} />
            <Row k="Family updates" v={<span style={{ color: "var(--amber)" }}>Daily</span>} />
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="space-y-1 text-sm">
            <Row k="Subtotal" v={`₹${subtotal}`} />
            {discount > 0 && <Row k={<span style={{ color: "var(--amber)" }}>5+ {cat === "caregiver" ? "days" : "hrs"} discount (15%)</span>} v={<span style={{ color: "var(--amber)" }}>−₹{discount}</span>} />}
          </div>
          <div className="mt-2 flex items-center justify-between text-lg font-bold">
            <span>Total</span><span>₹{total}</span>
          </div>
          {error && (
            <div className="my-2 flex items-start gap-2 rounded-lg border p-2 text-xs" style={{ borderColor: "var(--coral, #ff7a7a)", color: "var(--coral, #ff7a7a)" }}>
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <button disabled={submitting} onClick={confirm} className="mt-3 h-12 w-full rounded-xl font-semibold disabled:opacity-60"
            style={{ background: "var(--amber)", color: "var(--background)" }}>
            {submitting ? "Confirming…" : `Confirm booking · ₹${total}`}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span className="rounded-full px-2 py-0.5 font-medium" style={{ color, background: bg }}>{children}</span>;
}
function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}