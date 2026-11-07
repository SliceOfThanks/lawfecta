# ChatGPT test: the Live candidate fixes you can see (versions 0.9.1 and 0.9.2)

Claude already tested these with the real api and database: 303 api tests and all 23 browser test files, including checks that fail on the old screens. This test checks the real screens on the test site.

What it covers:
- The new sensitive data notice where people type (Ask DELA) and upload (Files), naming the six kinds of sensitive data.
- The Home tiles showing real numbers instead of 0, on both sides.
- The agency's "Agency share (%)" box, which no longer starts at 30 and shows the allowed range.
- The admin Access list, which no longer offers "Test site account", and the Overview without that tile.

It is a look-only test: nothing is saved, sent or changed. Each account logs in once: freelancer, then attorney, then the owner.

Not in this test (Claude's browser tests cover them): double clicks on "Sign and send" and "Grant bonus actions", the warning when you sign out while a recording is still uploading, and file tabs that a browser blocks.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use hirelegalhelp.com in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com.

Logins:
- test freelancer (runs the agency "Roe Test Agency LLC"): stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (Lawfecta Team): I log in for you.

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with your initials.
   - Just under the dark bar, a row of tabs. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

THIS TEST CHANGES NOTHING
Do not click "Send", "Save", "Add", "Upload", "Grant bonus actions" or any "Remove" button. The only button to click is "Invite to the bench" in step 4, with the boxes left empty: DELA stops it on the screen and sends nothing.

Steps

FREELANCER (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.

2. Go to: https://www.hirelegalhelp.com/dela?tab=home
   Find: a row of four small tiles below the dark blue "Match readiness" box near the top.
   Expect: the tiles "Proposals left this month", "Invitations", "Active projects" and "Paid out", each with a number above its name. "Proposals left this month" shows "No cap" instead of a number when the plan has no monthly proposal limit (the test freelancer is on an unlimited agency plan), and that is correct. On 2026-11-07 they read Proposals left this month No cap, Invitations 1, Active projects 8 and Paid out $0 (whole dollar amounts show without cents; no payout has been sent to this test account yet). Write down what you see. A different number is a note, not a FAIL; FAIL only if a tile is missing or is blank.

3. Go to: https://www.hirelegalhelp.com/dela?tab=ask
   Find: the message box "Your message" near the bottom of the page, and the small grey line just above it.
   Expect: the grey line reads "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Share a link from your own storage instead. You are responsible for what you enter."
   Expect: the old words "Use placeholders such as [Client Name] or [Case Number]" appear nowhere on the page. Do not type anything.

4. Go to: https://www.hirelegalhelp.com/dela?tab=agency
   Find: the card titled "Bench", near the bottom of the page (below "The agency's jobs"). At the bottom of that card, the heading "Invite to the bench".
   Expect: a box "Agency share (%)" that is empty, with the grey line "Allowed: 5% to 50%." just under it.
   Do: leave every box empty and click the blue "Invite to the bench" at the bottom of the card.
   Expect: the message "Enter the agency's share (%) first. Allowed: 5% to 50%." on the Bench card. Nothing is sent, and no new line appears in the bench list.

5. Sign out.

ATTORNEY (log in once)

6. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

7. Go to: https://www.hirelegalhelp.com/dela?tab=home
   Find: a row of small tiles below the dark "AI Delegation Center" box near the top.
   Expect: the tiles "Open gigs", "Active projects" and "Deliveries to review", each with a number. On 2026-11-07 they read Open gigs 6, Active projects 8 and Deliveries to review 0. A fourth tile about drafts may also show. Write down the numbers you see. A different number is a note, not a FAIL; FAIL if you see the old names "Open tasks" or "Pending reviews", or if every tile shows 0.

8. Go to: https://www.hirelegalhelp.com/dela?tab=ask
   Find: the message box "Your message" near the bottom of the page, and the small grey line just above it.
   Expect: the same line as in step 3, starting "Never enter sensitive data: SSNs or ITINs". Do not type anything.

9. Go to: https://www.hirelegalhelp.com/dela?tab=files
   Find: the card titled "Add files" near the top of the page.
   Expect: under the heading, the same grey line starting "Never enter sensitive data: SSNs or ITINs".
   Expect: a tick box with the words "These files have no sensitive data (no SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords)." Do not tick it and do not choose a file.

10. Sign out.

OWNER (log in once)

11. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the owner.

12. Go to: https://www.hirelegalhelp.com/dela-admin
    Do: click the tab "Overview" in the row of tabs at the top of the admin area.
    Expect: a grid of number tiles that includes "People who opened DELA", "On the access list" and "Turned away (7 days)". There is no tile named "Test site accounts".

13. On the same page:
    Do: click the tab "Access list".
    Find: the card titled "Add someone" at the top.
    Expect: a box "BD member ID", a box "Note (for example: test attorney)" and a button "Add", and no drop-down list next to them. Do not click "Add".
    Find: below it, the section "May open DELA" with its list of people.
    Expect: there is no section named "Test site accounts" anywhere on the page.

14. Sign out.
