// Checks that an uploaded file really is the type its name says (by its contents, not its name), refuses files
// that carry active content, and reads its text for the AI. Files are only ever read, never run.
import { unzipSync } from "npm:fflate@0.8.2";
import { extractText, getDocumentProxy } from "npm:unpdf@1.4.0";

export const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  png: "image/png",
  jpg: "image/jpeg",
};

const MAX_TEXT = 400_000;
const MAX_PDF_PAGES = 300;

const starts = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

function hasBytes(b: Uint8Array, needle: string): boolean {
  const n = ascii(needle);
  outer: for (let i = 0; i + n.length <= b.length; i++) {
    for (let j = 0; j < n.length; j++) if (b[i + j] !== n[j]) continue outer;
    return true;
  }
  return false;
}

export type Sniff = { ok: true; mime: string } | { ok: false; reason: "wrong_type" | "active_content" | "damaged" };

export function sniff(ext: string, b: Uint8Array): Sniff {
  if (b.length === 0) return { ok: false, reason: "damaged" };
  switch (ext) {
    case "pdf":
      if (!starts(b, ascii("%PDF-"))) return { ok: false, reason: "wrong_type" };
      // Scripts, launch actions and files hidden inside a PDF are refused
      if (["/JavaScript", "/JS ", "/JS(", "/JS<", "/Launch", "/EmbeddedFile", "/RichMedia"].some((k) => hasBytes(b, k))) return { ok: false, reason: "active_content" };
      return { ok: true, mime: CONTENT_TYPES.pdf };
    case "docx": {
      if (!starts(b, [0x50, 0x4b, 0x03, 0x04])) return { ok: false, reason: "wrong_type" };
      // Only the list of parts is read here; nothing is unpacked
      const names: string[] = [];
      try {
        unzipSync(b, { filter: (f) => { names.push(f.name); return false; } });
      } catch {
        return { ok: false, reason: "damaged" };
      }
      if (!names.includes("word/document.xml") || !names.includes("[Content_Types].xml")) return { ok: false, reason: "wrong_type" };
      if (names.some((n) => n.toLowerCase().endsWith("vbaproject.bin") || n.toLowerCase().startsWith("word/embeddings/"))) return { ok: false, reason: "active_content" };
      return { ok: true, mime: CONTENT_TYPES.docx };
    }
    case "png":
      return starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? { ok: true, mime: CONTENT_TYPES.png } : { ok: false, reason: "wrong_type" };
    case "jpg":
      return starts(b, [0xff, 0xd8, 0xff]) ? { ok: true, mime: CONTENT_TYPES.jpg } : { ok: false, reason: "wrong_type" };
    case "txt":
    case "md": {
      if (b.includes(0)) return { ok: false, reason: "wrong_type" };
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(b);
      } catch {
        return { ok: false, reason: "wrong_type" };
      }
      return { ok: true, mime: CONTENT_TYPES[ext] };
    }
  }
  return { ok: false, reason: "wrong_type" };
}

// Word: the visible text of each paragraph, one per line
function docxText(b: Uint8Array): string {
  const xml = new TextDecoder().decode(unzipSync(b, { filter: (f) => f.name === "word/document.xml" })["word/document.xml"]);
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfText(b: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(new Uint8Array(b));
  if (doc.numPages > MAX_PDF_PAGES) return "";
  const { text } = await extractText(doc, { mergePages: true });
  return String(text ?? "").trim();
}

// Text for the AI. Images have none here; the AI looks at them directly when a member asks.
export async function readText(ext: string, b: Uint8Array): Promise<string> {
  let t = "";
  if (ext === "txt" || ext === "md") t = new TextDecoder().decode(b);
  else if (ext === "docx") t = docxText(b);
  else if (ext === "pdf") t = await pdfText(b);
  return t.slice(0, MAX_TEXT);
}

export async function sha256(b: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
