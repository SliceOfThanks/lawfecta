# ChatGPT test: the notification panel and the Notifications page (step 31, 2026-11-17)

What it covers: the panel from the bell (at most six things, in two groups), one job's history, the Notifications page (filters with counts, search, the tag on each notification, tick boxes, "Dismiss" and "Restore", "Mark as unread", "Needs action"), for an attorney and a freelancer.

What it cannot cover: a screen reader and a phone.

What changes on the site: one of the test attorney's notifications is dismissed, restored and left marked as unread. Nothing is paid, signed, posted, sent or booked.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking notifications in DELA on the Lawfecta site, www.lawfecta.co. Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message, do not book or cancel a meeting. Do not click any button inside "Needs your action" or "Needs action", and do not click a notification's own action button (for example "Review and sign"), unless a step says so. The bell at the top right is now named "Notifications" (older notes may call it "Notices").

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

## Part 1: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

1. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the bell at the top right of the page, between the "Inbox" button and the round button with initials. It may carry a small red number.
   Do: click the bell.
   Expect: a panel opens at the right with the heading "Notifications" and, next to it, a small label that ends with "unread" (for example "70 unread"). Under it the heading "Needs your action" with a small grey "N pending" at its right, then the heading "Recent updates". At the bottom of the panel: the underlined words "Mark all read" and a dark red button "View all notifications →". Copy the "unread" label and the "pending" label into your report.

2. Find: in the same panel, the lists under "Needs your action" and under "Recent updates".
   Expect: at most two lines under "Needs your action", each with a button at its right. If more than two things wait, a wide button "See all N pending actions →" under them. Under "Recent updates" at most four items; each has a bold title, a date and time, and usually underlined words such as "Open the gig" or "View payment". Some items have a line that starts "View" and ends "earlier updates for this job →". Count the items under each heading and write both numbers in your report. The two numbers together must not be more than six.

3. Find: under "Recent updates", any item with a line that starts "View" and ends "earlier updates for this job →". If no item has that line, write "no grouped job" in your report and go to step 4.
   Do: click that line.
   Expect: the panel closes and a page headed "Notifications" opens. Near the top a pale blue notice that starts "Showing the history of one job" with the underlined words "Show all jobs". Under the row of rounded buttons, a list of notifications that are all about one job.
   Do: click "Show all jobs".
   Expect: the blue notice is gone and the list is longer.

4. Go to: https://www.lawfecta.co/dela?tab=notices
   Find: the top of the page.
   Expect: the heading "Notifications" and the sentence "Review updates, take action and manage your notifications." A row of rounded buttons that starts "All (", "Needs action (", "Unread (", then "Updates", "Payments", "Disputes", "Meetings", "Messages". Under them a box labelled "Search notifications" with a list "All time" at its right. Then a row with a tick box and "0 selected", the buttons "Mark as read" and "Dismiss" (both greyed out), and at the right "Sort" with a list "Most recent". Then the notifications, one white or pale pink box each. In the left menu, "Notifications" is highlighted. Copy the labels of the first three rounded buttons into your report, with their numbers.

5. Find: the first notification in the list.
   Expect: from left to right: a tick box; a small blue dot if it is unread; a bold title with a grey line under it; a small rounded tag with one of these words: "Needs action", "Update", "Payment", "Dispute", "Meeting", "Message"; a date and time; usually a button; and a small button "⋯". Write the title, the tag and the button's name in your report.

6. Find: the row of rounded buttons at the top.
   Do: click "Payments".
   Expect: every notification now shown has the tag "Payment", or the list says "Nothing here yet." Write how many are shown (the line at the bottom reads "Showing N of M notifications.").
   Do: click the button that starts "Unread (".
   Expect: every notification shown has the small blue dot.
   Do: click the button that starts "All (".

7. Find: the box labelled "Search notifications".
   Do: click in it and type: zzzz
   Expect: the sentence that starts "No notification matches".
   Do: clear the box and type: meeting
   Expect: only notifications with the word "meeting" in their title, grey line or tag, or "No notification matches". Write which.
   Do: clear the box.

8. Find: the first notification in the list whose tag is NOT "Needs action". Write its title in your report; the next steps call it THE NOTIFICATION.
   Do: tick its tick box (at its left).
   Expect: the row under the search box reads "1 selected", and "Mark as read" and "Dismiss" are no longer greyed out.
   Do: click "Dismiss" in that row.
   Expect: a short message at the bottom of the screen that starts "Dismissed." THE NOTIFICATION is gone from the list. At the end of the row of rounded buttons there is now a button that starts "Dismissed (".

9. Do: click the button that starts "Dismissed (".
   Expect: THE NOTIFICATION is listed, with the tag "Dismissed".
   Do: tick its tick box, then click "Restore" in the row under the search box.
   Expect: a short message "Restored." THE NOTIFICATION leaves this list.
   Do: click the button that starts "All (".
   Expect: THE NOTIFICATION is in the list again, without a blue dot.

10. Find: THE NOTIFICATION in the list, and the small button "⋯" at its right end.
    Do: click "⋯".
    Expect: a small menu with "Mark as unread" and "Dismiss", and often "Show this job's history".
    Do: click "Mark as unread".
    Expect: a short message "Marked as unread." and the small blue dot is back on that notification.

11. Find: the row of rounded buttons at the top.
    Do: click the button that starts "Needs action (".
    Expect: either the sentence "Nothing waits on you right now." or a list in which every line has the tag "Needs action" and a dark red button, and no tick boxes. Write how many lines there are. Do NOT click any button here.

Sign out: click the round button with initials at the top right, then "Sign out".

## Part 2: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

12. Go to: https://www.lawfecta.co/dela?tab=notices
    Find: the top of the page.
    Expect: the same page as for the attorney: the heading "Notifications", the row of rounded buttons, the box "Search notifications", and a list or the words "Nothing here yet." In the left menu, "Notifications" is highlighted. Copy the labels of the first three rounded buttons into your report, with their numbers.

13. Find: the bell at the top right of the page.
    Do: click it.
    Expect: the panel "Notifications" with "Needs your action" and "Recent updates", and the button "View all notifications →".
    Do: click the "Close" button at the top right of the panel.
    Expect: the panel closes and the page is unchanged.

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds.
