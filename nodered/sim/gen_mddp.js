'use strict';
// Batch generator used by the Node-RED function node: returns InfluxDB line protocol (ms precision)
// for every sim sample in (from, to]. All timestamps are the real sim event times in ms.
const m = require('./mddp.js');
const FAST_DT = 1;    // ms  -> 1 kHz pressure + vibration
const SLOW_DT = 50;   // ms  -> 20 Hz arm position, temperature, carriers
const MACHINE = 'MDDP_184';
const r = (v, d) => +v.toFixed(d);
const tag = `machine=${MACHINE}`;

// One generator per measurement (= one Node-RED flow each). Every generator returns the InfluxDB line protocol
// (ms precision) of all its samples in (from, to].
const fastTs = (from, to) => { const a = []; for (let ts = Math.floor(from / FAST_DT) * FAST_DT + FAST_DT; ts <= to; ts += FAST_DT) a.push(ts); return a; };
const slowTs = (from, to) => { const a = []; for (let ts = Math.floor(from / SLOW_DT) * SLOW_DT + SLOW_DT; ts <= to; ts += SLOW_DT) a.push(ts); return a; };

const RUN_CARRIERS = 45;   // carriers per run card (2,700 pieces / 60)
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; };
const signals = {
  // arm pressure (kPa) + robot vibration X/Y/Z (g) per arm, 1 kHz
  fast(base, from, to) {
    const out = [];
    for (const ts of fastTs(from, to)) {
      const t = (ts - base) / 1000;
      for (const s of ['L', 'R']) {
        const v = m.vibAt(s, t);
        out.push(`mddp_fast,${tag},side=${s} p=${r(m.pressureAt(s, t), 3)},vx=${r(v[0], 4)},vy=${r(v[1], 4)},vz=${r(v[2], 4)} ${ts}`);
      }
    }
    return out.join('\n');
  },
  // arm position, dispense state, cell number and head epoxy temperature per arm, 20 Hz
  arm(base, from, to) {
    const out = [];
    for (const ts of slowTs(from, to)) {
      const t = (ts - base) / 1000;
      for (const s of ['L', 'R']) {
        const a = m.armState(s, t);
        out.push(`mddp_arm,${tag},side=${s} x=${r(a.p.x, 2)},y=${r(a.p.y, 2)},ak=${a.k || 0}i,disp=${a.disp ? 1 : 0}i,active=${a.active ? 1 : 0}i,cell=${a.sn || 0}i,temp=${r(m.tempAt(s, t), 3)} ${ts}`);
      }
    }
    return out.join('\n');
  },
  // carrier position and pieces dispensed per carrier, 20 Hz
  carrier(base, from, to) {
    const out = [];
    for (const ts of slowTs(from, to)) {
      const t = (ts - base) / 1000;
      const c = Math.floor(t / m.P);
      for (let k = Math.max(1, c - 1); k <= c + 3; k++) {
        const x = m.carrierX(k, t);
        if (x === null) continue;
        const nL = m.shotsDone(t, (k - 1) * m.P, 'L', k), nR = m.shotsDone(t, k * m.P, 'R', k);
        out.push(`mddp_carrier,${tag},k=${k} x=${r(x, 2)},nL=${nL}i,nR=${nR}i ${ts}`);
      }
    }
    return out.join('\n');
  },
  // one event per finished dispense at the sim time it ends: duration (ms) and peak pressure (kPa)
  dispense(base, from, to) {
    const out = [];
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
  },
  // one row per finished piece (= 2 shots) with the process parameters of that piece and its defect bit mask
  // (bit 0..5 = ASQ-LCM, ASQ-MCM, ASQ-PCM, ISAD-CM, LM-5, MI). Defects are simulated: the further a piece's pressure,
  // dispense time or vibration is from nominal, the more likely it is defective (deterministic per piece).
  part(base, from, to) {
    const out = [];
    const f0 = (from - base) / 1000, t1 = (to - base) / 1000;
    for (const side of ['L', 'R']) {
      for (let k = Math.max(1, Math.floor(f0 / m.P) - 1); k <= Math.floor(t1 / m.P) + 2; k++) {
        const start = (side === 'L' ? k - 1 : k) * m.P;
        if (start > t1 + 1 || start + m.W < f0 - 1) continue;
        const segs = m.getSched(side, k).segs, ord = m.ORD[side];
        for (let j = 0; j < m.STEPS; j++) {
          const a = segs[2 * j], b = segs[2 * j + 1];
          if (!a || !b) continue;
          const ts = Math.round(base + (start + b.s1) * 1000);
          if (ts <= from || ts > to) continue;
          const peak = (a.peak + b.peak) / 2, dur = ((a.dur + b.dur) / 2) * 1000;
          let ax = 0, ay = 0, az = 0;
          for (let u = start + a.s1 - a.dur; u <= start + b.s1; u += 0.005) {
            const v = m.vibAt(side, u);
            ax = Math.max(ax, Math.abs(v[0])); ay = Math.max(ay, Math.abs(v[1])); az = Math.max(az, Math.abs(v[2]));
          }
          const G = 9.81, W2 = 2 * Math.PI * 30;   // acceleration m/s2; velocity mm/s assuming a 30 Hz dominant vibration
          const zP = Math.min(1, Math.abs(peak - 90) / 4.5), zD = Math.min(1, Math.abs(dur - 70) / 7), zV = Math.min(1, ax / 0.9);
          let mask = 0;
          const seed = k * 7919 + (side === 'L' ? 0 : 3571) + j * 31;
          for (let d = 0; d < 6; d++) {
            const p = 0.006 + 0.07 * Math.max(0, zP - 0.6) + 0.07 * Math.max(0, zD - 0.6) + (d === 5 ? 0.05 * Math.max(0, zV - 0.5) : 0);
            if (hash(seed + d * 101) < p) mask |= 1 << d;
          }
          const seq = ((k - 1) % RUN_CARRIERS) + 1, rc = 'RC-' + new Date(base).toISOString().slice(2, 16).replace(/[-:T]/g, '') + '-' + String(Math.floor((k - 1) / RUN_CARRIERS) + 1).padStart(2, '0');
          const row = ord[j][0], carrier = m.cid(k);   // carrier number is reused (40 carriers, 45 visits per run card); seq = visit position in the run card
          out.push(`mddp_part,${tag},side=${side},rc=${rc} seq=${seq}i,carrier=${carrier}i,strip=${row}i,strip_no=${(seq - 1) * 3 + row}i,part=${ord[j][1]}i,susp=${(row - 1) * 20 + ord[j][1]}i,temp=${r(m.tempAt(side, start + b.s1), 3)},peak=${r(peak, 3)},dur=${r(dur, 2)},accx=${r(ax * G, 3)},accy=${r(ay * G, 3)},accz=${r(az * G, 3)},velx=${r(ax * G / W2 * 1000, 3)},vely=${r(ay * G / W2 * 1000, 3)},velz=${r(az * G / W2 * 1000, 3)},defect=${mask}i ${ts}`);
        }
      }
    }
    return out.join('\n');
  },
};
const gen = (base, from, to) => Object.values(signals).map((g) => g(base, from, to)).filter(Boolean).join('\n');
module.exports = { gen, signals, MACHINE };
