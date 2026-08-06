// =====================================================================
// Casai · guest access (0015)
//
// The one-tap guest entries for worker and NRI must still go through the
// server-assigned-role model: a demo shortcut may elevate the caller, but
// only inside the SECURITY DEFINER function, and it must leave a coherent,
// explorable state (a verified worker with a booking + brief; an NRI linked
// to a home with bookings to watch).
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
for (const f of [
  "supabase/migrations/0012_no_show_engine.sql",
  "supabase/migrations/0013_worker_confirmation.sql",
  "supabase/migrations/0014_continuity_memory.sql",
  "supabase/migrations/0015_guest_access.sql",
]) {
  await db.exec(await readFile(join(ROOT, f), "utf8"));
}

test("become_guest_worker elevates the caller to a verified, live worker", async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(`select become_guest_worker() as wid`);
    const wid = rows[0].wid;
    assert.ok(String(wid).startsWith("GS-WK-"), "no worker id minted");

    const { rows: p } = await db.query(`select role from profile where id = $1`, [id.priya]);
    assert.equal(p[0].role, "worker", "role not elevated to worker");

    const { rows: w } = await db.query(`select is_live from worker where worker_id = $1`, [wid]);
    assert.equal(w[0].is_live, true, "guest worker should be verified/live for the demo");
  });
});

test("the guest worker lands with a sample booking and a real home brief", async () => {
  await asUser(db, id.priya, async () => {
    const wid = (await db.query(`select become_guest_worker() as wid`)).rows[0].wid;

    const { rows: bk } = await db.query(`select booking_id from booking where worker_id = $1`, [wid]);
    assert.equal(bk.length, 1, "guest worker should get exactly one sample booking");

    const { rows: brief } = await db.query(`select access, dietary from booking_home_brief($1)`, [bk[0].booking_id]);
    assert.equal(brief.length, 1);
    assert.match(brief[0].access, /4321/, "the sample booking should carry the seeded home brief");
    assert.match(brief[0].dietary, /Jain/);
  });
});

test("become_guest_nri elevates the caller and links them to a home to monitor", async () => {
  await asUser(db, id.other, async () => {
    const { rows } = await db.query(`select become_guest_nri() as hh`);
    assert.equal(rows[0].hh, id.otherHousehold, "should link the caller's provisioned home");

    const { rows: p } = await db.query(`select role from profile where id = $1`, [id.other]);
    assert.equal(p[0].role, "nri", "role not elevated to nri");

    const { rows: link } = await db.query(
      `select nri_timezone from nri_link where nri_profile = $1 and household_id = $2`,
      [id.other, id.otherHousehold],
    );
    assert.equal(link.length, 1, "no nri_link created");
  });
});

test("the guest NRI can see the seeded bookings for their linked home", async () => {
  await asUser(db, id.other, async () => {
    await db.query(`select become_guest_nri()`);
    // Read back through the nri path (booking_nri_read): role = nri AND the
    // home is one they're linked to.
    const { rows } = await db.query(`select count(*)::int c from booking where household_id = $1`, [id.otherHousehold]);
    assert.equal(rows[0].c, 2, "the NRI should have two bookings to monitor");
  });
});
