import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { theme } from './Live.jsx';

const D2R = Math.PI / 180;
// machines in line order: [label, width mm-ish, height, kind colour, tab]
export default function Portal3D({ line, colors, heights, go, info }) {
  const canvas = useRef(null), tip = useRef(null);
  useEffect(() => {
    const cv = canvas.current; let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return undefined; }
    renderer.shadowMap.enabled = true;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 3, 10, 9000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.95)); const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-400, 900, 700); sun.castShadow = true; scene.add(sun);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1700, 500), new THREE.MeshStandardMaterial({ color: 0xcfd6df, roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const X0 = 190, S = 0.9, meshes = [];
    line.forEach((m, i) => {
      const w = (m.b - m.a) * S - 6, h = heights[m.k] * 1.0, d = 120 + (m.k === 'alul' || m.k === 'ha' ? 60 : 0);
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: colors[m.k], roughness: 0.6, transparent: !m.tab, opacity: m.tab ? 1 : 0.6 }));
      body.castShadow = true; body.position.y = h / 2; g.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 8, d * 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); top.position.y = h + 4; g.add(top);
      if (m.tab) { const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 8, h + 8, d + 8)), new THREE.LineBasicMaterial({ color: 0x22c55e })); fr.position.y = h / 2; g.add(fr); }
      g.position.x = ((m.a + m.b) / 2 - X0 - 750) * S; scene.add(g); body.userData.i = i; meshes.push(body);
    });
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let hover = -1;
    const cam = { az: -14, el: 20, d: 1250 }; let drag = null, moved = false;
    const down = (e) => { drag = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el }; moved = false; }, up = () => { drag = null; };
    const move = (e) => {
      const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (drag) { cam.az = drag.az - (e.clientX - drag.x) * 0.3; cam.el = Math.max(5, Math.min(80, drag.el + (e.clientY - drag.y) * 0.3)); if (Math.abs(e.clientX - drag.x) > 3) moved = true; }
      ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(meshes)[0]; hover = hit ? hit.object.userData.i : -1;
      const t = tip.current; if (hover >= 0 && !drag) { t.style.display = 'block'; t.style.left = e.clientX - r.left + 12 + 'px'; t.style.top = e.clientY - r.top + 12 + 'px'; const m = line[hover]; t.innerHTML = `<b>${m.n}</b><br>${m.tab ? info(m.tab) + ' — click to open' : 'Not connected — no data'}`; } else t.style.display = 'none';
      cv.style.cursor = hover >= 0 && line[hover].tab ? 'pointer' : 'grab';
    };
    const click = () => { if (!moved && hover >= 0 && line[hover].tab) go(line[hover].tab); };
    const wheel = (e) => { e.preventDefault(); cam.d = Math.max(700, Math.min(2500, cam.d * (e.deltaY > 0 ? 1.08 : 0.92))); };
    cv.addEventListener('mousedown', down); window.addEventListener('mouseup', up); window.addEventListener('mousemove', move); cv.addEventListener('click', click); cv.addEventListener('wheel', wheel, { passive: false });
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw); const w = cv.clientWidth; if (!w) return; const h = Math.round(w * 0.3); cv.style.height = h + 'px';
      const dpr = window.devicePixelRatio || 1; if (cv.width !== Math.round(w * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      renderer.setClearColor(new THREE.Color(theme('--panel') || '#fff'));
      const a = cam.az * D2R, e = cam.el * D2R; camera.position.set(cam.d * Math.cos(e) * Math.sin(a), 100 + cam.d * Math.sin(e), cam.d * Math.cos(e) * Math.cos(a)); camera.lookAt(0, 70, 0); renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener('mousedown', down); window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', move); cv.removeEventListener('click', click); cv.removeEventListener('wheel', wheel); renderer.dispose(); };
  }, []);
  return (<div style={{ position: 'relative' }}><canvas ref={canvas} style={{ cursor: 'grab' }} /><div ref={tip} className="mach" style={{ position: 'absolute', display: 'none', pointerEvents: 'none', textAlign: 'left', color: 'var(--text)' }} /></div>);
}
