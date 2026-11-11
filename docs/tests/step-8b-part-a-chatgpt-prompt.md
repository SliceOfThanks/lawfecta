# ChatGPT test: UX retest fixes, Part A (step 8b)

Claude already tested these with the real api and database: a test that fails before and passes after for each fix, plus all api tests and all 23 browser test files. This check looks at the real screens on the test site.

What it covers (all look only; nothing is saved, sent, signed or paid):
- The monthly engagement's due dates are the same in the agreement and in the work, inside the paid month.
- Notices and Projects list the same things under "Needs your action"; drafts are not on that list.
- Home counts posted gigs and gig drafts apart.
- The Library's Review column says "quality notes" and opens them; the AI's proposed edits are called "Suggested edits".
- An approved document's Comments tab offers "Edit a new draft" instead of a missing tab.
- A proposal's schedule says its days once, "from signing".
- A pending monthly change shows "Now" and "Proposed" side by side.

Each account logs in once: attorney, then freelancer.

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
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

THIS TEST CHANGES NOTHING
Do not click "Sign", "Pay", "Approve the change", "Decline", "Edit a new draft", "Choose", "Save" or any button that sends or saves. Only click what a step names.

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the row of small tiles below the dark "AI Delegation Center" box near the top.
   Expect: the tiles "Open gigs", "Gig drafts", "Active projects" and "Deliveries to review", each with a number. On 2026-11-07 they read Open gigs 2, Gig drafts 4, Active projects 8, Deliveries to review 0. Write down what you see; a different number is a note, not a FAIL.

3. On the same page:
   Do: click "Notices" in the dark bar at the top.
   Expect: a panel with the heading "Needs your action (N)" and a list of lines, each with a button (for example "Open the agreement" or "Review proposals"). Write down every line. If nothing waits, it says "Nothing waits on you right now." with "Open Projects".
   Do: close the panel with its X at the top right. Do not click the buttons in it.

4. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card titled "Needs your action" near the top.
   Expect: the same lines you wrote down in step 3, and no line that says "a draft, not posted yet".

5. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "The agreement", its "Not included:" line, and the table of milestones with a "Due" column; then lower on the page the card "Milestones".
   Expect: "Not included:" names what the monthly terms leave out (not "Not specified").
   Expect: the "Due" column and the "Milestones" card show the same dates: Nov 13, 2026, Nov 20, 2026, Nov 27, 2026 and Dec 4, 2026 (any date that moved shows "moved from" and a reason).
   Find: the card "Monthly engagement" and, in it, "A change to approve" or "Your change, waiting for the other person".
   Expect: a small table with the columns "Now" and "Proposed", the monthly price in each, and a line that starts "From the". Do not click "Approve the change" or "Decline".

6. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the row "Send the welcome packet" (ENG-01) in the table, and its last column "Review".
   Expect: it says "3 quality notes" as a link. No row says "suggestions".
   Do: click "3 quality notes".
   Expect: the document opens on its draft and review page, scrolled to the card "Quality check", which lists the notes.
   Find: the row of tabs on the document page.
   Expect: a tab "Suggested edits (N)" and no tab named "Suggestions (N)".

7. On the same document:
   Do: click the tab "Approved version", then the tab whose name starts with "Comments".
   Expect: if there are no comments, the text "The approved version is read-only: to comment, start a new draft." and a button "Edit a new draft". There is no button "Go to Draft and review". Do not click "Edit a new draft".

8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=f44fb7f3-5760-42f2-ab23-1c35e8d56e4a&view=proposals
   Find: the table of proposals and its "Schedule" column.
   Expect: each schedule that has a number of days says "... days from signing". None says the same days twice, like "10 days (10 days)". Do not click "Choose".

9. Sign out.

FREELANCER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

11. Go to: https://www.lawfecta.co/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the table of milestones in "The agreement" and the card "Milestones" lower on the page.
    Expect: the same four dates as in step 5 in both places.

12. Sign out.
