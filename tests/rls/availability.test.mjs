// =====================================================================
// Casai · worker availability contract (0011)
//
// available_workers() powers the 15-day booking window: it must report a
// worker as unavailable when they already have a booking near that slot —
// across households — while never leaking whose booking it is.
// =====================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asUser, seedActors } from "./harness.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const db = await freshDb();
const id = await seedActors(db);
await db.exec(await readFile(join(ROOT, "supabase/migrations/0011_worker_availability.sql"), "utf8"));

const MEENA = "GS-WK-2841"; // the one live cook in the seed
const slot = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days out
const slotPlus3h = new Date(new Date(slot).getTime() + 3 * 3600000).toISOString();

function availabilityAt(iso) {
  return db.query(`select worker_id, available from available_workers('cook', $1)`, [iso]).then((r) => {
    const m = {}; for (const row of r.rows) m[row.worker_id] = row.available; return m;
  });
}

test("all live cooks are available when nothing is booked", async () => {
  const a = await availabilityAt(slot);
  assert.ok(MEENA in a, "the live cook was not returned by available_workers");
  assert.equal(a[MEENA], true);
});

test("a worker is unavailable at a slot they are already booked for", async () => {
  await db.query(
    `insert into booking (household_id, worker_id, service_category, slot_datetime, total_amount_minor, service_address)
     values ($1, $2, 'cook', $3, 44000, 'Somewhere')`,
    [id.priyaHousehold, MEENA, slot],
  );
  const a = await availabilityAt(slot);
  assert.equal(a[MEENA], false, "a booked worker still showed as available at that time");
});

test("the same worker is available at a slot 3 hours away", async () => {
  const a = await availabilityAt(slotPlus3h);
  assert.equal(a[MEENA], true, "the 2-hour conflict window leaked into a distant slot");
});

test("availability is computed across households — the conflicting booking belongs to another household", async () => {
  // The booking above is Priya's. A different household must still see Meena
  // as unavailable at that slot, without being able to read Priya's booking.
  await asUser(db, id.other, async () => {
    const { rows } = await db.query(`select worker_id, available from available_workers('cook', $1)`, [slot]);
    const m = {}; for (const r of rows) m[r.worker_id] = r.available;
    assert.equal(m[MEENA], false, "cross-household availability was not respected");
    // and they cannot read the booking itself
    const { rows: b } = await db.query(`select * from booking`);
    assert.equal(b.length, 0, "another household could read the booking behind the availability flag");
  });
});

test("available_workers never exposes financial columns", async () => {
  const { rows } = await db.query(`select * from available_workers('cook', $1) limit 1`, [slot]);
  const cols = Object.keys(rows[0] ?? {});
  for (const banned of ["credit_score", "earnings_month_minor", "profile_id"]) {
    assert.ok(!cols.includes(banned), `available_workers leaked ${banned}`);
  }
});
