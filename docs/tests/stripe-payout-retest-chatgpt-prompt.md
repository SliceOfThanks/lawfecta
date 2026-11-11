# ChatGPT re-test: payout setup with Stripe (2026-11-10)

Checks the fix for the first Stripe run: "Set up payouts with Stripe" did nothing. One login, 5 steps. Stripe is in test mode, so no real money moves.

What changed: DELA now uses Stripe's newer account system for freelancer payouts, and a failure shows a message on the card.

Before you paste this:
1. The password is filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. When ChatGPT reaches the login page: click "Take over", log in, hand control back and type: I'm logged in, continue.
3. If ChatGPT will not fill in Stripe's own page (step 3), click "Take over", fill it in yourself with the test details in the step, and hand control back.

Paste everything below the line into ChatGPT in agent mode.

---

You are re-testing payout setup on the Lawfecta test site, www.lawfecta.co. Stripe is in test mode: every detail below is a made-up test value that Stripe publishes for testing. Never type a real bank account or a real Social Security number.

Login (I log in for you):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD

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

Steps

TEST FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=earnings
   Find: the card "Payouts to your bank".
   Expect: a badge "Not set up" and a blue button "Set up payouts with Stripe" (or a badge "Needs details" and a blue button "Finish payout setup").
3. Do: click that blue button once and wait up to 20 seconds.
   Expect: Stripe's own page opens, marked as test mode or sandbox.
   If no Stripe page opens: a red message appears inside the card "Payouts to your bank". Copy that message word for word into your report, write FAIL, and go to step 5.
   Do: fill in Stripe's pages with these test values, clicking "Continue" or "Submit" on each page. If Stripe offers a button "Use test phone number", "Use test code", "Use test document" or "Use test account", click it.
   - Email: stacey+dela-freelancer@lawfecta.com
   - Phone: 000 000 0000. Code: 000000.
   - Type of business: Individual. Country: United States.
   - Name: Test Freelancer. Date of birth: 01 / 01 / 1990.
   - Address: 123 Main St, Austin, TX 78701.
   - Last 4 digits of Social Security number: 0000 (if it asks for all 9: 000 00 0000).
   - Industry: any "Consulting" or "Other business services" choice. Website: https://www.lawfecta.co (or the product description: Paralegal support services).
   - Bank account: routing number 110000000, account number 000123456789.
   - On the last page click "Agree and submit" (or "Submit").
   Expect: you come back to the DELA Earnings page. Write the full address of the page you land on.
4. Find: the card "Payouts to your bank" on the Earnings page.
   Do: if the badge does not say "Ready", click "Check my payout status" once, wait 10 seconds, and reload the page.
   Expect: the badge "Ready". If it says "Needs details", copy the grey sentence next to the badge and any line that starts "Stripe still needs:" word for word.
5. Sign out.

AT THE END
Report one line per step (PASS or FAIL and a few words), the FAIL list, any message you copied, and anything that took longer than 60 seconds. Put it all in DELA-test-report.txt.
