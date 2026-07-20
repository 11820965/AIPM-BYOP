// =====================================================================
// Casai · worker onboarding + self-view contract (0009)
//
// Becoming a worker is a role change (never client-writable), and a new
// worker must NOT be bookable until ops verifies them. These tests pin both.
// =====================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asUser, asUserCommit } from "./harness.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const db = await freshDb();
await db.exec(await readFile(join(ROOT, "supabase/migrations/0006_provisioning_robust.sql"), "utf8"));
await db.exec(await readFile(join(ROOT, "supabase/migrations/0009_worker_onboarding.sql"), "utf8"));

async function signUp(email) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, '{}') returning id`,
    [email],
  );
  return rows[0].id;
}

const u = await signUp("newpro@example.com");

test("become_worker mints a worker record and elevates the role", async () => {
  let wid;
  await asUserCommit(db, u, async () => {
    const { rows } = await db.query(`select become_worker('Sunita Devi','cook','Goregaon West') as wid`);
    wid = rows[0].wid;
  });
  assert.match(wid, /^GS-WK-\d{4}$/, "worker_id was not in GS-WK-#### form");
  const { rows: prof } = await db.query(`select role from profile where id = $1`, [u]);
  assert.equal(prof[0].role, "worker");
  const { rows: w } = await db.query(`select full_name, is_live from worker where profile_id = $1`, [u]);
  assert.equal(w[0].full_name, "Sunita Devi");
});

test("a newly onboarded worker is NOT live (pending verification)", async () => {
  const { rows } = await db.query(
    `select is_live, ekyc_status, police_check_status from worker where profile_id = $1`,
    [u],
  );
  assert.equal(rows[0].is_live, false, "a self-onboarded worker was immediately bookable");
  assert.equal(rows[0].ekyc_status, "pending");
});

test("a pending worker cannot be booked", async () => {
  // Find the worker's id, then a household attempts to book them.
  const { rows: w } = await db.query(`select worker_id from worker where profile_id = $1`, [u]);
  const wid = w[0].worker_id;
  const parent = await signUp("household@example.com");
  const { rows: hh } = await db.query(`select household_id from household where profile_id = $1`, [parent]);
  await asUser(db, parent, async () => {
    await assert.rejects(
      db.query(
        `insert into booking (household_id, worker_id, service_category, slot_datetime, total_amount_minor, service_address)
         values ($1, $2, 'cook', now() + interval '1 day', 44000, 'Somewhere')`,
        [hh[0].household_id, wid],
      ),
      /not verified\/live/,
      "a pending worker was bookable",
    );
  });
});

test("a worker reads their OWN full record incl credit fields", async () => {
  await asUser(db, u, async () => {
    const { rows } = await db.query(`select worker_id, full_name, earnings_month_minor from worker`);
    assert.equal(rows.length, 1, "worker could not read their own record");
    assert.equal(rows[0].full_name, "Sunita Devi");
  });
});

test("become_worker is idempotent — a second call returns the same worker", async () => {
  let first, second;
  await asUserCommit(db, u, async () => {
    const { rows } = await db.query(`select become_worker('Ignored','maid','Andheri') as wid`);
    second = rows[0].wid;
  });
  const { rows } = await db.query(`select worker_id from worker where profile_id = $1`, [u]);
  first = rows[0].worker_id;
  assert.equal(second, first, "a second onboarding created a duplicate worker");
});

test("a household still cannot read the worker base table", async () => {
  const other = await signUp("nosy@example.com");
  await asUser(db, other, async () => {
    const { rows } = await db.query(`select * from worker`);
    assert.equal(rows.length, 0, "a household reached the worker base table (financial data)");
  });
});
