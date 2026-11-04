// Members see AI answers as plain text, so Markdown symbols (**bold**, # headings, `code`) are removed
const inner = (_: string, t: string) => t;

export function plainText(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, inner)
    .replace(/__(.+?)__/g, inner)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`\n]+)`/g, inner)
    .replace(/^\s*[*]\s+/gm, "- ")
    .trim();
}
