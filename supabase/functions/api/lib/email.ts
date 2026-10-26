// Builds a DELA notice email. Notices never carry confidential details: a short title, a short body and a
// link back into DELA, where the member signs in to see the rest.

export type NoticeEmail = { title: string; body: string; link: string; siteUrl: string; appPath: string; environment: string };

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// Only links on the Lawfecta site are allowed in notices
export function noticeLink(n: NoticeEmail): string {
  const base = n.siteUrl.replace(/\/+$/, "");
  const path = n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : n.appPath || "/";
  return base + path;
}

export function buildNotice(n: NoticeEmail): { subject: string; html: string; text: string } {
  const prefix = n.environment === "live" ? "" : "[Staging] ";
  const subject = (prefix + n.title).slice(0, 180);
  const url = noticeLink(n);
  const text = `${n.title}\n\n${n.body}\n\nOpen DELA: ${url}\n\nYou are getting this because you have a Lawfecta account.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif;color:#1f2a37">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e3ded5;border-radius:12px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Lawfecta DELA${prefix ? " (staging)" : ""}</td></tr>
<tr><td style="padding:0 28px;font-size:22px;font-weight:bold;line-height:1.3">${esc(n.title)}</td></tr>
<tr><td style="padding:12px 28px 4px;font-size:15px;line-height:1.6">${esc(n.body).replaceAll("\n", "<br>")}</td></tr>
<tr><td style="padding:16px 28px 28px"><a href="${esc(url)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Open DELA</a></td></tr>
</table>
<p style="font-size:12px;color:#6b7280;max-width:560px">You are getting this because you have a Lawfecta account.</p>
</td></tr></table></body></html>`;
  return { subject, html, text };
}
