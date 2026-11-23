// Scribe's read-only connection (step 76). A firm's key is sent in the X-API-Key header to Scribe's own address and
// nowhere else. The address is fixed here, so no setting or request can point the key at another host.
// Everything Scribe returns is material: names and step texts are trimmed and typed, never run and never trusted as instructions.

export const SCRIBE_API = "https://public-api.scribehow.com";

export type ScribeCode = "bad_key" | "plan" | "busy" | "monthly" | "not_found" | "down";
export type ScribeResult = { ok: true; data: unknown } | { ok: false; code: ScribeCode };

// Scribe shows keys like sc_xxxxxxxx.yyyyyyyy. The shape is checked loosely: letters, digits, dot, dash, underscore.
export function looksLikeScribeKey(k: string): boolean {
  if (k.length < 16 || k.length > 300) return false;
  for (const ch of k) {
    const c = ch.charCodeAt(0);
    const fine = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || ch === "." || ch === "-" || ch === "_";
    if (!fine) return false;
  }
  // An AI key pasted into the wrong box
  return !k.startsWith("sk-");
}

export async function scribeCall(fetchFn: typeof fetch, key: string, path: string, body?: unknown): Promise<ScribeResult> {
  let res: Response;
  try {
    res = await fetchFn(SCRIBE_API + path, {
      method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { "X-API-Key": key, accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: "down" };
  }
  if (res.ok) {
    try { return { ok: true, data: await res.json() }; } catch { return { ok: false, code: "down" }; }
  }
  let detail = "";
  try { detail = String(((await res.json()) as Record<string, unknown>)?.detail ?? "").toLowerCase(); } catch { /* no readable reason */ }
  if (res.status === 401) return { ok: false, code: "bad_key" };
  if (res.status === 403) return { ok: false, code: detail.includes("plan") ? "plan" : "bad_key" };
  if (res.status === 404) return { ok: false, code: "not_found" };
  if (res.status === 429) return { ok: false, code: detail.includes("month") ? "monthly" : "busy" };
  return { ok: false, code: "down" };
}

function text(v: unknown, max: number): string {
  return (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);
}

export type ScribeGuideRow = { id: string; name: string; description: string; updated_at: string; steps: number; team: string };

// One line of the list. Only step-by-step guides ("scribe"); Scribe's long text pages have no steps to import.
export function guideRow(d: unknown): ScribeGuideRow | null {
  const x = (d ?? {}) as Record<string, unknown>;
  const id = text(x.id, 60);
  if (!id || (x.type !== undefined && x.type !== "scribe")) return null;
  return { id, name: text(x.name, 200) || "Untitled guide", description: text(x.description, 300), updated_at: text(x.updated_at, 40),
    steps: Array.isArray(x.actions) ? x.actions.length : 0, team: text((x.team as Record<string, unknown> | null)?.name, 80) };
}

// One guide as the import reads it: a title and steps, each with its text and the address of its screenshot (or none)
export function guideSteps(d: unknown, maxSteps: number): { title: string; steps: Array<{ text: string; image: string }>; total: number } | null {
  const x = (d ?? {}) as Record<string, unknown>;
  if (x.type !== "scribe" || !Array.isArray(x.actions)) return null;
  const all = (x.actions as Array<Record<string, unknown>>).map((a) => {
    const image = typeof a?.screenshot_url === "string" && a.screenshot_url.startsWith("https://") ? a.screenshot_url.slice(0, 2000) : "";
    return { text: text(a?.description, 2000), image };
  }).filter((s) => s.text || s.image);
  return { title: text(x.name, 200), steps: all.slice(0, maxSteps), total: all.length };
}
