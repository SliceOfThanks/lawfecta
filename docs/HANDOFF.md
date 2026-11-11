# Handoff: continue the DELA build in a new chat (2026-11-10)

Read CLAUDE.md, STATUS.md and docs/PLAN.md first, then this file. It holds what the last chat knew that is not written elsewhere: the launch review's fix list, how to deploy to the test site, how to run the tests in a fresh session, and what is waiting on Stacey.

## 0. Moving to the new chat, step by step

### For Stacey
1. Go to https://claude.ai/code and start a new session.
2. Choose the repository SliceOfThanks/lawfecta and the branch `claude/step-2a-ai-keys-voice-files`. Use the same environment as the last chat.
3. Paste the starter message below as the first message.
4. Use one chat at a time for the build. Two chats on the same branch overwrite each other.

Starter message:

```
Continue the Lawfecta DELA build on branch claude/step-2a-ai-keys-voice-files.
Read these first, in order: CLAUDE.md, STATUS.md, docs/PLAN.md, docs/HANDOFF.md.
Then do the "First hour" checklist in docs/HANDOFF.md section 0 and tell me what
you found.

The MVP is on the test site (hirelegalhelp.com). I approved the launch review
fix plan on 2026-11-10; the 24 fixes and their order are in docs/HANDOFF.md.
None is made yet.

Start with item 1 (a dispute can point at any milestone, even one already
paid) and item 11 (the DELA guide's free-answer cap can be bypassed). Each is
a "Fix" commit with a test that fails before the fix. Deploy to the test site
only. Then keep going through the list in the order HANDOFF.md gives.

```

### What carries over and what does not
Carries over, because it lives outside the chat:
- Everything in GitHub on this branch: code, migrations, tests, briefs, test prompts, saved test reports, this file.
- The test site and its database (settings, switches, prepared test data).
- The layout mockup, a private page in Stacey's Claude account: https://claude.ai/artifact/JXogiAYYHhjyMp5inwYuH2

Does not carry over:
- The conversation itself. Anything not in GitHub is gone, which is why this file exists.
- The scratch folder. The ready-to-paste test prompts with the passwords filled in were there. Rebuild a ready copy from the GitHub prompt (it says TEST_PASSWORD) and send it to Stacey as a file. Ask her for the test password if a test needs it; never write it in GitHub.
- The local test database and the test server. Section 6 says how to set them up again.
- The task list and the plan file. Sections 2 to 4 and section 13 replace them.

### Connectors the new chat needs
- Supabase: every deploy to the test site goes through it (section 5). Check: list projects and find ref `ojshgsxgsypbywtqhkch`.
- GitHub: reading Tests runs, starting the "AI review" workflow. Check: read the latest "Tests" run on this branch.
- Brevo: checking whether an email was really sent. Only needed for email work.
- If one is missing, tell Stacey which, and that she connects it in her Claude settings under Connectors. Do not ask her for keys or codes.

### First hour (for the new chat, before changing anything)
1. Read CLAUDE.md, STATUS.md, docs/PLAN.md and this file.
2. `git status` and `git log --oneline | head -5`: the tree is clean and this file's commit is at or near the top.
3. Test site check through Supabase: `select value from settings where key = 'code_version'` matches section 1 (or a later commit recorded in STATUS.md), and the health address in section 5 answers `ok:true` and `worker_ok:true`.
4. Set up the local database and run every API test and every browser suite once (section 6). All should pass before the first change. If something fails on an untouched tree, fix the setup, not the code.
5. Tell Stacey in plain words what was found, then start item 1.

## 1. Where things stand
- Branch: `claude/step-2a-ai-keys-voice-files`. No pull requests unless Stacey asks.
- The MVP (Stacey's 16 items, see STATUS.md) is on the test site, hirelegalhelp.com.
- Test site database: Supabase project "Lawfecta AI" / DELA Staging, ref `ojshgsxgsypbywtqhkch`.
- On the test site: `code_version` = `1c10633f85b61e6b16967858d8f4f6228c31f3af`, api function version 88, migrations through 0086, health ok (390 API tests, 26 browser suites).
- Live (lawfecta.com) is not set up. Never touch it.
- Stripe: Stacey made a Stripe sandbox ("DELA sandbox", acct_1UaFzpCqJgxv1pm2, test mode), connected it to Claude as a connector, and on 2026-11-10 put STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Supabase. The sandbox has one webhook to the test site's /stripe/webhook address; it listens to every event type (DELA ignores the ones it does not use; on Live choose only the 7 in docs/STRIPE_SETUP.md). Not yet proven: no payment or payout has gone through. Next: Stacey confirms the admin Payments tab says "Stripe is connected in test mode", then run docs/tests/step-6-chatgpt-prompt.md (check its button names against the code first) and compare with Stripe through the connector (read only; never create webhooks or keys through it, since that would put a secret in chat).
- Pro trial check: switch `bd_trial_downgrade` = everyone, mode dry run. Dry-run day 1 was clean. Days 2 and 3 are still to look at.
- The launch review below was approved by Stacey on 2026-11-10. Done and on the test site: item 1 (migration 0080), item 11 (migration 0081), items 8, 9 and 10 (migration 0082, commit 765791d). The rest is open; next is Part 1 items 2 to 7.

## 1b. The first Stripe run (2026-11-10) and where it stopped
Report: docs/reviews/test-reports/2026-11-10-stripe-first-payment.txt. Test: docs/tests/stripe-first-payment-chatgpt-prompt.md.
- Proven: the attorney paid milestone 1 of "Repeat: Run a Conflict Check" on Stripe Checkout ($165 with the fee), the webhook marked it paid within 30 seconds, and the admin Payments tab shows it. Agreement `be4b3b1e-b2d7-4f5f-b6a6-7102cef979ff`, gig `64ed7250-64b3-4423-a4f1-e0e890da40dc`. Milestone 1 is "Paid: ready to start"; milestone 2 is not paid.
- Failed, then fixed (commits 8de36bb and e6402b5, migrations 0083 and 0084): "Set up payouts with Stripe" did nothing, because Stripe refuses the v1 Accounts API for new Connect platforms. Payout accounts are now created, onboarded and read through Accounts v2 (`stripeV2`, `recipientAccount`, `onboardingLink`, `accountStatusV2` in `lib/payments/stripe.ts`; version header from the setting `stripe.accounts_api_version`, default in `STRIPE_V2_VERSION`). A failure now stays on the Payouts card.
- What is known from the sandbox: Stripe accepted the v2 create call and the version header, and asked for a contact email, which is now sent. NOT yet proven: the create call with the email, the onboarding link, the status read after onboarding, and a transfer to a v2 account. Stripe's documentation site is not reachable from the cloud session, so the v2 request shapes come from memory and from the error messages; expect one or two more corrections. Read the `detail` field of `/payouts/setup` when it fails.
- Update 2026-11-11: her re-test failed at the setup link (docs/reviews/test-reports/2026-11-11-stripe-payout-retest.txt). She then allowed Claude to act as the test freelancer, for the payout routes only. Found and fixed (commit 5ebc292): Stripe refuses a `configurations` field on the link ("Unknown field"). Now proven in the sandbox: the account is created (`acct_1UaOIZCqJg7BO9lg`), the link comes back, and the status read works (Stripe lists what it still needs). A failed setup raises a `payments` alert with Stripe's reason. A not-yet-set-up account reads "Needs details" with plain words (`needWords`, `accountStatusV2`). Proven by Stacey's second re-test (docs/reviews/test-reports/2026-11-11-stripe-payout-retest-2.txt, 5 of 5 PASS): Stripe's setup page filled in and the status "Ready". Still NOT proven: a transfer to the freelancer and a dispute refund. From that report, fixed: back from Stripe, the Earnings card keeps asking Stripe for about 30 seconds and updates by itself (Stripe needs a few seconds). Still open from it: "Check my payout status" reloads the whole page; the DELA screens were not readable by ChatGPT's page text tools (the shadow root), worth an accessibility check with a screen reader. Both Claude test sessions are revoked.
- Acting as a test account needs Stacey's yes each time, for a named purpose. She declined it once and allowed it once.
- Not checked yet: whether Stripe still sends `account.updated` for v2 accounts (DELA reads the status when the freelancer returns and on "Check my payout status", so it does not depend on it).
- From the report, still open: `site.url` has no "www" but the return from Stripe worked; "Held now" on the admin Payments tab counts made-up prepared jobs, so it is larger than "Charged" (clean up the prepared test data, section 4); the freelancer who runs an agency also sees Agency, Library and Projects tabs, so the tab list in AGENT-RULES.md is incomplete for that account; the gig link without `&view=agreement` opens the Details tab; "Check my payout status" gives no message when nothing changed.

## 1b-2. The money path is proven in the Stripe sandbox (2026-11-11)
With Stacey's yes, Claude acted as the two test accounts (sessions marked "Claude test run", all revoked afterwards) on agreement `be4b3b1e-b2d7-4f5f-b6a6-7102cef979ff`, and compared each step with Stripe through the connector:

| Step | DELA | Stripe |
|---|---|---|
| Attorney pays milestone 1 (Stacey's ChatGPT run) | $165 charged, fee $15 | Checkout paid, webhook received |
| Freelancer sets up payouts (Stacey's ChatGPT run) | Ready | account `acct_1UaOIZCqJg7BO9lg`, transfers active |
| Freelancer delivers; DELA's check | 50, then 80, then 100 of 100 after the statement covered the document's quality points | |
| Attorney accepts milestone 1 | payout $142.50 sent ($7.50 fee) | transfer `tr_1UaPfeCqJgxv1pm2ciSvbEtP`, 14250, to that account, metadata payout_id |
| Next milestone charged to the saved card | $150 succeeded, no second fee | `pi_3UaPffCqJgxv1pm20SiHW0BL` |
| Attorney disputes milestone 2, freelancer offers $50, attorney accepts | release $50, refund $100, engagement completed | transfer `tr_1UaPgfCqJgxv1pm2x5lMjwn1` 4750; refund `re_3UaPffCqJgxv1pm20JBnneOq` 10000 succeeded, metadata refund_id |

Found while checking, not fixed yet: a dispute release writes no `freelancer_fee` row in `ledger_entries` (the $2.50 fee on the $50 release is in `payouts.fee_cents` only), so the admin "Freelancer fees" total misses fees from disputes. Add the ledger row in `dela_dispute_settle_money` with a test.

Not proven in the sandbox: a declined card, a bank (ACH) payment, a chargeback, a monthly engagement, an agency split payout. The automated tests cover them with a stand-in only.

## 1c. THE CURRENT PLAN: pilot on lawfecta.co with live payments (Stacey's decisions, 2026-11-10)
This replaces the two-site design (test site, then Live) and the earlier two-stage triage. Stacey approved this plan.

**Her decisions**
- hirelegalhelp.com is renamed to lawfecta.co and becomes the pilot site, on its current database (Supabase `ojshgsxgsypbywtqhkch`). lawfecta.com is not part of this.
- 10 to 50 invited members.
- Live payments, through Lawfecta's existing live Stripe account (the one whose keys are in Brilliant Directories).
- No test copy during the pilot: fixes go straight to pilot members after the automated tests pass. Claude recommended a separate clean pilot database with the current one kept as a test copy; she chose not to.
- The contract goes live as drafted with the DRAFT line removed. No lawyer reviewed it. This replaces her November 7 rule (lawyer first). Done in commit after ce9890e.
- She declined Claude acting as the test accounts with a made session. Tests go through her.

**Part A: before any real payment (code, in this order)**
1. DONE 2026-11-11: payout setup, a payout, the next charge on the saved card and a dispute refund are proven in the Stripe sandbox (section 1b-2).
2. Launch items 4 and 2 are DONE. Next: item 3, then 5 (section 2). Also the small ledger gap in section 1b-2.
3. DONE: launch item 19 (`stripe_test` from `/agreements/get`; the note shows only on a test key) and the contract's draft line.

**Part B: turn the test site into the pilot site**
4. List what the `environment` setting changes before switching it to live: file uploads need a virus scanner outside staging (`app.ts`, the function near "virus_scan_not_set_up"), worker and admin checks, the trial emails, the "Test site" label. Give Stacey the list with a recommendation each.
5. The new address. DONE 2026-11-11: lawfecta.co and www.lawfecta.co are allowed next to hirelegalhelp.com (`DEFAULT_ORIGINS`, `lib/meetings/meet.ts`); the DELA_ORIGINS secret is not set on the site, so the code's list applies (checked with a live request). Stacey switched the domain on 2026-11-11. Checked from the database that day: https://lawfecta.co answers and shows DELA; https://www.lawfecta.co fails its certificate check (http://www.lawfecta.co answers), so BD's certificate does not cover www yet; https://www.hirelegalhelp.com no longer answers. Later the same day the www certificate was fixed and both https://www.lawfecta.co and https://lawfecta.co answer and show DELA. The `site.url` setting on the pilot database is now `https://www.lawfecta.co`, the address Stacey named (set by hand; migrations 0011 and 0012 still seed the old address, and 31 lines in the tests use it, so a migration plus test updates is a follow-up). Every test prompt in docs/tests still has hirelegalhelp.com links: replace them with https://lawfecta.co before the next ChatGPT test. Waiting on Stacey: her 3-step check (log in, open DELA, open the admin Payments tab). Later wording clean-up: the admin area's wording about two copies, the sign-in help text in `shared/dela-core.js`. Stacey updates the DELA_ORIGINS secret.
6. Widgets never load code from `@main` (the part of item 21 that still applies).
7. Items 22 and 23: no email marked sent while the sender is "log"; unsubscribe link, List-Unsubscribe header and a postal address setting on reminder and alert emails.
8. Clear the test data: write the script, show Stacey what is kept (settings, switches, tech catalog, starter library, staff roles, her owner account) and what is removed, confirm a backup, and run it only when she approves at that moment. It cannot be undone.
9. Switch plan: access list only; payments on after Part A and Part C; member webhooks off; trial check in dry run; gig alerts on only after step 7.
10. With no test copy: GitHub Tests green before anything goes on the site; note the previous `code_version` and function version for a go-back; money changes at quiet hours; database changes additive; uptime monitor, backups and one restore drill before members come in.
11. Rewrite CLAUDE.md (one site, the new address), docs/LIVE_READINESS.md and docs/PLAN.md for one site. Launch items 18 and 20 are dropped (no push between sites, same BD plan numbers).

**Part C: Stacey's steps (give each in full when its turn comes)**
- Stripe live account: Stacey says Connect is already set up on it and its keys are in Brilliant Directories (2026-11-11). Still needed for DELA: a secret key for DELA (a new restricted or secret key, entered by her in Supabase, never copied through chat), the live webhook with the 7 events, both secrets in Supabase, then the `live_payments` switch.
- The domain change in Brilliant Directories, the DELA_ORIGINS secret, Brevo sender and domain records.
- One small real payment, payout and refund by her before members are invited.
- The pilot members' BD member numbers for the access list.

**Later:** items 6, 7, 12 to 17, 25, 27, the layout, the remaining ChatGPT tests, an outside security test before going beyond the pilot group.

## 2. The launch review: fixes to make, in order
Every fix is a commit starting "Fix" with a test that fails before the fix, in the same commit. Deploy to the test site only. "Confirmed" means the finding was re-read in the code; the rest came from review agents and should be checked when fixing.

### Part 1: money safety (first)
1. DONE 2026-11-10 (commit b250f5c, migration 0080). BLOCKER, confirmed. A dispute can point at any milestone, even one from another agreement or one already paid out, and money moves for it.
   - `dela_dispute_open` (`supabase/migrations/0030_engagements.sql`, about line 714) stores `milestone_id` unchecked. `dela_dispute_settle_money` (`0075_dispute_center.sql`, about line 106) pays or refunds it.
   - Fix in a new migration: on open, the milestone must belong to the agreement and be paid and not yet accepted. In settle and in the offer functions, require `m.agreement_id = d.agreement_id` and status `disputed`.
   - Test (disputes_test): a milestone from another agreement, or one already paid out, is refused.
2. DONE 2026-11-11 (commit 1c10633, migration 0086; `chargeSaved`, `chargeUnanswered`, `noAnswer`, `findCharge`, `dela_payments_unanswered`; the safety net is in `dela_payment_result`, answer field `double`). Not covered: a second paid charge for a monthly period (`dela_period_payment_result`) has no automatic refund yet; the retry with the same key and the daily check do cover monthly charges. HIGH. A timeout on an automatic charge can charge the attorney twice (`app.ts` `chargeOrCheckout` about 3289, `chargeMonth` about 3244). Fix: treat no answer (timeout or 5xx) as "unknown" and look the payment up in Stripe before creating another. In `dela_payment_result`, a second success on an already funded milestone queues a refund and alerts the team.
3. HIGH. The daily retry can pay out or refund twice (`dela_money_retry_failed`, `sendPayouts`, `sendRefunds`): it runs after Stripe has forgotten the idempotency key. Fix: search Stripe for a transfer or refund carrying this payout or refund id (metadata) first; re-send only if none exists.
4. DONE 2026-11-11 (commit c949857, migration 0085: `dela_provider_event_begin` and `dela_provider_event_done`, column `provider_events.processed_at`). HIGH. A Stripe event is marked handled before it is processed (`app.ts` about 3507). If processing throws, Stripe's retry is dropped as a duplicate. Fix: record `processed_at` only after success; retry unprocessed events.
5. MEDIUM. Overlapping worker runs can send an email twice, and a job that always crashes retries forever (`0002_foundation_functions.sql` about 421, `app.ts` about 4584). Fix: claim one job at a time, respect `max_attempts` on expired leases, claim the email row atomically.
6. MEDIUM. The member webhook address check misses IPv6 forms of internal addresses (`lib/webhooks/deliver.ts` about 34). Fix: normalize the address, block the mapped ranges, connect to the checked IP.
7. LOW. A refund whose payment has no Stripe reference waits forever with no alert: alert the team. The public contact form's per-IP limit trusts `x-forwarded-for`: use the platform's client IP.

### Part 2: disputes are fair
8. DONE 2026-11-10 (migration 0082). HIGH. An answer given while a team question is open is saved as a reply, so the day-14 automatic grant still fires against the person who answered (`0075` about 233 to 243). Fix: the other side's first statement is always the answer; only the person asked clears a question.
9. DONE 2026-11-10 (migration 0082, new function `dela_dispute_center_open`). HIGH. With `dispute_center` on for one side only, the other side cannot answer and loses by default (`app.ts` about 3542). Fix: the dispute follows the opener's switch for both sides; no automatic grant unless the other side could answer.
10. DONE 2026-11-10 (migration 0082). MEDIUM.
    - An engagement never completes when its last milestone is settled by dispute: run the completion check in settle.
    - A former team member can still withdraw a dispute: re-check the role.
    - The review timer re-queues itself hourly while a question is open: stop, and re-arm on reply.
    - New-style disputes still send the old "the team reviews after 14 days" notice: send the new wording.

### Part 3: the DELA guide and the newest features
11. DONE 2026-11-10 (commit 0e93a99, migration 0081, new function `dela_guide_reserve`). HIGH, confirmed. The guide's free-answer cap is bypassed by re-sending the same `request_id`, because `guideSay` (`app.ts` about 3600) calls the AI before the count is saved. Fix: one SQL call reserves the answer first (refuses a duplicate or over-cap request); only then call the AI. Test (guide_test): the same request id cannot get a second answer or pass the cap.
12. MEDIUM. Reminder emails skip new attorneys: the `firm` and `agency_profile` steps are missing from the step list in `dela_guide_daily`.
13. MEDIUM. Add indexes: `gig_matches(person_id)`, `gig_invitations(freelancer_id)`, `gigs(org_id, status)`, `gigs(playbook_id)`.
14. MEDIUM. "Use all suggestions" also applies suggestions the member dismissed (`app/dela-app.js` `helperFindings`): track used and dismissed.
15. LOW. `dela_agency_profile_org` has no ORDER BY (someone who manages two agencies gets an arbitrary one). Saving the agency profile drops DELA's drafted prices. The sensitive-data check on save skips practice areas and tools.

### Part 4: the Pro trial check (before switching Dry run to Live)
16. HIGH, not confirmed. `lib/trial/bd-live.ts` `user()` and `posts()` (about 72 to 77 and 144 to 150) do not check that BD's answer is for the member asked for. Fix: refuse any record whose user id differs. Test (trial_bd_test).
17. MEDIUM. A member whose trial had already ended when first seen is downgraded with no reminder (`lib/trial/rules.ts` about 49 to 58). Fix: the first sighting always gives the reminder period.

### Part 5: the first push to Live works
18. BLOCKER. The first push fails its own health check, because health needs the worker to have run (`tools/promote.mjs` `liveHealthy`, `0008_safety_nets.sql`). Fix: wait up to about 3 minutes for health on a first push. Also do one trial push against a throwaway project; the deploy step has never run for real and there is no `supabase/config.toml`.
19. BLOCKER, confirmed. Payment screens always say to use Stripe's test card (`app/dela-app.js` about 5786 and 5819). Fix: show it only when `me.environment !== "live"`. Browser check for it.
20. HIGH. Test-site plan numbers are seeded into Live: `bd.plan_aliases` (10, 11) and `trial.allowances` (7, 8, 9) from migrations 0073, 0068 and 0003. Fix: the first push sets both empty on Live; add them to the Live checklist.
21. HIGH, confirmed. The widgets fall back to `data-api-staging` and to code from `@main` (`widgets/DELA-App.php` about 44, and the other two). On lawfecta.com that would send sign-in passes to the test database. Fix: commit Live copies of the widgets with no fallback; refuse to load on a non-test domain without an address; never load from `@main`.
22. HIGH. Emails are marked "sent" while `email.sender` is "log" (`lib/mail/index.ts`). Fix: on Live, "log" marks them not sent and the admin area warns.
23. MEDIUM. Tie the sign-in pass audience to the site (it says only "dela" for both). Add an unsubscribe link, a List-Unsubscribe header and a postal address to emails. Remove hirelegalhelp.com from the default allowed websites on Live.
24. Docs. Update docs/LIVE_READINESS.md: 79 migrations; the switches the MVP needs (`dispute_center`, `onboarding_widget`, `gig_alerts`, `library_workspace`); the secrets list (`PUBLIC_API_URL`, `LIVE_SITE_URL`; no `STAGING_API_URL` on Live); the DELA-Security widget install. Update docs/PLAN.md.

### Part 6: decisions from Stacey's answers (2026-11-10)
25. NEW, approved by Stacey. Charge the attorney's 5% fee with each milestone payment, not all of it with the first payment.
    - Today `dela_payment_start` (`0030_engagements.sql` about line 458) adds the whole `agreements.attorney_fee_cents` to the 'start' payment, and a cancel before the start refunds it (about line 686).
    - Write a brief first (docs/briefs, from TEMPLATE.md): how the fee is spread over milestones in whole cents (same rule as the freelancer fee: leftover cents on the last one), the minimum per side, monthly engagements, agreements already signed (keep their old timing), refunds, disputes, the agreement text and the payment screens.
    - The setting `fees.attorney_fee_timing` now says `with_each_milestone`; no code reads it yet.
26. On Live, set `trial.eligible_from` to the Live launch date at the first push (Stacey). Add it to docs/LIVE_READINESS.md with item 20.
27. BD lookups from Stacey (test site): Active is status value 2 (`trial.bd_active_value` is set). Post type codes 1 (Member Listings), 2 (Area of Law) and 3 (Member Reviews) are BD built-ins that do not show in the post type list. Code 73 is in the `data_settings` list (post types a plan may publish) of Agency Business (9), Agency Business Lifetime (11) and Attorney Business (14) and matches no post type on the site; Stacey's BD lookup on 2026-11-10 found nothing with that ID, most likely a deleted post type. Members get nothing from it, and DELA's trial check works with post type names (video, promotion, article), so nothing in DELA depends on it. The other IDs: 7 Promotion, 13 Video, 15 Community Article, 71 Discussion, 0 a placeholder. Plus shows 10 areas of law and Community Articles only (`trial.allowances` is set).

### Order
1. Items 1 and 11, deployed to the test site the same day.
2. The rest of Parts 1 and 2.
3. Parts 3 and 4.
4. Part 5, with the trial push against a throwaway project.
5. The release step: start the "AI review" workflow, deal with its "Must fix" items, record the version with `dela_release_record`, then one ChatGPT money test once the Stripe test keys are in.

### What the review found healthy
Sign-in, sessions, the admin gate, the Stripe webhook signature, the live-key guard, fee math in integer cents, the append-only ledger, file handling and 25+ member routes. No unsafe HTML in the screens. Supabase's security report shows only the by-design "no public access" notes. Background jobs all succeed.

## 3. Waiting on Stacey
- Stripe test setup: done by Stacey 2026-11-10 (see section 1). Still to do: prepare one made-up job and run a test payment, payout, dispute and settlement end to end. This is the only way to prove items 2 to 4 against real Stripe.
- The lawyer's review. The agreement text still starts "DRAFT FOR LAWFECTA'S LAWYER TO REVIEW" and clause 6 has a placeholder (`supabase/functions/api/lib/engagements/agreement.ts`, lines 11 and 18). No real payments before this.
- The undecided numbers: done. Stacey approved all 43 on 2026-11-10 (config/decisions.json, docs/Decision_Sheet.md). Six items wait on her lawyer: the 45-day wait before a team review, automatic acceptance, the second chargeback rule, recording consent, transcript use, and Stripe live mode.
- Her answers to the 8 layout questions (docs/briefs/step-12-layout.md). The mockup is a private page in her Claude account (6 boards).
- Her look at the Library workspace (step 8b Part B).
- Confirming no real members are on hirelegalhelp.com, since test-site alerts email every member there.

## 4. Other open items
- Pro trial check: read dry-run days 2 and 3. Then the two BD values (the hidden post type codes; the "Active" status value) through a BD connector prompt, then switch to Live on the admin Trials tab.
- Clean up test data on the test site and merge this branch into main before beta.
- A "next step" tool for the guide in the ChatGPT and Claude connector.
- Leftover tests from the 0.10.0 review.
- Live setup, in order: the Live Supabase project (US region) and its secrets; the GitHub "live" environment; Brevo sender and domain records; four widget installs on lawfecta.com; link the eight plans; uptime monitor, backups and one restore drill; Stripe live keys, then one real payment and refund.

## 5. How to deploy to the test site
The session's network cannot reach jsDelivr, so the database fetches the files.
1. Commit and push.
2. Supabase `execute_sql` on `ojshgsxgsypbywtqhkch`:
   `select net.http_get('https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@<sha>/' || p) from unnest(array['<file>', ...]) p;`
   Then read `net._http_response` by id (status 200 and a sensible length).
3. A migration: `apply_migration` with a DO block that selects `content` from `net._http_response` where id = N, compares `encode(extensions.digest(convert_to(r.content,'UTF8'),'sha256'),'hex')` with the local `sha256sum`, then `execute r.content`.
4. `deploy_edge_function`: name `api`, `verify_jwt` false, one file `index.ts`. Copy the current one with `get_edge_function` and change only the commit id in its two imports (`app.ts` and `lib/files/storage.ts`).
5. `update settings set value = to_jsonb('<sha>'::text) where key = 'code_version';`
6. Health: `select net.http_get('https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/health')`, then read the response. Expect `ok:true` and `worker_ok:true`.

## 6. How to run the tests in a fresh session
The local database does not survive between sessions; set it up again.
- Postgres 16 on port 55432, run as a non-root user (the last chat used a user `pgrun` with data in `/home/pgrun/data`; create both with `initdb` if missing):
  `su pgrun -c "/usr/lib/postgresql/16/bin/pg_ctl -D /home/pgrun/data -o '-p 55432 -k /tmp' -l /home/pgrun/log start"`
  It can stop between turns. Start it again on "Connection refused".
- `export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres; tools/dbtest.sh` rebuilds the database.
- API tests: `npx deno test -A $(sed -n 's/.*run: npx deno test -A //p' .github/workflows/tests.yml)`
- Browser tests: stop any running `tests/pw/server.ts`, run `tools/dbtest.sh`, start `npx deno run -A tests/pw/server.ts` (port 8787), then `SHOTS=<folder> node tests/pw/<name>-test.js` for each suite in the order in `.github/workflows/tests.yml`.
- After every edit: `python3 tools/rules_check.py` and `python3 tools/decisions.py --check`.

Things that bit the last chat:
- Test session tokens must start with `ds_`.
- All suites share one database. Use BD member numbers no other test uses (disputes 4800 and 4801; guide 4900 to 4904), and set any setting a test depends on inside that test.
- New SQL functions need `revoke all ... from public, anon, authenticated` and `set search_path = public, extensions, pg_temp` (zz_security_test checks).
- To change an existing SQL function in a new migration: `pg_get_functiondef`, `replace`, raise if nothing changed, `execute`.
- `agreement_versions`, `ledger_entries`, `guide_events` and similar tables are append-only.
- `ai_usage.task` has a check constraint: a new AI task name needs a migration that widens it.
- A saved ChatGPT report must have its long dashes replaced before commit, or the rules check fails.

## 7. Test accounts and prepared data on the test site
- Test freelancer: stacey+dela-freelancer@lawfecta.com (fl_business, runs "Roe Test Agency LLC").
- Test attorney: stacey+dela-attorney@lawfecta.com (att_pro).
- New attorney: hello@legalstacey.com (BD member 690, att_pro).
- Owner: Stacey's own account (admin area).
- Passwords are never written in GitHub. Test prompts in GitHub say TEST_PASSWORD; the ready-to-paste copy sent to Stacey in chat has them filled in. Ask her if needed.
- Prepared data: three jobs named "Test job: Dispute ... (prepared)" (their agreements have milestones only, so parties and fees show "-"; history is append-only, so they stay), and "Test job: Guide new gig (prepared)" (gig `e2552eed-94fd-48bf-adb6-fa33bd913d9d`, made-up firm BD 999013). A normally made agreement to open in tests: gig `64ed7250-64b3-4423-a4f1-e0e890da40dc`.

## 8. Stacey's decisions from the last chat (do not ask again)
- Logo (2026-11-08): the round gradient mark only, wherever the name Lawfecta shows. Also in emails from DELA, on the Security page, in Word and PDF exports, and as the browser tab icon. The files she sent are used as they are for now.
- DELA guide (2026-11-09): a chatbox on the Dashboard that opens with a proactive prompt. It is free for members (Lawfecta's key, with a daily cap from settings). Members can switch it and its reminders on and off. Reminders go in the guide, by email and in the Notices bell. For attorneys it goes all the way to a posted gig.
- MVP (2026-11-09): test site, fully tested. The fee stays 5% from the attorney plus 5% from the freelancer, with the minimum per side from settings. Plan limits are enforced (`usage_limits_enforced` = everyone on the test site). Agencies get their own agency profile with DELA's help.
- Launch review (2026-11-10): the fix plan in section 2 is approved.
- Older decisions are in docs/briefs (each brief has her answers), config/decisions.json and the Decision Sheet.

## 9. What the last chat built
All of it is on the test site and covered by tests.

**The logo (commit 4086ebf)**
- `brand/lawfecta-mark-96/192/512/864.png` is the round mark used everywhere.
- `shared/dela-core.js`: `D.logo(root, size)` returns the image and sets the tab icon when the page has none.
- `app/dela-app.js` `brand()` and the admin top bar show the logo plus "DELA" or "DELA Admin".
- `supabase/functions/api/lib/brand/logo.ts` (logo for emails and exports) and `lib/brand/docx.ts` (Word header), used by the document and playbook exports. `lib/email.ts` `logoRow`; `app.ts` `codeLogo(ctx)`.
- Test: `supabase/functions/api/brand_test.ts`.

**Step 13, the DELA guide (commits 7df7f02 and c5f582a; migrations 0076 and 0077)**
- Brief: docs/briefs/step-13-dela-guide.md.
- 0077: tables `guide_prefs`, `guide_events` (append-only), `gig_alerts_sent`; functions `dela_guide_state`, `dela_guide_mark`, `dela_guide_prefs`, `dela_guide_prefs_set`, `dela_gig_open_alerts`, `dela_gig_alerts_send`, `dela_guide_daily`, `dela_admin_guide_report`. Settings `guide.ai_replies_per_day`, `guide.snooze_hours`, `gig_alerts.max_per_day`, `gig_alerts.min_reasons`, `gig_alerts.default_on`. Switches `onboarding_widget` and `gig_alerts`.
- `lib/guide/guide.ts`: `pickStarters`, `guideMessage(state)`, `GUIDE_SYSTEM`, `guidePrompt`, `readGuideReply`. Attorney steps: firm, pick_task, approve_playbook, delegate, continue_delegation, verify, post_gig, invite, review_proposals, next_task. Freelancer steps: restricted, profile, agency_profile, verify_linkedin, availability, invitations, new_gigs, first_proposal, verify_waiting, teach.
- `app.ts`: `guideGet`, `guideSay`; routes `GET /guide`, `POST /guide/mark`, `/guide/prefs`, `/guide/say`; admin `/admin/guide`; the worker job `gig_alerts`.
- Screens: `guideBox()` at the top of both Home pages in `app/dela-app.js`; `guideCard()` on the admin Overview.
- Tests: `guide_test.ts`, `tests/pw/guide-test.js`. ChatGPT prompt: docs/tests/step-13-dela-guide-chatgpt-prompt.md.

**MVP additions (commit aa650fb; migration 0078)**
- 0078: table `agency_profiles`; functions `dela_agency_profile_org`, `dela_agency_profile_missing`, `dela_agency_profile_get`, `dela_agency_profile_save`, `dela_agency_public`; patches to `dela_guide_state` (the firm step, the agency_profile step, practice areas read from the firm profile) and `dela_proposals_agency` (adds the profile).
- `app.ts`: `AGENCY_SYSTEM`, `agencyProfileDraft`; routes `GET` and `POST /agency/profile`, `POST /agency/profile/draft`.
- Screens: `agencyProfileCard()` on the Agency tab; attorneys see the profile on agency proposals.
- Test: `agency_profile_test.ts`.

**Fixes from Stacey's two ChatGPT runs (commits da36811 and 4cadd48; migration 0079)**
- 0079: Talent's skill filter also searches services, headline and summary.
- `helperFindings` in `app/dela-app.js`: the "Use all suggestions" button, and a shared reason shown once.
- The account button shows the email's first letter when there is no name; the greeting has no ", there"; approved documents say "Ready to use (approved)"; the agency card keeps "Saved." and updates its missing line as boxes are filled.
- Reports: docs/reviews/test-reports/2026-11-09-mvp-chatgpt.txt and 2026-11-09-mvp-retest.txt. Prompts: docs/tests/mvp-chatgpt-prompt.md and mvp-retest-chatgpt-prompt.md.

**Test fixes:** disputes browser test uses its own members (0ed34bd); meetings browser test picks the date with the most times (d5d2d42); the trial test's two runs always overlap (756c260).

## 10. Code patterns to follow
- AI that is free for the member: call the model on Lawfecta's key and record it with `logUsage`, under a cap from settings. `guideSay` and `agencyProfileDraft` in `app.ts` are the examples.
- AI that counts against the plan: `runAi(ctx, s, idem, system, msgs, credits)`.
- Never fall back to Lawfecta's key when a member's own key fails.
- Text a member types that may reach the AI or be saved for others to read goes through `await sensitive(ctx, s, text, place)` first; it returns a refusal to send back, or null.
- A new number (price, fee, limit, deadline) goes in config/decisions.json; then run `python3 tools/decisions.py` to regenerate the seed migration and the Decision Sheet.
- A new feature ships behind a switch that is off on Live.
- Screens are built with the `D.*` helpers in `shared/dela-core.js` (styles in `D.CSS`), inside a shadow root. No HTML strings from member text.
- Tables are reached only through SQL functions called by the `api` function with the service role.

## 11. Problems already solved (do not debug these again)
- GitHub Tests were red after step 11: the disputes browser test reused the agency test's members. It has its own now.
- The meetings browser test failed late in the UTC day. It now uses the date with the most free times.
- "Draft with DELA" for teams was not recorded: the usage table's task list had to be widened (0076). Any new AI task name needs the same.
- The agency draft turned "Texas" into "TE". States are accepted only as real two-letter codes.
- The LinkedIn setting is changed by another test file, so the guide test sets it itself.
- A playbook that already has a gig is not suggested again by the guide.
- Step 14 of the first MVP run showed "-" for parties and fees. That came from prepared dispute agreements with milestones only, not from DELA. Use gig `64ed7250-64b3-4423-a4f1-e0e890da40dc` for agreement checks.
- The Library button is "Create a document"; the screen it opens is titled "New document". Check every button name against the code before sending a test.
- After a worker restart, leaving plan mode can answer "You are not in plan mode". Stacey had approved in each case; carry on.

## 12. The launch date evaluation given to Stacey (2026-11-10)
- Not ready to launch today.
- Sound now: sign-in, sessions, the admin gate, who can see what, sensitive data rules, file handling, fee math, the ledger.
- Not safe yet: payments and payouts (section 2, Part 1, and never run against real Stripe), disputes (Part 2), the guide's answer cap, the first push to Live, emails with no unsubscribe link or postal address, the agreement text still marked as a draft.
- Earliest closed beta on Live with payments still in test mode: about November 24. It needs all the code fixes (about 5 to 7 working sessions), the Live setup, and Stacey's ChatGPT tests that have never been run: Steps 4, 5, 6, 7, 2d and 2e (prompts in docs/tests). Expect a round of fixes from each.
- Earliest real money: early to mid December. It also needs a real Stripe test-mode payment, payout, refund and dispute, the lawyer's sign-off, her approval of the undecided numbers, Stripe live keys, and one real payment and refund by her. One to two weeks of beta use first is recommended.
- Not covered by the review: no outside security firm has tested DELA (one outside penetration test is recommended before real payments), no load test, and only 6 of the 24 findings were confirmed by a second reading.
- These dates are estimates. Update this section when they move.

## 13. Open tasks carried over
- The Pro trial check: connect the real BD endpoints after Stacey's BD check (docs/handoff/bd-api-trial-check.md and its report), read dry-run days 2 and 3, then switch to Live on the admin Trials tab.
- The Library workspace (step 8b Part B): waiting on Stacey's look (docs/tests/step-8b-part-b-review-by-hand.md), then its ChatGPT check.
- Leftover tests from the 0.10.0 review: the sign-in backstop, review and pay action reasons, the monthly correction, schedule wording, the Inbox hint.
- Attorney team seats: 2027 roadmap only, feasibility review first. Do not build.
- The layout (step 12): waiting on her 8 answers before any build.

## 14. Working with Stacey (the rules that matter most in practice)
CLAUDE.md has all of them. The ones most often needed:
- Plain words. No long dashes. End every update with "What you need to do next", "Next steps in general", "What I'll build next".
- Every step she does is spelled out in full with the exact link and where on the page, every time.
- Anything in Brilliant Directories is one ready-to-paste prompt for her BD connector, in a code block. Widget code installs go by hand.
- A ChatGPT test is one prompt: the "How to work" block from docs/tests/AGENT-RULES.md, steps written as Go to, Find, Do, Expect, grouped so each account logs in once, with earlier states prepared by Claude on the test site. Send the ready copy as a file; the GitHub copy says TEST_PASSWORD.
- Secrets never go in chat. She enters them in Supabase herself.
- Do a step yourself whenever a tool allows it.
