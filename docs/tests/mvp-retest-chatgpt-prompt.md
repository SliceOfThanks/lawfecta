# ChatGPT re-test: the 5 MVP fails (2026-11-09)

> Checked against the screens on 2026-11-13 (new layout).

Checks the fixes for the MVP test's failed steps 4, 7, 13, 14 and 19, and the wording fixes. Short: three logins, 14 steps.

Notes on what changed:
- One click "Use all suggestions" for DELA's suggestions.
- The agency draft takes the state from a named city, never writes about missing facts in the summary, and names boxes still empty.
- Talent's skill filter also searches services, headline and summary.
- Step 14 of the first test used a prepared dispute job whose made-up agreement had no parties or fees; that was Claude's test data, not DELA. This re-test opens an agreement made the normal way.

Before you paste this: the passwords are filled in on the ready-to-paste copy in chat (this GitHub copy says TEST_PASSWORD). For hello@legalstacey.com use the password you chose at checkout. Each time ChatGPT reaches the login page, click "Take over", log in, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are re-testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- new attorney: hello@legalstacey.com

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

TEST FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card titled "Agency profile", near the top of the page.
   Do: in the box "Tell DELA about your agency" type: Fictional test agency: four paralegals in Austin doing family law discovery responses and case file organizing for small firms. We use Clio.
   Do: click "✦ Let DELA draft it" under that box.
   Expect: within 60 seconds "DELA filled in the boxes...", and the box "States you serve" shows TX. If any box is still empty, a yellow line names it ("Still empty: ..."). The "Summary" box says nothing about "the notes" or what is missing.
3. Do: click the dark red "Save the agency profile" at the bottom of the card.
   Expect: "Saved", and the card says "Complete."
4. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card titled "Ask DELA" at the top of the right column.
   Expect: the line from DELA at the top of that card no longer asks for the agency profile. Write what it says now.
5. Find: the top of the menu on the left, next to the round logo.
   Expect: it reads "DELA" in full (not "DEL").
   Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

TEST ATTORNEY (log in once)
6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
7. Go to: https://www.lawfecta.co/dela?tab=talent
   Do: in the box "Describe the task (for ✦ Help me find a fit)" type: Fictional test: build a document checklist for a family law case in Texas. Click "✦ Help me find a fit".
   Find: the card "Find a freelancer" at the top of the page; the box is under the search boxes.
   Expect: within 60 seconds a box with DELA's suggestions and a dark red button "Use all suggestions" under them.
   Do: click "Use all suggestions".
   Expect: the boxes "Practice area", "Skill" and "State you need" are filled at once, and a message says "Added to the filters. Check them, then click Search."
8. Do: in the same card, change the "Skill" box to: checklist. Click the dark red "Search".
   Expect: at least one freelancer is listed (DELA Test Freelancer, whose service is about document checklists).
9. Go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
   Expect: the agreement for "Repeat: Run a Conflict Check" shows the client firm, the freelancer's name, "Your total:" with an amount, and under "Fees" the price for the work and the platform fees as dollar amounts (no "-").
10. Go to: https://www.lawfecta.co/dela?tab=library
    Expect: the page heading "Library" with cards; approved documents have the label "Ready to use (approved)". (If the page shows a table headed "Document library" instead, click the underlined "Show as cards" under the table first.)
    Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

NEW ATTORNEY (log in once)
11. Go to: https://www.lawfecta.co/login and ask me to log in as hello@legalstacey.com.
12. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the page heading is "Hi" followed by the first name, or just "Hi" if the account has no name. It never says "Hi, there".
13. Go to: https://www.lawfecta.co/dela?tab=library
    Do: click "Create a document" (the dark red button at the top right of the Library; the screen it opens is titled "New document"). If the card "Your firm profile for documents" shows, type in "Describe your firm (optional)": Fictional test firm: two attorneys doing family law and estate planning in Texas; we use Clio. Then click "✦ Help me describe my firm".
    Expect: DELA's suggestions with a dark red "Use all suggestions" button under them. Click it; the boxes fill at once. (If the firm profile is already saved and the card does not show, write SKIPPED.)
14. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

Report as described in "How to work", line 10.
