// =====================================================================
// Casai · ops verification contract (0010)
//
// An admin verifies workers. Only ops may do it, becoming ops requires the
// passcode, and approval must actually make the worker bookable.
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
await db.exec(await readFile(join(ROOT, "supabase/migrations/0010_ops_verification.sql"), "utf8"));

async function signUp(email) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, '{}') returning id`,
    [email],
  );
  return rows[0].id;
}

// A worker onboards (pending), and a separate user will become the admin.
const workerUser = await signUp("pro@example.com");
let workerId;
await asUserCommit(db, workerUser, async () => {
  const { rows } = await db.query(`select become_worker('Anjali Sharma','cook','Goregaon West') as w`);
  workerId = rows[0].w;
});
const adminUser = await signUp("admin@example.com");

test("a wrong passcode does not grant ops", async () => {
  await asUser(db, adminUser, async () => {
    await assert.rejects(db.query(`select become_ops('wrong')`), /invalid admin passcode/);
  });
  const { rows } = await db.query(`select role from profile where id = $1`, [adminUser]);
  assert.equal(rows[0].role, "household", "a wrong passcode still changed the role");
});

test("the correct passcode elevates to ops", async () => {
  await asUserCommit(db, adminUser, async () => {
    const { rows } = await db.query(`select become_ops('casai-admin-2026') as ok`);
    assert.equal(rows[0].ok, true);
  });
  const { rows } = await db.query(`select role from profile where id = $1`, [adminUser]);
  assert.equal(rows[0].role, "ops");
});

test("a non-ops user cannot verify a worker", async () => {
  await asUser(db, workerUser, async () => {
    await assert.rejects(db.query(`select verify_worker($1)`, [workerId]), /only ops/);
  });
  const { rows } = await db.query(`select is_live from worker where worker_id = $1`, [workerId]);
  assert.equal(rows[0].is_live, false, "a non-ops user managed to verify a worker");
});

test("ops can see the pending worker in the queue", async () => {
  await asUser(db, adminUser, async () => {
    const { rows } = await db.query(`select worker_id from worker where is_live = false`);
    assert.ok(rows.some((r) => r.worker_id === workerId), "the pending worker was not in the ops queue");
  });
});

test("ops approval makes the worker live and bookable", async () => {
  await asUserCommit(db, adminUser, async () => {
    await db.query(`select verify_worker($1)`, [workerId]);
  });
  const { rows } = await db.query(
    `select is_live, ekyc_status, police_check_status from worker where worker_id = $1`,
    [workerId],
  );
  assert.equal(rows[0].is_live, true, "worker did not become live after approval");
  assert.equal(rows[0].ekyc_status, "verified");
  assert.equal(rows[0].police_check_status, "verified");
});

test("after approval the worker appears in worker_public", async () => {
  const household = await signUp("buyer@example.com");
  await asUser(db, household, async () => {
    const { rows } = await db.query(`select worker_id from worker_public where worker_id = $1`, [workerId]);
    assert.equal(rows.length, 1, "an approved worker is still not browsable");
  });
});
