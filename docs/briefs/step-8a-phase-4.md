# Feature brief: UX review Phase 4 (approved-version view, AI helpers, first ten minutes, dark mode)

Step: 8a   Spec references: docs/briefs/step-8-ux-review.md (Phase 4), UX review findings D01, Part 4 (AI help buttons), Part 8 (first ten minutes), the mockups' dark-mode examples; docs/briefs/step-4d-guided-setup-delegate-automate.md (onboarding widget A); docs/briefs/step-9b-attorney-usage-limits.md (DELA actions)
Status: approved by Stacey 2026-11-06 ("all as suggested"). Build A, then B checks 1 to 5 with the two freelancer helpers, then the rest of B, then D. C waits for the onboarding widget.

Phases 0 to 3 of the UX review are on the test site. Phase 4 holds the four items that were too large or too new to build without their own brief. Each one is a separate part, so they can be built and tested one at a time.

## What exists today (checked in the code, 2026-11-06)
- **Documents.** When a document is approved, DELA records the approved version. Editing it afterwards makes a new draft, and the approved version stays in use for gigs, standing arrangements and Automate or delegate. The screen does not show this well: an approved document opens straight into the edit form with Save buttons, under an "Approved" label. A draft shows the note "Draft, not approved... The approved version N stays in use until this one is approved." There is no read-only page for the approved version.
- **AI buttons today:**
  - Ask DELA
  - Document chat (its changes wait for the attorney to accept them)
  - drafting a new document from questions
  - "Fix it" on quality checks
  - "✦ Find what to automate or delegate"
  - "Draft the gig with DELA"
  - in the Inbox: "✦ Summarize", "✦ What we agreed", "✦ Draft a reply"
  - on the profile: "✦ Write with DELA", "✦ Let DELA help with qualifications"
  - "Ask DELA" in Files
  
  Since Phase 3 they all share one look. On Lawfecta's AI each run uses weighted DELA actions; on the member's own key it uses none.
- **Onboarding.** The attorney "Get set up" screen (six steps) is built (step 4d part B). The onboarding widget for both sides (step 4d part A) is approved for the end of Phase 1, after the MVP launch, with reminder emails on day 2 and day 7.
- **Dark mode.** It already exists in part: DELA follows the computer's or phone's own light or dark setting. There is no switch for the member to choose, and a few colors are still fixed to the light theme (for example the border of your own messages in the Inbox). The Brilliant Directories page around DELA stays light whatever DELA does.

## Part A: the approved-version view (D01)

### Who
Attorneys and firm staff who read, edit or approve documents. Freelancers and agencies see the approved version through a gig, never the draft.

### What
- An approved document opens on a read-only page, "Approved version", which shows:
  - the version number, the approval date, who approved it and the next review date
  - the document as it is used: steps, RACI, KPIs and images, with no boxes and no Save buttons
- One clear action, "Edit a new draft". It copies the approved version into a draft. The approved version stays in use until the draft is approved.
- When a draft already exists, the page says "A draft (version N) is in progress", with "Open the draft". It does not make a second draft.
- The draft page keeps today's form, plus a link back: "View the approved version".
- Honest details instead of placeholder text: "Document ID: given when first saved" becomes the real ID or "Not given yet"; "Last reviewed: Not yet" becomes the real date, or "Never reviewed since approval".
- Comments link to the page they belong to, with its real name.
- Exports and gigs keep using the approved version (as today), and the page says so.

### Where
Library, document page. Admin: nothing new.

### How it could go wrong
- Two people click "Edit a new draft" at once: one draft is made, the second person opens it.
- Someone edits the draft and thinks gigs use it: the draft page keeps the "Draft, not approved" note and names the version in use.
- A document never approved (a first draft) has no approved version: it opens in the form as today.
- Archived and Trash documents: read-only page, no "Edit a new draft".
- Old links that open the edit view still work: an approved document sends them to the read-only page.

## Part B: AI helpers (the review's 20 buttons)

Seven of the review's 20 already exist and only need small changes. Thirteen are new.

### Already built, small changes only
| Where | Button | Change |
| --- | --- | --- |
| Inbox | "✦ Draft a reply" | Show "Use draft", "Edit", "Dismiss"; Send stays separate (already true) |
| Inbox | "✦ Summarize" | Link each point to its message, and list open questions |
| Profile | "✦ Write with DELA" | Preview first, and say whether Save also updates the directory listing |
| Projects | "Draft the gig with DELA" | Show included work, exclusions, outputs and deadline for editing before posting |
| Files | "Ask DELA" | Rename "✦ Summarize this process" for process documents |
| Document | "✦ Automate or delegate" | Show the affected steps before any gig draft is made |
| Library | new document from questions | No change (it already asks first and saves only after the attorney confirms) |

### New (13)
| # | Where | Button | Kind | What it does |
| --- | --- | --- | --- | --- |
| 1 | Projects, gig draft, before posting | "✦ Check the scope" | Check | Flags vague outputs, missing inputs, no deadline, a budget that does not fit. Nothing posts. |
| 2 | Proposals | "✦ Compare these proposals" | Check | One table: price, included work, exclusions, timing, evidence, each linked to its proposal, missing details labeled. No ranking; the attorney chooses. |
| 3 | Agreement, before signing | "✦ Check this for me" | Check | Compares the agreement's scope and milestones with the chosen proposal and flags mismatches. Says it is not legal advice. |
| 4 | Agreement, milestone | "✦ Improve acceptance criteria" | Improve | Suggests clearer "done" criteria as a change both sides approve through the existing change process. |
| 5 | Monthly, "Included each month" | "✦ Check monthly scope" | Check | Flags unclear volume, turnaround, exclusions. Prices and renewals never change by themselves. |
| 6 | Document, Steps | "✦ Check these steps" | Check | Flags missing inputs, unclear actions, handoffs and deadlines; each suggestion accepted or dismissed. |
| 7 | Document, a section | "✦ Improve this section" | Improve | Suggests clearer purpose and scope text, into the draft only. |
| 8 | Document, Quality check | "✦ Explain these findings" | Check | Explains blockers versus suggestions in plain words. Never approves. |
| 9 | Firm profile for documents | "✦ Help me describe my firm" | Write | Three short questions; fills the unsaved form; the attorney saves. |
| 10 | Ask DELA, after typing | "✦ Improve my request" | Improve | Rewrites the unsent request and flags missing details. |
| 11 | Talent, above results | "✦ Help me find a fit" | Check | Turns the task into editable search filters. Never picks a person. |
| 12 | Meetings, agenda box | "✦ Draft an agenda" | Write | Three points from the gig; editable before booking. |
| 13 | Reviews, writing a review | "✦ Help me write a review" | Improve | Turns the attorney's own stars and notes into a factual draft; never adds praise or complaints they did not give. |

### Rules for every helper
- Output is labeled "AI suggestion", with "Use suggestion", "Edit" and "Dismiss". Nothing is saved, sent, signed, paid, posted or approved without the member's click.
- It shows the DELA actions it uses before it runs, and keeps the member's text if it fails.
- It uses only what the member may already see. It never reads another firm's documents or a freelancer's private data.
- It never names a tool outside the tech catalog, never gives legal advice, and never invents qualifications or experience.
- The sensitive-information reminder sits by every AI writing box.
- On the member's own key it uses no DELA actions (as today).

### How it could go wrong
- An AI check is read as legal approval: every check says "These checks do not confirm legal correctness", and buttons never say "approve".
- "Compare these proposals" favors one freelancer unfairly: no ranking, no score, the same fields for every proposal, missing details labeled for all.
- Review drafts that do not match the attorney's real experience: the draft uses only the stars and notes typed; the review is posted only by the attorney's own click; the review rules are unchanged.
- Cost: a busy attorney runs many checks. Each helper has its own DELA actions setting, and the usage limits apply.
- Client information pasted into a box: the existing scrubbing and sensitive-data checks run first.

## Part C: the first ten minutes (review Part 8)

The review suggests a new attorney's first ten minutes go: pick one task to hand off (three examples), see a starter procedure, approve it, see the public gig draft with the fee, then see who fits and what is left before posting.

DELA already has most of this: the "Get set up" screen, starter documents, Automate or delegate, and posting a gig from an approved document. This part folds the review's flow into the onboarding widget (step 4d part A), which you approved for after the MVP launch. Nothing new is built for it in Phase 4 unless you move it earlier (question 6).

## Part D: dark mode

- A choice in the account menu: "Appearance: Match my device / Light / Dark", saved per person. "Match my device" is today's behavior.
- Fix the colors still fixed to the light theme, and check every page against the contrast rule (4.5 to 1 for text).
- The Brilliant Directories page around DELA stays as BD shows it. If BD's page is light and DELA is dark, the DELA area is dark inside a light page.

## Who
Attorneys and firm staff (all four parts), freelancers and agencies (parts B where it touches their side, and D), the Lawfecta Team (settings for DELA actions per helper; dark mode in the admin area).

## When
Each part ships on the test site behind its own switch, then Stacey's ChatGPT test, then Live.

## Why
- Part A: attorneys can see which version is in use before they delegate it, and freelancers get a stable process. The review rated it High impact.
- Part B: the checks before a commitment (scope, proposals, agreement, acceptance criteria, monthly scope) catch problems before money moves. That means fewer disputes and better gigs, so more repeat hiring. They also give paid plans more to use their DELA actions on.
- Part C: a new attorney gets to a first useful gig sooner.
- Part D: it is comfortable to use at night, and members can choose.

## Settings and switches it uses
- Switches (off until tested): approved_view (part A), ai_helpers (part B, with a list of helpers turned on), appearance_choice (part D).
- New settings, proposed (status O until you confirm):
  - DELA actions per helper: ai.credits.check_scope, ai.credits.compare_proposals, ai.credits.agreement_check, ai.credits.acceptance_criteria, ai.credits.monthly_scope, ai.credits.check_steps, ai.credits.improve_section, ai.credits.explain_findings, ai.credits.describe_firm, ai.credits.improve_request, ai.credits.find_fit, ai.credits.agenda, ai.credits.review_draft
  - suggested values: 1 for short helpers, 2 for "Compare these proposals" and "Check this for me"
  - ai.compare_max_proposals: 10, the most proposals compared at once
- Existing: the usage limits from step 9b, ai.credits.chat, the sensitive-data rules (step 6d), onboarding.reminder_days (part C).

## Questions to make it better
My suggestion is in brackets after each one.

1. **Build order.** Which parts first? [A, then the five checks before a commitment in B (1 to 5), then the rest of B, then D. C stays with the onboarding widget after the MVP launch.]
2. **Approved version page.** Should freelancers on a gig see the same read-only page (approved version only), instead of today's gig copy? [No. Keep the gig copy they see now; it hides the firm's internal details. The read-only page is for the firm.]
3. **Exports.** Should exports always use the approved version, with a separate "Export this draft" marked DRAFT on every page? [Yes.]
4. **Helpers on the freelancer side.** Add matching helpers for freelancers, for example "✦ Check my proposal" before sending, and "✦ Check this for me" on the agreement they sign? [Yes for both. Same rules and the same DELA actions on their plan.]
5. **"Help me write a review."** Include it? Reviews carry legal and trust risk, and the rules on fake reviews apply. [Yes, but only from the attorney's own stars and notes, labeled "AI suggestion" while editing, and never offered for a 1- or 2-star review without notes.]
6. **First ten minutes.** Keep it with the onboarding widget after the MVP launch, or build it before the beta? [Keep it after the MVP launch, as you decided for step 4d. The "Get set up" screen covers the beta.]
7. **DELA actions per helper.** Use 1 for short helpers and 2 for "Compare these proposals" and "Check this for me"? Free on every plan for the first try of each helper? [1 and 2. No free first try; the Free plan's 50 a month already allow trying them.]
8. **Dark mode default.** Keep following the device (today), or start everyone on Light because the BD page around DELA is light? [Start on Light, with the "Appearance" choice in the account menu. A dark DELA inside a light BD page looks out of place.]
9. **Dark mode in the admin area.** Same choice there? [Yes, the same menu.]
10. **Any helper to drop?** [None. If you want fewer, drop "✦ Draft an agenda" and "✦ Help me find a fit" first; they save the least time.]

## Stacey's answers (2026-11-06: "all as suggested")
1. **Build order.** A, then the five checks before a commitment (B 1 to 5, with the freelancer helpers from answer 4), then the rest of B, then D. C stays with the onboarding widget after the MVP launch.
2. **Freelancers and the approved version.** They keep today's gig copy. The read-only page is for the firm only.
3. **Exports.** Always the approved version. A separate "Export this draft" is marked DRAFT on every page.
4. **Freelancer helpers.** Yes: "✦ Check my proposal" before sending and "✦ Check this for me" on the agreement they sign. Same rules; DELA actions on their own plan.
5. **"✦ Help me write a review."** Yes, only from the attorney's own stars and notes, labeled "AI suggestion" while editing, and not offered for a 1- or 2-star review without notes.
6. **First ten minutes.** Stays with the onboarding widget after the MVP launch. "Get set up" covers the beta.
7. **DELA actions.** 1 per run for short helpers, 2 for "Compare these proposals" and "Check this for me". No free first try.
8. **Dark mode default.** Light for everyone, with "Appearance: Match my device / Light / Dark" in the account menu.
9. **Admin area.** The same Appearance choice.
10. **Helpers to drop.** None.

## Success looks like
Claude's tests (api and browser) for each part, then a ChatGPT test grouped by login:
- Freelancer: a gig shows the approved version's steps; AI helpers on the freelancer side (if answered yes) show "AI suggestion" with Use, Edit, Dismiss, and nothing is sent without a click; the Appearance choice changes the theme and stays after reloading.
- Attorney: an approved document opens on "Approved version" with version, date and approver and no Save button; "Edit a new draft" makes one draft while the approved version stays in use; a second click opens the same draft; exports say which version they use; each checking helper shows its DELA actions before running and its findings as suggestions; "Compare these proposals" shows the same fields for every proposal and no ranking; "Check this for me" says it is not legal advice; nothing is saved, posted or signed by a helper.
- Owner: the new settings appear under Settings with their values; the Usage tab counts the helpers' DELA actions; the admin area follows the Appearance choice.
- Check the results: the gig still uses the approved version after the draft was edited (attorney login, Projects).
