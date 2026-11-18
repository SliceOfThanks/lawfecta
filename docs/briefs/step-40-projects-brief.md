# Feature brief: Projects after the implementation brief

Step: 40   Spec references: Stacey's "Lawfecta Projects Workspace: UX/UI, Accessibility, Responsive Design, and Implementation Brief" and three mockups (2026-11-18); steps 37, 38 and 39; WCAG 2.2 AA
Status: built without waiting, on Stacey's standing word ("release when tests pass and continue building"). What was already in place, what changed and what is a gap are listed below.

## Who
Attorneys on every plan, and a freelancer whose agency hires. New layout only.

## What was already in place (steps 37 to 39)
The heading, one "+ New Gig" at the top, four numbers counted from real records, four tabs with the keyboard pattern, "Needs your attention" with one named button per item, real tables that stack into labeled lines on a phone, search and filters on Gigs and Engagements, no trends or scores, the three-step "Post a New Gig" page, and the small floating help tip.

## What changed in this step
1. **The right column on the Overview (P0).** It was squeezed until words broke one by one. It now sits beside the left column only when it can be at least 320 pixels wide; otherwise it goes under it. Each upcoming milestone is one row whose words keep their width and whose date drops under them when space is short.
2. **Overdue (P0).** A row is marked "Overdue" only when the engagement is under way (signed and paid) and the milestone's date has passed without it being delivered or accepted. An agreement that is not signed or not paid yet shows "Planned for DATE" and is never overdue.
3. **No made-up values (P0).** A draft with no budget says "Budget not set" (it said "$0 to $0"). No closing date says "Not set". No next milestone says "Not scheduled". A milestone with no date says "No date set".
4. **Buttons that say what they do.** Gigs: "Continue draft" for a draft, "Review proposals" for an open gig that has proposals, otherwise "View gig". Engagements: "Pay milestone", "Review deliverable" or "Sign agreement" when that step waits on the member, otherwise "View engagement". Each button's name for a screen reader includes the job's title.
5. **One way to start a gig.** The "Post a new gig" card with "Start a new gig" is gone from the Gigs tab. "+ New Gig" at the top is the one entry.
6. **No Home content on Projects.** The "Ask DELA" box from Home is no longer on the Overview. Ask DELA stays in the menu at the left and in the "+ New Gig" menu ("Plan a task with Ask DELA").
7. **Standing Arrangements.** "At a glance" is the list, with a "Manage" button on each row. Under it each arrangement is one line that opens its details (covered documents, this month, jobs, hiring again, limits, ending). One that waits on the member starts open. The details are no longer a row of fully open cards.
8. **Help.** The help icon sits right beside the heading it explains. The words follow the brief's table. The columns "Milestones accepted", "Next milestone", "Monthly limit", "Counted this month", "Remaining" and "Jobs open" each have a tip.
9. **A note that is always on the page**, at the bottom of the Overview: what a gig, an engagement and a standing arrangement are. It is grey, not a blue notice.
10. **Words.** The line under the heading is "Manage your gigs, awarded work, milestones and standing arrangements." The columns are "Milestones accepted" and "Closing date".

## What was checked before naming things
- **Monthly limit.** The code counts the price of each job started from the arrangement in the calendar month (dela_standing_spend: jobs that are starting, waiting for payment or active). Lawfecta's platform fee is added to each charge and is not counted. The tips say exactly this, and "Remaining" says it is a limit, not money held.
- **Milestones accepted.** Accepted milestones out of the milestones in the signed agreement. Before signing there are none, and the row says "Set when you both sign", with no bar.
- **Lifecycle and urgency.** The status tag is the engagement's state from the server. "Overdue" is a second, separate tag.

## Gaps, said plainly (nothing is simulated)
- **"Due soon".** There is no rule for it in DELA, so no row says it. It needs a number of days from Stacey.
- **Filters by status on Engagements.** The tab has search, and active work apart from finished and canceled. A filter per status is not built.
- **Sorting the tables.** Not built. Gigs come newest first; engagements as the server sends them.
- **Ending an arrangement.** The question before ending says no new jobs can be hired and open jobs finish as agreed. It does not list the open jobs by name.
- **Zoom.** The automated tests check 768 and 320 pixels wide (320 equals 400% zoom on a 1280 screen). A person has not tried browser zoom, a screen reader or a real phone.
- **The four numbers have no "?" of their own.** Each is a button, and a button cannot hold a second button. The number's name for a screen reader includes the explanation.

## Added the same day (step 41), closing two of the gaps above
- **Status filter on Engagements.** A row of buttons above the table, one per status the active engagements really have, in the same words the rows show (for example "Active (3)", "Needs your signature (1)"), with "All active" first. It shows only when there is more than one status. A screen reader hears how many are shown.
- **Ending an arrangement.** The question now names the open jobs ("The 2 open jobs finish as agreed: A; B."), or says "No job is open under it now."
- **Quick actions** has its help tip, and its heading sits on the same band as the other cards.
Still open: "Due soon" (needs a number of days) and sorting.

## How it could go wrong
- A list cannot load: the page says so with "Try again" and never says "nothing waits".
- A long title: it wraps; nothing is cut off.
- The window is narrow: the right column goes under the left one; tables become labeled lines.

## Questions to make it better
1. How many days before its date is a milestone "Due soon"? With a number it becomes a tag.
2. Do you want a status filter on the Engagements tab (for example "Waiting for signature", "Active")?
3. Should the question before ending an arrangement name the open jobs?

## Success looks like
- GitHub Tests pass with the added checks in tests/pw/projects-test.js and tests/pw/newgig-test.js.
- ChatGPT check 10 covers the page in one run with the test attorney.
- Only real use can prove: docs/PILOT_CHECKS.md 40.1 (standing arrangements folded, with real arrangements) and 40.2 (zoom at 200% and 400%).
