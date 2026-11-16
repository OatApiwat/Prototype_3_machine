'use strict';
const h = require('./hall.js');
const MACHINE = 'HAll_013';
const r = (v, d) => +v.toFixed(d);
const tag = `machine=${MACHINE}`;
const DT = 100;   // 10 Hz

const ticks = (from, to) => { const a = []; for (let ts = Math.floor(from / DT) * DT + DT; ts <= to; ts += DT) a.push(ts); return a; };

const signals = {
  // oven temperature, heater duty, blower speed/vibration X/Y/Z/temperature, conveyor speed + roll/angle/flow counters, 10 Hz
  oven(base, from, to) {
    return ticks(from, to).map((ts) => {
      const t = (ts - base) / 1000;
      return `hall_oven,${tag} temp=${r(h.tempAt(t), 3)},duty=${r(h.dutyAt(t), 2)},rpm=${r(h.rpmAt(t), 2)},vx=${r(h.vibAxis(0, t), 4)},vy=${r(h.vibAxis(1, t), 4)},vz=${r(h.vibAxis(2, t), 4)},blower_temp=${r(h.blowerTemp(t), 3)},conv=${r(h.convAt(t), 4)},roll=${r(h.V * t / 15, 4)},ang=${r(t * 7, 3)},flow=${r(t * 55, 2)} ${ts}`;
    }).join('\n');
  },
  // position of every tray on the belt and whether it is inside the oven, 10 Hz
  tray(base, from, to) {
    const out = [];
    for (const ts of ticks(from, to)) {
      const t = (ts - base) / 1000;
      for (let k = 0; k < h.READY.length; k++) {
        const x = h.xOf(k, t);
        if (x > h.XS + 300) break;         // not on the belt yet
        if (x < -h.XS - 300) continue;     // already gone
        out.push(`hall_tray,${tag},k=${k} x=${r(x, 2)},in_oven=${Math.abs(x) <= h.XOV ? 1 : 0}i ${ts}`);
      }
    }
    return out.join('\n');
  },
  // curing time of every tray, written when the tray leaves the oven
  cure(base, from, to) {
    const out = [];
    const f0 = (from - base) / 1000, t1 = (to - base) / 1000;
    for (let k = 0; k < h.READY.length; k++) {
      const to_ = h.tOut(k);
      if (to_ > f0 && to_ <= t1) out.push(`hall_cure,${tag} cure_s=${r(h.dwellActual(k), 2)},set_s=${r(h.DWELL, 2)},tray=${k}i ${Math.round(base + to_ * 1000)}`);
    }
    return out.join('\n');
  },
};
const gen = (base, from, to) => Object.values(signals).map((g) => g(base, from, to)).filter(Boolean).join('\n');
module.exports = { gen, signals, MACHINE };
