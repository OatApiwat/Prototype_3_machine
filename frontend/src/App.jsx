import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { start, subscribe, state } from './store.js';
import Portal from './Portal.jsx';
import MddpTab from './MddpTab.jsx';
import Placeholder from './Placeholder.jsx';

const TABS = [['portal', 'Portal'], ['mddp', 'MDDP_184'], ['calul', 'CALUL_037'], ['hall', 'HAll_013']];
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
        <button className="pill" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
      </div>
      {tab === 'portal' && <Portal go={setTab} />}
      {tab === 'mddp' && <MddpTab />}
      {tab === 'calul' && <Placeholder name="CALUL_037" />}
      {tab === 'hall' && <Placeholder name="HAll_013" />}
    </div>
  );
}
