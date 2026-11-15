'use strict';
// Pure helpers for the MDDP productivity (defect) API. Rows are the `mddp_part` points of one run card.
const DEFECTS = 6;   // bit 0..5 = ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5, MI

/** Strip no as the API shows it: "Strip-76" (stored as a number) */
const stripName = (n) => 'Strip-' + n;
/** Carrier no as the API shows it: a code such as "CR-0005" (stored as a number) */
const carrierName = (n) => 'CR-' + String(n).padStart(4, '0');

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
 * Carriers of a run card with their Strip numbers: [{ carrier, strips: ["Strip-1", ...] }]
 * (carriers and strips in ascending order; a carrier used several times lists the strips of every use)
 */
function carriersOf(rows) {
  const by = new Map();
  for (const r of rows) {
    if (r.carrier == null || r.strip_no == null) continue; // incomplete point: cannot be placed on a carrier
    if (!by.has(r.carrier)) by.set(r.carrier, new Set());
    by.get(r.carrier).add(r.strip_no);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([carrier, set]) => ({ carrier: carrierName(carrier), strips: [...set].sort((a, b) => a - b).map(stripName) }));
}

/** pieces of the given strips ("Strip-76", ...), one row per piece in strip then part order */
const partsOf = (rows, strips) => {
  const want = new Set(strips);
  return rows
    .filter((r) => want.has(stripName(r.strip_no)))
    .sort((a, b) => a.strip_no - b.strip_no || a.part - b.part)
    .map(({ seq, strip, susp, part, ...r }) => ({ ...r, carrier: carrierName(r.carrier), strip_no: stripName(r.strip_no), suspension_no: part }));   // part = suspension no. 1..20 in the strip // eslint-disable-line no-unused-vars
};

module.exports = { stripName, carrierName, carriersOf, partsOf, rangeOf };
