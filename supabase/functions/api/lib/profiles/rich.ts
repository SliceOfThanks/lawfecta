// Step 50 (docs/briefs/step-50-profile-formatting.md): light formatting in the profile's long text boxes.
// The text stays plain text with a few marks: "## " for a heading, "- " and "1. " for lists, **bold**, *italic*, and a
// picture written as ![what it shows](img:<id>.png). There is no HTML and there are no links: the browser builds the
// page from these marks itself, so nothing a member types is ever run as code.

export const IMG_REF = /!\[([^\]\n]{0,160})\]\(img:([0-9a-f-]{36})\.(png|jpg)\)/g;

// The pictures a text names, as "<id>.<ext>", each once, in order
export function richImages(...texts: string[]): string[] {
  const out: string[] = [];
  for (const t of texts) for (const m of String(t ?? "").matchAll(IMG_REF)) { const k = m[2] + "." + m[3]; if (!out.includes(k)) out.push(k); }
  return out;
}

// The same text with the marks taken out, for the directory listing, search and anywhere that shows plain words
export function richPlain(t: string): string {
  return String(t ?? "")
    .replace(IMG_REF, "")
    .replace(/\*\*([^*\n]+)\*\*/g, (_m, a) => a)
    .replace(/(^|[^*])\*([^*\n]+)\*/g, (_m, a, b) => a + b)
    .replace(/^#{1,4}\s+/gm, "")
    .split("\n").map((l) => l.trimEnd()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}

export const imagePath = (person: string, key: string) => `profiles/${person}/img-${key}`;
