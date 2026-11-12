# ChatGPT test prompt: DELA Step 2 (playbook library and Import from Scribe)

> Checked 2026-11-13 (new layout). Open point: the names and places were put right for the new layout (the Library page, its "Import" button, the document tabs, the admin addresses), but the test is still written as short tasks in parts A to F, not as Go to / Find / Do / Expect steps, and Part D makes the attorney and the team member log in more than once. Parts A, B and E follow the older document builder, which is now reached through "Import"; "Create a document" opens the newer guided builder, which this test does not cover. Claude rewrites it step by step before it is sent.


Before you paste this:
1. The two Supabase secrets from Step 2a must be in place (AI_KEY_ENCRYPTION_SECRET and OPENAI_API_KEY), or DELA's AI answers "still being set up".
2. Fill in the logins below. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. TEAM_MEMBER_BD_ID is the BD member ID of the test freelancer or another test account that has opened DELA once.
3. For Part E, have one Scribe guide exported as HTML (Scribe: open the guide, Share, Export, Export next to HTML), made from a test task with no client information. If you have no Scribe Pro account, skip Part E.
4. Have a short process write-up as a Word or PDF file with no client information.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the playbook library in DELA on the Lawfecta test site (www.lawfecta.co). Test it like a careful attorney and like someone trying to misuse it. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information.

Logins:
- Owner (Lawfecta Team): OWNER_LOGIN
- Test attorney: ATTORNEY_LOGIN
- Test freelancer: FREELANCER_LOGIN
- A team member's BD member ID: TEAM_MEMBER_BD_ID

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "blue button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

The parts below are written as short tasks, not as Go to / Find / Do / Expect steps. Every page has a direct address; type it instead of clicking around. To sign out between parts: in the member area click the round button with your initials at the far right of the top bar, then "Sign out". In the admin area click the button with the owner's name at the top right, then "Sign out".

Part A: Build a playbook with DELA
1. Ask me to log in as the test attorney. Go to: https://www.lawfecta.co/dela?tab=library ("Library" in the menu on the left). Expect the heading "Library"; at its right the dark red "Create a document", the outlined "Import" and the underlined "Library settings"; document cards below; and near the bottom of the page a card "Not sure where to start?" with the outlined button "What am I missing?". The last grey line on the page says how many documents are saved.
2. Click "Import" at the top of the Library, then "From a file or text you already have". In the large box, type: "When a new family law client signs, we run a conflict check, send the engagement letter and open the file in Clio." Click the dark red "Draft it with DELA". Expect, within about 60 seconds, a document page with a bar under 100%, a line that starts "Still missing:" in plain words, and a "DELA's questions" card.
3. Answer the questions in your own words (or click "● Talk" and say them). Click "Fill these in". Expect the bar to rise and a new version number.
4. Repeat until it says "Every required part is filled." Expect the dark red "Approve" button at the top right of the document to work only then. Click "Approve". Expect "Approved" and a next review date about a year away.
5. Go back to the Library ("← Library" at the top left), click "Import", then "From a file or text you already have", and try "My client John Smith, DOB 01/02/1980". Expect a warning about a client's name and a date of birth before anything is sent.

Part B: Chat, suggestions, comments, versions
1. On the document, in the row of tabs under its title, open "Chat". Ask "Who runs the conflict check?" Expect an answer and no change.
2. Ask "Add a step to send the client a welcome email". Expect a reply saying the change is waiting on the tab "Suggested edits". The "Read" tab must not change yet.
3. Open the tab "Suggested edits (1)". Expect a list of what would change. Click "Accept". Expect a new version, the status back to Draft, and "last approved: version N" still shown.
4. Ask in Chat "Remove all attorney review points". Expect the suggestion to be marked "Removes an attorney review point".
5. Tab "Read": click "Comment" beside "Quality checks", write a note, tick "Suggest new text for this part", change the text, and send it. Expect it under the tabs "Suggested edits" and "Comments". Accept it.
6. Tab "Activity": expect every event (draft, filled, approved, suggestion made, accepted, commented) with names and times.
7. Tab "Versions": view an older version. Restore it. Expect it saved as a new version, nothing lost.
8. Tab "Edit": change a step, then in a second browser tab (same playbook, opened earlier) change something else and save. Expect the second save to be refused with "Someone saved a newer version".

Part C: Export
1. Open the tab "Export" on the document and click each dark red button: "Word (.docx)", "PDF" (a print window opens; choose Save as PDF), "Markdown (.md)", "Web page (.html)", "Step checklist (.csv)". Open each file. Expect the title, every part, numbered steps, and a footer with the version and date (saying "not yet approved" if it is a draft).
2. Import the CSV into a Monday board or Google Sheet, and the Word file into Notion or Google Docs. Report anything that looks broken.

Part D: Team and limits
1. Go to: https://www.lawfecta.co/dela?tab=library and click the underlined "Library settings" at the top right. Add TEAM_MEMBER_BD_ID as Editor. On the Free plan expect "Every seat on this plan is in use"; add them as Commenter instead. Expect it to work. Try adding a fourth commenter or viewer: expect a refusal.
2. Sign out and ask me to log in as that person. Go to: https://www.lawfecta.co/dela?tab=library and use the dropdown under the heading "Library" to open the attorney's library. As a commenter: "Comment" works; the tabs "Edit" and "Export" and the "Approve" button are not offered.
3. As the attorney, remove them in "Library settings". Log in as them again: the library is gone from the dropdown.
4. Ask me to log in as the test freelancer. Go to: https://www.lawfecta.co/dela?tab=home. Expect no "Library" line in the menu on the left, unless this freelancer runs an agency that hires (then "Library" shows the agency's own documents, never the attorney's).
5. As the attorney, archive a document, then delete one. Expect both under the underlined "Recently deleted (N)" near the bottom of the Library; open one from there to restore it.

Part E: Import from Scribe (skip if you have no Scribe export)
1. Go to: https://www.lawfecta.co/dela?tab=library, click "Import", then "From a Scribe guide". Choose the HTML file without ticking the box: expect a red message. Tick the box and click Read the guide.
2. Expect "Review your guide" with every Scribe step in order and its screenshot. Report any step or screenshot that is missing, out of order, or duplicated, and say how many steps Scribe showed.
3. On one screenshot click "Blur part of this image", drag a box, Save. Expect the blurred picture in place of the old one.
4. Merge two steps, add a note on why a step matters, untick one screenshot. Click Build my playbook and confirm. Expect a playbook marked as built from Scribe, with screenshots on its steps.

Part F: Owner, admin area
1. Sign out and ask me to log in as the owner. Go to: https://www.lawfecta.co/dela-admin?tab=switches (this is "Switches" in the left menu, under the heading "PLANS AND SETTINGS"). Expect the rows "Document library (attorneys)" and "Import a guide from Scribe"; write what each is set to. Go to: https://www.lawfecta.co/dela-admin?tab=settings. In the group "Documents" (older settings may sit in a group "Playbooks"): expect review months, guests, archived counting, trash days, image addresses.

Final report: a table of every step with PASS or FAIL, then anything confusing, slow (over 30 seconds), worded badly, or unsafe, with the exact text of every error message.
