> Update 2026-11-18, after this inventory was read: step 1 of "Post a New Gig" was rebuilt (step 44). It is now ONE form card with the headings "Choose the work", "Engagement type", "Budget & requirements"; the side cards "Estimated costs" and "What happens next" are gone (the estimate sits under the budget boxes and shows only with a budget); the bottom row is "Back to Projects" and "Draft with DELA", with "Clear the form" as a link under the card; choosing "Monthly" renames the budget boxes and hides the work deadline; the step bar reads "Set up your gig", "Review DELA draft", "Review & post". Read the step 1 section below with that in mind; see docs/briefs/step-44-new-gig-step-1.md.

# Inventory D: Projects, gigs, agency, standing arrangements, Talent invite

Source: `app/dela-app.js` lines 5066 to 7018 (read in full). New layout (`NL()`) only. The old one-long-page Projects layout (lines 5070 to 5120) is noted once under "Variations" of the Projects page and not described further.

Status words used across these pages (defined just outside the range, lines 4937 to 4942 and 8791):
- Gig status (`GIG_STATUS`): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled". Badge tone: open = ready (green), paused = held (amber), filled = R, closed/canceled = off (grey), draft = no tone.
- Proposal status (`PROP_STATUS`): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed".
- Engagement/agreement status (`AG_STATUS`): "Draft" (for both draft and sent), "Waiting for signatures", "Signed: waiting for the first payment", "Active", "Complete", "Canceled", "In dispute", "Paused by the Lawfecta Team". When the agreement waits on the member's signature the badge reads "Needs your signature" instead.
- Standing arrangement status (`STANDING_WORDS`): "Waiting for the freelancer", "Active", "Needs review", "Ending after open jobs", "Ended", "Declined".
- Bench status (`BENCH_STATUS`): "Invited", "On the bench", "Declined", "Left", "Removed", "Expired".

---

## Projects (workspace shell: header, four tiles, tabs) (attorney; also an agency owner who can hire)
- How to reach it: sidebar menu item "Projects", address `?tab=projects`. `projectsView()` line 5066, which calls `projectsWorkspace(el)` line 5360 in the new layout. Routed at line 12234 only when `canHire()` is true and switch `flex_gigs` is on.
- Purpose and primary focus: the hiring hub. The one main thing: see what waits on you and jump to it; second, start a new gig.
- Shown when: `canHire()` and `me.switches.flex_gigs`. If `gigs.id` is set the single gig page shows instead. If the new gig wizard is open (`gigs.wiz`) the "Post a New Gig" page shows instead. Arriving from a document, from a freelancer's profile ("for a specific freelancer") or from "Post a gig for part of this job" opens the wizard automatically once.
- Layout, top to bottom:
  1. Header row: `h1` "Projects" with a help icon beside it; sub-line "Manage your gigs, awarded work, milestones and standing arrangements."; on the right the "+ New Gig" menu button.
  2. Notices (conditional, see States).
  3. Four summary tiles in one row.
  4. Tab strip: "Overview", "Gigs", "Engagements", "Standing Arrangements".
  5. The tab panel (one of the four sub-views below).
- Content and data shown: the four tiles, each a big number plus a label plus a chevron icon:
  - "Needs action" (alert icon): count of items waiting (payments, deliverable reviews, signatures, proposals to review, questions to answer). Gets a highlighted "hot" style when the count is above zero. Shows "?" when engagements failed to load.
  - "Open and draft gigs" (work icon): gigs with status open, draft or paused.
  - "Active engagements" (projects icon): engagements not completed or canceled. Shows "?" when engagements failed to load.
  - "Standing arrangements" (swap icon): arrangements not ended and not declined.
- Interactive elements:
  - Help icon beside "Projects": tip text "Manage posted gigs, awarded work, milestones and standing arrangements." (aria label "About Projects").
  - "+ New Gig ▾" (blue button, a `details` dropdown). Menu items:
    - "From an approved document": opens the Post a New Gig page (keeps anything typed on a previous visit).
    - "Plan a task with Ask DELA": only when switch `ai_generation` is on and side is attorney; goes to the Ask DELA tab (`delegate`).
    - "Create a document first": only when switch `playbook_library` is on; goes to the Library tab.
    - Escape closes the menu and returns focus to the button.
  - Tile "Needs action": opens the Overview tab with the full attention list expanded.
  - Tile "Open and draft gigs": opens the Gigs tab with the "Open and drafts" filter.
  - Tile "Active engagements": opens the Engagements tab.
  - Tile "Standing arrangements": opens the Standing Arrangements tab.
  - Tabs "Overview" / "Gigs" / "Engagements" / "Standing Arrangements": switch the panel without reloading. Choosing a tab resets the gig filter to "Open and drafts" and clears the engagement status filter.
  - Link inside the "for a specific freelancer" notice: "Not for a specific freelancer" (clears the pending invitation).
- States:
  - Loading: `h1` "Projects" and "Loading...".
  - API error for gigs: a notice with the server's reason text (`gigErr`).
  - Cannot post yet (agency): "Your agency cannot post yet. You can still draft gigs. Open the Agency page to see what is missing."
  - Cannot post yet (attorney): "Posting work and hiring need a verified license. You can still draft gigs. Open Profile and verification from your account menu."
  - Creating for one freelancer: "You are creating a gig for {name}. Post it, and the invitation to {name} opens next. Not for a specific freelancer."
  - Whole-page failure: `h1` "Projects" plus a red notice with the error text.
- Help: tile aria labels read the count, the label and the help sentence. Help sentences (`PJ_HELP`): needs = "Items waiting for your review, approval, signature or payment."; gigs = "Work you created for freelancers. Drafts are not posted; open gigs can receive proposals."; engagements = "Work awarded to a freelancer, with its milestones, deliverables and approvals."; standing = "Ongoing work agreements with freelancers you have completed a gig with, inside limits you both signed."
- Variations: with switch `engagements` off, engagement cards on Overview are hidden and the Engagements tab shows a "not open" line. Old layout (not NL): one long page with cards "Needs your action", "Your gigs" (pills plus a clickable row list, "Show N more" after 6), an engagements list and the standing arrangements card.
- Mobile/accessibility notes: tabs are a real `tablist` with arrow keys, Home and End; focus returns to the chosen tab. Tables use `pjTable`: a hidden caption, row headers, and `data-label` on each cell so they stack into labeled lines on narrow screens.
- UX observations (mine): the tiles and the tab strip overlap in purpose (three of four tiles are just tab shortcuts). "Needs action" (tile) versus "Needs your attention" (card heading) versus "Needs your action" (old layout) are three wordings for one thing. "Standing Arrangements" is capitalised in the tab but "Standing arrangements" in the tile and card.

## Projects: Overview tab (attorney / agency owner)
- How to reach it: default tab of Projects; tab "Overview"; tile "Needs action". Inside `projectsWorkspace`, `paintPanel` line 5434, branch at line 5440.
- Purpose and primary focus: act on what waits on you. Everything else is a summary with links into the other tabs.
- Shown when: Projects is open and `gigs.ptab` is "overview".
- Layout, top to bottom:
  1. Full width: card "Your gigs (N)" with four count buttons and "View all →".
  2. Two columns: left card "Needs your attention (N)"; right card "Quick actions".
  3. Full width: card "Upcoming milestones" (only when switch `engagements` is on and engagements loaded).
  4. Full width: card "Active engagements (N)" with a table of up to 3 rows (only when switch `engagements` is on).
- Content and data shown:
  - "Your gigs (N)": four stat buttons, each a number and a label: "Drafts", "Open" (open plus paused), "Filled", "Closed" (closed plus canceled).
  - "Needs your attention (N)": a list, most urgent first. Each row: bold title, sub-line, optional amber badge with a date, one action button. Row types in rank order:
    - "Milestone payment due" / sub: gig title / button "Pay milestone" (blue).
    - "Deliverable ready for review" / sub: gig title / button "Review deliverable" (blue).
    - "Agreement needs your signature" / sub: gig title · total price / badge "Sign by {date}" / button "Sign agreement".
    - "Review 1 proposal" or "Review N proposals" / sub: gig title / badge "Closes {date}" / button "Review proposals".
    - "Answer 1 question" or "Answer N questions" / sub: gig title / button "Answer questions".
  - "Quick actions": up to four large buttons, each with a label and a small count line: "Review proposals" ("N gig with proposals" / "N gigs with proposals" / "None waiting"), "Approve deliverables", "Pay milestones", "Sign agreements" (each "N waiting" / "None waiting"). The last three only with switch `engagements`.
  - "Upcoming milestones": up to 4 buttons, nearest date first, one per active engagement with a dated next milestone: milestone title (or "Milestone {n}"), sub-line "{gig title} · {freelancer}", optional red badge "Overdue", and due words (from `dueWords`).
  - "Active engagements (N)": table columns "Engagement", "Freelancer", "Milestones accepted" (help tip), "Next milestone" (help tip), "Status", "Action". See the Engagements tab for cell content.
- Interactive elements:
  - "View all →" on "Your gigs": opens the Gigs tab.
  - Stat buttons "Drafts" and "Open": open the Gigs tab on filter "Open and drafts". "Filled": Gigs tab on "Filled". "Closed": Gigs tab on "Closed".
  - Attention row buttons ("Pay milestone", "Review deliverable", "Sign agreement"): open that gig's "Agreement and work" view. "Review proposals": opens the gig's Proposals view. "Answer questions": opens the gig's Questions view.
  - "+ N more item" / "+ N more items": shows the whole attention list (only 3 show at first).
  - Quick action buttons: with exactly one item waiting, go straight to it; with several, open the matching tab (Gigs on "Open and drafts", or Engagements; "Sign agreements" opens Engagements filtered to "Needs your signature"); with none, open the tab anyway.
  - Upcoming milestone buttons: open that engagement's "Agreement and work" view.
  - "View all →" on "Upcoming milestones" and on "Active engagements" (the latter only when more than 3): opens the Engagements tab.
  - Engagement table row button: see Engagements tab.
- States:
  - Attention empty: "Nothing waits on you right now."
  - No gigs: "No gigs yet. Choose "+ New Gig" at the top of the page to post your first one."
  - No active engagements: "No active engagements. An engagement starts when you choose a proposal and both sign the agreement."
  - No dated milestones: "No milestone with a date in your active engagements."
  - Engagements failed to load: "Your engagements could not load just now. Try again" (the words "Try again" are a link-style button that redraws). Shown in both the attention card and the engagements card; counts are omitted from those headings.
- Help: help icons beside each card heading. "Needs your attention": "Items waiting for your review, approval, signature or payment." "Your gigs": gigs sentence above. "Quick actions": "Shortcuts to the project tasks that wait on you. Each one says how many are waiting." "Upcoming milestones": "The next milestone of each active engagement, the nearest date first." "Active engagements": engagements sentence above. Column tips: "Milestones accepted" = "The number of milestones you accepted, out of the milestones in the signed agreement."; "Next milestone" = "The first milestone that is not accepted yet, with its date when one is set."
- Variations: see switch `engagements`.
- Mobile/accessibility: milestone buttons sit side by side on wide screens and stack on phones (code comment). Attention action buttons carry aria labels like "Pay milestone: {gig title}".
- UX observations (mine): the same tasks appear three times on this one tab (tile, attention list, quick actions) and the same engagements appear twice (upcoming milestones, active engagements table). The first two attention types use blue buttons, the rest ghost buttons, so priority is carried by colour only. "Approve deliverables" (quick action) versus "Review deliverable" (row button) is inconsistent.

## Projects: Gigs tab (attorney / agency owner)
- How to reach it: tab "Gigs"; tile "Open and draft gigs"; "View all →" on Overview. Branch at line 5509.
- Purpose and primary focus: find one of your gigs and open it.
- Shown when: `gigs.ptab` is "gigs".
- Layout: one card "Your gigs (N)" with help icon; a row of filter pills on the left and a search box on the right; then the table.
- Content and data shown: table "Your gigs: {filter name}" with columns:
  - "Gig": title in bold; sub-line "Monthly" and/or "Linked to {title}" when they apply.
  - "Proposals": the count, plus " · N question" / " · N questions" when questions are open.
  - "Budget": single amount or "{min} to {max}"; "Budget not set" when empty.
  - "Closing date": closing date for open gigs, closed date for closed ones, otherwise "Not set".
  - "Status": badge with the gig status word.
  - "Action": one button (below).
- Interactive elements:
  - Filter pills (each shows a count): "Open and drafts (N)" (open, draft, paused), "Filled (N)", "Closed (N)" (closed, canceled), "All (N)". `aria-pressed` marks the active one.
  - Search box: placeholder and aria label "Find a gig by its title". Filters as you type, within the active pill.
  - Row action button, one of: "Continue draft" (draft gigs; opens the gig page, which is the wizard at step 2 or 3), "Review proposals" (blue; open gigs with at least one proposal; opens the Proposals view), "View gig" (everything else; opens the gig page).
- States: no gigs at all: "No gigs yet. Choose "+ New Gig" at the top of the page to post your first one." Filter empty: "None in this view." Search empty: "No gig in this view matches "{words}"."
- Help: heading help icon with the gigs sentence.
- Variations: none by plan.
- Mobile/accessibility: stacked table; row buttons have aria labels with the gig title.
- UX observations (mine): there is no sort control and no paging. "Paused by the Lawfecta Team" gigs are counted under "Open and drafts", which may surprise. Search only matches the title.

## Projects: Engagements tab (attorney / agency owner)
- How to reach it: tab "Engagements"; tile "Active engagements"; "View all →" links. Branch at line 5531.
- Purpose and primary focus: see every awarded job and take its next step (sign, pay, review).
- Shown when: `gigs.ptab` is "engagements". Real content needs switch `engagements`.
- Layout: one card "Engagements (N)" (N = active count) with help icon; a row with status pills (only when the active engagements have more than one distinct status) and a search box; the active table; then a collapsed section "Finished and canceled (N)" holding a second table with the same columns.
- Content and data shown: table columns "Engagement", "Freelancer", "Milestones accepted", "Next milestone", "Status", "Action":
  - "Engagement": gig title in bold, total price under it.
  - "Freelancer": small face/avatar and the other person's name.
  - "Milestones accepted": "N of M accepted" with a thin progress bar; or "Set when you both sign" when there are no milestones yet.
  - "Next milestone": milestone title (or "Milestone {n}") and under it: due words when the engagement is active; "Planned for {date}" or "Was planned for {date}" when not yet active; "No date set"; or "Not scheduled" when there is no next milestone.
  - "Status": agreement status badge (words listed at the top of this file), plus a red "Overdue" badge when an active engagement's next milestone is late.
  - "Action": one button.
- Interactive elements:
  - Status pills: "All active (N)" plus one pill per status word actually present, for example "Needs your signature (N)", "Active (N)", "Waiting for signatures (N)". Group aria label "Show active engagements by status".
  - Search box: placeholder "Find by title or freelancer", aria label "Find an engagement by its title or freelancer".
  - Row action button: "Pay milestone", "Review deliverable" or "Sign agreement" (blue) when that step waits on the member; otherwise "View engagement" (ghost). All open the gig's "Agreement and work" view.
  - Expandable "Finished and canceled (N)" (opens automatically while searching).
- States: switch off: "Agreements are not open for your account yet." Load failure: "Your engagements could not load just now. Try again". None: "No engagements yet. When you choose a proposal, the agreement and its milestones show here." Search with no hit at all: "No engagement matches "{words}"." No active hit: "No active engagement matches." or "No active engagement." A hidden live region announces "N active engagement(s) shown."
- Help: heading help icon; column tips on "Milestones accepted" and "Next milestone" (texts above).
- Variations: the Freelancer column heading stays "Freelancer" for every row.
- Mobile/accessibility: stacked table; progress bar has an aria label "N of M milestones accepted".
- UX observations (mine): the card heading counts only active engagements, while the page also lists finished ones. The status pills appear and disappear depending on data, so the toolbar shifts.

## Projects: Standing Arrangements tab (attorney / agency owner; the same card also appears on the freelancer's Work page)
- How to reach it: tab "Standing Arrangements"; tile "Standing arrangements". Branch at line 5568; card built by `standingCard(slot, fold)` line 6703. The same `standingCard` (unfolded) is used on the freelancer's Work page (line 7624, outside my range).
- Purpose and primary focus: hire a trusted freelancer again in one click inside signed limits, and manage those limits.
- Shown when: the server says standing arrangements are on (`st.on`; the code comment names switch `auto_repeat_hiring`). Setting one up needs a paid attorney plan and the firm's owner or a manager (`st.can_create`).
- Layout, top to bottom:
  1. Card "At a glance (N)" with help icon: a table. Only when at least one current arrangement exists.
  2. Card "Standing arrangements (N)": a status line, the "set one up" row, then one folded line per arrangement (name, status badge, the word "Details"), then a collapsed "Past arrangements (N)".
- Content and data shown:
  - At a glance table columns: "Freelancer", "Monthly limit", "Counted this month", "Remaining", "Jobs open" ("N of M"), "Status" (badge), "Action".
  - Each arrangement's details: "{price} per job | {spent} of {cap} this month | N of M jobs open | until {date}"; "Covers: {doc id} {title} (version N); ..."; a notice when a review is needed: "{reason} Automatic hiring is paused until you both approve."; "{amount} left this month | N open-job place(s) left"; "The cap counts the job price. Lawfecta's platform fee is added to each charge."; a list of jobs hired: "{date}: {title}, {price} | {status}" where status is "Hired", "Waiting for payment", "Declined, refunded", "Did not start" or "Starting".
- Interactive elements:
  - "Manage" (per table row): opens that arrangement's fold in the card below and scrolls to it.
  - Dropdown "Freelancers you have completed a gig with" (options: eligible freelancers' names) plus button "Set up a standing arrangement": opens the set-up dialog (next section).
  - Each arrangement line: expandable (`details`), opens by default when it waits on the member.
  - Dropdown (aria label "Document to hire for"; options: covered document titles) plus blue button "Hire again from my standing arrangement": hires and charges at once; may redirect to a Stripe payment page. Shown to attorneys with role manager or user on an active arrangement, and only when a place and enough cap are left.
  - "Review limits": shown instead of the hire button when the cap or open-job limit blocks hiring (managers); opens the limits form.
  - "Open the job" (per hired job): opens that gig's "Agreement and work" view.
  - "Decline this job" (freelancer side, while allowed): browser confirm "Decline this job? The firm is refunded in full."
  - "Change limits" (attorney manager, active): opens an inline form with number boxes "Price per job ($)", "Monthly spend cap ($)", "Most jobs open at once", text box "Your full name", checkbox "I sign the new limits for the firm.", and button "Sign and send the new limits". Intro: "Once you send them, new limits pause one-click hiring until the freelancer approves them. Limits that are not allowed are refused and nothing changes."
  - "End arrangement": browser confirm "End this standing arrangement? No new jobs can be hired from it. " followed by one of: "No job is open under it now." / "The open job finishes as agreed: {title}." / "The N open jobs finish as agreed: {titles}." / "The 1 open job finishes as agreed." / "The N open jobs finish as agreed."
  - Needs review (both sides): text box "Your full name", checkbox "I approve the arrangement again with these documents and limits.", buttons "Review and approve" and (when a change is pending) "Do not approve". After approving: "You approved. Waiting for the other person."
  - Freelancer side, status "Waiting for the freelancer": text box "Your full name", checkbox "I accept this standing arrangement. Jobs inside its limits start without a new proposal; I can decline a job within {24} hours, and end the arrangement any time.", buttons "Accept" and "Decline".
  - Expandable "Past arrangements (N)".
- States:
  - Off (attorney): card "Standing arrangements" with a "Coming soon" tag and "Hire a trusted freelancer again in one click, inside limits you both sign once." Off (freelancer): nothing.
  - None: "None active." No eligible freelancer: "You can offer a standing arrangement to a freelancer after you complete a gig with them."
  - Hiring blocked: "The most jobs open at once (N) are already open." or "This month's cap has {amount} left, less than one job ({price})."; non-managers see "Ask the firm's owner or a manager to review the limits."
  - Results stay on the card for 10 minutes and also show as a toast: "Hired and paid. {amount} of this month's cap is left."; "Hired. The payment is not finished yet: payments are not set up on this site yet." / "...open the job to pay."; "This job would pass the monthly cap ({spent} of {cap} used). Nothing was charged. A gig draft was made instead; open it from Your gigs to post it the normal way." (also variants "The most jobs open at once (N) are already open." and "That document is not covered."); "Sent. Hiring is paused until the freelancer approves."; "Ending once the open jobs finish." / "Ended."; "Approved by both. One-click hiring works again." / "Approved. Waiting for the other person."; "Not approved. The signed limits stay."; "Accepted. The firm can now hire you again in one click."; "Declined."; "Declined. The firm is refunded in full."
  - Error texts (`STANDING_ERR`), all quoted in code: needs a completed gig, not open for your account, paid plans only, owners and managers only, "Set a monthly spend cap. DELA does not save an arrangement without one.", "The price per job cannot be more than the monthly cap.", "The price per job is below the smallest engagement allowed.", "Pick an end date within 12 months.", "Choose at least one approved SOP or Workflow.", "Only approved SOPs and Workflows can be covered.", "This freelancer is not verified right now.", "Type your full name and tick the box.", "This arrangement is not active, so it cannot hire right now.", "A hold on one of the accounts stops hiring right now.", "A job from this arrangement is in a dispute, so hiring is paused.", "The freelancer is not available right now. Try someone from your bench, or post a gig.", "The time to decline this job is over.", "Work on this job has started, so it cannot be declined here.", "Choose 1 to 20 jobs open at once."
- Help: column tips. "Monthly limit": "The most the prices of jobs started in one month may add up to. Lawfecta's platform fee is added to each charge and is not part of the limit." "Counted this month": "The prices of the jobs started from this arrangement this month." "Remaining": "The monthly limit minus the job prices counted this month. It is a limit, not money held for you." "Jobs open": "Jobs open now under this arrangement, out of the most allowed at once."
- Variations: attorney sees the freelancer's name, the freelancer sees the firm's name. Roles on an arrangement: "manager" (can hire, change, end, review), "user" (can hire only). On the freelancer's Work page arrangements are shown as open boxes, not folds.
- Mobile/accessibility: stacked table; "Manage" has aria label "Manage the arrangement with {name}".
- UX observations (mine): three words for one number: "Monthly limit" (table), "monthly cap"/"cap" (details and messages), "Monthly spend cap ($)" (forms). "Counted this month" versus "{spent} of {cap} this month". The details card repeats what the table says. Signing means typing a name and ticking a box, repeated in four slightly different forms. Two actions use browser confirm pop-ups. After an action the page redraws after a 0.9 to 1.2 second delay.

## Standing arrangement set-up dialog: "Standing arrangement with {name}" (attorney)
- How to reach it: Projects > Standing Arrangements > "Set up a standing arrangement"; also "Propose a standing arrangement" on a finished engagement (line 10472, outside my range). `standingSetup(person, personName)` line 6654. A modal dialog.
- Purpose and primary focus: set the limits and sign once.
- Shown when: standing arrangements are on and the member may create one.
- Layout, top to bottom: intro paragraph; heading "Documents covered (approved SOPs and Workflows)" with one checkbox per approved document; two rows of fields; a firm-sharing checkbox; signature name; consent checkbox; a status line; footer buttons.
- Content: intro "Hire {name} again for the same work without a new proposal each time. You both sign once. Inside these limits you hire in one click and DELA charges your saved card at once (with no saved card, the Stripe payment page opens). Anything outside them becomes a normal gig draft."
- Interactive elements:
  - Checkboxes, one per document: "{doc id} {title} (version N)".
  - Number box "Price per job ($)" (placeholder: the minimum price from settings).
  - Number box "Monthly spend cap ($)", hint "Required. Hires stop at the cap each month."
  - Number box "Most jobs open at once" (default from settings, 3 if none; min 1, max from the plan limit).
  - Date box "End date" (default today plus 6 months, from settings), hint "Up to {12} months."
  - Checkbox "Let other attorneys in the firm use this arrangement".
  - Text box "Your full name", hint "Your typed name is your signature."
  - Checkbox "I sign this standing arrangement for the firm, and I agree that Lawfecta may charge the saved payment method for each job hired from it, up to the monthly cap."
  - Buttons: "Sign and send" (blue; disabled while sending), "Cancel".
- States: off: "Standing arrangements are coming soon." with "Close". Not allowed: "Standing arrangements are part of the paid attorney plans (Plus, Pro and Business). Only the firm's owner or a manager can set up or change a standing arrangement." with "Close". No documents: "No approved SOPs or Workflows yet." Errors show in the status line inside the dialog. Success toast: "Sent to {name} to accept."
- Help: each field has the standard help-tip slot (no tip text given here).
- Variations: none.
- Mobile/accessibility: inputs carry aria labels; name box has `autocomplete="name"`.
- UX observations (mine): a long legal consent sentence sits in a small checkbox label. There is no summary of the total exposure (cap times months) before signing.

## Post a New Gig, step 1 of 3: "Set up the gig" (attorney / agency owner)
- How to reach it: Projects > "+ New Gig" > "From an approved document"; or arriving from a Library document, from a freelancer ("create a gig for {name}"), or from "Post a gig for part of this job". `newGigPage(el)` line 5159. It replaces the Projects page (same `?tab=projects` address).
- Purpose and primary focus: choose the approved document, the type and the budget, then let DELA draft the description. Nothing is posted.
- Shown when: `gigs.wiz` is set, new layout.
- Layout, top to bottom:
  1. "← Back to Projects" button.
  2. `h1` "Post a New Gig"; sub-line "Turn an approved SOP or Workflow into a gig. DELA prepares the description, and you review everything before posting."
  3. Stepper with three steps: "Set up the gig", "Review DELA's draft", "Review and post" (current step highlighted, done steps show a check mark).
  4. Notices (cannot post yet; creating for one freelancer; linked job).
  5. Two columns. Main column: card "1. Choose your work", card "2. Choose the engagement type", card "3. Add the details", then the actions card. Side column: card "Estimated costs", card "What happens next".
- Content and data shown:
  - "Estimated costs" (updates live): lines "Your budget" (or "Your budget, each month"), "Platform fee ({x}%, at least {amount})", "Estimated total" (or "Estimated total each month"), then "The fee is worked out on the price you agree with the freelancer. The exact amount is shown in the agreement before you sign." With no budget typed: "Enter a budget to see the estimated total." With no fee rule: "Your platform fee is added and shown before you sign."
  - "What happens next": three numbered items, the current one marked "(you are here)": "Set up the gig" / "Choose the document, the type, the budget and any details."; "Review DELA's draft" / "DELA writes a description for freelancers from your document. You can edit all of it."; "Review and post" / "Check what freelancers will see, the budget and the costs, then post. Nothing is posted before that."
  - Footer note in the actions card: "DELA writes a draft description from your document. Nothing is posted yet: you review and edit the draft, then post it yourself." plus (switch `ai_generation`) " Drafting uses DELA actions from your plan." plus " Open gigs on your plan: no cap." or "... N of M in use."
- Interactive elements:
  - "← Back to Projects": leaves and keeps what was typed for the next visit.
  - Card 1: dropdown "Approved SOP or Workflow" (first option "Choose an approved SOP or Workflow", or "No approved SOPs or Workflows yet"; then one option per approved document as "{doc id} {title}"). Link button "Preview document" (opens the Library document in a new tab; hidden until a document is chosen). Help icon beside the heading. Button "Open the Library to create or approve one" (only when there are no documents and switch `playbook_library` is on).
  - Card 2: radio cards "One-off" ("A defined project with specific deliverables, a deadline and a fixed price.") and "Monthly" ("The same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price."). "Monthly" only with switch `recurring_engagements`.
  - Card 3: number boxes with a "$" prefix "Budget from (USD)" and "Budget to (USD)"; date box "Work deadline (optional)"; text area "Additional details for DELA (optional)" (4 rows, 1,500 characters, live counter "N of 1,500 characters").
  - Actions: "Cancel" (throws away what was typed and returns to Projects), "Draft with DELA" (blue; validates, then asks DELA to write the draft and opens step 2).
  - Notice links: "Not for a specific freelancer"; "Do not link" (button in the linked-job notice).
  - Dialog "Check the images" (only when the chosen document has images): "The freelancer will see N image(s) in this document. Check that none show client information." Buttons "Review images" (opens the document in the Library) and "Continue".
- States:
  - Hints: under the dropdown "Only approved documents are listed. "Preview document" opens it in a new tab." or "A gig starts from an approved SOP or Workflow, and you have none yet." Under the type: "Monthly gigs are not open for your account yet." (switch off). Under the budget: "At least {minimum}. "To" must be the same as "From" or higher. The budget is for the work; your platform fee comes on top." and "When the work should be finished. You can set or change it before posting. The closing date for proposals is set when you post, and shown then." Under details: "For example: software the freelancer must know, experience you need, or how you want the work delivered."
  - Protected note box: bold "Protect client information" then "Do not include client names, case details, account numbers or passwords. DELA checks what you type, but it cannot catch everything: read DELA's draft before it is shared with freelancers."
  - Inline errors (red, `role=alert`, focus moves to the first bad box): "Choose an approved SOP or Workflow."; "Enter the lowest budget, in dollars."; "The budget must be at least {minimum}."; ""Budget to" must be the same as "Budget from" or higher."
  - Working: both buttons disabled and status "DELA is writing the description. This can take a moment. Nothing is posted."
  - Failure: "The additional details may include client information. Use placeholders instead. What you entered is still here." or the server reason, or "DELA could not write the draft just now. Check your connection and try again. What you entered is still here."
  - Linked notice: "Linked to: {title}. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor. Share with them only what their part needs."
  - Page failure: `h1` "Post a New Gig", red error notice, "← Back to Projects".
- Help: card 1 help icon (label "About choosing a document"): "DELA uses the approved version of the document to write the gig. Freelancers you invite or hire see their part of the document, with their name as a watermark."
- Variations: Monthly option by switch; agency wording in the cannot-post notice.
- Mobile/accessibility: stepper is an ordered list with screen-reader text "Step N of 3, current/done"; errors linked to inputs with `aria-describedby` and `aria-invalid`; cost card is a live region.
- UX observations (mine): "Back to Projects" keeps the entries and "Cancel" discards them, with no confirm on Cancel; the difference is not visible on screen. The page title says "Post a New Gig" while the primary button says "Draft with DELA". Step 1 has cards numbered 1, 2, 3 inside a stepper that is also numbered 1, 2, 3.

## Post a New Gig, step 2 of 3: "Review DELA's draft" (attorney / agency owner)
- How to reach it: automatically after "Draft with DELA"; or "Continue draft" on a draft gig in the Gigs table. It is the draft gig's own page: `gigPage` line 5672 then `gigDetails` line 5774 with `wizard` true (new layout and status "Draft").
- Purpose and primary focus: read and edit the description freelancers will see.
- Shown when: gig status is "Draft", view "Details", `gigs.wstep` not 3.
- Layout, top to bottom: the gig page header (see "Gig page" below, including "← All gigs" and the view pills); the stepper at step 2; a green notice on first arrival; card "What freelancers will read"; the "✦ Check the scope" helper; a button row; then (below both steps) the collapsed document card and the references block or editor.
- Content: intro in the card: "Matched freelancers read this before they spend a proposal. Invited and hired freelancers also see their part of the document (an SOP, or a workflow's steps for the freelancer role), with their name as a watermark. No client information."
- Interactive elements (all text boxes, prefilled by DELA):
  - "Title" (single line).
  - "The task" (3 rows), hint "Two or three sentences: what the freelancer will do."
  - "What done looks like" (2 rows).
  - "Steps, one per line" (6 rows).
  - "Tools", hint "Separated by commas. DELA matches freelancers who use them."
  - "Skills", hint "Separated by commas."
  - "Practice area" and "State" side by side (State: 2 letters, placeholder "TX").
  - "Usual time".
  - "✦ Check the scope" (only when the helpers feature is on): shows "Uses N DELA action(s) on Lawfecta's AI (none on your own key)." See the "AI suggestion panel" section.
  - "Save draft" (ghost), "Continue to review" (blue; goes to step 3 and scrolls to the top).
  - Expandable "The document (invited and hired freelancers see their part of it)": shows "The freelancer sees N of M steps, with N "Attorney decides" step(s) where the work waits for you." and a plain read-only copy of the document.
  - References editor (switch `document_standard`, defined outside my range) or a read-only references block.
- States: first-arrival notice: "DELA wrote this draft from your document. Read it and change anything that is not right. Nothing is posted yet." or "This draft was filled in from your document. Read it and change anything that is not right. Nothing is posted yet." Save toast: "Saved". Client-information check on save: browser confirm "This may include client information ({kinds}). Use placeholders instead. Click OK only if it is not client information."
- Help: each field has the standard help-tip slot.
- Variations: outside the wizard (open gig) the same card is titled "Public version".
- Mobile/accessibility: every input has an aria label; step heading takes focus when the step changes.
- UX observations (mine): the wizard sits inside the gig page, so the gig view pills (Details, Matches, Questions, Proposals, Files) still show above the stepper while the gig is only a draft. Tools and skills are comma-separated free text, not chips. Step 2 has no "Back" to step 1 (step 1 cannot be revisited once the draft exists).

## Post a New Gig, step 3 of 3: "Review and post" (attorney / agency owner)
- How to reach it: "Continue to review" on step 2. `gigDetails`, `showStep(3)`.
- Purpose and primary focus: confirm budget and costs, read the preview, tick the confirmation and post.
- Shown when: draft gig, `gigs.wstep` is 3.
- Layout, top to bottom: stepper at step 3; card "Budget, deadline and milestones"; card "Estimated costs"; card "What freelancers will see"; confirmation card; action row.
- Content: "What freelancers will see" lists (only filled rows): "Title", "The task", "What done looks like", "Steps", "Tools", "Skills", "Practice area", "State", "Usual time", "Type" ("Monthly" / "One-off"), "Budget" (amount, range or "Not set"), "Work deadline" (date or "Not set"). Sub-line: "Read it once more as a freelancer would. No client information." Confirmation hint: "Posting opens the gig to matching freelancers. The closing date for proposals is shown when you post. You can still edit or close the gig after that."
- Interactive elements:
  - Number boxes "Budget from ($)" and "Budget to ($)"; date box "Deadline"; text area "Milestones (private)" (3 rows), hint "For example: First version, then Final version. Freelancers see milestones only after you hire them; DELA sets the final milestones with the agreement."
  - Link button "← Edit the description" (back to step 2).
  - Checkbox "I have read what freelancers will see. It has no client information, and I want to post this gig."
  - "← Back" (to step 2), "Save draft", "Post the gig" (blue), "Delete draft" (red outline; browser confirm "Delete this draft gig?").
- States: error under the checkbox: "Tick the box to confirm you have read what freelancers will see." After posting: toast "Your gig is open until {date and time}" and the page moves to the Matches view; if the gig was made for one freelancer, the Talent invite page opens with this gig chosen. After delete: toast "Draft deleted" and return to Projects.
- Help: standard help-tip slots.
- Variations: monthly gigs label the cost lines "each month".
- Mobile/accessibility: cost card is a live region; error has `role=alert`.
- UX observations (mine): step 1 labels the budget "Budget from (USD)" and the deadline "Work deadline (optional)"; step 3 labels the same things "Budget from ($)" and "Deadline". Budget can be edited again here although it was set in step 1. "Delete draft" sits in the same row as "Post the gig".

## Gig page (header and view pills) (attorney / agency owner)
- How to reach it: any gig row or button on Projects; `gigs.id` set. `gigPage(el)` line 5672.
- Purpose and primary focus: one gig, with pills to move between its views.
- Shown when: `gigs.id` is set on the Projects tab.
- Layout, top to bottom: "← All gigs" button; title row (`h1` gig title, status badge on the right); summary line; notices; view pills; the chosen view.
- Content: summary line "{budget} | {Closes date-time, or status and date} | N proposal(s), N invited".
- Interactive elements:
  - "← All gigs": back to Projects.
  - View pills (a `tablist` labelled "Gig views"): "Details", "Matches", "Questions" or "Questions (N)" (open questions), "Proposals (N)", "Files (N)", and "Agreement and work" (only with switch `engagements`, and only when the gig is "Filled" or that view is already open).
- States: not found: "This gig is not available to your account. It belongs to another member, or it was removed." Paused: red notice "The Lawfecta Team paused this gig while they check it. Freelancers cannot send proposals until it opens again." Monthly: "Monthly gig: the budget is the monthly price. The agreement lists the work included each month." Linked: "Linked to {title}. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor."
- Help: none.
- Variations: "Agreement and work" opens `engagementPanel` (outside my range).
- Mobile/accessibility: pills use `role=tab` and `aria-selected` but no arrow-key handling (unlike the Projects tabs).
- UX observations (mine): the back button says "← All gigs" though it returns to whichever Projects tab was open, including Engagements. Pills here look like the filter pills elsewhere but act as tabs.

## Gig page: Details view, posted gig (attorney / agency owner)
- How to reach it: gig page > pill "Details". `gigDetails` line 5774, non-wizard path.
- Purpose and primary focus: edit an open gig, extend it or close it; read-only for filled and closed gigs.
- Shown when: gig status is not "Draft" (or old layout).
- Layout: card "Public version" (same eight fields as wizard step 2); card "Budget, deadline and milestones" (same four fields as step 3); action row; expandable document card; references.
- Interactive elements: the same fields (all disabled unless the gig is "Draft" or "Open"); "Save"; "Extend {N} days" or "Extend" (open gigs with extensions left; browser confirm "Keep this gig open for N more days? You can extend it once." / "...You can extend it N more times."); "Close the gig" (red; browser confirm "Close this gig now? Applicants are told, and you can still choose a proposal for N days." / "...for a short time.").
- States: intro adds for open gigs: " Changing the budget or the work tells applicants; a big change asks them to confirm their proposals." Toasts: "Saved"; "Saved. This was a big change, so applicants are asked to confirm their proposals."; "Open until {date and time}"; "Closed".
- Variations: filled, closed, canceled: all fields disabled, no buttons.
- UX observations (mine): disabled fields are used as the read-only display, which is hard to read. "Close the gig" is separated only by a left margin.

## Gig page: Matches view (attorney / agency owner)
- How to reach it: pill "Matches"; opens automatically after posting. `gigMatches` line 5893.
- Purpose and primary focus: invite fitting freelancers to send a proposal.
- Shown when: any gig; real content only after posting.
- Layout, top to bottom: (agency client only) card "Your bench"; (switch `bench`) card "From your bench"; card "Freelancers who fit" with one inner card per match.
- Content: intro "Only match-ready freelancers who confirmed their availability in the last N days (or "recently"), work in this practice area and do not exclude this state. DELA shows fewer people rather than inactive ones. Inviting someone lets them see the full document and send a proposal that does not use their monthly allowance." Each match: name, fit badge (the server's words; "Good fit" is green, anything else neutral), optional badge "Sent a proposal", headline, reasons joined by " | ".
- Interactive elements:
  - Per match: text box with placeholder "A short note (optional). Keep everything on Lawfecta." (aria "Message to {name} (optional)"); "Invite" (blue; becomes "Invited" and disabled; disabled when the gig is not open); "Message" (only after invited or applied, with switch `gig_chat`; opens the conversation); a reviews button (defined elsewhere).
  - "From your bench" card (switch `bench`): intro "Invite people you trust first. An invited proposal does not use their monthly allowance."; per person: name (with " (firm bench)" when it is the firm's), reason when blocked ("not available right now", "does not work for this state", "no longer a freelancer", "cannot be invited now"), reviews button, "Invite" / "Invited".
  - "Your bench" card (agency as client, `agencyBenchInvite` line 6217): intro "Invite your bench first. A bench member you hire pays no platform fee; the agency pays it with its own."; per member: "Invite to this gig" (blue), or badge "Invited", or text "Not available right now" / "Cannot be invited".
  - Empty-state buttons: "Search Talent" (goes to Talent), "Review gig requirements" (back to Details).
- States: draft gig: "Post the gig first. DELA then finds freelancers who fit." Loading: "Loading matches...". None: "No one fits yet. Check back soon, widen the practice area or tools, or search in Talent." Agency bench empty: "Nobody on your bench yet. Invite people on the Agency page." Toasts: "Invited {name}", the server's note when the invitation is held for a check, "{name} is already invited".
- UX observations (mine): up to three separate lists of people to invite on one view (agency bench, bench, matches), each with a slightly different button label ("Invite to this gig" versus "Invite"). No link to the freelancer's full profile from a match card.

## Gig page: Questions view (attorney / agency owner)
- How to reach it: pill "Questions"; "Answer questions" on Projects. `gigQuestions` line 5922.
- Purpose and primary focus: answer applicants' questions; every applicant sees the answer.
- Layout: card "Questions" with sub-line "Your answers are shown to every applicant. No client information." and one inner card per question.
- Content: "Q: {question}", then "Answered: {answer}", or "Your answer is being checked by the Lawfecta Team.", or an answer box.
- Interactive elements: text area (aria "Your answer", 2 rows); button "Answer for everyone" (blue).
- States: "No questions yet." Toasts: "Answered for every applicant"; "Held for a check: keep everything on Lawfecta".
- UX observations (mine): who asked and when are not shown. No character limit shown.

## Gig page: Proposals view, "Compare proposals" (attorney / agency owner)
- How to reach it: pill "Proposals (N)"; "Review proposals" buttons. `gigProposals` line 5941.
- Purpose and primary focus: compare proposals side by side and choose one.
- Layout: one card "Compare proposals" with an intro, a wide table, and the "✦ Compare these proposals" helper under it.
- Content: intro "Budget {min} to {max}. Prices outside the range are labeled, never hidden. Check what each price includes, so cheap and complete are not confused." plus, when set, " You can choose a proposal until {date and time}; after that the freelancer confirms first." Table columns: "Freelancer", "Price", "Includes", "Leaves out", "Schedule", "Qualifications", and an unnamed action column.
  - Freelancer cell: name in bold; or, for an agency proposal, an agency box (badge "Agency", agency name, reviews line such as "★ 4.8 (3 reviews)" or "No reviews yet", agency headline, summary, "Services: ...", "Team of N", "Who will do this work:" with a line per person and a "View profile" button each, and the subcontracting note) and "Sent by {name}"; then "Invited", headline, match reasons.
  - Price cell: amount and a badge: "Within the budget" (green), "Below the budget" (neutral), "Above the budget" (amber).
  - "Leaves out" falls back to "Not specified. Confirm before signing."
  - Schedule: the freelancer's words, with "N days from signing" added or merged.
  - Qualifications cell also shows "Note: {message}".
- Interactive elements:
  - "Choose" (blue): browser confirm "Choose {name}'s proposal ({price})? DELA starts a draft agreement, closes the gig and tells the others politely."
  - "Ask to confirm" (when the proposal needs reconfirming after a big change or after the choosing window).
  - Status badge instead of a button: "Chosen" (green) or the proposal status word.
  - "Message" (switch `gig_chat`).
  - "View profile" (agency team lines): opens the Profile dialog (below).
  - "✦ Compare these proposals" (two or more live proposals, helpers on): result lists each proposal's name, what it covers, "Not said: ..." (or "nothing DELA noticed") and "You could ask: ...".
- States: loading "Loading proposals..."; "No proposals yet."; toasts "Chosen. The draft agreement is waiting for signing and funding." and "Asked {name} to confirm".
- Mobile/accessibility: table is in a horizontal scroll wrapper and stacks with `data-label` on narrow screens.
- UX observations (mine): seven columns of free text is dense; the agency box makes one cell very tall. An individual freelancer's row has no "View profile" button, only agency team members do. Choosing uses a browser pop-up for a consequential step.

## Gig page: Files view, "Files for this gig" and "File activity" (attorney / agency owner)
- How to reach it: pill "Files (N)". `gigFiles` line 6035, `fileActivityCard` line 6075, `sensitiveBox` line 5989.
- Purpose and primary focus: share read-only files with invited and hired freelancers for a limited time, and see who opened what.
- Layout: card "Files for this gig" (last-result notice, sensitive-data checkbox, explanation, shared file rows, share controls); card "File activity" (table).
- Content: each shared file row: file name, then " | Access expires after {date} for invited freelancers and the one you hire" or (red) " | Access ended {date}". Activity table columns: "When", "Who" ("{name} opened" / "downloaded" / "opened the link"), "What", "Where". Sub-line "Every view and download of files and links shared on this job, newest first."
- Interactive elements:
  - Checkbox "This job involves sensitive data (SSN, medical, financial, or ID documents)" with help line "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here." Saves at once.
  - When ticked with files already shared, a notice: "1 file is already shared on this job. It stays until it expires. You can delete it now." (or "N files ... They stay ... delete them now.") with "Delete now" (red) and "Keep them until they expire". "Delete now" swaps to an inline confirm: "Delete N file(s) for good? Shared files stay in your Files page." with "Cancel" and "Yes, delete them" (red).
  - Per file: "Extend {14} days" (number from settings), "Stop sharing".
  - Dropdown "Freelancer can open it for" with options "7 days", "14 days", "30 days" (from settings), and button "Share a file from Files": lists the member's ready files, each with a "Share" (blue) button. Only with switch `file_uploads` and when the job is not marked sensitive.
- States: explanation when not sensitive: "Read only, for this gig only. Each file is open to invited freelancers and the freelancer you hire until it expires (you pick 7, 14 or 30 days) or the job is complete, whichever comes first. Your copy stays in your Files page. Every download is logged. Expiry cannot recall a copy someone already downloaded." When sensitive: "This job involves sensitive data, so files cannot be shared here. Once you hire and the first milestone is paid, add secure document links in Confidential materials on the engagement." No files to pick: "No other ready files. Upload on the Files page first." Activity: "Loading...", "Nobody has opened anything yet.", "The activity could not be loaded." Results (toast, and kept on the card for 10 minutes as a green notice): "Extended to {date}", "No longer shared", "Shared until {date}". Toasts: "Marked as sensitive: no uploads on this job, secure links only.", "No longer marked as sensitive.", "Deleted. N shared file(s) stopped and N confidential file(s) deleted."
- UX observations (mine): files cannot be uploaded here, only picked from the Files page, and there is no link to the Files page. The destructive delete uses an inline confirm here while other pages use browser pop-ups.

## AI suggestion panel (the "✦" check buttons) (both)
- How to reach it: any "✦ ..." helper button; in my range "✦ Check the scope" (gig draft) and "✦ Compare these proposals" (Proposals view). `helperButton` line 5708, `helperFindings` line 5740.
- Purpose and primary focus: DELA reviews the unsaved form and offers suggestions the member may apply.
- Shown when: the helpers feature is on for the account (`/helpers` returns on).
- Layout: the button with a cost note beside it, then a soft panel with an AI label, "Dismiss", the findings list and a small note from the server.
- Content: cost note "Uses N DELA action(s) on Lawfecta's AI (none on your own key)." Each finding: "{Task N, }{field name}: {problem}" and "Suggestion: {text}". Field names come from a fixed list (for example "Title", "The task", "What done looks like", "Steps", "Usual time", "Budget", "Deadline", "Milestones"). When all findings share one reason it is said once above the list.
- Interactive elements: the helper button (reads "DELA is checking..." while running); "Dismiss" (panel); per finding "Use suggestion", "Edit" (applies it and puts the cursor in the box), "Dismiss"; "Use all suggestions" (blue, when two or more can be applied).
- States: "DELA found nothing to flag." Toast "Added to the form. Nothing is saved until you save." Client-information check: browser confirm "This may include client information ({kinds}). Use placeholders instead. Click OK only if it is not client information." Errors: "DELA's checks are not on for your account yet.", "Compare needs at least two proposals.", "Add at least one task first.", "This is not a monthly engagement.", "You have used this month's DELA actions.", "Add at least one step first.", "Every check passed, so there is nothing to explain.", "Type a few words first.", "Choose your ratings first.", and two "write your own notes first" messages for reviews.
- UX observations (mine): "Use suggestion" and "Edit" do the same thing except for focus. Two different "Dismiss" buttons (panel and finding) sit close together.

## Profile dialog (freelancer card) (attorney and agency)
- How to reach it: "View profile" on a person line (agency proposal team, "Who's working on this"). `profileModal(personId)` line 6098. Modal titled "Profile".
- Purpose: a quick read of one freelancer.
- Content: photo, name, headline, "Verified" or "Verification not finished" plus the reviews line; "Works with: {agencies}"; summary; "Experience"; "Practice areas: ..."; "Tools: ...".
- Interactive elements: a reviews button (when available) and "Close".
- States: "Loading..."; error notice.
- UX observations (mine): this small dialog duplicates the full Talent profile page in a much thinner form.

## "Who's working on this" card (attorney sees; agency changes)
- How to reach it: inside a gig's "Agreement and work" view, section "Who's working on this" (line 9212). `peopleCard(r)` line 6139.
- Purpose: show which agency people and subcontractors are on the job; the agency adds or removes them.
- Shown when: the engagement is with an agency; otherwise the card removes itself.
- Content: intro "You hired {agency}. These are the people working on it. If the agency changes them, you get a notice; nothing is needed from you." (attorney) or "This engagement is with {agency}. The attorney sees this list and gets a notice when it changes." (agency). One line per person: photo or initial, name, role (subcontractors read "Subcontractor, {role}"), reviews line.
- Interactive elements: "View profile" (per person); agency only: "Take off this job" (per person), dropdown (aria "Team member to add"), text box with placeholder "Role on the job, for example Lead paralegal" (80 characters), button "Add to this job".
- States: "Loading..."; toasts "{name} is off this job. The attorney was told." and "Added. The attorney was told."
- UX observations (mine): "Take off this job" has no confirm.

## "Bench assignments" card (agency owner or manager only; never the attorney)
- How to reach it: same section of the "Agreement and work" view, freelancer/agency side. `assignmentsCard(r)` line 6175.
- Purpose: give a milestone to a bench member and set the fee split for that job.
- Shown when: the server says assignments are on for this agreement.
- Content: intro "Give a milestone to someone on your bench. Their bench split fills in; a different split for this job needs their Accept before work starts. When the attorney accepts the milestone, the agency gets its share minus the whole freelancer fee, and they get their full share. The attorney sees them as a subcontractor, never the split." Per milestone: "Milestone N: {title} ({amount})", then "Assigned to {name} | split X% to the agency / Y% to the freelancer | waiting for {name} to accept", optional notice "Waiting on {name}'s payout setup".
- Interactive elements: "Post a gig for part of this job" (switch `agency_subcontracting`, agency can post, agreement signing/signed/active; opens the New Gig page linked to this job) with the note "For someone outside your bench. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor."; per unassigned milestone: dropdown of bench members ("{name} (bench split ...)"), number box "Agency share for this job (%):" (placeholder "Bench split", limits from settings, step 0.5), button "Assign" (blue); per assigned milestone: "Take back".
- States: "This engagement says no subcontractors, so its milestones cannot be assigned to bench members and no gig can be posted for part of it."; "Not assigned."; "Not assigned. Nobody on your bench can take new work yet."; results on the card: "Assigned. Waiting for them to accept the split for this job.", "Assigned. The attorney was told who is working on it.", "Milestone N is unassigned".

## Agency page (freelancer side)
- How to reach it: sidebar menu item "Agency", address `?tab=agency`. `agencyView()` line 6382. Routed at line 12238 when side is freelancer and switch `agency_team` is on.
- Purpose and primary focus: run an agency (profile, business details, team, bench) or answer agency and bench invitations.
- Shown when: freelancer side, switch `agency_team`. What shows depends on role: no agency, team member, manager, owner.
- Layout, top to bottom (each part only when it applies):
  1. `h1` "Agency".
  2. One card per invitation: "Invitation from {agency}".
  3. Card "Agencies you work with".
  4. If the member has no agency: card "Run your own agency" and the page stops (bench cards still follow).
  5. Line "{agency name} | you are the owner/manager/member".
  6. Card "Agency profile" (owner or manager).
  7. Card "Business details" (owner).
  8. Card "Posting gigs" (when the agency can be a client).
  9. Card "Team".
  10. Card "Proposals".
  11. Card "The agency's jobs" (managers) or "Your agency jobs" (members).
  12. Bench area (loads separately): cards "Bench invitation from {agency}" / "On {agency}'s bench"; card "Your agency assignments"; card "Bench" (the agency's own bench, owner and managers).
- Content and interactive elements, card by card:
  - "Invitation from {agency}": "{from} invited you to join {agency} as a member. You keep your own account and your own plan. The agency can name you on its proposals." and "Open until {date}." Buttons "Accept" (blue), "Decline". Toasts "You joined {agency}", "Declined".
  - "Agencies you work with": per agency: name, role, " | paused" when inactive; hours control (number box aria "Hours a week you can give this agency", placeholder "Not set", 0 to 80; button "Save hours"); "Leave" which swaps to an inline confirm "Leave {agency}? Your access to its jobs ends at once." with "Cancel" and "Yes, leave" (red). Toast "You left {agency}".
  - "Run your own agency": "On Freelancer Business, your account becomes an agency. You invite team members, send proposals as the agency and name who will do the work, and grow a bench of freelancers you hire." and "Your plan now: {Plan}. Upgrade your Lawfecta membership to Freelancer Business to start." No button.
  - "Agency profile" (`agencyProfileCard` line 6261): sub-line "Attorneys read this on your agency's proposals. Team of N, bench of N (counted for you)."; a live line "Still missing: a headline, a short summary, practice areas, at least one service, the states you serve." or "Complete."; an inner soft card with text area "Tell DELA about your agency" (placeholder "A few lines: what your team does, practice areas, states, tools, how you work. No client names or details."; hint "DELA drafts the profile from this. It uses DELA actions, like other drafts.") and button "✦ Let DELA draft it"; then fields "Headline" (160 characters, placeholder "For example: Family law support team for small firms in Texas"), "Summary" (4 rows, 2,000), "Practice areas" (placeholder "Separated by commas"), "Services" (4 rows; placeholder "One service per line, for example: Discovery responses | Drafted and organized for attorney review"; hint "One per line. Add a short description after a | if you like."), "Tools you use" (placeholder "Separated by commas, for example: Clio, Microsoft 365"), "States you serve" (placeholder "Two letters each, for example: TX, OK"); button "Save the agency profile" (blue). After a DELA draft: "DELA filled in the boxes. Check every word, then click Save the agency profile.", "Still empty: ... Add it/them, then save.", and "DELA asks: {question}" lines. Messages: "Saved." / toast "Saved"; "Tell DELA a little more about your agency first."; "DELA could not draft it right now. Try again in a minute."; "Not saved. Try again."; "Only the agency's owner can edit the agency profile."; "The agency profile is not open yet."; "The agency profile could not load."
  - "Business details" (owner): "The Lawfecta Team checks your business name and state once, before your agency's first gig goes live." Fields "Business name" (160), "State of registration" (2 letters, placeholder "TX"). Status line: "Checked by the Lawfecta Team." / "Waiting for the Lawfecta Team's check. Note: {note}" / "Not entered yet." Button "Save business details". Toast "Saved. The Lawfecta Team will check it."
  - "Posting gigs" (`agencyClientCard` line 6238): "Ready to post gigs from your Library (Projects page)." or "Your agency can post gigs once {the agency is on Freelancer Business / the owner's own verification is done / the Lawfecta Team has checked the business details above}." Non-owners: "The owner adds the client details below." Owner: "Needed before your agency pays for a gig: the agreement names who signs for the agency and where notices go." Fields "Who signs for the agency" (120), "Billing address" (300), "Email for notices" (email, 200). Button "Save client details". Result "Client details saved".
  - "Team": "N of M seats used, the owner included, plus N invitation(s) waiting. Team members use their own Lawfecta accounts and finish their own verification before you can name them on a proposal." Per member: name, role ("Owner", "Manager", "Member"), email, "verified" / "verification not finished", "on N job(s)". Owner sees per member: hours box (aria "Hours a week for {name}", "Save hours") and, when hours are not set, "Ask to set hours" (becomes "Asked today", disabled for a day). "Remove" swaps to an inline confirm "Remove {name}? Their access to the agency's jobs ends at once." with "Cancel" and "Yes, remove" (red). Pending invitations: "{name} | invited as member | open until {date}" with "Cancel invitation". Invite row: email box (placeholder "Their email on Lawfecta") and "Invite to the team" (blue). Footer: "Team members do the work they are named for. Only you, as the owner, send proposals for the agency, sign for it and change who works on a job." Toasts: "{name} removed from N job(s)", "Invitation canceled", "Invitation sent", "Already invited", "Saved: N hours a week.", "Hours cleared. They show as "Hours not set".", "Enter a whole number of hours from 0 to 80, or leave it empty.", "The hours were not saved. Try again.", "{name} was asked to set their weekly hours.", "The reminder was not sent. Try again."
  - "Proposals": "Shared by the whole agency. {allowance text}".
  - "The agency's jobs" / "Your agency jobs": per job: title, status (raw status word from the server), people's names; button "Open" (opens the job's "Agreement and work" view on the Work tab). Empty: "No jobs yet."
- States: loading "Loading..."; "Agencies are not open for your account yet."; inactive agency notice "Your agency is not on Freelancer Business right now, so team changes and agency proposals are paused. Jobs already running continue."; page error notice.
- Help: the "Bench" heading is a glossary term (`D.term("Bench", "bench")`). Fields have the standard help-tip slot.
- Variations: owner sees everything; manager sees the profile, team management for members, and the bench; member sees only memberships, team list and their jobs. A code comment says there is no manager role in practice, yet "Manager" still exists as a label and in permission checks.
- Mobile/accessibility: rows wrap; hours boxes have per-person aria labels.
- UX observations (mine): a very long single page with up to ten cards and no sub-navigation. Job status in the jobs card is the raw server word, not the plain status words used elsewhere. "Proposals" is a card with one sentence. Team "Remove" and "Leave" use inline confirms, bench "Remove" uses a browser pop-up. "Run your own agency" has no upgrade button.

## Agency page: bench cards (freelancer invited to a bench; agency owner or manager)
- How to reach it: bottom of the Agency page. `agencyBench(box)` line 6511.
- Purpose and primary focus: sign a bench agreement that fixes the fee split, and manage bench members.
- Shown when: the server says the bench is on.
- Card "Bench invitation from {agency}" / "On {agency}'s bench" (the invited or member freelancer):
  - Content: "Your split: X% to the agency / Y% to you. The agency pays the platform fee from its share, so you receive your full share and pay no fee."; "Proposed split: ..." / "New split proposed: ..." / "You proposed: ... Waiting for the agency to sign."; "Note from {name}: {note}"; "Open until {date}."
  - Interactive: expandable "Read the bench agreement"; text box (placeholder "Your full name"); checkbox "I have read the bench agreement and I sign it electronically."; "Sign and join" or "Sign the new split" (blue); "Or propose the agency's share (%):" number box (step 0.5, limits from settings) and "Propose this split"; "Decline" (invited); "Leave the bench" (active; browser confirm "Leave {agency}'s bench? New assignments stop. Work already assigned keeps its split and pays out.").
  - States: "Plus plan or higher required to join a bench. Upgrade your Lawfecta membership to Freelancer Plus, then come back to sign." Results: "Signed. You joined {agency}'s bench.", "Signed. The new split applies to new work.", "Proposed and signed. Waiting for the agency.", "Declined", "You left the bench".
- Card "Your agency assignments":
  - Content: "Work agencies gave you from their engagements. You hand the work to the agency; the agency delivers it to its client. You pay no platform fee on your share." Per item: "{job}, milestone N: {title}", "For {agency} | {amount} | your share {amount} | due {date}", "Deliverables: ...", then either a notice "Split for this job: X% agency / Y% you. Work cannot start until you accept." or "Split X% agency / Y% you | your share was paid / your share waits for your payout setup on the Earnings page / your share is on its way / accepted / in progress".
  - Interactive: checkbox "I accept this split for this job."; "Accept" (blue), "Decline".
  - Results: "Accepted. You can start once the milestone is funded.", "Declined. The milestone goes back to the agency."
- Card "Bench" (the agency's own):
  - Content: "Outside freelancers you hire for your work. They never use a seat. Before someone joins, you both sign a bench agreement that sets the split of the fee. The agency's share is X% to Y%, and the agency pays the Z% freelancer platform fee from its share. Only Freelancer Plus or higher can join. The attorney never sees the split." Per person: name and facts joined by " | ": bench status word, "split ...", "waiting for them to sign ..." / "they proposed ...", "Inactive: Free plan", "Plus plan or higher required to join a bench", "open until {date}".
  - Interactive per person: "Sign their split" (blue); number box (aria "New agency share for {name} (%)") and "Propose a new default split"; "Cancel invitation" (browser confirm "Cancel the bench invitation to {name}?") or "Remove" (browser confirm "Remove {name} from your bench? New assignments stop. Work already assigned keeps its split and pays out.").
  - "Invite to the bench" sub-heading: email box (placeholder "Their email on Lawfecta"), number box "Agency share (%)" (hint "Allowed: X% to Y%."), text box (placeholder "Note to them (optional)", 600), expandable "Read the bench agreement", name box and checkbox "I have read the bench agreement and I sign it for the agency.", button "Invite to the bench" (blue).
  - States: "Nobody on your bench yet." Results: "Signed. {name} joined your bench.", "Proposed and signed. Waiting for {name}.", "Invitation canceled", "{name} removed from your bench", "Bench invitation sent", "Bench invitation sent. They need Freelancer Plus or higher to join.", "Already invited or on your bench", "Enter the agency's share (%) first. Allowed: X% to Y%."
- UX observations (mine): one signature row (name and tick) at the bottom of the "Bench" card serves every row's "Sign their split" and "Propose a new default split" buttons as well as the invite form, which is easy to miss. The unlabeled number box beside "Propose a new default split" has no visible label. Two different things are both called "bench" on the attorney's Matches view ("From your bench" versus the agency's "Your bench").

## Invite {name} to submit a proposal (Talent invite page) (attorney / agency owner)
- How to reach it: Talent > "Invite to gig" on a search result or a profile; also opens automatically after posting a gig that was created for one freelancer. `talentInvitePage()` line 6934; shown by `talentView` when `talentInviteFor` is set (address stays `?tab=talent`).
- Purpose and primary focus: pick one of your open gigs and send this freelancer an invitation to propose. Nobody is hired.
- Shown when: Talent tab with an invitation in progress.
- Layout, top to bottom: back button; `h1` "Invite {name} to submit a proposal"; sub-line "Choose one of your posted gigs and invite this freelancer to send a proposal for it. Nobody is hired at this step."; two columns. Left: card "1. Select an existing gig", card "2. Review the gig", card "3. Invite to submit a proposal". Right: aside card "Inviting".
- Content:
  - Card 1: "Only your posted gigs that still take proposals are listed."
  - Card 2: the chosen gig's title, task, "Outcome: ...", facts "Budget" (amount, range or "Not given"), "Deadline" (date, the usual time, or "Not given"), "Proposals close" (date or "No closing date"), and "This is the public version of your gig, the one freelancers see. It holds no client information."
  - Card 3: "This invitation asks {name} to send a proposal for your gig. It does not hire them, award the work or create anything to pay."
  - "Inviting": avatar, name, headline, facts "Verification" ("Verified" / "Not verified yet"), "Reviews" ("N review(s)" / "No reviews yet"), "Availability" ("N hours a week" / "Not given"), "Time zone" (or "Not given"), and "Work, messages, approvals and payments stay on Lawfecta."
- Interactive elements:
  - "← Back to the profile" or "← Back to Talent search".
  - Dropdown "Existing gig": first option "Select one of your posted gigs" or "No posted gig is open for proposals"; then each open gig's title.
  - Text area "Message to the freelancer (optional)" (3 rows, 2,000 characters; placeholder "For example: your experience looks right for this gig. Please look at the scope and send a proposal if you are interested."; hint "Sent with the invitation, inside Lawfecta. Up to 2,000 characters."), with the standing sensitive-data note above it ("Never enter sensitive data: ... Share a link from your own storage instead. You are responsible for what you enter.").
  - "Send invitation to submit a proposal" (blue; disabled until a gig is chosen; reads "Sending..." while sending), "Cancel".
  - Done card buttons: "Back to Talent search" (blue), "Open the gig" (opens its Proposals view).
- States: "Loading your gigs..."; no gig chosen: "Choose a gig to see what the freelancer will be asked to propose on." or "Post a gig in Projects first. Creating a gig from an SOP or Workflow happens there, not here."; "Loading the gig..."; "This gig could not be loaded. Choose another one."; "This gig could not be loaded. Check your connection." Client-information check: browser confirm "Your message may include client information. Take it out, or click OK only if it is not client information." Success card "Invitation sent": "{name} is invited to send a proposal for "{title}"." or "Already invited": "{name} was already invited to "{title}". Nothing was sent again."; then "What happens next: {name} gets a notice and can send a proposal or decline. Proposals appear on the gig in Projects. Nobody is hired and nothing is charged until you choose a proposal and sign an agreement." Toasts "Invited {name}" / "Already invited". Errors: ""{title}" no longer takes proposals, so no invitation was sent. Choose another gig." (the gig is removed from the dropdown); "{name} cannot be invited to this gig right now. No invitation was sent."; "The invitation was not sent ({error}). Check your connection and try again."
- Help: field help-tip slots; the aside has aria label "Who you are inviting".
- Variations: back button wording depends on where the member came from.
- Mobile/accessibility: the scope area is a live region; status and alert roles on results.
- UX observations (mine): when no gig is open there is no button to go and post one, only a sentence. The three numbered cards are a wizard laid out on one page, a different pattern from the New Gig stepper.

---

## Cross-page elements seen
- Shared helpers: `field(label, input, hint, help)` (label, optional help icon, input, small hint); `pjHead` (card heading with count and help icon); `pjTable` (accessible table that stacks on phones); `hstat` (number-and-label stat button); `D.helpTip`; `D.term` glossary (used for "Bench"); `D.toast`; `D.money`; `modal(title)` with body and footer; `cardStatus` / `cardSay` (a result that stays on its card for 10 minutes and also toasts).
- Shared patterns: filter pills with counts and `aria-pressed`; "✦" AI helper buttons with the "Uses N DELA action(s)..." note and the suggestion panel; a typed full name plus a tick box as an electronic signature (bench, standing arrangements); the client-information check (browser confirm "...Click OK only if it is not client information."); "← Back ..." ghost buttons at the top of sub-pages; numbered card headings ("1. ...", "2. ...", "3. ...").
- Two confirm styles in use: browser pop-ups (choose a proposal, extend, close or delete a gig, end an arrangement, decline a job, leave or remove from a bench) and inline "Cancel / Yes, ..." rows (leave an agency, remove a team member, delete shared files).
- Shared status words: the gig, proposal, engagement, standing arrangement and bench lists at the top of this file; badges "Overdue", "Invited", "Chosen", "Agency", "Within the budget", "Below the budget", "Above the budget".
- Feature switches met: `flex_gigs`, `engagements`, `recurring_engagements`, `ai_generation`, `playbook_library`, `gig_chat`, `bench`, `file_uploads`, `document_standard`, `agency_team`, `agency_subcontracting`, plus server-side on/off answers for helpers, standing arrangements and the agency bench.
- Recurring wording themes: "Nothing is posted", "Nobody is hired", "No client information", "Keep everything on Lawfecta".
