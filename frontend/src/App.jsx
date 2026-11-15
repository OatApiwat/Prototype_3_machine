import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { start, subscribe, state, ui, setPaused, setTab as setStoreTab } from './lib/store.js';
import { DASHBOARDS, MACHINES, parseRoute, routeHash } from './config/machines.js';
import NavBar from './components/NavBar.jsx';
import MachineMenu from './components/MachineMenu.jsx';
import PortalPage from './pages/portal/PortalPage.jsx';
import MddpSensorPage from './features/mddp/MddpSensorPage.jsx';
import CalulSensorPage from './features/calul/CalulSensorPage.jsx';
import HallSensorPage from './features/hall/HallSensorPage.jsx';

const SENSOR_PAGES = { mddp: MddpSensorPage, calul: CalulSensorPage, hall: HallSensorPage };
let ver = 0;
const snap = () => ver;
const sub = (f) =>
  subscribe(() => {
    ver++;
    f();
  });

function ComingSoon({ machine, dash }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '60px 20px', marginTop: 12 }}>
      <h2 style={{ margin: 0 }}>{DASHBOARDS.find((d) => d.id === dash).name}</h2>
      <div style={{ color: 'var(--muted)', marginTop: 8 }}>
        {MACHINES[machine].name} · this dashboard is not built yet
      </div>
    </div>
  );
}

export default function App() {
  useSyncExternalStore(sub, snap);
  const [menu, setMenu] = useState(null); // { m, x, y }: dropdown opened by clicking a machine in the Portal
  const [loc, setLocState] = useState(() => parseRoute(location.hash));
  const [theme, setTheme] = useState(() => localStorage.getItem('ui.theme') || 'light');
  // hash routing: back button, refresh and direct links work
  const setLoc = (l) => {
    const h = routeHash(l);
    if (location.hash !== h) location.hash = h;
    else setLocState(l);
  };
  useEffect(() => {
    const f = () => setLocState(parseRoute(location.hash));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    start();
  }, []);
  useEffect(() => {
    setStoreTab(loc.m || 'portal');
    window.scrollTo(0, 0);
  }, [loc]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ui.theme', theme);
  }, [theme]);
  const Page = loc.m && loc.d === 'sensor' ? SENSOR_PAGES[loc.m] : null;
  return (
    <div className="app">
      <NavBar
        loc={loc}
        go={setLoc}
        connected={state.connected}
        paused={ui.pausedAt !== null}
        onPause={() => setPaused(ui.pausedAt === null)}
        theme={theme}
        onTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      {!loc.m && <PortalPage go={(m, x, y) => setMenu({ m, x, y })} />}
      {Page && <Page />}
      {loc.m && !Page && <ComingSoon machine={loc.m} dash={loc.d} />}
      {menu && (
        <MachineMenu
          machine={menu.m}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPick={(m, d) => {
            setMenu(null);
            setLoc({ m, d });
          }}
        />
      )}
    </div>
  );
}
