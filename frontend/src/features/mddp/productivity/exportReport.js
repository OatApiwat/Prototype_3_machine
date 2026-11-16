// Export of the Defect monitoring page: Excel (data) and PowerPoint (summary + chart images). Libraries load on first use.
import { DEFECTS, hasDefect, summarize, stripLabel, carrierLabel, stamp } from './defects.js';

const startOf = (rows) => {
  const r = rows.find(Boolean);
  return r ? stamp(r.t) : '';
};
const names = (m) => DEFECTS.filter((_, i) => hasDefect(m, i)).join(', ');
const fileBase = (rc, carrier) => `defect-monitoring_${rc}_${carrierLabel(carrier)}`;

/** sets: [{ no, visit, rows }] (rows = 60 entries, null where not made yet) */
export async function exportExcel({ rc, carrier, sets }) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const summary = [
    ['Set', 'Carrier', 'Start', 'Parts inspected', 'Defects found', 'Defective parts', 'Top defect code'],
  ];
  for (const s of sets) {
    const sm = summarize(s.rows);
    summary.push([
      s.no,
      carrierLabel(s.visit.carrier),
      startOf(s.rows),
      sm.n,
      sm.total,
      sm.defective,
      sm.top,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Run Card ${rc}`], [], ...summary]), 'Summary');
  for (const s of sets) {
    const head = [
      'Suspension No.',
      'Strip',
      'Suspension No. (in Strip)',
      'Time',
      'Epoxy head temperature (°C)',
      'Dispense pressure (kPa)',
      'Epoxy dispense time (ms)',
      'Vibration velocity X (mm/s)',
      'Vibration velocity Y (mm/s)',
      'Vibration velocity Z (mm/s)',
      'Vibration acceleration X (m/s²)',
      'Vibration acceleration Y (m/s²)',
      'Vibration acceleration Z (m/s²)',
      'Defects (count)',
      ...DEFECTS,
      'Defect codes',
    ];
    const body = s.rows
      .map((r, i) =>
        r
          ? [
              i + 1,
              stripLabel(r.strip_no ?? 0),
              r.suspension_no,
              stamp(r.t),
              r.temp,
              r.peak,
              r.dur,
              r.velx,
              r.vely,
              r.velz,
              r.accx,
              r.accy,
              r.accz,
              DEFECTS.filter((_, d) => hasDefect(r.defect, d)).length,
              ...DEFECTS.map((_, d) => hasDefect(r.defect, d)),
              names(r.defect),
            ]
          : null
      )
      .filter(Boolean);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...body]), `Set ${s.no}`.slice(0, 31));
  }
  XLSX.writeFile(wb, fileBase(rc, carrier) + '.xlsx');
}

/** sets: as above plus images: [dataUrl x6] (the chart canvases of the set, top to bottom) */
export async function exportPowerPoint({ rc, carrier, sets }) {
  const { default: Pptx } = await import('pptxgenjs');
  const pp = new Pptx();
  pp.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  const t = pp.addSlide();
  t.addText('Defect monitoring', { x: 0.6, y: 2.3, w: 12, h: 1, fontSize: 36, bold: true });
  t.addText(`Run Card ${rc} · ${carrierLabel(carrier)} · ${sets.length} set(s)`, {
    x: 0.6,
    y: 3.4,
    w: 12,
    h: 0.6,
    fontSize: 20,
  });
  for (const s of sets) {
    const sm = summarize(s.rows);
    const sl = pp.addSlide();
    sl.addText(`Set ${s.no} · ${carrierLabel(s.visit.carrier)} · ${startOf(s.rows)}`, {
      x: 0.4,
      y: 0.2,
      w: 12.5,
      h: 0.5,
      fontSize: 20,
      bold: true,
    });
    sl.addText(
      `${sm.n} parts inspected | ${sm.total} defects found | ${sm.defective} defective parts | Top defect code: ${sm.top}`,
      { x: 0.4, y: 0.7, w: 12.5, h: 0.4, fontSize: 14 }
    );
    // 6 charts in a 3 x 2 grid
    const W = 4.1,
      H = 2.9;
    s.images.slice(0, 6).forEach((img, k) => {
      sl.addImage({
        data: img,
        x: 0.4 + (k % 3) * (W + 0.1),
        y: 1.2 + Math.floor(k / 3) * (H + 0.1),
        w: W,
        h: H,
      });
    });
  }
  await pp.writeFile({ fileName: fileBase(rc, carrier) + '.pptx' });
}
