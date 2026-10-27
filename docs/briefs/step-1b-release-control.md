# Feature brief: Release Control dashboard

Step: 1 (foundation, release gate)   Spec references: Program Guide release process; release decisions 1 to 8 (2026-10-26); safety nets (migration 0008)
Status: draft, waiting on Stacey's answers
Preview: https://claude.ai/artifact/MY96SdFwrQx5WmmCQpFyBC (clickable, sample versions)

## Who
Stacey as owner. Lawfecta Team admins can see it but cannot push, go back or pause unless they are owners.

## What
One screen where Stacey sees and controls everything between Staging and Live:
- Staging and Live side by side: version running, health light, when the worker last ran, problems in the last 24 hours, paused areas.
- The next version as a path of six steps: built on Staging, GitHub tests passed, ChatGPT report saved, marked tested, pushed with the password, Live and healthy. The current step is highlighted.
- What changes for members, what changes in the database, and whether going back stays safe.
- Push to Live with the release password, then live progress, step by step, while it runs.
- Version history with a Go back button on every version it is safe to return to, and a plain reason on any that are blocked.
- Activity feed from the audit log with filters: pushes, go backs, security, settings, pauses.
- Emergency pause buttons for Live.
- Live setup checklist (Part C) that checks itself and turns Push on when all six items are done.
Done looks like: Stacey never needs GitHub or Supabase to push, check, or go back.

## Where
Staging admin area (/dela-admin on a Staging test account), as the first tab. A read-only copy on the Live admin area.

## When
Opens any time. Refreshes every 5 seconds while a push or go back runs, every 60 seconds otherwise.

## Why
Stacey stays in control of what members get, sees problems early, and can undo in two clicks.

## How it could go wrong
- Two pushes at once, or a push while going back: only one runs; the buttons lock while one is running.
- Wrong password: 5 tries, then a 30 minute lock and an email to owners.
- Someone other than the owner: buttons hidden, and the server refuses anyway.
- Live unreachable: the Live card says "Cannot reach Live" in red and Push stays off.
- Push fails half way: Live returns to the version it had, the dashboard says what failed in plain words.
- Problem shows up right after a push: watch period (question 3) can go back by itself.
- Go back past a database change older code cannot read: blocked, with the reason shown.
- Old browser tab: every action re-checks the current state on the server first.

## Build notes
- Live's card: Staging calls Live's /health and a new /release/status (signed with RELEASE_CI_SECRET) for version, problems and pauses.
- Step-by-step progress: tools/promote.mjs reports each step to Staging (/release/step); the dashboard shows it.
- Setup checklist: checks which secrets exist (never their values), that Live answers, and that GitHub accepts the push token.
- Activity: the audit log, filtered.
- Nothing about members changes. No new member screens.

## Settings and switches it uses
release.watch_minutes (question 3), release.require_report (question 3), release.email_code (question 3). All start off until Stacey answers.

## Questions to make it better
1. Where should it live: first tab of the Staging admin area (recommended), or its own page?
2. Which extra checks before a push: a 6 digit code emailed to you (recommended), ChatGPT report required (recommended), a 15 minute watch after each push that goes back by itself if Live gets unhealthy (recommended), pausing Live from this dashboard (recommended, needs your release password)?
3. Alerts when something goes wrong: email (recommended now), or email and text message (needs a text service, small monthly cost)?

## Success looks like
- Stacey can push a tested version, watch each step, and see "Live now" without leaving the dashboard.
- Stacey can go back to an earlier safe version in two clicks plus her password, and the blocked one explains why.
- Wrong password, a second click, a non-owner and Live being down are each handled with a clear message.
- The activity feed shows each of those events within 10 seconds.
- Works on a phone.
