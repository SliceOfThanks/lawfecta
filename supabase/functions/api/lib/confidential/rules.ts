// Confidential materials (docs/briefs/step-6c-confidential-engagement-materials.md). Client names, facts, case numbers,
// court papers and contracts are allowed here. Until a lawyer approves more, DELA refuses full Social Security numbers,
// card numbers, bank account numbers and passwords or logins, by pattern, in uploads and messages.

export type Blocked = "ssn" | "card" | "bank" | "password";

// A real card number passes the Luhn check, so long reference numbers are not mistaken for cards
function luhn(digits: string): boolean {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

export function blockedKinds(text: string): Blocked[] {
  const t = String(text ?? "");
  const out = new Set<Blocked>();
  // Social Security numbers: 123-45-6789, or 9 digits next to SSN / social security
  if (/\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/.test(t)) out.add("ssn");
  if (/\b(ssn|social security( number| no\.?)?|soc\.? sec\.?)\b[^0-9]{0,20}\d{3}[ -]?\d{2}[ -]?\d{4}\b/i.test(t)) out.add("ssn");
  // Card numbers: 13 to 19 digits (spaces or dashes allowed) that pass the Luhn check
  for (const m of t.matchAll(/\b(?:\d[ -]?){12,18}\d\b/g)) {
    const d = m[0].replace(/[ -]/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d) && !/^(\d)\1+$/.test(d)) { out.add("card"); break; }
  }
  // Bank accounts: an account or routing number named as such, or an IBAN
  if (/\b(bank )?(account|acct|routing|aba|checking|savings)\s*(number|no\.?|num|#)?\s*(is|:|=|-)?\s*\d[\d -]{5,20}\d\b/i.test(t)) out.add("bank");
  if (/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/.test(t) && /\biban\b/i.test(t)) out.add("bank");
  // Passwords and logins
  if (/\b(password|passcode|passwd|pwd|pin)\s*(is|:|=)\s*\S+/i.test(t)) out.add("password");
  if (/\b(user ?name|login|log-in)\s*(is|:|=)\s*\S+/i.test(t) && /\b(password|passcode|pwd)\b/i.test(t)) out.add("password");
  return [...out];
}

export const BLOCKED_WORDS: Record<Blocked, string> = {
  ssn: "a full Social Security number", card: "a card number", bank: "a bank account number", password: "a password or login",
};
export function blockedMessage(kinds: Blocked[]): string {
  const words = kinds.map((k) => BLOCKED_WORDS[k]);
  const list = words.length > 1 ? words.slice(0, -1).join(", ") + " and " + words.at(-1) : words[0];
  return "This looks like it contains " + list + ". Confidential materials cannot hold these until a lawyer approves it." +
    (kinds.includes("password") ? " Share logins through your firm's password manager, never DELA." : "") +
    (kinds.some((k) => k !== "password") ? " Send only the last 4 digits." : "");
}
