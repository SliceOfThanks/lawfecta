# Feature brief: the attorney's fee is charged with each milestone payment

Step: 14 (launch list item 25)   Spec references: config/decisions.json `fees.attorney_fee_timing` (Stacey 2026-11-10: with each milestone payment), `fee.client_bps`, `fees.floor_cents_per_party`
Status: draft, waiting for Stacey's answers. Nothing is built yet. Today the whole fee is still charged with the first payment.

## Who
Attorneys (every attorney plan) and firm staff who pay for a fixed-fee engagement. Freelancers and agencies see no change: their 5% already comes off each milestone payout. The Lawfecta Team sees the fee per milestone in the admin Payments tab.

## What
Today: when the attorney pays the first milestone, DELA adds the whole 5% attorney fee for the entire engagement to that first payment. Example, two milestones of $150 each: first payment $165 ($150 + $15 fee), second payment $150.

After this change: each milestone payment carries only its own share of the fee. Same example: first payment $157.50, second payment $157.50. If the second milestone never starts, the attorney never paid a fee for it and nothing has to be given back.

"Done" for the attorney: every payment screen and receipt shows the milestone amount, the fee for that milestone and the total, and the sum of all fees equals what the agreement says.

## Where
- The agreement screen (the "Money" part of the agreement and the signing summary), on https://www.lawfecta.co/dela
- The "Pay" card on the engagement screen, for the first and every later milestone
- The saved-card charge for later milestones
- Payment emails and the Earnings and Payments lists
- The admin Payments tab (Attorney fees total)
- The agreement text, clause on fees

## When
It applies to agreements signed after the change is switched on. Agreements already signed keep the terms they were signed with: their fee was agreed as one amount at the start.

## Why
A fee taken up front for work that never starts has to be refunded, which costs Lawfecta the card processing fee and makes the first payment look expensive. A fee per milestone matches what the attorney is paying for at that moment and makes refunds and disputes simpler: a refunded milestone gives back its own fee and nothing else.

## How it could go wrong
- Rounding: 5% of each milestone in whole cents may not add up to 5% of the total. The same rule the freelancer side already uses fixes it: spread in whole cents, leftover cents on the last milestone.
- The minimum fee: today a small engagement pays at least the minimum fee per side. Split across milestones, the minimum could be charged once (spread out) or once per payment. This needs Stacey's answer (question 2).
- A milestone amount changed after signing (a change both sides approve): the fee for the milestones not yet paid must be worked out again, and the ones already paid must stay as they are.
- A milestone refunded in full before work starts: its fee goes back with it. A milestone settled by a dispute in parts: question 3.
- An engagement that ends early: the unpaid milestones never carry a fee. Nothing to give back.
- Old agreements: must keep working exactly as signed. The code must read the timing saved on the agreement, never the current setting.
- A payment retried after no answer from Stripe: the same amount, the same key, as today.
- Monthly engagements already charge the fee with each month. They do not change.
- The contract text says when the fee is charged. Agreements signed before the change keep their text.

## Settings and switches it uses
- `fees.attorney_fee_timing`: `with_each_milestone` (decided) or `at_start`. Saved on each agreement when it is signed.
- `fee.client_bps` (500 = 5%), `fees.floor_cents_per_party` (the minimum fee).
- A new switch `fee_per_milestone`, off until Stacey turns it on. While it is off, new agreements keep today's behavior.

## Questions to make it better
1. Agreements already signed before the change: keep their fee at the start, as they were signed (suggested), or move them to the new way too?
2. The minimum fee: charge it once per engagement and spread it over the milestones (suggested), or apply the minimum to every milestone payment?
3. When a dispute splits a milestone (for example the freelancer keeps $50 and the attorney gets $100 back): does the attorney get back the fee on the refunded part (suggested: yes, in proportion), or does Lawfecta keep the whole fee for that milestone?
4. When a milestone is refunded in full before any work was delivered: the fee goes back with it. Correct?
5. On the payment screen, show the fee as its own line every time, like "Milestone $150.00, Lawfecta fee $7.50, Total $157.50" (suggested)?
6. Should the pilot start with this change already switched on, or should the first real payments run the way that was proven in the Stripe sandbox (fee at the start) and this change come one or two weeks later (suggested, because it changes the money path that was just proven)?

## Success looks like
- A new two-milestone agreement of $150 + $150 shows $157.50 for each payment, and Stripe shows two charges of $157.50.
- An agreement signed before the change still charges $165 then $150.
- A three-milestone agreement with uneven amounts: the fees add up exactly to 5% of the total, leftover cents on the last one.
- A small engagement shows the minimum fee the way question 2 was answered.
- A full refund of an unstarted milestone returns the milestone amount and its fee, and the admin Payments tab totals match Stripe.
- A dispute split follows the answer to question 3.
- The agreement text for new agreements says the fee is charged with each milestone payment.
