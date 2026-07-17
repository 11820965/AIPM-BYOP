import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/lib/app/state";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, Star, Camera, Award, Clock, MapPin, Phone, Mail, IdCard, CheckCircle2, ChevronRight, Bell, Globe2, Lock } from "lucide-react";

export const Route = createFileRoute("/worker/profile")({ component: WorkerProfile });

const SKILLS = ["North Indian", "South Indian", "Jain", "Diabetic-friendly", "Hygiene+", "Baking"];
const CERTS = [
  { k: "Hygiene+ Pro", pct: 100, done: true },
  { k: "Elder care basics", pct: 60, done: false },
  { k: "Knife skills", pct: 20, done: false },
];
const AREAS = ["Goregaon West", "Andheri West", "Malad West", "Jogeshwari"];
const SLOTS = [
  { d: "Mon", s: ["Morning", "Evening"] },
  { d: "Tue", s: ["Morning"] },
  { d: "Wed", s: ["Morning", "Evening"] },
  { d: "Thu", s: ["Morning"] },
  { d: "Fri", s: ["Morning", "Evening"] },
  { d: "Sat", s: ["Morning", "Afternoon", "Evening"] },
  { d: "Sun", s: [] },
];

function WorkerProfile() {
  const app = useApp();
  const name = app.name || "Sunita Devi";
  const [notify, setNotify] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [lang, setLang] = useState("English");

  return (
    <AppShell title="Profile">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <div className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white" style={{ background: "var(--purple)" }}>
                {name[0]}
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-background text-muted-foreground">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-3 text-lg font-bold">{name}</h2>
            <div className="text-xs text-muted-foreground">Cook · Goregaon West</div>
            <div className="mt-3 flex items-center justify-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-current" style={{ color: "var(--gold)" }} />
              <span className="font-semibold">4.9</span>
              <span className="text-muted-foreground">· 347 jobs</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Aadhaar verified", "Police verified", "Insured ₹2L"].map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px]" style={{ background: "color-mix(in oklab, var(--teal) 14%, transparent)", color: "var(--teal)" }}>
                  <CheckCircle2 className="h-3 w-3" />{b}
                </span>
              ))}
            </div>
            <Link to="/worker/passport" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-semibold">
              <IdCard className="h-4 w-4" /> View Worker Passport
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>+91 98••• 43210</span></div>
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">sunita.d@casai.app</span></div>
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><span>Goregaon West, Mumbai</span></div>
            </div>
            <button className="mt-4 w-full rounded-xl border border-border py-2 text-xs">Edit contact</button>
          </div>

          <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--gold), var(--amber))" }}>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Casai credit score</div>
            <div className="mt-2 text-4xl font-bold">782</div>
            <div className="text-xs">Loan eligible up to ₹50,000</div>
            <button className="mt-3 w-full rounded-xl bg-white/20 py-2 text-xs font-semibold">Apply for loan</button>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills & specialties</h3>
              <button className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">{s}</span>
              ))}
              <button className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">+ Add skill</button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: "var(--purple)" }} />
              <h3 className="text-sm font-semibold">Certifications</h3>
            </div>
            <div className="space-y-4">
              {CERTS.map((c) => (
                <div key={c.k} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.k}</span>
                      <span className="text-xs text-muted-foreground">{c.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.done ? "var(--teal)" : "var(--purple)" }} />
                    </div>
                  </div>
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs">
                    {c.done ? "View" : "Resume"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: "var(--purple)" }} />
              <h3 className="text-sm font-semibold">Availability</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {SLOTS.map((d) => (
                <div key={d.d} className="rounded-lg border border-border p-2 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{d.d}</div>
                  <div className="mt-1 text-[10px]" style={{ color: d.s.length ? "var(--purple)" : "var(--muted-foreground)" }}>
                    {d.s.length ? `${d.s.length} slot${d.s.length > 1 ? "s" : ""}` : "Off"}
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full rounded-xl border border-border py-2 text-xs">Manage schedule</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: "var(--purple)" }} />
              <h3 className="text-sm font-semibold">Service areas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <span key={a} className="rounded-full px-3 py-1 text-xs" style={{ background: "color-mix(in oklab, var(--purple) 12%, transparent)", color: "var(--purple)" }}>
                  {a}
                </span>
              ))}
              <button className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">+ Add area</button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold">Preferences</h3>
            <div className="divide-y divide-border">
              <Row icon={Bell} label="Push notifications" desc="New requests, reminders, payouts">
                <Toggle on={notify} onChange={setNotify} />
              </Row>
              <Row icon={CheckCircle2} label="Auto-accept bookings" desc="From clients with 4.5★ or higher">
                <Toggle on={autoAccept} onChange={setAutoAccept} />
              </Row>
              <Row icon={Globe2} label="Language" desc="App and messages">
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <option>English</option><option>हिन्दी</option><option>मराठी</option>
                </select>
              </Row>
              <Row icon={Shield} label="KYC & documents" desc="Aadhaar, PAN, police verification">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Row>
              <Row icon={Lock} label="Change password" desc="Last changed 2 months ago">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Row>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ icon: Icon, label, desc, children }: { icon: any; label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative h-6 w-11 rounded-full transition"
      style={{ background: on ? "var(--purple)" : "var(--muted)" }}
    >
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition" style={{ left: on ? "22px" : "2px" }} />
    </button>
  );
}
