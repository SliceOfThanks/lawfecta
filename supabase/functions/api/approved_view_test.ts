// UX review Phase 4 part A (docs/briefs/step-8a-phase-4.md): the approved version, read-only, through the real api and
// database. Off: nothing changes. On: an approved document comes with its approved version (date, approver, the document laid
// out as exported); a new draft keeps the approved version in use, and exports use it unless the member asks for the draft,
// which carries the draft banner. Other firms and freelancers never see it.
//   deno test -A supabase/functions/api/approved_view_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const fakeFetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };
async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(k: number, plan: string, name: string): Promise<M> {
  const bd = 8_950_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, name, `av${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const STEP = (text: string, extra: Record<string, unknown> = {}) => ({ text, role: "Paralegal", raci: { Paralegal: "R", Attorney: "A" }, ...extra });
const PARENT = {
  schema: 2, type: "sop", title: "New client intake", lifecycle: "INT", owner_role: "Attorney", roles: ["Attorney", "Paralegal"], role_kinds: { Attorney: "attorney", Paralegal: "staff" },
  purpose: "Bring a new client in the same way every time.", scope: "Every new client.", trigger: "A client signs the engagement letter.", before_you_start: ["Access to Clio"],
  steps: [STEP("Send the intake questionnaire."), STEP("Send a reminder if it is not back in 2 days."), STEP("Log the returned form in the matter."), STEP("Draft the intake summary."),
    STEP("Decide whether the matter needs a second attorney.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } }), STEP("Advise the client on next steps.", { attorney_decides: true, role: "Attorney", raci: { Attorney: "R,A" } })],
  quality_check: ["The form is logged"], done_when: "The summary is in the matter.", kpis: [{ name: "Days to intake", measures: "Days", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "2", rhythm: "Monthly" },
    { name: "Forms returned", measures: "Share", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "90%", rhythm: "Monthly" }, { name: "Rework", measures: "Count", kind: "lagging", source: "Clio", owner_role: "Attorney", baseline: "", target: "0", rhythm: "Monthly" }],
};
let att: M, other: M, fl: M;
let org = "", pb = "";
const get = async (who: M = att) => (await call("GET", "/playbooks/get?id=" + pb, who.token)).body;
const exp = async (which = "") => (await call("POST", "/playbooks/export", att.token, { id: pb, format: "md", which, request_id: crypto.randomUUID() })).body;

Deno.test("setup: an attorney with a firm profile, another attorney, a freelancer, an SOP approved through the api", async () => {
  await pool.query("update feature_switches set state = 'everyone' where key in ('document_standard', 'playbook_library', 'profiles')");
  await pool.query("update feature_switches set state = 'off' where key in ('approved_view', 'tech_catalog')");
  att = await member(1, "att_pro", "Ann Approver"); other = await member(2, "att_pro", "Otto Other"); fl = await member(3, "fl_plus", "Fran Free");
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const fs = (await call("POST", "/documents/firm", att.token, { size: "2-5", practice_areas: ["Family law"], jurisdictions: "Texas", systems: { practice_management: ["Clio"] },
    roles: [{ name: "Attorney", kind: "attorney", person_id: att.id }, { name: "Paralegal", kind: "staff" }] })).body;
  assert(fs.ok, JSON.stringify(fs));
  pb = (await one(`insert into playbooks (org_id, title, status, current_version, completeness, request_id, created_by, doc_type, lifecycle) values ($1, 'New client intake', 'draft', 1, 100, $2, $3, 'sop', 'INT') returning id`, [org, "av" + RUN, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, PARENT, att.id]);
  const ap = (await call("POST", "/playbooks/status", att.token, { id: pb, action: "approve" })).body;
  assert(ap.ok, JSON.stringify(ap));
});

Deno.test("the switch off: no approved view, and exports work as before", async () => {
  const r = await get();
  assertEquals([r.ok, r.playbook.approved_version, "approved" in r], [true, 1, false]);
  const e = await exp();
  assert(e.ok && e.text.includes("Send the intake questionnaire.") && !e.text.includes("Draft, not approved"), JSON.stringify(e).slice(0, 300));
  await pool.query("update feature_switches set state = 'everyone' where key = 'approved_view'");
});

Deno.test("an approved document comes with its approved version: date, approver, laid out as exported", async () => {
  const r = await get();
  const a = r.approved;
  assertEquals([a.version, a.current, a.approved_by], [1, true, "Ann Approver"], JSON.stringify(a).slice(0, 300));
  assert(a.approved_at, "the approval date");
  assert(!a.blocks.some((b: any) => b.title === "Header"), "the page shows its own header facts");
  const steps = a.blocks.find((b: any) => (b.items ?? []).some((t: string) => t.includes("Send the intake questionnaire.")));
  assert(steps, "the steps are in the layout");
  for (const [who, why] of [[other, "another firm"], [fl, "a freelancer"]] as Array<[M, string]>) {
    const x = await get(who);
    assert(x.ok !== true && !x.approved, why + " never sees it: " + JSON.stringify(x).slice(0, 120));
  }
});

Deno.test("a new draft keeps the approved version in use; exports use it unless the draft is asked for", async () => {
  const changed = JSON.parse(JSON.stringify(PARENT));
  changed.steps[0].text = "Send the new intake questionnaire by email.";
  const sv = (await call("POST", "/playbooks/save", att.token, { id: pb, base_version: 1, body: changed, note: "New first step" })).body;
  assertEquals(sv.ok, true, JSON.stringify(sv));
  const r = await get();
  assertEquals([r.playbook.status, r.playbook.version, r.playbook.approved_version, r.approved.version, r.approved.current], ["draft", 2, 1, 1, false]);
  const text = JSON.stringify(r.approved.blocks);
  assert(text.includes("Send the intake questionnaire.") && !text.includes("Send the new intake questionnaire"), "the page shows the approved text, not the draft");
  const e = await exp();
  assert(e.ok && e.text.includes("Send the intake questionnaire.") && !e.text.includes("new intake questionnaire") && !e.text.includes("Draft, not approved"), "the export is the approved version");
  const d = await exp("draft");
  assert(d.ok && d.text.includes("Send the new intake questionnaire by email.") && d.text.includes("Draft, not approved"), "the draft export carries the banner");
  // A second save from the old version is refused, so two people never make two drafts
  assertEquals((await call("POST", "/playbooks/save", att.token, { id: pb, base_version: 1, body: changed })).body.reason, "changed");
});

Deno.test("teardown", async () => {
  await pool.query("update feature_switches set state = 'off' where key = 'approved_view'");
  await pool.end();
});
