# ChatGPT test: standing arrangements (step 7c part 2)

Claude already tested this with the real api and database: 9 api tests and 8 browser checks, including the monthly cap, the most jobs open at once, declining a job with a full refund, new limits that both sign again, ending, and the Lawfecta Team's list. This test checks the real screens on the test site.

Standing arrangements are on for the test accounts only. On Live (lawfecta.com) they stay off until counsel approves.

Each account logs in once: freelancer, then attorney, then the owner.

Claude prepared this on the test site before the test (2026-11-06):
- Arrangement A, active: the test attorney hires the test freelancer for "Send the welcome packet" and "Run a Conflict Check", $300 per job, a monthly cap of $700, at most 2 jobs open at once. Both already signed.
- One job hired from arrangement A: "Send the welcome packet", $300, waiting for payment. The freelancer can decline it until 2026-11-07 at 2:49 PM Pacific. Run this test before then, or ask Claude to prepare a new one.
- Arrangement B, waiting for the freelancer: "Open a Matter in Clio", $400 per job, a monthly cap of $1,200, at most 3 jobs open at once. The attorney signed it; the freelancer has not accepted yet.

Payments are not set up on the test site, so nothing is charged. Jobs hired in this test wait for payment and no money moves.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs.
4. Run it on its own, not at the same time as another test.

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

NEVER CLICK
Any "Upgrade" button or link. Anything that pays. Only click the buttons the steps name.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the card "Standing arrangements (2)", in the middle of the page, just above "Invitations".
   Expect: two shaded boxes, each headed "DELA Test Attorney". One has the label "Waiting for the freelancer" and the line "$400 per job | $0 of $1,200 this month | 0 of 3 jobs open | until ...". The other has the label "Active" and "$300 per job | $300 of $700 this month | 1 of 2 jobs open | until ...". Each has a "Covers:" line with the document names.

3. In the "Active" box of the card "Standing arrangements (2)":
   Find: the job line under the "Covers:" line: a date, then "Send the welcome packet, $300 | Waiting for payment", with the buttons "Open the job" and "Decline this job".
   Do: click "Decline this job". A browser pop-up asks "Decline this job? The firm is refunded in full." Click OK.
   Expect: a message "Declined. The firm is refunded in full." After the card reloads, the job line reads "Declined, refunded" and has no "Decline this job" button. The line above reads "$0 of $700 this month | 0 of 2 jobs open".

4. In the "Waiting for the freelancer" box of the same card:
   Do: without typing anything, click the blue "Accept".
   Expect: the message "Type your full name and tick the box." Nothing changes.
   Do: type Test Freelancer in the "Your full name" box, tick the box that starts "I accept this standing arrangement. Jobs inside its limits start without a new proposal; I can decline a job within 24 hours", then click "Accept".
   Expect: the message "Accepted. The firm can now hire you again in one click." After the card reloads, that box has the label "Active".

5. Sign out.

ATTORNEY (log in once)

6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Standing arrangements (2)", in the lower half of the page, right under the card "Engagements".
   Expect: two shaded boxes headed "DELA Test Freelancer", both labeled "Active". The $300 box reads "$0 of $700 this month | 0 of 2 jobs open", and its job line reads "Declined, refunded".

8. In the $300 box (it covers "Send the welcome packet" and "Run a Conflict Check"):
   Find: the drop-down "Document to hire for" and the blue button "Hire again from my standing arrangement" next to it.
   Do: choose "Send the welcome packet" in the drop-down, then click "Hire again from my standing arrangement".
   Expect: within a few seconds, the message "Hired. The payment is not finished yet: payments are not set up on this site yet." After the card reloads, a new job line "Send the welcome packet, $300 | Waiting for payment" with "Open the job", and the line "$300 of $700 this month | 1 of 2 jobs open".

9. In the same $300 box:
   Do: choose "Run a Conflict Check" in the drop-down "Document to hire for", then click "Hire again from my standing arrangement".
   Expect: the same "Hired. The payment is not finished yet" message. After the card reloads: "$600 of $700 this month | 2 of 2 jobs open", and two job lines waiting for payment.

10. In the same $300 box, past the limit:
    Do: choose "Send the welcome packet" again and click "Hire again from my standing arrangement".
    Expect: the message "This job would pass the monthly cap ($600 of $700 used). Nothing was charged. A gig draft was made instead; open it from Your gigs to post it the normal way." No new job line is added. Do not post the draft.

11. In the same $300 box:
    Do: click "Open the job" on the newest job line ("Run a Conflict Check", hired in step 9).
    Expect: the job's agreement page opens, with the title "Repeat: Run a Conflict Check" near the top and the card "The agreement". Do not sign or pay anything.
    Then go to: https://www.lawfecta.co/dela?tab=projects

12. In the card "Standing arrangements (2)", in the $300 box:
    Do: click "Change limits" (an outlined button at the bottom of the box).
    Expect: a shaded form opens in the box with "Once you send them, new limits pause one-click hiring until the freelancer approves them. Limits that are not allowed are refused and nothing changes.", the boxes "Price per job ($)" (300), "Monthly spend cap ($)" (700), "Most jobs open at once" (2), "Your full name", the tick box "I sign the new limits for the firm." and the blue button "Sign and send the new limits".
    Do: change "Price per job ($)" to 800 and leave "Monthly spend cap ($)" at 700. Type Test Attorney in "Your full name", tick "I sign the new limits for the firm.", and click "Sign and send the new limits".
    Expect: the message "The price per job cannot be more than the monthly cap." The box stays "Active". Do not send other limits.

13. In the $400 box (it covers "Open a Matter in Clio"):
    Do: click "End arrangement". A browser pop-up asks "End this standing arrangement? No new jobs can be hired from it; open jobs finish as agreed." Click OK.
    Expect: the message "Ended." After the card reloads, the $400 box has the label "Ended" and no "Hire again from my standing arrangement" button.

14. Go to: https://www.lawfecta.co/dela?tab=talent
    Find: the card "Find a freelancer" at the top, and below it the results. Find the result "DELA Test Freelancer".
    Do: in that result, click "Set up a standing arrangement" (an outlined button in its row of buttons).
    Expect: a window "Standing arrangement with DELA Test Freelancer" with the text "Hire DELA Test Freelancer again for the same work without a new proposal each time. You both sign once. Inside these limits you hire in one click and DELA charges your saved card at once (with no saved card, the Stripe payment page opens). Anything outside them becomes a normal gig draft.", the heading "Documents covered (approved SOPs and Workflows)" with tick boxes, and the boxes "Price per job ($)", "Monthly spend cap ($)" (with the hint "Required. Hires stop at the cap each month."), "Most jobs open at once", "End date" (with "Up to 12 months."), the tick box "Let other attorneys in the firm use this arrangement", "Your full name" and the buttons "Sign and send" and "Cancel".

15. In the same window:
    Do: tick the first document, type 300 in "Price per job ($)", leave "Monthly spend cap ($)" empty, and click "Sign and send".
    Expect: the message "Set a monthly spend cap. DELA does not save an arrangement without one." near the bottom of the window. Nothing is sent.
    Do: click "Cancel". The window closes. Do not send a new arrangement.

16. Sign out.

OWNER (log in once)

17. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

18. Go to: https://www.lawfecta.co/dela-admin
    Do: click the tab "Recurring" in the row of tabs near the top.
    Find: the card "Standing arrangements", below the Recurring card.
    Expect: the grey line "Limited automatic repeat hiring. Each one names a price per job, a monthly cap, the most jobs open at once and an end date. Off on Live until counsel approves (switch auto_repeat_hiring)." Then a row "DELA Test Attorney hires DELA Test Freelancer" labeled "active" with "$300 per job | spend this month $600 of $700 | 2 of 2 open | jobs 2, declined 1 | until ...", and a row for the $400 arrangement labeled "ended".

19. Sign out.
