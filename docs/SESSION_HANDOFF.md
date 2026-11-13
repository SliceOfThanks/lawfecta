# Session handoff (written 2026-11-12, after go-live)

Read this first in a new session, then CLAUDE.md, STATUS.md and docs/PLAN.md. Start with section 0: this project is now worked on locally, never in a cloud session. This file says where things stand, how to work, and what is open. Older background is in docs/HANDOFF.md.

## 0. This project is worked on LOCALLY from now on (Stacey 2026-11-12)
Stacey's instruction: use Claude Code on her own computer only, never a cloud session. Do not start, suggest or hand work to a cloud or remote session, a scheduled cloud task, or a remote agent. If a tool offers one, do not use it.

The earlier sessions ran in a cloud container, so parts of this file describe that container. Where they differ, this section wins.

**What a local session needs on her computer.** Check each one at the start and say plainly what is missing; I could not check her computer from the cloud session.
- The repository cloned, on the branch `claude/step-2a-ai-keys-voice-files`, pulled to the newest commit. Git must be able to push to SliceOfThanks/lawfecta (her own GitHub login or the `gh` tool).
- Python 3 (the rules check and the decisions tool; a hook in `.claude/settings.json` runs `tools/rules_check.py` after every edit).
- Node.js with `npm install` run once in the repository (it brings Deno and Playwright as test tools; Playwright also needs its browser: `npx playwright install chromium`).
- For the tests only: Postgres 16 reachable as PGHOST, PGPORT, PGUSER (the scripts default to 127.0.0.1, port 55432, user postgres), with the `psql` command. Without it, code can still be edited and released, but nothing can be tested first; do not release untested code.
- The Supabase connector, set up in her local Claude Code and signed in to the project "Lawfecta AI" (ref ojshgsxgsypbywtqhkch). Every release and every check of the live site goes through it. Without it, a release is not possible; say so and stop.
- Optional: the Stripe connector (read only) and a GitHub connector or the `gh` tool.

**What is different from the cloud notes below.**
- Section 6 names a user `pgrun` and a data folder under /home/pgrun. Those exist only in the old container. Locally, start Postgres the way her computer does it and set PGHOST, PGPORT and PGUSER to match.
- The old container could not reach cdn.jsdelivr.net or the Supabase function address. Her computer can, so the health address and the script files can also be checked with a browser or curl. The release steps in section 5 still fetch the files from inside the database; keep doing that, because the hash check depends on it.
- Files for her (a test prompt with the password filled in, a SQL file to paste) are saved in a folder on her computer that is NOT inside the repository, so the test password never reaches GitHub. Tell her the full path.
- The commit trailer's session line is only for sessions that have a link; leave it out when there is none.
- Secrets still never go in chat, GitHub or files. She types them into Supabase herself.

## 0b. Newer than this file (2026-11-13)
Since this handoff was written: step 17 (Talent by the website's categories) and Subscription fixes were released from Stacey's Mac. Then step 18 part 1 (Talent redesign). Then part 2 (the profile page). Then parts 3 and 4 with bookmarks. Then step 19 (the Subscription redesign). Then step 20 (Talent "Load more", the match-ready progress card) and five sample freelancers (BD members 697 to 701, tools/demo_freelancers.sql; plus ten DELA-only samples 998000001 to 998000010, tools/demo_freelancers_more.sql; remove all fifteen with tools/demo_freelancers_remove.sql before real members arrive). Then the "Save my picture" button on the Profile page (browser code only). Then the line on the Profile page that says whether attorneys can see the freelancer in Talent. Then step 21 (firm logo, the client card for freelancers) and step 22 (Talent and profile revised to mockup 02 of Stacey's annotated package). Then step 23 (an introductory call before a gig, booked in the conversation before a gig). Then step 24 (the booked call shown in its conversation) and the Vectera connection rewritten to Vectera's API reference (unproven, no key set). Open question to Stacey: switch meetings to VideoSDK (docs/research/vectera-meetings-evaluation.md). Then step 25 part 1: meetings on VideoSDK (Stacey's decision 2026-11-13), joined inside DELA; her keys are in Supabase and the first real room was made. Part 2 (recording, transcripts) waits for her answers in docs/briefs/step-25-videosdk-meetings.md. Then step 25 part 2 (transcripts, to her five answers) and step 26 (team logo take-down, pictures in lists). Then step 27 ("Report this meeting"). Site: code_version 4a64183, api version 119, migrations through 0119. Stacey authorized releasing without asking (memory: release-without-asking). ChatGPT checks waiting for her are listed in docs/tests/RUN-NEXT.md. The app can refuse apply_migration and deploy_edge_function; ask Stacey for her go-ahead and try again. Her Mac has git push (gh), Python, Node, Postgres.app 16 (test server on port 55432, started by tools/local_tests.sh) and no PHP, so browser suites run on GitHub only. STATUS.md has the details.

## 1. The one-paragraph state
DELA is LIVE on https://www.lawfecta.co (one site, one database, the pilot). The setting `environment` is "live", live payments are on, Stripe is connected in live mode, the test money was cleared, and members can sign up by themselves at https://www.lawfecta.co/join. No real member has signed up or paid yet. The last thing built and released is step 16: the "Subscription" page and the limit banner. Stacey has not yet looked at that page on the site.

## 2. Who you work for and how she wants it
- Owner: Stacey (stacey@lawfecta.com). Not technical. She clicks in Brilliant Directories (BD), Supabase, Stripe and HetrixTools; she does not run tests.
- Her standing instructions, in her words:
  - "i need you to finish building this MVP and only stop if you need me to test with chatgpt or approve something critical"
  - "stop with "What I'll build next" just build it unless it is something critical i need to test"
- So: build without asking when no decision is needed. End every update with two headings only: "What you need to do next" (numbered, every step spelled out with the exact link, the place on the page and the button name in quotes) and "Next steps in general". No third heading.
- Writing for her: plain, direct, no em dashes, no "it's not X, it's Y". She often writes in capitals and sends screenshots; that is her normal style.
- She reacts badly to being second-guessed on things she knows (for example which Stripe account is hers). Ask once, accept the answer.
- Anything she must do in BD is one ready-to-paste prompt for her BD connector in a code block (see CLAUDE.md). Widget code installs go by hand.
- ChatGPT tests: follow CLAUDE.md and docs/tests/AGENT-RULES.md exactly (the "How to work" block, Go to / Find / Do / Expect, each account logs in once, freelancer then attorney then owner). The test password (demo1234) only goes in READY copies in the scratchpad sent with SendUserFile; GitHub copies say TEST_PASSWORD.
- Critical actions that need her words at that moment: clearing or deleting data on the site, anything in Stripe, acting as one of her accounts (a yes each time, for a named purpose), changing a business number.
- No pull requests unless she asks. Work on the branch below. A stop hook requires committing and pushing before a turn ends.

## 3. Repo, branch, where things are
- Repo SliceOfThanks/lawfecta, branch `claude/step-2a-ai-keys-voice-files`. Latest commit at handoff: 37ddf80 plus this file.
- Code: `app/dela-app.js` (member app), `admin/dela-admin.js`, `shared/dela-core.js` (styles, shared parts), `app/dela-security.js`, `supabase/functions/api/app.ts` (the one Edge Function, with `lib/`), `supabase/migrations/0001` to `0102`.
- Business numbers: `config/decisions.json`; after editing run `python3 tools/decisions.py` (it rewrites docs/Decision_Sheet.md, the Word sheet and migration 0003) and `python3 tools/decisions.py --check`. Careful: `tools/decisions.py --help` also writes the files.
- Rules check: `python3 tools/rules_check.py` (no em dashes in anything people read, no dollar figures typed in code, and more). Never weaken a rule.
- Commits: bug fixes start with "Fix" and carry a test that fails before the fix. End every commit message with:
  `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>` and `Claude-Session: <the session link>`. No model names anywhere else in the repo.
- Feature briefs: `docs/briefs/` (step 16 is `step-16-subscription.md`). Test prompts: `docs/tests/`. Her checklist: `docs/STACEY_TODO.md`. Go-live record: `docs/PILOT_GO_LIVE.md`.

## 4. The live site, exactly
- Supabase project "Lawfecta AI", ref `ojshgsxgsypbywtqhkch`. This is the only database. CLAUDE.md still describes two copies (Staging and Live, hirelegalhelp.com and lawfecta.com); that plan was replaced on 2026-11-10 by one pilot site on www.lawfecta.co. STATUS.md has the current truth.
- At handoff: `code_version` = 37ddf80fc7e72a9135e6768112abefce02d9fe7c, api function version 105 pinned to that commit, migrations through 0102, health "ok", environment "live".
- Settings that matter: `access.mode` = "everyone" (any website member with a linked plan gets in; the access list is not needed), `usage.warn_pct` 80, `usage.upgrade_url` /account/upgrade, the three `account.*_path` settings are empty on purpose.
- Switches: `new_layout` everyone, `live_payments` everyone, `fee_per_milestone` everyone (her decision of 2026-11-10; it stays on), `confidential_materials` OFF (Live refuses those uploads until a virus scanner is set: `confidential.scan_provider`, secrets CONF_SCAN_URL and CONF_SCAN_TOKEN).
- Stripe: her account named "DELA" (acct_1UaLeLED9tapDimK; Connect belongs to it). A full-access live key is in Supabase as STRIPE_SECRET_KEY and the webhook signing secret as STRIPE_WEBHOOK_SECRET. Payout schedule is Manual. The key in BD is a different one and must not be touched or rolled; BD bills memberships, DELA moves job money. The Stripe connector in Claude only sees the old sandbox; never create keys or webhooks through it.
- BD: sign-in, email, password, plans and plan billing all belong to BD. All eight plans are linked (BD plan ids: Attorney Free 5, Plus 13, Pro 12, Business 14; Freelancer Free 3, Plus 7, Pro 8, Business 9). Every plan redirects to /dela after sign-up and after login. Sign-up pages: www.lawfecta.co/checkout/<plan id or slug>; the public page /join lists all eight. Her list of plans and what each can switch to: docs/reference/lawfecta-plan-links-2026-11-12.txt. Plans DELA does not list as cards: Pro Founding Member, Agency Business Lifetime, Claim Listing.
- Accounts on the site: 7, all hers or test. BD 686 Stacey (owner), 687 DELA Test Attorney (now on Attorney Pro), 688 DELA Test Freelancer. Test data kept as reference on purpose: 27 gigs, 19 proposals, 17 documents, 10 agreements with no money.
- Uptime monitor: HetrixTools, her free account. "DELA Health" checks https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/health every minute with GET and the keyword "ok":true; "Lawfecta website" checks www.lawfecta.co. She must log in there at least every 90 days.

## 5. How to release to the site
1. Run the tests (section 6), `tools/rules_check.py`, `tools/decisions.py --check`. Commit and push.
2. Fetch the files at the commit from inside the database (Supabase `execute_sql`):
   `select p, net.http_get('https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@<sha>/' || p) id from unnest(array['supabase/migrations/NNNN_x.sql','supabase/functions/api/app.ts','app/dela-app.js','admin/dela-admin.js','shared/dela-core.js']) p`
3. A migration goes in with `apply_migration`: a DO block that checks every fetched id returned 200, that `encode(extensions.digest(convert_to(r.content,'UTF8'),'sha256'),'hex')` equals the local `sha256sum` of the file, then `execute r.content`. Use a dollar tag other than the one inside the file.
4. Only when `app.ts` or a file under `lib/` changed: `deploy_edge_function`, name `api`, `verify_jwt` false, one file `index.ts` identical to `supabase/functions/api/index.ts` except that the two import lines point at `https://cdn.jsdelivr.net/gh/SliceOfThanks/lawfecta@<sha>/supabase/functions/api/app.ts` and `.../lib/files/storage.ts`.
5. `update settings set value = to_jsonb('<sha>'::text) where key = 'code_version'`.
6. Health: `select net.http_get('https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/health') id`, then `select pg_sleep(5); select status_code, left(content,200) from net._http_response where id = <id>`.
7. Update STATUS.md and docs/PLAN.md, commit, push.
Migrations are additive. To change wording inside existing SQL functions, use the pattern in 0099: `pg_get_functiondef`, `replace`, raise if nothing changed, `execute`.

## 6. Local tests
- Postgres 16 on port 55432. It stops by itself now and then; start it with:
  `su pgrun -c "/usr/lib/postgresql/16/bin/pg_ctl -D /home/pgrun/data -o '-p 55432 -k /tmp' -l /home/pgrun/log start"` and export `PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres`. "Connection refused" or "Internal S... is not valid JSON" in a browser suite means it is down.
- `tools/dbtest.sh` rebuilds the test database (dela_test) from all migrations.
- API tests: the `npx deno test -A ...` line in `.github/workflows/tests.yml` (400 tests at handoff).
- Browser suites (27, in the order listed in the workflow): `pkill -f tests/pw/server.ts; tools/dbtest.sh; (nohup npx deno run -A tests/pw/server.ts > server.log 2>&1 &); sleep 12; SHOTS=<dir> node tests/pw/<name>-test.js`. The server serves local files in place of jsDelivr. `tests/pw/workspace-test.js` (113 checks) covers the new layout, the account card, the admin sidebar, the Switches page, Subscription and the banner.
- The scratchpad helpers (`fullrun.sh`, `t2.sh`) lived in the old session's scratchpad and are gone in a new one; rebuild them from the commands above.
- The old cloud container could reach www.lawfecta.co but not cdn.jsdelivr.net or the Supabase function address, which is why checks went through the database with `net.http_get`. A local session can reach all three directly (see section 0).

## 7. What was done in the last session (newest first)
- Step 16: "Subscription" menu item under "Profile" (/dela?tab=subscription): current plan with price and platform fee, usage bars with "Nearing the limit" and "Limit reached", what the plan allows, the four plans of the workspace with "Your current plan" and "Upgrade to" or "Downgrade to" buttons that open /account/upgrade in a new tab. A yellow banner after login when any limit is at or above 80%, with "View subscription" and "Dismiss" (back at the next login). Migration 0102, route GET /subscription, functions `subscriptionView`, `limitBanner`, `quotaLines` in app/dela-app.js.
- "Account and security" card: no button opens the BD dashboard any more. Email change goes through the Lawfecta Team (Help); password shows three numbered steps (sign out, "Forgot Password? Click to Reset Password" on the login page, emailed link). Reason: /account/contact, /account/password and, when signed in, /login/retrieval all land in the BD dashboard, which she does not want members sent into. Migrations 0100, 0101.
- Admin Switches page: sections A to Z with a shaded heading and one line each, switches A to Z inside, search and an on/off filter. Card and table headings use the menu's berry pink (`--head: var(--pink)`).
- Go-live: test money cleared with tools/pilot_clear_money.sql (she ran it twice in the Supabase SQL Editor), live key and webhook in, live_payments on, site marked live. tools/pilot_clear.sql is the older, far wider script and is marked DO NOT RUN.
- The name at the top reads LAWFECTA (admin: LAWFECTA ADMIN). Phone bottom bar re-checks its place continuously (`checkBar`, `visibleBottom`, `setLift`); she confirmed it shows on first load.
- New layout ChatGPT test: 20 of 21 passed; step 17 was a narrow browser window, no defect.
- All 52 older test prompts checked against the new screens; 26 carry an "Open point" line at the top. None should be sent again before its test states are prepared again.
- Migration 0099: notices, emails and alerts say "page" and "Settings" where they said "tab", "AI settings", "Dashboard".

## 8. Open items, in order of importance
1. Stacey has not yet looked at the Subscription page on the site. Ask for her view of https://www.lawfecta.co/dela?tab=subscription, then write one short ChatGPT check for it (both workspaces).
2. The live Stripe key and the webhook secret are unproven. She chose to skip real test payments ("if staging payments worked we are fine"). At the first real payment, compare with Stripe at once: one `payments` row, the ledger lines, and one `provider_events` row with a verified signature. A wrongly pasted webhook secret shows as refused events in the function logs.
3. First self sign-up: when she names a tester, check their `people` and `side_profiles` rows (right plan, plan_mapped true in the sign_in audit row) and that they landed on /dela.
4. Leftover test jobs: the test attorney's Home shows three "Pay milestone 1" rows from prepared test agreements. With live payments on, paying one would charge a real card. She was asked "remove the test jobs that ask for payment" or leave them; no answer yet.
5. The password reset by email was not tested end to end after the BD redirect to /dela was set. She was asked to try it once.
6. Pro trial downgrade (`bd_trial_downgrade`): built, but it runs against a stand-in for BD. It needs her BD check before it changes real plans. Task 52.
7. A virus scanner before `confidential_materials` goes back on.
8. One restore drill with her (docs/RUNBOOK.md).
9. The fuller pilot ChatGPT test: every paid test job was cleared, so prepare states first (acting as test accounts needs her yes).
10. Optional third HetrixTools check on a DELA script file, to catch a loading gap (she was offered "add the script check").
11. Deliberately left: task 77 extra tests; removing the old layout code one release after the new layout went on for everyone; attorney team seats (2027); a confirmation step when a member changes their sign-in email (2027, through BD).

## 9. Things that bit us (read before you repeat them)
- Supabase `execute_sql` with a DELETE asks Stacey to approve, and that approval box did not reach her; the call times out after 60 seconds and must not be retried in the same turn. For destructive SQL, give her a file with the safety line already on top and have her run it in the Supabase SQL Editor (https://supabase.com/dashboard/project/ojshgsxgsypbywtqhkch/sql/new). Plain SELECT and UPDATE went through.
- Right after a release the DELA page failed to load for her for a few minutes, then worked. The server was healthy and received no browser request in that time, so the page failed before DELA started; the likely cause is jsDelivr fetching the new commit near her. Tell her to wait a minute and reload after a release, and avoid needless releases.
- "Held now" on the admin Payments page is summed from milestone statuses, not from payments. Prepared test agreements with milestones marked paid showed money that did not exist. The clearing script now removes those too.
- A setting or switch changed by hand needs its own history and audit rows (`settings_history` needs old_status and new_status; `dela_audit(...)`).
- The session can be put in plan mode by her app. In plan mode only the plan file may be edited; answer questions directly, and use ExitPlanMode when there is work to approve.
- Do not claim something is verified on the site when it was only seen locally. Say which it was.
- The health address answers only GET. A monitor set to HEAD reports DELA down.

## 10. Where to look for more
- STATUS.md: the running record, newest sections at the top.
- docs/PLAN.md: what is done, what needs testing, what is next.
- docs/STACEY_TODO.md: her checklist with full steps.
- docs/PILOT_GO_LIVE.md: clearing, Stripe, marking live, with dates.
- docs/STRIPE_SETUP.md, docs/RUNBOOK.md, docs/MVP_OVERVIEW.md, docs/ROADMAP.md.
- docs/reviews/test-reports/: her ChatGPT reports.
