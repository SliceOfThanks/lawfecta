# Feature brief: Dispute resolution, start to finish

Step: 11   Spec references: C-22 (14-day notice), 1A section 23 (chargebacks, pause only financially exposed work), Phase 2 (no autonomous binding dispute decisions), step 6 brief answers 12 to 14
Status: questions answered (Stacey 2026-11-08), approved to build

## Who
- Attorneys (all plans) and freelancers (all plans, agencies included) on a signed engagement: one-off milestones and monthly units.
- The Lawfecta Team: reviewer, finance and support roles decide; the owner can correct a decision.

## What
A way to settle a problem about money held on a milestone, without a court:
1. Either side opens a dispute on a paid milestone or monthly unit. They say what went wrong, what they want and add evidence (links or files).
2. The other side answers within 5 days with their side, what they want and evidence.
3. During the 14-day notice period either side can send a settlement offer ("$X to the freelancer, $Y back to the attorney"). When the other side accepts, the dispute closes and the money moves at once, with no Lawfecta Team step.
4. If the other side never answers, the opener's request is granted automatically at day 14, after warnings on day 5 and day 12.
5. Anything not settled goes to the Lawfecta Team on day 14. The team decides within 10 business days, with a case page DELA prepares, including an AI draft. A person always decides.
6. The money moves through Stripe: the released part to the freelancer (less the freelancer fee on that part), the refunded part back to the attorney's card. The attorney's platform fee is kept.

Done looks like: the money for that milestone ends up exactly where the settlement or decision says, both sides were told every step, and every move is in the ledger.

## Where
- Member: the agreement page (Projects for attorneys, Work for freelancers), "Problems, disputes and canceling" card at the bottom, which becomes the dispute case view. An open dispute also shows at the top of the agreement page, in Notices ("Needs your action") and as a red "In dispute" badge in the engagement lists.
- Email and in-app notice to both sides at each step; a member webhook event for each step.
- Lawfecta Team: a new "Disputes" tab in /dela-admin (queue, case page, money tools, report). The Payments tab links to it.

## When
- Starts: a member clicks "Open a dispute" on a milestone that is paid (funded, in progress, submitted or changes requested).
- Day 0: both sides told; the other side has 5 days to answer.
- Day 5: if no answer, a warning to the other side: "If you do not answer by [date], the request is granted."
- Day 7 and day 12: reminders to settle.
- Day 14: unanswered disputes are granted automatically; everything else goes to the Lawfecta Team.
- Team decision target: 10 business days; "Ask a question" pauses the clock until answered.
- Ends: withdrawn by the opener, settled by an accepted offer, granted automatically, or decided by the team.

## Why
- Members: the money for the work in question stays safe until it is settled. Nobody can take it alone. Most problems get settled between the two people in days.
- Lawfecta: trust in paying through the platform, fewer chargebacks, less team time (most disputes never reach the team), a clear record for every decision.

## The money, step by step
1. While open: that milestone's payment stays held (ledger "held"). No payout for it. Other milestones of the same engagement continue (only the disputed money is frozen).
2. Settlement, automatic grant or team decision: release plus refund always equal the milestone amount.
3. Released part: a payout to the freelancer, freelancer platform fee on that part only; for agency jobs the split shares follow.
4. Refunded part: a Stripe refund to the attorney's card for the milestone amount only. The attorney's platform fee is kept (Stacey 2026-11-08).
5. Monthly units: the refund comes from that month's payment (fix: today it is marked refunded but no refund is made).
6. Failed refunds or payouts are retried daily, then the team is alerted.
7. Every step is a new ledger entry; nothing is edited. A team correction is a new record, owner only.

## How it could go wrong
- Opening a dispute to stall payment: only the money in question is held; the notice period is fixed; lost disputes count toward a review hold (3 lost in 12 months).
- An offer that does not add up: refused unless release plus refund equal the milestone amount.
- Two clicks or both sides accepting at once: one settlement only (idempotent, row lock).
- Accepting an old offer after a new one: only the latest open offer from the other side can be accepted.
- Sensitive data in statements or evidence: the same sensitive-data check and secure links as Files and gig sharing.
- A chargeback opened during a dispute: the dispute decision is frozen and linked to the chargeback; the team handles it in Stripe.
- A chargeback won or withdrawn: the engagement unpauses automatically (fix).
- Money already paid out: rare (disputed money stays held); the team gets a recovery task; who absorbs a loss stays a lawyer gate (G).
- Silence from the team past 10 business days: an alert every 2 days to the team.
- AI suggestions: labeled "AI suggestion", never moves money, never decides.

## Settings and switches it uses
- risk.dispute_notice_days 14 (C, existing)
- dispute.answer_days 5 (C)
- dispute.reminder_days [7, 12] (C)
- dispute.team_decision_business_days 10 (R)
- dispute.auto_grant_unanswered true (C)
- dispute.refund_attorney_fee false (C)
- dispute.repeat_loss_hold { "count": 3, "months": 12 } (R)
- Switch dispute_center: the new case view, offers and automatic outcomes. On for everyone on the test site; off on Live until the lawyer has reviewed terms clause 6 (G).

## Questions to make it better (answered by Stacey 2026-11-08)
1. Settlement offers that close the dispute and move the money with no team step? Yes.
2. If the other side never answers? Grant the opener's request automatically at day 14, after warnings.
3. Platform fees on a refund? Keep the attorney's fee; only the milestone amount is refunded.
4. AI help? Both: the team gets a drafted decision; members get "Summarize both sides" and "Suggest a fair offer". A person always decides.

## Success looks like
Freelancer:
- Opens a dispute on a submitted milestone; sees "In dispute", the dates and the attorney's answer.
- Sends an offer; sees it accepted and the payout listed.
Attorney:
- Answers a dispute with a statement and a link.
- Accepts a settlement offer; sees the refund for the milestone amount only.
- Sees a dispute granted automatically after not answering (prepared by Claude).
Owner (admin):
- Sees the queue, opens a case, uses "Draft with DELA", decides a split, sees the ledger entries.
- Retries a failed refund; unpauses an engagement after a won chargeback.
Check the results:
- The ledger, refunds and payouts add up to each milestone amount.
