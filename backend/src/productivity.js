'use strict';
// Pure helpers for the MDDP productivity (defect) API. Rows are the `mddp_part` points of one run card.
const DEFECTS = 6;   // bit 0..5 = ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5, MI
const DEFECT_CODES = ['ASQ-LCM', 'ASQ-MCM', 'ASQ-PCM', 'ISAD-CM', 'LM-5', 'MI'];
/** stored bitmask -> the defect codes of the piece: 0 -> [], 5 -> ["ASQ-LCM","ASQ-PCM"] */
const codesOf = (mask) => DEFECT_CODES.filter((_, i) => (mask >> i) & 1);

/** Strip no as the API shows it: "Strip-76" (stored as a number) */
const stripName = (n) => 'Strip-' + n;
/** Carrier no as the API shows it: a code such as "CR-0005" (stored as a number) */
const carrierName = (n) => 'CR-' + String(n).padStart(4, '0');

/**
 * Query range of /api/mddp_184/runcards: calendar dates ("YYYY-MM-DD", from = start of that day, to = end of that day, in the time zone
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
 * Carriers of a run card with the summary of each of their strips, in ascending order:
 * [{ carrier: "CR-0005", strips: [{ strip_no: "Strip-76", pieces: 20, defective: 3 }, ...] }]  (all uses of the carrier)
 */
function carriersOf(rows) {
  const by = new Map();
  for (const r of rows) {
    if (r.carrier == null || r.strip_no == null) continue; // incomplete point: cannot be placed on a carrier
    if (!by.has(r.carrier)) by.set(r.carrier, new Map());
    const st = by.get(r.carrier);
    const e = st.get(r.strip_no) || { strip_no: stripName(r.strip_no), pieces: 0, defective: 0 };
    e.pieces++;
    if (r.defect > 0) e.defective++;
    st.set(r.strip_no, e);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([carrier, st]) => ({ carrier: carrierName(carrier), strips: [...st.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]) }));
}

/** Strip numbers of one carrier ("CR-0005") in a run card, in ascending order: ["Strip-1", "Strip-2", ...] (all uses of the carrier) */
function stripsOf(rows, carrier) {
  const set = new Set();
  for (const r of rows) if (r.carrier != null && r.strip_no != null && carrierName(r.carrier) === carrier) set.add(r.strip_no);
  return [...set].sort((a, b) => a - b).map(stripName);
}

/** pieces of the given strips ("Strip-76", ...), one row per piece in strip then part order */
const partsOf = (rows, strips) => {
  const want = new Set(strips);
  return rows
    .filter((r) => want.has(stripName(r.strip_no)))
    .sort((a, b) => a.strip_no - b.strip_no || a.part - b.part)
    .map(({ seq, strip, susp, part, ...r }) => ({ ...r, carrier: carrierName(r.carrier), strip_no: stripName(r.strip_no), suspension_no: part, defect: codesOf(r.defect) }));   // part = suspension no. 1..20 in the strip // eslint-disable-line no-unused-vars
};

/** "Strip-1","Strip-2","Strip-3","Strip-76",... (sorted) -> [["Strip-1","Strip-2","Strip-3"],["Strip-76",...]]: one group per use of the carrier (up to 3 consecutive strips) */
function groupStrips(names, size = 3) {
  const out = [];
  for (const n of names) {
    const no = +String(n).replace(/\D/g, ''), last = out[out.length - 1];
    if (last && last.g.length < size && no === last.end + 1) { last.g.push(n); last.end = no; } else out.push({ g: [n], end: no });
  }
  return out.map((x) => x.g);
}
/** YYYY-MM-DD of an epoch ms in the time zone `tzMin` minutes east of UTC (null without a time) */
const dateOf = (t, tzMin) => (t == null ? null : new Date(t + tzMin * 60000).toISOString().slice(0, 10));
/** flat API pieces -> carrier >> strip >> suspension: [{ carrier, strips: [{ strip_no, suspension: [{ suspension_no, ... }] }] }], each level in ascending order */
function nestParts(pieces, tzMin = 0) {
  const num = (x) => +String(x).replace(/\D/g, '');
  const by = new Map();
  for (const { carrier, strip_no, ...r } of pieces) {
    if (!by.has(carrier)) by.set(carrier, new Map());
    const st = by.get(carrier);
    if (!st.has(strip_no)) st.set(strip_no, []);
    const { suspension_no, ...rest } = r;
    st.get(strip_no).push({ suspension_no, date: dateOf(r.t, tzMin), ...rest });   // date right after suspension_no
  }
  return [...by.entries()]
    .sort((a, b) => num(a[0]) - num(b[0]))
    .map(([carrier, st]) => ({
      carrier,
      strips: [...st.entries()].sort((a, b) => num(a[0]) - num(b[0])).map(([strip_no, sus]) => ({ strip_no, suspension: sus.sort((a, b) => a.suspension_no - b.suspension_no) })),
    }));
}
module.exports = { dateOf, nestParts, codesOf, groupStrips, stripName, carrierName, carriersOf, stripsOf, partsOf, rangeOf };
