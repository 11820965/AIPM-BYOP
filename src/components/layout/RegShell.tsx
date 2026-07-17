import { ReactNode } from "react";
import { useViewport } from "@/lib/app/state";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  accent: "teal" | "purple" | "amber";
  step: number;
  steps: string[];
  children: ReactNode;
  onBack?: () => void;
};

const ACCENTS = {
  teal: "var(--teal)",
  purple: "var(--purple)",
  amber: "var(--amber)",
};

export function RegShell({ title, accent, step, steps, children }: Props) {
  const { isMobile } = useViewport();
  const c = ACCENTS[accent];
  const pct = Math.round(((step + 1) / steps.length) * 100);

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-sm text-muted-foreground">← Back</Link>
            <span className="text-xs font-medium" style={{ color: c }}>{pct}%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
          </div>
          <h1 className="mt-5 text-xl font-bold">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Step {step + 1} of {steps.length} · {steps[step]}</p>
        </header>
        <div key={step} className="flex-1 animate-slide-in px-5 py-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="grid w-full max-w-[920px] grid-cols-[260px_1fr] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <aside className="border-r border-border bg-sidebar p-8">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg" style={{ background: c }} />
            <span className="text-sm font-semibold">Casai</span>
          </div>
          <ol className="space-y-5">
            {steps.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: done || active ? c : "var(--muted)",
                      color: done || active ? "var(--background)" : "var(--muted-foreground)",
                    }}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: active ? c : done ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>
        <section className="p-10">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <span className="text-sm font-medium" style={{ color: c }}>{pct}% complete</span>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">{steps[step]}</p>
          <div key={step} className="animate-fade-in">{children}</div>
        </section>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children, onClick, accent = "teal", disabled,
}: { children: ReactNode; onClick?: () => void; accent?: "teal" | "purple" | "amber"; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition disabled:opacity-50"
      style={{ background: ACCENTS[accent], color: "var(--background)" }}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"h-12 w-full rounded-xl border border-border bg-input px-4 text-sm text-foreground outline-none transition focus:border-primary " + (props.className ?? "")}
    />
  );
}
