# ChatGPT test: the DELA guide (step 13)

> Checked against the screens on 2026-11-13 (new layout).

Tests the DELA guide on the test site (docs/briefs/step-13-dela-guide.md). It now lives in two places: the card "Ask DELA" on Home (DELA's next step with its buttons, and a box for typed questions) and the Settings page under "Suggestions and alerts" (pausing, and new gig alerts for freelancers: on Home, by email and in Notices, each on or off). Then the owner's numbers.

Prepared by Claude on the test site before the test:
- "Test job: Guide new gig (prepared)": a made-up gig from a made-up firm that fits the test freelancer (Family law, Uses Clio). DELA already sent the test freelancer the new gig alert, so it is in their Notices (and an email went to stacey+dela-freelancer@lawfecta.com).
- The test attorney already has 2 proposals waiting on "Build document checklist from questionnaire answers".
- The new attorney account hello@legalstacey.com (the one Stacey made at /checkout) has no documents yet, so it sees the first-time path.

Each account logs in once: freelancer, then the test attorney, then the new attorney, then the owner (admin area).

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead. For hello@legalstacey.com, use the password you chose at checkout.
2. Each time ChatGPT reaches the login page: click "Take over", type the email named by hand (check the browser did not fill in another account), log in, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the DELA guide on the Lawfecta test site, www.lawfecta.co. Everything here is made up; type only the made-up words in the steps.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- new attorney: hello@legalstacey.com (I log in for you)
- owner (admin area): stacey@lawfecta.com (I log in for you)

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

Steps

FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer. Then click the round button with the initials at the far right of the top bar: the first line must say "DELA Test Freelancer". If not, stop and tell me. Click the round button again to close the menu.
2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card titled "Ask DELA", at the top of the right column.
   Expect: under the heading, one line from DELA that says an attorney invited you to a gig and ends "an invited proposal does not use your monthly allowance." Under it a dark red button "See my invitations".
   Expect: below that, a box that says "Ask a question...", a dark red square button with a paper plane to its right, a grey line that ends "free answers remaining today.", and two underlined links: "Open Ask DELA" and "Suggestion settings". Write the number in the grey line.
3. Do: in the box "Ask a question..." type: Fictional test: how do invitations work? Then click the dark red square button with the paper plane.
   Expect: within 60 seconds DELA's answer shows in a shaded box under the question box, the question box is empty again, and the number in the grey line "free answers remaining today." is one lower than in step 2.
4. Do: in the same box type: My client's SSN is 123-45-6789 and click the paper plane button.
   Expect: no answer from DELA. A red message under the box says this is sensitive data (or looks like client details) and must not go in DELA. Write the message.
5. Do: in the same card, click the underlined link "Suggestion settings" at the bottom.
   Expect: the top bar says "Settings", the address ends with tab=ai, and the page has moved to the card "Suggestions and alerts" (the third card, after "Account and security" and "Appearance").
   Expect: in that card, the line "DELA suggests your next step on Home. Pausing hides the suggestions for a day.", an outlined button "Pause suggestions", then the small heading "New gig alerts" with three ticked boxes: "On Home", "By email", "In Notices".
6. Do: in the card "Suggestions and alerts", untick "By email".
   Expect: a message "Saved" at the bottom of the screen.
   Do: tick "By email" again.
   Expect: "Saved" again.
7. Do: in the same card, click the outlined button "Pause suggestions".
   Expect: the button now reads "Resume suggestions" and the line above it says "DELA's suggestions on Home are paused. They come back tomorrow, or sooner when something new needs you."
8. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card "Ask DELA", at the top of the right column.
   Expect: DELA's next-step line and the button "See my invitations" are gone. The box "Ask a question..." is still there. The second link at the bottom of the card now reads "Suggestions are paused".
   Do: click "Suggestions are paused".
   Expect: the Settings page opens at the card "Suggestions and alerts".
   Do: click the outlined button "Resume suggestions".
   Expect: the button reads "Pause suggestions" again.
9. Do: click the bell (Notices) at the right of the top bar.
   Find: in the panel, under the heading "Updates".
   Expect: a notice "A new gig fits you: Test job: Guide new gig (prepared)". Its text starts with "Why it fits: Family law; Uses Clio" and its last sentence says where to turn these alerts off. Write that last sentence.
   Do: click that notice's outlined button "Open the gig".
   Expect: the Work page opens on "Test job: Guide new gig (prepared)".
10. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the card "Ask DELA", at the top of the right column.
    Expect: DELA's line about the invitation and the dark red button "See my invitations" are back.
    Do: click "See my invitations".
    Expect: the top bar says "Work", the address has tab=work, and the page shows a card whose heading starts "Invitations (" with your invitation in it.
11. Sign out.

TEST ATTORNEY (log in once)
12. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney. Then click the round button with the initials at the far right of the top bar: the first line must say "DELA Test Attorney". If not, stop and tell me. Click the round button again to close the menu.
13. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the card titled "Ask DELA", at the top of the right column.
    Expect: under the heading, one line from DELA that starts "2 proposals arrived for", names the gig Build document checklist from questionnaire answers, and ends "Compare them side by side and choose one." Under it a dark red button "Compare the proposals".
14. Do: click "Compare the proposals".
    Expect: the top bar says "Projects" and the gig "Build document checklist from questionnaire answers" opens with the view button that starts "Proposals (" selected.
15. Go to: https://www.lawfecta.co/dela?tab=home
    Do: in the card "Ask DELA", in the box "Ask a question..." type: Fictional test: which proposal should I pick? Then click the dark red square button with the paper plane.
    Expect: an answer in a shaded box under the question box within 60 seconds. It does not give legal advice.
16. Sign out.

NEW ATTORNEY (log in once)
17. Go to: https://www.lawfecta.co/login and ask me to log in as hello@legalstacey.com.
18. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the card titled "Ask DELA", at the top of the right column.
    Expect: under the heading, a line from DELA that starts "Let's take one task off your desk." Under it, three buttons that start with "Draft:" (for example "Draft: Respond to a new inquiry"; the first one is dark red, the others outlined) and a fourth button "Something else".
19. Do: click the button "Draft: Respond to a new inquiry" (if it is not there, click the first "Draft:" button and write which one).
    Expect: the top bar says "Library" and the page heading is "New document". Because this account has no firm profile yet, it first shows the card "Your firm profile for documents". That is a PASS. Do not save anything.
20. Go to: https://www.lawfecta.co/dela?tab=home
    Do: in the card "Ask DELA", click "Something else".
    Expect: the Library opens on "New document" (the card "Your firm profile for documents" first, as in step 19). Do not save anything.
21. Sign out.

OWNER, ADMIN AREA (log in once)
22. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
23. Go to: https://www.lawfecta.co/dela-admin?tab=overview
    Expect: the admin area opens on the page "Overview" (in the left menu, "Overview" is the first line under the heading "MEMBERS").
    Find: the card "DELA guide", under the card "Emergency pause", below the row of number boxes.
    Expect: five boxes with numbers: "Members who saw it" (3 or more), "Buttons chosen", "Questions answered" (2 or more), "Paused" (1 or more) and "Gig alerts sent today" (1 or more). Under them a list of steps such as "Answer invitations", "Compare proposals" and "Pick a first task" with member counts.
24. Sign out: click the button with the owner's name and "(owner)" at the top right, then "Sign out".

Report as described in "How to work", line 10. For steps 2, 4 and 9 include the words you were asked to write down.
