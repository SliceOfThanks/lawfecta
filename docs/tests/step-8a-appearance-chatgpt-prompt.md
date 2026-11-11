# ChatGPT test: the Appearance choice (UX Phase 4 part D)

Claude already tested this with the real api and database: 3 api tests and 20 browser checks, including a contrast check of every piece of text on nine member and admin pages in Dark, plus all 299 api tests and all 23 browser test files. This test checks the real screens on the test site.

The Appearance choice is on for the test accounts and the Lawfecta Team only (switch appearance_choice, access list). Everyone starts on Light.

It saves only each account's Appearance choice, and the test sets each one back to Light at the end. Each account logs in once: freelancer, then attorney, then the owner.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
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
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Only click what the steps name. In Dark, note any text that is hard to read, with where it is.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: DELA is light: a light grey page with white cards.
   Do: click the round button with your initials at the far right of the dark top bar.
   Expect: the menu shows "Appearance" in grey, then "Match my device", "✓ Light" and "Dark", above "Sign out".
   Do: click "Dark".
   Expect: the message "Appearance: Dark", and DELA turns dark at once (a near-black page with dark cards and light text).

3. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: the Work page is still dark (the choice stays when you open another page). Scroll down the page: all text, buttons and links are easy to read.

4. Go to: https://www.lawfecta.co/dela?tab=earnings
   Expect: still dark, and easy to read.
   Do: open the menu (your initials) and click "Light".
   Expect: "Appearance: Light" and DELA is light again.

5. Sign out.

ATTORNEY (log in once)

6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Expect: DELA is light (each person's choice is their own; the freelancer's Dark did not carry over).
   Do: open the menu (your initials) and click "Dark".
   Expect: DELA turns dark. Scroll down the Projects page: all cards, buttons and labels are easy to read.

8. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: still dark and easy to read, including the table of documents and the outlined buttons.
   Do: open the menu and click "Match my device".
   Expect: "Appearance: Match my device", and DELA follows this browser's own setting (light or dark). Write down which one it shows.
   Do: open the menu and click "Light".
   Expect: DELA is light again.

9. Sign out.

OWNER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

11. Go to: https://www.lawfecta.co/dela-admin
    Find: in the dark bar at the top, a drop-down "Light" (its name is Appearance), just left of "Member view".
    Do: choose "Dark" in it.
    Expect: the message "Appearance saved" and the admin area turns dark. Click the tabs "Overview" and "Switches": both easy to read.
    Find: on the Switches tab, the row "The Appearance choice (Match my device, Light, Dark) in the account menu".
    Expect: it is set to "Access list". Do not change it.
    Do: choose "Light" in the Appearance drop-down.
    Expect: "Appearance saved" and the admin area is light again.

12. Sign out.
