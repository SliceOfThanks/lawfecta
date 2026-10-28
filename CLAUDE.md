# Working on Lawfecta DELA

Read docs/specs/00 (Program Guide) and the spec for the current phase before building. They are the source of truth for scope.
Read STATUS.md first in every new session. It says what is built, what is live and what is waiting on Stacey.
config/decisions.json holds every approved or proposed business number. Never hard-code a price, fee, limit or deadline in code; read it from settings.

## Owner
Stacey. Not technical with GitHub. She installs code in Brilliant Directories and changes settings; she does not run tests.
Live testing goes to ChatGPT through one ready-to-paste prompt per release.
Writing style for anything she reads: plain, direct, no em dashes, no "it's not X, it's Y", no punchy negation strings.
Every step Stacey must do is spelled out in full every time, even when it repeats an earlier step: the exact website or app, where to click, what to type or paste, and the file (sent again) or link. Never say "run the SQL" without saying where (Supabase, Lawfecta AI project, SQL Editor), and never assume she remembers an earlier message. Prefer doing a step yourself when a tool allows it.
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
- Test accounts on the staging_testers list load the Staging copy; everyone else loads Live. Live shows nothing to anyone outside the access list until Stacey opens it.
- Money: Stripe Connect through a provider adapter. Stripe stays in test mode until Stacey turns on the live_payments switch.
- AI: Lawfecta's OpenAI key by default; members may bring their own OpenAI or Anthropic key (BYOK). Never silently fall back to Lawfecta's key.
- Email: BD internal email if BD can be triggered from Supabase, otherwise Brevo. All email goes through the mail adapter.
- Meetings: Vectera. Recording only with consent from both people.

## BD widgets
DELA-Auth (helper), DELA-App, DELA-Admin. Keep them tiny. BD widget rules: no backslashes, no regex functions, no example URLs with https://, no literal widget shortcodes in widget code, helper widgets start with <?php and end with ?>.

## Staging first, and only Stacey pushes to Live
- Build and deploy only to DELA Staging. Never apply migrations, deploy functions or change settings on DELA Live, even if a tool allows it.
- When a version is ready on Staging and the GitHub "Tests" run passed, record it: select dela_release_record(version, commit, api_version, migrations, notes, tests_run_url, breaking_migrations). Notes are plain words for Stacey. Then give her the ChatGPT test prompt and save her report with dela_release_attach_report.
- A migration that removes or renames something older versions use goes in the breaking list; it blocks going back past it. Prefer splitting it so nothing breaks.
- Pin every outside library to an exact version. Follow docs/RUNBOOK.md for monitoring, backups, restore drills and secret changes.
- Stacey marks it tested and pushes it from the Staging admin area (Releases tab) with her release password. GitHub Actions (.github/workflows/promote.yml, tools/promote.mjs) does the push only after Staging confirms her one-use approval.
- Database migrations are additive and backward compatible, so a rollback only switches code and api back.
- The current Lawfecta site stays unchanged. DELA is added next to it.

## Safety rules that never change
- Confidential client data does not belong in DELA. Show the notice where people type or upload. Members are responsible for what they enter.
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
