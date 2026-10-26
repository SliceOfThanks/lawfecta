# DELA Decision Sheet

Version DS-1.0-draft, updated 2026-10-26. Built from config/decisions.json.

How to use this sheet: for each line, write Approve, or write the number you want instead. Every value can be changed later in the DELA admin area, and every change is saved with its history.

What the status means:

- **Confirmed**: Confirmed. Decided by Stacey or confirmed in the plan documents.
- **Suggested**: Suggested. The plan documents or Claude suggest it; Stacey has not approved it yet.
- **Open**: Open. Nobody has decided. A suggestion is filled in so Stacey can approve or change it.
- **Needs a gate**: Gate. Needs a lawyer, Stripe or a security check before it can be turned on with real people or real money.

## 1. Plans and prices

Attorneys and freelancers have separate plans. Each side pays its own fee, based on its own plan.

| Plan | Attorney monthly | Freelancer monthly | Fee per side | Status | Your decision |
|---|---|---|---|---|---|
| Free | $0 | $0 | 5% | Suggested | |
| Plus | $19 | $12 | 4% | Suggested | |
| Pro | $49 | $29 | 3.5% | Suggested | |
| Business (firm / agency) | $99 | $59 | 3% | Suggested | |

- Yearly prices: Yearly price is 10 times the monthly price (two months free). Status: Open. Your decision: ______

## 2. Plan limits

### Attorney side

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| Open Flex Gigs at one time | 1 | 3 | 10 | No cap | Open | |
| Saved playbooks | 5 | 25 | No cap | No cap | Open | |
| Team seats included | 1 | 1 | 1 | 3 | Open | |

### Freelancer side

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| Proposals sent per month (per month) | 5 | 20 | 50 | No cap | Confirmed | |
| Published services at one time | 1 | 3 | 10 | No cap | Open | |
| Running promotions at one time | 0 | 1 | 3 | No cap | Open | |
| Approved pitches to attorneys per month (per month) | 3 | 10 | 25 | 100 | Open | |
| Agency team seats included | 1 | 1 | 1 | 3 | Open | |

- Proposals sent per month: Business has no monthly cap but keeps spam and rate limits. Matches stay visible when the allowance runs out.

### Both sides (each side counts its own)

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| DELA AI help per month on Lawfecta's key (per month) | 25 | 100 | 300 | 1000 | Open | |
| Playbook exports per month (per month) | 0 | 2 | 5 | 15 | Open | |
| Connected calendars (Google or Outlook) | 1 | 2 | 5 | 10 | Open | |
| Webhook endpoints | 0 | 1 | 3 | 10 | Open | |
| File storage | 250 | 1000 | 5000 | 20000 | Open | |
| Bring your own AI key (OpenAI or Claude) | Yes | Yes | Yes | Yes | Confirmed | |

- DELA AI help per month on Lawfecta's key: Runs on the member's own key do not count here, but still have safety limits.
- Playbook exports per month: Free members still earn the consultation export and the engagement playbook, and can buy single exports.

## 3. Engagement money

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Minimum platform fee per side, per engagement. Charged once per engagement, not per milestone. | $10 | Confirmed | C-26 | |
| When the attorney fee is charged | engagement start | Suggested | 1A section 20 | |
| How the freelancer fee is spread. Spread across milestones in whole cents; leftover cents go on the last milestone. | proportional rounding on last | Suggested | 1A section 9 | |
| Smallest engagement allowed | $250 | Open | O-02, reopened | |
| Longest fixed-fee engagement | 90 days | Open | O-02, reopened | |
| Longest funded money can wait for acceptance before a Lawfecta Team review | 45 days | Needs a gate | O-02 and G-PAYMENT; suggestion by Claude, needs a payments lawyer | |
| Hourly billing. Not part of launch. | No | Confirmed | C-12 | |
| Payment provider | stripe connect | Confirmed | C-24 | |
| Stripe mode. Stays test until Stacey turns on the live_payments switch. | test | Needs a gate | Stacey 2026-10-25 | |

## 4. Trials and allowances

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Free trial length | 7 days | Suggested | 1A section 8 | |
| Which plan the trial unlocks | pro | Open | Suggestion by Claude | |
| When the trial starts. No card needed. Ends on its own. | first dela login | Open | O-01; suggestion by Claude | |
| Monthly allowances reset on | calendar month | Open | O-10; suggestion by Claude | |
| Time zone for resets and deadlines | America/Los Angeles | Open | O-10; Claude guessed Pacific time. Please confirm Lawfecta's time zone. | |
| Do proposals to an attorney's direct invitation use the allowance?. Free answers to invitations encourage fast replies. | No | Open | O-10; suggestion by Claude | |
| When a withdrawn proposal gives the allowance back | only if gig canceled or materially changed | Open | O-10; suggestion by Claude | |
| Buying extra AI credits | No | Confirmed | C-28 | |
| Buying extra proposals. Later only. | No | Confirmed | C-10 | |
| Price of one standalone export | $9 | Open | C-28; price is a suggestion by Claude | |
| Extra team seat on Business, per month | $15 | Open | O-01; suggestion by Claude | |

## 5. Flex Gigs and proposals

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| How long a gig stays open | 14 days | Confirmed | C-11 | |
| Attorney reminders on days | 10, 13 | Confirmed | C-11 | |
| Extensions allowed | 1 | Confirmed | C-11 | |
| Length of the extension | 14 days | Confirmed | C-11 | |
| Reminders before an extended gig closes (days before) | 4, 1 | Suggested | 1A section 15 | |
| Days proposals stay actionable after a gig closes | 7 days | Confirmed | C-11 | |
| Allow more than one hire per gig by default | No | Suggested | C-11 | |

## 6. Milestones, review and recurring work

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Passing score for the DELA milestone check | 90 out of 100 | Confirmed | C-13 | |
| Days the attorney has to review | 7 days | Confirmed | C-13 | |
| When the review clock starts | submission marked complete and notice delivered | Open | O-04 | |
| Cost to the freelancer for a human review | $0 | Open | O-04; suggestion by Claude | |
| Target days for a human review | 5 business days | Open | O-04 and O-11 | |
| Automatic acceptance when the attorney stays silent. Built behind the admin_acceptance_timeout switch. | switch | Needs a gate | C-13 and G-CONTRACT | |
| Renewal reminder, days before billing | 3 days | Confirmed | C-16 | |
| Automatic retries after a failed renewal | 2 | Confirmed | C-17 | |
| Days between renewal retries | 2, 3 | Open | C-17 says over several days; spacing is a suggestion by Claude | |
| Days a failed renewal stays paused before it ends | 14 days | Open | 1A section 22; suggestion by Claude | |
| How monthly money is released to the freelancer | monthly deliverable | Open | 1A section 22 open release decision | |

## 7. Exports and playbooks

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Free consultation export after a verified attended meeting | 1 per attorney and freelancer pair | Open | C-04 and O-08; the count is a suggestion by Claude | |
| What proves a meeting happened | vectera attendance or both confirm | Open | O-08; suggestion by Claude | |
| When a hire earns the engagement playbook | first milestone accepted | Open | C-04; suggestion by Claude to stop fake minimum-price hires | |
| Anonymous public share links | No | Confirmed | C-30 | |
| Playbook marketplace commission (Phase 1C) | 15% | Confirmed | C-31 | |

## 8. Profiles, reviews and risk

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Freelancers reconfirm availability every | 14 days | Suggested | 1A section 7 | |
| Recent activity window | 30 days | Suggested | 1A section 7 | |
| When reviews publish | immediately | Confirmed | C-18 | |
| Days a reviewer can edit a review | 14 days | Open | 1A section 24; suggestion by Claude | |
| After a first lost chargeback | manual reinstatement review | Confirmed | C-19 | |
| After a second verified chargeback. Counting rules need a lawyer. | termination review | Needs a gate | C-20 | |
| Dispute notice period | 14 calendar days | Confirmed | C-22 | |
| Lawfecta-funded freelancer protection | No | Confirmed | C-21 | |

## 9. Platform rules decided by Stacey

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Confidential client information. Notice where people type or upload, plus a warning when text looks like client information. | not allowed member responsible | Confirmed | Stacey 2026-10-25 | |
| Booking outside Lawfecta | No | Confirmed | Stacey 2026-10-25 | |
| Native booking syncs with Google and Outlook. Which plans get it is in the limits table (connected calendars). | Yes | Confirmed | Stacey 2026-10-25 | |
| AI used on Lawfecta's key | openai | Confirmed | Stacey 2026-10-25 | |
| Keys members can bring | openai, anthropic | Confirmed | Stacey 2026-10-25 | |
| Online meetings | vectera | Confirmed | Stacey 2026-10-25 | |
| Recording a meeting | both people consent | Needs a gate | Stacey 2026-10-25; some states require everyone's consent | |
| Using transcripts to improve DELA | separate opt in | Needs a gate | C-02 and Stacey 2026-10-25 | |
| Talk of taking work off the platform. No automatic penalty. | flag for lawfecta team review | Confirmed | Stacey 2026-10-25 | |
| Who sends DELA email | bd if possible else brevo | Open | Stacey 2026-10-25; Claude is checking whether BD can be triggered from Supabase | |
| Who can open DELA. Change to everyone when a phase launches. | access list | Confirmed | Stacey 2026-10-25 | |

## 10. On and off switches

Every switch starts Off. In the admin area each one can be set to Off, Lawfecta Team only, Access list, or Everyone.

| Switch | What has to happen before it goes on |
|---|---|
| Real money through Stripe (live keys) | G-PAYMENT and G-CONTRACT |
| DELA AI help | Step 2 |
| Flex Gigs open to public applicants | Step 4 |
| Google and Outlook calendar sync | Step 5 and Google app review |
| Meeting recording and transcripts | G-CONTRACT (consent wording) |
| Use transcripts to improve DELA | Separate opt-in and legal review |
| Free consultation export after a verified meeting | O-08 |
| Automatic milestone acceptance after 7 silent days | G-CONTRACT and G-REVIEW |
| Monthly recurring engagements | Step 6 |
| Limited automatic repeat hiring | O-05, all hard gates |
| Member webhooks | Step 7 |
| Automatic free trials | G-COMMERCIAL |
