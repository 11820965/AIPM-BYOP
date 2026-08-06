import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserRound, Loader2, ArrowLeft, Home, User, Globe2 } from "lucide-react";
import { enterAsGuest, homeForRole } from "@/lib/auth/session";

export const Route = createFileRoute("/guest")({ component: GuestGate });

const HINTS = [
  { icon: Home, color: "var(--teal)", label: "Household", code: "casai-home-2026" },
  { icon: User, color: "var(--purple)", label: "Worker", code: "casai-worker-2026" },
  { icon: Globe2, color: "var(--amber)", label: "NRI", code: "casai-nri-2026" },
];

/**
 * Single guest entry with a passcode gate — mirrors the admin gate. One
 * passcode per consumer context (household / worker / NRI); the server
 * (become_guest) validates and elevates, and we route to the returned role.
 */
function GuestGate() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const role = await enterAsGuest(code);
      nav({ to: homeForRole(role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-2xl border-2 p-6" style={{ borderColor: "var(--teal)" }}>
          <UserRound className="h-8 w-8" style={{ color: "var(--teal)" }} />
          <h2 className="mt-3 text-xl font-bold">Guest access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a demo passcode to explore Casai as a household, a worker, or a family member abroad (NRI). No email, no onboarding.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Guest passcode"
              className="h-12 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-[var(--teal)]"
            />
            {error && <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>{error}</div>}
            <button type="submit" disabled={busy || !code.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--teal)" }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              {busy ? "Signing in…" : "Enter"}
            </button>
          </form>

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Demo passcodes</div>
            <div className="space-y-1.5">
              {HINTS.map((h) => {
                const Icon = h.icon;
                return (
                  <button
                    key={h.code} type="button" onClick={() => setCode(h.code)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition hover:bg-accent"
                  >
                    <Icon className="h-4 w-4" style={{ color: h.color }} />
                    <span className="font-medium">{h.label}</span>
                    <code className="ml-auto rounded bg-muted px-1.5 py-0.5">{h.code}</code>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Tap a row to fill the passcode, then Enter.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
