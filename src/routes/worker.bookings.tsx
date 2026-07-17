import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { MapPin, Navigation, Phone, MessageCircle, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";

export const Route = createFileRoute("/worker/bookings")({ component: WorkerBookings });

type Tab = "today" | "upcoming" | "requests" | "history";

const TODAY = [
  { id: "b1", client: "Priya S.", service: "Cook · 2 hrs", time: "11:00 AM", addr: "A-402, Lotus Heights", dist: "1.2 km", pay: 540, status: "active" },
  { id: "b2", client: "Sharma family", service: "Cleaning · 3 hrs", time: "2:00 PM", addr: "B-1201, Green Valley", dist: "2.4 km", pay: 360, status: "next" },
  { id: "b3", client: "Iyer residence", service: "Cook · 2 hrs", time: "6:30 PM", addr: "C-303, Sea Breeze", dist: "3.1 km", pay: 440, status: "later" },
];

const REQUESTS = [
  { id: "r1", client: "Kapoor family", service: "Cook · daily · 2 hrs", when: "Starts Mon", pay: 480, match: 94 },
  { id: "r2", client: "Anita R.", service: "Cleaning · one-time", when: "Sat 10 AM", pay: 420, match: 88 },
];

const UPCOMING = [
  { id: "u1", day: "Tomorrow", items: [["9:00 AM", "Cook · Priya S.", 540], ["2:00 PM", "Cleaning · Sharma family", 360]] },
  { id: "u2", day: "Wed 17 Jul", items: [["11:00 AM", "Cook · Priya S.", 540], ["6:30 PM", "Cook · Iyer residence", 440]] },
  { id: "u3", day: "Thu 18 Jul", items: [["11:00 AM", "Cook · Priya S.", 540]] },
] as const;

const HISTORY = [
  { id: "h1", date: "14 Jul", client: "Priya S.", service: "Cook · 2 hrs", pay: 540, rating: 5 },
  { id: "h2", date: "14 Jul", client: "Sharma family", service: "Cleaning · 3 hrs", pay: 360, rating: 5 },
  { id: "h3", date: "13 Jul", client: "Iyer residence", service: "Cook · 2 hrs", pay: 440, rating: 4 },
  { id: "h4", date: "13 Jul", client: "Kapoor family", service: "Cook · 2 hrs", pay: 480, rating: 5 },
  { id: "h5", date: "12 Jul", client: "Priya S.", service: "Cook · 2 hrs", pay: 540, rating: 5 },
];

function WorkerBookings() {
  const [tab, setTab] = useState<Tab>("today");
  const tabs: { k: Tab; label: string; count?: number }[] = [
    { k: "today", label: "Today", count: TODAY.length },
    { k: "upcoming", label: "Upcoming" },
    { k: "requests", label: "New requests", count: REQUESTS.length },
    { k: "history", label: "History" },
  ];
  return (
    <AppShell title="Bookings">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition"
              style={{
                borderColor: active ? "var(--purple)" : "var(--border)",
                background: active ? "color-mix(in oklab, var(--purple) 14%, transparent)" : "transparent",
                color: active ? "var(--purple)" : "var(--foreground)",
              }}
            >
              {t.label}
              {t.count != null && <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {tab === "today" && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            {TODAY.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border p-5"
                style={{
                  borderColor: b.status === "active" ? "var(--purple)" : "var(--border)",
                  background: b.status === "active" ? "color-mix(in oklab, var(--purple) 8%, var(--card))" : "var(--card)",
                  borderWidth: b.status === "active" ? 2 : 1,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    {b.status === "active" && (
                      <span className="mb-1 inline-block text-[10px] uppercase tracking-wider" style={{ color: "var(--purple)" }}>
                        Active now
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{b.service} · {b.client}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{b.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{b.addr} · {b.dist}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: "var(--purple)" }}>₹{b.pay}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.status === "active" ? (
                    <>
                      <button className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "var(--purple)", color: "var(--background)" }}>
                        <Navigation className="h-4 w-4" /> Navigate
                      </button>
                      <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm"><Phone className="h-4 w-4" /> Call</button>
                      <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm"><MessageCircle className="h-4 w-4" /> Chat</button>
                    </>
                  ) : (
                    <>
                      <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm"><Phone className="h-4 w-4" /> Call</button>
                      <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm"><MessageCircle className="h-4 w-4" /> Chat</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Today's earnings</div>
              <div className="mt-1 text-3xl font-bold" style={{ color: "var(--purple)" }}>₹1,340</div>
              <div className="text-xs text-muted-foreground">3 bookings · 7 hrs total</div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">In progress</span><span>1</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Upcoming</span><span>2</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Route optimiser</div>
              <p className="mt-1 text-xs text-muted-foreground">Your 3 stops are within 4 km. Estimated travel: 28 min.</p>
              <button className="mt-3 w-full rounded-xl border border-border py-2 text-xs">View day route</button>
            </div>
          </aside>
        </div>
      )}

      {tab === "upcoming" && (
        <div className="space-y-5">
          {UPCOMING.map((day) => (
            <div key={day.id}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" style={{ color: "var(--purple)" }} />
                {day.day}
              </div>
              <div className="space-y-2">
                {day.items.map(([t, s, p]) => (
                  <div key={s as string} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div>
                      <div className="text-sm font-medium">{s}</div>
                      <div className="text-xs text-muted-foreground">{t}</div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--purple)" }}>₹{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {REQUESTS.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">{r.service}</h3>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)", color: "var(--teal)" }}>
                      {r.match}% match
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.client} · {r.when}</div>
                </div>
                <span className="text-lg font-bold" style={{ color: "var(--purple)" }}>₹{r.pay}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "var(--purple)", color: "var(--background)" }}>
                  <CheckCircle2 className="h-4 w-4" /> Accept
                </button>
                <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-right">Rating</th>
                <th className="px-4 py-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-4 py-3">{h.date}</td>
                  <td className="px-4 py-3">{h.client}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.service}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--gold)" }}>{"★".repeat(h.rating)}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{h.pay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
