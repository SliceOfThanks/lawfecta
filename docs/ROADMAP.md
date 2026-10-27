# DELA Phase 1 roadmap

Each step: feature brief and Stacey's answers, build on Staging, ChatGPT test, Stacey pushes to Live, sign-off, next step.

| Step | What | Status |
|---|---|---|
| 0 | Setup and decisions (repo, Supabase, Decision Sheet, email and Vectera checks) | Mostly done; email service still to choose |
| 1 | Foundation (BD sign in, access list, Staging and Live, roles, plans and limits, admin, audit, jobs, notices) | Built, on Staging |
| 1b | Release Control dashboard (push, code, watch, go back, alerts) | Built, waiting on the 0010 database update |
| 2 | AI and playbooks (attorney side) | Next |
| 2b | DELA in ChatGPT and Claude (MCP connector): sign in with Lawfecta, playbook tools first (added by Stacey 2026-10-27; brief docs/briefs/step-2b-mcp-connector.md) | Brief written, questions open |
| 3 | Profiles and verification (both sides) | |
| 4 | Matching, Flex Gigs, proposals and tech catalog | |
| 5 | Booking, calendars, meetings and chat | |
| 6 | Contracts and payments (Stripe test mode) | |
| 7 | Reviews, benches and webhooks | |
| 7b | Affiliates and referrals with Partnero (added by Stacey 2026-10-27; brief docs/briefs/step-7b-partnero-referrals.md). Part 1 now on the current site; Part 2 inside DELA | Brief updated, questions open |
| 8 | Launch readiness (end-to-end on Live, security, restore test, live Stripe switch) | |

Step 7b Part 1 starts now (Stacey 2026-10-27): Partnero on the current BD site, keyed by BD member ID, with credit banked for DELA. Part 2 (DELA payments, credit ledger, Refer and earn cards) follows payments in Step 6, because rewards are paid on money that has cleared. Part 1b (Partnero webhook into a DELA credit ledger) can go on Staging any time after Stacey answers.

Step 2b builds the connection once (sign in, permissions, limits, audit). After that, every later step adds its own tools to it (profiles in 3, gigs and proposals in 4, booking in 5, and so on), tested in the same ChatGPT prompt as the rest of that step.
