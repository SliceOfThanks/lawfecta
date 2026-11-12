// Step 5 API tests: availability, open times, booking with holds (two at once), confirm, reschedule, cancel, the room,
// follow-ups and attendance; messages with permissions, the off-platform check, edits, removal, read receipts, attachments,
// blocking, reports and DELA in the thread. The real handler and the local test database, with stand-ins for OpenAI and Vectera.
//   deno test -A supabase/functions/api/meetings_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { handle, type Deps } from "./app.ts";
import { sessionHash } from "./lib/crypto.ts";
import { meetingIcs, readSteps, withoutLawfectaLinks } from "./lib/meetings/meet.ts";
import type { Storage } from "./lib/files/storage.ts";
import { pool, rpc } from "../../../tests/lib/pg_rpc.ts";

const LAWFECTA = "sk-lawfecta" + "M".repeat(40); // rules-ok: a made-up test key
const WORKER = "test-worker-secret-meetings-0123456789ab";
let vecteraKey = "";
const vecteraCalls: string[] = [];

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/api/v2/meetingRooms")) {
    vecteraCalls.push(String(init.body));
    return Response.json({ id: "room-1", url: "https://meet.lawfecta.com/r/room-1?k=guest", hostUrl: "https://meet.lawfecta.com/r/room-1?k=host" });
  }
  if (url.endsWith("/chat/completions")) {
    const body = JSON.parse(String(init.body));
    const system = String(body.messages[0].content), user = String(body.messages.at(-1).content);
    // OpenAI's own rule: JSON mode is refused unless the messages mention JSON (the cause of the track B Summarize failure)
    if (body.response_format?.type === "json_object" && !JSON.stringify(body.messages).toLowerCase().includes("json")) return Response.json({ error: { message: "'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.", type: "invalid_request_error" } }, { status: 400 });
    let out: unknown = "";
    if (body.response_format && system.includes("legal operations tool")) out = { client_info: false, kinds: [] };
    else if (system.includes("You review messages members send")) out = /privately/i.test(user) ? { off_platform: true, kinds: ["off_platform"], insights: [] } : { off_platform: false, kinds: [], insights: ["Replies quickly"] };
    else if (system.includes("suggesting next steps after a meeting")) out = { steps: [{ who: "freelancer", text: "Send a proposal" }, { who: "attorney", text: "Update the gig budget" }] };
    else if (system.includes("drafting a reply for the member")) return Response.json({ model: body.model, choices: [{ message: { content: "Thanks, Monday works for me." } }], usage: { prompt_tokens: 5, completion_tokens: 5 } });
    else if (system.includes("summarizing a message thread")) return Response.json({ model: body.model, choices: [{ message: { content: "The attorney needs intake help; the freelancer can start Monday." } }], usage: { prompt_tokens: 5, completion_tokens: 5 } });
    return Response.json({ model: body.model, choices: [{ message: { content: typeof out === "string" ? out : JSON.stringify(out) } }], usage: { prompt_tokens: 5, completion_tokens: 5 } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;
const storage: Storage = {
  signUpload: (p) => Promise.resolve("https://storage.test/up/" + p), signDownload: (p, s) => Promise.resolve(`https://storage.test/get/${p}?exp=${s}`),
  size: () => Promise.resolve(1), read: () => Promise.reject(new Error("missing")), remove: () => Promise.resolve(), put: () => Promise.resolve(),
};
const deps: Deps = { rpc, env: (k) => ({ OPENAI_API_KEY: LAWFECTA, DELA_ORIGINS: "https://lawfecta.com", VECTERA_API_KEY: vecteraKey } as Record<string, string>)[k] ?? "", fetch: fakeFetch, storage };

async function call(method: string, path: string, session: string, body?: unknown) {
  const res = await handle(new Request("http://localhost/functions/v1/api" + path, {
    method, headers: { origin: "https://lawfecta.com", "x-dela-session": session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), deps);
  return { status: res.status, body: await res.json() };
}
const one = async (q: string, a: unknown[] = []) => (await pool.query(q, a)).rows[0];
async function worker(times = 2) {
  for (let i = 0; i < times; i++) {
    await pool.query("update jobs set run_at = now() where status in ('queued', 'delayed') and kind = 'meeting_tick' and payload->>'kind' = 'room'");
    await handle(new Request("http://localhost/functions/v1/api/worker", { method: "POST", headers: { "x-dela-worker": WORKER } }), deps);
  }
}

const RUN = Date.now() % 1000000;
type M = { token: string; id: string; bd: number };
async function member(n: number, plan: string): Promise<M> {
  const bd = 7_500_000 + RUN * 10 + n;
  const side = plan.startsWith("att") ? "attorney" : "freelancer";
  const id = (await one("insert into people (bd_member_id, display_name) values ($1, $2) returning id", [bd, "Meet " + n])).id;
  await pool.query("select dela_ensure_side($1, $2, $3, 'staff_grant')", [id, side, plan]);
  await pool.query("insert into access_list (bd_member_id, channel) values ($1, 'access')", [bd]);
  const token = "ds_test_" + crypto.randomUUID();
  await pool.query("insert into sessions (token_hash, person_id, side, auth_version, expires_at) values ($1, $2, $3, 1, now() + interval '1 hour')", [await sessionHash(token), id, side]);
  return { token, id, bd };
}

let att: M, fl: M, other: M, team: M;
let gig = "", thread = "", fileId = "", meeting = "";
const HOURS_ALL = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [String(d), [["08:00", "18:00"]]]));

Deno.test("the calendar file, next steps and Lawfecta's own links", () => {
  const ics = meetingIcs({ id: "abc", start_at: "2026-11-20T15:00:00Z", end_at: "2026-11-20T15:30:00Z", gig_title: "Intake, help; now", version: 2, status: "confirmed" }, "https://www.hirelegalhelp.com/dela?tab=meetings&meeting=abc");
  assert(ics.includes("DTSTART:20261120T150000Z") && ics.includes("SEQUENCE:2") && ics.includes("Intake\\, help\\; now"));
  assert(ics.split("\r\n").every((l) => l.length <= 75), "lines are folded");
  assertEquals(readSteps('Sure: {"steps":[{"who":"freelancer","text":"Send a proposal"}]}'), [{ who: "freelancer", text: "Send a proposal" }]);
  assertEquals(withoutLawfectaLinks("Join https://meet.lawfecta.com/r/1 or https://www.hirelegalhelp.com/dela", "meet.lawfecta.com").trim(), "Join  or");
});

Deno.test("setup", async () => {
  await pool.query(`create or replace function dela_worker_ok(p_secret text) returns boolean language sql as $$ select p_secret = '${WORKER}' $$`);
  await pool.query("update feature_switches set state = 'everyone' where key in ('flex_gigs', 'meetings', 'gig_chat', 'chat_assistant', 'conduct_review', 'member_insights', 'ai_generation', 'worker', 'profiles')");
  await pool.query("update settings set value = 'false' where key = 'verify.freelancer_linkedin'");
  att = await member(1, "att_pro"); fl = await member(2, "fl_plus"); other = await member(3, "fl_free"); team = await member(4, "att_free");
  await pool.query("insert into staff_roles (person_id, role) values ($1, 'reviewer')", [team.id]);
  await pool.query("insert into member_profiles (person_id, side, body, missing, score) values ($1, 'attorney', '{\"firm_name\":\"Example Legal\"}', '{}', 100)", [att.id]);
  await pool.query(`insert into licenses (person_id, request_id, region, bar_number, bar_key, name_on_record, method, status) values ($1, 'l', 'TX', $2, $2, 'A', 'video', 'verified')`, ["" + att.id, "M" + att.bd]);
  for (const f of [fl, other]) {
    await pool.query("insert into member_profiles (person_id, side, body, missing, score, availability_confirmed_at) values ($1, 'freelancer', '{\"first_name\":\"Fran\",\"practice_areas\":[\"Family law\"]}', '{}', 100, now())", [f.id]);
    await pool.query("select dela_profile_refresh($1, 'freelancer')", [f.id]);
  }
  await pool.query("select dela_profile_refresh($1, 'attorney')", [att.id]);
  const org = (await one("select dela_side_org($1, 'attorney') o", [att.id])).o;
  const pb = (await one(`insert into playbooks (org_id, title, status, current_version, approved_version, completeness, request_id, created_by) values ($1, 'Intake', 'approved', 1, 1, 100, 'm1', $2) returning id`, [org, att.id])).id;
  await pool.query("insert into playbook_versions (playbook_id, version, body, created_by) values ($1, 1, $2, $3)", [pb, { title: "Intake", steps: [{ text: "a" }] }, att.id]);
  gig = (await one(`insert into gigs (org_id, created_by, playbook_id, playbook_version, title, public, budget_min_cents, budget_max_cents, status, opened_at, closes_at, request_id)
    values ($1, $2, $3, 1, 'Client intake help', '{"task":"Intake"}', 30000, 60000, 'open', now(), now() + interval '14 days', 'mg1') returning id`, [org, att.id, pb])).id;
  await pool.query("insert into gig_invitations (gig_id, freelancer_id, invited_by) values ($1, $2, $3)", [gig, fl.id, att.id]);
  fileId = (await one(`insert into files (org_id, group_id, version, is_current, name, ext, size_bytes, storage_path, status, check_state, uploaded_by, side, request_id, no_client_info_ticked_at)
    values ($1, gen_random_uuid(), 1, true, 'Intake template.docx', 'docx', 100, 'test/' || gen_random_uuid(), 'ready', 'clear', $2, 'attorney', 'mf1', now()) returning id`, [org, att.id])).id;
});

Deno.test("availability: checked, then open times respect hours, days off, notice and the time zone", async () => {
  assertEquals((await call("POST", "/availability", fl.token, { timezone: "Mars/Base", lengths: [30], hours: HOURS_ALL })).body.reason, "bad_timezone");
  assertEquals((await call("POST", "/availability", fl.token, { timezone: "America/Chicago", lengths: [20], hours: HOURS_ALL })).body.reason, "choose_a_length", "only the set lengths");
  assertEquals((await call("POST", "/availability", fl.token, { timezone: "America/Chicago", lengths: [30], hours: { "1": [["17:00", "09:00"]] } })).body.reason, "bad_hours");
  const tomorrow = (await one("select ((now() at time zone 'America/Chicago')::date + 3)::text d")).d;
  assertEquals((await call("POST", "/availability", fl.token, { timezone: "America/Chicago", lengths: [30, 45], hours: HOURS_ALL, days_off: [tomorrow] })).body.ok, true);
  assertEquals((await call("GET", `/meetings/slots?gig=${gig}&freelancer=${other.id}&length=30`, att.token)).body.reason, "not_found", "only a freelancer on the gig");
  const r = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30`, att.token)).body;
  assertEquals(r.ok, true, JSON.stringify(r));
  const slots = r.slots as string[];
  assert(slots.length > 50);
  const first = new Date(slots[0]).getTime();
  assert(first >= Date.now() + 12 * 3600_000 - 60_000, "at least 12 hours' notice");
  assert(new Date(slots.at(-1)!).getTime() <= Date.now() + 21 * 86400_000, "at most 21 days ahead");
  const local = await one("select bool_and(extract(hour from (s::timestamptz at time zone 'America/Chicago')) between 8 and 17) ok, bool_or((s::timestamptz at time zone 'America/Chicago')::date = $1::date) off from unnest($2::text[]) s", [tomorrow, slots]);
  assertEquals([local.ok, local.off], [true, false], "inside the freelancer's own hours, and never on a day off");
  assertEquals((await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=15`, att.token)).body.slots.length, 0, "a length they do not offer has no times");
});

Deno.test("booking: two at once for the same time, one wins; confirm once; reminders, the room and the follow-up are queued", async () => {
  const slots = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30`, att.token)).body.slots as string[];
  const start = slots[80]; // more than a day ahead, so both reminders are due
  const [a, b] = await Promise.all([
    call("POST", "/meetings/hold", att.token, { gig_id: gig, freelancer: fl.id, start_at: start, length: 30, request_id: "h1" }),
    call("POST", "/meetings/hold", fl.token, { gig_id: gig, start_at: start, length: 30, request_id: "h2" }),
  ]);
  const wins = [a.body, b.body].filter((x) => x.ok);
  assertEquals(wins.length, 1, JSON.stringify([a.body, b.body]));
  const loser = [a.body, b.body].find((x) => !x.ok);
  assertEquals(loser.reason, "time_taken");
  assert(loser.next.length > 0, "the other person is shown the next open times");
  const winner = a.body.ok ? att : fl;
  meeting = wins[0].id;
  assertEquals((await call("POST", "/meetings/confirm", winner === att ? fl.token : att.token, { id: meeting })).body.reason, "not_found", "only the one who held it confirms");
  assertEquals((await call("POST", "/meetings/confirm", winner.token, { id: meeting })).body.ok, true);
  assertEquals((await call("POST", "/meetings/confirm", winner.token, { id: meeting })).body.duplicate, true);
  const n = (await one("select count(*)::int n from notifications where kind = 'meeting' and channel = 'in_app' and link like $1", ["%" + meeting])).n;
  assertEquals(n, 2, "one confirmation each");
  const jobs = (await one("select count(*)::int n from jobs where kind = 'meeting_tick' and payload->>'meeting_id' = $1", [meeting])).n;
  assertEquals(jobs, 5, "two reminders, the room and two follow-up notices");
  // An expired hold cannot be confirmed
  const h = (await call("POST", "/meetings/hold", att.token, { gig_id: gig, freelancer: fl.id, start_at: slots[40], length: 30, request_id: "h3" })).body;
  await pool.query("update meetings set hold_expires_at = now() - interval '1 minute' where id = $1", [h.id]);
  assertEquals((await call("POST", "/meetings/confirm", att.token, { id: h.id })).body.reason, "hold_expired");
  const after = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30`, att.token)).body.slots as string[];
  assert(!after.includes(start), "the booked time is no longer offered");
  const ics = (await call("GET", "/meetings/ics?id=" + meeting, fl.token)).body;
  assert(ics.ok && ics.text.includes("BEGIN:VEVENT"), "a calendar file for any calendar");
});

Deno.test("the room: waits for Vectera without a key; with it, each person gets their own link only near the meeting time", async () => {
  await worker(1);
  assertEquals((await one("select room_status from meetings where id = $1", [meeting])).room_status, "waiting_for_provider");
  vecteraKey = "vectera-test-key";
  await pool.query("update jobs set status = 'queued', attempts = 0 where kind = 'meeting_tick' and payload->>'meeting_id' = $1 and payload->>'kind' = 'room'", [meeting]);
  await pool.query("update meetings set room_status = 'pending' where id = $1", [meeting]);
  await worker(1);
  assertEquals((await one("select room_status from meetings where id = $1", [meeting])).room_status, "ready");
  let mine = (await call("GET", "/meetings?id=" + meeting, fl.token)).body.meetings[0];
  assertEquals(mine.join_url, null, "the link is hidden until the room opens");
  await pool.query("update meetings set start_at = now() + interval '5 minutes', end_at = now() + interval '35 minutes' where id = $1", [meeting]);
  mine = (await call("GET", "/meetings?id=" + meeting, fl.token)).body.meetings[0];
  assertEquals(mine.join_url, "https://meet.lawfecta.com/r/room-1?k=guest");
  assertEquals((await call("GET", "/meetings?id=" + meeting, att.token)).body.meetings[0].join_url, "https://meet.lawfecta.com/r/room-1?k=host");
  assertEquals((await call("GET", "/meetings?id=" + meeting, other.token)).body.meetings.length, 0, "nobody else sees it");
  vecteraKey = "";
});

Deno.test("consent, reschedule once with one update, and a late cancel", async () => {
  assertEquals((await call("POST", "/meetings/consent", fl.token, { id: meeting, consent: true })).body.ok, true);
  assertEquals((await call("GET", "/meetings?id=" + meeting, att.token)).body.meetings[0].both_consent, false, "both must tick");
  // Put the meeting on an open time, then move it by 15 minutes (track B test and Stacey, 2026-11-05)
  const all = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30`, fl.token)).body.slots as string[];
  const cur = all[20], next15 = new Date(new Date(cur).getTime() + 15 * 60000).toISOString();
  await pool.query("update meetings set start_at = $2, end_at = $2::timestamptz + interval '30 minutes' where id = $1", [meeting, cur]);
  const slots = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30&except=${meeting}`, fl.token)).body.slots as string[];
  const ms = (x: string) => new Date(x).getTime();
  assert(!slots.some((x) => ms(x) === ms(cur)), "the new-time list leaves out the meeting's current time");
  assert(slots.some((x) => ms(x) === ms(next15)), "a time 15 minutes later is offered, because the meeting being moved does not block itself");
  assertEquals((await call("POST", "/meetings/hold", fl.token, { gig_id: gig, start_at: cur, length: 30, request_id: "r0", reschedule_of: meeting })).body.reason, "same_time");
  const h = (await call("POST", "/meetings/hold", fl.token, { gig_id: gig, start_at: next15, length: 30, request_id: "r1", reschedule_of: meeting })).body;
  assertEquals(h.ok, true, JSON.stringify(h));
  assertEquals((await call("POST", "/meetings/confirm", fl.token, { id: h.id })).body.ok, true);
  const old = await one("select status from meetings where id = $1", [meeting]);
  const nw = await one("select status, version, consent_freelancer_at is not null c from meetings where id = $1", [h.id]);
  assertEquals([old.status, nw.status, nw.version, nw.c], ["rescheduled", "confirmed", 2, true], "the new time replaces the old one and keeps the consent");
  const moved = (await one("select count(*)::int n from notifications where title like 'Meeting moved%' and channel = 'in_app' and link like $1", ["%" + h.id])).n;
  const canceledNotes = (await one("select count(*)::int n from notifications where title like 'Meeting canceled%' and link like $1", ["%" + meeting])).n;
  assertEquals([moved, canceledNotes], [2, 0], "one coherent update, no separate cancel");
  meeting = h.id;
  await pool.query("update meetings set start_at = now() + interval '1 hour', end_at = now() + interval '90 minutes' where id = $1", [meeting]);
  const c = (await call("POST", "/meetings/cancel", att.token, { id: meeting, reason: "Something came up" })).body;
  assertEquals([c.ok, c.late], [true, true], "within 2 hours counts as late");
});

Deno.test("follow-up: both confirm they met, attendance is verified and DELA suggests next steps", async () => {
  const slots = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=45`, att.token)).body.slots as string[];
  const h = (await call("POST", "/meetings/hold", att.token, { gig_id: gig, freelancer: fl.id, start_at: slots[0], length: 45, request_id: "f1" })).body;
  await call("POST", "/meetings/confirm", att.token, { id: h.id });
  assertEquals((await call("POST", "/meetings/followup", att.token, { id: h.id, met: true, summary: "x" })).body.reason, "not_yet");
  await pool.query("update meetings set start_at = now() - interval '1 hour', end_at = now() - interval '15 minutes' where id = $1", [h.id]);
  const a = (await call("POST", "/meetings/followup", att.token, { id: h.id, met: true, summary: "We agreed on the intake scope; budget may go up." })).body;
  assertEquals([a.ok, a.attendance, a.both_in], [true, "evidence_received", false]);
  const b = (await call("POST", "/meetings/followup", fl.token, { id: h.id, met: true, summary: "I will send a proposal by Friday." })).body;
  assertEquals([b.attendance, b.both_in], ["verified", true]);
  assertEquals(b.next_steps.map((s: any) => s.text), ["Send a proposal", "Update the gig budget"]);
  assertEquals((await call("POST", "/meetings/followup", fl.token, { id: h.id, met: true, summary: "Client John Smith SSN 123-45-6789" })).body.reason, "looks_like_client_info");
});

Deno.test("messages: only the pair, held when clear, warned when unsure, edits, removal, read receipts, attachments", async () => {
  assertEquals((await call("POST", "/threads/open", other.token, { gig_id: gig })).body.reason, "not_found", "no cold messages");
  const t = (await call("POST", "/threads/open", att.token, { gig_id: gig, freelancer: fl.id })).body;
  assertEquals(t.ok, true);
  thread = t.id;
  assertEquals((await call("POST", "/threads/open", fl.token, { gig_id: gig })).body.id, thread, "the same thread from both sides");
  const m1 = (await call("POST", "/threads/send", att.token, { thread_id: thread, body: "Can you start Monday? Here is our template.", attachments: [fileId], request_id: "m1" })).body;
  assertEquals(m1.ok, true, JSON.stringify(m1));
  assertEquals((await call("POST", "/threads/send", att.token, { thread_id: thread, body: "Can you start Monday?", request_id: "m1" })).body.duplicate, true, "two clicks send once");
  await call("POST", "/threads/send", att.token, { thread_id: thread, body: "Also, which forms do you use?", request_id: "m2" });
  const emails = (await one("select count(*)::int n from notifications where person_id = $1 and kind = 'message' and channel = 'email'", [fl.id])).n;
  assertEquals(emails, 1, "at most one email per thread every 15 minutes");
  const note = await one("select body from notifications where person_id = $1 and kind = 'message' and channel = 'email'", [fl.id]);
  assert(!note.body.includes("Monday"), "emails never include the message text");
  const held = (await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Text me at 512-555-0199 and pay me directly", request_id: "m3" })).body;
  assertEquals(held.held, true);
  const warned = (await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Maybe we can sort out the details privately later", request_id: "m4" })).body;
  assertEquals([warned.ok, warned.warned, warned.held], [true, true, false], "unsure: sent with a reminder");
  const okLink = (await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Joining at https://meet.lawfecta.com/r/room-1 now", request_id: "m5" })).body;
  assertEquals(okLink.held, false, "Lawfecta's own meeting links are fine");
  const seenByAtt = (await call("GET", "/threads/get?id=" + thread, att.token)).body;
  assert(!seenByAtt.messages.some((m: any) => m.body.includes("512-555")), "the attorney never sees the held message");
  const ft = (await call("GET", "/threads/get?id=" + thread, fl.token)).body;
  assertEquals(ft.messages.find((m: any) => m.body.includes("512-555")).status, "held", "the sender sees it is being checked");
  assert(ft.seen_at, "read receipts on by default");
  await call("POST", "/prefs", fl.token, { read_receipts: false });
  assertEquals((await call("GET", "/threads/get?id=" + thread, att.token)).body.seen_at, null, "off for one is off for both");
  // Attachments
  const got = (await call("GET", `/threads/file?thread=${thread}&file=${fileId}`, fl.token)).body;
  assert(got.ok && got.url.includes("exp=300"));
  assertEquals((await call("GET", `/threads/file?thread=${thread}&file=${fileId}`, other.token)).body.reason, "not_found");
  assertEquals((await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Here", attachments: [fileId], request_id: "m6" })).body.reason, "file_not_usable", "a freelancer cannot attach the firm's file");
  // Edit and remove
  const mid = (await call("GET", "/threads/get?id=" + thread, att.token)).body.messages.find((m: any) => m.mine).id;
  assertEquals((await call("POST", "/threads/edit", att.token, { id: mid, body: "Can you start Tuesday?" })).body.ok, true);
  assertEquals((await call("POST", "/threads/edit", att.token, { id: mid, body: "Call me at 512-555-0199" })).body.reason, "edit_needs_check");
  assertEquals((await one("select count(*)::int n from message_edits where message_id = $1", [mid])).n, 1, "the history is kept");
  await pool.query("update messages set created_at = now() - interval '20 minutes' where id = $1", [mid]);
  assertEquals((await call("POST", "/threads/edit", att.token, { id: mid, body: "Wednesday" })).body.reason, "edit_time_over");
  assertEquals((await call("POST", "/threads/remove", att.token, { id: mid })).body.ok, true);
  const shown = (await call("GET", "/threads/get?id=" + thread, fl.token)).body.messages.find((m: any) => m.id === mid);
  assertEquals([shown.status, shown.body, shown.removed_why], ["removed", "", "sender"], "the other person sees that the sender removed it");
  // UX review 2026-11-08: a held message the team does not deliver is marked as removed by the team, and the notice
  // "A message was not delivered" opens that conversation
  const heldMsg = await one("select id from messages where thread_id = $1 and status = 'held' order by created_at limit 1", [thread]);
  const flagRow = await one("select id from conduct_flags where object_type = 'message' and object_id = $1", [heldMsg.id]);
  const teamId = (await one("select person_id from staff_roles limit 1")).person_id;
  await pool.query("select dela_admin_conduct_decide($1, $2, false, 'Off platform')", [teamId, flagRow.id]);
  assertEquals((await one("select status || ':' || removed_why s from messages where id = $1", [heldMsg.id])).s, "removed:team");
  assertEquals((await one("select link from notifications where title = 'A message was not delivered' and person_id = $1 order by created_at desc limit 1", [fl.id])).link, "/dela?tab=inbox&thread=" + thread);
  assert((await one("select body from messages where id = $1", [mid])).body.includes("Tuesday"), "the record stays for the team");
  // DELA in the thread
  const s = (await call("POST", "/threads/assist", att.token, { thread_id: thread, mode: "summarize" })).body;
  assertEquals([s.ok, s.text], [true, "The attorney needs intake help; the freelancer can start Monday."], JSON.stringify(s));
  const dr = (await call("POST", "/threads/assist", fl.token, { thread_id: thread, mode: "draft" })).body;
  assertEquals([dr.ok, dr.text], [true, "Thanks, Monday works for me."], "the freelancer's Draft a reply works: " + JSON.stringify(dr));
  await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Yes, Monday works.", request_id: "m7" });
  const inbox = (await call("GET", "/threads", att.token)).body.threads;
  assert(inbox.some((x: any) => x.id === thread && x.unread >= 1), "the inbox counts unread messages");
});

Deno.test("report, block and the team's view", async () => {
  assertEquals((await call("POST", "/threads/report", att.token, { thread_id: thread, reason: "Asked to be paid outside Lawfecta" })).body.ok, true);
  const slots = (await call("GET", `/meetings/slots?gig=${gig}&freelancer=${fl.id}&length=30`, att.token)).body.slots as string[];
  const h = (await call("POST", "/meetings/hold", att.token, { gig_id: gig, freelancer: fl.id, start_at: slots[20], length: 30, request_id: "b1" })).body;
  await call("POST", "/meetings/confirm", att.token, { id: h.id });
  assertEquals((await call("POST", "/threads/block", att.token, { thread_id: thread, block: true })).body.ok, true);
  assertEquals((await call("POST", "/threads/send", fl.token, { thread_id: thread, body: "Hello?", request_id: "b2" })).body.reason, "blocked");
  assertEquals((await one("select status from meetings where id = $1", [h.id])).status, "canceled", "blocking cancels upcoming meetings");
  assertEquals((await call("POST", "/meetings/hold", fl.token, { gig_id: gig, start_at: slots[30], length: 30, request_id: "b3" })).body.reason, "not_available");
  const adm = (await call("GET", "/admin/meetings", team.token)).body.data;
  assert(adm.reports.length === 1 && adm.counts.messages_30d >= 4, JSON.stringify(adm.counts));
  assertEquals(adm.provider_ready, false, "the admin view says Vectera is not connected yet");
  const flags = (await call("GET", "/admin/gigs", team.token)).body.data.flags;
  assert(flags.some((f: any) => f.object_type === "message"), "held messages wait in the admin Gigs tab");
  assertEquals((await call("GET", "/admin/meetings", att.token)).status, 403);
});

Deno.test("teardown", async () => { await pool.end(); });
