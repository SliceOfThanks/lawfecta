# Step 34: Home widgets by role, with real numbers only

Stacey 2026-11-17: sent the handoff "Lawfecta Role-Based Dashboard Widgets: UX/UI, Interaction, Accessibility, and Implementation Handoff" and four mockups (attorney, freelancer, agency, and all three side by side). Built the same day under her standing word to keep building. The handoff itself says its figures are illustrative and that a widget without reliable data must not be shown with invented numbers; this brief says what was built on real data, and what waits because DELA does not record it yet.

Status: attorney and freelancer built. Agency waits (see "Not built").

## Her decisions, taken from the handoff
| Decision | What was done |
|---|---|
| Account status leaves Home and the widget library | Done. A saved layout that named it shows without it. The "Complete your profile" card is not a widget: it stays above the widgets (or under them when work or something urgent comes first) while the profile still blocks the member, as in step 15. License and firm problems stay in "Needs your attention". |
| One side panel: "Your dashboard" above "Available widgets", Home in view | Done. |
| Drag to reorder plus visible Move up and Move down; Save changes, Cancel, Restore default | Done. Each row has a drag handle and three visible buttons named for the widget ("Move Monthly usage up", "Move Monthly usage down", "Remove Monthly usage"). The on/off switch and the three-dot menu of step 33 are gone. A screen reader hears "Monthly usage moved to position 2 of 6." |
| No card stretched to its taller neighbor | Done. Two columns on a wide screen, each card as tall as its content; one column below 1000 pixels, in the member's order. |
| A ring for Monthly usage with exact numbers and words | Done in step 33. |
| Bench and standing arrangements only after a completed engagement | Unchanged: the server already requires it. The bench widget is named "Trusted bench". |
| DELA's delegation suggestions are reviewed by the attorney first | The widget only lists suggestions and opens the document. It posts, invites and assigns nothing. |
| No invented numbers | No match percentages, star ratings, hours saved, profile views or return on investment anywhere. |

## Attorney: six by default
| Widget | Shows | Where the numbers come from |
|---|---|---|
| Needs your attention | Up to three things waiting, each with its action | As before (dela_home_counts) |
| Things to consider delegating | Up to three of DELA's open "delegate" suggestions from the firm's approved documents, with the document, the reason and "Review suggestion" | New: dela_home_delegate over the reviews DELA already made ("Automate or delegate" on a document). Suggestions the member dismissed or already started are left out. |
| My projects and milestones | The four numbers and the active jobs with their next milestone | As before |
| Proposals and talent matches | New proposals and open gigs as numbers; up to three freelancers who fit the newest open gig, with the reason and "View profile" | /gigs, /gigs/matches (existing) |
| Delegation spend and results | A ring and exact amounts: paid in the period, the work and the platform fee apart, refunds apart. Results: milestones accepted, engagements completed, average days from start to acceptance, freelancers hired more than once. Period: this month, quarter or year. | New: dela_home_spend over payments, refunds, milestones and agreements |
| Ask DELA | The question box, DELA's next step, and three shortcuts | As before |

Optional: Trusted bench, Standing arrangements, Workflow improvement opportunities (documents whose self-check found something), Upcoming meetings, Recent messages, Monthly usage, Urgent notifications, Quick actions.

## Freelancer: six by default
| Widget | Shows | Where the numbers come from |
|---|---|---|
| Recommended gigs | Up to three open gigs that match, with practice area, state, budget, closing day and "Why it matches" | /work "matches" (existing). Gigs already answered, closed or filled are not in that list. |
| Earnings and payments | A ring and exact amounts: received in the period, waiting for payout, could not be paid out, contracted but not yet earned; bars for the last six months received | New: dela_home_earnings over payouts and milestones. Waiting money is never counted as received (tested). |
| My proposals and invitations | Invitations to answer, under review, chosen, not chosen; the newest rows | /work (existing) |
| Active work and deadlines | The numbers and the active jobs with their next milestone and due date | As before |
| Needs your attention | As for attorneys | As before |
| Business growth insights | Proposals sent and how many of the decided ones were chosen; "More activity is needed to show a meaningful trend" below five decided; one next step from the member's real state | /work (existing) |

Optional: Upcoming meetings, My availability, Client reviews, Ask DELA, Monthly usage, Recent messages, Urgent notifications, Standing arrangements, Quick actions.

## Decisions Claude made (change any of them)
1. A member who had saved a layout in step 33 keeps it. Everyone else gets the new six of their role.
2. "Ask DELA" is optional for freelancers, as in the handoff. A freelancer who wants it adds it.
3. "Delegation spend" counts money by the day a payment went through. "For the work" is the payment minus the platform fee.
4. "Freelancers hired more than once" is all time, and says so, because "again" has no period.
5. Recommended talent is shown for the newest open gig only, to keep the card short.
6. The attorney's dismissal of a document's suggestions is respected on Home too.

## Not built, and why
| Item in the handoff | Why it waits |
|---|---|
| The agency dashboard (revenue, team workload, pipeline, client projects, team attention) | DELA records an agency's team and jobs, but not agency revenue, team availability or capacity. It also needs its own layout per agency role and a rule for who may see money. This is a build of its own; questions below. |
| Freelancer: Repeat client opportunities, Profile performance, Skills in demand | DELA does not count profile views, repeat clients or the skills gigs ask for. Showing them would mean inventing numbers. |
| Attorney: hours saved, return on investment, match percentages, star ratings | Not measured. Left out on purpose. |
| A search box in the top bar, "Schedule", the dark menu of the mockups | Not part of the widgets. Say the word and they become their own step. |
| A check at 200% text size and 400% zoom, and with a real screen reader | Needs a person. Listed in docs/PILOT_CHECKS.md. |

## Questions for the agency dashboard (answer before that build)
1. Who sees agency money on Home: the owner only, or managers too?
2. Should DELA start counting each team member's available hours a week, so "Team workload" can show capacity? Until then it can only show how many jobs each person is on.
3. Is agency revenue what the agency was paid out (after the team's shares), or the full amount clients paid for the agency's jobs?
4. Does an agency owner get the agency Home in place of the freelancer Home, or a switch between the two?

## How it could go wrong
- A summary read by the wrong side or by a stranger: refused or empty (tested).
- A payout that is held or failed: shown as waiting or as not paid, never as received (tested).
- A widget whose data cannot load: says so with "Try again", never zero or "nothing waits" (tested).
- A member with nothing yet: each widget says what is missing and offers one next step.

## Success looks like
ChatGPT check 6, rewritten for these screens: docs/tests/home-dashboard-chatgpt-prompt.md.
