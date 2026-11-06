# Feature brief: Pro trial on signup and automatic downgrade to Free

Step: 9 (BD plans)   Spec references: developer notes from Stacey 2026-11-06; trial settings trial.* in config/decisions.json
Status: draft, questions for Stacey. Nothing is built until she answers.

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
- Attorneys share BD plan numbers with freelancers. Guard: only the six freelancer plans above, and only members with dela_trial_status = active.
- Plans 10 and 11, admin-created accounts and test accounts are never touched (no dela_trial_status).
- Hidden content: unpublishing posts and areas of law changes the public listing. Restore must use the saved list, never guess.

## Settings and switches it uses
- A new switch "bd_trial_downgrade", off until Stacey turns it on, with a dry-run setting (on by default) that logs and changes nothing.
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

## Success looks like
- A new freelancer from any signup button is on Pro (8) with dela_trial_status active and dela_trial_ends_at 7 days out.
- An unpaid trial member is on Free (3), Active, with no unpaid invoice, within 24 hours after day 7, with both emails sent.
- A member who pays stays on Pro, converted.
- Plans 10 and 11 and members without dela_trial_status never change.
- Running the job twice changes nothing more.
