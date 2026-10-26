# DELA runbook: what to do when

Plain steps for Stacey, and the rules Claude follows. Never paste a password, token or secret in chat.

## Something is wrong on Live right now
1. **Stop the harm first.** /dela-admin on Live > Overview > Emergency pause.
   - "All of DELA": members see a short message, the Lawfecta Team keeps working.
   - Or pause one part: AI help, New payments, Payouts, Monthly renewals, Outside connections, Emails.
   - Every pause and unpause emails you and is saved in the audit log.
2. **If one feature is the problem,** turn its switch Off (Switches tab) instead of pausing everything.
3. **If the new version is the problem,** Staging > Releases > the version that was live before > "Go back to this version" > your release password.
   - DELA first checks that version still works with today's database. If it does not, the button says so; ask Claude for a fixed version.
4. Tell Claude what happened. Claude fixes it on Staging and adds a new version for you to test and push.

Things no button can undo: money that moved, emails already sent. Those are fixed with new records (a refund, a correction notice).

## Monitoring (set up once)
- Create a free account at UptimeRobot (or a similar uptime service) with your email.
- Add two HTTP monitors, every 5 minutes, alert after 2 failures:
  - Live: https://<live project id>.supabase.co/functions/v1/api/health
  - Staging: https://<staging project id>.supabase.co/functions/v1/api/health
- The health check fails (503) if the database or the background worker stops. It also reports whether DELA is paused.
- Every morning at 8 (Lawfecta time) owners get a DELA daily summary: sign ins, people turned away, failed background jobs, active holds, plus any reminders below.

## Backups and the quarterly restore drill
- The Supabase Pro plan makes a daily backup of each database automatically. Files (when DELA stores them) are backed up separately.
- Point-in-time recovery (restore to any minute) is a Supabase add-on, about $100 a month. Turn it on for Live before real payments start.
- Every three months the daily summary reminds you to run a restore drill. Claude does the drill on Staging:
  1. Note a few counts on Staging (people, plans, settings).
  2. Restore Staging from the latest backup in Supabase > Database > Backups.
  3. Check the counts, sign in with a test account, and check the Releases tab.
  4. Write the result in docs/restore-drills.md with the date.
- A Live restore is only ever started by you, in your Live Supabase organization.

## Changing secrets (yearly, or at once if one may have leaked)
The daily summary reminds you once a year.
- **BD shared secret (no downtime):**
  1. Make a new secret (40 letters and numbers).
  2. In both Supabase projects, add it as BD_SHARED_SECRET_NEXT. DELA now accepts the old and the new one.
  3. In BD, put the new secret on line 11 of DELA-Auth. Click Refresh Live Site.
  4. In both Supabase projects, set BD_SHARED_SECRET to the new secret and delete BD_SHARED_SECRET_NEXT.
- **Release password:** Staging > Releases > Change your release password.
- **Supabase access token (GitHub secret SUPABASE_ACCESS_TOKEN):** create a new token in Supabase, replace the GitHub secret, then delete the old token in Supabase.
- **GitHub push trigger (Staging secret GITHUB_DISPATCH_TOKEN):** create a new fine-grained token (lawfecta only, Actions read and write), replace the Staging secret, delete the old token.
- **RELEASE_CI_SECRET:** make a new value and replace it in both GitHub and Staging at the same time.

## Rules Claude follows for every version
- All automatic tests must pass on GitHub (workflow "Tests"). A version is recorded with its passing test run and plain release notes, or not at all.
- Push to Live refuses any version whose tests did not pass.
- Database changes are only added. A change that removes or renames something older versions use is split into steps, and the final step is recorded as a breaking change, which blocks going back past it.
- Outside libraries are pinned to exact versions and updated only on purpose, with tests.
- Every BD widget version is saved in GitHub. The Releases tab links the widget code for each version, so going back can include the widgets.
- Staging never holds real member data. "Reset Staging test data" (Releases tab) clears test activity when it gets messy.
