// =====================================================================
// Casai · Continuity Memory v0 (0014)
//
// A home's context is private to that home — no worker can read the raw
// table — yet the brief must reach whoever is actually going: the assigned
// worker, the reserved backup, the household, or ops. Entry codes must not
// leak to workers who aren't assigned there.
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
await db.exec(await readFile(join(ROOT, "supabase/migrations/0014_continuity_memory.sql"), "utf8"));

// A second worker WITH a login, for the non-assigned and backup cases.
const { rows: wu } = await db.query(`insert into auth.users (email) values ('w2@casai.test') returning id`);
const W2 = wu[0].id;
await db.query(`insert into profile (id, role, display_name) values ($1, 'worker', 'Second Worker')`, [W2]);
await db.query(
  `insert into worker (worker_id, profile_id, full_name, service_category, zone,
     ekyc_status, police_check_status, jobs_completed)
   values ('GS-WK-9001', $1, 'Lata K.', 'cook', 'Goregaon West', 'verified', 'verified', 10)`,
  [W2],
);

// The seed booking (Priya's household, worker = Meena/GS-WK-2841).
const { rows: bk } = await db.query(`select booking_id from booking where household_id = $1 limit 1`, [id.priyaHousehold]);
const BOOKING = bk[0].booking_id;

// Priya records her home's context once.
await asUserCommit(db, id.priya, async () => {
  await db.query(`select save_home_preferences($1,$2,$3,$4,$5)`, [
    "Jain kitchen — no onion or garlic",
    "Gate code 4321; keys with the guard",
    "Father takes BP meds at 8am",
    "Leave the kitchen dry; shoes off at the door",
    "Two cats — keep the balcony door shut",
  ]);
});

test("the household can read its own saved preferences", async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(`select dietary, access from household_preferences`);
    assert.equal(rows.length, 1);
    assert.match(rows[0].dietary, /Jain/);
    assert.match(rows[0].access, /4321/);
  });
});

test("another household cannot read the home's preferences at all", async () => {
  await asUser(db, id.other, async () => {
    const { rows } = await db.query(`select * from household_preferences`);
    assert.equal(rows.length, 0, "a stranger household read the preferences table");
  });
});

test("the assigned worker gets the brief for their booking — with entry code", async () => {
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query(`select * from booking_home_brief($1)`, [BOOKING]);
    assert.equal(rows.length, 1);
    assert.match(rows[0].dietary, /Jain/);
    assert.match(rows[0].access, /4321/, "assigned worker should see entry instructions");
    assert.match(rows[0].routines, /BP meds/);
  });
});

test("a worker NOT assigned to the booking is refused the brief", async () => {
  await asUser(db, W2, async () => {
    await assert.rejects(
      db.query(`select * from booking_home_brief($1)`, [BOOKING]),
      /not authorised/i,
      "an unassigned worker read another home's brief (and its gate code)",
    );
  });
});

test("the reserved backup worker DOES get the brief (so a swap-in isn't a stranger)", async () => {
  // reserve GS-WK-9001 (W2) as the backup for the seed booking
  await db.query(`update booking set backup_worker_id = 'GS-WK-9001' where booking_id = $1`, [BOOKING]);
  await asUser(db, W2, async () => {
    const { rows } = await db.query(`select * from booking_home_brief($1)`, [BOOKING]);
    assert.equal(rows.length, 1);
    assert.match(rows[0].access, /4321/, "the promoted backup must arrive knowing the home");
  });
});

test("the household and ops can also read the brief", async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(`select household_name from booking_home_brief($1)`, [BOOKING]);
    assert.equal(rows[0].household_name, "Priya");
  });
  await asUser(db, id.ops, async () => {
    const { rows } = await db.query(`select dietary from booking_home_brief($1)`, [BOOKING]);
    assert.match(rows[0].dietary, /Jain/);
  });
});

test("the brief still returns for a home that hasn't filled preferences (nulls, no crash)", async () => {
  // A fresh booking for the OTHER household, which saved nothing.
  const b2 = await asUserCommit(db, id.other, async () =>
    (await db.query(
      `insert into booking (household_id, worker_id, service_category, slot_datetime, total_amount_minor, service_address, notes)
       values ($1,'GS-WK-2841','cook', now() + interval '2 days', 44000, 'Somewhere', 'ring twice')
       returning booking_id`,
      [id.otherHousehold],
    )).rows[0].booking_id,
  );
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query(`select dietary, booking_notes from booking_home_brief($1)`, [b2]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].dietary, null, "expected null dietary for a home with no saved prefs");
    assert.equal(rows[0].booking_notes, "ring twice", "per-booking notes should still surface");
  });
});
