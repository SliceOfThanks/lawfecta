# ChatGPT test: Step 6, agreements, payments, delivery and payouts

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

> **Not rewritten yet (2026-11-05).** Claude rewrites this in the step-by-step style (link, card, where on the page, exact button) before you run it, with the "How to work" block from docs/tests/AGENT-RULES.md. Ask Claude for the new copy first.

Claude already tested all of this with the real api and database, using a stand-in for Stripe: 13 api tests and 35 browser checks. They cover both sides, mistakes and misuse:
- signing the wrong version
- two clicks on Pay
- a declined card
- unsigned or repeated Stripe events
- the score rule (89.99 fails 90)
- the rounds of changes running out
- cancel refunds
- the 14 day dispute notice
- chargebacks
- the phone screen

This test covers the real screens with Stripe's real test mode.

Before you paste this:
1. Do the Stripe setup first (docs/STRIPE_SETUP.md). Without it, the Pay button says "Payments are not set up on this site yet".
2. Run the Step 4 test first. This test uses a gig where the attorney chose the test freelancer's proposal. If you have none, ask Claude to make one on the test site.
3. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
4. Stripe is in test mode, so no real money moves. Use only Stripe's test card 4000 0000 0000 0077, which never charges a real card.
5. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information or real card numbers. Use only made-up details and Stripe's test card 4000 0000 0000 0077.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Freelancer, first visit (ask me to log in as the test freelancer)
1. Open www.lawfecta.co/dela?tab=work. Scroll to the bottom. Expect a card "Your engagements" with the gig and the label "Needs your signature".
2. Click the gig in that card. Expect, at the top of the page:
   - "Agreement, version 1"
   - a card "What happens next"
   - a card "The agreement" with the firm, who signs for the firm, your name, the price, the milestones and a "Fees" list ending "The freelancer receives"
3. Under "The agreement", click "The terms". Expect the text to start with "1. The parties."
4. Click "How DELA checks each milestone (the rubric)". Expect a list per milestone, with some items marked "required".
5. Scroll to the card "Propose changes" and click "Propose changes".
   1. In the first milestone, type 10 in "Amount ($)" and click "Send the new version". Expect a message that each milestone needs at least an amount (for example $50).
   2. Change the amounts so they add up to the same price (for example 40% and 60%). Change the first title to "First draft". Type a note, for example "Smaller first step".
   3. Click "Send the new version". Expect "Agreement, version 2" with your amounts.
6. In "What happens next", type your name in "Your full name", tick "I have read version 2 of this agreement and I sign it electronically", and click "Sign version 2". Expect "You signed version 2. Waiting for the attorney to sign."
7. Click "Earnings" in the menu on the left. Expect "Payouts to your bank" marked "Not set up", with "Set up payouts with Stripe".
8. Click "Set up payouts with Stripe". Expect Stripe's own page. Fill it in with Stripe's test details:
   - phone 000 000 0000 and code 000000 if asked
   - any made-up name and a date of birth over 18
   - address 123 Main St, a real US city, state and ZIP
   - Social Security number 000 00 0000
   - bank routing number 110000000 and account number 000123456789
   Finish and return to DELA. Expect "Payouts to your bank" marked "Ready" (click "Check my payout status" if it still says "Needs details").
9. Sign out.

2. Attorney (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela?tab=projects. Expect a card "Engagements" near the top with the gig and "Needs your signature". Click it.
2. Expect "Agreement, version 2" and "The other person signed version 2". Check the "Fees" list shows the price and your platform fee.
3. Sign version 1 is not offered: only version 2 can be signed. Type your name in "Your full name", tick the box, and click "Sign version 2". Expect "Signed by both of you. Pay the first milestone to start."
4. In "What happens next", expect "Pay milestone 1 (amount) and the platform fee (amount)". Click "Pay milestone 1" once.
5. Expect Stripe's Checkout page with the milestone and the fee together. Pay with card 4000 0000 0000 0077, any future date, any 3 digits and any ZIP. Do not use a real card.
6. Expect to come back to DELA with "Your payment is confirmed" or "Stripe is confirming the payment" (either one is right). Within a minute (reload the page), milestone 1 shows "Paid: ready to start" and the badge "Active". The card "Your payments" lists the payment as "Paid".
7. Scroll to "Problems, disputes and canceling". Open "Cancel the engagement" and read the refund rule. Do not cancel.
8. Sign out.

3. Freelancer, the work (ask me to log in as the test freelancer)
1. Open www.lawfecta.co/dela?tab=work, click the gig in "Your engagements".
2. In the "Milestones" card, on milestone 1, click "Start this milestone". Expect "Submit this milestone".
3. In "Completion statement", type "Not finished: half the draft is done." Click "Submit for DELA's check". Expect, within about 30 seconds, either "Did not pass DELA's check" with "DELA's check, point by point" listing what is missing, or "With the attorney for review". Note which.
4. If it did not pass: click "Ask for a human review" and confirm. Expect "With a Lawfecta reviewer".
5. Sign out.

4. Owner (ask me to log in as the owner)
1. Open www.lawfecta.co/dela-admin and click "Payments" in the menu on the left. Expect:
   - "Payment overview" saying Stripe is connected in test mode
   - totals, with "Charged" showing the payment from group 2
2. If group 3 sent it to a human review: under "Milestones waiting for a human review", type a note and click "Passes: send to the attorney". Expect "Sent to the attorney for review".
3. Sign out.

5. Attorney, the review (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela?tab=projects and click the gig in "Engagements".
2. On milestone 1, expect "With the attorney for review", the completion statement and DELA's check.
3. Click "Ask for changes" with the note box empty. Expect "Say what needs to change."
4. Type "Please finish the draft." and click "Ask for changes". Expect "Changes requested. Rounds left: 1."
5. Sign out.

6. Freelancer, resubmit (ask me to log in as the test freelancer)
1. Open the engagement from "Your engagements" on www.lawfecta.co/dela?tab=work.
2. Expect the attorney's note and "rounds of changes used: 1 of 2" on milestone 1.
3. Tick "These files have no confidential client information", then choose a small made-up file (a Word or PDF file with placeholder text) in "Files (optional)". Expect the file name with "ready".
4. Type "The full draft is attached. Nothing is open." in "Completion statement" and click "Submit for DELA's check". Expect "With the attorney for review" and DELA's score.
5. Sign out.

7. Attorney, accept (ask me to log in as the test attorney)
1. Open the engagement from "Engagements" on www.lawfecta.co/dela?tab=projects.
2. On milestone 1, click "Open" next to the file. Expect the file to open.
3. Click "Accept and release payment" and confirm. Expect "Accepted. The payment is released and the next milestone is paid." (your saved test card pays milestone 2 straight away).
4. Expect milestone 1 "Accepted" and milestone 2 "Paid: ready to start".
5. Narrow the window to phone width: nothing runs off the side. Widen it again.
6. Sign out.

8. Check the results
1. Test freelancer: log in, open www.lawfecta.co/dela?tab=earnings. Expect "Paid to you" with milestone 1's amount after the platform fee, and on the engagement, milestone 1 "Payout: ... sent to your bank". Sign out.
2. Owner: log in, open www.lawfecta.co/dela-admin, "Payments" tab. Expect "Paid out" with the same amount, and the ledger (click "The ledger") listing the charge, the fee, held, released and paid entries. Sign out.

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message
