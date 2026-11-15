// Live data store. Everything comes from the backend (which reads InfluxDB); nothing is generated here.
const KEEP_MS = 125000;
const series = new Map();          // key -> rows sorted by t
const listeners = new Set();
export const state = { connected: false, offset: 0, delay: 8000, lastRowT: 0, rows: 0 };

const keyOf = (r) => r.m + '|' + [r.side, r.k, r.axis, r.point].filter((v) => v !== undefined && v !== '').join('/');
function merge(rows) {
  for (const r of rows) {
    const k = keyOf(r); let a = series.get(k); if (!a) { a = []; series.set(k, a); }
    if (!a.length || r.t > a[a.length - 1].t) a.push(r);
    else if (r.t < a[0].t) a.unshift(r);                    // out-of-order (rare): insert, keep sorted below
    else { a.push(r); a.sort((x, y) => x.t - y.t); }
    if (r.t > state.lastRowT) state.lastRowT = r.t;
  }
  state.rows += rows.length;
  const cut = state.lastRowT - KEEP_MS;
  for (const a of series.values()) { let i = 0; while (i < a.length && a[i].t < cut) i++; if (i > 0) a.splice(0, i); }
}
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach((f) => f());

export const nowRender = () => Date.now() + state.offset - state.delay;

export function rowsOf(key) { return series.get(key) || []; }
export function keysWith(prefix) { return [...series.keys()].filter((k) => k.startsWith(prefix)); }

function lowerBound(a, t) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m].t < t) lo = m + 1; else hi = m; } return lo; }
// value of a field at time t: linear interpolation between the two stored samples (or step for discrete fields)
export function sample(key, field, t, step = false) {
  const a = series.get(key); if (!a || !a.length) return null;
  const i = lowerBound(a, t);
  if (i === 0) return a[0].t - t > 1500 ? null : a[0][field] ?? null;
  if (i >= a.length) return t - a[a.length - 1].t > 1500 ? null : a[a.length - 1][field] ?? null;
  const p = a[i - 1], q = a[i];
  if (q.t - p.t > 1500) return null;                         // gap in the data: do not invent values
  if (step || typeof p[field] !== 'number' || typeof q[field] !== 'number') return p[field] ?? null;
  return p[field] + (q[field] - p[field]) * ((t - p.t) / (q.t - p.t || 1));
}
export function range(key, t0, t1) { const a = series.get(key) || []; const i = lowerBound(a, t0); const out = []; for (let j = i; j < a.length && a[j].t <= t1; j++) out.push(a[j]); return out; }

let ws, retry = 0;
export function start() {
  fetch('/api/config').then((r) => r.json()).then((c) => { state.delay = c.renderDelayMs; }).catch(() => {});
  const open = () => {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => { state.connected = true; retry = 0; notify(); };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'snapshot') { series.clear(); state.lastRowT = 0; state.offset = msg.serverNow - Date.now(); }
      for (const rows of Object.values(msg.data)) merge(rows);
      notify();
    };
    ws.onclose = () => { state.connected = false; notify(); setTimeout(open, Math.min(10000, 500 * 2 ** retry++)); };  // reconnect: new snapshot backfills the gap from the backend cache
    ws.onerror = () => ws.close();
  };
  open();
}
