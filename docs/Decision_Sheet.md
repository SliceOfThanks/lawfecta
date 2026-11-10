# DELA Decision Sheet

Version DS-1.1, updated 2026-11-10. Built from config/decisions.json.

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
| Free | $0 | $0 | 5% | Confirmed | |
| Plus | $19 | $12 | 5% | Confirmed | |
| Pro | $49 | $29 | 5% | Confirmed | |
| Business (firm / agency) | $99 | $59 | 5% | Confirmed | |

- Yearly prices: Yearly price is 10 times the monthly price (two months free). Status: Confirmed. Your decision: ______

## 2. Plan limits

### Attorney side

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| Open Flex Gigs at one time | 1 | 3 | 10 | No cap | Confirmed | |
| Saved playbooks | 3 | 15 | 50 | No cap | Confirmed | |
| Team seats included | 1 | 1 | 1 | 3 | Confirmed | |

- Open Flex Gigs at one time: No numerical cap still keeps anti-spam and security safeguards.
- Saved playbooks: Archived documents and the trash do not count. Blocking waits for the switch usage_limits_enforced.
- Team seats included: Business includes three seats, owner included. Extra seats are $15 a month each.

### Freelancer side

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| Proposals sent per month (per month) | 5 | 20 | 50 | No cap | Confirmed | |
| Published services at one time | 3 | 5 | 10 | No cap | Confirmed | |
| Running promotions at one time | 0 | 1 | 3 | No cap | Confirmed | |
| Approved pitches to attorneys per month (per month) | 3 | 10 | 25 | 100 | Confirmed | |
| Agency team seats included | 1 | 1 | 1 | 3 | Confirmed | |

- Proposals sent per month: Business has no monthly cap but keeps spam and rate limits. Matches stay visible when the allowance runs out.
- Published services at one time: Question 1: original 1/3/10 or revised 3/5/10. Revised shown (recommended).
- Approved pitches to attorneys per month: Separate from the proposal allowance.
- Agency team seats included: Business includes three seats, owner included. Extra seats are $15 a month each.

### Both sides (each side counts its own)

| Limit | Free | Plus | Pro | Business | Status | Your decision |
|---|---|---|---|---|---|---|
| Weighted AI credits per month on Lawfecta's key (per month) | 25 | 100 | 300 | 1000 | Confirmed | |
| Playbook exports per month (per month) | 0 | 2 | 5 | 15 | Confirmed | |
| Connected calendars (Google or Outlook) | 1 | 2 | 5 | 10 | Confirmed | |
| Webhook endpoints | 1 | 2 | 5 | 10 | Confirmed | |
| File storage | 250 | 1000 | 5000 | 20000 | Confirmed | |
| Bring your own AI key (OpenAI or Claude) | Yes | Yes | Yes | Yes | Confirmed | |

- Weighted AI credits per month on Lawfecta's key: Provisional until costs are validated. Credits are weighted by AI cost; they are not a number of playbooks or conversations. Calls on the member's own key do not use credits. Attorney plans since step 9b (Stacey 2026-11-06), shown to attorneys as DELA actions: Free 50, Plus 300, Pro 1,000, Business 2,500 shared by the firm. The values here are the freelancer plans, unchanged. Stacey 2026-11-10: approved for beta; review after one month of real AI cost.
- Playbook exports per month: Free members still earn the consultation export and the engagement playbook, and can buy single exports.
- File storage: Attorney plans since step 9b (Stacey 2026-11-06): Free 1,024, Plus 10,240, Pro 51,200, Business 204,800 MB, shared by the firm. The values here are the freelancer plans, unchanged.

## 3. Engagement money

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Minimum platform fee per side, per engagement. Charged once per engagement, not per milestone. Stacey 2026-11-05: kept. The fee is always 5% of the total from each side, with $10 as the floor; at the $250 minimum engagement, 5% is $12.50. | $10 | Confirmed | C-26 | |
| When the attorney fee is charged. Stacey 2026-11-10: charge the attorney's fee with each milestone payment, not at the start. The code still charges the whole fee with the first payment until launch fix 25 in docs/HANDOFF.md is built. | with each milestone | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 20 | |
| How the freelancer fee is spread. Spread across milestones in whole cents; leftover cents go on the last milestone. | proportional rounding on last | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 9 | |
| Smallest engagement allowed | $250 | Confirmed | Stacey, Decision Register v1.1 (2026-10-26) | |
| Longest fixed-fee engagement | 90 days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Decision Register v1.1, question 2 (90 days recommended) | |
| Longest funded money can wait for acceptance before a Lawfecta Team review | 45 days | Needs a gate | O-02 and G-PAYMENT; suggestion by Claude, needs a payments lawyer | |
| Hourly billing. Not part of launch. | No | Confirmed | C-12 | |
| Payment provider | stripe connect | Confirmed | C-24 | |
| Stripe mode. Stays test until Stacey turns on the live_payments switch. Stacey 2026-11-07: test mode for all testing; the pilot/beta runs with real payments, after the lawyer's review and the steps in docs/LIVE_READINESS.md section 6. | test | Needs a gate | Stacey 2026-10-25 | |
| Client-side fee on every transaction. No plan lowers it. | 5% | Confirmed | Stacey 2026-11-05 | |
| Freelancer-side fee on every transaction. No plan lowers it. | 5% | Confirmed | Stacey 2026-11-05 | |

## 4. Trials and allowances

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Free trial length | 7 days | Confirmed | Stacey, Decision Register v1.1 (2026-10-26) | |
| Which plan the trial unlocks | pro | Confirmed | Stacey, Decision Register v1.1 (2026-10-26) | |
| When the trial starts. New registrations only, one trial per member. When it ends, trial-only extras stop and the member keeps their data and active work. | registration | Confirmed | Stacey, Decision Register v1.1 (2026-10-26) | |
| Trials go to members who register on or after. Stacey 2026-11-10: on Live, set this to the Live launch date at the first push. The date here is the test site's. Members who registered before this date do not get a trial. | 2026-11-01 | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Decision Register v1.1 says new registrations only; the start date is a suggestion by Claude | |
| Monthly allowances reset on | calendar month | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-10; suggestion by Claude | |
| Time zone for resets and deadlines | America/Los Angeles | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-10; Claude guessed Pacific time. Please confirm Lawfecta's time zone. | |
| Do proposals to an attorney's direct invitation use the allowance?. Free answers to invitations encourage fast replies. | No | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-10; suggestion by Claude | |
| When a withdrawn proposal gives the allowance back | only if gig canceled or materially changed | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-10; suggestion by Claude | |
| Buying extra AI credits | No | Confirmed | C-28 | |
| Buying extra proposals. Later only. | No | Confirmed | C-10 | |
| Price of one standalone export | $9 | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: C-28; price is a suggestion by Claude | |
| Extra team seat on Business, per month. Annual price for extra seats and whether seats add AI, storage or integration allowances are still open. | $15 | Confirmed | Stacey, Decision Register v1.1 (2026-10-26) | |
| Trial downgrade mode. Dry run lists who the daily job would downgrade or mark converted and changes nothing. Switch to Live in the admin area after 3 clean days on the test site (answer 6). | dry run | Confirmed | Stacey 2026-11-07 (Pro trial answers) | |
| Days before the trial ends to send "Your Pro trial ends in 2 days" | 2 days | Confirmed | Developer notes 2026-11-06 | |
| Hour the daily trial check runs (Pacific). 2:00 AM Pacific. | 2 hour (0 to 23) | Confirmed | Developer notes 2026-11-06 | |
| Areas of law a Free member shows. Areas past the first 3 are hidden at the downgrade, never deleted. | 3 areas | Confirmed | Developer notes 2026-11-06 | |
| BD plan IDs the trial job uses. Only members on 7 or 8 with dela_trial_status active are ever changed. Never changed, even with trial data: attorney plans 5, 12, 13, 14 and the lifetime plans 10, 11 (answer 1). | {'pro': 8, 'free': 3, 'plus': 7, 'agency': 9, 'trial': [7, 8], 'never': [5, 10, 11, 12, 13, 14]} BD plan IDs | Confirmed | Stacey 2026-11-07 (Pro trial answers) | |
| More BD plans that give a DELA plan (BD plan number to DELA plan). Plan 10 Pro Founding Member ($97 a year, kept while they renew) gives Freelancer Pro. Plan 11 Agency Business Lifetime ($750 once) gives Freelancer Agency Business for life, team seats included. Neither is an attorney plan; neither gets the 7-day trial or the downgrade (trial.bd_plans never). The numbers are the test site's (hirelegalhelp.com); lawfecta.com has its own numbers, set on Live before launch. | {'10': 'fl_pro', '11': 'fl_business'} BD plan ID to DELA plan | Confirmed | Stacey 2026-11-08 | |
| Who gets the daily downgrade summary email. One email on a day with at least one downgrade, listing each member's name, user ID and trial end date. None on other days (answer 8). | stacey@lawfecta.com | Confirmed | Stacey 2026-11-07 (Pro trial answers) | |
| What comes back when a downgraded member upgrades. Stacey 2026-11-10, from the BD plan settings: Plus (7) shows 10 areas of law and Community Articles; Promotions and Videos need Pro. Pro (8) and Agency Business (9) get everything back. What Plus does not allow stays saved and hidden, and comes back on Pro. The plan numbers are the test site's. | {'7': {'areas': 10, 'types': ['article']}, '8': {'areas': None, 'types': ['video', 'promotion', 'article']}, '9': {'areas': None, 'types': ['video', 'promotion', 'article']}} per BD plan: areas shown (null = all) and post types | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Suggested by Claude 2026-11-08 | |
| Post types hidden when a trial member moves to Free. Videos, Promotions and Community Articles are unpublished at the downgrade, never deleted (AI review 0.10.0, payments 6: a setting, not code). | video, promotion, article | Confirmed | Developer notes 2026-11-06 | |
| BD member status value for Active (the trial check sets it after a downgrade). Stacey 2026-11-10: looked up on hirelegalhelp.com, Active is status value 2. Check the value on lawfecta.com before the trial check runs there. | 2 | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude 2026-11-08 | |

## 5. Flex Gigs and proposals

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| How long a gig stays open | 14 days | Confirmed | C-11 | |
| Attorney reminders on days | 10, 13 | Confirmed | C-11 | |
| Extensions allowed | 1 | Confirmed | C-11 | |
| Length of the extension | 14 days | Confirmed | C-11 | |
| Reminders before an extended gig closes (days before) | 4, 1 | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 15 | |
| Days proposals stay actionable after a gig closes | 7 days | Confirmed | C-11 | |
| Allow more than one hire per gig by default | No | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: C-11 | |

## 6. Milestones, review and recurring work

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Passing score for the DELA milestone check | 90 out of 100 | Confirmed | C-13 | |
| Days the attorney has to review | 7 days | Confirmed | C-13 | |
| When the review clock starts | submission marked complete and notice delivered | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Decision Register v1.1, question 3 (A recommended) | |
| Cost to the freelancer for a human review | $0 | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Decision Register v1.1, question 4 (B recommended: one free review per milestone) | |
| Target days for a human review | 5 business days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-04 and O-11 | |
| Automatic acceptance when the attorney stays silent. Built behind the admin_acceptance_timeout switch. | switch | Needs a gate | C-13 and G-CONTRACT | |
| Renewal reminder, days before billing | 3 days | Confirmed | C-16 | |
| Automatic retries after a failed renewal | 2 | Confirmed | C-17 | |
| Days between renewal retries | 2, 5 | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 7 | |
| Days a failed renewal stays paused before it ends | 14 days | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 7 | |
| How monthly money is released to the freelancer. The two choose at signing: Weekly units (the default) or One monthly delivery. | weekly units default or one monthly | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 5 | |
| A scope or price change starts next month only if approved at least this many days before billing | 1 days | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 10 | |
| The minimum platform fee per party applies to each paid month. Each month is a separate payment; the higher of 5% and the minimum applies. | Yes | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 13 | |
| Holidays that move a due date to the next business day. In the attorney's time zone. | us federal | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 15 | |
| Longest standing arrangement | 12 months | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 19 | |
| Standing arrangement length unless changed | 6 months | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 19 | |
| Most jobs open at once on a standing arrangement, unless changed | 3 jobs | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 19 | |
| Hours a freelancer has to decline a repeat hire (the attorney is refunded in full) | 24 hours | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 21 | |
| Lowest attorney plan that can set up a standing arrangement | att plus | Confirmed | Stacey 2026-11-06 (step 7c answers), answer 25 | |
| Weekly units in one month when the two choose Weekly units. The last unit covers the rest of the month. Units are how the month is reviewed and paid out, not a weekly cap. | 4 units | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |
| Unused monthly capacity rolls into the next month. No rollover. The monthly limit is per month. A 5-week month has the same limit and price. | No | Confirmed | Stacey 2026-11-06 (UX review answers) | |
| Emergency stop: no renewal charges run while this is on. Set from the admin Recurring tab. Reminders and drafting still run; nothing is charged. | No | Confirmed | Brief step 7c (the emergency stop for renewals) | |

## 7. Exports and playbooks

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Free consultation export after a verified attended meeting | 1 per attorney and freelancer pair | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: C-04 and O-08; the count is a suggestion by Claude | |
| What proves a meeting happened | vectera attendance or both confirm | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: O-08; suggestion by Claude | |
| When a hire earns the engagement playbook | first milestone accepted | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: C-04; suggestion by Claude to stop fake minimum-price hires | |
| Anonymous public share links | No | Confirmed | C-30 | |
| Playbook marketplace commission (Phase 1C) | 15% | Confirmed | C-31 | |

## 8. Profiles, reviews and risk

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Freelancers reconfirm availability every | 14 days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 7 | |
| Recent activity window | 30 days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 7 | |
| When reviews publish | immediately | Confirmed | C-18 | |
| Days a reviewer can edit a review | 14 days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: 1A section 24; suggestion by Claude | |
| After a first lost chargeback | manual reinstatement review | Confirmed | C-19 | |
| After a second verified chargeback. Counting rules need a lawyer. | termination review | Needs a gate | C-20 | |
| Dispute notice period | 14 calendar days | Confirmed | C-22 | |
| Days the other side has to answer a dispute. A warning goes out on the last day; if there is still no answer the opener's request is granted at the end of the notice period. | 5 calendar days | Confirmed | Stacey 2026-11-08 (step 11 brief) | |
| Days of a dispute when both sides are reminded to settle | 7, 12 | Confirmed | Stacey 2026-11-08 (step 11 brief) | |
| Business days for the Lawfecta Team to decide a dispute. Asking a question pauses the clock until it is answered. | 10 business days | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude 2026-11-08 (step 11 brief) | |
| Grant the opener's request when the other side never answers | Yes | Confirmed | Stacey 2026-11-08 (step 11 brief) | |
| Refund the attorney's platform fee when a dispute sends money back. Only the milestone amount is refunded; the freelancer fee applies only to the part released. | No | Confirmed | Stacey 2026-11-08 (step 11 brief) | |
| Lost disputes that place a review hold on a member. The hold blocks new engagements until the Lawfecta Team releases it. | {'count': 3, 'months': 12} lost disputes within months | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude 2026-11-08 (step 11 brief) | |
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
| Who sends DELA email | brevo | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-10-25; Claude is checking whether BD can be triggered from Supabase | |
| Who can open DELA. Change to everyone when a phase launches. | access list | Confirmed | Stacey 2026-10-25 | |

## 10. Agencies

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Lowest freelancer plan that can join an agency's bench. Free freelancers see Plus plan or higher required to join a bench. | fl plus | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| Days a bench invitation stays open (time to upgrade and accept) | 30 days | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| The Lawfecta Team checks the agency's business name and state once before its first gig goes live | Yes | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| Agencies may use subcontractors when the agreement discloses it. Replaces the Phase 1A roles table rule against auto-approved subcontracting. | Agencies may use subcontractors when the agreement discloses it. No approval for each person is needed. The attorney can opt out per engagement and always sees who is working on it. | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| An agency's monthly proposals allowance | shared across the whole agency | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| Extra seats beyond the plan. In-app purchase stays behind the agency_extra_seats switch (off). | The Lawfecta Team raises one agency's seat limit by hand; BD bills extra seats until DELA can | Confirmed | Stacey 2026-11-05 (agencies brief, step 7d) | |
| Fees on an agency's own gig | The agency pays the 5% client-side fee. If the hired freelancer is on its bench, the agency also pays the 5% freelancer-side fee and the bench member pays none; a freelancer not on its bench pays the usual 5%. | Confirmed | Stacey 2026-11-05 (fee answers) | |
| Fees on a split milestone (attorney work assigned to a bench member). Example: $1,000 at 30/70: the agency gets $300 minus $50 = $250, the bench member $700. | The attorney pays the usual 5% client fee. The agency pays the whole 5% freelancer-side fee from its share. The bench member gets their full share. | Confirmed | Stacey 2026-11-05 (fee answers) | |
| Smallest agency share of a bench member's work. Never below the freelancer-side fee. | 5% | Confirmed | Stacey 2026-11-05 (fee answers) | |
| Largest agency share of a bench member's work | 50% | Confirmed | Stacey 2026-11-05 (fee answers) | |
| Open gigs an agency can have at once (0 means no limit). Agencies part 2c. | 0 gigs | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion: the same as Attorney Business (no limit) | |
| Documents an agency can keep in its Library (0 means no limit). Agencies part 2c. | 0 documents | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion: the same as Attorney Business (no limit) | |
| On an agency's own gig, a bench member pays no freelancer fee; the agency pays it | Yes | Confirmed | Stacey 2026-11-05 (fee answer 5) | |
| Share of an agency gig's words found in one of its engagements that flags it as a copy. Agencies part 3. Only gigs not linked to that engagement are flagged. The flag goes to the Lawfecta Team; the gig still posts. | 0.6 share | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |

## 11. Guided setup and Automate or delegate

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Most recommendations in one Automate or delegate review. Ranked only by time saved. | 5 recommendations | Confirmed | Stacey 2026-11-06 (step 4d answers) | |
| Credits for one Automate or delegate review (Lawfecta's key only). One review per approved version, reused until the document changes. | 2 credits | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |
| Low end of the hourly rate DELA uses to suggest a delegated gig's budget. Used until Lawfecta has enough hires to work out real rates for a skill. | 4000 cents an hour | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |
| High end of the hourly rate DELA uses to suggest a delegated gig's budget. Used until Lawfecta has enough hires to work out real rates for a skill. | 7500 cents an hour | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |
| Days after sign-up for reminder emails about unfinished setup steps (empty turns them off). For the onboarding widget, after the MVP launch. | 2, 7 | Confirmed | Stacey 2026-11-06 (step 4d answers) | |
| Free answers a member can get from the DELA guide each day. Lawfecta's key; does not use DELA actions. The work the guide leads to counts as usual. | 20 answers a day | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-11-09 (step 13 brief) | |
| Hours the DELA guide stays closed after the member pauses it. It opens sooner when something new needs the member, such as a new gig that fits. | 24 hours | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-11-09 (step 13 brief) | |
| New gig alerts a freelancer can get each day. One alert per gig per freelancer. | 3 alerts a day | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-11-09 (step 13 brief) | |
| Match reasons a gig needs before a freelancer is alerted | 2 reasons | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-11-09 (step 13 brief) | |
| New gig alerts start on (guide, email and Notices). Each member can turn each channel off. | Yes | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Stacey 2026-11-09 (step 13 brief) | |

## 12. UX Phase 4: approved version, AI helpers, appearance

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| DELA actions for one run of "✦ Check the scope" on a gig draft (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Compare these proposals" (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 2 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Check this for me" on an agreement (attorney or freelancer) (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 2 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Improve acceptance criteria" on a milestone (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Check monthly scope" (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Check my proposal" (freelancer) (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Check these steps" in a document (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Improve this section" in a document (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Explain these findings" on the quality check (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Help me describe my firm" (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Improve my request" in Ask DELA (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Help me find a fit" in Talent (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Draft an agenda" for a meeting (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| DELA actions for one run of "✦ Help me write a review" (Lawfecta's key only). 1 for short helpers, 2 for comparing proposals and checking an agreement. No free first try. Nothing on the member's own key. | 1 credits | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |
| Most proposals compared at once by "✦ Compare these proposals". Keeps one comparison inside one DELA run. | 10 proposals | Confirmed | Stacey 2026-11-10 (undecided numbers answers); was: Claude suggestion | |
| Starting appearance for every member (light, dark or device). Members change it in the account menu: Match my device, Light or Dark. The same choice in the admin area. | light | Confirmed | Stacey 2026-11-06 (Phase 4 answers) | |

## 13. Security and sensitive data

| Item | Suggested value | Status | Where it comes from | Your decision |
|---|---|---|---|---|
| Remind members before client details go to DELA's AI on Lawfecta's key. Turn off once OpenAI approves Zero Data Retention (docs/RUNBOOK.md). Never shown when the member uses their own AI key. | Yes | Confirmed | Stacey 2026-11-07 (step 9c answers) | |
| Page notice when client details are allowed (sensitive data rule). Shown instead of data.notice_text while the switch client_details_allowed is on for the member. | DELA is for operations work. Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. To share it with someone working on a job, add a secure link to the job, never to DELA's AI. You are responsible for what you enter. | Confirmed | Stacey 2026-11-07 (step 9c answers) | |

## 14. On and off switches

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
| Dispute case view, settlement offers and automatic outcomes (step 11) | G-CONTRACT (terms clause 6 reviewed by the lawyer) |
| Monthly recurring engagements | Step 6 |
| Limited automatic repeat hiring | O-05, all hard gates |
| Member webhooks | Step 7 |
| Automatic free trials | G-COMMERCIAL |
| Agency team: seats, invites, roles and agency proposals | Step 7d tested |
| Agencies post their own gigs, keep a bench and use Talent | Step 7d tested |
| Agency bench: bench agreements with a fee split (agencies on Freelancer Business) | Step 7d part 2 tested |
| Agencies hand parts of attorney engagements to subcontractors (disclosed in the agreement) | Step 7d tested |
| In-app purchase of extra agency seats | DELA bills seats itself |
| Automate or delegate: DELA finds steps in an approved document to automate or hand to a freelancer | Step 4d tested |
| The Get set up screen for attorneys | Step 4d tested |
| The DELA guide: a proactive chat on the Dashboard for attorneys and freelancers (step 13) | Stacey turns it on for Live |
| Approved documents open on a read-only "Approved version" page with "Edit a new draft" | Phase 4 part A tested |
| The Phase 4 AI helpers (checks before a commitment and writing helpers) | Phase 4 part B tested |
| The Appearance choice (Match my device, Light, Dark) in the account menu | Phase 4 part D tested |
| The client information check follows the sensitive data rule (client details allowed where the rule allows them) | Lawyer reviews the privacy policy and data handling |
| The plain-language Library: cards, plain categories, "What would you like to document?" | Stacey reviews it on computer and phone (step 8b Part B, question B10) |
| The daily Pro trial check: downgrade unpaid trials to Free (BD) | Stacey's read-only BD API check done, endpoints connected, then 3 clean dry-run days |
| New gig alerts for freelancers in the guide, by email and in Notices (step 13) | Stacey turns it on for Live |
