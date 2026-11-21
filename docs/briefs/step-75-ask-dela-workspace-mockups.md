# Feature brief: DELA rebuilt to the ten workflow mockups

Step: 75 (four releases: 75a to 75d)   Spec references: the ten mockups in docs/handoff/dela-build-handoff/source/mockups, the build handoff beside them, docs/handoff/dela-build-handoff/GAP-MAP.md, steps 44 to 48 and 55 to 60
Status: plan written in acceleration mode. Stacey 2026-11-20, with the ten mockups attached again: "the ux/ui for dela does not match the mockups - this needs to be done end to end and structured."

## What is wrong today
The work of steps 45 to 60 put the mockups' functions into the pages DELA already had: a card on a document, a panel in the Library, a step in "Post a New Gig". Each function exists, but none of the ten screens exists as the mockups draw it. A member cannot walk from screen 1 to screen 10, because there is no such path: the pieces sit in four different menus.

The mockups draw one place, the Ask DELA workspace, with its own second menu, and ten pages that share one skeleton. This step builds that place.

## The skeleton every page shares (from the mockups)
- The top bar reads "Ask DELA / <page name>".
- A large page title, one grey sentence under it, and the page's own button or state tag at the far right.
- A main column of white cards and a right column of smaller cards. On a narrow screen the right column goes under the main one.
- Small rounded state tags in four colors: green (approved, selected, included), yellow (pending, proposed, missing, needs decision), blue (referenced, source, in review), grey outline (excluded, not shared, unverified), and red for blocked.
- A light blue note with an "i" at the bottom of the right column, for the rule that protects the member on that page.
- One dark red main button per page. Other buttons are outlined.
- The workspace's second menu, "DELA WORKSPACE": "Chat with DELA", "My playbooks", "Delegation opportunities", "Gig drafts", "DELA instructions". Under it, "RECENT CONVERSATIONS".

Every page gets its own address, so a link, a notification or a check file can open it directly.

## The ten screens, and what each one is built from

| # | Mockup | Address (after https://www.lawfecta.co/dela) | Built from what exists | What is added |
|---|---|---|---|---|
| 1 | Playbook-Aware Conversation | ?tab=delegate | Ask DELA chat, working context, suggested next actions, choices | The second menu, the list of recent conversations, "A useful next question" as its own card, "Working context" with Selected and Not selected, "Manage playbooks", "Create or improve a playbook", the blue note, the buttons "Attach file", "Talk", "Improve request", "Send" |
| 2 | My Playbooks | ?tab=delegate&ws=playbooks | The Library's documents | The table (Playbook, Owner role, Version, Status, Action), the five filter buttons, the search, "Selected for DELA" with "Chat about this playbook", "Don't have an approved playbook?", "+ Create playbook", "View versions & history" |
| 3 | Delegation Opportunities | ?tab=delegate&ws=opportunities&pb=<document> | "Automate or delegate" | One card per candidate task with a tick box, the playbook step, the suggested role, "Why this task?", the tag "Suggested" or "Review authority"; "Your selection" with the count; "Review dependencies & ownership"; "Refine with DELA" |
| 4 | Partial Delegation & Dependencies | ?tab=delegate&ws=handoff&pb=<document> | The delegation panel, the handoff card, prerequisites (step 71) | "Selected work" with Selected and Excluded, "Prerequisites & inputs" with a supplier and a state for each, "Completion criteria", "Handoff summary", "Open recipient-safe preview", "Prepare gig draft" |
| 5 | DELA Instructions & Firm Context | ?tab=delegate&ws=instructions | DELA instructions (firm guidance, preferences, history), the firm profile | The page of its own with four tabs (adds "Assignment context"), the scope line on each instruction, "Propose a new instruction" with "Review proposed change" before it is sent, "How context is used", "Missing or conflicting information" |
| 6 | Create a Gig from DELA | ?tab=delegate&ws=gig&gig=<draft> | "Post a New Gig" steps 1 and 2, the gig draft | One form (title, description, type, budget, deliverables, skills, deadline), "Source & scope", the "Before posting" list, "Back to selected work", "Save draft", "Review freelancer-facing draft" |
| 7 | Playbook Changes & Version Approval | ?tab=delegate&ws=changes&pb=<document> | "Suggested edits" side by side, versions, send for review | Before and after as the mockup draws them, "Impact review", "Ask DELA to refine", "Apply to draft", "Request approval", "Version states" |
| 8 | Invitation & Sharing Review | ?tab=delegate&ws=invite&gig=<gig>&person=<freelancer> | The invitation page and its sharing list | "Prepare invitation" (recipient, assignment, message), "Information to be shared" with Included, Review, Not shared, "Recipient package preview", "Permission checks", "Review before sending" as its own step before anything is sent |
| 9 | Recipient Review & Acceptance | ?tab=delegate&ws=preview&gig=<gig> | "Exactly what an invited or hired freelancer gets" | The work package page: "Your tasks", "What successful completion requires", the recipient's buttons shown and switched off, "Required inputs", "Recipient questions" |
| 10 | Decisions, Blockers & Work Progress | ?tab=delegate&ws=decisions | "Needs your attention", attorney decisions, what the freelancer still needs, team work, the workflow facts | One queue for all of it with a state and the person who resolves each item, "Decision details" beside it, the event history of the chosen item |

"Gig drafts" in the second menu lists the firm's draft gigs and opens screen 6 for each.

## The four releases
Each release is whole pages, tested on both sides, with its own check file.

1. **75a: the workspace, and screens 1, 2 and 5.** The skeleton, the second menu, the addresses, the top bar path. Chat, My playbooks, DELA instructions.
2. **75b: screens 3 and 4.** Choosing tasks to delegate, then inputs, owners and completion criteria.
3. **75c: screens 6, 8 and 9.** The gig draft from the selected work, the invitation with its sharing review, and the preview of what the recipient gets.
4. **75d: screens 7 and 10.** Changes and version approval, and the decision queue.

After 75d the old places (the card on a document, the panel in the Library, "Post a New Gig" in Projects) open the new pages, so there is one way to do each thing.

## Who
Attorneys, firm staff with a place in the Library, and agency owners. Freelancers get screen 1 with a shorter second menu ("Chat with DELA", "DELA instructions" with their own preferences) and are the real recipients of screens 8 and 9.

## How it could go wrong
- A page shows a state that is not true: every tag comes from a record. No tag is written by the AI. Screen 10 lists only what the database holds.
- The mockups' sample labels are built as real labels: "Sample approved", "Example conversation", "Illustrative source", "Later-phase execution concept" and the dark bands at the top and bottom are the designer's notes. They are not built.
- Two ways to do one thing during the four releases: each release says in its notes which old place still exists.
- The new pages weaken a rule: every action goes through the same server commands as today, with the same permission checks at the moment it runs. Nothing new can approve, send, post or pay.
- A preview is taken for the real thing: screen 9 says in a yellow line that the buttons belong to the recipient and cannot be used on their behalf.
- Preparing is taken for sending: on screens 6 and 8, saving a draft and sending or posting are separate buttons on separate steps.
- Tests of the pages as they are today: the new workspace ships behind a switch that is off in the tests of the old pages and on in its own tests.

## Settings and switches it uses
- New switch dela_workspace_v2: off, then the Access list, then everyone. Existing switches keep their meaning: ask_dela_workspace, automate_delegate, handoff_kit, flex_gigs, talent_search, team_assignments.
- No new business number.

## Questions, and how Claude answered them (acceleration mode)
1. "Playbook" or "document"? **"Playbook" inside the Ask DELA workspace, as the mockups write it.** The Library keeps "document" and its four types until Stacey says the Library changes too.
2. Does the Library leave the main menu? **No.** The mockups show "Library" in the main menu and "My playbooks" inside Ask DELA. Both show the same records.
3. The line under the message box in mockup 1, "Do not include confidential client information": **not used.** Stacey's rule of 2026-11-05, confirmed 2026-11-20, allows client names and case facts and stops sensitive data. The line under the box says that rule.
4. The recipient's buttons on screen 9, "Accept scope", "Request changes", "Decline": **shown as the mockup draws them, switched off, for work assigned to the firm's own team, where those actions exist.** For a gig the freelancer answers with a proposal and signs an agreement, because that is where the fee and the money rules sit; the preview of a gig shows "Send a proposal", "Ask a question" and "Decline". Accepting a gig with one click and no proposal would change how hiring and fees work, so it waits for Stacey's word.
5. Screen 8 invites a named person to an "assignment": **the assignment is a gig**, or team work for someone on the firm's own team.
6. The grey switched-off buttons in mockup 9 are too faint to read: **kept grey, with darker text**, so they pass the contrast rule.
7. The colored tags at the top of screen 10 look like buttons: **they are made real filters.**
8. "Review applicable platform fees" on screen 6: **the fee comes from Settings, as the cost box does today.** It is never typed or guessed.
9. Main button color: **dark red, as in the mockups.**
10. Phones: **the second menu becomes a row of buttons above the page**, and the right column goes under the main one.

## Success looks like
Attorney login, release 75a:
- https://www.lawfecta.co/dela?tab=delegate shows the second menu with five lines and the recent conversations, the chat in the middle, and "Working context" and "Suggested next actions" at the right.
- "My playbooks" lists the firm's documents in a table with Open, Continue or Review on each line, and "Selected for DELA" at the right.
- "DELA instructions" opens as its own page with four tabs.
- The top bar reads "Ask DELA / My Playbooks Library" and so on, and each page's address opens that page directly.
Later releases add their own checks here.
