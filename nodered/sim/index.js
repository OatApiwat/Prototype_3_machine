'use strict';
// One entry point for the Node-RED function node. Each machine has its own sim clock (base) and is restarted
// after HORIZON_S, because the extracted legacy models precompute a finite schedule.
const gens = { MDDP_184: require('./gen_mddp.js'), CALUL_037: require('./gen_calul.js'), HAll_013: require('./gen_hall.js') };
const HORIZON_S = 3 * 3600;
function tick(state, now) {
  const to = now - 50;
  if (!state.base) { state.base = now; state.last = now; }
  if (to - state.base > HORIZON_S * 1000) { state.base = to; state.last = to; }
  if (to <= state.last) return '';
  const lines = Object.values(gens).map((g) => g.gen(state.base, state.last, to)).filter(Boolean);
  state.last = to;
  return lines.join('\n');
}
module.exports = { tick };
