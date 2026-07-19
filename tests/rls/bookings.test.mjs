// =====================================================================
// Casai · booking creation contract (transaction-loop core, P2)
//
// Exercises the exact insert the Book screen performs, as an authenticated
// household, against real Postgres. Proves the loop is safe end to end:
// a household can only book for itself, only verified workers, and the
// details it captures actually persist.
// =====================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asUser, seedActors } from "./harness.mjs";

const db = await freshDb();
const id = await seedActors(db);

// The payload mirrors src/lib/data/bookings.ts useCreateBooking().
function bookingPayload(householdId, workerId = "GS-WK-2841", overrides = {}) {
  return {
    household_id: householdId,
    worker_id: workerId,
    service_category: "cook",
    slot_datetime: new Date(Date.now() + 86400000).toISOString(),
    duration_hours: 2,
    total_amount_minor: 44000,
    currency: "INR",
    service_address: "A-402, Lotus Heights, Goregaon West",
    notes: "Gate code 4321",
    payment_method: "upi",
    ...overrides,
  };
}

async function insertBooking(payload) {
  const cols = Object.keys(payload);
  const vals = cols.map((_, i) => `$${i + 1}`).join(", ");
  return db.query(
    `insert into booking (${cols.join(", ")}) values (${vals}) returning booking_id, service_address, payment_method`,
    Object.values(payload),
  );
}

test("a household can create a booking for itself with a verified worker", async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await insertBooking(bookingPayload(id.priyaHousehold));
    assert.equal(rows.length, 1, "insert did not return the created booking");
    assert.equal(rows[0].service_address, "A-402, Lotus Heights, Goregaon West");
    assert.equal(rows[0].payment_method, "upi");
  });
});

test("a household CANNOT create a booking for another household", async () => {
  await asUser(db, id.priya, async () => {
    await assert.rejects(
      insertBooking(bookingPayload(id.otherHousehold)),
      "RLS let a household book on another household's account",
    );
  });
});

test("a booking CANNOT reference an unverified worker", async () => {
  // GS-WK-3501 (Kamla) is police-check pending => is_live false.
  await asUser(db, id.priya, async () => {
    await assert.rejects(
      insertBooking(bookingPayload(id.priyaHousehold, "GS-WK-3501")),
      /not verified\/live/,
      "an unverified worker was bookable through the insert path",
    );
  });
});

test("the created booking is readable back by its household", async () => {
  // Insert and read within one transaction — asUser rolls back per block,
  // so a booking made in one block would not survive into the next.
  await asUser(db, id.priya, async () => {
    const { rows: created } = await insertBooking(bookingPayload(id.priyaHousehold));
    const bookingId = created[0].booking_id;
    const { rows } = await db.query(
      `select service_address, total_amount_minor from booking where booking_id = $1`,
      [bookingId],
    );
    assert.equal(rows.length, 1, "household could not read back the booking it just made");
    assert.equal(rows[0].total_amount_minor, 44000);
  });
});

test("payment_method defaults to cash when omitted", async () => {
  await asUser(db, id.priya, async () => {
    const p = bookingPayload(id.priyaHousehold);
    delete p.payment_method;
    const { rows } = await insertBooking(p);
    assert.equal(rows[0].payment_method, "cash");
  });
});
