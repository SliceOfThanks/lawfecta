// Step 13 API tests: the DELA guide (docs/briefs/step-13-dela-guide.md). The next step comes from real data for both
// sides, each step is saved once, pausing and coming back, free typed questions with a daily cap and the sensitive data
// check, and new gig alerts that follow the member's three toggles and the daily cap. Run after tools/dbtest.sh:
//   deno test -A supabase/functions/api/guide_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { guideMessage, pickStarters, readGuideReply } from "./lib/guide/guide.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "G".repeat(40); // rules-ok: a made-up test key
const env: Record<string, string> = { OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" };
let aiCalls = 0;
const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), last = String(body.messages.at(-1).content);
    let out: unknown = { client_info: false, kinds: [] };
    if (system.includes("DELA guide")) {
      aiCalls++;
      out = last.includes("sue") ? { text: "You should sue them.", button: null } : last.includes("button 9") ? { text: "Try this.", button: 9 } : { text: "Start with the inquiry one; it is quick to hand off.", button: 1 };
    }
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => env[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string): Promise<M> {
  const bd = 7_700_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Guide " + k])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_guide_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const guide = async (m: M) => (await call("GET", "/guide", m.token)).body;
let att: M, fl: M, fl2: M, team: M, org = "", other: M;
let otherOrg = "", otherPb = "";

async function openGig(byOrg: string, by: string, title: string, tag: string) {
  return (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $5, 1, $3, '{"task":"Draft the intake letters","practice_area":"Family law"}', 30000, 90000, 'open', now(), now() + interval '14 days', $4) returning id`, [byOrg, by, title, "gg" + tag + RUN, otherPb])).id;
}
async function matchReady(m: M) {
  await pool.query(`insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{"first_name":"Gia"}', '{}', 100, now())
    on conflict (person_id, side) do update set missing = '{}', availability_confirmed_at = now()`, [m.id]);
  await pool.query("insert into linkedin_checks (person_id, url, status) values ($1, 'https://www.linkedin.com/in/gia', 'verified')", [m.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [m.id]);
}

Deno.test("the opening messages: three safe tasks to start, plain words, and only buttons on offer from the AI", () => {
  const picks = pickStarters([]);
  assertEquals(picks.length, 3);
  assert(picks.every((p) => !["int-conflict", "mat-calendar", "doc-efile", "bil-trust", "bil-recon"].includes(p.id)), "never a high-risk task first");
  assert(!pickStarters(["DOC"]).some((p) => p.id === "doc-review"), "skips what the firm already documented");
  const m = guideMessage({ side: "freelancer", step: "profile", facts: { missing: ["headline", "software", "capacity_hours_week", "rate"] } });
  assert(m.text.includes("a headline, the software you use and hours you can take on each week") && !m.text.includes("rate"), m.text);
  assert(!/—/.test(JSON.stringify(m)), "no em dashes");
  const ch = [{ id: "open_tab", label: "A" }];
  assertEquals(readGuideReply({ text: "Do this.", button: 1 }, ch)!.choice!.label, "A");
  assertEquals(readGuideReply({ text: "Do this.", button: 2 }, ch)!.choice, null, "a button that was not offered is dropped");
  assertEquals(readGuideReply({ text: "This is legal advice: you must file." }, ch), null, "ruling words are refused");
});

Deno.test("setup: two attorneys, two freelancers and the Lawfecta Team; the guide is off until switched on", async () => {
  att = await member(1, "att_pro"); fl = await member(2, "fl_pro"); fl2 = await member(3, "fl_plus"); team = await member(4, "att_free"); other = await member(5, "att_pro");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'owner')", [team.id]);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  otherOrg = (await one("select dela_side_org($1, 'attorney') o", [other.id])).o;
  otherPb = (await one("insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Other firm', 'approved', 1, 1, 100, $2, $3) returning id", [otherOrg, "gopb" + RUN, other.id])).id;
  await pool.query("update feature_switches set state = 'off' where key in ('onboarding_widget', 'gig_alerts')");
  const g0 = await guide(att);
  assertEquals(g0.on, false, "switch off: no guide " + JSON.stringify(g0));
  await pool.query("update feature_switches set state = 'everyone' where key in ('onboarding_widget', 'gig_alerts', 'flex_gigs')");
});

Deno.test("attorney: pick a task, approve the playbook, hand off steps, post the gig, invite, compare proposals", async () => {
  let g = await guide(att);
  assertEquals(g.step, "pick_task");
  const starts = g.choices.filter((c: { id: string }) => c.id === "start_playbook");
  assertEquals(starts.length, 3, JSON.stringify(g.choices));
  assert(g.choices.some((c: { id: string }) => c.id === "describe_task"), "Something else");
  await guide(att);
  assertEquals(Number((await one("select count(*) n from guide_events where person_id = $1 and kind = 'shown'", [att.id])).n), 1, "shown once a day per step");

  const pb = (await one("insert into playbooks (org_id, title, status, doc_type, request_id, created_by) values ($1, 'Respond to a new inquiry', 'draft', 'sop', $2, $3) returning id", [org, "gpb" + RUN, att.id])).id;
  g = await guide(att);
  assertEquals(g.step, "approve_playbook");
  assertEquals(g.choices[0].link, "/dela?tab=library&pb=" + pb);
  await pool.query("update playbooks set status = 'approved', approved_version = 1 where id = $1", [pb]);
  g = await guide(att);
  assertEquals(g.step, "delegate");
  assert(g.message.includes("Respond to a new inquiry"));

  const gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id)
    values ($1, $2, $3, 1, 'Answer new inquiries', '{"task":"Answer inquiries"}', 30000, 90000, 'draft', $4) returning id`, [org, att.id, pb, "gdg" + RUN])).id;
  g = await guide(att);
  assertEquals(g.step, "verify", "a draft gig, but posting needs the license check");
  await pool.query(`insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{"firm_name":"Guide Legal"}', '{}', 100) on conflict (person_id, side) do update set missing = '{}'`, [att.id]);
  await pool.query("insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'gl', 'TX', $2, $2, 'A', 'video', 'verified')", [att.id, String(att.bd)]);
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  g = await guide(att);
  assertEquals(g.step, "post_gig");
  assertEquals(g.choices[0].link, "/dela?tab=projects&gig=" + gig);

  await pool.query("update gigs set status = 'open', opened_at = now(), closes_at = now() + interval '14 days' where id = $1", [gig]);
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 70, 2, '{\"Family law\",\"Uses Clio\"}')", [gig, fl.id]);
  g = await guide(att);
  assertEquals(g.step, "invite");
  assert(g.message.includes("1 freelancer fits"), g.message);
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [gig, fl.id, att.id]);
  await pool.query("insert into proposals (gig_id, freelancer_id, status, price_cents, included, schedule, days_to_deliver, sent_at) values ($1, $2, 'sent', 50000, 'All', 'A week', 7, now())", [gig, fl.id]);
  g = await guide(att);
  assertEquals(g.step, "review_proposals");
  assert(g.choices[0].link.endsWith("&view=proposals"));
  await pool.query("update proposals set status = 'withdrawn' where gig_id = $1", [gig]);
  await pool.query("update gigs set status = 'closed' where id = $1", [gig]);
  assertEquals((await guide(att)).step, "next_task", "after the first gig, the next task");
});

Deno.test("freelancer: profile, LinkedIn, availability, invitations, then new gigs that fit, one at a time", async () => {
  let g = await guide(fl);
  assertEquals(g.step, "profile");
  assert(g.choices[0].link === "/dela?tab=profile");
  await pool.query(`insert into member_profiles (person_id, side, body, missing, score) values ($1, 'freelancer', '{"first_name":"Gia"}', '{}', 90)
    on conflict (person_id, side) do update set missing = '{}'`, [fl.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [fl.id]);
  assertEquals((await guide(fl)).step, "verify_linkedin");
  await pool.query("insert into linkedin_checks (person_id, url, status) values ($1, 'https://www.linkedin.com/in/gia', 'verified')", [fl.id]);
  assertEquals((await guide(fl)).step, "availability", "availability was never confirmed");
  await pool.query("update member_profiles set availability_confirmed_at = now() where person_id = $1 and side = 'freelancer'", [fl.id]);
  await pool.query("select dela_profile_refresh($1, 'freelancer')", [fl.id]);
  g = await guide(fl);
  assert(["first_proposal", "teach", "new_gigs"].includes(g.step), g.step);

  const gig = await openGig(otherOrg, other.id, "Prepare discovery responses", "a");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}')", [gig, fl.id]);
  g = await guide(fl);
  assertEquals(g.step, "new_gigs");
  assert(g.message.includes("Prepare discovery responses") && g.message.includes("Uses Clio"), g.message);
  assertEquals(g.choices[0].link, "/dela?tab=work&gig=" + gig);
  assertEquals((await call("POST", "/guide/mark", fl.token, { kind: "gig_seen", ref: gig, request_id: "seen1" })).body.ok, true);
  assertEquals((await call("POST", "/guide/mark", fl.token, { kind: "gig_seen", ref: gig, request_id: "seen1" })).body.duplicate, true, "saved once");
  assertEquals((await call("POST", "/guide/mark", fl2.token, { kind: "gig_seen", ref: gig, request_id: "seen2" })).body.reason, "not_found", "only a gig matched to you");
  assert((await guide(fl)).step !== "new_gigs", "Not for me hides it");

  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [gig, fl.id, other.id]);
  assertEquals((await guide(fl)).step, "invitations");

  assertEquals((await call("POST", "/guide/prefs", fl.token, { alerts_in_guide: false })).body.prefs.alerts_in_guide, false);
  const gig2 = await openGig(otherOrg, other.id, "Summarize deposition", "b");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}')", [gig2, fl.id]);
  await pool.query("update gig_invitations set status = 'answered' where freelancer_id = $1", [fl.id]);
  assert((await guide(fl)).step !== "new_gigs", "with guide alerts off, new gigs are not listed in the guide");
  await call("POST", "/guide/prefs", fl.token, { alerts_in_guide: true });
});

Deno.test("pause: closed for the snooze time, and opens again when something new needs the member", async () => {
  await matchReady(fl2);
  assertEquals((await call("POST", "/guide/mark", fl2.token, { kind: "paused", request_id: "p1" })).body.ok, true);
  assertEquals((await guide(fl2)).paused, true);
  const gig = await openGig(otherOrg, other.id, "Index exhibits", "c");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons, computed_at) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}', now() + interval '1 second')", [gig, fl2.id]);
  const g = await guide(fl2);
  assertEquals(g.paused, false, "a new gig that fits opens it again");
  assertEquals(g.step, "new_gigs");
  await call("POST", "/guide/mark", fl2.token, { kind: "resumed", request_id: "r1" });
  assertEquals((await call("POST", "/guide/mark", fl2.token, { kind: "bogus", request_id: "x" })).body.reason, "bad_request");
});

Deno.test("typed questions: free (Lawfecta's key), capped per day, sensitive data refused, AI buttons checked", async () => {
  const before = aiCalls;
  const r = (await call("POST", "/guide/say", att.token, { text: "Which one should I pick first?", request_id: "q1" })).body;
  assert(r.ok, JSON.stringify(r));
  assertEquals(r.choice.id, "start_playbook", "the AI pointed at a button on offer");
  assertEquals(Number((await one("select count(*) n from ai_usage where person_id = $1 and task = 'guide' and source = 'lawfecta'", [att.id])).n), 1, "logged as Lawfecta's key");
  assertEquals(Number((await one("select count(*) n from quota_reservations where person_id = $1", [att.id])).n), 0, "no DELA actions used");
  assertEquals((await call("POST", "/guide/say", att.token, { text: "Can I sue the client?", request_id: "q2" })).body.reason, "ai_unclear", "a ruling never reaches the screen");
  assertEquals((await call("POST", "/guide/say", att.token, { text: "Pick button 9", request_id: "q3" })).body.choice, null);
  const s = (await call("POST", "/guide/say", att.token, { text: "My client SSN is 123-45-6789, where do I put it?", request_id: "q4" })).body;
  assert(!s.ok && ["sensitive_data", "looks_like_client_info"].includes(s.reason), JSON.stringify(s));
  assertEquals(aiCalls - before, 3, "the sensitive question never reached the AI");
  await pool.query("update settings set value = '3'::jsonb where key = 'guide.ai_replies_per_day'");
  assertEquals((await call("POST", "/guide/say", att.token, { text: "One more?", request_id: "q5" })).body.reason, "guide_cap");
  await pool.query("update settings set value = '20'::jsonb where key = 'guide.ai_replies_per_day'");
});

Deno.test("gig alerts: once per gig, the member's toggles, the daily cap, at least two reasons", async () => {
  await matchReady(fl);
  await pool.query("update side_profiles set readiness_state = 'match_ready' where person_id = any($1) and side = 'freelancer'", [[fl.id, fl2.id]]);
  const gig = await openGig(otherOrg, other.id, "Draft a parenting plan", "d");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}'), ($1, $3, 40, 1, '{\"Family law\"}')", [gig, fl.id, fl2.id]);
  const r = (await rpc("dela_gig_alerts_send", { p: { gig_id: gig } })) as Record<string, any>;
  assertEquals(r.sent, 1, "only the freelancer with two reasons");
  const notes = (await pool.query("select channel, title, link from notifications where person_id = $1 and kind = 'gig_alert' order by channel", [fl.id])).rows;
  assertEquals(notes.map((x: { channel: string }) => x.channel), ["email", "in_app"]);
  assert(notes[0].title.includes("Draft a parenting plan") && notes[0].link === "/dela?tab=work&gig=" + gig);
  assertEquals(((await rpc("dela_gig_alerts_send", { p: { gig_id: gig } })) as Record<string, any>).sent, 0, "never twice");

  await call("POST", "/guide/prefs", fl.token, { alerts_notices: false });
  const gig2 = await openGig(otherOrg, other.id, "Organize a case file", "e");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}')", [gig2, fl.id]);
  await rpc("dela_gig_alerts_send", { p: { gig_id: gig2 } });
  const n2 = (await pool.query("select channel from notifications where person_id = $1 and link like $2", [fl.id, "%" + gig2])).rows;
  assertEquals(n2.map((x: { channel: string }) => x.channel), ["email"], "Notices off: email only");

  await call("POST", "/guide/prefs", fl.token, { alerts_email: false, alerts_in_guide: false });
  const gig3 = await openGig(otherOrg, other.id, "Prepare a trial binder", "f");
  await pool.query("insert into gig_matches (gig_id, person_id, fit, tier, reasons) values ($1, $2, 80, 2, '{\"Family law\",\"Uses Clio\"}')", [gig3, fl.id]);
  assertEquals(((await rpc("dela_gig_alerts_send", { p: { gig_id: gig3 } })) as Record<string, any>).sent, 0, "every channel off: nothing");
  await call("POST", "/guide/prefs", fl.token, { alerts_email: true, alerts_in_guide: true, alerts_notices: true });
  await pool.query("update settings set value = '2'::jsonb where key = 'gig_alerts.max_per_day'");
  assertEquals(((await rpc("dela_gig_alerts_send", { p: { gig_id: gig3 } })) as Record<string, any>).sent, 0, "the daily cap is reached (2 alerts already sent today)");
  await pool.query("update settings set value = '3'::jsonb where key = 'gig_alerts.max_per_day'");
  assertEquals(((await rpc("dela_gig_alerts_send", { p: { gig_id: gig3 } })) as Record<string, any>).sent, 1, "under the cap again, it goes out");

  const j = await one("select count(*) n from jobs where kind = 'gig_alerts' and payload->>'gig_id' = $1", [gig3]);
  assertEquals(Number(j.n), 0, "a gig inserted as open does not queue alerts; opening one does");
  const gig4 = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, request_id) values ($1, $2, $4, 1, 'Draft letters', '{"task":"x"}', 30000, 90000, 'draft', $3) returning id`, [otherOrg, other.id, "gg4" + RUN, otherPb])).id;
  await pool.query("update gigs set status = 'open', opened_at = now(), closes_at = now() + interval '14 days' where id = $1", [gig4]);
  assertEquals(Number((await one("select count(*) n from jobs where kind = 'gig_alerts' and payload->>'gig_id' = $1", [gig4])).n), 1, "posting a gig queues its alerts");
});

Deno.test("sides stay separate, the team sees the funnel, members do not", async () => {
  assertEquals((await call("GET", "/admin/guide", fl.token)).status, 403);
  const rep = (await call("GET", "/admin/guide", team.token)).body.data;
  assert(rep.people >= 2 && rep.alerts_today >= 1 && rep.steps.pick_task >= 1, JSON.stringify(rep));
  assertEquals(((await rpc("dela_guide_state", { p_person: att.id, p_side: "freelancer" })) as Record<string, any>).reason, "no_side");
});
