// Formatting inside a document's text. The text stays a plain string with marks in it, so no table changes and every
// older version still reads. No HTML is ever stored.
// Step 80b (Stacey 2026-11-24: bold, italic, bullets and links):
//   **bold**   *italic*   a line that starts "- " (a bullet)   [words](https://link)
// Step 88 (Stacey 2026-11-24: headings, numbered lists, alignment, tables, pictures, video), each at the start of a line:
//   __underline__ (inside a line)
//   ## Heading      ### Small heading
//   1. a numbered line (renumbered when shown)
//   {center} words   {right} words   {justify} words   (may stand before a heading)
//   | cell | cell |          a table row; the first row of a run of rows is the header
//   ![caption](image:ID)     a picture from DELA's own picture records
//   @[title](https://...)    a video on YouTube, Vimeo or Loom
// A star or a double underscore the member typed themself is kept as \* or \_ so it is never read as a mark.
// Nothing here trusts the text: a link is only ever https, a video is only ever one of three sites, and what is written
// into a page or a Word file is escaped by the caller's own escaping function before any tag is added.

export type Seg = { t: string; b?: boolean; i?: boolean; u?: boolean; href?: string };
export type Align = "center" | "right" | "justify";
export type Block =
  | { kind: "p" | "h1" | "h2" | "ul" | "ol"; align?: Align; lines: Seg[][] }
  | { kind: "table"; rows: Seg[][][] }
  | { kind: "image"; id: string; caption: string }
  | { kind: "video"; title: string; url: string };

const HTTPS = /^https:\/\/[^\s<>"')\]]+$/i;
const IMAGE_LINE = /^!\[([^\]\n]*)\]\(image:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i;
const VIDEO_LINE = /^@\[([^\]\n]*)\]\((https:\/\/[^\s<>"')\]]+)\)$/i;
const NUMBERED = /^\d{1,3}\. /;
const ALIGN = /^\{(center|right|justify)\} /;
export const TABLE_MAX_COLS = 8, TABLE_MAX_ROWS = 40;

// A video address DELA will show: the site, and the address its player is loaded from. Anything else is null.
export function videoInfo(url: string): { site: "YouTube" | "Vimeo" | "Loom"; embed: string } | null {
  const u = String(url ?? "").trim();
  if (!HTTPS.test(u)) return null;
  let m = /^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})(?:[?&#/][^\s]*)?$/.exec(u) || /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/][^\s]*)?$/.exec(u);
  if (m) return { site: "YouTube", embed: "https://www.youtube-nocookie.com/embed/" + m[1] };
  m = /^https:\/\/(?:www\.)?vimeo\.com\/(\d{6,12})(?:\/([0-9a-f]{6,16}))?(?:[?#][^\s]*)?$/.exec(u) || /^https:\/\/player\.vimeo\.com\/video\/(\d{6,12})(?:\?h=([0-9a-f]{6,16}))?$/.exec(u);
  if (m) return { site: "Vimeo", embed: "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : "") };
  m = /^https:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([0-9a-f]{32})(?:[?#][^\s]*)?$/.exec(u);
  if (m) return { site: "Loom", embed: "https://www.loom.com/embed/" + m[1] };
  return null;
}

// One line of text as pieces, each bold, italic, underlined, a link, or plain
export function inlineSegs(line: string): Seg[] {
  const out: Seg[] = [];
  let buf = "", b = false, i = false, u = false;
  const on = () => ({ ...(b ? { b } : {}), ...(i ? { i } : {}), ...(u ? { u } : {}) });
  const flush = () => { if (buf) { out.push({ t: buf, ...on() }); buf = ""; } };
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (ch === "\\" && (line[k + 1] === "*" || line[k + 1] === "_")) { buf += line[k + 1]; k++; continue; }
    if (ch === "*" && line[k + 1] === "*") {
      // Bold opens only tight against a word, and only when it closes later on this line
      if (b || (line[k + 2] !== " " && line.indexOf("**", k + 2) > k + 1)) { flush(); b = !b; k++; continue; }
    } else if (ch === "*") {
      if (i || (line[k + 1] !== " " && closesItalic(line, k + 1))) { flush(); i = !i; continue; }
    } else if (ch === "_" && line[k + 1] === "_") {
      // Underline: the same rule as bold, and never a run of underscores (a blank to fill in)
      if (u ? line[k + 2] !== "_" : (line[k + 2] !== undefined && line[k + 2] !== " " && line[k + 2] !== "_" && closesUnder(line, k + 2))) { flush(); u = !u; k++; continue; }
    } else if (ch === "[") {
      const close = line.indexOf("](", k + 1), end = close < 0 ? -1 : line.indexOf(")", close + 2);
      if (close > k + 1 && end > close + 2) {
        const words = line.slice(k + 1, close), href = line.slice(close + 2, end);
        if (HTTPS.test(href) && !words.includes("[")) { flush(); out.push({ t: inlineSegs(words).map((s) => s.t).join(""), href, ...on() }); k = end; continue; }
      }
    }
    buf += ch;
  }
  flush();
  return out;
}
function closesItalic(line: string, from: number): boolean {
  for (let k = from; k < line.length; k++) {
    if (line[k] === "\\" && line[k + 1] === "*") { k++; continue; }
    if (line[k] === "*") { if (line[k + 1] === "*") { k++; continue; } return k > from; }
  }
  return false;
}
function closesUnder(line: string, from: number): boolean {
  for (let k = from; k < line.length - 1; k++) {
    if (line[k] === "\\" && line[k + 1] === "_") { k++; continue; }
    if (line[k] === "_" && line[k + 1] === "_" && line[k - 1] !== "_" && line[k + 2] !== "_") return k > from;
  }
  return false;
}

// A table row as its cells (the words between the bars), or null when the line is not a row
function rowCells(line: string): string[] | null {
  const t = line.trim();
  if (t.length < 3 || t[0] !== "|" || t[t.length - 1] !== "|") return null;
  return t.slice(1, -1).split("|").map((c) => c.trim());
}

// The text as blocks: paragraphs, headings, lists, tables, pictures and videos, in the order they stand
export function richBlocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw0 of String(text ?? "").split("\n")) {
    const last = out[out.length - 1];
    const im = IMAGE_LINE.exec(raw0.trim());
    if (im) { out.push({ kind: "image", id: im[2].toLowerCase(), caption: im[1].trim() }); continue; }
    const vd = VIDEO_LINE.exec(raw0.trim());
    if (vd && videoInfo(vd[2])) { out.push({ kind: "video", title: vd[1].trim(), url: vd[2] }); continue; }
    const cells = rowCells(raw0);
    if (cells) {
      const row = cells.map((c) => inlineSegs(c));
      if (last && last.kind === "table") last.rows.push(row); else out.push({ kind: "table", rows: [row] });
      continue;
    }
    let raw = raw0, align: Align | undefined;
    const al = ALIGN.exec(raw);
    if (al) { align = al[1] as Align; raw = raw.slice(al[0].length); }
    if (raw.startsWith("### ")) { out.push({ kind: "h2", ...(align ? { align } : {}), lines: [inlineSegs(raw.slice(4))] }); continue; }
    if (raw.startsWith("## ")) { out.push({ kind: "h1", ...(align ? { align } : {}), lines: [inlineSegs(raw.slice(3))] }); continue; }
    if (raw.startsWith("- ")) { const segs = inlineSegs(raw.slice(2)); if (last && last.kind === "ul") last.lines.push(segs); else out.push({ kind: "ul", lines: [segs] }); continue; }
    const nm = NUMBERED.exec(raw);
    if (nm) { const segs = inlineSegs(raw.slice(nm[0].length)); if (last && last.kind === "ol") last.lines.push(segs); else out.push({ kind: "ol", lines: [segs] }); continue; }
    const segs = inlineSegs(raw);
    if (last && last.kind === "p" && last.align === align) last.lines.push(segs); else out.push({ kind: "p", ...(align ? { align } : {}), lines: [segs] });
  }
  return out;
}

const words = (l: Seg[]) => l.map((s) => s.t).join("");

// The text with its marks taken out: what the checks, the gig hand-overs and the step checklist read. A table reads as
// its cells, a picture as its caption, a video as its title and address.
export function stripMarks(text: string): string {
  const lines: string[] = [];
  for (const bl of richBlocks(text)) {
    if (bl.kind === "image") { if (bl.caption) lines.push(bl.caption); }
    else if (bl.kind === "video") lines.push((bl.title ? bl.title + " " : "") + "(" + bl.url + ")");
    else if (bl.kind === "table") for (const r of bl.rows) lines.push(r.map(words).filter(Boolean).join(", "));
    else for (const l of bl.lines) lines.push(words(l));
  }
  return lines.join("\n");
}

// Run on every text when a document is saved. A link that is not https loses its link and keeps its words. A video that
// is not on one of the three sites keeps its title as words. A table keeps at most the allowed columns and rows.
export function cleanMarks(text: string, maxCols = TABLE_MAX_COLS, maxRows = TABLE_MAX_ROWS): string {
  let t = String(text ?? "");
  if (t.indexOf("](") >= 0) {
    t = t.split("\n").map((line) => {
      const vd = /^@\[([^\]\n]*)\]\(([^)\n]*)\)$/.exec(line.trim());
      if (vd && !videoInfo(vd[2])) return vd[1].trim();
      if (IMAGE_LINE.test(line.trim()) || (vd && videoInfo(vd[2]))) return line.trim();
      return cleanLinks(line);
    }).join("\n");
  }
  if (t.indexOf("|") >= 0) {
    const out: string[] = [];
    let run = 0;
    for (const line of t.split("\n")) {
      const cells = rowCells(line);
      if (!cells) { run = 0; out.push(line); continue; }
      run++;
      if (run > maxRows) continue;
      out.push("| " + cells.slice(0, maxCols).join(" | ") + " |");
    }
    t = out.join("\n");
  }
  return t;
}
function cleanLinks(t: string): string {
  if (t.indexOf("](") < 0) return t;
  let out = "";
  for (let k = 0; k < t.length; k++) {
    if (t[k] === "[") {
      const close = t.indexOf("](", k + 1), end = close < 0 ? -1 : t.indexOf(")", close + 2);
      if (close > k && end > close) {
        const w = t.slice(k + 1, close), href = t.slice(close + 2, end);
        if (!HTTPS.test(href) && !(k > 0 && t[k - 1] === "!" && /^image:/i.test(href))) { out += w; k = end; continue; }
      }
    }
    out += t[k];
  }
  return out;
}

// A line that is a picture or a video. Scrubs that rewrite words leave these lines alone, so an ID or an address in
// them is never taken for an account number or a contact detail.
export function isMediaLine(line: string): boolean {
  const t = String(line ?? "").trim();
  if (IMAGE_LINE.test(t)) return true;
  const vd = VIDEO_LINE.exec(t);
  return !!vd && !!videoInfo(vd[2]);
}
export function outsideMedia(text: string, fn: (t: string) => string): string {
  const t = String(text ?? "");
  if (t.indexOf("](") < 0) return fn(t);
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { out.push(fn(buf.join("\n"))); buf = []; } };
  for (const line of t.split("\n")) { if (isMediaLine(line)) { flush(); out.push(line.trim()); } else buf.push(line); }
  flush();
  return out.join("\n");
}
export const withoutMedia = (text: string) => String(text ?? "").split("\n").filter((l) => !isMediaLine(l)).join("\n");

// The pictures a text refers to, in order
export function imagesIn(text: string): Array<{ id: string; caption: string }> {
  const t = String(text ?? "");
  if (t.indexOf("](image:") < 0) return [];
  return richBlocks(t).flatMap((bl) => bl.kind === "image" ? [{ id: bl.id, caption: bl.caption }] : []);
}
export const imageIdsIn = (text: string): string[] => imagesIn(text).map((x) => x.id);
// The same text without the pictures the caller does not keep
export function keepImages(text: string, keep: (id: string) => boolean): string {
  const t = String(text ?? "");
  if (t.indexOf("](image:") < 0) return t;
  return t.split("\n").filter((line) => { const im = IMAGE_LINE.exec(line.trim()); return !im || keep(im[2].toLowerCase()); }).join("\n");
}

// For the web page and PDF exports: block-level HTML. esc is the caller's HTML escaping; every piece of text goes through
// it. image is the caller's way to show a picture (it holds the bytes); without it a picture is a line of words.
export function marksToHtml(text: string, esc: (t: string) => string, image?: (id: string, caption: string) => string): string {
  const seg = (s: Seg) => {
    let h = esc(s.t);
    if (s.b) h = `<strong>${h}</strong>`;
    if (s.i) h = `<em>${h}</em>`;
    if (s.u) h = `<u>${h}</u>`;
    if (s.href) h = `<a href="${esc(s.href)}" rel="noopener noreferrer">${h}</a>`;
    return h;
  };
  const line = (l: Seg[]) => l.map(seg).join("");
  const st = (a?: Align) => a ? ` style="text-align:${a}"` : "";
  return richBlocks(text).map((bl) => {
    if (bl.kind === "image") return image ? image(bl.id, bl.caption) : `<p class="cap">[Image: ${esc(bl.caption || "no caption")}]</p>`;
    if (bl.kind === "video") return `<p class="vid">Video: <a href="${esc(bl.url)}" rel="noopener noreferrer">${esc(bl.title || bl.url)}</a></p>`;
    if (bl.kind === "table") return `<table>${bl.rows.map((r, k) => `<tr>${r.map((c) => k ? `<td>${line(c)}</td>` : `<th>${line(c)}</th>`).join("")}</tr>`).join("")}</table>`;
    if (bl.kind === "ul" || bl.kind === "ol") return `<${bl.kind}>${bl.lines.map((l) => `<li>${line(l)}</li>`).join("")}</${bl.kind}>`;
    if (bl.kind === "h1" || bl.kind === "h2") return `<p class="${bl.kind === "h1" ? "sub1" : "sub2"}"${st(bl.align)}><strong>${line(bl.lines[0])}</strong></p>`;
    return `<p${st(bl.align)}>${bl.lines.map(line).join("<br>")}</p>`;
  }).join("");
}

// For Word: the same text as pieces the caller turns into paragraphs, tables and pictures. A link shows its words and
// then its address, so it survives printing; so does a video.
export type RunO = { b?: boolean; i?: boolean; u?: boolean; sz?: number; color?: string };
export type Piece =
  | { kind: "p"; runs: string; align?: Align; head?: 1 | 2 }
  | { kind: "table"; rows: string[][] }
  | { kind: "image"; id: string; caption: string };
export function marksToPieces(text: string, run: (t: string, o: RunO) => string, base: RunO = {}): Piece[] {
  const line = (l: Seg[], o: RunO) => l.map((s) => run(s.href ? `${s.t} (${s.href})` : s.t, { ...o, b: o.b || s.b, i: o.i || s.i, u: o.u || s.u })).join("");
  const out: Piece[] = [];
  for (const bl of richBlocks(text)) {
    if (bl.kind === "image") out.push({ kind: "image", id: bl.id, caption: bl.caption });
    else if (bl.kind === "video") out.push({ kind: "p", runs: run("Video: " + (bl.title ? bl.title + " " : "") + "(" + bl.url + ")", base) });
    else if (bl.kind === "table") out.push({ kind: "table", rows: bl.rows.map((r, k) => r.map((c) => line(c, k ? base : { ...base, b: true }))) });
    else if (bl.kind === "ul") bl.lines.forEach((l) => out.push({ kind: "p", runs: run("• ", base) + line(l, base) }));
    else if (bl.kind === "ol") bl.lines.forEach((l, k) => out.push({ kind: "p", runs: run((k + 1) + ". ", base) + line(l, base) }));
    else if (bl.kind === "h1" || bl.kind === "h2") out.push({ kind: "p", runs: line(bl.lines[0], { ...base, b: true, sz: bl.kind === "h1" ? 26 : 23 }), ...(bl.align ? { align: bl.align } : {}), head: bl.kind === "h1" ? 1 : 2 });
    else out.push({ kind: "p", runs: bl.lines.map((l, k) => (k ? run("\n", base) : "") + line(l, base)).join(""), ...(bl.align ? { align: bl.align } : {}) });
  }
  return out;
}

// For the Markdown export: the marks are nearly Markdown already. The ones Markdown does not know are written out.
export function marksToMarkdown(text: string): string {
  const out: string[] = [];
  let inTable = false;
  for (const raw0 of String(text ?? "").split("\n")) {
    const im = IMAGE_LINE.exec(raw0.trim());
    const vd = VIDEO_LINE.exec(raw0.trim());
    const cells = rowCells(raw0);
    if (cells && !im && !vd) { out.push("| " + cells.join(" | ") + " |"); if (!inTable) out.push("|" + cells.map(() => " --- |").join("")); inTable = true; continue; }
    inTable = false;
    if (im) { out.push("[Image: " + (im[1].trim() || "no caption") + "]"); continue; }
    if (vd && videoInfo(vd[2])) { out.push("[" + (vd[1].trim() || "Video") + "](" + vd[2] + ")"); continue; }
    out.push(raw0.replace(ALIGN, "").replace(/^### /, "#### ").replace(/^## /, "### "));
  }
  return out.join("\n");
}
