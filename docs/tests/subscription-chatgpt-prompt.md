# ChatGPT test: the Subscription page (step 16, 2026-11-12)

Looking only: nothing is signed, paid, sent or changed. Two logins (freelancer, then attorney), 10 steps. Every step opens the page by its link, so it works on a narrow window too (first run, 2026-11-12: the window was 810 wide, the menu sat at the bottom and five steps could not start). The limit banner is not part of this test: the test accounts are far below their limits, so it does not show. Claude's browser test (tests/pw/workspace-test.js) covers the banner.

What is on the site: the test freelancer (BD 688) is on Freelancer Business and the test attorney (BD 687) on Attorney Pro, both set by the Lawfecta Team, so both pages show the badge "Set by the Lawfecta Team". Freelancer Business (agency) is the top plan, so the freelancer sees only "Downgrade to" buttons.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. A wide browser window is best, but a narrow one works.
4. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the Subscription page of DELA on the Lawfecta site, www.lawfecta.co. You only look and click the things named. Do not sign, pay, send or save anything. On the Lawfecta website's upgrade page, do not choose a plan and do not click anything. Do only what the steps say.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=subscription
   Expect: the page heading "Subscription". On a wide window, "Subscription" in the left menu is pink and sits right under "Profile". On a narrow window there is no left menu; a bar at the bottom of the page has "More" marked instead. Either one is a PASS.

2. Find: the first card, titled "Your current plan: Freelancer Business (agency)", at the top of the page.
   Expect: a small badge "Set by the Lawfecta Team" at the right of that heading; under it a line with a price and "Platform fee on jobs:" followed by a percentage.

3. Find: in the same card, the heading "Your usage" (middle of the card), then "What your plan allows" below it.
   Expect: under "Your usage" either one or more lines, each with a name, "X of Y" and a bar, or the line "Nothing on your plan is counted against a limit."; then a grey line starting "Monthly limits start again on" with a date. Under "What your plan allows" a table with the columns "What you get" and "Your plan allows". No row in that table says "of" (for example "50 of 50 available").

4. Find: the second card, titled "All freelancer plans", below the first card.
   Expect: four plan boxes named "Free", "Plus", "Pro" and "Business (agency)". The "Business (agency)" box is pink with a dark red border, has the green badge "Your current plan" and no button. Each of the other three boxes has an outlined button (white with a dark red border, not filled): "Downgrade to Free", "Downgrade to Plus", "Downgrade to Pro". Each box shows a price and "Platform fee on jobs:". Under the boxes a grey line about cancelling through the Lawfecta Team.

5. Find: the "Pro" box in the "All freelancer plans" card.
   Do: click "Downgrade to Pro".
   Expect: a NEW browser tab opens on the Lawfecta website's upgrade page (www.lawfecta.co/account/upgrade). Do not choose anything there. Close that new tab and go back to the DELA tab. The DELA tab is still on the Subscription page.
   Note: the website's own pages may say this account's plan is "Free". That is the website's membership; the Lawfecta Team set this test account's DELA plan by hand. Do not report it.

Sign out (rule 7).

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

6. Go to: https://www.lawfecta.co/dela?tab=subscription
   Find: the first card, titled "Your current plan: Attorney Pro", at the top of the page.
   Expect: the badge "Set by the Lawfecta Team" at the right of the heading; a line with a price and "Platform fee on jobs:".

7. Find: in the same card, the heading "Your usage".
   Expect: lines with a name, "X of Y" and a bar for each, including DELA actions for this month. If any line shows a badge "Nearing the limit" or "Limit reached", write its name in your report. Below them a grey line starting "Monthly limits start again on" that also says "Actions on your own AI key do not count." Storage sizes on the whole page are whole numbers such as "50 GB", never "51.2 GB".

8. Find: the second card, titled "All attorney plans".
   Expect: four plan boxes "Free", "Plus", "Pro" and "Business (firm)". "Pro" is pink with a dark red border, has the green badge "Your current plan" and no button. "Business (firm)" has a filled dark red button "Upgrade to Business (firm)". "Free" and "Plus" each have an outlined button (white with a dark red border, not filled) "Downgrade to Free" or "Downgrade to Plus". The plan boxes say "DELA actions a month on Lawfecta's AI", not "Weighted AI credits". and under each of those two buttons a grey line starting "On a lower plan, documents above its limit become read-only."

9. Find: the "Business (firm)" box in the "All attorney plans" card.
   Do: click "Upgrade to Business (firm)".
   Expect: a NEW browser tab opens on www.lawfecta.co/account/upgrade. Do not choose anything there. Close that tab and go back to the DELA tab.

10. Go to: https://www.lawfecta.co/dela?tab=subscription
    Expect: the Subscription page opens again with "Your current plan: Attorney Pro" (the plan did not change).

Sign out (rule 7).
