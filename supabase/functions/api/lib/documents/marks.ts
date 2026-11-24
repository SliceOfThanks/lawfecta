// Step 80b: light formatting inside a document's text (Stacey 2026-11-24: bold, italic, bullets and links).
// The text stays a plain string with four marks in it, so no table changes and old versions still read:
//   **bold**   *italic*   a line that starts "- " (a bullet)   [words](https://link)
// A star the member typed themself is kept as \* so it is never read as a mark.
// Nothing here trusts the text: a link is only ever https, and what is written into a page or a Word file is escaped
// by the caller's own escaping function before any tag is added.

export type Seg = { t: string; b?: boolean; i?: boolean; href?: string };

const HTTPS = /^https:\/\/[^\s<>"')\]]+$/i;

// One line of text as pieces, each bold, italic, a link, or plain
export function inlineSegs(line: string): Seg[] {
  const out: Seg[] = [];
  let buf = "", b = false, i = false;
  const flush = () => { if (buf) { out.push({ t: buf, ...(b ? { b } : {}), ...(i ? { i } : {}) }); buf = ""; } };
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (ch === "\\" && line[k + 1] === "*") { buf += "*"; k++; continue; }
    if (ch === "*" && line[k + 1] === "*") {
      // Bold opens only tight against a word, and only when it closes later on this line
      if (b || (line[k + 2] !== " " && line.indexOf("**", k + 2) > k + 1)) { flush(); b = !b; k++; continue; }
    } else if (ch === "*") {
      if (i || (line[k + 1] !== " " && closesItalic(line, k + 1))) { flush(); i = !i; continue; }
    } else if (ch === "[") {
      const close = line.indexOf("](", k + 1), end = close < 0 ? -1 : line.indexOf(")", close + 2);
      if (close > k + 1 && end > close + 2) {
        const words = line.slice(k + 1, close), href = line.slice(close + 2, end);
        if (HTTPS.test(href) && !words.includes("[")) { flush(); out.push({ t: stripMarks(words), href, ...(b ? { b } : {}), ...(i ? { i } : {}) }); k = end; continue; }
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

// The text with its marks taken out: what the checks, the gig hand-overs and the step checklist read
export function stripMarks(text: string): string {
  return String(text ?? "").split("\n").map((line) => inlineSegs(line).map((s) => s.t).join("")).join("\n");
}

// A link that is not https loses its link and keeps its words. Run on every text when a document is saved.
export function cleanMarks(text: string): string {
  const t = String(text ?? "");
  if (t.indexOf("](") < 0) return t;
  let out = "";
  for (let k = 0; k < t.length; k++) {
    if (t[k] === "[") {
      const close = t.indexOf("](", k + 1), end = close < 0 ? -1 : t.indexOf(")", close + 2), nl = t.indexOf("\n", k);
      if (close > k && end > close && (nl < 0 || nl > end)) {
        const words = t.slice(k + 1, close), href = t.slice(close + 2, end);
        if (!HTTPS.test(href)) { out += words; k = end; continue; }
      }
    }
    out += t[k];
  }
  return out;
}

// Lines grouped into paragraphs and bullet lists
export function richBlocks(text: string): Array<{ bullets: boolean; lines: Seg[][] }> {
  const out: Array<{ bullets: boolean; lines: Seg[][] }> = [];
  for (const raw of String(text ?? "").split("\n")) {
    const bullet = raw.startsWith("- ");
    const segs = inlineSegs(bullet ? raw.slice(2) : raw);
    const last = out[out.length - 1];
    if (last && last.bullets === bullet) last.lines.push(segs); else out.push({ bullets: bullet, lines: [segs] });
  }
  return out;
}

// For the web page and PDF exports. esc is the caller's HTML escaping; every piece of text goes through it.
export function marksToHtml(text: string, esc: (t: string) => string): string {
  const seg = (s: Seg) => {
    let h = esc(s.t);
    if (s.b) h = `<strong>${h}</strong>`;
    if (s.i) h = `<em>${h}</em>`;
    if (s.href) h = `<a href="${esc(s.href)}" rel="noopener noreferrer">${h}</a>`;
    return h;
  };
  return richBlocks(text).map((bl) => bl.bullets
    ? `<ul>${bl.lines.map((l) => `<li>${l.map(seg).join("")}</li>`).join("")}</ul>`
    : bl.lines.map((l) => l.map(seg).join("")).join("<br>")).join("");
}

// For Word: the same text as runs. A link shows its words and then its address, so it survives printing.
export function marksToRuns<O extends { b?: boolean; i?: boolean }>(text: string, run: (t: string, o: O) => string, base: O): string {
  const lines: string[] = [];
  for (const bl of richBlocks(text)) for (const l of bl.lines) {
    lines.push((bl.bullets ? run("• ", base) : "") + l.map((s) => run(s.href ? `${s.t} (${s.href})` : s.t, { ...base, b: base.b || s.b, i: base.i || s.i })).join(""));
  }
  return lines.map((x, k) => (k ? run("\n", base) : "") + x).join("");
}
