import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { nowRender, sample } from '../../lib/store.js';
import { theme } from '../../hooks/useLive.js';

// Robot / cell dimensions in mm (drawing constants of the KR 6 R900-2 HO model); all motion comes from InfluxDB.
const A1 = 25,
  D1 = 400,
  A2 = 455,
  A3 = 35,
  D4 = 420,
  TCPX = 160,
  PAD_R = 120,
  PL = 180,
  PW = 50,
  PT = 10,
  XC = 540,
  ROW_Y0 = -330,
  ROW_P = 60,
  ZS = 90;
const rowY = (k) => ROW_Y0 + ROW_P * k,
  D2R = Math.PI / 180;
const BUF = { F: [270, -400, 90], B: [150, -280, 90] }; // buffer lane plate centres at P3 (front long axis x, back long axis y)

const mat = (c, r = 0.5, m = 0.15) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const box = (g, w, h, d, m, x, y, z) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  g.add(o);
  return o;
};
function cyl(g, axis, r, len, m, x, y, z, r2) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, len, 32), m);
  if (axis === 'x') o.rotation.z = Math.PI / 2;
  else if (axis === 'z') o.rotation.x = Math.PI / 2;
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  g.add(o);
  return o;
}
function plateTex(long) {
  // 60 pieces (20 x 3), glued (green) with two orange glue dots
  const cv = document.createElement('canvas'),
    cw = long ? 400 : 60,
    ch = long ? 60 : 400;
  cv.width = cw;
  cv.height = ch;
  const g = cv.getContext('2d');
  g.fillStyle = '#e2e8f0';
  g.fillRect(0, 0, cw, ch);
  for (let a = 0; a < 20; a++)
    for (let b = 0; b < 3; b++) {
      const x = long ? a * 20 + 2 : b * 20 + 2,
        y = long ? b * 20 + 2 : a * 20 + 2;
      g.fillStyle = '#86efac';
      g.fillRect(x, y, 16, 16);
      g.fillStyle = '#f97316';
      g.beginPath();
      g.arc(x + 5, y + 8, 2.2, 0, 6.3);
      g.arc(x + 11, y + 8, 2.2, 0, 6.3);
      g.fill();
    }
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}
function makePlate(side, longAlongWorldX) {
  // tool-frame plates (held): front long axis tool-y, back long axis tool-z
  const geo = side === 0 ? new THREE.BoxGeometry(PT, PL, PW) : new THREE.BoxGeometry(PT, PW, PL);
  const edge = new THREE.MeshStandardMaterial({ color: side === 0 ? 0x60a5fa : 0xa78bfa, roughness: 0.6 });
  const face = new THREE.MeshStandardMaterial({ map: plateTex(side === 1), roughness: 0.7 });
  const o = new THREE.Mesh(geo, [face, face, edge, edge, edge, edge]);
  o.castShadow = o.receiveShadow = true;
  return o;
}
function flatPlate(side, alongX) {
  // plates lying on the buffer / tray: thickness along z
  const geo = alongX ? new THREE.BoxGeometry(PL, PW, PT) : new THREE.BoxGeometry(PW, PL, PT);
  const edge = new THREE.MeshStandardMaterial({ color: side === 0 ? 0x60a5fa : 0xa78bfa, roughness: 0.6 });
  const face = new THREE.MeshStandardMaterial({ map: plateTex(alongX), roughness: 0.7 });
  const o = new THREE.Mesh(geo, [edge, edge, edge, edge, face, edge]);
  o.castShadow = o.receiveShadow = true;
  return o;
}

export default function Calul3D() {
  const wrap = useRef(null),
    canvas = useRef(null),
    lbl = useRef({});
  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true });
    } catch (e) {
      wrap.current.textContent = 'WebGL is not available in this browser';
      return undefined;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(32, 1.6, 50, 9000);
    scene.fog = new THREE.Fog(0xeef2f7, 2600, 5200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-600, 1500, 900);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -1100,
      right: 1100,
      top: 1100,
      bottom: -1100,
      near: 200,
      far: 4000,
    });
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    scene.add(root);
    const ORANGE = mat(0xf2f2ee, 0.38, 0.12),
      DARK = mat(0x2b303a, 0.6, 0.3),
      GREY = mat(0xaab2bd, 0.5, 0.3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat(0xcfd6df, 0.95, 0));
    floor.position.z = -700;
    floor.receiveShadow = true;
    root.add(floor);
    box(root, 1500, 1150, 36, mat(0xf4f6f9, 0.7, 0.05), 330, 60, -18);
    [
      [-380, -480],
      [1040, -480],
      [-380, 600],
      [1040, 600],
    ].forEach((p) => box(root, 50, 50, 664, GREY, p[0] + 25, p[1] + 25, -350));
    cyl(root, 'z', 135, 34, DARK, 0, 0, 17);
    cyl(root, 'z', 108, 14, GREY, 0, 0, 41);
    const J = {};
    J.j1 = new THREE.Group();
    root.add(J.j1);
    box(J.j1, 190, 200, 300, ORANGE, 8, 0, 190);
    cyl(J.j1, 'z', 96, 40, DARK, 0, 0, 52);
    cyl(J.j1, 'y', 96, 196, ORANGE, A1, 0, D1);
    cyl(J.j1, 'y', 54, 206, DARK, A1, 0, D1);
    J.j2 = new THREE.Group();
    J.j2.position.set(A1, 0, D1);
    J.j1.add(J.j2);
    box(J.j2, 108, 124, A2 + 40, ORANGE, 0, 0, A2 / 2 + 10);
    cyl(J.j2, 'y', 72, 150, ORANGE, 0, 0, A2);
    cyl(J.j2, 'y', 44, 160, DARK, 0, 0, A2);
    J.j3 = new THREE.Group();
    J.j3.position.set(0, 0, A2);
    J.j2.add(J.j3);
    box(J.j3, D4 + 30, 104, 96, ORANGE, D4 / 2 + 5, 0, A3);
    cyl(J.j3, 'y', 62, 170, ORANGE, 0, 0, 0);
    J.j4 = new THREE.Group();
    J.j4.position.set(D4, 0, A3);
    J.j3.add(J.j4);
    cyl(J.j4, 'x', 52, 120, ORANGE, -20, 0, 0);
    cyl(J.j4, 'x', 38, 24, DARK, 44, 0, 0);
    J.j5 = new THREE.Group();
    J.j4.add(J.j5);
    cyl(J.j5, 'y', 44, 126, ORANGE, 0, 0, 0);
    cyl(J.j5, 'y', 30, 138, DARK, 0, 0, 0);
    box(J.j5, 70, 84, 70, ORANGE, 30, 0, 0);
    J.j6 = new THREE.Group();
    J.j5.add(J.j6);
    cyl(J.j6, 'x', 33, 34, GREY, 48, 0, 0);
    cyl(J.j6, 'x', 38, 20, DARK, 66, 0, 0);
    cyl(J.j6, 'x', 36, 24, DARK, 88, 0, 0);
    box(J.j6, 24, 150, 62, mat(0x3b4350, 0.5, 0.35), 108, 70, 0);
    box(J.j6, 24, 62, 150, mat(0x3b4350, 0.5, 0.35), 108, 0, -70);
    const cups = [];
    [0, 1].forEach((side) =>
      [PAD_R - 55, PAD_R + 55].forEach((r) => {
        const cm = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
        cups.push({ side, m: cm });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(15, 24, 44, 24), cm);
        cup.castShadow = true;
        cup.position.set(TCPX - 22, side === 0 ? r : 0, side === 0 ? 0 : -r);
        cup.rotation.z = -Math.PI / 2;
        J.j6.add(cup);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 24, 12), DARK);
        st.rotation.z = Math.PI / 2;
        st.position.set(TCPX - 56, cup.position.y, cup.position.z);
        J.j6.add(st);
      })
    );
    // buffer lanes (from MDDP_184) at P3
    const buf = [[], []];
    [
      ['F', 0, true],
      ['B', 1, false],
    ].forEach(([k, s, ax]) => {
      const c = BUF[k];
      box(root, ax ? 230 : 120, ax ? 120 : 230, 12, DARK, c[0], c[1], c[2] - 62);
      box(root, ax ? 214 : 104, ax ? 104 : 214, 8, mat(0x4b5563, 0.6, 0.2), c[0], c[1], c[2] - 54);
      for (let b = 0; b < 4; b++) {
        const p = flatPlate(s, ax);
        p.position.set(c[0], c[1], c[2] - b * (PT + 2));
        p.visible = false;
        root.add(p);
        buf[s].push(p);
      }
    });
    // HA tray: base + 12 row outlines; two alternating lanes of 24 plates
    box(root, PL + 40, ROW_P * 12 + 20, 10, mat(0x374151, 0.8, 0.1), XC, (rowY(0) + rowY(11)) / 2, ZS - 10);
    for (let rk = 0; rk < 12; rk++)
      box(root, PL + 6, PW + 6, 1.5, mat(0x94a3b8, 0.9, 0), XC, rowY(rk), ZS - 4.5);
    const tray = [0, 1].map(() => {
      const g = new THREE.Group();
      root.add(g);
      const ps = [];
      for (let i = 0; i < 24; i++) {
        const p = flatPlate(i % 2, true);
        p.position.set(XC, rowY(i), ZS);
        g.add(p);
        ps.push(p);
      }
      return { g, ps };
    });
    const held = [makePlate(0), makePlate(1)];
    held.forEach((o, s) => {
      o.position.set(TCPX + PT / 2, s === 0 ? PAD_R : 0, s === 0 ? 0 : -PAD_R);
      J.j6.add(o);
    });
    // orbit camera
    const cam = { az: 32, el: 26, d: 2350, tx: 400, ty: 10, tz: 235 };
    let drag = null;
    const cv = canvas.current;
    const down = (e) => {
        drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el };
      },
      up = () => {
        drag = null;
      };
    const move = (e) => {
      if (!drag) return;
      cam.az = drag.az - (e.clientX - drag.x) * 0.35;
      cam.el = Math.max(4, Math.min(85, drag.el + (e.clientY - drag.y) * 0.3));
    };
    const wheel = (e) => {
      e.preventDefault();
      cam.d = Math.max(700, Math.min(3200, cam.d * (e.deltaY > 0 ? 1.08 : 0.92)));
    };
    const dbl = () => {
      cam.az = 32;
      cam.el = 26;
      cam.d = 2350;
    };
    cv.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);
    cv.addEventListener('wheel', wheel, { passive: false });
    cv.addEventListener('dblclick', dbl);
    const proj = (p, w, h) => {
      const v = new THREE.Vector3(p[0], p[2], -p[1]).project(camera);
      return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
    };
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = cv.clientWidth;
      if (!w) return;
      const h = 404;
      cv.style.height = h + 'px';
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr)) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      const bg = new THREE.Color(theme('--bg') || '#f1f5f9');
      renderer.setClearColor(bg);
      scene.fog.color.copy(bg);
      const t = nowRender(),
        K = 'calul_robot|',
        q = [1, 2, 3, 4, 5, 6].map((i) => sample(K, 'q' + i, t));
      if (q[0] === null) {
        renderer.render(scene, camera);
        return;
      }
      J.j1.rotation.set(0, 0, q[0] * D2R);
      J.j2.rotation.set(0, q[1] * D2R, 0);
      J.j3.rotation.set(0, q[2] * D2R, 0);
      J.j4.rotation.set(q[3] * D2R, 0, 0);
      J.j5.rotation.set(0, q[4] * D2R, 0);
      J.j6.rotation.set(q[5] * D2R, 0, 0);
      const vf = sample('calul_vac|', 'front', t) ?? 0,
        vb = sample('calul_vac|', 'back', t) ?? 0;
      const hF = vf < -50 && (sample(K, 'tc', t) ?? 0) > 0.5,
        hB = vb < -50 && (sample(K, 'tc', t) ?? 0) > 0.5; // carriers are on the pads while suction is on
      held[0].visible = hF;
      held[1].visible = hB;
      const bF = sample('calul_tray|', 'bufF', t, true) ?? 0,
        bB = sample('calul_tray|', 'bufB', t, true) ?? 0;
      buf[0].forEach((p, b) => {
        p.visible = b < bF;
      });
      buf[1].forEach((p, b) => {
        p.visible = b < bB;
      });
      [0, 1].forEach((l) => {
        const m = sample('calul_tray|', 'm' + l, t, true) ?? 0,
          off = sample('calul_tray|', 'o' + l, t) ?? 0;
        tray[l].g.position.x = off;
        tray[l].ps.forEach((p, i) => {
          p.visible = Math.floor(m / 2 ** i) % 2 === 1;
        });
      });
      cups.forEach((c) => {
        const v = -(c.side ? vb : vf);
        c.m.color.setHex(v > 80 ? 0x22c55e : v > 15 ? 0xf59e0b : 0x374151);
      });
      const a = cam.az * D2R,
        e = cam.el * D2R;
      camera.position.set(
        cam.tx + cam.d * Math.cos(e) * Math.cos(a),
        cam.tz + cam.d * Math.sin(e),
        -(cam.ty + cam.d * Math.cos(e) * Math.sin(a))
      );
      camera.lookAt(cam.tx, cam.tz, -cam.ty);
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      const out = lbl.current.out;
      if (out) {
        const p = proj([XC, rowY(11) + 90, ZS + 40], w, h);
        out.style.transform = `translate(${(p[0] - out.offsetWidth / 2).toFixed(1)}px,${(p[1] - 10).toFixed(1)}px)`;
      }
      const cyc = sample(K, 'cycle', t, true) ?? 1,
        cid = (k) => ((k - 1) % 40) + 1;
      [
        [hF, 0],
        [hB, 1],
      ].forEach(([on, s]) => {
        const el = lbl.current['c' + s];
        if (!el) return;
        el.style.display = on ? 'block' : 'none';
        if (!on) return;
        const pos = new THREE.Vector3();
        held[s].getWorldPosition(pos);
        const p = proj([pos.x, -pos.z, pos.y + 60], w, h);
        el.textContent = `${s ? 'Back' : 'Front'} #${cid(2 * Math.max(0, cyc - 1) + 1 + s)}`;
        el.style.transform = `translate(${(p[0] - 40).toFixed(1)}px,${(p[1] - 8).toFixed(1)}px)`;
      });
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', move);
      cv.removeEventListener('wheel', wheel);
      cv.removeEventListener('dblclick', dbl);
      renderer.dispose();
    };
  }, []);
  const tag = {
    position: 'absolute',
    left: 0,
    top: 0,
    background: '#0f172a',
    color: '#fff',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };
  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <canvas ref={canvas} style={{ cursor: 'grab' }} />
      <div
        ref={(e) => {
          lbl.current.out = e;
        }}
        style={{ ...tag, background: '#0091dc' }}
      >
        TO HAll
      </div>
      <div
        ref={(e) => {
          lbl.current.c0 = e;
        }}
        style={{ ...tag, background: '#2563eb' }}
      />
      <div
        ref={(e) => {
          lbl.current.c1 = e;
        }}
        style={{ ...tag, background: '#7c3aed' }}
      />
      <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 12, color: 'var(--muted)' }}>
        drag to rotate · wheel to zoom · double-click to reset
      </div>
    </div>
  );
}
