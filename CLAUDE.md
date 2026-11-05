# Working on Lawfecta DELA

Read docs/specs/00 (Program Guide) and the spec for the current phase before building. They are the source of truth for scope.
Read STATUS.md first in every new session. It says what is built, what is live and what is waiting on Stacey.
Then read docs/PLAN.md, the plan for what needs testing, what needs work and what comes next. Keep it up to date at the end of each step.
config/decisions.json holds every approved or proposed business number. Never hard-code a price, fee, limit or deadline in code; read it from settings.

## Owner
Stacey. Not technical with GitHub. She installs code in Brilliant Directories and changes settings; she does not run tests.
Live testing goes to ChatGPT through one ready-to-paste prompt per release.
Agent tests (ChatGPT and Claude) must never make the agent search (Stacey 2026-11-05: searching burns credits). Start every prompt with the "How to work" block in docs/tests/AGENT-RULES.md, and write every step as "Go to" (the exact link), "Find" (the card heading, how far down, left or right), "Do" (the exact button or box name in quotes, as the screen writes it) and "Expect". Check names against the code or a rendered screen before sending. Mark any button that opens a browser OK/Cancel pop-up as (POP-UP) in Claude tests: Claude's browser cancels those pop-ups, so the prompt tells Claude to make the page answer OK first (see AGENT-RULES.md). Claude tests run in Stacey's own Chrome: tell her not to use hirelegalhelp.com in other tabs while one runs. No phone-width checks in agent tests. When Stacey can run two agents at once, split the tests into tracks (ChatGPT and Claude) that use different items so they do not collide.
Group every test (ChatGPT prompts and by-hand steps) by login: all freelancer steps together, then all attorney steps, then the owner (admin area), so each account logs in once. Checks that depend on another account go in one short last group, "Check the results", saying which login each needs. Start each group with "Log in as ..." and end it with signing out.
Writing style for anything she reads: plain, direct, no em dashes, no "it's not X, it's Y", no punchy negation strings.
Every step Stacey must do is spelled out in full every time, even when it repeats an earlier step: the exact website or app, where to click, what to type or paste, and the file (sent again) or link. Never say "run the SQL" without saying where (Supabase, Lawfecta AI project, SQL Editor), and never assume she remembers an earlier message. Prefer doing a step yourself when a tool allows it.
Say exactly where on the page each thing is: which card or heading it sits under, roughly how far down (top, middle, bottom of the page), and the button or box name in quotes. For example: 'On the Profile page, scroll down to the "Your profile" card, then to the "How you work" heading near the bottom; the "Usual hours" box is under "Time zone".' Never name a box or button without where to find it.
Always give a direct, clickable link for every step: the exact page (for example https://www.hirelegalhelp.com/dela?tab=record), and for every file Stacey needs, send it again in that message and also link it on GitHub (https://github.com/SliceOfThanks/lawfecta/blob/<branch>/<path>). Never point her to a file or page without its link. Paste short prompts straight into the message as well.
End every update to Stacey with three clear headings, in this order: "What you need to do next" (numbered steps, or "Nothing right now"), "Next steps in general" (where things stand), and "What I'll build next".

## Every build starts with a feature brief
Before building any feature, write docs/briefs/<step>-<feature>.md from docs/briefs/TEMPLATE.md:
Who, What, Where, When, Why, How it could go wrong, and Questions to make it better.
Stacey answers the questions before the build starts. Build comprehensively: whole journeys for attorneys and freelancers, misuse and edge cases included, never a small slice.
Every release ends with one comprehensive ChatGPT test prompt that covers both sides, mistakes and misuse.

## Two sides, always separate
Attorney DELA and Freelancer DELA are separate experiences with separate plans (att_free, att_plus, att_pro, att_business; fl_free, fl_plus, fl_pro, fl_business), separate fees and separate limits.
One person can hold both sides; each side has its own plan and nothing mixes.

## Architecture
- Brilliant Directories (Lawfecta site): member accounts, logins, BD plans, admin. DELA never stores BD passwords.
- Two Supabase projects: DELA Staging and DELA Live. All app data and secure work. Tables have RLS with no public policies; reach them only through the Edge Function `api` with the service role.
- Code in this repo, served by jsDelivr, pinned to commit IDs (releases.json; git tags cannot be pushed).
- Two BD sites, one per copy (Stacey 2026-11-03). hirelegalhelp.com is the test site: its widgets talk only to DELA Staging, and every new version goes there first. lawfecta.com is the main site: its widgets talk only to DELA Live and are installed there when DELA launches. In everything Stacey reads, Staging is called "the test site (hirelegalhelp.com)" and Live is "Live (lawfecta.com)". Testers test on hirelegalhelp.com; the staging_testers list is not needed. Live shows nothing to anyone outside the access list until Stacey opens it.
- Money: Stripe Connect through a provider adapter. Stripe stays in test mode until Stacey turns on the live_payments switch.
- AI: Lawfecta's OpenAI key by default; members may bring their own OpenAI or Anthropic key (BYOK). Never silently fall back to Lawfecta's key.
- Email: BD internal email if BD can be triggered from Supabase, otherwise Brevo. All email goes through the mail adapter.
- Meetings: Vectera. Recording only with consent from both people.

## BD widgets
DELA-Auth (helper), DELA-App, DELA-Admin. Keep them tiny. BD widget rules: no backslashes, no regex functions, no example URLs with https://, no literal widget shortcodes in widget code, helper widgets start with <?php and end with ?>.

## Staging first, and only Stacey pushes to Live
- Build and deploy only to DELA Staging (the test site, hirelegalhelp.com). Never apply migrations, deploy functions or change settings on DELA Live, even if a tool allows it.
- When a version is ready on Staging and the GitHub "Tests" run passed, record it: select dela_release_record(version, commit, api_version, migrations, notes, tests_run_url, breaking_migrations). Notes are plain words for Stacey. Then give her the ChatGPT test prompt and save her report with dela_release_attach_report.
- A migration that removes or renames something older versions use goes in the breaking list; it blocks going back past it. Prefer splitting it so nothing breaks.
- Pin every outside library to an exact version. Follow docs/RUNBOOK.md for monitoring, backups, restore drills and secret changes.
- Stacey marks it tested and pushes it from the Staging admin area (Releases tab) with her release password. GitHub Actions (.github/workflows/promote.yml, tools/promote.mjs) does the push only after Staging confirms her one-use approval.
- Database migrations are additive and backward compatible, so a rollback only switches code and api back.
- The current Lawfecta site stays unchanged. DELA is added next to it.

## Safety rules that never change
- Sensitive data is never uploaded to DELA, only linked from the firm's own storage. Sensitive data means: SSNs and ITINs, government ID numbers, financial account numbers, health information, biometric data, and logins and passwords. Client names, dates of birth, contact details, case numbers and case facts are normal data, stored only where the security rules allow (Stacey 2026-11-05, docs/briefs/step-6d-security-sensitive-data.md). Show the notice where people type or upload.
- Money in integer cents. Financial and audit history is append-only; corrections are new records.
- Every consequential command is idempotent and re-checks permission at the moment it runs.
- Open decisions ship as a switch or a setting that is off, never as a guess.
- Secrets never go in chat, GitHub, widget code, browser code or logs. Stacey enters them in Supabase herself.

## Safety kit (docs/briefs/step-1c-safety-kit.md)
- tools/rules_check.py runs after every edit (.claude/settings.json) and in GitHub Tests. Fix what it reports. Never weaken a rule to pass; mark a deliberate exception with "rules-ok:" and the reason on that line.
- Fixed stays fixed: every bug fix ships with a test that fails before the fix and passes after, in the same commit, with a message starting "Fix".
- Once Stacey turns on auto-merge and the main ruleset: work on a branch, open a pull request, turn on auto-merge. It merges itself when Tests pass. Never push straight to main.
- When a version is ready on Staging: start the "AI review" workflow (base = the commit of the version on Live, head = the new commit). Put its "Must fix" items in the release notes, and fix them or explain why not, before recording the version.
- At the start of each month's first session, read the latest "DELA health report" issue and deal with "Fix first".
