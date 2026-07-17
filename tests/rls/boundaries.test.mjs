// =====================================================================
// Casai · bounded-context boundary contract
// Phase P0 · slice 0.3 — this is the P0 exit gate.
//
// Every test here corresponds to a real defect in the live prototype
// (SAD §02). If one fails, a context boundary has regressed and the
// build must not merge.
//
//   run:  npm test
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, asUser, seedActors } from './harness.mjs';

const db = await freshDb();
const id = await seedActors(db);

// ---------------------------------------------------------------------
// The headline leak: the live app renders churn risk (34) to the
// household it is about, on /app and /app/insights.
// ---------------------------------------------------------------------

test('household CANNOT read churn_score (ops-only)', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query('select * from churn_score');
    assert.equal(rows.length, 0, 'household saw an ops-only churn score');
  });
});

test('worker CANNOT read churn_score', async () => {
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query('select * from churn_score');
    assert.equal(rows.length, 0);
  });
});

test('NRI CANNOT read churn_score, even for its linked household', async () => {
  await asUser(db, id.ramesh, async () => {
    const { rows } = await db.query('select * from churn_score');
    assert.equal(rows.length, 0);
  });
});

test('ops CAN read churn_score', async () => {
  await asUser(db, id.ops, async () => {
    const { rows } = await db.query('select * from churn_score');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].score, 34);
  });
});

// ---------------------------------------------------------------------
// The live app exposes a worker's credit score and loan eligibility on
// /app/passport, which sits in the household navigation.
// ---------------------------------------------------------------------

test('household CANNOT read the worker base table (credit score, earnings)', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query('select * from worker');
    assert.equal(rows.length, 0, 'household reached worker financial data');
  });
});

test('household CAN browse worker_public — and it has no financial columns', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(
      `select * from worker_public where service_category = 'cook'`,
    );
    assert.ok(rows.length > 0, 'household could not browse bookable workers');

    const cols = Object.keys(rows[0]);
    for (const banned of ['credit_score', 'earnings_month_minor', 'profile_id']) {
      assert.ok(!cols.includes(banned), `worker_public leaked ${banned}`);
    }
  });
});

test('worker CAN read their own full record, including credit score', async () => {
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query('select worker_id, credit_score from worker');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].worker_id, 'GS-WK-2841');
    assert.equal(rows[0].credit_score, 782);
  });
});

// ---------------------------------------------------------------------
// Tenant isolation between households.
// ---------------------------------------------------------------------

test('household reads only its OWN bookings', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query('select household_id from booking');
    assert.ok(rows.length > 0);
    assert.ok(
      rows.every((r) => r.household_id === id.priyaHousehold),
      'household saw another household\'s bookings',
    );
  });
  await asUser(db, id.other, async () => {
    const { rows } = await db.query('select * from booking');
    assert.equal(rows.length, 0, 'unrelated household saw bookings');
  });
});

test('worker reads only bookings assigned to them', async () => {
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query('select worker_id from booking');
    assert.ok(rows.every((r) => r.worker_id === 'GS-WK-2841'));
  });
});

// ---------------------------------------------------------------------
// NRI consent: linked household only, never the whole estate.
// ---------------------------------------------------------------------

test('NRI reads the linked household, and ONLY the linked one', async () => {
  await asUser(db, id.ramesh, async () => {
    const { rows } = await db.query('select household_id from household');
    assert.equal(rows.length, 1, 'NRI saw households beyond its consent link');
    assert.equal(rows[0].household_id, id.priyaHousehold);
  });
});

test('NRI reads the linked household bookings (the alert feed)', async () => {
  await asUser(db, id.ramesh, async () => {
    const { rows } = await db.query('select household_id from booking');
    assert.ok(rows.length > 0, 'NRI could not see the bookings it pays to monitor');
    assert.ok(rows.every((r) => r.household_id === id.priyaHousehold));
  });
});

test('NRI timezone is stored per link, never assumed', async () => {
  await asUser(db, id.ramesh, async () => {
    const { rows } = await db.query('select nri_timezone from nri_link');
    assert.equal(rows[0].nri_timezone, 'Europe/London');
  });
});

// ---------------------------------------------------------------------
// Pricing: one source. The live app shows ₹199 on tiles, ₹220 on Book.
// ---------------------------------------------------------------------

test('cook price is ₹220/hr from the catalog — the single source', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(
      `select price_minor, currency, unit from service_catalog where category = 'cook'`,
    );
    assert.equal(rows[0].price_minor, 22000); // ₹220.00
    assert.equal(rows[0].currency, 'INR');
    assert.equal(rows[0].unit, 'hour');
  });
});

test('catalog carries both currencies — ₹ households and $ NRI Care+', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(
      `select code, price_minor, currency from plan_catalog
       where code in ('care_plus','nri_care_plus') order by code`,
    );
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
    assert.equal(byCode.care_plus.currency, 'INR');
    assert.equal(byCode.care_plus.price_minor, 599900); // ₹5,999
    assert.equal(byCode.nri_care_plus.currency, 'USD');
    assert.equal(byCode.nri_care_plus.price_minor, 4900); // $49
  });
});

test('households cannot rewrite the catalog', async () => {
  await asUser(db, id.priya, async () => {
    await assert.rejects(
      db.query(`update service_catalog set price_minor = 19900 where category = 'cook'`),
      'a household was able to change a price',
    );
  });
});

// ---------------------------------------------------------------------
// "Verified workers only" must be structural, not a forgotten WHERE.
// ---------------------------------------------------------------------

test('an unverified worker cannot be booked', async () => {
  // Kamla Bai: eKYC verified, police check pending => is_live false.
  await assert.rejects(
    db.query(
      `insert into booking (household_id, worker_id, service_category, slot_datetime, total_amount_minor)
       values ($1, 'GS-WK-3501', 'caregiver', now() + interval '1 day', 38000)`,
      [id.priyaHousehold],
    ),
    /not verified\/live/,
    'an unverified worker was bookable',
  );
});

test('unverified workers are absent from the browsable projection', async () => {
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(
      `select worker_id from worker_public where worker_id = 'GS-WK-3501'`,
    );
    assert.equal(rows.length, 0, 'an unverified worker was browsable');
  });
});

// ---------------------------------------------------------------------
// Canonical stats: one number, not 312 / 347 / 412.
// ---------------------------------------------------------------------

test('worker stats agree between the browse projection and the base record', async () => {
  let publicJobs;
  await asUser(db, id.priya, async () => {
    const { rows } = await db.query(
      `select jobs_completed from worker_public where worker_id = 'GS-WK-2841'`,
    );
    publicJobs = rows[0].jobs_completed;
  });
  await asUser(db, id.meena, async () => {
    const { rows } = await db.query(
      `select jobs_completed from worker where worker_id = 'GS-WK-2841'`,
    );
    assert.equal(rows[0].jobs_completed, publicJobs, 'worker stats diverged across surfaces');
  });
});
