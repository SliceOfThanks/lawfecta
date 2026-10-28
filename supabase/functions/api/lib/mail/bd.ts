// Brilliant Directories adapter: BD's own email outbox (POST /api/v2/email_outbox/create on the BD site).
// BD queues the email and its own mail service sends it, so members get it from the site they joined.
// Needs BD_API_KEY (a Supabase secret Stacey adds from BD admin) and the site.url setting.
// BD's docs do not say how fast the outbox sends; Staging tests measure it before members rely on it.
// BD only sends outbox records that carry a send_date (BD outbox report, 2026-10-28: a record without one stayed
// "Not Sent"). The date uses the site's format, YYYYMMDDHHmmss in the site's time zone.
import type { EmailMessage, EmailProvider, SendOptions, SendResult } from "./types.ts";

// The BD site's clock (hirelegalhelp.com runs on America/Los_Angeles)
export const BD_TIME_ZONE = "America/Los_Angeles";

export function bdSendDate(now: number, timeZone = BD_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return get("year") + get("month") + get("day") + get("hour") + get("minute") + get("second");
}

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
      send_date: bdSendDate(opts.now ?? Date.now(), opts.timeZone),
    });
    const post = (url: string) => fetchFn(url, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form.toString(),
      redirect: "manual",
    });
    try {
      // A site that moves the address (www or not, a trailing slash) answers with a redirect. Following it the
      // normal way turns the POST into a GET, which BD refuses as "Invalid Request Method". Post again, once,
      // to the new address on the same site, and record where it went so site.url can be corrected.
      let res = await post(base + "/api/v2/email_outbox/create");
      let moved = "";
      if (res.status >= 300 && res.status < 400) {
        const to = res.headers.get("location") ?? "";
        const next = to ? new URL(to, base + "/").toString() : "";
        const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
        if (!next.startsWith("https://") || host(next) !== host(base)) {
          return { ok: false, retry: false, error: `bd ${res.status} redirected to ${next.slice(0, 100) || "nowhere"}` };
        }
        moved = " (moved to " + next.slice(0, 100) + ")";
        res = await post(next);
      }
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out?.status !== "success") {
        const why = typeof out?.message === "string" ? out.message.slice(0, 120) : "";
        return { ok: false, retry: res.status >= 500 || res.status === 429, error: (`bd ${res.status} ${why}`.trim() + moved) };
      }
      const m = out.message ?? {};
      return { ok: true, messageId: "bd-outbox-" + String(m.email_id ?? m.id ?? m.outbox_id ?? "") };
    } catch (e) {
      return { ok: false, retry: true, error: "bd network " + String(e).slice(0, 180) };
    }
  },
};
