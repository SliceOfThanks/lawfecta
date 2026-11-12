# DELA MVP overview

**Note of 2026-11-13.** This page was written on 2026-11-05 for a test site and a separate Live site. Since 2026-11-10 the pilot runs on one site, https://www.lawfecta.co. For where things stand today read STATUS.md; for what is left for Stacey, in order, read docs/STACEY_TODO.md; for the go-live steps read docs/PILOT_GO_LIVE.md. Built since this page was written: disputes (step 11), the DELA guide (step 13), the fee charged with each milestone (step 14, proven in Stripe's test mode), and the compact workspace (step 15: sidebar, phone bar, Account and security, the admin sidebar and "Needs attention").

Written 2026-11-05. This is the whole picture in one place: what is built, what is in progress, what is next, what must be done before the MVP (beta) launch, and what waits until after it. Detail by step is in STATUS.md, and the working plan is docs/PLAN.md.

Links on GitHub start with https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/ (written below as "GitHub:" and the file path).

## How to read this
- Everything is on the test site (hirelegalhelp.com), only for the access list. Live (lawfecta.com) is not set up and is unchanged.
- "Built" means built with Claude's tests passing. "Tested by you" means your ChatGPT or Claude in Chrome test passed.
- Your decision of 2026-11-04 still stands: no beta users until hiring works end to end (gigs, proposals, meetings, agreements and payments).

## 1. Built (on the test site)

**Foundation and safety**
- Sign in through BD, the access list, roles, plans and limits, notices and the audit log. Tested by you.
- The admin area, with Sign out. Release Control: push to Live, approval codes, go back. Tested by you; the real push waits for Live.
- The safety kit: the rule checker, the AI review and the monthly health report. Your GitHub settings are still to turn on.
- Two sites: hirelegalhelp.com runs the test copy, and lawfecta.com gets Live at launch.

**AI and files**
- Bring your own AI key (OpenAI or Claude), Ask DELA, talking to DELA, and Files. Tested by you; a real member key is not tested yet.
- DELA inside ChatGPT and Claude (the connector). Tested by you.

**Documents**
- The library with versions, comments and exports. Tested by you.
- Import from Scribe. Built; not yet tried with a real Scribe export.
- The Process Recorder beta. Built; your recorder check is not run yet.
- The document standard: Policy, Workflow, SOP and Playbook, with the self-check, RACI, KPIs, IDs, the change log and review reminders. Tested by you (track A: 24 of 26, both failures fixed).
- Images in documents. Built; your test is not run yet.

**Profiles and verification**
- Attorney licenses, freelancer checks, firm details, the BD listing, and the email delivery check. Tested by you.

**Hiring (Steps 4 to 7)**
- Flex Gigs, matching, proposals, Talent and Work, and the off-platform checks. Claude in Chrome track B: most steps passed, failures fixed, a recheck to run.
- Messages, booking and meetings. The Vectera rooms wait for Vectera's API access.
- Agreements, e-signature, milestone payments in Stripe test mode, DELA's milestone check, payouts, refunds, disputes and chargebacks. Your test waits for the Stripe setup.
- Reviews after work and from past clients, the trusted bench, and member webhooks. Your test comes after Step 6.
- The tech catalog. Built, but kept off for the MVP (see section 5).

**Security and confidentiality**
- The sensitive data rules: links only for sensitive data, the sensitive job checkbox, expiring shares, logging, and the 90-day rule.
- Confidential materials, and the /security page with its contact form. Tested by you; the re-test fixes passed by hand.

**Agencies**
- Part 1: the team and seats, agency proposals with "Who will do this work", "Who's working on this", and the admin Agencies tab. Tested by you (25 of 28; the 3 failures fixed).
- Part 2a: the bench with the signed fee split and the Plus minimum. Tested by you.
- Part 2b: bench work on attorney jobs paid by the split, payout holds with reminders, and chargebacks taken back from both shares. Tested by you.
- Part 2c: the agency's own gigs: its Library, posting after the business check, Talent, the bench first, and the agency as the client. A bench hire pays no fee; the agency pays both. Tested by you (18 of 18).
- Part 3: subcontracting. The disclosure on agency proposals and agreements, "No subcontractors on this engagement", linked gigs with the subcontractor on the attorney's list, the subcontractor's confidentiality and no-poaching terms, and the copy flag. Tested by you (16 of 17; the failure fixed).

**Guided setup**
- Step 4d: "✦ Automate or delegate" on approved documents, and the "Get set up" screen for attorneys. Built; your test is next.

**Money rules in place**
- 5% from each side on every plan, with the $10 minimum per side and the $250 minimum engagement.
- Stripe stays in test mode until you turn on live payments.

## 2. In progress now
- Your ChatGPT test of guided setup and Automate or delegate. GitHub: docs/tests/step-4d-automate-chatgpt-prompt.md
- GitHub Tests are green again since the agencies part 2b push. Claude confirms each new run.

## 3. Up next, in order
1. Fix whatever the bench test finds, each fix with a test.
2. Agencies part 2c, the agency's own gigs:
   - the Library for agencies (SOPs and Workflows under the same standard)
   - posting gigs after the team's one-time business check
   - Talent for agencies
   - the agency paying the 5% client fee, plus the 5% freelancer fee when it hires its own bench member
3. Agencies part 3, subcontracting:
   - the disclosure sentence in proposals and agreements
   - "No subcontractors on this engagement" (the database already respects it)
   - linked gigs
   - the conduct flag for copied text
   - a work area where the agency and its subcontractors hand files to each other
4. Your tests that are ready to run alongside:
   - images. GitHub: docs/tests/step-2e-images-chatgpt-prompt.md
   - the track B recheck. GitHub: docs/tests/claude-track-b-recheck.md
   - the recorder check. GitHub: docs/tests/step-2-recorder-chatgpt-prompt.md
   - Step 6, once Stripe is set up. GitHub: docs/tests/step-6-chatgpt-prompt.md
   - Step 7, after Step 6. GitHub: docs/tests/step-7-chatgpt-prompt.md

## 4. Must be built or done before the MVP (beta) launch

**Builds (each starts with a brief whose questions you answer)**
- Agencies parts 2c and 3 (above). Your answer: all agency parts come before the beta.
- Guided setup and "Automate or delegate" (step 4d). Built with your answers; your test is next. GitHub: docs/briefs/step-4d-guided-setup-delegate-automate.md
- Monthly recurring engagements and limited repeat hiring (step 7c). Built with your answers: part 1 (monthly) done, part 2 (repeat hiring) next. GitHub: docs/briefs/step-7c-recurring-repeat-hiring.md
- In-page pop-ups instead of the browser's OK and Cancel boxes (about 70 places).
- Smaller items:
  - hide BD's default logo when a member has no photo
  - practice areas as BD categories (waits on the BD key permission)
  - the Files test waits for the microphone
  - test data cleanup on the test site (Claude asks you first)

**Tests you run and pass**
- images
- the recorder check
- the track B recheck
- Step 6 (after Stripe)
- Step 7
- the agency bench test (now)
- the agency own-gigs test and the subcontracting test, when built

**Things only you can provide**
- Stripe test mode with Connect, and its two secrets in Supabase. GitHub: docs/STRIPE_SETUP.md
- Vectera: answers to the 11 questions, API access, and a custom domain such as meet.lawfecta.com. GitHub: docs/research/vectera-meetings-evaluation.md
- The BD key permission for categories (list_professions and the services list).
- A real Scribe export, to confirm the importer.
- A lawyer's review of:
  - the agreement terms
  - the chargeback rule
  - the confidentiality clause
  - the subcontracting disclosure
  - the bench agreement
- A virus scanner choice for uploaded files.
- The OpenAI account settings: training off, and zero data retention. GitHub: docs/RUNBOOK.md
- The GitHub safety settings: auto-merge, the main rule and the review key. GitHub: docs/briefs/step-1c-safety-kit.md
- Confirming the settings that hold suggested values:
  - playbook limits
  - AI credit costs
  - recorder limits
  - connector plans
  - profile document limits
  - the video booking link

**Launch steps (after everything above)**
1. Merge the work branch into main through a pull request with Tests green.
2. Record each tested version in Release Control, run the AI review, and attach your reports.
3. Set up Live in a US region on the Pro plan, with its secrets and GitHub environment. GitHub: docs/STACEY_CHECKLIST.md (Part C)
4. Your first push from Release Control, then the DELA widgets on lawfecta.com.
5. Beta members added to Live's access list in small groups, with Userback for feedback if you want it.
6. Launch readiness (Step 8):
   - a full test on Live
   - a security review
   - a backup restore drill
   - the uptime monitor
   - point-in-time recovery
   - live payments, turned on by you

## 5. On the back burner: decide once the MVP is running

**End of Phase 1, to evaluate**
- The onboarding widget: a skippable guided start for attorneys and freelancers. GitHub: docs/briefs/step-4d-guided-setup-delegate-automate.md (part A)
- The tech catalog: built, with its switch off on Live. While it is off, Ask DELA names no products.
- Live chat, and "Ask DELA about a freelancer" on freelancer profiles. GitHub: docs/briefs/step-4c-freelancer-profile-chat.md

**Other ideas waiting for your decision**
- Affiliates and referrals with Partnero, part 2 inside DELA: a credit ledger and Refer and earn cards. Part 1 runs on the current BD site. GitHub: docs/briefs/step-7b-partnero-referrals.md
- Import from Scribe add-on (2s): Word and PDF exports, several guides at once, share links, and letting the AI see screenshots. GitHub: docs/briefs/step-2s-scribe-import-plus.md

**Phases 1B and 1C**
- The recorder Chrome extension.
- The playbook marketplace (15% commission).
- More actions from ChatGPT and Claude.
- Automatic meeting transcripts and recording, if Vectera allows them.
- In-app purchase of extra agency seats (switch agency_extra_seats).

**Phase 2: connect the tools members already use**
- Clio and other practice management tools, Google and Microsoft calendars and contacts, and storage.
- It starts read-only. Contacts are shared for one engagement only, nothing sensitive is imported, and actions that write back come later, each approved by the member.

**Switches built and kept off until you decide**
- live payments
- meeting recording
- calendar sync
- multiple hires per gig
- automatic repeat hiring
- recurring engagements
- engagement exports
- trials
- transcript training use
- admin acceptance timeout

## 6. Where to find things
- Build status by step. GitHub: STATUS.md
- The working plan. GitHub: docs/PLAN.md
- Briefs, with each step's questions and your answers. GitHub: docs/briefs
- Agent test prompts. GitHub: docs/tests
- The Decision Sheet. GitHub: docs/Decision_Sheet.md
- Your Live setup checklist. GitHub: docs/STACEY_CHECKLIST.md
