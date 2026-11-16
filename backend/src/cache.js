'use strict';
// In-memory ring buffers, one per measurement. Rows are { t (ms), tags..., fields... }.
class Cache {
  constructor(limitsSec) { this.limits = limitsSec; this.data = new Map(); this.lastT = new Map(); }
  limitFor(m) { return (this.limits[m] || this.limits.default) * 1000; }
  add(m, rows) {
    if (!rows.length) return;
    let arr = this.data.get(m); if (!arr) { arr = []; this.data.set(m, arr); }
    for (const r of rows) arr.push(r);
    const newest = arr[arr.length - 1].t;
    this.lastT.set(m, newest);
    const cut = newest - this.limitFor(m);
    let i = 0; while (i < arr.length && arr[i].t < cut) i++;
    if (i > 0) arr.splice(0, i);
  }
  since(m, t0) { const arr = this.data.get(m) || []; let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid].t < t0) lo = mid + 1; else hi = mid; } return arr.slice(lo); }
  oldest(m) { const arr = this.data.get(m); return arr && arr.length ? arr[0].t : null; }
  measurements() { return [...this.data.keys()]; }
}
module.exports = { Cache };
