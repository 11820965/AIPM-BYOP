import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ShieldCheck, Loader2, CheckCircle2, Lock } from "lucide-react";
import { useSession, signInAsGuest } from "@/lib/auth/session";
import { useBecomeOps, usePendingWorkers, useVerifyWorker } from "@/lib/data/ops";
import { getService } from "@/lib/catalog/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/ops/")({ component: OpsConsole });

function OpsConsole() {
  const { session, isLoading } = useSession();

  if (!isSupabaseConfigured) return <AppShell title="Ops"><Note>Supabase isn't configured.</Note></AppShell>;
  if (isLoading) return <AppShell title="Ops"><div className="h-40 animate-pulse rounded-2xl border border-border bg-card" /></AppShell>;
  if (session?.role !== "ops") return <AppShell title="Admin access"><AdminGate /></AppShell>;
  return <AppShell title="Worker verification"><Queue /></AppShell>;
}

/** Passcode gate to elevate the current session to ops. */
function AdminGate() {
  const becomeOps = useBecomeOps();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Need a session before we can elevate it — sign in as a guest first.
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!data.session) await signInAsGuest();
      await becomeOps.mutateAsync(code.trim());
      // session query invalidates → re-renders into the queue
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in as admin.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border-2 p-6" style={{ borderColor: "var(--coral, #c0553f)" }}>
        <Lock className="h-8 w-8" style={{ color: "var(--coral, #c0553f)" }} />
        <h2 className="mt-3 text-xl font-bold">Casai Ops</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal console for verifying workers. Enter the admin passcode to continue.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Admin passcode"
            className="h-12 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-[var(--coral,#c0553f)]"
          />
          {error && <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>{error}</div>}
          <button type="submit" disabled={becomeOps.isPending || !code.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--coral, #c0553f)" }}>
            {becomeOps.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {becomeOps.isPending ? "Signing in…" : "Enter console"}
          </button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">Demo passcode: <code className="rounded bg-muted px-1">casai-admin-2026</code></p>
      </div>
    </div>
  );
}

function Queue() {
  const { data: pending = [], isLoading, error } = usePendingWorkers();
  const verify = useVerifyWorker();
  const [justVerified, setJustVerified] = useState<string | null>(null);

  async function approve(workerId: string) {
    setJustVerified(null);
    try {
      await verify.mutateAsync(workerId);
      setJustVerified(workerId);
    } catch {
      /* surfaced by verify.isError */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--coral, #c0553f) 40%, var(--border))" }}>
        <ShieldCheck className="h-6 w-6" style={{ color: "var(--coral, #c0553f)" }} />
        <div>
          <div className="text-sm font-semibold">Worker verification queue</div>
          <div className="text-xs text-muted-foreground">Approve eKYC + police review to make a worker bookable.</div>
        </div>
        <span className="ml-auto rounded-full px-3 py-1 text-sm font-bold" style={{ background: "color-mix(in oklab, var(--coral,#c0553f) 16%, transparent)", color: "var(--coral,#c0553f)" }}>{pending.length}</span>
      </div>

      {isLoading && <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />}
      {error && <Note tone="error">Couldn't load the queue.</Note>}
      {!isLoading && pending.length === 0 && (
        <Note>No workers awaiting verification. New onboardings will appear here.</Note>
      )}

      <div className="space-y-3">
        {pending.map((w) => (
          <div key={w.worker_id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold text-white" style={{ background: "var(--purple)" }}>{w.full_name[0]}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{w.full_name}</div>
              <div className="text-xs text-muted-foreground font-mono">{w.worker_id}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                <Tag>{getService(w.service_category).displayName}</Tag>
                <Tag>{w.zone}</Tag>
                <Tag>eKYC {w.ekyc_status}</Tag>
                <Tag>Police {w.police_check_status}</Tag>
              </div>
            </div>
            {justVerified === w.worker_id ? (
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--good, #1e8a5a)" }}>
                <CheckCircle2 className="h-4 w-4" /> Verified
              </span>
            ) : (
              <button onClick={() => approve(w.worker_id)} disabled={verify.isPending}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--good, #1e8a5a)" }}>
                {verify.isPending && verify.variables === w.worker_id && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{children}</span>;
}
function Note({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  const color = tone === "error" ? "var(--coral, #ff7a7a)" : "var(--muted-foreground)";
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm" style={{ color }}>{children}</div>;
}
