# ChatGPT test: UX retest fixes, Part A (step 8b)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested these with the real api and database: a test that fails before and passes after for each fix, plus all api tests and all 23 browser test files. This check looks at the real screens on the test site.

What it covers (all look only; nothing is saved, sent, signed or paid; the Library is shown as a table for two steps and then put back to cards):
- The monthly engagement's due dates are the same in the agreement and in the work, inside the paid month.
- Notices and Projects list the same things under "Needs your action"; drafts are not on that list.
- Home counts posted gigs and gig drafts apart.
- The Library's Review column says "quality notes" and opens them; the AI's proposed edits are called "Suggested edits".
- An approved document's Comments tab offers "Edit a new draft" instead of a missing tab.
- A proposal's schedule says its days once, "from signing".
- A pending monthly change shows "Now" and "Proposed" side by side.

Each account logs in once: attorney, then freelancer.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD

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
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "dark red button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

THIS TEST CHANGES NOTHING
Do not click "Sign", "Pay", "Approve the change", "Decline", "Edit a new draft", "Choose", "Save" or any button that sends or saves. Only click what a step names.

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card titled "Your projects" in the left column (it is the first card, or the second one when a card "Needs your attention" is above it).
   Expect: four grey boxes in that card, each with a number: "Deliveries to review", "Active projects", "Open gigs" and "Gig drafts". On 2026-11-07 they read Open gigs 2, Gig drafts 4, Active projects 8, Deliveries to review 0. Write down what you see; a different number is a note, not a FAIL.

3. On the same page:
   Do: click the bell (Notices) at the right of the top bar.
   Expect: a panel with the heading "Needs your action (N)" and a list of lines, each with a button (for example "Open the agreement" or "Review proposals"). Write down every line. If nothing waits, it says "Nothing waits on you right now." with "Open Projects".
   Do: close the panel with the "Close" button at its top right. Do not click the buttons in it.

4. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card titled "Needs your action" near the top (the second card, below "Post a new gig").
   Expect: the same lines you wrote down in step 3, and no line that says "a draft, not posted yet".

5. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "The agreement" (the third card, below "What happens next" and "Monthly engagement"), its "Not included:" line, and the table of milestones with a "Due" column; then lower on the page the card "Milestones".
   Expect: "Not included:" names what the monthly terms leave out (not "Not specified").
   Expect: the "Due" column and the "Milestones" card show the same dates: Nov 13, 2026, Nov 20, 2026, Nov 27, 2026 and Dec 4, 2026 (any date that moved shows "moved from" and a reason).
   Find: scroll back up to the card "Monthly engagement" (the second card) and, near the bottom of it, "A change to approve" or "Your change, waiting for the other person".
   Expect: a small table with the columns "Now" and "Proposed", the monthly price in each, and a line that starts "From the". Do not click "Approve the change" or "Decline".

6. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the row of underlined links near the bottom of the page, below the document cards ("Recordings", "Recently deleted (N)", "Show as a table").
   Do: click "Show as a table".
   Expect: the page heading changes to "Document library" and the documents show in one table with the columns "Document", "Type", "Owner (role)", "Status", "Next review" and "Review".
   Find: the row "Send the welcome packet" (ENG-01 under its title) in the table, and its last column "Review".
   Expect: it says "3 quality notes" as underlined dark red words (it may read "3 quality notes (required)"). No row says "suggestions".
   Do: click "3 quality notes".
   Expect: the document opens, scrolled to a card titled "Quality check" (or "Quality notes (3)" when the document is approved), which lists the notes.
   Find: the row of tabs across the document page, under the document's title and its facts ("Document ID", "Version" and so on). This row belongs to the document; it starts with "Draft and review" or "Approved version".
   Expect: a tab "Suggested edits (N)" and no tab named "Suggestions (N)".

7. On the same document:
   Do: in that row of tabs, click the tab "Approved version", then the tab whose name starts with "Comments".
   Expect: if there are no comments, a text that includes "The approved version is read-only: to comment, start a new draft." and an outlined button "Edit a new draft". There is no button "Go to Draft and review". Do not click "Edit a new draft".
   Do: click the outlined "← Library" at the top left of the document page. Scroll to the very bottom of the Library page and click the underlined "Show as cards" (the last line on the page).
   Expect: the Library shows cards again and its heading is "Library".

8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=f44fb7f3-5760-42f2-ab23-1c35e8d56e4a&view=proposals
   Find: the card "Compare proposals", its table of proposals and the "Schedule" column.
   Expect: each schedule that has a number of days says "... days from signing". None says the same days twice, like "10 days (10 days)". Do not click "Choose".

9. Sign out.

FREELANCER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

11. Go to: https://www.lawfecta.co/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the table of milestones in the card "The agreement" (scroll down: it is below "What happens next" and "Monthly engagement") and the card "Milestones" lower on the page.
    Expect: the same four dates as in step 5 in both places.

12. Sign out.
