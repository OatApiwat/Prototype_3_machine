'use strict';
const h = require('./hall.js');
const MACHINE = 'HAll_013';
const r = (v, d) => +v.toFixed(d);
const tag = `machine=${MACHINE}`;
const DT = 100;   // 10 Hz

function gen(base, from, to) {
  const out = [];
  for (let ts = Math.floor(from / DT) * DT + DT; ts <= to; ts += DT) {
    const t = (ts - base) / 1000;
    out.push(`hall_oven,${tag} temp=${r(h.tempAt(t), 3)},duty=${r(h.dutyAt(t), 2)},rpm=${r(h.rpmAt(t), 2)},vx=${r(h.vibAxis(0, t), 4)},vy=${r(h.vibAxis(1, t), 4)},vz=${r(h.vibAxis(2, t), 4)},blower_temp=${r(h.blowerTemp(t), 3)},conv=${r(h.convAt(t), 4)} ${ts}`);
    for (let k = 0; k < h.READY.length; k++) {
      const x = h.xOf(k, t);
      if (x > h.XS + 300) break;         // not on the belt yet
      if (x < -h.XS - 300) continue;     // already gone
      out.push(`hall_tray,${tag},k=${k} x=${r(x, 2)},in_oven=${Math.abs(x) <= h.XOV ? 1 : 0}i ${ts}`);
    }
  }
  // curing time of every tray, written when the tray leaves the oven
  const f0 = (from - base) / 1000, t1 = (to - base) / 1000;
  for (let k = 0; k < h.READY.length; k++) {
    const to_ = h.tOut(k);
    if (to_ > f0 && to_ <= t1) out.push(`hall_cure,${tag} cure_s=${r(h.dwellActual(k), 2)},set_s=${r(h.DWELL, 2)},tray=${k}i ${Math.round(base + to_ * 1000)}`);
  }
  return out.join('\n');
}
module.exports = { gen, MACHINE };
