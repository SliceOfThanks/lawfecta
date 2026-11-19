# Feature brief: Agreement and work, the payment page

Step: 43   Spec references: Stacey's brief "Lawfecta, Agreement & Work: Payment Page Revision Brief" (2026-11-18) and her three mockups; docs/briefs/step-6-agreements-payments.md; step 14 (fee with each milestone); step 39 (help tips)
Status: draft, waiting for Stacey's answers

## Who
The attorney who hired, on every attorney plan. The freelancer who was hired sees the same page from their side (question 2). The Lawfecta Team is not affected.

## What
An attorney opens an engagement to pay a milestone, review work or check where things stand. Today the page is one long column: "What happens next", then the whole agreement, people, change order, attorney decisions, milestones, payments, confidential materials and disputes. The attorney reads a long agreement to find one button.

Done looks like: the top of the page says which milestone needs action, the amount due now and its state, with one button. Under it, a short milestone timeline. The agreement, fees, decisions, change orders and disputes stay on the page, folded, each one click away. Nothing that works today is removed.

## Where
Projects, an engagement, the view "Agreement and work" (https://www.lawfecta.co/dela?tab=projects, then an engagement). Code: drawEngagement() and the cards it calls in app/dela-app.js. Styles in shared/dela-core.js. The gig's own views (Details, Matches, Questions, Proposals, Files) stay as they are. The sidebar stays white and unchanged.

## When
Any time an engagement exists: before signing, signed and waiting for the first payment, active, paused, in dispute, completed, canceled. One-off and monthly engagements.

## Why
Paying is the moment a mistake costs money. Her brief names four risks: an unclear next action, two instructions that disagree ("Pay milestone 2" and automatic charging), fees that can be counted twice, and "accepted" read as "paid".

## What the platform really does today (checked in the code, 2026-11-18)
These facts decide what the page may say. Nothing is invented.

1. Manual and automatic payment both exist. The first milestone is paid by hand on Stripe's page, and the payment method is saved there with the attorney's consent. When the attorney accepts a milestone, the next milestone is charged to the saved method at once (app.ts afterAccept, off_session). If that charge fails, or no method is saved, the page shows "Pay milestone N" and the attorney pays by hand on Stripe's page. So "Pay milestone 2" appears only when the automatic charge did not happen. Today the page does not say that.
2. With a saved method, the button "Pay milestone N with your saved payment method" charges with one click. There is no review step.
3. The attorney fee has two timings, saved on the agreement: once, with the first payment ("at_start"), or with each milestone ("with_each_milestone"). Each payment record carries its own fee amount. So the fee is never added to a milestone where it was not charged.
4. Paid comes from payment records (r.payments: waiting, being confirmed, paid, did not go through, canceled; refunds are separate records). Milestone states are separate: not paid yet, waiting for payment, paid and ready to start, in progress, submitted, changes requested, accepted, in dispute. Submissions have their own states.
5. "Confidential materials" is behind its own switch and opens only after both sign and the first milestone is paid. When the switch is off the card says "coming soon".
6. DELA's score on a submission is real: it is the rubric check from step 6. It is shown only on a submission that has one.

## The new page (both mockups 1 and 3 agree on this order)
1. Top line: "← All engagements", the engagement title, the other person, "Agreement, version N", and the real status as a word chip.
2. "Next action" card. One of: sign, pay milestone N, payment being confirmed, payment did not go through (pay again), review deliverable, nothing due, complete. For a payment it shows the milestone name, "Milestone amount", "Platform fee" only when this payment carries one, "Total due now", the state chip, and one button "Review payment: milestone N". A second quiet button "View milestone details" jumps to that milestone.
3. Review payment (new step). The button opens a panel on the page: milestone, amount, fee if any, total, how it will be paid ("your saved payment method" or "on Stripe's secure page"), what happens after (Lawfecta holds it until you accept). Buttons "Pay $X now" or "Continue to Stripe", and "Go back". While it runs: "Starting the payment...", then the result from the server: paid, being confirmed, or did not go through with "Try again". The button is disabled while a payment is in flight; the server already refuses a second payment for the same milestone.
4. "Milestone progress": one row per milestone with title, amount, due date, and separate words for payment, delivery and acceptance (for example "Paid · Submitted · Waiting for your review"). Each row opens its details: deliverables, the submission, DELA's check, and the action that belongs there (Accept and release payment, Ask for changes). On a phone the rows are stacked cards.
5. "Engagement summary" at the right on a wide page, under the timeline on a narrow one: the parties, "Contract value", "Platform fee", "Total contract cost", "Paid to date" (sum of payments with state Paid, less refunds), "Amount due now", and "View signed agreement".
6. "How milestone payments work": always in view, short. It says the real rule from fact 1 in plain words.
7. Folded sections, each with a one-line description and a help tip: "Agreement and fees", "Attorney decisions", "Change orders", "Disputes and cancellation". Also, where they apply: "Who's working on this", "Monthly engagement", "Confidential materials" (only when its switch is on), "Your payments", closeout and review. A section opens by itself when it holds something waiting on the member.

## Decisions Claude made (Stacey can change any)
1. The gig's tabs stay; the mockups' tab names differ from each other and none matches the product.
2. "Paid to date" counts only payments Stripe confirmed. A payment being confirmed is listed apart as "Being confirmed".
3. An accepted milestone shows "Accepted" and, separately, "Paid" only if a confirmed payment covers it.
4. No DELA score on the top of the page, no analytics, no "Need help? Ask DELA" box (mockup 3) for now. The existing ✦ checks stay inside their sections.
5. Confirming pop-ups of the browser ("OK/Cancel") on Accept are replaced with the same on-page review panel, so agents and screen readers can use them.
6. Colors come from the app's existing tokens (burgundy for the main button, blue for information, grey heads). No pink section backgrounds: the "Next action" card is white with a burgundy edge.
7. Help tips use the six short texts in her brief, section 3, with the app's one tooltip component.

## How it could go wrong
- Two clicks or two tabs on "Pay": the button locks, and the server's idempotent payment refuses a second one.
- The automatic charge fails after Accept: the page says so and shows "Review payment".
- A bank payment takes days: state "Being confirmed", no second pay button.
- A refund or dispute: "Paid to date" subtracts refunds; a disputed milestone shows "In dispute" and no pay button.
- Fee with each milestone: every payment shows its own fee; the summary total adds the fees of all milestones.
- A change order waiting for signatures: amounts on the page are the signed version's; the new version is shown as "proposed, not signed".
- Monthly engagements: the next action is "Pay month 1" or the failed month; the renewal is automatic and the page says the billing day.
- The freelancer must never see the attorney's fee or payment method; the attorney must never see the payout account.
- Old browsers without container queries: the page falls back to one column.

## Settings and switches it uses
engagements, confidential (its own switch), recurring_engagements, fee_per_milestone (through the agreement's saved timing), live_payments. No new business number. No migration is expected; if the page needs which milestone a payment belongs to and the server does not send it, one additive field is added to the agreement view.

## Questions to make it better
1. Which mockup is the base: 1, 2 or 3? (Claude suggests 3: next action, timeline and folded sections at the left; summary, fees and "What happens next" at the right.)
2. Does the freelancer get the same new layout now, with their own next action ("Start this milestone", "Submit", "Waiting for payment")? (Claude suggests yes, so the two sides do not drift apart.)
3. The next milestone is charged automatically when you accept the one before it. Keep that, and say it on the Accept step with the amount ("Accepting releases $800 and charges milestone 2, $800, to your saved method")? Or should every milestone wait for a click on "Review payment"? The second is a change to how money moves and would ship behind a switch.
4. Should "Review payment" also show the last four digits and brand of the saved card? That needs one read from Stripe each time the panel opens.

## Success looks like
- An attorney with a payment due sees the milestone, the total due now and "Review payment: milestone N" without scrolling, at 1280 and at 320 wide.
- The total due now equals what the server charges, with the fee only where the payment record carries it.
- A paid milestone says "Paid" only with a confirmed payment; an accepted one says "Accepted" separately.
- Review, then pay: paid, being confirmed and did not go through each show their own message; a second click cannot pay twice.
- Every section of the old page is still reachable and works: sign, propose changes, change order, decisions, submit, accept, ask for changes, payments list, confidential materials, dispute, cancel, closeout, review, make monthly, Word export.
- Keyboard, screen reader names, focus, contrast and 320 reflow checks in tests/pw/engagements-test.js, and one ChatGPT check grouped by login.
