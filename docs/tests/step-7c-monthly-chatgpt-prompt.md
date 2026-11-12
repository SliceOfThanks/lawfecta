# ChatGPT test: monthly engagements (step 7c part 1)

> Checked 2026-11-13 (new layout). Open point: steps 2 to 4 and 9 to 10 need the three prepared test jobs in the state described below (prepared 2026-11-06). If an earlier run already signed version 2 or approved the change, Claude prepares them again before this is sent. Step 9 allows for payments being set up or not.

Claude already tested this with the real api and database: 12 api tests and 21 browser checks, including renewals, a declined card, retries, cancelling, ending early and the emergency stop. This test checks the real screens on the test site.

Each account logs in once: freelancer, then attorney, then the owner.

Claude prepared this on the test site before the test (2026-11-06):
- "Test job: Monthly to sign (prepared)": the attorney saved the monthly terms (Intake calls and conflict checks, weekly, up to 20 each month, $1,000 a month), so version 2 waits for both signatures.
- "Test job: Monthly running (prepared)": both signed, and month 1 is marked paid on the test site (no money moved). Its billing day is the 6th. The attorney sent a change for next month: $1,100, with 12 welcome packets a week instead of 10.
- "Test job: One-off finished (prepared)": a finished one-off job with the same freelancer, ready for "Make this monthly".

The test reads the payment screens and never pays.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs.

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

NEVER CLICK
"Pay month 1", "Pay now", "Run the renewal now (test site)", "Yes, cancel at month end" or "Ask to end now". Nothing in this test pays, cancels or ends an engagement.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=adf3da25-5d7d-4a56-bf88-8bd4cac3a22a&view=agreement
   Expect: the heading "Agreement, version 2" at the top of the page, under the gig's title.
   Find: the card "The agreement" (the third card, below "What happens next" and "Monthly terms").
   Expect:
   - a green box: "You receive $950 each month, after your $50 platform fee."
   - "Monthly price for the work" $1,000, above the green box.
   - under the small heading "Fees", lower in the card: "Monthly price: $1,000" and "The freelancer receives each month: $950".
   - under "The terms", near the bottom of the card, which opens when you click it: point 12 starts "12. Monthly engagement." and says "Nothing is unlimited" and that unused work does not carry over to the next month.

3. Find: on the same page, the card "What happens next" (the first card, near the top). The signing form is inside it.
   Do: type DELA Test Freelancer in the box "Your full name", tick the box "I have read version 2 of this agreement and I sign it electronically.", and click the dark red "Sign version 2".
   Expect: the message "Signed. Waiting for the other signature." and the signing form is gone from the card.

4. Go to: https://www.lawfecta.co/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement" (the second card, below "What happens next").
   Expect:
   - "This month": "Month 1:" with dates from November 6 to December 5.
   - "Units accepted": "0 of 4".
   - under "Included each month": "Send the welcome packet and log it in Clio: weekly, up to 10 included each month, each within 1 business day".
   - the grey line ends "unused work does not carry over, and a month with five weeks has the same limits and price."
   - "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree."
   - at the bottom of the card, a box "A change to approve" with a small table: the row "Monthly price (before the platform fee)" shows $1,000 under "Now" and $1,100 under "Proposed", and the welcome packet row goes from 10 to 12 each month. Under the table: "Note: Two more welcome packets a week". A red note that starts "Check this before approving:" may show under it, because the note says "a week" and the table changes the month. That is expected.
   Do: click the dark red "Approve the change" in that box.
   Expect: a green message line at the top of the card that starts "Approved. It starts next month".

5. Find: on the same page, the card "Problems, disputes and canceling" near the bottom.
   Expect: there is no "Cancel the engagement" in that card.

6. Sign out (the round button with the initials at the far right of the top bar, then "Sign out").

ATTORNEY (log in once)

7. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

8. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Post a new gig", the first card on the page.
   Do: if the card shows only a dark red "Start a new gig" button at its right, click it.
   Expect: at the top of the card, two round choices, "One-off" and "Monthly", with the hint "Monthly: the same work every month for a flat monthly price, until either of you cancels. The budget is the monthly price." Do not post anything.

9. Go to: https://www.lawfecta.co/dela?tab=projects&gig=adf3da25-5d7d-4a56-bf88-8bd4cac3a22a&view=agreement
   Find: the card "What happens next" (the first card, near the top). The signing form is inside it.
   Expect: the first line of the form starts "The other person signed version 2.", and the form has two tick boxes: "I have read version 2 of this agreement and I sign it electronically." and "Charge this payment method each month on my billing day until I or the freelancer cancel."
   Do: type DELA Test Attorney in the box "Your full name", tick "I have read version 2 of this agreement and I sign it electronically.", leave the charge box unticked, and click the dark red "Sign version 2".
   Expect: it does not sign. A red message says "Tick the box that lets Lawfecta charge your payment method each month. Without it, a monthly engagement cannot start."
   Do: tick "Charge this payment method each month on my billing day until I or the freelancer cancel." and click "Sign version 2" again.
   Expect, in the card "What happens next":
   - the line "Pay month 1 ($1,000) and the platform fee ($50). The day it is paid becomes your billing day each month. Lawfecta holds it until each unit is accepted."
   - under it, either a notice that starts "Payments are not set up on this site yet", or a dark red button "Pay month 1". Write which one you see. Do not click "Pay month 1".

10. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the card "Monthly engagement" (the second card, below "What happens next").
    Expect:
    - a bold line "You pay $1,050 each month, including the $50 platform fee."
    - "Next billing" shows December 6.
    - no box "A change to approve" (the freelancer approved it).
    Do: click the outlined "Review cancellation", under the line that starts "Cancellation takes effect".
    Expect: the line "Cancel at the end of this paid month (" with December 5, and "Nothing more is charged.", with the red button "Yes, cancel at month end" and the outlined "Keep it".
    Do: click "Keep it". Do not click "Yes, cancel at month end".

11. Find: on the same page, the card "Problems, disputes and canceling" near the bottom.
    Expect: there is no "Cancel the engagement" in that card.

12. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e42a647d-3028-4c7d-86ba-443a1b96cbb8&view=agreement
    Find: the card "Keep this going every month", near the bottom.
    Expect: the text "Draft a monthly agreement with the same freelancer, starting from this finished work. You both sign before anything is charged."
    Do: click the dark red "Make this monthly" in that card.
    Expect: DELA opens a new monthly agreement with the card "Monthly terms" (below "What happens next") and, at the bottom of the screen, the message "Drafted. Fill in the monthly terms, then both of you sign." Do not save anything on it.

13. Sign out (the round button with the initials, then "Sign out").

OWNER (log in once)

14. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

15. Go to: https://www.lawfecta.co/dela-admin?tab=recurring ("Recurring" in the left menu, under the heading "PAYMENTS").
    Expect, under the heading "Recurring":
    - a green label "Renewal charges are running", with the red button "Emergency stop: no renewal charges" to its right.
    - "Test job: Monthly running (prepared)" listed with the label "Running", "$1,000 a month" and "months paid: 1". ("next charge" appears only once month 2 is drafted, 3 days before billing.)
    - "Test job: Monthly to sign (prepared)" listed with "Not started".
    Do: click the red "Emergency stop: no renewal charges".
    Expect: the label changes to "Renewal charges are stopped".
    Do: click the dark red "Start renewal charges again" in the same place.
    Expect: the label is back to "Renewal charges are running". Do not click "Run the renewal now (test site)".

16. Sign out (the button with the owner's name at the top right, then "Sign out").
