# ChatGPT test (track A, part 1): the document standard (Policy, Workflow, SOP, Playbook)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested all of this with the real api and database: 10 api tests, the engine tests and 30 browser checks, including misuse and the phone screen. This test covers the real screens with the real AI.

You can run this at the same time as the Claude test (track B: gigs, messages and meetings). They use different documents, so they do not get in each other's way.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "dark red button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.

A document page, once it is open, looks like this (steps refer to these parts):
- Top left: a small outlined button "← Library". Below it, the document's ID and title in large bold text, with two small labels at the right end of that line: the type (SOP, Workflow, Playbook or Policy) and the status (Draft, In review or Approved).
- Under the title: a bold notice "Draft, not approved. Do not use this as an approved procedure." when it is not approved yet.
- Then a box of header fields in two columns: "Document ID", "Version", "Owner (role)" (a dropdown), "Last reviewed", "Next review", "High risk" (a checkbox).
- Then a row of buttons across the page: "Draft and review", "Chat", "Suggested edits (number)", "Comments (number)", "Activity", "Versions", "Files (number)". Stay on "Draft and review".
- Below that, two columns. The LEFT column is the document itself: one big card with every section, then a card titled "RACI", then (Workflows only) a card titled "KPIs (3 to 5)", then a folded line "Change log (number)". The RIGHT column starts with the card titled "Quality check": two sentences at its top, then the items that need work (each with a label "Required before approval" or "Suggestion", some with an outlined button whose name starts with "Fix it:"), then a folded line "(number) checks passed", then a row of buttons ("Save", "Send for review", "Approve"), then "Export:" with the buttons "Word", "PDF", "Markdown", "Web page", "Step checklist".
- Once a document is approved, the page changes: the row of buttons starts with "Approved version", and the first card is titled "Approved version" with a number. That card has the fields "Document ID", "Version", "Approved", "Owner (role)", "Last reviewed", "Next review", then the buttons "Edit a new draft" (dark red) and, for SOPs and Workflows, "Post as a Flex Gig" (outlined), then "Export the approved version:" with "Word", "PDF", "Markdown", "Web page", "Step checklist". Below it the document is shown as plain text.

DELA now calls every Library item a "document". Note any place that still says "playbook".

1. Attorney (ask me to log in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the large heading at the top of the page.
   Do: if the heading says "Library" and the page shows cards two side by side, scroll to the very bottom of the page and click the underlined words "Show as a table" (the last of the underlined links there). If the heading already says "Document library", do nothing.
   Expect: the heading "Document library". Below it a card with the dark red button "New document", then a search box, then one table with the columns "Document", "Type", "Owner (role)", "Status", "Next review", "Review". The table has shaded band rows such as "DOC | Documents, drafting and filing (number)" or "ENG | Engagement and onboarding (number)". Each document's ID (for example DOC-02) is in small grey text under its title.

2. Find: in the table under the band row that starts "DOC | Documents, drafting and filing", the row with DOC-02 in small grey text under the title "Preparing a Small Claims Filing Packet for Attorney Review". It has the line "Imported: review required" under the ID.
   Do: click anywhere on that row.
   Expect: the document page. Near the top, under the title, the bold notice "Draft, not approved. Do not use this as an approved procedure." and a green notice that starts "DELA moved this to the document standard as ...". Report the type DELA chose and whether its reason makes sense.

3. Find: inside that green notice, a dropdown and the dark red button "Change type".
   Do: choose "SOP" in the dropdown (if it already says SOP, choose "Workflow"), then click "Change type".
   Expect: within 60 seconds a message "Now a ..." at the bottom of the screen, and the page redrawn with that type's sections. The green notice is gone.

4. Do: click "← Library" (top left), then click the row with BIL-01 under the title "Monthly Billing Review", under the band row that starts "BIL | Billing, trust and collections". In its green notice, click the outlined button "The type is right".
   Expect: the green notice goes away.

5. Do: click "← Library" (top left). In the first card under "Document library", click the dark red button "New document".
   Expect: a card titled "Your firm profile for documents".
   Do: without changing anything, scroll to the bottom of that card and click the dark red button "Save and continue".
   Expect: a message "Choose your firm size."

6. In the same card, from the top (skip the first box, "Describe your firm (optional)"):
   - "Firm size" (the first dropdown): choose "2 to 5".
   - "Practice areas" (the box below it): type Family law
   - "Jurisdictions" (the next box): type Texas state courts
   - Under the bold heading "Team roles": find the row that says "Paralegal". In the dropdown on that row choose "An email address", then type paralegal@example.com in the small box that appears next to it. Leave every other role on "Nobody yet".
   - Under the bold heading "Systems you use": in the box "Practice management" type Clio
   Do: click the dark red button "Save and continue" at the bottom of the card.
   Expect: a message that starts "Saved. No one holds:" and names the roles that nobody holds. Then the heading "New document".
   Do: if a card titled "What would you like to document?" shows under that heading, click the underlined words "I know which type I want" next to the dark red "Next" button in that card. If it does not show, do nothing.
   Expect: four boxes: "SOP", "Workflow", "Playbook", "Policy", and below them the heading "Or start from a common process".

7. Find: under "Or start from a common process", the folded line that starts "INT | Intake and conflicts (".
   Do: click that line to open it. On the row "Run a conflict check", click the dark red button "Start" at the right end of the row.
   Expect: a card titled "About this process" with "Process name" already filled in as "Run a conflict check".

8. In the card titled "About this process", from the top:
   - "Which roles touch it": tick "Attorney" and "Paralegal".
   - "Which systems it uses": tick "Clio".
   - "Any deadline or time target": type Within 1 business day of the request
   - "Steps you must personally decide or approve": type Deciding whether we accept the matter
   - Near the bottom, click the folded line "Rewrite something you already have (optional)" to open it, and type in the big box: Old checklist: search Jane Roe in Clio, case 2026-CV-0042, login password Winter2026!
   Do: click the dark red button "Draft it with DELA" at the very bottom of the card.
   Expect: within 60 seconds, the document page. Under the title: "Draft, not approved. Do not use this as an approved procedure.". In the header fields, "Document ID" starts with INT-.

9. Expect, without clicking:
   - near the top, a green notice that DELA removed client names, case numbers or passwords
   - none of these words anywhere on the page: Jane Roe, 2026-CV-0042, Winter2026 (use Ctrl+F for each)
   - in the left column's big card, these section headings in this order: Purpose, Scope, Trigger, Roles, Before you start, Steps, Decision points and escalation, Timing, Quality check, Done when, Related links
   - under "Steps", the step about accepting the matter has a red label "Attorney decides" in its top row
   Report: every item in the "Quality check" card (right column) marked "Required before approval" or "Suggestion".

10. Break a rule on purpose.
    Find: the card titled "RACI" (left column, below the big document card). It is a table: one row per step, one column per role. Each cell is a small button showing "·" (empty) or letters.
    Do: in the row "1. ..." (the first row), find a cell that shows "·" (empty). Click that cell twice, until it shows "A". Do not click a cell that already shows a letter.
    Expect: the first row now has two cells with an A, and its first cell ends with "(needs exactly one A)".
    Do: in the card titled "Quality check" (right column), click the dark red button "Save".
    Expect: in that card, the item "Exactly one Accountable (A) for every step" with a red "Required before approval" label, and the red sentence "Export, approval and Flex Gigs are blocked until the items marked "Required before approval" are fixed." The buttons "Send for review", "Approve", "Word", "PDF", "Markdown", "Web page" and "Step checklist" are greyed out.

11. Do: under that "Required before approval" item, click the outlined button whose name starts with "Fix it:" (it reads "Fix it: Exactly one Accountable (A) for every step").
    Expect: within 60 seconds that item is gone from the list, and the buttons are no longer greyed out.

12. Find: in the left column, under "Steps", the step about accepting the matter (it has the red "Attorney decides" label).
    Do: untick its checkbox "Attorney decides (the A must be an attorney role)", then click the dark red "Save" in the "Quality check" card.
    Expect: an item that starts "Every judgment step is flagged" marked "Required before approval".
    Do: click the outlined button under it whose name starts with "Fix it:".
    Expect: the item goes away, and the step shows "Attorney decides" again.

13. Find: the folded line "Change log (number)" at the bottom of the left column.
    Do: click it to open it.
    Expect: a table with the columns "Date", "What changed", "Who", "Approved by", one row for each saved version.

14. Do: in the "Quality check" card, click the dark red button "Approve".
    Expect: a message "Approved". The status label at the top changes to "Approved", the "Draft, not approved" notice is gone, and the first card is now titled "Approved version" with a number. In that card, "Next review" is about 3 months away (conflict checks count as high risk).

15. Do: in the card titled "Approved version", after the words "Export the approved version:", click "Word". Open the file.
    Expect: the ID in the file name, bold section headings, a RACI table and a change log at the end. Report anything that looks wrong in Word.

16. A Policy.
    Do: click "← Library", then the dark red "New document". If the card "What would you like to document?" shows, click the underlined words "I know which type I want" in it. Then click the box "Policy". In "Process name" type Client trust account rules, then click the dark red "Draft it with DELA" at the bottom of the card.
    Expect: within 60 seconds, the document page with the sections Purpose, Scope, The rules (with "What must happen" and "What must not happen"), Exceptions and who approves them, Related links, and no card titled "RACI".
    Do: if the "Approve" button in the "Quality check" card is not greyed out, click it.
    Expect: no "Post as a Flex Gig" button anywhere on the page.

17. A Playbook.
    Do: "← Library", "New document" (and "I know which type I want" if that card shows), the box "Playbook". In "Process name" type Handle an upset client, then "Draft it with DELA".
    Expect: the sections Situations covered, Guiding principles, Preferred approach, Acceptable fallbacks, Hard limits, Escalation, Scripts and templates, Examples. Click "Approve" in the "Quality check" card if it is not greyed out.

18. A Workflow.
    Do: "← Library", "New document" (and "I know which type I want" if that card shows), the box "Workflow". In "Process name" type Intake to signed engagement, then "Draft it with DELA".
    Expect: each stage shows "Lane (role)", a box that starts "Handoff", "Target time" and "Linked SOP" boxes, there is a "RACI" card, and there is a card titled "KPIs (3 to 5)". Report how many KPIs DELA wrote and whether each "Data source (report or field)" box is filled in.

19. Reference documents on a gig.
    Do: click "← Library", click the row of the conflict check SOP from step 8 (an INT- number in small grey text under its title). The page opens on the card titled "Approved version". In that card click the outlined button "Post as a Flex Gig".
    Expect: the Projects page. In the card titled "Post a new gig", the dropdown "Document" already shows the conflict check.
    Do: open that dropdown.
    Expect: only SOPs and Workflows in the list, never "Client trust account rules" or "Handle an upset client". Close the dropdown with the conflict check still chosen.
    Do: click the dark red "Draft the gig with DELA" at the bottom of that card.
    Expect: within 60 seconds, the gig page.
    Do: scroll to the bottom of the gig page, to the card titled "Reference documents". In its dropdown choose "Client trust account rules", then click the outlined "Attach" next to it.
    Expect: "Client trust account rules" listed in that card with an outlined "Remove" button. Do not post the gig.

20. Go to: https://www.lawfecta.co/dela?tab=profile
    Find: the card titled "Your firm profile for documents", in the lower half of the page (the button "Document preferences" in the row of buttons at the top of the Profile page jumps to it).
    Expect: your answers from step 6, a small label "No one assigned" on each role nobody holds, and a dark red button "Save the firm profile" at the bottom of the card. Do NOT click it.

21. Sign out (the round button with initials at the far right of the top bar, then "Sign out").

2. Owner (ask me to log in as the owner)

1. Go to: https://www.lawfecta.co/dela-admin?tab=aifiles
   Find: the card titled "Documents (Policy, Workflow, SOP, Playbook)", at the very bottom of the page.
   Expect: counts by type ("SOP", "Workflow", "Playbook", "Policy"), "Older playbooks waiting to convert" (0), "Converted", "Converted, not yet checked by the owner", "Blocked (missing A, attorney flag or image check)", and a table of recent conversions.

2. Go to: https://www.lawfecta.co/dela-admin?tab=switches
   Find: in the table, the rows whose small grey code name (under the bold name, in the first column) is "document_standard" and "document_conversion".
   Expect: the dropdown at the right end of each row, in the column "State", shows "Access list".

3. Sign out (the button with the owner's name at the top right, then "Sign out").

3. Check the results (test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: the table from step 1 (heading "Document library"). The conflict check SOP, "Client trust account rules", "Handle an upset client" and "Intake to signed engagement" are in it with their IDs. DOC-02 and BIL-01 no longer show "Imported: review required".
2. Sign out (the round button with initials, then "Sign out").

At the end: list every FAIL, every message that was confusing, and every place that still says "playbook".
