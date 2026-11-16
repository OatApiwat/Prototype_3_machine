'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { dateOf, nestParts, groupStrips, carriersOf, stripsOf, partsOf, rangeOf } = require('./productivity');

const row = (carrier, strip_no, part, defect = 0) => ({ seq: 1, carrier, strip: 1, strip_no, part, susp: part, defect, t: strip_no * 100 + part });

test('carriersOf lists the carriers of the run card as codes, in order; stripsOf the strip numbers of one carrier (all its uses)', () => {
  const rows = [row(1, 76, 1), row(1, 76, 2), row(1, 1, 1), row(7, 4, 1), row(1, 121, 1), { carrier: null, strip_no: 9 }];
  assert.deepStrictEqual(carriersOf(rows), [
    { carrier: 'CR-0001', strips: [{ strip_no: 'Strip-1', pieces: 1, defective: 0 }, { strip_no: 'Strip-76', pieces: 2, defective: 0 }, { strip_no: 'Strip-121', pieces: 1, defective: 0 }] },
    { carrier: 'CR-0007', strips: [{ strip_no: 'Strip-4', pieces: 1, defective: 0 }] },
  ]);
  assert.strictEqual(carriersOf([row(2, 5, 1, 1), row(2, 5, 2, 0)])[0].strips[0].defective, 1); // pieces with a defect
  assert.deepStrictEqual(stripsOf(rows, 'CR-0001'), ['Strip-1', 'Strip-76', 'Strip-121']);
  assert.deepStrictEqual(stripsOf(rows, 'CR-0007'), ['Strip-4']);
  assert.deepStrictEqual(stripsOf(rows, 'CR-9999'), []);
  assert.deepStrictEqual(carriersOf([]), []);
});

test('partsOf returns the pieces of the asked strips, ordered, with the strip answered as Strip-<no>', () => {
  const p = partsOf([row(1, 77, 2), row(1, 76, 5), row(1, 76, 1), row(1, 9, 1)], ['Strip-76', 'Strip-77']);
  assert.deepStrictEqual(p.map((r) => [r.strip_no, r.suspension_no]), [['Strip-76', 1], ['Strip-76', 5], ['Strip-77', 2]]);
  assert.strictEqual(p[0].carrier, 'CR-0001');
  assert.ok(!('seq' in p[0]) && !('susp' in p[0]) && !('part' in p[0]) && !('strip' in p[0]));
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

test('groupStrips splits strips into groups of up to 3 consecutive numbers', () => {
  assert.deepStrictEqual(
    groupStrips(['Strip-1', 'Strip-2', 'Strip-3', 'Strip-4', 'Strip-76', 'Strip-77']),
    [['Strip-1', 'Strip-2', 'Strip-3'], ['Strip-4'], ['Strip-76', 'Strip-77']]
  );
});

test('dateOf gives the local date of a time', () => {
  assert.strictEqual(dateOf(Date.UTC(2026, 10, 15, 18, 0), 420), '2026-11-16');
  assert.strictEqual(dateOf(null, 420), null);
});

test('partsOf answers the defect as codes', () => {
  const out = partsOf([row(1, 7, 1, 0b100101), row(1, 7, 2, 0)], ['Strip-7']);
  assert.deepStrictEqual(out.map((x) => x.defect), [['ASQ-LCM', 'ASQ-PCM', 'MI'], []]);
});

test('nestParts orders carrier >> strip >> suspension', () => {
  const p = (carrier, strip_no, suspension_no) => ({ carrier, strip_no, suspension_no, t: 1 });
  const out = nestParts([p('CR-0002', 'Strip-5', 2), p('CR-0001', 'Strip-76', 1), p('CR-0001', 'Strip-9', 2), p('CR-0001', 'Strip-9', 1)]);
  assert.deepStrictEqual(out.map((c) => c.carrier), ['CR-0001', 'CR-0002']);
  assert.deepStrictEqual(out[0].strips.map((x) => x.strip_no), ['Strip-9', 'Strip-76']);
  assert.deepStrictEqual(out[0].strips[0].suspension.map((x) => x.suspension_no), [1, 2]);
  assert.strictEqual(out[0].strips[0].suspension[0].carrier, undefined);
  assert.deepStrictEqual(Object.keys(out[0].strips[0].suspension[0]).slice(0, 3), ['suspension_no', 'date', 't']);
  assert.strictEqual(out[0].strips[0].suspension[0].date, '1970-01-01');
});
