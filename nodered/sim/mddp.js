'use strict';
// Deterministic MDDP_184 machine model, extracted from the legacy single-file HTML (Tab 1).
  var LX = 10, RX = 800, ENTER = 820;
  var COL_X0 = 62, PITCH_X = 34, ROW_Y0 = 20, PITCH_Y = 52, CELL_W = 30, CELL_H = 40;
  var CAR_TOP = 56, RAIL_BOT = 34;
  // ---- timing (seconds of animation time) ----
  var STEPS = 30, W = 8.0, H = 2.0, P = W + H;      // 30 pieces per arm per Carrier, work time, handoff time
  var MOVE_MAX = 0.18, SETTLE = 0.010, DX = 7, T_START = 0.1;   // longest move time (s), settle time (s), dot offset from cell centre (px), start delay (s)
  var NCAR = 40, RUN = 2700, PER = 60, LOADS = RUN / PER;
  var WIN = 15, YMAX = 120;   // graph window (s) and pressure axis max (kPa)
  var WIN_MIN = 0.2, WIN_MAX = 60;
  function cid(k) { return ((k - 1) % NCAR) + 1; }
  function sn(r, c) { return (r - 1) * 20 + c; }
  function order(side) {
    var o = [];
    for (var r = 1; r <= 3; r++) {
      if (side === 'L') for (var c = 10; c >= 1; c--) o.push([r, c]);
      else for (var c2 = 11; c2 <= 20; c2++) o.push([r, c2]);
    }
    return o;
  }
  var ORD = { L: order('L'), R: order('R') };
  function cellCenter(x0, r, c) {   // +2 = carrier border width
    return { x: 2 + x0 + COL_X0 + (c - 1) * PITCH_X + CELL_W / 2, y: 2 + CAR_TOP + ROW_Y0 + (r - 1) * PITCH_Y + CELL_H / 2 };
  }

  // ---- deterministic "realistic" variation per dispense ----
  function rnd(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function stepParams(side, k, i) {   // i = shot index 0..59
    var seed = k * 977 + (side === 'L' ? 0 : 431) + i * 13;
    return { peak: 90 + (rnd(seed) - 0.5) * 9, dur: 0.070 + (rnd(seed + 7919) - 0.5) * 0.014 };  // 100 +-4.5 kPa, 70 +-7 ms
  }
  function smooth(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  var HOME = { L: cellCenter(LX, 1, 10), R: cellCenter(RX, 1, 11) };
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function lerp(a, b, u) { return a + (b - a) * u; }

  function carrierX(k, t) {
    var Te = (k - 2) * P + W, Tm = (k - 1) * P + W, Tx = k * P + W;
    if (t < Te) return null;
    if (t < Te + H) return lerp(LX - ENTER, LX, ease((t - Te) / H));
    if (t < Tm) return LX;
    if (t < Tm + H) return lerp(LX, RX, ease((t - Tm) / H));
    if (t < Tx) return RX;
    if (t < Tx + H) return lerp(RX, RX + ENTER, ease((t - Tx) / H));
    return null;
  }

  // ---- motion schedule: 2 shots per piece; move time grows with distance (constant acceleration + settle) ----
  var SCH = {}, DMAX = Math.hypot(9 * PITCH_X + 2 * DX, PITCH_Y);   // longest move inside a Carrier (end of a strip -> start of the next)
  function getSched(side, k) {
    var key = side + k; if (SCH[key]) return SCH[key];
    var x0 = side === 'L' ? LX : RX, ord = ORD[side], prev = HOME[side], cur = T_START, segs = [];
    for (var j = 0; j < STEPS; j++) {
      var cc = cellCenter(x0, ord[j][0], ord[j][1]);
      for (var sh = 0; sh < 2; sh++) {
        var dirx = (side === 'L' ? 1 : -1) * (sh ? -1 : 1);   // arm sweeps toward its travel direction: L goes right dot -> left dot, R goes left dot -> right dot
        var to = { x: cc.x + dirx * DX, y: cc.y };
        var d = Math.hypot(to.x - prev.x, to.y - prev.y);
        var mv = (MOVE_MAX - SETTLE) * Math.sqrt(d / DMAX), t1 = cur + mv + SETTLE, sp = stepParams(side, k, j * 2 + sh);
        segs.push({ t0: cur, mv: mv, t1: t1, s0: t1, s1: t1 + sp.dur, dur: sp.dur, peak: sp.peak, from: prev, to: to, j: j, sh: sh });
        prev = to; cur = t1 + sp.dur;
      }
    }
    var o = { segs: segs, end: cur };
    SCH[key] = o; delete SCH[side + (k - 6)];
    return o;
  }
  function findSeg(segs, tau) {   // last segment with t0 <= tau, or -1
    var lo = 0, hi = segs.length - 1, r = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (segs[m].t0 <= tau) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  function shotsDone(t, start, side, k) {   // shots finished so far (0..60)
    var tau = t - start; if (tau < 0) return 0;
    var segs = getSched(side, k).segs, lo = 0, hi = segs.length - 1, r = 0;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (segs[m].s1 <= tau) { r = m + 1; lo = m + 1; } else hi = m - 1; }
    return r;
  }
  function tri(u) { u = Math.max(0, Math.min(1, u)); return u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); }   // constant accel then decel

  // arm position + dispense state at time t
  function armState(side, t) {
    var c = Math.floor(t / P), tau = t - c * P;
    var k = side === 'L' ? c + 1 : c, home = HOME[side];
    if (k < 1) return { p: home, k: null, active: false, disp: false };
    var sc = getSched(side, k), segs = sc.segs;
    if (tau >= W) {
      var lp = segs[segs.length - 1].to, uu = ease((tau - W) / H);
      return { p: { x: lerp(lp.x, home.x, uu), y: lerp(lp.y, home.y, uu) }, k: null, active: false, disp: false };
    }
    var idx = findSeg(segs, tau);
    if (idx < 0) return { p: home, k: k, active: false, disp: false };
    var sg = segs[idx];
    if (tau < sg.t1) {
      var s2 = sg.mv > 0 ? tri((tau - sg.t0) / sg.mv) : 1;
      return { p: { x: lerp(sg.from.x, sg.to.x, s2), y: lerp(sg.from.y, sg.to.y, s2) }, k: k, active: sg.sh === 1, disp: false, sn: sn(ORD[side][sg.j][0], ORD[side][sg.j][1]), j: sg.j, sh: sg.sh };
    }
    var disp = tau < sg.s1;
    return { p: sg.to, k: k, active: disp, disp: disp, prog: disp ? (tau - sg.s0) / sg.dur : 0, sn: sn(ORD[side][sg.j][0], ORD[side][sg.j][1]), j: sg.j, sh: sg.sh };
  }

  // pressure (kPa) of one arm at time tt - the SAME schedule that drives the animation
  function pressureAt(side, tt) {
    var base = Math.max(0, 0.4 + (rnd(Math.floor(tt * 400) + (side === 'L' ? 11 : 23)) - 0.5) * 0.6);
    if (tt < 0) return base;
    var c = Math.floor(tt / P), tau = tt - c * P;
    var k = side === 'L' ? c + 1 : c;
    if (k < 1 || tau >= W) return base;
    var segs = getSched(side, k).segs, idx = findSeg(segs, tau);
    if (idx < 0) return base;
    var sg = segs[idx], u = tau - sg.s0;
    if (u < 0 || u >= sg.dur) return base;
    var shape = smooth(u / 0.006) * smooth((sg.dur - u) / 0.008);
    var ripple = shape > 0.9 ? (rnd(Math.floor(tt * 1000) + 5) - 0.5) * 2.0 : 0;
    return base + (sg.peak - base) * shape + ripple;
  }
  //  = 110 setpoint + thermostat hysteresis ripple (+-0.6, 5 s period) - heat removed by each dispense
  //  (proportional to the dispensed volume ~ shot duration; fast cooling during the shot, 0.4 s recovery by the heater)
  var T_SET = 110, T_RIPPLE = 0.6, T_PERIOD = 5.0, T_DIP = 0.25, TAU_COOL = 0.03, TAU_REC = 0.4;
  function tempAt(side, tt) {
    var f = (tt / T_PERIOD + (side === 'L' ? 0 : 0.5)) % 1; if (f < 0) f += 1;
    var v = T_SET + T_RIPPLE * (Math.abs(f * 2 - 1) * 2 - 1);
    if (tt < 0) return v;
    var c = Math.floor(tt / P), tau = tt - c * P, k = side === 'L' ? c + 1 : c;
    if (k < 1) return v;
    var segs = getSched(side, k).segs, idx = tau >= W ? segs.length - 1 : findSeg(segs, tau);
    for (var i = idx; i >= Math.max(0, idx - 20); i--) {
      var sg = segs[i], e = tau - sg.s0;
      if (e < 0) continue;
      var A = T_DIP * sg.dur / 0.070;
      v -= A * (1 - Math.exp(-Math.min(e, sg.dur) / TAU_COOL)) * Math.exp(-Math.max(0, e - sg.dur) / TAU_REC);
    }
    return v;
  }
  var A_ACC = 0.28, A_RING = 0.18, TAU_STRUCT = 0.012, COUPLE = 0.12, FLOOR = [0.012, 0.010, 0.016], Z_KICK = 0.05, TAU_KICK = 0.010;
  function vibAt(side, tt) {
    var o = [FLOOR[0], FLOOR[1], FLOOR[2]];
    if (tt < 0) return o;
    var c = Math.floor(tt / P), tau = tt - c * P, k = side === 'L' ? c + 1 : c;
    if (tau >= W) {   // Carrier transfer: conveyor hum (smooth ramp in/out), arm returns slowly (negligible acceleration)
      var u = Math.max(0, Math.min(1, (tau - W) / H)), hum = Math.sin(Math.PI * u);
      return [o[0] + 0.05 * hum, o[1] + 0.02 * hum, o[2] + 0.015 * hum];
    }
    if (k < 1) return o;
    var segs = getSched(side, k).segs, idx = findSeg(segs, tau);
    if (idx < 0) return o;
    var ax = [0, 0, 0];
    for (var i = idx; i >= Math.max(0, idx - 2); i--) {
      var sg = segs[i], dx = sg.to.x - sg.from.x, dy = sg.to.y - sg.from.y, dd = Math.hypot(dx, dy) || 1;
      var w = [Math.abs(dx) / dd, Math.abs(dy) / dd, 0], mvEnd = sg.t0 + sg.mv, tm = sg.t0 + sg.mv / 2;
      if (tau >= sg.t0 && tau < mvEnd) for (var a = 0; a < 3; a++) ax[a] += A_ACC * w[a];                        // rigid-body acceleration
      var ev = [[sg.t0, 1], [tm, 2], [mvEnd, 1]];                                                               // acceleration steps: |delta a| / a
      ev.forEach(function (q) { if (tau >= q[0]) { var r = A_RING * q[1] * Math.exp(-(tau - q[0]) / TAU_STRUCT); for (var a2 = 0; a2 < 3; a2++) ax[a2] += r * w[a2]; } });
      if (tau >= sg.s0) ax[2] += Z_KICK * Math.exp(-(tau - sg.s0) / TAU_KICK);                                  // valve opens
      if (tau >= sg.s1) ax[2] += Z_KICK * Math.exp(-(tau - sg.s1) / TAU_KICK);                                  // valve closes
    }
    var tot = ax[0] + ax[1];
    return [o[0] + ax[0] + COUPLE * (ax[1] + ax[2]), o[1] + ax[1] + COUPLE * (ax[0] + ax[2]), o[2] + ax[2] + COUPLE * tot];
  }
module.exports = { P, W, H, STEPS, NCAR, HOME, ORD, getSched, findSeg, armState, pressureAt, tempAt, vibAt, carrierX, shotsDone, sn, cid };
