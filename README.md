# Casai

India's AI home services platform — verified cooks, maids, drivers and caregivers
for urban households and NRI families managing a parental home from abroad.

> **Status:** Phase **P0 — platform spine**. The schema, the authorization
> boundary and the pricing source of truth are built and tested. No UI yet.

## Why this repo exists

A live prototype already exists at
[casai-intelligent.lovable.app](https://casai-intelligent.lovable.app) — but it is
**front-end only**: no database, no API, no auth server. Every worker, booking and
score in it is hard-coded, and the "session" is a `localStorage` object holding
`{role, name}`. It successfully proves the *experience*; it proves nothing about the
system.

This repo is the production build behind it.

## Documents

| Document | What it covers |
|---|---|
| [`casai-solution-architecture.html`](casai-solution-architecture.html) | Solution Architecture — bounded contexts, backend stack, C4 diagrams, data model, key flows, ADRs |
| [`casai-mvp-delivery-plan.html`](casai-mvp-delivery-plan.html) | Phased delivery plan — six phases, MVP at week 11, scope in/out, long-lead items |

Both are written against the **live prototype as the benchmark**, not the PRD —
the product has evolved past its own documentation (most notably: the NRI journey
is built, and Home Health Score is retired).

## What's built (P0)

```
supabase/migrations/0001_core_schema.sql   schema — household, worker, booking, catalog, NRI link
supabase/migrations/0002_rls_policies.sql  the authorization layer, enforced by Postgres
supabase/seed.sql                          beachhead seed — Goregaon West → Andheri
tests/rls/                                 bounded-context boundary contract (18 tests)
```

Three things are structural rather than cosmetic, because the prototype got each
of them wrong:

- **Context boundaries live in the database.** RLS policies replace the editable
  client-side `role` string. A tampered client changes nothing.
- **`worker_public` has no financial columns by construction** — not by a `WHERE`
  clause someone can forget. Households cannot reach a worker's credit score.
- **`churn_score` has no household policy at all.** RLS denies by default, so the
  absence *is* the control. CI fails if anyone adds one.

Plus: `worker.is_live` is a generated column and `booking` has a trigger on it, so
"verified workers only" cannot be bypassed by application code; and
`service_catalog` is the single source for price, which is where the prototype's
₹199-vs-₹220 split dies.

## Running the tests

No Docker, no accounts, no secrets — the migrations run against Postgres compiled
to WASM (PGlite), with Supabase's `auth` schema stubbed the way PostgREST behaves.

```bash
npm install
npm test
```

Every test maps to a real defect in the live prototype. If one fails, a context
boundary has regressed.

## Applying migrations to Supabase

The project must be created in the **South Asia (Mumbai) `ap-south-1`** region —
Aadhaar-linked and personal data stays in India under the DPDP Act, and the region
cannot be changed later.

Apply `supabase/migrations/*.sql` in order via the SQL Editor, then `seed.sql`.

## What's deliberately not here

No eKYC, no payments, no GPS, no notifications, and none of the four AI engines.
Those are P1+. The AI in particular **cannot** be built yet: no-show and churn
models train on booking history, and at zero bookings there is nothing to learn.
The MVP's real product is the data that makes the AI possible later.
