# Feature brief: Safety kit (internal, for building DELA)

Step: 1c   Spec references: Stacey 2026-10-27 ("Yes, build the safety kit"), after reviewing Grace (agent-grace.com). Internal only: members never see it, and Grace itself is not used.
Status: approved and built 2026-10-27; questions below tune it.

## Who
Stacey (owner) and Claude while building. Nothing changes for members.

## What
1. Health report: a ranked, plain-language list of what will break first. First one: docs/health/2026-10.md. Then GitHub writes it on the 1st of each month and opens an issue (.github/workflows/health.yml, tools/health_report.py), with an AI "what will break first" section when the Anthropic key is set.
2. Fixed stays fixed: a commit that fixes a bug (message starting "Fix") must change a test in the same commit. GitHub Tests refuses it otherwise (tools/rules_check.py --commits).
3. Changes go in as pull requests that merge themselves when every check passes. Stacey does not click anything for these; her approval stays at Push to Live. Needs two GitHub settings (below).
4. GitHub's free checks: security scan (CodeQL, .github/workflows/codeql.yml), Dependabot updates (.github/dependabot.yml), and secret scanning with push protection (a setting).
5. Project rule checker (tools/rules_check.py), run in GitHub Tests and after every edit Claude makes:
   - BD widgets: no backslashes, no regex functions, no outside or example web addresses, no widget shortcodes; DELA-Auth starts with <?php and ends with ?>.
   - Money columns are whole cents; no dollar amounts typed into screens or the api.
   - Every table has row level security, no policies, nothing granted to anon or authenticated (also proven on a real database by supabase/tests/zz_security_test.sql).
   - No secrets in the repo; every outside library at an exact version; no em dashes in anything Stacey or members read.
6. AI reviewers: Security, Payments and limits, Data and privacy, and Tests read each version's changes and open an issue with ranked findings (.github/workflows/ai-review.yml, tools/ai_review.mjs). Claude starts it when a version is ready on Staging and puts the "Must fix" items in the release notes. Model: Claude Opus 5.5. Each run prints its cost.
7. Claude Code hook (.claude/settings.json): the rule checker runs after each edit, so problems are caught before anything is saved to GitHub.

Left out on purpose: a dashboard, a score display, a multi-app view, white-label.

## Where
GitHub: Actions (Tests, Security scan, AI review, Health report), Issues (AI reviews and monthly reports), Security tab. The repo: tools/, tests/, .github/, .claude/, docs/health/.

## When
Every push: Tests (with the rule checker) and the security scan. Each version ready on Staging: AI review. Weekly: Dependabot and the security scan. Monthly on the 1st: health report.

## Why
Catch mistakes before they reach Staging, keep fixed bugs fixed, and give Stacey a plain monthly picture without reading code.

## How it could go wrong
- A rule blocks something that is right: the line gets "rules-ok:" and the reason, which shows in review. Rules are never weakened just to pass.
- AI reviewers miss something or flag something that is fine: they are suggestions; tests and Stacey's Push to Live stay the gates.
- AI cost runs higher than expected: each run prints its cost; the first week is measured and reported to Stacey. Without the key it does nothing and says so.
- Pull requests that merge themselves: they merge only when every required check passes, and nothing reaches Live without Stacey's password.

## Stacey's setup steps (GitHub, about 10 minutes)
1. Settings > Advanced Security (or Code security): turn on Dependabot alerts, Dependabot security updates, and Secret scanning with Push protection. Leave CodeQL "Default setup" off (the repo has its own scan file).
2. Settings > General > Pull Requests: tick "Allow auto-merge" and "Automatically delete head branches".
3. Settings > Rules > Rulesets > New branch ruleset: name it "main protection", target the default branch, tick "Require a pull request before merging" (0 approvals) and "Require status checks to pass" with the check "tests". Under bypass, add nobody. Save as Active.
4. Settings > Secrets and variables > Actions > New repository secret: ANTHROPIC_API_KEY (from console.anthropic.com, a key just for this). Optional: set a monthly spend limit for that key in the Anthropic console.

## Questions to make it better
1. AI reviewer spend: is about $1 to $3 per version review and under $5 for each monthly report OK, with a hard monthly limit you set in the Anthropic console (suggested $50)?
2. Monthly report: is a GitHub issue (GitHub emails you) enough, or do you also want it emailed through DELA's email service once that is set up?
3. Slice of Thanks: add the same kit there when its building resumes?

## Success looks like
- A planted backslash in a widget, a dollar amount in a screen, or a table without row level security fails GitHub Tests with a plain message.
- A "Fix ..." commit without a test fails GitHub Tests.
- The security scan and Dependabot run without errors.
- With the key set, an AI review opens one issue with four ranked sections and its cost.
- The health report opens an issue on the 1st.
