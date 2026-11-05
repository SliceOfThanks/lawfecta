// Brevo adapter: transactional email API v3.
import type { EmailMessage, EmailProvider, SendResult } from "./types.ts";

export const brevo: EmailProvider = {
  key: "brevo",
  name: "Brevo",
  secret: "BREVO_API_KEY",
  async send(msg: EmailMessage, apiKey: string, fetchFn: typeof fetch = fetch): Promise<SendResult> {
    try {
      const res = await fetchFn("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: msg.from,
          to: [{ email: msg.to.email, name: msg.to.name || undefined }],
          replyTo: msg.replyTo ? { email: msg.replyTo } : undefined,
          subject: msg.subject, htmlContent: msg.html, textContent: msg.text,
          headers: msg.headers, tags: msg.tags,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, retry: res.status >= 500 || res.status === 429, error: `brevo ${res.status} ${out?.code ?? ""}`.trim() };
      return { ok: true, messageId: String(out.messageId ?? "") };
    } catch (e) {
      return { ok: false, retry: true, error: "brevo network " + String(e).slice(0, 180) };
    }
  },
};

// What happened to one sent email, from Brevo's event log (GET /v3/smtp/statistics/events?messageId=...).
// "waiting" means nothing final yet; the worker checks again later.
export type Delivery = { state: "delivered" | "bounced" | "waiting" | "unknown"; reason: string };

const BOUNCE = ["hardBounces", "softBounces", "blocked", "invalid", "spam", "error"];

export async function brevoDelivery(messageId: string, apiKey: string, fetchFn: typeof fetch = fetch): Promise<Delivery> {
  if (!messageId || !apiKey) return { state: "unknown", reason: "" };
  try {
    const res = await fetchFn("https://api.brevo.com/v3/smtp/statistics/events?limit=50&sort=desc&messageId=" + encodeURIComponent(messageId), {
      headers: { "api-key": apiKey, accept: "application/json" },
    });
    if (!res.ok) return { state: "waiting", reason: "brevo " + res.status };
    const out = await res.json().catch(() => ({})) as { events?: Array<Record<string, unknown>> };
    const events = Array.isArray(out.events) ? out.events : [];
    if (events.some((e) => e.event === "delivered")) return { state: "delivered", reason: "" };
    const bad = events.find((e) => BOUNCE.includes(String(e.event)));
    if (bad) return { state: "bounced", reason: plainBounce(String(bad.event), String(bad.reason ?? "")) };
    return { state: "waiting", reason: "" };
  } catch {
    return { state: "waiting", reason: "brevo unreachable" };
  }
}

// Plain words for a mail server's refusal; members never see the raw server text
export function plainBounce(event: string, raw: string): string {
  const r = raw.toLowerCase();
  if (/spamcop|spamhaus|black ?list|block ?list|blocked|rbl|reputation|listed/.test(r) || event === "blocked") return "their mail server is blocking our email service for now";
  if (/user unknown|no such user|does not exist|unknown recipient|recipient address rejected|mailbox unavailable|invalid recipient|5\.1\.1/.test(r) || event === "invalid" || event === "hardBounces") return "that address does not exist or does not take email";
  if (/full|quota|over limit|insufficient storage|5\.2\.2/.test(r)) return "that mailbox is full";
  if (event === "spam") return "it was marked as spam";
  return "their mail server refused it";
}
