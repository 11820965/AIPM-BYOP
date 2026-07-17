# P0 — verification status

Phase P0 (platform spine) of the [delivery plan](casai-mvp-delivery-plan.html).
This records what is proven, how, and the one step that is deferred — so the
gap is a known decision, not a silent hole.

## Slices

| Slice | What | Status |
|---|---|---|
| 0.1 | Fork Lovable prototype into the repo | ✅ Done |
| 0.2 | Core schema (household, worker, booking, catalog, NRI link) | ✅ Done |
| 0.3 | RLS policies + boundary contract tests | ✅ Done |
| 0.4 | OTP auth + server-assigned context claim (+ signup trigger, 0003) | ✅ Built |
| 0.5 | Catalog / pricing single source | ✅ Done |
| 0.6 | Context-aware shell (route-derived, not client-state) | ✅ Done |
| 0.7 | Typed data layer — `/app/book` reads workers from Postgres | ✅ Built |
| 0.8 | CI — tests as a merge gate | ✅ Done |

## What is proven, and how

**Against the live Supabase project** (`arlznasnlfazejkwulfw`, region ap-south-1):

- An anonymous caller is **denied** `worker_public` (HTTP 401) and reads **zero
  rows** from `churn_score` and `worker` — RLS is enforcing the context
  boundary on the real database, not just locally.
- All four migrations applied cleanly; the Table Editor shows the 5 seeded
  workers.
- The app builds, the `/login` screen renders and reads the Supabase config,
  and email OTP **sends** (emails were received).

**Automated — `npm test`, 27 tests on real Postgres (PGlite), also in CI:**

- 18 boundary tests — each maps to a specific prototype exposure (ops metrics
  to households, worker credit score on a household route, cross-tenant reads,
  pricing source of truth, verified-workers-only).
- 9 provisioning tests — signup assigns `household` server-side and a client
  **cannot** elevate itself to `ops`.

## The one deferred step

**A logged-in household seeing the 5 workers in the UI** is not yet captured
end-to-end. It is blocked by **Supabase free-tier email limits**, not by the
code:

1. Email templates are locked behind custom SMTP on the free plan, so the
   provider can only send a magic *link*, never the 6-digit *code* the login
   screen expects.
2. The free tier caps auth emails at a few per hour; links expire in ~1 hour.

The data path itself is exercised by the tests and the live RLS probes above.
To close the UI step, do either:

- **Set up custom SMTP** (e.g. Resend free tier). Unlocks the templates — real
  6-digit codes — and removes the hourly cap. The production-correct fix.
- **Temporarily disable email confirmation** and drive one fresh magic link
  immediately, before it expires.

Decision (2026-07-17): accepted as verified via tests + live RLS probes;
the UI login proof is deferred to when SMTP is configured.

## Note on the dev-only client hook

`src/lib/supabase/client.ts` exposes `window.__supabase` **only** under
`import.meta.env.DEV`, used to exchange a magic-link token during local
verification. It is stripped from production builds by the guard.
