// The document standard (brief docs/briefs/step-2d-document-standard.md; guide docs/standards/law-firm-document-guide.txt).
// Every Library item is a document of one of four types: Policy, Workflow, SOP, Playbook. This file holds the structure of
// each type, the converter for older items, the scrub for client data and credentials, the self-check (in code, never by the
// AI), the RACI and KPI rules, the word count, the starter library and the exports.
import { strToU8, zipSync } from "npm:fflate@0.8.2";
import { BRAND_HEADER_OVERRIDE, BRAND_HEADER_REF, BRAND_HEADER_REL, brandHeaderFiles } from "../brand/docx.ts";
import { htmlBrandLine } from "../brand/logo.ts";
import type { Body as LegacyBody } from "../playbooks/model.ts";
import { patternCheck } from "../ai/clientcheck.ts";
import { IMAGE_SECTIONS, type ExportImages, type ImageFacts, type ImageRef, placedImages, readRefs, stepsTakeImages } from "./images.ts";
export * from "./images.ts";

export type DocType = "policy" | "workflow" | "sop" | "playbook";
export const DOC_TYPES: DocType[] = ["policy", "workflow", "sop", "playbook"];
export const TYPE_INFO: Record<DocType, { label: string; line: string; example: string }> = {
  policy: { label: "Policy", line: "The rules and boundaries. Says what must and must not happen.", example: "Trust accounting, confidentiality, AI use, file retention" },
  workflow: { label: "Workflow", line: "The map of how work moves through stages and between people.", example: "Intake to signed engagement; matter open to matter close" },
  sop: { label: "SOP", line: "Exact steps for one routine task. Same result every time.", example: "Running a conflict check, opening a matter, depositing a retainer" },
  playbook: { label: "Playbook", line: "Guidance for situations that need judgment: preferred approach, fallbacks, limits, escalation.", example: "Contract negotiation positions, an upset client, a fee dispute" },
};

// Client lifecycle groups (Section 4) and their ID prefixes
export const LIFECYCLE: Array<{ prefix: string; label: string }> = [
  { prefix: "INT", label: "Intake and conflicts" }, { prefix: "ENG", label: "Engagement and onboarding" }, { prefix: "MAT", label: "Matter management and calendaring" },
  { prefix: "DOC", label: "Documents, drafting and filing" }, { prefix: "BIL", label: "Billing, trust and collections" }, { prefix: "CLS", label: "Matter closing and file retention" },
  { prefix: "ADM", label: "Firm admin (HR, IT, marketing)" },
];
const PREFIXES = LIFECYCLE.map((l) => l.prefix);

export type RoleKind = "attorney" | "staff" | "freelancer";
export const DEFAULT_ROLES: Array<{ name: string; kind: RoleKind }> = [
  { name: "Attorney", kind: "attorney" }, { name: "Supervising attorney", kind: "attorney" }, { name: "Paralegal", kind: "staff" }, { name: "Legal assistant", kind: "staff" },
  { name: "Intake specialist", kind: "staff" }, { name: "Billing/bookkeeper", kind: "staff" }, { name: "Office manager", kind: "staff" }, { name: "Outsourced freelancer", kind: "freelancer" },
];
export const SOLO_ROLES = ["Attorney", "Outsourced freelancer"];
export const SYSTEM_GROUPS: Array<[string, string]> = [["practice_management", "Practice management"], ["document_management", "Document management"], ["calendaring", "Calendaring"],
  ["billing", "Billing"], ["e_signature", "E-signature"], ["phone_intake", "Phone and intake"], ["other", "Other"]];

export type Raci = Record<string, string>; // role -> "R", "A", "R,A", "C", "I" or ""
export type Rule = { name: string; link: string; verify_by: string };
export type DocStep = {
  text: string; role: string; raci: Raci; attorney_decides: boolean; not_judgment: boolean; system: string; menu_path: string; minutes: number | null;
  rule: Rule | null; stage: string; handoff: string; target_time: string; linked_sop: string; screenshot: string; images: ImageRef[];
};
export type Decision = { if: string; then: string; attorney_decides: boolean; escalate_to: string };
export type Kpi = { name: string; measures: string; kind: "leading" | "lagging" | ""; source: string; owner_role: string; baseline: string; target: string; rhythm: string };
export type Link = { label: string; url: string };
export type Escalation = { issue: string; decider_role: string; how_fast: string };
export type DocBody = {
  schema: 2; type: DocType; title: string; lifecycle: string; high_risk: boolean; owner_role: string; process_owner_role: string;
  practice_area: string; jurisdiction: string; role_kinds: Record<string, RoleKind>;
  purpose: string; scope: string; trigger: string; roles: string[]; before_you_start: string[]; steps: DocStep[]; decisions: Decision[];
  timing: string; timing_rule: Rule | null; quality_check: string[]; quality_reviewer_role: string; done_when: string; saved_in: string; related_links: Link[];
  start_point: string; end_point: string; kpis: Kpi[];
  situations: string[]; principles: string[]; preferred: string; fallbacks: string[]; hard_limits: string[]; escalation: Escalation[]; scripts: string[]; examples: string[];
  rules_must: string[]; rules_must_not: string[]; exceptions: string; exceptions_role: string;
  section_images: Record<string, ImageRef[]>; // images on sections other than steps (IMAGE_SECTIONS); never on a Policy
  skipped: string[]; // the process questions the attorney skipped (shown as quality panel flags, never exported)
};

// The sections of each type, in order (labels as members and exports show them)
export const SECTIONS: Record<DocType, Array<{ key: string; label: string }>> = {
  sop: [{ key: "header", label: "Header" }, { key: "purpose", label: "Purpose" }, { key: "scope", label: "Scope" }, { key: "trigger", label: "Trigger" }, { key: "roles", label: "Roles" },
    { key: "before_you_start", label: "Before you start" }, { key: "steps", label: "Steps" }, { key: "decisions", label: "Decision points and escalation" }, { key: "timing", label: "Timing" },
    { key: "quality_check", label: "Quality check" }, { key: "done_when", label: "Done when" }, { key: "related_links", label: "Related links" }, { key: "change_log", label: "Change log" }],
  workflow: [{ key: "owner", label: "Name and process owner" }, { key: "start_end", label: "Start and end points" }, { key: "stages", label: "Stages" }, { key: "handoffs", label: "Handoffs" },
    { key: "decisions", label: "Decision points" }, { key: "target_times", label: "Target time per stage" }, { key: "linked_sops", label: "Linked SOPs" }, { key: "kpis", label: "KPIs" }],
  playbook: [{ key: "situations", label: "Situations covered" }, { key: "principles", label: "Guiding principles" }, { key: "preferred", label: "Preferred approach" },
    { key: "fallbacks", label: "Acceptable fallbacks" }, { key: "hard_limits", label: "Hard limits" }, { key: "escalation", label: "Escalation" }, { key: "scripts", label: "Scripts and templates" },
    { key: "examples", label: "Examples" }],
  policy: [{ key: "header", label: "Header" }, { key: "purpose", label: "Purpose" }, { key: "scope", label: "Scope" }, { key: "rules", label: "The rules" },
    { key: "exceptions", label: "Exceptions and who approves them" }, { key: "related_links", label: "Related links" }, { key: "change_log", label: "Change log" }],
};

// ---------- Cleaning ----------
// No em or en dashes anywhere (writing rule), trimmed and length-limited
export const tidy = (t: string) => t.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",").replace(/[ \t]+/g, " ").trim();
const s = (v: unknown, max = 3000) => tidy(typeof v === "string" ? v.slice(0, max * 2) : typeof v === "number" ? String(v) : "").slice(0, max);
const list = (v: unknown, max = 60, len = 1000): string[] => {
  if (typeof v === "string") v = v.split("\n");
  return Array.isArray(v) ? v.map((x) => s(typeof x === "object" && x ? (x as any).text ?? (x as any).name ?? "" : x, len)).map((x) => x.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean).slice(0, max) : [];
};
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const url = (v: unknown) => { const t = s(v, 500); return /^https:\/\/[^\s]+$/i.test(t) || /^[A-Z]{3}-\d{2,3}$/.test(t) ? t : ""; };
const LETTERS = ["R", "A", "C", "I"];
function raciCell(v: unknown): string {
  const set = new Set(String(v ?? "").toUpperCase().split(/[^RACI]+|(?=[RACI])/).filter((x) => LETTERS.includes(x)));
  return LETTERS.filter((l) => set.has(l)).join(",");
}
function rule(v: unknown): Rule | null {
  if (!v || typeof v !== "object") return null;
  const r = { name: s((v as any).name, 200), link: url((v as any).link), verify_by: date((v as any).verify_by) };
  return r.name || r.link || r.verify_by ? r : null;
}

export function normalizeDoc(raw: unknown): DocBody {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const type: DocType = DOC_TYPES.includes(b.type) ? b.type : "sop";
  const roles = list(b.roles, 20, 60);
  const kinds: Record<string, RoleKind> = {};
  for (const [k, v] of Object.entries(b.role_kinds && typeof b.role_kinds === "object" ? b.role_kinds : {})) if (["attorney", "staff", "freelancer"].includes(String(v))) kinds[s(k, 60)] = v as RoleKind;
  for (const r of roles) if (!kinds[r]) kinds[r] = guessKind(r);
  const steps = (Array.isArray(b.steps) ? b.steps : []).slice(0, 80).map((x: any): DocStep => {
    const o = typeof x === "string" ? { text: x } : (x ?? {});
    const m = Number(o.minutes);
    const raci: Raci = {};
    for (const [k, v] of Object.entries(o.raci && typeof o.raci === "object" ? o.raci : {})) { const c = raciCell(v); if (c) raci[s(k, 60)] = c; }
    return {
      text: s(o.text, 1200), role: s(o.role ?? o.who, 60), raci, attorney_decides: o.attorney_decides === true, not_judgment: o.not_judgment === true,
      system: s(o.system ?? o.tool, 120), menu_path: s(o.menu_path, 300), minutes: Number.isFinite(m) && m > 0 ? Math.min(Math.round(m), 10000) : null,
      rule: rule(o.rule), stage: s(o.stage, 120), handoff: s(o.handoff, 600), target_time: s(o.target_time, 120), linked_sop: s(o.linked_sop, 120),
      screenshot: /^[0-9a-f-]{36}$/.test(String(o.screenshot ?? "")) ? String(o.screenshot) : "",
      images: stepsTakeImages(type) ? readRefs(o.images, (t) => s(t, 200)) : [],
    };
  }).filter((x: DocStep) => x.text);
  return {
    schema: 2, type, title: s(b.title, 200), lifecycle: PREFIXES.includes(b.lifecycle) ? b.lifecycle : "", high_risk: b.high_risk === true,
    owner_role: s(b.owner_role, 60), process_owner_role: s(b.process_owner_role, 60), practice_area: s(b.practice_area, 100), jurisdiction: s(b.jurisdiction, 200), role_kinds: kinds,
    purpose: s(b.purpose, 800), scope: s(b.scope, 1500), trigger: s(b.trigger, 600), roles, before_you_start: list(b.before_you_start), steps,
    decisions: (Array.isArray(b.decisions) ? b.decisions : []).slice(0, 30).map((d: any) => ({ if: s(d?.if, 500), then: s(d?.then, 800), attorney_decides: d?.attorney_decides === true, escalate_to: s(d?.escalate_to, 60) })).filter((d: Decision) => d.if || d.then),
    timing: s(b.timing, 1200), timing_rule: rule(b.timing_rule), quality_check: list(b.quality_check), quality_reviewer_role: s(b.quality_reviewer_role, 60),
    done_when: s(b.done_when, 800), saved_in: s(b.saved_in, 300),
    related_links: (Array.isArray(b.related_links) ? b.related_links : []).slice(0, 30).map((l: any) => typeof l === "string" ? { label: s(l, 200), url: "" } : { label: s(l?.label, 200), url: url(l?.url) }).filter((l: Link) => l.label),
    start_point: s(b.start_point, 600), end_point: s(b.end_point, 600),
    kpis: (Array.isArray(b.kpis) ? b.kpis : []).slice(0, 8).map((k: any): Kpi => ({ name: s(k?.name, 120), measures: s(k?.measures, 300), kind: k?.kind === "leading" || k?.kind === "lagging" ? k.kind : "",
      source: s(k?.source, 200), owner_role: s(k?.owner_role, 60), baseline: s(k?.baseline, 120), target: s(k?.target, 120), rhythm: s(k?.rhythm, 60) })).filter((k: Kpi) => k.name),
    situations: list(b.situations), principles: list(b.principles), preferred: s(b.preferred, 2000), fallbacks: list(b.fallbacks), hard_limits: list(b.hard_limits),
    escalation: (Array.isArray(b.escalation) ? b.escalation : []).slice(0, 20).map((e: any) => ({ issue: s(e?.issue, 300), decider_role: s(e?.decider_role, 60), how_fast: s(e?.how_fast, 120) })).filter((e: Escalation) => e.issue),
    scripts: list(b.scripts, 30, 2000), examples: list(b.examples, 20, 1500), rules_must: list(b.rules_must), rules_must_not: list(b.rules_must_not),
    exceptions: s(b.exceptions, 1500), exceptions_role: s(b.exceptions_role, 60), skipped: list(b.skipped, 10, 80),
    section_images: Object.fromEntries(IMAGE_SECTIONS[type].map((x) => [x.key, readRefs(b.section_images?.[x.key], (t) => s(t, 200))])),
  };
}

export function guessKind(role: string): RoleKind {
  const r = role.toLowerCase();
  if (/attorney|lawyer|partner|counsel/.test(r)) return "attorney";
  if (/freelanc|outsourc|contractor/.test(r)) return "freelancer";
  return "staff";
}
export const isDoc = (raw: unknown) => !!raw && typeof raw === "object" && (raw as any).schema === 2;

// An older playbook (Step 2 format) read as a document. The type comes from the type check (classifyLegacy or the AI).
export function fromLegacy(v1: LegacyBody, type: DocType = "sop"): DocBody {
  const roleLines = (v1.roles || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const roles = [...new Set(roleLines.map((l) => (l.includes(":") ? l.split(":")[0] : l).trim()).filter((r) => r && r.length <= 60))];
  for (const st of v1.steps) if (st.who && !roles.includes(st.who)) roles.push(st.who);
  const steps: DocStep[] = v1.steps.map((st) => {
    const raci: Raci = {};
    if (st.who) raci[st.who] = st.tag === "keep" ? "R,A" : "R";
    return { text: st.text, role: st.who, raci, attorney_decides: st.tag === "keep", not_judgment: false, system: st.tool, menu_path: "", minutes: st.minutes, rule: null,
      stage: "", handoff: "", target_time: "", linked_sop: "", screenshot: st.screenshot, images: [] };
  });
  const decisions: Decision[] = [
    ...v1.steps.filter((st) => st.decision).map((st) => ({ if: st.decision, then: "", attorney_decides: false, escalate_to: "" })),
    ...v1.review_points.map((t) => ({ if: t, then: "Stop. The attorney decides.", attorney_decides: true, escalate_to: "Attorney" })),
    ...v1.never_delegate.map((t) => ({ if: t, then: "Never delegated. The attorney does this.", attorney_decides: true, escalate_to: "Attorney" })),
  ];
  return normalizeDoc({
    type, title: v1.title, practice_area: v1.practice_area, jurisdiction: v1.jurisdiction, purpose: v1.outcome,
    scope: [v1.practice_area, v1.jurisdiction].filter(Boolean).join(", ") + (v1.when_to_use ? (v1.practice_area || v1.jurisdiction ? ". " : "") + v1.when_to_use : ""),
    trigger: "", roles, before_you_start: [...v1.needs, ...v1.tools.map((t) => "Access to " + t)], steps, decisions, timing: v1.deadlines,
    quality_check: v1.checks, done_when: v1.deliverables, related_links: v1.resources.map((r) => ({ label: r, url: "" })),
    situations: type === "playbook" ? [v1.when_to_use].filter(Boolean) : [], preferred: type === "playbook" ? v1.steps.map((x) => x.text).join(" ") : "",
    hard_limits: type === "playbook" ? v1.never_delegate : [], start_point: type === "workflow" ? v1.when_to_use : "", end_point: type === "workflow" ? v1.deliverables : "",
  });
}

// The guide's type check without AI (used when DELA's AI is not available): judgment words point to a Playbook, several roles
// with handoffs to a Workflow, one path to an SOP
export function classifyLegacy(v1: LegacyBody): { type: DocType; reason: string } {
  const text = [v1.title, v1.outcome, v1.when_to_use, ...v1.steps.map((x) => x.text + " " + x.decision)].join(" ").toLowerCase();
  const judgment = (text.match(/\b(depending on|use judgment|options?|fallbacks?|if the client (is|seems)|negotiat|upset|dispute|consider whether|it depends)\b/g) ?? []).length;
  const roles = new Set(v1.steps.map((x) => x.who.toLowerCase()).filter(Boolean));
  if (judgment >= 2) return { type: "playbook", reason: "It offers options and judgment calls more than one fixed path." };
  if (roles.size >= 3 && v1.steps.length >= 6) return { type: "workflow", reason: "It moves work across " + roles.size + " roles and several stages." };
  return { type: "sop", reason: "It is one clear step-by-step path." };
}

// ---------- Scrubbing: client data and credentials (before drafting and on every save) ----------
const CREDENTIALS: Array<[RegExp, string]> = [
  [/\b(password|passcode|passwd|pwd|pin)\s*(is|:|=)\s*\S+/gi, "[removed: password]"],
  [/\b(user ?name|login|log-in)\s*(is|:|=)\s*\S+/gi, "[removed: login]"],
  [/\b(account|acct|routing|aba|iban|card)\s*(number|no\.?|#)?\s*(is|:|=)?\s*[\d -]{6,}\d/gi, "[removed: account number]"],
  [/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[removed: card number]"],
];
export function scrubCredentials(text: string): { text: string; removed: boolean } {
  let out = text, removed = false;
  for (const [re, w] of CREDENTIALS) out = out.replace(re, () => { removed = true; return w; });
  return { text: out, removed };
}
// Client data in pasted or uploaded material is replaced with fictional placeholders before drafting (with a notice)
const CLIENT_DATA: Array<[string, RegExp, string]> = [
  ["social security numbers", /\b\d{3}-\d{2}-\d{4}\b/g, "[SSN removed]"],
  ["dates of birth", /\b(dob|d\.o\.b\.|date of birth|born on)\b[:\s]*\(?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|[a-z]+ \d{1,2},? \d{4})/gi, "[date of birth removed]"],
  ["case numbers", /\b(case|cause|docket|index|matter)\s*(no\.?|number|#)\s*[:#]?\s*[a-z0-9]*\d[a-z0-9:-]{3,}/gi, "[Case Number]"],
  ["case numbers", /\b\d{1,2}:\d{2}-[a-z]{2,4}-\d{3,6}\b/gi, "[Case Number]"],
  ["client names", /\b((?:my |our |the )?client(?:'s)?(?: is| named|:|,)?\s+)(?!name\b)[A-Z][a-z]+ [A-Z][a-z]+/g, "<keep>[Client Name]"],
  ["case captions", /\b[A-Z][a-z]+ v\.? [A-Z][a-z]+\b/g, "[Party A] v. [Party B]"],
];
export function scrubClientData(text: string): { text: string; kinds: string[] } {
  let out = text;
  const kinds: string[] = [];
  for (const [k, re, w] of CLIENT_DATA) out = out.replace(re, (...m) => { if (!kinds.includes(k)) kinds.push(k); return w.replace("<keep>", String(m[1] ?? "")); });
  return { text: out, kinds };
}

// Every text field of a document, so the scrub and the checks see all of it
export function eachText(b: DocBody, fn: (t: string) => string): DocBody {
  const m = (t: string) => fn(t);
  const ml = (l: string[]) => l.map(m);
  return normalizeDoc({
    ...b, title: m(b.title), purpose: m(b.purpose), scope: m(b.scope), trigger: m(b.trigger), before_you_start: ml(b.before_you_start),
    steps: b.steps.map((st) => ({ ...st, text: m(st.text), menu_path: m(st.menu_path), handoff: m(st.handoff), images: st.images.map((im) => ({ ...im, caption: m(im.caption) })) })),
    decisions: b.decisions.map((d) => ({ ...d, if: m(d.if), then: m(d.then) })), timing: m(b.timing), quality_check: ml(b.quality_check), done_when: m(b.done_when), saved_in: m(b.saved_in),
    related_links: b.related_links.map((l) => ({ ...l, label: m(l.label) })), start_point: m(b.start_point), end_point: m(b.end_point),
    kpis: b.kpis.map((k) => ({ ...k, name: m(k.name), measures: m(k.measures), source: m(k.source) })),
    situations: ml(b.situations), principles: ml(b.principles), preferred: m(b.preferred), fallbacks: ml(b.fallbacks), hard_limits: ml(b.hard_limits),
    escalation: b.escalation.map((e) => ({ ...e, issue: m(e.issue) })), scripts: ml(b.scripts), examples: ml(b.examples), rules_must: ml(b.rules_must), rules_must_not: ml(b.rules_must_not), exceptions: m(b.exceptions),
    section_images: Object.fromEntries(Object.entries(b.section_images ?? {}).map(([k, v]) => [k, v.map((im) => ({ ...im, caption: m(im.caption) }))])),
  });
}
export function docText(b: DocBody, opts: { header?: boolean } = {}): string {
  const out: string[] = [];
  eachText(b, (t) => { if (t) out.push(t); return t; });
  return (opts.header === false ? out.slice(1) : out).join("\n");
}
// Names of real people the firm entered are replaced with their roles (roles, never names)
export function namesToRoles(b: DocBody, people: Array<{ name: string; role: string }>): { body: DocBody; replaced: string[] } {
  const replaced: string[] = [];
  const list = people.filter((p) => p.name.trim().length >= 3).sort((a, z) => z.name.length - a.name.length);
  if (!list.length) return { body: b, replaced };
  const body = eachText(b, (t) => {
    let out = t;
    for (const p of list) {
      const re = new RegExp("\\b" + p.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
      out = out.replace(re, () => { if (!replaced.includes(p.name)) replaced.push(p.name); return "the " + p.role; });
    }
    return out;
  });
  return { body, replaced };
}

// ---------- Word count (body text only: not the header block, the RACI table or the change log) ----------
export function bodyWords(b: DocBody): number {
  const parts: string[] = [b.purpose, b.scope, b.trigger, ...b.before_you_start, ...b.steps.map((x) => [x.text, x.menu_path, x.handoff].join(" ")), ...b.decisions.map((d) => d.if + " " + d.then),
    b.timing, ...b.quality_check, b.done_when, b.saved_in, ...b.related_links.map((l) => l.label), b.start_point, b.end_point, ...b.kpis.map((k) => [k.name, k.measures, k.source, k.baseline, k.target].join(" ")),
    ...b.situations, ...b.principles, b.preferred, ...b.fallbacks, ...b.hard_limits, ...b.escalation.map((e) => e.issue), ...b.scripts, ...b.examples, ...b.rules_must, ...b.rules_must_not, b.exceptions];
  return parts.join(" ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

// ---------- RACI ----------
export const attorneyRoles = (b: DocBody) => b.roles.filter((r) => (b.role_kinds[r] ?? guessKind(r)) === "attorney");
export const freelancerRoles = (b: DocBody) => b.roles.filter((r) => (b.role_kinds[r] ?? guessKind(r)) === "freelancer");
export const lettersOf = (raci: Raci, l: string) => Object.entries(raci).filter(([, v]) => v.split(",").includes(l)).map(([k]) => k);
export const usesRaci = (t: DocType) => t === "sop" || t === "workflow";

// Words that mean a step needs legal judgment (the checker treats an unflagged one as blocking until the attorney decides)
const JUDGMENT = /\b(decide|decides|decision on|approve|approves|approval of|accept (the |a )?(matter|client|case)|decline (the |a )?(matter|client|case)|advise|legal advice|legal opinion|legal strategy|settle|settlement|sign (the|a|on behalf)|file (it )?with the court|waive|conflict (is|of interest).*(clear|waiv)|privilege|merits)\b/i;
export const looksLikeJudgment = (t: string) => JUDGMENT.test(t);
const VAGUE = ["as needed", "if applicable", "promptly", "timely", "the usual way"];
// A vague word is allowed only with a specific value right after it (for example "promptly (within 1 business day)")
export function vagueWords(text: string): string[] {
  const found: string[] = [];
  const low = text.toLowerCase();
  for (const w of VAGUE) {
    let i = low.indexOf(w);
    while (i >= 0) {
      const after = low.slice(i + w.length, i + w.length + 40);
      if (!/^\W{0,3}(\(|within|by|in|no later than)?\s*\d/.test(after)) { if (!found.includes(w)) found.push(w); }
      i = low.indexOf(w, i + 1);
    }
  }
  return found;
}
// "If the client signs, send the letter." is a clear action: a condition before the comma, then a verb (UX review D03)
const CONDITION = /^(if|when|after|before|once|unless)\b[^,]{1,160},\s*/i;
function notVerb(text: string): boolean {
  const t = String(text ?? "").trim(), rest = t.replace(CONDITION, "");
  return rest !== t ? rest === "" || NOT_VERB.test(rest) : NOT_VERB.test(t);
}
const NOT_VERB = /^(the|a|an|this|that|these|our|your|their|it|if|when|after|before|once|client|clients|attorney|paralegal|staff|we|you|they|he|she|there|all|each|every|step|note|in|on|for|to)\b/i;
export const RULE_WORDS = /\b(rule|rules of|statute|code §|§|frcp|local rule|court rule|filing deadline|deadline to file|days (after|before|from) (service|filing|entry|judgment)|statute of limitations|limitations period)\b/i;
const MENU_PLACEHOLDER = "[Add the menu path in your system]";

export type CheckItem = { id: string; label: string; status: "pass" | "attention" | "blocking"; detail: string; fix: "code" | "ai" | "split" | "image" | ""; steps?: number[]; images?: string[] };
export type CheckContext = { systems: string[]; maxWords: number; maxConsulted: number; kpiMin: number; kpiMax: number; skipped: string[]; people?: Array<{ name: string; role: string }>;
  images?: ImageFacts; imagesPerSlot?: number };

// The self-check (Sections 2, 3 and 5 of the guide, and the build prompt). Blocking items stop every export, approval and gig.
export function checkDoc(b: DocBody, c: CheckContext): { items: CheckItem[]; blocking: number; attention: number; words: number } {
  const items: CheckItem[] = [];
  const add = (id: string, label: string, bad: boolean, detail: string, fix: CheckItem["fix"], level: "attention" | "blocking" = "attention", steps?: number[]) =>
    items.push({ id, label, status: bad ? level : "pass", detail: bad ? detail : "", fix: bad ? fix : "", ...(steps && bad ? { steps } : {}) });
  // Required sections for this type
  const missing: string[] = [];
  const need = (label: string, ok: boolean) => { if (!ok) missing.push(label); };
  if (b.type === "sop") {
    need("Purpose", !!b.purpose); need("Scope", !!b.scope); need("Trigger", !!b.trigger); need("Roles", b.roles.length > 0); need("Before you start", b.before_you_start.length > 0);
    need("Steps (at least 3)", b.steps.length >= 3); need("Decision points and escalation", b.decisions.length > 0); need("Timing", !!b.timing); need("Quality check", b.quality_check.length > 0);
    need("Done when", !!b.done_when); need("Related links", b.related_links.length > 0);
  } else if (b.type === "workflow") {
    need("Process owner", !!b.process_owner_role); need("Start point", !!b.start_point); need("End point", !!b.end_point); need("Stages (at least 3)", b.steps.length >= 3);
    need("Handoffs", b.steps.some((x) => x.handoff)); need("Decision points", b.decisions.length > 0); need("Target time per stage", b.steps.length > 0 && b.steps.every((x) => x.target_time));
    need("Linked SOPs", b.steps.some((x) => x.linked_sop));
  } else if (b.type === "playbook") {
    need("Situations covered", b.situations.length > 0); need("Guiding principles", b.principles.length > 0); need("Preferred approach", !!b.preferred); need("Acceptable fallbacks", b.fallbacks.length > 0);
    need("Hard limits", b.hard_limits.length > 0); need("Escalation", b.escalation.length > 0); need("Scripts and templates", b.scripts.length > 0); need("Examples", b.examples.length > 0);
  } else {
    need("Purpose", !!b.purpose); need("Scope", !!b.scope); need("The rules", b.rules_must.length + b.rules_must_not.length > 0); need("Exceptions and who approves them", !!b.exceptions);
  }
  need("Owner role (header)", !!b.owner_role);
  add("sections", "Every required section is filled in", missing.length > 0, "Missing: " + missing.join(", ") + ".", "ai");
  // Questions the attorney skipped
  const skipped = [...new Set([...c.skipped, ...b.skipped])];
  add("skipped", "The process questions are answered", skipped.length > 0, "You skipped: " + skipped.join(", ") + ". DELA left these parts general; add them for a better document.", "");
  const text = docText(b);
  const vague = vagueWords(text);
  add("vague", "No vague words without a value", vague.length > 0, "Found: " + vague.map((w) => "\"" + w + "\"").join(", ") + ". Say exactly what and when.", "ai");
  const pc = patternCheck(text);
  add("client_data", "No client names, matter facts or client data", pc.strong.length > 0, "This looks like client information (" + pc.strong.join(", ") + "). Use fictional examples.", "ai");
  add("credentials", "No passwords, logins or account numbers", scrubCredentials(text).removed, "Remove passwords, logins and account numbers. They belong in a password manager.", "code");
  if (c.people?.length) {
    const named = c.people.filter((p) => p.name.trim().length >= 3 && new RegExp("\\b" + p.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text)).map((p) => p.name);
    add("names", "Roles, not people's names", named.length > 0, "Names found: " + named.join(", ") + ". Use roles; people leave.", "code");
  }
  if (b.steps.length) {
    const verbs = b.steps.map((st, i) => (notVerb(st.text) ? i + 1 : 0)).filter(Boolean);
    add("verbs", b.type === "workflow" ? "Each stage starts with a verb" : "Each step starts with a verb", verbs.length > 0, "Steps " + verbs.join(", ") + " do not start with a verb.", "ai", "attention", verbs);
    const multi = b.steps.map((st, i) => (/\band then\b|;\s*\w|\.\s+[A-Z][a-z]+\s/.test(st.text) ? i + 1 : 0)).filter(Boolean);
    add("one_action", "One action per step", multi.length > 0, "Steps " + multi.join(", ") + " hold more than one action.", "ai", "attention", multi);
    const noPath = b.steps.map((st, i) => (st.menu_path.includes(MENU_PLACEHOLDER) || st.text.includes(MENU_PLACEHOLDER) ? i + 1 : 0)).filter(Boolean);
    add("menu_paths", "Exact menu paths in your systems", noPath.length > 0, "Add the menu path for steps " + noPath.join(", ") + ". DELA never invents one.", "");
  }
  // Legal guardrails and RACI (blocking)
  if (usesRaci(b.type)) {
    const atts = attorneyRoles(b);
    const unflagged = b.steps.map((st, i) => (!st.attorney_decides && !st.not_judgment && looksLikeJudgment(st.text) ? i + 1 : 0)).filter(Boolean);
    add("judgment", "Every judgment step is flagged \"Attorney decides\"", unflagged.length > 0,
      "Steps " + unflagged.join(", ") + " look like legal judgment. Flag them \"Attorney decides\", or mark them as not a judgment step.", "code", "blocking", unflagged);
    const badA = b.steps.map((st, i) => (lettersOf(st.raci, "A").length !== 1 ? i + 1 : 0)).filter(Boolean);
    const noA = badA.filter((n) => lettersOf(b.steps[n - 1].raci, "A").length === 0), twoA = badA.filter((n) => lettersOf(b.steps[n - 1].raci, "A").length > 1);
    const nums = (l: number[]) => (l.length === 1 ? "Step " + l[0] + " has" : "Steps " + l.join(", ") + " have");
    add("one_a", "Exactly one Accountable (A) for every step", badA.length > 0,
      [noA.length ? nums(noA) + " no Accountable (A). Give each step one owner." : "", twoA.length ? nums(twoA) + " more than one Accountable (A). Two owners means no owner." : ""].filter(Boolean).join(" "), "code", "blocking", badA);
    const notAtt = b.steps.map((st, i) => (st.attorney_decides && !lettersOf(st.raci, "A").some((r) => atts.includes(r)) ? i + 1 : 0)).filter(Boolean);
    add("attorney_a", "An attorney is Accountable for every \"Attorney decides\" step", notAtt.length > 0 || (b.steps.some((x) => x.attorney_decides) && !atts.length),
      atts.length ? "Steps " + notAtt.join(", ") + " are attorney decisions but the A is not an attorney role." : "Add an attorney role to the document.", "code", "blocking", notAtt);
    const manyC = b.steps.map((st, i) => (lettersOf(st.raci, "C").length > c.maxConsulted ? i + 1 : 0)).filter(Boolean);
    add("consulted", "No more than " + c.maxConsulted + " Consulted (C) per step", manyC.length > 0, "Steps " + manyC.join(", ") + " have more than " + c.maxConsulted + " C's. Every consult adds delay.", "", "attention", manyC);
  } else {
    const unflaggedP = b.type === "playbook" && b.escalation.length > 0 && !b.escalation.some((e) => /attorney|partner/i.test(e.decider_role));
    add("judgment", "Judgment calls go to an attorney", unflaggedP, "Name an attorney or partner role in Escalation for what nobody decides alone.", "ai");
  }
  // Court rules, statutes and filing deadlines need a link and a verify-by date
  const today = new Date().toISOString().slice(0, 10);
  const ruleSteps = b.steps.map((st, i) => (RULE_WORDS.test(st.text) && (!st.rule?.link || !st.rule?.verify_by) ? i + 1 : 0)).filter(Boolean);
  const timingRule = RULE_WORDS.test(b.timing) && (!b.timing_rule?.link || !b.timing_rule?.verify_by);
  add("rules", "Every rule or deadline has a link and a verify-by date", ruleSteps.length > 0 || timingRule,
    (ruleSteps.length ? "Steps " + ruleSteps.join(", ") : "Timing") + " mention a court rule, statute or filing deadline. Add the rule's link and a date to verify it. DELA never states a deadline from memory.", "", "attention", ruleSteps);
  const stale = [...b.steps.map((x) => x.rule), b.timing_rule].filter((r) => r?.verify_by && r.verify_by < today).length;
  add("rules_current", "Rule references are not past their verify-by date", stale > 0, stale + " rule reference" + (stale === 1 ? " is" : "s are") + " past the verify-by date. Check the rule again.", "");
  // KPIs (workflows)
  if (b.type === "workflow") {
    const n = b.kpis.length;
    const incomplete = b.kpis.filter((k) => !k.measures || !k.kind || !k.source || !k.owner_role || !k.baseline || !k.target || !k.rhythm).map((k) => k.name);
    const sys = c.systems.map((x) => x.toLowerCase());
    const unknown = b.kpis.filter((k) => k.source && !/^start logging/i.test(k.source) && sys.length && !sys.some((x) => k.source.toLowerCase().includes(x))).map((k) => k.name);
    add("kpis", c.kpiMin + " to " + c.kpiMax + " complete KPIs from systems you use", n < c.kpiMin || n > c.kpiMax || incomplete.length > 0 || unknown.length > 0,
      [n < c.kpiMin || n > c.kpiMax ? "This workflow has " + n + " KPIs." : "", incomplete.length ? "Fill in every field for: " + incomplete.join(", ") + "." : "",
        unknown.length ? "These come from a system you did not list: " + unknown.join(", ") + ". Use a system you use, or say which field to start logging." : ""].filter(Boolean).join(" "), "ai");
  }
  // Images (docs/briefs/step-2e-document-images.md): a caption on each, and a confirmed client-data check (blocking)
  const placed = placedImages(b);
  if (placed.length) {
    const noCap = placed.filter((x) => !x.caption.trim());
    add("image_captions", "Every image has a caption", noCap.length > 0, noCap.map((x) => x.where + " image is missing a caption.").join(" "), "image");
    if (noCap.length) items[items.length - 1].images = noCap.map((x) => x.id);
    const unchecked = placed.filter((x) => !c.images?.[x.id]?.confirmed);
    add("image_checks", "Every image has a confirmed client-data check", unchecked.length > 0,
      unchecked.map((x) => x.where + " image has no client-data check" + (c.images?.[x.id]?.held ? " (DELA's check thinks it may show client information)" : "") + ".").join(" "), "image", "blocking");
    if (unchecked.length) items[items.length - 1].images = unchecked.map((x) => x.id);
    const per = c.imagesPerSlot ?? 3;
    const slots = new Map<string, number>();
    for (const x of placed) slots.set(x.where, (slots.get(x.where) ?? 0) + 1);
    const over = [...slots].filter(([, n]) => n > per).map(([w]) => w);
    add("image_count", "No more than " + per + " images on a step", over.length > 0, over.join(", ") + " " + (over.length === 1 ? "has" : "have") + " more than " + per + " images. Split the step to add more.", "");
  }
  const words = bodyWords(b);
  if (b.type === "sop") add("length", "SOP is " + c.maxWords + " words or less", words > c.maxWords, "This SOP has " + words + " words of body text. Split it into linked SOPs.", "split");
  return { items, blocking: items.filter((x) => x.status === "blocking").length, attention: items.filter((x) => x.status === "attention").length, words };
}

// Code fixes (the "Fix it" buttons DELA can do without the AI): credentials out, names to roles, judgment steps flagged with
// an attorney as A, and one A per step where it is clear who it is
export function codeFix(b: DocBody, id: string, people: Array<{ name: string; role: string }> = []): DocBody {
  if (id === "credentials") return eachText(b, (t) => scrubCredentials(t).text);
  if (id === "names") return namesToRoles(b, people).body;
  const atts = attorneyRoles(b);
  const att = atts[0] || (b.roles.includes("Attorney") ? "Attorney" : "");
  const out = normalizeDoc(JSON.parse(JSON.stringify(b)));
  if (!att && (id === "judgment" || id === "attorney_a")) { out.roles.push("Attorney"); out.role_kinds["Attorney"] = "attorney"; }
  const A = att || "Attorney";
  for (const st of out.steps) {
    if (id === "judgment" && !st.attorney_decides && !st.not_judgment && looksLikeJudgment(st.text)) st.attorney_decides = true;
    if ((id === "judgment" || id === "attorney_a") && st.attorney_decides) setA(st, A);
    if (id === "one_a" && lettersOf(st.raci, "A").length !== 1) {
      if (st.attorney_decides) setA(st, A);
      else { const r = lettersOf(st.raci, "R"); setA(st, r.length === 1 ? r[0] : st.role && out.roles.includes(st.role) ? st.role : out.owner_role || A); }
    }
  }
  return out;
}
function setA(st: DocStep, role: string) {
  for (const k of Object.keys(st.raci)) st.raci[k] = st.raci[k].split(",").filter((x) => x !== "A").join(",");
  st.raci[role] = [...new Set([...(st.raci[role] ? st.raci[role].split(",") : []), "A"])].sort((a, z) => LETTERS.indexOf(a) - LETTERS.indexOf(z)).join(",");
  for (const k of Object.keys(st.raci)) if (!st.raci[k]) delete st.raci[k];
}

// Next review: 3 months for trust, conflicts and deadline documents, 12 for the rest
export const HIGH_RISK = /\b(trust|iolta|retainer deposit|conflict|deadline|calendar|statute of limitations|docket)\b/i;
export const looksHighRisk = (b: DocBody) => HIGH_RISK.test([b.title, b.purpose, b.scope, b.trigger].join(" "));

export function guessLifecycle(text: string): string {
  const t = text.toLowerCase();
  if (/intake|inquir|lead|conflict|consult/.test(t)) return "INT";
  if (/engagement|onboard|welcome|retain(er)? agreement/.test(t)) return "ENG";
  if (/trust|invoice|bill|collect|fee|payment|retainer|reconcil/.test(t)) return "BIL";
  if (/clos|retention|archiv|disengage/.test(t)) return "CLS";
  if (/draft|document|filing|file with|e-?fil|pleading|contract|motion/.test(t)) return "DOC";
  if (/matter|calendar|deadline|docket|case manag/.test(t)) return "MAT";
  return "ADM";
}

// ---------- The starter library (7 lifecycle groups) ----------
export type Starter = { id: string; lifecycle: string; type: DocType; title: string; trigger: string; done: string; high_risk?: boolean; kpi?: string };
export const STARTERS: Starter[] = [
  { id: "int-inquiry", lifecycle: "INT", type: "sop", title: "Respond to a new inquiry", trigger: "A prospective client calls, emails or fills in the website form", done: "The inquiry is logged and a consult is booked or declined" },
  { id: "int-conflict", lifecycle: "INT", type: "sop", title: "Run a conflict check", trigger: "A prospective client asks for a consult", done: "The conflict result is recorded and the attorney decided to clear or decline", high_risk: true },
  { id: "int-workflow", lifecycle: "INT", type: "workflow", title: "Intake to signed engagement", trigger: "A new inquiry arrives", done: "The engagement letter is signed and the matter is open", kpi: "intake" },
  { id: "eng-letter", lifecycle: "ENG", type: "sop", title: "Send the engagement letter", trigger: "The attorney accepts the matter", done: "The signed engagement letter is saved to the matter" },
  { id: "eng-onboard", lifecycle: "ENG", type: "sop", title: "Onboard a new client", trigger: "The engagement letter is signed", done: "The client has the welcome packet and the portal invitation" },
  { id: "mat-open", lifecycle: "MAT", type: "sop", title: "Open a matter", trigger: "The engagement letter is signed and the retainer is received", done: "The matter is open in the practice management system with the team assigned" },
  { id: "mat-calendar", lifecycle: "MAT", type: "sop", title: "Calendar a court deadline", trigger: "A court order, notice or rule sets a date", done: "The deadline and its reminders are on the calendar and checked by a second person", high_risk: true },
  { id: "mat-workflow", lifecycle: "MAT", type: "workflow", title: "Matter open to matter close", trigger: "A matter is opened", done: "The matter is closed and the file is archived", kpi: "matter" },
  { id: "mat-upset", lifecycle: "MAT", type: "playbook", title: "Handle an upset client", trigger: "A client is upset or complains", done: "The client is heard, the issue is logged and the attorney decided the next step" },
  { id: "doc-review", lifecycle: "DOC", type: "sop", title: "Draft and send a document for attorney review", trigger: "A draft is assigned", done: "The attorney approved the draft or sent it back with changes", kpi: "documents" },
  { id: "doc-efile", lifecycle: "DOC", type: "sop", title: "File a document with the court", trigger: "The attorney approved a filing", done: "The filing is accepted and the stamped copy is saved to the matter", high_risk: true },
  { id: "doc-negotiate", lifecycle: "DOC", type: "playbook", title: "Contract negotiation positions", trigger: "The other side sends a markup", done: "Every change is accepted, countered or escalated to the attorney" },
  { id: "bil-trust", lifecycle: "BIL", type: "sop", title: "Deposit a retainer to trust", trigger: "A retainer payment arrives", done: "The deposit is in the trust account and recorded in the client ledger", high_risk: true },
  { id: "bil-recon", lifecycle: "BIL", type: "sop", title: "Monthly three-way trust reconciliation", trigger: "The bank statement for the month arrives", done: "Bank, trust journal and client ledgers match and the report is signed", high_risk: true, kpi: "trust" },
  { id: "bil-invoice", lifecycle: "BIL", type: "workflow", title: "Work to invoice to payment", trigger: "Time is recorded on a matter", done: "The invoice is paid", kpi: "billing" },
  { id: "bil-fee", lifecycle: "BIL", type: "playbook", title: "Handle a fee dispute", trigger: "A client disputes a bill", done: "The dispute is resolved or escalated to the attorney" },
  { id: "bil-trust-policy", lifecycle: "BIL", type: "policy", title: "Trust accounting policy", trigger: "", done: "", high_risk: true },
  { id: "cls-close", lifecycle: "CLS", type: "sop", title: "Close a matter", trigger: "The work on the matter is finished", done: "The closing letter is sent, the trust balance is zero and the file is archived" },
  { id: "cls-retention", lifecycle: "CLS", type: "policy", title: "File retention policy", trigger: "", done: "" },
  { id: "adm-confidential", lifecycle: "ADM", type: "policy", title: "Confidentiality policy", trigger: "", done: "" },
  { id: "adm-ai", lifecycle: "ADM", type: "policy", title: "AI use policy", trigger: "", done: "" },
  { id: "adm-hire", lifecycle: "ADM", type: "sop", title: "Onboard a new staff member", trigger: "A new hire's start date is set", done: "The new hire has access, training and a signed confidentiality agreement", kpi: "sop_health" },
];

// KPI starting points (Section 6, "Examples by workflow")
export const KPI_EXAMPLES: Record<string, string[]> = {
  intake: ["Lead response time", "Consult-to-signed conversion rate", "Days from consult to signed engagement letter"],
  conflicts: ["Percent of checks done before the consult", "Conflict check turnaround time"],
  matter: ["Case cycle time", "Time spent in each stage", "Missed or near-miss deadlines (target zero)"],
  documents: ["Rework rate (drafts sent back for errors)", "First-pass approval rate"],
  billing: ["Utilization rate", "Realization rate", "Collection rate", "Days from work to invoice", "A/R over 90 days"],
  trust: ["Monthly three-way reconciliation done on time", "Number of reconciliation exceptions"],
  client: ["Client satisfaction or NPS", "Response time to client messages", "Complaints"],
  sop_health: ["Percent of documents reviewed on schedule", "New hire time to working independently", "Errors traced to an unclear SOP"],
};

// ---------- What a gig hands the freelancer ----------
// An SOP: every step. A Workflow: only the steps where a freelancer role is R. Purpose, Before you start, Steps, Timing,
// Quality check and Done when; nothing else. Policies and Playbooks never become gigs.
export function gigPart(b: DocBody): { ok: boolean; reason?: string; purpose: string; before_you_start: string[]; before_images: ImageRef[]; steps: DocStep[]; timing: string; quality_check: string[]; done_when: string; checkpoints: number[]; images: number } {
  const empty = { purpose: "", before_you_start: [], before_images: [], steps: [], timing: "", quality_check: [], done_when: "", checkpoints: [], images: 0 };
  if (b.type !== "sop" && b.type !== "workflow") return { ok: false, reason: "type_not_for_gigs", ...empty };
  const fl = freelancerRoles(b);
  const steps = b.type === "sop" ? b.steps : b.steps.filter((st) => fl.some((r) => (st.raci[r] ?? "").split(",").includes("R")));
  if (!steps.length) return { ok: false, reason: "no_freelancer_steps", ...empty };
  const before_images = b.type === "sop" ? b.section_images.before_you_start ?? [] : [];
  return { ok: true, purpose: b.purpose, before_you_start: b.before_you_start, before_images, steps, timing: b.timing, quality_check: b.quality_check, done_when: b.done_when,
    checkpoints: steps.map((st, i) => (st.attorney_decides ? i + 1 : 0)).filter(Boolean), images: new Set([...before_images, ...steps.flatMap((st) => st.images)].map((x) => x.id)).size };
}

// ---------- Exports ----------
export type Change = { at: string; what: string; by: string; approved_by: string };
export type DocMeta = { version: number; date: string; status: string; firm: string; doc_id: string; last_reviewed: string; next_review: string; changes: Change[] };
const approved = (m: DocMeta) => m.status === "approved";
const DRAFT_BANNER = "Draft, not approved";
type Block = { title: string; paras?: string[]; items?: string[]; numbered?: boolean; table?: { head: string[]; rows: string[][] }; images?: ImageRef[]; itemImages?: ImageRef[][] };

function raciTable(b: DocBody): Block | null {
  if (!usesRaci(b.type) || !b.steps.length || !b.roles.length) return null;
  return { title: "RACI", table: { head: [b.type === "workflow" ? "Stage" : "Step", ...b.roles], rows: b.steps.map((st, i) => [(i + 1) + ". " + (st.stage || st.text).slice(0, 80), ...b.roles.map((r) => (st.raci[r] ?? "").replace(",", ", "))]) } };
}
function stepLine(st: DocStep, b: DocBody): string {
  const bits = [st.role && "Role: " + st.role, st.system && "System: " + st.system, st.menu_path && "Where: " + st.menu_path, st.minutes && "About " + st.minutes + " min",
    st.rule && (st.rule.name || st.rule.link) && "Rule: " + [st.rule.name, st.rule.link].filter(Boolean).join(" ") + (st.rule.verify_by ? " (verify by " + st.rule.verify_by + ")" : "")].filter(Boolean);
  const wf = b.type === "workflow" ? [st.handoff && "Handoff: " + st.handoff, st.target_time && "Target time: " + st.target_time, st.linked_sop && "SOP: " + st.linked_sop].filter(Boolean) : [];
  return (st.stage ? st.stage + ": " : "") + st.text + (st.attorney_decides ? " ATTORNEY DECIDES." : "") + (bits.length || wf.length ? "\n" + [...bits, ...wf].join("; ") : "");
}
export function blocks(b: DocBody, m: DocMeta): Block[] {
  const out: Block[] = [];
  const header: string[][] = [["Title", b.title], ["Type", TYPE_INFO[b.type].label], ["ID", m.doc_id], ["Version", String(m.version)], ["Owner (role)", b.owner_role], ["Last reviewed", m.last_reviewed], ["Next review", m.next_review]];
  out.push({ title: "Header", table: { head: ["", ""], rows: header.map(([k, v]) => [k, v || "Not set"]) } });
  const decisions = b.decisions.map((d) => (d.if ? "If " + d.if.replace(/^if\s+/i, "") + ", " : "") + d.then + (d.attorney_decides ? " ATTORNEY DECIDES." : "") + (d.escalate_to ? " (Escalate to: " + d.escalate_to + ")" : ""));
  const links = b.related_links.map((l) => l.label + (l.url ? " (" + l.url + ")" : ""));
  if (b.type === "sop") {
    out.push({ title: "Purpose", paras: [b.purpose] }, { title: "Scope", paras: [b.scope] }, { title: "Trigger", paras: [b.trigger] }, { title: "Roles", items: b.roles });
    out.push({ title: "Before you start", items: b.before_you_start, images: b.section_images.before_you_start ?? [] }, { title: "Steps", items: b.steps.map((st) => stepLine(st, b)), numbered: true, itemImages: b.steps.map((st) => st.images) });
    const r = raciTable(b); if (r) out.push(r);
    out.push({ title: "Decision points and escalation", items: decisions });
    out.push({ title: "Timing", paras: [b.timing + (b.timing_rule ? " Rule: " + [b.timing_rule.name, b.timing_rule.link].filter(Boolean).join(" ") + (b.timing_rule.verify_by ? " (verify by " + b.timing_rule.verify_by + ")" : "") : "")] });
    out.push({ title: "Quality check", items: [...b.quality_check, ...(b.quality_reviewer_role ? ["Reviewed by: " + b.quality_reviewer_role] : [])] });
    out.push({ title: "Done when", paras: [b.done_when + (b.saved_in ? " Saved in: " + b.saved_in + "." : "")] }, { title: "Related links", items: links });
  } else if (b.type === "workflow") {
    out.push({ title: "Name and process owner", paras: [b.title + (b.process_owner_role ? ". Process owner: " + b.process_owner_role + "." : "")] });
    out.push({ title: "Start and end points", items: ["Starts when: " + (b.start_point || "Not set"), "Finished when: " + (b.end_point || "Not set")] });
    if ((b.section_images.chart ?? []).length) out.push({ title: "Swimlane chart", images: b.section_images.chart });
    out.push({ title: "Stages", table: { head: ["#", "Stage", "Lane (role)", "What happens"], rows: b.steps.map((st, i) => [String(i + 1), st.stage || "Stage " + (i + 1), st.role, st.text + (st.attorney_decides ? " ATTORNEY DECIDES." : "")]) } });
    const withImg = b.steps.map((st, i) => ({ st, i })).filter((x) => x.st.images.length);
    if (withImg.length) out.push({ title: "Stage images", items: withImg.map((x) => "Stage " + (x.i + 1) + ": " + (x.st.stage || x.st.text.slice(0, 60))), itemImages: withImg.map((x) => x.st.images) });
    const r = raciTable(b); if (r) out.push(r);
    out.push({ title: "Handoffs", items: b.steps.filter((x) => x.handoff).map((x) => (x.stage || x.text.slice(0, 40)) + ": " + x.handoff) });
    out.push({ title: "Decision points", items: decisions });
    out.push({ title: "Target time per stage", items: b.steps.map((x, i) => (x.stage || "Stage " + (i + 1)) + ": " + (x.target_time || "Not set")) });
    out.push({ title: "Linked SOPs", items: b.steps.filter((x) => x.linked_sop).map((x) => (x.stage || x.text.slice(0, 40)) + ": " + x.linked_sop) });
    out.push({ title: "KPIs", table: { head: ["KPI", "Measures", "Type", "Source", "Owner", "Baseline", "Target", "Review"], rows: b.kpis.map((k) => [k.name, k.measures, k.kind, k.source, k.owner_role, k.baseline, k.target, k.rhythm]) } });
  } else if (b.type === "playbook") {
    out.push({ title: "Situations covered", items: b.situations }, { title: "Guiding principles", items: b.principles }, { title: "Preferred approach", paras: [b.preferred] });
    out.push({ title: "Acceptable fallbacks", items: b.fallbacks }, { title: "Hard limits", items: b.hard_limits });
    out.push({ title: "Escalation", table: { head: ["Issue", "Who decides", "How fast"], rows: b.escalation.map((e) => [e.issue, e.decider_role, e.how_fast]) } });
    out.push({ title: "Scripts and templates", items: b.scripts, images: b.section_images.scripts ?? [] }, { title: "Examples", items: b.examples, images: b.section_images.examples ?? [] });
  } else {
    out.push({ title: "Purpose", paras: [b.purpose] }, { title: "Scope", paras: [b.scope] });
    out.push({ title: "The rules", items: [...b.rules_must.map((t) => "Must: " + t), ...b.rules_must_not.map((t) => "Must not: " + t)] });
    out.push({ title: "Exceptions and who approves them", paras: [b.exceptions + (b.exceptions_role ? " Approved by: " + b.exceptions_role + "." : "")] }, { title: "Related links", items: links });
  }
  if (b.type === "sop" || b.type === "policy" || m.changes.length) out.push({ title: "Change log", table: { head: ["Date", "What changed", "Who", "Approved by"], rows: m.changes.map((c) => [c.at, c.what, c.by, c.approved_by]) } });
  return out;
}

const footerText = (m: DocMeta) => `${m.firm ? m.firm + " | " : ""}${m.doc_id ? m.doc_id + " | " : ""}Version ${m.version}${approved(m) ? "" : " | " + DRAFT_BANNER} | Exported ${m.date} from Lawfecta DELA`;
const NOT_SET = "Not filled in yet";

export function docToMarkdown(b: DocBody, m: DocMeta): string {
  const md = [`# ${b.title || "Document"}`, ""];
  if (!approved(m)) md.push(`> **${DRAFT_BANNER}**`, "");
  for (const bl of blocks(b, m)) {
    md.push(`**${bl.title}**`, "");
    if (bl.paras) md.push(...(bl.paras.some(Boolean) ? bl.paras.filter(Boolean) : ["_" + NOT_SET + "_"]), "");
    if (bl.items) md.push(...(bl.items.length ? bl.items.map((t, i) => (bl.numbered ? `${i + 1}. ` : "- ") + t.replaceAll("\n", "\n   ") + (bl.itemImages?.[i] ?? []).map((im) => "\n   [Image: " + (im.caption || "no caption") + "]").join("")) : ["_" + NOT_SET + "_"]), "");
    if (bl.images?.length) md.push(...bl.images.map((im) => "[Image: " + (im.caption || "no caption") + "]"), "");
    if (bl.table) {
      const cellMd = (t: string) => t.replaceAll("|", "/").replaceAll("\n", " ");
      if (bl.table.head.some(Boolean)) md.push("| " + bl.table.head.map(cellMd).join(" | ") + " |", "|" + bl.table.head.map(() => " --- |").join(""));
      else md.push("| | |", "| --- | --- |");
      md.push(...(bl.table.rows.length ? bl.table.rows.map((r) => "| " + r.map(cellMd).join(" | ") + " |") : ["| " + NOT_SET + " |"]), "");
    }
  }
  md.push("---", "", "_" + footerText(m) + "_", "");
  return md.join("\n");
}

const esc = (t: string) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg" };
function htmlImage(im: ImageRef, imgs?: ExportImages): string {
  const x = imgs?.get(im.id);
  const cap = esc(im.caption || "");
  if (!x) return `<p class="cap">[Image: ${cap || "no caption"}]</p>`;
  let bin = "";
  for (let i = 0; i < x.bytes.length; i += 0x8000) bin += String.fromCharCode(...x.bytes.subarray(i, i + 0x8000));
  return `<figure><img src="data:${MIME[x.ext] ?? "image/png"};base64,${btoa(bin)}" alt="${cap}"><figcaption>${cap}</figcaption></figure>`;
}
export function docToHtml(b: DocBody, m: DocMeta, imgs?: ExportImages): string {
  const body = blocks(b, m).map((bl) => {
    let inner = "";
    if (bl.paras) inner = bl.paras.some(Boolean) ? bl.paras.filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("") : `<p><em>${NOT_SET}</em></p>`;
    if (bl.items) inner = bl.items.length ? `<${bl.numbered ? "ol" : "ul"}>${bl.items.map((t, i) => `<li>${esc(t).replaceAll("\n", "<br>")}${(bl.itemImages?.[i] ?? []).map((im) => htmlImage(im, imgs)).join("")}</li>`).join("")}</${bl.numbered ? "ol" : "ul"}>` : `<p><em>${NOT_SET}</em></p>`;
    if (bl.table) inner = `<table>${bl.table.head.some(Boolean) ? `<tr>${bl.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>` : ""}${bl.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
    if (bl.images?.length) inner += bl.images.map((im) => htmlImage(im, imgs)).join("");
    return `<p class="h"><strong>${esc(bl.title)}</strong></p>\n${inner}`;
  }).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.title || "Document")}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:820px;margin:32px auto;padding:0 16px;color:#1c2230;line-height:1.55}h1{color:#8b2146}.h{font-size:18px;color:#8b2146;border-bottom:1px solid #e6e7ec;padding-bottom:4px;margin:26px 0 8px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #d9dbe1;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f1e4ea}.banner{background:#fff3d6;border:1px solid #e8c97a;padding:8px 12px;border-radius:8px;font-weight:700}figure{margin:10px 0}figure img{max-width:100%;height:auto;border:1px solid #d9dbe1}figcaption,.cap{font-style:italic;color:#5f6675;font-size:14px}footer{margin-top:40px;font-size:12px;color:#5f6675;border-top:1px solid #e6e7ec;padding-top:8px}</style></head>
<body>${htmlBrandLine()}<h1>${esc(b.title || "Document")}</h1>${approved(m) ? "" : `<p class="banner">${DRAFT_BANNER}</p>`}
${body}
<footer>${esc(footerText(m))}</footer></body></html>`;
}

const csvCell = (t: string) => '"' + t.replaceAll('"', '""') + '"';
export function docToCsv(b: DocBody): string {
  const rows = [["#", b.type === "workflow" ? "Stage" : "Step", "What to do", "Role (R)", "Accountable (A)", "System", "Where", "Attorney decides", "Minutes", "Done"]];
  b.steps.forEach((st, i) => rows.push([String(i + 1), st.stage, st.text, lettersOf(st.raci, "R").join(", ") || st.role, lettersOf(st.raci, "A").join(", "), st.system, st.menu_path, st.attorney_decides ? "Yes" : "", st.minutes ? String(st.minutes) : "", ""]));
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// Word: the layout Stacey approved for playbooks (title, a header box, tables, bullets, a shaded box for attorney decisions,
// page numbers), with each section label as a bold heading on its own line, and the draft banner until approved
const xs = (t: string) => esc(t).replaceAll("'", "&apos;");
const BRAND = "8B2146", INK = "1C2230", GREY = "5F6675", LINE = "D9DBE1", SOFT = "F6EEF2", HEAD = "F1E4EA", WARN = "FFF3D6";
type RunOpt = { b?: boolean; i?: boolean; color?: string; sz?: number };
const run = (t: string, o: RunOpt = {}) => {
  const pr = `${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}${o.sz ? `<w:sz w:val="${o.sz}"/>` : ""}`;
  return t.split("\n").map((line, i) => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${xs(line)}</w:t></w:r>`).join("");
};
const para = (runs: string, style = "", extra = "") => `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>` : ""}${runs}</w:p>`;
const bordr = (c = LINE) => ["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="single" w:sz="4" w:color="${c}"/>`).join("");
const tcell = (w: number, body: string, fill = "") => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${body}</w:tc>`;
const tbl = (widths: number[], rows: string[], c = LINE) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, z) => a + z, 0)}" w:type="dxa"/><w:tblBorders>${bordr(c)}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>` + para("", "", `<w:spacing w:after="60"/>`);
const trow = (cells: string, header = false) => `<w:tr>${header ? `<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>` : `<w:trPr><w:cantSplit/></w:trPr>`}${cells}</w:tr>`;

// Images at full page width (6.5 inches), the caption in grey italics below; at most 8 inches tall
type Media = { name: string; rid: string; bytes: Uint8Array; ext: string };
const EMU_W = 5943600, EMU_HMAX = 7315200;
function docxImage(im: ImageRef, imgs: ExportImages | undefined, media: Media[]): string {
  const x = imgs?.get(im.id);
  const cap = para(run(im.caption || "No caption", { i: true, color: GREY, sz: 19 }));
  if (!x || !x.w || !x.h) return para(run("[Image: " + (im.caption || "no caption") + "]", { i: true, color: GREY }));
  const n = media.length + 1;
  const ext = x.ext === "jpg" ? "jpeg" : "png";
  const name = "image" + n + "." + ext, rid = "rIdImg" + n;
  media.push({ name, rid, bytes: x.bytes, ext });
  let cx = EMU_W, cy = Math.round(EMU_W * x.h / x.w);
  if (cy > EMU_HMAX) { cx = Math.round(cx * EMU_HMAX / cy); cy = EMU_HMAX; }
  const d = xs(im.caption || "Image");
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="80" w:after="20"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Image ${n}" descr="${d}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}" descr="${d}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>` + cap;
}

function docxBody(b: DocBody, m: DocMeta, imgs?: ExportImages, media: Media[] = []): string {
  const out: string[] = [];
  out.push(para(run(b.title || "Document"), "Title"));
  out.push(para(run([TYPE_INFO[b.type].label, m.doc_id, m.firm, `Version ${m.version}`, approved(m) ? "Approved" : "", `Exported ${m.date}`].filter(Boolean).join("  |  "), { color: GREY }), "Subtitle"));
  if (!approved(m)) out.push(tbl([9360], [trow(tcell(9360, para(run(DRAFT_BANNER + ". Do not use this as an approved procedure.", { b: true }), "TableText"), WARN))], "E8C97A"));
  for (const bl of blocks(b, m)) {
    out.push(para(run(bl.title), "Heading1"));
    if (bl.paras) { const ps = bl.paras.filter(Boolean); out.push(...(ps.length ? ps.map((t) => para(run(t))) : [para(run(NOT_SET, { i: true, color: GREY }))])); }
    if (bl.items) {
      if (!bl.items.length) out.push(para(run(NOT_SET, { i: true, color: GREY })));
      bl.items.forEach((t, i) => {
        const att = t.includes("ATTORNEY DECIDES");
        const line = para(run((bl.numbered ? (i + 1) + "." : "•") + "\t") + run(t.replace(" ATTORNEY DECIDES.", "")) + (att ? run("  Attorney decides", { b: true, color: BRAND }) : ""), "ListBullet");
        out.push(att ? tbl([9360], [trow(tcell(9360, line, SOFT))], "E3C6D3") : line);
        for (const im of bl.itemImages?.[i] ?? []) out.push(docxImage(im, imgs, media));
      });
    }
    if (bl.table) {
      const n = bl.table.head.length;
      const first = bl.title === "Header" ? 2600 : n > 4 ? 2400 : 3000;
      const rest = Math.floor((9360 - first) / Math.max(n - 1, 1));
      const W = [first, ...Array(n - 1).fill(rest)];
      const rows: string[] = [];
      if (bl.table.head.some(Boolean)) rows.push(trow(bl.table.head.map((h, i) => tcell(W[i], para(run(h, { b: true, color: "FFFFFF" }), "TableText"), BRAND)).join(""), true));
      if (!bl.table.rows.length) rows.push(trow(tcell(9360 - (n > 1 ? 0 : 0), para(run(NOT_SET, { i: true, color: GREY }), "TableText")) + W.slice(1).map((w) => tcell(w, para(run(""), "TableText"))).join("")));
      for (const r of bl.table.rows) rows.push(trow(r.map((c, i) => tcell(W[i], para(run(c, i === 0 && bl.title === "Header" ? { b: true, color: BRAND } : c.includes("A") && bl.title === "RACI" && i > 0 ? { b: true } : {}), "TableText"), i === 0 && bl.title === "Header" ? SOFT : "")).join("")));
      out.push(tbl(W, rows));
    }
    for (const im of bl.images ?? []) out.push(docxImage(im, imgs, media));
  }
  return out.join("");
}

export function docToDocx(b: DocBody, m: DocMeta, imgs?: ExportImages): Uint8Array {
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const media: Media[] = [];
  const bodyXml = docxBody(b, m, imgs, media);
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns} xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${bodyXml}<w:sectPr>${BRAND_HEADER_REF}<w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1300" w:right="1440" w:bottom="1300" w:left="1440" w:header="720" w:footer="600" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const fld = (code: string) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${ns}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs></w:pPr>${run(footerText(m))}<w:r><w:tab/></w:r>${run("Page ")}${fld("PAGE")}${run(" of ")}${fld("NUMPAGES")}</w:p></w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="${INK}"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:color w:val="${BRAND}"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:color w:val="${GREY}"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="3" w:color="${HEAD}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${BRAND}"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:pPr><w:spacing w:after="30" w:line="252" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:rPr><w:color w:val="${GREY}"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>${BRAND_HEADER_OVERRIDE}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${BRAND_HEADER_REL}${media.map((x) => `<Relationship Id="${x.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${x.name}"/>`).join("")}</Relationships>`),
    ...Object.fromEntries(media.map((x) => ["word/media/" + x.name, x.bytes])),
    "word/document.xml": strToU8(doc),
    "word/styles.xml": strToU8(styles),
    "word/footer1.xml": strToU8(footer),
    ...brandHeaderFiles(),
  });
}

export function docFileName(b: DocBody, m: DocMeta, ext: string): string {
  const t = (b.title || "Document").replace(/[^A-Za-z0-9 ._-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 70) || "Document";
  return `DELA - ${m.doc_id ? m.doc_id + " " : ""}${t} - v${m.version} - ${m.date}.${ext}`;
}

// What changed between two versions, in plain words, for the change log
export function changeSummary(before: DocBody | null, after: DocBody): string {
  if (!before) return "First version";
  const changed: string[] = [];
  if (before.type !== after.type) changed.push("Type changed to " + TYPE_INFO[after.type].label);
  for (const sec of SECTIONS[after.type]) {
    const pick = (b: DocBody) => {
      switch (sec.key) {
        case "header": return [b.title, b.owner_role];
        case "steps": case "stages": return b.steps;
        case "decisions": return b.decisions;
        case "quality_check": return [b.quality_check, b.quality_reviewer_role];
        case "done_when": return [b.done_when, b.saved_in];
        case "owner": return [b.title, b.process_owner_role];
        case "start_end": return [b.start_point, b.end_point];
        case "handoffs": return b.steps.map((x) => x.handoff);
        case "target_times": return b.steps.map((x) => x.target_time);
        case "linked_sops": return b.steps.map((x) => x.linked_sop);
        case "rules": return [b.rules_must, b.rules_must_not];
        case "exceptions": return [b.exceptions, b.exceptions_role];
        case "change_log": return null;
        default: return (b as any)[sec.key];
      }
    };
    const x = pick(before), y = pick(after);
    if (x !== null && JSON.stringify(x) !== JSON.stringify(y)) changed.push(sec.label);
  }
  if (JSON.stringify(before.steps.map((x) => x.raci)) !== JSON.stringify(after.steps.map((x) => x.raci)) && !changed.includes("Steps")) changed.push("RACI");
  if (JSON.stringify(placedImages(before)) !== JSON.stringify(placedImages(after))) changed.push("Images");
  return changed.length ? "Changed: " + changed.slice(0, 6).join(", ") : "No change to the content";
}
