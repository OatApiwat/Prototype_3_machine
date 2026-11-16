// Defect types (bit 0..5 of the `defect` field of mddp_part) and helpers for the Productivity Dashboard.
export const DEFECTS = ['ASQ-LCM', 'ASQ-MCM', 'ASQ-PCM', 'ISAD-CM', 'LM-5', 'MI'];
export const DEFECT_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#b07aa1', '#edc948'];
export const PARTS_PER_STRIP = 20;
export const STRIPS_PER_CARRIER = 3;
export const SUSPENSIONS = PARTS_PER_STRIP * STRIPS_PER_CARRIER; // per carrier
export const PIECES_PER_RUN_CARD = 2700;

export const popcount = (m) => {
  let n = 0;
  for (let x = m | 0; x; x >>= 1) n += x & 1;
  return n;
};
export const hasDefect = (m, i) => ((m | 0) >> i) & 1;
/** the API answers strip numbers as "Strip-76"; a bare number is formatted the same way */
export const stripLabel = (n) => (typeof n === 'string' ? n : 'Strip-' + n);
/** the API answers the carrier as a code ("CR-0005"); it is shown as it comes */
export const carrierLabel = (c) => String(c);
const p2 = (n, l = 2) => String(n).padStart(l, '0');
/** time of day to the millisecond: 14:50:54.462 */
export const clock = (ms) => {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p2(d.getMilliseconds(), 3)}`;
};
/** date and time to the millisecond: 2026-11-15 14:50:54.462 */
export const stamp = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${clock(ms)}`;
};
/** short run card label: "RC-2611150231-02" -> same; kept as a function so the format lives in one place */
export const runCardLabel = (rc) => rc;

/** "nice" axis for a value range: { lo, hi, step, ticks } */
export function niceAxis(min, max) {
  if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, step: 0.5, ticks: [0, 0.5, 1] };
  if (max - min < 1e-9) {
    min -= 0.5;
    max += 0.5;
  }
  const pad = (max - min) * 0.1,
    span = max - min + 2 * pad,
    raw = span / 4,
    p = Math.pow(10, Math.floor(Math.log10(raw))),
    f = raw / p,
    step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p,
    lo = Math.floor((min - pad) / step) * step,
    hi = Math.ceil((max + pad) / step) * step,
    ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi: ticks[ticks.length - 1], step, ticks };
}

/** rows of one carrier -> SUSPENSIONS entries (index = suspension no. - 1), null where the piece is not made yet */
export function carrierRows(rows) {
  const out = Array(SUSPENSIONS).fill(null);
  for (const r of rows) if (r.susp >= 1 && r.susp <= SUSPENSIONS) out[r.susp - 1] = r;
  return out;
}

/** summary of one carrier: parts made, defects found, defective parts, most frequent defect type */
export function summarize(parts) {
  const made = parts.filter(Boolean);
  const cnt = DEFECTS.map(() => 0);
  let defective = 0;
  for (const r of made) {
    if (r.defect > 0) defective++;
    DEFECTS.forEach((_, i) => {
      cnt[i] += hasDefect(r.defect, i);
    });
  }
  const total = cnt.reduce((a, b) => a + b, 0);
  const top = total ? DEFECTS[cnt.indexOf(Math.max(...cnt))] : '-';
  return { n: made.length, total, defective, top };
}
