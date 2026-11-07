// UX review Phase 4 part B (docs/briefs/step-8a-phase-4.md): the checks before a commitment. DELA's AI only suggests; code
// checks every answer before anyone sees it: known fields only, short text, no ranking of people, no legal advice, and a
// fixed note that the check does not confirm legal correctness. Nothing here saves, posts, signs or pays.

export type HelperKey = "check_scope" | "compare_proposals" | "agreement_check" | "acceptance_criteria" | "monthly_scope" | "proposal_check"
  | "check_steps" | "improve_section" | "explain_findings" | "describe_firm" | "improve_request" | "find_fit" | "agenda" | "review_draft";
export const HELPERS: HelperKey[] = ["check_scope", "compare_proposals", "agreement_check", "acceptance_criteria", "monthly_scope", "proposal_check",
  "check_steps", "improve_section", "explain_findings", "describe_firm", "improve_request", "find_fit", "agenda", "review_draft"];

// Which side may run each helper ("client" is an attorney, or an agency hiring as a client)
export const HELPER_SIDE: Record<HelperKey, "client" | "freelancer" | "both"> = {
  check_scope: "client", compare_proposals: "client", acceptance_criteria: "client", monthly_scope: "both", agreement_check: "both", proposal_check: "freelancer",
  check_steps: "client", improve_section: "client", explain_findings: "client", describe_firm: "client", find_fit: "client",
  improve_request: "both", agenda: "both", review_draft: "both",
};

// The fields a finding may point at, per helper. "Use suggestion" only fills a field the screen has.
export const HELPER_FIELDS: Record<HelperKey, string[]> = {
  check_scope: ["title", "task", "outcome", "steps", "timing", "budget", "deadline", "milestones", "other"],
  compare_proposals: [],
  agreement_check: ["included", "excluded", "schedule", "milestones", "price", "other"],
  acceptance_criteria: [],
  monthly_scope: ["task", "quantity", "turnaround", "exclusions", "other"],
  proposal_check: ["price", "days", "included", "excluded", "schedule", "qualifications", "message", "other"],
  check_steps: ["step", "other"],
  improve_section: ["purpose", "scope", "other"],
  explain_findings: [], describe_firm: [], improve_request: [], find_fit: [], agenda: [], review_draft: [],
};
// Helpers whose findings point at a numbered row (a monthly task, a document step)
const ROWED: HelperKey[] = ["monthly_scope", "check_steps"];

export const NOT_LEGAL = "These checks do not confirm legal correctness and are not legal advice.";
export const MAX_FINDINGS = 8;

const BASE = "You help a legal operations marketplace. You check text for gaps before a commitment. You never give legal advice, never say the " +
  "work or agreement is legally correct, never invent facts, qualifications or numbers, and never rank or recommend a person. Use plain words. " +
  "Answer only with JSON.";

export const HELPER_SYSTEM: Record<HelperKey, string> = {
  check_scope: BASE + " Check a gig draft before the attorney posts it. Flag vague outputs, missing inputs or dependencies, no deadline, " +
    "steps that are not actions, and a budget that does not fit the work described. JSON: {\"findings\":[{\"field\":one of title|task|outcome|steps|timing|budget|deadline|milestones|other," +
    "\"problem\":\"...\",\"suggestion\":\"replacement text for that field, or empty\"}]}. At most 8 findings. For steps and milestones, a suggestion is one item per line.",
  compare_proposals: BASE + " Compare proposals for one gig side by side. For every proposal give the same fields: how it covers the gig's work, " +
    "what it does not say (missing details), and questions the attorney could ask. Never say which is better, never score, never rank. " +
    "JSON: {\"proposals\":[{\"id\":\"the proposal id given\",\"covers\":\"...\",\"missing\":[\"...\"],\"ask\":[\"...\"]}]}",
  agreement_check: BASE + " Compare an agreement's scope and milestones with the proposal it came from and with the gig. Flag mismatches, " +
    "work in the proposal that the agreement leaves out, milestones without a clear deliverable, and missing acceptance criteria. " +
    "JSON: {\"findings\":[{\"field\":one of included|excluded|schedule|milestones|price|other,\"problem\":\"...\",\"suggestion\":\"\"}]}. At most 8.",
  acceptance_criteria: BASE + " Suggest clearer, observable deliverables for each milestone, so both people can tell when it is done. Keep the " +
    "milestone's purpose; do not add new work or change amounts or dates. JSON: {\"milestones\":[{\"seq\":1,\"deliverables\":\"...\",\"why\":\"...\"}]}",
  monthly_scope: BASE + " Check the tasks of a monthly engagement. Flag unclear tasks, missing monthly quantities, missing turnaround and missing " +
    "exclusions. Never change the price. JSON: {\"findings\":[{\"row\":1,\"field\":one of task|quantity|turnaround|exclusions|other,\"problem\":\"...\",\"suggestion\":\"\"}]}. At most 8.",
  proposal_check: BASE + " Check a freelancer's proposal before they send it, against the gig. Flag what the gig asks for that the proposal does " +
    "not cover, a missing \"leaves out\" line, an unclear schedule, and qualifications that are not tied to the work. Never invent qualifications. " +
    "JSON: {\"findings\":[{\"field\":one of price|days|included|excluded|schedule|qualifications|message|other,\"problem\":\"...\",\"suggestion\":\"\"}]}. At most 8.",
  check_steps: BASE + " Check the steps of a law firm procedure. Flag missing inputs, steps that are not one clear action starting with a verb, " +
    "unclear handoffs between roles, and missing deadlines. Never change who decides: a step marked attorney decides stays with the attorney. " +
    "JSON: {\"findings\":[{\"row\":1,\"field\":\"step\" or \"other\",\"problem\":\"...\",\"suggestion\":\"the rewritten step text, or empty\"}]}. At most 8.",
  improve_section: BASE + " Improve the Purpose and Scope of a law firm procedure: a concise purpose (one or two sentences) and a scope with clear " +
    "boundaries (who and what it covers, and what it does not). Do not add new work. JSON: {\"findings\":[{\"field\":\"purpose\" or \"scope\",\"problem\":\"...\",\"suggestion\":\"replacement text\"}]}",
  explain_findings: BASE + " Explain, in plain words, each quality check finding of a law firm document: what it means and how to fix it. Say whether " +
    "it blocks approval or is a suggestion, as given. Never say the document is approved or legally correct. JSON: {\"items\":[{\"id\":\"the id given\",\"explain\":\"...\"}]}",
  describe_firm: BASE + " From a short description a lawyer wrote, fill in their firm profile: firm size (one of solo, 2-5, 6-20, 21+), practice areas, " +
    "jurisdictions, and the systems they named, grouped by the group keys given. Only use what the description says; leave a field empty when it does not say. " +
    "JSON: {\"size\":\"\",\"practice_areas\":[],\"jurisdictions\":\"\",\"systems\":{\"group key\":[\"names\"]}}",
  improve_request: BASE + " Rewrite a member's unsent request to an operations assistant so it is clear and complete: the task, the inputs, the " +
    "output wanted and any deadline. Keep their meaning; do not add client details. List what is missing. JSON: {\"suggestion\":\"...\",\"missing\":[\"...\"]}",
  find_fit: BASE + " Turn a lawyer's description of a task into search filters for finding a freelancer: one practice area, one skill, one tech " +
    "tool and a two-letter US state, each only when the description supports it. Never name or pick a person. " +
    "JSON: {\"practice_area\":\"\",\"skill\":\"\",\"tool\":\"\",\"state\":\"\",\"why\":\"...\"}",
  agenda: BASE + " Suggest three short discussion points for a first meeting about one gig, so both people can confirm fit and scope. " +
    "No client details. JSON: {\"points\":[\"...\",\"...\",\"...\"]}",
  review_draft: BASE + " Turn a member's own star ratings and notes into a short, factual review of the work. Use only what the notes say: never " +
    "add praise, complaints, facts or feelings they did not give, and never mention client information. JSON: {\"review\":\"...\"}",
};

const clip = (x: unknown, n: number) => String(x ?? "").replace(/\s+\n/g, "\n").trim().slice(0, n);

// Sentences that rank, recommend, judge legal correctness or say something is approved are removed (the attorney chooses
// and approves; DELA is not a lawyer)
const BANNED = /\b(best|better than|worse than|strongest|weakest|top choice|winner|rank(ed|ing)?|recommend(ed|s)?|should (choose|hire|pick|go with)|legally (sound|correct|valid|binding|enforceable)|is enforceable|complies with the law|(is|are|now) approved|ready (to|for) (be )?approv\w*|you can approve|approves? (it|this|the document))\b/i;
export function clean(text: unknown, n = 500): string {
  const t = clip(text, n * 2);
  const out = t.split(/(?<=[.!?])\s+/).filter((sx) => !BANNED.test(sx)).join(" ").trim();
  return out.slice(0, n);
}

export type Finding = { field: string; row?: number; problem: string; suggestion: string };
export function readFindings(key: HelperKey, j: any, rows = 0): Finding[] {
  const allowed = HELPER_FIELDS[key];
  const list = Array.isArray(j?.findings) ? j.findings : [];
  const out: Finding[] = [];
  for (const x of list) {
    const field = allowed.includes(String(x?.field)) ? String(x.field) : "other";
    const problem = clean(x?.problem, 400);
    if (!problem) continue;
    const f: Finding = { field, problem, suggestion: field === "other" || field === "budget" || field === "deadline" || field === "price" ? "" : clean(x?.suggestion, 1500) };
    if (ROWED.includes(key)) {
      const r = Number(x?.row);
      if (Number.isInteger(r) && r >= 1 && r <= rows) f.row = r; else f.suggestion = "";
    }
    out.push(f);
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

export type Compared = { id: string; covers: string; missing: string[]; ask: string[] };
// Every proposal gets the same fields, in the order the attorney sees them; anything the AI made up is dropped
export function readCompare(j: any, ids: string[]): Compared[] {
  const got = new Map<string, any>();
  for (const x of Array.isArray(j?.proposals) ? j.proposals : []) if (ids.includes(String(x?.id))) got.set(String(x.id), x);
  const list = (v: unknown) => (Array.isArray(v) ? v : []).map((t) => clean(t, 200)).filter(Boolean).slice(0, 4);
  return ids.map((id) => {
    const x = got.get(id) ?? {};
    return { id, covers: clean(x.covers, 400) || "DELA could not summarize this proposal. Read it in the table.", missing: list(x.missing), ask: list(x.ask) };
  });
}

export type Criteria = { seq: number; deliverables: string; why: string };
export function readCriteria(j: any, seqs: number[]): Criteria[] {
  const out: Criteria[] = [];
  for (const x of Array.isArray(j?.milestones) ? j.milestones : []) {
    const seq = Number(x?.seq);
    if (!seqs.includes(seq) || out.some((o) => o.seq === seq)) continue;
    const d = clean(x?.deliverables, 600);
    if (d) out.push({ seq, deliverables: d, why: clean(x?.why, 300) });
  }
  return out.sort((a, b) => a.seq - b.seq);
}

// "Explain these findings": one plain explanation per finding the document really has
export function readExplain(j: any, ids: string[]): Array<{ id: string; explain: string }> {
  const out: Array<{ id: string; explain: string }> = [];
  for (const x of Array.isArray(j?.items) ? j.items : []) {
    const id = String(x?.id ?? "");
    if (!ids.includes(id) || out.some((o) => o.id === id)) continue;
    const e = clean(x?.explain, 500);
    if (e) out.push({ id, explain: e });
  }
  return out;
}

// "Help me describe my firm": a known size, and only systems the member actually named in their description
export const FIRM_SIZES = ["solo", "2-5", "6-20", "21+"];
export function readFirm(j: any, typed: string, groups: string[]): Finding[] {
  const out: Finding[] = [];
  const t = typed.toLowerCase();
  const size = String(j?.size ?? "");
  if (FIRM_SIZES.includes(size)) out.push({ field: "size", problem: "Firm size", suggestion: size });
  const areas = (Array.isArray(j?.practice_areas) ? j.practice_areas : []).map((x: unknown) => clip(x, 60)).filter(Boolean).slice(0, 8);
  if (areas.length) out.push({ field: "practice_areas", problem: "Practice areas", suggestion: areas.join(", ") });
  const ju = clean(j?.jurisdictions, 200);
  if (ju) out.push({ field: "jurisdictions", problem: "Jurisdictions", suggestion: ju });
  for (const g of groups) {
    const names = (Array.isArray(j?.systems?.[g]) ? j.systems[g] : []).map((x: unknown) => clip(x, 60)).filter((n: string) => n && t.includes(n.toLowerCase())).slice(0, 6);
    if (names.length) out.push({ field: "sys:" + g, problem: "Systems", suggestion: names.join(", ") });
  }
  return out;
}

// "Help me find a fit": filters only, a real two-letter state, never a person
export function readFit(j: any, states: string[]): Finding[] {
  const why = clean(j?.why, 300) || "From your description.";
  const out: Finding[] = [];
  for (const f of ["practice_area", "skill", "tool"]) { const v = clip(j?.[f], 60); if (v) out.push({ field: f, problem: why, suggestion: v }); }
  const st = String(j?.state ?? "").toUpperCase();
  if (states.includes(st)) out.push({ field: "state", problem: why, suggestion: st });
  return out;
}
