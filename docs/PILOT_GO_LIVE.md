# Pilot go-live: what is left, in order (2026-11-11)

The pilot runs on https://www.lawfecta.co (formerly hirelegalhelp.com), on the database it already had. Each step below that changes the site for good needs Stacey's yes at that moment.

## 1. Clear the test data (cannot be undone)
Script: `tools/pilot_clear.sql`. Tried on a local copy on 2026-11-11: it refuses to run without its safety line, clears the work and money rows, and keeps the setup and the named accounts. It has NOT been run on the site.

On the site today (counts from 2026-11-11): 7 accounts, all made up except Stacey's.

| Account | BD member | What it is |
|---|---|---|
| Stacey Lake | 686 | The owner. Kept. |
| DELA Test Attorney | 687 | Test login |
| DELA Test Freelancer | 688 | Test login, runs "Roe Test Agency LLC" |
| (no name) | 690 | hello@legalstacey.com, Stacey's second test login |
| Demo Account | 685 | Has no DELA side |
| Guide Test Firm (made up) | 999013 | Made by Claude for a test |
| Sample Freelancer (prepared) | 999000001 | Made by Claude for a test |

**Kept:** all 320 settings, the 62 switches, plans and plan features, the tech catalog (33 tools), the decision log, releases, the audit log, and the accounts Stacey names (person, sides and plans, staff role, access list entry, organization, profile).

**Removed:** every other account, and for every account: 17 documents and their 43 versions, 16 files, 26 gigs, 18 proposals, 16 agreements, 20 milestones, 5 payments, 2 payouts, 1 refund, 12 ledger rows, 3 disputes, 8 meetings, 280 notices, 636 background jobs, 494 sessions (everyone logs in again), AI chats and usage counts, guide events, trial runs, Stripe events.

**Not touched by the script:** files in Supabase storage (remove the test files there by hand, or leave them; nothing points at them afterwards), and everything in the Stripe sandbox.

**Before running:** a backup exists (Supabase, the Lawfecta AI project, Database, Backups), and Stacey has said which accounts to keep. Clear BEFORE the live Stripe key goes in: the test agreements, the test attorney's saved card and the test freelancer's payout account carry sandbox ids the live account does not know.

## 2. The live Stripe key and webhook (Stacey, in Supabase)
Stripe Connect is already set up on Lawfecta's live account. DELA needs its own key and webhook there:
- a secret key for DELA, saved as the Supabase secret `STRIPE_SECRET_KEY` (replacing the sandbox one)
- a webhook to `https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api/stripe/webhook` with the 7 events in docs/STRIPE_SETUP.md, its signing secret saved as `STRIPE_WEBHOOK_SECRET`
- then the `live_payments` switch turned on in the admin area. Until it is on, DELA refuses a live key and says "Stripe is not connected yet".

## 3. Three small real transactions (Stacey)
One payment, one payout, one refund, each compared with Stripe and the admin Payments tab.

## 4. Mark the site as live (the `environment` setting)
Changing it from "staging" to "live" is done in the database (the admin area locks this setting). What changes:

| What | Today (test) | After (live) | Recommendation |
|---|---|---|---|
| The yellow "Test site" label, top left | Shown | Gone | Wanted |
| Email subjects | Start with "[Test site]" | No prefix | Wanted |
| Text alerts to the team | Say "DELA staging" | Say "DELA live" | Wanted |
| Confidential materials uploads | Allowed without a virus scan | Refused until a virus scanner is set up (the setting `confidential.scan_provider` set to "http", with the Supabase secrets `CONF_SCAN_URL` and `CONF_SCAN_TOKEN`) | Keep the confidential materials switch off for the pilot, or set up a scanner first. Ordinary files and document images are not affected. |
| "Run the monthly renewal now" button (admin) | Works | Refused | Fine: it is a test tool |
| "Reset the test site" tool (admin) | Works | Refused | Wanted: it must never run on real data |
| Watching "Live" from the test site, release push and codes | Run every minute | Stop | Fine: there is no second site any more. The Releases tab becomes history only. |
| The admin label | "Test site: hirelegalhelp.com" | "Live: lawfecta.com, real members" | Wording to correct to lawfecta.co |
| The owner's test button on an engagement (member view) | Shown | Hidden | Wanted |

Do this after steps 1 to 3, so the label and the email prefix stay honest while testing.

## 5. Before members are invited
- Backups on and one restore drill (docs/RUNBOOK.md).
- An uptime monitor on the health address.
- The pilot members' BD member numbers on the access list (admin area).
- A short ChatGPT run on www.lawfecta.co with a real pilot-style account.
