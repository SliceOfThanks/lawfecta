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
