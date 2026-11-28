// Step 94: DELA's own copy of each released version (docs/briefs/step-94-code-store.md).
// A version's files are read from GitHub at one exact commit, checked against the fingerprint GitHub's own list gives
// for each file, and put into the Supabase Storage bucket dela-code. The files a browser loads go under the commit;
// the server's own files go under a long random name next to them, for the minutes a release needs them.

export const CODE_BUCKET = "dela-code";
// What a browser loads. Nothing else of the repository is ever copied to where a browser can read it.
const BROWSER_DIRS = ["shared/", "app/", "admin/", "brand/", "docs/images/"];
const BROWSER_ENDS = [".js", ".png", ".jpg"];
const SERVER_DIR = "supabase/functions/api/";

export type TreeItem = { path: string; sha: string; type: string; size?: number };
export type Todo = { path: string; sha: string; to: string; server: boolean };

const TYPES: Record<string, string> = { js: "text/javascript", ts: "application/typescript", sql: "text/plain", png: "image/png", jpg: "image/jpeg" };
export const typeOf = (path: string) => TYPES[path.split(".").pop() ?? ""] ?? "";

// Which files of the version are copied, and where to. Test files are never copied.
export function plan(tree: TreeItem[], commit: string, key: string, migrations: string[]): Todo[] {
  const names = new Set(migrations.filter((m) => /^[0-9]{4}_[a-z0-9_]+\.sql$/.test(m)));
  const out: Todo[] = [];
  for (const t of tree) {
    if (t.type !== "blob" || !/^[A-Za-z0-9_./-]+$/.test(t.path) || t.path.includes("..") || !typeOf(t.path)) continue;
    const test = /_test\.ts$/.test(t.path) || /-test\.js$/.test(t.path);
    if (BROWSER_DIRS.some((d) => t.path.startsWith(d)) && BROWSER_ENDS.some((e) => t.path.endsWith(e)) && !test) out.push({ path: t.path, sha: t.sha, to: `${commit}/${t.path}`, server: false });
    else if (t.path.startsWith(SERVER_DIR) && t.path.endsWith(".ts") && !test) out.push({ path: t.path, sha: t.sha, to: `${commit}/_s/${key}/${t.path}`, server: true });
    else if (t.path.startsWith("supabase/migrations/") && names.has(t.path.slice("supabase/migrations/".length))) out.push({ path: t.path, sha: t.sha, to: `${commit}/_s/${key}/${t.path}`, server: true });
  }
  return out;
}

// Git's own fingerprint of a file: SHA-1 over "blob <length>\0" and the bytes
export async function gitSha(bytes: Uint8Array): Promise<string> {
  const head = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const all = new Uint8Array(head.byteLength + bytes.byteLength);
  all.set(head, 0); all.set(bytes, head.byteLength);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const gh = (token: string): Record<string, string> => ({ "user-agent": "lawfecta-dela", ...(token ? { authorization: "Bearer " + token } : {}) });

export async function ghTree(f: typeof fetch, repo: string, commit: string, token: string): Promise<{ ok: true; tree: TreeItem[] } | { ok: false; status: number; error: string }> {
  try {
    const r = await f(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`, { headers: { ...gh(token), accept: "application/vnd.github+json" } });
    if (!r.ok) { await r.body?.cancel(); return { ok: false, status: r.status, error: "github " + r.status }; }
    const j = await r.json() as { tree?: TreeItem[]; truncated?: boolean };
    if (!Array.isArray(j.tree) || j.truncated) return { ok: false, status: 200, error: "github gave an incomplete list of files" };
    return { ok: true, tree: j.tree };
  } catch (e) { return { ok: false, status: 0, error: "github unreachable " + String((e as Error)?.message ?? e).slice(0, 60) }; }
}

// One file at the commit. With a token (a private repository) through GitHub's API, without one through its raw address.
export async function ghFile(f: typeof fetch, repo: string, commit: string, path: string, token: string): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; status: number; error: string }> {
  try {
    const r = token
      ? await f(`https://api.github.com/repos/${repo}/contents/${path}?ref=${commit}`, { headers: { ...gh(token), accept: "application/vnd.github.raw" } })
      : await f(`https://raw.githubusercontent.com/${repo}/${commit}/${path}`, { headers: gh("") });
    if (!r.ok) { await r.body?.cancel(); return { ok: false, status: r.status, error: "github " + r.status + " for " + path }; }
    return { ok: true, bytes: new Uint8Array(await r.arrayBuffer()) };
  } catch (e) { return { ok: false, status: 0, error: "github unreachable " + String((e as Error)?.message ?? e).slice(0, 60) }; }
}

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");
const root = (base: string) => base.replace(/\/+$/, "") + "/storage/v1";

export async function putCode(f: typeof fetch, base: string, serviceKey: string, to: string, bytes: Uint8Array, type: string): Promise<{ ok: boolean; status: number }> {
  try {
    // A version's files never change, so a browser may keep them for a year
    const r = await f(`${root(base)}/object/${CODE_BUCKET}/${enc(to)}`, { method: "POST", headers: { authorization: "Bearer " + serviceKey, apikey: serviceKey, "content-type": type, "x-upsert": "true", "cache-control": "max-age=31536000" }, body: bytes as Uint8Array<ArrayBuffer> });
    await r.body?.cancel();
    return { ok: r.ok, status: r.status };
  } catch { return { ok: false, status: 0 }; }
}

export async function removeCode(f: typeof fetch, base: string, serviceKey: string, paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  try {
    const r = await f(`${root(base)}/object/${CODE_BUCKET}`, { method: "DELETE", headers: { authorization: "Bearer " + serviceKey, apikey: serviceKey, "content-type": "application/json" }, body: JSON.stringify({ prefixes: paths }) });
    await r.body?.cancel();
    return r.ok || r.status === 404;
  } catch { return false; }
}

// Where a browser loads a copied version from
export const ownBase = (supabaseUrl: string, commit: string) => `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${CODE_BUCKET}/${commit}`;
