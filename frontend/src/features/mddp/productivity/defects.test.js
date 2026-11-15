import { describe, it, expect } from 'vitest';
import { popcount, niceAxis, stripRows, bySuspension, summarize, hasDefect } from './defects.js';

describe('defect helpers', () => {
  it('counts bits', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(0b101101)).toBe(4);
    expect(hasDefect(0b100, 2)).toBe(1);
    expect(hasDefect(0b100, 1)).toBe(0);
  });
  it('builds a nice axis around the data', () => {
    const a = niceAxis(23.75, 26.7);
    expect(a.lo).toBeLessThanOrEqual(23.75);
    expect(a.hi).toBeGreaterThanOrEqual(26.7);
    expect(a.ticks.length).toBeGreaterThan(2);
    expect(niceAxis(5, 5).hi).toBeGreaterThan(5);
  });
  it('places rows of a strip by part number', () => {
    const rows = [
      { strip: 2, part: 1, defect: 0 },
      { strip: 2, part: 20, defect: 1 },
      { strip: 3, part: 5, defect: 0 },
    ];
    const s = stripRows(rows, 2);
    expect(s).toHaveLength(20);
    expect(s[0]).toBe(rows[0]);
    expect(s[19]).toBe(rows[1]);
    expect(s[4]).toBeNull();
  });
  it('groups by suspension and summarises a strip', () => {
    const rows = [
      { strip: 1, part: 1, defect: 0b000011 },
      { strip: 4, part: 1, defect: 0 }, // strip 4 = strip 1 of the second carrier
      { strip: 2, part: 3, defect: 0b100000 },
    ];
    const b = bySuspension(rows);
    expect(b[0].n).toBe(2);
    expect(b[0].d).toBe(1);
    expect(b[0].cnt[0]).toBe(1);
    expect(b[20 + 2].cnt[5]).toBe(1);
    const sm = summarize(stripRows(rows, 1));
    expect(sm).toMatchObject({ n: 1, total: 2, defective: 1 });
    expect(summarize([null]).top).toBe('-');
  });
});
