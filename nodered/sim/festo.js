'use strict';
// FESTO gantry model (legacy Tab 2).
var CF = 6, FPN = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'], FP = [[100, 0, 200], [300, 0, 200], [300, 150, 60], [300, 150, 200], [100, 150, 200], [100, 0, 60]];   // own frame, mm
var FT = { T0: [26, 27, 28], TS: [38, 42, 47], TAU: 1500, LOAD: [2.2, 2.8, 3.6], EPS: [0.012, 0.018, 0.015], BETA: [0.0016, 0.0019, 0.0024], TREF: 30, PRE: 7200, VSC: [60, 60, 70] };
function axSpeed(k) { var s = 0; for (var i = 0; i < FP.length; i++) s += Math.abs(FP[(i + 1) % FP.length][k] - FP[i][k]); return s / CF; }   // mean axis speed, mm/s
function festoT(k, t) { var th = 1 - Math.exp(-(t + FT.PRE) / FT.TAU); return FT.T0[k] + (FT.TS[k] - FT.T0[k]) * th + FT.LOAD[k] * Math.min(1.5, axSpeed(k) / FT.VSC[k]) + 0.7 * Math.sin(2 * Math.PI * t / 95 + 1.3 * k) + 0.25 * Math.sin(2 * Math.PI * t / CF + k); }
function fArr(c, i) { return c * CF + i * CF / FP.length + 0.3; }   // time at which Festo has settled at point i in cycle c
function fLast(i, t) { return Math.floor((t - 0.3 - i * CF / FP.length) / CF); }   // latest completed cycle for point i (-1 = none yet)
function festoE(k, c, i) {   // backlash (sign of the move into the point) + thermal growth + small cycle-to-cycle term; deterministic
  var prev = (i + FP.length - 1) % FP.length, dir = Math.sign(FP[i][k] - FP[prev][k]);
  return FT.EPS[k] * dir + FT.BETA[k] * (festoT(k, fArr(c, i)) - FT.TREF) + 0.004 * Math.sin(0.9 * c + 2.1 * i + 1.7 * k);
}
module.exports = { festoT, festoE, fArr, FP, CF, FPN, axSpeed };
