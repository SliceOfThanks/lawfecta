# ChatGPT test: the dispute center (step 11)

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

Tests the new dispute process on the test site (docs/briefs/step-11-disputes.md): opening a dispute, answering it, links, settlement offers that move the money at once, AI help, and the Lawfecta Team's Disputes tab. Both sides, mistakes and misuse included. Payments are in Stripe test mode; no real money moves.

Prepared by Claude on the test site before the test (three made-up engagements between the test attorney and the test freelancer, $450 each, paid and held):
- "Test job: Dispute to answer (prepared)": the attorney opened a dispute asking for a full refund. The freelancer has not answered.
- "Test job: Dispute to open (prepared)": no dispute yet.
- "Test job: Dispute for the team (prepared)": the attorney opened a dispute, the freelancer answered, the 14 days are over, and it waits for the Lawfecta Team.

Each account logs in once: freelancer, then attorney, then the owner (admin area).

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", type the email named by hand (check the browser did not fill in another account), log in, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the dispute process in DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up; type only the made-up words in the steps.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (admin area): stacey@lawfecta.com, password TEST_OWNER_PASSWORD

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

Where the dispute tools are: on each job's agreement page, scroll to the bottom to the card titled "Problems, disputes and canceling". An open dispute shows there as its own box with a colored label, the dates, both sides, links and offers.

Steps

FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer. Then click the round button with the initials at the far right of the top bar: the first line must say "DELA Test Freelancer". If not, stop and tell me.
2. Go to: https://www.lawfecta.co/dela?tab=work&gig=46a2b905-6492-4177-820a-d9d24102aadf&view=agreement
   Find: the card "Problems, disputes and canceling" at the bottom of the page.
   Expect: a box "Dispute about milestone 1..." with a yellow label "Open: waiting for an answer", the attorney's reason, and the line "Give your side by" a date.
3. Do: in that box, type in the "Your side" box: Fictional test: the checklist was sent by email on the due date. Click "Send my side".
   Expect: your words appear in the box with "Answer", and the label changes to "Open: settle it yourselves".
4. Do: click "Add a link" in the same box. In "What the link is" type: Delivery email. In "Secure link (https://)" type: http://example.com/x (no s). Click "Add the link".
   Expect: a message says to paste a full secure link that starts with https://. Nothing is added.
5. Do: change the link to: https://example.com/delivery-email and click "Add the link".
   Expect: "Delivery email" shows under "Links".
6. Do: click "Settle it: send an offer". In "Amount to the freelancer ($)" type 500. Click "Send the offer".
   Expect: a message says the amount must be from zero up to the milestone amount. No offer is sent.
7. Do: change the amount to 300.
   Expect: next to the box it says "and $150 back to the attorney". Click "Send the offer".
   Expect: "Your offer: $300 to the freelancer, $150 back to the attorney" with a yellow "Open" label.
8. Do: in the same offer area, click "✦ Summarize both sides".
   Expect: within 60 seconds an "AI suggestion" box with a short neutral summary and a line saying it is not legal advice.
9. Go to: https://www.lawfecta.co/dela?tab=work&gig=868796e2-adfc-46ef-a923-51d433ae53b0&view=agreement
   Find: the card "Problems, disputes and canceling" at the bottom.
   Do: click "Open a dispute". Leave "What went wrong" on "Choose" and click "Open the dispute".
   Expect: a message asks you to choose what went wrong (or the milestone). No dispute opens.
10. Do: in "Milestone" choose "1. ...". In "What went wrong" choose "Payment or acceptance withheld". In "What you are asking for" choose "The full milestone paid to me". In "What happened" type: Fictional test: the work was delivered and not accepted. Click "Open the dispute".
    Expect: a box with "Open: waiting for an answer", "The other side answers by" a date, and a "Withdraw the dispute" button. Do not withdraw it.
11. Sign out.

ATTORNEY (log in once)
12. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney. Check the first line of the account menu says "DELA Test Attorney".
13. Go to: https://www.lawfecta.co/dela?tab=projects&gig=46a2b905-6492-4177-820a-d9d24102aadf&view=agreement
    Find: the dispute box in "Problems, disputes and canceling" at the bottom.
    Expect: the freelancer's answer, the "Delivery email" link, and "The freelancer's offer: $300 to the freelancer, $150 back to the attorney" with an "Accept the offer" button.
14. Do: click "Accept the offer". A browser OK/Cancel box asks to confirm: click OK.
    Expect: the label becomes green "Settled by agreement" and the box says $300 went to the freelancer and $150 back to the attorney. There are no more buttons in that box.
15. Go to: https://www.lawfecta.co/dela?tab=projects&gig=868796e2-adfc-46ef-a923-51d433ae53b0&view=agreement
    Find: the dispute box at the bottom.
    Expect: "Open: waiting for an answer", the freelancer's reason, "Give your side by" a date.
    Do: in "Your side" type: Fictional test: only half of the work matched the agreement. Click "Send my side".
    Expect: your answer shows with "Answer".
16. Do: click "Settle it: send an offer", then "✦ Suggest a fair offer".
    Expect: within 60 seconds an "AI suggestion" with an amount to the freelancer and a "Use suggestion" button. Click "Use suggestion": the amount box fills in. Do not send the offer.
17. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e9a7d1d8-4497-4e05-b078-381beea30c9a&view=agreement
    Find: the dispute box at the bottom.
    Expect: a blue label "Lawfecta Team review" and a line "The Lawfecta Team decides by" a date.
18. Sign out.

OWNER, ADMIN AREA (log in once)
19. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
20. Go to: https://www.lawfecta.co/dela-admin?tab=disputes ("Disputes" in the left menu, under the heading "PAYMENTS").
    Expect: a card "Disputes" with numbers (Open now, Settled by offer, and others), then "Open disputes", then "Closed in the last 90 days". "Test job: Dispute to answer (prepared)" is under closed, marked "Settled by offer".
21. Find: under "Open disputes", the box "Test job: Dispute for the team (prepared), milestone 1..." with a yellow "Ready for your decision" label. It shows both sides.
    Do: open "Decide" in that box (if it is folded) and click "✦ Draft with DELA".
    Expect: within 60 seconds an "AI suggestion" with a summary and a suggested split, and a "Use this draft" button.
22. Do: click "Half each".
    Expect: "To the freelancer ($)" shows 225.00 and the line says "and $225 back to the attorney".
    Do: in "Decision and reasons (both members see this)" type: Fictional test: half of the log matched the agreement. Click "Decide". A browser OK/Cancel box asks to confirm: click OK.
    Expect: a message says it is decided, and the case moves to "Closed in the last 90 days" as "Decided".
23. Find: the card "Money tools" at the bottom of the Disputes tab.
    Expect: a list or "Nothing waiting." No error.
24. Sign out: click the button with the owner's name at the top right, then "Sign out".

CHECK THE RESULTS (freelancer login is not needed again; read only what the owner already saw)
25. In your report, list for each prepared job what you saw at the end: "Dispute to answer" settled by agreement ($300 / $150), "Dispute to open" open and answered, "Dispute for the team" decided half each.

AT THE END
Report one line per step (PASS or FAIL and a few words), the FAIL list, any confusing message, and anything that took longer than 60 seconds. Put it all in DELA-test-report.txt.
