import React, { useEffect, useState } from 'react';
import { useGraphWindow } from '../../hooks/useGraphWindow.js';
import Graph from '../../components/Graph.jsx';
import { useTick, val, fmt, theme } from '../../hooks/useLive.js';
import SpcBox from '../../components/SpcBox.jsx';
import Calul3D from './Calul3D.jsx';
import FaultLog from '../../components/FaultLog.jsx';

import Robot2D from './Robot2D.jsx';
import MeasuredTable from './MeasuredTable.jsx';
import { PN } from './pointNames.js';

const KEY = 'calul_robot|';
const serviceSince = (life) => new Date(Date.now() - life * 1000).toLocaleDateString('en-CA');

export default function CalulSensorPage() {
  const { win, setWin, getWin } = useGraphWindow('calul.win', 20);
  const [mode, setMode] = useState(() => localStorage.getItem('calul.mode') || '3d');
  useEffect(() => {
    localStorage.setItem('calul.mode', mode);
  }, [mode]);
  useTick(500);
  const c = (n) => theme(n);
  const wpv = val(KEY, 'wp', true),
    atv = val(KEY, 'at', true),
    cyc = val(KEY, 'cycle', true),
    hr = val(KEY, 'hr', true),
    vfv = val('calul_vac|', 'front'),
    vbv = val('calul_vac|', 'back');
  const status =
    wpv === null
      ? 'No data'
      : `${atv >= 0 ? 'At P' + (atv + 1) + '  ' + PN[atv] : 'Moving to P' + (wpv + 1) + '  ' + PN[wpv]}   |   Front vacuum ${vfv < -50 ? 'ON' : 'off'}   Back vacuum ${vbv < -50 ? 'ON' : 'off'}   |   HAll rows ${hr}-${hr + 1} / 12   |   Cycle ${cyc}`;
  const life = val(KEY, 'life'),
    d = life ? Math.floor(life / 86400) : null,
    rem = life ? life - d * 86400 : 0;
  const since = life ? serviceSince(life) : '--';
  const G = (title, series, ymin, ymax, ticks, unit, dec = 2, key = KEY, extra = {}, cls = '') => (
    <div className={'card ' + cls}>
      <Graph
        {...extra}
        title={title}
        series={series.map(([f, col, lab, of]) => ({
          key,
          field: f,
          color: c(col),
          label: lab,
          of,
          dash: !!of,
        }))}
        ymin={ymin}
        ymax={ymax}
        ticks={ticks}
        unit={unit}
        dec={dec}
        win={getWin}
        height={190}
      />
    </div>
  );
  const [pt, setPt] = useState(() => +(localStorage.getItem('calul.pt') || 0));
  useEffect(() => {
    localStorage.setItem('calul.pt', pt);
  }, [pt]);
  const AK = 'calul_arrival|P' + (pt + 1),
    bp = (f, col, lab, ttl) =>
      G(`${ttl.split(' ')[0]} by point`, [[f, col, lab]], -0.12, 0.12, tol, '', 3, AK, {
        refs: tolRefs,
        dots: true,
      });
  const tol = [-0.1, -0.05, 0, 0.05, 0.1],
    tolRefs = [
      { v: 0.1, color: '--red' },
      { v: -0.1, color: '--red' },
    ];
  return (
    <div>
      <div className="topgrid2">
        <div className="card" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
          <div className="ovtitle">
            CALUL_037 &nbsp;<span>KUKA KR 6 R900-2 HO</span>
          </div>
          <div style={{ position: 'absolute', right: 10, top: 6, zIndex: 3 }} className="seg">
            <button className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>
              2D
            </button>
            <button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>
              3D
            </button>
          </div>
          {mode === '3d' ? <Calul3D /> : <Robot2D mode="2d" />}
          <div className="scenehint" style={{ top: 28, bottom: 'auto' }}>
            drag = rotate · wheel = zoom · double-click = reset view
          </div>
          <div
            style={{
              position: 'absolute',
              left: 10,
              bottom: 6,
              fontWeight: 700,
              fontSize: 13,
              background: 'var(--panel)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {status}
          </div>
        </div>
        <div className="rightcol">
          <div className="card tbl-compact" style={{ overflow: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Measured at last arrival: X Y Z (mm) A B C (°)
            </div>
            <MeasuredTable />
          </div>
          <div className="card" style={{ padding: '4px 10px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Robot Used Life Time</div>
            <b style={{ fontSize: 20 }}>
              {d === null
                ? '--'
                : `${d} d ${String(Math.floor(rem / 3600)).padStart(2, '0')} h ${String(Math.floor((rem % 3600) / 60)).padStart(2, '0')} min ${String(Math.floor(rem % 60)).padStart(2, '0')} s`}
            </b>{' '}
            <small style={{ color: 'var(--muted)' }}>in service since {since} (2 years ago)</small>
          </div>
        </div>
      </div>
      <div className="dock">
        <span>
          Graph zoom{' '}
          <button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>
            −
          </button>{' '}
          <button className="pill" onClick={() => setWin((w) => Math.max(1, w / 1.5))}>
            +
          </button>{' '}
          {Math.round(win)} s
        </span>
        <span className="legend">
          <span>
            <i className="sw" style={{ background: '#22c55e' }} />
            Vacuum holding
          </span>
          <span>Dashed = limit</span>
          <span>
            <i className="sw" style={{ background: '#dc2626' }} />
            Tolerance ±0.10 mm / ±0.10°
          </span>
          <span>Base frame, mm</span>
          <span>
            Buffer{' '}
            {(val('calul_flow|', 'ready', true) ?? 0) >= 1e5
              ? 'queue available'
              : fmt(val('calul_flow|', 'ready', true), 0)}{' '}
            · picked {fmt(val('calul_flow|', 'picked', true), 0)} · sent to HAll{' '}
            {fmt(val('calul_flow|', 'sent', true), 0)}
          </span>
        </span>
      </div>
      <div className="kframe">
        <span className="kh">KUKA</span>
        <div className="toolbar" style={{ marginTop: -6 }}>
          <b>By point</b>{' '}
          {PN.map((n, i) => (
            <button
              key={i}
              className={'pill' + (pt === i ? ' on' : '')}
              style={pt === i ? { background: 'var(--blue)', color: '#fff' } : undefined}
              title={n}
              onClick={() => setPt(i)}
            >
              P{i + 1}
            </button>
          ))}
          <SpcBox style={{ marginLeft: 12 }} />
        </div>
        <div className="g3">
          {G(
            'Position XYZ',
            [
              ['x', '--red', 'X'],
              ['y', '--green', 'Y'],
              ['z', '--blue', 'Z'],
              ['tx', '--red', 'X target', 'X'],
              ['ty', '--green', 'Y target', 'Y'],
              ['tz', '--blue', 'Z target', 'Z'],
            ],
            -400,
            900,
            [-300, 0, 300, 600, 900],
            ' mm',
            2,
            KEY,
            { toggle: true, spcOk: false, joined: { dec: 0, unit: 'mm' } },
            'span3'
          )}
          {bp('ex', '--red', 'X', 'X (mm)')}
          {bp('ey', '--green', 'Y', 'Y (mm)')}
          {bp('ez', '--blue', 'Z', 'Z (mm)')}
          {G(
            'Orientation ABC',
            [
              ['a', '--red', 'A'],
              ['b', '--green', 'B'],
              ['c', '--blue', 'C'],
              ['ta', '--red', 'A target', 'A'],
              ['tb', '--green', 'B target', 'B'],
              ['tg', '--blue', 'C target', 'C'],
            ],
            -10,
            370,
            [0, 90, 180, 270, 360],
            '°',
            1,
            KEY,
            { toggle: true, spcOk: false, joined: { dec: 0, unit: '°' } },
            'span3'
          )}
          {bp('ea', '--red', 'A', 'A (°)')}
          {bp('eb', '--green', 'B', 'B (°)')}
          {bp('ec', '--blue', 'C', 'C (°)')}
          {G(
            'Joint temperature',
            [1, 2, 3, 4, 5, 6].map((i) => [
              't' + i,
              ['--red', '--amber', '--green', '--cyan', '--blue', '--muted'][i - 1],
              'J' + i,
            ]),
            30,
            60,
            [30, 40, 50, 60],
            '',
            1,
            KEY,
            { toggle: true, ownSpc: true, joined: { mode: 'hottest', unit: '°C' } }
          )}
          {G('Vacuum Front', [['front', '--blue', 'Front']], -120, 10, [-100, -50, 0], '', 1, 'calul_vac|', {
            refs: [{ v: -80, label: 'alarm −80', color: '--red' }],
            ownSpc: true,
          })}
          {G('Vacuum Back', [['back', '--cyan', 'Back']], -120, 10, [-100, -50, 0], '', 1, 'calul_vac|', {
            refs: [{ v: -80, label: 'alarm −80', color: '--red' }],
            ownSpc: true,
          })}
        </div>
      </div>
      <div className="kframe festo">
        <span className="kh">FESTO</span>
        <div className="g3">
          {['X', 'Y', 'Z'].map((a, i) => (
            <div className="card" key={a}>
              <Graph
                title={`Temperature ${a} Axis`}
                series={[
                  {
                    key: 'calul_festo|' + a,
                    field: 'temp',
                    color: c(['--red', '--green', '--blue'][i]),
                    label: a,
                  },
                ]}
                ymin={20}
                ymax={60}
                ticks={[20, 30, 40, 50, 60]}
                unit=" °C"
                dec={1}
                win={getWin}
                height={200}
              />
            </div>
          ))}
        </div>
        <FaultLog src="festo" title="Festo error codes" filters={['X', 'Y', 'Z']} itemLabel="Axis" />
      </div>
      <div className="kframe iai">
        <span className="kh">IAI</span>
        <FaultLog
          src="iai"
          title="IAI error codes"
          filters={['TF2', 'TF1', 'TOP CAM', 'BOTTOM CAM', 'GRIPPER', 'X', 'Y', 'Z']}
          itemLabel="Item"
        />
      </div>
    </div>
  );
}
