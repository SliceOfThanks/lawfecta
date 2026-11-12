# ChatGPT test: functionality of version 0.10.0

> Checked against the screens on 2026-11-13 (new layout).

Checks that the new and fixed features work on the test site: Ask DELA's reminders, the plain-language Library, Notices, the monthly change, the agency in the agreement, and the owner's Trials page. Claude already tested all of these with the real api and database; this checks the real screens.

What it changes (all made-up and harmless): three short Ask DELA chats on the test attorney, and one Dry run of the trial check (which changes nothing in Brilliant Directories). Nothing is signed, paid, approved, saved to a profile or uploaded.

Each account logs in once: attorney, then freelancer, then the owner.

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
- owner: Stacey logs in herself when you ask

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
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "dark red button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

THIS TEST CHANGES ALMOST NOTHING
Only type and click what a step names. Never click "Sign", "Pay", "Approve the change", "Decline", "Save", "Switch to Live", "Create a document" or "Hire again from my standing arrangement".

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=delegate
   Find: the page heading "Ask DELA". At the right of the heading, the outlined "New chat" button (an outlined "AI settings" button sits next to it; do not click that one).
   Do: click "New chat". In the large white message box near the top (its grey hint says "Type here, or press Talk and say it"), type: My client Mary Major, case no. 2025-CV-0001, needs an intake checklist. Then click the dark red "Send" button under the box, at the right.
   Expect: a pink box saying the message includes client details that go to OpenAI, with the buttons "Edit my message" and "Continue".
   Do: click "Continue". Wait up to 60 seconds.
   Expect: DELA's answer appears in the conversation.

3. In the same conversation:
   Do: in the message box (it is now at the bottom of the conversation, under DELA's answer), type: Also add a step for Jane Roe, case no. 2025-CV-0002. Click "Send". Wait up to 60 seconds.
   Expect: DELA answers straight away, with no pink box (it remembers "Continue" for this conversation).

4. In the same conversation:
   Do: in the message box at the bottom of the conversation, type: Summarize the diagnosis in the medical records. Click "Send".
   Expect: a pink box saying this may include health information or biometric data, with an "Edit my message" button. "Continue" does not skip this one.
   Do: click "Edit my message". Then delete the text in the message box.

5. On the same page:
   Do: click "New chat" at the right of the heading "Ask DELA". In the message box near the top, type: My client Mary Major, case no. 2025-CV-0001, needs a filing checklist. Click "Send".
   Expect: the pink box about OpenAI shows again (a new chat asks again).
   Do: click "Edit my message", and delete the text. Do not send it.

6. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the heading "Library" at the top, the wide search box under it (its grey hint says "Find a document by name, purpose or ID"), and cards below.
   Do: type conflict in that search box.
   Expect: only cards about a conflict check stay, for example "Run a Conflict Check".
   Do: clear the box. Click the status button "Needs your review" (in the second row of round buttons under the search box: "All", "Ready to use", "Draft", "Needs your review").
   Expect: only cards with the yellow "Needs your review" label show. Click "All" in the same row to go back.

7. On the same page:
   Do: on any card with the green "Ready to use (approved)" label, click its dark red "Open document" button. Then click the outlined "← Library" at the top left of the document page.
   Expect: you are back on the Library, with the same buttons chosen.

8. On the same page:
   Do: click the bell (Notices) at the right of the top bar.
   Expect: a panel with "Needs your action (N)". Either a list of lines with buttons, or "Nothing waits on you right now." with "Open Projects". It never says it could not check, unless the page really failed (write it down if it does).
   Do: close the panel with the "Close" button at its top right.

9. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement" (the second card, below "What happens next"), and near the bottom of it "A change to approve" or "Your change, waiting for the other person".
   Expect, in the small table with the columns "Now" and "Proposed":
   - a row "Monthly price (before the platform fee)"
   - a row "Total each month, with the platform fee", where each total is a little higher than the price above it
   - a line under the table that ends "if approved at least 1 day before" or "1 day before billing"
   Expect: under "Note: Two more welcome packets a week", a red message starting "Check this before approving: the note says". Do not click "Approve the change" or "Decline".

10. Go to: https://www.lawfecta.co/dela?tab=projects&gig=f4546812-6749-44bd-bca0-66703c824045&view=agreement
    Find: the card "The agreement" near the top (below the card "What happens next").
    Expect: at the top of that card, "Agency (the contracting party)" with "Roe Test Agency LLC", then "Agency lead" with a person's name.

11. Sign out.

FREELANCER (log in once)

12. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

13. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
    Find: the conversation about "Send the Welcome Packet and Intake Follow-Up" (the grey line under the name at the top names that gig), and the white message box at the bottom of it.
    Expect: the grey hint inside the box says "Write a message. No sensitive data, contact details or payment outside Lawfecta." Do not type or send anything.

14. Go to: https://www.lawfecta.co/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the card "Monthly engagement" (scroll down a little: it is below the card "What happens next").
    Expect: the same small table with "Now" and "Proposed". Its second row reads "You receive each month, after your platform fee" (the freelancer sees what they receive; the attorney saw "Total each month, with the platform fee"). The same red "Check this before approving" message as in step 9. Do not click "Approve the change".

15. Sign out.

OWNER (log in once)

16. Go to: https://www.lawfecta.co/login and ask me to log in as the owner (Stacey).

17. Go to: https://www.lawfecta.co/dela-admin?tab=trials (this is "Trials" in the left menu, under the heading "PLANS AND SETTINGS").
    Expect: the card "Pro trial check" with:
    - a grey line starting "Every day at 2:00 AM Pacific", naming plans 7 or 8, Free (3), and "Plans 5, 10, 11, 12, 13, 14 are never changed"
    - the labels "Daily check: off (switch bd_trial_downgrade)" and "Trial downgrade mode: Dry run"

18. On the same page, in the card "Pro trial check":
    Do: click the dark red "Run the check now (Dry run)" button. Wait up to 60 seconds.
    Expect: a message at the bottom of the screen, and under the small heading "Runs" in the same card a new line with "Run now", "Dry run" and the problem "BD not connected yet". Nothing else changes. Do not click "Switch to Live".

19. Sign out (the button with the owner's name at the top right, then "Sign out").
