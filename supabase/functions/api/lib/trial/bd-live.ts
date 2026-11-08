// The Pro trial check talking to Brilliant Directories, with the endpoints Stacey's read-only BD check confirmed
// (2026-11-08, docs/handoff/bd-api-trial-check.md):
// - members: GET /api/v2/user/get?property=subscription_id&property_value=N (pages: limit, next_page)
// - users_meta: GET /api/v2/users_meta/get, POST /api/v2/users_meta/create, PUT /api/v2/users_meta/update
// - invoices: POST /api/v2/user/transactions?user_id=N, user_id also in the form (BD did not read it from the form alone);
//   the reply is { total, invoices } with invoice_details.status Paid or Unpaid and the plan in subscription_details.packageid;
//   "No billing account for this member" means no invoices. client_id is never sent: it is a billing record number and
//   could return another person's invoices (Stacey's BD connector check, 2026-11-08)
// - plan: PUT /api/v2/user/update subscription_id; areas of law: PUT /api/v2/user/update delete_categories=1, services
// - posts: GET /api/v2/data_posts/get?property=user_id, PUT /api/v2/data_posts/update post_status (0 = Draft, not public);
//   multi-image groups: users_portfolio_groups, group_status
// BD has no API to cancel an invoice or a subscription. Those two steps become tasks for the Lawfecta Team to do in BD
// admin (manualBilling): listed in the Trials tab and in the daily summary email (Stacey's question 2, 2026-11-08).
import { bdCall } from "../bd/members.ts";
import type { TrialInvoice } from "./rules.ts";
import type { Res, TrialBd, TrialCandidate, TrialPost } from "./bd.ts";

type Rec = Record<string, unknown>;
type Fetch = typeof fetch;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const list = (v: unknown): Rec[] => (Array.isArray(v) ? v : v && typeof v === "object" ? [v] : []) as Rec[];

// BD writes dates as "YYYYMMDDHHmmss" or "YYYY-MM-DD HH:mm:ss"; both become ISO (site time is close enough for a 7-day trial)
export function bdDate(v: unknown): string | null {
  const t = str(v);
  if (!t || t.startsWith("0000")) return null;
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(t);
  const iso = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : t.replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? "" : "Z");
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function candidate(r: Rec): TrialCandidate {
  return { user_id: Number(r.user_id), plan_id: Number(r.subscription_id) || 0, signup_at: bdDate(r.signup_date), first_name: str(r.first_name), last_name: str(r.last_name), email: str(r.email) };
}

// One BD transaction to DELA's invoice shape. The plan is read from the fields BD may use; 0 when BD does not say,
// which the rules count as paid for the member's own plan (never downgrade someone who paid)
export function invoice(t: Rec): TrialInvoice {
  const d = (t.invoice_details && typeof t.invoice_details === "object" ? t.invoice_details : t) as Rec;
  const sd = (t.subscription_details && typeof t.subscription_details === "object" ? t.subscription_details : {}) as Rec;
  const status = str(d.status).toLowerCase();
  return { id: str(d.id ?? d.invoiceid ?? t.id ?? t.invoiceid), plan_id: Number(sd.packageid ?? d.packageid ?? t.packageid ?? d.subscription_id ?? t.subscription_id) || 0, paid: status === "paid", open: status === "unpaid" };
}

export function post(p: Rec, group = false): TrialPost {
  return group
    ? { id: "g:" + str(p.group_id), type: str(p.data_type ?? p.post_type ?? p.data_id ?? "portfolio"), published: str(p.group_status) !== "0" }
    : { id: str(p.post_id), type: str(p.data_type ?? p.post_type ?? p.data_id), published: str(p.post_status) !== "0" };
}

export function liveBd(f: Fetch, siteUrl: string, key: string, o: { activeValue?: string } = {}): TrialBd & { manualBilling: true } {
  const get = <T>(path: string) => bdCall<T>(f, siteUrl, key, "GET", path);
  const put = <T>(path: string, form: Record<string, string>) => bdCall<T>(f, siteUrl, key, "PUT", path, form);
  const postForm = <T>(path: string, form: Record<string, string>) => bdCall<T>(f, siteUrl, key, "POST", path, form);
  const fail = (r: { status: number; error: string }): { ok: false; error: string } => ({ ok: false, error: r.status === 403 ? "bd_permission_needed: " + r.error : r.error });
  const ok = <T>(data: T): Res<T> => ({ ok: true, data });
  const MAX_PAGES = 50;

  async function pages(path: string): Promise<Res<Rec[]>> {
    const out: Rec[] = [];
    let next = "";
    for (let i = 0; i < MAX_PAGES; i++) {
      const r = await get<unknown>(path + (path.includes("?") ? "&" : "?") + "limit=100" + (next ? "&cursor=" + encodeURIComponent(next) : ""));
      if (!r.ok) return r.status === 404 && i === 0 ? ok([]) : fail(r);
      out.push(...list(r.data));
      if (!r.next) return ok(out);
      next = r.next;
    }
    return { ok: false, error: "bd_too_many_pages" };
  }
  async function user(id: number): Promise<Res<Rec>> {
    const r = await get<unknown>("/api/v2/user/get/" + Math.trunc(id));
    if (!r.ok) return fail(r);
    const rec = list(r.data)[0];
    return rec ? ok(rec) : { ok: false, error: "bd_member_not_found" };
  }
  async function metaRows(id: number): Promise<Res<Rec[]>> {
    const r = await pages(`/api/v2/users_meta/get?property[]=database&property_value[]=users_data&property[]=database_id&property_value[]=${Math.trunc(id)}`);
    if (!r.ok) return r;
    // Keep only this member's rows, whatever the filter did
    return ok(r.data.filter((m) => str(m.database_id) === String(Math.trunc(id)) && (str(m.database) === "" || str(m.database) === "users_data")));
  }

  return {
    manualBilling: true,
    async search(plans, since) {
      const all: TrialCandidate[] = [];
      for (const plan of plans) {
        const r = await pages(`/api/v2/user/get?property=subscription_id&property_value=${Math.trunc(plan)}`);
        if (!r.ok) return r;
        for (const rec of r.data) {
          const c = candidate(rec);
          if (c.plan_id !== plan) continue; // the filter is checked again here
          if (!c.signup_at || c.signup_at.slice(0, 10) >= since.slice(0, 10)) all.push(c);
        }
      }
      return ok(all);
    },
    async member(id) { const r = await user(id); return r.ok ? ok(candidate(r.data)) : r; },
    async meta(id) {
      const r = await metaRows(id);
      if (!r.ok) return r;
      const out: Record<string, string> = {};
      for (const m of r.data) if (str(m.key).startsWith("dela_")) out[str(m.key)] = str(m.value);
      return ok(out);
    },
    async setMeta(id, values) {
      const r = await metaRows(id);
      if (!r.ok) return r;
      for (const [k, v] of Object.entries(values)) {
        const row = r.data.find((m) => str(m.key) === k);
        const w = row
          ? await put("/api/v2/users_meta/update", { meta_id: str(row.meta_id ?? row.id), value: v, database: "users_data", database_id: String(Math.trunc(id)) })
          : await postForm("/api/v2/users_meta/create", { database: "users_data", database_id: String(Math.trunc(id)), key: k, value: v });
        if (!w.ok) return fail(w);
      }
      return ok(true as const);
    },
    async invoices(id) {
      const uid = String(Math.trunc(id));
      const r = await postForm<unknown>("/api/v2/user/transactions?user_id=" + uid, { user_id: uid });
      if (!r.ok) return r.status === 404 || /No billing account for this member/i.test(r.error) ? ok([]) : fail(r);
      const m = r.data as Rec | Rec[] | null;
      const rows = Array.isArray(m) ? m : m && typeof m === "object" && Array.isArray(m.invoices) ? m.invoices as Rec[] : m && typeof m === "object" && "total" in m ? [] : list(m);
      return ok(rows.map(invoice).filter((i) => i.id));
    },
    async changePlan(id, plan) { const r = await put("/api/v2/user/update", { user_id: String(Math.trunc(id)), subscription_id: String(Math.trunc(plan)) }); return r.ok ? ok(true as const) : fail(r); },
    // No API: the run records these as tasks for BD admin (manualBilling)
    cancelSubscription: () => Promise.resolve(ok(true as const)),
    cancelInvoice: () => Promise.resolve(ok(true as const)),
    async setActive(id) {
      const want = o.activeValue ?? "";
      if (!want) return ok(true as const); // the status value is not confirmed: the run lists it for the team instead
      const r = await user(id);
      if (!r.ok) return r;
      if (str(r.data.active) === want) return ok(true as const);
      const w = await put("/api/v2/user/update", { user_id: String(Math.trunc(id)), active: want });
      return w.ok ? ok(true as const) : fail(w);
    },
    async posts(id) {
      const a = await pages(`/api/v2/data_posts/get?property=user_id&property_value=${Math.trunc(id)}`);
      if (!a.ok) return a;
      const b = await pages(`/api/v2/users_portfolio_groups/get?property=user_id&property_value=${Math.trunc(id)}`);
      if (!b.ok) return b;
      return ok([...a.data.map((p) => post(p)), ...b.data.map((p) => post(p, true))].filter((p) => p.id && p.id !== "g:"));
    },
    async setPublished(pid, on) {
      const w = pid.startsWith("g:")
        ? await put("/api/v2/users_portfolio_groups/update", { group_id: pid.slice(2), group_status: on ? "1" : "0" })
        : await put("/api/v2/data_posts/update", { post_id: pid, post_status: on ? "1" : "0" });
      return w.ok ? ok(true as const) : fail(w);
    },
    async areas(id) {
      const r = await user(id);
      if (!r.ok) return r;
      return ok(str(r.data.services).split(",").map((x) => x.trim()).filter(Boolean));
    },
    async setAreas(id, shown) {
      const w = await put("/api/v2/user/update", { user_id: String(Math.trunc(id)), delete_categories: "1", services: shown.join(",") });
      return w.ok ? ok(true as const) : fail(w);
    },
  };
}
