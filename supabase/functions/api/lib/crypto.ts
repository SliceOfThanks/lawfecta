// Small crypto helpers: base64url, HMAC-SHA256, SHA-256, random tokens, constant-time compare.

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

export async function sha256Hex(data: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(data))));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// A session token: 32 random bytes. Only its hash is stored.
export function newSessionToken(): string {
  return "ds_" + b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sessionHash(token: string): Promise<string> {
  return await sha256Hex("dela-session:" + token);
}
