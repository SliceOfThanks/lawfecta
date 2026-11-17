# ChatGPT test: the Home page each member arranges (step 33, 2026-11-17)

What it covers: the new Home ("Your Workspace") with its cards for both sides, the "Customize dashboard" panel (add, "Cancel", the three-dot menu with "Move up", the switch that removes, "Save changes", "Reset to default"), the layout after a reload, and that taking the notifications card off Home leaves the bell and the Notifications page as they were.

What it cannot cover: dragging a row with the mouse or a finger (the automated tests do it), a phone, a screen reader, and the layout following a member to a second device.

What changes on the site: the test attorney's Home layout is changed and then put back to the default. The test freelancer's is not changed. Nothing is paid, signed, posted, sent or booked.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the new Home page of DELA on the Lawfecta site, www.lawfecta.co, and its "Customize dashboard" panel. Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message, do not book or cancel a meeting, and do not click any button inside a card on Home other than the ones named. Use a browser window at least 1200 pixels wide. Never close the panel with its "Close" button or the Escape key while it has changes: use "Cancel" or "Save changes" as the steps say.

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
   Expect: the heading "Your Workspace", under it one line that ends "Your work, your priorities.", and at the right of the heading a button "Customize dashboard" with a small icon of four squares. Under them, white cards in two columns. Each card has a grey band at its top with its name. Write the names of all the cards into your report, in reading order (left to right, then down). Among them are "Ask DELA", "Needs your attention", "Monthly usage" and "Urgent notifications". There is NO large dark red banner on this page.

2. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right side of the screen and Home stays visible behind it, a little dimmed. The panel has the title "Customize dashboard", two lines of help that end "Removing a widget only hides it on Home.", a heading "My dashboard (" with a number, the underlined words "Reset to default" at the right of that heading, a list of rows, then a heading "Available widgets" with a second list, and at the bottom the buttons "Cancel" and "Save changes". "Save changes" looks pale because nothing has changed yet. Each row under "My dashboard" has six small dots at its left, an icon, a name, a round on/off switch, and a button with three dots. Under "Available widgets" there is NO row "My bench". Write the number after "My dashboard" and the names under "Available widgets" into your report.

3. Find: under "Available widgets", the row "Quick actions" and its button "+ Add" at the right.
   Do: click "+ Add".
   Expect: the number after "My dashboard" goes up by one, and "Quick actions" is now the last row of that list. Behind the panel, Home now shows a card "Quick actions". "Save changes" is now dark red.

4. Find: the button "Cancel" at the bottom of the panel.
   Do: click it.
   Expect: the panel closes. Home no longer has a card "Quick actions".

Sign out: click the round button with initials at the top right, then "Sign out".

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

5. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top of the page.
   Expect: the heading "Your Workspace" and the button "Customize dashboard". Cards in two columns, among them "Ask DELA", "Needs your attention", "My projects", "Monthly usage" and "Urgent notifications". The card "Monthly usage" shows "DELA actions" and "Storage", each with a bar, and at its bottom the underlined words "View usage details →". The card "My projects" shows four numbers ("Deliveries to review", "Active projects", "Open gigs", "Gig drafts") and at its bottom "View all projects →". At the very top right of the screen, the bell has a small red number. Write that number into your report.

6. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: the panel opens. The list under "My dashboard (6)" reads, from the top: "Ask DELA", "Needs your attention", "My projects", "Monthly usage", "Urgent notifications", "Account status". Under "Available widgets": "Upcoming meetings", "Recent messages", "My bench", "Standing arrangements", "Quick actions", each with one grey line of description and a button "+ Add".
   If the list is different, write what it shows and carry on.

7. Find: under "Available widgets", the row "Recent messages".
   Do: click its "+ Add".
   Expect: "My dashboard (7)". "Recent messages" is the last row. Behind the panel, Home shows a card "Recent messages".

8. Find: in the list under "My dashboard", the row "Recent messages", and the button with three dots at its right end.
   Do: click the three dots.
   Expect: a small menu with "Move up", "Move down" (pale, because it is the last row) and "Remove from Home".
   Do: click "Move up".
   Expect: "Recent messages" is now one row higher, above "Account status".

9. Find: in the list under "My dashboard", the row "Urgent notifications", and the round switch in that row (dark red, to the left of the three dots).
   Do: click the switch.
   Expect: the row leaves the list, the heading reads "My dashboard (6)", and "Urgent notifications" is now under "Available widgets". Behind the panel, Home has no card "Urgent notifications".

10. Find: the button "Save changes" at the bottom of the panel.
    Do: click it.
    Expect: the panel closes and a short message "Your Home layout is saved." shows. Home has a card "Recent messages" and no card "Urgent notifications". The bell at the top right still shows the same number as in step 5.

11. Do: reload the page (F5, or Cmd+R on a Mac).
    Expect: Home is the same as after step 10: "Recent messages" is there, "Urgent notifications" is not.

12. Go to: https://www.lawfecta.co/dela?tab=notices
    Find: the top of the page.
    Expect: the heading "Notifications" and the row of rounded buttons "All (" with a number, "Needs action (" with a number, "Unread (" with a number. The list under it still shows notifications. Nothing was removed by taking the card off Home.

13. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the button "Customize dashboard" at the top right of the page.
    Do: click it. Then click the underlined words "Reset to default" at the right of the heading "My dashboard (6)".
    Expect: the list reads again: "Ask DELA", "Needs your attention", "My projects", "Monthly usage", "Urgent notifications", "Account status". "Save changes" is dark red.
    Do: click "Save changes".
    Expect: the panel closes and a short message "Home is back to the default layout." shows. Home has the card "Urgent notifications" again and no card "Recent messages".

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of the attorney's Home with the panel open (step 6).
