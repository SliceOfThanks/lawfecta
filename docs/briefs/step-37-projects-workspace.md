# Feature brief: Projects as a workspace

Step: 37   Spec references: Stacey's brief "Lawfecta Projects Page: UX/UI Improvements" and two mockups (2026-11-17); steps 33 to 36 (Home); WCAG 2.2 AA
Status: questions answered (two, below); built. Four smaller points are open at the end, each with the choice Claude made.

## Who
Attorneys on every plan, and a freelancer whose agency hires (they have the Projects page too). Only with the new layout, which is on for everyone on the site.

## What
The Projects page was one long page: the new gig form, "Needs your action", every gig, every engagement, every standing arrangement. It is now a workspace with four tabs, so an attorney sees what needs them first and finds one gig or engagement without scrolling.

Stacey's words for the goal: "The Projects page should be an operational workspace, not another dashboard filled with unrelated information." "Every section should have a clear purpose, display relevant information, and make the next action obvious."

What was built:
- **Top of the page.** "Projects" with a "?" help tip, one line of purpose, and "+ New Gig" at the right with a small menu: "From an approved document", "Plan a task with Ask DELA", "Create a document first".
- **Four numbers**, each a button that opens its tab: "Needs action", "Open and draft gigs", "Active engagements", "Standing arrangements".
- **Tabs:** "Overview", "Gigs", "Engagements", "Standing Arrangements". Arrow keys, Home and End move between them.
- **Overview, left:** "Needs your attention" (the first three items, each with one button: "Pay milestone", "Review deliverable", "Sign agreement", "Review proposals", "Answer questions"; the rest behind "+ N more items"); "Active engagements" (a table: engagement, freelancer, progress, next milestone, status, "View"); "Your gigs" (four counts: Drafts, Open, Filled, Closed; each opens the Gigs tab on that filter).
- **Overview, right:** "Quick actions", "Ask DELA", "Upcoming milestones" (the next milestone of each active engagement, the nearest date first).
- **Gigs tab:** the "Post a new gig" card, then "Your gigs" as a table (proposals, budget, closing date, status) with the filters and a box to find a gig by its title.
- **Engagements tab:** every engagement as a table with progress and the next milestone; finished and canceled ones folded away; a box to find one by title or freelancer.
- **Standing Arrangements tab:** "At a glance" (freelancer, monthly limit, this month, remaining, jobs open, status), then the full card where an arrangement is set up, approved, used and ended.
- **Help:** a "?" tip beside each section heading, opened by click or keyboard, closed with Escape.
- **Phone:** each table row becomes a stack of labeled lines; nothing scrolls sideways at 320 pixels.

## Stacey's two answers (2026-11-17)
1. The right column of the Overview: "Quick Actions Set (Recommended) - Quick Actions should prioritize useful project-management tasks such as Review Proposals, Approve Deliverables, and Pay Milestones, rather than repeating the New Gig button already at the top." Built as: "Review proposals", "Approve deliverables", "Pay milestones", "Sign agreements", each with how many wait. One waiting item opens that item; several open the full attention list; none opens the tab where they would be.
2. "Customize View" on Projects: "Not now (Recommended)". Not built.

## Decisions Claude made
1. **No trends, scores or labels DELA cannot back with a record.** The mockups show "+27% vs. last month", "Top performing gig", "High interest" and "At risk". None is built. Late work shows "Overdue" by the one rule from step 36 (past its date and not accepted). This follows Stacey's standing rule that every figure comes from platform records.
2. **"DELA Insights" and "Monthly usage" stay on Home**, where they already are, so nothing shows in two places.
3. **A gig still starts from an approved document.** The mockup's "start from scratch" is not built; "Create a document first" opens the Library.
4. **The Standing Arrangements tab keeps the existing card under the summary table.** Setting up, approving and "Hire again" have signed steps; they were not redesigned in this release.
5. **The old layout keeps the old one-page Projects.** Only the new layout gets the workspace.
6. **Search is per tab** (a gig by title, an engagement by title or freelancer). The mockup's one search box across the whole site is not built.

## Where
www.lawfecta.co/dela?tab=projects. Code: projectsWorkspace and the pj* helpers in app/dela-app.js; styles ".pj-" in shared/dela-core.js; migration 0134 (each engagement in the list now carries its next milestone).

## Why
Attorneys act on proposals, signatures, payments and deliveries. The page now leads with those and keeps the rest one click away.

## How it could go wrong
- The engagements list cannot load: the page says so with "Try again" and shows "?" in place of a count. It never says "Nothing waits on you".
- A number on Home ("Open gigs", "Deliveries to review") opens Projects: it now opens the right tab and puts focus on the list's heading.
- An attorney looks for the new gig form on the Overview: "+ New Gig" at the top opens it on the Gigs tab, from any tab.
- Two columns on a small laptop: below 1100 pixels the right column moves under the left one.

## Settings and switches it uses
No new setting or business number. Uses the switches new_layout, flex_gigs, engagements, ai_generation and playbook_library as before.

## Questions to make it better
1. One search box for the whole site (the mockup's "Search projects, gigs, engagements, or people"): wanted? It is a build of its own.
2. Should the Standing Arrangements card itself be redesigned (details behind "Show details"), or is the summary table above it enough?
3. "Start from scratch" for a gig, without an approved document: wanted? Today every gig comes from an approved SOP or Workflow, by your earlier rule.
4. Should the freelancer's Work page get the same four-tab treatment next?

## Success looks like
- GitHub Tests pass, with the new tests/pw/projects-test.js (empty states, the four numbers, tabs by keyboard, the New Gig menu, help tips, the attention list, the tables, Overdue, quick actions, finding a gig or engagement, 320 pixels, a failed load) and the next-milestone check in engagements_test.ts.
- After release: ChatGPT check 10, one login (the test attorney): docs/tests/projects-workspace-chatgpt-prompt.md.
- Only real use can prove: a screen reader on the tabs and tables, and a real phone (docs/PILOT_CHECKS.md, 37.1 and 37.2).
