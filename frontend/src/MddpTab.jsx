import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import { nowRender, sample, keysWith, range, ui } from './store.js';
import { useTick, val, SpcBox } from './Live.jsx';
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

function RunCard() {
  useTick(500);
  let kL = 0; for (const key of keysWith('mddp_carrier|')) { const k = +key.split('|')[1], n = val(key, 'nL', true) ?? 0; if (n > 0 && k > kL) kL = k; }
  const nL = kL ? val('mddp_carrier|' + kL, 'nL', true) ?? 0 : 0, nR = kL ? val('mddp_carrier|' + kL, 'nR', true) ?? 0 : 0;
  const idx = Math.max(0, kL - 1), pieces = (idx % 45) * 60 + Math.floor((nL + nR) / 2);
  return (<div className="card" style={{ padding: '4px 10px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
    <b>Run card #{Math.floor(idx / 45) + 1} · {pieces.toLocaleString()} / 2,700 pieces</b>
    <div style={{ flex: 1, minWidth: 160, height: 8, background: 'var(--grid)', borderRadius: 4 }}><div style={{ width: (pieces / 27) + '%', height: 8, background: 'var(--green)', borderRadius: 4 }} /></div>
    <span style={{ color: 'var(--muted)' }}>Carrier load {(idx % 45) + 1}/45</span></div>);
}

export default function MddpTab() {
  const [win, setWin] = useState(() => +(localStorage.getItem('mddp.win') || 15));
  const winRef = useRef(win); winRef.current = win;
  const getWin = useMemo(() => () => winRef.current, []);
  useEffect(() => { localStorage.setItem('mddp.win', win); }, [win]);
  const cv = (v) => css(v);
  const side = (s) => (s === 'L' ? 'Left' : 'Right');
  const AX = [['vx', 'X axis', 0.8, [0, 0.4, 0.8], '--red'], ['vy', 'Y axis', 0.4, [0, 0.2, 0.4], '--green'], ['vz', 'Z axis', 0.4, [0, 0.2, 0.4], '--blue']];
  const nc = (val) => (val === null ? '--' : String(val));
  return (
    <div>
      <div style={{ textAlign: 'right', margin: '4px 6px 2px' }}><SpcBox /></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}><Line2D /></div>
      <div className="g2c" style={{ marginTop: 6 }}>
        {['L', 'R'].map((s) => <div className="card" key={'p' + s}><Graph title={side(s) + ' arm pressure'} series={[{ key: 'mddp_fast|' + s, field: 'p', color: cv(s === 'L' ? '--blue' : '--cyan'), label: s }]} ymin={0} ymax={120} ticks={[0, 50, 100]} win={getWin} unit=" kPa" dec={1} height={112} /></div>)}
        {['L', 'R'].map((s) => <div className="card" key={'d' + s}><Graph title={side(s) + ' arm dispense time'} series={[{ key: 'mddp_dispense|' + s, field: 'dur', color: cv(s === 'L' ? '--blue' : '--cyan'), label: s }]} ymin={50} ymax={90} ticks={[60, 70, 80]} win={getWin} unit=" ms" dec={1} dots height={86} /></div>)}
        {['L', 'R'].map((s) => <div className="card" key={'t' + s}><Graph title={side(s) + ' head epoxy temperature'} series={[{ key: 'mddp_arm|' + s, field: 'temp', color: cv('--amber'), label: s }]} ymin={108} ymax={112} ticks={[108, 110, 112]} win={getWin} unit=" °C" dec={2} height={86} /></div>)}
        {['L', 'R'].map((s) => <div className="card" key={'v' + s}>{AX.map(([f, nm, ymax, ticks, col]) => <Graph key={f} title={f === 'vx' ? side(s) + ' robot vibration X' : nm} series={[{ key: 'mddp_fast|' + s, field: f, color: cv(col), label: nm[0] }]} ymin={0} ymax={ymax} ticks={ticks} win={getWin} unit=" g" dec={3} height={58} noTime={f !== 'vz'} />)}</div>)}
      </div>
      <RunCard />
      <div className="dock">
        <span>Graph zoom <button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>−</button> <button className="pill" onClick={() => setWin((w) => Math.max(0.2, w / 1.5))}>+</button> {win < 10 ? win.toFixed(1) : Math.round(win)} s</span>
        <span className="legend"><span><i className="sw" style={{ background: '#bfdbfe' }} />Left arm zone (SN 1–10)</span><span><i className="sw" style={{ background: '#cffafe' }} />Right arm zone (SN 11–20)</span><span><i className="sw" style={{ background: '#86efac' }} />Dispensed</span><span><i className="sw" style={{ background: '#f97316', borderRadius: '50%' }} />Glue drop</span></span>
      </div>
    </div>
  );
}
