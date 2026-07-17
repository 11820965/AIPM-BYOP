import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { Star, Check, ArrowLeft, AlertCircle, Share2, Home } from "lucide-react";
import { getWorker, REVIEW_TAGS } from "@/lib/worker/data";

export const Route = createFileRoute("/app/review/$id")({ component: Review });

function Review() {
  const { id } = Route.useParams();
  const w = getWorker(id);
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [allowQA, setAllowQA] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewTags = REVIEW_TAGS[w.type];
  const isLowRating = stars > 0 && stars <= 3;
  const minTags = isLowRating ? 1 : 0;
  const requireComment = stars > 0 && stars <= 2;
  const commentValid = !requireComment || text.trim().length >= 20;
  const tagsValid = tags.length >= minTags;
  const ratingLabels = ["", "Poor", "Below average", "Okay", "Good", "Excellent"];

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (!stars) return setError("Please tap a star to rate your service");
      setStep(2);
    } else if (step === 2) {
      if (!tagsValid) return setError(`Select at least ${minTags} tag${minTags > 1 ? "s" : ""} so ${w.name} knows what to improve`);
      setStep(3);
    }
  };

  const submit = () => {
    setError(null);
    if (!commentValid) return setError("Please add at least 20 characters explaining the issue so we can help");
    setDone(true);
  };

  if (done) {
    return (
      <AppShell title="Review submitted">
        <div className="mx-auto max-w-lg pt-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--teal)", color: "var(--background)" }}>
            <Check className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">Thank you!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Your review helps {w.name} grow and helps other households decide.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Your review</div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="h-5 w-5" fill={n <= stars ? "var(--gold)" : "transparent"} style={{ color: "var(--gold)" }} />
              ))}
              <span className="ml-2 text-sm font-medium">{ratingLabels[stars]}</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
            {text.trim() && (
              <p className="mt-3 text-sm text-foreground/90">"{text.trim()}"</p>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground">
              {allowQA ? "Other households can ask you anonymous questions about " : "Q&A turned off for "}{w.name}.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => nav({ to: "/app" })} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border font-semibold">
              <Home className="h-4 w-4" /> Home
            </button>
            <button onClick={() => nav({ to: "/app/worker/$id", params: { id } })} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>
              <Share2 className="h-4 w-4" /> View {w.name.split(" ")[0]}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Review ${w.name}`}>
      <div className="mx-auto max-w-xl pb-10">
        <button onClick={() => { setError(null); step > 1 ? setStep(step - 1) : nav({ to: "/app" }); }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="h-1.5 flex-1 rounded-full" style={{ background: s <= step ? "var(--teal)" : "var(--muted)" }} />
          ))}
        </div>
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step} of 3</span>
          <span>{step === 1 ? "Rating" : step === 2 ? "What went well" : "Final touches"}</span>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--coral)", background: "color-mix(in oklab, var(--coral) 12%, transparent)", color: "var(--coral)" }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold">How was your service with {w.name}?</h2>
            <p className="mt-1 text-xs text-muted-foreground">Required · tap a star</p>
            <div className="mt-6 flex justify-center gap-2" onMouseLeave={() => setHoverStars(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => { setStars(n); setError(null); }} onMouseEnter={() => setHoverStars(n)} className="p-2 transition-transform hover:scale-110">
                  <Star className="h-10 w-10" fill={n <= (hoverStars || stars) ? "var(--gold)" : "transparent"} style={{ color: "var(--gold)" }} />
                </button>
              ))}
            </div>
            <div className="mt-2 h-5 text-sm font-medium" style={{ color: "var(--gold)" }}>{ratingLabels[hoverStars || stars]}</div>
            <button disabled={!stars} onClick={goNext} className="mt-6 h-12 w-full rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "var(--teal)", color: "var(--background)" }}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">What did {w.name} do well today?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLowRating ? `Required · select at least ${minTags} so we can help` : "Optional · select all that apply"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {reviewTags.map((t) => {
                const on = tags.includes(t);
                return (
                  <button key={t} onClick={() => { setTags((arr) => on ? arr.filter((x) => x !== t) : [...arr, t]); setError(null); }}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition"
                    style={{
                      borderColor: on ? "var(--teal)" : "var(--border)",
                      background: on ? "var(--teal)" : "transparent",
                      color: on ? "var(--background)" : "var(--foreground)",
                    }}>
                    {on && <Check className="h-3 w-3" />} {t}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">{tags.length} selected</div>
            <button onClick={goNext} disabled={!tagsValid} className="mt-4 h-12 w-full rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "var(--teal)", color: "var(--background)" }}>Next</button>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Anything else to add?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {requireComment ? "Required · please share what went wrong (min 20 characters)" : "Optional comment"}
            </p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={500}
              placeholder={requireComment ? "Tell us what went wrong…" : "Share more details (optional)…"}
              className="mt-3 w-full rounded-xl border bg-muted p-3 text-sm outline-none focus:border-primary"
              style={{ borderColor: requireComment && !commentValid && text.length > 0 ? "var(--coral)" : "var(--border)" }} />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{requireComment ? `${Math.max(0, 20 - text.trim().length)} more characters needed` : ""}</span>
              <span>{text.length}/500</span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted p-3">
              <div className="flex-1 pr-3">
                <div className="text-sm font-medium">Allow other households to ask me questions about {w.name}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Your identity is shown as <span className="text-foreground">Household in Bandra, 4 bookings</span>. Your name is never shared.
                </div>
              </div>
              <button onClick={() => setAllowQA((v) => !v)} className="h-6 w-11 rounded-full p-0.5 transition" style={{ background: allowQA ? "var(--teal)" : "var(--border)" }}>
                <span className="block h-5 w-5 rounded-full bg-white transition" style={{ transform: allowQA ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
            <button onClick={submit} disabled={!commentValid} className="mt-6 h-12 w-full rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "var(--teal)", color: "var(--background)" }}>Submit review</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
