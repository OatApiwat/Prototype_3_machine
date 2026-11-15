'use strict';
// Batch generator used by the Node-RED function node: returns InfluxDB line protocol (ms precision)
// for every sim sample in (from, to]. All timestamps are the real sim event times in ms.
const m = require('./mddp.js');
const FAST_DT = 1;    // ms  -> 1 kHz pressure + vibration
const SLOW_DT = 50;   // ms  -> 20 Hz arm position, temperature, carriers
const MACHINE = 'MDDP_184';
const r = (v, d) => +v.toFixed(d);

function gen(base, from, to) {
  const out = [];
  const tag = `machine=${MACHINE}`;
  for (let ts = Math.floor(from / FAST_DT) * FAST_DT + FAST_DT; ts <= to; ts += FAST_DT) {
    const t = (ts - base) / 1000;
    for (const s of ['L', 'R']) {
      const v = m.vibAt(s, t);
      out.push(`mddp_fast,${tag},side=${s} p=${r(m.pressureAt(s, t), 3)},vx=${r(v[0], 4)},vy=${r(v[1], 4)},vz=${r(v[2], 4)} ${ts}`);
    }
  }
  for (let ts = Math.floor(from / SLOW_DT) * SLOW_DT + SLOW_DT; ts <= to; ts += SLOW_DT) {
    const t = (ts - base) / 1000;
    for (const s of ['L', 'R']) {
      const a = m.armState(s, t);
      out.push(`mddp_arm,${tag},side=${s} x=${r(a.p.x, 2)},y=${r(a.p.y, 2)},ak=${a.k || 0}i,disp=${a.disp ? 1 : 0}i,active=${a.active ? 1 : 0}i,cell=${a.sn || 0}i,temp=${r(m.tempAt(s, t), 3)} ${ts}`);
    }
    const c = Math.floor(t / m.P);
    for (let k = Math.max(1, c - 1); k <= c + 3; k++) {
      const x = m.carrierX(k, t);
      if (x === null) continue;
      const nL = m.shotsDone(t, (k - 1) * m.P, 'L', k), nR = m.shotsDone(t, k * m.P, 'R', k);
      out.push(`mddp_carrier,${tag},k=${k} x=${r(x, 2)},nL=${nL}i,nR=${nR}i ${ts}`);
    }
  }
  // one event per finished dispense at the sim time it ends: duration (ms) and peak pressure (kPa)
  const f0 = (from - base) / 1000, t1 = (to - base) / 1000;
  for (const side of ['L', 'R']) {
    for (let k = Math.max(1, Math.floor(f0 / m.P) - 1); k <= Math.floor(t1 / m.P) + 2; k++) {
      const start = (side === 'L' ? k - 1 : k) * m.P;
      if (start > t1 + 1 || start + m.W < f0 - 1) continue;
      m.getSched(side, k).segs.forEach((sg, i) => {
        const ts = Math.round(base + (start + sg.s1) * 1000);
        if (ts > from && ts <= to) out.push(`mddp_dispense,${tag},side=${side} dur=${r(sg.dur * 1000, 2)},peak=${r(sg.peak, 2)},carrier=${k}i,shot=${i + 1}i ${ts}`);
      });
    }
  }
  return out.join('\n');
}
module.exports = { gen, MACHINE };
