import React, { useEffect } from 'react';
import * as THREE from 'three';
import { initPortal } from './legacyPortal.js';
import DOM from './portalDom.js';
import { val, fmt } from './Live.jsx';

// Live numbers for the hover cards come from InfluxDB (through the store); geometry and interaction are the legacy Portal code.
const LIVE = {
  mddp: () => { const p = val('mddp_fast|L', 'p'); return ['Status: ' + (p === null ? 'no data' : 'running'), p === null ? 'no data' : 'L pressure ' + fmt(p, 1) + ' kPa']; },
  calul: () => { const c = val('calul_robot|', 'cycle', true); return ['Status: ' + (c === null ? 'no data' : 'running'), 'Cycle #' + (c === null ? '-' : fmt(c, 0)), 'Robot: KUKA KR 6 R900-2 HO']; },
  hall: () => { const t = val('hall_oven|', 'temp'), r = val('hall_oven|', 'rpm'), v = val('hall_oven|', 'conv'); return ['Status: ' + (t === null ? 'no data' : 'running'), 'Oven ' + fmt(t, 1) + ' °C (set 160)', 'Blower ' + fmt(r, 0) + ' rpm', 'Conveyor ' + fmt(v, 2) + ' mm/s']; }
};

export default function Portal({ go }) {
  useEffect(() => {
    window.__bg3c = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 0x1a2233 : 0xeef2f7);
    const subs = [], core = { scale: () => 1, getT: () => Date.now() / 1000, onRender: null };
    const W = { addEventListener: (t, f, o) => { window.addEventListener(t, f, o); subs.push([t, f, o]); } };
    const dispose = () => subs.forEach(([t, f, o]) => window.removeEventListener(t, f, o));
    const ptr = { x: 200, y: 200 }; W.addEventListener('pointerup', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, true);
    const stop = initPortal({ core, THREE, W, go: (m) => go(m, ptr.x, ptr.y), live: (k) => (LIVE[k] ? LIVE[k]() : ['Status: running']), dispose });
    const iv = setInterval(() => core.onRender && core.onRender(core.getT()), 250);
    return () => { clearInterval(iv); stop(); };
  }, []);
  return <div id="tab0" className="wrap panel" dangerouslySetInnerHTML={{ __html: DOM }} />;
}
