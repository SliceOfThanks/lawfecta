// Member webhooks (Step 7, 1A section 26): outgoing event notices to an address the member chose.
// Safety: https only, no addresses inside a network or at cloud metadata (checked when saved and again at every delivery),
// no redirects, a short time limit, and every notice signed with the endpoint's own secret and a time.

export type Resolver = (host: string) => Promise<string[]>;

// Deno's own DNS lookup (A and AAAA). Any failure means "cannot check", which refuses the address.
export const denoResolve: Resolver = async (host) => {
  const out: string[] = [];
  for (const t of ["A", "AAAA"] as const) {
    try { out.push(...(await Deno.resolveDns(host, t)) as string[]); } catch { /* no records of this type */ }
  }
  return out;
};

function v4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  return p.every((x) => x >= 0 && x <= 255) ? p : null;
}

// An IPv6 address as its eight 16-bit groups, or null when it is not one. "::" and a dotted IPv4 tail are understood.
function v6groups(s: string): number[] | null {
  let str = s;
  const dotted = str.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) {
    const q = v4(dotted[2]);
    if (!q) return null;
    str = dotted[1] + ((q[0] << 8) | q[1]).toString(16) + ":" + ((q[2] << 8) | q[3]).toString(16);
  }
  const halves = str.split("::");
  if (halves.length > 2) return null;
  const part = (x: string) => (x === "" ? [] : x.split(":"));
  const head = part(halves[0]), tail = halves.length === 2 ? part(halves[1]) : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const all = [...head, ...Array(fill).fill("0"), ...tail];
  if (all.length !== 8 || !all.every((x) => /^[0-9a-f]{1,4}$/.test(x))) return null;
  return all.map((x) => parseInt(x, 16));
}

// Private, loopback, link-local, carrier-grade NAT, multicast, reserved and metadata addresses
export function isPrivateIp(ip: string): boolean {
  const a = v4(ip);
  if (a) {
    const [x, y] = a;
    return x === 0 || x === 10 || x === 127 || (x === 100 && y >= 64 && y <= 127) || (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) ||
      (x === 192 && y === 168) || (x === 192 && y === 0) || (x === 198 && (y === 18 || y === 19)) || x >= 224;
  }
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!s.includes(":")) return true; // not an address we understand
  // The same address can be written many ways ("::ffff:7f00:1", "0:0:0:0:0:ffff:127.0.0.1", "::0001"), so it is
  // expanded to its eight groups first and judged by its numbers, never by how it was spelled
  const g = v6groups(s);
  if (!g) return true; // not an address we understand
  if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true; // :: and ::1
  const tail4 = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return isPrivateIp(tail4); // IPv4-mapped and IPv4-compatible
  if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64: reaches IPv4 addresses
  if (g[0] === 0x2002) return true; // 6to4: carries an IPv4 address
  if (g[0] === 0x2001 && (g[1] === 0xdb8 || g[1] === 0)) return true; // documentation, Teredo
  return (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00; // private, link-local, multicast
}

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|metadata|metadata\.google\.internal)$/i;

// Checks an endpoint address. A host name is resolved and every address it points to must be public.
export async function checkUrl(raw: string, resolve: Resolver): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  let u: URL;
  try { u = new URL(String(raw).trim()); } catch { return { ok: false, reason: "bad_url" }; }
  if (u.protocol !== "https:") return { ok: false, reason: "https_only" };
  if (u.username || u.password) return { ok: false, reason: "bad_url" };
  if (u.port && u.port !== "443") return { ok: false, reason: "port_not_allowed" };
  if (String(raw).length > 500) return { ok: false, reason: "bad_url" };
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.test(host) || !host.includes(".") && !host.includes(":")) return { ok: false, reason: "private_address" };
  if (v4(host) || host.includes(":")) return isPrivateIp(host) ? { ok: false, reason: "private_address" } : { ok: true, url: u };
  const ips = await resolve(host).catch(() => [] as string[]);
  if (!ips.length) return { ok: false, reason: "address_not_found" };
  if (ips.some(isPrivateIp)) return { ok: false, reason: "private_address" };
  return { ok: true, url: u };
}

async function hmacHex(secret: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text)));
  return [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// "t=<unix time>,v1=<hmac of t.body>" (and a second v1 with the old secret while it still works)
export async function signatureHeader(body: string, secrets: string[], t = Math.floor(Date.now() / 1000)): Promise<string> {
  const parts = [`t=${t}`];
  for (const s of secrets.filter(Boolean)) parts.push("v1=" + await hmacHex(s, `${t}.${body}`));
  return parts.join(",");
}

// For members' own systems (and our tests): checks a DELA signature within a time window
export async function verifySignature(body: string, header: string, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const t = Number((header.split(",").find((x) => x.startsWith("t=")) ?? "").slice(2));
  if (!t || Math.abs(nowSec - t) > toleranceSec) return false;
  const want = await hmacHex(secret, `${t}.${body}`);
  return header.split(",").filter((x) => x.startsWith("v1=")).some((x) => x.slice(3) === want);
}

export function newSecret(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return "whsec_" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// One delivery. A 2xx answer is success; redirects are not followed; the answer body is not read.
export async function deliver(f: typeof fetch, url: string, event: Record<string, unknown>, secrets: string[], timeoutSec: number, resolve: Resolver):
  Promise<{ ok: boolean; code: number | null; error: string }> {
  const chk = await checkUrl(url, resolve);
  if (!chk.ok) return { ok: false, code: null, error: chk.reason };
  const body = JSON.stringify(event);
  try {
    const r = await f(chk.url.href, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(Math.max(1, timeoutSec) * 1000),
      headers: { "content-type": "application/json", "user-agent": "Lawfecta-DELA-Webhooks/1", "dela-event-id": String(event.id ?? ""), "dela-event-type": String(event.type ?? ""),
        "dela-signature": await signatureHeader(body, secrets) },
      body,
    });
    await r.body?.cancel().catch(() => {});
    if (r.status >= 200 && r.status < 300) return { ok: true, code: r.status, error: "" };
    return { ok: false, code: r.status, error: r.status >= 300 && r.status < 400 ? "redirects_not_followed" : "http_" + r.status };
  } catch (e) {
    return { ok: false, code: null, error: String(e).includes("TimeoutError") || String(e).includes("timed out") ? "timeout" : "could_not_connect" };
  }
}
