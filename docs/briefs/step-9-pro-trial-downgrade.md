# Feature brief: Pro trial on signup and automatic downgrade to Free

Step: 9 (BD plans)   Spec references: developer notes from Stacey 2026-11-06; trial settings trial.* in config/decisions.json
Status: answered by Stacey 2026-11-07. Built 2026-11-08 with a stand-in for BD (below). Next: the read-only BD API check, then Claude connects the real BD endpoints.

## Who
New freelancers on hirelegalhelp.com (the test site), later lawfecta.com. Plans in BD (website ID 24325): Free (3), Plus (7), Pro (8), Agency Business (9), Pro Founding Member (10), Agency Business Lifetime (11). The Lawfecta Team (owner) watches the runs.

## What
- Every freelancer signs up on Pro (8) with BD's 7-day no-card trial.
- If they do not pay by the end of day 7, DELA moves them to Free (3), keeps them Active, cancels the unpaid trial invoice and the Pro subscription, hides content Free cannot have (videos, promotions, community articles, areas of law past the first 3), and emails them.
- If they pay, upgrade to Agency Business, or move to Plus and pay, they are "converted" and never touched.
- When a downgraded member upgrades later, the hidden content comes back as far as the new plan allows.

## Where
- Brilliant Directories admin (Stacey): signup links and pricing buttons point to the Pro signup page, the Free card says "Start free for 7 days", and Free's public signup page is turned off.
- DELA: a daily job at 2:00 AM Pacific, a check for one member when they sign in to DELA, users_meta values on the member, a log the owner can read in the admin area, and two emails.

## When
Signup starts the trial. 2 days before the end: the "trial ending" email. After day 7: the downgrade within 24 hours. Paying at any time before that converts it.

## Why
Members see every paid feature before deciding to pay. Nobody skips the trial by joining on Free. Nobody stays on Pro unpaid, and nobody is hidden as Past Due.

## What the code check found (2026-11-06)
1. DELA calls only five BD endpoints today: user get, user update, user fields, the areas-of-law tree and the email outbox. Nothing reads or writes users_meta, invoices, subscriptions or posts. Each new endpoint must be allowed on the BD API key (BD admin, API keys), or BD answers 403.
2. DELA learns a member's plan only from the DELA-Auth sign-in pass (subscription_id and the signup date). Every DELA sign-in overwrites the DELA plan with BD's. So the downgrade has to change BD itself, and the sign-in check must run before DELA reads the plan.
3. DELA only knows members who have opened DELA at least once. A freelancer who signs up and never opens DELA is invisible to a daily job unless DELA can search BD members by plan and signup date.
4. DELA already has its own trial (switch "trials", off): 7 days of Pro allowances inside DELA from the BD signup date. It never changes the BD plan. The new trial should replace it, so there is one trial, not two.
5. No BD plan is linked to a DELA plan yet (the admin Plans tab maps them). STATUS.md calls 3, 7 and 8 Bronze, Silver and Gold; the test attorney and freelancer are on plan 3.
6. No API has been found that sends a BD email template. DELA can send the same words through the BD email outbox it already uses.
7. The 2:00 AM run fits the daily job pattern (Pacific time, once per day, safe to run twice).

## How it could go wrong
- An endpoint DELA needs does not exist in BD's API (cancelling an invoice or a subscription is the most likely gap). Then that step needs a different route or stays manual.
- A paying member downgraded by mistake. Guard: check for a paid Pro invoice at the moment of the change, skip anything not "active", and start with a dry run that only lists who would change.
- Half-done downgrade (plan changed, invoice not canceled). Guard: each step is recorded, and the next run finishes the missing steps without repeating the done ones.
- An attorney with trial data by mistake. Guard: only plans 7 and 8 with dela_trial_status = active, and never plans 5, 12, 13 or 14 (checked again at the moment of the change).
- Plans 10 and 11, admin-created accounts and test accounts are never touched (no dela_trial_status).
- Hidden content: unpublishing posts and areas of law changes the public listing. Restore must use the saved list, never guess.

## Settings and switches it uses
- A new switch "bd_trial_downgrade", off until Stacey turns it on, and the admin setting "Trial downgrade mode" (Dry run by default, or Live). Dry run logs and changes nothing.
- DELA's own "trials" switch is turned off and removed from the plan logic.
- Settings: trial.days (7), trial.reminder_days (2), the BD plan IDs (pro 8, free 3, plus 7, agency 9, and the never-touch list 10 and 11), the free areas-of-law limit (3), and the run time (2:00 AM Pacific).

## Questions to make it better
1. Attorneys: are attorneys also on plans 3, 7, 8 on this BD site, or do they have their own plans? (The test attorney is on plan 3.) The downgrade must only ever touch freelancers.
2. Members who never open DELA: may DELA search BD members (by plan and signup date) so the daily job finds them? This needs the BD "search users" permission on the API key. Without it, only members who opened DELA are checked.
3. BD permissions: before any build, may Claude run a read-only check of BD's API (like the email outbox check) to confirm which endpoints exist for users_meta, invoices, subscriptions and posts? Then you allow those on the API key.
4. Emails: BD email templates do not seem reachable from the API. Is it OK to send the same subject, words and button through DELA's emails (they go out through BD's email outbox, from the same sender)?
5. One trial: should this replace DELA's own "trials" switch, so DELA's allowances follow the BD plan only?
6. First run: dry run on the test site for a few days (it lists who it would downgrade and why, and you check the list in the admin area), then real changes. Agreed?
7. "Converted" by moving to Plus (7) and paying: if they move to Plus but the Plus invoice is unpaid at day 7, should they go to Free too?
8. Who gets the run log: the admin area only, or also an email to you when someone is downgraded?

## Stacey's answers (2026-11-07)
1. Attorneys have their own BD plans: Attorney Free (5), Attorney Plus (13), Attorney Pro (12), Attorney Business (14). Plans 3, 7, 8, 9, 10 and 11 are freelancer plans only. The test attorney (user 687, "DELA Test Attorney") is on plan 3 only because it was created before the attorney plans existed: move it to plan 5. The job only touches members with subscription_id 7 or 8 AND dela_trial_status active. Hard guard: the job never changes a member on plans 5, 12, 13 or 14, even with trial data (attorneys never get a trial).
2. Yes: DELA may search BD members by plan and signup date, so the daily job finds members who never open DELA. Stacey is adding "search users" to the API key.
3. Yes: a read-only check of BD's API before any build, for users_meta, invoices, subscriptions and posts. Claude sends the list of endpoints and permissions; Stacey allows them on the key. No changes during the check.
4. Yes: the two emails ("Your Pro trial ends in 2 days" and "Your Pro trial has ended") go through DELA's emails, out through BD's email outbox from the same sender, with the subject, wording and button exactly as in the original notes.
5. Yes: the BD plan is the only source of truth. Turn off DELA's own "trials" switch and remove it from the plan logic. DELA allowances follow the BD plan only.
6. Yes: dry run on hirelegalhelp.com for 3 days. Each run lists every member it would downgrade or mark converted, the condition that matched, the plan, the trial end date and the invoice status, shown in the DELA admin area. After 3 clean days, switch to real changes with the admin setting "Trial downgrade mode" (Dry run or Live).
7. A member counts as converted only when a paid invoice exists for the plan they are on. A trial member who moved to Plus (7) with the Plus invoice still unpaid at the end of day 7 goes to Free (3) too, and the unpaid Plus subscription and invoice are canceled the same way as Pro.
8. Every run is logged in the DELA admin area. On a day with at least one downgrade, one summary email goes to stacey@lawfecta.com listing each downgraded member's name, user ID and trial end date. No email on days without downgrades, and never one email per member.

## What is built (2026-11-08)
- The rules in code (supabase/functions/api/lib/trial/rules.ts): who is tracked, reminded, converted, moved to Free or given content back, and the hard guard that never changes plans 5, 12, 13, 14, 10 or 11. The plan is checked again from BD right before it changes.
- The run (lib/trial/run.ts): Dry run lists and changes nothing; Live does the steps in the order of the developer notes (plan to Free, cancel the subscription, cancel the unpaid invoices, make the member Active, hide videos, promotions and community articles and areas of law past the first 3, set dela_trial_status to downgraded, send "Your Pro trial has ended"). Each finished step is recorded, so a run that stops halfway is finished by the next run without repeating a step.
- The emails with the developer notes' exact subject, words and button, sent through DELA's mail adapter (BD's email outbox). One summary email to the owner on a run that moved at least one member to Free; none on other runs.
- The daily run at 2:00 AM Pacific behind the switch bd_trial_downgrade (off), the sign-in backstop (the same check for one freelancer when they sign in, once a day), and a "Run the check now" button.
- The admin area, Trials tab: the mode ("Trial downgrade mode", Dry run or Live, with history), the run log, and every member the last 3 runs would change or changed, with the reason, plan, trial end date and invoice status.
- DELA's own "trials" switch is off and no longer used by the plan logic: DELA allowances follow the BD plan only.
- Migration 0068; tests: supabase/functions/api/trial_test.ts (10), the Trials tab in tests/pw/usage-test.js.
- Waiting: the BD endpoints. Until they are connected, a run records "BD not connected yet" and changes nothing. One suggested setting to confirm: trial.allowances (what comes back when a downgraded member upgrades to Plus).

## Success looks like
- A new freelancer from any signup button is on Pro (8) with dela_trial_status active and dela_trial_ends_at 7 days out.
- An unpaid trial member is on Free (3), Active, with no unpaid invoice, within 24 hours after day 7, with both emails sent.
- A member who pays stays on Pro, converted.
- Plans 10 and 11 and members without dela_trial_status never change.
- Running the job twice changes nothing more.
