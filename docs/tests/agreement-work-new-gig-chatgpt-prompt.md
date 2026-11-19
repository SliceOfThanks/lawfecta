You are checking two redesigned pages of DELA on the Lawfecta site, www.lawfecta.co: the engagement page "Agreement and work", and step 1 of "Post a New Gig". Everything here uses test accounts with test data. Do only what the steps say. Never pay, never accept a milestone, never sign, never post or draft a gig, and never send a message.

No step should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens, click Cancel, write FAIL for that step and say what the pop-up said.

Steps marked REVIEW ask for your judgment. Look at the screen as it is and answer in one or two sentences each. If you cannot tell something from the screen, write "could not check".

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Notifications", "Meetings", "Profile" and "Subscription" (and "Agency" on some accounts; a freelancer who owns an agency also sees "Projects", "Library" and "Talent"), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Notifications", "Meetings", "Files", "Get set up" (only until setup is finished), "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notifications) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

1. Go to: https://www.lawfecta.co/dela?tab=projects&gig=0f94c2f9-17cc-5c26-caeb-f2473d219034&view=agreement
   Find: the first white card under the heading "Agreement, version 1". It has a dark red line down its left edge and the small dark red words "NEXT ACTION" at its top.
   Expect: in that card, the heading "Pay milestone 2" with a small tag "Waiting for payment" at the right; under it the bold line "Bates-numbered production and index" (the milestone's name); then two grey boxes side by side, "Milestone amount" with "$800" and "Total due now" with "$800"; then the grey line "Milestone amount only. The platform fee of $80 was charged once, with the first milestone."; then a dark red button "Review payment: milestone 2", a small "?" in a circle, and an outlined button "View milestone details"; then the grey line "Nothing is charged until you confirm on the next step."
   Expect also: the button "Review payment: milestone 2" is on the screen without scrolling down.
   (If instead of the button the card shows a grey notice that payments are not set up, write that down, mark this step FAIL, skip step 4, and go on.)

2. Find: the card "Agreement summary", at the right of the "NEXT ACTION" card (on a narrow window it is lower down, under the cards on the left).
   Expect, as separate lines from top to bottom: "Client (firm)" with a name; "Freelancer" with a name; "Price for the work (contract value)" with "$1,600"; "Attorney platform fee (once, with the first payment)" with "$80" and a small "?"; a grey line "Your total (contract + platform fee)" with "$1,680"; "Paid to date" with "$0" and a small "?"; a tinted line "Amount due now (milestone 2)" with "$800"; and at the bottom the underlined words "View signed agreement (version 1)".
   Expect also: the $80 fee is NOT added to the amount due now.

3. Find: under "Agreement summary", the cards "What happens next?" and "How milestone payments work".
   Expect: "What happens next?" is a numbered list of three lines: "You review and pay milestone 2.", "The freelancer starts the work.", and a line that starts "You review the deliverable when it is submitted". "How milestone payments work" is a list whose second line says that when you accept a milestone "the next milestone is charged to your saved payment method", and whose last line says the platform fee of $80 "is charged once, with the first milestone".

4. Find: the dark red button "Review payment: milestone 2" in the "NEXT ACTION" card.
   Do: click it.
   Expect: the buttons are replaced by a box with a thin border, headed "Review payment: milestone 2". In it: a line that starts "Milestone 2:" with "$800"; a grey line "Total charged now" with "$800"; the sentence "You pay on Stripe's secure page. DELA never sees your card or bank details." (it may be followed by a sentence about Stripe's test card); the sentence "Lawfecta holds the milestone amount until you accept the milestone."; and two buttons, a dark red "Continue to Stripe" and an outlined "Go back".
   Do: click "Go back". Do NOT click "Continue to Stripe".
   Expect: the box closes and the button "Review payment: milestone 2" is back. No other page opened.

5. Find: the card "Milestone progress", under the "NEXT ACTION" card. Right of its heading is a small "?" in a circle and, at the far right, the grey words "2 milestones · 1 accepted".
   Expect: two rows. Row 1 has a round mark with "✓", the heading that starts "1." and, under the amount and date, three states in one line: "Payment: Not paid yet", "Delivery:" followed by words that end in "accepted", and "Acceptance: Accepted". Row 2 has a round mark with "2", the heading that starts "2.", and "Payment: Not paid yet", "Delivery: Not submitted", "Acceptance: Not accepted yet". Each row ends with a tag and a small outlined button "View".
   (Row 1 reads "Not paid yet" although it is accepted because this sample has no payment record. That is expected.)
   Do: click the small "?" right of the heading "Milestone progress".
   Expect: a small white box opens over the page with the sentence "Funding, delivery, and acceptance are tracked separately." and a small "×". The rows under it did not move down. Click the "×" to close it.

6. Find: under "Milestone progress", a stack of white bars, each with a bold name, a grey line under the name and a small arrow at its right end.
   Expect these bars, in this order: "Agreement and fees", "Change orders", "Who's working on this", "Confidential materials", "Disputes and cancellation". (A bar "Attorney decisions" may also be there, second.) All are closed: only the name and one grey line show. Under the last bar are the underlined words "Open all sections".
   Do: click the bar "Agreement and fees".
   Expect: it opens. Inside is the heading "The agreement" with the parties, "The work:", a table of milestones, and "Fees". The arrow on the bar points up.
   Do: click the bar "Agreement and fees" again.
   Expect: it closes.

7. Find: the underlined words "View signed agreement (version 1)" at the bottom of the card "Agreement summary".
   Do: click them.
   Expect: the page moves to the bar "Agreement and fees" and it is open again.

8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=c20aa138-6861-9ba3-8d3d-329d0233cad0&view=agreement
   Find: the "NEXT ACTION" card at the top.
   Expect: the heading "Review milestone 2" with the tag "Deliverable ready for review", the milestone's name in bold, the sentence "The freelancer submitted this milestone. Read it, then accept it or ask for changes.", and one dark red button "Review deliverable: milestone 2". There is no "Review payment" button on this page.
   Do: click "Review deliverable: milestone 2".
   Expect: the page moves to row 2 of the card "Milestone progress", and that row is open: it shows the submission, a box "Note to the freelancer", and the buttons "Accept and release payment" and "Ask for changes".

9. Find: in that open row 2, the dark red button "Accept and release payment".
   Do: click it once.
   Expect: NO browser pop-up. A box with a thin border opens under the buttons, headed "Accept milestone 2?". It has the line "Released to the freelancer" with "$400", a sentence that says milestone 3 ($400) "is not charged now", the sentence "Accepting cannot be undone.", and two buttons: a dark red one that starts "Yes, accept and release" and an outlined "Go back".
   Do: click "Go back". Do NOT click the button that starts "Yes, accept".
   Expect: the box closes. The row still shows "Accept and release payment". Nothing was accepted.

10. Go to: https://www.lawfecta.co/dela?tab=projects&gig=30bc71da-25bf-a2a7-7253-f7e2a650351d&view=agreement
    Find: the "NEXT ACTION" card at the top, and the stack of bars lower down.
    Expect: the heading "Sign the agreement" with the tag "Needs your signature", the grey line "Read the agreement under "Agreement and fees" below, then sign here.", a box "Your full name", and a button that starts "Sign version". Lower down, the bar "Agreement and fees" is already OPEN by itself (the agreement shows inside it), because it has to be read before signing. Do NOT sign.

11. REVIEW. On the page of step 10 or step 1: (a) Could you tell within a few seconds what the attorney must do next and how much it costs? (b) Is anything on the page said twice, or confusing? (c) Is any text too small or too pale to read?

12. Go to: https://www.lawfecta.co/dela?tab=projects
    Find: the dark red button "+ New Gig" at the far right of the heading "Projects".
    Do: click it, then click "From an approved document" in the small menu that opens.
    Expect: a page of its own. From the top: a small button "← Back to Projects", the heading "Post a New Gig", the line "Turn an approved SOP or Workflow into a freelancer-ready gig. You review everything before anything is posted.", then one bar with three steps: "1 Set up your gig" (marked in dark red), "2 Review DELA draft", "3 Review & post". Under the bar is ONE white card with three bold headings one under the other, separated by thin lines: "Choose the work", "Engagement type", "Budget & requirements".
    Expect also: the headings have NO numbers in front ("1.", "2.", "3."). There is NO card "Estimated costs" and NO card "What happens next" at the right. There is no button "Save draft".

13. Find: at the bottom of that card, the outlined button "Back to Projects" at the left and the dark red button "Draft with DELA" at the right, with two grey lines between them.
    Expect: the grey lines say "Nothing is posted until you review and post. DELA writes a draft you can edit." and "Drafting uses 1 DELA action from your plan."
    Do: click "Draft with DELA" with nothing filled in.
    Expect: nothing is drafted. Red words appear under the list "Approved SOP or workflow": "Choose an approved SOP or Workflow." Red words appear under the budget boxes: "Enter the lowest budget, in dollars." The list has a red edge and the keyboard is on it.

14. Find: under the heading "Choose the work", the list labeled "Approved SOP or workflow".
    Do: open the list and choose its second line (the first document under "Select an approved SOP or workflow").
    Expect: the red words under the list are gone, and a small outlined link "Preview document" appears right of the list. Do not click it.
    Find: under the heading "Budget & requirements", the boxes "Budget from (USD)" and "Budget to (USD)".
    Do: type 600 in "Budget from (USD)" and 300 in "Budget to (USD)", then click "Draft with DELA".
    Expect: nothing is drafted. Red words under the boxes say that "Budget to" must be the same as "Budget from" or higher. Both numbers you typed are still in their boxes.

15. Do: change "Budget from (USD)" to 300 and "Budget to (USD)" to 600. Click nothing else.
    Find: the box with a thin border under the budget boxes and their grey hints.
    Expect: before a budget was typed this box held one grey sentence about the platform fee. Now it holds three lines: "Your budget" with "$300 to $600", a line that starts "Platform fee" with two amounts, and a tinted line "Estimated total" with two amounts, then a grey sentence that the exact amount is shown in the agreement before you sign.

16. Find: under the heading "Engagement type", two boxes side by side with a round button in each: "One-off" with "One project, fixed price" (chosen, with a dark red edge) and "Monthly" with "Recurring work, monthly price".
    Do: click "Monthly".
    Expect: the budget boxes are now labeled "Monthly budget from (USD)" and "Monthly budget to (USD)". The box "Work deadline (optional)" is gone. A grey sentence under the two type boxes says the monthly tasks "are set in the agreement's "Monthly terms"". The tinted line in the estimate now starts "Estimated total each month".
    Do: click "One-off".
    Expect: the labels are "Budget from (USD)" and "Budget to (USD)" again, and "Work deadline (optional)" is back.
    (If there is no "Monthly" box and a grey line says monthly gigs are not open for the account, write that and mark this step PASS.)

17. Find: near the bottom of the card, above the buttons, a light blue box that starts with the bold words "Protect client information:".
    Expect: it says "Do not include client names, confidential case details, account numbers or passwords. Read DELA's draft before it is shared with freelancers."
    Find: under the white card, a grey line that starts "Nothing is saved on this step." and ends with the underlined words "Clear the form".
    Do: click "Clear the form".
    Expect: the same page, at its top, with the list back on "Select an approved SOP or workflow" and both budget boxes empty.
    Do: click the outlined button "Back to Projects" at the bottom left of the card.
    Expect: the Projects page, with its four numbered boxes and its row of tabs.

18. REVIEW. About the page of steps 12 to 17: (a) Was it clear what to fill in and in what order? (b) Was it clear that nothing is posted on this step? (c) Anything repeated, confusing or hard to read?

Sign out: click the round button with your initials at the far right of the top bar, then click "Sign out".

## Part 2: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

19. Go to: https://www.lawfecta.co/dela?tab=work&gig=343e4483-d81a-4989-bd07-d748c5a9c700&view=agreement
    Find: the "NEXT ACTION" card at the top, under the heading "Agreement, version 1".
    Expect: the heading "Waiting for payment" with the tag "Waiting for payment", and a sentence that says to wait for the attorney to pay the next milestone and "Do not start unpaid work." There is NO "Review payment" button and no amount to pay.
    (If the page says there is no agreement or the gig is not yours, write what it says and mark steps 19 and 20 FAIL.)

20. Find: the card "Agreement summary" (at the right, or lower down on a narrow window), then "What happens next?" and "How milestone payments work" under it.
    Expect: "Agreement summary" shows "Price for the work (contract value)" with "$300", "Paid out to you so far" (a grey line "You receive" with an amount may be above it). It does NOT show "Attorney platform fee", "Paid to date" or "Amount due now". "What happens next?" has two lines: one that says the attorney pays the next milestone, and "You start it once it is paid." "How milestone payments work" has three lines about the attorney paying before you start, Lawfecta holding the amount, and the payout to your payout account.
    Expect also: in the card "Milestone progress", each row says "Payment: Not paid yet".

Sign out: click the round button with your initials at the far right of the top bar, then click "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw; for the REVIEW steps (11 and 18) give your answers. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took longer than 60 seconds. Add one screenshot of the whole page at step 1, step 8, step 12 and step 19. Put the whole report in a plain text file named DELA-test-report.txt and give me a link to download it.
