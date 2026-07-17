import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useApp, useViewport, signOut } from "@/lib/app/state";
import {
  useRouteContext,
  NAV_BY_CONTEXT,
  accentForContext,
  planLabelForContext,
} from "@/lib/app/context";
import { Bell, LogOut, Globe2 } from "lucide-react";
import { ReactNode } from "react";

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const app = useApp();
  const { isMobile, isTablet } = useViewport();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();

  // The ROUTE decides the shell — not client state. See lib/app/context.ts.
  // Previously this read `app.role` from localStorage, so /worker rendered
  // the household nav whenever the stored role hadn't caught up.
  const context = useRouteContext();
  const items = NAV_BY_CONTEXT[context ?? "household"];
  const accent = accentForContext(context);

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg" style={{ background: accent }} />
            <span className="text-sm font-semibold">Casai</span>
          </div>
          <button
            onClick={() => { signOut(); nav({ to: "/" }); }}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        <main key={path} className="flex-1 animate-slide-in px-4 pb-24 pt-4">{children}</main>
        {/* Columns follow the nav length. This was hard-coded to 5, which
            only ever fitted the worker nav — household (3) and NRI (3) were
            laid out against phantom columns. */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card/95 backdrop-blur"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px]"
                style={{ color: active ? accent : "var(--muted-foreground)" }}
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  const sidebarWidth = isTablet ? 64 : 240;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="h-8 w-8 rounded-lg" style={{ background: accent }} />
          {!isTablet && <span className="text-base font-semibold">Casai</span>}
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
                style={{
                  color: active ? accent : "var(--sidebar-foreground)",
                  background: active ? "color-mix(in oklab, " + accent + " 12%, transparent)" : "transparent",
                  borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
                }}
                title={isTablet ? it.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isTablet && <span>{it.label}</span>}
                {isTablet && (
                  <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg group-hover:block">
                    {it.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {!isTablet && (
          <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" style={{ background: accent, color: "var(--background)" }}>
                {(app.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{app.name || "Guest"}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: accent }}>
                  {planLabelForContext(context)}
                </div>
              </div>
            </div>
            <button
              onClick={() => { signOut(); nav({ to: "/" }); }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col" style={{ marginLeft: sidebarWidth }}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-8 backdrop-blur">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: "var(--coral)" }} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" style={{ background: accent, color: "var(--background)" }}>
              {(app.name || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <main key={path} className="flex-1 animate-fade-in p-8">{children}</main>
      </div>
    </div>
  );
}

export { Globe2 };
