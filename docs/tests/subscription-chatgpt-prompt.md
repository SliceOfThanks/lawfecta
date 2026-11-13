# ChatGPT test: the Subscription page, redesigned (step 19, 2026-11-12)

Replaces the step 16 check. Looking only: nothing is paid, changed or saved. Two logins (freelancer, then attorney), 10 steps. Every step opens the page by its link, so a narrow window works too; on a narrow window the four tabs read "Plan", "Usage", "Compare" and "Billing" instead of their full names.

What is on the site (checked 2026-11-12): the test freelancer (BD 688) is on Freelancer Business (agency) and the test attorney (BD 687) on Attorney Pro, both set by the Lawfecta Team. Neither has a paid membership or an invoice on the website, so billing reads "No paid membership on record" and no renewal date is shown. That is the correct result.

Before you paste this:
1. Run it only after Claude says the Subscription redesign is on the site.
2. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
3. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
4. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking the Subscription page of DELA on the Lawfecta site, www.lawfecta.co. You only look and click the things named. Do not pay, sign, send or save anything. On the Lawfecta website's upgrade page, do not choose a plan and do not click anything. Do only what the steps say.

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
   Find: under the heading "Subscription", a row of four tabs, then a pink card.
   Expect: the tabs "My Subscription", "Usage & Limits", "Compare Plans" and "Billing & History" (on a narrow window: "Plan", "Usage", "Compare", "Billing"). The first is marked as chosen. The pink card says "YOUR CURRENT PLAN", then "Freelancer Business (agency)" with the labels "✓ Current plan" and "Set by the Lawfecta Team".

2. Find: in the same pink card, four rows.
   Expect: "Published price" with a price; "Platform fee on jobs" with a percentage; "What you are billed" with "No paid membership on record"; "Next renewal" with "No renewal date on record". No date and no amount is shown for billing. Under the rows a notice that starts "The Lawfecta Team set this plan on your DELA account." and two buttons: "Manage subscription on the Lawfecta website" and "View billing history".

3. Find: the row of tabs.
   Do: click "Compare Plans" (or "Compare").
   Expect: a card "Compare freelancer plans" with a small choice "Monthly" / "Annual" and four plan boxes "Free", "Plus", "Pro", "Business (agency)". The "Business (agency)" box is pink with a dark red border, says "✓ Your current plan" and "You are on this plan", and has no button. The other three each have an outlined button (white, not filled): "Downgrade to Free", "Downgrade to Plus", "Downgrade to Pro". Below, a card "Full feature comparison" with one table whose first column is "Feature" and whose other columns are the four plans.

4. Find: the "Pro" box.
   Do: click "Downgrade to Pro".
   Expect: a box in front of the page titled "Review your plan change". It says "Downgrade from Freelancer Business (agency) to Freelancer Pro.", shows a table with the columns "Item", "Now" and "After the change" (rows "Published price", "Platform fee on jobs" and the allowances that change), says "Nothing is charged by continuing from here.", and has the buttons "Continue to the Lawfecta website" and "Cancel". No new browser tab opened yet.
   Do: click "Cancel".
   Expect: the box closes and the Compare Plans page is still there.

Sign out (rule 7).

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

5. Go to: https://www.lawfecta.co/dela?tab=subscription
   Find: the pink card under the tabs.
   Expect: "Attorney Pro" with "✓ Current plan" and "Set by the Lawfecta Team"; "Published price" shows a monthly and a yearly price; "Platform fee on jobs" shows a percentage; "What you are billed" shows "No paid membership on record"; "Next renewal" shows "No renewal date on record". Below the pink card a card "Your usage at a glance" with one line "DELA actions this month" and the buttons "See all usage and limits" and "Compare plans".

6. Do: click the tab "Usage & Limits" (or "Usage").
   Expect: a card "Your plan usage" with two shaded headings: "Monthly allowances (start again on ...)" with a date, and "Account and capacity limits (these do not reset)". Under the first: "DELA actions this month" with "X of 1000 this month", a bar, a number "remaining" and a sentence starting "At the limit". Under the second: lines such as "Saved documents", "Storage" and "Open Flex Gigs at one time", each with "X of Y" or "X of Y used", a bar and a "remaining" amount. The line about open gigs says it counts gigs open at the same time. The sentence "Exporting your own documents is not limited and is not counted." is there, and there is NO line or bar for document exports. Below, a card "What your plan allows" with a table "What you get" / "Your plan allows". Storage reads as whole numbers such as "50 GB".

7. Do: click the tab "Compare Plans" (or "Compare"). Then click "Annual" in the small choice at the top of the card.
   Expect: four boxes "Free", "Plus", "Pro", "Business (firm)". "Pro" says "✓ Your current plan" and "You are on this plan". Each paid plan now shows a price "a year" and a smaller line "About ... a month, paid once a year". "Business (firm)" has a filled dark red button "Upgrade to Business (firm)". "Free" and "Plus" have outlined buttons "Downgrade to Free" and "Downgrade to Plus". No box mentions "Weighted AI credits" or document exports.

8. Do: click "Upgrade to Business (firm)".
   Expect: the box "Review your plan change" with "Upgrade from Attorney Pro to Attorney Business (firm)." and a notice that the plan was set by the Lawfecta Team.
   Do: click "Continue to the Lawfecta website".
   Expect: a NEW browser tab opens on www.lawfecta.co/account/upgrade. Do not choose anything there. Close that new tab and go back to the DELA tab. The review box is closed and the DELA tab still shows the Subscription page.

9. Do: click the tab "Billing & History" (or "Billing").
   Expect: a card "Your membership billing" that says "The Lawfecta website has no paid membership and no invoices on record for your account." and "DELA never charges your card for a membership." Below it a card "Manage your membership" with "Manage subscription on the Lawfecta website", "Compare plans first" and "Contact the Lawfecta Team", and a sentence about cancelling through the Lawfecta Team.

10. Do: click the tab "My Subscription" (or "Plan") once, then press the Right Arrow key on the keyboard once.
    Expect: the tab "Usage & Limits" becomes the chosen one and the card "Your plan usage" shows.

Sign out (rule 7).
