'use strict';
// Pure helpers for the MDDP productivity (defect) API. Rows are the `mddp_part` points of one run card.
const DEFECTS = 5;   // bit 0..4 = ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5

const bit = (mask, i) => ((mask | 0) >> i) & 1;

/**
 * One entry per carrier visit (seq = position in the run card; carrier numbers are reused, so seq is the key):
 * { seq, carrier, strips: [strip numbers], start, end, pieces, defective, cnt: [count per defect type] }
 */
function carriersOf(rows) {
  const by = new Map();
  for (const r of rows) {
    let c = by.get(r.seq);
    if (!c) {
      c = { seq: r.seq, carrier: r.carrier, strips: [], start: r.t, end: r.t, pieces: 0, defective: 0, cnt: Array(DEFECTS).fill(0) };
      by.set(r.seq, c);
    }
    c.pieces++;
    if (r.defect > 0) c.defective++;
    for (let i = 0; i < DEFECTS; i++) c.cnt[i] += bit(r.defect, i);
    if (!c.strips.includes(r.strip_no)) c.strips.push(r.strip_no);
    c.start = Math.min(c.start, r.t);
    c.end = Math.max(c.end, r.t);
  }
  return [...by.values()].map((c) => ({ ...c, strips: c.strips.sort((a, b) => a - b) })).sort((a, b) => a.seq - b.seq);
}

const partsOf = (rows, seq) => rows.filter((r) => r.seq === seq).sort((a, b) => a.susp - b.susp);

module.exports = { carriersOf, partsOf, DEFECTS };
