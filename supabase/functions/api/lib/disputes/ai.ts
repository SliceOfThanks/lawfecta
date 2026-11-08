// Step 11 (docs/briefs/step-11-disputes.md): DELA's AI on disputes. It only suggests: it never moves money, never decides,
// never gives legal advice and never names a winner. Code checks every answer before anyone sees it. The prompt never
// carries names, only the roles "attorney" and "freelancer".

export type CaseFacts = {
  category: string;
  opened_by_role: string;
  wants: string;
  wants_release_cents: number | null;
  milestone: { title: string; amount_cents: number; deliverables?: string; due_date?: string | null } | null;
  statements: Array<{ role: string; kind: string; body: string }>;
  evidence: Array<{ role: string; label: string }>;
  offers: Array<{ from_role: string; release_cents: number; refund_cents: number; status: string; note?: string }>;
  check?: { status?: string; score?: number | null; findings?: unknown; statement?: string } | null;
};

export const DISPUTE_NOTE = "This is an AI suggestion. It is not legal advice and it does not decide the dispute.";

const BASE = "You help two people on a legal operations marketplace settle a disagreement about one paid milestone. You never give legal " +
  "advice, never say who is right as a fact, never invent facts, and never mention names (only \"the attorney\" and \"the freelancer\"). " +
  "Use plain words and only the facts given. Answer only with JSON.";

export const SUMMARY_SYSTEM = BASE + " Summarize both sides neutrally: what was agreed for this milestone, what each side says and wants, " +
  "the points they agree on and the points still open. JSON: {\"summary\":\"...\",\"agreed\":[\"...\"],\"open\":[\"...\"]}. Each list at most 5 items.";

export const SUGGEST_SYSTEM = BASE + " Suggest a fair settlement offer that splits the milestone amount between the freelancer (release) and " +
  "the attorney (refund), based on how much of the agreed deliverables the statements show was delivered. Explain why in two or three sentences. " +
  "JSON: {\"release_cents\":integer,\"why\":\"...\"}. release_cents is between 0 and the milestone amount in cents.";

export const DRAFT_SYSTEM = BASE + " You draft a decision for the Lawfecta Team, who will read and edit it and then decide. Give a neutral " +
  "summary, the agreement points that matter, a suggested split of the milestone amount and the reasons, and a short note to both sides in plain words. " +
  "JSON: {\"summary\":\"...\",\"terms\":[\"...\"],\"release_cents\":integer,\"why\":\"...\",\"note\":\"...\"}";

const money = (c: number) => "$" + ((Number(c) || 0) / 100).toFixed(2);
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const CATEGORY: Record<string, string> = {
  not_delivered: "not delivered", late: "late", not_as_agreed: "not what was agreed", quality: "quality", not_accepted: "payment or acceptance withheld", other: "other",
};

export function casePrompt(c: CaseFacts): string {
  const m = c.milestone;
  const lines = [
    "Milestone: " + clip(m?.title, 200) + " (" + money(m?.amount_cents ?? 0) + (m?.due_date ? ", due " + m.due_date : "") + ")",
    "Agreed deliverables: " + (clip(m?.deliverables, 1500) || "(not written)"),
    "Opened by the " + (c.opened_by_role === "freelancer" ? "freelancer" : "attorney") + ", about: " + (CATEGORY[c.category] ?? "other") +
      (c.wants_release_cents !== null ? ". They ask for " + money(c.wants_release_cents) + " to the freelancer and " + money((m?.amount_cents ?? 0) - c.wants_release_cents) + " back to the attorney." : "."),
    "Statements:",
    ...c.statements.slice(0, 20).map((s) => "- The " + (s.role === "team" ? "Lawfecta Team" : s.role) + " (" + s.kind + "): " + clip(s.body, 1500)),
    "Links shared: " + (c.evidence.length ? c.evidence.slice(0, 20).map((e) => "the " + e.role + ": " + clip(e.label, 120)).join("; ") : "none"),
    "Offers: " + (c.offers.length ? c.offers.slice(-6).map((o) => "the " + o.from_role + " offered " + money(o.release_cents) + " to the freelancer (" + o.status + ")").join("; ") : "none"),
  ];
  if (c.check) lines.push("DELA's milestone check: " + clip(c.check.status, 40) + (typeof c.check.score === "number" ? ", score " + c.check.score : "") + (c.check.statement ? ". The freelancer's delivery note: " + clip(c.check.statement, 800) : ""));
  return lines.join("\n");
}

const list = (x: unknown, n: number) => (Array.isArray(x) ? x : []).map((t) => clip(t, 300)).filter(Boolean).slice(0, n);
// Words that would make the AI's answer sound like a ruling or legal advice
const RULING = /\b(you must|legally|liable|liability|breach of contract|court|lawsuit|sue)\b/i;
const tidy = (s: string) => RULING.test(s) ? "" : s;

export function readSummary(j: Record<string, any> | null): { summary: string; agreed: string[]; open: string[] } | null {
  if (!j) return null;
  const summary = tidy(clip(j.summary, 1500));
  if (!summary) return null;
  return { summary, agreed: list(j.agreed, 5).map(tidy).filter(Boolean), open: list(j.open, 5).map(tidy).filter(Boolean) };
}

export function readSuggest(j: Record<string, any> | null, amount: number): { release_cents: number; refund_cents: number; why: string } | null {
  if (!j) return null;
  const r = Math.round(Number(j.release_cents));
  if (!Number.isFinite(r) || r < 0 || r > amount) return null;
  const why = tidy(clip(j.why, 800));
  return { release_cents: r, refund_cents: amount - r, why };
}

export function readDraft(j: Record<string, any> | null, amount: number): { summary: string; terms: string[]; release_cents: number; refund_cents: number; why: string; note: string } | null {
  const s = readSuggest(j, amount);
  if (!s || !j) return null;
  return { summary: tidy(clip(j.summary, 1500)), terms: list(j.terms, 6).map(tidy).filter(Boolean), release_cents: s.release_cents, refund_cents: s.refund_cents, why: s.why, note: tidy(clip(j.note, 1000)) };
}
