// Ported verbatim from the legacy single-file dashboard (Portal tab): geometry, labels and interaction. Live numbers come from env.live().
/* eslint-disable */
export function initPortal(env) {
  var core = env.core, THREE = env.THREE, W = env.W;
  function $(i) { return document.getElementById(i); }
  var X0 = 190, XT = 1695;   // line extent in the reference picture (px)
  // name, label, kind, x0, x1 (reference picture px), live (id, tab)
  var LINE = [
    { n: 'Loader', l: '', k: 'load', a: 190, b: 235, d: 'Input module' },
    { n: 'MDDP', l: 'MDDP', k: 'mddp', a: 235, b: 325, d: 'Glue dispensing' },
    { n: 'HMA', l: 'HMA', k: 'hma', a: 325, b: 380, d: 'Handling module' },
    { n: 'DTC', l: 'DTC', k: 'dtc', a: 380, b: 467, d: 'DTC process module (1 of 3)' },
    { n: 'DTC', l: 'DTC', k: 'dtc', a: 467, b: 553, d: 'DTC process module (2 of 3)' },
    { n: 'DTC', l: 'DTC', k: 'dtc', a: 553, b: 640, d: 'DTC process module (3 of 3)' },
    { n: 'UVL', l: 'UVL', k: 'uvl', a: 640, b: 695, d: 'UV module' },
    { n: 'HPC5L', l: 'HPC5L', k: 'hpc', a: 695, b: 765, d: 'Process module' },
    { n: 'CPM 5L', l: 'CPM 5L', k: 'hpc', a: 765, b: 835, d: 'Process module' },
    { n: 'MDDP', l: 'MDDP', k: 'mddp', a: 835, b: 920, d: 'Glue dispensing' },
    { n: 'MDDP', l: 'MDDP', k: 'mddp', a: 920, b: 1005, d: 'Glue dispensing' },
    { n: 'MDDP', l: 'MDDP', k: 'mddp', a: 1005, b: 1090, d: 'Glue dispensing' },
    { n: 'UVL', l: 'UVL', k: 'uvl', a: 1090, b: 1135, d: 'UV module' },
    { n: 'MDDP_184', l: 'MDDP', k: 'mddp', a: 1135, b: 1210, d: 'Glue dispensing', live: 'mddp', tab: 'tab1' },
    { n: 'HPC5L', l: 'HPC5L', k: 'hpc', a: 1210, b: 1285, d: 'Process module' },
    { n: 'CPM 5L', l: 'CPM 5L', k: 'hpc', a: 1285, b: 1365, d: 'Process module' },
    { n: 'HMA', l: 'HMA', k: 'hma', a: 1365, b: 1420, d: 'Handling module' },
    { n: 'CALUL_037', l: 'ALUL', k: 'alul', a: 1420, b: 1530, d: 'KUKA pick and place into HAll trays', live: 'calul', tab: 'tab2' },
    { n: 'HAll_013', l: 'HA', k: 'ha', a: 1550, b: 1695, d: 'Convection oven (curing)', live: 'hall', tab: 'tab3' }
  ];
  var KH = { load: 150, mddp: 172, hma: 150, dtc: 150, uvl: 150, hpc: 140, mddp3: 172, alul: 205, ha: 195 };
  var tipEl = $('ptip'), hover = -1, M = false, dirty = true;

  function fmt(v, d) { return v.toFixed(d); }
  function live(m, t) {
    try {
      return env.live(m.live);
    } catch (e) { }
    return ['Status: running (simulated)'];
  }
  function showTip(i, mx, my, t) {
    if (i < 0) { tipEl.style.display = 'none'; return; }
    var m = LINE[i], ln = m.live ? live(m, t) : ['Not connected – no data'];
    tipEl.innerHTML = '<b>' + m.n + '</b><div class="pt-d">' + m.d + '</div>' + ln.map(function (x) { return '<div>' + x + '</div>'; }).join('') + (m.live ? '<div class="pt-go">Click to open</div>' : '');
    tipEl.style.display = 'block';
    var host = $('pline'), w = host.clientWidth, tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var x = mx + 16, y = my + 16; if (x + tw > w - 6) x = mx - 16 - tw; if (y + th > host.clientHeight - 6) y = my - 16 - th;
    tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
  }
  function open(m) { if (!m.live) return; env.go({ tab1: 'mddp', tab2: 'calul', tab3: 'hall' }[m.tab]); }

  // ---------- 2D ----------
  var c2 = $('pc2'), g2 = c2.getContext('2d'), geo2 = [];
  function box(g, x, y, w, h, fill, line) { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeStyle = line || '#1f2937'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); }
  function unit2(g, m, x, w, top, h, y0) {   // detailed front elevation of one machine
    var k = m.k, on = !!m.live, yb = y0 - 7, H = yb - top, bh = H * 0.36, uh = H - bh, uy = top, ly = top + uh;
    function feet() { g.fillStyle = '#1f2937'; [x + 4, x + w - 12].forEach(function (fx) { g.fillRect(fx, yb, 8, 4); g.fillRect(fx + 2, yb + 4, 4, 3); }); }
    function tower(tx, ty) { g.fillStyle = '#475569'; g.fillRect(tx - 1, ty - 30, 3, 30); [['#ef4444', '#7f1d1d'], ['#f59e0b', '#78350f'], ['#22c55e', '#14532d']].forEach(function (c, i) { box(g, tx - 4, ty - 42 + i * 8 - 0, 9, 8, i === 2 && on ? c[0] : c[1], '#111827'); }); }
    function handle(hx, hy, len) { g.fillStyle = '#e5e7eb'; g.fillRect(hx, hy, 3, len); g.strokeStyle = '#374151'; g.strokeRect(hx + .5, hy + .5, 2, len - 1); }
    function vent(vx, vy, vw, n) { g.strokeStyle = 'rgba(15,23,42,.45)'; g.lineWidth = 1; for (var i = 0; i < n; i++) { g.beginPath(); g.moveTo(vx, vy + i * 4 + .5); g.lineTo(vx + vw, vy + i * 4 + .5); g.stroke(); } }
    function monitor(mx, my, mw) { g.strokeStyle = '#374151'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx + mw / 2, my + mw * 0.62); g.lineTo(mx + mw / 2, my + mw * 0.62 + 12); g.stroke(); g.lineWidth = 1; box(g, mx, my, mw, mw * 0.62, '#111827', '#000'); g.fillStyle = on ? '#38bdf8' : '#334155'; g.fillRect(mx + 2, my + 2, mw - 4, mw * 0.62 - 4); if (on) { g.fillStyle = '#e0f2fe'; g.fillRect(mx + 4, my + 4, mw * 0.4, 2); g.fillRect(mx + 4, my + 8, mw * 0.6, 2); } }
    function doors(dx, dy, dw, dh, n, col, line) { var ew = dw / n; for (var i = 0; i < n; i++) { box(g, dx + i * ew, dy, ew, dh, col, line); handle(dx + i * ew + (i % 2 ? 5 : ew - 8), dy + dh * 0.3, Math.min(18, dh * 0.4)); } }
    function glass(gx, gy, gw, gh, tint) { box(g, gx, gy, gw, gh, tint, '#334155'); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx + gw * 0.15, gy + gh - 4); g.lineTo(gx + gw * 0.55, gy + 4); g.stroke(); g.lineWidth = 1; }
    if (k === 'mddp') {
      box(g, x, uy, w, uh, '#4f63ad', '#1e2a5a');                                   // blue frame
      box(g, x + 4, uy + 4, w - 8, 9, '#f0a95a', '#7c3f0e');                         // header
      glass(x + 6, uy + 16, w - 12, uh - 24, 'rgba(217,130,43,.85)');               // dispensing chamber window
      g.strokeStyle = '#1f2937'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 10, uy + 30); g.lineTo(x + w - 10, uy + 30); g.stroke(); g.lineWidth = 1;   // gantry
      box(g, x + w * 0.42, uy + 30, 9, 18, '#374151'); g.fillStyle = '#f97316'; g.fillRect(x + w * 0.42 + 3, uy + 48, 3, 6);   // dispense head
      box(g, x + w * 0.3, ly - 14, w * 0.4, 8, '#9ca3af');                           // carrier on conveyor
      box(g, x, ly, w, bh, '#b5651d', '#7c3f0e'); doors(x + 3, ly + 4, w - 6, bh - 8, 2, '#c2711f', '#7c3f0e'); vent(x + 8, ly + bh - 16, w - 16, 3);
      box(g, x + w / 2 - 12, uy - 10, 24, 10, '#2f8f9d', '#134e4a'); tower(x + 8, uy);
      monitor(x + w - 22, uy + 20, 18);
    } else if (k === 'hma') {
      box(g, x, uy, w, uh, '#e8913a', '#7c3f0e'); glass(x + 5, uy + 12, w - 10, uh * 0.55, 'rgba(243,179,107,.9)'); box(g, x + 5, uy + uh * 0.72, w - 10, uh * 0.2, '#d97706', '#7c3f0e');
      [0, 1, 2].forEach(function (i) { g.fillStyle = ['#22c55e', '#f59e0b', '#ef4444'][i]; g.beginPath(); g.arc(x + 12 + i * 10, uy + uh * 0.82, 3, 0, 6.28); g.fill(); });
      box(g, x, ly, w, bh, '#6b7280'); doors(x + 3, ly + 4, w - 6, bh - 8, 1, '#7b8494', '#374151'); tower(x + w - 8, uy);
    } else if (k === 'dtc') {
      box(g, x, uy, w, uh, '#d4d4d8'); box(g, x, uy, w, 12, '#6b7280'); g.fillStyle = '#9ca3af'; g.fillRect(x + 4, uy + 14, w - 8, 4);   // overhead transfer rail
      glass(x + 5, uy + 22, w - 10, uh - 30, 'rgba(226,232,240,.95)'); g.strokeStyle = '#94a3b8'; g.beginPath(); g.moveTo(x + w / 2, uy + 22); g.lineTo(x + w / 2, uy + uh - 8); g.stroke();
      box(g, x + w * 0.25, uy + uh - 26, w * 0.5, 14, '#64748b');                    // process head
      box(g, x, ly, w, bh, '#c0c4cc'); doors(x + 3, ly + 4, w - 6, bh - 8, 2, '#cfd3da', '#6b7280'); vent(x + 8, ly + bh - 14, w - 16, 2); tower(x + w - 9, uy);
    } else if (k === 'uvl') {
      box(g, x, uy, w, uh, '#d6cfa8', '#6b6650'); box(g, x + 6, uy + 14, w - 12, 28, on ? '#5eead4' : '#2dd4bf', '#0f766e'); g.fillStyle = 'rgba(167,139,250,.6)'; g.fillRect(x + 8, uy + 16, w - 16, 6);
      monitor(x + w / 2 - 12, uy - 22, 24); vent(x + 6, uy + 50, w - 12, 5);
      box(g, x, ly, w, bh, '#a8a384', '#6b6650'); box(g, x + 4, ly + 10, w * 0.25, 14, '#374151'); box(g, x + w - 4 - w * 0.25, ly + 10, w * 0.25, 14, '#374151'); handle(x + w / 2 - 1, ly + 30, 14);
    } else if (k === 'hpc') {
      box(g, x, uy, w, uh, '#8b5a3c', '#3f2616'); glass(x + 5, uy + 12, w - 10, uh - 22, 'rgba(176,101,42,.9)');
      box(g, x + w * 0.35, uy + 22, w * 0.3, 10, '#1f2937'); g.fillStyle = '#facc15'; g.fillRect(x + w * 0.48, uy + 32, 3, 10);   // press head
      monitor(x + w - 20, uy - 18, 18);
      box(g, x, ly, w, bh, '#8f9bb3', '#475569'); box(g, x + 6, ly + 10, w * 0.2, 14, '#e5e7eb'); box(g, x + w - 6 - w * 0.2, ly + 10, w * 0.2, 14, '#e5e7eb'); doors(x + 4, ly + 30, w - 8, bh - 36, 2, '#9aa5bb', '#475569'); tower(x + 7, uy);
    } else if (k === 'alul') {
      box(g, x, uy, w, uh, '#1e3a8a', '#0f172a'); glass(x + 7, uy + 18, w - 14, uh - 30, 'rgba(154,167,189,.9)');
      g.strokeStyle = '#f97316'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w * 0.35, uy + uh - 16); g.lineTo(x + w * 0.4, uy + uh * 0.45); g.lineTo(x + w * 0.65, uy + uh * 0.35); g.stroke(); g.lineWidth = 1; g.lineCap = 'butt';   // KUKA arm
      box(g, x + w * 0.28, uy + uh - 18, w * 0.16, 10, '#374151');
      box(g, x + w / 2 - 14, uy - 12, 28, 12, '#2f8f9d', '#134e4a'); tower(x + 9, uy);
      box(g, x, ly, w, bh, '#334155', '#0f172a'); doors(x + 4, ly + 4, w - 8, bh - 8, 2, '#475569', '#0f172a');
      box(g, x + w - 16, uy + 20, 12, 30, '#cbd5e1', '#334155'); [0, 1, 2].forEach(function (i) { g.fillStyle = ['#22c55e', '#facc15', '#ef4444'][i]; g.beginPath(); g.arc(x + w - 10, uy + 26 + i * 9, 2.5, 0, 6.28); g.fill(); });
    } else if (k === 'ha') {
      box(g, x, uy, w, H, '#b8bec7', '#4b5563'); var rh = (H - 8) / 3;
      for (var r = 0; r < 3; r++) { box(g, x + 6, uy + 6 + r * rh, w - 34, rh - 6, '#d1d5db', '#6b7280'); g.fillStyle = '#9ca3af'; g.fillRect(x + 12, uy + 6 + r * rh + rh * 0.42, w - 46, 4); handle(x + w - 40, uy + 10 + r * rh, rh * 0.5); }
      box(g, x + w - 24, uy + 8, 18, 46, '#1f2937'); g.fillStyle = on ? '#f87171' : '#7f1d1d'; g.fillRect(x + w - 21, uy + 12, 12, 8); [0, 1, 2].forEach(function (i) { g.fillStyle = '#e5e7eb'; g.fillRect(x + w - 20, uy + 26 + i * 8, 10, 4); });
      box(g, x + w * 0.2, uy - 12, w * 0.2, 12, '#9ca3af'); box(g, x + w * 0.62, uy - 8, w * 0.12, 8, '#6b7280'); tower(x + w - 12, uy);
    } else {
      box(g, x, uy, w, uh, '#7c8aa5'); monitor(x + 5, uy + 10, w - 10); box(g, x, ly, w, bh, '#cbd5e1'); doors(x + 3, ly + 4, w - 6, bh - 8, 1, '#d6dde7', '#64748b');
    }
    feet();
  }
  function draw2() {
    var w = c2.clientWidth, h = c2.clientHeight, dpr = (window.devicePixelRatio || 1) * core.scale();
    if (!w) return;
    if (c2.width !== Math.round(w * dpr)) { c2.width = Math.round(w * dpr); c2.height = Math.round(h * dpr); }
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, w, h);
    var sx = (w - 40) / (XT - X0), y0 = h - 44; geo2 = [];
    g2.fillStyle = '#e2e8f0'; g2.fillRect(0, y0, w, 6); g2.fillStyle = '#cbd5e1'; g2.fillRect(0, y0 + 6, w, 2);
    LINE.forEach(function (m, i) {
      var x = 20 + (m.a - X0) * sx, ww = (m.b - m.a) * sx, hh = KH[m.k] * Math.min(1.3, (h - 130) / 205), top = y0 - hh;
      geo2.push({ x: x, y: top - 50, w: ww, h: hh + 50 });
      unit2(g2, m, x, ww - 2, top, hh, y0);
      if (i === hover) { g2.fillStyle = 'rgba(255,255,255,.22)'; g2.fillRect(x, top, ww - 2, hh); g2.strokeStyle = '#2563eb'; g2.lineWidth = 3; g2.strokeRect(x - 1, top - 1, ww, hh + 2); }
      if (m.live) {
        g2.strokeStyle = '#22c55e'; g2.lineWidth = 3; g2.strokeRect(x - 5, top - 48, ww + 6, hh + 52);
        g2.font = 'bold 16px "Segoe UI", Arial, sans-serif'; var tw = g2.measureText(m.n).width + 22, cx = x - 5 + (ww + 6) / 2 - tw / 2;
        g2.fillStyle = '#22c55e'; g2.fillRect(cx, top - 76, tw, 26); g2.fillStyle = '#0f172a'; g2.textAlign = 'center'; g2.fillText(m.n, cx + tw / 2, top - 57);
      }
      g2.fillStyle = '#94a3b8'; g2.font = '12px "Segoe UI", Arial, sans-serif'; g2.textAlign = 'center'; if (m.l) g2.fillText(m.l, x + ww / 2, y0 + 24);
    });
  }
  c2.addEventListener('mousemove', function (e) {
    var r = c2.getBoundingClientRect(), s = core.scale(), x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s, f = -1;
    geo2.forEach(function (q, i) { if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) f = i; });
    if (f !== hover) { hover = f; dirty = true; } c2.style.cursor = f >= 0 && LINE[f].live ? 'pointer' : 'default';
    var pr = $('pline').getBoundingClientRect(); showTip(f, (e.clientX - pr.left) / s, (e.clientY - pr.top) / s, core.getT());
    if (dirty) draw2();
  });
  c2.addEventListener('mouseleave', function () { hover = -1; dirty = true; showTip(-1); draw2(); });
  c2.addEventListener('click', function () { if (hover >= 0) open(LINE[hover]); });

  // ---------- 3D ----------
  var P3 = { tried: false }, cam = { az: -8, el: 13, d: 9200, tx: 0, ty: 1100, tz: 0 }, v3 = $('pv3'), cv3 = $('pc3'), lab3 = $('plabels'), groups = [], labs = [], ray = null, mouse = null, dragP = null;
  var KC = { load: [0x8a94a6, 0xb6bdc9], mddp: [0xb5651d, 0xd9822b], mddp3: [0xb5651d, 0xd9822b], hma: [0x6b7280, 0xe8913a], dtc: [0xc0c4cc, 0xd4d4d8], uvl: [0xa8a384, 0xd6cfa8], hpc: [0x8f9bb3, 0x8b5a3c], alul: [0x334155, 0x1e3a8a], ha: [0xb8bec7, 0xb8bec7] };
  function lm(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.12, emissive: 0x000000 }); }
  function bx(g, w, h, d, m, x, y, z) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; }
  function init3() {
    P3.tried = true; var r;
    try { r = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, alpha: false, preserveDrawingBuffer: true }); } catch (e) { r = null; }
    P3.r = r; if (!r) return;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; (window.__R3=window.__R3||[]).push(r), r.setClearColor(window.__bg3c());
    var sc = P3.scene = new THREE.Scene(); P3.cam = new THREE.PerspectiveCamera(30, 3, 100, 60000);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-4000, 9000, 7000); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sh = sun.shadow.camera; sh.left = -11000; sh.right = 11000; sh.top = 5000; sh.bottom = -5000; sh.near = 1000; sh.far = 26000; sun.shadow.bias = -0.0005; sc.add(sun);
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(40000, 14000), lm(0xe5e9ef)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
    var U = 12, mid = (X0 + XT) / 2;
    LINE.forEach(function (m, i) {
      var W = (m.b - m.a) * U - 30, H = KH[m.k] * U * 0.95, D = m.k === 'ha' ? 2000 : 1500, cx = ((m.a + m.b) / 2 - mid) * U, g = new THREE.Group(), cc = KC[m.k] || KC.load, bh = H * 0.36, uh = H - bh, F = D / 2, on = !!m.live;
      g.position.set(cx, 0, 0); sc.add(g);
      var mb = lm(cc[0]), mu = lm(cc[1]), mats = [mb, mu], dark = lm(0x1f2937), steel = lm(0xd1d5db), FY = 60;
      function glass3(w, h, x, y, tint) { var gm = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1 }); bx(g, w, h, 12, gm, x, y, F + 8); bx(g, w + 30, 24, 30, dark, x, y + h / 2, F + 10); bx(g, w + 30, 24, 30, dark, x, y - h / 2, F + 10); }
      function handle3(x, y, h) { bx(g, 22, h, 30, steel, x, y, F + 20); }
      function doors3(y, h, n, col) { var ew = W / n; for (var q = 0; q < n; q++) { var dx = -W / 2 + ew * (q + 0.5); bx(g, ew - 30, h - 40, 14, lm(col), dx, y, F + 7); handle3(dx + (q % 2 ? -ew / 2 + 60 : ew / 2 - 60), y + 40, Math.min(220, h * 0.4)); } }
      function tower3(x, z) { bx(g, 30, 340, 30, dark, x, H + 170, z); [[0x7f1d1d, 0xef4444], [0x78350f, 0xf59e0b], [0x14532d, 0x22c55e]].forEach(function (c, q) { var lit = q === 2 && on; var cm = new THREE.MeshStandardMaterial({ color: lit ? c[1] : c[0], emissive: lit ? c[1] : 0x000000, emissiveIntensity: lit ? 0.6 : 0, roughness: 0.4 }); var o = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 90, 16), cm); o.position.set(x, H + 380 + q * 95, z); g.add(o); }); }
      function monitor3(x, y, z, s) { bx(g, 20, 220, 20, dark, x, y - 110, z); bx(g, s, s * 0.62, 30, dark, x, y + s * 0.31, z + 20); var sm = new THREE.MeshStandardMaterial({ color: on ? 0x38bdf8 : 0x334155, emissive: on ? 0x0ea5e9 : 0x000000, emissiveIntensity: on ? 0.5 : 0 }); bx(g, s - 30, s * 0.62 - 30, 6, sm, x, y + s * 0.31, z + 38); }
      function feet3() { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) { var o = new THREE.Mesh(new THREE.CylinderGeometry(40, 55, FY, 12), dark); o.position.set(p[0] * (W / 2 - 80), FY / 2, p[1] * (D / 2 - 80)); g.add(o); }); }
      function vent3(y, w, n) { for (var q = 0; q < n; q++) bx(g, w, 14, 8, dark, 0, y + q * 40, F + 6); }
      var k = m.k;
      if (k === 'mddp') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); doors3(FY + bh / 2, bh, 2, 0xc2711f); vent3(FY + 60, W * 0.6, 3);
        [-1, 1].forEach(function (s) { bx(g, 80, uh, 80, lm(0x4f63ad), s * (W / 2 - 40), FY + bh + uh / 2, F - 40); bx(g, 80, uh, 80, lm(0x4f63ad), s * (W / 2 - 40), FY + bh + uh / 2, -F + 40); });
        bx(g, W, 100, D, lm(0x4f63ad), 0, FY + H - 50, 0); bx(g, W - 160, uh - 100, D - 160, mu, 0, FY + bh + (uh - 100) / 2, 0);
        glass3(W - 200, uh - 220, 0, FY + bh + uh / 2 - 40, 0xf0a95a);
        bx(g, W - 220, 50, 60, dark, 0, FY + bh + uh * 0.7, F + 30); bx(g, 90, 200, 90, lm(0x374151), W * 0.1, FY + bh + uh * 0.55, F + 40);
        bx(g, W * 0.35, 120, 400, lm(0x2f8f9d), 0, FY + H + 60, 0); tower3(-W / 2 + 120, F - 120); monitor3(W / 2 + 60, FY + bh + uh * 0.55, F, 420);
      } else if (k === 'hma') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); doors3(FY + bh / 2, bh, 1, 0x7b8494); bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0);
        glass3(W - 160, uh * 0.5, 0, FY + bh + uh * 0.6, 0xf3b36b); tower3(W / 2 - 100, F - 120);
        [0x22c55e, 0xf59e0b, 0xef4444].forEach(function (c, q) { var o = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 30, 12), lm(c)); o.rotation.x = Math.PI / 2; o.position.set(-W / 2 + 120 + q * 90, FY + bh + uh * 0.18, F + 15); g.add(o); });
      } else if (k === 'dtc') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); doors3(FY + bh / 2, bh, 2, 0xcfd3da); vent3(FY + 60, W * 0.6, 2);
        bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0); bx(g, W + 40, 120, D * 0.5, lm(0x6b7280), 0, FY + H + 60, 0); glass3(W - 140, uh - 260, 0, FY + bh + uh / 2 - 40, 0xe2e8f0);
        bx(g, W * 0.45, 140, 300, lm(0x64748b), 0, FY + bh + 180, F - 200); tower3(W / 2 - 100, F - 120);
      } else if (k === 'uvl') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); bx(g, W * 0.25, 150, 30, dark, -W * 0.28, FY + bh * 0.7, F + 10); bx(g, W * 0.25, 150, 30, dark, W * 0.28, FY + bh * 0.7, F + 10);
        bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0); var uvm = new THREE.MeshStandardMaterial({ color: 0x5eead4, emissive: on ? 0x8b5cf6 : 0x0f766e, emissiveIntensity: 0.4 }); bx(g, W - 120, 300, 20, uvm, 0, FY + H - 300, F + 8); vent3(FY + bh + 100, W * 0.7, 5);
        monitor3(0, FY + H + 250, 0, 300);
      } else if (k === 'hpc') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); bx(g, W * 0.2, 150, 30, steel, -W * 0.3, FY + bh * 0.75, F + 10); bx(g, W * 0.2, 150, 30, steel, W * 0.3, FY + bh * 0.75, F + 10); doors3(FY + bh * 0.35, bh * 0.6, 2, 0x9aa5bb);
        bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0); glass3(W - 140, uh - 200, 0, FY + bh + uh / 2, 0xb0652a); bx(g, W * 0.35, 120, 300, dark, 0, FY + bh + uh * 0.7, F - 200); bx(g, 40, 160, 40, lm(0xfacc15), 0, FY + bh + uh * 0.55, F - 200);
        tower3(-W / 2 + 100, F - 120); monitor3(W / 2 + 40, FY + H + 200, F - 100, 300);
      } else if (k === 'alul') {
        bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); doors3(FY + bh / 2, bh, 2, 0x475569); bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0);
        glass3(W - 220, uh - 240, -40, FY + bh + uh / 2, 0x9aa7bd);
        var arm = lm(0xf97316); bx(g, 300, 160, 300, lm(0x374151), -W * 0.15, FY + bh + 100, 0); var a1 = bx(g, 120, uh * 0.55, 120, arm, -W * 0.15, FY + bh + uh * 0.32, 0); a1.rotation.z = 0.25; var a2 = bx(g, W * 0.4, 100, 100, arm, W * 0.02, FY + bh + uh * 0.58, 0); a2.rotation.z = -0.2;
        bx(g, 160, 380, 60, steel, W / 2 - 100, FY + bh + uh * 0.7, F + 20); [0x22c55e, 0xfacc15, 0xef4444].forEach(function (c, q) { var o = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 30, 12), lm(c)); o.rotation.x = Math.PI / 2; o.position.set(W / 2 - 100, FY + bh + uh * 0.78 - q * 100, F + 55); g.add(o); });
        bx(g, W * 0.35, 140, 500, lm(0x2f8f9d), 0, FY + H + 70, 0); tower3(-W / 2 + 120, F - 120);
      } else if (k === 'ha') {
        bx(g, W, H, D, mu, 0, FY + H / 2, 0); var rh = H / 3;
        for (var r2 = 0; r2 < 3; r2++) { bx(g, W - 420, rh - 80, 20, lm(0xd1d5db), -150, FY + rh * (r2 + 0.5), F + 10); bx(g, W - 520, 40, 30, lm(0x9ca3af), -150, FY + rh * (r2 + 0.5), F + 22); handle3(W / 2 - 420, FY + rh * (r2 + 0.5), rh * 0.45); }
        bx(g, 220, 560, 40, dark, W / 2 - 160, FY + H - 360, F + 20); var dm = new THREE.MeshStandardMaterial({ color: on ? 0xf87171 : 0x7f1d1d, emissive: on ? 0xef4444 : 0, emissiveIntensity: on ? 0.6 : 0 }); bx(g, 150, 90, 10, dm, W / 2 - 160, FY + H - 160, F + 45);
        var duct = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 400, 20), lm(0x9ca3af)); duct.position.set(-W * 0.25, FY + H + 200, 0); g.add(duct); bx(g, W * 0.3, 120, D * 0.4, lm(0x6b7280), W * 0.15, FY + H + 60, 0); tower3(W / 2 - 120, F - 140);
      } else { bx(g, W, bh, D, mb, 0, FY + bh / 2, 0); bx(g, W, uh, D, mu, 0, FY + bh + uh / 2, 0); monitor3(0, FY + bh + uh * 0.35, F, W * 0.7); doors3(FY + bh / 2, bh, 1, 0xd6dde7); }
      feet3();
      g.traverse(function (o) { if (o.isMesh) o.userData.i = i; });
      if (on) { var fr = new THREE.Mesh(new THREE.BoxGeometry(W + 160, 30, D + 160), new THREE.MeshBasicMaterial({ color: 0x22c55e })); fr.position.set(0, 15, 0); g.add(fr); }
      groups.push({ g: g, mats: mats, H: H });
      var d = document.createElement('div'); d.className = 'plb' + (on ? ' live' : ''); d.textContent = on ? m.n : m.l; if (!m.l && !on) d.style.display = 'none'; lab3.appendChild(d); labs.push({ el: d, p: new THREE.Vector3(cx, on ? H + 900 : -140, on ? 0 : D / 2), on: !!(m.l || on) });
    });
    ray = new THREE.Raycaster(); mouse = new THREE.Vector2();
  }
  function pick(e) {
    var rc = cv3.getBoundingClientRect(); mouse.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(mouse, P3.cam); var hit = ray.intersectObjects(P3.scene.children, true).filter(function (h) { return h.object.userData.i !== undefined; });
    return hit.length ? hit[0].object.userData.i : -1;
  }
  function draw3() {
    if (!P3.tried) init3(); var r = P3.r; if (!r) return;
    var w = v3.clientWidth, h = v3.clientHeight, dpr = (window.devicePixelRatio || 1) * core.scale();
    if (!w) return;
    if (cv3.width !== Math.round(w * dpr) || cv3.height !== Math.round(h * dpr)) { r.setPixelRatio(dpr); r.setSize(w, h, false); P3.cam.aspect = w / h; P3.cam.updateProjectionMatrix(); }
    var D2R = Math.PI / 180, az = cam.az * D2R, el = cam.el * D2R, c = P3.cam;
    c.position.set(cam.tx + cam.d * Math.cos(el) * Math.sin(az), cam.ty + cam.d * Math.sin(el), cam.tz + cam.d * Math.cos(el) * Math.cos(az)); c.lookAt(cam.tx, cam.ty, cam.tz); c.updateMatrixWorld();
    groups.forEach(function (q, i) { q.mats.forEach(function (m) { m.emissive.setHex(i === hover ? 0x1d4ed8 : 0x000000); m.emissiveIntensity = i === hover ? 0.35 : 0; }); });
    r.render(P3.scene, c);
    var v = new THREE.Vector3(); labs.forEach(function (l) { if (!l.on) return; v.copy(l.p).project(c); l.el.style.display = v.z > 1 ? 'none' : 'block'; l.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w) + 'px,' + ((-v.y * 0.5 + 0.5) * h) + 'px) translate(-50%,-50%)'; });
  }
  cv3.addEventListener('pointerdown', function (e) { dragP = { x: e.clientX, y: e.clientY, az: cam.az, el: cam.el, moved: false }; });
  W.addEventListener('pointermove', function (e) {
    if (dragP) { var dx = e.clientX - dragP.x, dy = e.clientY - dragP.y; if (Math.abs(dx) + Math.abs(dy) > 4) dragP.moved = true; if (dragP.moved) { cam.az = dragP.az - dx * 0.35 / core.scale(); cam.el = Math.max(4, Math.min(85, dragP.el + dy * 0.3 / core.scale())); dirty = true; } }
    if (M && P3.r && e.target === cv3 && !(dragP && dragP.moved)) { var f = pick(e); hover = f; var pr = $('pline').getBoundingClientRect(), s = core.scale(); showTip(f, (e.clientX - pr.left) / s, (e.clientY - pr.top) / s, core.getT()); cv3.style.cursor = f >= 0 && LINE[f].live ? 'pointer' : 'grab'; dirty = true; }
    if (M && dirty) { draw3(); dirty = false; }
  });
  W.addEventListener('pointerup', function (e) { if (dragP && !dragP.moved && M && e.target === cv3 && P3.r) { var f = pick(e); if (f >= 0) open(LINE[f]); } dragP = null; });
  cv3.addEventListener('mouseleave', function () { hover = -1; showTip(-1); dirty = true; if (M) draw3(); });
  cv3.addEventListener('wheel', function (e) { e.preventDefault(); cam.d = Math.max(3000, Math.min(26000, cam.d * (e.deltaY > 0 ? 1.08 : 0.92))); draw3(); }, { passive: false });
  cv3.addEventListener('dblclick', function () { cam.az = -8; cam.el = 13; cam.d = 9200; draw3(); });

  // ---------- mode toggle ----------
  var chips = $('pmode').querySelectorAll('button');
  chips.forEach(function (bt, i) { bt.onclick = function () { M = i === 1; chips.forEach(function (x, j) { x.className = j === i ? 'on' : ''; }); $('p2w').style.display = M ? 'none' : 'block'; $('p3w').style.display = M ? 'block' : 'none'; hover = -1; showTip(-1); dirty = true; renderP(); }; });
  function renderP() { if (!$('tab0').clientWidth) return; if (M) draw3(); else draw2(); dirty = false; }

  // ---------- overall plant view (process picture): 2D / 3D, step 8 Milli PZT holds the line above ----------
  var PW = 1775, PH = 880;   // reference picture size (px)
  var ST = [
    { n: '1', t: 'Flexure laser sheet cut · Solder bump', o: 'Girish', x: 75, y: 440, w: 70 },
    { n: '2', t: 'Micro PZT attachment (POF)', o: 'Abhay', a: [150, 480], b: [415, 680], seg: 7 },
    { n: '3', t: 'Oven · AFT · NDE', o: 'Abhay', x: 465, y: 695, w: 60 },
    { n: '4', t: 'Flexure pre-singulation · final singulation · sorter', o: 'Girish / Arongkot', x: 600, y: 745, w: 90 },
    { n: '5', t: 'BP sorter · Load beam forming', o: 'Chartchai / Girish', x: 430, y: 330, w: 80 },
    { n: '6', t: 'ACL (auto component loading) · Laser welding', o: 'Girish', x: 640, y: 445, w: 80 },
    { n: '6.1', t: 'Flexure de-tab and forming', o: 'Girish', x: 795, y: 535, w: 45 },
    { n: '6.2', t: 'In-process cleaning', o: 'not shown in the picture', x: 870, y: 600, w: 40, flat: 1 },
    { n: '6.3', t: 'Sag · Pre-gram forming + 5 time backbend', o: 'Chartchai / Girish', x: 965, y: 655, w: 50 },
    { n: '7', t: 'Annealing process for de-gram', o: 'Chatchai', x: 1060, y: 710, w: 45 },
    { n: '7.1', t: 'Damper attached', o: 'Girish', x: 1155, y: 760, w: 45 },
    { n: '8', t: 'Milli PZT attachment', o: 'Abhay', a: [600, 110], b: [1030, 370], seg: 9, line: 1 },
    { n: '9', t: 'Fracture de-tab', o: 'Girish', x: 1110, y: 410, w: 55 },
    { n: '9.1', t: 'DSSA (GL & SA adjusting)', o: 'Abhay', x: 1215, y: 455, w: 55 },
    { n: '10', t: 'Electrical test (uPZT & mPZT)', o: 'Abhay', x: 1305, y: 520, w: 55 },
    { n: '10.1', t: 'FVMI · OQA · APD · APCM', o: 'Thongchai / Abhay', x: 1460, y: 615, w: 70 },
    { n: '10.2', t: 'CIP', o: 'Chartchai', x: 1630, y: 760, w: 35, flat: 1 },
    { n: '10.3', t: 'Packing', o: 'Chartchai / Thongchai', x: 1440, y: 780, w: 45, flat: 1 },
    { n: '10.4', t: 'Store', o: 'Prakrit', x: 1330, y: 830, w: 30, dot: 1 },
    { n: '11', t: 'Metrology – audit sampling measurement', o: 'Pornchai', x: 1240, y: 160, w: 55 }
  ];
  var LANES = [[[20, 470], [670, 860], [800, 660], [575, 520]], [[370, 400], [575, 520]], [[575, 520], [610, 470]],
    [[735, 580], [1180, 850], [1315, 630]], [[580, 185], [1330, 625], [1640, 805]], [[1640, 805], [1470, 805], [1335, 805]]];
  ST.forEach(function (s) { if (s.a) { s.x = (s.a[0] + s.b[0]) / 2; s.y = (s.a[1] + s.b[1]) / 2; } });
  var oc2 = $('oc2'), og = oc2.getContext('2d'), otip = $('otip'), oHover = -1, OM = false, oGeo = [];
  function oTip(i, mx, my) {
    if (i < 0) { otip.style.display = 'none'; return; }
    var s = ST[i];
    otip.innerHTML = '<b>Step ' + s.n + ' · ' + s.t + '</b><div>Owner: ' + s.o + '</div><div>Initial data requirements: finished</div>' + (s.line ? '<div class="pt-d">Kagra HVM_1010 Line A2202 – MDDP_184 · CALUL_037 · HAll_013 live</div><div class="pt-go">Click to view the line below</div>' : '');
    otip.style.display = 'block';
    var host = $('pover'), w = host.clientWidth, tw = otip.offsetWidth, th = otip.offsetHeight, x = mx + 16, y = my + 16;
    if (x + tw > w - 6) x = mx - 16 - tw; if (y + th > host.clientHeight - 6) y = my - 16 - th;
    otip.style.left = Math.max(4, x) + 'px'; otip.style.top = Math.max(4, y) + 'px';
  }
  function goLine() { var l = $('pline'); l.classList.remove('flash'); void l.offsetWidth; l.classList.add('flash'); l.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  // ---- overall 2D, drawn in the reference-picture coordinate system with isometric machines ----
  var IA = [0.857, 0.515], IB = [0.857, -0.515], OS = { s: 1, ox: 0, oy: 0 }, BB = null, G = null;
  function SP(x, y) { if (BB) { BB[0] = Math.min(BB[0], x); BB[1] = Math.min(BB[1], y); BB[2] = Math.max(BB[2], x); BB[3] = Math.max(BB[3], y); } return [OS.ox + x * OS.s, OS.oy + y * OS.s]; }
  function IP(cx, cy, u, v, z) { return SP(cx + IA[0] * u + IB[0] * v, cy + IA[1] * u + IB[1] * v - z); }
  function poly(pts, fill, line, lw) { G.beginPath(); pts.forEach(function (p, i) { if (i) G.lineTo(p[0], p[1]); else G.moveTo(p[0], p[1]); }); G.closePath(); if (fill) { G.fillStyle = fill; G.fill(); } if (line) { G.strokeStyle = line; G.lineWidth = lw || 1; G.stroke(); } }
  var PAL = { top: '#eef0f3', front: '#cfd4db', side: '#aab1bb', line: '#4b5563' }, PALG = { top: '#dcfce7', front: '#bbf7d0', side: '#86efac', line: '#166534' }, PALH = { top: '#dbeafe', front: '#bfdbfe', side: '#93c5fd', line: '#1d4ed8' };
  function ibox(cx, cy, L, D, H, P, z0) {   // isometric box; ground centre (cx, cy), length along the line L, depth D, height H
    z0 = z0 || 0; var a = -L / 2, b = L / 2, c = -D / 2, d = D / 2, t = z0 + H;
    poly([IP(cx, cy, a, c, t), IP(cx, cy, b, c, t), IP(cx, cy, b, d, t), IP(cx, cy, a, d, t)], P.top, P.line);
    poly([IP(cx, cy, a, c, z0), IP(cx, cy, b, c, z0), IP(cx, cy, b, c, t), IP(cx, cy, a, c, t)], P.front, P.line);
    poly([IP(cx, cy, b, c, z0), IP(cx, cy, b, d, z0), IP(cx, cy, b, d, t), IP(cx, cy, b, c, t)], P.side, P.line);
  }
  function fq(cx, cy, D, u0, u1, z0, z1, fill, line) { var v = -D / 2 - 0.3; poly([IP(cx, cy, u0, v, z0), IP(cx, cy, u1, v, z0), IP(cx, cy, u1, v, z1), IP(cx, cy, u0, v, z1)], fill, line || 'rgba(31,41,55,.7)', 0.8); }
  function sq(cx, cy, L, v0, v1, z0, z1, fill) { var u = L / 2 + 0.3; poly([IP(cx, cy, u, v0, z0), IP(cx, cy, u, v1, z0), IP(cx, cy, u, v1, z1), IP(cx, cy, u, v0, z1)], fill, 'rgba(31,41,55,.6)', 0.8); }
  function tower(cx, cy, u, v, z, live) { var p0 = IP(cx, cy, u, v, z), p1 = IP(cx, cy, u, v, z + 12); G.strokeStyle = '#374151'; G.lineWidth = 1.2; G.beginPath(); G.moveTo(p0[0], p0[1]); G.lineTo(p1[0], p1[1]); G.stroke(); ['#22c55e', '#f59e0b', '#ef4444'].forEach(function (c, i) { var q = IP(cx, cy, u, v, z + 12 + i * 3.2); G.fillStyle = i === 0 && live ? c : ['#166534', '#92400e', '#991b1b'][i]; G.fillRect(q[0] - 1.6 * OS.s * 1.4, q[1] - 2.6 * OS.s * 1.4, 3.2 * OS.s * 1.4, 2.6 * OS.s * 1.4); }); }
  function monitor(cx, cy, u, D, z) { var a = IP(cx, cy, u, -D / 2 - 6, z), b = IP(cx, cy, u, -D / 2 - 6, z + 8); G.strokeStyle = '#374151'; G.lineWidth = 1; G.beginPath(); G.moveTo(a[0], a[1]); G.lineTo(b[0], b[1]); G.stroke(); var v = -D / 2 - 6; poly([IP(cx, cy, u - 6, v, z + 8), IP(cx, cy, u + 6, v, z + 8), IP(cx, cy, u + 6, v, z + 17), IP(cx, cy, u - 6, v, z + 17)], '#1f2937', '#111827'); poly([IP(cx, cy, u - 5, v - .3, z + 9), IP(cx, cy, u + 5, v - .3, z + 9), IP(cx, cy, u + 5, v - .3, z + 16), IP(cx, cy, u - 5, v - .3, z + 16)], '#38bdf8'); }
  // one machine module: cabinet, glass window, doors, kick plate, top housing, stack light, optional monitor
  function mod(cx, cy, L, D, H, P, o) {
    o = o || {}; var live = P === PALG;
    ibox(cx, cy, L, D, H * 0.42, P);                                                     // lower cabinet
    fq(cx, cy, D, -L / 2 + 1, L / 2 - 1, 0, 3, '#374151');                               // kick plate
    var nd = o.doors || (L > 34 ? 2 : 1); for (var i = 0; i < nd; i++) { var u0 = -L / 2 + 2 + i * (L - 4) / nd, u1 = u0 + (L - 4) / nd - 1.5; fq(cx, cy, D, u0, u1, 5, H * 0.42 - 3, 'rgba(255,255,255,.25)'); fq(cx, cy, D, u1 - 3, u1 - 2, H * 0.2, H * 0.32, '#f8fafc'); }
    ibox(cx, cy, L, D, H * 0.58, P, H * 0.42);                                           // upper enclosure
    fq(cx, cy, D, -L / 2 + 3, L / 2 - 3, H * 0.48, H * 0.92, o.glass || 'rgba(125,211,252,.55)');   // window
    if (o.inner) fq(cx, cy, D, -L * 0.15, L * 0.15, H * 0.5, H * 0.66, o.inner);         // tool / process head behind the glass
    sq(cx, cy, L, -D / 2 + 3, D / 2 - 3, H * 0.5, H * 0.9, 'rgba(125,211,252,.35)');
    if (o.cap) ibox(cx + IB[0] * D * 0.15, cy + IB[1] * D * 0.15, L * 0.55, D * 0.45, o.cap, P, H);   // top housing
    if (o.tower !== false) tower(cx, cy, L / 2 - 3, D / 2 - 4, H + (o.cap || 0), live);
    if (o.mon) monitor(cx, cy, -L / 2 + 6, D, H * 0.58);
  }
  function circ(x, y, r, fill, line) { var p = SP(x, y); SP(x - r, y - r); SP(x + r, y + r); G.beginPath(); G.arc(p[0], p[1], r * OS.s, 0, 6.2832); G.fillStyle = fill; G.fill(); G.strokeStyle = line; G.lineWidth = 1.5; G.stroke(); }
  function tiltPanel(x, y, L, D, label) { poly([IP(x, y, -L / 2, -D / 2, 0), IP(x, y, L / 2, -D / 2, 0), IP(x, y, L / 2, D / 2, 0), IP(x, y, -L / 2, D / 2, 0)], '#bfd7f2', '#5b7fb3', 1.2); if (label) { var p = SP(x, y); G.save(); G.translate(p[0], p[1]); G.rotate(Math.atan2(IA[1], IA[0])); G.fillStyle = '#5b7fb3'; G.font = 'italic 600 ' + Math.max(8, 11 * OS.s) + 'px "Segoe UI", Arial, sans-serif'; G.textAlign = 'center'; label.split('\n').forEach(function (t, i) { G.fillText(t, 0, (i - 0.3) * 12 * OS.s); }); G.restore(); } }
  function table(x, y) { var L = 46, D = 26, H = 18; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { var a = IP(x, y, q[0] * (L / 2 - 2), q[1] * (D / 2 - 2), 0), b = IP(x, y, q[0] * (L / 2 - 2), q[1] * (D / 2 - 2), H); G.strokeStyle = '#4b5563'; G.lineWidth = 1.5; G.beginPath(); G.moveTo(a[0], a[1]); G.lineTo(b[0], b[1]); G.stroke(); }); ibox(x, y, L, D, 2.5, PAL, H); }
  function arrowAt(x0, y0, x1, y1) { var a = SP(x0, y0), b = SP(x1, y1), an = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 11 * OS.s + 4; G.fillStyle = '#2563eb'; G.beginPath(); G.moveTo(b[0], b[1]); G.lineTo(b[0] - h * Math.cos(an - 0.45), b[1] - h * Math.sin(an - 0.45)); G.lineTo(b[0] - h * Math.cos(an + 0.45), b[1] - h * Math.sin(an + 0.45)); G.closePath(); G.fill(); }
  function line(pts) { G.strokeStyle = '#3b82f6'; G.lineWidth = Math.max(3, 6 * OS.s); G.lineJoin = 'round'; G.lineCap = 'round'; G.beginPath(); pts.forEach(function (p, i) { var q = SP(p[0], p[1]); if (i) G.lineTo(q[0], q[1]); else G.moveTo(q[0], q[1]); }); G.stroke(); }
  function txt(t, x, y, o) { o = o || {}; var p = SP(x, y); G.font = (o.w || 600) + ' ' + Math.max(9, (o.size || 13) * OS.s) + 'px "Segoe UI", Arial, sans-serif'; G.fillStyle = o.c || '#374151'; G.textAlign = o.al || 'center'; G.fillText(t, p[0], p[1]); }
  function lineOf(x, y, n, L, D, H, P, o) { for (var i = n - 1; i >= 0; i--) { } var pts = []; for (var j = 0; j < n; j++) pts.push([x + IA[0] * L * j, y + IA[1] * L * j]); pts.sort(function (p, q) { return p[1] - q[1]; }); pts.forEach(function (p, j) { mod(p[0], p[1], L - 2, D, H, P, o); }); }
  // station painters, in the order of the step list (ST)
  var PAINT = {
    '1': function (P) { mod(40, 445, 44, 40, 58, P, { cap: 0, doors: 1, inner: '#64748b', mon: true }); mod(100, 418, 34, 36, 72, P, { doors: 1, glass: 'rgba(203,213,225,.8)', inner: '#475569' }); },
    '2': function (P) { lineOf(160, 470, 7, 44, 64, 52, P, { cap: 14, inner: '#374151', mon: false }); mod(440, 655, 30, 44, 54, P, { doors: 1, glass: 'rgba(148,163,184,.7)' }); },
    '3': function (P) { mod(468, 690, 36, 46, 56, P, { doors: 1, glass: 'rgba(148,163,184,.75)', inner: '#ef4444' }); mod(510, 712, 26, 38, 46, P, { doors: 1, inner: '#334155' }); ibox(540, 726, 14, 26, 26, P); },
    '4': function (P) { lineOf(575, 728, 3, 46, 72, 72, P, { cap: 16, inner: '#475569', mon: true }); },
    '5': function (P) { mod(400, 330, 46, 54, 88, P, { doors: 2, glass: 'rgba(226,232,240,.85)', inner: '#64748b', cap: 10 }); mod(456, 358, 40, 46, 70, P, { doors: 1, inner: '#475569' }); },
    '6': function (P) { mod(615, 445, 52, 62, 88, P, { cap: 12, inner: '#334155', mon: true }); mod(678, 478, 38, 52, 72, P, { doors: 1, glass: 'rgba(148,163,184,.8)', inner: '#ef4444' }); },
    '6.1': function (P) { mod(798, 528, 36, 40, 60, P, { doors: 1, glass: 'rgba(217,119,6,.55)', inner: '#0f766e' }); },
    '6.2': function () { tiltPanel(880, 598, 66, 22, 'In-process\nCleaning'); },
    '6.3': function (P) { mod(968, 652, 40, 42, 58, P, { doors: 1, glass: 'rgba(146,64,14,.55)', inner: '#1f2937' }); },
    '7': function (P) { mod(1060, 706, 36, 38, 56, P, { doors: 1, glass: 'rgba(203,213,225,.85)', inner: '#ef4444' }); },
    '7.1': function (P) { mod(1155, 758, 36, 42, 62, P, { doors: 1, inner: '#475569' }); },
    '8': function (P) { lineOf(590, 112, 10, 44, 74, 60, P, { cap: 16, inner: '#334155' }); mod(1040, 368, 52, 80, 66, P, { cap: 10, mon: true }); },
    '9': function (P) { mod(1112, 410, 46, 56, 66, P, { cap: 10, inner: '#334155', mon: true }); },
    '9.1': function (P) { mod(1212, 452, 44, 50, 60, P, { doors: 2, inner: '#475569', mon: true }); ibox(1262, 474, 22, 36, 34, P); },
    '10': function (P) { mod(1310, 520, 44, 50, 60, P, { doors: 2, inner: '#334155', mon: true }); circ(1372, 575, 21, '#f43f5e', '#9f1239'); },
    '10.1': function (P) { mod(1462, 610, 50, 56, 66, P, { cap: 12, inner: '#334155', mon: true }); mod(1548, 655, 44, 50, 60, P, { doors: 2, inner: '#475569' }); circ(1590, 715, 20, '#f43f5e', '#9f1239'); },
    '10.2': function () { tiltPanel(1640, 752, 54, 26, 'CIP'); },
    '10.3': function () { table(1438, 782); },
    '10.4': function () { circ(1328, 832, 21, '#86efac', '#15803d'); },
    '11': function (P) { mod(1240, 160, 46, 46, 62, P, { doors: 1, glass: 'rgba(226,232,240,.85)', inner: '#64748b', cap: 8 }); }
  };
  var LBL = [['Flexure Laser Sheet cut', 145, 357], ['Solder Bump', 190, 398], ['Micro PZT Attachment', 390, 512], ['(POF)', 340, 530], ['Oven', 452, 611], ['AFT', 482, 634], ['NDE', 527, 650], ['Flexure Pre-Singulation', 652, 669], ['Flexure Final Singulation', 705, 699], ['Flexure Sorter', 715, 728],
    ['BP Sorter', 450, 260], ['Load beam Forming', 540, 300], ['ACL( Auto component Loading)', 740, 380], ['Laser welding', 743, 415], ['Flexure De-tab and Forming', 890, 473], ['Sag, Pre-gram Forming', 1068, 590], ['+ 5 time Backbend', 1052, 610], ['Annealing process', 1120, 649], ['For De-gram', 1110, 669], ['Damper attached', 1190, 705],
    ['Milli PZT Attachment', 872, 130], ['Fracture De-tab', 1178, 350], ['DSSA (GL & SA Adjusting)', 1340, 411], ['Electrical Test', 1423, 469], ['(uPZT & mPZT)', 1425, 490], ['APD', 1495, 555], ['APCM', 1578, 603], ['Packing', 1475, 752], ['Store', 1380, 837]];
  var BADGE = { '1': [45, 528], '2': [245, 645], '3': [425, 744], '4': [575, 826], '5': [378, 421], '6': [651, 557], '6.1': [760, 600], '6.2': [845, 663], '6.3': [930, 720], '7': [1035, 794], '7.1': [1115, 822], '8': [775, 292], '9': [1138, 517], '9.1': [1327, 618], '10': [1477, 710], '10.1': [1557, 746], '10.2': [1618, 776], '10.3': [1493, 783], '10.4': [1271, 868], '11': [1212, 207] };
  function oDraw2() {
    var w = oc2.clientWidth, h = oc2.clientHeight, dpr = (window.devicePixelRatio || 1) * core.scale(); if (!w) return;
    if (oc2.width !== Math.round(w * dpr)) { oc2.width = Math.round(w * dpr); oc2.height = Math.round(h * dpr); }
    G = og; og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, w, h);
    OS.s = Math.min((w - 20) / PW, (h - 70) / PH); OS.ox = (w - PW * OS.s) / 2; OS.oy = h - PH * OS.s - 6;
    BB = null;
    og.strokeStyle = '#94a3b8'; og.lineWidth = 1; var c0 = SP(10, 4), c1 = SP(PW - 95, PH - 18); og.strokeRect(c0[0], c0[1], c1[0] - c0[0], c1[1] - c0[1]);
    LANES.forEach(line);
    arrowAt(450, 447, 560, 512); arrowAt(330, 395, 360, 420); arrowAt(592, 497, 612, 470); arrowAt(610, 205, 575, 182); arrowAt(1400, 805, 1336, 805); arrowAt(1336, 790, 1336, 812); arrowAt(1700, 805, 1655, 805);
    var hub = SP(575, 520); og.beginPath(); og.arc(hub[0], hub[1], 9 * OS.s + 2, 0, 6.2832); og.fillStyle = '#1d4ed8'; og.fill();
    var order = ST.map(function (s, i) { return i; }).sort(function (a, b) { return ST[a].y - ST[b].y; }); oGeo = [];
    order.forEach(function (i) { var s = ST[i]; BB = [1e9, 1e9, -1e9, -1e9]; PAINT[s.n](i === oHover ? PALH : (s.line ? PALG : PAL)); var a = SP(BB[0], BB[1]), b = SP(BB[2], BB[3]); BB = null; oGeo[i] = { x: a[0] - 3, y: a[1] - 3, w: b[0] - a[0] + 6, h: b[1] - a[1] + 6 }; });
    LBL.forEach(function (l) { txt(l[0], l[1], l[2], { size: 15, w: 600, c: '#1f2937' }); });
    txt('FVMI , OQA', 1412, 543, { c: '#dc2626', w: 700, size: 13 }); txt('SI', 1612, 702, { c: '#dc2626', w: 700, size: 13 });
    Object.keys(BADGE).forEach(function (k) { var p = SP(BADGE[k][0], BADGE[k][1]), fs = Math.max(11, 22 * OS.s); og.font = '800 ' + fs + 'px "Segoe UI", Arial, sans-serif'; var tw = og.measureText(k).width + 8; og.fillStyle = '#22d3ee'; og.fillRect(p[0] - tw / 2, p[1] - fs * 0.9, tw, fs * 1.15); og.fillStyle = '#0f172a'; og.textAlign = 'center'; og.fillText(k, p[0], p[1]); });
    // metrology list (as in the picture)
    txt('Metrology', 1345, 52, { w: 600, size: 15, c: '#111827' }); txt('(Audit sampling measurement)', 1345, 76, { size: 14, c: '#111827' });
    ['1. Solder bump', '2. Micro PZT,', '3. TG Forming and Sorter,', '5. LBM', '6. ACL, Laser Welding', '6.3 Sag Pre-gram Foaming,', '7.1 Damper Attached', '8. Milli PZT', '9. Fracture De-tab, DSSA, Electrical Test', '10. APD, APCM'].forEach(function (t, i) { txt(t, 1305, 108 + i * 21.5, { al: 'left', size: 14, c: '#111827' }); });
    // legend
    [['(1)   Blue: Initial Data Requirements - Finished', '#67e8f9'], ['(2)   Yellow: Initial requirements - in progress (CP 24 July 2026)', '#fde047'], ['(3)   Requirement review with PLM, DE, FA - upcoming', null]].forEach(function (l, i) {
      var p = SP(16, 806 + i * 21); og.font = Math.max(9, 14 * OS.s) + 'px "Segoe UI", Arial, sans-serif'; var tw = og.measureText(l[0]).width; if (l[1]) { og.fillStyle = l[1]; og.fillRect(p[0] + 34 * OS.s, p[1] - 13 * OS.s, tw - 34 * OS.s, 16 * OS.s); } og.fillStyle = '#111827'; og.textAlign = 'left'; og.fillText(l[0], p[0], p[1]); });
    // the line that has live pages
    var g8 = oGeo[11]; og.save(); og.strokeStyle = '#22c55e'; og.lineWidth = 2.5; og.setLineDash([7, 4]); og.strokeRect(g8.x - 6, g8.y - 6, g8.w + 12, g8.h + 12); og.restore();
    og.font = '800 ' + Math.max(11, 15 * OS.s) + 'px "Segoe UI", Arial, sans-serif'; var lt = 'Line A2202: MDDP_184 · CALUL_037 · HAll_013  ▾', ltw = og.measureText(lt).width + 14; og.fillStyle = '#22c55e'; og.fillRect(g8.x - 6, g8.y - 30, ltw, 22); og.fillStyle = '#0f172a'; og.textAlign = 'left'; og.fillText(lt, g8.x + 1, g8.y - 14);
  }
  function oFind2(x, y) { var f = -1, best = 1e12; oGeo.forEach(function (q, i) { if (q && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) { var ar = q.w * q.h; if (ar < best) { best = ar; f = i; } } }); return f; }
  oc2.addEventListener('mousemove', function (e) {
    var r = oc2.getBoundingClientRect(), s = core.scale(), f = oFind2((e.clientX - r.left) / s, (e.clientY - r.top) / s);
    if (f !== oHover) { oHover = f; oDraw2(); } oc2.style.cursor = f >= 0 && ST[f].line ? 'pointer' : 'default';
    var pr = $('pover').getBoundingClientRect(); oTip(f, (e.clientX - pr.left) / s, (e.clientY - pr.top) / s);
  });
  oc2.addEventListener('mouseleave', function () { oHover = -1; oTip(-1); oDraw2(); });
  oc2.addEventListener('click', function () { if (oHover >= 0 && ST[oHover].line) goLine(); });

  // 3D: picture plan placed on the floor (x along the picture, z down the picture)
  var O3 = { tried: false }, ocam = { az: 0, el: 40, d: 21000, tx: 0, ty: 0, tz: 400 }, ov3 = $('ov3'), oc3 = $('oc3'), olab = $('olabels'), oMeshes = [], oLabs = [], oRay = null, oMouse = null, oDrag = null;
  var SXW = 12, SZW = 17;
  function wx(px) { return (px - PW / 2) * SXW; } function wz(py) { return (py - PH / 2) * SZW; }
  function oInit3() {
    O3.tried = true; var r; try { r = new THREE.WebGLRenderer({ canvas: oc3, antialias: true, alpha: false, preserveDrawingBuffer: true }); } catch (e) { r = null; }
    O3.r = r; if (!r) return; r.shadowMap.enabled = true; (window.__R3=window.__R3||[]).push(r), r.setClearColor(window.__bg3c());
    var sc = O3.scene = new THREE.Scene(); O3.cam = new THREE.PerspectiveCamera(32, 3, 100, 90000);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-6000, 14000, 9000); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sh = sun.shadow.camera; sh.left = -13000; sh.right = 13000; sh.top = 9000; sh.bottom = -9000; sh.near = 1000; sh.far = 40000; sc.add(sun);
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(30000, 20000), lm(0xe5e9ef)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
    var laneM = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    LANES.forEach(function (L) { for (var i = 1; i < L.length; i++) { var x0 = wx(L[i - 1][0]), z0 = wz(L[i - 1][1]), x1 = wx(L[i][0]), z1 = wz(L[i][1]), len = Math.hypot(x1 - x0, z1 - z0); var m = new THREE.Mesh(new THREE.BoxGeometry(len, 12, 90), laneM); m.position.set((x0 + x1) / 2, 6, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); sc.add(m); } });
    ST.forEach(function (s, i) {
      var g = new THREE.Group(); sc.add(g); var mat = lm(s.line ? 0x86efac : 0xcbd5e1), top = lm(s.line ? 0xbbf7d0 : 0xe5e7eb); var mats = [mat, top];
      if (s.a) {
        var x0 = wx(s.a[0]), z0 = wz(s.a[1]), x1 = wx(s.b[0]), z1 = wz(s.b[1]), ang = -Math.atan2(z1 - z0, x1 - x0), len = Math.hypot(x1 - x0, z1 - z0) / s.seg;
        for (var j = 0; j < s.seg; j++) { var u = (j + 0.5) / s.seg, b = bx(g, len * 0.92, 900, 700, mat, x0 + (x1 - x0) * u, 450, z0 + (z1 - z0) * u); b.rotation.y = ang; var tp = bx(g, len * 0.6, 120, 500, top, x0 + (x1 - x0) * u, 960, z0 + (z1 - z0) * u); tp.rotation.y = ang; }
        if (s.line) { var fr = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + 500, 30, 1200), new THREE.MeshBasicMaterial({ color: 0x22c55e })); fr.position.set((x0 + x1) / 2, 15, (z0 + z1) / 2); fr.rotation.y = ang; g.add(fr); }
      } else if (s.dot) { var c = new THREE.Mesh(new THREE.CylinderGeometry(260, 260, 60, 32), lm(0x86efac)); c.position.set(wx(s.x), 30, wz(s.y)); g.add(c); mats = [c.material]; }
      else { var W = s.w * 14, H = s.flat ? 350 : 900, X3 = wx(s.x), Z3 = wz(s.y), DD = W * 0.8; bx(g, W, H, DD, mat, X3, H / 2, Z3); bx(g, W * 0.6, 20, W * 0.5, top, X3, H + 10, Z3);
        if (!s.flat) { var gm = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.6, roughness: 0.1 }); bx(g, W * 0.55, H * 0.32, 10, gm, X3 - W * 0.12, H * 0.68, Z3 + DD / 2 + 6); bx(g, W * 0.2, H * 0.2, 10, lm(0x334155), X3 + W * 0.3, H * 0.7, Z3 + DD / 2 + 6); bx(g, 18, H * 0.35, 20, lm(0xe5e7eb), X3, H * 0.28, Z3 + DD / 2 + 12);
          bx(g, 24, 260, 24, lm(0x475569), X3 + W / 2 - 40, H + 130, Z3 + DD / 2 - 40); [0x7f1d1d, 0x78350f, 0x22c55e].forEach(function (c, q) { var o = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 60, 12), lm(c)); o.position.set(X3 + W / 2 - 40, H + 290 + q * 64, Z3 + DD / 2 - 40); g.add(o); }); } }
      g.traverse(function (o) { if (o.isMesh) o.userData.oi = i; }); oMeshes.push({ mats: mats });
      var d = document.createElement('div'); d.className = 'olb' + (s.line ? ' live' : ''); d.textContent = s.line ? '8 · Milli PZT – Line A2202' : s.n; olab.appendChild(d);
      oLabs.push({ el: d, p: new THREE.Vector3(s.a ? wx(s.a[0]) : wx(s.x), s.a ? 1400 : (s.flat || s.dot ? 700 : 1300), s.a ? wz(s.a[1]) : wz(s.y)) });
    });
    oRay = new THREE.Raycaster(); oMouse = new THREE.Vector2();
  }
  function oPick(e) { var rc = oc3.getBoundingClientRect(); oMouse.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1); oRay.setFromCamera(oMouse, O3.cam); var h = oRay.intersectObjects(O3.scene.children, true).filter(function (q) { return q.object.userData.oi !== undefined; }); return h.length ? h[0].object.userData.oi : -1; }
  function oDraw3() {
    if (!O3.tried) oInit3(); var r = O3.r; if (!r) return;
    var w = ov3.clientWidth, h = ov3.clientHeight, dpr = (window.devicePixelRatio || 1) * core.scale(); if (!w) return;
    if (oc3.width !== Math.round(w * dpr) || oc3.height !== Math.round(h * dpr)) { r.setPixelRatio(dpr); r.setSize(w, h, false); O3.cam.aspect = w / h; O3.cam.updateProjectionMatrix(); }
    var D2R = Math.PI / 180, az = ocam.az * D2R, el = ocam.el * D2R, c = O3.cam;
    c.position.set(ocam.tx + ocam.d * Math.cos(el) * Math.sin(az), ocam.ty + ocam.d * Math.sin(el), ocam.tz + ocam.d * Math.cos(el) * Math.cos(az)); c.lookAt(ocam.tx, ocam.ty, ocam.tz); c.updateMatrixWorld();
    oMeshes.forEach(function (q, i) { q.mats.forEach(function (m) { m.emissive.setHex(i === oHover ? 0x1d4ed8 : 0); m.emissiveIntensity = i === oHover ? 0.35 : 0; }); });
    r.render(O3.scene, c);
    var v = new THREE.Vector3(); oLabs.forEach(function (l) { v.copy(l.p).project(c); l.el.style.display = v.z > 1 ? 'none' : 'block'; l.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w) + 'px,' + ((-v.y * 0.5 + 0.5) * h) + 'px) translate(-50%,-50%)'; });
  }
  oc3.addEventListener('pointerdown', function (e) { oDrag = { x: e.clientX, y: e.clientY, az: ocam.az, el: ocam.el, moved: false }; });
  W.addEventListener('pointermove', function (e) {
    var redraw = false;
    if (oDrag) { var dx = e.clientX - oDrag.x, dy = e.clientY - oDrag.y; if (Math.abs(dx) + Math.abs(dy) > 4) oDrag.moved = true; if (oDrag.moved) { ocam.az = oDrag.az - dx * 0.35 / core.scale(); ocam.el = Math.max(8, Math.min(88, oDrag.el + dy * 0.3 / core.scale())); redraw = true; } }
    if (OM && O3.r && e.target === oc3 && !(oDrag && oDrag.moved)) { var f = oPick(e); if (f !== oHover) { oHover = f; redraw = true; } var pr = $('pover').getBoundingClientRect(), s = core.scale(); oTip(f, (e.clientX - pr.left) / s, (e.clientY - pr.top) / s); oc3.style.cursor = f >= 0 && ST[f].line ? 'pointer' : 'grab'; }
    if (OM && redraw) oDraw3();
  });
  W.addEventListener('pointerup', function (e) { if (oDrag && !oDrag.moved && OM && e.target === oc3 && O3.r) { var f = oPick(e); if (f >= 0 && ST[f].line) goLine(); } oDrag = null; });
  oc3.addEventListener('mouseleave', function () { oHover = -1; oTip(-1); if (OM) oDraw3(); });
  oc3.addEventListener('wheel', function (e) { e.preventDefault(); ocam.d = Math.max(5000, Math.min(45000, ocam.d * (e.deltaY > 0 ? 1.08 : 0.92))); oDraw3(); }, { passive: false });
  oc3.addEventListener('dblclick', function () { ocam.az = 0; ocam.el = 40; ocam.d = 21000; oDraw3(); });
  var ochips = $('omode').querySelectorAll('button');
  ochips.forEach(function (bt, i) { bt.onclick = function () { OM = i === 1; ochips.forEach(function (x, j) { x.className = j === i ? 'on' : ''; }); $('o2w').style.display = OM ? 'none' : 'block'; $('o3w').style.display = OM ? 'block' : 'none'; oHover = -1; oTip(-1); oRender(); }; });
  function oRender() { if (!$('tab0').clientWidth) return; if (OM) oDraw3(); else oDraw2(); }

  // keep live numbers fresh while the tooltip is open, and redraw when the tab is shown / resized
  var prev = core.onRender;
  core.onRender = function (t) { if (prev) prev(t); if (!$('tab0').clientWidth) return; if (hover >= 0 && tipEl.style.display === 'block') { var m = LINE[hover]; if (m.live) { var nodes = tipEl.children, ln = live(m, t); for (var i = 0; i < ln.length && 2 + i < nodes.length; i++) nodes[2 + i].textContent = ln[i]; } } if (dirty || !c2._p) { renderP(); oRender(); c2._p = 1; } };
  W.addEventListener('resize', function () { dirty = true; c2._p = 0; });
  window.__portal = { ocam: ocam, cam: cam, setMode: function (i) { chips[i].click(); } };
  renderP(); oRender();
  return function () { env.dispose(); try { if (P3.r) P3.r.dispose(); if (O3.r) O3.r.dispose(); } catch (e) { } };
}
