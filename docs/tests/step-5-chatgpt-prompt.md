# ChatGPT test: Step 5, messages, booking and meetings

> Checked 2026-11-13 (new layout). Open point: the test freelancer logs in twice (steps 1 to 4 and steps 19 to 25), because the freelancer first sets availability and later answers the attorney's message. One login per account needs Claude to save the freelancer's availability on the test site first. Step 6 needs an open gig of the test attorney with the test freelancer invited (from the Step 4 test).

> **Replaced (2026-11-05).** Use the Claude test docs/tests/claude-track-b-gigs-messages-meetings.md instead. It covers Steps 4 and 5 step by step, with where to click. This copy is kept up to date with the screens in case it is needed.

Claude already tested all of this with the real api and database: 10 api tests and 17 browser checks (both sides, two people booking the same time, reschedule, late cancel, held messages, edits, blocking, attachments, the phone screen). This test covers the real screens. 25 steps.

Before you paste this:
1. Run the Step 4 test first. This test uses the gig from it and the invitation to the test freelancer.
2. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
3. Vectera is not connected yet, so meetings show a note instead of a join link. That is expected.
4. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
5. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
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

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card titled "Your availability for meetings" (the third card on the page, below the card "Your availability").
   Do, in that card, from the top: in "Time zone" choose my time zone (ask me which if unsure); under "Meeting lengths you offer" tick "30 minutes" and "45 minutes"; tick "Monday" to "Saturday", each with 09:00 to 17:00, and leave "Sunday" unticked; in "Days off" type next Wednesday's date as YYYY-MM-DD. Click the dark red "Save availability" at the bottom of the card.
   Expect: "Availability saved".

3. Find: the light bar across the top of the page, its right end.
   Expect: an "Inbox" button, then a bell (Notices), then the round dark red button with the initials.

4. Sign out (the round button with the initials, then "Sign out").

ATTORNEY (log in once)

5. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

6. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Your gigs" (the third card, below "Needs your action").
   Do: click the gig from the Step 4 test (the open gig the test freelancer was invited to). Then, in the row of rounded view buttons under the gig's title, click the button that starts "Proposals (".
   Find: the card "Compare proposals" and the test freelancer's row in its table.
   Do: click the outlined "Message" at the right end of that row. If the table has no row for the test freelancer, write FAIL with "no proposal from the test freelancer" and go to step 13.
   Expect: a conversation page with the freelancer's name as the heading and a grey line that starts "About the gig" and ends "Keep all work, contact and payment on Lawfecta."

7. Find: the message box at the bottom of the page (its grey hint starts "Write a message.").
   Do: type Can you start Monday? Our template is attached. Click the outlined "Attach a file" under the box, tick any file in the list that appears, then click the dark red "Send" at the right.
   Expect: the message in the conversation with the file name and "Open".

8. Do: in the same box type Or text me at 512-555-0199 and I will pay you directly and click "Send".
   Expect: a red message at the bottom of the screen that starts "DELA is holding this for a quick check by the Lawfecta Team".

9. Do: click the dark red "Book a meeting" in the row of buttons near the top of the conversation (to the right of the outlined "Open the gig").
   Expect: a card titled "Book a meeting" with a grey line that starts "Times are shown in your time zone", the dropdown "Length", the dropdown "Date" (each day with its number of open times), and under it a row of outlined time buttons. The "Date" list has no next Wednesday (the day off), no Sunday, and no time in the next 12 hours.

10. Do: click one of the time buttons.
    Expect: the line "Selected:" with the day and time, and a dark red "Review booking" under it.
    Do: click "Review booking". A browser pop-up asks "Book ...?": click "OK".
    Expect: the message "Booked. A confirmation is on its way to both of you.", and a page headed "Meeting" with the meeting in a card, the label "Time confirmed" at its right, and the grey line "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting."

11. Do: in that meeting's card, click the outlined "Add to my calendar (.ics)" (first button of the row at the bottom of the card).
    Expect: a calendar file downloads. Write its name.

12. Do: click "Inbox" at the right of the top bar.
    Expect: the heading "Inbox", the grey line "Every conversation is on a gig. Keep all work, contact and payment on Lawfecta.", and the conversation with DELA Test Freelancer listed.

13. Go to: https://www.lawfecta.co/dela?tab=ai
    Find: the card titled "Messages" (far down the page, below the heading "AI and messages").
    Expect: one tick box whose text starts "Show "Seen" when I read a message". Do not change it.

14. Sign out (the round button with the initials, then "Sign out").

OWNER, ADMIN AREA (log in once)

15. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

16. Go to: https://www.lawfecta.co/dela-admin?tab=gigs ("Gigs" in the left menu, under the heading "MARKETPLACE").
    Find: the first card, whose heading starts "Held for a check (".
    Expect: the message with the phone number, with a label such as "contact details" or "payment outside Lawfecta" at its right.
    Do: click the red "Do not deliver" under it (to the right of the dark red "It is fine: deliver it").
    Expect: "Not delivered; the member was told".

17. Go to: https://www.lawfecta.co/dela-admin?tab=meet ("Meetings and messages" in the left menu, under the heading "MARKETPLACE").
    Expect: the card "The last 30 days" with counts and a note that starts "Vectera is not connected yet", the card whose heading starts "Upcoming meetings (" with the meeting and "Waiting for Vectera" in the column "Room", and the card whose heading starts "Reports (".

18. Sign out: click the button with the owner's name at the top right, then "Sign out", the last line.

CHECK THE RESULTS (the test freelancer, second login)

19. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

20. Go to: https://www.lawfecta.co/dela?tab=inbox
    Expect: the "Inbox" button at the right of the top bar shows a number.
    Do: click the conversation with DELA Test Attorney in the list.
    Expect: the attorney's message with the file, and no message with a phone number.

21. Do: near the top of the conversation, in the row that starts with the outlined "Open the gig", click the words "✦ AI help". Then click the outlined "✦ Summarize" that appears.
    Expect: within 60 seconds, a short summary that ends "DELA's summary is for reading only. It does not change the gig, a proposal or an agreement."

22. Do: at the bottom of the page, under the message box, click the outlined "✦ Draft a reply" (to the right of "Attach a file").
    Expect: within 60 seconds, the message "DELA drafted a reply. Check it, then Send." and a reply in the message box.
    Do: change one word and click the dark red "Send".
    Expect: your message appears in the conversation.

23. Go to: https://www.lawfecta.co/dela?tab=meetings
    Find: the card of the booked meeting (the label "Time confirmed" at its right).
    Do: tick "I agree to this meeting being recorded or noted. Nothing is recorded unless both of you agree."
    Expect: "Saved. Nothing is recorded unless you both agree."

24. Do: in the same card, click the outlined "Change the time" (second button of the row at the bottom of the card).
    Expect: a card titled "Choose a new time" near the top of the page.
    Do: in its dropdown "Date" choose another day, click one of the time buttons, then click the dark red "Review the new time". A browser pop-up asks "Move the meeting to ...?": click "OK".
    Expect: "Moved. One update went to both of you."

25. Sign out (the round button with the initials, then "Sign out").

Later, after the meeting time has passed (optional, by hand): log in as each test account, open https://www.lawfecta.co/dela?tab=meetings, and in the meeting's card choose "We met" in the dropdown that says "Choose what happened", write a short summary and click "Send". When both have answered, expect "Both confirmed: you met".

Report as "How to work", line 10, says. Add the exact text of every error message.
