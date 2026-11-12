# ChatGPT test: the first real Stripe test-mode payment (2026-11-10)

> Checked against the screens on 2026-11-13 (new layout).

The first payment and payout through Stripe on the test site. Stripe is in test mode (the "DELA sandbox"), so no real money moves. Three logins, 12 steps.

What Claude prepared: the agreement for "Repeat: Run a Conflict Check" is already signed by both test accounts and not paid yet (two milestones of $150; the attorney's platform fee is $15).

What Claude does after you send the report: as the two test accounts, Claude delivers and accepts milestone 1, then opens and settles a dispute on milestone 2, and checks every charge, payout and refund against Stripe.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.
4. If ChatGPT will not fill in Stripe's own pages (steps 3 and 7), click "Take over", fill them in yourself with the test details in the step, and hand control back.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing payments on the Lawfecta test site, www.lawfecta.co. Stripe is in test mode: nothing here is real money, and every detail below is a made-up test value that Stripe publishes for testing. Never type a real card, a real bank account or a real Social Security number.

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
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
2. Go to: https://www.lawfecta.co/dela?tab=earnings
   Find: the card "Payouts to your bank", near the top of the page, under the two boxes "Paid to you" and "Engagements".
   Expect: a label "Not set up" and a dark red button "Set up payouts with Stripe".
3. Do: click "Set up payouts with Stripe".
   Expect: Stripe's own page opens (the address starts with connect.stripe.com), marked as test mode.
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
   Expect: you come back to the DELA Earnings page.
4. Find: the card "Payouts to your bank" on the Earnings page.
   Do: if the label does not say "Ready", click the outlined "Check my payout status" in that card once and wait 10 seconds.
   Expect: the label "Ready". If it says "Needs details", write the sentence next to the label word for word, and the grey line that starts "Stripe still needs:" if there is one.
5. Sign out.

TEST ATTORNEY (log in once)
6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
7. Go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
   Find: the card "What happens next" near the top, under the heading that starts "Agreement, version".
   Expect: a line that starts "Pay milestone 1 ($150) and the platform fee ($15)" and a dark red button "Pay milestone 1".
   Do: click "Pay milestone 1" once.
   Expect: Stripe's Checkout page opens (the address starts with checkout.stripe.com) with a total of $165.00.
   Do: pay with these test values, then click "Pay".
   - Email: stacey+dela-attorney@lawfecta.com
   - Card number: 4000 0000 0000 0077. Expiry: 12 / 34. CVC: 123.
   - Name on card: Test Attorney. Country: United States. ZIP: 78701.
   - If Stripe offers to save your details for faster checkout (Link), leave that box unticked.
   Expect: you come back to the DELA agreement page with the green line "Thank you. Your payment is confirmed." or "Thank you. Stripe is confirming the payment." (either one is right)
   If you land on a login page or an error page instead, take a screenshot, write the full address of that page, and go to step 8.
8. Do: wait 30 seconds, then go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
   Find: the card "Milestones", in the middle of the page, below the card "The agreement" (the table inside "The agreement" has the same small heading; use the card with a box for each milestone).
   Expect: milestone 1 has the label "Paid: ready to start". The card "Your payments" right below it lists one payment that starts with a date and says "$165 (includes the platform fee $15), Paid". If milestone 1 still says "Not paid yet" or "Waiting for payment", reload once after another 30 seconds and write what it says.
9. Sign out.

OWNER, ADMIN AREA (log in once)
10. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
11. Go to: https://www.lawfecta.co/dela-admin?tab=pay
    Expect: the admin area opens on the page "Payments" (in the left menu, "Payments" is under the heading "PAYMENTS").
    Find: the card "Payment overview", the second card on the page, under the card whose heading starts "Needs attention (".
    Expect: a grey line that starts "Stripe is connected in test mode (no real money)". Under the small heading "All time", the box "Charged" shows $165 and the box "Attorney fees" shows $15. Write the number in every box under "All time" ("Charged", "Paid out", "Refunded", "Attorney fees", "Freelancer fees") and in "Held now" under "Current balance".
12. Sign out: click the button with the owner's name and "(owner)" at the top right, then "Sign out".

AT THE END
Report one line per step (PASS or FAIL and a few words), the FAIL list, any confusing message, and anything that took longer than 60 seconds. Put it all in DELA-test-report.txt.
