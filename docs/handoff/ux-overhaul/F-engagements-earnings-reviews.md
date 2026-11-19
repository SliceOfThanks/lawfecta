# F. Engagements, payments, confidential materials, disputes, earnings, reviews, bench

Source: `app/dela-app.js`, lines 8790 to 11228 (read in full). Every label below is copied from the code.
Lines 10619 to 11228 also hold Webhooks, the firm profile for documents, New document, the Library index table,
"Automate or delegate" and the "Get set up" home card. They are inventoried at the end (sections 24 to 31) because they
sit inside the assigned range, even though they are not engagement pages.

Helpers used here but defined outside the range (not inventoried, only named): `checkpointsCard` (line 11747),
`peopleCard` (6139), `assignmentsCard` (6175), `clientCard` (3007), `changeCompare` (5604), `noteConflict` (5628),
`helperButton` / `helperFindings` (5708 / 5740), `sensitiveBox` (5989), `expirySelect` (6029), `standingSetup` (6654),
`cardStatus` / `cardSay` (6483 / 6489), `agBadge` / `agTone` (4939), `pjTip` (5299), `aiNotice` (1847), `modal` (11915),
`showDrawer` (127), `smallFace` (8013), `field` (2455).

Status word maps (lines 8791 to 8794), used across every page here:

- Agreement status (`AG_STATUS`): draft = "Draft"; sent = "Draft"; signing = "Waiting for signatures"; signed = "Signed: waiting for the first payment"; active = "Active"; completed = "Complete"; canceled = "Canceled"; disputed = "In dispute"; paused = "Paused by the Lawfecta Team".
- Milestone status (`MS_STATUS`): pending = "Not paid yet"; awaiting_funding = "Waiting for payment"; funded = "Paid: ready to start"; in_progress = "In progress"; submitted = "Submitted"; changes_requested = "Changes requested"; accepted = "Accepted"; refunded = "Refunded"; canceled = "Canceled"; disputed = "In dispute".
- Submission status (`SUB_STATUS`): checking = "DELA is checking it"; failed = "Did not pass DELA's check"; human_review = "With a Lawfecta reviewer"; with_attorney = "With the attorney for review"; accepted = "Accepted"; changes_requested = "Changes requested".
- Agreement badge tone (`agTone`, line 4939): needs_me = "held"; active = "R"; completed = "ready"; canceled = "off"; disputed and paused = "bad"; all others no tone. In lists the badge reads "Needs your signature" when `needs_me === "sign"`.

---

## 1. Agreement and work: the engagement page (both)

- How to reach it: Attorney: Projects, open a gig, the gig view `agreement` (deep link `?view=agreement`, line 8790; `gigs.view = "agreement"`, line 5691). Freelancer: Work, open the gig; the panel is appended under the gig when the proposal is "selected" or access is "hired" (line 7647). Also reached by clicking any row of the engagements lists (section 17) and from Earnings. Functions: `engagementPanel` (8835) then `drawEngagement` (9167).
- Purpose and primary focus: One page per engagement. The ONE main thing is the "Next action" card at the top: sign, pay, start, submit, or review.
- Shown when: switch `engagements` on (callers check `me.switches.engagements`); an agreement exists for the gig.
- Layout, top to bottom:
  1. Header row: `h2` "Agreement, version N" and a status badge (agreement status words above).
  2. Optional notices (see States).
  3. Two columns (`eg-cols`): main column and side column.
  4. Main column, in order: "Next action" card (section 2); for a monthly engagement "Monthly terms" (before signing, section 10) or "Monthly engagement" (after signing, section 11); "Milestone progress" card when there are milestones (section 5; titled "This month's units" on monthly); when status is completed: "Closeout" (section 19), "Reviews" (section 20) and, for an attorney on a one-off engagement with switch `recurring_engagements`, the card "Keep this going every month"; then the folded sections; then the "Open all sections" link.
  5. Folded sections (each is a card whose heading is a button with title, one-line description and a "▾" chevron):
     - "Agreement and fees". Description, attorney: "Contract value, platform fees, payment history and the agreement versions." Freelancer: "The work, the milestones, what you receive and the agreement versions." Holds: "The agreement" card (section 7), attorney only "Your payments" (section 9, when any payment exists), freelancer only "Payouts to your bank" (short form, section 18), and "Engagement document (Word)" when the server sends `r.export`. Opens by itself while status is draft, sent or signing.
     - "Attorney decisions". Description, attorney: "Approve work at the steps that need your decision." Freelancer: "The steps where the work waits for the attorney's decision." Holds `checkpointsCard` (outside range). Opens by itself when a checkpoint has status "requested". Hidden when that card returns nothing.
     - "Propose changes" (status signing) or "Change orders" (signed, active). Description: "Propose changes to scope, price or milestones. Nothing changes until you both sign the new version." Holds section 8. Not shown on monthly engagements, nor in draft, sent, paused, disputed, completed, canceled. Opens by itself when the edit form is in use.
     - "Who's working on this". Description: "Everyone on the job, and any subcontractors." Holds: freelancer only the client card (`clientCard`), "Subcontractors" (section 12), `peopleCard`, freelancer only `assignmentsCard`. Never opens by itself. No help tip.
     - "Confidential materials". Description: "Client files, private messages and secure links for this engagement." Changes to "Coming soon. Not available yet." when the feature is off. Holds section 13. No help tip.
     - "Disputes and cancellation". Description: "Report a problem, open a dispute or cancel, with the dates and what happens to the money." Holds section 15 (or 16). Opens by itself when status is disputed or a dispute is in "notice" or "team_review".
  6. Side column: "Agreement summary" (section 3), "What happens next?" (section 4), "How milestone payments work" (section 4).
- Content and data shown: version number, status badge, everything in the sub-sections below.
- Interactive elements:
  - Each folded section heading button: opens or closes the section (`aria-expanded`, `aria-controls`). State is kept per engagement for the session (`eng.open`); another engagement starts folded again.
  - Link-style button "Open all sections" / "Close all sections" (id `eg-all`): opens or closes every section; saved in `localStorage` key `dela_eg_all`. Text beside it: " Your choice is remembered on this device."
  - "Make this monthly" (blue, small) in the card "Keep this going every month" (completed, attorney, not monthly, switch `recurring_engagements`): drafts a monthly agreement and opens it. No confirm step. Card text: "Draft a monthly agreement with the same freelancer, starting from this finished work. You both sign before anything is charged." Success message: "Drafted. Fill in the monthly terms, then both of you sign."
  - "Download the document (Word)" (ghost, small) in "Engagement document (Word)": downloads a Word file; toast "Downloaded <name>". Card text: "A Word copy of the document for this engagement, now that a milestone is accepted."
- States:
  - Loading: "Loading the agreement..."
  - No agreement: "There is no agreement for this gig yet. It starts when the attorney chooses a proposal."
  - Back from Stripe with `?paid=1` (attorney): green notice "Thank you. Your payment is confirmed." or "Thank you. Stripe is confirming the payment. This page shows it as paid within a minute (a bank payment can take about 4 business days)."
  - Signing with a deadline: "Both of you sign by <date time>. If it is not signed by then, it closes."
  - Paused: red notice "A payment on this engagement is under review with the bank, so it is paused. You can still read everything and send messages. The Lawfecta Team will be in touch."
  - Canceled: notice "This engagement was canceled: <reason>." (reason `not_signed_in_time` reads "it was not signed in time").
  - Errors come from `ENG_ERR` (lines 8795 to 8815), about 60 messages. Examples: "Agreements are not open for your account yet."; "There is a newer version of the agreement. Reload it and read the new version before signing."; "The other person changed the agreement while you were working. Reload it, then make your change again."; "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe."; "Keep the work and the payment on Lawfecta. Remove the contact details or the plan to pay outside it."; fallback "That did not work."
  - Stripe test mode note appended to payment text: " Stripe is in test mode here: use Stripe's test card 4000 0000 0000 0077 (any future date, any 3 digits)."
- Help: tips on folded sections (`EG_HELP`): Agreement and fees: "The signed terms, the milestones, the fees agreed at signing, and every version with its signatures." Attorney decisions: "Approve work only when the applicable decision step becomes available." Change orders: "Propose changes to price, scope, or milestones for the required review and approval." Disputes: "Review applicable deadlines and financial consequences before taking action."
- Variations by engagement state (what the page holds in each):
  - draft / sent: Next action = sign form (draft) or, for "sent", the fallback "Nothing to do here" (see observations). "Agreement and fees" open. No change section. Disputes section shows the intro text and "Cancel the engagement" only.
  - signing: sign form or "Waiting for the other signature". "Agreement and fees" open. "Propose changes" section present. Sign-by line.
  - signed: attorney sees "Pay milestone 1" with the review step; freelancer sees "Waiting for payment". "Change orders" section. Dispute form and cancel available.
  - active: Next action follows the milestones (pay, wait, review, start, submit). Everything available.
  - paused: red notice; Next action reads "Nothing to do here"; no change section; dispute form and cancel still offered.
  - disputed: Next action reads "Nothing to do here"; "Disputes and cancellation" opens by itself; no change section; "Cancel the engagement" still offered.
  - completed: Next action "This engagement is complete"; "Closeout", "Reviews", optionally "Keep this going every month"; no change section, no dispute form, no cancel.
  - canceled: notice with reason; Next action "Nothing to do here"; folded sections read only; no dispute form, no cancel.
- Mobile/accessibility: sections use real buttons with `aria-expanded`; focus moves to the opened section and the page scrolls to it with a 120px offset (`egGo`); notices use `role="status"`.
- UX observations (mine): The page has three layers of "what to do" (Next action card, "What happens next?", "How milestone payments work") plus a "Before you pay" box, which repeat similar sentences. Status "sent" is treated as a pre-signing state everywhere except `nextStep` and `egWhatNext`, so a "sent" agreement shows "Nothing to do here" with no sign form. In paused and disputed states the Next action card says "Nothing to do here" although a dispute may need an answer. The folded card titles differ from the card titles inside them ("Disputes and cancellation" holds "Problems, disputes and canceling"; "Change orders" holds "Change order"; "Agreement and fees" holds "The agreement").

## 2. "Next action" card (both)

- How to reach it: top of the main column of the engagement page. `nextStep` (9607).
- Purpose: one clear next step for this person, with a status chip.
- Layout: kicker "Next action"; title (`h2`); chip at the right; then text and the action.
- All variants (title / chip / body / control):
  - Monthly, signed or active, terms not ended:
    - Attorney, month 1 not paid: "Pay month 1" / "Waiting for payment" / "The day month 1 is paid becomes your billing day each month. Lawfecta holds it until each unit is accepted." / amounts ("Month 1", "Platform fee", "Total due now") and "Review payment: month 1".
    - Freelancer, month 1 not paid: "Waiting for payment" / "Waiting for payment" / "Waiting for the client to pay month 1. Do not start unpaid work."
    - Renewal failed: attorney "Pay month N", freelancer "Month N is not paid yet" / chip "Payment did not go through" (red) / attorney "Month N's payment did not go through. Pay now from the Monthly engagement card below." freelancer "Month N is not paid yet, so new work is paused. Do not start month N's tasks."
    - Otherwise: attorney "Review each unit when it is submitted", freelancer "Do this month's units" / chip "Month N is paid" (green).
  - draft or signing, I signed and they did not: "Waiting for the other signature" / "You signed" (green) / "You signed version N. Waiting for the freelancer|agency|attorney to sign."
  - draft or signing otherwise: "Sign the agreement" / "Needs your signature" / "Read the agreement under "Agreement and fees" below, then sign here." plus the sign form (section 6).
  - Attorney, signed or active:
    - A payment is processing: "Payment being confirmed" / "Being confirmed" / "Your payment of $X is being confirmed by the bank. Work starts when it is confirmed." and "Nothing more is needed from you. A bank payment can take about 4 business days. No second payment can be made while this one is being confirmed."
    - A submission is with the attorney: "Review milestone N" / "Deliverable ready for review" / milestone title / "The freelancer submitted this milestone. Read it, then accept it or ask for changes." / button "Review deliverable: milestone N" (blue; opens that milestone row and scrolls to it).
    - A milestone is due and none is open: "Pay milestone N" / "Waiting for payment" or the failed payment words in red / milestone title / optional line ("The charge to your saved payment method did not go through, so nothing was paid. Review the payment and pay again." or "The last payment did not go through, so nothing was paid. Review the payment and pay again." or "This milestone has not been charged yet, so it waits for you." or "No payment method is saved for this engagement, so this milestone waits for you.") / amounts ("Milestone amount", "Platform fee" or "Lawfecta fee", "Total due now") / optional "Milestone amount only. The platform fee of $X was charged once, with the first milestone." / "Review payment: milestone N" and "View milestone details".
    - Work open: "Nothing is due from you right now" / "Work in progress" (green) / "The freelancer is working on the paid milestone. You review each one when it is submitted."
    - Else: "Nothing is due from you right now".
  - Freelancer, signed or active:
    - A milestone is funded / in progress / changes requested: "Start milestone N" / "Submit milestone N" / "Make the changes for milestone N"; chip "Paid, held by Lawfecta" (green) or "Changes requested"; "Milestone N is paid and held by Lawfecta. Do the work, then submit it below."; button "Go to milestone N" (blue).
    - Submitted: "Waiting for the attorney's|agency's review" / "Submitted" (green) / "Milestone N is submitted. Nothing is needed from you until it is reviewed."
    - Else: "Waiting for payment" / "Waiting for payment" / "Waiting for the attorney|agency to pay the next milestone. Do not start unpaid work."
    - Extra line when payouts are not ready: "Set up payouts on the Earnings page so accepted milestones reach your bank."
  - completed: "This engagement is complete" / "Complete" (green) / "Every milestone is accepted. This engagement is complete."
  - Anything else (sent, paused, disputed, canceled): title "Nothing to do here", muted "Nothing to do here."
- Payments not set up: notice "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe." replaces the pay button.
- Help: tip on the fee line and on the review button (`EG_HELP.fee`: "Your applicable fee is calculated from the terms of this engagement and your plan."; `EG_HELP.review`: "Review the amount and payment details before completing this milestone payment.").
- UX observations (mine): The fee line is labelled "Platform fee" when charged once and "Lawfecta fee" when charged with each milestone; two names for one thing. The line under the review button, "Nothing is charged until you confirm on the next step.", is good reassurance and should stay close to the button.

## 3. "Review payment" step (attorney)

- How to reach it: in the Next action card, click "Review payment: milestone N" or "Review payment: month 1". `payStart` (9593), `payReview` (9546). It replaces the button area in place; it is not a pop-up.
- Purpose: show every amount and how it will be paid before anything is charged.
- Layout: heading "Review payment: milestone N" (focus moves here); one line per amount ("Milestone N: <title>", "Platform fee" or "Lawfecta fee"; or "Month 1", "Platform fee"); "Total charged now"; how it is paid; what happens after; on the first payment the box "Before you pay" (bullets from the server's money summary); a status line; buttons.
- Text: no saved method: "You pay on Stripe's secure page. DELA never sees your card or bank details." (plus the test card note in test mode). Saved method: first "Paid with your saved payment method. Checking which one..." then "Paid with your saved payment method: Visa ending 4242. To use another one, choose "Pay another way" and pay on Stripe's secure page." After-line for a milestone: "Lawfecta holds the milestone amount until you accept the milestone." For month 1: "That payment method is saved for each month's renewal, charged once on your billing day. A bank payment takes about 4 business days; the month's tasks open only once it clears."
- Interactive elements:
  - "Continue to Stripe" (blue; no saved method) or "Pay $X now" (blue; saved method): starts the payment. No browser pop-up. Leaves the site for Stripe when a URL comes back.
  - "Pay another way" (ghost; only with a saved method): goes to Stripe's page.
  - "Go back" (ghost): closes the review and returns focus to the review button.
  - All three lock while a payment is in flight.
- States: "Starting the payment..."; "Opening Stripe's secure page..."; "Your saved payment method did not go through. Nothing was charged. Opening Stripe to pay another way." (also a toast); failure in red: "The payment did not go through. Nothing was charged. <reason> You can try again."; success toast "Paid. The freelancer can start." or "Paid. Month 1 is open." or "The payment is being confirmed."
- Mobile/accessibility: `role="group"` labelled by its heading; status line `aria-live="polite"`.
- UX observations (mine): Amounts are shown twice in a row (the amounts block on the card, then again in the review). Cents are shown only when the fee is charged with each milestone, so the same engagement type can read "$500" or "$500.00" depending on the fee timing.

## 4. Side column: "What happens next?" and "How milestone payments work" (both)

- `egWhatNext` (9138), `egHowPay` (9118). Read only, no controls.
- "What happens next?": a numbered list of the real steps from here. Not shown on monthly engagements, nor when status is sent, paused, disputed, completed or canceled.
  - draft / signing: "You and the <other> both sign version N." or "The <other> signs version N." or "You sign version N."; then attorney "You review and pay milestone 1 on Stripe's secure page." / freelancer "The <other> pays milestone 1."; then "The freelancer starts the work." / "You start the work once it is paid."
  - Attorney, signed or active: four sets: bank confirming ("The bank confirms your payment.", "The freelancer starts the work.", "You review the deliverable when it is submitted."); review due ("You review milestone N, then accept it or ask for changes.", "Accepting releases $X to the freelancer.", then "Milestone N is charged to your saved payment method. The accept step shows the amount first." or "You review and pay milestone N." or "With every milestone accepted, the engagement is complete."); payment due; work open ("The freelancer does the work and submits it.", "DELA checks the submission against the agreed checklist.", "You review it, then accept it or ask for changes.").
  - Freelancer, signed or active: "You start milestone N." / "You make the requested changes to milestone N." / "You finish milestone N."; "You submit it with a completion statement."; "DELA checks it against the agreed checklist, then the <other> reviews it."; "After acceptance, your part is paid out to your payout account."; or waiting sets.
- "How milestone payments work": shown for one-off engagements in draft, sent, signing, signed, active. Attorney bullets: "You pay the first milestone on Stripe's secure page. With your consent there, your payment method is saved for this engagement."; "When you accept a milestone, its payment is released to the freelancer and the next milestone is charged to your saved payment method. The accept step shows both amounts before you confirm."; "If that charge does not go through, nothing is paid. This page then shows "Review payment" and you pay on Stripe's page."; and a fee line ("The platform fee is charged with each milestone. Every payment shows its own fee." or "The platform fee of $X is charged once, with the first milestone. It is not added to later milestones."). Freelancer bullets: "The attorney|agency pays each milestone before you start it. Do not start unpaid work."; "Lawfecta holds the milestone amount until the attorney|agency accepts the milestone."; "After acceptance, your part is paid out to the payout account on your Earnings page."
- "Agreement summary" card (`egSummary`, 9086): title "Agreement summary" or "Agreement summary (not signed yet)". Lines: "Client (firm)"; "Freelancer" or "Agency"; then by side:
  - Attorney: "Price for the work (contract value)"; "Attorney platform fee (with each milestone)" or "Attorney platform fee (once, with the first payment)" (value or "Not available"; help tip); "Your total (contract + platform fee)"; after signing "Paid to date" (tip: "The payments Stripe confirmed for this engagement, less any refunds. A payment still being confirmed is listed apart."), "Being confirmed by the bank", "Amount due now (milestone N)".
  - Freelancer: "Price for the work (contract value)"; "You receive"; after signing "Paid out to you so far".
  - Monthly: the server's money summary lines instead.
  - Link-style button: "View signed agreement (version N)" or "Read the agreement (version N)"; opens the "Agreement and fees" section and moves focus there.
- UX observations (mine): the summary's "Attorney platform fee" is a third name for the fee (also "Platform fee", "Lawfecta fee").

## 5. "Milestone progress" card (both); "This month's units" on monthly

- `milestonesCard` (9869). In the main column under the Next action card, whenever milestones exist.
- Purpose: one row per milestone with three separate states; a row opens to its details and its action.
- Layout: head row with title, help tip ("Funding, delivery, and acceptance are tracked separately."), and the count "N milestones · M accepted" (or "N units"). Then an ordered list.
- Each row shows: a number circle (or "✓" when accepted); `h3` "N. <title>"; "$amount · Due <date>" or "· No date set" (a moved date reads "<date> (moved from <date>: <reason>)"); three states in words: "Payment: ...", "Delivery: ...", "Acceptance: ..."; a badge with the milestone status word; a "View" / "Hide" button.
  - Payment words, attorney: "Paid", "Paid, part refunded", "Refunded", "Payment being confirmed", "Payment did not go through", "Not paid yet". Freelancer: "Paid by the client, held by Lawfecta", "Paid by the client", "Refunded to the client", "Not paid yet".
  - Delivery words: "Not submitted", "In progress, not submitted", "Submission N: <submission status in lower case>".
  - Acceptance words: "Accepted", "In dispute", "Not accepted yet".
- Opened row body: amount line (attorney with per-milestone fee: "Milestone $X, Lawfecta fee $Y, Total $Z"; freelancer: "(you receive all of it; you pay no platform fee)" or "(you receive $X after the platform fee)"; "| due ..."; "| rounds of changes used: N of M"); "Deliverables: ..."; freelancer payout line "Payout: $X, sent to your bank | waiting for your payout setup (Earnings page) | held | did not go through. The Lawfecta Team is checking it | on its way"; the latest submission block; the freelancer's action.
- Interactive elements:
  - "View" / "Hide" per row (ghost, small; `aria-label` "View milestone N: <title>"). A row opens by itself when it needs this person (attorney: submission with the attorney; freelancer: funded, in progress, changes requested, or a failed check).
  - Freelancer, milestone funded: "Start this milestone" (blue, small). No confirm. Toast "Started. Submit it here when it is done."
  - Freelancer, in progress or changes requested: the form "Submit this milestone":
    - "Completion statement" text area (4 rows; placeholder "What you did, where it is, and anything still open"; hint "Say what you did and anything still open. The attorney and DELA read this.").
    - Checkbox: "These files contain no medical records, ID documents, account numbers, logins or biometric data." Must be ticked before choosing files; otherwise toast "Tick the box first: the files contain no medical records, ID documents, account numbers, logins or biometric data."
    - Note: "DELA's check reads your notes and checklist, never the files; the attorney reviews the files. Files uploaded on a job are deleted after a set time unless the attorney saves them to the firm's library."
    - "Files (optional)" file input (multiple). Per-file lines: "<name>: uploading", "<name>: ready", "<name>: held for a check. Remove client information and upload it again.", "<name>: not accepted", "<name>: the upload did not finish".
    - "Submit for DELA's check" (blue, small); while running it reads "DELA is checking it...". Results (toasts): "It passed DELA's check and is with the attorney."; "It did not pass DELA's check yet. See each point below."; "Sent to a Lawfecta reviewer, because DELA could not check it."
  - Submission block (`submissionBlock`, 9911), both sides: "Submission N: <status> | DELA's score N of 100"; the statement; per file: name, " | saved to your library" or " | deleted on <date> unless saved" or "<name>: deleted after the time limit"; "Open" (ghost, small; new tab); attorney only "Save to library" (ghost, small; toast "Saved to your Files page. DELA's AI never reads files from a job."). Expandable "DELA's check, point by point" (open by itself when failed): each point "Met | Missing | Could not tell (required): <text>. Evidence: ... " and the note "DELA checks the submission against the agreed rubric. It does not decide whether legal work is correct; the attorney does." Lines "Lawfecta reviewer: <note>" and "Attorney: <note>".
  - Freelancer, failed check: "Ask for a human review" (ghost, small). Browser confirm pop-up: "Ask a Lawfecta reviewer to look at it instead of DELA? The target is 5 business days." Toast "Sent to a Lawfecta reviewer."
  - Attorney, submission with the attorney: line "Review it by <date time>. Accepting releases the payment to the freelancer." (with a saved method and a next milestone: "...and charges the next milestone with your saved payment method. You see both amounts before you confirm."); text area "Note to the freelancer" (placeholder "What should change (needed to ask for changes), or a thank you"); buttons:
    - "Accept and release payment" (blue, small): opens an on-page confirmation (not a pop-up) headed "Accept milestone N?" with "Released to the freelancer $X"; when a next milestone will be charged: "Charged now to your saved payment method: milestone N and its Lawfecta fee $Y" and "If that charge does not go through, nothing is paid for milestone N and you pay it on Stripe's page."; otherwise "Milestone N ($X) is not charged now. You pay it next, from the top of this page."; "Accepting cannot be undone."; buttons "Yes, accept and release $X" (blue, small) and "Go back" (ghost, small). Toasts: "Accepted. The payment is released." / "...and the next milestone is paid." / "Accepted. Your saved payment method did not go through for the next milestone. Opening Stripe."
    - "Ask for changes" (ghost, small): sends at once with the note; no confirm. Toast "Changes requested. Rounds left: N."
- States: errors such as "This milestone is not paid yet. Work starts when the attorney's payment is confirmed."; "Write a completion statement: what you did and anything still open."; "Say what needs to change."; "The N included rounds of changes are used up. Propose a change order on the agreement instead."; "One of the files is not ready yet. Wait for its check to finish."
- Mobile/accessibility: rows are list items with `aria-expanded` buttons; the confirmation takes focus.
- UX observations (mine): each row carries a status badge plus three state phrases, so status is said four ways on one line. "Ask for changes" has no confirm while "Accept" has a full confirmation; the single note box serves both. The file tick box must be ticked before picking files, which is easy to miss because the box sits above the file input but the error only shows after picking.

## 6. Signing form (both)

- `signForm` (9731), inside the Next action card in draft or signing when this person has not signed. `commitmentSummary` (9711).
- Layout: "Read the agreement below. If it is right, sign it here. If not, propose changes." (prefixed with "The other person signed version N. " when true); box "What you are agreeing to" (bullets: the money summary; review days and rounds: "You have N days to review each milestone; M rounds of changes are included."; "Canceling before work starts refunds the client in full. After that, paid milestones not yet submitted are refunded and accepted ones stay paid."; agency line "The agency may use vetted Lawfecta subcontractors. Everyone working on the job is listed under Who's working on this."; "Keep all work, messages and payment on Lawfecta."; monthly variants: "Month 1 is charged when you pay it; that day becomes your billing day, and the saved payment method is charged once on it each month." / "You are paid each month for the work accepted that month.", "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree.", "The limits are for each month. Unused work does not carry over.").
- Interactive elements:
  - Text box "Your full name" (hint "Your typed name is your signature. DELA records it with the time, this version and its fingerprint."; autocomplete name).
  - Checkbox: "I have read version N of this agreement and I sign it electronically."
  - Monthly, attorney only, checkbox: "Charge this payment method each month on my billing day until I or the freelancer cancel."
  - "Sign version N" (blue). No pop-up.
- States: toast "Type your full name and tick the box to sign."; "Tick the box that lets Lawfecta charge your payment method each month. Without it, a monthly engagement cannot start."; success "Signed. Waiting for the other signature." or "Signed by both of you. Pay the first milestone to start." / "...The attorney pays the first milestone next." / "...The agency pays the first milestone next."; errors "The time to sign this agreement is over."; "Before you sign, add your firm's signatory, billing address and notice email in Profile, under "Firm details"."
- UX observations (mine): the form says "Read the agreement below" while the agreement sits in a folded section further down; the line above it says "under "Agreement and fees" below".

## 7. "The agreement" card (both), inside "Agreement and fees"

- `agreementCard` (9762).
- Layout: key-value block: "Client (firm)", "Signs for the firm" (or "Not set yet"), "Agency (the contracting party)" or "Freelancer's business", "Freelancer" or "Agency lead", "Price for the work" or "Monthly price for the work". Agency sentence about subcontractors. Green box with the money summary (first line bold). "The work: ", "Included: ", "Not included: " (fallback "Not specified. Confirm with the other person before signing."), "Schedule: ". Heading "Milestones" (glossary term `milestone`) with a table: columns "#", "Milestone", "Amount", "Due", "Deliverables". Heading "Fees" (glossary term `platform_fee`) with a bullet list from the server; after signing: "These are the amounts agreed at signing. What was actually paid, refunded and paid out is listed under Payments and on each milestone." Three expandable blocks: "Completion checklist (how DELA checks each milestone)" ("Agreed at signing. A score of 90 or more with every required item met passes, then the attorney reviews it. DELA's check is not a legal review."; per milestone, criteria with weight and "required"); "The terms" (full text); "Versions and signatures" (per version: who made it (you, DELA, the other person), date, note, "Fingerprint <12 chars>", "Signed by Attorney: <name>, <date>; Freelancer: ..." or "Not signed").
- Interactive elements:
  - "✦ Check this for me" (AI helper; draft, sent, signing). Shows findings; in signing with findings adds "Propose changes" (ghost, small) which opens the change form.
  - "✦ Improve acceptance criteria" (AI helper; attorney, one-off, signing/signed/active). Output per milestone, or "DELA found nothing to improve."; note "Using them starts a new version of the agreement. Both of you sign it before it applies."; buttons "Use suggestion" and "Edit" (both ghost, small; both do the same thing: open the change form with the suggestions filled in).
  - Three `<details>` toggles named above.
- Mobile: table has class `stack` with `data-label` on each cell (stacks into cards on a phone).
- UX observations (mine): "Use suggestion" and "Edit" are two buttons with one behavior. The card is long (parties, money, scope, table, fees, three folds) inside an already folded section.

## 8. "Propose changes" / "Change order" card (both)

- `changesCard` (9825). Inside the folded section "Propose changes" (signing) or "Change orders" (signed, active). One-off engagements only.
- Closed state: title "Propose changes" or "Change order"; text "Change the milestones or the scope. The other person reviews your version and signs it, or proposes another." or "Change the price, scope or milestones with a new version you both sign. Paid milestones keep their amounts. Work goes on under the signed version until then."; button "Propose changes" or "Propose a change order" (ghost, small).
- Open state (form): notice when AI suggestions were loaded: "DELA's suggested deliverables are filled in below. Check them, then send the new version; nothing changes until you both sign." Heading "Milestones". One small card per milestone with: "Title" text box; "Amount ($)" number box (min 0, step 1); "Due date" date input; "Deliverables" text box; "Remove this milestone" (ghost, small; no confirm). Then "Add a milestone" (ghost, small); "Included" (3 rows); "Not included" (2 rows); "Schedule" (2 rows); "Note" (placeholder "What you changed and why"); buttons "Send the new version" (blue) and "Cancel" (ghost).
- States: toast "Version N sent. Both of you sign it next."; errors "Use between 1 and N milestones."; "Each milestone needs a title and at least $X."; "The total must be at least $X."; "Every due date must be within N days."; "A milestone that is already paid cannot change its amount."; "This agreement is closed."
- UX observations (mine): no comparison of old and new values before sending; a removed milestone disappears with no undo.

## 9. "Your payments" card (attorney), inside "Agreement and fees"

- `paymentsCard` (10023). Shown when at least one payment exists.
- A bullet list, one line per payment: "<date>: $X (includes the platform fee $Y), <status>" or, with per-milestone fees, "<date>: Milestone $X, Lawfecta fee $Y, Total $Z, <status>"; failure reason in brackets. Payment status words: requires_payment = "Waiting for you"; processing = "Being confirmed"; succeeded = "Paid"; failed = "Did not go through"; canceled = "Canceled". Refund lines: "<date>: Refund for milestone N: Milestone amount refunded $X, Lawfecta fee refunded $Y, Total refunded $Z, Sent | Did not go through, the team is on it | On its way".
- No controls. No receipt or invoice link.
- UX observations (mine): a plain bullet list, not a table; refunds are listed only when fees are per milestone or the refund carries a fee, so some refunds may not appear here.

## 10. "Monthly terms" card (both), before both sign a monthly engagement

- `monthlyTermsCard` (8889), `tasksEditor` (8864). Switch `recurring_engagements` (error "Monthly engagements are not open for your account yet.").
- Layout: "Monthly price: $X. It renews every month until either of you cancels."; text "List each task, how often it happens and how many are included each month. Nothing is unlimited: extra work is a separate gig or a change for next month."; task rows; "Add a task"; "How the freelancer is paid each month" with two radios; AI helper; save button.
- Interactive elements, per task row: "Task" (placeholder "For example: intake calls and conflict checks"); "How often" dropdown: "Daily", "Weekly", "Every two weeks", "Monthly"; "Included each month" number (min 1); "Turnaround" (placeholder "For example: 1 business day"); "Not included" (placeholder "Optional"); "Remove this task" (ghost, small).
- "Add a task" (ghost, small). Radios: "Weekly units: the month is split into weekly units, each checked, accepted and paid like a milestone" / "One monthly delivery: checked and accepted at month end". "✦ Check monthly scope" (AI helper). "Save the monthly terms" (blue, small): message "Saved as version N. Both of you sign the new version."
- Errors (`MONTHLY_ERR`): "List at least one task with how often and how many are included each month."; ""Unlimited" is not allowed. Give each task an included number."; "Name each task."; "Choose how often each task happens."; "Give each task an included number each month (1 or more)."

## 11. "Monthly engagement" card (both), after signing

- `monthlyCard` (8906).
- Layout: optional notices ("This monthly engagement ended, as canceled | because a month stayed unpaid | early by agreement."; "The Lawfecta Team paused all renewal charges for a moment. Nothing is charged until they start again."); attorney bold money line (plus " Your billing day is set when you pay month 1."); key-values "This month" ("Month N: <date> to <date>"), "Monthly price", "Units accepted" ("N of M"), "Next billing" (glossary term `billing_day`; "None: it ends on <date>" or "<date> ($X plus the $Y platform fee)"); heading "Included each month" with the task list; a paragraph on weekly units or one monthly delivery and "The limits are for each month: unused work does not carry over, and a month with five weeks has the same limits and price."; "Month N's tasks are drafted. They open once it is paid on <date>."; failed renewal notice; cancellation rule "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree."
- Interactive elements:
  - Failed renewal, attorney: "Pay now" (blue, small): goes to Stripe or pays at once ("Paid. Month N is open.").
  - "Review cancellation" (ghost, small): shows in place "Cancel at the end of this paid month (<date>)? Nothing more is charged." with "Yes, cancel at month end" (red, small) and "Keep it" (ghost, small).
  - After canceling: "Canceled: it ends on <date>." and "Ask to keep it going" (ghost, small); or "Waiting for the other person to approve keeping it."; or, for the other side, "Approve keeping it" (blue, small) and "Keep the cancellation" (ghost, small).
  - "Ask to end now" (ghost, small); or "Waiting for the other person to agree to end now."; or, for the other side, "The other person asks to end now. Accepted units stay paid; the unstarted rest of this month is refunded to the client." with "Agree to end now" (red, small) and "Keep it running" (ghost, small).
  - Open change box: "Your change, waiting for the other person" or "A change to approve", a comparison, "Note: ...", a conflict alert; buttons "Approve the change" (blue, small) and "Decline" (ghost, small).
  - "Approved change, not started yet" box (read only).
  - "Request a change" (ghost, small): opens "New monthly price ($)" number box, the task editor (as in section 10), "Why (optional)", and "Send the change" (blue, small).
  - Test site only, Lawfecta owner only: "Run the renewal now (test site)" (ghost, small).
- Messages: "Canceled. It ends on <date>. Nothing more is charged."; "Asked the other person to keep the engagement going."; "The engagement continues."; "The cancellation stays."; "Ended. Unstarted units were refunded."; "It keeps running."; "Asked the other person to end now."; "Approved. It starts next month if approved at least N days before billing."; "Declined. The current terms continue."; "Sent. If the other person approves at least N days before billing, it starts next month."
- Variations: when ended, the card stops after the task list (no cancel, end or change controls). A monthly engagement has no "Cancel the engagement" in the disputes section and no change-order section.
- UX observations (mine): six different action groups (pay, cancel, undo cancel, end now, approve change, request change) stack in one card with small ghost buttons. "Ask to end now" sends the request at once with no review step, unlike "Review cancellation".

## 12. "Subcontractors" card (both), agency engagements only

- `subsCard` (9678), inside "Who's working on this". Title is the glossary term `subcontractors`.
- Text: "No subcontractors on this engagement: only the agency's own team works on it." or "This agency may use vetted subcontractors from Lawfecta to complete this work."
- Attorney, draft or signing: explanation "Subcontractors are verified Lawfecta freelancers who accept confidentiality and no-poaching terms. You do not approve each person; they are listed under "Who's working on this". To keep this job to the agency's own team, tick the box. Saving makes a new version of the agreement that both of you sign."; checkbox "No subcontractors on this engagement"; "Save" (ghost). Messages "Nothing changed." / "Saved as version N. Both of you sign the new version."
- Otherwise read only: attorney "Everyone working on this job is listed under "Who's working on this". You get a notice when it changes; nothing is needed from you."; freelancer/agency "The attorney chose this. Bench assignments and gigs for part of this job are off." or "Subcontractors are verified Lawfecta freelancers. You choose what to share with them and stay responsible for the work."

## 13. "Confidential materials" card (both)

- `confCard` (9270), `confDraw` (9280). Inside the folded section of the same name. Title is the glossary term `confidential`.
- Purpose: exchange client files, private messages and secure links between the hiring attorney and the hired freelancer. The AI never reads it.
- Shown when: the feature is on and the engagement is signed with the first milestone paid. Gate texts: "Coming soon: a private area on each engagement where the attorney and the hired freelancer exchange client files, confidential messages and secure links. The AI never reads it."; "Confidential materials open after you both sign and the first milestone is paid."; "Your access ended when the job ended."; "Confidential materials are paused by the Lawfecta Team for now."; "The confidential materials on this job were deleted."
- Gate 1, code entry (`confCodeBox`, 9390): "For your security, DELA emails you a 6-digit code before it opens this area. Once you enter it, it works for 12 hours." Controls: "Email me a code" (ghost, small); text box "6-digit code" (numeric, max 6, one-time-code autofill; Enter submits); "Open" (blue, small). After sending: "We sent a code to <address>. Enter it here soon: it stops working after a few minutes." Errors: "That code is not right. Check the email and try again."; "That code has expired. Send a new one."; "Too many tries. Send a new code."; "Too many codes in an hour. Try again later."
- Gate 2, promise: checkbox "I will keep these materials confidential, use them only for this engagement, and delete any copies when it ends."; "Open Confidential materials" (blue, small; disabled until ticked).
- Layout once open, top to bottom:
  1. A status line that keeps the last answer for two minutes.
  2. Note: "Client names, case facts, case numbers, court papers and contracts are allowed here. Never upload medical records, ID documents, account numbers, logins or biometric data: share those with a secure link from your own storage. DELA's AI never reads anything here."
  3. Hiring attorney or firm: the "sensitive job" tick box (`sensitiveBox`, outside range).
  4. Ended notice: "This job has ended. The freelancer can no longer open anything here. Files are deleted N days after access ended, and messages N days after the job ended. Use Download all to keep a copy."
  5. "Files": upload box, file rows, "Download all".
  6. "Secure document links": explanation "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here. DELA never opens these links. When a link expires, turn off sharing in your own storage too."; add form (attorney); link rows.
  7. "Confidential messages": thread and composer.
  8. "Who can see this": people and add control.
  9. "Dispute review" (only during a team review).
  10. "A Lawfecta reviewer opened these materials N times."
  11. "Activity (N)" expandable log (attorney side).
- Interactive elements:
  - Upload box: file input (accepts .pdf .docx .xlsx .png .jpg .jpeg .txt .csv; `aria-label` "Choose a confidential file"); attorney only dropdown "Freelancer can open it for" with options "7 days", "14 days", "30 days" (server may send other choices; default 14); checkbox "This file contains no medical records, ID documents, account numbers, logins or biometric data."; "Upload" (blue, small). Progress "Uploading and checking <name>...". On a blocked file, a red alert and, when allowed, "Mark this job as sensitive" (ghost, small).
  - Sensitive job: uploads are replaced by "This job involves sensitive data, so files cannot be uploaded here. Use a secure document link below."
  - File row: name; " | <by>, <date> | View only | Not virus scanned | opened N times"; access line ("Open to you until <date>" / "Freelancer access until <date>" / "Freelancer access ended <date>. Deleted on <date>"). Buttons: "Open" (pdf, png, jpg; opens a viewer dialog); "Download" (other types, unless view only); managers: "Extend 14 days" and the toggle "View only" / "Allow download" (`aria-pressed`); "Delete" (red, small) which swaps the row to "Delete <name> for good?" with "Cancel" and "Yes, delete" (on-page confirm).
  - Viewer dialog (`confOpenFile`, 9474): title is the file name; "Watermarked: <text>"; PDF in a frame or image on a canvas with a diagonal watermark; footer "Download" (unless view only) and "Close".
  - "Download all" (ghost, small; managers): lists links, "Click each file to download it. These links work for N minutes." plus a note on view-only files left out.
  - Link form (attorney): "Label (optional)" (placeholder "Label, for example Medical records folder", max 80); "Secure link" (placeholder "Paste the sharing link from your storage"); dropdown "Link expires after" ("7 days", "14 days", "30 days"); "Add link" (blue, small).
  - Link row: label or "Secure link"; " | <host>, added by <name> | opened N times"; "Expires <date>" / "Expired <date>" / "Removed"; "Open link" (ghost, small; new tab); attorney "Remove" which swaps to "Remove this link? Also turn off sharing in your own storage." with "Cancel" and "Yes, remove".
  - Messages: text area (3 rows; placeholder "Write a confidential message. Never type a full Social Security, card or account number, or a password."); "Send" (blue, small).
  - People: "<name> (<role>)" with "Remove" (ghost, small; no confirm) where allowed; dropdown "Firm staff to add" and "Add to this job" (ghost, small).
  - Dispute review: "A Lawfecta reviewer is deciding a dispute on this job. The reviewer may open these materials only if both of you agree. If either of you declines, the reviewer decides from the rest of the record and anything you choose to share."; "Your answer: you agreed | you declined | not yet. The other person: agreed | declined | not yet."; buttons "I agree" and "I decline" (both ghost, small).
  - "Activity (N)": lines "<date time>: <who> uploaded | opened | downloaded | added the link | opened the link | removed the link | extended | deleted | deleted the messages <file>", "expired: the link", "deleted after access ended:", "A Lawfecta reviewer opened".
- States: empty "No files yet.", "No links yet.", "No messages yet.", "Nothing yet."; toasts and status "Uploaded", "Uploaded. Not virus scanned on the test site.", "Sent", "Removed", "Added", "Deleted", "Link removed", "Link added. It expires on <date>.", "Extended to <date>", "Extended, but the job has ended, so the freelancer's access stays closed.", "View only: the download button is gone", "Downloads allowed again", "Downloading <name>", "Marked as sensitive. Share the file with a secure link instead."; validation "Choose a file first.", "Paste the link first.", "Write a message first."; about 30 more error texts in `CONF_ERR` (file type, size, storage full, virus scan, password-protected PDF, link rules).
- Variations: freelancer cannot add links, set expiry, extend, set view only, download all, add people or see the activity log. After the job ends there is no upload, link form or composer.
- Mobile/accessibility: status line `aria-live="polite"`; upload errors `role="alert"`.
- UX observations (mine): two gates (emailed code, then promise) before any content. The area mixes four tools (files, links, messages, people) plus a log in one folded card. Removing a person has no confirm while deleting a file and removing a link do. "Open" and "Download" never show together for the same file type.

## 14. Dispute center: "Problems, disputes and canceling" (both)

- `disputeCard` (10039), `disputeCase` (10055), `disputeBox` (10064), `disputeOpenForm` (10162), `cancelPart` (10181). Inside "Disputes and cancellation". Title is the glossary term `dispute`. Used when the server says the dispute center is on; otherwise section 15.
- Purpose: open a dispute about a paid milestone, exchange statements, settle with an offer, or cancel the engagement.
- Layout: loading "Loading..."; intro when no disputes: "Talk it through in Messages first. If you cannot agree, open a dispute: the money for that milestone stays held while you settle it. You have N days to settle it yourselves, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator."; one box per dispute; "Open a dispute" (expandable) when none is open and status is active, signed or paused; "Cancel the engagement" (expandable) unless monthly, completed or canceled.
- Dispute box: bold "Dispute about milestone N. <title> ($X)" and a state badge; "Opened by the attorney|freelancer: <category>. They ask for $X to the freelancer and $Y back to the attorney."; date lines; the thread; "Links"; "Offers"; then actions.
  - State badge words: "Withdrawn"; "Settled by agreement"; "Granted: no answer"; "Decided by the Lawfecta Team"; "Lawfecta Team review"; "Lawfecta Team review: question open"; "Open: settle it yourselves"; "Open: waiting for an answer".
  - Date lines: "The other side answers by <date>." / "Give your side by <date>."; "If there is no answer, the request is granted on <date time>." / "Settle it yourselves by <date time>. After that the Lawfecta Team decides."; "The Lawfecta Team asked a question. Its clock waits for the answer." / "The Lawfecta Team decides by <date>. You can still settle it with an offer until then."; resolved: "$X went to the freelancer and $Y back to the attorney on <date>. The Lawfecta Team's note: ...".
  - Thread entries: "You | Attorney | Freelancer | Lawfecta Team" + kind ("Opened the dispute", "Answer", "Note", "Question from the Lawfecta Team", "Answer to the Lawfecta Team") + date time.
  - Offer rows: "Your offer | The <role>'s offer: $X to the freelancer, $Y back to the attorney (<note>)" with badge "Open", "Accepted", "Withdrawn", "Replaced", "Closed".
- Interactive elements:
  - "Accept the offer" (blue, small). Browser confirm pop-up: "Accept this offer? $X goes to the freelancer and $Y back to the attorney now. This settles the dispute." Toast "Settled. The money moves now."
  - "Withdraw my offer" (ghost, small). No confirm. Toast "Offer withdrawn."
  - Statement box: label "Answer the Lawfecta Team" / "Your side" / "Add a note" (3 rows) with the sensitive-data notice; button "Send my side" or "Send". Toast "Sent. Both of you can read it here."
  - Expandable "Settle it: send an offer": text "An offer splits the $X between the freelancer and the attorney. When the other side accepts, the dispute is settled and the money moves at once." plus "The attorney also gets back the same share of the Lawfecta fee paid on this milestone." or "The attorney's platform fee is not refunded."; "Amount to the freelancer ($)" (placeholder "0.00"; live text "and $Y back to the attorney"); "Note with the offer (optional)"; "Send the offer" (blue, small); "✦ Suggest a fair offer" (ghost, small); "✦ Summarize both sides" (ghost, small). AI output: "DELA is reading both sides..."; summary with "You seem to agree on: " and "Still open: "; or "Suggested: $X to the freelancer and $Y back to the attorney. <why>" with "Use suggestion" (ghost, small); footer "Used N DELA actions."
  - Expandable "Add a link": "Share a link from your own storage. Never upload sensitive data such as ID numbers, account numbers or health information."; "What the link is" (placeholder "For example: Delivery email"); "Secure link (https://)" (placeholder "Paste a link from your own storage"); "Add the link" (ghost, small). Toast "Link added."
  - "Withdraw the dispute" (ghost, small; opener only). Browser confirm pop-up: "Withdraw the dispute? The engagement goes on and the milestone goes back to normal." Toast "Withdrawn."
  - "Open a dispute" form: intro "The money for that milestone stays held. The other side has N days to answer. If they never answer, your request is granted after N days. You can settle it together with an offer at any time; otherwise the Lawfecta Team decides within N business days."; dropdown "Milestone" ("Choose", then "N. <title> ($X)" for funded, in progress, submitted, changes requested); dropdown "What went wrong" ("Choose"; attorney: "Not delivered", "Late", "Not what was agreed", "Quality", "Other"; freelancer: "Not what was agreed", "Payment or acceptance withheld", "Other"); dropdown "What you are asking for" (attorney: "A full refund of the milestone", "Part back, part to the freelancer"; freelancer: "The full milestone paid to me", "Part to me, part back to the attorney"); "Amount to the freelancer ($)" (only for a split); sensitive-data notice; "What happened" (3 rows); "Open the dispute" (ghost, small). No confirm. Toast "The dispute is open. The other side was asked to answer."
  - "Cancel the engagement" form: rule text ("Before work starts on the first milestone, the attorney is refunded in full, platform fee included. After that, a paid milestone not yet submitted is refunded, accepted milestones stay paid, and the attorney's platform fee is kept." or the per-milestone fee version, plus " A milestone under review cannot be canceled; open a dispute instead."); "Why" text box; "Cancel the engagement" (ghost, small). Browser confirm pop-up: "Cancel this engagement? This cannot be undone." Toast "Canceled. N paid milestones are refunded to the attorney."
- States: errors "Choose what went wrong."; "Choose what you are asking for."; "Choose the milestone."; "A dispute is about a paid milestone. This one is not paid, or it is already finished."; "The amount to the freelancer must be from zero up to the milestone amount."; "You cannot accept your own offer."; "That offer is no longer open. Look at the latest offer."; "A bank review of a payment on this engagement is open, so the dispute waits until it ends."; "Type the amount to the freelancer in dollars."
- UX observations (mine): the destructive buttons "Open the dispute" and "Cancel the engagement" are styled as small ghost buttons, the same as minor actions. Three browser pop-ups here (accept offer, withdraw dispute, cancel engagement) while the payment and accept steps use on-page confirmations. Opening a dispute has no confirm at all. Money always reads "to the freelancer / back to the attorney" even on agency engagements.

## 15. Older dispute card (both), when the dispute center is off

- `oldDisputeCard` (10190). Same title. Per dispute one line: "Open dispute: talk it through in Messages until <date time>, then the Lawfecta Team reviews it." / "The Lawfecta Team is reviewing the dispute." / "Decided: <note> ($X to the freelancer, $Y back to the attorney)" / "Withdrawn." plus " Reason given: <reason>". "Withdraw the dispute" (confirm pop-up "Withdraw the dispute? The engagement goes on."). Intro "Talk it through in Messages first. A dispute holds the money in question for 14 days while you try to settle it, then the Lawfecta Team decides. Lawfecta is not a court or an arbitrator." Expandable "Open a dispute": "Milestone" dropdown, "What is the problem" text area, "Open the dispute" (toast "The dispute is open. Both of you were told."). Expandable "Cancel the engagement" as in section 14 (not on monthly).

## 16. Engagements list card (both)

- `engagementsList` (10253). Attorney: on Projects with title "Engagements" (line 5114). Freelancer: on Work with title "Your engagements" (line 7630). Switch `engagements`. The card does not appear when there are none.
- Layout: card title "<title> (N)"; one clickable row per engagement: face, gig title, a line "Freelancer: <name> | $total | milestones accepted N of M" (attorney) or "Client: <name> | ... | paid to you $X" (freelancer); before signing " | milestones set when you both sign"; status badge at the right. When more than three are finished or canceled they fold under "Finished and canceled (N)".
- Interactive elements: each row (role button, tabindex 0) opens the engagement page; the "Finished and canceled (N)" toggle.
- UX observations (mine): rows have `role="button"` and `tabindex` but no key handler in this code, so Enter may not open them.

## 17. Earnings page (freelancer), tab `earnings`

- How to reach it: menu item "Earnings" (`?tab=earnings`); `earningsView` (10280). Freelancer side with switch `engagements` (line 12237). Home links "See my earnings", "View earnings", "Open Earnings".
- Purpose: see what was paid, set up payouts, and open each engagement.
- Layout: `h1` "Earnings"; key-values "Paid to you" ($ total) and "Engagements" (count); card "Payouts to your bank" (section 18, long form); card "Your engagements" with one clickable row per engagement ("Client: <name> | $total | milestones accepted N of M | paid to you $X" and a status badge).
- Interactive elements: each engagement row opens it on the Work tab; payout card buttons.
- States: "Loading..."; off: "Agreements are not open for your account yet."; empty: "No engagements yet. When an attorney chooses your proposal, the agreement and its milestones show here."; back from Stripe (`?payout=done` or `again`): notice "Stripe is checking your details. This card updates by itself in a few seconds." then, after about 32 seconds, "Stripe has not finished yet. Click "Check my payout status" below in a minute."
- UX observations (mine): the page has two totals only; no payout history, no pending or held amounts, no dates, no export. Engagement rows here have no face image while the same rows on Work do.

## 18. "Payouts to your bank" card (freelancer)

- `payoutCard` (10223). On Earnings (long form) and inside "Agreement and fees" on an engagement (short form, without the last line).
- Content: badge "Ready" / "Not set up" / "Needs details" and one sentence: "Not set up yet. Accepted milestones wait until you set up payouts."; "Stripe needs a few more details before it can pay you."; "Stripe has paused payouts until it gets more details."; "Ready. Accepted milestones are paid to your bank through Stripe." Optional "Stripe still needs: <list>". Long form adds "You enter your bank details on Stripe's secure page. DELA never sees them."
- Interactive elements: "Set up payouts with Stripe" or "Finish payout setup" (blue, small; leaves for Stripe; hidden when ready); "Check my payout status" (ghost, small; refreshes the card in place; toast "Payouts are ready." or "Checked with Stripe. Nothing has changed yet.").
- Errors stay on the card as a red alert: "Your account has no email address yet, and Stripe needs one to pay you. Sign out, sign in again on the Lawfecta site, and try once more."; "Stripe could not start payout setup right now. Nothing is wrong with your account, and the Lawfecta Team has been told. Please try again tomorrow."

## 19. "Closeout" card (both), completed engagements

- `closeoutCard` (10403). Key-values: "Milestones accepted" ("N of M"), "Paid for the work", "Paid out to the freelancer", "Still open" (count or "Nothing"). Text: "The conversation for this engagement is now read only. Everything stays readable here." No controls.

## 20. "Reviews" card on a completed engagement (both)

- `reviewPanel` (10416), `reviewForm` (10477), `ratingInputs` (10353), `reviewBlock` (10364). Switch `reviews` (the card removes itself when off). Loading "Loading reviews..."
- Layout:
  - Not yet written and still allowed: "How was working with the freelancer|the attorney? Your review publishes straight away, and <other> can post one response. It is never needed to get paid or to keep access. You can write it until <date>." then the form.
  - Written: heading "Your review of the freelancer|the attorney"; notices "Your review is with the Lawfecta Team for a quick check before it is published." or "Your review was not published or was removed by the Lawfecta Team." (+ " Your appeal is with the team." / " The decision stayed after your appeal."); the review block; the edit form when allowed.
  - Time over: "The time to write a review for this engagement is over."
  - "The review <other> wrote about you": the block, the response box, the report button.
  - Attorney with switch `bench`: heading "Your bench" and either "This freelancer is on your bench." / "Your bench invitation is waiting for their answer." or the invitation row (section 21).
  - Attorney with switch `auto_repeat_hiring`: heading "Work together again"; "A standing arrangement lets you hire this freelancer again in one click, inside limits you both sign once. They have to accept it."; "Propose a standing arrangement" (ghost, small).
- Review form: four star dropdowns, each with "Choose", "★★★★★ (5)", "★★★★☆ (4)", "★★★☆☆ (3)", "★★☆☆☆ (2)", "★☆☆☆☆ (1)". Questions about a freelancer: "Quality of the work", "Met the deadlines", "Communication", "Followed the document". About an attorney: "Clear instructions", "Timely review and feedback", "Fair requests for changes", "Communication". Dropdown "Would you hire them again?" / "Would you work with them again?" ("Choose", "Yes", "No"). Text area "Your review" (3 rows; hint "About the work only. No client information."). "✦ Help me write a review" (AI helper). Submit: "Publish my review" or "Save the change" (blue, small).
- Other controls: appeal text area "Appeal (once)" and "Send the appeal" (ghost, small); "Your public response (one)" text area (hint "Stay factual. Everyone who reads the review sees it.") with "Post the response" / "Save the response" (ghost, small); "Report this review" (ghost, small) which opens a browser prompt pop-up: "Why should the Lawfecta Team look at this review? Negative opinions stay up; only threats, harassment, client information, impersonation or payment outside Lawfecta are removed."
- Review block shows: "<by> | <month or date> | <practice area> | <state> | Edited"; the four ratings as stars; "Would hire again: yes|no" or "Would work with again: yes|no"; the text; "Response: ...".
- Toasts: "Review published. Thank you."; "Review updated."; "Your review is with the Lawfecta Team for a quick check before it is published."; "Appeal sent to the Lawfecta Team."; "Response published."; "Your response is with the Lawfecta Team for a quick check."; "Reported to the Lawfecta Team". Errors: "Choose a rating for every question."; "Choose yes or no for working together again."; "Write a few words."; "The time to edit this is over."; "You already appealed this decision."
- UX observations (mine): stars are chosen from dropdowns, not clicked. The report step uses a browser prompt, the only one in this range. Bench and standing-arrangement offers are appended inside the Reviews card, which mixes three purposes.

## 21. Reviews drawer and "Your reviews" on the Profile (both)

- `showReviews` (10387), `reviewsButton` (10397), `reviewsList` (10374), `profileReviewsCard` (10592). Switch `reviews`.
- Drawer: opened by a "Reviews" button (ghost, small) next to a person (bench rows, "From your bench" rows, other callers outside the range). Dialog with `aria-label` "Reviews", heading "Reviews: <name>", "Loading...".
- List content: "N reviews from completed Lawfecta engagements." (+ " Averages show after N reviews."); averages as key-values ("<question> X of 5", "Would hire again NN%" / "Would work with again NN%"); review blocks; "From past clients (outside Lawfecta)" with "Lawfecta confirmed the reviewer is an attorney, not the work itself. These are not counted in the numbers above."
- Profile card "Your reviews" (called from the Profile page, line 2521): "Only signed-in Lawfecta members can read reviews. You cannot remove a review, but you can post one response and report one that breaks the rules."; the same list; for freelancers with switch `past_client_reviews`, the box below.
- "Ask a past client for a review" (`pastClientsBox`, 10605): "For attorneys you worked for outside Lawfecta. DELA sends a short, neutral email; you cannot add a message, and there is no reward for reviewing. They confirm they are an attorney with their state and bar number. Up to N requests a month and M in total (used: A this month, B in total)."; text boxes "Their name" and "Their work email"; "Send the request" (blue, small); a list "<name> (<email>), <date>: Sent | Reviewed | Link expired | Asked not to be asked". Toast "Request sent to <email>." Errors: "Check the email address."; "Type their name."; "Ask someone else: you cannot review yourself."; "This person asked not to get review requests."; "You asked this person recently. You can ask again after N days."; "You reached the limit of N requests this month|in total."
- Off state: "Reviews are not open for your account yet."

## 22. The bench (attorney) and "Benches" (freelancer)

- Attorney bench view: `benchView` (10510). Reached from the Talent page in bench mode (`talentMode === "bench"`, line 7040; a Home tile also opens it, line 999). Switch `bench`.
  - Loading "Loading your bench..."; off "The bench is not open for your account yet."
  - Card "DELA suggests from your bench": per suggestion the name and "For the gig "<title>": <reason>" or "For the document "<title>": <reason>"; buttons "Invite to this gig" (blue, small; toast "Invited <name>"), "Snooze 30 days" (ghost, small; "Snoozed for 30 days."), "Dismiss" (ghost, small).
  - Card "My bench (N)" and, with a firm bench, "Firm bench (N)" ("Shared with your firm's staff. Owners and managers add and remove people."). Empty: "Nobody yet. After a completed engagement, or from a Talent search, click "Invite to my bench"." / "Nobody on the firm bench yet." Per person: name; badge "Invitation sent" / "Available" / "Not available now"; headline; "N reviews, X of 5" or "No reviews yet" | "Last worked together <date>" | "N hours a week"; buttons "Message" (blue, small; opens the Inbox thread), "Reviews" (ghost, small), "Remove" (ghost, small; managers; browser confirm pop-up "Remove <name> from the bench? Your bench conversation closes; past work records stay."; toast "Removed.").
  - Checkbox at the bottom: "Email me a weekly summary of bench suggestions (Mondays)." (toast "Saved").
- Invitation row (`benchInviteRow`, 10500), on a completed engagement and elsewhere: "Your bench is your list of freelancers you trust. Accepting opens an ongoing conversation; it does not share files, create a contract or allow spending."; text box (placeholder "A short note (optional)"); "Invite to my bench" (blue, small). Toasts "Invitation sent." / "Already invited." Errors "A firm bench comes with the Business plan."; "Only the firm owner or a manager can add to the firm bench."
- Freelancer card "Benches (N)" (`benchFreelancerCard`, 10556), inserted near the top of the Work page: "An attorney's trusted list. Being on a bench opens an ongoing conversation; it is not a contract and not a promise of work. You can leave any time." Per row: face, attorney name, "Invited you to their [firm's ]bench: <note>" or "You are on their [firm's ]bench"; buttons "Accept" (blue, small; "You joined the bench. Your bench conversation is in the Inbox."), "Decline" (ghost, small; "Declined."), "Message" (blue, small), "Leave" (ghost, small; browser confirm pop-up "Leave this bench? The bench conversation closes. Your past work and payments stay."; "You left the bench.").
- "From your bench" card on a gig's Matches view (`gigBenchCard`, 10576; attorney; not on draft gigs): "Invite people you trust first. An invited proposal does not use their monthly allowance."; per person: name (+ " (firm bench)"), a reason when they cannot be invited ("not available right now", "does not work for this state", "no longer a freelancer", "cannot be invited now"), "Reviews", and "Invite" / "Invited" (blue, small; disabled when invited, blocked, or the gig is not open).
- UX observations (mine): the bench has no search, sort or filter. Two "Message" and "Accept" buttons are both blue in one row on the freelancer card.

## 23. "Write a review" public page for a past client (no login)

- `pastReviewPage` (10688). Opened from an emailed link with `?past_review=<token>` (line 12892). No Lawfecta login; only the brand bar above it.
- Layout: `h1` "Write a review"; "<freelancer> asked you for a short, honest review of work they did for you outside Lawfecta. (<headline>)"; "There is no reward for reviewing, and you can say no. Your review shows on their Lawfecta profile in a section for past clients, with your name and state, to signed-in Lawfecta members only. No client information."; one card with the form.
- Interactive elements: "Your name"; "License state" (2 letters); "Bar number"; four star dropdowns (the freelancer questions); "Would you hire them again?" ("Choose", "Yes", "No"); "Your review" (4 rows); checkbox "I am a licensed attorney, this is my own honest opinion of work done for me, and I was not offered anything for it."; "Send my review" (blue); "Do not ask me again" (ghost; browser confirm pop-up "Stop all review requests to your email address?").
- States: "Loading..."; after sending `h1` "Thank you" with "Your review is published on <freelancer>'s profile." or "Your review is with the Lawfecta Team for a quick check before it shows."; after opting out `h1` "Done" with "You will not get review requests from Lawfecta again."; errors "This link is not valid."; "This link has expired."; "Thank you. This review was already sent."; "Use the two-letter state of your license, for example TX."; "Check your bar number (letters, numbers and dashes)."; "Tick the box to confirm."

---

The sections below are in the assigned line range but outside the engagement topic.

## 24. "Webhooks" card (both)

- `webhooksCard` (10627). Called from the AI settings page (line 2292, in a container named `adv`; its heading is outside my range). Switch `member_webhooks`.
- Layout: "Webhooks"; explanation "Send DELA events to your own tools (for example Zapier, Make or your own server). Each notice holds only an ID, the state, the time and a link back to DELA that needs your login: never document text, messages, files, card, bank or identity details. Each notice is signed so your system can check it came from DELA. Your plan allows N endpoints."; one box per endpoint; "Add an endpoint" (expandable; open when there are none).
- Endpoint box: address; badge "Active" / "Over your plan's limit: not sending" / "Paused" / "Paused after N failed deliveries"; "Signing secret ending XXXX | <event words>"; "Last problem: ..."; buttons "Send a test" (blue, small; active only), "Pause" / "Resume", "Change the secret", "Delete" (browser confirm pop-up "Delete this endpoint? Notices waiting for it are canceled."); expandable "Recent deliveries" with "Send again" on failed ones.
- Add form: "Address" (placeholder "Your https address"; hint "It must start with https://. DELA does not send to private network addresses."); one checkbox per event in two columns; "Add the endpoint" (blue, small).
- Event words: "A document is approved", "A gig is posted", "A gig closes", "A new proposal", "Your proposal is chosen", "A new match", "An invitation to a gig", "A meeting is booked", "A meeting is canceled", "An agreement is signed", "A milestone is paid", "A milestone is submitted", "A milestone is accepted", "Changes are requested", "A payout is sent", "A dispute is opened", "A dispute is decided", "A bench invitation", "Someone joins your bench", "A new review about you", "Test notice".
- Drawer "Your signing secret": "Copy it now and store it in your own system. DELA will not show it again."; a read-only box; a technical note on the signature header; "Copy" (blue, small; toast "Copied").
- Toasts: "Test notice delivered (code)."; "The test notice did not arrive: ... DELA tries again later."; "Paused"; "Resumed"; "Deleted"; "Sending again". Errors: "Use an address that starts with https://"; "That address points inside a private network, so DELA cannot send to it."; "Choose at least one event."; "Your plan allows N endpoints."

## 25. "Your firm profile for documents" (attorney)

- `firmProfileForm` (10737). Shown the first time "New document" is opened (before the firm profile is saved); also reused elsewhere.
- Layout: card title; "DELA uses these facts in every document, so you enter them once. Roles, never people's names, go in documents; who holds each role gets its review reminders."; read-only notice for non-managers "Only the firm owner or a manager can change the firm profile."
- Interactive elements: "Describe your firm (optional)" text area (placeholder "For example: three attorneys doing family law in Texas state courts; we use Clio and Microsoft 365"; hint "A sentence or two. DELA fills in the boxes below from it; you check them and save.") with "✦ Help me describe my firm"; "Firm size" dropdown ("Choose", "Solo", "2 to 5", "6 to 20", "21+"); "Practice areas" (placeholder "For example: Family law, Estate planning"); "Jurisdictions" (placeholder "States and federal courts you use, for example: Texas state courts; N.D. Tex."); heading "Team roles": per role a checkbox, the role name, a dropdown ("Nobody yet", each team member, "An email address"), an email box, badge "No one assigned"; "Add a custom role" text box, kind dropdown ("Staff", "Attorney", "Freelancer") and "Add" (ghost, small); heading "Systems you use": one box per system group (placeholder "Names, separated by commas"); "Save and continue" or "Save the firm profile" (blue).
- Toasts: "Saved"; "Saved. No one holds: <roles>. Reminders for their documents go to the firm owner." Errors: "Choose your firm size."; "Keep at least one attorney role."; "That person is not in your firm. Choose a firm member or type an email."

## 26. "New document" (attorney), Library

- `newDocument` (10800), `wsWhat` (10817), `pickWhat` (10853), `questionsForm` (10872).
- Layout: "← Library" (ghost, small); `h1` "New document"; then one of three steps.
- Step A, "What would you like to document?" (when the library is a workspace): "Describe it in a sentence, the way you would explain it to a new team member."; sensitive-data notice; text area (placeholder "For example: how we check for conflicts before accepting a new client"); "Next" (blue); link-style "I know which type I want". Result card "DELA suggests: <type>" with the reason, "It matches a common process, "<title>", so DELA starts from it.", "Category: <group>."; buttons "Use this" (blue) and "Choose another type" (ghost; reveals buttons for the other types: SOP, Workflow, Playbook, Policy, labels from the server). Toast "Describe what you would like to document first."
- Step B, type picker: "Pick what to build. Each type has its own job: the policy sets the rules, the workflow shows the map, each box on the map gets an SOP, and the playbook covers the forks in the road."; four clickable tiles (SOP, Workflow, Playbook, Policy; label, one line, "For example: ..."); `h2` "Or start from a common process"; one expandable group per lifecycle stage "<prefix> | <label> (N)" with rows: type badge ("Policy", "Workflow", "SOP", "Playbook"), title (+ " (reviewed every 3 months)"), "Start" (blue, small).
- Step C, "About this process": line "<Type>: <one line>" with "Change" (ghost, small); "Only the name is needed. Anything you skip shows in the quality panel, so you can add it later."; fields "Process name", "What starts it", "What done looks like", "Which roles touch it" (checkboxes from the firm profile), "Which systems it uses" (checkboxes), "Any deadline or time target" (placeholder "For example: within 1 business day of the request"; hint "Use your own service level. For a court rule or statute, DELA adds a field for the rule's link and a date to verify it."), "Steps you must personally decide or approve", "What goes wrong today (optional)"; expandable "Rewrite something you already have (optional)" or "What you described, and anything you already have (optional)" with a text area (placeholder "DELA removes client names, case numbers, passwords and account numbers before drafting.") and "Use a file from your Files" (ghost, small; lists up to 30 ready files as checkboxes; empty "No ready files. Upload on the Files page first."); "Draft it with DELA" (blue) with status "DELA is drafting to your firm's standard and checking its own work. This takes about a minute."
- States: "Give the process a name."; plan limit opens the limit pop-up.

## 27. Library index table (attorney)

- `docIndex` (10934). The Library list as one table with band rows per lifecycle group ("<prefix> | <label> (N)"; older items under "Waiting for the document standard").
- Columns: "Document" (title, ID or "No ID yet", "🔒 Upgrade to edit this document.", "Imported: review required"), "Type" ("Policy", "Workflow", "SOP", "Playbook", "Older playbook"), "Owner (role)" (or "Not assigned"), "Status" (badge, words from `PB_STATUS`, outside range), "Next review" (date + " (due)" or "Not scheduled"), "Review" (cell from `reviewCell`, outside range).
- Rows are clickable and open on Enter. Mobile: class `stack` with `data-label`, inside a scroll wrapper.

## 28. "Freelancers who fit this work" card (attorney), on a document

- `fitsCard` (10992). On a document page when switch `talent_search` is on and the member can hire.
- "Looking..."; "DELA matched this document's practice area and the tools its steps name with match-ready freelancers. Start a chat to ask about fit, or turn the document into a gig and invite them. Nobody is hired here."; per person: avatar, name, fit badge (for example "Good fit"), headline, trust line, "Why: ..."; "View profile" (ghost, small); "Start a chat" (blue, small; attorney). Empty: "No match-ready freelancer fits this document yet. Search Talent for a wider look." with "Search Talent" (ghost, small). Error texts: "The suggestions could not be loaded for this document (<reason>)."; "The suggestions could not be loaded right now (<error>). Search Talent instead."

## 29. "✦ Automate or delegate" card (attorney), on an approved document

- `automateCard` (11011). Switch `automate_delegate`; approved documents that are not policies; the member must be allowed to run it.
- Before a review: "DELA can find steps in this document to automate or hand to a freelancer."; optional "The last review was for an older version. This approved version needs its own review."; dropdown "How often does this run?" ("Choose (optional)", "Daily", "Weekly", "Monthly", "Quarterly"); number box "How long does it take each time?" (placeholder "Minutes (optional)"; hint "In minutes. Leave both empty and DELA estimates."); "✦ Find what to automate or delegate" (blue; reads "DELA is reviewing the steps..." while running); link "Dismiss"; "Each review uses your DELA actions (or your own AI key) once for this approved version."
- After a review: "DELA reviewed version N. Time saved is estimated by DELA (weekly, about N minutes each time). Add your own numbers for a better estimate." or "...Time saved uses your answers."; the same two boxes with "Update time saved" (ghost, small); summary "N ideas | M already delegated"; or "DELA found nothing to automate or delegate in this version."
- Per idea: badge "Delegate" or "Automate"; title; badge "Lawfecta partner"; "Steps N to M. <why>"; "Estimated time saved: about N hours a month (estimated by DELA | from your numbers)"; "Tool: <tool>. Already in your firm profile. ..." or "Skills: ...". Buttons: "Delegate these steps" (blue, small); or "Add this tool to the steps" (ghost, small) and "Hire a freelancer to set it up" (ghost, small). Already delegated: badge "Setup task started" / "Delegation started" / "Gig drafted" / "Gig posted" / "Gig <status>" with "View gig" or "Open the setup task" / "Open the delegation".
- List of delegations at the bottom with "Open the delegation" / "Open the setup task" / "Open below".
- Messages: "DELA found N to look at."; "Time saved updated."; "Those steps already use <tool>."; "Steps N now use <tool>. That is a new version of the document: approve it to use it."; errors from `AUTO_ERR`.

## 30. Delegation panel: five numbered steps (attorney)

- `delegatePanel` (11108). Opens inside the Automate card. Title "Delegate: <title>" or "Hire a freelancer to set it up: <title>"; "Close" (ghost, small); "Your progress is saved. You can stop and come back from this card." The current step has a colored border.
  1. "1. Confirm which steps to delegate": one checkbox per step (locked ones read "(Attorney decides: stays with the attorney)" or "(Needs legal judgment: stays with the attorney)"); "Save the steps" (ghost, small). Setup tasks show a sentence instead.
  2. "2. The SOP for just this task": "Draft the SOP for these steps" (blue, small) or "Open the SOP" (ghost, small); status sentence.
  3. "3. Metrics and KPIs": "These become the SOP's quality check and the rubric DELA's milestone check scores the gig against. No client information."; "Turnaround (business days)" (1 to 90); "Accuracy target (%)" (50 to 100); "Quality checklist, one per line"; "What done means"; "Save the KPIs" (ghost, small). Locked once the SOP is approved.
  4. "4. DELA's self-check and your approval": "DELA's self-check passes." or "DELA's self-check found N things to fix. Open the SOP to fix them."; "Approve the SOP" (blue, small); or "An attorney approves the SOP and posts the gig."
  5. "5. The gig": suggested budget sentences and the platform fee sentence; "Budget from ($)", "Budget to ($)", "Deadline" (date); "Draft the gig" (blue, small; reads "DELA is writing the public version..."); "The gig page opens. Check the public version there, then click "Post the gig"."; or "Open the gig" (blue, small).
  - "Stop delegating these steps" (ghost, small; no confirm).

## 31. "Get set up" home card (attorney)

- `setupHomeCard` (11217). On Home until finished or dismissed. Title "Get set up: N of M done"; link "Dismiss"; a progress bar; "Continue setting up" (blue, small; opens tab `setup`). The six step names (`SETUP_STEPS`): "Your profile and verification", "Teach DELA about your firm", "Your first document", "✦ Find what to automate or delegate", "Post your first gig", "Invite freelancers". The setup page itself starts at line 11228 and is outside this range.

---

## Cross-page elements seen

- Card status line (`cardStatus` / `cardSay`): the last answer stays on the card for 10 minutes and also shows as a toast. Confidential materials has its own version (2 minutes).
- Toasts through `D.toast`; page reload with a toast through `engReload`.
- Three confirmation patterns in one area: on-page review boxes (payment review, accept milestone), in-row swaps ("Yes, delete", "Yes, remove", "Yes, cancel at month end"), and browser pop-ups (confirm: human review, accept offer, withdraw dispute, cancel engagement, remove from bench, leave bench, delete webhook endpoint, stop review requests; prompt: report a review).
- Badges with tones "ready" (green), "held", "bad" (red), "off", "R", "C".
- Shared status word maps: agreement, milestone, submission, payment ("Waiting for you", "Being confirmed", "Paid", "Did not go through", "Canceled"), payout ("Ready", "Not set up", "Needs details"), dispute, offer.
- AI helper buttons, always marked "✦": "✦ Check this for me", "✦ Improve acceptance criteria", "✦ Check monthly scope", "✦ Help me write a review", "✦ Suggest a fair offer", "✦ Summarize both sides", "✦ Help me describe my firm", "✦ Find what to automate or delegate".
- Sensitive-data notice (`aiNotice`) and the repeated no-sensitive-data tick box on every upload.
- Glossary terms (`D.term`): "Confidential materials", "Subcontractors", "Milestones", "Fees", "Next billing", "Problems, disputes and canceling".
- Help tips (`pjTip` / `D.helpTip`) on folded sections, fee lines, "Paid to date", "Milestone progress", "Review payment".
- Tables with class `stack` and `data-label` cells that turn into cards on a phone.
- Native `<details>` folds inside cards, next to the custom folded sections of step 43 (two fold styles on one page).
- Button styles: `blue` (primary), `ghost` (secondary), `danger` (red), `linkish` (text link), with `small` for most in-card actions.
- Fee naming: "Platform fee", "Lawfecta fee", "Attorney platform fee", "the platform fee" all refer to the attorney's fee.
- The other party is named "freelancer", "attorney", "agency", "client", "the other person" or "the other side" depending on the card.
