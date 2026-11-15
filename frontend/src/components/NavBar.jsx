import React, { useEffect, useState } from 'react';
import { DASHBOARDS, MACHINES } from '../config/machines.js';
import { dataAge } from '../lib/store.js';

// green = fresh data, yellow = slow, red = nothing recent (age in ms)
const freshness = (age) => (age < 15000 ? 'ok' : age < 60000 ? 'slow' : 'stale');

function MachineItem({ m, loc, open, onToggle, onPick }) {
  const active = loc.m === m.id;
  return (
    <div className="navitem">
      <button
        className={'navbtn' + (active ? ' active' : '')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={active ? 'page' : undefined}
        onClick={onToggle}
      >
        <span className={'sdot ' + freshness(dataAge(m.prefix))} title="data freshness" />
        {m.name} ▾
      </button>
      {open && (
        <div className="navdd" role="menu">
          {DASHBOARDS.map((d) => (
            <button
              key={d.id}
              role="menuitem"
              className={active && loc.d === d.id ? 'cur' : ''}
              aria-current={active && loc.d === d.id ? 'page' : undefined}
              onClick={() => onPick(m.id, d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Top navigation: Portal, machine switcher with dashboards, breadcrumb, live status, Pause/Live, theme. */
export default function NavBar({ loc, go, connected, paused, onPause, theme, onTheme }) {
  const [open, setOpen] = useState(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2000); // refresh the freshness dots
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  const dash = DASHBOARDS.find((d) => d.id === loc.d);
  return (
    <nav className="navbar" aria-label="Main">
      <button
        className={'navbtn' + (!loc.m ? ' active' : '')}
        aria-current={!loc.m ? 'page' : undefined}
        onClick={() => go({ m: null, d: 'sensor' })}
      >
        ⌂ Portal
      </button>
      {Object.values(MACHINES).map((m) => (
        <MachineItem
          key={m.id}
          m={m}
          loc={loc}
          open={open === m.id}
          onToggle={() => setOpen(open === m.id ? null : m.id)}
          onPick={(id, d) => {
            setOpen(null);
            go({ m: id, d });
          }}
        />
      ))}
      {loc.m && (
        <span className="crumb">
          {MACHINES[loc.m].name} › {dash.name}
        </span>
      )}
      {open && <div className="navshade" onClick={() => setOpen(null)} />}
      <span className="spacer" />
      <span className="status">
        <span className={'dot' + (connected ? ' on' : '')} />
        {connected ? 'live from InfluxDB' : 'reconnecting…'}
      </span>
      {loc.m && (
        <button className="pill" onClick={onPause}>
          {paused ? '▶ Live' : '⏸ Pause'}
        </button>
      )}
      <button className="pill" onClick={onTheme}>
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}
