# ChatGPT test: Projects as a workspace (step 37, 2026-11-17)

What it covers: the new Projects page for an attorney. The heading with its help tip, the four numbers, the four tabs (mouse and arrow keys), "Needs your attention" with one button per item, the engagements table with progress, next milestone and "Overdue", "Quick actions" as project tasks, "Upcoming milestones", the Gigs tab with its filters and search, the Engagements tab with its search, the Standing Arrangements tab, the "+ New Gig" menu, and a short review of clarity.

What it cannot cover: a real screen reader, a phone (the automated tests check 768 and 320 pixels), posting a gig, paying, signing or approving (the test changes nothing), and what the page says when a list cannot load (the automated tests check it).

What changes on the site: nothing. The test opens pages and types in two search boxes.

One login: the test attorney.

Before you paste this:
1. The password is filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. When ChatGPT reaches the login page: click "Take over", log in as the test attorney, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the new Projects page of DELA on the Lawfecta site, www.lawfecta.co, as an attorney. Everything here uses a test account with test data. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not approve or reject a delivery, do not send a message, and do not invite anyone. Several steps open a job's page to check that a button leads to the right place: on that page, click nothing except the link named in the step to go back. Use a browser window at least 1200 pixels wide. This test uses one login only.

No step should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens, click Cancel, write FAIL for that step and say what the pop-up said.

Steps marked REVIEW ask for your judgment. Look at the screen as it is and answer in one or two sentences each. If you cannot tell something from the screen, write "could not check".

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (admin area): stacey@lawfecta.com

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Notifications", "Meetings", "Profile" and "Subscription" (and "Agency" on some accounts; a freelancer who owns an agency also sees "Projects", "Library" and "Talent"), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Notifications", "Meetings", "Files", "Get set up" (only until setup is finished), "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notifications) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

1. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the top of the page.
   Expect: the heading "Projects" with a small round "?" button beside it, the line "Manage your gigs, engagements and standing arrangements in one place.", and at the far right a dark red button "+ New Gig" with a small arrow. Under them a row of four boxes, each with a number: "Needs action", "Open and draft gigs", "Active engagements", "Standing arrangements". Under the boxes a row of four tabs: "Overview" (underlined in dark red), "Gigs", "Engagements", "Standing Arrangements". Write the four numbers into your report.
   Expect also: nowhere on the page is there a percentage with an arrow, the words "vs. last month", "At risk", "High interest" or "Top performing".

2. Find: the round "?" button right of the heading "Projects".
   Do: click it.
   Expect: a short note opens under the heading that starts "Your workspace for delegated work."
   Do: click the "?" again.
   Expect: the note closes.

3. Find: the first white card under the tabs, at the left, with the heading "Needs your attention" and a number in brackets.
   Expect: the number in brackets is the same as the number in the box "Needs action" of step 1. The card lists three rows. Each row has a bold title, a grey line with the job's name, and one button at its right. The first row is "Milestone payment due" with the button "Pay milestone". The second is "Deliverable ready for review" with the button "Review deliverable". The third is "Agreement needs your signature" with the button "Sign agreement". Under the three rows, a link "+" a number "more items". Do not click any of the three buttons.
   Do: click the link "+ ... more items".
   Expect: the card now lists every item; the count of rows equals the number in the heading. Some rows read "Review" a number "proposals" (or "Review 1 proposal") with the button "Review proposals". Write the titles of all rows into your report.

4. Find: the card "Active engagements" under "Needs your attention".
   Expect: a table with the column names "Engagement", "Freelancer", "Progress", "Next milestone", "Status", "Action" and three rows. Each row has the job's name with a dollar amount under it, the freelancer's name, words like "1 of 3 accepted" with a thin bar under them (or "Set when you both sign"), the next milestone's name with "Due" or "Was due" and a date, a status pill, and a button "View". A row whose date is before today and that reads "Was due" also has a red pill "Overdue". At the top right of the card, the link "View all →". Write the three rows into your report.

5. Find: at the right side of the page, the card "Quick actions".
   Expect: four boxes: "Review proposals", "Approve deliverables", "Pay milestones", "Sign agreements". Each has a grey line under its name: a number and "waiting", or "None waiting". There is NO "New Gig" box in this card. Under "Quick actions" is the card "Ask DELA", and under that the card "Upcoming milestones" with up to four rows, the nearest date first; each row has a milestone's name, the job and freelancer in grey, and a pill with "Due" or "Was due" and a date. Write the grey line of each of the four quick action boxes.

6. Find: the box "Approve deliverables" in the card "Quick actions".
   Do: click it.
   Expect: if its grey line said "1 waiting", the page of that job opens, with the link "← All gigs" at its top left and the tab "Agreement and work" chosen. (If it said a larger number, the page stays and the card "Needs your attention" shows every item. If it said "None waiting", the tab "Engagements" opens.) Click nothing on the job's page.
   Do: if a job's page opened, click "← All gigs" at its top left.
   Expect: the Projects page again, with the four boxes and the tabs.

7. Find: the tab "Gigs" in the row of tabs.
   Do: click it.
   Expect: "Gigs" is now underlined. The first card is "Post a new gig" with a button "Start a new gig" (do not click it). The second card is "Your gigs" with a number in brackets, a row of rounded buttons "Open and drafts (", "Filled (", "Closed (", "All (" each with a number, a box "Find a gig by its title", and a table with the columns "Gig", "Proposals", "Budget", "Closes", "Status", "Action".
   Do: click in the box "Find a gig by its title" and type: intake
   Expect: the table shows only gigs with "intake" in their title. Write how many rows remain.
   Do: clear the box. Then click the rounded button that starts "Filled (".
   Expect: the table shows gigs with the status pill "Filled".

8. Find: the tab "Engagements".
   Do: click it.
   Expect: a card "Engagements" with a number in brackets, a box "Find by title or freelancer" at the right, and the same six columns as in step 4, now with every active engagement. Under the table, a line "Finished and canceled (" with a number that opens when clicked.
   Do: click in the box and type: Avery
   Expect: only rows with the freelancer "Avery Collins" remain.
   Do: clear the box.

9. Find: the tab "Standing Arrangements".
   Do: click it.
   Expect: a card "At a glance" with a table: "Freelancer", "Monthly limit", "This month", "Remaining", "Jobs open", "Status" (it shows only if an arrangement is active or waiting; if none is, the card is missing). Under it the card "Standing arrangements (" with a number, where arrangements are set up and used. Do not click any button in it.

10. Keyboard only for this step.
    Find: the tab "Standing Arrangements", which is underlined.
    Do: click it once so it has the dark outline. Press the Left arrow key once.
    Expect: the tab "Engagements" is underlined, has the outline, and its card shows.
    Do: press the Home key once.
    Expect: the tab "Overview" is underlined and has the outline.

11. Find: the dark red button "+ New Gig" at the top right of the page.
    Do: click it.
    Expect: a small menu opens under it with "From an approved document", "Plan a task with Ask DELA" and "Create a document first".
    Do: click "From an approved document".
    Expect: the tab "Gigs" is chosen and the card "Post a new gig" is open, with a list "Document", two budget boxes and the button "Draft the gig with DELA". Do not click that button and do not fill anything in.

12. Find: the first box of the four at the top, "Needs action".
    Do: click it.
    Expect: the tab "Overview" is chosen and the card "Needs your attention" shows every item.

13. REVIEW. On the "Overview" tab, scroll once from top to bottom, then answer:
    a. In five seconds, is it clear what needs the attorney first?
    b. Is any section's purpose unclear, or does any section repeat another?
    c. Is any label, button name or sentence unclear to a lawyer? Quote it.
    d. Does anything overlap, get cut off, or leave a large empty area? Say where.
    e. Is every number labeled with what it counts?

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw; for step 13 give the five answers. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of each tab: "Overview" (step 1), "Gigs" (step 7), "Engagements" (step 8) and "Standing Arrangements" (step 9).
