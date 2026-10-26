// Verifies the one-use sign in pass made by the DELA-Auth widget inside Brilliant Directories.
// The widget checks BD's own server session, then signs: base64url(JSON payload) + "." + hex HMAC-SHA256 of the base64url part,
// keyed with BD_SHARED_SECRET (the same value is typed into DELA-Auth and into Supabase secrets by Stacey).
// Payload: { aud: "dela", uid, sub (BD plan ID), name, email, jti (random, one use), iat, exp (unix seconds) }
import { b64urlDecode, hmacHex, safeEqual } from "./crypto.ts";

export type Pass = { aud: string; uid: number; sub: string; name: string; email: string; jti: string; iat: number; exp: number };

const MAX_AHEAD_SECONDS = 15 * 60;

export async function verifyPass(token: unknown, secret: string, now = Date.now()): Promise<Pass | null> {
  if (typeof token !== "string" || token.length < 10 || token.length > 3000) return null;
  if (!secret || secret.length < 32) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1).toLowerCase();
  if (!safeEqual(sig, await hmacHex(secret, body))) return null;
  let p: Pass;
  try {
    p = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  const nowS = Math.floor(now / 1000);
  if (!p || p.aud !== "dela") return null;
  if (typeof p.uid !== "number" || !Number.isInteger(p.uid) || p.uid <= 0) return null;
  if (typeof p.jti !== "string" || p.jti.length < 16 || p.jti.length > 100) return null;
  if (typeof p.exp !== "number" || p.exp < nowS || p.exp > nowS + MAX_AHEAD_SECONDS) return null;
  p.sub = String(p.sub ?? "");
  p.name = String(p.name ?? "").slice(0, 200);
  p.email = String(p.email ?? "").slice(0, 320);
  return p;
}
