// =====================================================================
// Casai · pre-slot confirmation checkpoint (0013)
//
// The "are you coming?" signal must be worker-owned and must feed the arm
// decision: a decline arms a backup at once; an owner's checkpoint expires
// a silent booking past the cutoff and arms one; and neither a stranger
// worker nor a stranger household can touch someone else's booking.
// =====================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asUser, asUserCommit, seedActors } from "./harness.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const db = await freshDb();
const id = await seedActors(db);
await db.exec(await readFile(join(ROOT, "supabase/migrations/0012_no_show_engine.sql"), "utf8"));
await db.exec(await readFile(join(ROOT, "supabase/migrations/0013_worker_confirmation.sql"), "utf8"));

const MEENA = "GS-WK-2841"; // bound to the meena profile in seedActors

// A second live cook so a decline/expiry can actually reserve a backup.
await db.query(
  `insert into worker (worker_id, full_name, service_category, zone,
     ekyc_status, police_check_status, jobs_completed, rating,
     reliability_score, trust_score, experience_years)
   values ('GS-WK-4100', 'Lata K.', 'cook', 'Goregaon West',
     'verified', 'verified', 120, 4.6, 0.930, 82, 4)`,
);

/** Priya books Meena at a given time. Commits so later steps see it. */
async function bookAt(whenIso) {
  return asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(
      `insert into booking (household_id, worker_id, service_category, slot_datetime,
         total_amount_minor, service_address)
       values ($1, $2, 'cook', $3, 44000, 'Flat 9')
       returning booking_id, confirm_status`,
      [id.priyaHousehold, MEENA, whenIso],
    );
    return rows[0];
  });
}
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();
const inMinutes = (n) => new Date(Date.now() + n * 60000).toISOString();

test("a new booking starts pending confirmation", async () => {
  const b = await bookAt(inDays(3));
  assert.equal(b.confirm_status, "pending");
});

test("the assigned worker can confirm they are coming", async () => {
  const b = await bookAt(inDays(3));
  const s = await asUserCommit(db, id.meena, async () => {
    const { rows } = await db.query(`select confirm_booking($1, true) as s`, [b.booking_id]);
    return rows[0].s;
  });
  assert.equal(s, "confirmed");
  const { rows } = await db.query(
    `select confirm_status, confirm_responded_at, backup_worker_id from booking where booking_id = $1`,
    [b.booking_id],
  );
  assert.equal(rows[0].confirm_status, "confirmed");
  assert.ok(rows[0].confirm_responded_at != null, "response time not stamped");
  assert.equal(rows[0].backup_worker_id, null, "confirming should not arm a backup");
});

test("a decline arms a backup immediately", async () => {
  const b = await bookAt(inDays(4));
  const s = await asUserCommit(db, id.meena, async () => {
    const { rows } = await db.query(`select confirm_booking($1, false) as s`, [b.booking_id]);
    return rows[0].s;
  });
  assert.equal(s, "declined");
  const { rows } = await db.query(`select confirm_status, backup_worker_id from booking where booking_id = $1`, [b.booking_id]);
  assert.equal(rows[0].confirm_status, "declined");
  assert.equal(rows[0].backup_worker_id, "GS-WK-4100", "decline did not arm the backup");
});

test("only the assigned worker can answer for a booking", async () => {
  const b = await bookAt(inDays(5));
  // a household user has no worker id → app_worker_id() is null → rejected
  await asUser(db, id.other, async () => {
    await assert.rejects(
      db.query(`select confirm_booking($1, true)`, [b.booking_id]),
      /not your booking/i,
      "a non-worker was allowed to confirm",
    );
  });
});

test("the checkpoint expires a silent booking past the cutoff and arms a backup", async () => {
  const b = await bookAt(inMinutes(30)); // cutoff is slot − 45m → already passed
  const s = await asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(`select run_confirm_checkpoint($1) as s`, [b.booking_id]);
    return rows[0].s;
  });
  assert.equal(s, "expired");
  const { rows } = await db.query(`select confirm_status, backup_worker_id from booking where booking_id = $1`, [b.booking_id]);
  assert.equal(rows[0].confirm_status, "expired");
  assert.equal(rows[0].backup_worker_id, "GS-WK-4100", "expiry did not arm a backup");
});

test("the checkpoint is a no-op before the cutoff", async () => {
  const b = await bookAt(inDays(6)); // far out — well before the cutoff
  const s = await asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(`select run_confirm_checkpoint($1) as s`, [b.booking_id]);
    return rows[0].s;
  });
  assert.equal(s, "pending");
  const { rows } = await db.query(`select backup_worker_id from booking where booking_id = $1`, [b.booking_id]);
  assert.equal(rows[0].backup_worker_id, null, "checkpoint armed a backup before the cutoff");
});

test("another household cannot run the checkpoint on someone else's booking", async () => {
  const b = await bookAt(inMinutes(30));
  await asUser(db, id.other, async () => {
    await assert.rejects(
      db.query(`select run_confirm_checkpoint($1)`, [b.booking_id]),
      /not authorised/i,
      "a stranger ran the checkpoint",
    );
  });
});
