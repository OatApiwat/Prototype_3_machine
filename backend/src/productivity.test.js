'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carriersOf, partsOf } = require('./productivity');

const row = (seq, carrier, strip, part, defect, t) => ({ seq, carrier, strip, strip_no: (seq - 1) * 3 + strip, part, susp: (strip - 1) * 20 + part, defect, t });

test('carriersOf groups by visit and counts defects per type', () => {
  const rows = [row(1, 7, 1, 1, 0b00011, 10), row(1, 7, 2, 3, 0, 20), row(2, 8, 1, 1, 0b10000, 30), row(41, 1, 1, 1, 1, 40)];
  const c = carriersOf(rows);
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
  const c = carriersOf([row(1, 3, 1, 1, 0, 1), row(44, 3, 1, 1, 0, 2)]);
  assert.deepStrictEqual(c.map((x) => [x.seq, x.carrier]), [[1, 3], [44, 3]]);
});

test('partsOf returns one visit ordered by suspension', () => {
  const p = partsOf([row(2, 1, 2, 1, 0, 1), row(2, 1, 1, 5, 0, 2), row(3, 1, 1, 1, 0, 3)], 2);
  assert.deepStrictEqual(p.map((r) => r.susp), [5, 21]);
});
