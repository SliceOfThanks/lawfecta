// Brilliant Directories member listings through BD's API v2 (support.brilliantdirectories.com, API v2 articles).
// GET /api/v2/user/get/{user_id} returns { status, message: [record] }; GET /api/v2/user/fields lists the site's fields;
// PUT /api/v2/user/update changes a listing. Permissions are per endpoint on the key (BD admin, API keys, Permissions):
// a call the key may not make answers 403. Needs BD_API_KEY and the site.url setting.

export type BdResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

type Fetch = typeof fetch;

function base(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

async function call<T>(f: Fetch, siteUrl: string, key: string, method: string, path: string, form?: Record<string, string>): Promise<BdResult<T>> {
  if (!key) return { ok: false, status: 0, error: "bd_api_key_missing" };
  const b = base(siteUrl);
  if (!b.startsWith("https://")) return { ok: false, status: 0, error: "bd_site_url_missing" };
  const send = (url: string) => f(url, {
    method,
    headers: { "X-Api-Key": key, accept: "application/json", ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
    redirect: "manual",
  });
  try {
    let res = await send(b + path);
    // hirelegalhelp.com moves www to the plain address; follow once on the same site, keeping the method
    if (res.status >= 300 && res.status < 400) {
      const to = res.headers.get("location") ?? "";
      const next = to ? new URL(to, b + "/").toString() : "";
      const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
      if (!next.startsWith("https://") || host(next) !== host(b)) return { ok: false, status: res.status, error: "bd_redirect" };
      res = await send(next);
    }
    const out = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok || !out || out.status !== "success") {
      const msg = out && typeof out.message === "string" ? out.message.slice(0, 160) : "";
      return { ok: false, status: res.status, error: (`bd ${res.status} ${msg}`).trim() };
    }
    return { ok: true, data: out.message as T };
  } catch (e) {
    return { ok: false, status: 0, error: "bd_unreachable " + String((e as Error)?.message ?? e).slice(0, 80) };
  }
}

export type BdMember = Record<string, unknown>;

export async function bdMember(f: Fetch, siteUrl: string, key: string, userId: number): Promise<BdResult<BdMember>> {
  const r = await call<unknown>(f, siteUrl, key, "GET", "/api/v2/user/get/" + Math.trunc(userId));
  if (!r.ok) return r;
  const rec = Array.isArray(r.data) ? r.data[0] : r.data;
  if (!rec || typeof rec !== "object") return { ok: false, status: 404, error: "bd_member_not_found" };
  return { ok: true, data: rec as BdMember };
}

export async function bdFields(f: Fetch, siteUrl: string, key: string): Promise<BdResult<unknown>> {
  return await call<unknown>(f, siteUrl, key, "GET", "/api/v2/user/fields");
}

export async function bdCategories(f: Fetch, siteUrl: string, key: string): Promise<BdResult<unknown>> {
  return await call<unknown>(f, siteUrl, key, "GET", "/api/v2/list_professions/tree");
}

export async function bdUpdate(f: Fetch, siteUrl: string, key: string, userId: number, fields: Record<string, string>): Promise<BdResult<unknown>> {
  return await call<unknown>(f, siteUrl, key, "PUT", "/api/v2/user/update", { ...fields, user_id: String(Math.trunc(userId)) });
}

// For the team's check of what the site holds: field names and value kinds, never the values
export function shapeOf(rec: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!rec || typeof rec !== "object") return out;
  for (const [k, v] of Object.entries(rec as Record<string, unknown>)) {
    out[k] = v === null || v === undefined || v === "" ? "empty" : Array.isArray(v) ? "list" : typeof v === "object" ? "object" : typeof v === "number" || /^[0-9]+$/.test(String(v)) ? "number" : "text";
  }
  return out;
}
