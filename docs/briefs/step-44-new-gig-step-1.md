# Feature brief: Post a New Gig, step 1 as one focused form

Step: 44   Spec references: Stacey's brief "Lawfecta, Post a New Gig: UX/UI, accessibility & mobile implementation brief" (2026-11-18) and her mockup; docs/briefs/step-38-new-gig.md
Status: draft, waiting for Stacey's answers

## Who
Attorneys on every attorney plan, and an agency that hires. Not the freelancer side.

## What
Step 1 of posting a gig: choose the approved document, the type, the budget and any details, then ask DELA for a draft. Done looks like: one form the attorney reads top to bottom, with no side panels and no repeated instructions, that leads to an editable draft. Nothing is posted on this step.

## Where
Projects, "+ New Gig", "From an approved document" (https://www.lawfecta.co/dela?tab=projects). Code: newGigPage() in app/dela-app.js; styles `.gs-*` in shared/dela-core.js. Steps 2 and 3 (the draft gig's own page) keep their content.

## When
Each time an attorney starts a gig from an approved SOP or Workflow.

## Why
Today step 1 has three numbered cards inside a three-step page, grey card heads, a side panel "Estimated costs" that is empty until a budget is typed, and a second list "What happens next" that repeats the step bar.

## What the platform really does today (checked in the code)
1. Nothing is stored on step 1. The gig is first saved when DELA writes the draft. What was typed is kept only while the page stays open ("Back to Projects" and back again). So there is no real "Save draft" on step 1 today.
2. Approved documents come from the server (GET /gigs, "playbooks"): only approved SOPs and Workflows the member may use. With none, the page says so and links to the Library. "Preview document" is real: it opens the document in a new tab.
3. Monthly is offered only when the switch recurring_engagements is on. A monthly gig's budget is the monthly price. How often each task happens and what is included each month are set later, in the agreement's "Monthly terms", not on the gig.
4. The minimum budget and the fee rule (percent and smallest fee) come from settings through the server. The estimate is real arithmetic on them; the exact fee is set in the agreement.
5. The work deadline is optional and the server refuses a date in the past when the gig is posted.
6. Drafting uses DELA actions when AI drafting is on: the number is the setting ai.credits.chat. With AI off, DELA builds the draft from the document and uses none.
7. The server checks "Additional details" for client information and refuses what it recognizes. It cannot catch everything.

## The new step 1
- Top: "← Back to Projects", "Post a New Gig", one line, then the three-step bar with only the current step marked.
- One white form card with three headings and thin dividers, no numbers: "Choose the work", "Engagement type", "Budget & requirements".
- "Choose the work": the list labeled "Approved SOP or workflow", "Preview document" once one is chosen, the empty state with "Open the Library to create or approve one".
- "Engagement type": one radio group. "One-off" ("One project, fixed price") and "Monthly" ("Recurring work, monthly price"). Monthly shows only when the switch is on. Choosing Monthly renames the budget boxes to the monthly price, hides the work deadline, and says where the monthly tasks are set (the agreement's Monthly terms).
- "Budget & requirements": "Budget from (USD)", "Budget to (USD)", "Work deadline (optional)" on one row, stacked on a phone. Under them, the minimum in words. Once a valid budget is typed: the budget, the platform fee and the estimated total, from the fee rule. Before that: one line, "The platform fee is calculated from your plan and shown before you post." Then "Additional details (optional)" with an example under the box and the character count. Then the soft-blue notice: "Protect client information: Do not include client names, confidential case details, account numbers or passwords."
- Errors sit beside the field, in words, and the first one gets the focus. Entries stay.
- Bottom: "Back to Projects" at the left, "Draft with DELA" at the right, and between them: "Nothing is posted until you review and publish." plus the DELA actions this draft uses, from the server.
- While DELA works: buttons locked, a spoken status line. On failure: a message, entries kept, try again.

## Decisions Claude made (Stacey can change any)
1. The side panels "Estimated costs" and "What happens next" are removed from step 1. The estimate moves under the budget boxes and shows only when there is a budget to work from.
2. "Cancel" (throw the entries away) becomes a small link "Clear the form", so the bottom row has the two buttons of the mockup and nothing is lost.
3. The work deadline box refuses a date before today on step 1, the same rule the server applies at posting.
4. The server tells the page how many DELA actions a draft uses (one new read-only field on GET /gigs). Nothing else changes on the server.

## How it could go wrong
- Two clicks on "Draft with DELA": the button locks and the request carries one id, so one gig is made.
- No approved documents; the Library switch off.
- Budget under the minimum, "to" under "from", letters, a past date.
- Client information in the details: refused with a clear message, entries kept.
- DELA or the network fails: message, retry, entries kept.
- An agency posting for part of an engagement, and a gig started for one freelancer: their notices stay at the top.
- Not verified yet: the member can still draft; the notice says posting needs a verified license.

## Settings and switches it uses
gig.min_budget_cents, fee.client_bps, fees.floor_cents_per_party, ai.credits.chat, quota limits for open gigs; switches flex_gigs, recurring_engagements, ai_generation, playbook_library. No new business number.

## Questions to make it better
1. "Save draft" on step 1: leave it out (nothing is stored before DELA drafts, and the page says so), or build real saving of an unfinished step 1 so it survives closing the browser? Real saving is a new stored record and a later step.
2. The step bar in your brief says "Review & publish". The buttons and messages on steps 2 and 3 say "post" ("Post the gig", "Nothing is posted"). Use "publish" on the step bar only, change every "post" to "publish", or keep "post" everywhere?

## Success looks like
- One form card, three headings, no numbered sections, no side panels, at 1280 and at 320 wide with no sideways scrolling.
- The list shows only approved documents; the empty state links to the Library.
- One labeled radio group; Monthly changes the budget labels, hides the deadline and explains where monthly tasks are set.
- Budget and date mistakes are said beside the field and nothing typed is lost.
- The estimate appears only with a budget and equals the fee rule; the DELA actions number equals the setting.
- "Draft with DELA" makes one editable draft and posts nothing.
- tests/pw/newgig-test.js covers it by keyboard and at phone width; the ChatGPT check 10 steps for this page are rewritten.
