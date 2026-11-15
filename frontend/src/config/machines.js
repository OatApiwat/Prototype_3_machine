// The three machines that have live data, and the dashboards every machine offers.
// Routes look like #/m/<machine id>/<dashboard id>.
export const MACHINES = {
  mddp: { id: 'mddp', name: 'MDDP_184' },
  calul: { id: 'calul', name: 'CALUL_037' },
  hall: { id: 'hall', name: 'HAll_013' },
};

export const DASHBOARDS = [
  { id: 'sensor', name: 'Sensor Dashboard' },
  { id: 'productivity', name: 'Productivity Dashboard' },
  { id: 'maintenance', name: 'Maintenance Dashboard' },
];

const ROUTE = /^#\/m\/(mddp|calul|hall)\/(sensor|productivity|maintenance)$/;

/** hash -> { m: machine id | null, d: dashboard id }; anything unknown opens the Portal */
export function parseRoute(hash) {
  const m = ROUTE.exec(hash || '');
  return m ? { m: m[1], d: m[2] } : { m: null, d: 'sensor' };
}

export const routeHash = (loc) => (loc.m ? `#/m/${loc.m}/${loc.d}` : '#/');
