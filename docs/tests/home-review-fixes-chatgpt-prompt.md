# ChatGPT test: Home after the UX and accessibility review (step 36, 2026-11-17)

This replaces checks 6 (Home by role), 7 (agency Home) and 8 (the review itself): their screens changed with this release.

What it covers: the 18 changes from the review "DELA Home dashboards: UX and accessibility changes". The cards in reading order for the keyboard, the new default order for the freelancer and the agency, one rule for "Overdue" with "Was due", one row per milestone in "Needs team attention", "Proposals to review" and Ask DELA's wording for one proposal, the Customize panel as a dialog with its own "Discard your changes?" (no browser pop-up), the usage count said once, the failed payment line, the visible label on Ask DELA, amounts in place of rings, the one request for weekly hours, and the new wording.

What it cannot cover: a real screen reader (ChatGPT sees the screen, it does not hear it), the names a screen reader gets for each row (the automated tests check them), the "Ask everyone without hours to set them" link itself (it would send real notices and emails to the sample team members; the automated tests click it), "Dismiss" on the banner, a phone, and 320 pixel width (the automated tests check it).

What changes on the site: nothing. One widget is added in the Customize panel and thrown away without saving. Nothing is paid, signed, posted, sent or booked, and nobody is invited or reminded.

Two logins, each once: the test freelancer (who is also the agency owner), then the test attorney.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking changes to the Home page of DELA on the Lawfecta site, www.lawfecta.co, for three roles: a freelancer, an agency owner and an attorney. Everything here uses test accounts with test data. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message or a proposal, do not invite, remove or remind anyone, and do not click any button or link inside a card on Home other than the ones named. Use a browser window at least 1200 pixels wide.

Two logins cover the three roles: the test freelancer owns a test agency, so its Home has a switch between "My work" (the freelancer) and "My agency" (the agency owner).

"Today" in the steps means today's date where you are. A date "before today" is a date earlier than that.

No step in this test should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens, click OK, write FAIL for that step and say what the pop-up said.

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Notifications", "Meetings", "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Notifications", "Meetings", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notifications) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test freelancer (also the agency's owner)

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top right of the page, the switch made of the two buttons "My work" and "My agency".
   Do: click "My work" (even if it is already highlighted).
   Expect: the heading "Your Workspace" and six white cards in two columns. Reading left to right, then down, like lines of text, they are: "Needs your attention" (top left), "Active work and deadlines" (top right), "Recommended gigs", "Earnings and payments", "My proposals and invitations", "Business growth insights". Write the names in that order into your report.

2. Find: the card "Needs your attention" at the top left.
   Expect: its first row is "Milestone 1: Summaries for the first six witnesses". At the right of that row is a red pill "Overdue", and its grey line contains "Was due Nov 14, 2026". Every other milestone row follows one rule: a date before today has the red pill "Overdue" and the words "Was due"; a date of today or later has no red pill and the word "Due". Rows with "Overdue" come before the others. Write each milestone row's title, its date words and whether it has the pill.

3. Find: the card "Active work and deadlines" at the top right.
   Expect: two number boxes only: "Active projects", and one about proposals (either "Unlimited" over "proposals this month", or a number over "Proposals left this month"). There is NO box "Invitations" and NO box "Paid out this month" in this card, and the words "No limit" are not in it. In the list under the boxes, the row "Repeat: Send the welcome packet" has a red pill "Overdue" and its grey line contains "was due Nov 13, 2026".

4. Find: the card "Earnings and payments" (second row, right).
   Expect: NO ring or circle. A large dollar amount with the words "received this month" beside it. Under it either the lines "Waiting for payout" and "Signed, not yet paid" with amounts, or (if every amount is $0) the one sentence "No payments this month. You are paid after the attorney accepts a milestone." The words "Contracted, not yet earned" are nowhere on the page. At the bottom of the card, the link "View earnings →".

5. Keyboard only, no mouse for this step.
   Find: the grey line "Your work, your priorities." under the heading "Your Workspace".
   Do: click once on that line. Then press the Tab key again and again, up to 60 times. Each time the dark outline moves into a card it was not in before, write down that card's name.
   Expect: the outline is always visible. The cards are entered in this order: "Needs your attention", "Active work and deadlines", "Recommended gigs", "Earnings and payments", "My proposals and invitations", "Business growth insights" (stop when you reach the third card if 60 presses are used up; say how far you got). The outline never jumps back up to a card above one it already left.

6. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right. Under its title "Customize dashboard" are two grey lines; the second reads "Home updates behind this panel as you make changes. Nothing is kept until you choose Save changes." The cards of Home behind the panel are still easy to read (only lightly dimmed). Under "Your dashboard (6)" each of the six names is followed by a small grey tag "Default".
   Do: under "Available widgets", click "+ Add" in the first row. Then click the button "Close" at the top right of the panel.
   Expect: NO browser pop-up. Near the bottom of the panel a box asks "Discard your changes?" with two buttons, "Discard changes" and "Keep editing".
   Do: click "Keep editing".
   Expect: the box is gone, the panel is still open, and the heading reads "Your dashboard (7)".
   Do: press the Escape key once.
   Expect: the box "Discard your changes?" shows again, and the panel is still open.
   Do: click "Discard changes".
   Expect: the panel closes. Home has the six cards of step 1 and no seventh card.

7. Find: the switch at the top right of the page.
   Do: click "My agency".
   Expect: the heading "Agency Workspace" and six cards. Reading left to right, then down: "Needs team attention" (top left), "Active client projects" (top right), "Team workload and availability", "Agency revenue and payments", "Proposals and sales pipeline", "Recommended agency gigs". Directly under the headings of the last two cards is the grey line "Same list as My work. Agency and personal proposals are not separated yet." Write the names in order into your report.

8. Find: the card "Needs team attention" at the top left.
   Expect: a number in a pink pill beside the heading (8 when this test was written). The first three rows start with "Overdue:", each has a red pill "Overdue" and the words "Review milestone" at the right, and they are in this order: "Overdue: Test job: Agency proposal" (was due Nov 8, 2026), "Overdue: Test job: Subcontracting active (prepared)" (was due Nov 11, 2026), "Overdue: Deposition summaries and trial exhibit preparation ..." (was due Nov 14, 2026). The grey line of the third one ends with an amount and "paid, held by Lawfecta." There is NO separate row titled "Milestone 1: Summaries for the first six witnesses" in this card. Under the list: "Showing 4 of" and the same number as in the pink pill. Write the number and the titles of the four rows.

9. Find: the card "Active client projects" at the top right.
   Expect: three rows. Each one whose date is before today has a red pill "Overdue" and the words "was due" in its grey line. When this test was written all three did: "Test job: Agency proposal", "Test job: Subcontracting active (prepared)" and "Deposition summaries and trial exhibit preparation ...".

10. Find: the card "Team workload and availability" (second row, left).
    Expect: the list of team members has NO button in any row (no "Ask to set hours"). Under the list: a sentence that ends "have no weekly hours yet, so no team total is shown.", then one underlined link "Ask everyone without hours to set them", then a grey line that starts "Each of them gets a notification in DELA and an email". There is no percentage in this card.
    Do: nothing. Do NOT click the link (it would send real notices).

Sign out: click the round button with initials at the top right, then "Sign out".

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

11. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the very top of the page, above the heading "Your Workspace".
    Expect: if a yellow bar shows there, it reads "You have used" a number "of your 1,000 DELA actions this month." and has the buttons "View subscription" and "Dismiss". (It shows only when most of the month's actions are used. If there is no bar, write "no bar".) Do not click either button.
    Then scroll to the very bottom of the page.
    Expect: under the last card there is NO underlined line that starts "DELA actions:". Scroll back to the top.

12. Find: the card "Needs your attention" at the top left.
    Expect: its first row is "The payment for milestone 2 did not go through". That row has two grey lines: the job's name, then a line that starts "Milestone 2 · $" with an amount. (If a charge failed, the line ends "payment failed on" and a date. If no charge failed, it ends after the amount.) Each row "Pay milestone 1 to start the work" also has a second grey line that starts "Milestone 1 · $". Write the second grey line of the first row into your report.

13. Find: the card "Proposals and talent matches" (second row, right).
    Expect: its first number box is labeled "Proposals to review" (6 when this test was written), not "New proposals". Write the number.
    Then find the card "Ask DELA" (third row, right).
    Expect: if its message is about the gig "Discovery response drafting, Smith v. Smith (QA)", it says "1 proposal arrived for" that gig, then "Review it and decide whether to hire.", and its button reads "Review the proposal". The words "Compare them side by side" are not in it. (The number in the card above can be larger: it counts the proposals on all open gigs, and Ask DELA talks about one gig.) Do not click the button.

14. Find: still in the card "Ask DELA", the text box.
    Expect: directly above the box, the visible label "Ask DELA a question". Inside the empty box, grey example words: "For example: What can I delegate this week?" Under the box: a line about free answers remaining today, then "Questions asked here are free and do not use your DELA actions. Planning a task uses DELA actions." There is NO count of DELA actions (no "of 1000") anywhere in this card. At the bottom of the card, two links with clear space between them: "Open Ask DELA" and "DELA suggestion settings".
    Do: click in the box and type the single letter: a
    Expect: the label "Ask DELA a question" above the box is still visible.
    Do: delete the letter so the box is empty again. Do not press Enter and do not click the round send button.

15. Find: the card "Delegation spend and results" (third row, left).
    Expect: NO ring or circle. A large dollar amount with "paid this month" beside it. If the amount is $0: the sentence "No recorded delegation spend this month." and under it the link "Post a gig →". If it is above $0: the lines "For the work" and "Platform fee" with amounts. Under them, "Results this month" with "Milestones accepted" and "Engagements completed".

16. Find: the button "Customize dashboard" at the top right of the page.
    Do: click it. Keyboard only now: press Shift and Tab together once.
    Expect: the dark outline moves from "Close" (top of the panel) to "Cancel" (bottom of the panel). It does not leave the panel.
    Do: press Tab once.
    Expect: the outline is back on "Close".
    Do: press the Escape key once.
    Expect: the panel closes at once, with no question and no browser pop-up, and the outline is on the button "Customize dashboard".

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of each Home: "Your Workspace" of the freelancer (step 1), "Agency Workspace" (step 7) and "Your Workspace" of the attorney (step 11).
