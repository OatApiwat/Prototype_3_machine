import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { nowRender, sample, keysWith, range } from './store.js';
import { css, fit } from './canvasUtil.js';

// layout constants of the 2D drawing (pixels only; no data values)
const LX = 10, RX = 800, COL_X0 = 62, PITCH_X = 34, ROW_Y0 = 20, PITCH_Y = 52, CELL_W = 30, CELL_H = 40, CAR_TOP = 56, RAIL = 34;
const ord = (side) => { const o = []; for (let r = 1; r <= 3; r++) for (let i = 0; i < 10; i++) o.push([r, side === 'L' ? 10 - i : 11 + i]); return o; };
const ORD = { L: ord('L'), R: ord('R') };

function Line2D() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return;
      cv.style.height = (cv.clientWidth * 290 / 1560) + 'px';
      const { g, w } = fit(cv); const s = w / 1560; g.setTransform(s * (window.devicePixelRatio || 1), 0, 0, s * (window.devicePixelRatio || 1), 0, 0);
      g.clearRect(0, 0, 1560, 290);
      const tr = nowRender();
      [[0, 'L', '--blue', 'LEFT'], [790, 'R', '--cyan', 'RIGHT']].forEach(([x0, , col, lab]) => {
        g.strokeStyle = css(col); g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeRect(x0 + 1, 40, 768, 232); g.setLineDash([]);
        g.fillStyle = css(col); g.fillRect(x0, 6, 770, 28); g.font = 'bold 15px "Segoe UI"'; g.textAlign = 'center'; g.fillText(lab, x0 + 385, 262);
      });
      let anyData = false;
      for (const key of keysWith('mddp_carrier|')) {
        const x = sample(key, 'x', tr); if (x === null) continue; anyData = true;
        const nL = sample(key, 'nL', tr, true) ?? 0, nR = sample(key, 'nR', tr, true) ?? 0, k = key.split('|')[1];
        g.fillStyle = css('--carrier'); g.strokeStyle = css('--line'); g.lineWidth = 2; g.fillRect(x, CAR_TOP, 750, 188); g.strokeRect(x, CAR_TOP, 750, 188);
        g.font = 'bold 12px "Segoe UI"'; g.textAlign = 'center'; g.fillStyle = css('--muted'); g.fillText('CARRIER #' + (((k - 1) % 40) + 1), x + 375, CAR_TOP + 178);
        ['L', 'R'].forEach((side) => ORD[side].forEach(([r, c], j) => {
          const n = Math.max(0, Math.min(2, (side === 'L' ? nL : nR) - 2 * j));
          const cx = x + COL_X0 + (c - 1) * PITCH_X, cy = CAR_TOP + ROW_Y0 + (r - 1) * PITCH_Y;
          g.fillStyle = n >= 2 ? css('--done') : css(c <= 10 ? '--cellL' : '--cellR'); g.fillRect(cx, cy, CELL_W, CELL_H);
          if (n >= 1) { g.fillStyle = '#f97316'; g.beginPath(); g.arc(cx + CELL_W / 2 + (c <= 10 ? 7 : -7), cy + 20, 4, 0, 6.3); g.fill(); }
          if (n >= 2) { g.beginPath(); g.arc(cx + CELL_W / 2 + (c <= 10 ? -7 : 7), cy + 20, 4, 0, 6.3); g.fill(); }
          g.fillStyle = css('--muted'); g.font = '11px "Segoe UI"'; g.fillText(String((r - 1) * 20 + c), cx + CELL_W / 2, cy + 33);
        }));
      }
      ['L', 'R'].forEach((side) => {
        const key = 'mddp_arm|' + side, x = sample(key, 'x', tr), y = sample(key, 'y', tr); if (x === null) return; anyData = true;
        const disp = sample(key, 'disp', tr, true), col = css(side === 'L' ? '--blue' : '--cyan');
        g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, RAIL); g.lineTo(x, y); g.stroke();
        g.fillStyle = col; g.fillRect(x - 22, RAIL - 28, 44, 28);
        g.strokeStyle = disp ? css('--red') : col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 11, 0, 6.3); g.stroke();
      });
      if (!anyData) { g.fillStyle = css('--muted'); g.font = '18px "Segoe UI"'; g.textAlign = 'center'; g.fillText('No data from InfluxDB yet', 780, 150); }
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}

// SPC: I chart of the peak pressure of every dispense seen in the cached window (computed from stored samples only)
function Spc({ side, win }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current; if (!cv || !cv.clientWidth) return;
      const { g, w, h } = fit(cv); const tr = nowRender(), W = win() * 1000, t0 = tr - W, L = 46, T = 22, pw = w - L - 8, ph = h - T - 16;
      g.clearRect(0, 0, w, h); g.font = '12px "Segoe UI"'; g.fillStyle = css('--muted'); g.textAlign = 'left'; g.fillText(`${side === 'L' ? 'Left' : 'Right'} dispense peak SPC (kPa)`, L, 10);
      const rows = range('mddp_fast|' + side, tr - 60000, tr), peaks = []; let cur = null;
      for (const r of rows) { if (r.p > 20) { if (!cur || r.t - cur.last > 5) { cur = { t: r.t, v: r.p, last: r.t }; peaks.push(cur); } cur.v = Math.max(cur.v, r.p); cur.last = r.t; } }
      if (peaks.length < 5) { g.textAlign = 'center'; g.fillText('collecting dispenses…', L + pw / 2, T + ph / 2); return; }
      const m = peaks.reduce((a, p) => a + p.v, 0) / peaks.length, sd = Math.sqrt(peaks.reduce((a, p) => a + (p.v - m) ** 2, 0) / (peaks.length - 1)) || 1;
      const lo = m - 5 * sd, hi = m + 5 * sd, y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
      [[m, 'CL', '--green'], [m + 3 * sd, 'UCL', '--red'], [m - 3 * sd, 'LCL', '--red']].forEach(([v, lab, c]) => { g.strokeStyle = css(c); g.setLineDash(lab === 'CL' ? [] : [5, 4]); g.beginPath(); g.moveTo(L, y(v)); g.lineTo(L + pw, y(v)); g.stroke(); g.setLineDash([]); g.fillStyle = css(c); g.textAlign = 'right'; g.fillText(`${lab} ${v.toFixed(1)}`, L + pw, y(v) - 6); });
      peaks.forEach((p) => { const x = L + ((p.t - t0) / W) * pw; if (x < L || x > L + pw) return; g.fillStyle = Math.abs(p.v - m) > 3 * sd ? css('--red') : css(side === 'L' ? '--blue' : '--cyan'); g.beginPath(); g.arc(x, y(p.v), 3, 0, 6.3); g.fill(); });
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [side]);
  return <canvas ref={ref} style={{ height: 150 }} />;
}

export default function MddpTab() {
  const [win, setWin] = useState(() => +(localStorage.getItem('mddp.win') || 15));
  const [spc, setSpc] = useState(() => localStorage.getItem('mddp.spc') === '1');
  const winRef = useRef(win); winRef.current = win;
  const getWin = useMemo(() => () => winRef.current, []);
  useEffect(() => { localStorage.setItem('mddp.win', win); localStorage.setItem('mddp.spc', spc ? '1' : '0'); }, [win, spc]);
  const B = 'var(--blue)', C = 'var(--cyan)';
  const col = (v) => v; // CSS vars are resolved by the canvas through getComputedStyle at draw time
  const cv = (v) => css(v.slice(4, -1));
  const sL = (f, c) => ({ key: 'mddp_fast|L', field: f, color: cv(c), label: 'L' });
  return (
    <div>
      <h1>MDDP_184</h1>
      <div className="card"><Line2D /></div>
      <div className="toolbar">
        <span>Window {win < 10 ? win.toFixed(1) : Math.round(win)} s</span>
        <button className="pill" onClick={() => setWin((w) => Math.max(0.2, w / 1.5))}>＋</button>
        <button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>－</button>
        <label style={{ marginLeft: 'auto' }}><input type="checkbox" checked={spc} onChange={(e) => setSpc(e.target.checked)} /> SPC</label>
      </div>
      <div className="grid2">
        {['L', 'R'].map((s) => <div className="card" key={'p' + s}>{spc ? <Spc side={s} win={getWin} /> : <Graph title={(s === 'L' ? 'Left' : 'Right') + ' pressure (kPa)'} series={[{ key: 'mddp_fast|' + s, field: 'p', color: cv(s === 'L' ? '--blue' : '--cyan'), label: s }]} ymin={0} ymax={120} ticks={[0, 50, 100]} win={getWin} unit=" kPa" dec={1} />}</div>)}
        {['L', 'R'].map((s) => <div className="card" key={'t' + s}><Graph title={(s === 'L' ? 'Left' : 'Right') + ' head epoxy temperature (°C)'} series={[{ key: 'mddp_arm|' + s, field: 'temp', color: cv('--amber'), label: s }]} ymin={108} ymax={112} ticks={[108, 109, 110, 111, 112]} win={getWin} unit=" °C" dec={2} />}</div>)}
        {['L', 'R'].map((s) => <div className="card" key={'v' + s}><Graph title={(s === 'L' ? 'Left' : 'Right') + ' motor vibration (g)'} series={[{ key: 'mddp_fast|' + s, field: 'vx', color: cv('--red'), label: 'X' }, { key: 'mddp_fast|' + s, field: 'vy', color: cv('--green'), label: 'Y' }, { key: 'mddp_fast|' + s, field: 'vz', color: cv('--blue'), label: 'Z' }]} ymin={0} ymax={0.8} ticks={[0, 0.2, 0.4, 0.6, 0.8]} win={getWin} unit=" g" dec={3} height={170} />}</div>)}
      </div>
    </div>
  );
}
