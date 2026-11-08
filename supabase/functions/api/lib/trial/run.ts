// One run of the trial job (docs/briefs/step-9-pro-trial-downgrade.md). Dry run lists what it would do and changes
// nothing in BD or by email. Live carries it out. Each downgrade step is recorded as it finishes, so a run that stops
// halfway is finished by the next run without repeating a step. Safe to run more than once.
import { areasToHide, decide, invoiceStatus, type TrialMember, type TrialSettings } from "./rules.ts";
import { HIDDEN_ON_FREE, type Res, type TrialBd, type TrialCandidate } from "./bd.ts";

export type Allowance = { areas: number | null; types: string[] };   // areas: null = no limit; types: post types the plan may show
export type RunSettings = TrialSettings & { allowances: Record<string, Allowance>; freeAreas: number };

export type Kept = { steps: Record<string, string>; reminded_at: string | null; hidden: { posts: string[]; areas: string[] }; from_plan: number | null };

export interface TrialStore {
  member(userId: number): Promise<Kept | null>;
  save(userId: number, patch: Record<string, unknown>): Promise<void>;
  event(e: Record<string, unknown>): Promise<void>;
}

export type Mailer = (kind: "ending" | "ended", c: TrialCandidate) => Promise<Res<true>>;

export type RunDeps = { bd: TrialBd; store: TrialStore; mail: Mailer; now: number; mode: "dry_run" | "live"; runId: string; settings: RunSettings };

export type MemberOutcome = { user_id: number; name: string; plan_id: number; action: string; reason: string; ends_at: string | null; invoice: string; done: boolean; error?: string };

const nameOf = (c: TrialCandidate) => [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Member " + c.user_id;

// Check one member: read, decide, act (Live) or list (Dry run), and log the outcome
export async function checkMember(d: RunDeps, c: TrialCandidate): Promise<MemberOutcome> {
  const s = d.settings, live = d.mode === "live";
  const meta = await d.bd.meta(c.user_id);
  if (!meta.ok) return await log(d, c, { action: "error", reason: "read_failed", ends_at: null, invoice: "", done: false, error: meta.error });
  const inv = await d.bd.invoices(c.user_id);
  if (!inv.ok) return await log(d, c, { action: "error", reason: "read_failed", ends_at: null, invoice: "", done: false, error: inv.error });
  const kept = await d.store.member(c.user_id);
  const m: TrialMember = {
    user_id: c.user_id, plan_id: c.plan_id, signup_at: c.signup_at, status: meta.data.dela_trial_status ?? "", ends_at: meta.data.dela_trial_ends_at || null,
    reminded: !!kept?.reminded_at, invoices: inv.data, hidden: (kept?.hidden.posts.length ?? 0) + (kept?.hidden.areas.length ?? 0),
  };
  // A downgrade that stopped halfway is finished first: the member may already be on Free, so the rules alone would skip them
  const unfinished = !!kept?.steps.plan && !kept?.steps.email;
  const dec = unfinished ? { action: "downgrade" as const, reason: "finishing_downgrade", ends_at: undefined } : decide(m, d.now, s);
  if (unfinished && kept?.from_plan) m.plan_id = kept.from_plan;
  const base = { action: dec.action, reason: dec.reason, ends_at: dec.ends_at ?? m.ends_at, invoice: invoiceStatus(m) };
  if (dec.action === "skip") return { user_id: c.user_id, name: nameOf(c), plan_id: c.plan_id, ...base, done: false };
  if (!live) return await log(d, c, { ...base, done: false });

  const steps: Record<string, string> = { ...(kept?.steps ?? {}) };
  const step = async (key: string, run: () => Promise<Res<unknown>>): Promise<string | null> => {
    if (steps[key]) return null;
    const r = await run();
    if (!r.ok) return key + ": " + r.error;
    steps[key] = new Date(d.now).toISOString();
    await d.store.save(c.user_id, { steps });
    return null;
  };
  let err: string | null = null;
  const nowIso = new Date(d.now).toISOString();
  if (dec.action === "track") {
    err = await step("track", () => d.bd.setMeta(c.user_id, { dela_trial_status: "active", dela_trial_started_at: c.signup_at ?? nowIso, dela_trial_ends_at: dec.ends_at! }));
  } else if (dec.action === "remind") {
    const r = await d.mail("ending", c);
    if (r.ok) await d.store.save(c.user_id, { reminded_at: nowIso }); else err = "email: " + r.error;
  } else if (dec.action === "convert") {
    err = await step("convert", () => d.bd.setMeta(c.user_id, { dela_trial_status: "converted", dela_converted_at: nowIso }));
  } else if (dec.action === "downgrade") {
    // Checked again at the moment of the change (the hard guard in rules.ts runs inside decide, and again before the plan step)
    if (!kept?.from_plan) await d.store.save(c.user_id, { from_plan: m.plan_id, name: nameOf(c) });
    err = await downgrade(d, c, m, step, nowIso);
  } else if (dec.action === "restore") {
    err = await restore(d, c, kept!);
  }
  return await log(d, c, { ...base, done: !err, error: err ?? undefined });
}

async function downgrade(d: RunDeps, c: TrialCandidate, m: TrialMember, step: (k: string, r: () => Promise<Res<unknown>>) => Promise<string | null>, nowIso: string): Promise<string | null> {
  const p = d.settings.plans;
  const open = m.invoices.filter((i) => i.open && !i.paid && i.plan_id === m.plan_id);
  const order: Array<[string, () => Promise<Res<unknown>>]> = [
    // Re-read at the moment of the change: stop if the plan moved since, or is on the never-changed list (answer 1)
    ["plan", async () => {
      const now = await d.bd.member(c.user_id);
      if (!now.ok) return now;
      if (now.data.plan_id !== m.plan_id || p.never.includes(now.data.plan_id)) return { ok: false, error: "plan_changed_since_check" };
      return await d.bd.changePlan(c.user_id, p.free);
    }],
    ["subscription", () => d.bd.cancelSubscription(c.user_id, m.plan_id)],
    ["invoices", async () => { for (const i of open) { const r = await d.bd.cancelInvoice(i.id); if (!r.ok) return r; } return { ok: true, data: true }; }],
    ["active", () => d.bd.setActive(c.user_id)],
    ["hide", () => hide(d, c)],
    ["status", () => d.bd.setMeta(c.user_id, { dela_trial_status: "downgraded", dela_downgraded_at: nowIso })],
    ["email", () => d.mail("ended", c)],
  ];
  for (const [k, run] of order) { const e = await step(k, run); if (e) return e; }
  await d.store.save(c.user_id, { downgraded_at: nowIso, name: nameOf(c) });
  return null;
}

// Videos, promotions and community articles are unpublished; areas of law past the first 3 are hidden. Never deleted.
async function hide(d: RunDeps, c: TrialCandidate): Promise<Res<true>> {
  const posts = await d.bd.posts(c.user_id);
  if (!posts.ok) return posts;
  const kept = (await d.store.member(c.user_id))?.hidden ?? { posts: [], areas: [] };
  const hiddenPosts = [...kept.posts];
  for (const x of posts.data.filter((x) => x.published && HIDDEN_ON_FREE.includes(x.type))) {
    const r = await d.bd.setPublished(x.id, false);
    if (!r.ok) return r;
    if (!hiddenPosts.includes(x.id)) hiddenPosts.push(x.id);
    await d.store.save(c.user_id, { hidden: { posts: hiddenPosts, areas: kept.areas } });
  }
  const areas = await d.bd.areas(c.user_id);
  if (!areas.ok) return areas;
  const split = areasToHide(areas.data, d.settings.freeAreas);
  if (split.hide.length) {
    const r = await d.bd.setAreas(c.user_id, split.keep);
    if (!r.ok) return r;
    await d.store.save(c.user_id, { hidden: { posts: hiddenPosts, areas: [...kept.areas, ...split.hide.filter((a) => !kept.areas.includes(a))] } });
  }
  return { ok: true, data: true };
}

// After an upgrade: bring back what the new plan allows (setting trial.allowances); anything still not allowed stays saved
async function restore(d: RunDeps, c: TrialCandidate, kept: Kept): Promise<string | null> {
  const allow = d.settings.allowances[String(c.plan_id)] ?? { areas: null, types: HIDDEN_ON_FREE };
  const posts = await d.bd.posts(c.user_id);
  if (!posts.ok) return "posts: " + posts.error;
  const stillHidden: string[] = [];
  for (const id of kept.hidden.posts) {
    const post = posts.data.find((x) => x.id === id);
    if (!post) continue; // deleted by the member since: nothing to bring back
    if (!allow.types.includes(post.type)) { stillHidden.push(id); continue; }
    const r = await d.bd.setPublished(id, true);
    if (!r.ok) return "publish: " + r.error;
  }
  let areasLeft: string[] = [];
  if (kept.hidden.areas.length) {
    const now = await d.bd.areas(c.user_id);
    if (!now.ok) return "areas: " + now.error;
    const all = [...now.data, ...kept.hidden.areas.filter((a) => !now.data.includes(a))];
    const shown = allow.areas === null ? all : all.slice(0, allow.areas);
    areasLeft = all.slice(shown.length);
    const r = await d.bd.setAreas(c.user_id, shown);
    if (!r.ok) return "areas: " + r.error;
  }
  await d.store.save(c.user_id, { hidden: { posts: stillHidden, areas: areasLeft }, restored_at: new Date(d.now).toISOString() });
  return null;
}

async function log(d: RunDeps, c: TrialCandidate, o: Omit<MemberOutcome, "user_id" | "name" | "plan_id">): Promise<MemberOutcome> {
  const out: MemberOutcome = { user_id: c.user_id, name: nameOf(c), plan_id: c.plan_id, ...o };
  await d.store.event({ run_id: d.runId, bd_user_id: c.user_id, name: out.name, plan_id: c.plan_id, trial_ends_at: o.ends_at, invoice_status: o.invoice,
    action: o.action, reason: o.reason, mode: d.mode, done: o.done, error: o.error ?? "" });
  return out;
}

// The whole run: every member on Plus or Pro who signed up within the window, plus Agency Business members still marked
// active (they converted), plus downgraded members who may have upgraded since (the store's list)
export async function runTrial(d: RunDeps, extraIds: number[]): Promise<{ checked: number; outcomes: MemberOutcome[]; error?: string }> {
  const s = d.settings, p = s.plans;
  const window = new Date(d.now - (s.days * 2 + 1) * 86400000).toISOString().slice(0, 10);
  const since = s.eligibleFrom && s.eligibleFrom > window ? s.eligibleFrom : window;
  const found = await d.bd.search([...p.trial, p.agency], since);
  if (!found.ok) return { checked: 0, outcomes: [], error: found.error };
  const list = [...found.data];
  for (const id of extraIds) {
    if (list.some((c) => c.user_id === id)) continue;
    const one = await d.bd.member(id);
    if (one.ok) list.push(one.data);
  }
  const outcomes: MemberOutcome[] = [];
  for (const c of list) outcomes.push(await checkMember(d, c));
  return { checked: list.length, outcomes };
}
