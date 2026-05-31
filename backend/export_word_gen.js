/**
 * export_word_gen.js
 * stdin: JSON { mode: "shiki2"|"shiki3", record: {...} }
 * stdout: docx binary
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} = require('docx');

const PAGE_W   = 16838;
const PAGE_H   = 11906;
const MARGIN   = 720;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INSPECTION_ITEMS = [
  { cat: '機体全般',       catEn: 'UAS GENERAL',               detail: '機器の取り付け状態（ネジ、コネクタ、ケーブル等）' },
  { cat: 'プロペラ',       catEn: 'PROPELLER(S)',               detail: '外観、損傷、ゆがみ' },
  { cat: 'フレーム',       catEn: 'FRAME',                      detail: '外観、損傷、ゆがみ' },
  { cat: '通信系統',       catEn: 'COMMUNICATION SYSTEM',       detail: '機体と操縦装置の通信品質の健全性' },
  { cat: '推進系統',       catEn: 'PROPULSION SYSTEM',          detail: 'モーター又は発動機の健全性' },
  { cat: '電源系統',       catEn: 'POWER SYSTEM',               detail: '機体及び操縦装置の電源の健全性' },
  { cat: '自動制御系統',   catEn: 'AUTOMATIC CONTROL SYSTEM',   detail: '飛行制御装置の健全性' },
  { cat: '操縦装置',       catEn: 'FLIGHT CONTROL SYSTEM',      detail: '外観、スティックの健全性、スイッチの健全性' },
  { cat: 'バッテリー・燃料', catEn: 'BATTERY, FUEL',            detail: 'バッテリーの充電状況、残燃料表示機能の健全性' },
];

const B  = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BS = { top: B, bottom: B, left: B, right: B };
const BN = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BNS = { top: BN, bottom: BN, left: BN, right: BN };

function cell(children, opts = {}) {
  return new TableCell({
    borders:       opts.borders || BS,
    width:         opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading:       opts.shading,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    margins:       { top: 60, bottom: 60, left: 100, right: 60 },
    columnSpan:    opts.span,
    children:      Array.isArray(children) ? children : [children],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: 0, after: 0, line: 240 },
    children:  [new TextRun({
      text: String(text ?? ''),
      bold: opts.bold || false,
      size: opts.size || 16,
      font: 'MS Gothic',
    })],
  });
}

const HDR_SHADE = { fill: 'D0D0D0', type: ShadingType.CLEAR };

// ── 様式２ ────────────────────────────────────────────────────
function buildShiki2(r) {
  const items = [...(r.items || [])];
  while (items.length < INSPECTION_ITEMS.length) items.push({});

  const C = { cat: 2600, detail: 5200, result: 1800 };
  C.remark = CONTENT_W - C.cat - C.detail - C.result;

  const infoWidths = [3000, 5000, 2400, 2400, CONTENT_W - 3000 - 5000 - 2400 - 2400];
  const col3 = Math.floor(CONTENT_W / 3);

  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONTENT_W * 0.6), CONTENT_W - Math.floor(CONTENT_W * 0.6)],
      borders: BNS,
      rows: [new TableRow({ children: [
        cell(para('（様式２）日常点検記録', { bold: true, size: 20 }), { width: Math.floor(CONTENT_W * 0.6), borders: BNS }),
        cell(para(`（NR. ${r.nr || ''}）`, { align: AlignmentType.RIGHT }), { width: CONTENT_W - Math.floor(CONTENT_W * 0.6), borders: BNS }),
      ]})],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: '無人航空機の日常点検記録', bold: true, size: 28, font: 'MS Gothic' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 },
      children: [new TextRun({ text: 'DAILY INSPECTION RECORD OF UAS', size: 14, font: 'Arial' })] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: infoWidths,
      rows: [new TableRow({ children: [
        cell([para('無人航空機の登録記号', { bold: true, size: 14 }), para('REGISTRATION ID OF UAS', { size: 12 })], { width: infoWidths[0] }),
        cell(para(r.registration_id || '', { size: 20, bold: true }), { width: infoWidths[1] }),
        cell([para('機体名称', { bold: true, size: 14 }), para(r.drone_name || '', { size: 16 })],  { width: infoWidths[2] }),
        cell([para('天候',     { bold: true, size: 14 }), para(r.weather    || '', { size: 16 })],  { width: infoWidths[3] }),
        cell([para('気温',     { bold: true, size: 14 }), para(r.temperature ? `${r.temperature} ℃` : '', { size: 16 })], { width: infoWidths[4] }),
      ]})],
    }),

    new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [C.cat, C.detail, C.result, C.remark],
      rows: [
        new TableRow({ tableHeader: true, children: [
          cell([para('点検項目', { bold: true, size: 14 }), para('INSPECTION ITEMS', { size: 12 })], { width: C.cat,    shading: HDR_SHADE }),
          cell([para('点検内容', { bold: true, size: 14 })],                                          { width: C.detail, shading: HDR_SHADE }),
          cell([para('結果',     { bold: true, size: 14 }), para('RESULT',   { size: 12 })],          { width: C.result, shading: HDR_SHADE }),
          cell([para('備考',     { bold: true, size: 14 }), para('REMARKS',  { size: 12 })],          { width: C.remark, shading: HDR_SHADE }),
        ]}),
        ...INSPECTION_ITEMS.map((item, idx) => {
          const d = items[idx] || {};
          const resultStr = d.checked === true ? '○ 正常' : d.checked === false ? '× 異常' : '';
          const shade = idx % 2 === 1 ? { fill: 'F5F5F5', type: ShadingType.CLEAR } : undefined;
          return new TableRow({ children: [
            cell([para(item.cat,   { bold: true, size: 15 }), para(item.catEn, { size: 12 })], { width: C.cat,    shading: shade }),
            cell(para(item.detail, { size: 15 }),                                                { width: C.detail, shading: shade }),
            cell(para(resultStr,   { size: 16,  bold: d.checked != null }),                      { width: C.result, shading: shade }),
            cell(para(d.note || '', { size: 14 }),                                               { width: C.remark, shading: shade }),
          ]});
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONTENT_W / 2), CONTENT_W - Math.floor(CONTENT_W / 2)],
      rows: [new TableRow({ children: [
        cell([para('特記事項  NOTES', { bold: true, size: 14 }), para(r.notes || '', { size: 15 })], { width: Math.floor(CONTENT_W / 2) }),
        cell([para('判定結果', { bold: true, size: 14 }), para(r.result || '', { size: 20, bold: true })], { width: CONTENT_W - Math.floor(CONTENT_W / 2) }),
      ]})],
    }),

    new Paragraph({ spacing: { before: 40, after: 0 }, children: [] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [col3, col3, CONTENT_W - col3 * 2],
      rows: [new TableRow({ children: [
        cell([para('実施場所  PLACE',    { bold: true, size: 14 }), para(r.place          || '', { size: 15 })], { width: col3 }),
        cell([para('実施年月日  DATE',   { bold: true, size: 14 }), para((r.inspected_at  || '').replace(/-/g, '/'), { size: 15 })], { width: col3 }),
        cell([para('実施者  INSPECTOR',  { bold: true, size: 14 }), para(r.inspector_name || '', { size: 15 })], { width: CONTENT_W - col3 * 2 }),
      ]})],
    }),
  ];
}

// ── 様式３ ────────────────────────────────────────────────────
function buildShiki3(r) {
  const C = { date: 1800, time: 1800, detail: 4200, reason: 2400, place: 1800, eng: 1600 };
  C.rem = CONTENT_W - C.date - C.time - C.detail - C.reason - C.place - C.eng;

  const entries = (r.entries && r.entries.length > 0) ? r.entries : [{}];

  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONTENT_W * 0.6), CONTENT_W - Math.floor(CONTENT_W * 0.6)],
      borders: BNS,
      rows: [new TableRow({ children: [
        cell(para('（様式３）点検整備記録', { bold: true, size: 20 }), { width: Math.floor(CONTENT_W * 0.6), borders: BNS }),
        cell(para(`（NR. ${r.nr || ''}）`, { align: AlignmentType.RIGHT }), { width: CONTENT_W - Math.floor(CONTENT_W * 0.6), borders: BNS }),
      ]})],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: '無人航空機の点検整備記録', bold: true, size: 28, font: 'MS Gothic' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 },
      children: [new TextRun({ text: 'INSPECTION AND MAINTENANCE RECORD OF UAS', size: 14, font: 'Arial' })] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 5000, CONTENT_W - 8000],
      rows: [new TableRow({ children: [
        cell([para('無人航空機の登録記号', { bold: true, size: 14 }), para('REGISTRATION ID OF UAS', { size: 12 })], { width: 3000 }),
        cell(para(r.registration_id || '', { size: 20, bold: true }), { width: 5000 }),
        cell([para('機体名称', { bold: true, size: 14 }), para(r.drone_name || '', { size: 16 })], { width: CONTENT_W - 8000 }),
      ]})],
    }),

    new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [C.date, C.time, C.detail, C.reason, C.place, C.eng, C.rem],
      rows: [
        new TableRow({ tableHeader: true, children: [
          cell([para('実施年月日',              { bold: true, size: 14 }), para('DATE',              { size: 12 })], { width: C.date,   shading: HDR_SHADE }),
          cell([para('総飛行時間※',            { bold: true, size: 14 }), para('TOTAL FLIGHT TIME', { size: 12 })], { width: C.time,   shading: HDR_SHADE }),
          cell([para('点検・修理・改造・整備の内容', { bold: true, size: 14 }), para('DETAIL',       { size: 12 })], { width: C.detail, shading: HDR_SHADE }),
          cell([para('実施理由',               { bold: true, size: 14 }), para('REASON',            { size: 12 })], { width: C.reason, shading: HDR_SHADE }),
          cell([para('実施場所',               { bold: true, size: 14 }), para('PLACE',             { size: 12 })], { width: C.place,  shading: HDR_SHADE }),
          cell([para('実施者',                 { bold: true, size: 14 }), para('ENGINEER',          { size: 12 })], { width: C.eng,    shading: HDR_SHADE }),
          cell([para('備考',                   { bold: true, size: 14 }), para('REMARKS',           { size: 12 })], { width: C.rem,    shading: HDR_SHADE }),
        ]}),
        ...entries.map((e, idx) => {
          const shade = idx % 2 === 1 ? { fill: 'F5F5F5', type: ShadingType.CLEAR } : undefined;
          return new TableRow({ children: [
            cell(para((e.performed_at || '').replace(/-/g, '/'), { size: 15 }), { width: C.date,   shading: shade }),
            cell(para(e.total_flight_time != null ? `${e.total_flight_time}h` : '', { size: 15 }), { width: C.time, shading: shade }),
            cell(para(e.detail   || '', { size: 15 }), { width: C.detail,  shading: shade }),
            cell(para(e.reason   || '', { size: 15 }), { width: C.reason,  shading: shade }),
            cell(para(e.place    || '', { size: 15 }), { width: C.place,   shading: shade }),
            cell(para(e.engineer || '', { size: 15 }), { width: C.eng,     shading: shade }),
            cell(para(e.remarks  || '', { size: 15 }), { width: C.rem,     shading: shade }),
          ]});
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 80, after: 0 },
      children: [new TextRun({ size: 13, font: 'MS Gothic',
        text: '※前回の機体認証を受検するにあたり実施した点検整備以降の総飛行時間を記入する。機体認証を受けていない無人航空機は、点検整備作業を実施した時点での総飛行時間を記入するものとする。',
      })],
    }),
  ];
}

// ── stdin読み取り → stdout出力 ───────────────────────────────
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { mode, record } = JSON.parse(Buffer.concat(chunks).toString());

  const children = mode === 'shiki2' ? buildShiki2(record) : buildShiki3(record);
  const doc = new Document({
    sections: [{
      properties: { page: {
        size:   { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      }},
      children,
    }],
  });
  const buf = await Packer.toBuffer(doc);
  process.stdout.write(buf);
}

main().catch(e => { process.stderr.write(e.message); process.exit(1); });
