import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useViewport } from "@/lib/app/state";
import { Phone, MessageCircle, HeartHandshake, Car, Shield, Star, ArrowRight } from "lucide-react";
import { WORKERS } from "@/lib/worker/data";

export const Route = createFileRoute("/nri/")({ component: NriDash });

function NriDash() {
  const { isMobile } = useViewport();
  const nav = useNavigate();
  const caregivers = WORKERS.filter((w) => w.type === "caregiver");
  const drivers = WORKERS.filter((w) => w.type === "driver");
  return (
    <AppShell title="Family at Home">
      <section className="mb-6 rounded-2xl border p-5"
        style={{ borderColor: "color-mix(in oklab, var(--amber) 35%, var(--border))", background: "linear-gradient(135deg, color-mix(in oklab, var(--amber) 12%, var(--card)), var(--card))" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--amber)" }}>Recommended for your family</div>
            <h2 className="mt-1 text-lg font-bold">Book care for Iyer Residence</h2>
            <p className="text-xs text-muted-foreground">Choose a live-in caregiver or a trusted driver — verified pros in Bengaluru.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/nri/book" search={{ cat: "caregiver" }}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--amber)", color: "var(--background)" }}>
              <HeartHandshake className="h-4 w-4" /> Book caregiver
            </Link>
            <Link to="/nri/book" search={{ cat: "driver" }}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
              <Car className="h-4 w-4" /> Book driver
            </Link>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          <CategoryRow
            title="Caregivers (24/7)"
            cat="caregiver"
            Icon={HeartHandshake}
            workers={caregivers}
            onOpen={(id) => nav({ to: "/nri/book", search: { cat: "caregiver" } })}
            onNav={(id) => nav({ to: "/nri/book", search: { cat: "caregiver" } })}
          />
          <CategoryRow
            title="Drivers"
            cat="driver"
            Icon={Car}
            workers={drivers}
            onOpen={(id) => nav({ to: "/nri/book", search: { cat: "driver" } })}
            onNav={(id) => nav({ to: "/nri/book", search: { cat: "driver" } })}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--amber)" }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--amber)" }}>Linked household</div>
            <div className="mt-1 text-base font-bold">Iyer Residence</div>
            <div className="text-xs text-muted-foreground">A-402 Lotus Heights, Bengaluru</div>
            <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>Care+ active</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full font-bold" style={{ background: "var(--amber)", color: "var(--background)" }}>M</div>
              <div>
                <div className="text-xs text-muted-foreground">Home Manager</div>
                <div className="font-semibold">Meera Reddy</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}><MessageCircle className="h-3 w-3" /> WhatsApp</button>
              <button className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs"><Phone className="h-3 w-3" /> Call</button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Recent alerts</h3>
            <div className="space-y-2 text-xs">
              {[["Booking complete", "Cook · 1h ago", "var(--teal)"], ["Reschedule", "Maid · 3h ago", "var(--amber)"], ["No-show", "Driver · yest.", "var(--coral)"], ["Booking complete", "Cook · yest.", "var(--teal)"], ["Wellness OK", "2d ago", "var(--teal)"]].map(([k, t, c], i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted p-2">
                  <div>
                    <div className="font-medium">{k}</div>
                    <div className="text-muted-foreground">{t}</div>
                  </div>
                  <span className="h-2 w-2 rounded-full" style={{ background: c as string }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Today in Bengaluru · {new Date().toLocaleDateString("en-IN")}</h3>
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {[
              { t: "8:00 AM IST", l: "10:30 PM PST", s: "Cook · Sunita", st: "Completed", c: "var(--teal)" },
              { t: "11:30 AM IST", l: "2:00 AM PST", s: "Maid · Asha", st: "In progress", c: "var(--amber)" },
              { t: "4:00 PM IST", l: "6:30 AM PST", s: "Driver · Ram", st: "Scheduled", c: "var(--muted-foreground)" },
              { t: "7:00 PM IST", l: "9:30 AM PST", s: "Cook · Sunita", st: "Scheduled", c: "var(--muted-foreground)" },
            ].map((b, i) => (
              <li key={i} className="relative rounded-xl border border-border bg-card p-4">
                <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full" style={{ background: b.c }} />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.s}</div>
                    <div className="text-xs text-muted-foreground">{b.t} · your time {b.l}</div>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: `color-mix(in oklab, ${b.c} 18%, transparent)`, color: b.c }}>
                    {b.st}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">7-day summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["Completed", "18", "var(--teal)"], ["No-shows", "1", "var(--coral)"], ["Replaced", "2", "var(--amber)"], ["Avg rating", "4.8★", "var(--gold)"]].map(([k, v, c]) => (
              <div key={k} className="rounded-2xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-1 text-xl font-bold" style={{ color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {!isMobile && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">This month</h4>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }).map((_, i) => {
                  const r = (i * 7) % 11;
                  const c = r === 0 ? "var(--amber)" : r < 7 ? "var(--teal)" : "var(--muted)";
                  return <div key={i} className="aspect-square rounded-md" style={{ background: c }} />;
                })}
              </div>
              <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--teal)" }} /> Done</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--amber)" }} /> No-show</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--muted)" }} /> Idle</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function CategoryRow({
  title, cat, Icon, workers, onOpen,
}: {
  title: string;
  cat: "caregiver" | "driver";
  Icon: typeof HeartHandshake;
  workers: typeof WORKERS;
  onOpen: (id: string) => void;
  onNav: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" style={{ color: "var(--amber)" }} /> {title}
        </div>
        <Link to="/nri/book" search={{ cat }}
          className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--amber)" }}>
          Book now <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {workers.slice(0, 4).map((w) => (
          <button key={w.id}
            onClick={() => onOpen(w.id)}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-[var(--amber)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold"
              style={{ background: "var(--amber)", color: "var(--background)" }}>{w.name[0]}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-sm font-semibold">
                {w.name} <Shield className="h-3 w-3" style={{ color: "var(--amber)" }} />
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{w.zone}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-current" style={{ color: "var(--gold)" }} />{w.rating}</span>
                <span className="text-muted-foreground">₹{w.price}/{cat === "caregiver" ? "day" : "hr"}</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
