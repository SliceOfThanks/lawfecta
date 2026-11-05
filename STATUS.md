# Build status (read this first in a new session)

The plan (done, testing, needs work, waiting on Stacey, next): docs/PLAN.md. Stacey 2026-11-04: beta users start after Steps 4 to 6 are built and tested; meetings stay on Vectera.

## Two sites (Stacey 2026-11-03)
- hirelegalhelp.com is the test site. Its widgets (as installed now: data-api empty, data-api-staging = the Lawfecta AI project) talk only to DELA Staging. Every new version goes there first for Stacey to test.
- lawfecta.com is the main site and gets DELA Live. At launch: install DELA-Auth, DELA-App and DELA-Admin on lawfecta.com with data-api = the Live api address and data-api-staging left empty, and a DELA-Auth secret that matches Live's BD_SHARED_SECRET. Until then lawfecta.com stays unchanged.
- Push to Live (Release Control) sends a tested version to lawfecta.com's copy. tools/promote.mjs moves Live's site.url from hirelegalhelp.com to lawfecta.com (or GitHub variable LIVE_SITE_URL) so Live's emails link to the main site.
- On the test site since 2026-11-03: commit de2bc4a (api version 8, same jsDelivr loader), health 200, worker ok.
- Wording: the admin area and member badge say "Test site: hirelegalhelp.com" and "Live: lawfecta.com"; emails from the test site start with [Test site].

## Step 3 test, 2026-11-05 (ChatGPT, partly; credits ran out)
- Passed: A1 to A4, A6, A7, D1 to D7, F1, F2, and the team's LinkedIn check (freelancer 688 match-ready). All alert and member emails were sent through Brevo.
- Fixed (commit a2fcd5c, api version 20): the page wiped unsaved form changes when a button reloaded it; "Filled 1 items"; the draft label now names services. Each fix has a browser check.
- Finished by hand by Stacey 2026-11-05: B1 to B3 (team verified the TX license by the video call path), C1 and C2 (Verified and Ready, Projects note gone, Firm details saved), and both fixes checked. All passed.
- A5 (email link) not possible with hello@lawwurk.com: lawwurk.com's mail server refuses Brevo's shared sending address 77.32.148.23 ("listed by SpamCop", still refused after SpamCop showed it clean). Built the delivery check (migration 0020): DELA now asks Brevo whether essential emails arrived and shows bounces in plain words on the license, in the team queue and as an alert (0021 names the member and state). To retest the link, use an address that receives our email (for example stacey+license@lawfecta.com).
- A5 passed 2026-11-05: an AK license with stacey+license@lawfecta.com; the email arrived, Stacey clicked "Open DELA" while logged in as the test attorney, the license shows the email confirmed, and the delivery check recorded "delivered". Step 3 is fully tested on the test site.
- Also fixed from her testing: sign out now also logs out of Lawfecta (BD /logout); plain dates showed a day early in US time zones; side panels (Notices, versions, team, blur) open above BD's own header, with an X that stays in view and a backdrop that closes them on click or tap, phones included.
- BD login: reCAPTCHA is still blocking ChatGPT's agent ("The security check was not completed successfully"). Stacey is fixing it on the test site.

## Step 3: profiles and verification (built 2026-11-04; brief docs/briefs/step-3-profiles-verification.md, answered by Stacey)
- Migration 0018_profiles, lib/profiles/model.ts, lib/bd/members.ts. Switches: profiles, attorney_verification, freelancer_verification, profile_documents, bd_profile_sync.
- Profile on each side (separate), with the required parts from settings and a plain missing list. side_profiles.readiness_state and verification_state are kept in step.
- The Lawfecta listing (BD) is the public profile: "Fill from my Lawfecta listing" reads only the mapped fields (setting bd.profile_map, from the hirelegalhelp.com field check); after Save, the listing is updated (only fields with a value; photo read only) when bd_profile_sync is on and the box is ticked. One side updates the listing for people with both sides. BD categories wait on a BD key permission (list_professions answered 403).
- Attorneys: license (state, bar number, name on record). Identity: an email on the bar record or at the firm's own domain (free email services refused, setting verify.free_email_domains), confirmed by a one-use link to that address (only its hash stored), or a 10 minute video call (verify.video_booking_url, empty for now). The same number on another account is flagged and needs a note. The team records the method, a lookup note and the next yearly check; re-check due goes to the queue, 30 grace days then expired. Unverified attorneys keep every planning tool; dela_attorney_eligibility(person) is what Step 4 checks before posting or hiring (paid work also needs billing address, signatory and notice email).
- Firm details and firm staff: a verified owner names team members as firm staff; they edit the firm's details.
- Freelancers: services (prices in cents), skills, software or none, time zone, hours, capacity, agreement; LinkedIn check by the team (name matches and the verified badge; no ID or passport); availability every 14 days with a reminder 2 days before; profile documents (Files checks, private until shown).
- DELA drafts a headline, summary and services from the member's notes (plain text, nothing saved until Save). Connector tool get_my_profile on both sides.
- Admin: Verification tab (licenses, LinkedIn checks, profiles by state). Daily job profiles_daily.
- Tests: supabase/tests/profiles_test.sql, supabase/functions/api/profiles_test.ts (13), tests/pw/profiles-test.js (27). All suites: 8 database files, 83 API, 15 script, 197 browser checks.
- Stacey 2026-11-04: US only (verify.countries confirmed). Practice areas and tech tools are choices on the profile, and DELA's AI reads the member's own profile on that side (setting profile.ai_context, migration 0019) in Ask DELA and every playbook AI task. Waiting on Stacey: the BD key permission for categories (list_professions), then practice areas go to the listing; the video booking link.

## Step 2b: DELA in ChatGPT and Claude (built 2026-11-04; brief docs/briefs/step-2b-mcp-connector.md)
- api-0.8.0, migration 0017_mcp_connector. Connector address on the test site: https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/mcp
- Open MCP over HTTP (JSON-RPC, protocol 2025-11-25, also 2025-06-18 and 2025-03-26) with OAuth 2.1: protected resource metadata, auth server metadata (also at .well-known/openid-configuration, which is the address MCP clients can reach under a Supabase path), dynamic client registration (https or localhost redirects only), PKCE S256 only, one-use codes (a reused code stops the connection it made), refresh tokens replaced on each use, all tokens stored only as hashes.
- Sign in: ChatGPT or Claude sends the member to /dela?tab=connect&req=... on the BD site; the page shows the app, the side, what it can and cannot do and the client information notice; Approve or Deny goes back to the app.
- Tools: everyone lawfecta_whoami; attorneys list_playbooks, get_playbook, save_playbook_draft, draft_playbook_with_dela (uses credits), suggest_playbook_change (waits on the Suggestions view), export_playbook. Client information is refused. Every call re-checks the token, access, switch mcp_connector, plan list mcp.plans, holds, the pause area "connector" and mcp.calls_per_minute; calls are logged append-only without what was asked.
- Members: AI settings, "Use DELA in ChatGPT and Claude" (address with Copy, steps, connected apps with Disconnect). Team: AI and files tab, "ChatGPT and Claude connections" with Stop; emergency pause button.
- Tests: supabase/functions/api/mcp_test.ts (15), mcp_sdk_test.ts (the official MCP client library signs in and calls tools), tests/pw/connector-test.js (25). All suites: 70 API, 170 browser checks.
- On the test site 2026-11-04: commit 28d6d60, api version 16, migration 0017 applied from jsDelivr (SHA-256 checked), switch mcp_connector = list. Smoke test as attorney 687 through the real addresses: discovery, registration, authorize sends the browser to https://hirelegalhelp.com/dela?tab=connect, approve, token with PKCE, initialize, tools/list, list_playbooks, lawfecta_whoami. The smoke connection and session were closed afterwards.
- Test for Stacey: docs/tests/step-2b-connector-test.md. Passed 2026-11-05 (all steps, in her Claude and ChatGPT).
- Held for Stacey: adding the connector in her own ChatGPT and Claude accounts (custom connectors may need a paid ChatGPT or Claude plan and Developer mode in ChatGPT). mcp.plans and mcp.write_actions are Open.

## 2026-11-04 on the test site
- Stacey added AI_KEY_ENCRYPTION_SECRET, OPENAI_API_KEY and BREVO_API_KEY (api versions 11 to 13 are those secret changes). Commit a3119718 deployed (api version 14): AI answers cleaned to plain text (Fix commit with test).
- Claude tested on the real test site as attorney 687: chat on Lawfecta's AI (model gpt-5.4-mini-2026-03-17), client information warning, playbook draft, fill to 100%, approve, chat suggestion accepted as version 3, CSV and Word export, unknown image host refused. Credits charged as set.
- Brevo key replaced by Stacey; email.sender = brevo. Test email to Stacey sent 2026-11-04 04:37 UTC (Brevo accepted it).
- Short ChatGPT test for what needs a browser: docs/tests/step-2-short-chatgpt-prompt.md.

## Held for Stacey (nothing below blocks building; each ships as a setting or switch)
1. Supabase secrets on the Lawfecta AI project: AI_KEY_ENCRYPTION_SECRET and OPENAI_API_KEY (Step 2a). Until then AI answers "still being set up" and own keys cannot be added.
2. Playbook limits per plan (Step 2 question 1). Today att.playbooks_saved is no cap. Suggested: Free 10, Plus 40, Pro 90, Business 140; set them in the admin area, Plans tab, as a new plan version. The code enforces whatever the plan says.
3. Step 2 questions 2 to 8 are built with the suggested answers, as Open settings in the Playbooks group: one firm library and limit; no freelancer library in Phase 1; own library exports do not use the export allowance; up to 3 commenters or viewers without a seat; archived playbooks count; reviews every 12 months; DELA suggests missing playbooks.
4. A real Scribe export (HTML and Markdown) to confirm the importer and the screenshot addresses (setting import.image_hosts).
5. OpenAI model names (ai.model.openai, ai.model.transcribe) and AI credit costs (ai.credits.*) are Open.
6. From before: Brevo key (email), DELA-Auth sign in secret, Live setup checklist.
7. Recorder brief question 1 (client information in recordings): built for practice runs and non-client work (consent wording says so, review screen and blur). Recorder plan numbers (recorder.max_minutes, video_days, credits) are Open settings. The recorder switch is on for the access list on the test site only.
8. Recorder brief questions 7 to 10 (Chrome extension, where Recordings live, Userback, beta users) not built yet: the extension needs a Chrome Web Store account in Stacey's name.
9. ChatGPT tests: docs/tests/step-2a-chatgpt-prompt.md, docs/tests/step-2-chatgpt-prompt.md, docs/tests/step-2-recorder-chatgpt-prompt.md.

## Process Recorder beta (built 2026-11-03, on the test site; brief docs/briefs/step-2-recorder-beta.md)
- Commit a0b4044, api-0.7.0 (api version 10, jsDelivr loader), migration 0016_recorder (applied from jsDelivr, SHA-256 checked). Switch recorder = list on the test site.
- No separate video server. Browser: whole-screen check, microphone with level, consent saved (append-only), 10 second video pieces and 10 minute speech parts uploaded through signed addresses and kept in IndexedDB until uploaded (Finish upload), screenshots when the screen changes (max 200), controls plus a Document Picture-in-Picture window in Chrome and Edge, pause, 2 minute warning, auto stop, Stop sharing saves, Upload a recording (played silently at 2x to capture screenshots and speech).
- Worker: recording_transcribe (timed lines; Claude-key members use Lawfecta's speech to text inside the recording's credits), recording_stage1 (draft steps, frames, extra screenshots, client information flags), then the same review screen as Scribe with the transcript (edit, Mark as private) and Build my playbook. Private lines and screenshots inside private moments never reach the AI. Credits reserved at Stop and save, settled when ready, given back on failure; Try again.
- Video: download joins the pieces in the browser (.webm, checked with ffprobe: VP9 and Opus); delete keeps screenshots used in the playbook; daily retention with a warning 3 days before, logged. Storage counts recordings.
- Not built: OpenCV click detection, MP4 conversion, the Chrome extension (beta v2), Firefox-specific tuning (works through the same browser APIs; test in Part A).
- Tests: supabase/functions/api/recorder_test.ts (9), tests/pw/recorder-test.js (16, moving test picture as the screen). All suites: 7 database, 53 API, 15 script, 144 browser checks.

## Step 2 (built 2026-11-03, on the test site; briefs docs/briefs/step-2-playbooks.md and step-2-recorder-beta.md)
- Commit f42e11a, api-0.6.0 (api version 9 on the test site, jsDelivr loader), migration 0015_playbooks (applied from jsDelivr, SHA-256 checked).
- Library per firm with roles, playbook definition (13 parts) and completeness, AI draft from a description or files, DELA's questions, chat suggestions, comments with suggested text, versions and restore, append-only activity, approval and review dates, archive and trash, exports (Word with footer, PDF by print, Markdown, HTML, CSV), team with seats and guests, missing playbook suggestions, Import from Scribe (HTML or Markdown read in the browser, screenshots in the file uploaded, linked ones fetched only from import.image_hosts), review screen with blur burned in (unblurred original deleted), Build my playbook.
- Switches playbook_library and scribe_import set to list on the test site.
- Tests: supabase/tests/playbooks_test.sql, supabase/functions/api/playbooks_test.ts (11), tests/pw/playbooks-test.js (29). All suites pass: 7 database, 44 API, 15 script, 128 browser checks. Word export opened in LibreOffice and python-docx.
- Smoke test on the test site as attorney 687: /library answers, an image from an unknown host is refused.

## Step 2a (built 2026-11-03, on Staging; brief docs/briefs/step-2a-ai-keys-voice-files.md, built with Stacey's "use the suggested answers")
- Branch claude/step-2a-ai-keys-voice-files, commit 1b9b85e (code), api-0.5.0, migration 0014_ai_keys_voice_files.
- What it is: members' own OpenAI or Claude key (sealed with AES-GCM by the api, bound to the row, only last 4 shown, firm key for Business owners), AI routing that never moves to Lawfecta's key unless the member clicks "Use Lawfecta credits this time", credits reserved and given back on failure, Ask DELA chat on both sides with history, Talk button (speech to text; Claude keys use Lawfecta's speech to text), attorney Files (type checked by contents, PDF/Word/text read for the AI, scripts and macros refused, client information check: patterns plus an AI check on Lawfecta's key, held files, versions, folders, trash 30 days, storage by plan, 5 minute links), admin tab "AI and files", daily file clean up and key failure reminder. Rules check: keys never in a log or a response.
- Tests: supabase/tests/ai_files_test.sql, supabase/functions/api/ai_files_test.ts (14), tests/pw/ai-files-test.js (29 browser checks), rules_test. All suites pass locally, including the 70 older browser checks.
- Staging, 2026-11-03: 0014 applied (fetched from jsDelivr at the commit, SHA-256 checked before running). api deployed as version 7: a small index.ts that imports app.ts and storage.ts from jsDelivr pinned to the full commit, so Staging runs exactly the tested files. code_version = 1b9b85e071ca67c5da43856211aad0952023b4fc. Health 200, api-0.5.0, worker ok. Bucket dela-files private, 25 MB. Switches ai_generation, byok, voice_input, file_uploads set to list (Team and access list) on Staging only.
- Staging smoke test as test attorney 687: /ai, /files, /files/start (real signed upload address), /files/complete (not_uploaded), .exe refused; chat says ai_not_set_up and key add says encryption_not_set_up until the secrets below exist. Clean up of the smoke rows was waiting on Stacey's connector approval (one test chat, one unfinished upload that the daily sweep clears).
- Waiting on Stacey: Supabase secrets AI_KEY_ENCRYPTION_SECRET (random, 48+ characters, never shown to anyone) and OPENAI_API_KEY (Lawfecta's own OpenAI key) on the Lawfecta AI project. Then the ChatGPT test: docs/tests/step-2a-chatgpt-prompt.md.
- Open settings to confirm with Stacey: ai.model.openai (gpt-5.4-mini) and ai.model.transcribe (gpt-transcribe) are Open; DELA picks a model the key can use if these are not offered. ai.credits.* (1 chat, 2 with files, 1 talking) are Open.
- Not done yet: release record (needs the GitHub Tests run on the commit and the AI review), push to Live (Stacey).
- Next: Step 2 playbooks built together with Import from Scribe (order set by Stacey 2026-11-03), then the Process Recorder.

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
- hirelegalhelp.com is DELA's permanent home through beta; DELA moves to lawfecta.com after beta (Stacey 2026-10-28). The api already accepts both sites; site.url is a setting. Public search showing 686 to 688 is fine (Stacey).
- Email: Stacey wants BD's own email. BD email report 2026-10-28: the MCP cannot send; BD's API has POST /api/v2/email_outbox/create (a queue BD's mail service sends from). Lead route failed (lead 113, no email). Built lib/mail/bd.ts on the outbox (header X-Api-Key, form fields to_email, from_email, from_name, subject, html, status pending). Staging test 2026-10-28: BD_API_KEY found. First answer 405 because www.hirelegalhelp.com redirects to hirelegalhelp.com (fixed: adapter re-posts once, site.url now the plain address, migration 0012). Second answer 403 "API Key does not have permission to access this endpoint": Stacey allowed Email Outbox on the key. Test 4 (outbox 2) had no send_date and stayed Not Sent. Test 5 (outbox 3, 03:40 UTC) had a valid send_date and hello@lawfecta.com and still stayed Not Sent: BD's outbox logs API-created emails but does not send them. Decision: DELA email goes through Brevo (account Hello@lawfecta.com, lawfecta.com authenticated, sender hello@lawfecta.com active). Waiting on Stacey: BREVO_API_KEY in Supabase secrets, then email.sender = brevo. Brevo stays the fallback; codes and alerts suggested on Brevo.
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

## Step 4 part 1: tech catalog (built 2026-11-05; brief docs/briefs/step-4-matching-gigs-proposals.md)
- Migration 0027_tech_catalog: tech_catalog_versions (every upload kept), tech_catalog_tools, tech_catalog_events (pauses, append-only); switch tech_catalog; settings catalog.max_rows, catalog.ai_max_tools.
- Admin "Tech catalog" tab: upload CSV, problems listed by row and column, preview (new, changed with fields, removed), Confirm replaces the whole list, Pause and Resume one tool, version history.
- DELA's AI (Ask DELA and the playbook chat) gets the active tools only when the member asks about software, best fits first, with the rule to recommend only from the catalog. A partner label never changes the order. Paused tools are never included.
- Tests: catalog_test.ts (7, using Stacey's file data/tech-catalog/catalog-2026-11-05.csv), admin browser checks in foundation-test.js.
- On the test site 2026-11-05: commit c315827, migration 0027 applied, switch tech_catalog = list. The catalog itself is not uploaded yet: Stacey uploads it in the admin Tech catalog tab as part of the test.
- Next in Step 4: gigs from approved playbooks, matching, proposals and the allowance, invitations and Talent, questions, comparison and selection, gig files, off-platform checks, "What DELA has learned about you", connector tools, admin Gigs tab.
