# Inventory C: Library, recorder, guided setup, document editor, images

Source: `app/dela-app.js`, lines 3419 to 5066 and 11228 to 12195. Every label below is copied from the code.

Shared facts used throughout this file:

- Library roles and what they unlock (`RANK`, line 3381; `can(n)`, line 3393): "Viewer" (1), "Commenter" (2), "Editor" (3), "Administrator" (4). In this file "can(2)" means Commenter or higher, "can(3)" Editor or higher, "can(4)" Administrator only.
- Document status words (`PB_STATUS`, line 3379): "Draft", "In review", "Approved", "Archived", "In the trash".
- Document type words (`DOC_TYPE_WORDS`, line 10721): "Policy", "Workflow", "SOP", "Playbook".
- Two document formats exist. Older documents ("legacy", 13 fixed parts) are drawn by `drawPlaybook` (line 3812). Documents on the "document standard" (`body.schema === 2`) are drawn by `drawDocument` (line 11288). Which one a member sees depends on the document, not on a choice.
- Sensitive-data line (`aiNotice`, line 1847), shown above most AI text boxes: "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter." The variant `notice()` (line 1848) ends "Share a link from your own storage instead. You are responsible for what you enter."
- Who reaches the Library: `tab=library`, shown when the switch `playbook_library` is on and the member is an attorney, or a freelancer whose agency hires (`me.agency_client`) (line 12226, `canHire` line 12603). Menu label "Library" (line 25).

---

## Library: plain-language workspace (cards) (attorney, and freelancer agencies that hire)

- How to reach it: menu "Library", `?tab=library`. `libraryView` (3419) then `drawLibrary` (3435) hands over to `drawWorkspace` (3545).
- Purpose and primary focus: find a firm document and open it, or start a new one. The one main action is "Create a document".
- Shown when: `L.workspace` is on (comment says switch `library_workspace`), the library is on (`L.on`), and the member has not chosen "Show as a table" (saved preference `libTable`).
- Layout, top to bottom:
  1. Header row: h1 "Library", sub-line "Your firm's processes and policies, all in one place.", then buttons "Create a document", "Import", "Library settings".
  2. Library picker (dropdown) on its own row, only when the member belongs to more than one library.
  3. "Import" card (only after clicking "Import"): heading "Import", two buttons, one small note.
  4. Search box.
  5. Two rows of filter pills: Category, then Status.
  6. Card groups. First group "Imported, waiting for review" (if any), then one group per category, heading = category name, cards sorted A to Z by title.
  7. Row of text links: "Recordings", "Recently deleted (N)", "Show as a table".
  8. "Recordings" card (only when its link is open). See the Recordings card section.
  9. "Recently deleted" card (only when its link is open).
  10. "Drafts due to be deleted" card (only when there are drafts due soon).
  11. Help card "Not sure where to start?" (Editor and above).
  12. Footer line: the plan limit text plus " Your access to this Library: <role>."
- Content and data shown:
  - Document card (`docCard`, 3530): title; one purpose sentence (or link "Add a purpose"); one status badge; optional note line; optional lock line; one action button.
  - Status badge words (`WS_WORDS`, 3529): "Ready to use (approved)" (green), "Draft" (plain), "Needs your review" (yellow).
  - Note lines under the badge (`cardState`, 3515): "A new draft is waiting for your approval.", "Review overdue since <date>", "A new draft is in progress.", "<N> required item(s) before approval.", "Sent for approval."
  - Import card: title or "Imported guide"; "<N> step(s) imported on <date>."; badge "Needs your review".
  - Categories come from lifecycle codes in this order: INT, ENG, MAT, DOC, BIL, CLS, ADM (names come from the server, `L.groups`), then "Not grouped yet".
  - Plan limit text (`libLimitText`, 482): "<count> of <limit> documents", or "<count> documents saved. Your plan allows <limit>.", or "<count> documents (no cap on your plan)".
- Interactive elements:
  - Button "Create a document" (blue; Editor+): opens the new-document flow (`newDocument`, line 10800, outside this range) when the library is on the document standard, else the older "New document" card (`newPlaybook`).
  - Button "Import" (ghost; Editor+; toggles, aria-expanded): opens the "Import" card with buttons "From a Scribe guide" (only if `L.scribe_on`) and "From a file or text you already have" (opens the "New document" card). Note under them: "DELA turns it into a draft. Nothing is ready to use until someone approves it."
  - Link-style button "Library settings" (Administrator only): opens the "Library team" drawer.
  - Dropdown, aria-label "Library": one option per library, text "My library (<Role>)" or "<name> (<Role>)". Changing it reloads.
  - Search box: aria-label "Find a document", placeholder "Find a document by name, purpose or ID". Filters as you type (title, purpose, ID, category name, practice area).
  - Category pills (group label "Category"): "All categories", then each category that has documents, then "Not grouped yet".
  - Status pills (group label "Status"): "All", "Ready to use", "Draft", "Needs your review".
  - Card action button, one per card. Labels and when: "Review imported document" (document moved to the standard, not yet confirmed); "Review and approve" (in review, Administrator); "Review now" (approved, review date passed); "Open document" (approved); "Fix required items" (draft with blocking quality items, Editor+; opens the document scrolled to the quality check); "Open draft" (in review, or a draft for a non-editor); "Continue draft" (draft, Editor+). Draft actions are ghost buttons, the rest blue.
  - Link "Add a purpose" on a card with no purpose (Editor+): opens the document.
  - Import card button "Review imported document": opens the import review screen.
  - Empty-result button "Show all documents": clears search and both filters.
  - Links at the bottom: "Recordings" (Editor+, toggle), "Recently deleted (N)" (toggle, only if any archived or trashed), "Show as a table" (switches to the table view and remembers it).
  - "Recently deleted" card: heading "Recently deleted", text "Archived documents and documents in the trash. Open one to restore it.", list of title + status word, button "Open" per row.
  - Help card "Not sure where to start?": text "Describe the process in a sentence. DELA suggests how to structure it, asks a few questions and drafts it for you. The draft is yours to edit, and it is never the working version until someone approves it."; sensitive-data line; text area (aria-label "What would you like to document?", placeholder "For example: how we check for conflicts before accepting a new client", 3 rows); buttons "✦ Help me create a document" (starts the new-document flow with that text) and "What am I missing?" (see that section).
- States:
  - Loading: "Loading..."
  - Load error: red notice with the server's error text.
  - No library at all: "No library yet."
  - Empty library: "No documents yet. Click "Create a document" and describe what you want to document."
  - Filters match nothing: "No documents match." plus "Show all documents".
  - Locked after a downgrade: "🔒 Upgrade to edit this document." on the card.
- Help: help tip beside the "Ready to use (approved)" badge, question "What does Ready to use mean?", text "Approved by your firm. DELA checks how it is written, not whether it is legally correct."
- Variations: Viewers and Commenters see no create, import, recordings or help card. Only the Administrator sees "Library settings". "From a Scribe guide" needs `L.scribe_on`.
- Mobile/accessibility: pills use `aria-pressed`; pill groups have `role="group"` with labels; toggles use `aria-expanded`. Coming back from a document restores search, category, status and scroll position.
- UX observations (mine): The "Import" button, the "Recordings" link and the "Recently deleted" link share one open/closed slot (`ws.more`), so opening one closes the others, and two of them open far from where they are clicked (Import opens at the top, the other two near the bottom). "Library settings" opens a drawer titled "Library team". The same "What am I missing?" action exists here and in the table view. The plan limit sits at the very bottom as small grey text.

---

## Library: table view, "Document library" (attorney, and freelancer agencies that hire)

- How to reach it: same tab. Shown when the workspace switch is off, or after clicking "Show as a table". `drawLibrary` (3435).
- Purpose and primary focus: the older, denser list of documents with a usage bar. Main action: "New document".
- Shown when: see above. If the library is off for the account the page stops after the intro with a notice (text from `D.errorText("library_off")`; the same reason maps to "The document library is not open for your account yet." in `failText`).
- Layout, top to bottom:
  1. h1 "Document library" with the library picker dropdown on the right (if more than one library).
  2. Intro: "Each document is one repeatable process, written so a trained person who has never done it can do it right, with the points where an attorney must review."
  3. Usage card: bold limit text, badge "Your access to this Library: <Role>", a progress bar (turns red at 100%), then the action buttons.
  4. Search box and filter pills on one wrapping row.
  5. The list.
  6. "Drafts due to be deleted" card (if any).
  7. Collapsed card "Imports waiting for review (N)" (if any).
  8. "Recordings" card (Editor+).
  9. Link "Show as cards" (only when the workspace switch is on).
- Content and data shown: Legacy rows (`drawList`, 3494): a chip with completeness "<N>%", title, lock line if locked, a meta line "<practice area> | version <n> | updated <date> | <n> suggestion(s) waiting", and a status badge (Approved green, In review yellow). When the library is on the document standard the list is drawn by `docIndex` (line 10934, outside this range). `reviewCell` (3780, used by that index) shows "None" or a link "<N> quality note(s)" with " (required)" when blocking.
- Interactive elements:
  - Buttons in the usage card: "New document" (blue, Editor+), "Import from Scribe" (ghost, Editor+, only if `L.scribe_on`), "What am I missing?" (ghost, Editor+), "Team" (ghost, Administrator only).
  - Dropdown aria-label "Library" (same options as above).
  - Search: aria-label "Search documents", placeholder "Search by title, ID or practice area".
  - Filter pills: "All", "Drafts", "In review", "Approved", "Due for review", then "More". Clicking "More" adds "Archived" and (Administrator only) "Trash".
  - Each row is clickable (role button, tabindex 0) and opens the document.
  - Imports list: per row a "Review" button (blue).
  - "Show as cards" link.
- States: "Loading..."; "No library yet."; "Nothing here." (filter empty); "No documents yet. Click New document and describe a task, or import a guide you made in Scribe."; row lock "🔒 Upgrade to edit this document."
- Help: none.
- Variations: "All" hides archived and trashed documents. "Due for review" means approved with a review date today or earlier.
- Mobile/accessibility: rows have role and tabindex but no key handler is visible in this code, so Enter may not open them (unclear from code).
- UX observations (mine): Wording differs from the card view for the same things: "New document" vs "Create a document", "Team" vs "Library settings", "Import from Scribe" vs "Import", "Imports waiting for review" vs "Imported, waiting for review", "Drafts" vs "Draft". The search filter is skipped for the "Due for review" and "Trash" pills (the code returns before the search test).

---

## "New document" card (older create flow) (attorney, and freelancer agencies that hire; Editor+)

- How to reach it: "New document" in the table view when the library is not on the document standard; "From a file or text you already have" in the Import card; "Create a document" or "✦ Help me create a document" when the library is not on the standard. `newPlaybook` (3642). It replaces the whole Library page.
- Purpose and primary focus: describe a task (type, talk or attach a file) and let DELA draft the document.
- Layout, top to bottom: h2 "New document"; sensitive-data line; title box; description box; a row with "● Talk", "Use a file I uploaded", "Upload a new file" and a status line; the file pick list; the upload panel; the problem panel; a row with "Draft it with DELA", "Start blank", "Cancel".
- Interactive elements:
  - Text box aria-label "Title", placeholder "Title (optional)".
  - Text area aria-label "Describe the task", placeholder "Describe the task the way you would explain it to a new paralegal: what starts it, the steps, who does each part, what done looks like." Gets focus on open.
  - Button "● Talk" (only when voice is on and the browser supports recording): voice to text into the description.
  - Button "Use a file I uploaded" (switch `file_uploads`): loads the member's ready, readable files as a checkbox list (label = file name).
  - Button "Upload a new file" (switch `file_uploads`): opens a small panel with a file input (aria-label "Choose a file", accepts .pdf, .docx, .txt, .md), a checkbox "This file has no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords).", and button "Upload".
  - Button "Draft it with DELA" (blue).
  - Button "Start blank" (ghost): creates "Untitled document" (or the typed title) and opens it in Edit.
  - Button "Cancel": back to the Library.
  - In the problem panel: "Send anyway, it has no client information"; "Try again"; "Use Lawfecta's DELA actions this time" (only when the member's own AI key failed and backup credits are allowed).
- States:
  - Status while drafting: "DELA is drafting your document..."
  - Toast when nothing was entered: "Describe the task or choose a file first, or click Start blank."
  - File list empty: "No readable files yet. Click "Upload a new file" to add one here."
  - Upload messages: "Choose a file first."; "Tick the box to confirm the file has no sensitive data."; "Uploading <name>..."; "The upload did not finish. Check your connection and try again."; "✓ <name> is ready. DELA will draft from it."; "DELA is holding this file because it may include client information. Check it on the Files page."; "This file was not accepted. Use a Word file, PDF or text file."; "DELA is still checking the file. Try again in a moment."
  - Client-information warning: the server's note, or "This may include <kinds>. Use placeholders such as [Client Name] instead."
  - AI failure text (`failText`, 3394), for example "Your own AI key did not work: ... Nothing ran on Lawfecta's AI. Open <settings name> to fix it." or "DELA's AI could not finish: ... No DELA actions were used. Please try again."
  - Library full: a limit pop-up (`limitPopup`, outside this range).
- Variations: file buttons only with switch `file_uploads`; "● Talk" only with voice on.
- UX observations (mine): An `auto` checkbox is created for the microphone but never placed on the page here. Two ways to attach a file sit side by side with similar names.

---

## "What am I missing?" result card (Editor+)

- How to reach it: button "What am I missing?" in either Library view. `suggestMissing` (3739). The card is inserted near the top of the Library page (before the fourth element).
- Purpose: DELA lists documents that similar firms usually have.
- Layout: while loading "DELA is looking at your library..."; then h2 "Documents firms like yours often have", a list of bold title + grey reason, and button "Close".
- States: failure text in a red "problem" paragraph.
- UX observations (mine): The suggestions are plain text; nothing lets the member start one of them from the list. In the card view the result appears near the top while the button is at the bottom of the page.

---

## "Library team" drawer (Administrator)

- How to reach it: "Library settings" (card view) or "Team" (table view). `openTeam` (3753). Opens as a side drawer, role dialog, aria-label "Library team".
- Purpose: add or remove people and set their role.
- Layout: h2 "Library team"; note "Editors and administrators use a seat (<n> on your plan, including you). Commenters and viewers do not, up to <n>."; member list, first line "<owner name> Administrator (owner)", then "<name> <Role>" with a "Remove" button each; h3 "Add someone"; note "They need a Lawfecta account and must have opened DELA once. Find their BD member ID in their Lawfecta profile."; a row with the ID box, role dropdown and "Add".
- Interactive elements:
  - "Remove" (red, per member): removes at once, no confirm. Toast "Removed. They lost access straight away."
  - Text box aria-label and placeholder "BD member ID" (numeric keyboard).
  - Dropdown aria-label "Role": "Editor", "Commenter", "Viewer", "Administrator" (in that order).
  - "Add" (blue). Toast "Added".
- States: seat errors from `failText`: "Every seat on this plan is in use (<n>). Editors need a seat. Add them as a commenter or viewer, or add seats on the Business plan."; "This library already has <n> commenters and viewers, the most allowed."
- UX observations (mine): Adding someone needs a "BD member ID", an internal number the member has to look up elsewhere. "Remove" has no confirm step although access ends at once. There is no way to change a role without removing and adding again (unclear whether "Add" on an existing member updates the role).

---

## "Drafts due to be deleted" card (both Library views)

- How to reach it: appears by itself in the Library when at least one never-approved draft is close to automatic deletion. `draftsDueCard` (3857).
- Layout: h2 "Drafts due to be deleted"; note "Drafts that were never approved are deleted after a set time without changes. Click "Save to library" to keep one."; one row per draft: bold title, " | deleted on <date>", buttons "Save to library" and "Open".
- Interactive elements: "Save to library" (toast "Saved. This draft is kept until you delete it."); "Open".
- States: hidden when nothing is due; load errors are silent.

---

## Document page, legacy format (older documents) (attorney, and freelancer agencies that hire)

- How to reach it: open any older document from the Library. `openPlaybook` (3786) then `drawPlaybook` (3812). A deep link with a document ID also lands here (line 12889).
- Purpose and primary focus: read one process document and move it toward approval.
- Layout, top to bottom:
  1. Lock notice (only when the plan was downgraded): "🔒 Upgrade to edit this document. Your plan saves fewer documents, so this one is read-only. You can still view, export and assign it." with an upgrade button.
  2. "← Library" button.
  3. h1 title with the status badge.
  4. Meta line: "Version <n> | last approved: version <n> | administrator: <name> | next review <date> | your role: <Role>".
  5. Freelancers-who-fit card (`fitsCard`, outside this range) when switch `talent_search` is on, the member can hire, and the view is not Edit.
  6. Completeness card: "Complete: <n>%", action buttons, a bar (green at 100%), then "Still missing: <parts>." or "Every required part is filled." (plus " DELA still has <n> question(s) for you below: check its guesses before you approve.").
  7. "DELA's questions" card (if DELA has open questions; Editor+).
  8. Tab strip.
  9. The chosen tab's content.
  10. Administrator row at the bottom: archive and delete actions.
- Interactive elements:
  - "← Library".
  - In the completeness card: "Send for review" (Editor+, status Draft; toast "Sent to the administrator for review"); "Post as a Flex Gig" (approved, attorney, switch `flex_gigs`, Administrator; goes to Projects with this document chosen); "Approve" (Administrator, Draft or In review; disabled below 100% with tooltip "Fill in every required part first"; toast "Approved").
  - Tabs: "Read", "Edit", "Chat", "Suggested edits (N)", "Comments (N)", "Activity", "Versions", "Files (N)", "Export". Below Editor the "Edit" and "Export" tabs are removed.
  - Bottom row (Administrator): "Archive" (toast "Archived") or "Bring back from the archive" (toast "Back in the library"); then one of "Delete draft" (never-approved draft; browser confirm "Delete this draft for good? It was never approved, so it is removed at once with its versions and comments. This cannot be undone."; toast "Draft deleted"), "Restore from the trash" (toast "Restored"), or "Delete" (browser confirm "Move this document to the trash? You can restore it for 30 days."; toast "Moved to the trash").
- States: load failure shows a toast and returns to the Library.
- Variations: by role as listed; by status for the action buttons.
- UX observations (mine): Three places hold actions (completeness card, tab strip, bottom row). Nine tabs in one strip. Destructive actions use the browser's own confirm box.

### Legacy tab "Read"

- `readView` (3915). One card per part, in this order with these headings: "Title and outcome", "Practice area and jurisdiction", "When to use it", "Roles", "What you need first", "Steps", "Deadlines and timing", "Quality checks", "Attorney review and ethics points", "Never delegate", "Templates and resources", "Tools", "Deliverables". "Deadlines and timing" is hidden when the process has none; "Never delegate", "Templates and resources" and "Tools" are hidden when empty.
- Steps show a number, the text, a grey line "Who: <x> | Tool: <x> | About <n> min | <delegation word>" and, if set, "Decision: <text>". Delegation words: "Keep (attorney)", "Delegate", "Automate".
- Interactive elements: "Comment" on each part's heading (Commenter+; not on "Steps" or "Practice area and jurisdiction"); per step "Screenshot" (opens the file) and "Comment".
- States: "No steps yet."; "Not filled in yet."
- Comment box (`commentBox`, 3940), opens inside the card: sensitive-data line; text area aria-label "Comment", placeholder "Your comment on <part>"; checkbox "Suggest new text for this part" (reveals a second text area, aria-label "Suggested text", pre-filled with the current text); buttons "Send" and "Cancel". Toasts: "Comment added" or "Suggestion sent to the administrator".

### Legacy tab "Edit"

- `editView` (3957). One long card: sensitive-data line, then fields in order:
  - "1. Title" (one line); "Outcome: what done produces" (text area).
  - "2. Practice area" and "Jurisdiction (a state, federal, or any)" side by side.
  - "3. When to use it", hint "What starts it: a new client signs, a court notice arrives, the first of the month."
  - "4. Roles", hint "Who owns it, who does each part, and which parts only an attorney may do. One per line."
  - "5. What you need first", hint "One per line. Describe documents and access; never paste real client data."
  - "6. Steps (at least 3)": per step a block "Step <n>" with a text area, small boxes with placeholders "Who", "Tool", "Minutes", a dropdown aria-label "Delegation" (options "Delegation?", "Keep (attorney)", "Delegate", "Automate"), a box with placeholder "Decision point (if X, go to step N)", and buttons "Move up" (not on the first step), "Add a step below", "Remove" (red). Under the list: "+ Add a step".
  - Checkbox "7. This process has deadlines", then "Deadlines and timing", hint "Court or rule deadlines and your own target times. Write Check this: in front of anything you are not sure of."
  - "8. Quality checks", hint "How to tell each step and the whole job was done right. One per line."
  - "9. Attorney review and ethics points", hint "Where an attorney must review or sign. One per line."
  - "What must never be delegated".
  - "10. Templates and resources", hint "Files can also be attached on the Files view."
  - "11. Tools"; "12. Deliverables", hint "What is handed over at the end, and to whom."
  - "Note for this version", placeholder "What you changed (shows in Versions)".
  - Buttons "Save as a new version" (blue; toast "Saved as version <n>") and "Cancel".
- States: save conflict text "Someone saved a newer version while you were working. Your changes were not saved. Reload the document, then make your change again."
- UX observations (mine): A very long single form with one save at the bottom. Steps can move up but not down. Removing a step has no confirm. Numbering skips an item ("What must never be delegated" has no number).

### Tab "Chat" (legacy and standard documents)

- `pbChatView` (4017). A message list and a composer.
- Empty-state card: "Ask about this document ("Who does step 4?") or ask for a change ("Add a conflict check before step 2"). DELA proposes changes as suggestions; nothing changes until you or an editor accept it." (for non-administrators the ending is "an editor or the administrator accepts it.").
- Interactive elements: text area aria-label "Message about this document"; "● Talk" (if voice is on); "Send" (blue).
- States: status "DELA is thinking..."; browser confirm on a client-information warning ("This may include <kinds>. Send anyway? Only if it has no client information."); browser confirm on the member's own AI key failing ("<failure text> Use Lawfecta's DELA actions this time?"); DELA's reply may end with "This change is waiting on the Suggestions view." and " It removes an attorney review point, so only the administrator can accept it."
- UX observations (mine): The reply says "Suggestions view" but the tab is named "Suggested edits (N)". The chat log lives only in the browser's memory and is lost on reload.

### Legacy tab "Suggested edits (N)"

- `suggestionsView` (4079). One card per suggestion: heading "From DELA chat: <note>" or "From <person>: <note>" (fallback "Suggested change"); badge "Removes an attorney review point" (red) when it applies; "<date time> | made from version <n>"; a list of changes by part ("<Part>: Becomes: <text>", "Steps: Adds or changes: <text>", "Steps: Removes: <text>").
- Interactive elements: "Accept" (blue; disabled when stale; toast "Accepted. A new version was saved."), "Reject" (opens a browser prompt "Why not? (optional, the author sees this)"; toast "Rejected").
- States: "No suggestions waiting."; stale notice "The document changed after this was suggested, so it cannot be applied as it is. Ask DELA again in Chat."; "No visible change."; for people who cannot decide: "Waiting for the administrator." or "Waiting for an editor or the administrator."
- Variations: a comment suggestion, or one that removes a review point, needs the Administrator; other DELA suggestions need Editor+.

### Tab "Comments (N)" (legacy and standard documents)

- `commentsView` (4100). One card per comment (resolved ones faded): "<person> on <part or step n>", date time, the comment, and either "Has a suggested change waiting on the Suggestions view.", a "Mark done" button (Editor+), or a "Done" badge.
- Empty states: "No comments yet. The approved version is read-only: to comment, start a new draft. The approved version stays in use until the new one is approved." with button "Edit a new draft"; or "No comments yet. In "<tab name>", click "Comment" beside any part." with button "Go to <tab name>" where the tab name is "Draft and review", "New draft" or "Draft (version <n>)".
- UX observations (mine): The empty-state text tells people to click "Comment" beside a part, but the standard document editor in this range has no "Comment" button (only the legacy Read tab does). The empty-state buttons call the standard-document drawer even on a legacy document (possible defect).

### Tab "Activity"

- `activityView` (4120). One card: "Every event on this document, newest first. Nobody can edit or delete these lines." then a list "<event> by <person or DELA>, version <n> (<format>)" with date time.
- Event words (`ACTION_WORDS`, 3389): "Created", "First draft by DELA", "Drafted by DELA from a file", "Built from a Scribe guide", "Edited", "DELA filled in answers", "Sent for review", "Approved", "Suggested a change", "Accepted a suggestion", "Rejected a suggestion", "Commented", "Restored an earlier version", "Exported", "Archived", "Brought back from the archive", "Moved to the trash", "Restored from the trash", "Attached a file", "Removed a file".

### Tab "Versions"

- `versionsView` (4128). A list: "Version <n> (current) (approved)", "<date time> by <person>: <note>", buttons "View" and (Editor+, not the current one) "Restore".
- "Restore": browser confirm "Restore version <n>? It is saved as a new version; nothing is lost."; toast "Restored as version <n>".
- "View": opens a drawer titled "Version <n>" showing the legacy Read layout, read-only.
- UX observations (mine): The version drawer always uses the legacy 13-part layout, so a standard-format version may show mostly "Not filled in yet." (unclear from code how it renders for standard documents).

### Tab "Files (N)"

- `pbFilesView` (4153). Card text: "Templates, forms and checklists kept with this document. They come from your firm's Files page; new versions of a file follow automatically."
- Interactive elements: per file "Open" and (Editor+) "Remove"; a dropdown aria-label "Attach a file" whose first option is "Attach a file from Files" (Editor+ and switch `file_uploads`); choosing a file attaches it at once.
- States: "No files attached."

### Legacy tab "Export"

- `exportView` (4170). Note: "Every file shows the version and date in its footer, so older copies are easy to spot." plus, when not approved, " This version is not approved yet, and the footer says so."
- Five blue buttons with a grey note each: "Word (.docx)" ("For Word, Google Docs, Waybook, Monday Docs and Notion."), "PDF" ("Opens a print view; choose Save as PDF."), "Markdown (.md)" ("For Notion, Confluence and ClickUp."), "Web page (.html)" ("For Notion, Trainual and any knowledge base."), "Step checklist (.csv)" ("For Monday, Excel, Google Sheets or a Notion table.").
- States: toast "Downloaded <file name>"; PDF needs a pop-up window: "Allow pop-ups for this site to print to PDF."

### "DELA's questions" card (legacy and standard documents; Editor+)

- `questionsCard` (3880). Blue-bordered card: h2 "DELA's questions", a numbered list of questions, sensitive-data line, a text area (aria-label "Your answers", placeholder "Answer any of the questions here, in your own words"), buttons "● Talk" (if voice on), "Fill these in" (blue), "Not now" (hides the card).
- States: "DELA is updating the document..."; browser confirm on a client-information warning.
- UX observations (mine): One answer box for all questions; "Fill these in" does nothing when the box is empty, with no message.

---

## Document page, document standard (SOP, Workflow, Playbook, Policy) (attorney, and freelancer agencies that hire)

- How to reach it: open a document on the standard from the Library. `drawDocument` (11288).
- Purpose and primary focus: write and check one document against the quality check, then approve it. The main thing on the page is the editor with the quality check beside it.
- Layout, top to bottom:
  1. Lock notice (same text as legacy) with upgrade button.
  2. "← Library".
  3. h1 "<Document ID> <title>", a type badge ("SOP", "Workflow", "Playbook" or "Policy") and the status badge.
  4. One of these notices: "Draft, not approved. Do not use this as an approved procedure." (plus " The approved version <n> stays in use until this one is approved." and button "View the approved version"); or "New draft. Your first save makes version <n> as a draft; the approved version <n> stays in use until the draft is approved."
  5. Conversion notice (documents moved from the old format): "DELA moved this to the document standard as <Type> (<note>). Check it, then approve it again." with a type dropdown, "Change type" and "The type is right".
  6. Type suggestion notice: "DELA thinks this fits a <Type> better: <reason>" with "Switch to <Type>" and "Keep <Type>".
  7. Green one-off notices returned by the last save.
  8. Automate-or-delegate hint card (`automateCard`, outside this range) when switch `automate_delegate` is on, the document has an approved version and is not a Policy.
  9. Freelancers-who-fit card when switch `talent_search` is on, the member can hire, not a Policy, not editing.
  10. Header fields grid (hidden on the approved view): "Document ID", "Version", "Owner (role)", "Last reviewed", "Next review", "High risk".
  11. Tab strip.
  12. Tab content.
  13. Administrator row: same archive and delete buttons, confirms and toasts as the legacy page.
- Content and data shown: "Document ID" or "Not given yet (given at the first save)"; "Last reviewed": a date, "Never reviewed since approval" or "Not reviewed yet"; "Next review": a date, "3 months after approval" (high risk) or "12 months after approval".
- Interactive elements:
  - Dropdown aria-label "Owner (role)": one option per role on the document. Disabled when read-only.
  - Checkbox aria-label "High risk (trust, conflicts or deadlines)", visible text "Trust, conflicts or deadlines (reviewed every 3 months)".
  - Conversion notice: dropdown aria-label "Change the type" with "SOP", "Workflow", "Playbook", "Policy"; "Change type" (toast "Now a <Type>"); "The type is right".
  - Tabs. Without an approved version: "Draft and review", "Chat", "Suggested edits (N)", "Comments (N)", "Activity", "Versions", "Files (N)". With an approved version and no draft open: the first tab is "Approved version". With an approved version and a draft: "Approved version" then "New draft" or "Draft (version <n>)".
- States: editing is off when the member is below Editor, the document is archived or in the trash, or the plan lock applies.
- Variations: Policy documents have no images, no automate card and no fit card.
- Mobile/accessibility: tabs use `role="tab"` and `aria-selected`.
- UX observations (mine): Up to five stacked notices can appear above the editor. There is no "Export" tab here; export lives inside the Quality check card. Owner and High risk changes are saved only by the "Save" button further down, with nothing saying so.

### Tab "Approved version" (approved-document page)

- `approvedPage` (11377). Read-only.
- Layout:
  1. Card h2 "Approved version <n>" with a grid: "Document ID" (or "Not recorded"), "Version", "Approved" ("<date> by <person>" or "Date not recorded"), "Owner (role)" (or "Not set"), "Last reviewed" (or "Never reviewed since approval"), "Next review" (or "Not scheduled").
  2. Notes: "Some details were not recorded when this version was approved. They are added when a new draft is approved." (older documents); "This is the version in use: new gigs, standing arrangements and exports use it." (plus " The document is archived." or " The document is in the trash.").
  3. If a draft exists: notice "A draft (version <n>) is in progress. This approved version stays in use until the draft is approved."
  4. Action row, then an export row.
  5. Card "Quality notes (N)" when the check has open items: "What the quality check suggests for this version. They do not block anything, and they do not confirm the document is legally correct. To act on them, start a new draft; the approved version stays in use until the new one is approved." Items show "✕ <label>" with badge "Required before approval" (red) or "! <label>" with badge "Suggestion" (yellow), plus a detail line.
  6. The document body as it exports: h3 per section, paragraphs, numbered or bulleted lists with images, tables. Empty sections say "Not set".
- Interactive elements: "Open the draft" (when a draft exists) or "Edit a new draft" (Editor+); "Post as a Flex Gig" (SOP or Workflow, status Approved, no draft open, switch `flex_gigs`, Administrator); export buttons after the label "Export the approved version: ": "Word", "PDF", "Markdown", "Web page", "Step checklist". Images open full screen on click.
- UX observations (mine): Export labels here are short ("Word") while the legacy Export tab uses "Word (.docx)". "Post as a Flex Gig" is a ghost button here and a blue button on the draft page.

### Tab "Draft and review" (also named "New draft" or "Draft (version n)"): the review screen

- `reviewScreen` (11431). Two columns (`doc-grid`): left the editor, right the checks.
- Right column, top to bottom: "Quality check" card; "Check images" card (only at a due review); "DELA's questions" card (if any).
- Left column, top to bottom: the document editor card; "RACI" card (SOP and Workflow); "KPIs (3 to 5)" card (Workflow); collapsed "Change log (N)".

#### "Quality check" card

- Heading "Quality check" is a glossary term. Glossary text: "Checks DELA runs on how a document is written. Items marked Required before approval block export, approval and gigs until fixed. Items marked Suggestion do not block anything."
- Intro: "Items marked "Required before approval" must be fixed first. Items marked "Suggestion" are optional. These checks look at how the document is written; they do not confirm it is legally correct."
- Summary line, one of: "Export, approval and Flex Gigs are blocked until the items marked "Required before approval" are fixed." (red notice); "Nothing blocks this document. Look at the items marked "Suggestion"."; "Every check passes."
- Items: "✕ <label>" badge "Required before approval" (red); "! <label>" badge "Suggestion" (yellow); "✓ <label>" badge "Passed" (green). Passed items are folded under a collapsed line "<N> checks passed".
- Interactive elements:
  - Per open item (Editor+ and the item has a fix): button "Fix it: <first part of the item label, cut at 48 characters>" (label becomes "Fixing..." while it runs), or "Split into linked SOPs" (becomes "Splitting..."; afterwards a green notice "Split into linked SOPs. New: <titles>."). For an image item the "Fix it: ..." button opens the "Review image" window.
  - "Save" (blue; Editor+).
  - "Send for review" (Editor+, status Draft; disabled while blocked; toast "Sent to the administrator for review").
  - "Approve" (Administrator, Draft or In review; disabled while blocked or while images are due; tooltip "Fix the blocking items first" or "Mark every image "Still current" or replace it in Check images first"; toast "Approved").
  - "Post as a Flex Gig" (status Approved, SOP or Workflow, switch `flex_gigs`, Administrator; disabled while blocked).
  - "✦ Explain these findings" (when there are open items): an AI helper (`helperButton`, line 5708, outside this range) that lists "<item label>: <explanation>". Fallback text: "DELA could not explain these. Read each item's own note above."
  - Export row, label "Export: " or "Export this draft (marked DRAFT on every page): ", buttons "Word", "PDF", "Markdown", "Web page", "Step checklist" (all disabled while blocked).
- UX observations (mine): The card mixes three jobs: the check list, the workflow actions (Save, Send for review, Approve, Post as a Flex Gig) and export. "Save" appears twice on the page (here and at the bottom of the editor). The disabled "Approve" explains itself only through a hover tooltip.

#### "Check images" card

- `checkImagesCard` (12142). Shown only when the document is due for review and has images.
- h2 "Check images"; text "This document is due for review. Software screens change, so mark each image "Still current" or replace it. You can approve once every image is checked." or "Every image is checked."
- Per image: thumbnail, bold location ("Step <n>", "Stage <n>", "Before you start", "Swimlane chart", "Scripts and templates", "Examples"), caption or "No caption", buttons "Still current" (blue) and "Replace" (opens a file chooser, then the "Review image" window).

#### Document editor card

- `docEditor` (11525). Always starts with "Title". Sections then depend on the type. Every list box has the placeholder "One per line". Read-only members see the same fields disabled.
- SOP sections, in order:
  - "Purpose" (2 rows); "Scope" (2 rows); AI button "✦ Improve this section" (can apply a suggestion to Purpose or Scope).
  - "Trigger" (one line).
  - "Roles": one box labelled "Roles (from your firm profile; roles, never names)", comma separated.
  - "Before you start" (list) with an image area.
  - "Steps" (the steps editor, below); AI button "✦ Check these steps" (results labelled by "Step"; can apply a rewritten step).
  - "Decision points and escalation" (decisions editor).
  - "Timing" (2 rows) plus the rule row.
  - "Quality check" (list) and "Reviewed by (role)".
  - "Done when" (2 rows) and "Saved in".
  - "Related links" (links editor).
- Workflow sections: "Name and process owner" ("Process owner (one role)" and the Roles box); "Start and end points" ("Starts when", "Finished when"); "Swimlane chart" (image area, text "Attach the chart of lanes and stages you drew elsewhere (for example in Visio or Lucidchart)."); "Stages, handoffs, target times and linked SOPs" (steps editor in stage mode); "Decision points".
- Playbook sections: "Situations covered"; "Guiding principles"; "Preferred approach" (3 rows); "Acceptable fallbacks" (hint "Options staff can use without asking"); "Hard limits" (hint "What nobody agrees to without attorney or partner approval"); "Escalation" (escalation editor); "Scripts and templates" (list plus images); "Examples" (hint "Short fictional scenarios. No client information.", plus images).
- Policy sections: "The rules" with two lists "What must happen" and "What must not happen"; "Exceptions and who approves them" ("Exceptions" 2 rows, "Approved by (role)"); "Related links".
- Bottom: "Save" (blue; Editor+).
- Rule row (`ruleFields`, 11577), used under Timing and on every step: label "Court rule, statute or filing deadline:", box placeholder "Rule or statute", box placeholder "https:// link to the rule", date input labelled "Verify by".
- Steps editor (`stepsEditor`, 11587), one card per step (border changes color when the attorney decides):
  - Header: "Step <n>" or "Stage <n>"; badge "Attorney decides" (red) when ticked; buttons "↑" (aria-label "Move step <n> up", disabled on the first), "Remove" (aria-label "Remove step <n>"), "🖼 Add image" (aria-label "Add image to step <n>").
  - Workflow only: "Stage name".
  - "What to do (one action, starting with a verb)" (2 rows).
  - Image area; on the first step with no images yet: "Tip: Take a screenshot, click a step, and paste it here."
  - Row: dropdown "Role" (Workflow: "Lane (role)"), first option "Choose", then the document's roles; "System"; "Menu path and buttons" (placeholder "[Add the menu path in your system]").
  - Workflow only row: "Handoff (what passes, where, how the next person is told)"; "Target time"; "Linked SOP" (placeholder "For example INT-01").
  - Checkboxes: "Attorney decides (the A must be an attorney role)"; "Not a judgment step" (hidden while "Attorney decides" is ticked).
  - The rule row.
  - Under the list: "Add a step" or "Add a stage".
- Decisions editor (`decisionsEditor`, 11620): per row "If", "Then", "Escalate to (role)", checkbox "Attorney decides", "Remove". Button "Add a decision point".
- Links editor (`linksEditor`, 11632): per row a box with placeholder "Template, form, policy or SOP", a box with placeholder "https:// or a document ID such as INT-01", "Remove". Button "Add a link".
- Escalation editor (`escalationEditor`, 11641): per row "Issue", "Who decides (role)", "How fast", "Remove". Button "Add an escalation".
- States: save uses the version check; a conflict shows "Someone saved a newer version while you were working. ...". Read-only plan: limit pop-up.
- Mobile/accessibility: every input has an aria-label that includes the step number.
- UX observations (mine): Steps can only move up ("↑"), never down, and there is no drag handle for steps. "Remove" on steps, decisions, links, escalations and KPIs has no confirm and no undo before saving. Most edits redraw the whole document, which can lose scroll position and focus. Step cards are dense: up to 11 inputs and 2 checkboxes each for a Workflow. Changes are kept in memory until "Save"; there is no unsaved-changes warning in this range, except that images save at once (see Images).

#### "RACI" card (SOP and Workflow)

- `raciGrid` (11653). h2 "RACI"; text "R does the work, A owns the outcome and signs off (exactly one per step), C gives input before, I is told after. Keep C's to 2 or fewer. Click a cell to change it, then Save."
- A table: first column "Step" (or "Stage") with "<n>. <first 60 characters>", then one column per role. A row that does not have exactly one A is marked and its label ends " (needs exactly one A)".
- Interactive elements: each cell is a button that cycles on click through empty ("·"), "R", "A", "R+A", "C", "I". aria-label "Step <n>, <role>: <value or empty>".
- Mobile: table uses the stacked layout (`class="stack"`, `data-label` on cells) inside a scroll wrapper.
- UX observations (mine): Cycling through six states by repeated clicks is slow and easy to overshoot; there is no keyboard shortcut or menu.

#### "KPIs (3 to 5)" card (Workflow)

- `kpiCards` (11674). Text: "Each KPI needs a data source in a system you use: the exact report or field. No baseline yet? Write "measure for 30 days first"."
- Per KPI: "KPI", "What it measures", dropdown "Leading or lagging" ("Choose", "Leading", "Lagging"), "Data source (report or field)", "Owner (role)", "Baseline", "Target", "Review rhythm" (placeholder "weekly, monthly or quarterly"), "Remove".
- Button "Add a KPI" (hidden at 5).

#### "Change log (N)" (collapsed)

- `changeLogCard` (11488). A collapsed section with a table: "Date", "What changed", "Who", "Approved by". Stacked on phones.

### Tab "Suggested edits (N)" on a standard document

- `docSuggestionsView` (11688). Per suggestion: bold note (fallback "A suggested change"), "<person>, <date time>" plus ". It removes an attorney decision, so only the administrator can accept it." when it applies; buttons "Accept" and "Reject" (Editor+). Toasts "Accepted" / "Rejected". Empty: "No suggestions waiting."
- UX observations (mine): Unlike the legacy tab, this one does not show what would change, shows Accept to Editors even when the text says only the administrator can accept, and Reject asks for no reason. Legacy wording is "attorney review point"; here it is "attorney decision".

---

## Images in documents: image areas, "Review image" window, full-screen viewer

- Where: on steps and on some sections of a standard document. Only when images are on for the library (`image_settings.on`) and the document is not a Policy. Code 11770 to 12189.
- Image area (`imageSlot`, 11823):
  - Button "🖼 Add image" (aria-label "Add image to <place>"); file chooser accepts PNG and JPEG. Images can also be pasted or dragged onto the step or section (the area gets a drop highlight).
  - Each image shows its caption (or "No caption yet") and, when editable, tools "Edit", "Replace", "Remove" (shown by clicking the image frame). Images can be dragged to reorder within the step. Clicking the image opens it full screen.
  - Warnings under an image: "DELA's check thinks this image may show client information. Click Edit to blur it or confirm it shows none."; "No client-data check yet. Click Edit to confirm it."; "Confirmed at import".
  - Errors: "Use a PNG or JPG image."; "This image is over <n> MB. Try a smaller screenshot."; "Each step can have <n> images. Split this step to add more." (defaults: 5 MB, 3 per step, caption 120 characters).
  - A thin progress bar shows upload progress.
  - Every image change saves the document at once as a new version, with notes "Added an image", "Replaced an image", "Edited an image", "Removed an image", "Reordered images", "Fixed an image".
- "Remove this image?" pop-up (`askRemove`, 11907): text "It stays in older versions of this document."; buttons "Cancel", "Remove" (red).
- "Review image" window (`reviewImage`, 11971), a centered pop-up with a dimmed backdrop, closes on Esc:
  - Toolbar (aria-label "Drawing tools"): toggle buttons "Box", "Arrow", "Blur" (one active, `aria-pressed`), and "Undo".
  - Yellow bar when the in-browser text reader finds possible client information: "We found <n> item(s) that may be client information." with button "Blur all flagged"; afterwards "Every flagged item is blurred. Check the rest of the image yourself." Flagged text is outlined in yellow on the image; clicking inside an outline blurs that item.
  - Status lines: "Reading the image for names, emails, phone numbers, case numbers and account numbers..."; "DELA did not find anything that looks like client information. Check the image yourself before you save."; "DELA could not read the text in this image. Check it yourself for client information before you save."; "This image could not be opened. Use a PNG or JPG image."; "This image is not available."
  - Red notice for a held image: "DELA's check thinks this image may show client information. Blur it, or confirm below that it shows none."
  - The image canvas (aria-label "The image. Drag on it to draw."). Drag to draw a red box, a red arrow or a blur.
  - Field "Caption (what should the reader look at?)", hint "Up to <n> characters. It is also the text a screen reader reads."
  - Checkbox "This image contains no client information, passwords or account numbers."
  - Buttons "Cancel" and "Save image" (disabled until there is a caption and the box is ticked; tooltip "Add a caption and confirm there is no client information.").
  - Toasts: "Saving the image. It appears under the step in a few seconds."; "Image saved"; "Saved. DELA's check thinks this image may show client information, so the document is blocked until you blur it or confirm it shows none."
- Full-screen viewer (`imgFull`, 11795): role dialog, aria-label "Image, full screen"; "✕" button (aria-label "Close the image"); caption below; closes on Esc or a click on the backdrop. Right-click is blocked and there is no download button.
- Read-only images (`imagesRead`, 11809): full width with caption. Fallback texts: "Images are hidden now that this engagement has ended." or "This image is not available."
- "Check the images" pop-up before creating a gig from a document with images (`gigImageWarning`, 12182): "The freelancer will see <n> image(s) in this document. Check that none show client information."; buttons "Review images" (opens the document) and "Continue".
- Other image error texts (`DOC_ERR` additions, 11776): "Images are not open for your account yet."; "Policies stay text only, so they have no images."; "Add a caption: what should the reader look at?"; "Tick the box to confirm the image has no client information, passwords or account numbers."; "That file is not a real PNG or JPG image, so DELA did not keep it."; "This document is due for review. In "Check images", mark every image "Still current" or replace it, then approve."; "Open the image to fix it."; "Your firm's storage is full. Remove files you no longer need, or upgrade your plan."; "Keep the caption to <n> characters."
- Mobile/accessibility: the modal has `aria-modal`; the comment in code says pinch to zoom works on a phone in the full-screen viewer; image tools appear on tap. The flag scan loads a text-reading library from a CDN the first time.
- UX observations (mine): Image tools are hidden until the frame is clicked, and the same click target also opens full screen when the click lands on the picture. The blur cannot be undone after saving, which the window does not say (the Scribe blur drawer does say "Saving replaces the screenshot with the blurred one."). Two different blur tools exist: this window and the simpler drawer on the import review screen.

---

## "Import a guide from Scribe" (Editor+)

- How to reach it: "Import from Scribe" (table view) or "Import" then "From a Scribe guide" (card view). Needs `L.scribe_on`. `startScribe` (4250). Replaces the Library page.
- Purpose: pick an exported Scribe file so DELA can read its steps and screenshots.
- Layout: card h2 "Import a guide from Scribe"; numbered steps "In Scribe, open the guide.", "Click Share, then the Export tab.", "Click Export next to HTML (or Markdown) and save the file.", "Choose that file below."; a long note beginning "DELA reads the steps and screenshots, then shows them on a review screen where you check screenshots for client information, blur parts, fix steps and add why each step matters. Then DELA builds the document. Free Scribe accounts: open the guide's share page, press Ctrl+P (Cmd+P on a Mac), choose Save as PDF, upload it on the Files page, and ask DELA to turn it into a document."; sensitive-data line; checkbox "This guide and its screenshots have no confidential client information."; a row with the file input, "Read the guide", "Cancel"; a status line.
- Interactive elements: file input aria-label "Choose a document file" (accepts .html, .htm, .md, .markdown, .txt); the checkbox; "Read the guide" (blue); "Cancel".
- States: toasts "Choose the exported Scribe file first."; the tick-needed and file-too-big texts from the shared error list; status "This does not look like a Scribe export: no steps were found. In Scribe, open the guide, click Share, then Export, then Export next to HTML or Markdown, and choose that file."; "Saving screenshot <n> of <total>..."; skipped image "DELA only fetches screenshots from Scribe's own image addresses. This one was skipped: <host>."; "Import from Scribe is not open for your account yet."

---

## Import review screen: "Review your guide" / "Review your recording" (Editor+)

- How to reach it: after a Scribe import, from an "Imported, waiting for review" card, from "Review" in the imports list, or "Review" on a recording that is "Ready for review". `openImport` (4324), `drawImport` (4335).
- Purpose and primary focus: check each step and screenshot for client information, then click "Build my document".
- Layout, top to bottom: "← Library"; h1 "Review your guide" (Scribe) or "Review your recording" (recorder); intro "Check every screenshot for client information, blur anything private, fix the steps, and add why each step matters. Nothing goes to the AI until you click Build my document."; card with "Title"; one card per step; for recordings the "What you said" card; a final card with the sensitive-data line, "Anything to add", and the build buttons.
- Step card: heading "Step <n>" (recordings also show "at <m:ss>"); the step text area; the screenshot with its controls; for recordings, "You may want to add these (click one to use it)" with small alternative screenshots; a note box (placeholder "Why this step matters, or what to watch for (optional)"); a row of step buttons.
- Interactive elements:
  - "Title" box. Saves when changed.
  - Step text area (aria-label "Step <n>"). Saves when changed.
  - Checkbox "Use this screenshot".
  - "Blur part of this image": opens the blur drawer.
  - "It has no client information" (only on a held screenshot): browser confirm "Confirm this screenshot has no confidential client information."
  - Alternative screenshot thumbnails: click, then browser confirm "Use this screenshot for this step instead?"
  - "Merge with step above" (not on the first step), "Add a step here", "Remove step" (red, no confirm).
  - Text area under "Anything to add", placeholder "Anything else DELA should know: who does this, what starts it, what done looks like, where an attorney must check."
  - "Build my document" (large): browser confirm "Check your screenshots for client information before DELA builds your document. Build it now?"; label becomes "Building...".
  - "Discard": browser confirm "Discard this import?"
- "What you said" card (recordings only; `recorderPanel`, 4890): text "Fix names or terms. Lines marked private, and screenshots taken while you said them, never go to the AI."; per line a time stamp, an editable text box (aria-label "Transcript at <m:ss>") and a checkbox "Mark as private". Empty: "No speech was found in this recording."
- Badges on screenshots: "May show client info" (red), "Screenshot not accepted" (red).
- States: build failure toast; "A screenshot is waiting for your client information check. Confirm it has no client information, or untick it, then build again."; browser confirm "The steps may include <kinds>. Build anyway? Only if there is no client information."
- "Blur part of this image" drawer (`blurTool`, 4403): h2 "Blur part of this image", "Cancel"; text "Drag a box over anything private. Drag again for more boxes. Saving replaces the screenshot with the blurred one."; the image canvas (crosshair cursor); button "Save the blurred screenshot". Toasts: "The screenshot is still loading."; "Drag a box over the part to blur first."; "Blurred screenshot saved"; "The screenshot could not be opened for blurring. Untick it instead."
- UX observations (mine): Every edit auto-saves silently with no saved indicator. Up to four browser confirm boxes can appear on this screen. The blur drawer has no undo. Steps cannot be reordered, only merged, added or removed.

---

## "Recordings" card (Editor+)

- How to reach it: in the table view it is always at the bottom of the Library. In the card view click the "Recordings" link near the bottom. `recordingsCard` (4504).
- Purpose: see past recordings, their status and when the video is deleted; start a new recording.
- Layout: h2 "Recordings" with button "Record a process" (only when the recorder is on for the account); note "Videos are kept <n> days on your plan, then deleted; the document you build stays. Storage used: <x> of <y>."; an alert if an upload was interrupted; the table.
- Table columns: "Process name", "Date recorded", "Length" ("<m> min <s> s"), "Status", "Video deletes on", and an unnamed actions column.
- Status words (`REC_STATUS`, 4457): "Recording", "Uploading", "Analyzing", "Ready for review" (green), "Could not analyze" (red, with the error in brackets), "Discarded"; plus "Upload did not finish" (red; tooltip "The rest of this recording is not in this browser, so it cannot finish. Remove it and record again.") for an upload stuck more than 15 minutes. Other badge: "Deletes in <n> days" (when 3 days or fewer remain). Cell text "Video deleted on <date>".
- Interactive elements (row actions): "Review" (ready, not yet built); "Open document" (already built); "Remove" (stuck upload; browser confirm "Remove this recording? It did not finish uploading, so there is nothing to build from it. Record the process again."; toast "Recording removed"); "Try again" (failed; toast "Analyzing again"); "Download video"; "Delete video" (red; browser confirm "Delete this recording's video and screenshots now? A document built from it stays."; toast "Video deleted"). Alert button "Finish upload" (toasts "Finishing the upload...", "Upload finished").
- States: "Loading recordings..."; "No recordings yet."; "The Process Recorder is not open for your account yet."; alert "Your last recording didn't finish uploading."; toast "Preparing the video...". The card refreshes itself every 8 seconds while something is uploading or analyzing.
- Mobile: the table becomes one block per recording on a phone (`class="stack"`, `data-label`).
- UX observations (mine): Up to four buttons can sit in one row's action cell. "Remove" and "Delete video" are different actions with similar names.

---

## "Record a process" page (attorney; Editor+ to reach from the card)

- How to reach it: "Record a process" in the Recordings card, or the direct link `?tab=record` (attorney only, switch `playbook_library`; it opens the Library and then this page; page name "Record a process"). `recordView` (4612).
- Purpose and primary focus: name the process and click "Start recording".
- Layout, top to bottom: "← Library"; a dark banner with badge "DELA RECORDER", h2 "Record a process", text "Do the task the way you always do and talk through each step. DELA turns it into a document you can hand off."; one card with the form.
- Form on a computer: "Process name" (placeholder "Example: File a motion and upload it to Clio"); "Microphone" dropdown (first option "Default microphone", then each device, fallback "Microphone <n>"); a live level bar (aria-label "Microphone level"); a consent checkbox whose text comes from the server (only until consent has been given once); a yellow box "💡 Before you start" with four points: "Close email and chat windows you don't need.", "Keep the whole process on one screen.", "Say out loud what you are doing and why.", "For the beta, record a practice run or non-client work. Confidential client information does not belong in DELA."; "Your plan allows recordings up to <n> minutes."; buttons "Start recording" (large, blue) and "Upload a recording" (ghost).
- On a phone, tablet or unsupported browser: notice "Screen recording isn't available in this browser. Open DELA in Chrome, Edge, Firefox or Safari on a computer, or upload a recording you made elsewhere."; the consent checkbox; "Upload a recording" (blue).
- Interactive elements: as listed. Both buttons stay disabled until consent is given. "Upload a recording" opens a hidden file chooser (aria-label "Choose a video file"; MP4, WebM, MOV).
- States: toast "Give the process a name first."; microphone blocked: "DELA could not use a microphone. Allow the microphone for this site (the icon left of the web address), then reload. You can still record without talking, but the steps will be less clear."; wrong share choice: "DELA needs your entire screen so it can follow you between programs. Click Start recording again and choose Entire Screen."; Mac block: "Your Mac blocked screen recording. Open System Settings. Go to Privacy & Security, then Screen & System Audio Recording. Turn on your browser. Quit and reopen the browser."; other: "Screen sharing was blocked or cancelled. Click Start recording again and choose Entire Screen."; "Recording could not start. Please try again."
- Upload messages: "Upload an MP4, MOV or WebM file."; "This browser cannot open that video. Try an MP4 or WebM file, or open DELA in Chrome."; "That recording is longer than your plan's <n> minutes."; "Uploading a recording needs Chrome, Edge or Firefox on a computer."; "Reading your recording. This takes about half its length. Keep this tab open."
- UX observations (mine): The page asks for microphone permission as soon as it opens, before the member has done anything. The disabled buttons do not say that the consent box is what unlocks them.

### While recording: "Recording: <name>"

- `runRecorder` (4716). h1 "Recording: <name>"; a sticky red-bordered bar with "● Recording", a timer ("0:00", plus " (paused)"), and buttons "Pause" (becomes "Resume") and "Stop and save"; a hidden-until-needed notice "2 minutes left. DELA stops and saves at <n> minutes."; text "Do the task now in any program. You can leave this tab." followed by "A small control window stays on top of your other programs." (Chrome and Edge) or "Use your browser's Stop sharing bar, or come back here, to stop."
- The same controls appear in a small always-on-top window where the browser allows it. The browser's own "Stop sharing" also stops and saves. The recording stops by itself at the plan's limit.

### After stopping: "Saving your recording"

- `processingCard` (4846). h1 "Saving your recording"; three pills showing progress, "Uploading", "Analyzing", "Ready for review" (the current one is highlighted, the others faded); text "You can leave this page. We'll email you when your recording is ready to review."; button "Back to the library".
- Problem text: "Some pieces did not upload. Open Library and click Finish upload." or "The upload did not finish. Open Library and click Finish upload."
- UX observations (mine): "Ready for review" never lights up on this page (the code only shows the uploading, analyzing and problem states here).

---

## "Get set up" (attorney)

- How to reach it: menu "Get set up" (`?tab=setup`), the Home card button "Continue setting up", or the link "See all setup steps". Switch `guided_setup` on, attorney side only. `setupView` (11228), `setupStep` (11257). The menu item is dropped from the second menu group once setup is finished or dismissed (line 227).
- Purpose and primary focus: work through six steps to the first gig, each opened in place.
- Layout, top to bottom: h1 "Get set up"; intro "Six steps to your first gig. Each one opens here. Skip any step and come back to it later."; a status line area; progress text "<done> of <total> done." (or "... done. You are set up."); six numbered cards.
- The six steps (`SETUP_STEPS`, 11209), title and description:
  1. "Your profile and verification": "Your license and firm details, so you can hire."
  2. "Teach DELA about your firm": "Practice areas, the systems you use and your roles. DELA reads this each time it writes for you, only for your firm."
  3. "Your first document": "Import from Scribe, record a process, or start from a starter document. Then approve it."
  4. "✦ Find what to automate or delegate": "DELA reviews an approved document and suggests steps to automate or hand to a freelancer."
  5. "Post your first gig": "From the delegated SOP, or any approved SOP or Workflow."
  6. "Invite freelancers": "From your gig's matches."
- Each card: a number chip, the title, a badge "Done" (green), "Skipped" (yellow) or "To do", the description, then buttons.
- Interactive elements:
  - "Open" (blue) / "Close" (ghost): shows or hides the step's content inside the card. Only one step is open at a time.
  - "Skip for now" / "Pick up again" (hidden once the step is done). Status messages: "Skipped for now. It stays here for later." and "Back on your list."
- What opens inside each step:
  1. The whole Profile page (`profileView`).
  2. The firm profile form (`firmProfileForm`, line 10737). After saving: "Firm profile saved."
  3. The whole Library (`libraryView`).
  4. A dropdown "Approved document to review" (one option per approved document, "<ID> <title>") and under it the automate-or-delegate card for the chosen document. If there are none: "Approve an SOP or Workflow first (step 3)."
  5. The whole Projects page (`projectsView`).
  6. A list of open gigs, each with button "Open matches", which adds that gig's page (matches view) below. If none: "Post a gig first (step 5)."
- States: "Get set up is not open for your account yet."; load error in a red notice.
- Related: Home card "Get set up: <done> of <total> done" with a progress bar, link "Dismiss" and button "Continue setting up" (`setupHomeCard`, 11217, just above this range).
- UX observations (mine): Steps 1, 3 and 5 embed entire pages inside a card, including their own headings, back buttons and sub-navigation, so the layout nests deeply (for example the Library's "← Library" inside a setup card). In step 6 each click on "Open matches" adds another gig page below without removing the previous one. The intro says "Six steps" as fixed text while the count line uses the server's total.

---

## "Attorney decisions" card: checkpoints inside an engagement (both)

- How to reach it: a card on the engagement page (the page itself is outside this range) when the document has steps marked "Attorney decides". `checkpointsCard` (11747).
- Purpose: the freelancer asks the attorney to decide at a marked step, and the attorney approves it.
- Layout: h2 "Attorney decisions"; intro "These steps need the attorney's decision. The work waits at each one until the attorney approves it here." or, when the engagement is completed or canceled, "These steps were for the attorney to decide. The engagement is closed, so nothing more is needed here."; one row per step: "Step <n>: <text>" with a status badge.
- Status words: "Approved by <person>: <note>" (green); "Waiting for the attorney: <note>" (yellow); "Not reached yet"; "Not used: the engagement closed without it".
- Interactive elements:
  - Freelancer, step not reached yet: note box (aria-label "Note for step <n>", placeholder "Anything the attorney should know (optional)") and button "Ask the attorney to decide". Message after: "The attorney was asked to decide."
  - Attorney, step not approved: note box (placeholder "A note with your decision (optional)") and button "Approve this step". Message after: "Approved. The freelancer can go on."
- Variations: closed engagements show no buttons.
- UX observations (mine): The attorney can approve a step the freelancer has not asked about yet. There is only "Approve"; no way to decline or ask for changes here. The whole status sentence, including the note, sits inside the badge, which can get long.

---

## Smaller document pieces used on gig pages (in this range, shown elsewhere)

- What the freelancer sees of a document on a gig (`docGigView`, 11701; freelancer): "Purpose: <text>"; "Before you start" list with images; "Steps" numbered list ("<stage>: <text>", "Where: <menu path>", images) with the line "Attorney decides: ask the attorney inside the engagement before you go on." on marked steps; "Timing: <text>"; "Quality check" list; "Done when: <text>". Read-only.
- "Reference documents (read only)" card (`referencesBlock`, 11716; freelancer): one collapsed line per document, "<ID> <title> (<Type>)". A Playbook shows "Preferred approach: <text>" and "Hard limits: <a; b>". A Policy shows lines "Must: <text>" and "Must not: <text>".
- "Reference documents" card on the attorney's gig (`referencesEditor`, 11725; attorney): text "Attach approved Policies and Playbooks the freelancer should follow. They read them; they cannot change them."; per attached document a "Remove" button; a dropdown (aria-label "Reference document to attach"; "Loading...", then "Choose an approved Policy or Playbook" or "No approved Policies or Playbooks yet") and button "Attach" (toast "Attached").

---

## "Post a new gig" card (attorney, and freelancer agencies that hire) and gig wording (start of the Flex Gigs code)

- How to reach it: top of the Projects page (`projectsView` starts at line 5066, outside this range); also reached from "Post as a Flex Gig" on an approved document. `newGigCard` (5018).
- Purpose: turn an approved SOP or Workflow into a gig draft.
- Closed state (when there is already an open or draft gig): h2 "Post a new gig", button "Start a new gig", text "Turn an approved SOP or Workflow into a Flex Gig. One-off or monthly."
- Open state, top to bottom: h2 "Post a new gig"; text "DELA writes a public version of the document for freelancers. You check it, set the budget (at least <amount>) and the deadline, then post. Open gigs on your plan: no cap." (or "<used> of <limit> in use."); optional notice "Linked to: <job title>. Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor. Share with them only what their part needs." with button "Do not link"; the kind choice; "Document" dropdown; notes box; budget boxes; fee note; the button.
- Interactive elements:
  - Radio buttons "One-off" and "Monthly" (switch `recurring_engagements`), with the note "Monthly: the same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price."
  - Dropdown "Document" (aria-label "Approved SOP or Workflow"): first option "Choose an approved SOP or Workflow" or "No approved SOPs or Workflows yet", then "<ID> <title>".
  - Text area, aria-label "Anything freelancers should know (optional)", placeholder "Anything freelancers should know (optional). No client information."
  - Number boxes "Budget from ($)" (placeholder = the smallest budget) and "Budget to ($)".
  - Button "Draft the gig with DELA" (blue; becomes "DELA is writing the public version..."). If the document has images, the "Check the images" pop-up comes first.
- Fee note (updates as you type): "The budget covers the work. " or "The budget is the monthly price for the work. ", then "Your platform fee (<n>%, at least <amount>) is added and shown before signing." (or "Your platform fee is added and shown before signing."), then " Estimated total: <amount> to <amount>." (with " each month" for monthly).
- States: toast "Choose an approved SOP or Workflow first."
- Gig status words defined here (`GIG_STATUS`, 4941): "Draft", "Open", "Paused by the Lawfecta Team", "Closed", "Filled", "Canceled". Proposal status words (`PROP_STATUS`, 4942): "Draft", "Sent", "Being checked", "Withdrawn", "Chosen", "Not chosen", "Closed". Engagement badge "Needs your signature" (`agBadge`, 4940).
- Color rule stated in code (4935): yellow needs you, blue in progress, green done, grey waiting on someone else, faded grey closed, red a problem.
- Public version block shown to freelancers (`publicBlock`, 4999): the task text; a grid "Budget", "Deadline", "Practice area", "State", "Usual time", "Status" ("Closes <date time>" or "<status> <date>"); "What done looks like: <text>"; h3 "Steps" numbered list; "Tools: <list>"; "Skills: <list>".
- A long list of gig, agency and bench error messages (`GIG_ERR`, 4943 to 4977) is defined here and used across the gig pages, for example "Flex Gigs are not open for your account yet.", "Posting work and hiring need a verified license. Open Profile and verification from your account menu.", "The deadline is in the past. Choose a later date.", "This gig is not available to your account. It belongs to another member, or it was removed." Computed ones: "The smallest gig budget is <amount>."; "You have no proposals left this month. Your allowance resets on <date>. Matches stay visible."; "Your plan's limit is reached (<n>)."; "This freelancer does not work for this gig's state."
- UX observations (mine): Error wording mixes "SOP or Workflow" with "document" and "playbook" names from older versions.

---

## Also in the ranges (not a page)

- Lines 12192 to 12195: the start of the appearance (light or dark) settings (`applyTheme`, `appearanceItems`). Only the first lines fall in this range; nothing to inventory here.
- Recorder plumbing with no screen of its own: unfinished recording pieces are kept in the browser (IndexedDB "dela-recorder") so "Finish upload" can resume them; only pieces saved by the same signed-in person are offered.

---

## Cross-page elements seen

- Back button "← Library" on every Library sub-page (document, import review, recorder).
- Status badges with shared colors: green `ready`, yellow `held`, red `bad`, plain for neutral.
- Shared status word sets: document status ("Draft", "In review", "Approved", "Archived", "In the trash"); workspace card status ("Ready to use (approved)", "Draft", "Needs your review"); recording status; quality item status ("Required before approval", "Suggestion", "Passed"); setup status ("Done", "Skipped", "To do").
- Library roles: "Administrator", "Editor", "Commenter", "Viewer".
- The sensitive-data line above every AI input, and "no client information" checkboxes before every upload.
- AI actions marked with "✦" ("✦ Help me create a document", "✦ Improve this section", "✦ Check these steps", "✦ Explain these findings", "✦ Find what to automate or delegate").
- "● Talk" voice button beside AI text areas.
- AI failure pattern: "Try again" and "Use Lawfecta's DELA actions this time"; client-information warning with a "send anyway" confirmation.
- Three kinds of overlay: side drawer (`showDrawer`: Library team, Version, Blur), centered modal (`modal`: Review image, Remove this image?, Check the images), and browser confirm/prompt boxes (delete, restore, build, discard, reject reason).
- Toasts (`D.toast`) for results; inline `role="status"` lines for progress.
- Export set, always the same five formats: Word, PDF, Markdown, Web page, Step checklist.
- Tables that stack on phones (`class="stack"` with `data-label`): Recordings, RACI, Change log.
- Pills with `aria-pressed` for filters; tab strips with `role="tablist"`.
- Lock line for downgraded plans: "🔒 Upgrade to edit this document."
- Glossary term component (`D.term`) used once here: "Quality check". Help tip component (`D.helpTip`) used once: "What does Ready to use mean?"
