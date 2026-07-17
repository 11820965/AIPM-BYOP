// =====================================================================
// Casai · new-user provisioning contract
// Phase P0 · slice 0.4
//
// The role a user gets on signup is the root of every RLS decision in
// 0002. These tests exist to make sure it can only ever be assigned by
// the database — a client that claims to be ops must not become ops.
// =====================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asUser } from "./harness.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const db = await freshDb();
await db.exec(
  await readFile(join(ROOT, "supabase/migrations/0003_new_user_provisioning.sql"), "utf8"),
);

/** Sign a user up the way GoTrue does: insert into auth.users. */
async function signUp(email, meta = {}) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)],
  );
  return rows[0].id;
}

test("signup provisions a profile automatically", async () => {
  const id = await signUp("priya@example.com");
  const { rows } = await db.query(`select role, display_name from profile where id = $1`, [id]);
  assert.equal(rows.length, 1, "no profile was created for a new user");
  assert.equal(rows[0].role, "household");
  assert.equal(rows[0].display_name, "Priya");
});

test("signup provisions the household tenant row", async () => {
  const id = await signUp("asha@example.com");
  const { rows } = await db.query(
    `select zone, plan_code from household where profile_id = $1`,
    [id],
  );
  assert.equal(rows.length, 1, "household row missing — RLS scoping would deny own data");
  assert.equal(rows[0].zone, "Goregaon West");
  assert.equal(rows[0].plan_code, "free");
});

// The important one.
test("a client CANNOT elevate itself by claiming a role at signup", async () => {
  const id = await signUp("attacker@example.com", { role: "ops", display_name: "Attacker" });
  const { rows } = await db.query(`select role from profile where id = $1`, [id]);
  assert.equal(
    rows[0].role,
    "household",
    "client metadata set the role — this would grant ops access to anyone",
  );
});

test("a self-assigned ops claim still cannot read churn_score", async () => {
  const id = await signUp("attacker2@example.com", { role: "ops" });
  await asUser(db, id, async () => {
    const { rows } = await db.query("select * from churn_score");
    assert.equal(rows.length, 0, "a self-claimed ops role reached ops-only data");
  });
});

test("a provisioned user can read their own household and nobody else's", async () => {
  const a = await signUp("a@example.com");
  const b = await signUp("b@example.com");
  await asUser(db, a, async () => {
    const { rows } = await db.query("select profile_id from household");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].profile_id, a);
    assert.notEqual(rows[0].profile_id, b);
  });
});

test("a provisioned user can browse bookable workers", async () => {
  const id = await signUp("browser@example.com");
  await asUser(db, id, async () => {
    const { rows } = await db.query(
      `select worker_id from worker_public where service_category = 'cook'`,
    );
    assert.ok(rows.length > 0, "a signed-in household could not browse workers");
  });
});

test("a provisioned user can read the catalog", async () => {
  const id = await signUp("pricing@example.com");
  await asUser(db, id, async () => {
    const { rows } = await db.query(
      `select price_minor from service_catalog where category = 'cook'`,
    );
    assert.equal(rows[0].price_minor, 22000);
  });
});

test("display name falls back to the email local-part, never blank", async () => {
  const id = await signUp("ramesh.kumar@example.co.uk", { display_name: "   " });
  const { rows } = await db.query(`select display_name from profile where id = $1`, [id]);
  assert.equal(rows[0].display_name, "Ramesh.Kumar");
});

test("backfill and trigger are idempotent", async () => {
  const id = await signUp("idem@example.com");
  await db.exec(
    await readFile(join(ROOT, "supabase/migrations/0003_new_user_provisioning.sql"), "utf8"),
  );
  const { rows } = await db.query(`select count(*)::int as n from profile where id = $1`, [id]);
  assert.equal(rows[0].n, 1, "re-running the migration duplicated a profile");
});
