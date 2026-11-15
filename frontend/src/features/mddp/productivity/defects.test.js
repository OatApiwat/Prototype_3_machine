import { describe, it, expect } from 'vitest';
import { popcount, niceAxis, carrierRows, summarize, hasDefect } from './defects.js';

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
  it('places the rows of a carrier by suspension number', () => {
    const rows = [
      { susp: 1, defect: 0 },
      { susp: 60, defect: 1 },
      { susp: 25, defect: 0 },
    ];
    const s = carrierRows(rows);
    expect(s).toHaveLength(60);
    expect(s[0]).toBe(rows[0]);
    expect(s[59]).toBe(rows[1]);
    expect(s[24]).toBe(rows[2]);
    expect(s[10]).toBeNull();
  });
  it('summarises a carrier', () => {
    const rows = [
      { susp: 1, defect: 0b00011 },
      { susp: 2, defect: 0 },
      { susp: 3, defect: 0b10000 },
    ];
    expect(summarize(carrierRows(rows))).toMatchObject({ n: 3, total: 3, defective: 2 });
    expect(summarize([null]).top).toBe('-');
  });
});
