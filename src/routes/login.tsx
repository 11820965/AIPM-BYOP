import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { sendEmailOtp, verifyEmailOtp, signInAsGuest, useSession, homeForRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/login")({ component: Login });

/**
 * Sign in (P0 slice 0.4).
 *
 * Email OTP. Phone OTP needs an SMS provider plus TRAI DLT registration —
 * roughly six weeks of lead time — so it is a P2 item and deliberately off
 * the P0 path. Email also happens to be the right channel for the NRI
 * persona, who is abroad.
 *
 * On success the role comes from `profile`, assigned server-side by the
 * signup trigger (0003). This screen cannot influence it.
 */
function Login() {
  const nav = useNavigate();
  const { session } = useSession();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    nav({ to: homeForRole(session.role) });
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy <code className="rounded bg-muted px-1">.env.example</code> to{" "}
          <code className="rounded bg-muted px-1">.env</code> and set your Supabase project URL
          and anon key, then restart the dev server.
        </p>
      </Centered>
    );
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendEmailOtp(email.trim());
      setStep("code");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function continueAsGuest() {
    setBusy(true);
    setError(null);
    try {
      await signInAsGuest();
      nav({ to: "/app" });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      // Session query refreshes via onAuthStateChange; role decides the landing.
      nav({ to: "/app" });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered>
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg" style={{ background: "var(--teal)" }} />
        <span className="text-lg font-semibold">Casai</span>
      </div>

      {step === "email" ? (
        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll email you a 6-digit code. No password to remember.
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Email
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </label>
          {error && <ErrorNote>{error}</ErrorNote>}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--teal)", color: "var(--background)" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Sending…" : "Send code"}
          </button>

          <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={continueAsGuest}
            disabled={busy}
            className="h-12 w-full rounded-xl border border-border text-sm font-semibold disabled:opacity-50"
          >
            Continue as guest
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Explore as a household — no email needed.
          </p>
        </form>
      ) : (
        <form onSubmit={submitCode} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-xl font-semibold">Enter your code</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{email}</span>. It may take a
              minute to arrive.
            </p>
          </div>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="h-14 w-full rounded-xl border border-border bg-input text-center text-2xl font-semibold tracking-[0.4em] outline-none focus:border-primary"
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--teal)", color: "var(--background)" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Verifying…" : "Verify & continue"}
          </button>
        </form>
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-3 text-xs"
      style={{
        borderColor: "var(--coral)",
        background: "color-mix(in oklab, var(--coral) 12%, transparent)",
      }}
    >
      {children}
    </div>
  );
}

/** Human-readable, actionable. Never a raw error code (SAD §12). */
function messageFor(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/rate limit|too many/i.test(raw)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/invalid|expired|token/i.test(raw)) {
    return "That code didn't match, or it expired. Request a new one.";
  }
  return raw;
}
