#!/usr/bin/env node
// ========================================================
// DroneOps - 顧客書類 Word生成
// generate_customer_docs.js <json_file> <output_path>
// ========================================================

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageBreak, HeadingLevel
} = require('docx');
const fs = require('fs');

const jsonFile = process.argv[2];
const outPath = process.argv[3];
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

const { types, variables, templates } = data;

// ---- 変数置換 ----
function applyVars(text, vars) {
  return text.replace(/\{\{(.+?)\}\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{{${key}}}`);
}

// ---- スタイルヘルパー ----
const font = "游明朝";

const h1 = (text) => new Paragraph({
  spacing: { before: 400, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1F4E79" } },
  children: [new TextRun({ text, bold: true, size: 36, font, color: "1F4E79" })]
});

const h2 = (text) => new Paragraph({
  spacing: { before: 280, after: 100 },
  children: [new TextRun({ text, bold: true, size: 24, font, color: "1F4E79" })]
});

const body = (text) => {
  const lines = text.split('\n');
  return lines.map(line => new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: line, size: 22, font, color: "222222" })]
  }));
};

const spacer = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun("")] }));

// ---- スケジュールテーブル ----
const SCHEDULE_STEPS = [
  { step: "① ヒアリング・お見積", content: "撮影目的・納品形式・使用用途を確認", timing: "〜撮影{{ヒアリング期限}}週間前まで" },
  { step: "② 撮影計画策定", content: "飛行申請（DIPS2.0）、構成検討", timing: "撮影の7〜10日前" },
  { step: "③ ロケハン", content: "飛行可否・構図の現地確認", timing: "撮影の3〜5日前" },
  { step: "④ 撮影実施", content: "ドローン空撮・地上撮影", timing: "撮影当日" },
  { step: "⑤ データ整理・編集", content: "素材確認・カット選定・編集", timing: "撮影後{{編集期間}}営業日以内" },
  { step: "⑥ 初稿提出", content: "編集第1版をお客様に提出", timing: "撮影後{{初稿提出期間}}営業日以内" },
  { step: "⑦ 修正対応", content: "軽微な修正の受付・反映", timing: "ご指示後{{修正対応期間}}営業日以内" },
  { step: "⑧ 最終納品", content: "クラウド納品またはUSB郵送", timing: "修正完了後1〜2営業日以内" },
];

function buildScheduleTable(vars) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const headerRow = new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 2400, type: WidthType.DXA },
        shading: { fill: "1F4E79", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: "ステップ", bold: true, size: 20, font, color: "FFFFFF" })] })]
      }),
      new TableCell({
        borders, width: { size: 4200, type: WidthType.DXA },
        shading: { fill: "1F4E79", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: "内容", bold: true, size: 20, font, color: "FFFFFF" })] })]
      }),
      new TableCell({
        borders, width: { size: 3026, type: WidthType.DXA },
        shading: { fill: "1F4E79", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: "期間目安", bold: true, size: 20, font, color: "FFFFFF" })] })]
      }),
    ]
  });

  const dataRows = SCHEDULE_STEPS.map((s, i) => new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 2400, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? "F8FAFF" : "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: s.step, bold: true, size: 20, font })] })]
      }),
      new TableCell({
        borders, width: { size: 4200, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: s.content, size: 20, font })] })]
      }),
      new TableCell({
        borders, width: { size: 3026, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: applyVars(s.timing, vars), size: 20, font })] })]
      }),
    ]
  }));

  return new Table({
    width: { size: 9626, type: WidthType.DXA },
    columnWidths: [2400, 4200, 3026],
    rows: [headerRow, ...dataRows]
  });
}

// ---- 書類ビルダー ----
function buildDoc(type, vars) {
  const tmpl = templates[type];
  const title = applyVars(tmpl.title, vars);
  const children = [];

  children.push(h1(title));
  children.push(...spacer());

  for (const [sectionTitle, sectionBody] of tmpl.sections) {
    children.push(h2(applyVars(sectionTitle, vars)));
    const resolved = applyVars(sectionBody, vars);
    if (type === "schedule" && sectionTitle.includes("撮影〜")) {
      // スケジュールセクションはテーブルで表示
      children.push(buildScheduleTable(vars));
      children.push(...spacer());
    } else {
      children.push(...body(resolved));
    }
    children.push(...spacer());
  }

  return children;
}

// ---- メイン組立 ----
const allChildren = [];

types.forEach((type, idx) => {
  if (idx > 0) {
    // ページ区切り
    allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }
  allChildren.push(...buildDoc(type, variables));
});

// 発行情報フッター
const issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
allChildren.push(...spacer(2));
allChildren.push(new Paragraph({
  alignment: AlignmentType.RIGHT,
  children: [new TextRun({ text: `発行日：${issueDate}`, size: 18, font, color: "9CA3AF" })]
}));
allChildren.push(new Paragraph({
  alignment: AlignmentType.RIGHT,
  children: [new TextRun({ text: applyVars("{{会社名}}", variables), size: 18, font, color: "9CA3AF" })]
}));

const document = new Document({
  styles: {
    default: { document: { run: { font, size: 22 } } }
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4縦
        margin: { top: 1440, right: 1134, bottom: 1440, left: 1134 }
      }
    },
    children: allChildren
  }]
});

Packer.toBuffer(document).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("OK:" + outPath);
});
