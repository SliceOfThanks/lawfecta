# DELA Phase 1 plan

Last updated 2026-11-06. The one-page picture (built, in progress, next, before the MVP, after) is docs/MVP_OVERVIEW.md. Stacey's own checklist, in order, is docs/STACEY_TODO.md. Read this with STATUS.md. It shows what is done, what is being tested, what needs work, what is waiting on Stacey, and what comes next.

## Planned for 2027, not built: sharing logins through password.link
Evaluation and plan approved by Stacey 2026-11-13: docs/briefs/2027-login-handoff-password-link.md. Five questions in it wait for her answers before any build. No code, no setting.

## Newest (2026-11-13): ChatGPT checks 1 to 3 done, three small changes on the site
code_version f2b953b, api 120, migrations through 0123. Waiting on Stacey: one look at the website page /account/favorite-members after bookmarking in DELA; the two-person call is parked. See STATUS.md.

## Newest (2026-11-13): Meetings in the menu, quick-view page, 10-minute join, grey bands, step 28 are on the site
code_version a801cb7, api 120, migrations through 0122. Waiting on Stacey: ChatGPT checks 1 (by Nov 19), 2 and 3 (by Nov 16); the two-person call is parked. See STATUS.md.

## Newest (2026-11-13): meetings moved to VideoSDK (step 25, part 1)
Decision changed by Stacey 2026-11-13: meetings run on VideoSDK, not Vectera ("Meetings stay on Vectera" below is replaced). Part 1 is on the site and the first real room was made. Needs testing: Stacey joins the test meeting from two browser windows. Waiting on Stacey: the five questions for part 2 in docs/briefs/step-25-videosdk-meetings.md, limiting the VideoSDK key to the website, and adding credit before members book.

## Newest (2026-11-13): step 23 is on the site
"Book a call" before a gig is released (STATUS.md, top section). Needs work: bring the Talent journey ChatGPT prompt in line (one more button on the profile, a changed sentence in the conversation, a booking step). Waiting on Stacey: the five questions in docs/briefs/step-23-intro-calls.md and a first real booking on the site.

## Newest (2026-11-13): steps 21 and 22 are on the site
The firm logo with the client card for freelancers (step 21) and the Talent and profile revision to mockup 02 (step 22) are released (STATUS.md, top section). Needs work: rewrite the Talent journey ChatGPT prompt for the new labels; "Book a call" before a gig. Waiting on Stacey: the questions in docs/briefs/step-21-firm-logo-client-face.md and docs/briefs/step-22-talent-mockup-02.md, and her look at Talent, a profile and "Firm details".

## Newest (2026-11-13): step 20 is on the site, with five sample freelancers
Talent "Load more" (10 at a time) and the match-ready progress card are released (STATUS.md, top section). Fifteen sample freelancers are listed in Talent for testing (five website members and ten DELA-only); remove them before real members arrive (tools/demo_freelancers_remove.sql). Needs testing: Stacey's two ChatGPT checks in docs/tests/RUN-NEXT.md and her own look at Talent. Waiting on Stacey: the decisions in docs/briefs/step-20-match-ready.md (should categories or a photo be required, the 14-day availability window).

## Newest (2026-11-13): steps 18 and 19 are on the site
The Talent redesign (step 18, all four parts with bookmarks and avatars) and the Subscription redesign (step 19) are released (STATUS.md, top sections). Needs testing: Stacey's two ChatGPT checks in docs/tests/RUN-NEXT.md. Waiting on Stacey: the decisions listed in docs/briefs/step-18-talent-marketplace.md and docs/briefs/step-19-subscription-redesign.md, the test jobs that ask for payment, PHP on her Mac. Not built: "Book a call" before a gig.

## Newest (2026-11-13): step 17 is on the site
Talent search by the website's categories and the category picker on the freelancer Profile page are released (STATUS.md, top section). Needs testing: Stacey's look at Talent and Profile, then one ChatGPT check for both workspaces; the second Subscription run. Waiting on Stacey: the three step 17 questions in docs/briefs/step-17-talent-categories.md, the test jobs that ask for payment, PHP on her Mac.

## Next work (2026-11-10): the launch review fixes
The MVP is on the test site. Before launch, make the 24 fixes from the launch review, in the order given in docs/HANDOFF.md (money safety, disputes, the guide, the Pro trial check, the first push to Live). Then the AI review workflow, the release record, and one ChatGPT money test once Stripe's test keys are in.

## Decisions for this plan (Stacey 2026-11-04)
- Beta users wait for hiring. Nobody outside the test accounts uses DELA until matching, gigs, proposals, meetings and payments (Steps 4 to 6) are built and tested. Everything stays on the test site (hirelegalhelp.com) until then.
- Meetings stay on Vectera. Branded rooms and join links run on Vectera. Automatic transcripts and off-platform monitoring are built around what Vectera allows (see Step 5).

## 1. Where things stand

Everything below is on the test site, for the access list only. Live (lawfecta.com) is not set up and is unchanged.

| Step | What it is | Built | Claude's tests | Stacey's ChatGPT test |
|---|---|---|---|---|
| 0 | Setup and decisions | Done. Email goes through Brevo; Vectera checked | n/a | n/a |
| 1 | Foundation: BD sign in, access list, roles, plans and limits, admin, audit, notices | Done | Passing | Done |
| 1b | Release Control: push to Live, codes, watch, go back | Done | Passing | Done; the real push waits for Live |
| 1c | Safety kit: rule checker, AI review, monthly health report | Done | Passing | GitHub settings still to turn on |
| 2a | Bring your own AI key (BYOK: OpenAI or Claude), talking to the AI, Files | Done | Passing, real AI checked | Passed (2026-11-05, short screens test 34 of 36); your Talk recheck to do |
| 2 | Playbook library, versions, comments, exports, Import from Scribe | Done | Passing, real AI checked | Passed (2026-11-05) with 7 fixes; a short recheck to do |
| 2r | Process Recorder beta | Done (no Chrome extension) | Passing | Not run yet |
| 2b | DELA in ChatGPT and Claude (connector) | Done | Passing, checked on the real site | Passed (2026-11-05), in your Claude and ChatGPT |
| 3 | Profiles and verification, tech tools, the AI reads the member's own profile | Done | Passing, BD listing read and write checked | Passed (2026-11-05), with 8 fixes from your testing |
| 4 | Tech catalog, Flex Gigs, matching, proposals, Talent, Work, off-platform checks, what DELA learned | Done | Passing (api and browser, both sides and misuse) | Not run yet: docs/tests/step-4-chatgpt-prompt.md |
| 5 | Messages, booking and meetings (Vectera rooms wait for Vectera's API access) | Done | Passing (api and browser, both sides and misuse) | Not run yet: docs/tests/step-5-chatgpt-prompt.md |
| 6 | Agreements, e-signature, milestone payments (Stripe test mode), DELA's milestone check, payouts, refunds, disputes, chargebacks | Done | Passing (api and browser with a Stripe stand-in, both sides and misuse) | Waiting for the Stripe setup (docs/STRIPE_SETUP.md), then docs/tests/step-6-chatgpt-prompt.md |
| 7 | Reviews after completed work and from past clients, the trusted talent bench (personal and firm) with bench conversations and suggestions, member webhooks | Done | Passing (api and browser, both sides and misuse) | Not run yet: docs/tests/step-7-chatgpt-prompt.md (after the Step 6 test) |
| 2d | The document standard: Policy, Workflow, SOP and Playbook, the self-check and block, RACI, KPIs, IDs, the change log, review reminders, conversion of older playbooks | Done | Passing (api and browser, misuse included); conversion checked with the real AI | Not run yet: docs/tests/step-2d-documents-chatgpt-prompt.md |
| 2e | Images in documents: screenshots on steps and sections, the text reader and blur, captions, the client-data check, exports, gigs and review | Done | Passing (api and browser, misuse included) | Not run yet: docs/tests/step-2e-images-chatgpt-prompt.md |

### Bring your own AI key (BYOK), built in Step 2a
- Members on every plan, on both sides, can add their own OpenAI or Claude key in AI settings: https://www.hirelegalhelp.com/dela?tab=ai
- A firm owner on the Business plan can add one key for the whole firm. A person's own key is used first.
- DELA tests the key before saving it, then stores it locked. Nobody, including the Lawfecta Team, can read it. Only the last 4 characters show.
- The member's key runs Ask DELA, playbooks, Import from Scribe, the Process Recorder, DELA in ChatGPT and Claude, and profile drafts.
- DELA never moves to Lawfecta's AI on its own. If the member's key fails, DELA says why, and the member can click "Use Lawfecta credits this time".
- Claude keys cannot turn speech into text, so talking and the recorder use Lawfecta's speech to text, from the member's included credits.
- The admin area shows each key's status, never the key. Members get a reminder when their key stops working.
- Tested: Claude's tests pass with stand-ins for OpenAI and Claude, and Lawfecta's own key works on the real test site. A real member key is not tested yet. That is part C of the short screens test, with your own OpenAI key: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-short-chatgpt-prompt.md
- Setting to confirm: BYOK is on every plan today (your Step 2a answer).

### Import from Scribe, built in Step 2
- Separate from the Process Recorder. Both end on the same review screen and the same "Build my playbook" button.
- How a member brings a Scribe guide:
  1. In Scribe, they export the guide as HTML or Markdown. Scribe's paid plans appear to be needed for these exports; this is still to confirm.
  2. In DELA they open Library: https://www.hirelegalhelp.com/dela?tab=library
  3. They click "Import from Scribe", tick the no-client-information box, and choose the file.
- What DELA takes from the file:
  - DELA reads the file in the browser, and nothing in it runs. It takes the title, each step and each screenshot.
  - Screenshots inside the file go to DELA's private storage. Screenshots linked from Scribe's own addresses are fetched by DELA's server. Any other address is skipped.
- What the member checks: on the review screen they fix wording, add notes on why, blur parts of screenshots (the blur is permanent), and untick screenshots.
- What the AI does: it reads the steps, the notes and the member's own profile, but not the pictures. It writes the full playbook, merges small clicks into real steps, keeps each screenshot with its step, and asks up to 5 questions about what Scribe cannot show.
- Where it ends up: the playbook joins the firm library, marked "Built from a Scribe guide".
- How we get Scribe's data: only from the member's export file. Scribe has no public API for reading guides (its only API is an Enterprise search API).
- Not yet tested with a real Scribe export.
- Proposed add-on "2s" (brief: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-2s-scribe-import-plus.md):
  - Word and PDF exports
  - several guides at once
  - a Scribe share link, if Scribe allows it
  - an optional setting that lets the AI see the screenshots

Tests today: 8 database test files, 84 API tests, 15 script tests and 198 browser checks. GitHub Tests: https://github.com/SliceOfThanks/lawfecta/actions

## 2a. Running now: two tests at the same time (2026-11-05)
- **Track A, ChatGPT:** the document standard, then images. https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2d-documents-chatgpt-prompt.md then https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2e-images-chatgpt-prompt.md
- **Track B, Claude in Chrome:** gigs, proposals, messages and meetings (Steps 4 and 5). https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/claude-track-b-gigs-messages-meetings.md
- The two tracks use different documents (track A: DOC-02, BIL-01 and the new documents it makes; track B: ENG-01), so they do not collide.
- Every agent test now starts with the "How to work" block (docs/tests/AGENT-RULES.md) and says where to click at each step. The older prompts are marked "Not rewritten yet" until Claude rewrites them.

## 2. What needs testing, in this order
- Done: the Appearance choice, 2026-11-07, passed; the narrow-screen layout issues it found are fixed.
- Done: the other eight AI helpers, 2026-11-07, 9 of 12 passed; the two real issues fixed, one prompt error corrected. Optional re-run of its steps 2 and 7.
- Done: the checks before a commitment, 2026-11-07, 12 of 13 passed (step 4 was a prompt error, corrected).
- Done: standing arrangements test, 2026-11-06, 18 of 19 passed (step 11 was a prompt error, corrected).
- Next: the Live candidate check (docs/tests/step-9-live-candidate-chatgpt-prompt.md), freelancer, attorney, then owner; look only, about 15 minutes. Covers the sensitive data notice, Home counts, the bench share box and the admin Access list.
- The approved-version page (docs/tests/step-8a-approved-version-chatgpt-prompt.md), attorney then owner, before the usage limits test.
- Now (before 2026-11-07, 2:49 PM Pacific): the standing arrangements test (docs/tests/step-7c-standing-chatgpt-prompt.md), freelancer, attorney, then owner. Items prepared 2026-11-06.
- Then: the usage limits test (docs/tests/step-9b-usage-limits-chatgpt-prompt.md), after the other two; Claude prepares and restores the test attorney.
- Now: the monthly engagements test (docs/tests/step-7c-monthly-chatgpt-prompt.md), freelancer, attorney, then owner. Items prepared 2026-11-06.
- Then: the part 3 check (docs/tests/step-8-ux-part-3-chatgpt-prompt.md), then the attorney UX review again to compare.
- Now: the step 8 UX check (docs/tests/step-8-ux-parts-0-2-chatgpt-prompt.md), freelancer then attorney, look and type only.
1. Logging in during ChatGPT tests: BD's reCAPTCHA cannot be turned off and blocks ChatGPT's agent. Stacey clicks "Take over" in ChatGPT, logs in herself at https://www.hirelegalhelp.com/login, and hands control back. Tests are grouped by login, so this happens about three times per test.
2. Step 3 test (profiles and verification), passed 2026-11-05: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-3-chatgpt-prompt.md
3. Short screens test (Ask DELA, Files, library, exports, own key): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-short-chatgpt-prompt.md
4. Connector test in your own Claude and ChatGPT: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2b-connector-test.md
5. Recorder check on a real computer (Chrome, then Edge and Firefox): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-recorder-chatgpt-prompt.md
6. Step 4 test (gigs, matching, proposals): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-4-chatgpt-prompt.md
7. Step 5 test (messages, booking, meetings), after Step 4: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-5-chatgpt-prompt.md
8. Step 6 test (agreements, payments, delivery, payouts), after the Stripe setup and Step 4: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-6-chatgpt-prompt.md
9. Step 7 test (reviews, bench, webhooks), after Step 6: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-7-chatgpt-prompt.md
10. Document standard test (no other test needed first): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2d-documents-chatgpt-prompt.md
11. Images test (after the document standard test): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2e-images-chatgpt-prompt.md
12. The owner group of the polish recheck (ChatGPT ran out before it on 2026-11-05).
13. For each report you send: Claude fixes what failed (a Fix commit with a test), puts it on the test site again, and gives you the part to run again.

After a step's report passes, Claude records that version for Release Control, runs the AI review and attaches your report. No version after 0.2.0 is recorded yet.

## 3. What needs revisions or work

**Checked 2026-11-13.** The items from the two reviews of 2026-11-08 listed below are closed. Already done in steps 8b and 15: the Home counts, the attorney profile's "Still needed before paid work" line, the list of unfilled gaps in the Quality check, the RACI key, read receipts on their own card, file versions and dates, the default listing photo, "Get set up" leaving the menu, the microphone wait in the Files test. Done on 2026-11-13 (migration 0098): "Message removed" says who removed it; the notice "A message was not delivered" opens that conversation; a monthly change shows the freelancer what they receive, now and proposed; finished and canceled engagements fold away on a long list; the availability card says when the profile's time zone differs and has a date picker for days off. Both leftovers are closed: an approved monthly change stays in view as "Approved change, not started yet" (already built), and a saved message draft is flagged under the message box before sending (built 2026-11-13, waiting for release until the website is back).

Code and tests (Claude)
- Disputes (step 11) are on the test site; waiting on Stacey's ChatGPT test (docs/tests/step-11-disputes-chatgpt-prompt.md). Later: a chargeback evidence pack, connector tools for disputes. Live: dispute_center stays off until the lawyer reviews terms clause 6.
- From the two reviews of 2026-11-08 (UI review: docs/reviews/test-reports/2026-11-08-step-10-ui-review.txt; UX review on a phone: 2026-11-08-step-10-ux-review.txt). Fixed for the next version: one color per state on every page, dark links, filters and boxes, Team roles lined up, no empty box under the meeting times, the AI button in the same blue, Home badges matching the Profile, one count of DELA actions, plain Library footer, "Coming soon" only where a feature is really off, no "accepted 0 of 0", the match-ready help name, and a bottom menu that scrolls instead of squeezing when there are more than seven tabs. Still to do:
  - Home: "2 open gigs" next to "9 of 10 available". Check how each is counted and use one count.
  - The monthly change: show the freelancer's own payout before and after in the comparison, and keep the approved change (new price, new amount, start date) on the agreement until it starts.
  - Freelancer Work: put invitations and things to do above the long engagement list, and fold finished and canceled engagements.
  - Freelancer profile: the meetings time zone and the "How you work" time zone can differ. Show both together and say when they differ. Days off: a date picker instead of typed dates.
  - Attorney profile: "Ready" sits above empty firm details needed for a paid engagement. Say what is still needed before the first paid job.
  - Notices: "A message was not delivered" should open that conversation.
  - Messages: "Message removed" should say why. A saved draft that looks sensitive should be flagged before sending.
  - An approved document with "[Add the menu path in your system]" left in it: list those gaps next to "Ready to use". RACI letters need a short key on the reading view.
  - Read receipts sit under AI settings; move them to a messages setting.
  - Files: two files with the same name look alike; show the version or date more clearly.
  - Outside DELA (Stacey, in BD): the BD sidebar plan name ("Attorney Free", "Free") differs from the DELA plan.
- Merge the work into main. 25 commits sit on the work branch. This needs a pull request with Tests green. Merging by itself starts once you turn on auto-merge and the main rule (Step 1c).
- The Files browser test's Talk step failed once on GitHub, because the test microphone started slowly. Make the test wait for it.
- Listing photo: a member with no photo shows the site's default logo. Hide default pictures.
- Practice areas on the BD listing as categories. This waits on the BD key permission (below).
- Clean up test data on the test site (smoke-test playbooks, chats, sessions) before the beta. Claude asks you before deleting anything.

Settings that hold a suggested value (you confirm; none of these block building)
- Playbook limits per plan. Suggested: Free 10, Plus 40, Pro 90, Business 140.
- AI credit costs per task, and the AI model names.
- Recorder: longest recording per plan, days videos are kept, credits per recording.
- Connector: which plans include it (all for now), and whether members may post or send from ChatGPT and Claude (off).
- Profile documents (10 files, 10 MB each), the yearly license re-check, and 30 grace days.
- A booking link for the 10 minute verification video call (empty: the team emails the attorney).

Things only you can provide
- BD key permission for categories:
  1. In the hirelegalhelp.com BD admin, open the API keys page (search the admin for "API").
  2. Open DELA's key and click Permissions.
  3. Turn on list_professions and the services list.
- A real Scribe export (HTML and Markdown) to confirm the Scribe importer.
- Vectera: answers to the 11 questions (https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/research/vectera-meetings-evaluation.md), API access, and the custom domain (for example meet.lawfecta.com).
- A Chrome Web Store developer account in your name, if we build the recorder extension.
- Stripe account in test mode, Connect, and the two secrets in Supabase: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STRIPE_SETUP.md
- A lawyer's review of the agreement terms template and the chargeback rule, before live payments.

## 4. What we build next
- MVP (2026-11-09): all 16 items built and on the test site (see STATUS). Next: Stacey runs docs/tests/mvp-chatgpt-prompt.md; confirm Stripe test keys and run one test-mode payment and payout; then the Live setup (LIVE_READINESS sections 3 and 6).
- Step 13, the DELA guide (docs/briefs/step-13-dela-guide.md): built and on the test site 2026-11-09. Waiting on Stacey's ChatGPT test (docs/tests/step-13-dela-guide-chatgpt-prompt.md). Later: a connector tool for the next step.
- Next: step 12, the new layout (docs/briefs/step-12-layout.md). Mockup done (desktop and phone); waiting on Stacey's answers, then build it behind the new_layout switch. The Lawfecta logo is already in place everywhere (2026-11-09).
- Done: UX review parts 0 to 3 and step 7c part 2 (standing arrangements) on the test site. Phase 4 (docs/briefs/step-8a-phase-4.md, answered 2026-11-06): parts A (the approved-version page) and B (the checks before a commitment, with the freelancer helpers) are on the test site. All 14 AI helpers and the Appearance choice are on the test site (2026-11-07), so Phase 4 is built except the first ten minutes, which waits for the onboarding widget after the MVP launch.
- Built: attorney plan usage limits (step 9b), on the test site with blocking off. Turn blocking on after the test.
- Pro trial and downgrade to Free (docs/briefs/step-9-pro-trial-downgrade.md): built 2026-11-08 with a stand-in for BD (rules, run, emails, summary, admin Trials tab, Dry run mode; DELA's own trials switch removed from the plan logic). BD connected 2026-11-08 (lib/trial/bd-live.ts). Next: Stacey allows Users, User Metadata, Single Image Posts and Multi Image Posts (and any billing read permission) on DELA's BD key, runs a Dry run, sets bd_trial_downgrade to Everyone for 3 dry-run days, then switches to Live. Before Live: confirm BD's post type values for trial.free_hidden_types and the Active status value for trial.bd_active_value.
- Built 2026-11-07, on the test site behind client_details_allowed: the client information check follows the sensitive data rule (docs/briefs/step-9c-client-information-check.md). Its ChatGPT test: docs/tests/step-9c-client-details-chatgpt-prompt.md (freelancer, attorney, owner).
- Step 8b (docs/briefs/step-8b-ux-retest.md, answered 2026-11-07): Part A built and on the test site; its ChatGPT check is docs/tests/step-8b-part-a-chatgpt-prompt.md. Part B (the plain-language Library, from Stacey's own brief and mockup) built behind library_workspace and on the test site: Stacey reviews it on computer and phone (B10), Claude adjusts from her notes, then writes its ChatGPT check. Part C built and on the test site; its ChatGPT check is docs/tests/step-8b-part-c-chatgpt-prompt.md. After Part C's check: the same look-only attorney review again, compared with the 2026-11-07 retest (brief question 10).

Every step follows the same path:
1. Claude writes a brief with a suggested answer for every question.
2. You answer.
3. Claude builds the whole journey for attorneys and freelancers, including mistakes and misuse, on the test site.
4. Claude tests it.
5. You run one ChatGPT test.
6. Then the next step.

Each step also adds its tools to DELA in ChatGPT and Claude.

### Step 4: Matching, Flex Gigs, proposals, tech catalog
- Attorneys post a gig from an approved playbook: budget range, deadline, milestones, files shared with the chosen freelancer. Only verified attorneys can post.
- Matching checks eligibility first, then ranks. Eligibility means match-ready, availability confirmed, the right skills and practice areas, states the freelancer excludes, and no hold. DELA shows fewer matches rather than inactive people.
- Freelancers see matches and send proposals (price, milestones, schedule, qualifications) within their plan's monthly proposals. The attorney compares proposals and asks questions.
- Tech catalog: legal tools, linked to the tech tools members pick on their profile.
- Questions for you in the brief: gig rules and limits, what a proposal must include, how matches are ranked, invitations, and what freelancers see before using a proposal.

### Step 5: Booking, calendars, meetings and chat (Vectera)
- Booking against both people's calendars. Each booking makes a Vectera room through Vectera's API. Both join by link on Lawfecta's own address with Lawfecta branding, with nobody from Lawfecta in the room.
- Messages between attorney and freelancer happen in DELA, not in Vectera's chat. DELA reads every message and catches talk about paying outside Lawfecta: the member is warned and the Lawfecta Team is flagged.
- Both people consent before anything is recorded or transcribed.
- Transcripts depend on Vectera's answers:
  - If Vectera can start notes or recording and hand them over by API, DELA takes the transcript after each meeting. The AI learns what each side needs, helps the attorney hire, and checks for off-platform payment talk.
  - If not, DELA asks both people for a short summary after the meeting ("what did you agree?"), and automatic transcripts move to later.

### Step 6: Contracts and payments (Stripe test mode)
- A fixed-fee agreement naming the firm and who signs for it (firm details from Step 3), signed electronically.
- Each milestone is funded before work starts. Freelancer payouts and Lawfecta fees come from settings. All money is kept in cents, and records are never edited or deleted.
- Payments stay in Stripe test mode until you turn on live payments. Disputes, refunds and chargebacks follow the Decision Sheet.
- Built 2026-11-05 with your 18 answers as suggested. Waiting for the Stripe setup, then your ChatGPT test.

### Step 7: Reviews, benches and webhooks
- Reviews after completed work, kept separate from reviews by past clients.
- A personal or firm bench of trusted freelancers.
- Webhooks so members can connect DELA to their own tools.
- Built 2026-11-05 with your 18 answers as suggested: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-7-reviews-bench-webhooks.md
- Next: Step 7c, monthly recurring engagements and limited automatic repeat hiring (its own brief, after your Step 6 test passes).

### Step 7b: Affiliates and referrals (Partnero)
- Part 1 runs on the current BD site.
- Part 2, inside DELA, comes after Step 6: a credit ledger and Refer and earn cards. The brief's questions are still open: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-7b-partnero-referrals.md

### Beta launch (after Steps 4 to 6 pass their tests)
- The full Live guide (2026-11-07): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/LIVE_READINESS.md. Version 0.9.2 (0.9.0 plus the fixes from both AI reviews) is recorded as the first Live candidate.
1. Set up Live in the Lawfecta Live Supabase organization. Upgrade it to Pro, then add the secrets and the GitHub environment (https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STACEY_CHECKLIST.md, Part C).
2. First push from Release Control, then install the DELA widgets on lawfecta.com.
3. The beta uses real payments (Stacey 2026-11-07): the lawyer's review, live Stripe keys, point-in-time recovery, the uptime monitor, a restore drill and one real end-to-end payment first (docs/LIVE_READINESS.md section 6).
4. Add beta members to Live's access list in small groups. Feedback through Userback if you want it.

### Step 8: Launch readiness
- A full test on Live, a security review, a backup restore drill and the uptime monitor.
- Point-in-time recovery turned on, and live payments turned on by you.

### Agencies (step 7d), Stacey answered 2026-11-05; parts 1 to 2c on the test site, part 3 built
- Brief and answers: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-7d-agencies.md
- Part 1, on the test site and tested by Stacey (25 of 28; the 3 failures fixed):
  - A Freelancer Business member's own organization becomes their agency, with an "Agency" tab: business name and state, team, 3 seats (owner included), roles (owner, manager, member), invitations, and the agency's jobs.
  - Agency proposals: "Send as" the agency and "Who will do this work (required)", with each person's role. They share the agency's proposal allowance.
  - The attorney sees the agency, the people and their roles on the proposal, and "Who's working on this" after the hire. Changes to the team send the attorney an information-only notice.
  - Only the owner and managers sign, change, cancel or dispute. Team members do the work and open the job's files.
  - Reviews go to the agency and to each person named.
  - Admin area, "Agencies" tab: the one-time business check and a hand-raised seat limit for one agency.
- Part 2a and 2b, on the test site (Stacey's ChatGPT test: docs/tests/step-7d-bench-chatgpt-prompt.md): the bench agreement with the signed split and the Plus minimum; bench work on attorney engagements with the split for the job, split payouts, payout holds with reminders, and chargebacks taken back from both shares.
- Part 2c, on the test site and tested by Stacey 2026-11-06 (18 of 18 passed; the 3 confusing messages fixed): the agency's own gigs (its Library, posting after the business check, Talent, the bench first, the agency as the client, and on a bench hire the agency pays both fees).
- Part 3, on the test site and tested by Stacey 2026-11-06 (16 of 17; the failure fixed): the subcontracting disclosure on agency proposals and agreements, the attorney's "No subcontractors on this engagement" before signing, linked gigs whose hire appears on the attorney's "Who's working on this", confidentiality and no-poaching terms for every subcontractor, and the copy flag for the Lawfecta Team.

### Security and sensitive data (step 6d), built 2026-11-05
- Built and on the test site, with Confidential materials (step 6c). Next: Stacey's ChatGPT test (docs/tests/step-6d-security-chatgpt-prompt.md), the /security page install (docs/STACEY_SECURITY_PAGE.md) and the OpenAI settings (docs/RUNBOOK.md).
- Before Live: a virus scanner, a lawyer's review of the confidentiality clause, and the Live database in a US region (docs/STACEY_CHECKLIST.md Part C).

### Monthly recurring engagements and repeat hiring (step 7c), Stacey answered 2026-11-06
- Part 1, monthly engagements: built 2026-11-06 (next: the test site and Stacey's ChatGPT test).
- Part 2, standing arrangements for repeat hiring: on the test site 2026-11-06 (migrations 0052 and 0053), test accounts only. Off on Live until counsel approves the wording.

### Before the beta: guided setup and "Automate or delegate" (step 4d), Stacey answered 2026-11-06; parts B and C built (next: the test site and her ChatGPT test)
- DELA reviews a playbook and recommends specific steps (never the whole playbook) to automate with a tool from the tech catalog, or to delegate to a freelancer.
- The delegate path runs on one screen: the SOP for that task, its metrics and KPIs, then posting the gig.
- A one-screen "Get set up" sequence for attorneys: profile, teach DELA about the firm, first playbook, automate or delegate, first gig.
- Brief: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-4d-guided-setup-delegate-automate.md

### 2027: confirm a new sign-in email (roadmap only)
- Stacey 2026-11-12: for the pilot it is fine that the Lawfecta website (Brilliant Directories) changes a sign-in email without confirming the new address. In 2027: get a confirmation step, done through Brilliant Directories (their setting or a request to their support), because sign-in, email and password all run through BD and DELA follows what BD does.

### 2027: attorney team seats (roadmap only)
- docs/briefs/roadmap-2027-attorney-team-seats.md. First task in 2027: a feasibility review of BD Sub Accounts and seat billing, with a written estimate. No build before then.

### End of Phase 1, after the MVP launch (Stacey 2026-11-05)
- **Onboarding widget** for attorneys and freelancers when they sign up. Each step can be skipped; the goal is to get people active.
  - Attorneys: profile, first playbook, first gig (reuses the "Get set up" sequence).
  - Freelancers: every part of DELA, to finish the profile, become match-ready, gain visibility and teach DELA how they work.
  - Brief: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-4d-guided-setup-delegate-automate.md (part A)
- **Evaluate the tech catalog** (Stacey 2026-11-05) with the other features above, then decide whether to include it.
  - It is already built (Step 4) and stays on the test site for testing. It is not part of the MVP: its switch (tech_catalog) stays off on Live.
  - While it is off, two things change:
    - Ask DELA must name no specific products, apart from the tools the member lists in their own profile. Without the catalog, the AI could otherwise name any product, as it did with "Google Workspace" in the track B test.
    - In "Automate or delegate" (step 4d), the Automate path suggests only tools the firm already lists in its firm profile.
- **Evaluate live chat and the "Ask DELA about a freelancer" assistant** on freelancer profiles, then decide whether to build them.
  - Brief: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-4c-freelancer-profile-chat.md

### Later (Phases 1B and 1C)
- Recorder Chrome extension.
- Playbook marketplace (15% commission, in the Decision Sheet).
- More actions from ChatGPT and Claude.
- Automatic meeting transcripts, if Vectera allows them later.

### Phase 2: connect the tools members already use (Stacey 2026-11-05)
Attorneys and freelancers connect the tools they already use, so that:
- playbooks can read contacts, matters and other records, and import data, to support the attorney's work
- the attorney can give a freelancer the contacts they need for one engagement

How it fits the specs:
- Phase 1B (docs/specs/02) already plans read-only connections first: Google and Outlook calendars, selected files, and Clio Manage selected records.
- Phase 2 (docs/specs/04) adds actions that write back to those tools, each approved by the member.
- Stacey's direction: plan all of this as one connected Phase 2 track, starting read-only.

First tools to consider:
- Practice management: Clio, MyCase, PracticePanther, Smokeball, Filevine.
- Calendars and contacts: Google and Microsoft 365.
- Storage: Google Drive, Dropbox, OneDrive, Box.
- E-signature and intake forms.

The final order follows what members actually use, from the firm profile's "systems" answers and the tech catalog.

How it works:
1. **Connect.** A member clicks "Connect" on a tool in a new Integrations card.
   - Sign-in goes through the tool's own secure login (OAuth), asking for the fewest permissions and read-only first.
   - DELA never sees or stores the member's password for that tool.
   - The connection is locked to that firm. The member can disconnect at any time, and disconnecting deletes the stored access at once.
2. **Playbooks read live data.** A playbook step that names a tool (for example "open the matter in Clio") can show the matching record, contact or task when the attorney runs it.
3. **Import.**
   - The attorney picks what to import: contacts, a matter's details, or a document from storage.
   - Nothing is imported in bulk without a choice.
   - Imported records show where they came from and when.
4. **Contacts for a freelancer.**
   - The attorney picks the contacts a freelancer needs for one engagement.
   - They go into that engagement's Confidential materials, never to the whole matter or the attorney's address book.
   - The freelancer's access ends with the engagement, under the same expiry and deletion rules as other shared files.
5. **Writing back (later in Phase 2).**
   - DELA proposes an action, for example "create this task in Clio".
   - The attorney approves it, and DELA keeps a record that can be undone where the tool allows.
   - Delete actions are never requested.

Rules this must follow (checked again in its brief):
- Client contact details (names, phone numbers, emails, addresses) count as normal data under the security rules, but they belong only inside an engagement's Confidential materials when shared with a freelancer.
- Sensitive data (SSNs, IDs, account numbers, medical) is never imported. Fields that hold it are not requested from the tool.
- **AI access:** by default, imported client records are never sent to the AI. The attorney can choose to let DELA read a specific record for a specific task, and never anything inside Confidential materials. This is an open question for the brief.
- Each connection follows the security brief (step-6d): logging, the admin "pause this connection" switch and the emergency stop.
- The firm can export or delete everything imported.

To prepare in Phase 1 so Phase 2 plugs in cleanly:
- Tie the tools named in playbooks and firm profiles to tech catalog IDs. Today they are stored as plain names. With IDs, a connected tool can be matched to the steps that use it. This is small, and fits the "Automate or delegate" build (step 4d), which already checks tool names against the catalog.
- The connector for ChatGPT and Claude and the outgoing webhooks already use the same permission checks the integrations will use.

A brief with questions comes before the build, when Phase 2 starts.

## 5. Where to find things
- Build status, detail by step: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/STATUS.md
- Roadmap: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/ROADMAP.md
- Briefs (each step's questions and answers): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs
- ChatGPT test prompts: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests
- Decision Sheet: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/Decision_Sheet.md
- Your setup checklist (Live): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STACEY_CHECKLIST.md

## Step 15: the compact workspace (2026-11-11, replaces step 12)
Brief and decisions: docs/briefs/step-15-compact-workspace.md. Mockup page: https://claude.ai/artifact/9Fp5SWMoaue7YARdpvmXcL (11 boards; waiting for Stacey's approval).
Build order after approval, all behind the switch `new_layout`:
1. The switch (config/decisions.json, migration) and `me.profile_summary` in GET /me (score, missing details with labels, readiness, verification).
2. The shell: `tabsFor()` returns groups; sidebar on desktop (folds, remembered with `localPref`), five-item bottom bar with a "More" sheet on phones, 56px and 52px top bars, the address follows the tab, one SVG icon set (shared/dela-core.js, app/dela-app.js `nav`, `header`, `draw`).
3. Density and colors under `.dela.nl`: card, heading and control sizes from the specs board; `button.blue` takes the burgundy; dark values; reduced motion.
4. Home for both sides: profile box with deep links (`&section=` in `drawProfile`), Work, one-line Ask DELA with "Pause suggestions", plan line; the hero, guide bubble and "What DELA will do for you" list are not shown.
5. Settings (today's `tab=ai`) and a new Help page.
6. Admin sidebar with the 25 tabs in groups.
7. Tests: layout-test.js rewritten (320 to 1440 widths, first-screen check at 390 x 844, More, fold, keyboard, zoom), guide, foundation, profiles and appearance tests updated, a switch-off run, the accessibility check in both themes.
8. AGENT-RULES.md and the 36 prompts that repeat its page description; one ChatGPT test; then the switch on for everyone before pilot members are invited.
9. From revision 2 of the mockups (behavior changes, each with tests): "Paid out this month" next to the all-time total (dela_home_counts, calendar month, Pacific); "Get set up" leaves the attorney menu when finished or dismissed; number tiles open filtered lists; an admin account button and admin groups that stay open; "side" renamed "workspace" in every text members read; Inbox with its count in the phone top bar; the eligibility block (LinkedIn check and Availability, with their real states) on Home.
10. Revision 3 (Stacey 2026-11-12), done and on the site for the Lawfecta Team: the phone bar's edge check and holder, the modal More sheet, "Account and security" (member Settings, account menu, admin "My account"; migration 0095), Home with work before setup, the accurate profile card, the simpler Ask DELA card. Waiting on Stacey: open "Change email" and "Change password" once each to confirm the website pages; decide on the website's unverified email change; look at Home on her phone again.
11. Done 2026-11-12 and on the site behind the switch (on for the Lawfecta Team and the two test accounts): the admin sidebar with one account button and the phone "Menu" sheet, "Payment overview", "workspace" in every text, numbers on Home that open their list, the accessibility pass, the new-layout lines in AGENT-RULES.md, and the ChatGPT test docs/tests/workspace-chatgpt-prompt.md.
11b. Done 2026-11-13: "Needs attention" as the first card on the admin Payments page (admin/dela-admin.js `attentionCard`, `showCard`), with checks in tests/pw/workspace-test.js.
12. Done 2026-11-13 on Stacey's yes: new_layout is on for everyone; AGENT-RULES.md and the older prompts carry the new page description. The old shell is removed one release later.
12b. Done 2026-11-12: Stacey ran the new layout ChatGPT test, 20 of 21 passed; step 17 was a narrow browser window, no defect (docs/reviews/test-reports/2026-11-12-new-layout.txt).
15. Done 2026-11-12: step 16, the Subscription page and the limit banner (docs/briefs/step-16-subscription.md). Open: whether members on the plans DELA does not list need their own cards; a ChatGPT check of the page after Stacey has looked at it.
14. Done 2026-11-12: test money cleared, live Stripe key and webhook in, live_payments on, the site marked live. Real test payments skipped by Stacey; the first real payment must be checked against Stripe. Left: pilot members on the access list, uptime monitor, restore drill, the fuller ChatGPT test, a virus scanner before confidential materials go back on.
13. Done 2026-11-13: all 52 older prompts checked step by step; 26 carry an "Open point" line at the top saying what must be prepared before they are sent again (none is sent before the test data is cleared). The leftovers the check found in the screens and database texts are fixed (migration 0099).
Not in this step: search, "+ New", the money chart, an admin date filter.

