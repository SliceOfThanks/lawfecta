# Build status (read this first in a new session)

The plan (done, testing, needs work, waiting on Stacey, next): docs/PLAN.md. Stacey 2026-11-04: beta users start after Steps 4 to 6 are built and tested; meetings stay on Vectera.

## Agencies part 3 (step 7d): subcontracting, built 2026-11-06
- Migration 0046, behind the switch agency_subcontracting (off until deployed and turned on for the access list).
- The disclosure: an agency's proposal shows "This agency may use vetted subcontractors from Lawfecta to complete this work.", and the agency's agreement carries it as clause 10. The attorney agrees by signing; no approval for each person.
- "No subcontractors on this engagement": the attorney's "Subcontractors" card on the agreement, while it is being signed. Saving makes a new version both sign, with clause 10 reading "No subcontractors". It blocks bench assignments and linked gigs, and cannot be turned on while a subcontractor is working. Fixed once both sign.
- Linked gigs: on an attorney job, the agency's "Bench assignments" card has "Post a gig for part of this job". The gig is linked to the job. Whoever the agency hires on it is added to the attorney's "Who's working on this" as a subcontractor, with an information-only notice, and never opens the attorney's area. Canceling that hire takes them off the list.
- Every agreement where an agency is the client has clause 11, "Confidentiality and no poaching", so every subcontractor accepts it by signing before anything is shared.
- The copy flag: an agency gig that is not linked but shares at least 60% of its words with one of the agency's engagements (setting agency.copy_flag_share, status O) is flagged for the Lawfecta Team in the admin Gigs tab, with an alert. The gig still posts. "Pause the gig" pauses it and tells the agency.
- Also fixed from Stacey's part 2c report (all 18 steps passed): the bench member's "Waiting for the agency to pay", "you pay no platform fee" on milestones with no fee, and "This gig is not available to your account" instead of "Refresh the page".
- Tests: agency_subs_test.ts (7), agency-test.js 47 browser checks, all api tests 243.
- Part 2c ChatGPT test: passed 2026-11-06, 18 of 18.

## Agencies part 2c (step 7d): the agency's own gigs, built 2026-11-06
- Migration 0045, behind the switch agency_hiring (off until deployed and turned on for the access list).
- An agency on Freelancer Business acts as a client from its freelancer session:
  - its own Library, where the owner is the administrator and managers are editors
  - posting gigs from approved SOPs and Workflows, once the owner is verified and the Lawfecta Team has checked the business details
  - Talent, and "Your bench" first on each gig
  - signing the agreement once its client details are given (who signs, billing address, email for notices), paying, and accepting milestones
- Agency members are never matched to their own agency's gigs. Freelancers see "Posted by X (agency)". Notices reach the agency on its freelancer side.
- Fees: an outside hire pays the usual 5% and the agency 5%. A bench hire pays nothing, and the agency pays both, 10% (setting agency.bench_fee_waiver).
- New settings: agency.gigs_active and agency.playbooks_saved (0 means no limit, the same as Attorney Business; status O), and agency.bench_fee_waiver.
- One helper, dela_client_role, decides client rights (attorneys on the attorney side; agencies on the freelancer side), so the attorney screens and rules are reused and attorney behavior is unchanged.
- Tests: agency_gigs_test.ts (9), agency-test.js 39 browser checks, all api tests 236.
- On the test site since 2026-11-06: 0045 applied (fingerprint checked), function version 41 (commit 4fb9639), switch agency_hiring on for the access list. Prepared for the test: "Test SOP: Agency intake" in Roe Test Agency LLC's Library, and "Test job: Agency own gig (prepared)" (gig 7976f867) with Stacey Lake's proposal chosen (a bench hire; nothing paid).
- Test: docs/tests/step-7d-agency-gigs-chatgpt-prompt.md (one login per account).

## Agencies part 2a and 2b (step 7d), 2026-11-05: on the test site
- 2a, the agency bench (migration 0042, switch agency_bench, off):
  - The agency invites a freelancer by email with a default split and signs it. The agency's share is 5% to 50%, never below the freelancer fee.
  - The freelancer signs, proposes another split (signed), or declines. They join when both have signed.
  - Only Plus or higher can join. A Free freelancer is told to upgrade, and the invitation stays open 30 days. A bench member who drops to Free shows "Inactive: Free plan".
  - A new default split needs both signatures. The old one applies until then.
  - The terms include confidentiality and no poaching. Versions and signatures are append-only.
- 2b, bench work on attorney engagements (migration 0043):
  - The owner or a manager assigns a milestone to a bench member in "Bench assignments", one person per milestone.
  - A different split for one job needs the bench member's Accept before work starts. Decline sends it back to unassigned. The agency's share must cover the 5% fee.
  - On payout: the agency gets its share minus the whole freelancer fee, and the bench member gets their full share, each paid to their own account.
  - A missing payout account holds only that share, with reminders at 1, 7 and 30 days. The agency sees "Waiting on [name]'s payout setup", never the amount.
  - A lost chargeback comes back from both shares by the split: held money first, then Stripe transfer reversals, each recorded separately. Anything that cannot be recovered is recorded as a shortfall and the team is alerted.
  - The attorney sees the bench member as a subcontractor in "Who's working on this", with an information-only notice, and never the split. Bench members never open the attorney's area.
- Admin "Agencies" tab: every bench with its split, and every assignment.
- Tests: agency_bench_test.ts (8), agency_split_test.ts (7), agency-test.js (28 browser checks).
- On the test site since 2026-11-05: commit 992e5a4 for the database (0042, 0043, 0044 applied, fingerprints checked), function version 40 and code_version 277cabc, switch agency_bench on for the access list. The made-up job "Test job: Agency proposal" has its agreement marked signed with two $300 milestones (no payment rows).
- Fixed from the agency ChatGPT test (25 PASS, 3 FAIL): the proposal role is read from the box when sent; admin messages read plainly; giving a plan keeps the People search. The attorney's notice names the job once (0044).
- Bench ChatGPT test 2026-11-05: 21 PASS, 3 FAIL. The FAILs (1.3, 1.4, 3.5) were refusal messages shown only for 4 seconds. Fixed in 026d9e4: the Bench, bench invitation and Bench assignments cards keep their last answer on the card. Also fixed: "and the platform fee ()" with no fee; the test job's agreement now has its fees and matching due dates. Stacey's by-hand recheck is one login (the test freelancer).
- Rule from Stacey after this test: each account logs in once per agent test (CLAUDE.md, docs/tests/AGENT-RULES.md).
- Still to come in part 2: the agency's own gigs (Library, posting, Talent, the agency as client). Handing work files between the agency and a bench member comes with part 3.

## Agencies part 1 (step 7d), 2026-11-05
- Built with Stacey's answers (docs/briefs/step-7d-agencies.md): migrations 0040 (team, seats, invitations, agency proposals, "Who's working on this", reviews to the team, admin check and seats) and 0041 (5% fees on both sides from settings; already on the test site).
- Screens: the freelancer "Agency" tab (switch agency_team), "Send as" and "Who will do this work" on proposals, the agency on the attorney's proposal list and profile window, "Who's working on this" on the engagement, and the admin "Agencies" tab.
- Tests: agency_test.ts (8 api tests), tests/pw/agency-test.js (14 browser checks).
- On the test site since 2026-11-05: commit 0f30ec3 (function version 39, code_version 0f30ec3), migration 0040 applied (fingerprint checked), switch agency_team on for the access list. agency_hiring, agency_subcontracting and agency_extra_seats stay off.

## Security re-test, 2026-11-05 (ChatGPT): 11 PASS, 3 FAIL, all fixed in 0f30ec3
- 1.2: the "Shared until" and "Extended to" answers were passing toasts. They now stay on "Files for this gig", and the days picked stay picked.
- 1.5: a refused upload left "Uploaded" at the top of Confidential materials. The refusal now replaces it.
- 2.2: the freelancer's Download opened a new tab after DELA answered, which browsers block as a pop-up. It now downloads in the same tab.
- "$NaN" on the test job's fees: that hand-made test agreement has no fee amounts. Missing amounts now read "-"; real agreements always carry them.
- Each fix has a check that failed before (sharing-test.js, engagements_test.ts).

## Security and sensitive data (step 6d) and Confidential materials (step 6c), 2026-11-05
- Built with Stacey's answers to docs/briefs/step-6d-security-sensitive-data.md and her Confidential materials decisions. On the test site: commit d74af66 (function version 37), migrations 0036 to 0039, Confidential materials switch on for the access list.
- What it does:
  - Sensitive data (SSN and ITIN, ID numbers, account numbers, health information, biometrics, logins) is never uploaded: links only.
  - Every job has the checkbox "This job involves sensitive data (SSN, medical, financial, or ID documents)". When it is ticked, no uploads or shares are allowed on that job, only secure links. "Delete now" removes what was already shared.
  - Shared files (gig shares, message attachments, Confidential materials) expire after 7, 14 or 30 days (default 14), with "Extend 14 days" and no limit on extensions. Access also ends when the job is complete. Confidential files are deleted 7 days after access ends, with a "Download all" reminder 2 days before.
  - Secure links: https only, never opened by DELA. Emails go out 2 days before expiry and at expiry, with Stacey's wording. The address is erased at expiry.
  - Every view and download is logged and shown on the job page ("File activity") and in Confidential materials ("Activity").
  - Files shared on a job never go to OpenAI. Deliverables get the pattern check only, and sensitive ones are refused. The milestone check reads only the notes and checklist. Ask DELA takes Files-tab files only.
  - The 90-day rule: Ask DELA chats, drafts never approved, and deliverables, unless saved to the library. A notice goes out 7 days before. Deleting a chat or a draft is immediate, and Trash has "Delete forever".
  - CSV is accepted and scanned. A CSV with a formula is refused.
  - Ask DELA names no software products while the tech catalog is off. The catalog moves to the end of Phase 1.
  - The /security page widget (widgets/DELA-Security.php, app/dela-security.js) with its contact form (a hidden trap field, 5 messages an hour). Messages go to the admin Security tab and to the team's email.
  - Security Advisor: both warnings fixed (0037 locks SECURITY DEFINER functions, 0039 moves pg_net). Only the intended "RLS enabled, no policy" notes remain.
- Tests: 200 api tests; browser tests foundation 75, ai-files 32, playbooks 34, recorder 20, connector 25, profiles 51, gigs 28, meetings 17, engagements 35, reviews 21, documents 32, images 34, security page 93, sharing 28.
- Test fixture: "Test job: Confidential materials" (gig bc969483) for the test attorney and freelancer, marked signed with milestone 1 funded by SQL (no payment rows) so the area can open without Stripe.
- Waiting on Stacey:
  - the ChatGPT test (docs/tests/step-6d-security-chatgpt-prompt.md)
  - installing the /security page (docs/STACEY_SECURITY_PAGE.md)
  - the OpenAI settings (docs/RUNBOOK.md, "OpenAI account settings")
  - a virus scanner choice before Live
  - a lawyer's review of the confidentiality clause before Live

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

## Step 4 parts 2 and 3: Flex Gigs, matching, proposals, Talent, Work, conduct checks, insights (built 2026-11-05)
- Migration 0028_gigs: gigs, gig_events (append-only), gig_matches, gig_invitations, proposals, gig_questions, gig_files and gig_file_downloads (append-only), agreements (draft, for Step 6), conduct_flags, member_insights. Switches flex_gigs, talent_search, multiple_hires (off), conduct_review, member_insights; settings gig.min_budget_cents (25000, Stacey), gig.big_change_pct, proposal.rate_per_hour and rate_per_day, matching.* (plan boost, fit levels, how many shown), insights.max_per_member.
- Attorney: Projects (draft from an approved playbook with DELA's public version, budget, deadline, private milestones; post; matches with reasons; invite; public answers; compare side by side; choose; ask to confirm; files; extend once; close), Talent search and invite, Post as a Flex Gig on approved playbooks.
- Freelancer: Work (allowance counter, invitations, matches with why, open gigs, drafts, sent), gig page (watermarked full playbook when invited, questions, files, proposal with DELA's qualifications help, send, withdraw, confirm).
- Rules from Stacey's answers: invited proposals free; withdrawn never returned; monthly reset on the 1st Pacific; one hire per gig; public gigs for match-ready freelancers; plan boost only within a fit group; milestones only after hiring; $250 minimum; public answers only; files read only and logged.
- Off-platform check: rules plus DELA's AI (Lawfecta's key); held items wait in the admin Gigs tab (deliver, or do not deliver and tell the member). What DELA has learned about you in AI settings (remove any item).
- Connector tools: list_my_gigs, draft_gig_from_playbook, list_gig_proposals (attorney); list_my_gig_work, save_proposal_draft (freelancer). Sending and choosing stay on the website.
- Tests: gigs_test.ts (12), gigs-test.js (28 browser checks), connector lists updated.
- On the test site 2026-11-05: commit 0c003b5, migration 0028 applied, switches flex_gigs, public_gigs, talent_search, conduct_review, member_insights = list; multiple_hires off. Smoke test: the test attorney's Projects and the test freelancer's Work load.
- Test for Stacey: docs/tests/step-4-chatgpt-prompt.md.
- Open settings to confirm: matching.plan_boost order (to match the BD plans), proposal rate limits, gig.big_change_pct, matching fit levels.

## Step 5: messages, booking and meetings (built 2026-11-05; brief docs/briefs/step-5-booking-meetings-chat.md, all answers as suggested)
- Migration 0029_meetings_chat: meeting_availability, member_prefs, meetings, meeting_events (append-only), meeting_followups, threads, messages, message_edits (append-only), thread_reads, thread_reports, thread_drafts, message_file_downloads (append-only). Switches meetings, gig_chat, chat_assistant. Settings meeting.* (lengths 15/30/45, 12 hours' notice, 15-minute buffer, 21-day window, 10-minute hold, reminders 24h and 1h, late cancel 2h, 2 in 30 days to the team, 48h to confirm) and chat.* (edit 15 minutes, email gap 15 minutes, rate limit, 30 days after a gig closes).
- Booking only inside a gig; open times in the freelancer's time zone; holds with both people locked in order (two at once: one wins); one confirmation with a calendar file; reschedule replaces the old time with one update; late cancels and no-shows counted. Vectera room adapter: waits for the provider until VECTERA_API_KEY is set; each person sees only their own link near the time. Consent from both before any recording (recording stays off: meeting_recording switch, G).
- After the meeting: We met and a summary from each; both met = attendance verified (consultation export grant stays off, O-08); DELA suggests next steps.
- Messages: a thread per gig per freelancer; attachments read only and logged; edit 15 minutes with history; removal keeps the record; read receipts; report and block; emails without message text; off-platform check (clear cases held, unsure ones sent with a reminder); DELA in the thread (summarize, what we agreed, draft a reply).
- Connector: list_my_threads, read_thread, save_reply_draft, list_my_meetings.
- Tests: meetings_test.ts (10), meetings-test.js (17 browser checks).
- On the test site 2026-11-05: commit b5439c4, migration 0029 applied, switches meetings, gig_chat, chat_assistant = list. Smoke test: the test freelancer's availability and Inbox load.
- Waiting for: Vectera's answers and API access (VECTERA_API_KEY, entered by Stacey in Supabase), meet.lawfecta.com set up in Vectera and DNS. Google and Outlook calendar sync waits for Google's app review (calendar_sync off).
- Test for Stacey: docs/tests/step-5-chatgpt-prompt.md (after the Step 4 test).

## Step 6: agreements, signing, milestone payments, delivery and payouts (built 2026-11-05; brief docs/briefs/step-6-agreements-payments.md, all 18 answers as suggested)
- Migration 0030_engagements: agreement_versions and agreement_signatures (append-only), milestones, milestone_submissions, deliverable_downloads (append-only), payout_accounts, payments, payouts, refunds, ledger_entries (append-only), disputes, chargebacks, provider_events. Switches engagements, milestone_funding, milestone_check, engagement_export. Settings engagement.* (14 days to sign, up to 6 milestones, $50 smallest), milestone.revisions_included 2, milestone.review_reminder_days [3,6], payments.methods (card, US bank account), payments.currency, agreement.template_version (G: draft for counsel).
- Agreement: DELA fills in version 1 from the gig, proposal, firm and freelancer profiles on a fixed terms template (lib/engagements/agreement.ts, marked as a draft for Lawfecta's lawyer; DELA's AI never edits the terms). Either person proposes a new version; signatures count only on the current version (typed name, consent, time, IP, version and fingerprint). The attorney needs the firm's signatory, billing address and notice email. Not signed in 14 days: it closes and the proposal can be chosen again.
- Fees from each side's plan (fee_bps) with the $10 floor per party; the attorney's fee is charged with milestone 1, the freelancer's spread over the payouts with nothing lost to rounding.
- Payments (lib/payments/stripe.ts): Stripe Connect, separate charges and transfers, Express accounts for freelancers. Milestone 1 on Stripe's Checkout page (card saved with the attorney's consent shown), then each next milestone charged off session when the previous one is accepted; a declined card falls back to Checkout. Idempotency keys on every money call. Webhook /stripe/webhook: signature checked, each event once, live events and sk_live keys refused while live_payments is off. Daily match with Stripe's records.
- Delivery: start, submit (statement, files with the client information tick, checklist), DELA's check on Lawfecta's key against the rubric agreed at signing; the score is worked out in code (unknown counts as not met; 89.99 fails 90). A failed check can go to a Lawfecta reviewer. The attorney accepts (payout queued, next milestone charged) or asks for changes with a note, within 2 rounds; then a change order. Reminders on days 3 and 6; day 7 tells the team (silence never pays out).
- Payouts held until the freelancer finishes Stripe's payout setup (Earnings tab), then sent once. Cancellation: before work, a full refund with the attorney's fee; after, paid milestones not submitted are refunded and accepted ones stay paid; nothing under review. Disputes: 14 days of notice, money held, then the team splits the held money (must add up). Chargebacks pause the engagement; a lost one puts the attorney on hold (first: reinstatement review; second: termination review).
- Screens: the gig's "Agreement and work" view (attorney) and the engagement at the top of the gig (freelancer), with What happens next, the agreement, rubric, terms, versions and signatures, change orders, milestones, payments, payouts, disputes and canceling, and the playbook export after the first accepted milestone. Engagements lists on Projects and Work. Freelancer Earnings tab. Admin Payments tab (totals from the ledger, human reviews, disputes, chargebacks, failed payments, held payouts, late reviews, long-held money, engagements, the ledger).
- Connector: list_my_engagements, get_engagement (read only; signing and paying stay on the website).
- Tests: engagements_test.ts (13), engagements-test.js (35 browser checks, with a Stripe stand-in in tests/pw/server.ts). Fixed along the way: the gigs matches test and the gigs allowance check failed when every test file ran together (GitHub Tests had been red since Step 5 because of it).
- Waiting on Stacey: the Stripe test account, Connect and the two secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (docs/STRIPE_SETUP.md). Before live payments: a lawyer reviews the terms template and the chargeback rule (G), and Stripe activation.
- Test for Stacey: docs/tests/step-6-chatgpt-prompt.md (after the Stripe setup and the Step 4 test).
- On the test site 2026-11-05: commit 32380f0 (api-0.9.0, function version 31), migration 0030 applied from jsDelivr (SHA-256 checked), switches engagements, milestone_funding, milestone_check = list; engagement_export and live_payments stay off. Smoke test: health 200, the freelancer's engagements list, the admin Payments tab (Stripe not connected yet), an unsigned Stripe event refused (400), a made-up agreement refused. Smoke sessions closed.

## Attorney recheck from the polish test, 2026-11-05 (ChatGPT, Stacey's screenshots)
- Passed: Home shows the draft playbook count and "Open the Library" opens the list; the banner is gone on Files, Projects, Talent and AI settings; Files keeps the client information tick box and refuses an upload without it; DELA drafted a playbook in about 11 seconds; the Word export has the version and date line, summary box, six-column steps table, shaded attorney review box and "Page 1 of 3" footer; the recordings stack into labeled blocks at phone width.
- Not reached: the owner checks (ChatGPT's usage limit ran out). Run that group next time.

## Step 7: reviews, past-client reviews, the bench and member webhooks (built 2026-11-05; brief docs/briefs/step-7-reviews-bench-webhooks.md, all 18 answers as suggested)
- Migration 0031_reviews_bench_webhooks: reviews (one per side per completed engagement), review_versions and review_moderation (append-only), review_reports, past_review_requests, past_review_optouts, past_reviews, bench_members (personal and firm), bench_suggestions, bench_snoozes, webhook_endpoints, webhook_events, webhook_deliveries. threads.gig_id may be empty for a bench conversation (threads.bench_id). Switches reviews, past_client_reviews, bench, bench_suggestions (new) and member_webhooks. Settings reviews.*, past_reviews.*, bench.*, webhooks.*.
- Reviews: only completed Lawfecta engagements; different questions per side (1 to 5 stars, would work together again, a short text); publish straight away (C); client information is sent back to remove; threats, hate, harassment, impersonation, contact details or payment outside Lawfecta are held for the team (lib/reviews/model.ts, AI on Lawfecta's key plus the rule checks); a negative opinion is never held (T18). Edits for 14 days with every version kept; one public response; reports by the two people; the team keeps or removes with a reason the members see; one appeal. Averages after 3 reviews. Members only (no public page) until a lawyer checks the FTC rules.
- Past clients: freelancers send up to 5 requests a month and 20 in total; DELA writes the neutral email (no message, no reward); the past client opens /dela?past_review=... with no login, gives their state and bar number and writes the review; opt-out stops all requests to that address. Shown in its own section, "From past clients (outside Lawfecta)", never in the averages.
- The bench: personal benches for every attorney, a firm bench for Business firms (owners and managers add; staff see and invite). Invite after an engagement or from Talent; the freelancer accepts on Work; a bench conversation in the Inbox with no files and no gig meetings stays open after the engagement's own thread becomes read only (T09); leaving or removal closes it. "From your bench" on the gig's Matches view; DELA suggests available bench freelancers for a new gig or an approved playbook in their practice area, with snooze and an optional Monday summary email. Invitations expire after 30 days.
- Webhooks (lib/webhooks/deliver.ts): https only; addresses inside a network, loopback, link-local or cloud metadata refused when saved and again at every delivery (T15); no redirects; 5 second limit; each notice signed (DELA-Signature: t=time,v1=HMAC-SHA256 of "time.body"; the old secret keeps working 24 hours after a change), with DELA-Event-Id; small payloads (ID, state, time, a link back that needs a login, amounts for payments). Retries over about 21 hours, then failed; the endpoint pauses after 20 failures in a row and the member is emailed. Plan limits (Free 1, Plus 2, Pro 5, Business 10; after a downgrade the newest wait), 1,000 notices a day. Events come from database triggers on playbooks, gigs, proposals, invitations, matches, meetings, agreements, milestones, payouts, disputes, benches and reviews, and each is checked again at delivery (for example after leaving a firm). Members manage endpoints in AI settings (test, pause, resume, change the secret, delete, see deliveries, send again).
- Fixed along the way: the thread check let a made-up thread id through (Step 5), now refused; an empty "would hire again" and a cut-off state name in the past-client form.
- Admin: "Reviews and bench" tab (counts, held reviews, responses and past-client reviews, reports, appeals, recent past-client bar numbers to spot check, webhook endpoints paused after failures).
- Connector: list_my_reviews, list_my_bench (read only).
- Tests: reviews_test.ts (9), reviews-test.js (21 browser checks). All API tests together: 144.
- Test for Stacey: docs/tests/step-7-chatgpt-prompt.md (needs a completed engagement from the Step 6 test).

## The document standard: Policy, Workflow, SOP, Playbook (built 2026-11-05; brief docs/briefs/step-2d-document-standard.md, Stacey's final decisions)
- Every Library item is now a "document" of one of four types. The word "playbook" is gone from every member screen, gigs, the connector (new tool names; the old names still work) and the admin area. Inside the database the table is still called playbooks.
- Migration 0032_document_standard: document types, IDs per firm by lifecycle (INT, ENG, MAT, DOC, BIL, CLS, ADM), the self-check result per version, the append-only change log (document_changes), review dates (3 months for high risk, 12 otherwise), the 14-day reminder to whoever holds the owner role (a member or an email; the firm owner if nobody), a bounce resent to the firm owner with an in-app notice, gigs from SOPs and Workflows only, Policies and Playbooks attached read only, attorney checkpoints inside an engagement, the conversion of older playbooks. Switches document_standard and document_conversion. Settings documents.* (900 words, 3 and 12 months, 14 days, 3 to 5 KPIs, 2 Consulted).
- Engine (lib/documents/model.ts, ai.ts): each type's sections, client data and passwords removed before the AI sees anything, names replaced by roles, the self-check with three blocking checks (a missing A, more than one A, a judgment step not flagged "Attorney decides" or without an attorney A), Fix it in code or with the AI, Split into linked SOPs, exports to Word, PDF, Markdown, web page and checklist with the draft banner, RACI and change log.
- Screens: the master index by lifecycle, New document (firm profile once, type cards, 22 starters, the process questions, paste or a file), the draft and review screen (draft banner, conversion banner with Change type, header fields, quality panel, RACI grid, KPI cards, change log), the firm profile card on Profile, gig references, the freelancer's part of a gig, attorney decisions in the engagement, the admin Documents card (AI and files tab).
- On the test site 2026-11-05: commit 2670523, migration 0032 applied from jsDelivr (SHA-256 checked), function version 33, code_version set, both switches on the access list. The 6 older items were converted with the real AI: 2 SOPs (ENG-01, ENG-02) and 4 Workflows (ENG-03, DOC-01, DOC-02, BIL-01), none blocked, each waiting for the owner's check. Smoke test as attorney 687: /library, /documents/starters (22), /documents/firm (not saved yet), /playbooks/get on DOC-01 (0 blocking). The smoke session expires by itself; deleting the stored smoke responses waits on Stacey's Supabase approval.
- Tests: documents_model_test.ts (8), documents_test.ts (10), documents-test.js (29 browser checks). 162 API tests together; all 11 browser tests pass on one shared database.
- Test for Stacey: docs/tests/step-2d-documents-chatgpt-prompt.md.

## Images in documents (built 2026-11-05; brief docs/briefs/step-2e-document-images.md, Stacey "Yes", all 13 answers as suggested)
- Migration 0033_document_images: doc_images (one record per image: firm, file, caption, the client-data confirmation, flags found and blurred), doc_image_checks (still-current marks, append-only), files purpose doc_image (not listed on the Files tab, counted in storage). Switch document_images. Settings documents.images.max_mb 5, per_step 3, caption_max 120, max_width_px 2400, export_max_mb 40.
- Where: SOP steps and Before you start; Workflow stages and a new Swimlane chart section; Playbook Scripts and templates, and Examples. Policies stay text only.
- Adding: "Add image" at the right end of each step row and section, paste into a step, drop a file on a step; the tip under the first step; a progress bar; red messages for a wrong type, over 5 MB and a fourth image.
- Review window: Box, Arrow, Blur, Undo; text read in the member's browser with Tesseract (tesseract.js 5.1.1 from jsDelivr, pinned); names, emails, phone numbers, case numbers, account numbers, SSNs and dates outlined in yellow; "Blur all flagged" or click one outline; caption (120 characters, also the alt text) and the checkbox before "Save image". The blur is burned in before upload, so no unblurred original reaches DELA.
- Server: the type check and DELA's AI image check on Lawfecta's key; a hold (at once or later through the worker) takes the confirmation away, blocks the document and tells the uploader; confirming again is recorded. Only the firm's own images stay in a document. The self-check adds "Every image has a caption" (needs attention) and "Every image has a confirmed client-data check" (blocking with export, approval and gigs). Images and captions do not count toward the 900 words.
- After saving: full column width with the caption in grey italics; full screen with X or Esc (pinch to zoom); Edit, Replace and Remove on hover or tap; drag to reorder; "Fix it" in the quality panel opens the review window. Older import screenshots become images marked "Confirmed at import" and ask for a caption.
- Review: at a due review, "Check images" lists every image; Approve waits until each is "Still current" or replaced.
- Gigs: a warning with the image count before a gig is created; freelancers see images inline with captions, no download button, only through the gig, and not after the engagement ends (or the gig closes without a hire). Exports: Word at full page width with the caption below, PDF and web page embedded, Markdown shows the caption.
- Images never go to the AI and come back on their steps (fill, chat, fix, split, change type, the connector).
- Admin: the Documents card shows image counts (never the images).
- Tests: images_test.ts (9), engine tests (9 in documents_model_test.ts), images-test.js (33 browser checks). 172 API tests together; all 12 browser tests pass on one shared database.
- Not built yet: deleting image files once no version uses them and the document is deleted from the trash (they stay counted in storage until then).
- On the test site 2026-11-05: commit 3a9a7f8, migration 0033 applied from jsDelivr (SHA-256 checked), function version 34, code_version set, switch document_images on the access list. Smoke test as attorney 687: /playbooks/get returns the image settings (on, 5 MB, 3 per step, 120 characters, 2400 px) and the image check fields; /gigs answers with image counts. The smoke login expires by itself after 15 minutes.
- Test for Stacey: docs/tests/step-2e-images-chatgpt-prompt.md.

## Track A part 1 (document standard), ChatGPT 2026-11-05: 24 pass, 2 fail
- Step 10 (fail): the test's own instruction. The first row's Attorney cell already held an A, so two clicks gave C. The prompt now says to click an empty cell. The block itself worked.
- Step 14 (fail, a real bug): the page showed "Attorney" as the owner while Word and the index said "Supervising attorney". Fixed: the owner role is always added to the document's roles, and the dropdown shows it.
- Also fixed from the report: the "Accountable" message now separates "no A" from "more than one A"; the remaining "playbook" words (Home, plan limit labels, switch labels, settings, the admin column, connector tool names) say "document" (migration 0034, labels only); DELA no longer suggests changing trust account rules from a Policy to a Workflow.
- On the test site: commit 84102b5, migration 0034 applied (SHA-256 checked), function version 35, code_version set. 174 API tests and all 12 browser tests pass.

## Track B (Claude in Chrome: gigs, proposals, messages, meetings) 2026-11-05: most steps pass, 5 fail
- Fixed: "✦ Summarize" and "✦ Draft a reply" (OpenAI refused JSON mode for plain-text answers); "Change the time" (checked against the meeting being moved, and listed its current time; the same time is now refused); times stopping at 2:45 PM (24 per day on screen, 200 in total); the menu path placeholder shown to freelancers; "1 proposals"; "milestones accepted 0 of 0" before signing; "fl_free" in the admin table; the attorney's meeting card note; DELA's AI naming tools not in the profile or the catalog.
- The lost freelancer question: the test tab switched to the owner's login, because hirelegalhelp.com was opened as the owner in the same Chrome while the test ran. Not a DELA error. The agent test rules now say so.
- Not DELA: the login page heading "Welcome To LawWurk" is Brilliant Directories text on hirelegalhelp.com (BD admin). The clipboard note came from the testing tool.
- Open: DELA still uses the browser's own OK/Cancel pop-ups (about 70 places). Agents handle them now, but in-page pop-ups would be better. Planned.
- On the test site: commit 8e1b497, migration 0035 applied (SHA-256 checked), function version 36, code_version set. Recheck: docs/tests/claude-track-b-recheck.md.

