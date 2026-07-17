import { useState } from "react";
import { Eye, PackageX, AlertOctagon, FileX, UserX, ShieldAlert, X } from "lucide-react";

const OPTIONS = [
  { id: "suspicious", label: "Suspicious behaviour", icon: Eye },
  { id: "missing", label: "Items missing after service", icon: PackageX },
  { id: "rude", label: "Aggressive or rude", icon: AlertOctagon },
  { id: "instructions", label: "Did not follow instructions", icon: FileX },
  { id: "unauthorised", label: "Brought an unauthorised person", icon: UserX },
  { id: "privacy", label: "Privacy concern", icon: ShieldAlert },
];

export function ConcernSheet({ open, onClose, workerName }: { open: boolean; onClose: () => void; workerName: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-3xl border border-border bg-card p-5 animate-slide-in"
        style={{ animation: "fade-in-up 0.3s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--teal) 18%, transparent)", color: "var(--teal)" }}>
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Concern logged</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Our trust team will review within 2 hours. Thank you for keeping the Casai community safe.
            </p>
            <button onClick={onClose} className="mt-4 h-11 w-full rounded-xl font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold">Report a concern about {workerName}</h3>
              <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2">
              {OPTIONS.map((o) => {
                const I = o.icon; const on = picked === o.id;
                return (
                  <button key={o.id} onClick={() => setPicked(o.id)}
                    className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition"
                    style={{ borderColor: on ? "var(--coral)" : "var(--border)", background: on ? "color-mix(in oklab, var(--coral) 10%, transparent)" : "transparent" }}>
                    <I className="h-4 w-4" style={{ color: on ? "var(--coral)" : "var(--muted-foreground)" }} />
                    <span className="flex-1">{o.label}</span>
                    {on && <span className="text-xs font-semibold" style={{ color: "var(--coral)" }}>Selected</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
              Your concern is reviewed by Casai's trust team within 2 hours. Your identity is kept confidential.
              If 2 or more independent verified households report the same concern, the worker's profile is paused
              automatically pending review.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm font-semibold">Cancel</button>
              <button
                disabled={!picked}
                onClick={() => setSubmitted(true)}
                className="h-11 flex-1 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--coral)", color: "white" }}>
                Submit concern
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
