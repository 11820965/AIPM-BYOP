import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RegShell, PrimaryButton, Field, Input } from "@/components/layout/RegShell";
import { setState } from "@/lib/app/state";
import { Check, MapPin, Sparkles, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/register/household")({
  component: HouseholdRegister,
});

const STEPS = ["Welcome", "Mobile", "Verify OTP", "Profile", "Address", "All set"];

function HouseholdRegister() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [home, setHome] = useState("Apartment");
  const [family, setFamily] = useState("3");
  const [address, setAddress] = useState("");
  const nav = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <RegShell title="Join Casai" accent="teal" step={step} steps={STEPS}>
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "AI-matched pros", body: "Best worker for your home, instantly." },
              { icon: ShieldCheck, title: "Verified & insured", body: "Aadhaar + police verified, SLA protected." },
              { icon: Zap, title: "Live tracking", body: "Know who's coming and when, every time." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                  <Icon className="mb-3 h-6 w-6" style={{ color: "var(--teal)" }} />
                  <div className="font-semibold">{f.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
          <PrimaryButton onClick={next}>Get started</PrimaryButton>
        </div>
      )}
      {step === 1 && (
        <div className="mx-auto max-w-sm space-y-5">
          <Field label="Mobile number">
            <div className="flex h-12 items-center overflow-hidden rounded-xl border border-border bg-input">
              <span className="flex h-full items-center border-r border-border px-3 text-sm">🇮🇳 +91</span>
              <input
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>
          </Field>
          <PrimaryButton onClick={next} disabled={phone.length < 10}>Get OTP</PrimaryButton>
          <button className="h-12 w-full rounded-xl border border-border text-sm font-medium">Continue with Google</button>
        </div>
      )}
      {step === 2 && (
        <div className="mx-auto max-w-md space-y-5 text-center">
          <p className="text-sm text-muted-foreground">Sent to +91 {phone}</p>
          <div className="flex justify-center gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  const arr = [...otp]; arr[i] = v; setOtp(arr);
                  const nxt = document.getElementById(`otp-${i + 1}`);
                  if (v && nxt) (nxt as HTMLInputElement).focus();
                  if (arr.every((x) => x) && arr.join("").length === 6) setTimeout(next, 300);
                }}
                id={`otp-${i}`}
                className="h-13 w-12 rounded-xl border border-border bg-input text-center text-xl font-semibold outline-none focus:border-primary md:h-[52px] md:w-[52px]"
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Resend in 0:28 · <button className="font-medium" style={{ color: "var(--teal)" }}>Resend</button></p>
          <PrimaryButton onClick={next}>Verify</PrimaryButton>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-5 md:grid md:grid-cols-[140px_1fr] md:gap-8 md:space-y-0">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold" style={{ background: "var(--teal)", color: "var(--background)" }}>
              {(name || "?").slice(0, 1).toUpperCase()}
            </div>
            <button className="text-xs font-medium" style={{ color: "var(--teal)" }}>Upload photo</button>
          </div>
          <div className="space-y-4">
            <Field label="First name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Home type">
                <select value={home} onChange={(e) => setHome(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-input px-4 text-sm">
                  <option>Apartment</option><option>Villa</option><option>Independent house</option>
                </select>
              </Field>
              <Field label="Family size">
                <Input type="number" value={family} onChange={(e) => setFamily(e.target.value)} />
              </Field>
            </div>
            <PrimaryButton onClick={next} disabled={!name}>Continue</PrimaryButton>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          <div className="space-y-4">
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>
              <MapPin className="h-4 w-4" /> Detect with GPS
            </button>
            <Field label="Flat / House no"><Input placeholder="A-402, Lotus Heights" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input defaultValue="Bengaluru" /></Field>
              <Field label="PIN"><Input defaultValue="560103" /></Field>
            </div>
            <PrimaryButton onClick={() => { setState({ name, role: "household" }); next(); }}>Save & continue</PrimaryButton>
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-muted md:block">
            <svg viewBox="0 0 300 300" className="h-full w-full">
              <rect width="300" height="300" fill="#1a2942" />
              {Array.from({ length: 18 }).map((_, i) => (
                <line key={i} x1={i * 18} y1="0" x2={i * 18} y2="300" stroke="#243454" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 18 }).map((_, i) => (
                <line key={i} x1="0" y1={i * 18} x2="300" y2={i * 18} stroke="#243454" strokeWidth="0.5" />
              ))}
              <circle cx="150" cy="150" r="10" fill="var(--teal)" />
              <circle cx="150" cy="150" r="22" fill="none" stroke="var(--teal)" strokeWidth="2" opacity="0.5" />
            </svg>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="check-pop flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--teal)" }}>
            <Check className="h-12 w-12" style={{ color: "var(--background)" }} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Welcome, {name || "friend"}!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your Casai home is ready.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["12k verified pros", "AI matched in 30s", "₹0 platform fee for 30 days"].map((s) => (
              <span key={s} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">{s}</span>
            ))}
          </div>
          <PrimaryButton onClick={() => nav({ to: "/app" })}>Enter Casai</PrimaryButton>
        </div>
      )}
    </RegShell>
  );
}
