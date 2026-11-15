// Generates nodered/flows.json: one Node-RED tab per machine, one group (flow) per measurement/signal,
// and one "Influx writer" tab that batches every signal's lines into a single write per 250 ms.
// Run: node tools/build-flows.mjs   (then restart nodered)
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { SIGNALS } = require('../nodered/sim/index.js');

const KIND = {
  stream: { color: '#bfdbfe', label: 'sensor stream' },
  state: { color: '#bbf7d0', label: 'machine state' },
  event: { color: '#fde68a', label: 'event' },
};
// measurement, fields/units, rate, kind per signal. Names of measurements/tags/fields must not change: the frontend reads them.
const INFO = {
  MDDP_184: {
    title: 'MDDP_184 · Glue dispensing (Left + Right arm)',
    fast: ['mddp_fast', 'Arm pressure p (kPa) and robot vibration vx/vy/vz (g), tag side=L|R', '1 kHz', 'stream'],
    arm: ['mddp_arm', 'Arm position x/y, dispense flag, active cell, head epoxy temperature temp (°C), tag side=L|R', '20 Hz', 'state'],
    carrier: ['mddp_carrier', 'Carrier position x and pieces dispensed per arm nL/nR, tag k=carrier number', '20 Hz', 'state'],
    part: ['mddp_part', 'One row per finished piece: strip, part, process parameters (temp, peak pressure, dispense time, vibration velocity/acceleration X/Y/Z) and defect bit mask (6 types), tags side, rc (run card)', 'event', 'event'],
    dispense: ['mddp_dispense', 'Dispense time dur (ms) and peak pressure (kPa) of each finished dispense, tag side=L|R', 'event', 'event'],
  },
  CALUL_037: {
    title: 'CALUL_037 · KUKA KR 6 R900-2 HO pick and place + FESTO + IAI',
    vac: ['calul_vac', 'Vacuum front / back (kPa)', '100 Hz', 'stream'],
    robot: ['calul_robot', 'Pose x y z a b c, joints q1-q6, joint temperatures t1-t6, tracking error, target, cycle counters, life time', '20 Hz', 'stream'],
    flow: ['calul_flow', 'Carrier queue: ready / picked / sent to HAll', '20 Hz', 'state'],
    tray: ['calul_tray', 'HA tray state (placed plates, sideways shift) and buffer fill', '20 Hz', 'state'],
    festo: ['calul_festo', 'FESTO axis temperature (°C), tag axis=X|Y|Z', '20 Hz', 'stream'],
    arrival: ['calul_arrival', 'Measured arrival at each waypoint P1-P10: x y z a b c and error ex..ec, tag point', 'event', 'event'],
    fault: ['calul_fault', 'Festo / IAI error codes: item, code, description, duration, value, tag src=festo|iai', 'event', 'event'],
  },
  HAll_013: {
    title: 'HAll_013 · Convection oven',
    oven: ['hall_oven', 'Oven temperature, heater duty, blower rpm, blower vibration vx/vy/vz, blower temperature, conveyor speed', '10 Hz', 'stream'],
    tray: ['hall_tray', 'Tray position x and in-oven flag, tag k=tray number', '10 Hz', 'state'],
    cure: ['hall_cure', 'Curing time of each tray, written when the tray leaves the oven', 'event', 'event'],
  },
};

const nodes = [];
const WRITER_IN = 'writer_in';
const linkOuts = [];

function machineTab(machine, idx) {
  const info = INFO[machine], z = 'tab_' + machine, sigs = SIGNALS[machine];
  nodes.push({
    id: z, type: 'tab', label: machine, disabled: false,
    info: `${info.title}\n\nOne group per measurement. Each group: inject every 250 ms → function (sim.signal) → link out to "Influx writer".\nAll groups of this tab share one sim clock (flow context "clock"), so the measurements stay aligned.`,
  });
  nodes.push({ id: z + '_head', type: 'comment', z, name: info.title, info: `Measurements written by this tab: ${sigs.map((s) => info[s][0]).join(', ')}`, x: 220, y: 40, wires: [] });
  sigs.forEach((s, i) => {
    const [meas, fields, rate, kind] = info[s], y = 100 + i * 130, id = `${z}_${s}`;
    const ids = [id + '_c', id + '_i', id + '_f', id + '_o'];
    nodes.push({ id: id + '_g', type: 'group', z, name: `${meas}  ·  ${rate}  ·  ${KIND[kind].label}`, style: { label: true, fill: KIND[kind].color, 'fill-opacity': '0.35', stroke: '#64748b' }, nodes: ids, x: 14, y: y - 20, w: 1052, h: 112 });
    nodes.push({ id: id + '_c', type: 'comment', z, g: id + '_g', name: fields, info: `measurement ${meas}\nrate ${rate}\n${fields}`, x: 360, y: y + 10, wires: [] });
    nodes.push({ id: id + '_i', type: 'inject', z, g: id + '_g', name: 'every 250 ms', props: [], repeat: '0.25', crontab: '', once: true, onceDelay: '3', topic: '', x: 130, y: y + 50, wires: [[id + '_f']] });
    nodes.push({
      id: id + '_f', type: 'function', z, g: id + '_g', name: `${machine} · ${meas}`,
      func: `// ${meas}: ${fields}\n// Returns the line protocol of every sample since this node's previous tick (own ms timestamps).\nconst lines = global.get('sim').signal('${machine}', '${s}', context, flow, Date.now());\nif (!lines) return null;\nmsg.payload = lines;\nnode.status({ fill: 'green', shape: 'dot', text: lines.split('\\n').length + ' points' });\nreturn msg;\n`,
      outputs: 1, timeout: 0, noerr: 0, initialize: '', finalize: '', libs: [], x: 440, y: y + 50, wires: [[id + '_o']],
    });
    nodes.push({ id: id + '_o', type: 'link out', z, g: id + '_g', name: `${meas} → writer`, mode: 'link', links: [WRITER_IN], x: 760, y: y + 50, wires: [] });
    linkOuts.push(id + '_o');
  });
}

function writerTab() {
  const z = 'tab_writer';
  nodes.push({ id: z, type: 'tab', label: 'Influx writer', disabled: false, info: 'Receives the line protocol of every signal flow, batches it for 250 ms into one string and writes it to InfluxDB v2 (precision ms). Any HTTP status other than 204 is logged.' });
  nodes.push({ id: z + '_head', type: 'comment', z, name: 'All signal flows → one InfluxDB write per 250 ms', info: 'Writing each signal directly would multiply the HTTP requests (mddp_fast alone is about 2000 rows/s).', x: 300, y: 40, wires: [] });
  nodes.push({ id: WRITER_IN, type: 'link in', z, name: 'lines from all machines', links: linkOuts, x: 120, y: 100, wires: [[z + '_join']] });
  nodes.push({ id: z + '_join', type: 'join', z, name: 'batch 250 ms', mode: 'custom', build: 'string', property: 'payload', propertyType: 'msg', key: 'topic', joiner: '\\n', joinerType: 'str', useparts: false, accumulate: false, timeout: '0.25', count: '', reduceRight: false, reduceExp: '', reduceInit: '', reduceInitType: '', reduceFixup: '', x: 330, y: 100, wires: [[z + '_req']] });
  nodes.push({
    id: z + '_req', type: 'function', z, name: 'build InfluxDB write request',
    func: "msg.url = env.get('INFLUX_URL') + '/api/v2/write?org=' + encodeURIComponent(env.get('INFLUX_ORG')) +\n          '&bucket=' + encodeURIComponent(env.get('INFLUX_BUCKET')) + '&precision=ms';\nmsg.headers = { 'Authorization': 'Token ' + env.get('INFLUX_TOKEN'), 'Content-Type': 'text/plain; charset=utf-8' };\nmsg.method = 'POST';\nnode.status({ fill: 'green', shape: 'dot', text: msg.payload.split('\\n').length + ' points' });\nreturn msg;\n",
    outputs: 1, timeout: 0, noerr: 0, initialize: '', finalize: '', libs: [], x: 590, y: 100, wires: [[z + '_http']],
  });
  nodes.push({ id: z + '_http', type: 'http request', z, name: 'InfluxDB write', method: 'use', ret: 'txt', paytoqs: 'ignore', url: '', tls: '', persist: false, proxy: '', insecureHTTPParser: false, authType: '', senderr: false, headers: [], x: 830, y: 100, wires: [[z + '_chk']] });
  nodes.push({ id: z + '_chk', type: 'switch', z, name: 'HTTP status != 204', property: 'statusCode', propertyType: 'msg', rules: [{ t: 'neq', v: '204', vt: 'num' }], checkall: 'true', repair: false, outputs: 1, x: 1050, y: 100, wires: [[z + '_dbg']] });
  nodes.push({ id: z + '_dbg', type: 'debug', z, name: 'write error', active: true, tosidebar: true, console: true, tostatus: false, complete: 'payload', targetType: 'msg', x: 1240, y: 100, wires: [] });
}

Object.keys(INFO).forEach(machineTab);
writerTab();
// order: machine tabs first, writer last (editor shows tabs in file order)
const order = (n) => (n.type === 'tab' ? 0 : 1);
const out = [...nodes.filter((n) => n.type === 'tab'), ...nodes.filter((n) => n.type !== 'tab')];
void order;
writeFileSync(new URL('../nodered/flows.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`flows.json: ${out.length} nodes, ${Object.keys(INFO).length} machine tabs + writer, ${linkOuts.length} signal flows`);
