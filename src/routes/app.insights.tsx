import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Mic } from "lucide-react";

export const Route = createFileRoute("/app/insights")({ component: Insights });

function Insights() {
  return (
    <AppShell title="AI Insights">
      <div className="grid gap-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Voice booking</h3>
            <div className="mt-4 flex flex-col items-center gap-4">
              <button className="pulse-glow flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "var(--teal)" }}>
                <Mic className="h-10 w-10" style={{ color: "var(--background)" }} />
              </button>
              <div className="grid w-full grid-cols-2 gap-2">
                {["Book my usual cook", "Send my maid now", "Reschedule tomorrow", "Cancel today's driver"].map((c) => (
                  <button key={c} className="rounded-full border border-border bg-card px-3 py-2 text-xs">{c}</button>
                ))}
              </div>
              <div className="w-full rounded-xl bg-muted p-3 text-xs">
                <span className="font-semibold" style={{ color: "var(--teal)" }}>Casai:</span> Done — Sunita confirmed for 9 AM tomorrow.
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">No-show prediction</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {[["Tue cook", "Low", "12%", "var(--teal)"], ["Wed driver", "Med", "38%", "var(--amber)"], ["Sat clean", "High", "71%", "var(--coral)"]].map(([k, l, p, c]) => (
                <div key={k} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="mt-1 text-lg font-bold" style={{ color: c as string }}>{p}</div>
                  <div className="text-[11px]" style={{ color: c as string }}>{l} risk</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">AI roadmap</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {["Auto-reorder essentials", "Predictive AC service", "Family menu planner"].map((r) => (
                <div key={r} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Coming</div>
                  <div className="text-sm font-medium">{r}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/*
          REMOVED — the Churn Risk Score panel.

          It showed a household the retention score Casai keeps about them
          (booking frequency, rating drop, reschedule count, complaints),
          together with the ops actions taken against it: "Send offer",
          "Call household", "Add backup". That is a retention-ops tool; a
          customer should never be looking at their own churn file.

          It moves to the ops context (/ops, phase P5). churn_score is
          ops-only in the database — it has no household RLS policy, so the
          data is unreachable from this context regardless of what any
          component tries to render.

          See SAD §02 and supabase/migrations/0002_rls_policies.sql.
        */}
      </div>
    </AppShell>
  );
}
