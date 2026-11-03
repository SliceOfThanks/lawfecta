// Members' own AI keys are sealed here before they reach the database, with AES-GCM and a key made from
// AI_KEY_ENCRYPTION_SECRET (a Supabase secret only Stacey sets). Each sealed key is bound to its row id, so a sealed
// value copied onto another row will not open. The plain key exists only in memory for the moment of an AI call.
import { b64url, b64urlDecode } from "../crypto.ts";

const enc = new TextEncoder();

async function aesKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("encryption_not_set_up");
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("dela-ai-keys"), info: enc.encode("v1") },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

export function encryptionReady(secret: string): boolean {
  return secret.length >= 32;
}

export async function sealKey(secret: string, rowId: string, plainKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(rowId) }, await aesKey(secret), enc.encode(plainKey));
  return "v1." + b64url(iv) + "." + b64url(new Uint8Array(ct));
}

export async function openKey(secret: string, rowId: string, sealed: string): Promise<string> {
  const [v, iv, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !ct) throw new Error("key_unreadable");
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64urlDecode(iv) as Uint8Array<ArrayBuffer>, additionalData: enc.encode(rowId) }, await aesKey(secret), b64urlDecode(ct) as Uint8Array<ArrayBuffer>);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("key_unreadable");
  }
}
