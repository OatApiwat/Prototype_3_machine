import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { start, subscribe, state, ui, setPaused } from './store.js';
import Portal from './Portal.jsx';
import MddpTab from './MddpTab.jsx';
import CalulTab from './CalulTab.jsx';
import HallTab from './HallTab.jsx';

const TABS = [['portal', 'Portal'], ['mddp', 'MDDP Process'], ['calul', 'CALUL Process'], ['hall', 'HAll Process']];
let ver = 0; const snap = () => ver; const sub = (f) => subscribe(() => { ver++; f(); });
export default function App() {
  useSyncExternalStore(sub, snap);
  const [tab, setTab] = useState(() => localStorage.getItem('ui.tab') || 'portal');
  const [theme, setTheme] = useState(() => localStorage.getItem('ui.theme') || 'light');
  useEffect(() => { start(); }, []);
  useEffect(() => { localStorage.setItem('ui.tab', tab); }, [tab]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('ui.theme', theme); }, [theme]);
  return (
    <div className="app">
      <div className="tabbar">
        {TABS.map(([id, label]) => <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>)}
        <span className="spacer" />
        <span className="status"><span className={'dot' + (state.connected ? ' on' : '')} />{state.connected ? 'live from InfluxDB' : 'reconnecting…'}</span>
        <button className="pill" onClick={() => setPaused(ui.pausedAt === null)}>{ui.pausedAt === null ? '⏸ Pause' : '▶ Live'}</button>
        <button className="pill" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
      </div>
      {tab === 'portal' && <Portal go={setTab} />}
      {tab === 'mddp' && <MddpTab />}
      {tab === 'calul' && <CalulTab />}
      {tab === 'hall' && <HallTab />}
    </div>
  );
}
