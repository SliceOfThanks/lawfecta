# DELA Phase 1 plan

Last updated 2026-11-06. The one-page picture (built, in progress, next, before the MVP, after) is docs/MVP_OVERVIEW.md. Stacey's own checklist, in order, is docs/STACEY_TODO.md. Read this with STATUS.md. It shows what is done, what is being tested, what needs work, what is waiting on Stacey, and what comes next.

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

Code and tests (Claude)
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
- Done: UX review parts 0 to 3 and step 7c part 2 (standing arrangements) on the test site. Phase 4 (docs/briefs/step-8a-phase-4.md, answered 2026-11-06): parts A (the approved-version page) and B (the checks before a commitment, with the freelancer helpers) are on the test site. All 14 AI helpers and the Appearance choice are on the test site (2026-11-07), so Phase 4 is built except the first ten minutes, which waits for the onboarding widget after the MVP launch.
- Built: attorney plan usage limits (step 9b), on the test site with blocking off. Turn blocking on after the test.
- Waiting on Stacey: the Pro trial and downgrade to Free (docs/briefs/step-9-pro-trial-downgrade.md). Plan only; not built until she answers.

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
