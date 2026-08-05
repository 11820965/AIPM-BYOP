// =====================================================================
// Casai · no-show loop contract (0012)
//
// The loop must be real, not theatre: a booking is scored from the
// worker's actual record at insert; arrange_backup reserves a genuinely
// free second worker; resolve_no_show promotes that backup into the slot.
// And every write is gated on owning the booking — a household cannot
// score, escalate, or resolve someone else's.
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

const MEENA = "GS-WK-2841"; // reliability 0.970, 347 jobs — the live seed cook
const slot = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days out

// A second live cook so a backup can actually be reserved. Reliable but a
// notch below Meena, so ranking is deterministic (Meena first).
await db.query(
  `insert into worker (worker_id, full_name, service_category, zone,
     ekyc_status, police_check_status, jobs_completed, rating,
     reliability_score, trust_score, experience_years)
   values ('GS-WK-4100', 'Lata K.', 'cook', 'Goregaon West',
     'verified', 'verified', 120, 4.6, 0.930, 82, 4)`,
);

/** Insert a booking as Priya (RLS on), returning its id. Commits so later
 *  escalation/resolve steps see it. */
async function bookAs(worker, whenIso) {
  return asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(
      `insert into booking (household_id, worker_id, service_category, slot_datetime,
         total_amount_minor, service_address)
       values ($1, $2, 'cook', $3, 44000, 'Flat 9')
       returning booking_id, no_show_risk_score, risk_band`,
      [id.priyaHousehold, worker, whenIso],
    );
    return rows[0];
  });
}

test("a booking is auto-scored at insert from the worker's real record", async () => {
  const b = await bookAs(MEENA, slot);
  assert.ok(b.no_show_risk_score != null, "no_show_risk_score was not set on insert");
  assert.ok(["low", "med", "high"].includes(b.risk_band), "risk_band was not set");
  // Meena is 0.97-reliable with a long history → the score must be low.
  assert.ok(Number(b.no_show_risk_score) < 0.25, `expected low risk, got ${b.no_show_risk_score}`);
  assert.equal(b.risk_band, "low");
});

test("re-scoring is rejected for a booking the caller does not own", async () => {
  const b = await bookAs(MEENA, slot);
  await asUser(db, id.other, async () => {
    await assert.rejects(
      db.query(`select score_booking($1)`, [b.booking_id]),
      /not authorised/i,
      "another household was allowed to re-score the booking",
    );
  });
});

test("arrange_backup reserves the best free worker who is NOT the assigned one", async () => {
  const b = await bookAs(MEENA, slot);
  const pick = await asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(`select arrange_backup($1) as w`, [b.booking_id]);
    return rows[0].w;
  });
  assert.equal(pick, "GS-WK-4100", "backup was not the other live cook");
  const { rows } = await db.query(`select backup_worker_id from booking where booking_id = $1`, [b.booking_id]);
  assert.equal(rows[0].backup_worker_id, "GS-WK-4100", "backup_worker_id was not persisted");
});

test("arrange_backup returns null when no other worker is free at the slot", async () => {
  // Book the only backup (Lata) at the same slot so she is unavailable.
  const conflict = new Date(Date.now() + 10 * 86400000).toISOString();
  await bookAs("GS-WK-4100", conflict);
  const b = await bookAs(MEENA, conflict);
  const pick = await asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(`select arrange_backup($1) as w`, [b.booking_id]);
    return rows[0].w;
  });
  assert.equal(pick, null, "a busy worker was still offered as backup");
});

test("no-show with a standby promotes the backup into the slot (status → replaced)", async () => {
  const b = await bookAs(MEENA, new Date(Date.now() + 12 * 86400000).toISOString());
  await asUserCommit(db, id.priya, async () => {
    await db.query(`select arrange_backup($1)`, [b.booking_id]);
    const { rows } = await db.query(`select resolve_no_show($1, false) as s`, [b.booking_id]);
    assert.equal(rows[0].s, "replaced");
  });
  const { rows } = await db.query(
    `select worker_id, status, backup_worker_id from booking where booking_id = $1`,
    [b.booking_id],
  );
  assert.equal(rows[0].worker_id, "GS-WK-4100", "backup was not promoted into worker_id");
  assert.equal(rows[0].status, "replaced");
  assert.equal(rows[0].backup_worker_id, null, "backup slot was not cleared after promotion");
});

test("no-show with no standby marks the booking no_show and breaches SLA", async () => {
  const b = await bookAs(MEENA, new Date(Date.now() + 13 * 86400000).toISOString());
  await asUserCommit(db, id.priya, async () => {
    const { rows } = await db.query(`select resolve_no_show($1, false) as s`, [b.booking_id]);
    assert.equal(rows[0].s, "no_show");
  });
  const { rows } = await db.query(`select status, sla_breach from booking where booking_id = $1`, [b.booking_id]);
  assert.equal(rows[0].status, "no_show");
  assert.equal(rows[0].sla_breach, true);
});

test("a check-in stamps arrival and releases the reserved backup", async () => {
  const b = await bookAs(MEENA, new Date(Date.now() + 14 * 86400000).toISOString());
  await asUserCommit(db, id.priya, async () => {
    await db.query(`select arrange_backup($1)`, [b.booking_id]);
    const { rows } = await db.query(`select resolve_no_show($1, true) as s`, [b.booking_id]);
    assert.equal(rows[0].s, "in_progress");
  });
  const { rows } = await db.query(
    `select status, gps_checkin_time, backup_worker_id from booking where booking_id = $1`,
    [b.booking_id],
  );
  assert.equal(rows[0].status, "in_progress");
  assert.ok(rows[0].gps_checkin_time != null, "check-in time was not stamped");
  assert.equal(rows[0].backup_worker_id, null, "backup was not released on check-in");
});

test("another household cannot resolve someone else's booking", async () => {
  const b = await bookAs(MEENA, new Date(Date.now() + 9 * 86400000).toISOString());
  await asUser(db, id.other, async () => {
    await assert.rejects(
      db.query(`select resolve_no_show($1, false)`, [b.booking_id]),
      /not authorised/i,
      "a stranger resolved the booking",
    );
  });
});
