# Feature brief: attorney's fee charged with each milestone payment

Step: 14 (launch list item 25)   Spec references: config/decisions.json `fees.attorney_fee_timing` (Stacey 2026-11-10: with each milestone payment), `fee.client_bps`, `fees.floor_cents_per_party`
Status: decisions made by Stacey 2026-11-11. Approved to build.

## The problem
When an attorney or firm staff member hires a freelancer for a fixed-fee engagement, the engagement is split into milestones. The attorney pays each milestone on the "Pay" card on the engagement screen at https://www.lawfecta.co/dela. Lawfecta charges the attorney a fee of 5% (`fee.client_bps` = 500), and this attorney fee is separate from the 5% that freelancers pay.

Today DELA adds the whole attorney fee for the entire engagement to the first milestone payment. Example with two milestones of $150 each: the first payment is $165 ($150 + $15 fee) and the second payment is $150.

This causes three problems:
- If a later milestone never starts, Lawfecta has already collected a fee on it and must refund that fee. Lawfecta loses the card processing fee on the refund.
- The first payment looks expensive to the attorney.
- Refunds and disputes are hard to calculate, because one payment holds fees for several milestones.

After this change, each milestone payment carries only its own share of the fee. Same example: the first payment is $157.50 and the second payment is $157.50. If the second milestone never starts, no fee was charged on it and there is nothing to refund.

Freelancers and agencies see no change. Their 5% already comes off each milestone payout. Monthly engagements already charge the fee with each month and do not change.

## Decisions (Stacey 2026-11-11)

### Decision 1: agreements signed before the change
- Agreements signed before the switch `fee_per_milestone` is turned on keep the fee at the start, exactly as signed.
- Every agreement saves `fees.attorney_fee_timing` at the moment it is signed: `at_start` or `with_each_milestone`.
- All fee code reads the timing saved on the agreement. It never reads the current setting.
- Payments, refunds and disputes on `at_start` agreements keep working exactly as they do today.
- Reason: the attorney agreed to the fee as one amount charged at the start, and the contract text says so.
- How it helps: no signed contract changes after signing, and old and new behavior can never mix on one agreement.

### Decision 2: the minimum fee
- The minimum fee (`fees.floor_cents_per_party`) applies once per engagement, never per payment.
- Total attorney fee = the larger of (5% of the engagement total) and the minimum fee.
- Each milestone's fee = total attorney fee x (milestone amount / engagement total), rounded down to whole cents.
- Any leftover cents go on the last milestone, so the milestone fees always add up exactly to the total attorney fee.
- Use the same spreading rule the freelancer side already uses.
- Reason: a minimum applied to every payment would charge a small three-milestone engagement three times the minimum.
- How it helps: attorneys pay the same total fee no matter how many milestones they use, so they are never penalized for breaking work into smaller milestones.

### Decision 3: a dispute that splits a milestone
- When a dispute splits a milestone, the attorney gets back the fee on the refunded part, in proportion.
- Fee refunded = milestone fee x (amount refunded to attorney / milestone amount), rounded to the nearest cent (half cent rounds up).
- Lawfecta keeps the rest of that milestone's fee.
- Example: $150 milestone, $7.50 fee, attorney gets $100 back. The fee refunded is $5.00 and Lawfecta keeps $2.50.
- Reason: Lawfecta's fee covers the work the attorney paid for and kept.
- How it helps: one rule covers every refund, so attorneys never feel they lost money on Lawfecta's side of a dispute.

### Decision 4: a milestone refunded in full
- When a milestone is refunded in full, its full fee is refunded with it.
- This is the same rule as Decision 3 with 100% refunded. Do not build a separate code path.
- Reason: no work was delivered, so Lawfecta has nothing to charge for.
- How it helps: it lowers the chance of chargebacks, which cost more than the fee and count against the Stripe account.

### Decision 5: show the fee as its own line
- Every place that shows a `with_each_milestone` payment shows three lines, using these exact labels: "Milestone $150.00", "Lawfecta fee $7.50", "Total $157.50".
- This applies to the "Pay" card on the engagement screen (first and every later milestone), the saved-card charge confirmation for later milestones, payment receipts, payment emails, and the Earnings and Payments lists.
- Refund receipts and emails show the milestone amount refunded and the Lawfecta fee refunded as separate lines.
- Reason: a total that does not match the milestone amount looks like an error to the attorney or their bookkeeper.
- How it helps: fewer support questions and disputes, and the fee is clear and visible.

### Decision 6: pilot timing
- Changed 2026-11-12 (Stacey): the pilot starts with the switch `fee_per_milestone` ON. The fee with each milestone passed the ChatGPT test and the sandbox refund and dispute run, so the first real payments test what members will use.
- Build and test this change in the Stripe sandbox during the pilot.
- Stacey turns `fee_per_milestone` on one to two weeks after the first real payments, once every check in "Success looks like" passes in the sandbox.
- Agreements signed during the pilot before the switch is on stay `at_start` for their whole life (Decision 1).
- Reason: this change touches the money path that was just proven.
- How it helps: if anything goes wrong with the first real payments, it cannot be this change.

## What changes, screen by screen
All of these apply only to agreements whose saved timing is `with_each_milestone`. Agreements saved as `at_start` keep today's screens and text.
- Agreement screen, "Money" section: show each milestone with its amount, its Lawfecta fee and its total, plus the engagement total fee.
- Signing summary on the agreement screen: show the same per-milestone breakdown and say that the Lawfecta fee is charged with each milestone payment.
- "Pay" card on the engagement screen: charge the milestone amount plus that milestone's fee only, for the first and every later milestone. Show the three lines from Decision 5.
- Saved-card charge for later milestones: charge the milestone amount plus that milestone's fee.
- Payment emails, Earnings list and Payments list: show the three lines from Decision 5 for each payment.
- Admin Payments tab, "Attorney fees total": fees charged minus fees refunded, totaled per milestone payment. This number must match Stripe.
- Agreement text, fees clause (new agreements only): say that the Lawfecta fee is a percentage of each milestone, subject to a once-per-engagement minimum, and is charged with each milestone payment. Agreements signed before the change keep their original text.

## Edge cases
- Rounding: use the Decision 2 rule. Milestone fees always add up exactly to the total attorney fee.
- A milestone amount changed after signing (a change both sides approve): recalculate the total attorney fee on the new engagement total using Decision 2. Fees already charged on paid milestones stay as they are. Spread what remains (new total fee minus fees already charged) over the unpaid milestones by amount, with leftover cents on the last unpaid milestone. If what remains is below zero, set it to zero. Never refund a paid milestone's fee because of a change order.
- An engagement that ends early: unpaid milestones never carry a fee, so nothing is refunded.
- A payment retried after no answer from Stripe: retry with the same amount and the same idempotency key, as today.
- Monthly engagements: no change.

## Settings and switches
- `fees.attorney_fee_timing`: `with_each_milestone` (decided) or `at_start`. Saved on each agreement at signing.
- `fee.client_bps`: 500 (5%).
- `fees.floor_cents_per_party`: the minimum fee, applied once per engagement (Decision 2).
- New switch `fee_per_milestone`: off until Stacey turns it on. While it is off, new agreements are saved as `at_start` and keep today's behavior.

## Success looks like
- A new two-milestone agreement of $150 + $150 shows $157.50 for each payment, and Stripe shows two charges of $157.50.
- An agreement signed before the change still charges $165, then $150.
- A three-milestone agreement with uneven amounts has fees that add up exactly to 5% of the total, with leftover cents on the last milestone.
- A small engagement whose 5% is below the minimum fee pays the minimum once, spread over its milestones. The milestone fees add up exactly to the minimum.
- A full refund of an unstarted milestone returns the milestone amount and its full fee, and the "Attorney fees total" on the admin Payments tab matches Stripe.
- A dispute split of a $150 milestone that returns $100 to the attorney refunds $5.00 of fee and keeps $2.50.
- A milestone amount changed after signing leaves fees on paid milestones unchanged and re-spreads the rest over the unpaid milestones.
- Every payment screen, receipt and email shows "Milestone", "Lawfecta fee" and "Total" as separate lines.
- The agreement text for new agreements says the fee is charged with each milestone payment.
