# ChatGPT test: the Lawfecta fee charged with each milestone payment (2026-11-11)

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

Step 14 in Stripe's test mode (the "DELA sandbox"): no real money moves. Three logins, 14 steps. The freelancer signs, the attorney signs and pays milestone 1, the owner checks the totals.

What Claude prepared: the switch "fee_per_milestone" is ON on www.lawfecta.co, and there is a new made-up job, "Fee test: Run a Conflict Check" ($300, two milestones of $150), where the test attorney has already chosen the test freelancer. Nothing on it is signed or paid yet. The older job "Repeat: Run a Conflict Check" was signed before the switch, so it must keep the fee at the start.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. If ChatGPT will not fill in Stripe's payment page (step 9), click "Take over", fill it in yourself with the test card in that step, and hand control back.
4. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking DELA on the Lawfecta site, www.lawfecta.co. Everything here is made up. Stripe is in test mode: no real money moves, and every card detail below is a made-up test value that Stripe publishes for testing. Never type a real card. Do only what the steps say.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (admin area): stacey@lawfecta.com

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

TEST FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=work&gig=86768616-59bd-4c6d-8eb6-aea6ee31f879&view=agreement
   Expect: the page for "Fee test: Run a Conflict Check" opens. DELA may take up to 60 seconds to write the agreement. The heading says "Agreement, version 1".
   Find: the card "The agreement", and in it the small heading "Fees" (scroll down inside the card, or press Ctrl+F and type Fees).
   Expect: these lines under "Fees". Write each line word for word.
   - "Price for the work: $300.00"
   - a line that says the attorney also pays the Lawfecta fee: $15.00 in total, charged with each milestone payment
   - "Milestone 1 payment: Milestone $150.00, Lawfecta fee $7.50, Total $157.50"
   - "Milestone 2 payment: Milestone $150.00, Lawfecta fee $7.50, Total $157.50"
   - "The freelancer receives: $285"
3. Find: the card "What happens next" at the top of the same page.
   Do: in the box "Your full name" type: Test Freelancer
   Do: tick the box next to "I have read version 1 of this agreement and I sign it electronically."
   Do: click the dark red button "Sign version 1" once.
   Expect: the message "Signed. Waiting for the other signature."
4. Sign out.

TEST ATTORNEY (log in once)
5. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
6. Go to: https://www.lawfecta.co/dela?tab=projects&gig=86768616-59bd-4c6d-8eb6-aea6ee31f879&view=agreement
   Find: the card "What happens next" at the top, and in it the grey box "What you are agreeing to".
   Expect: these lines in the grey box. Write each line word for word.
   - "Your total: $315.00"
   - "Payment 1: Milestone $150.00, Lawfecta fee $7.50, Total $157.50"
   - "Payment 2: Milestone $150.00, Lawfecta fee $7.50, Total $157.50"
   - "The Lawfecta fee is charged with each milestone payment."
7. Find: the card "The agreement" on the same page.
   Do: click the collapsed line "The terms" near the bottom of that card (press Ctrl+F and type The terms if you do not see it).
   Expect: clause 3 contains the words "is charged with each milestone payment". Clause 5 contains "is refunded together with the Lawfecta fee paid on it". Clause 6 contains "the same share of the Lawfecta fee paid on that milestone". The terms start with "1. The parties." and do not contain the word DRAFT.
8. Find: the card "What happens next" at the top again.
   Do: in the box "Your full name" type: Test Attorney
   Do: tick the box next to "I have read version 1 of this agreement and I sign it electronically."
   Do: click the dark red button "Sign version 1" once.
   Expect: the message "Signed by both of you. Pay the first milestone to start."
   Expect: the card "What happens next" now says "Pay milestone 1. Lawfecta holds the milestone amount until you accept the milestone." with three lines under it: "Milestone $150.00", "Lawfecta fee $7.50" and "Total $157.50" (in bold), and a dark red button "Pay milestone 1". The amount $165 must not appear in this card.
9. Do: click "Pay milestone 1" once.
   Expect: Stripe's Checkout page opens (the address starts with checkout.stripe.com) with a total of $157.50. Write the total you see.
   Do: pay with these test values, then click "Pay".
   - Email: stacey+dela-attorney@lawfecta.com
   - Card number: 4000 0000 0000 0077. Expiry: 12 / 34. CVC: 123.
   - Name on card: Test Attorney. Country: United States. ZIP: 78701.
   - If Stripe offers to save your details for faster checkout (Link), leave that box unticked.
   Expect: you come back to the DELA agreement page with the green line "Thank you. Your payment is confirmed." or "Thank you. Stripe is confirming the payment." (either one is right)
   If you land on a login page or an error page instead, take a screenshot, write the full address of that page, and go to step 10.
10. Do: wait 30 seconds, then go to: https://www.lawfecta.co/dela?tab=projects&gig=86768616-59bd-4c6d-8eb6-aea6ee31f879&view=agreement
    Find: the card "Milestones" (scroll down, or press Ctrl+F and type Milestones).
    Expect: milestone 1 has the badge "Paid: ready to start" and its grey line starts "Milestone $150.00, Lawfecta fee $7.50, Total $157.50". Milestone 2 has the badge "Not paid yet" and the same three amounts. If milestone 1 still says "Not paid yet", reload once after another 30 seconds and write what it says.
    Find: the card "Your payments" further down the same page.
    Expect: one line that contains "Milestone $150.00, Lawfecta fee $7.50, Total $157.50, Paid". Write the line word for word.
11. Go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
    Find: the card "Your payments" (scroll down, or press Ctrl+F and type Your payments).
    Expect: this older job is unchanged: one line with "$165 (includes the platform fee $15), Paid" and one line with "$150, Paid". The words "Lawfecta fee" must not appear in this card.
12. Sign out.

OWNER, ADMIN AREA (log in once)
13. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
14. Go to: https://www.lawfecta.co/dela-admin
    Do: in the menu on the left near the top, click "Payments".
    Find: the card "Money on DELA" at the top.
    Expect: "Stripe is connected in test mode (no real money)". The tile "Charged" shows $472.50 (it was $315). The tile "Attorney fees" shows $22.50 (it was $15). The tile "Held now" shows $2,950 (it was $2,800). "Paid out" is still $190, "Refunded" still $100, "Freelancer fees" still $10. Write the number in every tile.
    Do: sign out.

AT THE END
Write the report as rule 10 says: one line per step, then the FAIL list, confusing messages, and anything slower than 60 seconds. Say which account is logged in at the end (it should be none). Put it all in DELA-test-report.txt and give me the download link.
