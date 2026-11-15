'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carriersOf, visitsOf, partsOf, rangeOf } = require('./productivity');

const row = (seq, carrier, strip, part, defect, t) => ({ seq, carrier, strip, strip_no: (seq - 1) * 3 + strip, part, susp: (strip - 1) * 20 + part, defect, t });

test('visitsOf groups by visit and counts defects per type', () => {
  const rows = [row(1, 7, 1, 1, 0b00011, 10), row(1, 7, 2, 3, 0, 20), row(2, 8, 1, 1, 0b10000, 30), row(41, 1, 1, 1, 1, 40)];
  const c = visitsOf(rows);
  assert.strictEqual(c.length, 3);
  assert.deepStrictEqual(c[0].strips, [1, 2]);
  assert.deepStrictEqual(c[0].cnt, [1, 1, 0, 0, 0, 0]);
  assert.strictEqual(c[0].defective, 1);
  assert.strictEqual(c[0].pieces, 2);
  assert.strictEqual(c[1].cnt[4], 1);
  assert.strictEqual(c[0].start, 10);
  assert.strictEqual(c[0].end, 20);
});

test('points without a carrier are ignored', () => {
  assert.deepStrictEqual(carriersOf([{ seq: 1, carrier: null, strip_no: 1, defect: 0, t: 1 }, { seq: 2, strip_no: 4, defect: 0, t: 2 }]), []);
});

test('a reused carrier number stays a separate visit', () => {
  const c = visitsOf([row(1, 3, 1, 1, 0, 1), row(44, 3, 1, 1, 0, 2)]);
  assert.deepStrictEqual(c.map((x) => [x.seq, x.carrier]), [[1, 3], [44, 3]]);
});

test('carriersOf lists each carrier of the run card with the strip numbers of each of its sets', () => {
  const c = carriersOf([row(26, 1, 1, 1, 0, 3), row(26, 1, 2, 1, 0, 4), row(1, 1, 1, 1, 0, 1), row(2, 7, 1, 1, 0, 2)]);
  assert.deepStrictEqual(c, [
    { carrier: 1, sets: [{ seq: 1, strips: [1] }, { seq: 26, strips: [76, 77] }] },
    { carrier: 7, sets: [{ seq: 2, strips: [4] }] },
  ]);
});

test('partsOf returns one visit ordered by suspension', () => {
  const p = partsOf([row(2, 1, 2, 1, 0, 1), row(2, 1, 1, 5, 0, 2), row(3, 1, 1, 1, 0, 3)], 2);
  assert.deepStrictEqual(p.map((r) => r.susp), [5, 21]);
});

test('rangeOf: dates are whole days in the given time zone, ms still accepted, bad input is rejected', () => {
  const now = Date.parse('2030-01-01T00:00:00Z');
  // 2026-11-15 in UTC+7 = 2026-11-14T17:00:00Z .. 2026-11-15T16:59:59.999Z
  assert.deepStrictEqual(rangeOf('2026-11-15', '2026-11-15', 420, now), {
    from: Date.parse('2026-11-14T17:00:00Z'),
    to: Date.parse('2026-11-15T16:59:59.999Z'),
  });
  assert.strictEqual(rangeOf('2026-11-15', '2026-11-17', 420, now).to, Date.parse('2026-11-17T16:59:59.999Z'));
  assert.deepStrictEqual(rangeOf('1000', '2000', 420, now), { from: 1000, to: 2000 });
  assert.strictEqual(rangeOf('2026-13-45', '2026-11-15', 420, now), null);
  assert.strictEqual(rangeOf('abc', null, 420, now), null);
  assert.strictEqual(rangeOf('2026-11-15', '2999-01-01', 420, now).to, now); // the future is clamped
});
