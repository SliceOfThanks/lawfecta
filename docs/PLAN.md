# DELA Phase 1 plan

Last updated 2026-11-04. Read this with STATUS.md. It shows what is done, what is being tested, what needs work, what is waiting on Stacey, and what comes next.

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
| 2a | Own AI keys, talking to the AI, Files | Done | Passing, real AI checked | Not run yet |
| 2 | Playbook library, versions, comments, exports, Import from Scribe | Done | Passing, real AI checked | Not run yet |
| 2r | Process Recorder beta | Done (no Chrome extension) | Passing | Not run yet |
| 2b | DELA in ChatGPT and Claude (connector) | Done | Passing, checked on the real site | Not run yet (needs your accounts) |
| 3 | Profiles and verification, tech tools, the AI reads the member's own profile | Done | Passing, BD listing read and write checked | In progress, blocked at the BD login |

Tests today: 8 database test files, 84 API tests, 15 script tests and 198 browser checks. GitHub Tests: https://github.com/SliceOfThanks/lawfecta/actions

## 2. What needs testing, in this order
1. Get ChatGPT past the BD login. The login uses Google reCAPTCHA, which blocks ChatGPT's browser. Either:
   - In ChatGPT agent, click Take over, log in yourself at https://www.hirelegalhelp.com/login, then hand control back; or
   - In the hirelegalhelp.com BD admin, search for "reCAPTCHA" and turn it off for the member login (test site only).
2. Step 3 test (profiles and verification): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-3-chatgpt-prompt.md
3. Short screens test (Ask DELA, Files, library, exports, own key): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-short-chatgpt-prompt.md
4. Connector test in your own Claude and ChatGPT: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2b-connector-test.md
5. Recorder check on a real computer (Chrome, then Edge and Firefox): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests/step-2-recorder-chatgpt-prompt.md
6. For each report you send: Claude fixes what failed (a Fix commit with a test), puts it on the test site again, and gives you the part to run again.

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
- Stripe account (test mode) and Connect setup, before Step 6.

## 4. What we build next

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

### Step 7: Reviews, benches and webhooks
- Reviews after completed work, kept separate from reviews by past clients.
- A personal or firm bench of trusted freelancers.
- Webhooks so members can connect DELA to their own tools.

### Step 7b: Affiliates and referrals (Partnero)
- Part 1 runs on the current BD site.
- Part 2, inside DELA, comes after Step 6: a credit ledger and Refer and earn cards. The brief's questions are still open: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs/step-7b-partnero-referrals.md

### Beta launch (after Steps 4 to 6 pass their tests)
1. Set up Live in the Lawfecta Live Supabase organization. Upgrade it to Pro, then add the secrets and the GitHub environment (https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STACEY_CHECKLIST.md, Part C).
2. First push from Release Control, then install the DELA widgets on lawfecta.com.
3. Add beta members to Live's access list in small groups. Feedback through Userback if you want it.

### Step 8: Launch readiness
- A full test on Live, a security review, a backup restore drill and the uptime monitor.
- Point-in-time recovery turned on, and live payments turned on by you.

### Later (Phases 1B and 1C)
- Recorder Chrome extension.
- Playbook marketplace (15% commission, in the Decision Sheet).
- More actions from ChatGPT and Claude.
- Automatic meeting transcripts, if Vectera allows them later.

## 5. Where to find things
- Build status, detail by step: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/STATUS.md
- Roadmap: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/ROADMAP.md
- Briefs (each step's questions and answers): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/briefs
- ChatGPT test prompts: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/tests
- Decision Sheet: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/Decision_Sheet.md
- Your setup checklist (Live): https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/STACEY_CHECKLIST.md
