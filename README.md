# Casai

**Verified home help that never leaves you stranded.**

Casai is an AI home-services platform for India — verified cooks, maids, drivers and
caregivers for urban households, and a dual-timezone way for NRI families to keep a
parent's home cared for from abroad. Its wedge is **reliability**: an AI that predicts
a no-show *before* the slot and pre-arranges a real backup, so the 8am cook not showing
up doesn't cost you the 9am meeting.

Built as a capstone for the **AI Product Manager programme at Imarticus Learning**.

> **Status:** working prototype on a real Supabase backend. All four user contexts run
> live against Postgres; the no-show loop and Continuity Memory are built; **88
> automated boundary/feature tests pass** in CI.

## ▶ Live demo

**[tanstack-start-app.casai.workers.dev](https://tanstack-start-app.casai.workers.dev)**
— click **Guest user** and use a passcode below. No signup, no install.

---

## Try it in 60 seconds — guest passcodes

Open the **[live demo](https://tanstack-start-app.casai.workers.dev)** (or run it locally,
below), click **Guest user** → enter one of these demo passcodes. No signup, no onboarding:

| Passcode | Drops you into |
|---|---|
| `casai-home-2026` | **Household** — book verified workers, AI Insights (no-show risk), My-home profile |
| `casai-worker-2026` | **Worker** — a Verified Pro dashboard with a sample booking and its "before you arrive" brief |
| `casai-nri-2026` | **NRI** — a linked home with bookings to monitor in dual timezone |
| `casai-admin-2026` | **Admin / Ops** — the worker-verification queue |

The fastest things to see: **Guest worker → Bookings** shows the Continuity Memory brief;
**Guest household → Insights** shows the live no-show scoring and one-tap backup.

---

## Run it locally

**Prerequisites:** Node 20+, and a free [Supabase](https://supabase.com) project created
in the **South Asia (Mumbai) `ap-south-1`** region (Aadhaar-linked data stays in India
under the DPDP Act; the region can't be changed later).

**1. Clone & install**
```bash
git clone https://github.com/11820965/AIPM-BYOP.git
cd AIPM-BYOP
npm install
```

**2. Set up the backend**
In your Supabase project's **SQL Editor**, run each file in `supabase/migrations/` **in
order** (`0001` → `0016`), then run `supabase/seed.sql`.

**3. Configure the environment**
```bash
cp .env.example .env
```
Fill in from *Supabase → Project Settings → API* (both are **public by design** — the
anon key ships in the browser; Row-Level Security protects the data):
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# optional — enables the Claude-written "before you arrive" brief (server-side only):
# ANTHROPIC_API_KEY=sk-ant-...
```

**4. Run it**
```bash
npm run dev
```
Open the localhost URL and use a guest passcode above.

**Run the test suite** (no Docker, no accounts — Postgres compiled to WASM):
```bash
npm test
```

---

## What's built

| Area | State |
|---|---|
| Four live contexts — Household · Worker · NRI · Ops | ✅ on real Postgres + RLS |
| Book a verified worker · 15-day availability · confirmation | ✅ |
| **No-show prediction** — risk scored at booking, backup reserved & promoted | ✅ heuristic |
| **Pre-slot "are you coming?" checkpoint** — decline/silence arms a backup early | ✅ |
| **Continuity Memory** — a home brief the worker (or backup) sees before arriving | ✅ v0 rule-based + v1 Claude |
| Ops worker verification (eKYC + police) | ✅ |
| NRI consent-linking + dual-timezone monitoring | ✅ |
| Payments, GPS check-in pipeline, push/SMS, trained ML model | ⬜ deferred (see docs) |

## Stack

| Layer | Choice |
|---|---|
| Framework | **TanStack Start** (React 19, SSR + server functions) |
| Routing | TanStack Router — file-based, `src/routes/` |
| Data | TanStack Query → Supabase (Postgres + Auth) |
| UI | Tailwind 4 + shadcn/ui + lucide |
| AI (v1 brief) | Anthropic Claude, called server-side |
| Deploy target | Cloudflare Workers (nitro + wrangler) |

## Why the architecture matters

Three things are structural, not cosmetic — because the original front-end-only
prototype got each wrong:

- **Context boundaries live in the database.** RLS policies replace an editable
  client-side `role` string; a tampered client changes nothing.
- **`worker_public` has no financial columns by construction** — households cannot
  reach a worker's credit score, even by accident.
- **"Verified workers only" is enforced by a generated column + booking trigger**, so
  it can't be bypassed by application code — and `service_catalog` is the single source
  of price.

The AI is honest by design: a transparent **heuristic** scores no-shows today *and
collects the labelled data* a trained model will learn from later — behind one stable
function contract, so the model can drop in without touching anything else.

## Documents (`docs/`)

| Document | What it covers |
|---|---|
| `Casai-Current-State.docx` | Feature-by-feature status, verified live; architecture; what's deferred |
| `Casai-No-Show-Heuristic-to-Model.docx` | How the no-show heuristic upgrades to a trained model — flow, contract, tech stack |
| `Casai-AI-Capability-Strategy.docx` | Market gaps (Urban Company, Snabbit, Pronto) + ranked AI capabilities |
| `casai-solution-architecture.html` | Bounded contexts, C4 diagrams, data model, key flows, ADRs |
| `casai-mvp-delivery-plan.html` | Phased delivery plan, scope in/out, long-lead items |

## Layout

```
src/routes/           file-based routes — app.* | worker.* | nri.* | ops.* | guest.tsx
src/lib/data/         the data layer (bookings, workers, insights, continuity, brief-ai)
src/lib/auth/         session + guest passcode entry
supabase/migrations/  schema + RLS + the no-show / continuity / guest functions (0001–0016)
tests/rls/            bounded-context + feature contract (88 tests)
docs/                 architecture, delivery plan, current state, AI strategy
```
