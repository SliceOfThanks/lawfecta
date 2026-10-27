// Brevo text message adapter (transactional SMS API v3). Used only for owner alerts and release codes.
// The phone number and message text are never written to the logs.
import type { SendResult } from "../mail/types.ts";

export type TextMessage = { sender: string; to: string; text: string };

export async function sendSms(msg: TextMessage, apiKey: string, fetchFn: typeof fetch = fetch): Promise<SendResult> {
  if (!apiKey) return { ok: false, retry: false, error: "sms_not_set_up" };
  const recipient = msg.to.split("").filter((ch) => ch >= "0" && ch <= "9").join("");
  if (recipient.length < 8) return { ok: false, retry: false, error: "sms_bad_number" };
  try {
    const res = await fetchFn("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ type: "transactional", sender: (msg.sender || "Lawfecta").slice(0, 11), recipient, content: msg.text.slice(0, 320) }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, retry: res.status >= 500 || res.status === 429, error: `brevo sms ${res.status} ${out?.code ?? ""}`.trim() };
    return { ok: true, messageId: String(out.messageId ?? out.reference ?? "") };
  } catch (e) {
    return { ok: false, retry: true, error: "brevo sms network " + String(e).slice(0, 180) };
  }
}
