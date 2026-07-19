// =====================================================================
// Casai · RLS test harness
// Phase P0 · slice 0.3
//
// Runs the real migrations against Postgres (PGlite = Postgres in WASM),
// so the boundary tests exercise actual RLS — no Docker, no accounts, no
// secrets, and safe to run in CI.
//
// Supabase provides `auth.uid()` and the `auth.users` table. PGlite does
// not, so we stub them exactly the way Supabase/PostgREST behaves:
// PostgREST sets the `request.jwt.claims` GUC per request, and auth.uid()
// reads the `sub` claim from it. Reproducing that faithfully is what makes
// these tests meaningful rather than theatre.
// =====================================================================

import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const AUTH_STUB = `
  create schema if not exists auth;

  -- Stand-in for Supabase's auth.users. Only the columns this codebase
  -- touches. raw_user_meta_data matters because it is client-supplied at
  -- signup, which is exactly what 0003 must refuse to trust for the role.
  create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );

  -- Mirrors Supabase's implementation: read the JWT claims GUC.
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(
      current_setting('request.jwt.claims', true)::json ->> 'sub',
      ''
    )::uuid;
  $$;

  create or replace function auth.jwt() returns json
  language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::json,
      '{}'::json
    );
  $$;

  -- PostgREST connects as this role for signed-in users.
  do $$ begin
    create role authenticated;
  exception when duplicate_object then null; end $$;
  do $$ begin
    create role anon;
  exception when duplicate_object then null; end $$;
`;

export async function freshDb() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);

  for (const file of [
    'supabase/migrations/0001_core_schema.sql',
    'supabase/migrations/0002_rls_policies.sql',
    'supabase/migrations/0004_booking_details.sql',
    'supabase/migrations/0005_fix_worker_live_check.sql',
    'supabase/seed.sql',
  ]) {
    const sql = await readFile(join(ROOT, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`migration failed: ${file}\n${err.message}`);
    }
  }
  return db;
}

/**
 * Run `fn` as a signed-in user of the given profile id, with RLS enforced.
 *
 * Superusers bypass RLS, so we must both switch to the `authenticated`
 * role and set the JWT claims — otherwise every test would trivially pass
 * and prove nothing.
 */
export async function asUser(db, profileId, fn) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: profileId, role: 'authenticated' }),
    ]);
    await db.exec(`set local role authenticated`);
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

/** Seed one profile of each context, plus a household and an NRI link. */
export async function seedActors(db) {
  const ids = {};
  const mk = async (key, role, name) => {
    const { rows } = await db.query(
      `insert into auth.users (email) values ($1) returning id`,
      [`${key}@casai.test`],
    );
    const id = rows[0].id;
    await db.query(
      `insert into profile (id, role, display_name) values ($1, $2, $3)`,
      [id, role, name],
    );
    ids[key] = id;
  };

  await mk('priya', 'household', 'Priya');
  await mk('other', 'household', 'Other Household');
  await mk('meena', 'worker', 'Meena S.');
  await mk('ramesh', 'nri', 'Ramesh');
  await mk('ops', 'ops', 'Casai Ops');

  const { rows: hh } = await db.query(
    `insert into household (profile_id, name, zone, plan_code)
     values ($1,'Priya','Goregaon West','free') returning household_id`,
    [ids.priya],
  );
  ids.priyaHousehold = hh[0].household_id;

  const { rows: hh2 } = await db.query(
    `insert into household (profile_id, name, zone, plan_code)
     values ($1,'Someone Else','Andheri West','free') returning household_id`,
    [ids.other],
  );
  ids.otherHousehold = hh2[0].household_id;

  // Bind the worker profile to the seeded canonical worker row.
  await db.query(`update worker set profile_id = $1 where worker_id = 'GS-WK-2841'`, [
    ids.meena,
  ]);

  // Ramesh is consent-linked to Priya's household.
  await db.query(
    `insert into nri_link (nri_profile, household_id, linked_at, nri_timezone)
     values ($1, $2, now(), 'Europe/London')`,
    [ids.ramesh, ids.priyaHousehold],
  );

  // A booking and an ops-only churn score to test against.
  await db.query(
    `insert into booking (household_id, worker_id, service_category, slot_datetime, total_amount_minor)
     values ($1, 'GS-WK-2841', 'cook', now() + interval '1 day', 44000)`,
    [ids.priyaHousehold],
  );
  await db.query(`insert into churn_score (household_id, score) values ($1, 34)`, [
    ids.priyaHousehold,
  ]);

  return ids;
}
