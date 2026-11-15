import React, { useEffect, useRef, useState } from 'react';
import { useTick, val, fmt } from './Live.jsx';
import { fit, css } from './canvasUtil.js';

// line layout from the legacy Portal (x0, x1 in reference-picture px); kinds only choose the drawing colour/height
const X0 = 190, XT = 1695;
const LINE = [
  { n: 'Loader', k: 'load', a: 190, b: 235 }, { n: 'MDDP', k: 'mddp', a: 235, b: 325 }, { n: 'HMA', k: 'hma', a: 325, b: 380 },
  { n: 'DTC', k: 'dtc', a: 380, b: 467 }, { n: 'DTC', k: 'dtc', a: 467, b: 553 }, { n: 'DTC', k: 'dtc', a: 553, b: 640 },
  { n: 'UVL', k: 'uvl', a: 640, b: 695 }, { n: 'HPC5L', k: 'hpc', a: 695, b: 765 }, { n: 'CPM 5L', k: 'hpc', a: 765, b: 835 },
  { n: 'MDDP', k: 'mddp', a: 835, b: 920 }, { n: 'MDDP', k: 'mddp', a: 920, b: 1005 }, { n: 'MDDP', k: 'mddp', a: 1005, b: 1090 },
  { n: 'UVL', k: 'uvl', a: 1090, b: 1135 }, { n: 'MDDP_184', k: 'mddp', a: 1135, b: 1210, tab: 'mddp' }, { n: 'HPC5L', k: 'hpc', a: 1210, b: 1285 },
  { n: 'CPM 5L', k: 'hpc', a: 1285, b: 1365 }, { n: 'HMA', k: 'hma', a: 1365, b: 1420 }, { n: 'CALUL_037', k: 'alul', a: 1420, b: 1530, tab: 'calul' },
  { n: 'HAll_013', k: 'ha', a: 1550, b: 1695, tab: 'hall' }
];
const COL = { load: '#94a3b8', mddp: '#4f63ad', hma: '#e8913a', dtc: '#6b8e5a', uvl: '#8b5cf6', hpc: '#2f8f9d', alul: '#ea580c', ha: '#b5651d' };
const HT = { load: 150, mddp: 172, hma: 150, dtc: 150, uvl: 150, hpc: 140, alul: 205, ha: 195 };
const STEPS = ['Flexure laser cut', 'Micro PZT', 'Oven / AFT / NDE', 'Load beam forming', 'ACL', 'Laser welding', 'Sag', 'Milli PZT attachment', 'Fracture de-tab / DSSA', 'Electrical test / APD / APCM', 'Packing / Store / Metrology'];
const INFO = {
  mddp: () => { const p = val('mddp_fast|L', 'p'); return p === null ? 'no data' : 'L pressure ' + fmt(p, 1) + ' kPa'; },
  calul: () => { const c = val('calul_robot|', 'cycle', true); return c === null ? 'no data' : 'cycle #' + fmt(c, 0); },
  hall: () => { const t = val('hall_oven|', 'temp'); return t === null ? 'no data' : 'oven ' + fmt(t, 1) + ' °C'; }
};

export default function Portal({ go }) {
  useTick(500);
  const ref = useRef(null), hov = useRef(-1), [tip, setTip] = useState(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return; cv.style.height = Math.round(cv.clientWidth * 0.2) + 'px';
      const { g, w, h } = fit(cv), s = w / (XT - X0 + 40), yb = h - 30;
      g.clearRect(0, 0, w, h); g.fillStyle = css('--muted'); g.fillRect(0, yb + 2, w, 3);
      LINE.forEach((m, i) => {
        const x = (m.a - X0) * s + 4, mw = (m.b - m.a) * s - 6, mh = HT[m.k] * s * 1.15, live = !!m.tab;
        g.fillStyle = COL[m.k]; g.globalAlpha = live ? 1 : 0.55; g.fillRect(x, yb - mh, mw, mh);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 4, yb - mh + 6, mw - 8, mh * 0.35); g.globalAlpha = 1;
        if (live) { g.strokeStyle = '#22c55e'; g.lineWidth = hov.current === i ? 4 : 3; g.strokeRect(x - 2, yb - mh - 2, mw + 4, mh + 4); }
        g.fillStyle = css('--text'); g.font = `${live ? 'bold ' : ''}12px "Segoe UI"`; g.textAlign = 'center'; g.fillText(m.n, x + mw / 2, yb + 18);
      });
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  const hit = (e) => { const r = ref.current.getBoundingClientRect(), s = r.width / (XT - X0 + 40), px = (e.clientX - r.left) / s + X0; return LINE.findIndex((m) => px >= m.a && px < m.b); };
  return (<div>
    <h1>Portal — Kagra · HVM_1010 Line A2202</h1>
    <div className="card"><div style={{ fontWeight: 700, marginBottom: 6 }}>Step 8 · Milli PZT attachment — green frame = connected machine (click to open)</div>
      <div style={{ position: 'relative' }}>
        <canvas ref={ref} style={{ cursor: 'default' }}
          onMouseMove={(e) => { const i = hit(e); hov.current = i; ref.current.style.cursor = i >= 0 && LINE[i].tab ? 'pointer' : 'default'; setTip(i >= 0 ? { i, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY } : null); }}
          onMouseLeave={() => { hov.current = -1; setTip(null); }}
          onClick={(e) => { const i = hit(e); if (i >= 0 && LINE[i].tab) go(LINE[i].tab); }} />
        {tip && <div className="mach" style={{ position: 'absolute', left: tip.x + 12, top: tip.y + 12, pointerEvents: 'none', textAlign: 'left', color: 'var(--text)' }}><b>{LINE[tip.i].n}</b><small>{LINE[tip.i].tab ? INFO[LINE[tip.i].tab]() + ' — click to open' : 'Not connected — no data'}</small></div>}
      </div></div>
    <div className="card"><div style={{ fontWeight: 700, marginBottom: 6 }}>Kagra overall process</div>
      <div className="portal">{STEPS.map((n, i) => <div key={n} className={'mach' + (i === 7 ? ' live' : '')} style={{ minWidth: 120 }}>{i + 1}. {n}<small>{i === 7 ? 'this line (above)' : 'Not connected'}</small></div>)}</div></div>
  </div>);
}
