// Defect types (bit 0..5 of the `defect` field of mddp_part) and helpers for the Productivity Dashboard.
export const DEFECTS = ['ASQ-LCM', 'ASQ-MCM', 'ASQ-PCM', 'ISAD-CM', 'LM-5', 'MI'];
export const DEFECT_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#b07aa1', '#edc948'];
export const PARTS_PER_STRIP = 20;
export const STRIPS_PER_CARRIER = 3;

export const popcount = (m) => {
  let n = 0;
  for (let x = m | 0; x; x >>= 1) n += x & 1;
  return n;
};
export const hasDefect = (m, i) => ((m | 0) >> i) & 1;
export const stripLabel = (n) => 'Strip ' + String(n).padStart(3, '0');
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

/** rows of one strip -> array of PARTS_PER_STRIP entries (index = part no. - 1), null where the part is not made yet */
export function stripRows(rows, strip) {
  const out = Array(PARTS_PER_STRIP).fill(null);
  for (const r of rows)
    if (r.strip === strip && r.part >= 1 && r.part <= PARTS_PER_STRIP) out[r.part - 1] = r;
  return out;
}

/** per suspension (strip-in-carrier x part, 60 per carrier) defect counts over the whole run card */
export function bySuspension(rows) {
  const out = Array.from({ length: STRIPS_PER_CARRIER * PARTS_PER_STRIP }, (_, i) => ({
    n: 0,
    d: 0,
    cnt: DEFECTS.map(() => 0),
    strip: Math.floor(i / PARTS_PER_STRIP) + 1,
    part: (i % PARTS_PER_STRIP) + 1,
  }));
  for (const r of rows) {
    const s = out[((r.strip - 1) % STRIPS_PER_CARRIER) * PARTS_PER_STRIP + (r.part - 1)];
    if (!s) continue;
    s.n++;
    if (r.defect > 0) s.d++;
    DEFECTS.forEach((_, i) => {
      s.cnt[i] += hasDefect(r.defect, i);
    });
  }
  return out;
}

/** summary of one strip: parts made, defects found, defective parts, most frequent defect type */
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
