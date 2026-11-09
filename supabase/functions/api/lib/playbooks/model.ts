// The playbook definition (Step 2 brief, "What a playbook is"), the completeness check and the export files.
// The AI writes to this shape, the member edits it, and every export is made from it.
import { strToU8, zipSync } from "npm:fflate@0.8.2";
import { BRAND_HEADER_OVERRIDE, BRAND_HEADER_REF, BRAND_HEADER_REL, BRAND_HEADER_TYPES, brandHeaderFiles } from "../brand/docx.ts";
import { htmlBrandLine } from "../brand/logo.ts";

export type Step = { text: string; who: string; tool: string; minutes: number | null; decision: string; tag: "" | "keep" | "delegate" | "automate"; screenshot: string };
export type Body = {
  title: string; outcome: string; practice_area: string; jurisdiction: string; when_to_use: string; roles: string;
  needs: string[]; steps: Step[]; has_deadlines: boolean; deadlines: string; checks: string[]; review_points: string[];
  never_delegate: string[]; resources: string[]; tools: string[]; deliverables: string;
};

// The 13 parts, in order, with the words members see
export const PARTS: Array<{ key: string; n: number; label: string; required: boolean }> = [
  { key: "title_outcome", n: 1, label: "Title and outcome", required: true },
  { key: "area", n: 2, label: "Practice area and jurisdiction", required: true },
  { key: "when_to_use", n: 3, label: "When to use it", required: true },
  { key: "roles", n: 4, label: "Roles", required: true },
  { key: "needs", n: 5, label: "What you need first", required: true },
  { key: "steps", n: 6, label: "Steps", required: true },
  { key: "deadlines", n: 7, label: "Deadlines and timing", required: false },
  { key: "checks", n: 8, label: "Quality checks", required: true },
  { key: "review_points", n: 9, label: "Attorney review and ethics points", required: true },
  { key: "resources", n: 10, label: "Templates and resources", required: false },
  { key: "tools", n: 11, label: "Tools", required: false },
  { key: "deliverables", n: 12, label: "Deliverables", required: true },
];

const s = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const list = (v: unknown, max = 60): string[] => {
  if (typeof v === "string") v = v.split("\n");
  return Array.isArray(v) ? v.map((x) => s(typeof x === "object" && x ? (x as any).text ?? (x as any).name ?? "" : x, 1000)).filter(Boolean).slice(0, max) : [];
};
const TAGS = ["keep", "delegate", "automate"];

// Accepts whatever the AI or a browser sends and returns a clean body
export function normalize(raw: unknown): Body {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const steps = (Array.isArray(b.steps) ? b.steps : []).slice(0, 150).map((x: any): Step => {
    const o = typeof x === "string" ? { text: x } : (x ?? {});
    const m = Number(o.minutes);
    const tag = s(o.tag, 20).toLowerCase();
    return {
      text: s(o.text ?? o.how ?? o.step, 2000), who: s(o.who, 120), tool: s(o.tool, 120), minutes: Number.isFinite(m) && m > 0 ? Math.min(Math.round(m), 10000) : null,
      decision: s(o.decision, 500), tag: (TAGS.includes(tag) ? tag : "") as Step["tag"], screenshot: /^[0-9a-f-]{36}$/.test(s(o.screenshot, 40)) ? s(o.screenshot, 40) : "",
    };
  }).filter((x: Step) => x.text);
  const roles = Array.isArray(b.roles) ? b.roles.map((r: any) => (typeof r === "string" ? r : [r?.role, r?.who].filter(Boolean).join(": "))).join("\n") : s(b.roles);
  return {
    title: s(b.title, 200), outcome: s(b.outcome, 2000), practice_area: s(b.practice_area, 100), jurisdiction: s(b.jurisdiction, 100),
    when_to_use: s(b.when_to_use, 2000), roles: roles.slice(0, 2000), needs: list(b.needs), steps,
    has_deadlines: b.has_deadlines === true || (b.has_deadlines !== false && s(b.deadlines).length > 0), deadlines: s(b.deadlines, 3000),
    checks: list(b.checks), review_points: list(b.review_points), never_delegate: list(b.never_delegate), resources: list(b.resources), tools: list(b.tools),
    deliverables: s(b.deliverables, 2000),
  };
}

export function emptyBody(title = ""): Body {
  return normalize({ title });
}

// Complete means every required part is filled (and deadlines when the process has them)
export function completeness(b: Body): { score: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ["Title and outcome", !!b.title && !!b.outcome],
    ["Practice area and jurisdiction", !!b.practice_area && !!b.jurisdiction],
    ["When to use it", !!b.when_to_use],
    ["Roles", !!b.roles],
    ["What you need first", b.needs.length > 0],
    ["Steps (at least 3)", b.steps.length >= 3],
    ["Quality checks", b.checks.length > 0],
    ["Attorney review and ethics points", b.review_points.length > 0],
    ["Deliverables", !!b.deliverables],
  ];
  if (b.has_deadlines) checks.push(["Deadlines and timing", !!b.deadlines]);
  const missing = checks.filter((c) => !c[1]).map((c) => c[0]);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

// Did a proposed change take away attorney review points? Then only the administrator may accept it.
export function removesReview(before: Body, after: Body): boolean {
  const keep = (x: string[]) => new Set(x.map((t) => t.toLowerCase()));
  const a = keep(after.review_points), n = keep(after.never_delegate);
  return before.review_points.some((t) => !a.has(t.toLowerCase())) || before.never_delegate.some((t) => !n.has(t.toLowerCase()));
}

// ---------- Exports ----------

export type ExportMeta = { version: number; date: string; status: string; firm: string };
const footerText = (m: ExportMeta) => `${m.firm ? m.firm + " | " : ""}Version ${m.version}${m.status === "approved" ? "" : " (not yet approved)"} | Exported ${m.date} from Lawfecta DELA`;
const TAG_WORDS: Record<string, string> = { keep: "Keep (attorney)", delegate: "Delegate", automate: "Automate" };

function stepLine(st: Step): string {
  const bits = [st.who && "Who: " + st.who, st.tool && "Tool: " + st.tool, st.minutes && "About " + st.minutes + " min", st.tag && TAG_WORDS[st.tag]].filter(Boolean);
  return st.text + (bits.length ? " (" + bits.join("; ") + ")" : "") + (st.decision ? "\n   Decision: " + st.decision : "");
}

// Sections in order, as plain text blocks, shared by every format
function sections(b: Body): Array<{ title: string; text?: string; items?: string[]; numbered?: boolean }> {
  const out: Array<{ title: string; text?: string; items?: string[]; numbered?: boolean }> = [];
  out.push({ title: "Outcome", text: b.outcome });
  out.push({ title: "Practice area and jurisdiction", text: [b.practice_area, b.jurisdiction].filter(Boolean).join(", ") });
  out.push({ title: "When to use it", text: b.when_to_use });
  out.push({ title: "Roles", text: b.roles });
  out.push({ title: "What you need first", items: b.needs });
  out.push({ title: "Steps", items: b.steps.map(stepLine), numbered: true });
  if (b.has_deadlines || b.deadlines) out.push({ title: "Deadlines and timing", text: b.deadlines });
  out.push({ title: "Quality checks", items: b.checks });
  out.push({ title: "Attorney review and ethics points", items: b.review_points });
  if (b.never_delegate.length) out.push({ title: "Never delegate", items: b.never_delegate });
  if (b.resources.length) out.push({ title: "Templates and resources", items: b.resources });
  if (b.tools.length) out.push({ title: "Tools", items: b.tools });
  out.push({ title: "Deliverables", text: b.deliverables });
  return out;
}

export function toMarkdown(b: Body, m: ExportMeta): string {
  const md = [`# ${b.title || "Playbook"}`, ""];
  for (const sec of sections(b)) {
    md.push(`## ${sec.title}`, "");
    if (sec.text !== undefined) md.push(sec.text || "_Not filled in yet_", "");
    if (sec.items) md.push(...(sec.items.length ? sec.items.map((t, i) => (sec.numbered ? `${i + 1}. ` : "- ") + t.replaceAll("\n", "\n   ")) : ["_Not filled in yet_"]), "");
  }
  md.push("---", "", "_" + footerText(m) + "_", "");
  return md.join("\n");
}

const esc = (t: string) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function toHtml(b: Body, m: ExportMeta): string {
  const body = sections(b).map((sec) => {
    let inner = "";
    if (sec.text !== undefined) inner = sec.text ? `<p>${esc(sec.text).replaceAll("\n", "<br>")}</p>` : "<p><em>Not filled in yet</em></p>";
    if (sec.items) inner = sec.items.length ? `<${sec.numbered ? "ol" : "ul"}>${sec.items.map((t) => `<li>${esc(t).replaceAll("\n", "<br>")}</li>`).join("")}</${sec.numbered ? "ol" : "ul"}>` : "<p><em>Not filled in yet</em></p>";
    return `<h2>${esc(sec.title)}</h2>\n${inner}`;
  }).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.title || "Playbook")}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;color:#1c2230;line-height:1.55}h1{color:#8b2146}h2{border-bottom:1px solid #e6e7ec;padding-bottom:4px;margin-top:28px}footer{margin-top:40px;font-size:12px;color:#5f6675;border-top:1px solid #e6e7ec;padding-top:8px}@media print{body{margin:0}}</style></head>
<body>${htmlBrandLine()}<h1>${esc(b.title || "Playbook")}</h1>
${body}
<footer>${esc(footerText(m))}</footer></body></html>`;
}

const csvCell = (t: string) => '"' + t.replaceAll('"', '""') + '"';

// A step checklist for Monday, Notion, Excel or Google Sheets
export function toCsv(b: Body): string {
  const rows = [["Step", "What to do", "Who", "Tool", "Minutes", "Decision point", "Delegation", "Done"]];
  b.steps.forEach((st, i) => rows.push([String(i + 1), st.text, st.who, st.tool, st.minutes ? String(st.minutes) : "", st.decision, st.tag ? TAG_WORDS[st.tag] : "", ""]));
  // Starts with a byte order mark so Excel reads accented letters correctly
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------- Word (.docx) ----------

const x = (t: string) => esc(t).replaceAll("'", "&apos;");

// Built for reading and printing (Stacey 2026-11-05: "it could be formatted better"):
// a summary box, the steps as a table, real bullets, the attorney review points in a shaded box, and page numbers.
const BRAND = "8B2146", INK = "1C2230", GREY = "5F6675", LINE = "D9DBE1", SOFT = "F6EEF2", HEAD = "F1E4EA";
type RunOpt = { b?: boolean; i?: boolean; color?: string; sz?: number };
const run = (t: string, o: RunOpt = {}) => {
  const pr = `${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}${o.sz ? `<w:sz w:val="${o.sz}"/>` : ""}`;
  return t.split("\n").map((line, i) => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${x(line)}</w:t></w:r>`).join("");
};
const p = (runs: string, style = "", extra = "") => `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>` : ""}${runs}</w:p>`;
const empty = () => p(run("Not filled in yet", { i: true, color: GREY }));
const bullet = (t: string, mark = "•") => p(run(mark + "\t") + run(t), "ListBullet");
const border = (c = LINE) => `<w:top w:val="single" w:sz="4" w:color="${c}"/><w:left w:val="single" w:sz="4" w:color="${c}"/><w:bottom w:val="single" w:sz="4" w:color="${c}"/><w:right w:val="single" w:sz="4" w:color="${c}"/><w:insideH w:val="single" w:sz="4" w:color="${c}"/><w:insideV w:val="single" w:sz="4" w:color="${c}"/>`;
const cell = (w: number, body: string, fill = "") => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${body}</w:tc>`;
const table = (widths: number[], rows: string[], opts: { header?: boolean; borderColor?: string } = {}) =>
  `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, c) => a + c, 0)}" w:type="dxa"/><w:tblBorders>${border(opts.borderColor)}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>` + p("", "", `<w:spacing w:after="60"/>`);
const row = (cells: string, header = false) => `<w:tr>${header ? `<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>` : `<w:trPr><w:cantSplit/></w:trPr>`}${cells}</w:tr>`;
const TAG_SHORT: Record<string, string> = { keep: "Attorney", delegate: "Delegate", automate: "Automate" };

function docxBody(b: Body, m: ExportMeta): string {
  const out: string[] = [];
  out.push(p(run(b.title || "Playbook"), "Title"));
  out.push(p(run([m.firm, `Version ${m.version}`, m.status === "approved" ? "Approved" : "Not yet approved", `Exported ${m.date}`].filter(Boolean).join("  |  "), { color: GREY }), "Subtitle"));
  // Summary box
  const sum: Array<[string, string]> = [["Outcome", b.outcome], ["Practice area and jurisdiction", [b.practice_area, b.jurisdiction].filter(Boolean).join(", ")], ["When to use it", b.when_to_use], ["Deliverables", b.deliverables]];
  out.push(table([2600, 6760], sum.map(([k, v]) => row(cell(2600, p(run(k, { b: true, color: BRAND }), "TableText"), SOFT) + cell(6760, v ? p(run(v), "TableText") : p(run("Not filled in yet", { i: true, color: GREY }), "TableText"))))));
  const h1 = (t: string) => out.push(p(run(t), "Heading1"));
  h1("Roles");
  const roles = (b.roles || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!roles.length) out.push(empty());
  roles.forEach((l) => {
    const k = l.indexOf(":");
    out.push(k > 0 && k < 40 ? p(run(l.slice(0, k + 1), { b: true }) + run(l.slice(k + 1))) : p(run(l)));
  });
  h1("What you need first");
  if (!b.needs.length) out.push(empty());
  b.needs.forEach((t) => out.push(bullet(t)));
  h1("Steps");
  if (!b.steps.length) out.push(empty());
  else {
    const W = [500, 4760, 1300, 1300, 800, 1100];
    const hd = ["#", "What to do", "Who", "Tool", "Time", "Type"].map((t, i) => cell(W[i], p(run(t, { b: true, color: "FFFFFF" }), "TableText"), BRAND)).join("");
    const rows = [row(hd, true)];
    b.steps.forEach((st, i) => {
      const what = p(run(st.text), "TableText") + (st.decision ? p(run("If: ", { b: true, color: BRAND }) + run(st.decision, { i: true }), "TableText") : "");
      const keep = st.tag === "keep";
      rows.push(row(cell(W[0], p(run(String(i + 1), { b: true }), "TableText")) + cell(W[1], what) + cell(W[2], p(run(st.who), "TableText")) + cell(W[3], p(run(st.tool), "TableText")) +
        cell(W[4], p(run(st.minutes ? st.minutes + " min" : ""), "TableText")) + cell(W[5], p(run(st.tag ? TAG_SHORT[st.tag] : "", keep ? { b: true, color: BRAND } : {}), "TableText"), keep ? SOFT : "")));
    });
    out.push(table(W, rows));
  }
  if (b.has_deadlines || b.deadlines) { h1("Deadlines and timing"); out.push(b.deadlines ? p(run(b.deadlines)) : empty()); }
  h1("Quality checks");
  if (!b.checks.length) out.push(empty());
  b.checks.forEach((t) => out.push(bullet(t, "☐")));
  h1("Attorney review and ethics points");
  const review = [...b.review_points.map((t) => bullet(t)), ...(b.never_delegate.length ? [p(run("Never delegate", { b: true, color: BRAND }), "TableText"), ...b.never_delegate.map((t) => bullet(t))] : [])];
  out.push(review.length ? table([9360], [row(cell(9360, review.join(""), SOFT))], { borderColor: "E3C6D3" }) : empty());
  if (b.resources.length) { h1("Templates and resources"); b.resources.forEach((t) => out.push(bullet(t))); }
  if (b.tools.length) { h1("Tools"); b.tools.forEach((t) => out.push(bullet(t))); }
  return out.join("");
}

export function toDocx(b: Body, m: ExportMeta): Uint8Array {
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${docxBody(b, m)}<w:sectPr>${BRAND_HEADER_REF}<w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1300" w:right="1440" w:bottom="1300" w:left="1440" w:header="720" w:footer="600" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const fld = (code: string) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${ns}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs></w:pPr>${run(footerText(m))}<w:r><w:tab/></w:r>${run("Page ")}${fld("PAGE")}${run(" of ")}${fld("NUMPAGES")}</w:p></w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="${INK}"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:color w:val="${BRAND}"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="${GREY}"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="3" w:color="${HEAD}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${BRAND}"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:pPr><w:spacing w:after="40" w:line="252" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:rPr><w:color w:val="${GREY}"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${BRAND_HEADER_TYPES}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>${BRAND_HEADER_OVERRIDE}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${BRAND_HEADER_REL}</Relationships>`),
    "word/document.xml": strToU8(doc),
    "word/styles.xml": strToU8(styles),
    "word/footer1.xml": strToU8(footer),
    ...brandHeaderFiles(),
  });
}

export function fileName(b: Body, m: ExportMeta, ext: string): string {
  const t = (b.title || "Playbook").replace(/[^A-Za-z0-9 ._-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Playbook";
  return `DELA - ${t} - v${m.version} - ${m.date}.${ext}`;
}

// Today's date (YYYY-MM-DD) in Lawfecta's time zone (setting quota.timezone), not in UTC,
// so an export made in the evening in California is dated that day (Stacey's test 2026-11-05)
export function dayIn(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (k: string) => parts.find((x) => x.type === k)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
