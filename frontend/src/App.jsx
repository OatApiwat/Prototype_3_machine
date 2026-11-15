import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { start, subscribe, state, ui, setPaused, setTab as setStoreTab } from './store.js';
import Portal from './Portal.jsx';
import MddpTab from './MddpTab.jsx';
import CalulTab from './CalulTab.jsx';
import HallTab from './HallTab.jsx';

const MACHINES = { mddp: 'MDDP_184', calul: 'CALUL_037', hall: 'HAll_013' };
const DASHES = [['sensor', 'Sensor Dashboard'], ['productivity', 'Productivity Dashboard'], ['maintenance', 'Maintenance Dashboard']];
const SENSOR = { mddp: MddpTab, calul: CalulTab, hall: HallTab };
function parse() { const m = /^#\/m\/(mddp|calul|hall)\/(sensor|productivity|maintenance)$/.exec(location.hash); return m ? { m: m[1], d: m[2] } : { m: null, d: 'sensor' }; }
let ver = 0; const snap = () => ver; const sub = (f) => subscribe(() => { ver++; f(); });

function Coming({ machine, dash }) {
  return <div className="card" style={{ textAlign: 'center', padding: '60px 20px', marginTop: 12 }}>
    <h2 style={{ margin: 0 }}>{DASHES.find((d) => d[0] === dash)[1]}</h2>
    <div style={{ color: 'var(--muted)', marginTop: 8 }}>{MACHINES[machine]} · this dashboard is not built yet</div>
  </div>;
}

export default function App() {
  useSyncExternalStore(sub, snap);
  const [loc, setLocState] = useState(parse);
  const setLoc = (l) => { const h = l.m ? `#/m/${l.m}/${l.d}` : '#/'; if (location.hash !== h) location.hash = h; else setLocState(l); };   // hash routing: back button, refresh and direct links work
  useEffect(() => { const f = () => setLocState(parse()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') setMenu(null); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const [theme, setTheme] = useState(() => localStorage.getItem('ui.theme') || 'light');
  const [menu, setMenu] = useState(null);   // { m, x, y } dropdown opened by clicking a machine in the Portal
  useEffect(() => { start(); }, []);
  useEffect(() => { setStoreTab(loc.m || 'portal'); window.scrollTo(0, 0); }, [loc]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ui.theme', theme); }, [theme]);
  const Page = loc.m && loc.d === 'sensor' ? SENSOR[loc.m] : null;
  return (
    <div className="app">
      <div className="tabbar">
        {loc.m
          ? <><button className="pill" onClick={() => setLoc({ m: null, d: 'sensor' })}>← Portal</button>
            <b style={{ margin: '0 8px 4px' }}>{MACHINES[loc.m]}</b>
            <select className="pill" value={loc.d} onChange={(e) => setLoc({ m: loc.m, d: e.target.value })}>{DASHES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></>
          : <b style={{ margin: '4px 8px' }}>Portal</b>}
        <span className="spacer" />
        <span className="status"><span className={'dot' + (state.connected ? ' on' : '')} />{state.connected ? 'live from InfluxDB' : 'reconnecting…'}</span>
        {loc.m && loc.d === 'sensor' && <button className="pill" onClick={() => setPaused(ui.pausedAt === null)}>{ui.pausedAt === null ? '⏸ Pause' : '▶ Live'}</button>}
        <button className="pill" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
      </div>
      {!loc.m && <Portal go={(m, x, y) => setMenu({ m, x, y })} />}
      {Page && <Page />}
      {loc.m && !Page && <Coming machine={loc.m} dash={loc.d} />}
      {menu && <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenu(null)} />
        <div className="pmenu" style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 150) }}>
          <div className="pmh">{MACHINES[menu.m]}</div>
          {DASHES.map(([id, n]) => <button key={id} onClick={() => { setMenu(null); setLoc({ m: menu.m, d: id }); }}>{n}</button>)}
        </div></>}
    </div>
  );
}
