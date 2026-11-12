# ChatGPT test: attorney plan usage limits (step 9b)

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

Claude already tested this with the real api and database: 8 api tests and 13 browser checks. This test checks the real screens on the test site.

Run it after the UX check and the monthly test, not at the same time: it changes the test attorney's plan for a while.

Each account logs in once: the test attorney, then the owner.

Before you start, tell Claude "ready for the usage test". Claude then prepares this on the test site:
- The test attorney is moved to Attorney Free, set by the Lawfecta Team, for the length of the test. Attorney Free saves 3 documents, so the 3 most recently edited documents stay editable and the rest become read-only.
- This month's DELA actions are all used: 50 of 50.
- Blocking at the limits is turned on for the test accounts only.
- The test attorney's AI settings use Lawfecta's AI (not their own key), so the DELA actions limit applies.

After your test, tell Claude "usage test done". Claude moves the test attorney back to Attorney Pro and turns blocking off again.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (Lawfecta Team): I log in for you.

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

NEVER CLICK
Any "Upgrade" button or link (it leaves DELA for the plan page). Anything that pays, posts, signs or deletes.

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top of the page, just under the menu on the left.
   Expect: a yellow banner with "You've used 50 of 50 DELA actions this month." (and possibly "You've saved ... of 3 documents.") and an "Upgrade to Plus" button on the right. Do not click it.
   Find: the very bottom of the page.
   Expect: a small line "DELA actions: 50 of 50 this month".

3. Click "DELA actions: 50 of 50 this month" at the bottom of the page.
   Expect: the page "Usage" with the card "Your plan: Attorney Free" and three bars:
   - "Saved documents" with "... of 3 saved"
   - "DELA actions this month" with "50 of 50 this month"
   - "Storage" with "... of 1 GB used"
   Below them: "DELA actions reset on" and a date on the 1st of next month, and a note that viewing, exporting and assigning documents, messaging freelancers, posting gigs, hiring and paying are never limited. A box with "🔒" says how many documents are read-only.

4. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: in the table of documents, some documents have the line "🔒 Upgrade to edit this document." under their title. Write down the title of one of them. The 3 most recently edited documents have no lock.

5. Click the title you wrote down in step 4.
   Expect: at the top of the document, a box "🔒 Upgrade to edit this document. Your plan saves fewer documents, so this one is read-only. You can still view, export and assign it." with an Upgrade button. There is no "Save" button. The document text is still there to read.

6. Go to: https://www.lawfecta.co/dela?tab=delegate
   Do: click "New chat" at the top right, type Test in the message box, and click "Send".
   Expect: a window "Limit reached" with "You've used this month's DELA actions. They reset on" and a date, or upgrade for more, with "Upgrade to Plus" and "Not now". Click "Not now": the window closes. No answer from DELA appears.

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Expect: the Projects page opens as usual, with "Post a new gig", "Needs your action", "Your gigs" and "Engagements". Usage limits never block hiring. Do not post anything.

8. Go to: https://www.lawfecta.co/dela?tab=inbox
   Expect: the conversations open as usual, and you can type in the message box of a conversation. Do not send.

9. Sign out.

OWNER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

11. Go to: https://www.lawfecta.co/dela-admin?tab=usage ("Usage" in the left menu, under the heading "PLANS AND SETTINGS") in the menu on the left near the top.
    Expect: a table with the columns "Attorney", "Plan", "Documents", "DELA actions", "Storage" and "AI cost this month". The grey line above it says anyone above $10 this month is flagged, and that blocking follows the switch usage_limits_enforced.
    Find: the row of the test attorney (their email is stacey+dela-attorney@lawfecta.com).
    Expect: "Attorney Free (set by the team)", documents "... of 3", DELA actions "50 of 50", and an AI cost in dollars.

12. In that row:
    Do: click "Grant bonus actions" without typing anything.
    Expect: a message that the amount or a note is needed. Nothing is added.
    Do: type 10 in the small number box and Test bonus in the "Why (required)" box, then click "Grant bonus actions".
    Expect: "Bonus actions added for this month." and the row now shows "50 of 60 (includes 10 bonus)".

13. In the same row, click "Resync plan".
    Expect: "The plan is up to date." The plan stays "Attorney Free (set by the team)", because a plan the Lawfecta Team set by hand is kept. (If a message says Brilliant Directories did not answer or did not say the plan, write down its exact words.)

14. Sign out.
