// Picks the email service from the email.sender setting, so switching is a setting change once the adapter exists.
// log: records the email as handled without sending it (Staging, and Live until the service is chosen).
// bd: Brilliant Directories' own email outbox on the BD site (lib/mail/bd.ts).
import { bd } from "./bd.ts";
import { brevo } from "./brevo.ts";
import type { EmailMessage, EmailProvider, SendResult } from "./types.ts";

export const log: EmailProvider = {
  key: "log",
  name: "Log only",
  secret: "",
  send(msg: EmailMessage): Promise<SendResult> {
    console.log("email (log only)", JSON.stringify({ to: msg.to.email.replace(/^[^@]*/, "***"), subject: msg.subject }));
    return Promise.resolve({ ok: true, messageId: "log-" + crypto.randomUUID() });
  },
};

export const PROVIDERS: Record<string, EmailProvider> = { log, brevo, bd };

export function pickProvider(setting: unknown): EmailProvider {
  return PROVIDERS[String(setting ?? "")] ?? log;
}

export { bd };
export type { EmailMessage, EmailProvider, SendOptions, SendResult } from "./types.ts";
