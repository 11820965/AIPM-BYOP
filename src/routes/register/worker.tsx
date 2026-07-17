import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RegShell, PrimaryButton, Field, Input } from "@/components/layout/RegShell";
import { setState } from "@/lib/app/state";
import { Check, ShieldCheck, BookOpen, Play } from "lucide-react";

export const Route = createFileRoute("/register/worker")({
  component: WorkerRegister,
});

const STEPS = ["Welcome", "Mobile + OTP", "Personal", "Aadhaar eKYC", "Skills & docs", "Services", "Review", "Profile live"];

const SERVICES = ["Cook", "Maid", "Driver", "Nurse"];
const LANGS = ["Hindi", "English", "Kannada", "Tamil", "Telugu", "Marathi", "Bengali"];

function WorkerRegister() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["Cook"]);
  const [langs, setLangs] = useState<string[]>(["Hindi", "English"]);
  const nav = useNavigate();
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <RegShell title="Become a verified pro" accent="purple" step={step} steps={STEPS}>
      {step === 0 && (
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="rounded-2xl p-8" style={{ background: "color-mix(in oklab, var(--purple) 18%, transparent)" }}>
            <div className="text-5xl">👷‍♀️</div>
            <div className="mt-4 text-2xl font-bold">Earn ₹25,000+ a month</div>
            <p className="mt-1 text-sm text-muted-foreground">Be your own boss. Choose your hours. Get paid weekly.</p>
          </div>
          <div className="space-y-3">
            {["Weekly payouts to bank", "Free uniform & ID card", "Skill certifications included", "Insurance on every gig"].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" style={{ color: "var(--purple)" }} /> {b}
              </div>
            ))}
            <PrimaryButton accent="purple" onClick={next}>Start verification</PrimaryButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mx-auto max-w-sm space-y-5">
          <Field label="Mobile number">
            <div className="flex h-12 items-center overflow-hidden rounded-xl border border-border bg-input">
              <span className="px-3 text-sm">🇮🇳 +91</span>
              <input placeholder="98765 43210" inputMode="numeric" className="flex-1 bg-transparent px-2 text-sm outline-none" />
            </div>
          </Field>
          <Field label="6-digit OTP">
            <Input placeholder="Any 6 digits" inputMode="numeric" maxLength={6} />
          </Field>
          <PrimaryButton accent="purple" onClick={next}>Verify & continue</PrimaryButton>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Full name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunita Devi" /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date of birth"><Input type="date" /></Field>
            <Field label="Gender">
              <select className="h-12 w-full rounded-xl border border-border bg-input px-4 text-sm"><option>Female</option><option>Male</option><option>Other</option></select>
            </Field>
          </div>
          <Field label="Languages spoken">
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => {
                const on = langs.includes(l);
                return (
                  <button key={l} onClick={() => toggle(langs, setLangs, l)}
                    className="rounded-full border px-3 py-1.5 text-xs"
                    style={{ background: on ? "var(--purple)" : "transparent", color: on ? "var(--background)" : "var(--foreground)", borderColor: on ? "var(--purple)" : "var(--border)" }}>
                    {l}
                  </button>
                );
              })}
            </div>
          </Field>
          <PrimaryButton accent="purple" onClick={next} disabled={!name}>Continue</PrimaryButton>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Field label="Aadhaar number"><Input maxLength={12} inputMode="numeric" placeholder="XXXX XXXX XXXX" /></Field>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--purple)" }}>
              <ShieldCheck className="h-4 w-4" /> Verified by UIDAI
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[["Name", name || "Sunita Devi"], ["DOB", "12 Mar 1992"], ["Address", "Bengaluru, KA"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <Check className="h-3.5 w-3.5" style={{ color: "var(--teal)" }} /> {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PrimaryButton accent="purple" onClick={next}>Confirm & continue</PrimaryButton>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          {["Profile photo", "PAN card", "Police verification"].map((d) => (
            <div key={d} className="flex items-center justify-between rounded-xl border border-dashed border-border p-4">
              <div>
                <div className="text-sm font-medium">{d}</div>
                <div className="text-xs text-muted-foreground">Tap to upload (any file)</div>
              </div>
              <button className="rounded-md border border-border px-3 py-1.5 text-xs">Upload</button>
            </div>
          ))}
          <PrimaryButton accent="purple" onClick={next}>Continue</PrimaryButton>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <Field label="Service categories">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SERVICES.map((s) => {
                const on = selected.includes(s);
                return (
                  <button key={s} onClick={() => toggle(selected, setSelected, s)}
                    className="rounded-xl border p-4 text-sm font-medium transition"
                    style={{
                      background: on ? "color-mix(in oklab, var(--purple) 18%, transparent)" : "var(--card)",
                      borderColor: on ? "var(--purple)" : "var(--border)",
                      color: on ? "var(--purple)" : "var(--foreground)",
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="hidden md:block">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Availability</div>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-8 text-xs">
                <div className="border-b border-r border-border bg-muted p-2">Slot</div>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="border-b border-r border-border bg-muted p-2 text-center">{d}</div>
                ))}
                {["6–10 AM", "10 AM–2 PM", "2–6 PM", "6–10 PM"].map((slot) => (
                  <div key={slot} className="contents">
                    <div className="border-b border-r border-border p-2">{slot}</div>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const on = (d + slot.length) % 3 !== 0;
                      return <button key={d} className="border-b border-r border-border p-2 transition hover:opacity-80" style={{ background: on ? "color-mix(in oklab, var(--purple) 25%, transparent)" : "transparent" }} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <PrimaryButton accent="purple" onClick={next}>Continue</PrimaryButton>
        </div>
      )}

      {step === 6 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Verification status</h3>
            <ol className="space-y-3 border-l-2 border-border pl-4">
              {[["Submitted", true], ["Document review", true], ["Background check", false], ["Profile live", false]].map(([k, done]) => (
                <li key={k as string} className="relative">
                  <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full" style={{ background: done ? "var(--purple)" : "var(--muted)" }} />
                  <div className="text-sm">{k}</div>
                  <div className="text-xs text-muted-foreground">{done ? "Done" : "In progress"}</div>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Earnings calculator</div>
              <div className="mt-1 text-2xl font-bold" style={{ color: "var(--purple)" }}>₹28,400 / mo</div>
              <p className="text-xs text-muted-foreground">Based on 6 hrs/day, 5 days/week, ₹220/hr.</p>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">While you wait — training</h3>
            <div className="space-y-3">
              {["Hygiene basics", "Communication skills", "Safety & SLAs"].map((v) => (
                <div key={v} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "color-mix(in oklab, var(--purple) 18%, transparent)" }}>
                    <Play className="h-4 w-4" style={{ color: "var(--purple)" }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{v}</div>
                    <div className="text-xs text-muted-foreground">4 lessons · 25 min</div>
                  </div>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            <PrimaryButton accent="purple" onClick={next}>Mark as approved (demo)</PrimaryButton>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6 text-center">
          <div className="check-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--purple)" }}>
            <Check className="h-10 w-10" style={{ color: "var(--background)" }} />
          </div>
          <h3 className="text-2xl font-bold">You're live!</h3>
          <div className="mx-auto w-full max-w-[480px] rounded-2xl p-6 text-left" style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in oklab, var(--purple) 60%, var(--background)))" }}>
            <div className="text-xs uppercase tracking-wider opacity-80">Casai Worker Passport</div>
            <div className="mt-2 text-2xl font-bold">{name || "Sunita Devi"}</div>
            <div className="text-sm opacity-90">ID · GS-WK-2841</div>
            <div className="mt-4 flex gap-2 text-[11px]">
              {selected.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-white/15 px-2 py-1">{s}</span>)}
            </div>
          </div>
          <div className="grid gap-3 text-left md:grid-cols-2">
            <Field label="Bank account"><Input placeholder="Account number" /></Field>
            <Field label="IFSC"><Input placeholder="HDFC0001234" /></Field>
          </div>
          <PrimaryButton accent="purple" onClick={() => { setState({ name: name || "Sunita", role: "worker" }); nav({ to: "/worker" }); }}>Go to dashboard</PrimaryButton>
        </div>
      )}
    </RegShell>
  );
}
