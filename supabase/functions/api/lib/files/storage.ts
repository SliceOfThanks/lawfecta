// Member files live in the private Supabase Storage bucket dela-files. Browsers never get the service key:
// they upload through a one-time signed upload address and open files through links that expire in minutes.
// Storage is on supabase.co, never on the Lawfecta site's own address, so an uploaded file cannot run as part of DELA.

export type Storage = {
  signUpload(path: string): Promise<string>;
  signDownload(path: string, seconds: number, downloadName?: string): Promise<string>;
  size(path: string): Promise<number | null>;
  read(path: string): Promise<Uint8Array>;
  remove(paths: string[]): Promise<void>;
  // Server-side upload (screenshots fetched while importing a guide)
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
};

const BUCKET = "dela-files";
const encPath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export function supabaseStorage(base: string, serviceKey: string, f: typeof fetch = fetch): Storage {
  const root = base.replace(/\/+$/, "") + "/storage/v1";
  const auth = { authorization: "Bearer " + serviceKey, apikey: serviceKey };
  async function call(method: string, path: string, body?: unknown): Promise<Response> {
    return await f(root + path, {
      method, headers: { ...auth, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
  }
  return {
    async signUpload(path) {
      const r = await call("POST", `/object/upload/sign/${BUCKET}/${encPath(path)}`, {});
      if (!r.ok) throw new Error("storage_sign_upload_" + r.status);
      const j = await r.json() as { url?: string };
      if (!j.url) throw new Error("storage_sign_upload_empty");
      return root + j.url;
    },
    async signDownload(path, seconds, downloadName) {
      const r = await call("POST", `/object/sign/${BUCKET}/${encPath(path)}`, { expiresIn: seconds });
      if (!r.ok) throw new Error("storage_sign_" + r.status);
      const j = await r.json() as { signedURL?: string };
      if (!j.signedURL) throw new Error("storage_sign_empty");
      return root + j.signedURL + (downloadName ? "&download=" + encodeURIComponent(downloadName) : "");
    },
    // Text files come back compressed, and a compressed answer carries no content-length. So DELA asks for the
    // uncompressed answer, then reads the object's own record, and as a last step counts the bytes.
    async size(path) {
      const at = `/object/authenticated/${BUCKET}/${encPath(path)}`;
      const r = await f(root + at, { method: "HEAD", headers: { ...auth, "accept-encoding": "identity" }, signal: AbortSignal.timeout(30_000) });
      await r.body?.cancel();
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok) throw new Error("storage_head_" + r.status);
      const n = Number(r.headers.get("content-length"));
      if (Number.isFinite(n) && n > 0) return n;
      const info = await call("GET", `/object/info/authenticated/${BUCKET}/${encPath(path)}`);
      if (info.ok) {
        const j = await info.json().catch(() => ({})) as { size?: number; metadata?: { size?: number } };
        const m = Number(j.size ?? j.metadata?.size);
        if (Number.isFinite(m) && m > 0) return m;
      } else await info.body?.cancel();
      const g = await f(root + at, { method: "GET", headers: { ...auth, "accept-encoding": "identity" }, signal: AbortSignal.timeout(30_000) });
      if (!g.ok) { await g.body?.cancel(); return null; }
      const len = (await g.arrayBuffer()).byteLength;
      return len > 0 ? len : null;
    },
    async read(path) {
      const r = await call("GET", `/object/authenticated/${BUCKET}/${encPath(path)}`);
      if (!r.ok) throw new Error("storage_read_" + r.status);
      return new Uint8Array(await r.arrayBuffer());
    },
    async put(path, bytes, contentType) {
      const r = await f(root + `/object/${BUCKET}/${encPath(path)}`, {
        method: "POST", headers: { ...auth, "content-type": contentType, "x-upsert": "false" }, body: bytes as Uint8Array<ArrayBuffer>, signal: AbortSignal.timeout(30_000),
      });
      await r.body?.cancel();
      if (!r.ok) throw new Error("storage_put_" + r.status);
    },
    async remove(paths) {
      if (!paths.length) return;
      const r = await call("DELETE", `/object/${BUCKET}`, { prefixes: paths });
      await r.body?.cancel();
      if (!r.ok && r.status !== 404) throw new Error("storage_remove_" + r.status);
    },
  };
}
