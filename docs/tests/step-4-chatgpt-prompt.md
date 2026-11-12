# ChatGPT test: Step 4, Flex Gigs, matching, proposals and the tech catalog

> Checked 2026-11-13 (new layout). Open point: the test attorney and the test freelancer each log in a second time in group 4, and they act there (answer, choose). One login per account needs Claude to prepare the gig, the invitation and the proposal on the test site first. The document name in group 1, step 2 ("New Family Law Client Intake After Signature") and the freelancer's proposal allowance depend on the test site's data.

> **Replaced (2026-11-05).** Use the Claude test docs/tests/claude-track-b-gigs-messages-meetings.md instead. It covers Steps 4 and 5 step by step, with where to click.

Claude already tested all of this with the real api and database: 12 api tests and 28 browser checks for gigs (both sides, mistakes and misuse), 7 tests and admin checks for the tech catalog. It also checked on the test site that the test attorney can post and the test freelancer is match-ready. This test covers the real screens in a real browser.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Upload the tech catalog first if you have not yet (owner, https://www.lawfecta.co/dela-admin?tab=catalog). Group 3 checks it.
3. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.
4. The order is attorney, then freelancer, then owner, because the freelancer needs the attorney's gig. The last group is two short logins to check the results.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins (I log in for you each time):
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

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

Steps

GROUP 1. ATTORNEY (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects
   Expect: the page heading "Projects", a card titled "Post a new gig" at the top and a card titled "Your gigs" further down.
   Do: if the card "Post a new gig" shows only its heading and a dark red button "Start a new gig", click "Start a new gig".
   Do: in that card, choose "New Family Law Client Intake After Signature" in the dropdown under "Document" (its ID may stand in front of the name). Type 100 in "Budget from ($)" and 200 in "Budget to ($)". Click the dark red "Draft the gig with DELA" at the bottom of the card.
   Expect: within 60 seconds, a gig page with a card titled "Public version".

3. Find: the card "Public version".
   Expect: DELA filled in "Title", "The task", "Steps, one per line" and "Tools", with no client information.
   Do: change one word in the box "The task".

4. Find: the card "Budget, deadline and milestones", below "Public version".
   Do: set "Deadline" to a date next month. In "Milestones (private)" type Draft on the first line and Final on the second line. Click the dark red "Post the gig" at the bottom of the page.
   Expect: a red message that starts "The smallest gig budget".

5. Do: in the same card, change "Budget from ($)" to 300 and "Budget to ($)" to 600. Click "Post the gig" again.
   Expect: the message "Your gig is open until" with a date and time, and the page shows the "Matches" view (the button "Matches" is chosen in the row of rounded buttons under the title).

6. Report what the "Matches" view shows: names with a label "Good fit" or "Fair fit" and short reasons in grey (for example "Family law" or "Uses Clio").
   Expect: no percentages. It may say no one fits yet; that is fine.

7. Go to: https://www.lawfecta.co/dela?tab=talent
   Expect: a card titled "Find a freelancer" with the boxes "Practice area", "Skill", "Tech tool" and "State you need" and a dark red "Search" button, and a list of freelancers below.
   Find: the card of DELA Test Freelancer in that list.
   Do: in the dropdown in that card choose the new gig, then click the dark red "Invite to this gig" next to it.
   Expect: a message that starts "Invited".

8. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Your gigs".
   Do: click the row of the new gig. On the gig page, click the button that starts "Files (" in the row of rounded buttons under the title. In the card "Files for this gig", click the outlined "Share a file from Files", then the dark red "Share" next to any file.
   Expect: the message "Shared until" with a date, and the file listed in the card.

9. Go to: https://www.lawfecta.co/dela?tab=library
   Do: open "New Family Law Client Intake After Signature" (on the cards view click "Open document" on its card; on the table view click its row).
   Expect: the first card, titled "Approved version" with a number, has an outlined button "Post as a Flex Gig". Do NOT click it.

10. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

GROUP 2. FREELANCER (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: the page heading "Work", a green line about proposals (for example "5 of 5 proposals left this month. ..." or "No monthly cap on proposals on your plan (spam limits still apply)."), then cards whose headings start "Invitations (", "Matches (", "Drafts (" and "Sent proposals (".

3. Find: the card "Invitations (1)".
   Do: click the gig in it.
   Expect: the gig page with a green notice that starts "You are invited to send a proposal.", the public version (the task, "Budget", "Deadline", "Steps", "Tools"), a card titled "The work handed to you" with a grey line that starts "Shared with", and no card titled "Milestones".

4. Find: the card "Questions", lower on the page.
   Do: type Which intake form do you use? in the box in that card and click the outlined "Ask the attorney".
   Expect: the message "Question sent".
   Do: type Can you pay me on Venmo instead? in the same box and click "Ask the attorney".
   Expect: a message that DELA is holding it for a check by the Lawfecta Team. In the card, the question shows "Being checked by the Lawfecta Team."

5. Find: the card "Your proposal" at the bottom of the page.
   Do: click "✦ Let DELA help with qualifications", next to the box "Your relevant qualifications".
   Expect: the message "DELA drafted this from your profile. Check it before sending." and the qualifications box filled from the profile, with nothing made up. Report anything it invented.
   Do: type 450 in "Total price ($)", and fill in "What your price includes", "What it leaves out" and "Schedule" with a few made-up words each.
   Do: click the dark red "Send proposal (free: invited)" twice quickly.
   Expect: one proposal, with the label "Sent" and the words "invited, did not use your allowance".

6. Find: the card "Files for this gig", above "Questions" (it shows only if a file was shared in group 1, step 8).
   Do: click the outlined "Open" on the file.
   Expect: the file opens in a new tab.

7. Go to: https://www.lawfecta.co/dela?tab=ai
   Expect: the page heading "Settings".
   Find: the card titled "What DELA has learned about you", in the lower half of the page under the heading "AI and messages".
   Do: report what it lists, then click "Remove" on one item.
   Expect: that item leaves the list.

8. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

GROUP 3. OWNER (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela-admin?tab=gigs
   Expect, from the top:
   - a card "Held for a check (1)" with the Venmo question and the label "payment outside Lawfecta"
   - a card whose heading starts "Gigs (" with a table that has the new gig, its proposals and its matches
   - a card "Proposals sent this month, by plan"

3. Find: the Venmo question in the card "Held for a check (1)".
   Do: click the red "Do not deliver".
   Expect: the message "Not delivered; the member was told".

4. Find: the row of the new gig in the table of the card "Gigs (".
   Do: click the outlined "Pause" at the right end of the row. A browser pop-up asks why: type Test pause. and click OK.
   Expect: the message "Paused" and the row's button now says "Resume".
   Do: click "Resume".
   Expect: the message "Open again".

5. Go to: https://www.lawfecta.co/dela-admin?tab=catalog
   Find: the card whose heading starts "Tools in the catalog now (", with a table of tools.
   Do: click the outlined "Pause" at the right end of one tool's row. A browser pop-up asks why: type Test pause. and click OK.
   Expect: a message that ends "is paused" and the label "Paused" in that row.
   Do: click "Resume" in the same row.
   Expect: a message that ends "is active again".

6. Sign out (the button with the owner's name at the top right, then "Sign out").

GROUP 4. CHECK THE RESULTS (two short logins)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs", click the row of the gig. Click the button that starts "Questions" in the row of rounded buttons under the title.
   Expect: only "Which intake form do you use?" (not the Venmo one).
   Do: type an answer in the box under it and click the dark red "Answer for everyone".
   Expect: the message "Answered for every applicant".

2. Do: click the button that starts "Proposals" in the same row of rounded buttons.
   Expect: under the heading "Compare proposals", a table with the proposal: the price with the label "Within the budget", what it includes and leaves out, the schedule and the qualifications.
   Do: click the dark red "Choose" at the right end of that row. A browser pop-up asks you to confirm: click OK.
   Expect: the message "Chosen. The draft agreement is waiting for signing and funding." and the label "Filled" next to the gig's title.

3. Go to: https://www.lawfecta.co/dela?tab=delegate
   Do: type Which practice management software should a solo family law firm use? in the box "Your message" and click "Send". Wait up to 60 seconds.
   Expect: an answer that names only tools from the Lawfecta catalog.
   Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

4. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
   Go to: https://www.lawfecta.co/dela?tab=work
   Find: the card "Sent proposals (".
   Expect: the gig shows "Chosen".
   Do: click it.
   Expect: a card titled "Milestones" now lists "Draft" and "Final".
   Do: click the bell at the right end of the top bar, between the "Inbox" button and the round button with your initials.
   Expect: a panel titled "Notices" with "You were chosen for a gig".
   Sign out (the round button with your initials, then "Sign out").

Report as described in "How to work", line 10. Also give the exact text of every error message you saw.
