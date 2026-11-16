import React, { useEffect, useRef } from 'react';
import { nowRender, sample } from '../../lib/store.js';
import { fit } from '../../lib/canvasUtil.js';
import { theme } from '../../hooks/useLive.js';

const J = ['j1', 'j2', 'j3', 'j4', 'j5'];

// robot skeleton drawn from the joint positions stored in InfluxDB (no kinematics in the browser)
export default function Robot2D({ mode }) {
  const ref = useRef(null),
    cam = useRef({ az: 35, drag: null });
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    const cv = ref.current;
    const down = (e) => {
      cam.current.drag = { x: e.clientX, az: cam.current.az };
    };
    const move = (e) => {
      const d = cam.current.drag;
      if (d) cam.current.az = d.az - (e.clientX - d.x) * 0.5;
    };
    const up = () => {
      cam.current.drag = null;
    };
    cv.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!cv.clientWidth) return;
      cv.style.height = '404px';
      const { g, w, h } = fit(cv);
      g.clearRect(0, 0, w, h);
      const t = nowRender(),
        K = 'calul_robot|';
      const P = [[0, 0, 0]];
      for (const j of J) {
        const x = sample(K, j + 'x', t),
          y = sample(K, j + 'y', t),
          z = sample(K, j + 'z', t);
        if (x === null) {
          g.fillStyle = theme('--muted');
          g.textAlign = 'center';
          g.font = '16px sans-serif';
          g.fillText('No data', w / 2, h / 2);
          return;
        }
        P.push([x, y, z]);
      }
      const az = ((modeRef.current === '3d' ? cam.current.az : 0) * Math.PI) / 180,
        ca = Math.cos(az),
        sa = Math.sin(az),
        el = modeRef.current === '3d' ? 0.5 : 0;
      const proj = (p) => {
        const x = p[0] * ca - p[1] * sa,
          d = p[0] * sa + p[1] * ca;
        return [x, -(p[2] * Math.cos(el) - d * Math.sin(el))];
      };
      const S = Math.min(w / 1500, h / 1000),
        ox = w / 2 - 350 * S,
        oy = h - 60;
      const pt = (p) => {
        const q = proj(p);
        return [ox + q[0] * S, oy + q[1] * S];
      };
      g.strokeStyle = theme('--line');
      g.lineWidth = 1;
      for (let i = -400; i <= 1200; i += 200) {
        const a = pt([i, -600, 0]),
          b = pt([i, 600, 0]);
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
      }
      for (let i = -600; i <= 600; i += 200) {
        const a = pt([-400, i, 0]),
          b = pt([1200, i, 0]);
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
      }
      g.strokeStyle = '#ea580c';
      g.lineCap = 'round';
      for (let i = 1; i < P.length; i++) {
        const a = pt(P[i - 1]),
          b = pt(P[i]);
        g.lineWidth = 16 - i * 1.6;
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
      }
      P.forEach((p, i) => {
        const a = pt(p);
        g.fillStyle = '#1f2937';
        g.beginPath();
        g.arc(a[0], a[1], 5, 0, 6.3);
        g.fill();
      });
      const vf = sample('calul_vac|', 'front', t) ?? 0,
        vb = sample('calul_vac|', 'back', t) ?? 0,
        tcp = pt(P[5]);
      g.fillStyle = vf < -50 ? '#22c55e' : '#94a3b8';
      g.fillRect(tcp[0] - 16, tcp[1] + 4, 14, 8);
      g.fillStyle = vb < -50 ? '#22c55e' : '#94a3b8';
      g.fillRect(tcp[0] + 2, tcp[1] + 4, 14, 8);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);
  return <canvas ref={ref} style={{ cursor: mode === '3d' ? 'grab' : 'default' }} />;
}
