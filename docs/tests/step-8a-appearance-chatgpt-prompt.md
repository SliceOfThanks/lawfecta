# ChatGPT test: the Appearance choice (UX Phase 4 part D)

> Checked against the screens on 2026-11-13 (new layout).


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

Only click what the steps name. In Dark, note any text that is hard to read, with where it is.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: DELA is light: a light page with white cards, a light menu on the left and a light bar at the top.
   Do: click the round dark red button with your initials at the far right of the top bar.
   Expect: the menu that opens shows, from the top: the name, "Profile", "Account and security", "Settings", then the grey word "Appearance" with "Match my device", "✓ Light" and "Dark" under it, and last "Sign out".
   Do: click "Dark".
   Expect: the message "Appearance: Dark" at the bottom of the screen, and DELA turns dark at once: a near-black page with dark cards and light text, and the menu on the left and the top bar are dark too.

3. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: the Work page is still dark (the choice stays when you open another page). Scroll down the page: all text, buttons and links are easy to read, and so are the names in the menu on the left.

4. Go to: https://www.lawfecta.co/dela?tab=earnings
   Expect: still dark, and easy to read.
   Do: click the round button with your initials at the far right of the top bar, then click "Light".
   Expect: "Appearance: Light" and DELA is light again.

5. Sign out (the round button with the initials, then "Sign out", the last line).

ATTORNEY (log in once)

6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Expect: DELA is light (each person's choice is their own; the freelancer's Dark did not carry over).
   Do: click the round button with your initials at the far right of the top bar, then click "Dark".
   Expect: DELA turns dark. Scroll down the Projects page: all cards, buttons and labels are easy to read.

8. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: still dark and easy to read, including the list of documents (cards or a table) and the outlined buttons.
   Do: click the round button with your initials, then click "Match my device".
   Expect: "Appearance: Match my device", and DELA follows this browser's own setting (light or dark). Write down which one it shows.
   Do: click the round button with your initials, then click "Light".
   Expect: "Appearance: Light" and DELA is light again.

9. Sign out (the round button with the initials, then "Sign out").

OWNER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

11. Go to: https://www.lawfecta.co/dela-admin
    Find: the button "Stacey Lake (owner)" at the top right of the page.
    Do: click it.
    Expect: a menu with "My account", then the grey word "Appearance" with "Match my device", "✓ Light" and "Dark", then "Member view" and "Sign out".
    Do: click "Dark".
    Expect: the message "Appearance: Dark" and the admin area turns dark, with the menu on the left dark too.

12. Go to: https://www.lawfecta.co/dela-admin?tab=overview ("Overview" in the left menu, under the heading "MEMBERS").
    Expect: the page is dark and easy to read.

13. Go to: https://www.lawfecta.co/dela-admin?tab=switches ("Switches" in the left menu, under the heading "PLANS AND SETTINGS").
    Expect: the page is dark and easy to read.
    Find: in the table, the row "The Appearance choice (Match my device, Light, Dark) in the account menu" (its small grey code name is appearance_choice; press Ctrl+F and type appearance_choice if the list is long).
    Expect: the drop-down in its "State" column shows "Access list" or "Everyone". Write which one. Do not change it.
    Do: click "Stacey Lake (owner)" at the top right, then click "Light".
    Expect: "Appearance: Light" and the admin area is light again.

14. Sign out: click "Stacey Lake (owner)" at the top right, then "Sign out", the last line.
