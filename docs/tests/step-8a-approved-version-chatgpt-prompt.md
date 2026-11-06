# ChatGPT test: the approved-version page (UX Phase 4 part A)

Claude already tested this with the real api and database: 5 api tests and 12 browser checks, plus all 287 api tests and all 20 browser test files. This test checks the real screens on the test site.

The approved-version page is on for the test accounts only (switch approved_view, access list). Freelancer screens do not change in part A, so this test has only an attorney group and a short owner group.

The test saves one thing: a new draft (version 2) of "Handle an upset client" (ADM-02). The approved version 1 stays in use, and the draft can stay as it is after the test.

Each account logs in once: attorney, then the owner.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use hirelegalhelp.com in other tabs while it runs.
4. Run it on its own, not at the same time as another test. Run it before the usage limits test, which makes most of the test attorney's documents read-only for a while.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com.

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
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with your initials.
   - Just under the dark bar, a row of tabs. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

NEVER CLICK
"Approve", "Send for review", "Archive", "Delete", "Post as a Flex Gig", any "Upgrade" button, and any button that starts with ✦. Only click the buttons the steps name.

Steps

ATTORNEY (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

2. Go to: https://www.hirelegalhelp.com/dela?tab=library&pb=08160507-5b7b-41d7-acd3-a57b290d9aa5
   Find: the title "ADM-02 Handle an upset client" at the top, with the labels "Playbook" and "Approved".
   Expect: under the title, a row of tabs whose first tab is "Approved version" (there is no "Draft and review" tab).
   Find: the card "Approved version 1", just under the tabs.
   Expect: the lines "Document ID" (ADM-02), "Version" (1), "Approved" (Nov 5, 2026 by DELA Test Attorney), "Owner (role)", "Last reviewed" and "Next review"; the grey line "This is the version in use: new gigs, standing arrangements and exports use it."; a blue "Edit a new draft" button; and "Export the approved version:" with the buttons "Word", "PDF", "Markdown", "Web page" and "Step checklist".
   Find: the card below it.
   Expect: the playbook's text to read, with headings, and no text boxes and no "Save" button anywhere on the page.

3. In the card "Approved version 1":
   Do: click "Markdown" after "Export the approved version:".
   Expect: a message at the bottom "Downloaded DELA - ADM-02 Handle an upset client - v1 - ..." (the file name says v1).

4. In the same card:
   Do: click "Edit a new draft".
   Expect: the tabs now read "Approved version", "New draft", and the rest. A shaded note near the top says "New draft. Your first save makes version 2 as a draft; the approved version 1 stays in use until the draft is approved." The form with text boxes opens, with the card "Quality check" on the right.
   Do: in the card "Quality check" on the right, click the blue "Save" (it is near the bottom of that card, before "Send for review"). Do not change any text first.
   Expect: within a few seconds, the tabs read "Approved version", "Draft (version 2)", and the rest. Near the top, a bold note "Draft, not approved. Do not use this as an approved procedure. The approved version 1 stays in use until this one is approved." with an outlined button "View the approved version".
   Find: in the card "Quality check", the line that starts "Export".
   Expect: it reads "Export this draft (marked DRAFT on every page):". Do not click it.

5. Do: click "View the approved version" in the bold note near the top.
   Expect: the card "Approved version 1" again, with a shaded note "A draft (version 2) is in progress. This approved version stays in use until the draft is approved." and a blue "Open the draft" button. There is no "Edit a new draft" button.

6. Do: click "Open the draft".
   Expect: the draft page with the bold "Draft, not approved" note and the card "Quality check" on the right.

7. Sign out.

OWNER (log in once)

8. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the owner.

9. Go to: https://www.hirelegalhelp.com/dela-admin
   Do: click the tab "Switches" in the row of tabs near the top.
   Expect: a row "Approved documents open on a read-only "Approved version" page with "Edit a new draft"" set to "Access list", and rows for "The Phase 4 AI helpers (checks before a commitment and writing helpers)" and "The Appearance choice (Match my device, Light, Dark) in the account menu" set to "Off". Do not change them.

10. Do: click the tab "Settings" in the row of tabs near the top.
    Find: the section "UX Phase 4: approved version, AI helpers, appearance", near the bottom. Click its heading to open it if it is closed.
    Expect: 16 settings, including "DELA actions for one run of "✦ Check the scope" on a gig draft (Lawfecta's key only)" with 1, "DELA actions for one run of "✦ Compare these proposals" (Lawfecta's key only)" with 2, and "Starting appearance for every member (light, dark or device)" with "light". Do not change anything.

11. Sign out.
