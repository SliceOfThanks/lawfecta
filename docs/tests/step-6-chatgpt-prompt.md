# ChatGPT test: Step 6, agreements, payments, delivery and payouts

> Checked 2026-11-13 (new layout). Open point: the freelancer logs in four times and the attorney three times (groups 1 to 8), because signing, paying, delivering and reviewing take turns on one job. One login each needs Claude to prepare the middle states on the test site first. The job itself (a gig where the attorney chose the test freelancer's proposal, agreement at version 1, nothing signed) must also be on the test site before the test.

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
1. Do the Stripe setup first (docs/STRIPE_SETUP.md). Without it, there is no Pay button: the card "What happens next" says "Payments are not set up on this site yet, so nothing can be charged here. The Lawfecta Team is adding Stripe."
2. Run the Step 4 test first. This test uses a gig where the attorney chose the test freelancer's proposal. If you have none, ask Claude to make one on the test site.
3. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
4. Stripe is in test mode, so no real money moves. Use only Stripe's test card 4000 0000 0000 0077, which never charges a real card.
5. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up. Stripe is in test mode, so no real money moves. Never type real client information or a real card.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner (admin area): stacey@lawfecta.com (password TEST_PASSWORD)

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

About this test: one job goes from signing to payout, so the accounts take turns. Each group below is one login. "The test gig" means the gig I name when you ask me at step 1.2; if I do not name one, use the gig that has the label "Needs your signature".

Steps

Group 1. FREELANCER signs and sets up payouts
1.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
1.2 Go to: https://www.lawfecta.co/dela?tab=work
    Find: the card whose heading starts "Your engagements (", near the top of the page, right under the green line about proposals left this month.
    Expect: the test gig in that card, with the label "Needs your signature" at the right end of its row.
1.3 Do: click the test gig's row in that card.
    Expect, from the top of the page:
    - the heading "Agreement, version 1" with the label "Waiting for signatures" at its right
    - a card "What happens next"
    - a card "The agreement" with "Client (firm)", "Signs for the firm", "Freelancer" and "Price for the work", a table under the heading "Milestones", and a list under the heading "Fees" whose last line starts "The freelancer receives"
1.4 Find: the bottom of the card "The agreement", the line "The terms".
    Do: click "The terms".
    Expect: the text opens and starts with "1. The parties."
1.5 Find: just above "The terms", the line "Completion checklist (how DELA checks each milestone)".
    Do: click it.
    Expect: a list for each milestone (headed "Milestone 1" and so on), with some items marked "required".
1.6 Find: the card "Propose changes", below the card "The agreement".
    Do: click the outlined button "Propose changes" in that card.
    Expect: the card opens with a box for each milestone ("Title", "Amount ($)", "Due date", "Deliverables"), then "Included", "Not included", "Schedule" and "Note", and at the bottom a dark red "Send the new version" and an outlined "Cancel".
1.7 Do: in the first milestone, type 10 in "Amount ($)". Click "Send the new version".
    Expect: a message that starts "Each milestone needs a title and at least" and then an amount (for example $50). Write the amount.
1.8 Do: change the "Amount ($)" boxes so they add up to the same price as before (for example 40% and 60% of it). Change the first "Title" to First draft. Type Smaller first step in "Note". Click "Send the new version".
    Expect: the message "Version 2 sent. Both of you sign it next." and the heading "Agreement, version 2" with your amounts in the "Milestones" table.
1.9 Find: the card "What happens next" at the top.
    Do: type Test Freelancer in "Your full name". Tick "I have read version 2 of this agreement and I sign it electronically." Click the dark red "Sign version 2".
    Expect: the message "Signed. Waiting for the other signature." The card now says "You signed version 2. Waiting for the attorney to sign."
1.10 Go to: https://www.lawfecta.co/dela?tab=earnings
    Find: the card "Payouts to your bank", near the top.
    Expect: the label "Not set up" and a dark red button "Set up payouts with Stripe". (If the label already says "Ready", write that and go to step 1.12.)
1.11 Do: click "Set up payouts with Stripe".
    Expect: Stripe's own page. Fill it in with Stripe's test details:
    - phone 000 000 0000 and code 000000 if asked
    - any made-up name and a date of birth over 18
    - address 123 Main St, a real US city, state and ZIP
    - Social Security number 000 00 0000
    - bank routing number 110000000 and account number 000123456789
    Finish and return to DELA.
    Expect: the card "Payouts to your bank" shows the label "Ready" within about 30 seconds. If it still says "Needs details" after that, click the outlined "Check my payout status" in that card once.
1.12 Sign out.

Group 2. ATTORNEY signs and pays milestone 1
2.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
2.2 Go to: https://www.lawfecta.co/dela?tab=projects
    Find: the card whose heading starts "Engagements (", below the card "Your gigs".
    Expect: the test gig with the label "Needs your signature".
    Do: click the test gig's row in that card.
2.3 Expect: the heading "Agreement, version 2". In the card "What happens next", the first line starts "The other person signed version 2." In the card "The agreement", the list under "Fees" shows the price and your platform fee.
2.4 Find: the card "What happens next".
    Expect: one sign button only, "Sign version 2". There is no button for version 1.
    Do: type Test Attorney in "Your full name", tick "I have read version 2 of this agreement and I sign it electronically.", and click "Sign version 2".
    Expect: the message "Signed by both of you. Pay the first milestone to start."
2.5 Find: the card "What happens next" again.
    Expect: a line that starts "Pay milestone 1". It either names the milestone amount and "the platform fee" with its amount in the same sentence, or it is followed by three lines that start "Milestone", "Lawfecta fee" and "Total". Write which. Under it a dark red button "Pay milestone 1".
    Do: click "Pay milestone 1" once.
2.6 Expect: Stripe's Checkout page with the milestone and the fee together.
    Do: pay with card 4000 0000 0000 0077, any future date, any 3 digits and any ZIP. Do not use a real card.
2.7 Expect: you come back to DELA with a green line that starts "Thank you. Your payment is confirmed." or "Thank you. Stripe is confirming the payment." (either one is right). Within a minute (reload the page once if needed): in the card "Milestones", milestone 1 has the label "Paid: ready to start"; the label next to "Agreement, version 2" is "Active"; the card "Your payments" lists the payment ending "Paid".
2.8 Find: the card "Problems, disputes and canceling", near the bottom of the page.
    Do: click the line "Cancel the engagement" to open it and read the refund rule. Do NOT click the button "Cancel the engagement" inside it.
    Expect: a sentence about what is refunded, ending "A milestone under review cannot be canceled; open a dispute instead."
2.9 Sign out.

Group 3. FREELANCER starts and submits milestone 1
3.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
3.2 Go to: https://www.lawfecta.co/dela?tab=work
    Find: the card whose heading starts "Your engagements (", near the top.
    Do: click the test gig's row.
3.3 Find: the card "Milestones", milestone 1.
    Do: click the dark red "Start this milestone".
    Expect: the message "Started. Submit it here when it is done." Milestone 1 now has the heading "Submit this milestone" with the box "Completion statement".
3.4 Do: in "Completion statement", type: Not finished: half the draft is done. Click the dark red "Submit for DELA's check". The button reads "DELA is checking it..."; wait up to 60 seconds.
    Expect: under milestone 1, a line that starts "Submission 1:" and then either "Did not pass DELA's check" (with "DELA's check, point by point" listing what is missing) or "With the attorney for review" or "With a Lawfecta reviewer". Write which.
3.5 Only if it says "Did not pass DELA's check":
    Do: click the outlined "Ask for a human review". A browser pop-up asks "Ask a Lawfecta reviewer to look at it instead of DELA? The target is 5 business days." Click OK.
    Expect: the message "Sent to a Lawfecta reviewer." and the line "Submission 1: With a Lawfecta reviewer".
3.6 Sign out.

Group 4. OWNER passes the human review
4.1 Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
4.2 Go to: https://www.lawfecta.co/dela-admin?tab=pay
    Find: the second card, "Payment overview".
    Expect: a grey line that starts "Stripe is connected in test mode (no real money)." Under the small heading "All time", "Charged" shows the payment from group 2.
4.3 Only if step 3.4 or 3.5 ended with "With a Lawfecta reviewer":
    Find: the card whose heading starts "Milestones waiting for a human review (", the third card, below "Payment overview".
    Do: type Looks complete enough for the attorney in the note box under the test gig, then click the dark red "Passes: send to the attorney".
    Expect: the message "Sent to the attorney for review".
4.4 Sign out: click the button with the owner's name and "(owner)" at the top right, then "Sign out".

Group 5. ATTORNEY asks for changes
5.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
5.2 Go to: https://www.lawfecta.co/dela?tab=projects
    Find: the card whose heading starts "Engagements (", below "Your gigs".
    Do: click the test gig's row.
5.3 Find: the card "Milestones", milestone 1.
    Expect: "Submission 1: With the attorney for review", the completion statement, and "DELA's check, point by point" if DELA scored it. Under them a note box and the buttons "Accept and release payment" (dark red) and "Ask for changes" (outlined).
5.4 Do: leave the note box empty and click "Ask for changes".
    Expect: the message "Say what needs to change."
5.5 Do: type Please finish the draft. in the note box and click "Ask for changes".
    Expect: the message "Changes requested. Rounds left: 1."
5.6 Sign out.

Group 6. FREELANCER sends it again
6.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
6.2 Go to: https://www.lawfecta.co/dela?tab=work
    Find: the card whose heading starts "Your engagements (", near the top.
    Do: click the test gig's row.
6.3 Find: the card "Milestones", milestone 1.
    Expect: the line "Attorney: Please finish the draft." and, in the grey line under the milestone's title, "rounds of changes used: 1 of 2".
6.4 Find: under "Submit this milestone" on milestone 1.
    Do: tick "These files contain no medical records, ID documents, account numbers, logins or biometric data." Then choose a small made-up file (a Word or PDF file with placeholder text) in "Files (optional)".
    Expect: the file name followed by ": ready".
6.5 Do: type The full draft is attached. Nothing is open. in "Completion statement" and click "Submit for DELA's check". Wait up to 60 seconds.
    Expect: a line that starts "Submission 2: With the attorney for review" and includes "DELA's score".
6.6 Sign out.

Group 7. ATTORNEY accepts
7.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
7.2 Go to: https://www.lawfecta.co/dela?tab=projects
    Find: the card whose heading starts "Engagements (", below "Your gigs".
    Do: click the test gig's row.
7.3 Find: the card "Milestones", milestone 1, the row with the file name under "Submission 2".
    Do: click the outlined "Open" at the right of the file name.
    Expect: the file opens in a new browser tab. Close that tab.
7.4 Do: click the dark red "Accept and release payment". A browser pop-up asks "Accept milestone 1 and release" with the amount "to the freelancer?" Click OK.
    Expect: the message "Accepted. The payment is released and the next milestone is paid." (the saved test card pays milestone 2 straight away). If it only says "Accepted. The payment is released.", write that.
7.5 Expect: in the card "Milestones", milestone 1 has the label "Accepted" and milestone 2 has "Paid: ready to start".
7.6 Sign out.

Group 8. Check the results (looking only)
8.1 Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
    Go to: https://www.lawfecta.co/dela?tab=earnings
    Expect: at the top, "Paid to you" with milestone 1's amount after the platform fee.
    Do: in the card "Your engagements" lower on the page, click the test gig's row.
    Expect: in the card "Milestones", milestone 1 has a line that starts "Payout:" and ends "sent to your bank" or "on its way". Sign out.
8.2 Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
    Go to: https://www.lawfecta.co/dela-admin?tab=pay
    Find: the second card, "Payment overview", the small heading "All time".
    Expect: "Paid out" shows the same amount as "Paid to you" in step 8.1.
    Find: the last card on the page, one line that starts "The ledger (latest 50 entries".
    Do: click that line.
    Expect: entries for the test gig, each with a kind word after the gig title, such as "charge", "attorney fee", "held", "released", "freelancer fee" and "transfer". Write the entry kinds you see for the test gig. Sign out with the owner's name button at the top right, then "Sign out".

Report as described in "How to work", line 10. Also give the exact text of every error message you saw.
