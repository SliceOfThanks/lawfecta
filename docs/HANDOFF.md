# Handoff: continue the DELA build in a new chat (2026-11-10)

Read CLAUDE.md, STATUS.md and docs/PLAN.md first, then this file. It holds what the last chat knew that is not written elsewhere: the launch review's fix list, how to deploy to the test site, how to run the tests in a fresh session, and what is waiting on Stacey.

## 1. Where things stand
- Branch: `claude/step-2a-ai-keys-voice-files`. No pull requests unless Stacey asks.
- The MVP (Stacey's 16 items, see STATUS.md) is on the test site, hirelegalhelp.com.
- Test site database: Supabase project "Lawfecta AI" / DELA Staging, ref `ojshgsxgsypbywtqhkch`.
- On the test site: `code_version` = `4cadd48b816ecdc0581055def8d45113b63af7a5`, api function version 78, migrations through 0079, health ok, GitHub Tests green (382 API tests, 26 browser suites).
- Live (lawfecta.com) is not set up. Never touch it.
- Stripe test keys are not set on the test site. No payment or payout has ever gone through Stripe there.
- Pro trial check: switch `bd_trial_downgrade` = everyone, mode dry run. Dry-run day 1 was clean. Days 2 and 3 are still to look at.
- The launch review below was approved by Stacey on 2026-11-10. None of its fixes is made yet.

## 2. The launch review: fixes to make, in order
Every fix is a commit starting "Fix" with a test that fails before the fix, in the same commit. Deploy to the test site only. "Confirmed" means the finding was re-read in the code; the rest came from review agents and should be checked when fixing.

### Part 1: money safety (first)
1. BLOCKER, confirmed. A dispute can point at any milestone, even one from another agreement or one already paid out, and money moves for it.
   - `dela_dispute_open` (`supabase/migrations/0030_engagements.sql`, about line 714) stores `milestone_id` unchecked. `dela_dispute_settle_money` (`0075_dispute_center.sql`, about line 106) pays or refunds it.
   - Fix in a new migration: on open, the milestone must belong to the agreement and be paid and not yet accepted. In settle and in the offer functions, require `m.agreement_id = d.agreement_id` and status `disputed`.
   - Test (disputes_test): a milestone from another agreement, or one already paid out, is refused.
2. HIGH. A timeout on an automatic charge can charge the attorney twice (`app.ts` `chargeOrCheckout` about 3289, `chargeMonth` about 3244). Fix: treat no answer (timeout or 5xx) as "unknown" and look the payment up in Stripe before creating another. In `dela_payment_result`, a second success on an already funded milestone queues a refund and alerts the team.
3. HIGH. The daily retry can pay out or refund twice (`dela_money_retry_failed`, `sendPayouts`, `sendRefunds`): it runs after Stripe has forgotten the idempotency key. Fix: search Stripe for a transfer or refund carrying this payout or refund id (metadata) first; re-send only if none exists.
4. HIGH. A Stripe event is marked handled before it is processed (`app.ts` about 3507). If processing throws, Stripe's retry is dropped as a duplicate. Fix: record `processed_at` only after success; retry unprocessed events.
5. MEDIUM. Overlapping worker runs can send an email twice, and a job that always crashes retries forever (`0002_foundation_functions.sql` about 421, `app.ts` about 4584). Fix: claim one job at a time, respect `max_attempts` on expired leases, claim the email row atomically.
6. MEDIUM. The member webhook address check misses IPv6 forms of internal addresses (`lib/webhooks/deliver.ts` about 34). Fix: normalize the address, block the mapped ranges, connect to the checked IP.
7. LOW. A refund whose payment has no Stripe reference waits forever with no alert: alert the team. The public contact form's per-IP limit trusts `x-forwarded-for`: use the platform's client IP.

### Part 2: disputes are fair
8. HIGH. An answer given while a team question is open is saved as a reply, so the day-14 automatic grant still fires against the person who answered (`0075` about 233 to 243). Fix: the other side's first statement is always the answer; only the person asked clears a question.
9. HIGH. With `dispute_center` on for one side only, the other side cannot answer and loses by default (`app.ts` about 3542). Fix: the dispute follows the opener's switch for both sides; no automatic grant unless the other side could answer.
10. MEDIUM.
    - An engagement never completes when its last milestone is settled by dispute: run the completion check in settle.
    - A former team member can still withdraw a dispute: re-check the role.
    - The review timer re-queues itself hourly while a question is open: stop, and re-arm on reply.
    - New-style disputes still send the old "the team reviews after 14 days" notice: send the new wording.

### Part 3: the DELA guide and the newest features
11. HIGH, confirmed. The guide's free-answer cap is bypassed by re-sending the same `request_id`, because `guideSay` (`app.ts` about 3600) calls the AI before the count is saved. Fix: one SQL call reserves the answer first (refuses a duplicate or over-cap request); only then call the AI. Test (guide_test): the same request id cannot get a second answer or pass the cap.
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

### Order
1. Items 1 and 11, deployed to the test site the same day.
2. The rest of Parts 1 and 2.
3. Parts 3 and 4.
4. Part 5, with the trial push against a throwaway project.
5. The release step: start the "AI review" workflow, deal with its "Must fix" items, record the version with `dela_release_record`, then one ChatGPT money test once the Stripe test keys are in.

### What the review found healthy
Sign-in, sessions, the admin gate, the Stripe webhook signature, the live-key guard, fee math in integer cents, the append-only ledger, file handling and 25+ member routes. No unsafe HTML in the screens. Supabase's security report shows only the by-design "no public access" notes. Background jobs all succeed.

## 3. Waiting on Stacey
- Stripe test setup (docs/STRIPE_SETUP.md). After it: prepare one made-up job and run a test payment, payout, dispute and settlement end to end. This is the only way to prove items 2 to 4 against real Stripe.
- The lawyer's review. The agreement text still starts "DRAFT FOR LAWFECTA'S LAWYER TO REVIEW" and clause 6 has a placeholder (`supabase/functions/api/lib/engagements/agreement.ts`, lines 11 and 18). No real payments before this.
- The undecided numbers. Claude owes her one list with a suggested answer each: AI actions per plan, the fee timing rules, the human review fee, the 90-day maximum engagement, the automate rates, the matching plan boost, agency limits, `fl.services_active`, `trial.eligible_from`.
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
