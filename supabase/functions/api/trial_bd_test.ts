// Step 9: the trial check's Brilliant Directories adapter (lib/trial/bd-live.ts), against a fake BD that records each
// request. The endpoints are the ones Stacey's read-only BD check confirmed on 2026-11-08.
// Run: deno test -A supabase/functions/api/trial_bd_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { bdDate, invoice, liveBd } from "./lib/trial/bd-live.ts";

type Call = { method: string; path: string; form: Record<string, string> };
function fakeBd(routes: Record<string, (c: Call) => unknown>, status = 200) {
  const calls: Call[] = [];
  const f = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const form = Object.fromEntries(new URLSearchParams(typeof init.body === "string" ? init.body : ""));
    const c = { method: init.method ?? "GET", path: url.pathname + url.search, form };
    calls.push(c);
    if (status !== 200) return Response.json({ status: "error", message: "not allowed" }, { status });
    const key = Object.keys(routes).find((k) => (c.method + " " + c.path).startsWith(k));
    const out = key ? routes[key](c) : [];
    return Response.json(out && typeof out === "object" && "message" in (out as object) ? { status: "success", ...(out as object) } : { status: "success", message: out });
  }) as typeof fetch;
  return { f, calls };
}

Deno.test("BD dates: both BD formats become ISO; empty and zero dates are none", () => {
  assertEquals(bdDate("20261101093000"), "2026-11-01T09:30:00.000Z");
  assertEquals(bdDate("2026-11-01 09:30:00"), "2026-11-01T09:30:00.000Z");
  assertEquals([bdDate("0000-00-00 00:00:00"), bdDate("")], [null, null]);
});

Deno.test("invoices: Paid and Unpaid from invoice_details; a plan BD does not name is 0", () => {
  assertEquals(invoice({ invoice_details: { id: "41", status: "Unpaid", packageid: "8" } }), { id: "41", plan_id: 8, paid: false, open: true });
  assertEquals(invoice({ invoice_details: { id: "42", status: "Paid" } }), { id: "42", plan_id: 0, paid: true, open: false });
});

// Fix (Stacey's BD connector check, 2026-11-08): BD answered "user_id or client_id is required" to the form-only request.
// user_id now also goes in the address; "No billing account" is no invoices, not an error; the list comes as
// { total, invoices } with the plan in subscription_details.packageid; client_id is never sent (it is a billing record
// number and could return another person's invoices).
Deno.test("invoices: user_id in the address and the form, never client_id; the { total, invoices } shape; plan from subscription_details", async () => {
  const { f, calls } = fakeBd({
    "POST /api/v2/user/transactions?user_id=11": () => ({ message: { total: 2, invoices: [
      { invoice_details: { id: "51", status: "Unpaid" }, subscription_details: { packageid: "8" } },
      { invoice_details: { id: "52", status: "Paid" }, subscription_details: { packageid: "7" } }] } }),
  });
  const bd = liveBd(f, "https://hirelegalhelp.com", "key");
  const r = await bd.invoices(11);
  assertEquals(r.ok && r.data, [{ id: "51", plan_id: 8, paid: false, open: true }, { id: "52", plan_id: 7, paid: true, open: false }]);
  assertEquals(calls[0].form, { user_id: "11" });
  assert(!calls.some((c) => c.path.includes("client_id") || "client_id" in c.form), "client_id is never sent");
});

Deno.test("invoices: BD's \"No billing account for this member\" means no invoices; other errors stay errors", async () => {
  const none = (async () => Response.json({ status: "error", message: "No billing account for this member: 0 subscriptions, 0 transactions. An unknown user_id returns the same response; confirm the member with getUser." }, { status: 200 })) as typeof fetch;
  const r = await liveBd(none, "https://hirelegalhelp.com", "key").invoices(689);
  assertEquals(r.ok && r.data, []);
  const bad = (async () => Response.json({ status: "error", message: "user_id or client_id is required" }, { status: 400 })) as typeof fetch;
  const e = await liveBd(bad, "https://hirelegalhelp.com", "key").invoices(689);
  assert(!e.ok && e.error.includes("user_id or client_id is required"));
});

Deno.test("search: one call per plan, every page, the plan and the signup date checked again", async () => {
  let page = 0;
  const { f, calls } = fakeBd({
    "GET /api/v2/user/get?property=subscription_id&property_value=8": () => ++page === 1
      ? { message: [{ user_id: "11", subscription_id: "8", signup_date: "20261105100000", first_name: "Ann", email: "a@x.test" }, { user_id: "12", subscription_id: "3", signup_date: "20261105100000" }], next_page: "p2" }
      : { message: [{ user_id: "13", subscription_id: "8", signup_date: "20250101000000" }] },
  });
  const bd = liveBd(f, "https://hirelegalhelp.com", "key");
  const r = await bd.search([8], "2026-11-01");
  assert(r.ok);
  assertEquals(r.data.map((c) => c.user_id), [11], "another plan and an old signup are left out");
  assertEquals(r.data[0].signup_at, "2026-11-05T10:00:00.000Z");
  assert(calls[1].path.includes("cursor=p2"), "the second page is asked for with the next_page token");
});

Deno.test("users_meta: read only this member's dela_ keys; update a key that exists, create one that does not", async () => {
  const { f, calls } = fakeBd({
    "GET /api/v2/users_meta/get": () => [
      { meta_id: "5", database: "users_data", database_id: "11", key: "dela_trial_status", value: "active" },
      { meta_id: "6", database: "users_data", database_id: "11", key: "last_login_ip", value: "1.2.3.4" },
      { meta_id: "7", database: "users_data", database_id: "99", key: "dela_trial_status", value: "converted" }],
  });
  const bd = liveBd(f, "https://hirelegalhelp.com", "key");
  const m = await bd.meta(11);
  assertEquals(m.ok && m.data, { dela_trial_status: "active" });
  await bd.setMeta(11, { dela_trial_status: "downgraded", dela_downgraded_at: "2026-11-08T10:00:00Z" });
  const writes = calls.filter((c) => c.method !== "GET");
  assertEquals(writes.map((c) => c.method + " " + c.path), ["PUT /api/v2/users_meta/update", "POST /api/v2/users_meta/create"]);
  assertEquals(writes[0].form, { meta_id: "5", value: "downgraded", database: "users_data", database_id: "11" });
  assertEquals(writes[1].form, { database: "users_data", database_id: "11", key: "dela_downgraded_at", value: "2026-11-08T10:00:00Z" });
});

Deno.test("plan, posts, areas: the confirmed update calls", async () => {
  const { f, calls } = fakeBd({
    "GET /api/v2/data_posts/get": () => [{ post_id: "31", data_type: "video", post_status: "1" }],
    "GET /api/v2/users_portfolio_groups/get": () => [{ group_id: "40", group_status: "1" }],
    "GET /api/v2/user/get/11": () => [{ user_id: "11", subscription_id: "8", services: "1,2,3,4,5" }],
  });
  const bd = liveBd(f, "https://hirelegalhelp.com", "key");
  await bd.changePlan(11, 3);
  const posts = await bd.posts(11);
  assertEquals(posts.ok && posts.data.map((p) => p.id + ":" + p.type + ":" + p.published), ["31:video:true", "g:40:portfolio:true"]);
  await bd.setPublished("31", false);
  await bd.setPublished("g:40", false);
  const areas = await bd.areas(11);
  assertEquals(areas.ok && areas.data, ["1", "2", "3", "4", "5"]);
  await bd.setAreas(11, ["1", "2", "3"]);
  const writes = calls.filter((c) => c.method === "PUT").map((c) => c.path + " " + JSON.stringify(c.form));
  assertEquals(writes, [
    '/api/v2/user/update {"user_id":"11","subscription_id":"3"}',
    '/api/v2/data_posts/update {"post_id":"31","post_status":"0"}',
    '/api/v2/users_portfolio_groups/update {"group_id":"40","group_status":"0"}',
    '/api/v2/user/update {"user_id":"11","delete_categories":"1","services":"1,2,3"}',
  ]);
});

Deno.test("billing has no API: canceling is a task for BD admin; the Active status is set only once its value is confirmed", async () => {
  const { f, calls } = fakeBd({ "GET /api/v2/user/get/11": () => [{ user_id: "11", active: "1" }] });
  const bd = liveBd(f, "https://hirelegalhelp.com", "key");
  assertEquals(bd.manualBilling, true);
  assert((await bd.cancelInvoice("41")).ok && (await bd.cancelSubscription(11, 8)).ok);
  assert((await bd.setActive(11)).ok);
  assertEquals(calls.length, 0, "nothing sent to BD for billing or status");
  const withValue = liveBd(f, "https://hirelegalhelp.com", "key", { activeValue: "2" });
  await withValue.setActive(11);
  assertEquals(calls.filter((c) => c.method === "PUT").map((c) => c.form), [{ user_id: "11", active: "2" }]);
});

Deno.test("a missing permission says so", async () => {
  const { f } = fakeBd({}, 403);
  const r = await liveBd(f, "https://hirelegalhelp.com", "key").search([8], "2026-11-01");
  assert(!r.ok && r.error.startsWith("bd_permission_needed"), JSON.stringify(r));
});
