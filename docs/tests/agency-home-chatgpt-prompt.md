# ChatGPT test: the agency Home (step 35, 2026-11-17)

What it covers: the "My work" / "My agency" switch for the agency's owner, the six agency cards, "Paid by clients" and "Paid out to agency" shown apart and never called profit, the team card with "Hours not set" and no percentage, setting weekly hours on the Agency page, and that each view keeps its own layout.

What it cannot cover: what a team member sees (they must see no switch and no agency money; the automated tests check this with two team members and a manager), the "Ask to set hours" button (the test agency has no team member besides its owner), real payments, a phone and a screen reader.

What changes on the site: the test freelancer's weekly hours for the test agency are set to 30 and cleared again; the "My agency" layout gets one card added and is put back to the default. Nothing is paid, signed, posted, sent or booked, and nobody is invited.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. When ChatGPT reaches the login page: click "Take over", log in as the test freelancer, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the agency Home of DELA on the Lawfecta site, www.lawfecta.co. The test freelancer owns a test agency, "Roe Test Agency LLC". Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message or a proposal, do not invite or remove anyone, and do not click any button inside a card on Home other than the ones named. Use a browser window at least 1200 pixels wide. Never close the "Customize dashboard" panel with its "Close" button or the Escape key while it has changes: use "Cancel" or "Save changes" as the steps say. This test uses one login only.

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

## Part 1: test freelancer (the agency's owner)

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top right of the page, to the left of the button "Customize dashboard".
   Expect: a switch made of two buttons side by side, "My work" and "My agency". One of them is highlighted.
   Do: click "My work" (even if it is already highlighted).
   Expect: the heading "Your Workspace" and the cards "Recommended gigs", "Earnings and payments", "My proposals and invitations" and "Needs your attention" among others. No card is named "Agency revenue and payments".

2. Find: the switch at the top right.
   Do: click "My agency".
   Expect: the heading changes to "Agency Workspace", with the line "Your agency's work, team and payments." under it. The cards are now: "Agency revenue and payments", "Team workload and availability", "Recommended agency gigs", "Proposals and sales pipeline", "Active client projects", "Needs team attention". Write the names of all the cards into your report.

3. Find: the card "Agency revenue and payments".
   Expect: two boxes side by side, "Paid by clients" and "Paid out to agency", each with a dollar amount. In the grey band of the card, at the right, a small list that reads "This month". At the bottom of the card a sentence that starts "Neither amount is profit". The word "profit" appears nowhere else on the page, and there is no figure labeled revenue goal, margin or growth.
   Do: open the small list and choose "This year".
   Expect: the small grey words under the two amounts now start "this year". Write both amounts into your report.

4. Find: the card "Team workload and availability".
   Expect: three numbers with the words "Team member" (or "Team members"), "On a job now" and "On no job now". Under them a list with one row per team member. The row for the test freelancer ends "(you)" and has a grey line like "On 0 jobs · Hours not set" (the number of jobs may differ; it may show hours if they were set before). There is NO percentage in this card and no ring. At the bottom of the card, the underlined words "Manage team →". Write the grey line of the row into your report.

5. Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card "Team", and in it the row of the test freelancer (the owner). At the right of that row: the words "Hours a week", a small box, and a button "Save hours".
   Do: click in the small box, clear it, type: 30 Then click "Save hours".
   Expect: a short message "Saved: 30 hours a week."

6. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card "Team workload and availability". ("My agency" is still highlighted in the switch; if not, click "My agency".)
   Expect: the row of the test freelancer now reads "30 hours a week" in its grey line. If the test freelancer is the only team member, a sentence under the list starts "Hours a week across the team: 30." There is still no percentage.

7. Find: the button "Customize dashboard" at the top right.
   Do: click it.
   Expect: the panel opens. Under "Your dashboard (6)": "Agency revenue and payments", "Team workload and availability", "Recommended agency gigs", "Proposals and sales pipeline", "Active client projects", "Needs team attention". Under "Available widgets" there is "Quick actions" and there is NO "Earnings and payments".
   Do: under "Available widgets", click "+ Add" in the row "Quick actions". Then click "Save changes".
   Expect: the panel closes, the message "Your Home layout is saved." shows, and Home has a card "Quick actions".

8. Find: the switch at the top right.
   Do: click "My work".
   Expect: "Your Workspace" with the freelancer's own cards. There is NO card "Quick actions" and NO "Paid by clients" here: the two views keep separate layouts.
   Do: click "My agency".
   Expect: "Agency Workspace" again, with the card "Quick actions" still there.

9. Find: the button "Customize dashboard" at the top right.
   Do: click it, click the underlined words "Restore default", then click "Save changes".
   Expect: the panel closes, "Home is back to the default layout." shows, and the card "Quick actions" is gone.

10. Go to: https://www.lawfecta.co/dela?tab=agency
    Find: the card "Team", the row of the test freelancer, the small box after "Hours a week".
    Do: clear the box so it is empty, then click "Save hours".
    Expect: a short message that starts "Hours cleared."

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of "Agency Workspace" (step 2).
