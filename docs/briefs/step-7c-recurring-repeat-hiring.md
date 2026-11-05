# Feature brief: Monthly recurring engagements and limited automatic repeat hiring

Step: 7c   Spec references: Program Guide C-16, C-17, O-04, O-05, G-CONTRACT and line 50 (repeat hiring is a launch direction, gated); 1A sections 18 (standing arrangements and the deterministic authorization procedure) and 22 (monthly recurring engagements); tests T13 (cancel while the renewal runs) and T17 (mandate revoked before it runs); Decision Register v1.1 questions 5 and 6; config/decisions.json recurring.*
Status: draft, waiting for Stacey's answers

## Who
- Attorneys on every plan (monthly engagements are on every tier, C). Firm owners and managers set up and change them; firm staff see them if they can see the engagement.
- Freelancers on every plan: they sign the monthly agreement, do the work each period, and are paid per agreed unit.
- Firm owners and managers grant a standing arrangement for automatic repeat hiring; the freelancer accepts it.
- The Lawfecta Team: renewals, failed payments, pauses and disputes in the admin area.

## What
**Monthly recurring engagements.** Defined work for a flat monthly price, for example "intake calls and conflict checks, up to 20 a month, each within 1 business day".
- It renews every month until either side cancels. Cancelling takes effect at the end of the paid month.
- Done looks like: both sign one monthly agreement and the first month is paid. Each month DELA reminds both 3 days before billing, charges the saved payment method, opens the new month's tasks once paid, and pays the freelancer for each accepted unit of work.

**Limited automatic repeat hiring.** A "standing arrangement" both people sign once:
- It names the freelancer, the approved SOPs or Workflows covered, a fixed price per job, a monthly spend cap, how many jobs can be open at once, and an end date.
- Inside those limits, the attorney hires again in one click with no new proposal or signature, and DELA charges the saved card at once.
- Anything outside the limits becomes a normal draft both must approve.
- It stays off on Live until counsel approves the wording (G-CONTRACT).

## Where
- Attorney: Projects (new gig: "One-off" or "Monthly"); the engagement page ("Make this monthly" after a completed engagement); Talent and the bench ("Set up a standing arrangement").
- Freelancer: Work (monthly engagements and their periods; standing arrangements to accept).
- Both: the engagement page shows the current month, the next billing date, the included work used so far, change requests and cancellation.
- Email and in-app notices: the 3-day reminder, payment succeeded or failed, retries, pause, cancellation, scope change requests, each automatic hire.
- Admin area: a Recurring tab (renewals due, failed and paused, cancellations, standing arrangements and their spend) and the emergency stop for renewals.

## When
- Start: both sign; the first month is charged; work starts when it is paid.
- Each month: tasks for next month are drafted ahead, the reminder goes out 3 days before billing, DELA charges on the billing day, and the tasks open once the payment succeeds.
- Failed payment: new-month work pauses, both are told, DELA retries twice, and the engagement ends after the pause limit.
- Cancellation: either side, effective at the end of the paid month. Undoing it needs the other side.
- Standing arrangement: active from both signatures until its end date, a cancellation by either side, a revoked permission, a hold or a dispute. Each one-click hire is checked again at the moment it runs.

## Why
- For members: steady monthly help without posting and negotiating each time, and attorneys keep trusted freelancers.
- For Lawfecta: repeat work is the main commercial hypothesis. Monthly fees are predictable transaction revenue. The 1A target is 25% repeat hiring, shown as monthly and one-off separately; monthly freelancer fees are never reported as Lawfecta subscription revenue.

## How it could go wrong
- **Double charge** when a cancellation lands while the renewal runs (T13). The cancellation date is checked inside the same database step as the charge, and every period has one unique key.
- **A charge after cancellation, or a higher price nobody approved.** Never: unapproved changes keep the current terms.
- **The saved card fails or needs the bank's extra check (3-D Secure).** Pause, notify, retry on the set days, then a pay link for the attorney. Stripe's own automatic retries are switched off so they do not stack.
- **Work done in a paused month.** The tasks stay closed until payment succeeds, and the freelancer is told not to start.
- **Paying the full month for work not done.** Money is released only per accepted unit, never because tasks were created.
- **Unlimited work creep.** Each month lists included quantities. Extra work is a separate gig or a change for next month.
- **Calendar edge cases.** Month-end (a 31st start), daylight saving, holidays, two periods overlapping after a pause. Billing uses the attorney's time zone; due dates on weekends and holidays move as answered below.
- **Repeat hiring outside its limits.** The price, document version, cap, capacity, end date, verification, holds and budget are all checked before anything is charged. A mismatch makes a draft, never a hire.
- **A permission revoked, a hold or a dispute after a hire is queued (T17).** The final check blocks it.
- **A firm member leaves.** Arrangements they created stay with the firm, and only owners or managers can use or change them.
- **The freelancer becomes unavailable.** The availability check stops the automatic hire, and DELA suggests a bench alternative.
- **AI.** It never signs, changes a rate, agrees to subcontracting or makes a legal judgment. Rules in code decide every hire and charge.
- **Live money.** Stripe stays in test mode until the live_payments switch is on. Repeat hiring stays off on Live until counsel signs off.

## Settings and switches it uses
- Switches: recurring_engagements (exists, off), auto_repeat_hiring (exists, off, gated G); a separate emergency stop for renewals.
- Existing settings in config/decisions.json: recurring.renewal_reminder_days 3 (C), recurring.failed_retries 2 (C), recurring.retry_spacing_days [2, 5] (O), recurring.pause_limit_days 14 (O), recurring.release_unit (O).
- New settings from the answers below: standing arrangement maximum length, default caps, the scope-change deadline, plan availability, and any fee floor rule per month.

## Questions to make it better
Each has a suggested answer. Reply "all as suggested", or give the number and your answer.

### Monthly recurring engagements
1. **How a monthly engagement starts.** Suggested: both ways. A new gig can be posted as "Monthly". After a completed one-off engagement, the attorney can click "Make this monthly" with the same freelancer, which drafts the monthly agreement for both to sign.
2. **The billing day.** Suggested: the day the first month is paid. A start on the 29th, 30th or 31st bills on the last day of shorter months. Dates use the attorney's time zone.
3. **How the attorney pays each month.** Suggested: the card or bank account used for the first payment is saved with Stripe for renewals, with the attorney's permission at signing. A bank payment takes about 4 business days, so the new month's work opens only when it clears.
4. **What each month includes.** Suggested: the agreement lists the tasks, how often (daily, weekly, every two weeks or monthly), included quantities, turnaround and exclusions. It is never "unlimited". Extra work becomes a separate one-off gig or a change for next month, never an automatic extra charge.
5. **How the freelancer is paid each month (Decision Register question 6).** Suggested (C): the two choose at signing.
   - Weekly units: the month is split into weekly units that add up to the monthly price. Each unit is checked and accepted like a milestone, and paid when accepted.
   - One monthly delivery: one unit, checked and accepted at month end.
6. **The check and review.** Suggested: the same as fixed-fee milestones. DELA's milestone check, the attorney's 7 days to review, one free human review, and the dispute process.
7. **Failed payment timing (Decision Register question 5).** Suggested (A): retry on day 2 and day 5 after the failed charge, pause new-month work straight away, and end the engagement after 14 days paused. Both are told at each step.
8. **When the bank asks for an extra check on a renewal (3-D Secure).** Suggested: email and notify the attorney with a secure pay link. Paying through the link counts as the renewal. It still follows the retry and pause dates.
9. **The month after a pause.** Suggested: keep the original billing day. The month's included work stays the same, its due dates move by the days it was paused, and nothing is prorated.
10. **Scope or price changes.** Suggested: either side proposes and the other approves in DELA. The change takes effect next month if approved at least 1 day before billing. If not approved by then, the current terms continue for another month. It is never a higher charge without approval.
11. **Cancelling.** Suggested: either side, any time, effective at the end of the paid month. Undoing it needs the other side's approval before that date. There is no minimum term (month to month).
12. **Ending early by agreement.** Suggested: accepted units are paid and the rest of the month is refunded. With weekly units that is automatic. With one monthly delivery, the two agree an amount in DELA, or it goes to the dispute process. DELA never invents a daily rate.
13. **The $10 minimum fee per party.** The spec leaves monthly periods open. Suggested: it applies to each paid month, because each month is a separate payment. The other choice is once per agreement, which means very small monthly engagements pay only the percentage fee after month one.
14. **Plan limits.** Suggested: a running monthly engagement uses one of the attorney's active gig places (att.gigs_active) while it runs. It costs the freelancer one proposal only when they propose on a monthly gig, not each month.
15. **Due dates on weekends and holidays.** Suggested: they move to the next business day in the attorney's time zone, using US federal holidays.
16. **Next month's tasks.** Suggested: drafted when the 3-day reminder goes out, so both can see the next month, and opened only after the payment succeeds.

### Limited automatic repeat hiring (stays off on Live until counsel approves)
17. **What starts a repeat hire.** Suggested: only the attorney's click, "Hire again from my standing arrangement", on an approved SOP or Workflow the arrangement covers. Hires started by other systems (for example a new matter in Clio) come later (Phase 2).
18. **Who can create and use an arrangement.** Suggested: firm owners and managers create, change and end it. Other firm attorneys may use it only if the owner allows them. Raising the cap or the price needs both sides to sign again.
19. **The limits every arrangement must have.** Suggested:
    - a fixed price per job
    - a monthly spend cap
    - the most jobs open at once (default 3)
    - the documents covered, each at its approved version
    - an end date (default 6 months, longest 12)
    - DELA refuses an arrangement without a spend cap.
20. **What counts as a material change** (a change that stops automatic hiring and needs both to approve again). Suggested: a new approved version of a covered document, a change of price, cap or state, a freelancer step added to a Workflow, or the freelancer's verification lapsing.
21. **The freelancer's side.** Suggested: the freelancer accepts the arrangement once. After that each hire within its limits starts without them accepting again. They can decline a hire within 24 hours, and the attorney is refunded in full. They can end the arrangement at any time, effective after open jobs finish.
22. **Payment for each repeat hire.** Suggested: charged to the saved card at the moment of the hire. Work starts once it is paid, the same as milestone funding, and it counts against the monthly cap at once.
23. **Notices.** Suggested: both get a notice for each repeat hire with the price and the cap left this month. The attorney also gets a monthly statement of every arrangement's use.
24. **Counsel gate.** Suggested: build and test it fully on the test site. On Live, the switch stays off and the screens show "Coming soon" until counsel approves the standing arrangement and recurring payment wording (G-CONTRACT).

### Both
25. **Which plans.** Suggested: monthly engagements on every plan on both sides (the spec says every tier). Standing arrangements on paid attorney plans only (Plus, Pro, Business), with the default caps above, not on Free.
26. **ChatGPT and Claude connector.** Suggested: read-only tools to list monthly engagements and standing arrangements. No renewing, hiring or cancelling from an AI app.
27. **Testing renewals on the test site.** Suggested: a "Run the renewal now" button for the owner on the test site only (never on Live), so you can see a month roll over in minutes with Stripe test cards, including a failing card.

## Success looks like
These become the ChatGPT test, grouped by login.

Freelancer:
- Sign a monthly agreement.
- See the month's tasks and included work.
- Submit a weekly unit and get paid when it is accepted.
- See a paused month after a failed payment, with tasks closed.
- Ask for a scope change.
- Cancel at the end of the month.
- Accept a standing arrangement, and decline one repeat hire within 24 hours.

Attorney:
- Post a monthly gig, and turn a finished engagement into a monthly one.
- Sign and pay the first month, then get the 3-day reminder.
- Renew with a good card, then fail with a declined card: see the retries and the pause, and pay by link.
- Approve or let lapse a price change.
- Undo a cancellation only with the freelancer's approval.
- Set up a standing arrangement with a cap and hire again in one click.
- Try a hire over the cap or on a newer document version, and get a draft instead of a hire.

Owner:
- See renewals due, failed and paused ones, and standing arrangements with spend in the admin Recurring tab.
- Use the emergency stop for renewals.
- Run a renewal now on the test site.

Check the results:
- No double charge when a cancellation and a renewal happen at the same moment.
- No charge after the cancellation date.
- A revoked arrangement blocks a queued hire.
- Ledgers and payouts add up.
