// DELA API. One Edge Function, many routes. The handler takes its database and settings as inputs
// so tests can run it against a local Postgres.
//
// Sign in: the DELA-Auth widget in BD signs a one-use pass; POST /bootstrap swaps it for a DELA session token.
// Every other member route sends that token in the x-dela-session header and is checked again on every call.
import { newSessionToken, safeEqual, sessionHash } from "./lib/crypto.ts";
import { buildNotice } from "./lib/email.ts";
import { pickProvider } from "./lib/mail/index.ts";
import { verifyPass } from "./lib/pass.ts";

export const VERSION = "api-0.3.0";

export type Deps = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
  env: (k: string) => string;
  fetch?: typeof fetch;
  now?: () => number;
};

type Session = { session_id: string; person_id: string; side: string | null; staff: string[]; bd_member_id: number };
type Ctx = { req: Request; deps: Deps; body: Record<string, unknown>; url: URL; ip: string };

class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const MAX_BODY = 64 * 1024;

// The Lawfecta site. DELA_ORIGINS can override this list (comma separated) without a code change.
const DEFAULT_ORIGINS = ["https://lawfecta.com", "https://www.lawfecta.com"];

function origins(deps: Deps): string[] {
  const list = deps.env("DELA_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}

function cors(req: Request, deps: Deps): Record<string, string> {
  const list = origins(deps);
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": list.includes(o) ? o : (list[0] ?? ""),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-dela-session",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

function json(ctx: { req: Request; deps: Deps }, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(ctx.req, ctx.deps), "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function rpc<T>(ctx: Ctx, fn: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await ctx.deps.rpc(fn, args) as T;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("forbidden")) throw new HttpError(403, "forbidden");
    if (msg.includes("unknown_feature")) throw new HttpError(400, "unknown_feature");
    console.error("rpc", fn, msg.slice(0, 300));
    throw new HttpError(500, "server_error");
  }
}

async function session(ctx: Ctx): Promise<Session> {
  const tok = ctx.req.headers.get("x-dela-session") ?? "";
  if (!tok.startsWith("ds_") || tok.length > 100) throw new HttpError(401, "signed_out");
  const s = await rpc<Session | null>(ctx, "dela_session_resolve", { p_token_hash: await sessionHash(tok) });
  if (!s) throw new HttpError(401, "signed_out");
  return s;
}

async function staff(ctx: Ctx): Promise<Session> {
  const s = await session(ctx);
  if (!s.staff || s.staff.length === 0) throw new HttpError(403, "forbidden");
  return s;
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
function need<T>(v: T | null | undefined | "", code = "bad_request"): T {
  if (v === null || v === undefined || v === "") throw new HttpError(400, code);
  return v as T;
}

// ---------- Sign in ----------

async function bootstrap(ctx: Ctx): Promise<Response> {
  const why = str(ctx.body.why, 300);
  if (why) console.log("auth_why", why);
  // Every answer says which code version to load, so even the signed-out screen comes from the tested release
  const commit = await rpc<string | null>(ctx, "dela_setting_text", { p_key: "code_version", p_default: "main" });
  const raw = ctx.body.pass;
  if (!raw) return json(ctx, { route: "signed_out", commit });
  // While the BD secret is being changed, the new one (BD_SHARED_SECRET_NEXT) is accepted too, so nobody is locked out
  const now = ctx.deps.now?.() ?? Date.now();
  const pass = await verifyPass(raw, ctx.deps.env("BD_SHARED_SECRET"), now) ?? await verifyPass(raw, ctx.deps.env("BD_SHARED_SECRET_NEXT"), now);
  if (!pass) return json(ctx, { route: "signed_out", reason: "bad_pass", commit });
  const token = newSessionToken();
  const r = await rpc<Record<string, any>>(ctx, "dela_exchange", {
    p: {
      bd_member_id: pass.uid, bd_plan_id: pass.sub, name: pass.name, email: pass.email, registered_at: pass.jn, jti: pass.jti, exp: pass.exp,
      token_hash: await sessionHash(token), ip: ctx.ip, ua: str(ctx.req.headers.get("user-agent"), 300), side: str(ctx.body.side, 20),
    },
  });
  if (r?.route === "staging") {
    // Test accounts: the Live copy hands over to Staging, which exchanges the same pass in its own database
    return json(ctx, { route: "staging", api: ctx.deps.env("STAGING_API_URL") });
  }
  if (!r?.ok) return json(ctx, { route: "denied", reason: r?.reason ?? "denied", commit });
  const pause = await rpc<Record<string, any>>(ctx, "dela_pause_state", {});
  if (pause?.pause?.all && !(r.me?.staff ?? []).length) return json(ctx, { route: "paused", message: pause.message, commit });
  return json(ctx, { route: "here", session: token, expires_in_hours: r.expires_in_hours, me: { ...r.me, pause: pause?.pause }, commit, version: VERSION });
}

// ---------- Member routes ----------

// Emergency pause: members get the pause message; the Lawfecta Team keeps working to fix things
async function member(ctx: Ctx): Promise<Session> {
  const s = await session(ctx);
  if (!s.staff?.length) {
    const p = await rpc<Record<string, any>>(ctx, "dela_pause_state", {});
    if (p?.pause?.all) throw new HttpError(503, "paused");
  }
  return s;
}

async function me(ctx: Ctx) {
  const s = await member(ctx);
  const pause = await rpc<Record<string, any>>(ctx, "dela_pause_state", {});
  return json(ctx, { me: { ...(await rpc<Record<string, unknown>>(ctx, "dela_me", { p_person: s.person_id, p_side: s.side })), pause: pause?.pause } });
}

async function setSide(ctx: Ctx) {
  const s = await member(ctx);
  const side = need(str(ctx.body.side, 20));
  const r = await rpc<Record<string, unknown>>(ctx, "dela_session_set_side", { p_session: s.session_id, p_side: side });
  return json(ctx, r, r?.ok ? 200 : 400);
}

async function signOut(ctx: Ctx) {
  const s = await session(ctx);
  await rpc(ctx, "dela_sign_out", { p_session: s.session_id });
  return json(ctx, { ok: true });
}

async function notifications(ctx: Ctx) {
  const s = await member(ctx);
  return json(ctx, { items: await rpc(ctx, "dela_notifications", { p_person: s.person_id, p_limit: 50 }) });
}

async function readNotification(ctx: Ctx) {
  const s = await member(ctx);
  if (ctx.body.all === true) return json(ctx, { ok: true, count: await rpc(ctx, "dela_notifications_read_all", { p_person: s.person_id }) });
  const id = need(str(ctx.body.id, 40));
  return json(ctx, { ok: !!(await rpc(ctx, "dela_notification_read", { p_person: s.person_id, p_id: id })) });
}

// ---------- Admin routes (Lawfecta Team) ----------

type AdminRoute = (ctx: Ctx, actor: string) => Promise<unknown>;

const ADMIN_GET: Record<string, AdminRoute> = {
  "/admin/overview": (c, a) => rpc(c, "dela_admin_overview", { p_actor: a }),
  "/admin/settings": (c, a) => rpc(c, "dela_admin_settings", { p_actor: a }),
  "/admin/decisions": (c, a) => rpc(c, "dela_admin_decisions", { p_actor: a, p_key: c.url.searchParams.get("key") || null }),
  "/admin/switches": (c, a) => rpc(c, "dela_admin_switches", { p_actor: a }),
  "/admin/access": (c, a) => rpc(c, "dela_admin_access", { p_actor: a }),
  "/admin/staff": (c, a) => rpc(c, "dela_admin_staff", { p_actor: a }),
  "/admin/people": (c, a) => rpc(c, "dela_admin_people", { p_actor: a, p_q: (c.url.searchParams.get("q") ?? "").slice(0, 100), p_limit: 50 }),
  "/admin/plans": (c, a) => rpc(c, "dela_admin_plans", { p_actor: a }),
  "/admin/audit": (c, a) => rpc(c, "dela_admin_audit", { p_actor: a, p_before: int(c.url.searchParams.get("before")), p_limit: 100 }),
  "/admin/jobs": (c, a) => rpc(c, "dela_admin_jobs", { p_actor: a }),
  "/admin/holds": (c, a) => rpc(c, "dela_admin_holds", { p_actor: a }),
  "/admin/releases": (c, a) => rpc(c, "dela_admin_releases", { p_actor: a }),
  "/admin/settings/history": (c, a) => rpc(c, "dela_admin_setting_history", { p_actor: a, p_key: need((c.url.searchParams.get("key") ?? "").slice(0, 100)) }),
  "/admin/plans/history": (c, a) => rpc(c, "dela_admin_plan_history", { p_actor: a, p_plan: need((c.url.searchParams.get("plan") ?? "").slice(0, 40)) }),
  "/admin/pause": (c) => rpc(c, "dela_pause_state", {}),
};

const ADMIN_POST: Record<string, AdminRoute> = {
  "/admin/settings": (c, a) => rpc(c, "dela_admin_set_setting", {
    p_actor: a, p_key: need(str(c.body.key, 100)), p_value: need(c.body.value as unknown), p_status: need(str(c.body.status, 1)), p_reason: str(c.body.reason, 500),
  }),
  "/admin/switches": (c, a) => rpc(c, "dela_admin_set_switch", { p_actor: a, p_key: need(str(c.body.key, 100)), p_state: need(str(c.body.state, 20)) }),
  "/admin/access/grant": (c, a) => rpc(c, "dela_admin_access_grant", { p_actor: a, p_bd: need(int(c.body.bd_member_id), "bad_member_id"), p_channel: need(str(c.body.channel, 20)), p_note: str(c.body.note, 200) }),
  "/admin/access/revoke": (c, a) => rpc(c, "dela_admin_access_revoke", { p_actor: a, p_id: need(int(c.body.id)) }),
  "/admin/staff/grant": (c, a) => rpc(c, "dela_admin_staff_grant", { p_actor: a, p_bd: need(int(c.body.bd_member_id), "bad_member_id"), p_role: need(str(c.body.role, 20)) }),
  "/admin/staff/revoke": (c, a) => rpc(c, "dela_admin_staff_revoke", { p_actor: a, p_id: need(int(c.body.id)) }),
  "/admin/sides/grant": (c, a) => rpc(c, "dela_admin_grant_side", { p_actor: a, p_bd: need(int(c.body.bd_member_id), "bad_member_id"), p_side: need(str(c.body.side, 20)), p_plan: need(str(c.body.plan_code, 40)) }),
  "/admin/sides/release": (c, a) => rpc(c, "dela_admin_release_side", { p_actor: a, p_bd: need(int(c.body.bd_member_id), "bad_member_id"), p_side: need(str(c.body.side, 20)) }),
  "/admin/plans/map": (c, a) => rpc(c, "dela_admin_plan_map", { p_actor: a, p_plan: need(str(c.body.plan_code, 40)), p_bd_plan: c.body.bd_plan_id === null || c.body.bd_plan_id === "" ? null : need(int(c.body.bd_plan_id)) }),
  "/admin/plans/draft": (c, a) => rpc(c, "dela_admin_plan_draft", { p_actor: a, p_plan: need(str(c.body.plan_code, 40)), p: planDraft(c.body) }),
  "/admin/plans/approve": (c, a) => rpc(c, "dela_admin_plan_approve", { p_actor: a, p_version: need(int(c.body.version_id)) }),
  "/admin/plans/discard": (c, a) => rpc(c, "dela_admin_plan_discard", { p_actor: a, p_version: need(int(c.body.version_id)) }),
  "/admin/holds": (c, a) => rpc(c, "dela_admin_hold", { p_actor: a, p_bd: need(int(c.body.bd_member_id), "bad_member_id"), p_reason: need(str(c.body.reason, 500)), p_severity: str(c.body.severity, 10) || "medium" }),
  "/admin/holds/release": (c, a) => rpc(c, "dela_admin_hold_release", { p_actor: a, p_hold: need(str(c.body.id, 40)), p_evidence: need(str(c.body.evidence, 1000)) }),
  "/admin/test-notification": (c, a) => rpc(c, "dela_admin_test_notification", { p_actor: a, p_email: c.body.email === true }),
  "/admin/releases/password": (c, a) => rpc(c, "dela_release_password_set", { p_actor: a, p_current: str(c.body.current, 200) || null, p_new: need(str(c.body.password, 200)) }),
  "/admin/releases/tested": (c, a) => rpc(c, "dela_release_mark_tested", { p_actor: a, p_release: need(int(c.body.release_id)), p_tested: c.body.tested === true }),
  "/admin/releases/push": (c, a) => startRelease(c, a, "push"),
  "/admin/settings/undo": (c, a) => rpc(c, "dela_admin_undo_setting", { p_actor: a, p_history: need(int(c.body.history_id)) }),
  "/admin/plans/restore": (c, a) => rpc(c, "dela_admin_plan_restore", { p_actor: a, p_version: need(int(c.body.version_id)), p_password: need(str(c.body.password, 200), "wrong_password") }),
  "/admin/pause": (c, a) => rpc(c, "dela_admin_set_pause", { p_actor: a, p_area: need(str(c.body.area, 20)), p_on: c.body.on === true, p_reason: str(c.body.reason, 500) }),
  "/admin/staging/reset": (c, a) => c.body.confirm === "RESET" ? rpc(c, "dela_admin_reset_staging", { p_actor: a }) : Promise.resolve({ ok: false, reason: "confirm_needed" }),
  "/admin/releases/rollback": (c, a) => startRelease(c, a, "rollback"),
};

// ---------- Release gate: only the owner, with the release password, starts a push from Staging to Live ----------

async function startRelease(c: Ctx, actor: string, action: "push" | "rollback") {
  const id = need(int(c.body.release_id));
  const r = await rpc<Record<string, any>>(c, "dela_release_approve_checked", { p_actor: actor, p_release: id, p_action: action, p_password: need(str(c.body.password, 200), "wrong_password") });
  if (!r?.ok) return r;
  const repo = c.deps.env("GITHUB_REPO");
  const token = c.deps.env("GITHUB_DISPATCH_TOKEN");
  let problem = "";
  if (!repo || !token) problem = "github_not_set_up";
  else {
    try {
      const res = await (c.deps.fetch ?? fetch)(`https://api.github.com/repos/${repo}/actions/workflows/promote.yml/dispatches`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "lawfecta-dela" },
        body: JSON.stringify({ ref: "main", inputs: { release_id: String(id), nonce: r.nonce, action } }),
      });
      if (res.status !== 204) problem = "github_" + res.status;
    } catch (e) {
      problem = "github_unreachable";
      console.error("dispatch", String(e).slice(0, 200));
    }
  }
  if (problem) {
    await rpc(c, "dela_release_cancel_approval", { p_release: id, p_reason: problem });
    return { ok: false, reason: problem };
  }
  return { ok: true, version: r.version, action };
}

// GitHub Actions confirms its approval here before it changes anything on Live, then reports how it went
async function releaseCi(ctx: Ctx, step: "claim" | "finish") {
  const want = ctx.deps.env("RELEASE_CI_SECRET");
  const got = ctx.req.headers.get("x-dela-ci") ?? "";
  if (want.length < 32 || !safeEqual(got, want)) throw new HttpError(401, "bad_ci");
  const id = need(int(ctx.body.release_id));
  if (step === "claim") return json(ctx, await rpc(ctx, "dela_release_claim", { p_release: id, p_nonce: need(str(ctx.body.nonce, 100)) }));
  return json(ctx, await rpc(ctx, "dela_release_finish", { p_release: id, p_ok: ctx.body.ok === true, p_log: str(ctx.body.log, 4000) }));
}

// Only whole cents, whole basis points and whole-number limits get through
function planDraft(b: Record<string, unknown>) {
  const out: Record<string, unknown> = { note: str(b.note, 500) };
  for (const k of ["monthly_cents", "fee_bps"]) {
    if (b[k] !== undefined) {
      const n = int(b[k]);
      if (n === null || n < 0) throw new HttpError(400, "bad_" + k);
      out[k] = n;
    }
  }
  if (b.annual_cents !== undefined) {
    const n = b.annual_cents === null ? null : int(b.annual_cents);
    if (b.annual_cents !== null && (n === null || n < 0)) throw new HttpError(400, "bad_annual_cents");
    out.annual_cents = n;
  }
  const f = b.features;
  if (f && typeof f === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f as Record<string, any>)) {
      const lim = v?.limit === null || v?.limit === undefined ? null : int(v.limit);
      if (v?.limit !== null && v?.limit !== undefined && (lim === null || lim < 0)) throw new HttpError(400, "bad_limit");
      clean[k.slice(0, 60)] = { enabled: v?.enabled !== false, limit: lim };
    }
    out.features = clean;
  }
  return out;
}

// ---------- Worker (called every minute by cron) ----------

async function worker(ctx: Ctx) {
  const secret = ctx.req.headers.get("x-dela-worker") ?? "";
  const ok = await rpc<boolean>(ctx, "dela_worker_ok", { p_secret: secret });
  if (!ok) throw new HttpError(401, "bad_worker");
  await rpc(ctx, "dela_worker_beat", {});
  await rpc(ctx, "dela_maybe_queue_daily", {});
  if (await rpc<string>(ctx, "dela_setting_text", { p_key: "environment", p_default: "staging" }) === "staging") {
    await rpc(ctx, "dela_release_expire", {});
  }
  const jobs = await rpc<Array<Record<string, any>>>(ctx, "dela_job_lease", { p_limit: 25, p_lease_seconds: 120 }) ?? [];
  const done: Record<string, number> = {};
  for (const j of jobs) {
    let result: { ok: boolean; error?: string; retry?: boolean };
    if (j.kind === "send_email" && await rpc<boolean>(ctx, "dela_paused", { p_area: "email" })) {
      await rpc(ctx, "dela_job_postpone", { p_job: j.id, p_seconds: 300 });
      done.postponed = (done.postponed ?? 0) + 1;
      continue;
    }
    try {
      result = await runJob(ctx, j);
    } catch (e) {
      result = { ok: false, error: String(e).slice(0, 300), retry: true };
    }
    const status = await rpc<string>(ctx, "dela_job_finish", {
      p_job: j.id, p_ok: result.ok, p_error: result.error ?? "", p_retry_seconds: result.retry === false ? 0 : 60,
    });
    if (!result.ok && result.retry === false && status === "delayed") {
      // A permanent failure should not keep retrying
      await rpc(ctx, "dela_job_cancel", { p_job: j.id });
    }
    done[status] = (done[status] ?? 0) + 1;
  }
  return json(ctx, { ok: true, leased: jobs.length, done });
}

async function runJob(ctx: Ctx, j: Record<string, any>): Promise<{ ok: boolean; error?: string; retry?: boolean }> {
  if (j.kind === "send_email") return await sendEmail(ctx, String(j.payload?.notification_id ?? ""));
  if (j.kind === "daily_summary") { await rpc(ctx, "dela_daily_summary", {}); return { ok: true }; }
  return { ok: false, retry: false, error: "unknown_job_kind" };
}

async function sendEmail(ctx: Ctx, id: string) {
  const n = await rpc<Record<string, any> | null>(ctx, "dela_email_load", { p_notification: id });
  if (!n || n.status !== "queued") return { ok: true };
  if (!n.to_email || n.person_status === "closed") {
    await rpc(ctx, "dela_notification_mark", { p_notification: id, p_status: "suppressed", p_provider: "", p_ref: "", p_error: "no_address_or_closed" });
    return { ok: true };
  }
  const provider = pickProvider(n.sender);
  const mail = buildNotice({ title: n.title, body: n.body, link: n.link, siteUrl: n.site_url, appPath: n.app_path, environment: n.environment });
  const r = await provider.send({
    from: { name: n.from_name, email: n.from_address }, to: { email: n.to_email, name: n.to_name || undefined },
    subject: mail.subject, html: mail.html, text: mail.text, tags: [n.environment, n.kind],
  }, provider.secret ? ctx.deps.env(provider.secret) : "", ctx.deps.fetch);
  if (r.ok) {
    await rpc(ctx, "dela_notification_mark", { p_notification: id, p_status: "sent", p_provider: provider.key, p_ref: r.messageId, p_error: "" });
    return { ok: true };
  }
  if (!r.retry) await rpc(ctx, "dela_notification_mark", { p_notification: id, p_status: "failed", p_provider: provider.key, p_ref: "", p_error: r.error });
  return { ok: false, retry: r.retry, error: r.error };
}

// ---------- Router ----------

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, deps) });
  const url = new URL(req.url);
  // Supabase passes the full path (/functions/v1/api/...) or just /api/...; keep what follows "/api"
  const at = url.pathname.indexOf("/api");
  const path = (at >= 0 ? url.pathname.slice(at + 4) : url.pathname).replace(/\/+$/, "") || "/";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 80);
  try {
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > MAX_BODY) throw new HttpError(413, "too_large");
      if (text) {
        try { body = JSON.parse(text); } catch { throw new HttpError(400, "bad_json"); }
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_json");
      }
    }
    const ctx: Ctx = { req, deps, body, url, ip };
    const key = `${req.method} ${path}`;
    switch (key) {
      case "GET /health": {
        // Watched every 5 minutes by the uptime monitor. 503 when the database or the background worker is not working.
        const hh = await rpc<Record<string, any>>(ctx, "dela_health", {});
        const healthy = !!hh?.worker_ok;
        return json(ctx, { ok: healthy, version: VERSION, environment: hh?.environment, code_version: hh?.code_version, worker_ok: hh?.worker_ok, paused: hh?.paused }, healthy ? 200 : 503);
      }
      case "POST /bootstrap": return await bootstrap(ctx);
      case "GET /me": return await me(ctx);
      case "POST /me/side": return await setSide(ctx);
      case "POST /sign-out": return await signOut(ctx);
      case "GET /notifications": return await notifications(ctx);
      case "POST /notifications/read": return await readNotification(ctx);
      case "POST /worker": return await worker(ctx);
      case "POST /release/claim": return await releaseCi(ctx, "claim");
      case "POST /release/finish": return await releaseCi(ctx, "finish");
    }
    const route = req.method === "GET" ? ADMIN_GET[path] : req.method === "POST" ? ADMIN_POST[path] : undefined;
    if (route) {
      const s = await staff(ctx);
      return json(ctx, { data: await route(ctx, s.person_id) });
    }
    throw new HttpError(404, "not_found");
  } catch (e) {
    if (e instanceof HttpError) return json({ req, deps }, { error: e.code }, e.status);
    console.error("unhandled", String(e).slice(0, 300));
    return json({ req, deps }, { error: "server_error" }, 500);
  }
}
