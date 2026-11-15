'use strict';
// Pure helpers for the MDDP productivity (defect) API. Rows are the `mddp_part` points of one run card.
const DEFECTS = 6;   // bit 0..5 = ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5, MI

/** Strip no as the API shows it: "Strip-76" (stored as a number) */
const stripName = (n) => 'Strip-' + n;

const bit = (mask, i) => ((mask | 0) >> i) & 1;

/**
 * One entry per carrier visit (seq = position in the run card; carrier numbers are reused, so seq is the key):
 * { seq, carrier, strips: [strip numbers], start, end, pieces, defective, cnt: [count per defect type] }
 */
function visitsOf(rows) {
  const by = new Map();
  for (const r of rows) {
    if (r.seq == null || r.carrier == null) continue; // incomplete point: cannot be placed on a carrier
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

/**
 * Query range of /api/mddp/runcards: calendar dates ("YYYY-MM-DD", from = start of that day, to = end of that day, in the time zone
 * `tzMin` minutes east of UTC) or epoch ms. Returns { from, to } in ms, or null when a value is not understood.
 */
function rangeOf(from, to, tzMin, now = Date.now()) {
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const one = (v, end) => {
    if (v == null || v === '') return null;
    if (DAY.test(v)) {
      const t = Date.parse(v + 'T00:00:00Z') - tzMin * 60000 + (end ? 86400000 - 1 : 0);
      return Number.isNaN(t) ? undefined : t;
    }
    return /^\d+$/.test(v) ? +v : undefined;
  };
  const t = one(to, true), f = one(from, false);
  if (t === undefined || f === undefined) return null;
  const hi = Math.min(t ?? now, now);   // nothing exists in the future
  return { from: f ?? hi - 24 * 3600 * 1000, to: hi };
}

/**
 * Carriers of a run card, each with its sets (one entry per visit, `seq` = key for /parts) and the Strip numbers of every set:
 * [{ carrier, sets: [{ seq, strips: [strip numbers] }] }]   (carriers and their sets in ascending order)
 */
function carriersOf(rows) {
  const by = new Map();
  for (const v of visitsOf(rows)) {
    if (!by.has(v.carrier)) by.set(v.carrier, { carrier: v.carrier, sets: [] });
    by.get(v.carrier).sets.push({ seq: v.seq, strips: v.strips.map(stripName) });
  }
  return [...by.values()].sort((a, b) => a.carrier - b.carrier);
}

const partsOf = (rows, seq) =>
  rows
    .filter((r) => r.seq === seq)
    .sort((a, b) => a.susp - b.susp)
    .map((r) => ({ ...r, strip_no: stripName(r.strip_no) }));

module.exports = { stripName, carriersOf, visitsOf, partsOf, rangeOf, DEFECTS };
