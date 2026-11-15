'use strict';
// Deterministic CALUL_037 (KUKA KR 6 R900-2 HO) model, extracted from the legacy HTML (Tab 2).
  // ===== KUKA KR 6 R900-2 HO kinematics (approximate link data, 6-axis articulated robot, 900 mm reach) =====
  var D2R = Math.PI / 180;
  var A1 = 25, D1 = 400, A2 = 455, A3 = 35, D4 = 420, D6 = 80, LT = 80, TCPX = D6 + LT;   // mm
  var QLO = [-170, -100, -150, -185, -120, -350].map(function (d) { return d * D2R; });
  var QHI = [170, 135, 150, 185, 120, 350].map(function (d) { return d * D2R; });
  function mulR(a, b) { var r = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; }
  function mulV(a, v) { return [a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]]; }
  function TM(A, B) { var p = mulV(A.R, B.p); return { R: mulR(A.R, B.R), p: [p[0] + A.p[0], p[1] + A.p[1], p[2] + A.p[2]] }; }
  function rx(a) { var c = Math.cos(a), s = Math.sin(a); return { R: [1, 0, 0, 0, c, -s, 0, s, c], p: [0, 0, 0] }; }
  function ry(a) { var c = Math.cos(a), s = Math.sin(a); return { R: [c, 0, s, 0, 1, 0, -s, 0, c], p: [0, 0, 0] }; }
  function rz(a) { var c = Math.cos(a), s = Math.sin(a); return { R: [c, -s, 0, s, c, 0, 0, 0, 1], p: [0, 0, 0] }; }
  function tr(x, y, z) { return { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], p: [x, y, z] }; }
  // returns the TCP pose and the shoulder / elbow / wrist-centre points
  function fkAll(q) {
    var T = TM(rz(q[0]), tr(A1, 0, D1)); var S = T.p.slice();
    T = TM(TM(T, ry(q[1])), tr(0, 0, A2)); var E = T.p.slice();
    T = TM(TM(T, ry(q[2])), tr(D4, 0, A3)); var Wc = T.p.slice();
    T = TM(TM(TM(T, rx(q[3])), ry(q[4])), rx(q[5]));
    var F = T;                                  // flange frame (J6 origin = wrist centre)
    T = TM(T, tr(TCPX, 0, 0));
    return { T: T, S: S, E: E, W: Wc, F: F };
  }
  function fk(q) { return fkAll(q).T; }
  function poseTarget(p, yawDeg) {   // tool axis (x) points straight down, rotation about it = yaw
    var c = Math.cos(yawDeg * D2R), s = Math.sin(yawDeg * D2R);
    return { R: [0, c, s, 0, s, -c, -1, 0, 0], p: p };
  }
  var RW = 150;
  function poseErr(T, Tt) {   // position error (mm) and rotation-vector error (log map of Rt * Rc^T) scaled by RW mm/rad
    var e = [Tt.p[0] - T.p[0], Tt.p[1] - T.p[1], Tt.p[2] - T.p[2], 0, 0, 0], Rc = T.R, Rt = Tt.R;
    var RcT = [Rc[0], Rc[3], Rc[6], Rc[1], Rc[4], Rc[7], Rc[2], Rc[5], Rc[8]], R = mulR(Rt, RcT);
    var c = Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2)), th = Math.acos(c), f = th < 1e-7 ? 0.5 : th / (2 * Math.sin(th));
    e[3] = RW * f * (R[7] - R[5]); e[4] = RW * f * (R[2] - R[6]); e[5] = RW * f * (R[3] - R[1]);
    return e;
  }
  function solve6(A, b) {
    var n = 6, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var i = 0; i < n; i++) {
      var piv = i; for (var r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      for (var r2 = i + 1; r2 < n; r2++) { var f = M[r2][i] / M[i][i]; for (var c = i; c <= n; c++) M[r2][c] -= f * M[i][c]; }
    }
    var x = new Array(n);
    for (var i2 = n - 1; i2 >= 0; i2--) { var s = M[i2][n]; for (var c2 = i2 + 1; c2 < n; c2++) s -= M[i2][c2] * x[c2]; x[i2] = s / M[i2][i2]; }
    return x;
  }
  function ik(Tt, q0) {     // damped least squares on the full 6-D pose, joint limits clamped
    var q = q0.slice(), err = 1e9;
    for (var it = 0; it < 300; it++) {
      var e = poseErr(fk(q), Tt); err = Math.hypot.apply(null, e);
      if (err < 1e-6) break;
      var J = [[], [], [], [], [], []];
      for (var j = 0; j < 6; j++) {
        var q2 = q.slice(); q2[j] += 1e-6; var e2 = poseErr(fk(q2), Tt);
        for (var r = 0; r < 6; r++) J[r][j] = (e[r] - e2[r]) / 1e-6;
      }
      var A = [[], [], [], [], [], []], bb = [0, 0, 0, 0, 0, 0];
      for (var i = 0; i < 6; i++) for (var j2 = 0; j2 < 6; j2++) {
        var s = 0; for (var r2 = 0; r2 < 6; r2++) s += J[r2][i] * J[r2][j2];
        A[i][j2] = s + (i === j2 ? 0.05 : 0);
      }
      for (var i3 = 0; i3 < 6; i3++) { var s2 = 0; for (var r3 = 0; r3 < 6; r3++) s2 += J[r3][i3] * e[r3]; bb[i3] = s2; }
      var dq = solve6(A, bb), mx = 0; dq.forEach(function (d) { mx = Math.max(mx, Math.abs(d)); });
      var sc = mx > 0.25 ? 0.25 / mx : 1;
      for (var k = 0; k < 6; k++) q[k] = Math.max(QLO[k], Math.min(QHI[k], q[k] + dq[k] * sc));
    }
    return { q: q, err: err };
  }
  // ===== fixed pick-and-place plan: the same 10 taught points every cycle (nothing random) =====
  var DT = 0.01, CT = 5, NS = 500, HOME_ARR = 5, B0 = 1e9;   // cycle time / sample count are set by plan() below; B0 = Carriers waiting in the buffer: unlimited, so CALUL never waits
  var T_PICK = 1, T_RELF = 2, T_RELB = 3, SETTLE_MEAS = 0.30;
  var TOL = 0.10, PAD_R = 120, PLATE_L = 180, PLATE_W = 50, PLATE_T = 10;
  var WPS = [
    { n: 'Home',                    p: [400, 0, 420],     yaw: 0,  a: 0, l: 0 },
    { n: 'Above buffer',            p: [150, -400, 300],  yaw: 0,  a: 0, l: 0,  seg: 'PTP' },
    { n: 'Pick Front + Back',       p: [150, -400, 95],   yaw: 0,  a: 0, l: 0,  seg: 'LIN' },
    { n: 'Lift (loaded)',           p: [150, -400, 340],  yaw: 0,  a: 0, l: 0,  seg: 'LIN' },
    { n: 'Transfer via-point',      p: [480, 60, 420],    yaw: 45, a: 0, l: 0,  seg: 'PTP' },
    { n: 'Above tray',              p: [520, 380, 300],   yaw: 0, a: 0, l: 0, seg: 'PTP' },
    { n: 'Place Front (to HAll)',  p: [520, 380, 95],    yaw: 0, a: 0, l: 0, seg: 'LIN' },
    { n: 'Place Back (to HAll)',   p: [400, 380, 95],    yaw: 90, a: 0, l: 0, seg: 'LIN', arch: 70 },
    { n: 'Lift (empty)',            p: [400, 380, 330],   yaw: 90, a: 0, l: 0, seg: 'LIN' },
    { n: 'Return via-point',        p: [430, -80, 420],   yaw: 20, a: 0, l: 0, seg: 'PTP' }
  ];
  var NW = WPS.length;
  function minjerk(u) { u = Math.max(0, Math.min(1, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }
  var MASS = { upper: 6.0, fore: 4.5, wrist: 3.0, tool: 1.2, carrier: 0.9 };
  // every move runs at the robot's maximum axis speeds (KR 6 R900-2 data sheet: A1 360, A2 300, A3 360, A4 381, A5 388, A6 615 deg/s);
  // the move time of each segment is solved so that the fastest axis just reaches its limit (min-jerk profile, peak = 1.875 x mean speed)
  // HA tray: 12 rows in one line (60 mm pitch along y), one Carrier per row, all lying the same way (long side along x).
  // Pair n (rows 2n, 2n+1) is placed in cycle n (n = cycle index mod 6); when all 12 rows are full they move on together.
  var NPAIR = 6, XC = 540, ROW_Y0 = -330, ROW_P = 60, VP = [];
  function rowY(k) { return ROW_Y0 + ROW_P * k; }
  function setVariant(n) { var yF = rowY(2 * n), yB = rowY(2 * n + 1); WPS[5].p = [XC - PAD_R, yF, 300]; WPS[6].p = [XC - PAD_R, yF, 95]; WPS[7].p = [XC + PAD_R, yB, 95]; WPS[8].p = [XC + PAD_R, yB, 330]; }
  var VMAX = [360, 300, 360, 381, 388, 615].map(function (d) { return d * D2R; });
  var DWELL = [0.05, 0.02, 0.35, 0.02, 0.02, 0.02, 0.30, 0.30, 0.02, 0.02];   // time standing at each point (pick / place need a short hold)
  function plan(D) {
    var t = 0, i; WPS[0].a = 0; WPS[0].l = DWELL[0];
    for (i = 1; i < NW; i++) { WPS[i].a = WPS[i - 1].l + D[i]; WPS[i].l = WPS[i].a + DWELL[i]; }
    HOME_ARR = WPS[NW - 1].l + D[NW]; CT = HOME_ARR; NS = Math.round(CT / DT);
    T_PICK = WPS[2].a + 0.10; T_RELF = WPS[6].a + 0.12; T_RELB = WPS[7].a + 0.12;
  }
  function makeTraj(nv, Din) {
    setVariant(nv);
    // taught joint configurations (sequential IK, continuing from the previous point -> same elbow-up solution every time)
    var seeds = [[0, 40, 40, 0, 10, 0], [0, 30, 20, 0, 40, 0], [0, 50, 60, 0, -20, 0]].map(function (a) { return a.map(function (d) { return d * D2R; }); });
    var wq = [], i, best = null, worst = 0;
    seeds.forEach(function (s) { var r = ik(poseTarget(WPS[0].p, WPS[0].yaw), s); if (!best || r.err < best.err) best = r; });
    wq[0] = best.q; worst = best.err;
    for (i = 1; i < NW; i++) { var r2 = ik(poseTarget(WPS[i].p, WPS[i].yaw), wq[i - 1]); wq[i] = r2.q; worst = Math.max(worst, r2.err); }
    function sample() {
      var Q = [], TCP = [], SEG = [], qprev = wq[0], maxJump = 0;
      for (var k = 0; k <= NS; k++) {
        var tc = k * DT, q = null, i2, sg = -1, dw = -1;
        for (i2 = 0; i2 < NW; i2++) if (tc >= WPS[i2].a - 1e-9 && tc < WPS[i2].l - 1e-9) { dw = i2; break; }
        if (tc >= HOME_ARR - 1e-9) q = wq[0];
        else if (dw >= 0) q = wq[dw];
        else {
          var nxt = -1; for (i2 = 1; i2 < NW; i2++) if (tc < WPS[i2].a) { nxt = i2; break; }
          var wTo = nxt < 0 ? 0 : nxt, from = (nxt < 0 ? NW : nxt) - 1, tA = WPS[from].l, tB = nxt < 0 ? HOME_ARR : WPS[nxt].a;
          var u = (tc - tA) / (tB - tA), s = minjerk(u), seg = nxt < 0 ? 'PTP' : WPS[nxt].seg; sg = nxt < 0 ? NW : nxt;
          if (seg === 'LIN') {
            var p0 = WPS[from].p, p1 = WPS[wTo].p, pp = [p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * s, p0[2] + (p1[2] - p0[2]) * s + (WPS[wTo].arch || 0) * Math.sin(Math.PI * s)];
            var yw = WPS[from].yaw + (WPS[wTo].yaw - WPS[from].yaw) * s;
            q = ik(poseTarget(pp, yw), qprev).q;
          } else {
            var a0 = wq[from], a1 = wq[wTo]; q = a0.map(function (v, j) { return v + (a1[j] - v) * s; });
          }
        }
        if (k) for (var j = 0; j < 6; j++) maxJump = Math.max(maxJump, Math.abs(q[j] - qprev[j]));
        qprev = q; Q.push(q); TCP.push(fk(q).p); SEG.push(sg);
      }
      return { Q: Q, TCP: TCP, SEG: SEG, maxJump: maxJump };
    }
    var D = [0], res, ratio = [];
    for (i = 1; i <= NW; i++) { var to = wq[i % NW], fr = wq[i - 1], dm = 0; for (var j2 = 0; j2 < 6; j2++) dm = Math.max(dm, Math.abs(to[j2] - fr[j2]) / VMAX[j2]); D[i] = Math.max(0.12, 1.875 * dm * 1.1); }
    if (Din) D = Din.slice();
    for (var pass = 0; pass < (Din ? 1 : 6); pass++) {
      plan(D); res = sample();
      ratio = []; for (i = 0; i <= NW; i++) ratio.push(0);
      for (var k2 = 1; k2 <= NS; k2++) if (res.SEG[k2] > 0) for (var j3 = 0; j3 < 6; j3++) ratio[res.SEG[k2]] = Math.max(ratio[res.SEG[k2]], Math.abs(res.Q[k2][j3] - res.Q[k2 - 1][j3]) / DT / VMAX[j3]);
      if (Din || pass === 5) break;
      for (i = 1; i <= NW; i++) D[i] = Math.max(0.1, D[i] * (ratio[i] || 1));
    }
    var peak = 0; ratio.forEach(function (r) { peak = Math.max(peak, r); });
    return { wq: wq, Q: res.Q, TCP: res.TCP, ikWorst: worst, maxJump: res.maxJump, D: D, peakRatio: peak };
  }
  var TV = [], DMAX = null;
  for (var vn = 0; vn < NPAIR; vn++) { var r0 = makeTraj(vn, null); DMAX = DMAX ? DMAX.map(function (d, k) { return Math.max(d, r0.D[k]); }) : r0.D.slice(); }
  for (vn = 0; vn < NPAIR; vn++) { TV.push(makeTraj(vn, DMAX)); VP.push(WPS.map(function (w) { return w.p.slice(); })); }   // all variants share one timing (the slowest), CT is the same for every cycle
  var TRAJ = TV[0];
  function vOf(c) { return (c < 0 ? 0 : c) % NPAIR; }
  function lerpQ(tc, nv) {   // joint angles at cycle phase tc (0..CT)
    var f = Math.max(0, Math.min(NS - 1e-9, tc / DT)), k = Math.floor(f), u = f - k, a = TV[nv || 0].Q[k], b = TV[nv || 0].Q[k + 1];
    return a.map(function (v, j) { return v + (b[j] - v) * u; });
  }
  function lerpP(tc, nv) {
    var f = Math.max(0, Math.min(NS - 1e-9, tc / DT)), k = Math.floor(f), u = f - k, a = TV[nv || 0].TCP[k], b = TV[nv || 0].TCP[k + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  // cycles run back-to-back; a cycle only waits at Home when fewer than 2 Carriers are in the buffer
  var STARTS = [];
  function availT(c) { var need = 2 * (c + 1) - B0; return need <= 0 ? 0 : (need + 1) * 10; }   // time when Carrier pair c is in the buffer (Carrier k is ready at (k+1)*10 s)
  function startOf(c) { while (STARTS.length <= c) { var n = STARTS.length; STARTS.push(Math.max(n ? STARTS[n - 1] + CT : 0, availT(n) - T_PICK + 0.4)); } return STARTS[c]; }
  function cycleIdx(t) { if (t < 0) return -1; var lo = 0, hi = 1; while (startOf(hi) <= t) hi *= 2; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (startOf(mid) <= t) lo = mid; else hi = mid; } return lo; }
  function phaseOf(t) { var c = cycleIdx(t); return { c: c, tc: c < 0 ? 0 : t - startOf(c) }; }
  function targetIdx(tc) { for (var i = 0; i < NW; i++) if (tc < WPS[i].l) return i; return 0; }   // waypoint the robot is heading to / standing at

  // ---- joint temperature J1..J6 (deg C): first-order thermal model driven by the motor load of the fixed cycle ----
  //  load = gravity torque on J2/J3/J5 (carriers add mass while held) and acceleration + speed on J1/J4/J6, from the trajectory itself
  var TSS = [38, 52, 47, 36, 43, 34], TAU_S = [220, 260, 240, 200, 210, 190], TAU_F = 5, GF = [5, 7, 6, 3.5, 4.5, 3], T_AMB = 25;
  var TEMP = (function () {
    var Q = TRAJ.Q, n = NS, om = [], al = [], load = [[], [], [], [], [], []], j, k;
    for (k = 0; k <= n; k++) {
      var qa = Q[Math.max(0, k - 1)], qb = Q[Math.min(n, k + 1)], qc = Q[k], o = [], a = [];
      for (j = 0; j < 6; j++) { o.push((qb[j] - qa[j]) / (2 * DT)); a.push((qb[j] - 2 * qc[j] + qa[j]) / (DT * DT)); }
      om.push(o); al.push(a);
    }
    var raw = [[], [], [], [], [], []], mx = [1e-9, 1e-9, 1e-9, 1e-9, 1e-9, 1e-9];
    // smooth the accelerations a little (finite difference of the sampled trajectory)
    for (k = 0; k <= n; k++) {
      var tc = k * DT, held = (tc >= T_PICK ? 1 : 0) * (tc < T_RELF ? 1 : 0) + (tc >= T_PICK ? 1 : 0) * (tc < T_RELB ? 1 : 0);
      var m4 = MASS.tool + held * MASS.carrier, F = fkAll(Q[k]), er = [Math.cos(Q[k][0]), Math.sin(Q[k][0])];
      var rr = function (p, o) { return (p[0] - o[0]) * er[0] + (p[1] - o[1]) * er[1]; };
      var Cu = [(F.S[0] + F.E[0]) / 2, (F.S[1] + F.E[1]) / 2], Cf = [(F.E[0] + F.W[0]) / 2, (F.E[1] + F.W[1]) / 2], tcp = TRAJ.TCP[k];
      var t2 = Math.abs(MASS.upper * rr(Cu, F.S) + MASS.fore * rr(Cf, F.S) + MASS.wrist * rr(F.W, F.S) + m4 * rr(tcp, F.S));
      var t3 = Math.abs(MASS.fore * rr(Cf, F.E) + MASS.wrist * rr(F.W, F.E) + m4 * rr(tcp, F.E));
      var t5 = Math.abs(m4 * rr(tcp, F.W)) + 6;
      var g = [Math.abs(al[k][0]) / 3 + 0.25 * Math.abs(om[k][0]) / 1.2, t2, t3, Math.abs(al[k][3]) / 8 + 0.3 * Math.abs(om[k][3]), t5, Math.abs(al[k][5]) / 8 + 0.3 * Math.abs(om[k][5])];
      for (j = 0; j < 6; j++) { raw[j].push(g[j]); mx[j] = Math.max(mx[j], g[j]); }
    }
    var P = [], mean = [0, 0, 0, 0, 0, 0];
    for (j = 0; j < 6; j++) {
      P.push(raw[j].map(function (v) { return 0.25 + 0.75 * Math.pow(v / mx[j], 2); }));
      P[j].forEach(function (v) { mean[j] += v / (n + 1); });
    }
    // periodic steady state of: slow stage (tau 190..260 s) + fast winding stage (tau 5 s)
    var out = [];
    for (j = 0; j < 6; j++) {
      var K = (TSS[j] - T_AMB) / mean[j], xs = T_AMB, xf = 0, ax = 1 - Math.exp(-DT / TAU_S[j]), af = 1 - Math.exp(-DT / TAU_F), arr = new Array(n + 1);
      for (var cyc = 0; cyc < 420; cyc++) for (k = 0; k < n; k++) { xs += (T_AMB + K * P[j][k] - xs) * ax; xf += (GF[j] * (P[j][k] - mean[j]) - xf) * af; arr[k] = xs + xf; }
      arr[n] = arr[0]; out.push(arr);
    }
    return { T: out, P: P };
  })();
  function jointTemp(j, t) {
    var ph = phaseOf(t), f = Math.min(NS, ph.tc / DT), k = Math.min(NS - 1, Math.floor(f)), u = f - k, a = TEMP.T[j];
    return a[k] + (a[k + 1] - a[k]) * u + 0.6 * Math.sin(2 * Math.PI * t / 150 - 0.6 * j);   // + cell-air ambient swing (150 s period)
  }
  function tempsAt(t) { return [0, 1, 2, 3, 4, 5].map(function (j) { return jointTemp(j, t); }); }
  function tavgAt(t) { var s = 0; for (var j = 0; j < 6; j++) s += jointTemp(j, t); return s / 6; }

  // ---- positioning error at each arrival: gear backlash (direction of approach x Jacobian) + thermal growth of the arm ----
  var EPS = [5.5e-5, 5.5e-5, 6.5e-5, 8e-5, 8e-5, 8e-5], BETA = 8.0e-6, T_REF = 36;   // rad lost per joint, 1/degC, deg C
  function hystFor(TJ) {
    var out = [];
    for (var i = 0; i < NW; i++) {
      var q = TJ.wq[i], qp = TJ.wq[(i + NW - 1) % NW], p0 = fk(q).p, e = [0, 0, 0];
      for (var j = 0; j < 6; j++) {
        var q2 = q.slice(); q2[j] += 1e-6; var p1 = fk(q2).p, sg = Math.sign(q[j] - qp[j]);
        for (var a = 0; a < 3; a++) e[a] += EPS[j] * sg * (p1[a] - p0[a]) / 1e-6;
      }
      out.push(e);
    }
    return out;
  }
  var HYSTV = TV.map(hystFor);
  function measDelay(i) { return Math.min(SETTLE_MEAS, (WPS[i].l - WPS[i].a) / 2); }   // measured after settling, but inside the stop at short via-points
  // orientation (KUKA A, B, C = rotation about Z, Y, X; tool pointing down: A = yaw, B = 0, C = 180 deg). Same backlash + thermal model, rotational part
  var EPSR = [3.5e-4, 3.5e-4, 4e-4, 5e-4, 5e-4, 5e-4], BETA_A = 0.0025;   // rad lost per joint on reversal, deg per deg C
  function hystaFor(TJ) {
    var out = [];
    for (var i = 0; i < NW; i++) {
      var q = TJ.wq[i], qp = TJ.wq[(i + NW - 1) % NW], R1 = fk(q).R, R1T = [R1[0], R1[3], R1[6], R1[1], R1[4], R1[7], R1[2], R1[5], R1[8]], e = [0, 0, 0];
      for (var j = 0; j < 6; j++) {
        var q2 = q.slice(); q2[j] += 1e-6; var dR = mulR(fk(q2).R, R1T), sg = Math.sign(q[j] - qp[j]);
        e[0] += EPSR[j] * sg * (dR[7] - dR[5]) / 2e-6; e[1] += EPSR[j] * sg * (dR[2] - dR[6]) / 2e-6; e[2] += EPSR[j] * sg * (dR[3] - dR[1]) / 2e-6;
      }
      out.push(e);
    }
    return out;
  }
  var HYSTAV = TV.map(hystaFor);
  function arrTime(c, i) { return startOf(c) + WPS[i].a + measDelay(i); }
  function lastMeas(i, t) { var c = cycleIdx(t); while (c >= 0 && arrTime(c, i) > t) c--; return c; }   // latest cycle in which point i has been measured by time t
  function errVec(c, i) {            // mm: measured - taught, at the end of the settling time of point i in cycle c
    var te = arrTime(c, i), d = BETA * (tavgAt(te) - T_REF), p = VP[vOf(c)][i], h = HYSTV[vOf(c)][i];
    return [h[0] + d * p[0], h[1] + d * p[1], h[2] + d * p[2] * 0.4];
  }
  function taughtABC(i) { return [WPS[i].yaw, 0, 180]; }
  function angErr(c, i) {            // deg: [dA, dB, dC] measured - taught at the end of the settling time of point i in cycle c
    var d = tavgAt(arrTime(c, i)) - T_REF, h = HYSTAV[vOf(c)][i], ps = WPS[i].yaw * D2R, cs = Math.cos(ps), sn = Math.sin(ps), k = BETA_A * d * D2R;
    var wx = h[0] + 0.6 * k, wy = h[1] + 0.4 * k, wz = h[2] + 0.8 * k;
    return [wz / D2R, (-wx * sn + wy * cs) / D2R, (wx * cs + wy * sn) / D2R];
  }
  function blendErr(t, fn) {                // error vector applied to the TCP at time t (blends between the arrivals)
    var ph = phaseOf(t); if (ph.c < 0) return fn(0, 0);
    var tc = ph.tc, c = ph.c, i, a, b, u;
    for (i = 0; i < NW; i++) if (tc >= WPS[i].a && tc < WPS[i].l) return fn(c, i);       // standing at point i
    if (tc >= HOME_ARR) return fn(c + 1, 0);                                              // back at Home, waiting for the next Carriers
    if (tc >= WPS[NW - 1].l) { u = minjerk((tc - WPS[NW - 1].l) / (HOME_ARR - WPS[NW - 1].l)); a = fn(c, NW - 1); b = fn(c + 1, 0); }
    else { for (i = 1; i < NW; i++) if (tc < WPS[i].a) break; u = minjerk((tc - WPS[i - 1].l) / (WPS[i].a - WPS[i - 1].l)); a = fn(c, i - 1); b = fn(c, i); }
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  function errAt(t) { return blendErr(t, errVec); }
  function angErrAt(t) { return blendErr(t, angErr); }
  function abcOf(R) {                // KUKA A, B, C (deg) of the tool frame (z = tool axis out of the flange, x = our y axis)
    var A = Math.atan2(R[4], R[1]) / D2R, B = Math.atan2(-R[7], Math.hypot(R[1], R[4])) / D2R, C = Math.atan2(R[8], R[6]) / D2R;
    return [A, B, C < 0 ? C + 360 : C];
  }
  function abcAt(t) { var ph = phaseOf(t), abc = abcOf(fk(lerpQ(ph.tc, vOf(ph.c))).R), e = angErrAt(t); return [abc[0] + e[0], abc[1] + e[1], abc[2] + e[2]]; }
  function targetABCAt(t) { return taughtABC(targetIdx(phaseOf(t).tc)); }
  function posAt(t) {                // actual TCP position (mm) including the arrival error
    var ph = phaseOf(t), p = lerpP(ph.tc, vOf(ph.c)), e = errAt(t); return [p[0] + e[0], p[1] + e[1], p[2] + e[2]];
  }
  function targetAt(t) { var ph = phaseOf(t); return VP[vOf(ph.c)][targetIdx(ph.tc)]; }
  function arrivalsIn(w0, w1) {      // measured arrivals (time, point, error vector) inside [w0, w1]
    var out = [], c0 = Math.max(0, cycleIdx(w0) - 1), c1 = Math.max(0, cycleIdx(w1) + 1);
    for (var c = c0; c <= c1; c++) for (var i = 0; i < NW; i++) { var te = arrTime(c, i); if (te >= w0 && te <= w1) out.push({ t: te, i: i, c: c, e: errVec(c, i), a: angErr(c, i) }); }
    return out;
  }

  // ---- pickup vacuum (kPa, gauge, negative = suction). Front and Back pad measured separately ----
  var V0 = [100.4, 99.6], ACC_N = (function () {
    var mx = 1e-9, a = [], k;
    for (k = 0; k <= NS; k++) {
      var pa = TRAJ.TCP[Math.max(0, k - 1)], pb = TRAJ.TCP[Math.min(NS, k + 1)], pc = TRAJ.TCP[k];
      a.push(Math.hypot(pb[0] - 2 * pc[0] + pa[0], pb[1] - 2 * pc[1] + pa[1], pb[2] - 2 * pc[2] + pa[2]) / (DT * DT)); mx = Math.max(mx, a[k]);
    }
    return a.map(function (v) { return v / mx; });
  })();
  function vacHeld(side, tc, t) {    // while a carrier hangs on the pad: pump pulsation + small leak increase with acceleration
    var f = Math.min(NS - 1, Math.floor(tc / DT)), acc = ACC_N[f] + (ACC_N[f + 1] - ACC_N[f]) * (tc / DT - f);
    return -(V0[side] + 0.7 * Math.sin(2 * Math.PI * t / 3.7 + side * 1.3) - 1.6 * acc);
  }
  function vacAt(side, t) {
    var ph = phaseOf(t); if (ph.c < 0) return 0;
    var tc = ph.tc, on = T_PICK, off = side ? T_RELB : T_RELF;
    if (tc < on) return 0;
    if (tc < off) return vacHeld(side, tc, t) * (1 - Math.exp(-(tc - on) / 0.06));
    var d = tc - off, t0 = t - d;
    return vacHeld(side, off, t0) * Math.exp(-d / 0.07) + 3.0 * (d / 0.05) * Math.exp(1 - d / 0.05);   // decay + short blow-off puff
  }
  // ---- Carriers coming from MDDP_184 (Tab 1): Carrier k is ready (fully shifted out of the right station) at (k+1)*10 s ----
  function readyCount(t) { return B0 + Math.max(0, Math.floor(t / 10 + 1e-9) - 1); }   // Carriers in the buffer incl. the backlog, before any pick
  function pickedCycles(t) { return t - T_PICK < 0 ? 0 : cycleIdx(t - T_PICK) + 1; }
  function carrierId(k) { return ((k - 1) % 40) + 1; }
  function sentCount(t) {            // carriers released onto the conveyor to HA
    return (t - T_RELF < 0 ? 0 : cycleIdx(t - T_RELF) + 1) + (t - T_RELB < 0 ? 0 : cycleIdx(t - T_RELB) + 1);
  }
  // ===== 3D scene (three.js, units = mm, root frame is z-up like the robot controller) =====
module.exports = { NPAIR, T_RELF: () => T_RELF, T_RELB: () => T_RELB, minjerk, fk, fkAll, phaseOf, cycleIdx, startOf, vOf, posAt, abcAt, targetAt, tempsAt, vacAt, lerpQ, errAt, angErrAt, readyCount, pickedCycles, sentCount, carrierId, WPS, NW, CT, TV, VP, arrivalsIn };
