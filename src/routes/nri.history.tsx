import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/nri/history")({ component: () =>
  <AppShell title="History">
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
      History — coming soon.
    </div>
  </AppShell>
});
