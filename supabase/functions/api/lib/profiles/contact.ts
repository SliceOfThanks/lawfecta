// Step 67: contact details have no place in a freelancer's profile (Stacey 2026-11-20). An attorney who can read an
// email address, a phone number, a website or a booking link in a profile can hire the freelancer away from Lawfecta.
// stripContact() takes such details out of one piece of text and says what kind each was. It is code, not AI, so it
// costs nothing, gives the same answer every time, and nothing typed in a profile can talk it out of its rule.

export type ContactKind = "email" | "phone" | "link" | "handle" | "invitation";
export const CONTACT_WORDS: Record<ContactKind, string> = { email: "an email address", phone: "a phone number", link: "a website or booking link", handle: "a social media or chat name", invitation: "a request to get in touch outside Lawfecta" };

// Names of products that look like web addresses. They stay.
const PRODUCT = new Set(["monday.com", "law.com", "legal.io", "box.com", "asp.net"]);
const LAWFECTA = /(^|\.)lawfecta\.(co|com)$/i;
const TLD = "com|net|org|io|co|us|law|legal|me|app|ai|biz|info|ly|page|site|online|dev|pro|email|link|bio|to|gg|tv|uk|ca|au";
const PATTERNS: Array<[ContactKind, RegExp]> = [
  ["email", /[A-Z0-9._%+-]+\s?@\s?[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  // written out to get past a filter: "jane at gmail dot com", "jane (at) firm [dot] com"
  ["email", /\b[\w.+-]{2,}\s*(?:\(at\)|\[at\]|\{at\}|\s+at\s+)\s*[\w-]{2,}\s*(?:\(dot\)|\[dot\]|\{dot\}|\s+dot\s+)\s*(?:com|net|org|io|co|law)\b/gi],
  ["link", /\b(?:https?:\/\/|www\.)[^\s<>()\[\]"']+/gi],
  ["link", new RegExp("\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:" + TLD + ")\\b(?:\\/[^\\s<>()\\[\\]\"']*)?", "gi")],
  ["phone", /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g],
  ["phone", /\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g],
  ["handle", /(^|[\s(:,;])@[A-Za-z0-9_.]{3,30}\b/g],
  ["handle", /\b(?:whatsapp|telegram|skype|signal|instagram|facebook|linkedin|tiktok|twitter|snapchat|wechat|discord|calendly|zoom)\s*(?:id|handle|name|user(?:name)?|link|me)?\s*(?:is|:|-|@)\s*[A-Za-z0-9_.@-]{3,40}/gi],
  ["invitation", /\b(?:text me at|call me at|email me at|reach me at|contact me at|message me on|find me on|dm me|my (?:personal |direct |cell |mobile |work )?(?:email|e-mail|number|cell|phone|website|site|calendar|booking (?:link|page)) (?:is|:))[^.\n]{0,80}/gi],
];

// Pictures in profile text are written as ![caption](img:<id>.png). The reference must survive untouched.
const IMG = /!\[[^\]\n]{0,160}\]\(img:[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp)\)/gi;

export function stripContact(text: string): { text: string; kinds: ContactKind[] } {
  if (!text) return { text: text ?? "", kinds: [] };
  const kept: string[] = [];
  let t = text.replace(IMG, (m) => { kept.push(m); return "\u0000" + (kept.length - 1) + "\u0000"; });
  const kinds = new Set<ContactKind>();
  for (const [kind, re] of PATTERNS) {
    t = t.replace(re, (m: string, ...rest: unknown[]) => {
      const lead = kind === "handle" && typeof rest[0] === "string" && m.startsWith(rest[0] as string) ? rest[0] as string : "";
      const core = m.slice(lead.length);
      if (kind === "link") {
        const host = core.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[\/?#]/)[0].toLowerCase();
        if (LAWFECTA.test(host)) return m;
        if (PRODUCT.has(host) && !/[\/?#]/.test(core.replace(/^https?:\/\//i, ""))) return m;
      }
      if (kind === "phone" && core.replace(/\D/g, "").length < 10) return m;
      kinds.add(kind);
      return lead + "[removed]";
    });
  }
  // tidy what removal leaves behind
  t = t.replace(/\[removed\](?:[\s,;:|/-]*\[removed\])+/g, "[removed]").replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\u0000(\d+)\u0000/g, (_m, i) => kept[Number(i)] ?? "");
  return { text: t, kinds: [...kinds] };
}

// Runs over the boxes of a profile that other people read. Returns the cleaned values and which boxes were changed.
export function stripProfile<T extends Record<string, unknown>>(body: T, labels: Record<string, string>): { body: T; fields: string[]; kinds: ContactKind[] } {
  const fields: string[] = [], kinds = new Set<ContactKind>();
  const out = { ...body } as Record<string, unknown>;
  const clean = (v: string, label: string): string => { const r = stripContact(v); if (r.kinds.length) { if (!fields.includes(label)) fields.push(label); r.kinds.forEach((k) => kinds.add(k)); } return r.text; };
  for (const [key, label] of Object.entries(labels)) {
    const v = out[key];
    if (typeof v === "string") out[key] = clean(v, label);
    else if (Array.isArray(v)) out[key] = v.map((x) => {
      if (typeof x === "string") return clean(x, label);
      if (x && typeof x === "object") { const o = { ...(x as Record<string, unknown>) }; for (const k of Object.keys(o)) if (typeof o[k] === "string") o[k] = clean(o[k] as string, label); return o; }
      return x;
    }).filter((x) => !(typeof x === "string" && x.replace(/\[removed\]/g, "").trim() === ""));
  }
  return { body: out as T, fields, kinds: [...kinds] };
}

export const PROFILE_TEXT_LABELS: Record<string, string> = { headline: "Headline", summary: "Summary", experience: "Experience", education: "Education", hours: "Usual hours", firm_name: "Business name",
  skills: "Skills", software: "Software", services: "Services" };
export const AGENCY_TEXT_LABELS: Record<string, string> = { headline: "Headline", summary: "Summary", services: "Services", practice_areas: "Practice areas", tools: "Tools" };
