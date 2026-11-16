'use strict';
// Deterministic HAll_013 oven model (legacy Tab 3); tray ready times come from the CALUL_037 model.
const T2 = require('./calul.js');
var XS = 2650, XOV = 1900, V = 8, DWELL = 2 * XOV / V, SETPT = 160, TRAY_L = 230, NCAR = 12, ROW_P = 60;
// ---- tray ready times from CALUL (12 Carriers = 6 cycles per tray), found by bisection on the carriers released so far ----
var TRAYS = 200, READY = [];
(function () {
  for (var k = 0; k < TRAYS; k++) { var lo = 0, hi = 20000, need = NCAR * (k + 1); for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (T2.sentCount(mid) >= need) hi = mid; else lo = mid; } READY.push(hi + 1.5); }
})();
var PER = (READY[TRAYS - 1] - READY[0]) / (TRAYS - 1);
V = Math.round(10 * 480 / PER) / 10; DWELL = 2 * XOV / V;
// the oven is already running when the animation starts: trays that left CALUL before t = 0 keep the same rhythm, so the belt is full from the first second
var NPRE = Math.ceil((2 * XS + 2 * TRAY_L) / (V * PER)) + 1, PRE = [];
for (var pj = NPRE; pj >= 1; pj--) PRE.push(READY[0] - pj * PER);
for (var ex = READY.length; READY[READY.length - 1] < 3 * 86400; ex++) READY.push(READY[READY.length - 1] + PER);   // the line keeps running: trays go on for 3 days of sim time (was ~2 h, then the belt looked empty)
READY = PRE.concat(READY); TRAYS = READY.length;   // belt speed so that trays keep ~480 mm spacing
function xOf(k, t) { return XS - V * (t - READY[k]); }                       // tray centre
function tIn(k) { return READY[k] + (XS - XOV) / V; }                         // time the tray centre enters the oven
function tOut(k) { return tIn(k) + DWELL; }
function hsh(i, s) { var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function nz(t, f, s) { var u = t * f, i = Math.floor(u), a = u - i, w = a * a * (3 - 2 * a); return hsh(i, s) * (1 - w) + hsh(i + 1, s) * w; }   // smooth deterministic noise, -1..1
function dips(t) { var d = 0; for (var k = 0; k < TRAYS; k++) { var dt = t - tIn(k); if (dt >= 0 && dt < 150) d += 1.0 * (1 - Math.exp(-dt / 3)) * Math.exp(-dt / 12); else if (dt < 0) break; } return d; }   // cold tray entering: small dip, recovered by the controller in ~half a minute
function tempAt(t) { return SETPT - 0.2 + 0.7 * Math.sin(2 * Math.PI * t / 55) + 0.25 * nz(t, 0.5, 1) + 0.08 * nz(t, 3, 2) - dips(t); }   // on/off + PID ripple around the setting, sensor noise
function dutyAt(t) { var T = tempAt(t); return Math.max(10, Math.min(100, 45 + (SETPT - T) * 14 + 3 * nz(t, 0.3, 5))); }
function rpmAt(t) { return 1452 - 2 * dutyAt(t) / 100 + 1.2 * nz(t, 0.4, 6) + 0.5 * nz(t, 3, 7); }   // 4-pole motor on a 50 Hz drive: very steady
function vibAxis(a, t) { var b = [1.15, 0.82, 0.58][a]; return b * (1 + 0.035 * nz(t, 0.6, 10 + a) + 0.02 * nz(t, 3, 20 + a)) + t * [0.00002, 0.00001, 0.000006][a]; }   // RMS velocity per axis, noisy, very slow wear trend
function blowerTemp(t) { var s = 0; for (var j = 0; j < 6; j++) s += tempAt(t - j * 10); return 62.5 + 0.7 * (s / 6 - 159.5) + 1.5 * dutyAt(t) / 100 + 0.15 * nz(t, 0.2, 30) + t * 0.0002; }   // motor/bearing temperature follows the chamber with thermal inertia
function convAt(t) { return V * (1 + 0.0012 * nz(t, 0.5, 40) + 0.0006 * nz(t, 3, 41)); }   // servo-driven belt: +-0.1 %
function dwellActual(k) { return DWELL + 0.5 * hsh(k, 50) + 0.25 * hsh(k, 51); }   // measured curing time of tray k (s): follows the belt speed, a fraction of a second
module.exports = { tempAt, dutyAt, rpmAt, vibAxis, blowerTemp, convAt, dwellActual, xOf, tIn, tOut, READY, TRAYS, SETPT, XOV, XS, V, NCAR, DWELL };
