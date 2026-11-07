# Feature brief: The client information check follows the sensitive data rule

Step: 9c   Spec references: Stacey's sensitive data rule (2026-11-05, docs/briefs/step-6d-security-sensitive-data.md, question 18), the notice change (Stacey 2026-11-07, "update the notice"), AI review of 0.9.0 (privacy 3)
Status: answered by Stacey 2026-11-07 ("all as suggested"). Built 2026-11-07: migration 0060, the api check (sensitive() by place), the connector, the Files check, the re-check of held files, the screens, api tests (client_details_test.ts) and a browser check (ai-files).

## The problem in one paragraph
Your rule from 2026-11-05 says six kinds of sensitive data are never uploaded or typed, only linked from the firm's own storage: SSNs and ITINs, government ID numbers, financial account numbers, health information, biometric data, and logins and passwords. Client names, dates of birth, contact details, case numbers and case facts are normal data, kept only where the security rules allow. The notice on screen now says this. DELA's automatic check still works the old way: it treats client names, dates of birth, case numbers, phone numbers, email and street addresses as the problem, and it does not look for most of the six sensitive kinds. So members are stopped for normal work data, and some truly sensitive data (a health record, a driver's license number, a password) can get through without a word.

## What the check does today
DELA has two separate checks.

1. **The client information check** (supabase/functions/api/lib/ai/clientcheck.ts). It looks for client names ("my client Jane Doe"), dates of birth, case and docket numbers, SSNs, account numbers, and, more weakly, case captions ("Smith v. Jones"), phone numbers, email and street addresses. It runs in four ways:
   - **Typed text sent to DELA's AI** (Ask DELA, drafting answers, the AI helpers, profile writing, gig drafts, notes). DELA shows "This may include client information" and the member can still send after confirming.
   - **Messages between members** (gig conversations and invitation messages). Same warning first, then the check for working or paying outside Lawfecta.
   - **ChatGPT and Claude through the connector.** A hard refusal: "DELA does not accept client names, case numbers or similar details." There is no way to confirm.
   - **Files in the Files tab and profile documents.** The pattern check plus an AI check on Lawfecta's key. A flagged file is held until the member clicks "It has no client information".
2. **The sensitive data block** (supabase/functions/api/lib/confidential/rules.ts). It finds SSNs, ITINs and card numbers and refuses them outright on jobs (files and links shared with a freelancer, Confidential materials). This one already follows your rule, but it only knows SSNs, ITINs and card numbers.

Separate from both: the document standard's quality check "No client names, matter facts or client data" on SOPs, workflows, policies and playbooks. Documents are templates that get reused and shared with freelancers on gigs, so they use roles and fictional examples. This brief suggests keeping that rule (question 5).

## Who
Attorneys, firm staff, freelancers and agencies on every plan, and the Lawfecta Team (held files and messages, the admin review queue).

## What
1. **One check for the six sensitive kinds, everywhere.** Sensitive data is stopped wherever people type or upload, with the same message: what kind was found and "Share a link from your own storage instead." The check learns the kinds it does not know today:
   - government ID numbers (driver's license, passport, state ID, with the words next to them)
   - bank account and routing numbers (with the words next to them), as well as card numbers
   - logins and passwords (DELA already finds these in documents and can reuse that)
   - health information and biometric data: hard to spot by pattern, so the AI check reads files for them, and typed text gets a reminder when words such as "diagnosis", "medical record", "fingerprint" or "face scan" appear (question 4)
2. **Client details are allowed where your rule allows them.** Client names, dates of birth, contact details, case numbers and case facts no longer trigger a warning or a hold in the places listed in question 1.
3. **Client details stay out of public places.** Profiles, profile documents, the public version of a gig that many freelancers see before anyone is hired, and reviews keep a warning, because people outside the job read them (question 3).
4. **The connector matches the screens.** ChatGPT and Claude are refused only for sensitive data and for client details in public places, with the same words the screen uses.
5. **Files already held are checked again** under the new rule, and released if client details were the only reason (question 6).

## Where
- Member app: Ask DELA, the AI helpers, document drafting, Files ("Add files"), gig conversations, the profile and profile documents, the gig form, reviews.
- Connector: the ChatGPT and Claude tools.
- Admin: held files and held messages, with the reason now naming the sensitive kind.
- Settings and switches: listed below.

## When
- The check runs at the moment someone sends, saves or uploads, as today.
- Files: at upload, as today. The re-check of held files runs once when the switch is turned on.

## Why
- Members stop being blocked for normal legal work data, which today makes them work around DELA or give up.
- The truly dangerous data (IDs, accounts, health, passwords) gets caught, which protects members and Lawfecta.
- The screens, the connector and the /security page all say the same thing.

## How it could go wrong
- **Health information is hard to recognize.** A pattern can't tell "the client's diagnosis" from a sentence about a firm's own process. The suggestion is a reminder for typed text, never a block, and the AI check for files (question 4).
- **Client details sent to OpenAI.** Typed text and files in the Files tab go to OpenAI on Lawfecta's key for drafting and checking. Until OpenAI approves Zero Data Retention (docs/RUNBOOK.md), OpenAI may keep inputs up to 30 days for abuse monitoring. The suggestion is a one-line reminder before client details go to DELA's AI, turned off once Zero Data Retention is approved (question 2).
- **False alarms on numbers.** A long number such as a file or invoice number could look like an account number. The new kinds need the words next to the number (for example "account", "routing", "license", "passport"), the way the SSN check works today.
- **A member pastes a whole client file into Ask DELA.** The six kinds are still stopped. Client details pass, which is what the rule allows.
- **Freelancers who are invited but not hired.** They see the gig and its conversation before signing anything. Suggested: client details in messages only after the agreement is signed; before that, a reminder (question 8).
- **Going back to an older version.** The check is code only, so going back simply brings back the old, stricter check. Nothing in the database depends on it, apart from the reasons stored on held files.
- **Live before the lawyer's review.** Your gate for Confidential materials already says a lawyer reviews the privacy policy and data handling. The new behavior should stay off on Live until then (question 7).

## Settings and switches it uses
- New switch `client_details_allowed` (off on Live): while off, the check works as today. While on, the new rule applies.
- New setting `privacy.ai_client_details_reminder` (on): the reminder before client details go to DELA's AI on Lawfecta's key. Turn it off when Zero Data Retention is approved.
- Existing: the sensitive data block (SSN, ITIN, card), the conduct check, the AI check model (`ai.model.openai`).

## Questions to make it better
Each question has a suggested answer. Reply "all as suggested" or change any of them.

1. **Where are client details allowed?** Suggested:
   - Files tab (the firm's own storage)
   - Ask DELA and the AI helpers (with the reminder in question 2)
   - Confidential materials, and files and links shared on a job after the agreement is signed
   - Gig conversations after the agreement is signed
   - the attorney's own notes on an engagement
2. **Client details sent to DELA's AI before Zero Data Retention.** Suggested: a one-line reminder the first time in each conversation ("Client details go to OpenAI, which may keep them up to 30 days. Continue?"), turned off by a setting once Zero Data Retention is approved. No reminder when the member uses their own AI key.
3. **Public places.** Suggested: keep the warning for client details in profiles, profile documents, the public version of a gig, and reviews.
4. **Health information and biometric data in typed text.** Suggested: a reminder, never a block, when health or biometric words appear. Files get the AI check, which reads for all six kinds.
5. **Documents (SOPs, workflows, policies, playbooks).** Suggested: keep the document standard's rule (roles and fictional examples, no real client details), because documents are reused and shared with freelancers.
6. **Files held today for client details only.** Suggested: check them again under the new rule when the switch goes on, release those held only for client details, and tell their owner in a notice. Files held for a sensitive kind stay held.
7. **Live.** Suggested: the new behavior ships behind `client_details_allowed`, on for the test site and off on Live until the lawyer reviews the privacy policy and data handling (the same review as Confidential materials).
8. **Freelancers invited but not hired.** Suggested: in gig conversations before the agreement is signed, client details get a reminder (not a block). After signing, nothing.

## Success looks like
Claude's tests (api and browser) cover each kind and each place, with a test that fails on today's check for every change. Then one ChatGPT test, grouped by login:

- **Freelancer:**
  - a gig conversation after signing accepts a made-up client name and case number with no warning
  - a made-up SSN, passport number or password is stopped with "Share a link from your own storage instead."
  - the profile still warns about a client name
- **Attorney:**
  - Ask DELA accepts a made-up client name and case number, with the one-line reminder once
  - a made-up driver's license number is stopped
  - Files accepts a made-up intake form with a client name, and holds one with a made-up SSN
  - the document quality check still asks for fictional examples
- **Owner:**
  - the switch `client_details_allowed` on the Switches tab
  - held files show the sensitive kind as the reason
  - files released by the re-check are listed in the admin activity
