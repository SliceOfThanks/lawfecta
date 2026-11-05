// Images in documents through the real api and database (docs/briefs/step-2e-document-images.md): the upload rules, the
// caption and the confirmation, DELA's check holding an image, the export and approval block, only the firm's own images,
// the per-step limit, Policies text only, older screenshots, Word and web page exports with the image, freelancers on a gig
// (and not after), the "Still current" step at a due review, and a hold that arrives later through the worker.
// With an OpenAI and storage stand-in. Run after tools/dbtest.sh:   deno test -A supabase/functions/api/images_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool } from "../../../tests/lib/pg_rpc.ts";
import { rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "I".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-images-0123456789";
// A real 40 by 30 PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsAlDCYqRhQw4mvRvpvpExGKxWCwWi8VisVj8N16B+mj7BBLoxAAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
let holdNext = false;

const SOP = {
  type: "sop", title: "Open a matter in Clio", lifecycle: "MAT", owner_role: "Paralegal", roles: ["Attorney", "Paralegal"], purpose: "Open the matter.", scope: "Every new matter.",
  trigger: "The engagement letter is signed.", before_you_start: ["Access to Clio"], timing: "Within 1 business day.", quality_check: ["Matter number recorded"], done_when: "The matter is open.",
  related_links: [{ label: "Matter checklist", url: "" }], decisions: [{ if: "the fee is unusual", then: "Stop.", attorney_decides: true, escalate_to: "Attorney" }],
  steps: [{ text: "Create the matter in Clio.", role: "Paralegal", raci: { Paralegal: "R,A" }, menu_path: "Clio > Matters > New" }, { text: "Add the team to the matter.", role: "Paralegal", raci: { Paralegal: "R,A" } },
    { text: "Record the matter number in the notes.", role: "Paralegal", raci: { Paralegal: "R,A" } }],
};
let draftAnswer: Record<string, unknown> = { document: SOP };

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content);
    let out: unknown = {};
    if (body.response_format && system.includes("legal operations tool")) { out = { client_info: holdNext, kinds: holdNext ? ["client_name"] : [] }; holdNext = false; }
    else if (system.includes("document assistant inside Lawfecta, writing one")) out = draftAnswer;
    return Response.json({ model: body.model, choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const blobs = new Map<string, Uint8Array>();
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: (p) => Promise.resolve(blobs.get(p)?.length ?? 0), read: (p) => blobs.has(p) ? Promise.resolve(blobs.get(p)!) : Promise.reject(new Error("missing")),
  remove: (ps) => { ps.forEach((p) => blobs.delete(p)); return Promise.resolve(); }, put: (p, b) => { blobs.set(p, b); return Promise.resolve(); },
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com" } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

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
  const bd = 7_900_000 + RUN * 10 + k;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name, email) values ($1, $2, $3) returning id", [bd, "Img " + k, `img${bd}@test.invalid`])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}
const FIRM = (who: M) => ({ size: "2-5", practice_areas: ["Family law"], jurisdictions: "Texas", systems: { practice_management: ["Clio"] },
  roles: [{ name: "Attorney", kind: "attorney", person_id: who.id }, { name: "Paralegal", kind: "staff" }, { name: "Outsourced freelancer", kind: "freelancer" }] });

let att: M, other: M, fl: M, team: M;
let org = "", sop = "", policy = "", otherSop = "";
let n = 0;
// Upload one image the way the browser does: start, the upload itself, then complete with the caption and the checkbox
async function upload(who: M, pb: string, opts: { caption?: string; confirmed?: boolean; bytes?: Uint8Array; name?: string } = {}) {
  const st = (await call("POST", "/documents/images/start", who.token, { playbook_id: pb, name: opts.name ?? "screen.png", size_bytes: (opts.bytes ?? PNG).length, request_id: "img" + (n++), ticked: true })).body;
  if (!st.ok) return st;
  blobs.set(st.upload_url.replace("https://storage.test/up/", ""), opts.bytes ?? PNG);
  return (await call("POST", "/documents/images/complete", who.token, { playbook_id: pb, file_id: st.file_id, caption: opts.caption ?? "The New matter button in Clio", confirmed: opts.confirmed ?? true, flags_found: 2, flags_blurred: 2 })).body;
}
async function get(id: string, who = att) { return (await call("GET", "/playbooks/get?id=" + id, who.token)).body; }
async function save(id: string, body: unknown, who = att) {
  const cur = await get(id, who);
  return (await call("POST", "/playbooks/save", who.token, { id, base_version: cur.playbook.version, body })).body;
}
const withImages = (b: any, step: number, refs: Array<{ id: string; caption: string }>) => ({ ...b, steps: b.steps.map((s: any, i: number) => (i === step ? { ...s, images: refs } : s)) });
const item = (r: any, id: string) => r.check.items.find((i: any) => i.id === id);

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('document_standard', 'playbook_library', 'flex_gigs', 'ai_generation', 'worker', 'profiles', 'file_uploads')");
  await pool.query("update feature_switches set state = 'off' where key = 'document_images'");
  att = await member(1, "att_pro"); other = await member(2, "att_pro"); fl = await member(3, "fl_plus"); team = await member(4, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  for (const m of [att, other]) assertEquals((await call("POST", "/documents/firm", m.token, FIRM(m))).body.ok, true);
  org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const oorg = (await one("select dela_side_org($1, 'attorney') o", [other.id])).o;
  sop = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "sop", request_id: "s1", answers: { name: "Open a matter in Clio" } })).body.id;
  otherSop = (await call("POST", "/documents/draft", other.token, { org_id: oorg, type: "sop", request_id: "s1", answers: { name: "Open a matter in Clio" } })).body.id;
  draftAnswer = { document: { type: "policy", title: "Trust account rules", owner_role: "Attorney", roles: ["Attorney"], purpose: "Keep client money safe.", scope: "Everyone.", rules_must: ["Deposit within 1 business day"], exceptions: "None.", exceptions_role: "Attorney" } };
  policy = (await call("POST", "/documents/draft", att.token, { org_id: org, type: "policy", request_id: "p1", answers: { name: "Trust account rules" } })).body.id;
  draftAnswer = { document: SOP };
  assert(sop && otherSop && policy);
});

Deno.test("the upload rules: the switch, Policies, other firms, PNG and JPG only, 5 MB, the checkbox, the caption", async () => {
  assertEquals((await upload(att, sop)).reason, "images_off");
  await pool.query("update feature_switches set state = 'everyone' where key = 'document_images'");
  assertEquals((await upload(att, policy)).reason, "policy_text_only", "Policies stay text only");
  assertEquals((await upload(other, sop)).reason, "not_found", "another firm cannot add images to this firm's document");
  assertEquals((await upload(att, sop, { name: "screen.gif" })).reason, "image_type");
  assertEquals((await call("POST", "/documents/images/start", att.token, { playbook_id: sop, name: "big.png", size_bytes: 6 * 1048576, request_id: "big", ticked: true })).body.reason, "image_too_big");
  assertEquals((await call("POST", "/documents/images/start", att.token, { playbook_id: sop, name: "a.png", size_bytes: 10, request_id: "nt", ticked: false })).body.reason, "confirm_needed");
  assertEquals((await upload(att, sop, { caption: "" })).reason, "caption_needed");
  assertEquals((await upload(att, sop, { caption: "x".repeat(121) })).reason, "caption_too_long");
  assertEquals((await upload(att, sop, { confirmed: false })).reason, "confirm_needed");
  const fake = await upload(att, sop, { bytes: new TextEncoder().encode("not really a picture"), name: "fake.png" });
  assertEquals(fake.reason, "image_refused", "a renamed file that is not an image is refused by the file check");
  const ok = await upload(att, sop);
  assertEquals([ok.ok, ok.held, ok.confirmed], [true, false, true], JSON.stringify(ok));
  const f = await one("select f.purpose, f.status, di.width, di.height, di.flags_found from doc_images di join files f on f.id = di.file_id where di.id = $1", [ok.id]);
  assertEquals([f.purpose, f.status, f.width, f.height, f.flags_found], ["doc_image", "ready", 40, 30, 2]);
  const files = (await call("GET", "/files", att.token)).body;
  assert(!JSON.stringify(files).includes(ok.id) && !(files.files ?? []).some((x: any) => x.name === "screen.png"), "document images do not show on the Files tab");
});

Deno.test("an image on a step: checked, captions, words not counted, only the firm's images, 3 per step, Policies drop them", async () => {
  const a = await upload(att, sop), b = await upload(att, sop), c = await upload(att, sop), d = await upload(att, sop);
  const cur = await get(sop);
  const before = cur.check.words;
  let r = await save(sop, withImages(cur.body, 0, [{ id: a.id, caption: "The New matter button" }]));
  assertEquals([r.ok, item(r, "image_checks").status, item(r, "image_captions").status], [true, "pass", "pass"], JSON.stringify(r));
  assertEquals(r.check.words, before, "images and captions do not count toward the 900 words");
  const g = await get(sop);
  assertEquals(g.body.steps[0].images, [{ id: a.id, caption: "The New matter button" }]);
  assertEquals(g.images[a.id].confirmed, true);
  assert(!JSON.stringify(g.images).includes("/img/"), "the storage path is never sent to the browser");
  assertEquals(g.image_settings, { on: true, max_mb: 5, per_step: 3, caption_max: 120, max_width_px: 2400 });
  // No caption: needs attention, never blocking
  r = await save(sop, withImages(g.body, 0, [{ id: a.id, caption: "" }]));
  assertEquals([item(r, "image_captions").status, item(r, "image_captions").detail, r.check.blocking], ["attention", "Step 1 image is missing a caption.", 0]);
  // Four on one step: the first three stay
  r = await save(sop, withImages((await get(sop)).body, 1, [a, b, c, d].map((x, i) => ({ id: x.id, caption: "Shot " + i }))));
  assertEquals((await get(sop)).body.steps[1].images.length, 3);
  assert(r.notices.some((x: string) => x.includes("3 images")), JSON.stringify(r.notices));
  // Another firm's image id is taken off
  const theirs = await upload(other, otherSop);
  r = await save(sop, withImages((await get(sop)).body, 2, [{ id: theirs.id, caption: "Not ours" }]));
  assertEquals((await get(sop)).body.steps[2].images, []);
  assert(r.notices.some((x: string) => x.includes("not in this firm's library")));
  assertEquals((await call("GET", "/documents/image?id=" + theirs.id, att.token)).body.reason, "not_found", "and it cannot be opened");
  // A Policy never keeps images
  const pol = await get(policy);
  await save(policy, { ...pol.body, section_images: { before_you_start: [{ id: a.id, caption: "x" }] }, steps: [{ text: "x", images: [{ id: a.id, caption: "x" }] }] });
  assert(!JSON.stringify((await get(policy)).body).includes(a.id));
});

Deno.test("DELA's check holds an image: blocking until confirmed again; then exports carry the image", async () => {
  holdNext = true;
  const h = await upload(att, sop, { caption: "The client list screen" });
  assertEquals([h.ok, h.held, h.confirmed], [true, true, false]);
  const cur = await get(sop);
  const r = await save(sop, { ...cur.body, steps: cur.body.steps.map((s: any, i: number) => (i === 0 ? { ...s, images: [...s.images, { id: h.id, caption: "The client list screen" }] } : s)) });
  assertEquals(item(r, "image_checks").status, "blocking");
  assert(item(r, "image_checks").detail.includes("may show client information"));
  assertEquals(item(r, "image_checks").images, [h.id]);
  assertEquals((await call("POST", "/playbooks/export", att.token, { id: sop, format: "docx" })).body.reason, "checks_failing");
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.reason, "checks_failing");
  assertEquals((await call("POST", "/documents/fix", att.token, { id: sop, check_id: "image_checks" })).body.reason, "fix_in_image_window");
  assertEquals((await call("POST", "/documents/images/confirm", att.token, { image_id: h.id })).body.reason, "confirm_needed");
  assertEquals((await call("POST", "/documents/images/confirm", other.token, { image_id: h.id, confirmed: true })).body.reason, "not_found");
  assertEquals((await call("POST", "/documents/images/confirm", att.token, { image_id: h.id, confirmed: true })).body.ok, true);
  assertEquals((await one("select blocking from playbooks where id = $1", [sop])).blocking, 0, "the document's checks are worked out again");
  const w = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "docx" })).body;
  assertEquals(w.ok, true, JSON.stringify(w));
  const z = unzipSync(Uint8Array.from(atob(w.b64), (c) => c.charCodeAt(0)));
  assert(z["word/media/image1.png"] && z["word/media/image2.png"], Object.keys(z).join(","));
  const xml = strFromU8(z["word/document.xml"]);
  assert(xml.includes('cx="5943600"') && xml.includes("The client list screen") && xml.includes("<wp:inline"), "full page width with the caption");
  assert(strFromU8(z["word/_rels/document.xml.rels"]).includes("media/image1.png"));
  const html = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "html" })).body;
  assert(html.text.includes("data:image/png;base64,") && html.text.includes("<figcaption>The client list screen</figcaption>"));
  const md = (await call("POST", "/playbooks/export", att.token, { id: sop, format: "md" })).body;
  assert(md.text.includes("[Image: The client list screen]"));
});

Deno.test("who can open an image: the firm yes, others no; a freelancer only on a gig, and not after it ends", async () => {
  const id = (await get(sop)).body.steps[0].images[0].id;
  const ok = (await call("GET", "/documents/image?id=" + id, att.token)).body;
  assert(ok.ok && ok.url.includes("/img/") && ok.url.includes("exp=300"), JSON.stringify(ok));
  assertEquals((await call("GET", "/documents/image?id=" + id, other.token)).body.reason, "not_found");
  assertEquals((await call("GET", "/documents/image?id=" + id, fl.token)).body.reason, "not_found");
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.ok, true);
  const gigs = (await call("GET", "/gigs", att.token)).body;
  assertEquals(gigs.playbooks.find((p: any) => p.id === sop).images, 4, "the Projects list counts the images for the warning");
  assert(!gigs.playbooks.some((p: any) => p.id === policy), "Policies are never offered for a gig");
  const g = (await call("POST", "/gigs/draft", att.token, { playbook_id: sop, request_id: "g1", budget_min: 300, budget_max: 600, use_ai: false })).body;
  assertEquals(g.ok, true, JSON.stringify(g));
  assertEquals((await call("GET", "/gigs/get?id=" + g.id, att.token)).body.gig_part.images, 4, "each image counted once");
  await pool.query("update gigs set status = 'open' where id = $1", [g.id]);
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [g.id, fl.id, att.id]);
  const fv = (await call("GET", "/gigs/get?id=" + g.id, fl.token)).body;
  assertEquals(fv.playbook.steps[0].images.map((x: any) => x.id).includes(id), true, "the freelancer's part carries the images");
  assertEquals((await call("GET", "/documents/image?id=" + id + "&gig=" + g.id, fl.token)).body.ok, true);
  assertEquals((await call("GET", "/documents/image?id=" + id, fl.token)).body.reason, "not_found", "only through the gig");
  const notInGig = await upload(att, sop);
  assertEquals((await call("GET", "/documents/image?id=" + notInGig.id + "&gig=" + g.id, fl.token)).body.reason, "not_found", "an image the gig's version does not use stays closed");
  await pool.query("update gigs set status = 'closed' where id = $1", [g.id]);
  assertEquals((await call("GET", "/documents/image?id=" + id + "&gig=" + g.id, fl.token)).body.reason, "image_closed", "after the gig closes the images are hidden");
});

Deno.test("a due review: Approve waits until each image is marked still current", async () => {
  const cur = await get(sop);
  await save(sop, { ...cur.body, purpose: "Open the matter in Clio." });
  await pool.query("update playbooks set next_review_at = current_date - 1, last_reviewed_at = current_date - 30 where id = $1", [sop]);
  await pool.query("update doc_images set created_at = now() - interval '60 days' where org_id = $1", [org]);
  const g = await get(sop);
  assertEquals([g.images_due.due, g.images_due.ids.length], [true, 4]);
  const r = (await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body;
  assertEquals([r.ok, r.reason], [false, "images_review_needed"]);
  for (const id of g.images_due.ids) assertEquals((await call("POST", "/documents/images/current", att.token, { playbook_id: sop, image_id: id })).body.ok, true);
  assertEquals((await call("POST", "/documents/images/current", other.token, { playbook_id: sop, image_id: g.images_due.ids[0] })).body.reason, "not_found");
  assertEquals((await call("POST", "/playbooks/status", att.token, { id: sop, action: "approve" })).body.ok, true);
  let threw = false;
  try { await pool.query("delete from doc_image_checks"); } catch { threw = true; }
  assert(threw, "the still-current marks are append-only");
});

Deno.test("a hold that arrives later takes the confirmation away and blocks the document again", async () => {
  const cur = await get(sop);
  const id = cur.body.steps[0].images[0].id;
  const file = (await one("select file_id from doc_images where id = $1", [id])).file_id;
  await pool.query("update files set status = 'checking' where id = $1", [file]);
  await pool.query("select dela_job_enqueue('doc_image_check', jsonb_build_object('file_id', $1::text), now(), 'later:' || $1::text, $2)", [file, att.id]);
  holdNext = true;
  await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  assertEquals((await one("select confirmed_at from doc_images where id = $1", [id])).confirmed_at, null);
  assert((await one("select blocking from playbooks where id = $1", [sop])).blocking > 0, "the current version is blocked again");
  assertEquals((await one("select count(*)::int n from notifications where person_id = $1 and dedupe_key = $2", [att.id, "docimgheld:" + id + ":in_app"])).n >= 1, true);
  assertEquals((await call("GET", "/documents/image?id=" + id, att.token)).body.ok, true, "the firm can still open it to fix it");
});

Deno.test("older screenshots from imports become images, confirmed at import; the team sees counts", async () => {
  const fid = crypto.randomUUID();
  await pool.query(`insert into files (id, org_id, group_id, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at, status, is_current)
    values ($1::uuid, $2::uuid, $1::uuid, 'Scribe step 1.png', 'png', $3, $2::text || '/' || $1::text || '.png', $4, 'attorney', 'scribe-' || $1::text, now(), 'ready', true)`, [fid, org, PNG.length, att.id]);
  blobs.set(org + "/" + fid + ".png", PNG);
  const cur = await get(sop);
  const r = await save(sop, { ...cur.body, steps: [...cur.body.steps, { text: "Save the matter.", role: "Paralegal", raci: { Paralegal: "R,A" }, screenshot: fid }] });
  assertEquals(r.ok, true, JSON.stringify(r));
  const g = await get(sop);
  const last = g.body.steps.at(-1);
  assertEquals([last.screenshot, last.images.length], ["", 1]);
  assertEquals([g.images[last.images[0].id].source, g.images[last.images[0].id].confirmed], ["import", true]);
  assertEquals(item(g, "image_captions").status, "attention", "an older screenshot asks for a caption");
  const adm = (await call("GET", "/admin/documents", team.token)).body;
  const im = (adm.data ?? adm).images;
  assert(im.total >= 6 && im.flags_found >= 2, JSON.stringify(im));
  assert(!JSON.stringify(adm).includes("/img/"), "the team never gets image addresses");
});

Deno.test("teardown", async () => {
  await pool.end();
});
