// Step 8b Part B (docs/briefs/step-8b-ux-retest.md, answers B1 to B10): the plain-language Library.
// Plain category names, the one-sentence purpose on each card, and DELA's suggested structure for
// "What would you like to document?" (worked out in code: no AI, no credits).
import { type DocType, guessLifecycle, STARTERS, TYPE_INFO } from "./model.ts";

// B3: plain names for the seven lifecycle groups (the prefixes stay inside documents and in search)
export const PLAIN_GROUPS: Record<string, string> = {
  INT: "Client intake", ENG: "Client onboarding", MAT: "Matter management", DOC: "Documents and filing",
  BIL: "Billing", CLS: "Closing a matter", ADM: "Firm administration",
};

const CARD_CHARS = 120;

// The first sentence, cut at a word near 120 characters
export function firstSentence(text: string): string {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const end = t.search(/[.!?](\s|$)/);
  const one = end >= 0 ? t.slice(0, end + 1) : t;
  if (one.length <= CARD_CHARS) return one;
  const cut = one.slice(0, CARD_CHARS);
  const space = cut.lastIndexOf(" ");
  return (space > 60 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "") + "...";
}

// B4: the purpose, or the first step when no purpose was written, or nothing
export function purposeLine(purpose: string, firstStep: string): { text: string; from: "purpose" | "step" | null } {
  const p = firstSentence(purpose);
  if (p) return { text: p, from: "purpose" };
  const s = firstSentence(firstStep);
  if (s) return { text: "First step: " + s, from: "step" };
  return { text: "", from: null };
}

const REASONS: Record<DocType, string> = {
  sop: "This sounds like a step-by-step procedure (SOP): one routine task done the same way each time.",
  workflow: "This sounds like a workflow: how work moves through stages and between people.",
  policy: "This sounds like a policy: the rules for what must and must not happen.",
  playbook: "This sounds like a playbook: guidance for situations that need judgment.",
};

const STOP = new Set(["with", "from", "that", "this", "when", "into", "what", "your", "their", "have", "will", "then", "before", "after", "about", "each", "every", "make", "sure", "how", "the", "and", "for", "new", "send", "check"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w) => w.length >= 4 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

export type Suggestion = { type: DocType; label: string; reason: string; lifecycle: string; group: string; starter: { id: string; title: string; type: DocType; lifecycle: string } | null };

export function suggestStructure(text: string): Suggestion {
  const t = String(text ?? "").slice(0, 2000);
  const low = t.toLowerCase();
  // A starter whose title words are (mostly) in the description: "conflict check before a new client" finds "Run a conflict check"
  const mine = new Set(words(t).map(stem));
  let best: (typeof STARTERS)[number] | null = null, bestScore = 0;
  for (const s of STARTERS) {
    const tw = words(s.title).map(stem);
    if (!tw.length) continue;
    const hit = tw.filter((w) => mine.has(w)).length;
    const score = hit / tw.length;
    if (hit >= 1 && score > bestScore) { best = s; bestScore = score; }
  }
  const starter = best && bestScore > 0.5 ? best : null;
  let type: DocType;
  if (starter) type = starter.type;
  else if (/\b(policy|policies|rules?|must not|never allowed|allowed to|not allowed|acceptable use|code of conduct|retention period|dress code)\b/.test(low)) type = "policy";
  else if (/\b(workflow|stages?|end to end|end-to-end|from start to finish|hand ?offs?|who does what|pipeline|lifecycle|from intake to|to close)\b/.test(low)) type = "workflow";
  else if (/\b(judg(e)?ment|decide|negotiat\w*|upset|angry|complain\w*|dispute\w*|difficult|objection\w*|handle a|handling|escalat\w*|what to say)\b/.test(low)) type = "playbook";
  else type = "sop";
  const lifecycle = starter ? starter.lifecycle : guessLifecycle(t);
  return {
    type, label: TYPE_INFO[type].label, reason: REASONS[type], lifecycle, group: PLAIN_GROUPS[lifecycle] ?? "Firm administration",
    starter: starter ? { id: starter.id, title: starter.title, type: starter.type, lifecycle: starter.lifecycle } : null,
  };
}
