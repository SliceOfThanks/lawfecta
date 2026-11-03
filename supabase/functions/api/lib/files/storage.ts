// Member files live in the private Supabase Storage bucket dela-files. Browsers never get the service key:
// they upload through a one-time signed upload address and open files through links that expire in minutes.
// Storage is on supabase.co, never on the Lawfecta site's own address, so an uploaded file cannot run as part of DELA.

export type Storage = {
  signUpload(path: string): Promise<string>;
  signDownload(path: string, seconds: number, downloadName?: string): Promise<string>;
  size(path: string): Promise<number | null>;
  read(path: string): Promise<Uint8Array>;
  remove(paths: string[]): Promise<void>;
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
    async size(path) {
      const r = await call("HEAD", `/object/authenticated/${BUCKET}/${encPath(path)}`);
      await r.body?.cancel();
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok) throw new Error("storage_head_" + r.status);
      const n = Number(r.headers.get("content-length"));
      return Number.isFinite(n) && n > 0 ? n : null;
    },
    async read(path) {
      const r = await call("GET", `/object/authenticated/${BUCKET}/${encPath(path)}`);
      if (!r.ok) throw new Error("storage_read_" + r.status);
      return new Uint8Array(await r.arrayBuffer());
    },
    async remove(paths) {
      if (!paths.length) return;
      const r = await call("DELETE", `/object/${BUCKET}`, { prefixes: paths });
      await r.body?.cancel();
      if (!r.ok && r.status !== 404) throw new Error("storage_remove_" + r.status);
    },
  };
}
