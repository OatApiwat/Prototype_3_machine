import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { nowRender, sample, keysWith } from './store.js';
import { theme } from './Live.jsx';

const XS = 2650, XOV = 1900, Y_BELT = 395, HZ = 640, TRAY_L = 230, ROW_P = 60, NCAR = 12, D2R = Math.PI / 180;
const GLUE0 = [134, 239, 172], GLUE1 = [21, 128, 61];
const mat = (c, r = 0.5, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const box = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
function cyl(g, axis, r, len, m, x, y, z) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), m); if (axis === 'x') o.rotation.z = Math.PI / 2; else if (axis === 'z') o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }

const LABELS = [['Blower', [0, 1300, 0]], ['Blower Motor', [820, 1850, 0]], ['Plate Heater', [400, 980, 360]], ['Thermometer', [-300, 700, 300]], ['Vibration sensor', [820, 1520, 215]], ['Conveyor', [-1000, 330, 440]], ['IN (from CALUL)', [XS + 60, 520, 0]], ['OUT', [-XS - 60, 520, 0]]];

export default function Hall3D() {
  const canvas = useRef(null), lab = useRef(null);
  useEffect(() => {
    let renderer; const cv = canvas.current;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return undefined; }
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 3, 100, 30000); scene.fog = new THREE.Fog(0xeef2f7, 8000, 16000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-1500, 4200, 3000); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3600, right: 3600, top: 2400, bottom: -2400, near: 500, far: 9000 }); sun.shadow.bias = -0.0005; scene.add(sun);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(16000, 9000), mat(0xcfd6df, 0.95, 0)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const STEEL = mat(0xe3e7ec, 0.55), DARK = mat(0x2b303a, 0.6, 0.3), GREY = mat(0x9aa3af, 0.5, 0.3);
    [-1, 1].forEach((s) => box(scene, 5500, 60, 28, STEEL, 0, Y_BELT - 40, s * 425));
    for (let lx = -2600; lx <= 2600; lx += 650) [-1, 1].forEach((s) => box(scene, 30, Y_BELT - 70, 30, GREY, lx, (Y_BELT - 70) / 2, s * 425));
    const rc = document.createElement('canvas'); rc.width = rc.height = 64; const gx = rc.getContext('2d'); gx.fillStyle = '#7e22ce'; gx.fillRect(0, 0, 64, 64); gx.fillStyle = '#d8b4fe'; gx.fillRect(0, 0, 10, 64);
    const rg = new THREE.CylinderGeometry(15, 15, 830, 12), rm = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rc), roughness: 0.5, metalness: 0.2 }), rollers = [];
    for (let x = -2700; x <= 2700; x += ROW_P) { const ro = new THREE.Mesh(rg, rm); ro.rotation.x = Math.PI / 2; ro.position.set(x, Y_BELT - 15, 0); ro.castShadow = ro.receiveShadow = true; scene.add(ro); rollers.push(ro); }
    const OH = new THREE.Group(), BOT = Y_BELT - 60, TOP = 1450; scene.add(OH);
    box(OH, 2 * XOV + 80, TOP - BOT, 30, STEEL, 0, (TOP + BOT) / 2, -HZ); box(OH, 2 * XOV + 80, 40, 2 * HZ + 40, STEEL, 0, TOP + 20, 0); box(OH, 2 * XOV + 80, 40, 2 * HZ + 40, STEEL, 0, BOT - 20, 0);
    [-1, 1].forEach((s) => { box(OH, 40, TOP - 640, 2 * HZ, STEEL, s * (XOV + 20), (TOP + 640) / 2, 0); box(OH, 40, 30, 2 * HZ, STEEL, s * (XOV + 20), BOT + 15, 0); });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2 * XOV + 40, TOP - BOT, 6), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0, depthWrite: false })); glass.position.set(0, (TOP + BOT) / 2, HZ); OH.add(glass);
    [-XOV, -XOV / 2, 0, XOV / 2, XOV].forEach((x) => box(OH, 24, TOP - BOT, 24, STEEL, x, (TOP + BOT) / 2, HZ + 6));
    box(OH, 2 * XOV + 80, 30, 30, STEEL, 0, TOP, HZ + 6); box(OH, 2 * XOV + 80, 30, 30, STEEL, 0, BOT + 15, HZ + 6);
    const heater = new THREE.Mesh(new THREE.BoxGeometry(520, 24, 720), new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.5 })); heater.position.set(0, 960, 0); OH.add(heater);
    const blower = new THREE.Group(); blower.position.set(0, 1190, 0); OH.add(blower);
    cyl(OH, 'y', 190, 150, mat(0xe5e9ee, 0.5, 0.15), 0, 1190, 0); cyl(OH, 'y', 195, 14, mat(0xaab3bf, 0.5, 0.2), 0, 1275, 0);
    for (let b = 0; b < 10; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(120, 90, 8), mat(0x8493a8, 0.4, 0.3)); bl.position.set(Math.cos(b * Math.PI / 5) * 120, 0, Math.sin(b * Math.PI / 5) * 120); bl.rotation.y = -b * Math.PI / 5; blower.add(bl); }
    cyl(OH, 'y', 16, 460, DARK, 0, 1450, 0); cyl(OH, 'y', 70, 50, mat(0x8493a8, 0.4, 0.3), 0, 1640, 0);
    const motor = new THREE.Group(); motor.position.set(820, 1660, 0); OH.add(motor); cyl(motor, 'y', 150, 360, mat(0x1f3b36, 0.6, 0.3), 0, 0, 0); cyl(motor, 'y', 55, 50, mat(0x8493a8, 0.4, 0.3), 0, 215, 0);
    box(OH, 820, 14, 26, DARK, 410, 1660, 0); box(OH, 160, 70, 80, mat(0x1d4ed8, 0.5, 0.2), 820, 1520, 170);
    box(OH, 6, 240, 6, mat(0xc2410c, 0.5, 0.3), 0, 840, 0); cyl(OH, 'y', 22, 40, mat(0xea580c, 0.5, 0.2), 0, 780, 0);
    // hot-air arrows circulating on an oval inside the chamber (phase comes from InfluxDB)
    const arrows = []; for (let a = 0; a < 30; a++) { const cn = new THREE.Mesh(new THREE.BoxGeometry(170, 7, 7), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.4, depthWrite: false })); scene.add(cn); arrows.push(cn); }
    const air = new THREE.Mesh(new THREE.BoxGeometry(2 * XOV - 40, 560, 2 * HZ - 60), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.08, depthWrite: false })); air.position.set(0, 660, 0); scene.add(air);
    const trayMat = (() => { const cm = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.7 }); return cm; })();
    const trays = new Map();
    const makeTray = () => { const g = new THREE.Group(), cm = trayMat.clone(); box(g, TRAY_L, 12, 760, mat(0x374151, 0.8), 0, 6, 0); for (let r = 0; r < NCAR; r++) { const o = new THREE.Mesh(new THREE.BoxGeometry(TRAY_L - 30, 8, ROW_P - 22), cm); o.position.set(0, 16, (r - (NCAR - 1) / 2) * ROW_P); o.castShadow = true; g.add(o); } g.userData.cm = cm; g.position.y = Y_BELT; scene.add(g); return g; };
    const cam = { az: -14, el: 26, d: 5200, tx: 0, ty: 780, tz: 0 }; let drag = null;
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el }; }, up = () => { drag = null; };
    const move = (e) => { if (!drag) return; cam.az = drag.az - (e.clientX - drag.x) * 0.35; cam.el = Math.max(4, Math.min(85, drag.el + (e.clientY - drag.y) * 0.3)); };
    const wheel = (e) => { e.preventDefault(); cam.d = Math.max(1800, Math.min(11000, cam.d * (e.deltaY > 0 ? 1.08 : 0.92))); };
    const dbl = () => { cam.az = -14; cam.el = 26; cam.d = 5200; };
    cv.addEventListener('mousedown', down); window.addEventListener('mouseup', up); window.addEventListener('mousemove', move); cv.addEventListener('wheel', wheel, { passive: false }); cv.addEventListener('dblclick', dbl);
    const els = LABELS.map(([n]) => { const d = document.createElement('div'); d.textContent = n; Object.assign(d.style, { position: 'absolute', left: 0, top: 0, background: '#0f172a', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap' }); lab.current.appendChild(d); return d; });
    const v = new THREE.Vector3(); let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = cv.clientWidth; if (!w) return; const h = 335; cv.style.height = h + 'px';
      const dpr = window.devicePixelRatio || 1; if (cv.width !== Math.round(w * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      const bg = new THREE.Color(theme('--bg') || '#f1f5f9'); renderer.setClearColor(bg); scene.fog.color.copy(bg);
      const t = nowRender(), K = 'hall_oven|', temp = sample(K, 'temp', t);
      if (temp === null) { renderer.render(scene, camera); return; }
      const roll = sample(K, 'roll', t) ?? 0, ang = sample(K, 'ang', t) ?? 0, flow = sample(K, 'flow', t) ?? 0, duty = sample(K, 'duty', t) ?? 50;
      rollers.forEach((ro) => { ro.rotation.y = roll; }); blower.rotation.y = ang; motor.rotation.y = ang;
      heater.material.emissiveIntensity = 0.25 + (duty / 100) * 1.1; air.material.opacity = 0.03 + 0.09 * Math.max(0, Math.min(1, (temp - 100) / 60));
      arrows.forEach((a, i) => { const u = ((i / arrows.length) + flow / 4000) % 1, th = u * 2 * Math.PI; a.position.set(Math.cos(th) * (XOV - 300), 660 + Math.sin(th) * 230, 420 * Math.sin(i * 1.7)); a.rotation.set(0, 0, th + Math.PI / 2); });
      const seen = new Set();
      for (const key of keysWith('hall_tray|')) {
        const x = sample(key, 'x', t); if (x === null) continue; seen.add(key);
        let g = trays.get(key); if (!g) { g = makeTray(); trays.set(key, g); }
        g.visible = true; g.position.x = x; const prog = Math.max(0, Math.min(1, (XOV - x) / (2 * XOV)));
        g.userData.cm.color.setRGB((GLUE0[0] + (GLUE1[0] - GLUE0[0]) * prog) / 255, (GLUE0[1] + (GLUE1[1] - GLUE0[1]) * prog) / 255, (GLUE0[2] + (GLUE1[2] - GLUE0[2]) * prog) / 255);
      }
      trays.forEach((g, k) => { if (!seen.has(k)) g.visible = false; });
      const a = cam.az * D2R, e = cam.el * D2R;
      camera.position.set(cam.tx + cam.d * Math.cos(e) * Math.sin(a), cam.ty + cam.d * Math.sin(e), cam.tz + cam.d * Math.cos(e) * Math.cos(a)); camera.lookAt(cam.tx, cam.ty, cam.tz); camera.updateMatrixWorld();
      renderer.render(scene, camera);
      LABELS.forEach(([, p], i) => { v.set(p[0], p[1], p[2]).project(camera); els[i].style.display = v.z > 1 ? 'none' : 'block'; els[i].style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-50%)`; });
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener('mousedown', down); window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', move); cv.removeEventListener('wheel', wheel); cv.removeEventListener('dblclick', dbl); els.forEach((d) => d.remove()); renderer.dispose(); };
  }, []);
  return (<div style={{ position: 'relative', overflow: 'hidden' }}><canvas ref={canvas} style={{ cursor: 'grab' }} /><div ref={lab} />
    <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 12, color: 'var(--muted)' }}>drag to rotate · wheel to zoom · double-click to reset</div></div>);
}
