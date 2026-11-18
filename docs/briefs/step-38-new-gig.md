# Feature brief: posting a gig in three steps

Step: 38   Spec references: Stacey's "Lawfecta: New Gig Creation, UX/UI, Accessibility and Implementation Requirements" and two mockups (2026-11-17); step 37 (Projects); WCAG 2.2 AA
Status: built without waiting, on Stacey's word of 2026-11-17 ("Build and test as much as possible. Approve what needs to be approved to keep building and get this deployed."). The open points are at the end, each with the choice Claude made under her hard rules.

## Who
Attorneys on every plan, and a freelancer whose agency hires. New layout only.

## What
Posting a gig was a form that opened inside the Projects page, then a long edit page. It is now three steps, each with one job:
1. **Set up the gig.** A page of its own ("Post a New Gig"): choose the approved document, One-off or Monthly, the budget, the work deadline and any details for DELA. The estimated costs and "What happens next" sit beside the form (under it on a phone).
2. **Review DELA's draft.** The description freelancers will read, every part of it editable. "Save draft" saves it.
3. **Review and post.** Budget, deadline and milestones; the estimated costs; "What freelancers will see" as they will read it; one box to tick; "Post the gig".

Nothing is posted before the attorney ticks the box on step 3 and chooses "Post the gig".

## How each hard rule of the requirements is met
1. **No invented data.** The minimum budget and the fee rule come from the api (settings gig.min_budget_cents, fee.client_bps, fees.floor_cents_per_party). With no budget the costs box says "Enter a budget to see the estimated total."
2. **No hard-coded fees.** The percentage and the least fee are read from the api each time. Today every plan has the same fee rule, so the page shows that one rule; it does not claim a fee "for your plan".
3. **No invented analytics.** None on the page. Monthly usage and DELA's recommendations stay on Home.
4. **No controls that do nothing.** "Preview document" is a real link that opens the document in the Library in a new tab; it is hidden until a document is chosen. Step 1 has no "Save draft" (see 5).
5. **No false "saved".** Nothing is stored on the server before DELA writes the draft, so step 1 has no "Save draft" and never says anything was saved. What was typed is kept while the member moves around DELA ("Back to Projects" keeps it; "Cancel" discards it; closing the browser tab loses it). From step 2 on, "Save draft" is a real save.
6. **No automatic posting.** Posting needs the tick box and the button on step 3. Without the tick, the page says what is needed and posts nothing.
7. **No invented AI results.** DELA writes from the approved version of the chosen document and the member's own details. If DELA cannot write, the page says so and keeps what was entered.
8. **Confidential information.** A notice on step 1 and again at the tick box. It says DELA's check "cannot catch everything". The existing check on the details box still runs.
9. **Business rules unchanged.** The minimum budget, One-off and Monthly, the open-gig limit of the plan, the fee, and the closing date for proposals (set by Lawfecta's setting when the gig is posted) are as before.
10. **Nothing removed.** Linked gigs for an agency, "creating a gig for NAME", the image warning, "Check the scope", references, extending and closing all still work.
11. **Little clutter.** Each step shows only what that step needs.
12. **The mockup is not the spec.** See "Not built" below.

## Not built, and why
- **"Proposal deadline" as a field.** The closing date for proposals is a Lawfecta rule today (a setting, plus one extension). Letting each attorney choose it changes a business rule, so it waits for Stacey's word. The page says the date is set when the gig is posted and shown then.
- **"Save Draft" and "Your progress is saved automatically" on step 1.** There is nothing to save to before DELA writes the draft. Building it means a new kind of stored draft; it is listed as a question.
- **"This uses 1 DELA credit".** The page says "Drafting uses DELA actions from your plan." without a number, because the number is a setting the page does not receive.
- **"See examples of effective gigs" and "Tips for a great gig".** There is no examples page, and the tips are covered by the help lines under each field.
- **A preview inside the page.** The preview opens the real document in a new tab instead.

## Accessibility
Every field has a visible label tied to it (no placeholder-only fields); One-off and Monthly are one fieldset with a legend; mistakes are written in words under the field, tied to it, with focus moved to the first one; the stepper marks the current step for screen readers; DELA's writing, success and failure are announced; all controls are at least 44 pixels tall; the page reflows to one column and fits 320 pixels.

## Where
"+ New Gig" at the top of Projects, "Start a new gig" on the Gigs tab, "Use for a gig" from a document, and "Create a gig for NAME" from a conversation all open the page. Code: newGigPage, gigStepper, gigCostBox and the wizard part of gigDetails in app/dela-app.js; styles ".gs-" in shared/dela-core.js. No server change.

## How it could go wrong
- DELA fails or the connection drops while writing: the page says so and keeps every entry.
- A budget under the minimum, or "to" under "from": refused in words, at the field.
- No approved document: the page says so and offers the Library.
- The member posts without reading: the tick box and the "What freelancers will see" card stand in the way.

## Questions to make it better
1. Should attorneys choose the proposal deadline themselves (within limits you set)? Today it is your setting.
2. Should step 1 be saved on the server so a half-filled form survives closing the browser? It needs a new stored draft.
3. Should the page name the number of DELA actions a draft uses?
4. Do you want an "examples of good gigs" page to link from step 1?

## Success looks like
- GitHub Tests pass with the new tests/pw/newgig-test.js (labels, mistakes, costs, entries kept, the draft, Save draft, the review, no post without the tick, posting, no approved document, 320 pixels).
- After release: ChatGPT check 10 covers Projects and the new gig page in one run with the test attorney; it stops before "Post the gig" and deletes its draft.
- Only real use can prove: a screen reader and a real phone through the three steps (docs/PILOT_CHECKS.md 38.1).
