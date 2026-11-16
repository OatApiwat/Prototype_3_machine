import React, { useEffect, useRef } from 'react';
import { nowRender, sample, keysWith } from '../../lib/store.js';
import { css, fit } from '../../lib/canvasUtil.js';

// layout constants of the 2D drawing (pixels only; no data values)
const COL_X0 = 62,
  PITCH_X = 34,
  ROW_Y0 = 20,
  PITCH_Y = 52,
  CELL_W = 30,
  CELL_H = 40,
  CAR_TOP = 56,
  RAIL = 34;
const ord = (side) => {
  const o = [];
  for (let r = 1; r <= 3; r++) for (let i = 0; i < 10; i++) o.push([r, side === 'L' ? 10 - i : 11 + i]);
  return o;
};
const ORD = { L: ord('L'), R: ord('R') };

/** 2D animation of the two dispensing arms over the carrier (all positions come from InfluxDB) */
export default function ArmGrid() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current;
      if (!cv || !cv.clientWidth) return;
      cv.style.height = (cv.clientWidth * 290) / 1560 + 'px';
      const { g, w } = fit(cv);
      const s = w / 1560;
      g.setTransform(s * (window.devicePixelRatio || 1), 0, 0, s * (window.devicePixelRatio || 1), 0, 0);
      g.clearRect(0, 0, 1560, 290);
      const tr = nowRender();
      [
        [0, 'L', '--blue', 'LEFT ARM'],
        [790, 'R', '--cyan', 'RIGHT ARM'],
      ].forEach(([x0, sd, col, lab]) => {
        g.strokeStyle = css(col);
        g.setLineDash([6, 4]);
        g.lineWidth = 2;
        g.strokeRect(x0 + 1, 40, 768, 232);
        g.setLineDash([]);
        g.fillStyle = css(col);
        g.fillRect(x0, 6, 770, 28);
        g.fillStyle = '#fff';
        g.font = 'bold 15px "Segoe UI"';
        g.textAlign = 'center';
        g.fillText(sd, x0 + 385, 26);
        g.fillStyle = css(col);
        g.font = 'bold 15px "Segoe UI"';
        g.textAlign = 'center';
        g.fillText(lab, x0 + 385, 262);
      });
      let anyData = false;
      for (const key of keysWith('mddp_carrier|')) {
        const x = sample(key, 'x', tr);
        if (x === null) continue;
        anyData = true;
        const nL = sample(key, 'nL', tr, true) ?? 0,
          nR = sample(key, 'nR', tr, true) ?? 0,
          k = key.split('|')[1];
        g.fillStyle = css('--carrier');
        g.strokeStyle = css('--line');
        g.lineWidth = 2;
        g.fillRect(x, CAR_TOP, 750, 188);
        g.strokeRect(x, CAR_TOP, 750, 188);
        g.font = 'bold 11px "Segoe UI"';
        g.textAlign = 'left';
        g.fillStyle = css('--muted');
        for (let r = 1; r <= 3; r++)
          g.fillText('Strip ' + r, x + 6, CAR_TOP + ROW_Y0 + (r - 1) * PITCH_Y + 24);
        g.font = 'bold 12px "Segoe UI"';
        g.textAlign = 'center';
        g.fillText('CARRIER #' + (((k - 1) % 40) + 1), x + 375, CAR_TOP + 178);
        ['L', 'R'].forEach((side) =>
          ORD[side].forEach(([r, c], j) => {
            const n = Math.max(0, Math.min(2, (side === 'L' ? nL : nR) - 2 * j));
            const cx = x + COL_X0 + (c - 1) * PITCH_X,
              cy = CAR_TOP + ROW_Y0 + (r - 1) * PITCH_Y;
            g.fillStyle = n >= 2 ? css('--done') : css(c <= 10 ? '--cellL' : '--cellR');
            g.fillRect(cx, cy, CELL_W, CELL_H);
            if (n >= 1) {
              g.fillStyle = '#f97316';
              g.beginPath();
              g.arc(cx + CELL_W / 2 + (c <= 10 ? 7 : -7), cy + 20, 4, 0, 6.3);
              g.fill();
            }
            if (n >= 2) {
              g.beginPath();
              g.arc(cx + CELL_W / 2 + (c <= 10 ? -7 : 7), cy + 20, 4, 0, 6.3);
              g.fill();
            }
            g.fillStyle = css('--muted');
            g.font = '11px "Segoe UI"';
            g.fillText(String((r - 1) * 20 + c), cx + CELL_W / 2, cy + 33);
          })
        );
      }
      ['L', 'R'].forEach((side) => {
        const key = 'mddp_arm|' + side,
          x = sample(key, 'x', tr),
          y = sample(key, 'y', tr);
        if (x === null) return;
        anyData = true;
        const disp = sample(key, 'disp', tr, true),
          col = css(side === 'L' ? '--blue' : '--cyan');
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, RAIL);
        g.lineTo(x, y);
        g.stroke();
        g.fillStyle = col;
        g.fillRect(x - 22, RAIL - 28, 44, 28);
        g.strokeStyle = disp ? css('--red') : col;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, 11, 0, 6.3);
        g.stroke();
      });
      if (!anyData) {
        g.fillStyle = css('--muted');
        g.font = '18px "Segoe UI"';
        g.textAlign = 'center';
        g.fillText('No data from InfluxDB yet', 780, 150);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}
