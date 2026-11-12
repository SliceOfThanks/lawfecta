# ChatGPT test prompt: DELA Step 1 (Foundation)

> Checked 2026-11-13 (new layout). Open point: two old steps were taken out because they change the site for everyone and need a decision first: switching "DELA AI help" off and on (the old step 7), and removing the test freelancer from the access list and adding them back (the old Part E, which also needs a second login for two accounts). Claude's api tests cover both.

Look only, except two things that are put back or harmless: a plan draft that is thrown away, and one test notice to the owner. Three logins, 20 steps.

Before you paste this:
1. Fill in the three test logins below (OWNER_LOGIN, ATTORNEY_LOGIN, FREELANCER_LOGIN).
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the base of DELA on the Lawfecta website, www.lawfecta.co. DELA has two workspaces: Attorney DELA and Freelancer DELA. Everything here is made up. Do only what the steps say.

Logins (I log in for you each time):
- Test freelancer (on Freelancer Free): FREELANCER_LOGIN
- Test attorney (on Attorney Pro): ATTORNEY_LOGIN
- Owner (Lawfecta Team): OWNER_LOGIN

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

LOGGED OUT (no login)
1. Go to: https://www.lawfecta.co/dela
   Expect: one card in the middle of the page with the heading "Log in to use DELA" and a button "Log in to Lawfecta". No menu and no member data.
   Go to: https://www.lawfecta.co/dela-admin
   Expect: no admin data: no menu on the left and no numbers.

TEST FREELANCER (log in once)
2. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
3. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: a heading that starts "Hi,". The menu on the left has "Home", "Work", "Ask DELA", "Earnings" and "Profile". It has no "Projects", "Library", "Talent" or "Files".
   Find: the grey line near the bottom of the left column, with the underlined words "View plan" at its right.
   Expect: the line names the plan (Freelancer Free) and ends "proposals left this month."
4. Do: click "View plan" at the right of that line.
   Expect: a card opens under the line with the heading "Your DELA plan: Freelancer Free" and a table with the columns "What you get" and "Right now". One row is "Proposals sent per month". No row starts with "Open Flex Gigs" or "Saved documents".
5. Go to: https://www.lawfecta.co/dela-admin
   Expect: the heading "Lawfecta Team only" and no data.
6. Go to: https://www.lawfecta.co/dela?tab=home
   Do: sign out (the round button with your initials at the far right of the top bar, then "Sign out").

TEST ATTORNEY (log in once)
7. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
8. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: a heading that starts "Hi,". The menu on the left starts with "Home", "Projects", "Ask DELA", "Library". It has no "Work" and no "Earnings".
   Find: the grey line near the bottom of the left column, with the underlined words "View plan" at its right.
   Do: click "View plan".
   Expect: a card with the heading "Your DELA plan: Attorney Pro" and a table of attorney limits only. No row says "Proposals sent per month".
9. Go to: https://www.lawfecta.co/dela-admin
   Expect: the heading "Lawfecta Team only" and no data.
10. Go to: https://www.lawfecta.co/dela?tab=home
    Do: reload the page five times, one after the other.
    Expect: Home loads correctly every time, with the same heading and menu.
11. Sign out (the round button with your initials, then "Sign out").

OWNER, ADMIN AREA (log in once)
12. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
13. Go to: https://www.lawfecta.co/dela-admin
    Expect: a menu on the left: "Release Control", "Guide", then the headings "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right, one button with the owner's name and "(owner)". A small label in the top bar says "Test site" or "Live". Write which one.
14. Go to: https://www.lawfecta.co/dela-admin?tab=access (this is "Access list" in the left menu, under the heading "MEMBERS").
    Find: the part titled "May open DELA".
    Expect: both test members are listed in it. Write the names you see. Do not add or remove anyone.
15. Go to: https://www.lawfecta.co/dela-admin?tab=plans (this is "Plans" in the left menu, under the heading "PLANS AND SETTINGS").
    Expect: two separate parts, "Attorney plans" and "Freelancer plans", each with a table that has the columns Free, Plus, Pro and Business and the rows "Monthly price", "Yearly price" and "BD plan ID". The attorney table has rows "Open Flex Gigs at one time" and "Saved documents" and the freelancer table does not. The freelancer table has rows "Proposals sent per month" and "Published services at one time" and the attorney table does not. Write every plan whose "BD plan ID" says "Not linked".
16. On the same page, in the attorney table:
    Do: click the "Edit" button at the bottom of the "Plus" column. In the box "Monthly price (dollars)" type 21. Click "Save draft".
    Expect: the message "Draft saved. Review it, then approve." and, back on the tables, a label "Draft waiting" on the "Plus" column.
    Do: click "Review draft" at the bottom of the "Plus" column, then the outlined "Throw draft away". Do NOT click "Approve draft".
    Expect: the message "Draft thrown away". The "Monthly price" of Plus is what it was before, and "Draft waiting" is gone.
17. Go to: https://www.lawfecta.co/dela-admin?tab=settings (this is "Settings" in the left menu, under the heading "PLANS AND SETTINGS").
    Find: the row "Smallest engagement allowed".
    Do: click the outlined "Change" at the right end of that row, then the outlined "History".
    Expect: at least one history line.
    Do: click the outlined "Cancel".
    Find: the row "How long a gig stays open".
    Do: click "Change" on that row, type the word ten in its box, and click "Save".
    Expect: a clear error message and the value does not change. Click "Cancel".
18. Go to: https://www.lawfecta.co/dela-admin?tab=switches (this is "Switches" in the left menu, under the heading "PLANS AND SETTINGS").
    Expect: a list of switches, each with a dropdown that offers "Off", "Lawfecta Team only", "Access list" and "Everyone". One row is "DELA AI help". Do NOT change any switch.
19. Go to: https://www.lawfecta.co/dela-admin?tab=overview (this is "Overview" in the left menu, under the heading "MEMBERS").
    Find: the card "Check notices", below the rows of numbers.
    Do: click "Send an in-app notice".
    Expect: the message "Test notice sent. Open the member view to see it."
    Go to: https://www.lawfecta.co/dela-admin?tab=audit (this is "Audit log" in the left menu, under the heading "SAFETY").
    Expect: a table with the columns "When", "Who", "What" and "Details". The newest rows include your sign in and the plan draft from step 16.
20. Sign out (the button with the owner's name at the top right, then "Sign out").

Report as described in "How to work", line 10. For steps 13, 14 and 15 include the words you were asked to write down. At the end, add anything that was confusing, slow, misspelled or looked unprofessional, for attorneys and for freelancers separately.
