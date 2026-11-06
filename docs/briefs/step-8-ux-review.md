# Feature brief: UX and UI improvements from the attorney review

Step: 8 (UX review)   Spec references: the ChatGPT attorney UX review (2026-11-06), findings H01 to C01
Status: questions answered, approved to build (Phases 0 to 3)

## Who
Attorneys first (the review covered the attorney side). The same patterns then go to freelancers, agencies and the Lawfecta Team admin area. Every plan.

## What
ChatGPT walked the attorney screens on the test site and wrote 30 findings, 30 tooltips, 20 ideas for AI buttons, a top 10 and patterns across pages. This brief turns them into four phases:

- Phase 0, real defects. Each one ships as a "Fix" commit with a test that fails before the fix.
  1. A monthly engagement also showed the generic "Cancel the engagement". Monthly uses only the monthly cancel and end controls (M02).
  2. Notices store a link, but the drawer showed no button. Each notice gets its own action button (N01).
  3. The Comments view said "Read view", but the tab is "Draft and review" (D01, part).
  4. On Projects, the "Engagements" card jumped above "Post a new gig" after loading. The order is now fixed (P01, part).
  5. A suggestion already delegated still showed as a new idea. It now shows "Gig posted" or "Gig drafted" with "View gig" (D02).
- Phase 1, wording and trust (small effort). Library column names and review actions (L02), the agreement total for the attorney (E01), the monthly price including the fee and the billing state (M01), the monthly cancel text (M02), the gig form budget and fee note (P02), the profile Save label (R02), plan names (H02), proposals (G01), empty matches (G02), gig file sharing (G03), meetings date and time zone (I02), attorney examples on the attorney profile (R03), AI settings (AI01, AI02), "Estimated time saved" (D02).
- Phase 2, layout (medium effort). Library table (L01, L03), Projects order and filters (P01), Profile navigator (R01, S01), Ask DELA (A01), Talent labels and "View profile" (T01), Inbox actions (I01), booking times (I03), notices split into "Needs your action" and "Updates" (N01), agreement parties (E02), milestones (E03), the monthly allowance (M03), Files (F01), the Connect page (C01), quality checks (D03).
- Phase 3, shared patterns across the platform. One accessible help tip used by the member app and the admin, the review's tooltips (each checked against real behavior), one commitment summary before every signature or payment, one style for AI buttons, and the same patterns on the freelancer, agency and admin sides.
- Phase 4 (later, its own brief): a read-only view of approved documents (D01), the 20 new AI buttons, onboarding in the first 10 minutes, dark mode.

## Where
The member app (app/dela-app.js), shared styles and helpers (shared/dela-core.js), the admin (admin/dela-admin.js), and small api additions (the agreement totals, the fee estimate on the gig form, the notice action state).

Outside DELA, in Brilliant Directories (Stacey): the old "Welcome To LawWurk" login page text (H01) and the BD "Bronze Plan" name. Claude writes the exact steps.

## When
Phase 0, then 1, 2 and 3, each deployed to the test site and checked by ChatGPT. Then step 7c part 2 (standing arrangements), so the new screens follow the new patterns.

## Why
Busy attorneys decide in seconds whether a page is worth their time. Clear money totals, plain words and one obvious next step build trust and lead to more posted gigs and signed engagements.

## How it could go wrong
- A tooltip that says something the system does not do. Each tooltip is checked against the code first.
- Money shown on screen that differs from what is charged. Totals come from the same fee lines the agreement uses, never typed into screen code.
- Essential money, privacy or legal text hidden inside a tooltip. That text stays on the page.
- Reordered pages that break agent tests. Each phase updates the test prompts.

## Settings and switches it uses
fee.client_bps and the fee floor (the estimate on the gig form), recurring.* (the monthly text), and the new recurring.unused_rollover (false).

## Questions to make it better (answered by Stacey 2026-11-06)
1. How much to build now? Phases 0 to 3. Phase 4 gets its own brief afterwards.
2. Directory sync on the profile: stays ticked by default. Build only the clearer Save label and the list of directory fields that change.
3. Unused monthly capacity: no rollover. The monthly limit is per month. Weekly units are how the month is reviewed and paid out, not a weekly cap. A 5-week month has the same limit and price. Recorded as recurring.unused_rollover (false, C), in the monthly clause and in the monthly allowance display.
4. Order: the UX phases first, then step 7c part 2 (standing arrangements).

## Success looks like
- Every Phase 0 fix has a browser check that failed before the fix.
- All browser suites and api tests pass; rules_check passes.
- After each phase, a short ChatGPT check of the changed pages, one login per account.
- After Phase 3, the same look-only review run again on the attorney and freelancer sides, with better ratings than this one.
