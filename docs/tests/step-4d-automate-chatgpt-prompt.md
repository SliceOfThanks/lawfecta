# ChatGPT test: Automate or delegate, and Get set up (step 4d)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested this with the real api and database: 9 tests and 16 browser checks. Claude also ran one real review on the test site, on a separate copy of the document, and then removed it. This test covers the real screens.

Each account logs in once. Claude prepared this on the test site before the test:
- An approved SOP, "Test SOP: Automate or delegate", in the test attorney's Library. It has 6 steps. Step 5, "Decide whether the matter needs a second attorney or a conflict review.", is marked "Attorney decides".
- The test attorney's "Get set up" shows 5 of 6 steps done. The one left is "✦ Find what to automate or delegate".

DELA's real AI writes the suggestions, so their exact titles and numbers can differ from run to run. The steps say what must always be true.

What it covers:
- "Get set up": the line in the left menu, the six steps, "Skip for now", and a step opening in place.
- The hint card on an approved SOP, the two optional boxes, and DELA's checked suggestions.
- The delegate path on one screen: the steps, the SOP for just those steps, KPIs, approval, and the gig with the suggested budget and the fee.
- A freelancer not seeing "Get set up".

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD

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

Each account below logs in once. Do every step of a group before signing out.

Group 1. The attorney (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the menu on the left, the second group of lines ("Talent", "Files", "Get set up").
   Expect: the line "Get set up" is there, under "Files".
   Do: click "Get set up" in the left menu.
   Expect: the address ends with tab=setup, the top bar says "Get set up", and the page "Get set up" shows the small line "5 of 6 done." with the grey line "Six steps to your first gig. Each one opens here. Skip any step and come back to it later." and six numbered cards: "Your profile and verification", "Teach DELA about your firm", "Your first document", "✦ Find what to automate or delegate", "Post your first gig", "Invite freelancers". Card 4 shows "To do"; the other five show "Done".

3. On the same page, in card 4 "✦ Find what to automate or delegate":
   Do: click the outlined "Skip for now".
   Expect: the line "Skipped for now. It stays here for later." at the top of the page, card 4 shows "Skipped", and the count reads "6 of 6 done. You are set up."
   Do: in card 4, click "Pick up again".
   Expect: the line "Back on your list.", card 4 shows "To do" again, and the count reads "5 of 6 done."

4. Still on that page, in card 2 "Teach DELA about your firm":
   Do: click the dark red "Open".
   Expect: the firm profile form opens inside that card, with the heading "Your firm profile for documents". Do not change anything.
   Do: click "Close" in card 2.
   Expect: nowhere on this page does the word "train" appear (press Ctrl+F and type train to check).

5. Go to: https://www.lawfecta.co/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
   Expect: the title "Test SOP: Automate or delegate" with an "Approved" badge.
   Find: the card titled "✦ Automate or delegate", near the top, above the document.
   Expect: the line "DELA can find steps in this document to automate or hand to a freelancer.", the boxes "How often does this run?" and "How long does it take each time?", a dark red "✦ Find what to automate or delegate" button and a "Dismiss" link to its right.

6. In that card:
   Do: choose "Weekly" in "How often does this run?", type 60 in "How long does it take each time?", and click the dark red "✦ Find what to automate or delegate".
   Expect: DELA reviews for up to 60 seconds. Then a line at the top of the card, "DELA found N to look at." (N is a number from 1 to 5), and that many suggestions in the card.
   Expect, for every suggestion:
   - a label "Delegate" or "Automate", a title, and a line starting "Step" or "Steps" with step numbers
   - a line that starts "Estimated time saved:"
   - no "Delegate" suggestion includes step 5
   Expect: at least one "Delegate" suggestion, with a dark red "Delegate these steps" button.
   Expect: an "Automate" suggestion, if there is one, shows "Tool: ..." and the buttons "Add this tool to the steps" and "Hire a freelancer to set it up". Do not click them.

7. Do: click "Delegate these steps" on the first "Delegate" suggestion in the card.
   Expect: below the suggestions, a section starting "Delegate:" with five numbered parts: "1. Confirm which steps to delegate", "2. The SOP for just this task", "3. Metrics and KPIs", "4. DELA's self-check and your approval", "5. The gig".
   Expect: in part 1, step 5 reads "(Attorney decides: stays with the attorney)" and its tick box cannot be ticked.

8. In part 2 "The SOP for just this task":
   Do: click the dark red "Draft the SOP for these steps".
   Expect: the line "DELA drafted the SOP for just these steps." and a line starting "SOP:" that ends "the supervising attorney stays Accountable (A) on every step."

9. In part 3 "Metrics and KPIs":
   Do: replace the number in "Turnaround (business days)" with 3, and click the outlined "Save the KPIs".
   Expect: the line "KPIs saved. The SOP now uses them."

10. In part 4 "DELA's self-check and your approval":
    Expect: "DELA's self-check passes."
    Do: click the dark red "Approve the SOP".
    Expect: the line "The SOP is approved." and part 4 now reads "Approved. DELA's self-check passed."

11. In part 5 "The gig":
    Expect: a line starting "Suggested budget: $" that ends "Suggested budget. You set the final amount.", and a line starting "You also pay Lawfecta's platform fee:" with the full cost.
    Do: type 300 in "Budget from ($)", 500 in "Budget to ($)", and 12/31/2026 in "Deadline" (or choose that date). Click the dark red "Draft the gig".
    Expect: DELA writes for up to 60 seconds, then the gig page opens with a "Public version" card and a dark red "Post the gig" at the bottom.
    Do: in the card "Budget, deadline and milestones", type Draft on the first line and Final on the second line of "Milestones (private)", then click the dark red "Post the gig".
    Expect: the matches view opens.

12. Go to: https://www.lawfecta.co/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
    Find: the card "✦ Automate or delegate" (top).
    Expect: the suggestions from step 6 again (no new review). The suggestion you delegated now has a green label "Gig posted" and an outlined "View gig" button. At the bottom of the card, a line starting "Delegated:" with the steps, the title, "See SOP ..." and "Gig posted.", with an outlined "Open the delegation" button at its right.

13. Go to: https://www.lawfecta.co/dela?tab=setup
    Expect: "6 of 6 done. You are set up." and card 4 shows "Done".

14. Go to: https://www.lawfecta.co/dela?tab=home
    Expect: the menu on the left no longer has the line "Get set up" (it leaves the menu once all six steps are done). "Talent" and "Files" are still there.

15. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

Group 2. A freelancer (log in as the test freelancer; only look)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=setup
   Expect: a card titled "This page is for attorneys" with the line that starts "This page is on the attorney workspace of DELA. You are signed in as a freelancer" and a button "Go to Home". The menu on the left has no line "Get set up".
   Do: click "Go to Home".
   Expect: the Home page (the heading starts "Hi"), with no "Get set up" anywhere on it.

3. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
