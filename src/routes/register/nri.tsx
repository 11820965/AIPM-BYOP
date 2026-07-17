import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RegShell, PrimaryButton, Field, Input } from "@/components/layout/RegShell";
import { setState } from "@/lib/app/state";
import { Check, Globe2, HeartPulse, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/register/nri")({
  component: NriRegister,
});

const STEPS = ["Welcome", "Account", "Profile", "Verify", "Link household", "Choose plan", "Active"];

function NriRegister() {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<"care" | "basic">("care");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const nav = useNavigate();
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <RegShell title="Care+ for your family in India" accent="amber" step={step} steps={STEPS}>
      {step === 0 && (
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="rounded-2xl p-8 text-center" style={{ background: "color-mix(in oklab, var(--amber) 18%, transparent)" }}>
            <Globe2 className="mx-auto h-16 w-16" style={{ color: "var(--amber)" }} />
            <div className="mt-4 text-2xl font-bold leading-tight">Your parents are in India.<br />You are not.</div>
            <p className="mt-2 text-sm text-muted-foreground">We'll be there when you can't.</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: HeartPulse, t: "Daily wellness checks" },
              { icon: ShieldCheck, t: "Verified, insured pros" },
              { icon: Globe2, t: "Real-time alerts on your timezone" },
            ].map(({ icon: I, t }) => (
              <div key={t} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <I className="h-5 w-5" style={{ color: "var(--amber)" }} />
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
            <PrimaryButton accent="amber" onClick={next}>Set up Care+</PrimaryButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mx-auto max-w-sm space-y-4">
          <Field label="Email"><Input type="email" placeholder="you@gmail.com" /></Field>
          <Field label="Country of residence">
            <select className="h-12 w-full rounded-xl border border-border bg-input px-4 text-sm">
              <option>🇺🇸 United States</option><option>🇬🇧 United Kingdom</option><option>🇦🇪 UAE</option><option>🇨🇦 Canada</option>
            </select>
          </Field>
          <PrimaryButton accent="amber" onClick={next}>Continue</PrimaryButton>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Your name"><Input placeholder="Rajesh Iyer" /></Field>
            <Field label="Phone (with country code)"><Input placeholder="+1 415 555 0123" /></Field>
          </div>
          <Field label="Relationship to family in India">
            <select className="h-12 w-full rounded-xl border border-border bg-input px-4 text-sm">
              <option>Son / Daughter</option><option>Sibling</option><option>Grandchild</option>
            </select>
          </Field>
          <PrimaryButton accent="amber" onClick={next}>Continue</PrimaryButton>
        </div>
      )}

      {step === 3 && (
        <div className="mx-auto max-w-md space-y-5 text-center">
          <p className="text-sm text-muted-foreground">We sent a 6-digit code to your email</p>
          <div className="flex justify-center gap-2">
            {code.map((d, i) => (
              <input key={i} value={d} maxLength={1}
                onChange={(e) => { const a = [...code]; a[i] = e.target.value; setCode(a); }}
                className="h-13 w-12 rounded-xl border border-border bg-input text-center text-xl font-semibold outline-none focus:border-primary md:h-[52px] md:w-[52px]" />
            ))}
          </div>
          <PrimaryButton accent="amber" onClick={next}>Verify</PrimaryButton>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <Field label="Enter household link code">
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input key={i} maxLength={1} className="h-13 w-12 rounded-xl border border-border bg-input text-center text-xl font-semibold outline-none focus:border-primary md:h-[52px] md:w-[52px]" />
                ))}
              </div>
            </Field>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">How your family generates this code</div>
            <div className="grid gap-3 md:grid-cols-3">
              {[["1", "Open Casai", "On their phone"], ["2", "Go to Settings", "Tap 'Share with NRI'"], ["3", "Share code", "Valid for 10 min"]].map(([n, t, s]) => (
                <div key={n} className="rounded-lg bg-muted p-3 text-center">
                  <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--amber)", color: "var(--background)" }}>{n}</div>
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-muted-foreground">{s}</div>
                </div>
              ))}
            </div>
          </div>
          <PrimaryButton accent="amber" onClick={next}>Link household</PrimaryButton>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <button onClick={() => setPlan("care")} className="relative rounded-2xl border-2 p-5 text-left transition" style={{ borderColor: plan === "care" ? "var(--amber)" : "var(--border)" }}>
              <span className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--amber)", color: "var(--background)" }}>Most popular</span>
              <div className="text-lg font-bold">Care+</div>
              <div className="mt-1 text-3xl font-extrabold">$49<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {["Dedicated home manager", "24/7 emergency line", "Weekly wellness call", "Priority worker matching"].map((f) => (
                  <li key={f} className="flex items-center gap-1.5"><Check className="h-3 w-3" style={{ color: "var(--amber)" }} /> {f}</li>
                ))}
              </ul>
            </button>
            <button onClick={() => setPlan("basic")} className="rounded-2xl border-2 p-5 text-left transition" style={{ borderColor: plan === "basic" ? "var(--amber)" : "var(--border)" }}>
              <div className="text-lg font-bold">Basic monitoring</div>
              <div className="mt-1 text-3xl font-extrabold">$15<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {["Booking alerts only", "Monthly summary", "Email support"].map((f) => (
                  <li key={f} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-muted-foreground" /> {f}</li>
                ))}
              </ul>
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Payment</div>
            <div className="mt-2 flex items-center gap-3">
              <Input placeholder="Card number" />
              <Input placeholder="MM/YY" className="w-24" />
              <Input placeholder="CVC" className="w-20" />
            </div>
          </div>
          <PrimaryButton accent="amber" onClick={() => { setState({ name: "Rajesh", role: "nri" }); next(); }}>Subscribe</PrimaryButton>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6 text-center">
          <div className="check-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--amber)" }}>
            <Check className="h-10 w-10" style={{ color: "var(--background)" }} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Care+ is active</h3>
            <p className="text-sm text-muted-foreground">Your family at home is now connected.</p>
          </div>
          <PrimaryButton accent="amber" onClick={() => nav({ to: "/nri" })}>Open dashboard</PrimaryButton>
        </div>
      )}
    </RegShell>
  );
}
