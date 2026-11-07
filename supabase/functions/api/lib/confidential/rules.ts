// Sensitive data (docs/briefs/step-6d-security-sensitive-data.md, Stacey 2026-11-05). Client names, facts, case numbers,
// court papers and contracts are normal data. Sensitive data is never uploaded, only linked from the firm's own storage.
// By pattern, DELA refuses full Social Security numbers and ITINs, card numbers, bank account and routing numbers, and
// passwords or logins, in every file shared on a job and in confidential messages. ID documents, health information and
// biometric data cannot be found by a pattern: the upload checkbox covers them.

export type Blocked = "ssn" | "card" | "bank" | "password" | "gov_id";

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
  // ITINs: 9XX-XX-XXXX with the IRS's middle-digit ranges (50 to 65, 70 to 88, 90 to 92, 94 to 99)
  if (/\b9\d{2}-(5\d|6[0-5]|7\d|8[0-8]|9[0-2]|9[4-9])-\d{4}\b/.test(t)) out.add("ssn");
  if (/\b(itin|taxpayer identification number)\b[^0-9]{0,20}9\d{2}[ -]?\d{2}[ -]?\d{4}\b/i.test(t)) out.add("ssn");
  if (/\b(ssn|social security( number| no\.?)?|soc\.? sec\.?)\b[^0-9]{0,20}\d{3}[ -]?\d{2}[ -]?\d{4}\b/i.test(t)) out.add("ssn");
  // Card numbers: 13 to 19 digits (spaces or dashes allowed) that pass the Luhn check
  for (const m of t.matchAll(/\b(?:\d[ -]?){12,18}\d\b/g)) {
    const d = m[0].replace(/[ -]/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d) && !/^(\d)\1+$/.test(d)) { out.add("card"); break; }
  }
  // Bank accounts: an account or routing number named as such, or an IBAN
  if (/\b(bank )?(account|acct|routing|aba|checking|savings)\s*(number|no\.?|num|#)?\s*(is|:|=|-)?\s*\d[\d -]{5,20}\d\b/i.test(t)) out.add("bank");
  if (/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/.test(t) && /\biban\b/i.test(t)) out.add("bank");
  // Government ID numbers (step 9c): a driver's license, passport, state ID, green card or alien number named as such,
  // followed by an ID that has at least one digit
  if (/\b(driver'?s?\s+licen[cs]e|passport|state\s+id|government\s+id|green\s+card|alien\s+(registration\s+)?number|a-number)\s*(number|no\.?|num|#)?\s*(is|:|=|-)?\s*(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,14}\b/i.test(t)) out.add("gov_id");
  // Passwords and logins
  if (/\b(password|passcode|passwd|pwd|pin)\s*(is|:|=)\s*\S+/i.test(t)) out.add("password");
  if (/\b(user ?name|login|log-in)\s*(is|:|=)\s*\S+/i.test(t) && /\b(password|passcode|pwd)\b/i.test(t)) out.add("password");
  return [...out];
}

export const BLOCKED_WORDS: Record<Blocked, string> = {
  ssn: "a full Social Security number or ITIN", card: "a card number", bank: "a bank account number", password: "a password or login",
  gov_id: "a government ID number",
};
export function blockedMessage(kinds: Blocked[]): string {
  const words = kinds.map((k) => BLOCKED_WORDS[k]);
  const list = words.length > 1 ? words.slice(0, -1).join(", ") + " and " + words.at(-1) : words[0];
  return "This looks like it contains " + list + ". Sensitive data cannot be sent in DELA." +
    (kinds.includes("password") ? " Share logins through your firm's password manager, never DELA." : "") +
    (kinds.some((k) => k !== "password") ? " Send only the last 4 digits." : "");
}

// For files (Stacey 2026-11-05): files are refused, and the attorney can mark the job as sensitive and share a link instead
export const FILE_BLOCKED_MESSAGE = "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead.";
