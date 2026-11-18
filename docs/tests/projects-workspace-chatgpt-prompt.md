# ChatGPT test: Projects as a workspace, and posting a gig in three steps (steps 37, 38 and 39, 2026-11-18)

What it covers: the new Projects page for an attorney, and the new three-step page for posting a gig (its labels, its messages for mistakes, the costs, DELA's draft, "Save draft", the review, and that nothing is posted without the tick box). The heading with its help tip (the small floating tip of step 39), the four numbers, the four tabs (mouse and arrow keys), "Needs your attention" with one button per item, the engagements table with progress, next milestone and "Overdue", "Quick actions" as project tasks, "Upcoming milestones", the Gigs tab with its filters and search, the Engagements tab with its search, the Standing Arrangements tab, the "+ New Gig" menu, and a short review of clarity.

What it cannot cover: a real screen reader, a phone (the automated tests check 768 and 320 pixels), really posting a gig (the automated tests post one), paying, signing or approving, and what the page says when a list cannot load (the automated tests check it).

What changes on the site: one draft gig is made on the test attorney's account and deleted again in step 20. Writing it uses a DELA action of the test account. Nothing is posted, paid or signed.

One login: the test attorney.

Before you paste this:
1. The password is filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. When ChatGPT reaches the login page: click "Take over", log in as the test attorney, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the new Projects page of DELA, and the new three-step page for posting a gig, on the Lawfecta site, www.lawfecta.co, as an attorney. Everything here uses a test account with test data. Do only what the steps say. You will prepare one draft gig and delete it again; never click "Post the gig" unless a step says so. Do not pay, do not sign, do not approve or reject a delivery, do not send a message, and do not invite anyone. Several steps open a job's page to check that a button leads to the right place: on that page, click nothing except the link named in the step to go back. Use a browser window at least 1200 pixels wide. This test uses one login only.

Only step 20 should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens at any other step, click Cancel, write FAIL for that step and say what the pop-up said.

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
   Expect: the heading "Projects" with a small grey "?" in a circle beside it (about the height of a letter, not a large round button), the line "Manage your gigs, awarded work, milestones and standing arrangements.", and at the far right a dark red button "+ New Gig" with a small arrow. Under them a row of four boxes, each with a number: "Needs action", "Open and draft gigs", "Active engagements", "Standing arrangements". Under the boxes a row of four tabs: "Overview" (underlined in dark red), "Gigs", "Engagements", "Standing Arrangements". Write the four numbers into your report.
   Expect also: nowhere on the page is there a percentage with an arrow, the words "vs. last month", "At risk", "High interest" or "Top performing".

2. Find: the small grey "?" in a circle right of the heading "Projects".
   Do: click it.
   Expect: a small white box with a thin grey border opens beside or under the "?". It has the bold word "Projects", a sentence that starts "Manage posted gigs, awarded work, milestones and standing arrangements.", and a small "×" at its top right. It is NOT a blue box. It lies over the page: the four boxes with numbers and the row of tabs did not move down.
   Do: click the "?" again.
   Expect: the white box closes.
   Then find the small grey "?" right of the heading "Needs your attention" (the first white card under the tabs, at the left).
   Do: click it.
   Expect: a small white box opens by that "?" with the bold words "Needs your attention" and a sentence that starts "Items waiting for your review". The rows of the card under it did not move down.
   Do: click the "×" at the top right of the white box.
   Expect: the white box closes.

3. Find: the first white card under the tabs, at the left, with the heading "Needs your attention" and a number in brackets.
   Expect: the number in brackets is the same as the number in the box "Needs action" of step 1. The card lists three rows. Each row has a bold title, a grey line with the job's name, and one button at its right. The first row is "Milestone payment due" with the button "Pay milestone". The second is "Deliverable ready for review" with the button "Review deliverable". The third is "Agreement needs your signature" with the button "Sign agreement". Under the three rows, a link "+" a number "more items". Do not click any of the three buttons.
   Do: click the link "+ ... more items".
   Expect: the card now lists every item; the count of rows equals the number in the heading. Some rows read "Review" a number "proposals" (or "Review 1 proposal") with the button "Review proposals". Write the titles of all rows into your report.

4. Find: the card "Active engagements" under "Needs your attention".
   Expect: a table with the column names "Engagement", "Freelancer", "Milestones accepted", "Next milestone", "Status", "Action" and three rows. "Milestones accepted" and "Next milestone" each have a small grey "?" beside them. Each row has the job's name with a dollar amount under it, the freelancer's name, words like "1 of 3 accepted" with a thin bar under them (or "Set when you both sign"), the next milestone's name with "Due" or "Was due" and a date (or "Planned for" and a date when the agreement is not signed or paid yet, or "Not scheduled"), a status pill, and one button. The button reads "Pay milestone", "Review deliverable" or "Sign agreement" when that step waits on the attorney; otherwise it reads "View engagement". No button reads only "View". A row that reads "Was due" also has a red pill "Overdue"; a row that reads "Planned for" never has it. At the top right of the card, the link "View all →". Write the three rows into your report.

5. Find: at the right side of the page, the card "Quick actions".
   Expect: four boxes: "Review proposals", "Approve deliverables", "Pay milestones", "Sign agreements". Each has a grey line under its name: a number and "waiting", or "None waiting". There is NO "New Gig" box in this card. There is NO "Ask DELA" card on this page. Under "Quick actions" is the card "Upcoming milestones" with up to four rows, the nearest date first; each row has a milestone's name in bold, the job and freelancer in grey under it, and at the right "Due" or "Was due" with a date. The names read as normal lines of words; no name is broken into one word or a few letters per line. At the very bottom of the page, under all cards, a grey box starts with the bold words "About projects." Write the grey line of each of the four quick action boxes.

6. Find: the box "Approve deliverables" in the card "Quick actions".
   Do: click it.
   Expect: if its grey line said "1 waiting", the page of that job opens, with the link "← All gigs" at its top left and the tab "Agreement and work" chosen. (If it said a larger number, the page stays and the card "Needs your attention" shows every item. If it said "None waiting", the tab "Engagements" opens.) Click nothing on the job's page.
   Do: if a job's page opened, click "← All gigs" at its top left.
   Expect: the Projects page again, with the four boxes and the tabs.

7. Find: the tab "Gigs" in the row of tabs.
   Do: click it.
   Expect: "Gigs" is now underlined. There is NO card "Post a new gig" and NO button "Start a new gig" on this tab. The card is "Your gigs" with a number in brackets, a row of rounded buttons "Open and drafts (", "Filled (", "Closed (", "All (" each with a number, a box "Find a gig by its title", and a table with the columns "Gig", "Proposals", "Budget", "Closing date", "Status", "Action". In the last column a draft has the button "Continue draft", an open gig with proposals has "Review proposals", and any other gig has "View gig". No row shows "$0 to $0"; a draft without a budget shows "Budget not set". Do not click these buttons.
   Do: click in the box "Find a gig by its title" and type: intake
   Expect: the table shows only gigs with "intake" in their title. Write how many rows remain.
   Do: clear the box. Then click the rounded button that starts "Filled (".
   Expect: the table shows gigs with the status pill "Filled".

8. Find: the tab "Engagements".
   Do: click it.
   Expect: a card "Engagements" with a number in brackets, a box "Find by title or freelancer" at the right, and the same six columns as in step 4, now with every active engagement. Under the table, a line "Finished and canceled (" with a number that opens when clicked.
   Expect also: at the left above the table, a row of rounded buttons: "All active (" with a number, then one button per status, such as "Active (" and "Needs your signature (", each with a number. (If every active engagement has the same status, this row is missing; write that down and skip the next two lines.)
   Do: click the second rounded button in that row. Write its name into your report.
   Expect: the table shows only rows whose status pill reads the same words as the button. Then click "All active (" and every active engagement is back.
   Do: click in the box "Find by title or freelancer" and type: Avery
   Expect: only rows with the freelancer "Avery Collins" remain.
   Do: clear the box.

9. Find: the tab "Standing Arrangements".
   Do: click it.
   Expect: a card "At a glance" with a table: "Freelancer", "Monthly limit", "Counted this month", "Remaining", "Jobs open", "Status", "Action", with a button "Manage" at the end of each row (the card shows only if an arrangement is active or waiting; if none is, the card is missing and you skip the rest of this step after writing that down). Under it the card "Standing arrangements (" with a number. In that card each arrangement is ONE line with the freelancer's name, a status pill and the word "Details"; its details are closed.
   Do: click "Manage" in the first row of the table.
   Expect: the line of that freelancer opens in the card below and shows, among other things, a line that starts "Covers:". Nothing else on the page changes. Click no button inside the opened details.

10. Keyboard only for this step.
    Find: the tab "Standing Arrangements", which is underlined.
    Do: click it once so it has the dark outline. Press the Left arrow key once.
    Expect: the tab "Engagements" is underlined, has the outline, and its card shows.
    Do: press the Home key once.
    Expect: the tab "Overview" is underlined and has the outline.

11. Find: the first box of the four at the top, "Needs action".
    Do: click it.
    Expect: the tab "Overview" is chosen and the card "Needs your attention" shows every item.

12. REVIEW. On the "Overview" tab, scroll once from top to bottom, then answer:
    a. In five seconds, is it clear what needs the attorney first?
    b. Is any section's purpose unclear, or does any section repeat another?
    c. Is any label, button name or sentence unclear to a lawyer? Quote it.
    d. Does anything overlap, get cut off, or leave a large empty area? Say where.
    e. Is every number labeled with what it counts?

13. Find: the dark red button "+ New Gig" at the top right of the Projects page.
    Do: click it.
    Expect: a small menu opens under it with "From an approved document", "Plan a task with Ask DELA" and "Create a document first".
    Do: click "From an approved document".
    Expect: a page of its own opens. At its top left a button "← Back to Projects", then the heading "Post a New Gig" and one grey line under it. Under them a bar with three steps: "1 Set up the gig" (in dark red), "2 Review DELA's draft", "3 Review and post". The four boxes and the tabs of the Projects page are NOT on this page. At the left, three white cards: "1. Choose your work", "2. Choose the engagement type", "3. Add the details". At the right, the cards "Estimated costs" (it says "Enter a budget to see the estimated total.") and "What happens next" with three numbered lines, the first ending "(you are here)". There is NO button "Save draft" on this page.

14. Find: the bottom of the left column, the dark red button "Draft with DELA" (the button "Cancel" is at its left).
    Do: click "Draft with DELA" without filling anything in.
    Expect: nothing is created. Under the list in card 1, in red: "Choose an approved SOP or Workflow." Under the budget boxes in card 3, in red: "Enter the lowest budget, in dollars." The dark outline is on the list in card 1.

15. Find: the card "1. Choose your work" and its list, labeled "Approved SOP or Workflow".
    Do: open the list and choose the second entry (the first approved document in it). Write its name into your report.
    Expect: the red sentence under the list is gone, and a button "Preview document" shows at the right of the list. Do not click it.
    Then find the card "2. Choose the engagement type".
    Expect: two boxes side by side, "One-off" and "Monthly", each with a round selector and one grey sentence. "One-off" is chosen and has a dark red border.

16. Find: the card "3. Add the details".
    Expect: three boxes in a row, each with its name above it: "Budget from (USD)", "Budget to (USD)", "Work deadline (optional)". Under them a grey line that starts "At least $". Then a larger box named "Additional details for DELA (optional)" with "0 of 1,500 characters" under it at the right. Then a pale blue box "Protect client information".
    Do: click in "Budget from (USD)" and type: 100 Then click "Draft with DELA" at the bottom.
    Expect: in red under the budget boxes: "The budget must be at least $" and an amount. Nothing is created.
    Do: clear "Budget from (USD)" and type: 300 Click in "Budget to (USD)" and type: 600 Click in "Additional details for DELA (optional)" and type: Test draft from the ChatGPT check. Clio experience is required.
    Expect: the card "Estimated costs" at the right now shows three lines: "Your budget" with "$300 to $600", "Platform fee (" with a percentage and a least amount, and "Estimated total" with a range a little above $300 to $600. Write the three lines into your report.

17. Find: the button "Draft with DELA" at the bottom of the left column.
    Do: click it. Wait up to 60 seconds.
    Expect: while it works, a grey line under the buttons says "DELA is writing the description." Then a new page opens. The bar of steps now marks "2 Review DELA's draft" in dark red, with a tick on step 1. A green notice says the draft is to be read and "Nothing is posted yet." A card "What freelancers will read" has filled boxes: "Title", "The task", "What done looks like", "Steps, one per line", "Tools", "Skills". At the bottom: "Save draft" (left) and "Continue to review" (right). Write the title DELA wrote into your report.
    If instead a red sentence appears on the first page and your entries are still there, write FAIL with the sentence, skip steps 18 to 20, and click "Cancel".

18. Find: the box "Title" in the card "What freelancers will read".
    Do: click at the end of the title and type one space and the word: test Then click "Save draft" at the bottom left.
    Expect: a short message "Saved". The page is still on step 2 and the title ends with "test".
    Do: click "Continue to review".
    Expect: the bar marks "3 Review and post". The page shows, from the top: a card "Budget, deadline and milestones" with "$300" and "$600" in its budget boxes; a card "Estimated costs" with the same three lines as in step 16; a card "What freelancers will see" that lists the title (ending "test"), the task, the steps, "TYPE" with "One-off" under it and "BUDGET" with "$300 to $600" under it; a card with one tick box that starts "I have read what freelancers will see."; and a row of buttons: "← Back", "Save draft", "Post the gig", "Delete draft".

19. Find: the dark red button "Post the gig" in the last row. The tick box above it is NOT ticked. Leave it unticked.
    Do: click "Post the gig" once.
    Expect: the gig is NOT posted. In red under the tick box: "Tick the box to confirm you have read what freelancers will see." The page is still on step 3. Do NOT tick the box.

20. Find: the button "Delete draft" at the right end of the last row.
    Do: click it. A browser pop-up asks "Delete this draft gig?": click OK.
    Expect: the Projects page shows again. Click the tab "Gigs": the draft with the title ending "test" is not in the table.

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw; for step 12 give the five answers. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of each tab: "Overview" (step 1), "Gigs" (step 7), "Engagements" (step 8) and "Standing Arrangements" (step 9), and one of each step of posting a gig (steps 13, 17 and 18).
