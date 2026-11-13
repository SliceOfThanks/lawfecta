# Feature brief: the Subscription page, redesigned

Step: 19 (after go-live)   Spec references: Stacey's prompt and two annotated mockups of 2026-11-12 (desktop and mobile); step 16 (docs/briefs/step-16-subscription.md); step 9b usage limits
Status: approved to build, test and release without further approval (Stacey 2026-11-12)

## Who
Every member with a workspace: attorneys and freelancers, on every plan.

## What
One page in four areas, as tabs: "My Subscription", "Usage & Limits", "Compare Plans", "Billing & History". On a phone the tabs are four equal buttons: "Plan", "Usage", "Compare", "Billing".

## The audit (2026-11-12)
| Asked for | Exists | Built in this step | Not possible or not decided |
|---|---|---|---|
| Current plan and status | Plan, source, published prices, platform fee | Plan card with "Published price" apart from "What you are billed" | |
| Actual billing, interval, renewal date | Nothing in DELA; the website (Brilliant Directories) bills memberships | Read from the website for the member's own account: status, interval, amount, next renewal, invoices. "No paid membership on record" when there is none. Never a guess. | |
| Billing history and invoices | Nothing | Invoices table (date, number, what for, amount, status) | Downloading an invoice as a file: the website's API gives no file |
| Manage subscription, payment details, cancel | Link to the website's upgrade page | Review of a plan change in DELA, then "Continue to the Lawfecta website" in a new tab | Changing a plan, a card or cancelling inside DELA: the website has no API to cancel a subscription or change a card, so those stay on the website or with the Lawfecta Team |
| Usage: used, total, remaining, reset date, what happens at the limit | Bars with used and total | Meters with remaining, the reset date, and a sentence per limit; monthly allowances apart from capacity limits | |
| Export allowance vs "exporting is not limited" | Both were shown | Exports of a member's own documents are not counted (setting exports.own_library_counts is false), so no export meter and no export line on plans while that is so | Whether the 5 exports a month on paid plans should start counting |
| Compare plans, monthly and annual, full table | Four cards | Monthly/Annual choice, cards, one full comparison table | Annual billing commitment and refund terms: the website sets them |
| Plan change: cost, effective date, proration, consequences | A link | The review shows current and new plan, published price, fee, every allowance that changes, and what happens to documents on a lower plan | The effective date, exact charge and proration: only the website knows them, and it shows them before payment |
| "Set by the Lawfecta Team" | A badge | Explained: the team set the DELA plan; it can differ from the website membership; billing shows what is really charged; changing it goes through the team | |

## How it could go wrong
- The website does not answer or refuses the billing read: the page says billing could not be loaded; the plan, usage and comparison still work.
- A member reads the published price as their charge: the two are labelled apart on the plan card and again in the review.
- A double click on a plan button: it only opens the review; nothing is changed from DELA, so nothing can be charged twice here.
- The website's admin notes on invoices: never passed on.

## Settings and switches it uses
usage.warn_pct, usage.upgrade_url, exports.own_library_counts, the approved plan versions. No new setting.

## Decisions for Stacey (defaults in use)
1. Exports: plans list "Document exports per month" (0, 2, 5 and more) but DELA does not count a member's own exports. Default: do not show a limit that is not enforced. Should exports start counting, or should the allowance leave the plans?
2. A plan the Lawfecta Team set: the page says to contact the team to change it. Should a member on a team-set plan be able to change plan on the website themselves?
3. Annual billing: the page shows the yearly price and what it is a month. A "save 17%" label needs your word that the yearly prices are final.

## Success looks like
An attorney understands their current plan, sees what they have used, compares the alternatives, reviews what a plan change means and knows where billing is handled, with nothing invented.
