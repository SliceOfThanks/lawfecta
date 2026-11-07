# Feature brief: UX retest fixes and the Library workspace

Step: 8b   Spec references: ChatGPT's attorney UX retest (2026-11-06, docs/reviews/ux-retest-2026-11-07/DELA-attorney-ux-retest.txt), its Library design notes and mockup (library-design-brief.txt, library-second-pass.png), the first review's brief (docs/briefs/step-8-ux-review.md)
Status: answered by Stacey 2026-11-07 ("all as suggested"). Part A built and checked (11 of 12, the failure fixed). Part B revised from Stacey's own Library brief (2026-11-07); B1 to B10 answered "all as suggested" the same day. Building Part B.

## Where things stand
ChatGPT looked at the attorney side again (look only, nothing saved). Of the 33 findings from the first review:
- 9 are fixed: costs and totals, file names, Talent, the Inbox, own AI keys, the gig budget estimate, the agreement total, the monthly total, empty matches.
- 22 are partly fixed.
- 2 are still open: the LawWurk login page (in Brilliant Directories) and the AI memory and webhook settings.

It adds 12 new priorities (R01 to R12) and a set of small follow-ups. You also said the Library still does not work for you, so this brief treats the Library as a redesign, not a tidy-up.

Claude checked each finding against the code and the test site before writing this:
- **R01 (monthly dates) is a real defect.** The signed agreement says week 1 to week 4 are due Nov 13, Nov 20, Nov 27 and Dec 4. The working milestone records, made when month 1 was paid, say Nov 12, Nov 19, Nov 27 and Dec 7. Week 4 then falls after the paid month ends (Dec 5).
- **R04 (Library counts) is a real defect.** The Library's "2 suggestions" counts the quality check's advice items. The document's "Suggestions" tab lists AI-proposed edits waiting to be accepted. Two different things share one word.
- **R02 (Notices vs Projects) is real.** Notices decides "Needs your action" from the kind of notice it received. Projects decides from the live work. So Notices can say "Nothing waits on you right now" while Projects shows a signature waiting.
- **R11 (Home counts) is partly Claude's own wording.** "Open gigs" on Home counts drafts too, because the new count added in 0.9.1 includes them.

## Who
Attorneys first (the review was of the attorney side), with the same patterns carried to freelancers and agencies where the screen is shared: booking, notices, profile, monthly work.

## What

### Part A: defects (each a "Fix" commit with a test that fails before)
1. **Monthly dates and scope agree (R01).**
   - The signed agreement's dates govern. Working milestones copy them, and every weekly unit falls inside the paid month.
   - Where a date really must move (for example a holiday rule), the card says "Moved from Nov 13" and why.
   - The agreement's "Not included" shows the monthly terms' exclusions instead of "Not specified".
2. **Notices agree with Projects (R02).** "Needs your action" is worked out from the same live list Projects uses:
   - signatures waiting
   - proposals to review
   - deliveries to review
   - payments due

   When nothing is waiting, it says so and links to Projects. Drafts are not "action".
3. **Library counts say what they count (R04).**
   - "2 quality notes" opens the quality check on that version.
   - "2 suggested edits" opens the Suggestions tab.
   - Each count opens exactly what it counts. A zero never contradicts the label you clicked.
4. **Comments point to a real place (R07).**
   - On an approved document, Comments says "To comment, start a new draft" with that button.
   - Old documents with no ID, approval date or review date show "Not recorded" and a way to fix it. Nothing is made up.
   - The automation card's generic "Continue" names where it goes.
5. **Home counts reconcile (R11).**
   - "Open gigs" counts posted gigs only, with drafts in their own tile.
   - The Library's saved-documents number and Home's come from the same plan limit.
   - The Profile's old "When hiring opens" wording is replaced with what is true on the test site.
6. **Proposal and agreement wording (R10).**
   - The schedule shows one duration ("10 days from signing"), not "10 days (10 days)".
   - The party summary names the agency and its lead.
   - A pending monthly change shows current and proposed side by side: quantity, price with fee, start date.

### Part B (revised 2026-11-07): the plain-language Library
Stacey sent her own Library brief and mockup on 2026-11-07 (docs/reviews/library-redesign-2026-11-07). They replace the sidebar and detail panel plan. Part B is built from her brief, behind the switch `library_workspace`, and stays a proposal until she has reviewed it on the test site (her last acceptance criterion).

**What the page shows**
- "Library", with the line "Your firm's processes and policies, all in one place."
- A wide "Find a document" box right under the heading. It searches titles, purposes and IDs (so "INT-03" still works).
- "Create a document" (blue) and "Import" (secondary) at the top right.
- Category buttons in plain words, then a "Status" choice: All, Ready to use, Draft, Needs your review.
- Two columns of cards on a computer, one column on a phone, each card in the same order: title, one purpose sentence, status, one action.
- At the bottom: "Recordings" and "Recently deleted" links (archived documents included there), then the "Not sure where to start?" panel with "✦ Help me create a document".
- No document IDs, types, owners, versions or review dates on the cards. They stay inside each document.
- Coming back from a document keeps the search, the category, the status and the scroll position.

**How DELA's data becomes each card**

| On the card | Comes from | When it is missing |
|---|---|---|
| Title | The document's title, as written. Nothing is shortened automatically (question B7) | Never missing |
| Purpose sentence | The first sentence of the document's "Purpose" section, up to about 120 characters | Older documents: the first step instead; otherwise nothing |
| Category | The document's lifecycle group, in plain words (question B3) | "Not grouped yet" |
| Status and action | See the next table | |
| Search | Title, purpose, ID and category words | |

| Status | When | Action button |
|---|---|---|
| Ready to use | An approved version is in use, and nothing below applies | "Open document" (opens the approved version) |
| Draft | Never approved, or a new draft of an approved document is open and not yet sent for approval | "Continue draft" |
| Needs your review | Imported and not reviewed yet | "Review imported document" |
| Needs your review | Waiting for this person's approval (sent for review) | "Review and approve" |
| Needs your review | Its review date has passed | "Review now" (with "Review overdue since (date)") |
| Needs your review | Items marked "Required before approval" are open on a draft | "Fix required items" |

- An approved document with a new draft open still shows "Ready to use", with one quiet line: "A new draft is in progress."
- Quality notes (optional advice) are not on the card. They stay inside the document, so an approved document never looks unusable because of wording suggestions.
- "Ready to use" has a small ⓘ: "Approved by your firm. DELA checks how it is written, not whether it is legally correct."

**Creating a document**
- "Create a document" opens one box first: "What would you like to document?"
- DELA suggests the structure in plain words, for example "This sounds like a step-by-step procedure (SOP): one routine task done the same way each time". The person can pick another type before the questions start.
- "✦ Help me create a document" in the panel at the bottom does the same, with DELA drafting the whole document from the answers. The draft is always editable and is never the working version until someone approves it, as today. It uses DELA actions as today.
- The notice beside the writing box follows the sensitive data rule (question B2).

**Kept from today**
- Today's table stays available as a choice (question B6).
- The quality notes, suggested edits and Approved version pages from Part A.

### Part C: layout and wording
1. **Booking (R05).**
   - A date picker first, then the times for that one date: 8 at first, then "Show more times".
   - The viewer's own time zone is named next to the times ("Pacific Time"), with the length and the full selected date above.
   - Each time button's name includes the date, for screen readers.
   - This replaces today's 14 days of times at once.
2. **The notice beside every AI box (R06).** See question 6: ChatGPT's wording conflicts with your rule, so the brief keeps your rule.
   - The Talent "Describe the task" box gets the notice too.
   - In AI boxes the notice says to keep sensitive data in your own storage, without "share a link", because links should not go to the AI either.
3. **Standing arrangements (R08).**
   - Show "$100 left this month" and "0 open-job places left" next to "Hire again".
   - Say that the cap counts the job price and the platform fee is added to each charge (question 9).
   - When nothing is left, the button is replaced by the reason and "Review limits".
   - Ended arrangements move to a "Past arrangements" list.
4. **Profile (R09).**
   - The firm essentials (billing, signer, notices email) come first, with anything missing listed at the top.
   - The biography and the long practice area list are folded closed until opened.
   - Selected practice areas show first, with a search box.
5. **AI settings and Connect (R12).**
   - Each remembered fact shows where it came from and the date, with what removing it does.
   - Webhooks fold closed under "Advanced".
   - Connect gets a "What leaves DELA" part: content ChatGPT or Claude reads is processed by them, and disconnecting cannot recall what was already read.
6. **Small follow-ups.**
   - The milestone tooltip becomes "A portion of work with its own price, due date and review. Funds are released after acceptance."
   - The meeting attendance answer starts with no choice selected ("Choose what happened").
   - One word for the AI allowance everywhere: "DELA actions".

### Part D: outside DELA (Stacey, in Brilliant Directories)
- The login page still says "Welcome To LawWurk" (H01). Claude writes the exact Brilliant Directories steps when you are ready.

## Where
Library, document pages, Projects, Notices, Home, monthly engagements, agreements, proposals, booking (Inbox), Profile, AI settings, Connect, Talent. Shared screens change on the freelancer side too.

## When
Part A first (defects), then Part B (Library), then Part C. A short ChatGPT check after each part.

## Why
Attorneys need to trust what a page tells them. A schedule with two dates, a count that opens an empty list, or "nothing waits on you" while a signature waits each make the attorney recheck everything. The Library is the daily entry point for approved procedures; if it reads like a spreadsheet, people stop using it.

## How it could go wrong
- **Changing the monthly dates on active work.** Existing records are corrected only where they differ from the signed version. Each correction is a new audit record, and both people get a notice. Nothing paid changes.
- **Notices that recompute live** could be slower. The live list is already loaded for Projects, so it is reused.
- **The Library redesign hides something people use.** The table view stays as a choice, and every action in today's rows stays one click away in the detail panel.
- **Phone layout.** Claude's browser tests check 390 and 320 pixel widths for every changed page (agent tests stay desktop only).
- **Dark mode.** Every new style gets its dark colors and the contrast check.

## Settings and switches it uses
- No new business numbers. Booking's "first 8 times" and the Library's page size are screen choices, listed in decisions.json as proposed (O) so you can change them.
- A switch `library_workspace` (access list on the test site, off on Live until tested) keeps today's Library until the new one passes its tests.
- The monthly date correction runs once as a migration, with an audit record for each change.

## Questions to make it better
Each has a suggested answer. Reply "all as suggested" or change any of them.

1. **Library layout.** Suggested: the workspace (sidebar, title-first rows, detail panel) is the default, with a "Table view" choice that DELA remembers per person.
2. **Library wording.** Suggested:
   - heading "Your firm's documents"
   - the line "Find the process. Check what needs attention. Put it to work."
   - "quality notes" for the check's advice, and "suggested edits" for AI-proposed changes
3. **Monthly dates.** Suggested:
   - The signed dates govern, and every weekly unit falls inside the paid month.
   - A moved date shows "Moved from (date)" with the reason.
   - The one test-site engagement with different dates is corrected, with an audit record and a notice to both people.
4. **Notices.** Suggested: "Needs your action" comes from the same live list as Projects (signatures, proposals and deliveries to review, payments due). Drafts are not action. When nothing is waiting, a link to Projects.
5. **Booking.** Suggested: pick a date first, then that date's times, 8 at first, with your time zone named. The same on the freelancer side.
6. **The notice beside AI boxes.** ChatGPT suggested "Use placeholders for client names", which conflicts with your 2026-11-05 rule. Suggested:
   - keep your rule
   - AI boxes say "Never enter sensitive data (SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, logins and passwords). Keep it in your own storage."
   - upload and sharing areas keep "Share a link from your own storage instead"
   - Talent's task box gets the notice
7. **Profile.** Suggested:
   - the firm essentials first, with what is missing at the top
   - the biography and practice areas folded closed until opened
   - a before-and-after preview of the directory listing comes later, because it needs the listing read from Brilliant Directories
8. **Home counts.** Suggested: "Open gigs" counts posted gigs, and a separate "Drafts" tile counts drafts.
9. **Standing arrangements.** Today the monthly cap counts the job price only; the platform fee is charged on top. Suggested:
   - keep that rule, and say it next to "Hire again": "The cap counts the job price. Lawfecta's platform fee is added to each charge."
   - show what is left of the cap and open-job places next to "Hire again"
   - put ended arrangements in a "Past arrangements" list
   - If you would rather the cap include the fee, say so and it changes in the database rule too.
10. **Order and checks.** Suggested: Part A, then Part B, then Part C, each with a short ChatGPT check. After Part C, the same look-only attorney review again to compare.

### Questions about the revised Library (Part B)
Each has a suggested answer. Reply "all as suggested" or change any of them.

- **B1. The word on buttons and cards.** Your mockup says "procedure" ("Create a procedure", "Open procedure"), while your brief says "document". A policy is not a procedure. Suggested: "document" everywhere ("Find a document", "Create a document", "Open document").
- **B2. The reminder under "Help me create a document".** The mockup says "Use placeholders. No sensitive client information." That conflicts with your 2026-11-05 rule. Suggested: "Never enter sensitive data (SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, logins and passwords)."
- **B3. Categories.** DELA has seven groups; your brief names five. Suggested plain names for all seven, showing only those that have documents:
  - Client intake
  - Client onboarding
  - Matter management
  - Documents and filing
  - Billing
  - Closing a matter
  - Firm administration
- **B4. A document with no purpose written.** Suggested: the card shows its first step instead. If there is nothing, editors see a quiet "Add a purpose" link.
- **B5. The status rules.** Suggested: the two tables above, including "Ready to use" staying on an approved document while a new draft is in progress.
- **B6. Today's table.** Your earlier answer kept a "Table view" choice; your new brief replaces the table. Suggested: keep a small "Show as a table" link at the bottom, remembered per person, for firms comparing many documents. Cards are always the default.
- **B7. Short titles.** Suggested: no automatic shortening. Documents keep one title. Shorter names come from editing the title, which is recorded in the change log like any edit.
- **B8. Creating a document.** Suggested: build "What would you like to document?" with DELA's suggested structure as part of Part B, replacing today's four type cards as the first screen. The type cards stay one click away for people who know what they want.
- **B9. Team settings.** Today the Library shows team and library settings near the top. Suggested: move them under a "Library settings" link next to "Import", for owners and managers only.
- **B10. Review before it counts as done.** Suggested: when Part B is on the test site, you look at it on your computer and phone first. I adjust from your notes, then write the ChatGPT check.

## Success looks like
- Claude's tests: a test that fails before each Part A fix; browser checks at desktop, 390 and 320 pixels for the Library, booking and profile; the dark contrast check on every changed page.
- ChatGPT checks, grouped by login:
  - **Attorney:**
    - the monthly page shows one set of dates matching the agreement
    - Notices and Projects agree
    - "2 quality notes" opens two notes
    - the Library workspace: search, sidebar, the detail panel and back to the same place
    - booking with one date's times
    - the profile's essentials first
  - **Freelancer:** booking, the monthly page, and Notices.
  - **Owner:** the `library_workspace` switch.
- After Part C: the full look-only attorney review again, compared with this retest.
