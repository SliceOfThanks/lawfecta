# ChatGPT test: the approved-version page (UX Phase 4 part A)

> Checked 2026-11-13 (new layout). Open point: steps 2 to 6 need "Handle an upset client" (ADM-02) approved at version 1 with no draft open. If this test already ran once, its draft (version 2) is still there, so Claude puts the document back before the test is sent again.

Claude already tested this with the real api and database: 5 api tests and 12 browser checks, plus all 287 api tests and all 20 browser test files. This test checks the real screens on the test site.

The approved-version page is on for the test accounts only (switch approved_view, access list). Freelancer screens do not change in part A, so this test has only an attorney group and a short owner group.

The test saves one thing: a new draft (version 2) of "Handle an upset client" (ADM-02). The approved version 1 stays in use, and the draft can stay as it is after the test.

Each account logs in once: attorney, then the owner.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs.
4. Run it on its own, not at the same time as another test. Run it before the usage limits test, which makes most of the test attorney's documents read-only for a while.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (Lawfecta Team): I log in for you.

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
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

NEVER CLICK
"Approve", "Send for review", "Archive", "Delete", "Post as a Flex Gig", any "Upgrade" button, and any button that starts with ✦. Only click the buttons the steps name.

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=library&pb=08160507-5b7b-41d7-acd3-a57b290d9aa5
   Find: the title "ADM-02 Handle an upset client" at the top, with the labels "Playbook" and "Approved".
   Expect: under the title, a row of view buttons whose first button is "Approved version" (there is no "Draft and review" button), then "Chat", "Suggested edits (", "Comments (", "Activity", "Versions" and "Files (".
   Find: the card "Approved version 1", just under that row of view buttons.
   Expect: the lines "Document ID" (ADM-02), "Version" (1), "Approved" (Nov 5, 2026 by DELA Test Attorney), "Owner (role)", "Last reviewed" and "Next review"; the grey line "This is the version in use: new gigs, standing arrangements and exports use it."; a dark red "Edit a new draft" button; and "Export the approved version:" with the buttons "Word", "PDF", "Markdown", "Web page" and "Step checklist".
   Find: the card below it.
   Expect: the playbook's text to read, with headings, and no text boxes and no "Save" button anywhere on the page.

3. In the card "Approved version 1":
   Do: click "Markdown" after "Export the approved version:".
   Expect: a message at the bottom "Downloaded DELA - ADM-02 Handle an upset client - v1 - ..." (the file name says v1).

4. In the same card:
   Do: click "Edit a new draft".
   Expect: the row of view buttons now starts "Approved version", "New draft", and then the rest. A shaded note near the top says "New draft. Your first save makes version 2 as a draft; the approved version 1 stays in use until the draft is approved." The form with text boxes opens, with the card "Quality check" on the right.
   Do: in the card "Quality check" on the right, click the dark red "Save" (it is near the bottom of that card, under the list of checks; if "Send for review" shows, "Save" is just before it). Do not change any text first.
   Expect: within a few seconds, the row of view buttons starts "Approved version", "Draft (version 2)", and then the rest. Near the top, a bold note "Draft, not approved. Do not use this as an approved procedure. The approved version 1 stays in use until this one is approved." with an outlined button "View the approved version".
   Find: in the card "Quality check", the line that starts "Export".
   Expect: it reads "Export this draft (marked DRAFT on every page):". Do not click it.

5. Do: click "View the approved version" in the bold note near the top.
   Expect: the card "Approved version 1" again, with a shaded note "A draft (version 2) is in progress. This approved version stays in use until the draft is approved." and a dark red "Open the draft" button. There is no "Edit a new draft" button.

6. Do: click "Open the draft".
   Expect: the draft page with the bold "Draft, not approved" note and the card "Quality check" on the right.

7. Sign out.

OWNER (log in once)

8. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

9. Go to: https://www.lawfecta.co/dela-admin?tab=switches
   Expect: the admin area opens on the page "Switches" (in the left menu, "Switches" is under the heading "PLANS AND SETTINGS"): one table with the columns "Switch", "Before it goes on" and "State".
   Find: in that table, the rows "Approved documents open on a read-only "Approved version" page with "Edit a new draft"", "The Phase 4 AI helpers (checks before a commitment and writing helpers)" and "The Appearance choice (Match my device, Light, Dark) in the account menu" (press Ctrl+F and type Phase 4 if you do not see them).
   Expect: each of the three rows has a drop-down in the "State" column that shows "Off", "Lawfecta Team only", "Access list" or "Everyone". The first row is not "Off". Write what each of the three shows. Do not change them.

10. Go to: https://www.lawfecta.co/dela-admin?tab=settings
    Expect: the admin area opens on the page "Settings" (in the left menu, "Settings" is under the heading "PLANS AND SETTINGS").
    Find: the section "UX Phase 4: approved version, AI helpers, appearance", near the bottom. Click its heading to open it if it is closed.
    Expect: a label next to the heading with the number of settings (16 or more), and in the section "DELA actions for one run of "✦ Check the scope" on a gig draft (Lawfecta's key only)" with 1, "DELA actions for one run of "✦ Compare these proposals" (Lawfecta's key only)" with 2, and "Starting appearance for every member (light, dark or device)" with "light". Do not change anything.

11. Sign out: click the button with the owner's name and "(owner)" at the top right, then "Sign out".
