# ChatGPT test: Home widgets by role and the Customize panel (steps 33 and 34, 2026-11-17)

REPLACED on 2026-11-17 by docs/tests/home-review-fixes-chatgpt-prompt.md (check 9). Home changed with step 36; do not run this one.

This replaces the first Home check of the same day, whose screens changed.

What it covers: the six default cards of each role, the earnings and spend cards with their ring, exact amounts and period, that nothing invented shows (no match percentages, stars, profile views or hours saved), that "Account status" is gone, the "Customize dashboard" panel ("+ Add", the arrow buttons, "Remove", "Cancel", "Save changes", "Restore default"), the layout after a reload, and that Home changes nothing on the bell or the Notifications page.

What it cannot cover: dragging a row (the automated tests do it), a phone, a screen reader, text at 200% size, whether each amount is right (the automated tests compare them with the payment records), and the agency Home, which is not built.

What changes on the site: the test attorney's Home layout is put back to the default, changed, and put back again. The test freelancer's is not changed. Nothing is paid, signed, posted, sent or booked.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the Home page of DELA on the Lawfecta site, www.lawfecta.co: the cards each role gets, and the "Customize dashboard" panel. Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message, do not book or cancel a meeting, and do not click any button inside a card on Home other than the ones named. Use a browser window at least 1200 pixels wide. Never close the panel with its "Close" button or the Escape key while it has changes: use "Cancel" or "Save changes" as the steps say.

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

## Part 1: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top of the page.
   Expect: the heading "Your Workspace", under it one line that ends "Your work, your priorities.", and at the right a button "Customize dashboard". Under them, white cards in two columns, each with a grey band at its top with its name. The cards are of different heights; none has a large empty area. Among them: "Recommended gigs", "Earnings and payments", "My proposals and invitations", "Needs your attention" and "Business growth insights". There is NO card "Account status". Nowhere on the page is there a number followed by "% Match", a star rating, or "Profile views". Write the names of all the cards into your report.

2. Find: the card "Earnings and payments".
   Expect: a ring (a circle) with a dollar amount in its middle over the words "received this month". Beside it, four lines with amounts: "Received this month", "Waiting for payout", possibly "Could not be paid out", and "Contracted, not yet earned". In the grey band of the card, at the right, a small list that reads "This month".
   Do: open that list and choose "This year".
   Expect: the words in the ring and on the first line now end "this year". Write the amounts of the lines into your report.

3. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right and Home stays visible behind it. The panel has the title "Customize dashboard", a heading "Your dashboard (" with a number, the underlined words "Restore default" at the right of that heading, a list of rows, a heading "Available widgets" with a second list, and at the bottom "Cancel" and "Save changes" ("Save changes" is pale). Each row under "Your dashboard" has six small dots, an icon, the widget's name, a button with an arrow up, a button with an arrow down, and a button "Remove". Under "Available widgets" there is NO "Trusted bench" and NO "Delegation spend and results". Write the number and the names under "Available widgets" into your report.

4. Find: under "Available widgets", the row "My availability" and its button "+ Add".
   Do: click "+ Add".
   Expect: the number after "Your dashboard" goes up by one and "My availability" is the last row. Behind the panel, Home shows a card "My availability" with a button "Edit availability". "Save changes" is now dark red.
   Do: click "Cancel" at the bottom of the panel.
   Expect: the panel closes. Home has no card "My availability".

Sign out: click the round button with initials at the top right, then "Sign out".

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

5. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the button "Customize dashboard" at the top right of the page.
   Do: click it. In the panel, click the underlined words "Restore default" at the right of the heading "Your dashboard".
   Expect: the list under "Your dashboard (6)" reads, from the top: "Needs your attention", "Things to consider delegating", "My projects and milestones", "Proposals and talent matches", "Delegation spend and results", "Ask DELA".
   Do: if "Save changes" is dark red, click it. If it is pale, click "Cancel".
   Expect: the panel closes. After "Save changes" a short message "Home is back to the default layout." shows.

6. Find: the cards on Home.
   Expect: the six cards of step 5, in two columns. There is NO card "Account status".
   - "Things to consider delegating" shows either up to three rows, each with the words "Review suggestion" at its right and a line that starts "From", or one sentence that there is nothing to suggest. Do not click a row.
   - "Proposals and talent matches" shows two numbers, "New proposals" and "Open gigs".
   - "Delegation spend and results" shows a ring with a dollar amount over "paid this month", then either the lines "For the work" and "Platform fee" with amounts or the sentence "No recorded delegation spend this month.", then "Results this month" with "Milestones accepted" and "Engagements completed". The words "hours saved" do not appear.
   At the very top right of the screen the bell has a small red number. Write that number, and what each of the three cards shows, into your report.

7. Find: the button "Customize dashboard" at the top right.
   Do: click it. Under "Available widgets", find the row "Monthly usage" and click its "+ Add".
   Expect: "Your dashboard (7)" and "Monthly usage" is the last row.
   Do: in the row "Monthly usage" under "Your dashboard", click the button with the arrow up once.
   Expect: "Monthly usage" is now one row higher, above "Ask DELA".

8. Find: under "Your dashboard", the row "Proposals and talent matches" and its button "Remove" at the right end.
   Do: click "Remove".
   Expect: the row leaves the list, the heading reads "Your dashboard (6)", and "Proposals and talent matches" is now under "Available widgets".

9. Find: the button "Save changes" at the bottom of the panel.
   Do: click it.
   Expect: the panel closes and a short message "Your Home layout is saved." shows. Home has a card "Monthly usage" with a ring (a number over "/ " and a second number), "DELA actions" with a line that ends "left this month" and a percent, and bars for "Saved documents" and "Storage". Home has no card "Proposals and talent matches". The bell at the top right shows the same number as in step 6.

10. Do: reload the page (F5, or Cmd+R on a Mac).
    Expect: Home is the same as after step 9.

11. Go to: https://www.lawfecta.co/dela?tab=notices
    Find: the top of the page.
    Expect: the heading "Notifications" and the rounded buttons "All (" with a number, "Needs action (" with a number, "Unread (" with a number. The list still shows notifications.

12. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the button "Customize dashboard" at the top right.
    Do: click it, click "Restore default", then click "Save changes".
    Expect: the panel closes and "Home is back to the default layout." shows. Home has the six cards of step 5 again.

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of the attorney's Home (step 6) and one of the freelancer's Home (step 1).
