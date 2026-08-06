import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { NotebookPen, Loader2, Check, Utensils, KeyRound, Clock, ListChecks, StickyNote } from "lucide-react";
import { useHomePreferences, useSaveHomePreferences, type HomePreferences } from "@/lib/data/continuity";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/app/home")({ component: MyHome });

const EMPTY: HomePreferences = { dietary: "", access: "", routines: "", preferences: "", notes: "" };

const FIELDS: { key: keyof HomePreferences; label: string; hint: string; icon: any; placeholder: string }[] = [
  { key: "dietary", label: "Food & kitchen", icon: Utensils, hint: "Diet, allergies, what not to cook with.", placeholder: "Jain kitchen — no onion or garlic. Nut allergy." },
  { key: "access", label: "Getting in", icon: KeyRound, hint: "Gate code, keys, which bell. Shared only with the worker assigned to your booking.", placeholder: "Gate code 4321. Keys with the guard. 2nd floor, left." },
  { key: "routines", label: "Daily routines", icon: Clock, hint: "Timings and rhythms that matter — meals, medicines, school run.", placeholder: "Father takes BP meds at 8am. Kids' bus at 8:30." },
  { key: "preferences", label: "How we like things", icon: ListChecks, hint: "Do's and don'ts — the little things a regular would know.", placeholder: "Shoes off at the door. Leave the kitchen dry." },
  { key: "notes", label: "Anything else", icon: StickyNote, hint: "Pets, quirks, anything a new face should know.", placeholder: "Two cats — keep the balcony door shut." },
];

function MyHome() {
  const { data: saved, isLoading } = useHomePreferences();
  const save = useSaveHomePreferences();
  const [form, setForm] = useState<HomePreferences>(EMPTY);
  const [justSaved, setJustSaved] = useState(false);

  // Prefill once the saved row loads.
  useEffect(() => {
    if (saved) {
      setForm({
        dietary: saved.dietary ?? "", access: saved.access ?? "", routines: saved.routines ?? "",
        preferences: saved.preferences ?? "", notes: saved.notes ?? "",
      });
    }
  }, [saved]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setJustSaved(false);
    await save.mutateAsync(form);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  return (
    <AppShell title="My home">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
          <NotebookPen className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--teal)" }} />
          <div>
            <h3 className="text-sm font-semibold">Your home, remembered</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill this in once. Whoever Casai sends — your regular worker <em>or</em> a backup stepping in — arrives already knowing your home, so nobody has to be told twice. Only the worker assigned to a booking can see it.
            </p>
          </div>
        </div>

        {!isSupabaseConfigured && <Note>Supabase isn't configured.</Note>}
        {isLoading && <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />}

        {!isLoading && (
          <form onSubmit={submit} className="space-y-4">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key} className="rounded-2xl border border-border bg-card p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" style={{ color: "var(--teal)" }} /> {f.label}
                  </label>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
                  <textarea
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    rows={2}
                    className="mt-2 w-full resize-y rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-[var(--teal)]"
                  />
                </div>
              );
            })}

            {save.error && (
              <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
                Couldn't save. {save.error instanceof Error ? save.error.message : ""}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={save.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--teal)" }}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {save.isPending ? "Saving…" : "Save my home profile"}
              </button>
              {justSaved && (
                <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--teal)" }}>
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{children}</div>;
}
