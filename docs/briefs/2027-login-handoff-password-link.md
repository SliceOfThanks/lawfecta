# 2027: sharing logins through password.link inside an engagement (evaluation and plan, not built)

Stacey 2026-11-13: "evaluate adding password.link to Lawfecta ... do not build, just plan; this would be a 2027 build". She approved this plan the same day. Her answers to the five questions near the end are still open.

## Context

Stacey has a lifetime deal with API access at https://password.link and asked what it would do for Lawfecta, how it would work, and what it would take to make it part of a working engagement between an attorney and a freelancer. This is an evaluation and a plan only. Nothing is built, and nothing changes on the site.

The need is real. Freelancers often need a login to the firm's systems (Clio, a court e-filing account, a shared mailbox). Today DELA's rule is: logins and passwords never go in DELA. A message with "password: ..." is refused, and the screen says "Share logins through your firm's password manager, never DELA." Many small firms have no password manager, so in practice the login goes by email or text, outside Lawfecta, with no record and no end date.

## What password.link is (from its own documentation, read 2026-11-13)

- A one-time secret link. The secret is locked in the sender's browser. The link has two halves of the key: one half stays in the link itself (after the # sign, which browsers never send to a server), the other half is kept by password.link with the locked text. password.link cannot read the secret by itself.
- When the link is opened, the locked text is deleted from password.link. Options per link: expiry from 1 to 500 hours (about 20 days at most), 1 to 100 views, an extra password, a one-time code sent to the reader's email or phone, allowed countries or IP addresses, and a required "I acknowledge" step.
- API: create, list, change and delete secrets; "secret requests" (ask someone to send you a secret); a notice to our server when a secret is created, viewed or expired (time, IP address and browser of the reader, never the content). With the API the caller must do the locking itself, which suits DELA: it can happen in the attorney's browser.
- Hosted in the EU (Heroku, Europe region). Data encrypted at rest. A GDPR page exists.

Not confirmed, and needed before a decision: what Stacey's lifetime plan includes (secrets per month, custom domain, branding, notices to our server). The public plans run from 8 secrets a month (Free) to 1,000 (Pro), and only Pro clearly lists a custom domain, branding and the API. Also not documented: SOC 2 or ISO, API rate limits, whether the notices to our server are signed, how long an unopened expired secret is kept. The company is small (founded 2016).

## What DELA already has that this builds on

- The confidential area of an engagement, card "Secure document links" (table `conf_links`, migration 0036; `confLinkAdd`, `checkLink` in supabase/functions/api/app.ts; `confCard`, `confLinkForm`, `confLinkRow` in app/dela-app.js). It opens only after both signatures and the first funded milestone, asks for the login code, logs every open, expires links, and closes for the freelancer when the job ends or they are on hold (`dela_conf_access`, `dela_conf_state`).
- The sensitive data check (`blockedKinds` in lib/confidential/rules.ts, `sensitive()` in app.ts).
- The pattern for outside services: a setting picks the provider, the key is a Supabase secret Stacey types in herself, tests use a stand-in (lib/meetings/meet.ts, lib/mail/).
- Feature switches (`feature_switches`, `dela_switch_on`), team alerts (`dela_alert`), the job queue.

An attorney can already paste a share link from their own password manager into "Secure document links". So the gap is only for firms without one.

## Recommendation

Worth building in 2027, as a small addition to the confidential area, behind a switch that is off. It does not replace the rule "logins never go in DELA". It gives firms without a password manager a safe way to follow it.

One honest limit to accept first: DELA would hold the link, and whoever holds the link can open the secret once. So DELA never stores the password, but it does carry the key to a one-time box. The plan reduces that with one view, a short life, a one-time code to the freelancer, and a full record of who opened what and when.

## How it would work

Attorney (or the firm's owner or manager), on the engagement page, confidential area, new card "Logins for this job":
1. Click "Share a login". A panel asks for a name for it ("Clio, paralegal seat"), the login and password, an optional note, and how long the link lives (24 hours, 3 days, 7 days).
2. The panel first says: "Better: give the freelancer their own user account in that system, and share only that." and "Change this password when the job ends."
3. On "Create one-time link" the attorney's browser locks the text. Only the locked text goes to DELA's server, which passes it to password.link. The login and password never reach DELA's server in readable form and are never stored in DELA.
4. DELA keeps: the name, who shared it, when it expires, password.link's number for it, and the link. Never the login or password.

Freelancer, same card:
1. Sees "Clio, paralegal seat: shared by NAME, opens once, expires DATE" and a button "Open once".
2. DELA checks access again at that moment (signed, funded, not on hold, not ended, login code), records the open, then opens the one-time page. password.link sends a one-time code to the freelancer's email before showing it.
3. After that the row reads "Opened DATE". It cannot be opened again. The attorney gets a notice.

When the job ends, is canceled or goes to a dispute: unopened links are deleted at password.link, and the attorney gets a short list: "You shared these logins on this job. Change their passwords or remove the freelancer's access: ...".

Lawfecta Team (admin area): counts only (shared, opened, expired, deleted) and the month's use against the plan's allowance, with an alert near the limit. The team cannot open a link.

Misuse and mistakes covered: a freelancer on hold or after the job ends gets nothing; a second open is refused; the name field is screened so nobody types the password there; a link not opened before it expires shows "Expired, share it again"; password.link down means the panel says so and nothing is half-saved; the freelancer's agency team members only get it if they are on that engagement's team.

## What it needs

1. From Stacey, before any build:
   - The lifetime plan's facts: secrets per month, API included, custom domain, branding, notices to our server. A screenshot of the plan page in her password.link account is enough.
   - A decision that changes a written rule: logins may be shared through Lawfecta's one-time links, in addition to the firm's own password manager. The words in the terms and on the screens change with it.
   - A lawyer's look at the terms wording (who is responsible for a shared login; the firm must end access after the job).
   - password.link added to the privacy policy as a service provider, since the freelancer's email goes there for the one-time code.
   - The API keys typed into Supabase by her (two secrets), never in chat.
2. Build (Claude), following the existing patterns:
   - An adapter `supabase/functions/api/lib/secrets/` with password.link as the first provider (create, delete, list), chosen by a setting, with a stand-in for tests.
   - Locking in the browser (app/dela-app.js) with the browser's built-in crypto, in the form password.link documents (AES-GCM, PBKDF2).
   - One new table for the shared logins of an agreement and its functions, gated by `dela_conf_access`; a new switch `login_handoff`, off; settings for the allowed lifetimes and the monthly allowance.
   - The card in `confCard`, the end-of-job list, notices, the admin counts and the allowance alert.
   - The route that receives password.link's "viewed" notice, protected by a secret in its address and checked against password.link's list, because their notices are not documented as signed.
   - Tests for both sides, misuse and the stand-in; one ChatGPT check; lines in docs/PILOT_CHECKS.md.
3. Later, only if wanted: the freelancer sending a secret back (password.link "secret requests"), files as one-time attachments, viewing inside DELA on Lawfecta's own address.

## Risks to weigh

- A small outside company with no published security certificate holds half of every secret for up to 20 days. Mitigation: short lives, one view, deletion at job end.
- A lifetime deal can end or change. The adapter keeps the provider replaceable.
- Sharing a personal login may break the terms of the system being shared (some court e-filing accounts forbid it). The screen should say so and push "their own user account" first.
- If the monthly allowance is small, heavy use runs out. The alert and a per-engagement cap (for example 5 live logins) cover it.
- A firm may read this as "Lawfecta keeps our passwords safe". The wording must say what it is: a one-time delivery, not a vault.

## Questions for Stacey (answer before the 2027 build)

1. What does your lifetime plan include (secrets a month, custom domain, branding, API, notices)?
2. Should the one-time page open on password.link's page with Lawfecta's branding, or should DELA show the secret itself on lawfecta.co? Suggested: password.link's page first; it is less to build and keeps the secret out of DELA's pages.
3. Which attorney plans get it? Suggested: all paid plans, with a cap per engagement.
4. May the freelancer's email be sent to password.link for the one-time code? Suggested: yes, named in the privacy policy.
5. Should a freelancer be able to send a secret back to the attorney? Suggested: not in the first version.

## How it would be checked when built (2027)

- `tools/local_tests.sh api` with a stand-in for password.link: create, open once, second open refused, expiry, deletion at job end, on-hold freelancer refused, nothing readable in DELA's database or logs.
- Browser tests on GitHub for both sides and a phone.
- One real secret with Stacey's own account before members see it: created in DELA, opened once by the test freelancer, "Opened" shown to the test attorney, gone at password.link.
