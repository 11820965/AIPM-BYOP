import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowLeft, Star, Shield, MessageSquarePlus, X } from "lucide-react";
import { getWorker, SKILL_TAGS, QA } from "@/lib/worker/data";
import { ReliabilityTimeline } from "@/components/worker/ReliabilityTimeline";
import { ConcernSheet } from "@/components/worker/ConcernSheet";
import { useState } from "react";

export const Route = createFileRoute("/app/worker/$id")({ component: WorkerDetail });

function WorkerDetail() {
  const { id } = Route.useParams();
  const w = getWorker(id);
  const nav = useNavigate();
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState("");
  const [askSent, setAskSent] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);

  const tags = SKILL_TAGS[w.type];
  const qa = QA[w.type];

  return (
    <AppShell title="Worker Passport">
      <div className="pb-28">
        <button onClick={() => nav({ to: "/app/book" })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to results
        </button>

        {/* Top */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold" style={{ background: "var(--teal)", color: "var(--background)" }}>
              {w.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{w.name}</h2>
                <Shield className="h-4 w-4" style={{ color: "var(--teal)" }} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{w.type}</span> · {w.specialty} · {w.zone}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <Pill color="var(--teal)" bg="color-mix(in oklab, var(--teal) 14%, transparent)">eKYC verified</Pill>
                <Pill color="var(--teal)" bg="color-mix(in oklab, var(--teal) 14%, transparent)">Police verified</Pill>
                {w.badges.map((b) => (
                  <Pill key={b.label} color={b.color} bg={`color-mix(in oklab, ${b.color} 14%, transparent)`}>{b.label}</Pill>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Reliability" value={`${w.reliability}%`} color="var(--teal)" big />
            <Stat label="Trust score" value={`${w.trust}/100`} color="var(--purple)" pill />
            <Stat label="Rating" value={`${w.rating}★`} color="var(--gold)" />
            <Stat label="Bookings" value={String(w.jobs)} color="var(--foreground)" />
            <Stat label="Experience" value={`${w.yearsExp} yr`} color="var(--foreground)" />
          </div>
        </div>

        {/* Skill tags */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">What households say</h3>
          <p className="text-xs text-muted-foreground">Aggregated from verified reviews</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.label} className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs">
                {t.label}
                <span className="font-semibold" style={{ color: "var(--teal)" }}>{t.count}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Q&A */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Questions from verified households</h3>
          <div className="mt-3 space-y-4">
            {qa.map((item, i) => (
              <div key={i} className="rounded-xl bg-muted p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Household in {item.askerArea}, {item.askerBookings} bookings
                </div>
                <div className="mt-1 text-sm font-medium">{item.q}</div>
                <div className="mt-3 rounded-lg border-l-2 pl-3" style={{ borderColor: "var(--teal)" }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--teal)" }}>
                    Answered by Household in {item.ansArea}, {item.ansBookings} bookings with this worker
                  </div>
                  <div className="mt-1 text-sm">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setAskOpen(true); setAskSent(false); setAskText(""); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium hover:bg-muted">
            <MessageSquarePlus className="h-4 w-4" style={{ color: "var(--teal)" }} /> Ask a question
          </button>
        </section>

        {/* Reliability timeline */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Reliability timeline</h3>
          <p className="text-xs text-muted-foreground">{w.reliability}% reliable across {w.jobs} bookings</p>
          <div className="mt-3">
            <ReliabilityTimeline seed={w.id.length * 13 + 7} />
          </div>
        </section>

        {/* Report concern */}
        <div className="mt-6 text-center">
          <button onClick={() => setConcernOpen(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Report a concern about {w.name}
          </button>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Starting from</div>
            <div className="text-lg font-bold">₹{w.price}<span className="text-xs font-normal text-muted-foreground">/hr</span></div>
          </div>
          <Link to="/app/book" className="h-12 flex-1 rounded-xl text-center font-semibold leading-[3rem]" style={{ background: "var(--teal)", color: "var(--background)" }}>
            Book this worker
          </Link>
        </div>
      </div>

      {/* Ask modal */}
      {askOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setAskOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {askSent ? (
              <div className="py-4 text-center">
                <h3 className="text-base font-semibold">Question sent</h3>
                <p className="mt-2 text-sm text-muted-foreground">Verified households who booked {w.name} will see your question.</p>
                <button onClick={() => setAskOpen(false)} className="mt-4 h-11 w-full rounded-xl font-semibold" style={{ background: "var(--teal)", color: "var(--background)" }}>Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold">Ask {w.name.split(" ")[0]}'s households a question</h3>
                  <button onClick={() => setAskOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <textarea value={askText} onChange={(e) => setAskText(e.target.value)} rows={4} maxLength={300}
                  placeholder="e.g. Does she cook authentic South Indian food?"
                  className="mt-3 w-full rounded-xl border border-border bg-muted p-3 text-sm outline-none focus:border-primary" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Your question will be visible to verified households who have booked this worker.
                  Your identity is shown as <span className="font-medium text-foreground">Household in Bandra, 4 bookings</span>.
                </p>
                <button disabled={!askText.trim()} onClick={() => setAskSent(true)}
                  className="mt-4 h-11 w-full rounded-xl font-semibold disabled:opacity-40"
                  style={{ background: "var(--teal)", color: "var(--background)" }}>Send question</button>
              </>
            )}
          </div>
        </div>
      )}

      <ConcernSheet open={concernOpen} onClose={() => setConcernOpen(false)} workerName={w.name} />
    </AppShell>
  );
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span className="rounded-full px-2 py-1 font-medium" style={{ color, background: bg }}>{children}</span>;
}
function Stat({ label, value, color, big, pill }: { label: string; value: string; color: string; big?: boolean; pill?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {pill ? (
        <div className="mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-bold" style={{ background: "color-mix(in oklab, var(--purple) 18%, transparent)", color }}>{value}</div>
      ) : (
        <div className={`mt-1 ${big ? "text-2xl" : "text-lg"} font-bold`} style={{ color }}>{value}</div>
      )}
    </div>
  );
}
