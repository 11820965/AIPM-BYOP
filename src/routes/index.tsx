import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home, User, Globe2, ArrowRight, ChefHat, Sparkles, Car, HeartPulse } from "lucide-react";
import { useViewport } from "@/lib/app/state";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Casai — India's first home services platform" },
      { name: "description", content: "Book verified cooks, maids, drivers, nurses. Join as a verified worker. Monitor your parents' home from anywhere." },
    ],
  }),
  component: Index,
});

const roles = [
  { to: "/register/household", icon: Home, color: "var(--teal)", title: "I need home services", desc: "Book verified cooks, maids, drivers, nurses." },
  { to: "/register/worker", icon: User, color: "var(--purple)", title: "I want to work", desc: "Join as a verified worker and earn more." },
  { to: "/register/nri", icon: Globe2, color: "var(--amber)", title: "I manage my family home remotely", desc: "Monitor from anywhere in the world." },
];

function Logo({ size = "text-3xl" }: { size?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl pulse-glow" style={{ background: "var(--teal)" }} />
      <span className={`font-bold tracking-tight ${size}`} style={{ color: "var(--teal)" }}>
        Casai
      </span>
    </div>
  );
}

const TRUST_SLIDES = [
  { icon: ChefHat, color: "var(--teal)", title: "Your cook", text: "Aadhaar verified, cuisine certified, and has cooked for 1,200+ households in your zone." },
  { icon: Sparkles, color: "var(--amber)", title: "Your maid", text: "eKYC verified, reference checked, and has a 97% on-time arrival record." },
  { icon: Car, color: "#5BA8FF", title: "Your driver", text: "Aadhaar verified, RTO licence checked, and has a clean traffic record." },
  { icon: HeartPulse, color: "var(--purple)", title: "Your nurse", text: "NMC registered, Aadhaar verified, and has cared for families in your area." },
];

function TrustCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TRUST_SLIDES.length), 2500);
    return () => clearInterval(id);
  }, []);
  const s = TRUST_SLIDES[i]; const I = s.icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}>
          <I className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.color }}>{s.title}</div>
          <p key={i} className="mt-1 text-sm leading-snug animate-fade-in">{s.text}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {TRUST_SLIDES.map((_, n) => (
          <span key={n} className="h-1.5 rounded-full transition-all" style={{ width: n === i ? 18 : 6, background: n === i ? s.color : "var(--muted)" }} />
        ))}
      </div>
    </div>
  );
}

function RoleCard({ r, horizontal }: { r: typeof roles[0]; horizontal?: boolean }) {
  const Icon = r.icon;
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav({ to: r.to })}
      className="group w-full rounded-2xl border-2 bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-2xl"
      style={{ borderColor: r.color }}
    >
      <div className={horizontal ? "flex items-center gap-4" : "space-y-3"}>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${r.color} 18%, transparent)`, color: r.color }}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-foreground">{r.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{r.desc}</div>
        </div>
        {horizontal && <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" style={{ color: r.color }} />}
      </div>
    </button>
  );
}

function Index() {
  const { isMobile } = useViewport();

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background p-6">
        <div className="mt-10 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">India's first AI-powered home services platform</p>
        </div>
        <div className="mt-6"><TrustCarousel /></div>
        <div className="mt-10 flex-1 space-y-4 animate-fade-in">
          {roles.map((r) => <RoleCard key={r.to} r={r} />)}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/app" className="font-medium" style={{ color: "var(--teal)" }}>Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col justify-between overflow-hidden bg-sidebar p-12">
        <Logo size="text-4xl" />
        <div className="relative">
          <h1 className="text-5xl font-bold leading-tight">
            Your Home,<br /><span style={{ color: "var(--teal)" }}>Our Intelligence</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Verified pros, AI-matched. From metro flats to family homes managed an ocean away.
          </p>
          <div className="mt-6 max-w-md"><TrustCarousel /></div>
        </div>
        <div className="relative h-40">
          <svg viewBox="0 0 600 160" className="absolute inset-0 h-full w-full opacity-80">
            <defs>
              <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="600" height="160" fill="url(#sky)" />
            {Array.from({ length: 12 }).map((_, i) => {
              const x = i * 50;
              const h = 40 + ((i * 37) % 80);
              return <rect key={i} x={x} y={160 - h} width={40} height={h} fill="var(--teal)" opacity={0.3 + (i % 3) * 0.15} rx={2} />;
            })}
          </svg>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-12">
        <div className="w-full max-w-[480px] space-y-4">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-semibold">Welcome</h2>
            <p className="text-sm text-muted-foreground">Choose how you'll use Casai</p>
          </div>
          {roles.map((r) => <RoleCard key={r.to} r={r} horizontal />)}
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/app" className="font-medium" style={{ color: "var(--teal)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
