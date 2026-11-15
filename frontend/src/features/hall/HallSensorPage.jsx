import React, { useEffect, useState } from 'react';
import { useGraphWindow } from '../../hooks/useGraphWindow.js';
import Graph from '../../components/Graph.jsx';
import { useTick, theme } from '../../hooks/useLive.js';
import SpcBox from '../../components/SpcBox.jsx';
import { nowRender, sample, keysWith, rowsOf } from '../../lib/store.js';
import Hall3D from './Hall3D.jsx';

import TopView from './TopView.jsx';
import SideView from './SideView.jsx';
import { XOV } from './hallScene.js';

const SETPT = 160;
const mmss = (s) =>
  typeof s === 'number' ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '--';

export default function HallSensorPage() {
  const { win, setWin, getWin } = useGraphWindow('hall.win', 120);
  const [mode, setMode] = useState(() => localStorage.getItem('hall.mode') || '2d');
  useEffect(() => {
    localStorage.setItem('hall.mode', mode);
  }, [mode]);
  useTick(1000);
  const c = (n) => theme(n),
    K = 'hall_oven|',
    t = nowRender();
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2, extra = {}, key = K, h = 215) => (
    <div className="card">
      <Graph
        title={title}
        series={series.map(([f, col, lab]) => ({ key, field: f, color: c(col), label: lab }))}
        ymin={ymin}
        ymax={ymax}
        ticks={ticks}
        unit={unit}
        dec={dec}
        win={getWin}
        height={h}
        {...extra}
      />
    </div>
  );
  const trays = keysWith('hall_tray|')
    .map((k) => ({ k: k.split('|')[1], x: sample(k, 'x', t) }))
    .filter((o) => o.x !== null && Math.abs(o.x) <= XOV);
  const cure = rowsOf('hall_cure|'),
    lastCure = [...cure].reverse().find((r) => r.t <= t),
    setS = (lastCure && lastCure.set_s) || 165.94;
  const v = (f, d = 2) => {
    const x = sample(K, f, t);
    return typeof x === 'number' ? x.toFixed(d) : '--';
  };
  const P = [
    ['Oven Temperature setting', SETPT + ' °C'],
    ['Oven Temperature actual', v('temp', 1) + ' °C'],
    ['Oven Curing Time (last tray out)', mmss(lastCure && lastCure.cure_s) + ' min:s'],
    ['Oven Curing Time (set)', mmss(lastCure && lastCure.set_s) + ' min:s'],
    ['Blower Speed', v('rpm', 0) + ' rpm'],
    ['Blower Vibration X / Y / Z', v('vx', 2) + ' / ' + v('vy', 2) + ' / ' + v('vz', 2) + ' mm/s'],
    ['Conveyor Speed', v('conv', 2) + ' mm/s'],
    ['Blower Temperature', v('blower_temp', 1) + ' °C'],
    ['Trays in oven', String(trays.length)],
  ];
  return (
    <div>
      <div className="topgrid3">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 10, top: 8, zIndex: 5 }} className="seg">
            <button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>
              2D
            </button>
            <button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>
              3D
            </button>
          </div>
          {mode === '3d' ? (
            <div className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
              <div className="ovtitle">
                HAll_013 &nbsp;<span>Convection oven — 3D view</span>
              </div>
              <Hall3D />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateRows: '215px 112px', gap: 8 }}>
              <div
                className="card"
                style={{
                  position: 'relative',
                  padding: 0,
                  margin: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <div className="ovtitle">
                  HAll_013 &nbsp;<span>Convection oven — side view</span>
                </div>
                <SideView />
              </div>
              <div
                className="card"
                style={{ padding: 0, margin: 0, overflow: 'hidden', boxSizing: 'border-box' }}
              >
                <TopView />
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Oven parameters</div>
          <table className="t">
            <tbody>
              {P.map(([n, x]) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td>
                    <b>{x}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="dock">
        <span>
          Graph zoom{' '}
          <button className="pill" onClick={() => setWin((w) => Math.min(120, w * 1.5))}>
            −
          </button>{' '}
          <button className="pill" onClick={() => setWin((w) => Math.max(5, w / 1.5))}>
            +
          </button>{' '}
          {win >= 60 ? (win / 60).toFixed(1) + ' min' : Math.round(win) + ' s'}
        </span>
        <span className="legend">
          <span>Trays come from CALUL (12 Carriers per tray) → IN → oven → OUT</span>
          <span>
            <i className="sw" style={{ background: '#86efac' }} />
            uncured → <i className="sw" style={{ background: '#15803d' }} />
            cured
          </span>
        </span>
      </div>
      <div className="kframe halll">
        <span className="kh">HAll</span>
        <SpcBox className="kspc" />
        <div className="g3">
          {G(
            [
              { t: 'Oven temperature  ', c: '--text' },
              { t: 'actual', c: '--red' },
              { t: '  /  setting', c: '--muted' },
            ],
            [['temp', '--red', '']],
            154,
            164,
            [154, 156, 158, 160, 162, 164],
            ' °C',
            2,
            { refs: [{ v: SETPT, label: 'setting 160', color: '--muted' }] }
          )}
          {G(
            'Blower speed',
            [['rpm', '--blue', '']],
            1445,
            1455,
            [1445, 1447, 1449, 1451, 1453, 1455],
            ' rpm',
            0
          )}
          {G(
            'Conveyor speed',
            [['conv', '--green', '']],
            22.7,
            23.1,
            [22.7, 22.8, 22.9, 23.0, 23.1],
            ' mm/s',
            2
          )}
          <div className="card" style={{ padding: 2 }}>
            {[
              ['vx', 'X', '--red', 0.8, 1.6, [0.8, 1.2, 1.6]],
              ['vy', 'Y', '--green', 0.6, 1.2, [0.6, 0.9, 1.2]],
              ['vz', 'Z', '--blue', 0.4, 0.9, [0.4, 0.65, 0.9]],
            ].map(([f, a, col, lo, hi, tk]) => (
              <Graph
                key={f}
                title={a === 'X' ? 'Blower vibration X axis' : a + ' axis'}
                series={[{ key: K, field: f, color: c(col), label: a }]}
                ymin={lo}
                ymax={hi}
                ticks={tk}
                unit=" mm/s"
                dec={3}
                win={getWin}
                height={112}
                noTime={f !== 'vz'}
              />
            ))}
          </div>
          {G(
            'Blower temperature',
            [['blower_temp', '--amber', '']],
            58,
            68,
            [58, 60, 62, 64, 66, 68],
            ' °C',
            0,
            {},
            K,
            250
          )}
          {G(
            'Oven curing time (one point per tray out)',
            [['cure_s', '--green', '']],
            160,
            172,
            [160, 163, 166, 169, 172],
            ' min:s',
            1,
            {
              dots: true,
              tickFmt: (v) => mmss(v),
              valFmt: (v) => mmss(v),
              refs: [
                { v: setS + 3, label: '+3 s', color: '--red' },
                { v: setS, label: 'set ' + mmss(setS), color: '--muted' },
                { v: setS - 3, label: '−3 s', color: '--red' },
              ],
            },
            'hall_cure|',
            250
          )}
        </div>
      </div>
    </div>
  );
}
