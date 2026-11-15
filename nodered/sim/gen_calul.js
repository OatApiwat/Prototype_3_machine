'use strict';
const c = require('./calul.js');
const f = require('./festo.js');
const MACHINE = 'CALUL_037';
const r = (v, d) => +v.toFixed(d);
const tag = `machine=${MACHINE}`;
const RAD = 180 / Math.PI;
const FAST_DT = 10, SLOW_DT = 50;   // vacuum 100 Hz, robot 20 Hz

// ---- fault events, deterministic from the sim clock (legacy models) ----
const FTH = [41.8, 45.4, 52.2], AXN = ['X', 'Y', 'Z'], FDESC = { E201: 'Axis temperature above warning level', E412: 'Positive end-position limit switch triggered', E330: 'Encoder signal lost (auto reset)' };
const IAI = [['TF2', 'TF2 Position Error', 140, 31], ['TF1', 'TF1 Position Error', 170, 52], ['TOP CAM', 'TOP CAM Position Error', 230, 77], ['BOTTOM CAM', 'BUTTOM CAM Position Error', 260, 113], ['GRIPPER', 'GRIPPER Position Error', 190, 64], ['X', 'X Position Error', 310, 150], ['Y', 'Y Position Error', 350, 205], ['Z', 'Z Position Error', 400, 240]];
let FEV = null;
function faultEvents() {
  if (FEV) return FEV; FEV = []; const H = 3 * 3600 + 60;
  for (let k = 0; k < 3; k++) {
    let on = null; const first = FEV.length;
    for (let t = 0; t <= H; t += 0.5) { const T = f.festoT(k, t); if (T > FTH[k]) { if (on === null) on = t; } else if (on !== null) { FEV.push({ src: 'festo', t: on, t1: t, k, item: AXN[k], code: 'E201', desc: `Axis temperature above ${FTH[k]} \u00B0C (warning)`, val: FTH[k] }); on = null; } }
    for (let q = FEV.length - 1; q > first; q--) if (FEV[q].t - FEV[q - 1].t1 < 40) { FEV[q - 1].t1 = FEV[q].t1; FEV.splice(q, 1); }
  }
  for (const e of FEV) { let mx = 0; for (let t = e.t; t <= e.t1; t += 0.5) mx = Math.max(mx, f.festoT(e.k, t)); e.val = mx; }
  for (let n = 0; 95 + n * 420 < H; n++) FEV.push({ src: 'festo', t: 95 + n * 420, t1: 98 + n * 420, k: 0, item: 'X', code: 'E412', desc: FDESC.E412, val: 0 });
  for (let n = 0; 250 + n * 310 < H; n++) FEV.push({ src: 'festo', t: 250 + n * 310, t1: 255 + n * 310, k: 1, item: 'Y', code: 'E330', desc: FDESC.E330, val: 0 });
  IAI.forEach((q, k) => { for (let t = q[3]; t < H; t += q[2]) FEV.push({ src: 'iai', t, t1: t + 8, k, item: q[0], code: 'IE' + (101 + k), desc: q[1], val: 0 }); });
  FEV.sort((a, b) => a.t - b.t); return FEV;
}

// HA tray state: for the two alternating tray lanes (group % 2) a 12-pair bit mask of placed plates (bit 2n = front, 2n+1 = back) and the sideways shift (mm) while the set moves on
function trayFields(t) {
  const ph = c.phaseOf(t), NP = c.NPAIR, RF = c.T_RELF(), RB = c.T_RELB(), lanes = [{ m: 0, off: 0 }, { m: 0, off: 0 }];
  if (ph.c >= 0) {
    for (let G = Math.max(0, Math.floor(ph.c / NP) - 1); G <= Math.floor(ph.c / NP); G++) {
      const ts = c.startOf(NP * G + NP - 1) + RB + 0.3; if (t > ts + 1.6) continue;
      const lane = lanes[G % 2]; lane.off = t > ts ? 600 * c.minjerk((t - ts) / 1.4) : 0; lane.m = 0;
      for (let n = 0; n < NP; n++) for (let s = 0; s < 2; s++) if (t >= c.startOf(NP * G + n) + (s ? RB : RF)) lane.m += 2 ** (2 * n + s);
    }
  }
  return `m0=${lanes[0].m}i,o0=${r(lanes[0].off, 2)},m1=${lanes[1].m}i,o1=${r(lanes[1].off, 2)}`;
}

function gen(base, from, to) {
  const out = [];
  for (let ts = Math.floor(from / FAST_DT) * FAST_DT + FAST_DT; ts <= to; ts += FAST_DT) {
    const t = (ts - base) / 1000;
    out.push(`calul_vac,${tag} front=${r(c.vacAt(0, t), 3)},back=${r(c.vacAt(1, t), 3)} ${ts}`);
  }
  for (let ts = Math.floor(from / SLOW_DT) * SLOW_DT + SLOW_DT; ts <= to; ts += SLOW_DT) {
    const t = (ts - base) / 1000, ph = c.phaseOf(t);
    const tg = c.targetAt(t), tgi = c.WPS.findIndex((w, i) => ph.tc < w.l), ty = c.WPS[tgi < 0 ? 0 : tgi].yaw;
    const q = c.lerpQ(ph.tc, c.vOf(ph.c)), p = c.posAt(t), abc = c.abcAt(t), T = c.tempsAt(t), e = c.errAt(t), ea = c.angErrAt(t);
    let wp = 0, at = -1; for (let i = 0; i < c.NW; i++) { if (ph.tc < c.WPS[i].l) { wp = i; break; } } for (let i = 0; i < c.NW; i++) if (ph.tc >= c.WPS[i].a && ph.tc < c.WPS[i].l) at = i;
    const F = c.fkAll(q), pts = [F.S, F.E, F.W, F.F.p, F.T.p];
    const jf = pts.map((P, i) => `j${i + 1}x=${r(P[0], 2)},j${i + 1}y=${r(P[1], 2)},j${i + 1}z=${r(P[2], 2)}`).join(',');
    const qf = q.map((v, i) => `q${i + 1}=${r(v * RAD, 4)}`).join(',');
    const tf = T.map((v, i) => `t${i + 1}=${r(v, 3)}`).join(',');
    out.push(`calul_robot,${tag} ${qf},${jf},life=${r(730.5 * 86400 + t, 1)},${tf},x=${r(p[0], 3)},y=${r(p[1], 3)},z=${r(p[2], 3)},a=${r(abc[0], 3)},b=${r(abc[1], 3)},c=${r(abc[2], 3)},dx=${r(e[0], 4)},dy=${r(e[1], 4)},dz=${r(e[2], 4)},da=${r(ea[0], 4)},db=${r(ea[1], 4)},dc=${r(ea[2], 4)},tx=${r(tg[0], 3)},ty=${r(tg[1], 3)},tz=${r(tg[2], 3)},ta=${r(ty, 3)},tb=0,tg=180,hr=${2 * (ph.c % c.NPAIR) + 1}i,wp=${wp}i,at=${at}i,cycle=${ph.c + 1}i,tc=${r(ph.tc, 3)} ${ts}`);
    out.push(`calul_flow,${tag} ready=${Math.min(c.readyCount(t), 1e6)}i,picked=${c.pickedCycles(t)}i,sent=${c.sentCount(t)}i ${ts}`);
    out.push(`calul_tray,${tag} ${trayFields(t)},bufF=${Math.min(4, Math.ceil(Math.max(0, c.readyCount(t) - 2 * c.pickedCycles(t)) / 2))}i,bufB=${Math.min(4, Math.floor(Math.max(0, c.readyCount(t) - 2 * c.pickedCycles(t)) / 2))}i ${ts}`);
    for (let k = 0; k < 3; k++) out.push(`calul_festo,${tag},axis=${'XYZ'[k]} temp=${r(f.festoT(k, t), 3)} ${ts}`);
  }
  // measured arrivals: one event per waypoint arrival at the sim time of the measurement
  for (const a of c.arrivalsIn((from - base) / 1000, (to - base) / 1000)) {
    if (a.t * 1000 + base <= from) continue;
    const ts = Math.round(base + a.t * 1000), tp = c.VP[c.vOf(a.c)][a.i], ta = [c.WPS[a.i].yaw, 0, 180];
    out.push(`calul_arrival,${tag},point=P${a.i + 1} cycle=${a.c + 1}i,x=${r(tp[0] + a.e[0], 4)},y=${r(tp[1] + a.e[1], 4)},z=${r(tp[2] + a.e[2], 4)},a=${r(ta[0] + a.a[0], 4)},b=${r(ta[1] + a.a[1], 4)},c=${r(ta[2] + a.a[2], 4)},ex=${r(a.e[0], 4)},ey=${r(a.e[1], 4)},ez=${r(a.e[2], 4)},ea=${r(a.a[0], 4)},eb=${r(a.a[1], 4)},ec=${r(a.a[2], 4)} ${ts}`);
  }
  // fault-code log events (legacy Festo error codes + IAI error codes): one event per episode, written at its start time with its duration
  for (const ev of faultEvents()) {
    const ts = Math.round(base + ev.t * 1000);
    if (ts > from && ts <= to) out.push(`calul_fault,${tag},src=${ev.src} item="${ev.item}",ki=${ev.k}i,code="${ev.code}",desc="${ev.desc}",dur=${r(ev.t1 - ev.t, 1)},val=${r(ev.val, 1)} ${ts}`);
  }
  return out.join('\n');
}
module.exports = { gen, MACHINE };
