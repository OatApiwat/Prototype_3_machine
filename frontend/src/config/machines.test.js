import { describe, it, expect } from 'vitest';
import { DASHBOARDS, MACHINES, parseRoute, routeHash } from './machines.js';

describe('machines config', () => {
  it('offers the three dashboards in order', () => {
    expect(DASHBOARDS.map((d) => d.name)).toEqual([
      'Sensor Dashboard',
      'Productivity Dashboard',
      'Maintenance Dashboard',
    ]);
  });
  it('has the three live machines', () => {
    expect(Object.values(MACHINES).map((m) => m.name)).toEqual(['MDDP_184', 'CALUL_037', 'HAll_013']);
  });
  it('parses every route and round-trips it', () => {
    for (const m of Object.keys(MACHINES))
      for (const d of DASHBOARDS) {
        const loc = parseRoute(`#/m/${m}/${d.id}`);
        expect(loc).toEqual({ m, d: d.id });
        expect(routeHash(loc)).toBe(`#/m/${m}/${d.id}`);
      }
  });
  it('falls back to the Portal for unknown routes', () => {
    for (const h of ['', '#/', '#/m/foo/sensor', '#/m/mddp/nope', '#/m/mddp'])
      expect(parseRoute(h).m).toBeNull();
  });
});
