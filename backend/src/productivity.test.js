'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carriersOf, partsOf, rangeOf } = require('./productivity');

const row = (carrier, strip_no, part, defect = 0) => ({ seq: 1, carrier, strip: 1, strip_no, part, susp: part, defect, t: strip_no * 100 + part });

test('carriersOf lists each carrier with the strip numbers of all its uses, in order', () => {
  const rows = [row(1, 76, 1), row(1, 76, 2), row(1, 1, 1), row(7, 4, 1), row(1, 121, 1), { carrier: null, strip_no: 9 }];
  assert.deepStrictEqual(carriersOf(rows), [
    { carrier: 1, strips: ['Strip-1', 'Strip-76', 'Strip-121'] },
    { carrier: 7, strips: ['Strip-4'] },
  ]);
  assert.deepStrictEqual(carriersOf([]), []);
});

test('partsOf returns the pieces of the asked strips, ordered, with the strip answered as Strip-<no>', () => {
  const p = partsOf([row(1, 77, 2), row(1, 76, 5), row(1, 76, 1), row(1, 9, 1)], ['Strip-76', 'Strip-77']);
  assert.deepStrictEqual(p.map((r) => [r.strip_no, r.part]), [['Strip-76', 1], ['Strip-76', 5], ['Strip-77', 2]]);
  assert.ok(!('seq' in p[0]) && !('susp' in p[0]) && !('strip' in p[0]));
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
