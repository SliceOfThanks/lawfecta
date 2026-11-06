# ChatGPT test: monthly engagements (step 7c part 1)

Claude already tested this with the real api and database: 12 api tests and 21 browser checks, including renewals, a declined card, retries, cancelling, ending early and the emergency stop. This test checks the real screens on the test site.

Each account logs in once: freelancer, then attorney, then the owner.

Claude prepared this on the test site before the test (2026-11-06):
- "Test job: Monthly to sign (prepared)": the attorney saved the monthly terms (Intake calls and conflict checks, weekly, up to 20 each month, $1,000 a month), so version 2 waits for both signatures.
- "Test job: Monthly running (prepared)": both signed, and month 1 is marked paid on the test site (no money moved). Its billing day is the 6th. The attorney sent a change for next month: $1,100, with 12 welcome packets a week instead of 10.
- "Test job: One-off finished (prepared)": a finished one-off job with the same freelancer, ready for "Make this monthly".

Payments are not set up on the test site, so nothing can be charged. The test reads the payment screens and never pays.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use hirelegalhelp.com in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com.

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
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

NEVER CLICK
"Pay month 1", "Pay now", "Run the renewal now (test site)", "Yes, cancel at month end" or "Ask to end now". Nothing in this test pays, cancels or ends an engagement.

Steps

FREELANCER (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.

2. Go to: https://www.hirelegalhelp.com/dela?tab=work&gig=adf3da25-5d7d-4a56-bf88-8bd4cac3a22a&view=agreement
   Find: the card "The agreement", near the middle of the page.
   Expect:
   - "Agreement, version 2" near the top.
   - a green box: "You receive $950 each month, after your $50 platform fee."
   - "Monthly price for the work" $1,000.
   - under "Fees": "Monthly price: $1,000" and "The freelancer receives each month: $950".
   - under "The terms", which opens when you click it: point 12 says "Monthly engagement", "Nothing is unlimited", and "unused work does not carry over to the next month".

3. On the same page, find the signing form near the top (the box "Type your full name to sign").
   Do: type DELA Test Freelancer in "Type your full name to sign", tick "I agree to sign electronically", and click "Sign version 2".
   Expect: the page says you signed version 2 and are waiting for the attorney.

4. Go to: https://www.hirelegalhelp.com/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement", at the top.
   Expect:
   - "This month": "Month 1:" with dates from November 6 to December 5.
   - "Units accepted": "0 of 4".
   - under "Included each month": "Send the welcome packet and log it in Clio: weekly, up to 10 included each month, each within 1 business day".
   - the grey line ends "unused work does not carry over, and a month with five weeks has the same limits and price."
   - "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree."
   - a box "A change to approve" with "Monthly price: $1,100" and "Two more welcome packets a week".
   Do: click "Approve the change" in that box.
   Expect: "Approved. It starts next month" in the message line of the card.

5. On the same page, scroll to the card "Problems, disputes and canceling" near the bottom.
   Expect: there is no "Cancel the engagement" in that card.

6. Sign out.

ATTORNEY (log in once)

7. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

8. Go to: https://www.hirelegalhelp.com/dela?tab=projects
   Find: the card "Post a new gig", at the top.
   Expect: two choices, "One-off" and "Monthly", with the hint "Monthly: the same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price." Do not post anything.

9. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=adf3da25-5d7d-4a56-bf88-8bd4cac3a22a&view=agreement
   Find: the signing form near the top.
   Expect: the page says the freelancer signed version 2, and the form has a tick box "Charge this payment method each month on my billing day until I or the freelancer cancel."
   Do: type DELA Test Attorney in "Type your full name to sign", tick "I agree to sign electronically", leave the charge box unticked, and click "Sign version 2".
   Expect: it does not sign, and says what is missing.
   Do: tick "Charge this payment method each month on my billing day until I or the freelancer cancel." and click "Sign version 2" again.
   Expect:
   - a button "Pay month 1 ($1,000) and the platform fee ($50)", with text that says the day it is paid becomes your billing day.
   - a note that payments are not set up on this site yet. Do not click "Pay month 1".

10. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the card "Monthly engagement", at the top.
    Expect:
    - a bold line "You pay $1,050 each month, including the $50 platform fee."
    - "Next billing" shows December 6.
    - no box "A change to approve" (the freelancer approved it).
    Do: click "Review cancellation".
    Expect: the line "Cancel at the end of this paid month (" with December 5, and "Nothing more is charged.", with the buttons "Yes, cancel at month end" and "Keep it".
    Do: click "Keep it". Do not click "Yes, cancel at month end".

11. On the same page, scroll to the card "Problems, disputes and canceling" near the bottom.
    Expect: there is no "Cancel the engagement" in that card.

12. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=e42a647d-3028-4c7d-86ba-443a1b96cbb8&view=agreement
    Find: the card "Keep this going every month", near the bottom.
    Expect: the text "Draft a monthly agreement with the same freelancer, starting from this finished work. You both sign before anything is charged."
    Do: click "Make this monthly".
    Expect: DELA opens a new monthly agreement with the card "Monthly terms" and the message "Drafted. Fill in the monthly terms, then both of you sign." Do not save anything on it.

13. Sign out.

OWNER (log in once)

14. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the owner.

15. Go to: https://www.hirelegalhelp.com/dela-admin
    Do: click the tab "Recurring" in the row of tabs near the top.
    Expect:
    - a green label "Renewal charges are running".
    - "Test job: Monthly running (prepared)" listed with the label "Running", "$1,000 a month" and "months paid: 1". ("next charge" appears only once month 2 is drafted, 3 days before billing.)
    - "Test job: Monthly to sign (prepared)" listed with "Not started".
    Do: click "Emergency stop: no renewal charges".
    Expect: the label changes to "Renewal charges are stopped".
    Do: click "Start renewal charges again".
    Expect: the label is back to "Renewal charges are running". Do not click "Run the renewal now (test site)".

16. Sign out.
