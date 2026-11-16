'use strict';
// Entry point used by the Node-RED function nodes (global context `sim`).
// Every machine has its own sim clock (stored in the flow context of its tab) that restarts after HORIZON_S,
// because the extracted legacy models precompute a finite schedule. Every signal flow of that machine reads the
// same clock, so all its measurements stay aligned.
const gens = { MDDP_184: require('./gen_mddp.js'), CALUL_037: require('./gen_calul.js'), HAll_013: require('./gen_hall.js') };
const HORIZON_S = 3 * 3600;
const DELAY_MS = 50;

function clockOf(store, now) {
  const to = now - DELAY_MS;
  let c = store.get('clock');
  if (!c) c = { base: now };
  else if (to - c.base > HORIZON_S * 1000) c = { base: to };
  store.set('clock', c);
  return c;
}

/**
 * One signal flow tick: returns the line protocol of every sample of `machine`/`signal` since its previous tick.
 * nodeCtx = the function node's own context (keeps `last`), flowCtx = the flow (tab) context (holds the clock).
 */
function signal(machine, name, nodeCtx, flowCtx, now) {
  const to = now - DELAY_MS;
  const c = clockOf(flowCtx, now);
  let st = nodeCtx.get('state');
  if (!st || st.base !== c.base) { st = { base: c.base, last: c.base }; nodeCtx.set('state', st); }
  if (to <= st.last) return '';
  const lines = gens[machine].signals[name](st.base, st.last, to);
  st.last = to;
  return lines;
}

/** All machines in one go (kept for tools/mock-backend.mjs). */
function tick(state, now) {
  const to = now - DELAY_MS;
  if (!state.base) { state.base = now; state.last = now; }
  if (to - state.base > HORIZON_S * 1000) { state.base = to; state.last = to; }
  if (to <= state.last) return '';
  const lines = Object.values(gens).map((g) => g.gen(state.base, state.last, to)).filter(Boolean);
  state.last = to;
  return lines.join('\n');
}

const SIGNALS = Object.fromEntries(Object.entries(gens).map(([m, g]) => [m, Object.keys(g.signals)]));
module.exports = { tick, signal, SIGNALS };
