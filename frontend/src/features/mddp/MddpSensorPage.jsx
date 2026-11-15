import React from 'react';
import { useGraphWindow } from '../../hooks/useGraphWindow.js';
import Graph from '../../components/Graph.jsx';
import SpcBox from '../../components/SpcBox.jsx';
import { css } from '../../lib/canvasUtil.js';

import ArmGrid from './ArmGrid.jsx';
import RunCardBar from './RunCardBar.jsx';

export default function MddpSensorPage() {
  const { win, setWin, getWin } = useGraphWindow('mddp.win', 15);
  const cv = (v) => css(v);
  const side = (s) => (s === 'L' ? 'Left' : 'Right');
  const AX = [
    ['vx', 'X axis', 0.8, [0, 0.4, 0.8], '--red'],
    ['vy', 'Y axis', 0.4, [0, 0.2, 0.4], '--green'],
    ['vz', 'Z axis', 0.4, [0, 0.2, 0.4], '--blue'],
  ];
  return (
    <div>
      <div style={{ textAlign: 'right', margin: '4px 6px 2px' }}>
        <SpcBox />
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <ArmGrid />
      </div>
      <div className="g2c" style={{ marginTop: 6 }}>
        {['L', 'R'].map((s) => (
          <div className="card" key={'p' + s}>
            <Graph
              title={side(s) + ' arm pressure'}
              series={[
                { key: 'mddp_fast|' + s, field: 'p', color: cv(s === 'L' ? '--blue' : '--cyan'), label: '' },
              ]}
              ymin={0}
              ymax={120}
              ticks={[0, 50, 100]}
              win={getWin}
              unit=" kPa"
              ylabel="Pressure (kPa)"
              dec={1}
              height={112}
            />
          </div>
        ))}
        {['L', 'R'].map((s) => (
          <div className="card" key={'d' + s}>
            <Graph
              title="Dispense Time"
              series={[
                {
                  key: 'mddp_dispense|' + s,
                  field: 'dur',
                  color: cv(s === 'L' ? '--blue' : '--cyan'),
                  label: '',
                },
              ]}
              ymin={50}
              ymax={90}
              ticks={[60, 70, 80]}
              win={getWin}
              unit=" ms"
              ylabel="Time (ms)"
              dec={1}
              dots
              height={86}
            />
          </div>
        ))}
        {['L', 'R'].map((s) => (
          <div className="card" key={'t' + s}>
            <Graph
              title={side(s) + ' head epoxy temperature'}
              series={[{ key: 'mddp_arm|' + s, field: 'temp', color: cv('--amber'), label: '' }]}
              ymin={108}
              ymax={112}
              ticks={[108, 110, 112]}
              win={getWin}
              unit=" °C"
              ylabel="Temp (°C)"
              dec={2}
              height={86}
            />
          </div>
        ))}
        {['L', 'R'].map((s) => (
          <div className="card" key={'v' + s}>
            {AX.map(([f, nm, ymax, ticks, col]) => (
              <Graph
                key={f}
                title={f === 'vx' ? side(s) + ' robot vibration X' : nm}
                series={[{ key: 'mddp_fast|' + s, field: f, color: cv(col), label: nm[0] }]}
                ymin={0}
                ymax={ymax}
                ticks={ticks}
                win={getWin}
                unit=" g"
                ylabel="g"
                dec={3}
                height={58}
                noTime={f !== 'vz'}
              />
            ))}
          </div>
        ))}
      </div>
      <RunCardBar />
      <div className="dock">
        <span>
          Graph zoom{' '}
          <button className="pill" onClick={() => setWin((w) => Math.min(60, w * 1.5))}>
            −
          </button>{' '}
          <button className="pill" onClick={() => setWin((w) => Math.max(0.2, w / 1.5))}>
            +
          </button>{' '}
          {win < 10 ? win.toFixed(1) : Math.round(win)} s
        </span>
        <span className="legend">
          <span>
            <i className="sw" style={{ background: '#bfdbfe' }} />
            Left arm zone (SN 1–10)
          </span>
          <span>
            <i className="sw" style={{ background: '#cffafe' }} />
            Right arm zone (SN 11–20)
          </span>
          <span>
            <i className="sw" style={{ background: '#86efac' }} />
            Dispensed
          </span>
          <span>
            <i className="sw" style={{ background: '#f97316', borderRadius: '50%' }} />
            Glue drop
          </span>
        </span>
      </div>
    </div>
  );
}
