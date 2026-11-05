# Feature brief: Agreements, e-signature, milestone funding, delivery and payouts

Step: 6   Spec references: 1A sections 19 (contracts), 20 (sequential milestone funding and payment states), 21 (milestone submission and seven-day acceptance), 23 (chargebacks); Decision Sheet: payments.provider (C, Stripe Connect), payments.mode (G, test), fees.floor_cents_per_party (C, $10), fees.attorney_fee_timing (R, at engagement start), fees.freelancer_fee_allocation (R, proportional, rounding on the last), plan fees (5%, 4%, 3.5%, 3% by plan), engagement.minimum_cents (C, $250), engagement.max_duration_days (O, 90), engagement.max_unreleased_days (G, 45), engagement.hourly_billing (C, off), milestone.pass_score (C, 90), milestone.attorney_review_days (C, 7), milestone.human_review_fee_cents (O, $0), milestone.human_review_days (O, 5), milestone.admin_acceptance (G, a switch), risk.dispute_notice_days (C, 14), risk.first_lost_chargeback (C), risk.second_chargeback (G), protection.freelancer_payment (C, none), exports.engagement_grant_after (O)
Status: draft, waiting for Stacey's answers. Real money stays off (live_payments switch) until Stacey turns it on after the G items are reviewed.

## Who
- Attorneys who chose a proposal in Step 4, and the firm's signatory (from Firm details in Step 3).
- Freelancers who were chosen.
- The Lawfecta Team: payment problems, disputes, human milestone reviews, chargebacks and payouts on hold.

## What
Agreement and signing
1. **The draft agreement from Step 4 becomes a full agreement.** DELA fills in the facts:
   - the parties: the firm (or attorney) and the freelancer, with the firm's signatory and address for formal notices
   - the work: from the gig and the proposal, including what's included and what's left out
   - the milestones: DELA proposes them from the gig's private milestones and the proposal's schedule, each with an amount and a due date
   - the price and each side's fee, shown before anyone signs
   - the rubric DELA uses to check each milestone, the 7-day review, revisions, cancellation and refunds, and the 14-day dispute notice
2. **Both people review and can propose changes.** Each change makes a new version, and the other person accepts it. DELA's AI never edits the legal terms. They come from a template the Lawfecta Team controls, which a lawyer reviews (G).
3. **Both sign the same version** (question 1). The signed agreement is locked, with its hash and a PDF copy for both.

Funding and payouts (Stripe Connect, test mode first)
4. **The freelancer sets up payouts once** with Stripe (Stripe Connect Express onboarding, hosted by Stripe). DELA never sees bank or card numbers.
5. **When both have signed:**
   - the attorney pays the attorney platform fee and the first milestone
   - work on a milestone starts only after its payment is confirmed
   - each later milestone is charged when the previous one is accepted, under the attorney's stored consent
   - a failed or blocked charge moves that milestone to "Waiting for payment", and work already done stays on record
6. **When a milestone is accepted:**
   - DELA releases the freelancer's share, minus their platform fee, which is spread across the milestones, with rounding on the last
   - Stripe pays it to the freelancer's bank on Stripe's schedule
7. **Every money movement** is written to an append-only ledger, in cents, and matched with Stripe's own records every day.

Delivery and acceptance
8. **The freelancer submits a milestone:** files, a completion statement and the milestone checklist. The submission is locked once sent.
9. **DELA checks it against the agreed rubric:**
   - a score out of 100, worked out by code from DELA's evidence-linked findings
   - 90 or more, with every required item met, is a pass
   - below 90, DELA lists exactly what's missing, and the freelancer can revise or ask for a human review (free)
10. **The attorney reviews:** accept, or ask for changes with reasons, within 7 days, with reminders.
    - Silence never pays out automatically while the "administrative acceptance" switch is off (G). After 7 days the Lawfecta Team is told.
    - A revision limit applies (question 10). Extra work goes in a change order.
11. **Change orders:** a new price, scope or milestone during the work is a new agreement version that both sign. Any new milestone is funded before work on it starts.

Endings and problems
12. **Cancellation and refunds** follow the rule both signed (question 12).
13. **Disputes:**
    - either person opens one
    - it starts the 14-day notice and discussion period
    - the money in question stays held
    - afterwards the Lawfecta Team reviews. This isn't arbitration, and Lawfecta never chooses a court or arbitrator.
14. **Chargebacks** (a card holder disputing a charge with their bank):
    - DELA pauses the work affected, gathers the evidence and alerts the team
    - a person on the team decides whether to contest it, within Stripe's deadlines
    - first and second lost chargebacks follow the Decision Sheet
    - there's no Lawfecta-funded freelancer protection (C)
15. **Money waiting too long:** money funded but not released after 45 days goes to the Lawfecta Team for a review (G).
16. **Closing out:** when all milestones are accepted, the engagement closes. The engagement playbook export unlocks after the first accepted milestone (O, behind a switch). Reviews come in Step 7.

## Where
- Attorney:
  - the gig page in Projects gets an "Agreement" view and an "Engagement" view (milestones, payments, submissions, reviews)
  - a new "Engagements" list in Projects
  - "Payment method" on the Home plan card
- Freelancer:
  - the gig page in Work gets the same views
  - a new "Earnings" tab: payout setup, milestones and payouts
- Signing page: the full agreement, version and differences, a typed name, a consent tick and "Sign".
- Emails and notices:
  - agreement ready to sign
  - signed by both
  - payment confirmed and work can start
  - payment failed
  - milestone submitted
  - DELA's check result
  - review reminders
  - accepted, and the payout is on its way
  - changes requested
  - dispute opened
  - chargeback (to the team)
- Admin area: a "Payments" tab with:
  - engagements
  - the ledger and the daily match with Stripe
  - payments waiting
  - disputes, human reviews and chargebacks
  - money unreleased over 45 days
  - the live_payments state

## When
- Signing has no deadline, but an agreement not signed within 14 days after selection is closed, and the attorney can choose again.
- Each milestone has a due date in the agreement. Late milestones get a reminder to both people. Nothing is charged or refunded automatically for lateness.
- The 7-day review starts when a submission passes the completeness checks and the notice is delivered.
- Reminders go out on days 3 and 6 of the review.
- The 14-day dispute period starts when the dispute is opened.
- Engagements last at most 90 days (O).

## Why
- This is how Lawfecta earns its fees and how freelancers get paid safely.
- Funding each milestone before work starts protects the freelancer. Releasing only after acceptance protects the attorney.
- A clear signed scope, an honest check and a fair review keep both sides on Lawfecta for the next job.

## How it could go wrong
- **Two signings, or two clicks on "Pay":** each money command runs once (idempotency keys and locks). Stripe's events are checked and de-duplicated.
- **An agreement edited after one person signed:** that signature no longer counts, and both must sign the new version.
- **A card fails, or the bank needs extra confirmation:** the milestone waits for payment and the attorney gets a link to finish. Work doesn't start.
- **A refund after a payout:** refunds don't pull money back from the freelancer automatically. The team handles it, following the loss rule (G).
- **A chargeback after the freelancer was paid:** the exposure is Lawfecta's under Stripe. DELA records it, pauses new risk and alerts the team. The loss allocation rule is a G item for counsel.
- **The freelancer's Stripe account is restricted:** the payout holds and the freelancer is told what Stripe needs.
- **DELA's check fails or the AI is down:** the milestone goes to human review, and it's never scored as passing by mistake. A changed AI model can't rescore a signed rubric.
- **89.99 is a fail. 95 with a required item missing is a fail.**
- **Client information in submissions:** the same check and notice as everywhere else. Deliverables are stored privately, with every download logged.
- **Payment outside Lawfecta:** the conduct check from Steps 4 and 5 still runs on agreement comments and submissions.
- **Live money by mistake:** impossible while live_payments is off. Stripe live keys are only on Live, and only Stacey turns the switch on.

## Settings and switches it uses
- Switches:
  - live_payments (already exists, off)
  - engagements (agreements and signing)
  - milestone_funding (Stripe test mode)
  - milestone_check (DELA's check)
  - admin_acceptance_timeout (already exists, off; G)
  - consultation_export_grant (already exists, off)
  - recurring_engagements (already exists, off)
- Settings already in the Decision Sheet: every fee, the minimum engagement, the 90-day maximum, the 45-day unreleased limit, the 90 pass score, the 7-day review, the human review cost and days, the 14-day dispute notice, and the chargeback rules.
- New settings (suggested numbers in the questions):
  - days to sign
  - most milestones
  - smallest milestone
  - included revision rounds
  - review reminder days
  - payment methods

## Questions to make it better
1. **How do people sign?** Suggested: DELA's own signing, legally the same as clicking to sign:
   - each person types their name, ticks a consent and clicks "Sign"
   - DELA records the time, the version and its hash, the signer's login and IP, and gives both a PDF
   - a provider such as DocuSign can be added later if your lawyer prefers it
2. **Who writes the agreement terms?** Suggested:
   - I draft a plain template (the parties, the work, the milestones, fees, the review, revisions, cancellation, disputes)
   - it's marked "draft for your lawyer" and DELA's AI never edits it
   - live payments stay off until your lawyer approves the template (G)
3. **Milestones:**
   - DELA proposes them from the gig's private milestones and the proposal's schedule; both people can edit them before signing
   - suggested limits: at most 6 per engagement, each at least $50
   - the amounts must add up to the agreed price
4. **Fees:**
   - the attorney's platform fee (5%, 4%, 3.5% or 3% by plan, at least $10) is charged once when the engagement starts
   - the freelancer's fee (the same percentages by their plan, at least $10) comes out of their payouts, spread across the milestones
   - both are shown before signing
   - Suggested: confirm as in the Decision Sheet.
5. **Funding:** Suggested:
   - the first milestone and the attorney fee are charged right after both sign
   - each next milestone is charged automatically when the previous one is accepted, using the card or bank account saved with the attorney's consent
6. **Payment methods:** Suggested: card and US bank account (ACH through Stripe). Bank payments are cheaper but take about 4 business days to confirm, so work waits until then.
7. **Freelancer payouts:** Suggested: Stripe Connect Express. Stripe's own short form collects identity and bank details, and Stripe pays out on its standard schedule (about 2 business days).
8. **The milestone check:** Suggested:
   - the rubric is agreed at signing, from the playbook's quality checks, the proposal's "includes" and each milestone's deliverables
   - pass at 90 with every required item met
   - below that, DELA lists exactly what's missing; the freelancer can revise or ask for a free human review, with a target of 5 days
   - the AI never decides alone that something is legally correct
9. **The attorney's review:** Suggested:
   - 7 days, with reminders on days 3 and 6
   - if the attorney stays silent, nothing pays out automatically (the switch stays off, G); the Lawfecta Team is told on day 7 and contacts the attorney
10. **Revisions:** Suggested: 2 rounds of changes included per milestone. After that, extra changes go in a change order that both sign.
11. **Change orders:** Suggested: any change to price, scope or milestones makes a new agreement version that both sign, and any added milestone is paid before work on it starts.
12. **Cancellation and refunds:** Suggested:
    - before work starts on the first milestone: a full refund, including the attorney fee
    - after that: a funded milestone not yet submitted is refunded, and accepted milestones stay paid
    - the attorney fee is kept once work has started
    - a milestone already submitted can't be refunded while it's under review; that goes to a dispute
13. **Disputes:** Suggested:
    - either person opens one, with reasons
    - the 14-day notice and discussion period starts and the money stays held
    - then the Lawfecta Team reviews and decides how the held money is released or refunded, under the agreement's rules
    - Lawfecta never acts as a court or an arbitrator
14. **Chargebacks:** Suggested:
    - build what the Decision Sheet says (pause the affected work, gather the evidence, the team decides whether to contest, first lost chargeback means a manual review, second means a termination review)
    - leave who carries the loss after a freelancer was paid as a question for your lawyer (G), and keep live payments off until it's answered
15. **Signing deadline:** Suggested: 14 days from the attorney choosing the proposal. If not signed, the agreement closes, and the attorney can choose another proposal or post again.
16. **Engagement playbook export:** Suggested: build it behind a switch, unlocked after the first accepted milestone (as in the Decision Sheet, O). It stays off until you approve.
17. **Monthly recurring engagements:** Suggested: later. Build fixed-fee engagements first; recurring ones come after testing, behind recurring_engagements.
18. **Stripe setup:** Suggested:
    - you create a Stripe account for Lawfecta (US), turn on Connect (Express accounts), and add the test keys yourself in Supabase
    - I give you the exact steps and the webhook address
    - live keys come only at launch, on Live, entered by you

## Success looks like (the test, grouped by login)
1. Freelancer:
   - set up payouts with Stripe's test onboarding
   - review the agreement, propose one milestone change, and sign
2. Attorney:
   - accept the change and sign the same version
   - pay with a Stripe test card
   - try a declined test card and see "Waiting for payment"
3. Freelancer:
   - submit milestone 1 with a file
   - see DELA's check result (one submission that fails with the gaps listed, then one that passes)
4. Attorney:
   - accept milestone 1; milestone 2 is charged automatically
   - ask for changes on milestone 2
   - open a dispute on a test engagement
5. Owner:
   - the Payments tab shows the engagement, the ledger matching Stripe, the held dispute money and the test payout
   - live_payments is off
6. Check the results:
   - the freelancer sees the payout minus their fee, spread across milestones
   - two quick clicks on "Pay" charge once
   - an agreement changed after one signature needs both signatures again
