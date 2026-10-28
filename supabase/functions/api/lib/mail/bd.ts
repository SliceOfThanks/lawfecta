// Brilliant Directories adapter: BD's own email outbox (POST /api/v2/email_outbox/create on the BD site).
// BD queues the email and its own mail service sends it, so members get it from the site they joined.
// Needs BD_API_KEY (a Supabase secret Stacey adds from BD admin) and the site.url setting.
// BD's docs do not say how fast the outbox sends; Staging tests measure it before members rely on it.
import type { EmailMessage, EmailProvider, SendOptions, SendResult } from "./types.ts";

export const bd: EmailProvider = {
  key: "bd",
  name: "Brilliant Directories",
  secret: "BD_API_KEY",
  async send(msg: EmailMessage, apiKey: string, fetchFn: typeof fetch = fetch, opts: SendOptions = {}): Promise<SendResult> {
    if (!apiKey) return { ok: false, retry: false, error: "bd_api_key_missing" };
    const base = (opts.siteUrl ?? "").replace(/\/+$/, "");
    if (!base.startsWith("https://")) return { ok: false, retry: false, error: "bd_site_url_missing" };
    const form = new URLSearchParams({
      to_email: msg.to.email,
      from_email: msg.from.email,
      from_name: msg.from.name,
      subject: msg.subject,
      html: msg.html,
      status: "pending",
    });
    try {
      const res = await fetchFn(base + "/api/v2/email_outbox/create", {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: form.toString(),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out?.status !== "success") {
        const why = typeof out?.message === "string" ? out.message.slice(0, 120) : "";
        return { ok: false, retry: res.status >= 500 || res.status === 429, error: `bd ${res.status} ${why}`.trim() };
      }
      const m = out.message ?? {};
      return { ok: true, messageId: "bd-outbox-" + String(m.email_id ?? m.id ?? m.outbox_id ?? "") };
    } catch (e) {
      return { ok: false, retry: true, error: "bd network " + String(e).slice(0, 180) };
    }
  },
};
