# Build status (read this first in a new session)

Last updated: 2026-10-27. Phase 1A, Step 0 (setup) and Step 1 (foundation) built, tested, and deployed to DELA Staging. Live not created yet.

## Staging (deployed 2026-10-27)
- Project: Lawfecta AI organization, project ref ojshgsxgsypbywtqhkch (us-west-2). This project is DELA Staging.
- API address: https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api (filled into data-api-staging in DELA-App and DELA-Admin).
- Migrations 0001 to 0008 were applied by Stacey in the SQL Editor as one file (the connector only recorded 0001). 0009 applied by the connector.
- api function deployed (verify_jwt false). Worker cron returns 200 every minute; dela_health worker_ok true.
- code_version is set with: update settings set value = to_jsonb('<commit>'::text), version = version + 1, updated_at = now() where key = 'code_version'.
- Security advisors 2026-10-27: rls_enabled_no_policy is by design. function_search_path_mutable fixed by 0009. pg_net in public cannot be moved (not relocatable); harmless. rls_auto_enable() is Supabase's own, not DELA's.
- This sandbox cannot reach supabase.co over HTTPS (proxy 403). Check Staging through execute_sql (dela_health(), net._http_response).
- Waiting on Stacey: BD_SHARED_SECRET in Staging secrets and DELA-Auth line 11; her BD member ID (bootstrap.owner_bd_member_id) and two test member IDs.

## BD site and install (BD report 2026-10-28)
- DELA's BD site is www.hirelegalhelp.com (BD site 24325), reached by Stacey's local MCP "BD-lawfecta-dela". Not lawfecta.com. Stacey: use only BD-lawfecta-dela.
- BD member IDs: Stacey 686 (stacey@lawfecta.com), test attorney 687, test freelancer 688. All on Bronze (plan 3, free, publicly searchable).
- BD plans: 3 Bronze free; 7 Silver $17/mo or $170/yr; 8 Gold $35/mo or $350/yr; 4, 5, 6 inactive. Payment gateway not visible to the MCP.
- BD cannot send email on request from outside, so DELA email uses Brevo (Stacey to confirm).
- Widgets: DELA-Auth 17, DELA-App 18, DELA-Admin 19 (commit dc29d72). Pages: /dela 19, /dela-admin 20 (members only, no menu, noindex).
- api default origins now include hirelegalhelp.com; migration 0011 sets site.url to https://www.hirelegalhelp.com.
- Workflow: docs/WORKFLOW.md (build session here, BD session with the MCP on Stacey's computer).

## Release Control (0.2.0, built 2026-10-27; brief docs/briefs/step-1b-release-control.md)
- Migration 0010, api-0.4.0, tools/promote.mjs watch and auto go-back, admin tab "Release Control" (first tab; the old Releases tab is folded into it).
- Codes: dela_release_code_request then dela_release_approve_coded. Code rides in a send_code job and is wiped after sending. Needs email.sender other than log, or text (alerts.sms_to + BREVO_API_KEY). Otherwise password only, shown on the dashboard.
- Watch: claim returns watch_minutes; promote.mjs reports /release/step, /release/watch, /release/watch-end; finish saves live.project_ref if empty.
- Staging worker checks Live each minute (live.project_ref) through /health and /release/status (RELEASE_CI_SECRET needed on Live too). dela_live_status_save alerts after 3 bad checks.
- tools/dbtest.sh now stops at the first failed SQL check (before, a failed SQL file did not fail the run).

## Rule from Stacey (2026-10-26)
The current Lawfecta site stays unchanged while DELA is built. Only additions: pages /dela and /dela-admin, widgets DELA-Auth, DELA-App, DELA-Admin.
No BD plans are created until launch; test accounts get DELA plans with "Give a side" in the admin area. Existing widgets (Profile Builder, Profile Audit, services, promotions, pitches, Member Match) are not edited; DELA versions are built next to them.

## Release gate (Stacey, 2026-10-26): staging first, only Stacey pushes to Live
- Claude deploys to Staging only. Live changes only through Releases tab > Push to Live (owner + release password, version marked tested).
- 0007_release_gate.sql: releases, release_password (bcrypt hash), release_approvals (one-use, 15 minutes, only a hash stored). Five wrong passwords lock for 30 minutes and email the owner.
- api-0.2.0: /admin/releases, /admin/releases/password, /tested, /push, /rollback; /release/claim and /release/finish for GitHub (header x-dela-ci = RELEASE_CI_SECRET). Push dispatches .github/workflows/promote.yml (secrets GITHUB_REPO, GITHUB_DISPATCH_TOKEN on Staging).
- tools/promote.mjs: claim, checkout commit, apply unapplied migrations to Live (tracked in dela_schema_migrations), deploy api, set code_version, health check, report. On failure after deploy it redeploys the previous commit and restores code_version.
- GitHub setup needed: environment "live"; variables STAGING_API_URL, LIVE_PROJECT_REF; secrets RELEASE_CI_SECRET, SUPABASE_ACCESS_TOKEN (Stacey creates the token).
- Widgets 1.1.0: data-api-staging used until data-api (Live) is filled in after the first push.
- Honest limit: anyone with Supabase or GitHub admin access (including Claude's connectors) could bypass the button. The rule in CLAUDE.md, the audit log, and keeping SUPABASE_ACCESS_TOKEN only in GitHub secrets are the guards. Strongest option: put Live in a Supabase organization Claude's connector cannot see.

## Release decisions approved by Stacey (2026-10-26, "Yes build")
1. Live in its own Supabase organization (Lawfecta DELA Live) that is never connected to Claude. Claude never sees Live.
2. No GitHub reviewer step for now (add when the Lawfecta Team grows).
3. Nobody but Stacey can push.
4. Password: 12+ characters, change any time, 5 wrong tries lock for 30 minutes.
5. Settings, switches, plans and access list are changed directly in the Live admin area by owners; code and database changes only by push.
6. Push emails go to owners only.
7. Pushes any time.
8. Ticking tested does not need a report, but Claude saves the ChatGPT report with each version (dela_release_attach_report).
First owner of Live: bootstrap.owner_bd_member_id, set by promote.mjs from GitHub variable OWNER_BD_MEMBER_ID; works only while no owner exists. Claude sets it on Staging the same way.
Setup steps for Stacey: docs/STACEY_CHECKLIST.md (Parts A to D).

## Safety nets (Stacey, 2026-10-26: build all recommendations), migration 0008, api-0.3.0
- Going back checks compatibility (releases.contract_migrations; dela_release_compatible, dela_release_approve_checked).
- Undo per setting change (dela_admin_undo_setting); restore an earlier plan version with the release password (dela_admin_plan_restore).
- Emergency pause: settings emergency.pause {all, ai, checkout, payouts, renewals, external, email}; dela_paused(area) for later features; members get route paused / 503; email jobs are postponed while email is paused.
- Releases need notes (20+ characters) and a passing GitHub Tests run URL; promote.mjs refuses commits without a successful "tests" check run.
- Health: /health returns 503 when the worker has not run for 10 minutes (worker.last_run heartbeat). Daily summary at 8am Lawfecta time with quarterly restore-drill and yearly secret reminders.
- BD_SHARED_SECRET_NEXT accepted during a secret change. supabase-js pinned 2.118.0; test tools pinned in package.json / package-lock.json.
- Releases tab links each version's widget code; Reset Staging test data (dela_admin_reset_staging, type RESET).
- .github/workflows/tests.yml runs every test on each push. docs/RUNBOOK.md for monitoring, backups, restore drills, secret changes, emergencies.

## Waiting on Stacey before deploy
- GitHub: done. Repo SliceOfThanks/lawfecta (Stacey created it; Claude pushed DELA to main on 2026-10-26).
- Supabase: Stacey created the "Lawfecta AI" organization (free plan) with one project "Lawfecta AI" (us-west-2, nano) on 2026-10-26. Use that project as DELA Staging. The connector in this session still sees only "SliceOfThanks Org"; a new session after Stacey allows Lawfecta AI in the Supabase connector can reach it. Live goes in a separate organization Claude never sees.
- Lawfecta time zone (quota.timezone, Pacific placeholder). Site is lawfecta.com (site.url set).
- Decision Register v1.1 questions 1 to 6 (services limit, max duration, review clock, human review, renewal retries, recurring release). Recommended answers are filled in as Open.

## Decisions applied 2026-10-26 (Decision Register v1.1)
Prices and 10x annual confirmed; trial 7 days Pro from BD registration, new registrations only (trial.eligible_from, placeholder 2026-11-01), one per member; Business 3 seats including owner, extra seat $15/month; limits for gigs, proposals, promotions, pitches, playbooks (unlimited), webhooks 1/2/5/10; AI credits 25/100/300/1000 provisional and weighted; $250 minimum confirmed.

## Brand
Lawfecta palette from Stacey's mockups: navy #1d2030 to burgundy #8b2146 hero, hot gradient to #d23b62, burgundy and blue (#0d83dd) pill buttons, pink #fbeef2 highlights, Inter. Logo mark in brand/lawfecta-mark-*.png (from Stacey's upload). Attorney tabs: Home, Delegate, Projects, Talent. Freelancer tabs: Home, Profile, Work, Earnings.

## Built in Step 1
- Database (supabase/migrations 0001 to 0006): people, organizations, two sides per person (attorney, freelancer) with separate plans, Lawfecta Team roles, access list (channels access and staging_tester), one-use sign in passes, sessions, settings with history, switches, decision log (Program Guide record), plans with locked approved versions, features and limits, quota reservations, audit log (append-only), outbox events, jobs with leases and retries, notifications, holds. RLS on every table, no policies, functions callable only by service_role.
- 0003 is generated by tools/decisions.py from config/decisions.json. Never edit it by hand.
- 0006 (cron + vault) runs only on Supabase. Before applying it, create vault secret dela_project_url = the project's https address.
- API (supabase/functions/api, api-0.1.0): /bootstrap (pass to session, staging hand-off), /me, /me/side, /sign-out, /notifications, /notifications/read, /worker, /health, and /admin/* for the Lawfecta Team. Deploy with verify_jwt false. Secrets: BD_SHARED_SECRET, DELA_ORIGINS (comma list of Lawfecta site origins), STAGING_API_URL (Live only), BREVO_API_KEY (only if Brevo is chosen).
- Widgets: DELA-Auth (helper, holds the secret on line 11), DELA-App (/dela page), DELA-Admin (/dela-admin page). data-api-staging is filled at setup; data-api (Live) stays empty until the first push.
- Code served by jsDelivr: shared/dela-core.js, app/dela-app.js, admin/dela-admin.js. Shadow DOM, light and dark, phone friendly.
- Email: notices go through lib/mail; setting email.sender is log (records, does not send) until the BD email check is done. bd adapter is a stub that refuses.

## How staging works
- Two Supabase projects. Settings environment = live or staging (set once at setup, locked in the admin area).
- The widgets always call Live. Live sends staging_tester accounts to STAGING_API_URL; Staging exchanges the same pass and loads its own code_version.
- Release: set code_version on Staging to the new commit, Stacey tests, then apply the same migrations to Live and set Live code_version to the same commit.

## Tests (all passing 2026-10-26)
- tools/dbtest.sh: 136 database checks (foundation_test.sql, release_test.sql, safety_test.sql) on a throwaway local Postgres 16.
- deno test -A supabase/functions/api/app_test.ts: 13 API tests (plus 2 widget pass tests); node --test tests/promote_test.mjs: 5 push script tests against the real database.
- deno test -A tests/php/auth_test.ts: the real PHP widget's pass is accepted by the api.
- tests/pw/foundation-test.js with tests/pw/server.ts running: 37 browser checks through the real widgets (rendered by PHP), api and database.
- Local Postgres: run as user pgrun from /home/pgrun/data on port 55432 (initdb refuses root). Deno: npm i deno.

## Setup steps for Claude (Staging only, never Live)
1. Done: repo SliceOfThanks/lawfecta attached and pushed.
2. Create project dela-staging in the Lawfecta AI organization. Create vault secret dela_project_url, then apply migrations 0001 to 0007 in order. Set bootstrap.owner_bd_member_id to Stacey's BD member ID.
3. Deploy the api function (verify_jwt false). Set DELA_ORIGINS. Stacey sets BD_SHARED_SECRET, and later GITHUB_DISPATCH_TOKEN and RELEASE_CI_SECRET; GITHUB_REPO = SliceOfThanks/lawfecta.
4. Set code_version to the pushed commit. The Staging address is already filled in DELA-App and DELA-Admin; send them to Stacey with DELA-Auth.
5. Record v0.1.0 with dela_release_record and send the ChatGPT test prompt. Save her report with dela_release_attach_report.
