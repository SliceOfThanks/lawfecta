# Feature brief: Home after the UX and accessibility review

Step: 36   Spec references: "DELA Home dashboards: UX and accessibility changes" (ChatGPT review of 2026-11-17, sent by Stacey as a Word file); steps 33, 34 and 35; WCAG 2.2 AA
Status: built and released without waiting (Stacey's standing word: release when tests pass). The questions at the end are open; each has the choice Claude made.

## Who
Attorneys, freelancers and agency owners on every plan, on Home (www.lawfecta.co/dela?tab=home). People who use the keyboard or a screen reader gain the most.

## What
The review listed 18 changes in priority order. All 18 are built. In short:

| # | Change | What was built |
|---|---|---|
| 1 | Card order for keyboard and screen readers | The cards are in the page in the member's own order, in one grid that fills row by row (1 and 2, then 3 and 4). Tab and a screen reader now follow the order chosen in the Customize panel. Cards keep their own height. |
| 2 | One rule for Overdue | A milestone is overdue when its due date is before today (the member's own time zone) and it is not accepted. Every card uses it: the red "Overdue" pill and "Was due" in place of "Due". Overdue rows come first, the oldest first. |
| 3 | One milestone, one row | "Needs team attention" no longer lists a milestone twice. The Overdue row stays and takes the payment line. The number counts rows. |
| 4 | One proposal count | "Proposals and talent matches" shows "Proposals to review", counted the same way as Ask DELA (proposals sent and not yet answered, on open gigs). With one proposal Ask DELA says "Review it and decide whether to hire." with "Review the proposal". "Compare" shows from two. |
| 5 | The Customize panel is a real dialog | Named, modal, the page behind cannot be reached, Tab stays inside, Escape closes. The browser pop-up is gone: "Discard your changes?" with "Discard changes" and "Keep editing" shows inside the panel, for Close, Escape and a click outside. |
| 6 | Urgent card first | New default order for freelancers and agencies (below). Saved layouts are not touched. |
| 7 | Usage said once | The banner reads "You have used 840 of your 1,000 DELA actions this month." The line under the cards is gone on Home. Ask DELA says "Planning a task uses DELA actions." with no count, and "Questions asked here are free and do not use your DELA actions." "Dismiss" holds until the limit reaches its next level (close, then reached) or the month starts again. |
| 8 | Failed payment row | A second line: "Milestone 2 · $1,200.00 · payment failed on Nov 10, 2026". |
| 9 | Short names for row links | A row is named by its action and title ("Pay milestone: The payment for milestone 2 did not go through"); the detail is read after. |
| 10 | Link size | Every link on Home is at least 24 pixels tall, with at least 8 pixels between neighbors. |
| 11 | Ask DELA label | A visible label "Ask DELA a question" above the box; the grey words in the box are an example. |
| 12 | Rings and $0 cards | "Earnings and payments" and "Delegation spend and results" show the amount as large text, no ring. All $0: one line and the link. Spend $0: "Post a gig →". The "Monthly usage" ring stays (it shows used against a limit, and Stacey asked for it). |
| 13 | Repeated figures | "Active work and deadlines" no longer repeats "Invitations" and "Paid out this month". |
| 14 | Team card buttons | One link, "Ask everyone without hours to set them", and a line that says what is sent. Asking one person stays on the Agency page. |
| 15 | Agency gigs and pipeline | A line under both headings: "Same list as My work. Agency and personal proposals are not separated yet." |
| 16 | Wording | "Unlimited" over "proposals this month"; "Signed, not yet paid"; "Review milestone"; "DELA suggestion settings". |
| 17 | Customize panel preview | The page behind is dimmed lightly (16%). A line says Home updates as a preview. A grey "Default" tag marks the default widgets. |
| 18 | 320 pixels wide | Home and the panel fit with no sideways scrolling; the status pill stays left of the row's arrow. |

New default order:
- Freelancer: Needs your attention, Active work and deadlines, Recommended gigs, Earnings and payments, My proposals and invitations, Business growth insights.
- Agency: Needs team attention, Active client projects, Team workload and availability, Agency revenue and payments, Proposals and sales pipeline, Recommended agency gigs.
- Attorney: unchanged.

## Where
Home for all three roles, the Customize panel, the limit banner at the top of every page, and the first message of Ask DELA.
Code: app/dela-app.js, shared/dela-core.js, supabase/functions/api/lib/guide/guide.ts, supabase/migrations/0133_home_review_fixes.sql.

## When
On every visit to Home. The new default order applies at once to members who never saved a layout.

## Why
Two of the findings are Level A failures (the lowest bar of WCAG): reading order and focus order. The rest remove doubt: two numbers for one thing, a late item with no label, the same milestone twice.

## How it could go wrong
- A member who liked the old default order sees a new one. They can change it in "Customize dashboard"; nothing is lost.
- Row by row leaves white space under the shorter card of a row. The review accepts this as the price of a correct reading order.
- "Overdue" on work the freelancer already delivered would be unfair. So delivered work that waits for the client's review, and work in a dispute, are not called overdue (question 1).
- The failed payment date needs a failed charge on record. When a payment simply waits (no failed charge), the row shows the milestone and the amount without a date. Nothing is invented.
- "Dismiss" on the banner is kept in the browser. On another device the banner shows once more.
- The bulk request for weekly hours uses the existing one-a-day rule per person, so a second click the same day sends nothing.

## Settings and switches it uses
No new setting, switch or business number. The banner still uses the warning level from settings (usage.warn_pct).

## Questions to make it better
1. Overdue: the review says "not accepted". Claude also leaves out delivered work that waits for review, and disputed work. Keep that, or mark those overdue too?
2. Rings: the review removes them from Earnings and Spend because they repeat the number. Stacey asked for a ring on Monthly usage ("people like visual"), so that one stays. Want a different visual on Earnings and Spend (for example the six-month bars on both)?
3. The agency cards "Recommended agency gigs" and "Proposals and sales pipeline" show the owner's own lists. The hint says so. Separating agency proposals from personal ones is a build of its own. Wanted?
4. The banner's "Dismiss" used to last until the next login. It now lasts until the next level. Fine?

## Success looks like
- GitHub Tests pass: home-test.js (order in the page, rows, the dialog, no browser pop-up, late work, the failed payment line, the agency rows, 320 pixels), workspace-test.js (banner), guide_test.ts (one proposal), engagements_test.ts (amount and failed day), home_test.ts (defaults).
- After release: one ChatGPT check, grouped by login (test freelancer with "My work" and "My agency", then test attorney): docs/tests/home-review-fixes-chatgpt-prompt.md.
- Only real use can prove: a real screen reader on the new order and the dialog (docs/PILOT_CHECKS.md, 36.1 and 36.2).
