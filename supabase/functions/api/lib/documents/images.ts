// Images in documents (docs/briefs/step-2e-document-images.md). A document body holds only references: the image id (a
// doc_images record) and its caption. Where images may go depends on the type; Policies stay text only.
import type { DocType } from "./model.ts";

export type ImageRef = { id: string; caption: string };
// Image facts from the database (dela_doc_images_facts)
export type ImageFact = { confirmed: boolean; held: boolean; status: string; source: string; caption: string; created_at: string; width: number; height: number; ext: string; path: string; current_at: string | null };
export type ImageFacts = Record<string, ImageFact>;

// Sections (besides steps) that take images, per type
export const IMAGE_SECTIONS: Record<DocType, Array<{ key: string; label: string }>> = {
  sop: [{ key: "before_you_start", label: "Before you start" }],
  workflow: [{ key: "chart", label: "Swimlane chart" }],
  playbook: [{ key: "scripts", label: "Scripts and templates" }, { key: "examples", label: "Examples" }],
  policy: [],
};
export const stepsTakeImages = (t: DocType) => t === "sop" || t === "workflow";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// The hard ceiling while reading a body; the setting (documents.images.per_step) is applied on save
export const IMAGE_CEILING = 10;
export function readRefs(v: unknown, clean: (t: string) => string): ImageRef[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: ImageRef[] = [];
  for (const x of v) {
    const id = String((x as any)?.id ?? "").toLowerCase();
    if (!UUID.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, caption: clean(String((x as any)?.caption ?? "")).slice(0, 200) });
    if (out.length >= IMAGE_CEILING) break;
  }
  return out;
}

// Every image in a document with where it sits ("Step 2", "Before you start")
export type Placed = ImageRef & { where: string; step: number | null; section: string };
export function placedImages(b: { type: DocType; steps: Array<{ images: ImageRef[] }>; section_images: Record<string, ImageRef[]> }): Placed[] {
  const out: Placed[] = [];
  const word = b.type === "workflow" ? "Stage " : "Step ";
  b.steps.forEach((st, i) => st.images.forEach((im) => out.push({ ...im, where: word + (i + 1), step: i + 1, section: "" })));
  for (const s of IMAGE_SECTIONS[b.type]) (b.section_images[s.key] ?? []).forEach((im) => out.push({ ...im, where: s.label, step: null, section: s.key }));
  return out;
}
export const imageIds = (b: Parameters<typeof placedImages>[0]) => [...new Set(placedImages(b).map((p) => p.id))];

// Image sizes from the file itself (PNG IHDR, JPEG SOF), for the Word layout
export function imageSize(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) return { w: (bytes[16] << 24 | bytes[17] << 16 | bytes[18] << 8 | bytes[19]) >>> 0, h: (bytes[20] << 24 | bytes[21] << 16 | bytes[22] << 8 | bytes[23]) >>> 0 };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const m = bytes[i + 1];
      const len = bytes[i + 2] << 8 | bytes[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: bytes[i + 5] << 8 | bytes[i + 6], w: bytes[i + 7] << 8 | bytes[i + 8] };
      i += 2 + len;
    }
  }
  return null;
}

// What exports need: the image bytes, keyed by image id (loaded by the api for the firm's own images only)
export type ExportImage = { bytes: Uint8Array; ext: string; w: number; h: number };
export type ExportImages = Map<string, ExportImage>;

// Images taken off before a body goes to the AI, and put back on the steps and sections they came from
export function withoutImages<T extends { steps: Array<{ images: ImageRef[] }>; section_images: Record<string, ImageRef[]> }>(b: T): T {
  return { ...b, steps: b.steps.map((st) => ({ ...st, images: [] })), section_images: {} };
}
export function carryImages<T extends { type: DocType; steps: Array<{ text: string; images: ImageRef[] }>; section_images: Record<string, ImageRef[]> }>(before: T, after: T): T {
  const used = new Set<number>();
  const steps = after.steps.map((st, i) => {
    if (st.images.length) return st;
    let j = before.steps.findIndex((x, k) => !used.has(k) && x.text === st.text);
    if (j < 0 && before.steps.length === after.steps.length && !used.has(i)) j = i;
    if (j < 0) return st;
    used.add(j);
    return { ...st, images: before.steps[j].images };
  });
  // Steps whose text changed beyond recognition keep their images on the nearest step, so no image is lost
  const lost = before.steps.flatMap((x, k) => (used.has(k) ? [] : x.images));
  if (lost.length && steps.length && stepsTakeImages(after.type)) {
    const last = steps.length - 1;
    steps[last] = { ...steps[last], images: [...steps[last].images, ...lost.filter((im) => !steps.some((s) => s.images.some((y) => y.id === im.id)))] };
  }
  const section_images: Record<string, ImageRef[]> = {};
  for (const s of IMAGE_SECTIONS[after.type]) section_images[s.key] = after.section_images[s.key]?.length ? after.section_images[s.key] : before.section_images[s.key] ?? [];
  return { ...after, steps: stepsTakeImages(after.type) ? steps : after.steps.map((st) => ({ ...st, images: [] })), section_images };
}
