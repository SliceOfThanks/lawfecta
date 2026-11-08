// Step 9: the Pro trial and the downgrade to Free (docs/briefs/step-9-pro-trial-downgrade.md, Stacey's answers 2026-11-07).
// The decision for one Brilliant Directories member, worked out in code from what BD says about them. No BD calls here:
// lib/trial/run.ts reads the member, asks decide() what to do, and carries it out (or only lists it in Dry run).

export type TrialPlans = {
  pro: number; free: number; plus: number; agency: number;
  trial: number[];   // plans a trial member can be on: Plus (7) and Pro (8)
  never: number[];   // never changed, even with trial data: attorney plans 5, 12, 13, 14 and the lifetime plans 10, 11
};

export type TrialSettings = {
  days: number;           // trial.days (7)
  reminderDays: number;   // trial.reminder_days (2)
  eligibleFrom: string;   // trial.eligible_from: members who signed up before this date never get a trial ("" = no limit)
  plans: TrialPlans;
};

export type TrialInvoice = { id: string; plan_id: number; paid: boolean; open: boolean };

// What DELA knows about one member when it decides
export type TrialMember = {
  user_id: number;
  plan_id: number;
  signup_at: string | null;            // BD signup date and time
  status: string;                      // users_meta dela_trial_status: "", "active", "converted" or "downgraded"
  ends_at: string | null;              // users_meta dela_trial_ends_at
  reminded: boolean;                   // the "ends in 2 days" email was sent
  invoices: TrialInvoice[];
  hidden: number;                      // posts and areas DELA hid at the downgrade and has not brought back yet
};

export type TrialAction = "track" | "remind" | "convert" | "downgrade" | "restore" | "skip";
export type TrialDecision = { action: TrialAction; reason: string; ends_at?: string };

const DAY = 86400000;

export function decide(m: TrialMember, now: number, s: TrialSettings): TrialDecision {
  const p = s.plans;
  // The hard guard (answer 1): attorney plans and the lifetime plans are never changed, whatever trial data they carry
  if (p.never.includes(m.plan_id)) return { action: "skip", reason: "never_changed_plan" };
  if (m.status === "converted") return { action: "skip", reason: "already_converted" };
  // A downgraded member who upgrades again gets the hidden content back, as far as the new plan allows
  if (m.status === "downgraded") {
    if (m.hidden > 0 && [p.plus, p.pro, p.agency].includes(m.plan_id)) return { action: "restore", reason: "upgraded_after_downgrade" };
    return { action: "skip", reason: "already_downgraded" };
  }

  if (!m.status) {
    // A new freelancer on Pro who has no trial data yet: start tracking from the BD signup time
    if (m.plan_id !== p.pro || !m.signup_at) return { action: "skip", reason: "no_trial" };
    const signup = Date.parse(m.signup_at);
    if (!Number.isFinite(signup)) return { action: "skip", reason: "no_trial" };
    if (s.eligibleFrom && signup < Date.parse(s.eligibleFrom + "T00:00:00Z")) return { action: "skip", reason: "signed_up_before_trials" };
    const ends = signup + s.days * DAY;
    // Someone who joined long before the job ran is not given a trial after the fact
    if (ends + s.days * DAY < now) return { action: "skip", reason: "signed_up_before_trials" };
    return { action: "track", reason: "new_pro_signup", ends_at: new Date(ends).toISOString() };
  }

  if (m.status !== "active") return { action: "skip", reason: "unknown_status" };
  // Only plans 7 and 8 are ever downgraded; an active trial member who moved to Agency Business converted
  if (m.plan_id === p.agency) return { action: "convert", reason: "upgraded_to_agency" };
  if (!p.trial.includes(m.plan_id)) return { action: "skip", reason: "not_a_trial_plan" };

  // Converted only with a paid invoice for the plan they are on now (answer 7)
  if (m.invoices.some((i) => i.paid && i.plan_id === m.plan_id)) return { action: "convert", reason: m.plan_id === p.pro ? "paid_pro" : "paid_plus" };

  const ends = m.ends_at ? Date.parse(m.ends_at) : NaN;
  if (!Number.isFinite(ends)) return { action: "skip", reason: "no_end_date" };
  if (ends > now) {
    if (!m.reminded && ends - now <= s.reminderDays * DAY) return { action: "remind", reason: "ends_soon" };
    return { action: "skip", reason: "trial_running" };
  }
  return { action: "downgrade", reason: m.plan_id === p.pro ? "trial_ended_unpaid" : "plus_unpaid_at_trial_end" };
}

// The invoice status line for the admin list: "paid", "unpaid", or "none"
export function invoiceStatus(m: TrialMember): string {
  const mine = m.invoices.filter((i) => i.plan_id === m.plan_id);
  if (mine.some((i) => i.paid)) return "paid";
  if (mine.some((i) => i.open)) return "unpaid";
  return "none";
}

// Free shows this many areas of law; the rest are hidden (never deleted) and come back on upgrade
export function areasToHide(areas: string[], keep: number): { keep: string[]; hide: string[] } {
  return { keep: areas.slice(0, keep), hide: areas.slice(keep) };
}

// The two emails, worded exactly as in Stacey's developer notes (2026-11-06)
export function trialEmail(kind: "ending" | "ended", firstName: string, siteUrl: string, environment: string) {
  const name = (firstName || "there").trim();
  const url = siteUrl.replace(/\/+$/, "") + "/account/upgrade";
  const prefix = environment === "live" ? "" : "[Test site] ";
  const t = kind === "ending"
    ? {
      subject: "Your Pro trial ends in 2 days",
      body: `Hi ${name}, your free week of Lawfecta Pro ends in 2 days. Keep your stronger placement in DELA Member Match, your AI growth assistant, and your services and promotions by adding a payment method today. If you do nothing, your account moves to our Free plan and your profile stays live.`,
      button: "Keep Pro",
    }
    : {
      subject: "Your Pro trial has ended",
      body: `Hi ${name}, your free week of Lawfecta Pro is over and your account is now on the Free plan. Your profile is still live and attorneys can still find you. Your videos, promotions and extra areas of law are saved and come back as soon as you upgrade.`,
      button: "Upgrade to Pro",
    };
  const esc = (x: string) => x.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif;color:#1f2a37">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e3ded5;border-radius:12px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px 8px;font-size:22px;font-weight:bold;line-height:1.3">${esc(t.subject)}</td></tr>
<tr><td style="padding:8px 28px 4px;font-size:15px;line-height:1.6">${esc(t.body)}</td></tr>
<tr><td style="padding:16px 28px 28px"><a href="${esc(url)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(t.button)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: prefix + t.subject, html, text: `${t.body}\n\n${t.button}: ${url}`, button: t.button, url };
}
