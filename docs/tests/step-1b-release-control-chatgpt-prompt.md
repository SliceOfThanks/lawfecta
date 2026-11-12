# ChatGPT test prompt: DELA 0.2.0 (Release Control, help tips and Guide)

> Checked 2026-11-13 (new layout). Open point: what Release Control shows depends on the site's setup. While the second copy (Live) is not set up, the page has the card "One site for the pilot", the Live card says "Live: second copy, not set up", and "Push to Live" stays greyed out, so step 15 can only run once Live is set up. Steps 2 and 3 expect the plan names "Freelancer Free" and "Attorney Pro", which depend on the test accounts.

Paste everything below the line into ChatGPT in agent mode. The website address is already filled in. Fill in the three test logins first (OWNER_LOGIN, ATTORNEY_LOGIN, FREELANCER_LOGIN).
Do not give ChatGPT your release password. Part D is done by you, not ChatGPT.

---

You are testing the Release Control page in the DELA admin area on the Lawfecta website (www.lawfecta.co). It controls when new versions go from the test site to Live (real members). Test it like a careful owner and like someone trying to misuse it. Do not enter real client information anywhere. Never type a password unless the step says so.

Logins (I log in for you each time):
- Owner (Lawfecta Team): OWNER_LOGIN
- Test attorney: ATTORNEY_LOGIN
- Test freelancer: FREELANCER_LOGIN

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

PART C. MEMBERS CANNOT USE IT

TEST FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela-admin
   Expect: one card with the heading "Lawfecta Team only" and no Release Control data.
   Go to: https://www.lawfecta.co/dela?tab=home
   Expect: the freelancer menu on the left ("Home", "Work", "Ask DELA", "Earnings") and a page heading that starts "Hi". Near the bottom of the left column, a grey line with the plan name "Freelancer Free" and the underlined words "View plan" at its right. There is no card titled "Almost there".
   Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

TEST ATTORNEY (log in once)

3. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela-admin
   Expect: one card with the heading "Lawfecta Team only" and no Release Control data.
   Go to: https://www.lawfecta.co/dela?tab=home
   Expect: the attorney menu on the left ("Home", "Projects", "Ask DELA", "Library") and a page heading that starts "Hi". Near the bottom of the left column, a grey line with the plan name "Attorney Pro" and the underlined words "View plan" at its right. There is no card titled "Almost there".

4. Find: the menu on the left, and the menu that opens from the round button with your initials at the far right of the top bar (click it once to look, then click it again to close it).
   Expect: no line named "Guide", "Release Control" or "Admin area" in either menu.
   Sign out (the round button with your initials, then "Sign out").

OWNER (log in once)

PART A. FIRST LOOK

5. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

6. Go to: https://www.lawfecta.co/dela-admin
   Expect: the page heading "Release Control", and "Release Control" is the first line of the menu on the left, in pink.
   Find: two cards side by side under the heading. The left one is titled "This site:" with the site's name. The right one is titled "Live" (or "Live: second copy, not set up").
   Expect: each card has a label at its right (for example "Healthy") and the boxes "Version running", "Problems, last 24 hours" and "Paused areas". The left card also has "Worker last ran"; the right card has "Checked". The left card says "Healthy" and "Worker last ran" is a few minutes ago at most.

7. Find: the card that starts with the small words "Next version" and a version number in large text, below the two cards. (If it says "No new version is waiting.", write that and go to step 10.)
   Expect: under "Steps to Live", six steps: "Built on the test site", "Automatic tests passed", "ChatGPT report saved", "You marked it tested", "Pushed with your password" (it may end "and code"), "Live and healthy". Done steps show a tick. The next step to do is highlighted.

8. Find: in the same card, three boxes under the steps: "What changes for members", "Database changes", "Proof it works".
   Do: in "Proof it works", click the link "Automatic tests: passed".
   Expect: a GitHub page opens in a new tab and says the run succeeded. Close that tab.

9. Find: in the same card, the tick box "I tested this version on the test site and it is ready" and the large button "Push to Live" under it.
   Expect: under the button, a plain list of anything still missing (for example "The ChatGPT test report is not saved yet. Send it to Claude." or "GitHub is not connected for pushes yet (see Live setup)."). "Push to Live" is greyed out while anything is listed. Do NOT tick the box.

10. Find: the card "Version history", below. Click "Show" at its right if it is folded.
    Expect: a table with the columns "Version", "Where it is", "What changed", "Going back". "Where it is" shows labels such as "Live now", "Was live before", "Tested on the test site" or "Ready to test". Only versions that were live before have a "Go back to this" button. Do NOT click it.

11. Find: the card "Activity", below on the left. Click "Show" at its right if it is folded.
    Do: click each rounded button in turn: "All", "Pushes", "Go backs", "Security", "Health", "Settings", "Pauses".
    Expect: the list changes each time (it may say "Nothing here yet.").
    Do: click "Show more" if it appears. Then click "Open the full audit log".
    Expect: the page "Audit log" opens and the address ends with tab=audit.

12. Go to: https://www.lawfecta.co/dela-admin?tab=control
    Find: the card "Live setup", on the right below "Version history". Click "Show" if it is folded.
    Expect: a label with a count like "4 of 9 done". Lines that are done have a tick.
    Do: click the outlined "Check again" at the bottom of the card.
    Expect: the page refreshes without errors.
    Find: the card "Emergency pause on Live", under "Live setup". Click "Show" if it is folded.
    Expect: the line "Paused on Live now: ..." and a grey line that starts "To pause Live, open the Live admin area".

PART A2. HELP TIPS, FOLDING SECTIONS AND THE GUIDE

13. Do: open each of these pages in turn and look at the page heading:
    https://www.lawfecta.co/dela-admin?tab=guide
    https://www.lawfecta.co/dela-admin?tab=overview
    https://www.lawfecta.co/dela-admin?tab=access
    https://www.lawfecta.co/dela-admin?tab=people
    https://www.lawfecta.co/dela-admin?tab=plans
    https://www.lawfecta.co/dela-admin?tab=settings
    https://www.lawfecta.co/dela-admin?tab=switches
    https://www.lawfecta.co/dela-admin?tab=team
    https://www.lawfecta.co/dela-admin?tab=holds
    https://www.lawfecta.co/dela-admin?tab=audit
    https://www.lawfecta.co/dela-admin?tab=jobs
    Expect: on each page a round "?" button next to the page heading. Click it: a help box opens in plain words. Click it again: it closes. Report any page without a "?", and any help text that is unclear or uses jargon.

14. Go to: https://www.lawfecta.co/dela-admin?tab=overview
    Do: click the "?" next to three of the number tiles (for example "People who opened DELA").
    Expect: each explains what the number means.
    Go to: https://www.lawfecta.co/dela-admin?tab=control
    Do: click the "?" next to "Version running" and "Problems, last 24 hours" in the left card.
    Expect: each explains what the number means and what a good value looks like.

15. Go to: https://www.lawfecta.co/dela-admin?tab=settings
    Expect: the page heading "Settings and decisions", and the settings grouped in cards. Only the first card is open; the others have a "Show" button at their right.
    Do: click "Show" on the card "Engagement money".
    Expect: the settings appear and the button says "Hide".
    Do: click "Hide".
    Expect: they fold away.
    Do: click "Show" on it again, then reload the page.
    Expect: the card "Engagement money" is still open.

16. Go to: https://www.lawfecta.co/dela-admin?tab=plans
    Expect: two cards, "Attorney plans" and "Freelancer plans", each with its own table and a "Hide" button at its right.

17. Go to: https://www.lawfecta.co/dela-admin?tab=guide
    Expect: the page heading "Guide", a card "On this page" with a numbered list of nine topics, and below it the section "Start here" open.
    Do: click "What a push moves" in the list.
    Expect: that section opens and the page moves to it. It shows two boxes side by side, "Moves to Live" and "Stays on its own copy".

18. Find: on the same page, the section "How a version gets to Live". Click "Show" at its right if it is folded.
    Expect: a row of six steps ("Built on the test site", "Automatic tests", "Your ChatGPT test", "You mark it tested", "Push to Live", "15 minute watch") and then numbered steps explained one by one.
    Do: open and read every Guide section.
    Report: anything a person new to DELA would not understand.

PART B. MISTAKES AND MISUSE

19. Go to: https://www.lawfecta.co/dela-admin?tab=control
    Find: the card "Live setup", the line "Live project ID entered" with a box and a "Save" button.
    Do: type ABC in the box and click "Save".
    Expect: the message "The Live project ID is the 20 small letters and numbers in its Supabase address." and no change.

20. Find: the button "Push to Live" in the "Next version" card.
    Do: only if it is NOT greyed out, click it. A box titled "Push ... to Live" opens with "Release password". Type wrongpassword1 and click the button under it ("Continue", or the button with the same words as the box title). Do this only once. If "Push to Live" is greyed out, write SKIPPED for steps 20 and 21.
    Expect: the message "That release password is not right." and no code sent.

21. Do: with that box still open, go to https://www.lawfecta.co/dela-admin?tab=overview and then back to https://www.lawfecta.co/dela-admin?tab=control
    Expect: the password box is closed and nothing was pushed.

22. Do: leave the Release Control page open for two minutes without clicking.
    Expect: it refreshes by itself without losing your place and without errors.

23. Sign out (the button with the owner's name at the top right, then "Sign out").

Report as described in "How to work", line 10. Finish with a short summary: what passed, what failed, and anything confusing to a non-technical owner.

---

Part D: Stacey only (do not give these to ChatGPT)
1. Go to https://www.lawfecta.co/dela-admin?tab=control. In the "Next version" card, click "Push to Live". In the box that opens, type your release password under "Release password" and click "Continue". Expect a 6 digit code by email (and text). Under "Code", enter a wrong code once: expect "That code is not right." and the code box stays open. Enter the right code. Expect "Push started." and the progress list to tick through each step.
2. After the push, expect the label "Live, being watched" on the "Next version" card, with the minutes left under "Live and healthy". "Push to Live" is off until the watch ends.
3. In the card "Version history", click "Go back to this" on the earlier version. Enter your release password (and the code). Expect "Going back started.", the watch to stop, and the earlier version to show "Live now" within a few minutes. You get an email (and text) each time.
