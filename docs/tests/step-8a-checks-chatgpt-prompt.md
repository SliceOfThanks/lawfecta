# ChatGPT test: the checks before a commitment (UX Phase 4 part B)

Claude already tested this with the real api and database: 8 api tests and 15 browser checks (with a stand-in AI that tries to rank people and break the rules), plus all the other api tests and browser test files. This test checks the real screens on the test site, with the real AI.

The checks are on for the test accounts only (switch ai_helpers, access list). Each run uses DELA actions from the test accounts' monthly allowance (1, or 2 for comparing proposals and checking an agreement). This test uses about 12.

It is a look-only test: nothing is saved, sent, posted, signed or paid. Each account logs in once: freelancer, then attorney.

Claude prepared this on the test site before the test (2026-11-06):
- The open gig "Build document checklist from questionnaire answers" has two proposals to compare: one from the test freelancer and one from "Sample Freelancer (prepared)", a made-up person with no login.
- The test freelancer is invited to the open gig "Preparing a Small Claims Filing Packet" and has not sent a proposal.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use hirelegalhelp.com in other tabs while it runs, and run it on its own.
4. Run it before the usage limits test (that test uses up the test attorney's DELA actions).

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD

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

THIS TEST SAVES NOTHING
Do not click "Save", "Save draft", "Send proposal", "Post the gig", "Choose", "Sign", "Send the new version", "Save the monthly terms", "Pay" or any "Upgrade" button. The only ✦ buttons to click are the ones the steps name. DELA's AI writes its own words, so the exact findings will differ: check the layout and the labels the steps name.

Steps

FREELANCER (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.

2. Go to: https://www.hirelegalhelp.com/dela?tab=work&gig=acd44c8b-ad65-4703-a738-36bdaf6123e1
   Find: the card "Your proposal", lower on the page.
   Do: type 400 in "Total price ($)", type 5 in "Days to deliver", type Prepare the filing packet in "What your price includes", and leave "What it leaves out" empty.
   Find: under "Note to the attorney (optional)", an outlined light purple button "✦ Check my proposal" with the grey line "Uses 1 DELA action on Lawfecta's AI (none on your own key)." next to it.
   Do: click "✦ Check my proposal". Wait up to 60 seconds.
   Expect: a shaded panel under the button with the label "AI suggestion" and a "Dismiss" button at its top right; one or more findings, each starting with the box it is about in bold (for example "Not included:" or "Schedule:"); some with "Suggestion: ..." and the buttons "Use suggestion", "Edit" and "Dismiss"; and at the bottom the grey line "These checks do not confirm legal correctness and are not legal advice."
   Do: if a finding has "Use suggestion", click it.
   Expect: the message "Added to the form. Nothing is saved until you save." and the suggestion appears in that box. Do not send the proposal.

3. Go to: https://www.hirelegalhelp.com/dela?tab=work&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the card "The agreement".
   Expect: near the top of the card, the button "✦ Check this for me" with "Uses 2 DELA actions on Lawfecta's AI (none on your own key)."
   Do: click "✦ Check this for me". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel listing what does not match between the proposal and the agreement (or "DELA found nothing to flag."), ending with the legal-correctness line. Do not sign.

4. Go to: https://www.hirelegalhelp.com/dela?tab=projects
   Expect: a card "This page is for attorneys" saying "This page is on the attorney side of DELA. You are signed in as a freelancer (DELA Test Freelancer)." with a "Go to Home" button (no empty "Coming soon" page).

5. Sign out.

ATTORNEY (log in once)

6. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

7. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=377827e5-e2c8-4fb5-833a-fe264dc0514a
   Find: the card "Budget, deadline and milestones", then just below it the button "✦ Check the scope" with "Uses 1 DELA action on Lawfecta's AI (none on your own key)."
   Do: click "✦ Check the scope". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel with findings that start with the box they are about (for example "The task:", "Deadline:" or "Budget:"), suggestions with "Use suggestion", "Edit" and "Dismiss" where DELA can fill a box, and the legal-correctness line at the bottom.
   Do: click "Dismiss" on the first finding.
   Expect: that finding disappears. Do not save or post the gig.

8. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=f44fb7f3-5760-42f2-ab23-1c35e8d56e4a&view=proposals
   Find: the card "Compare proposals", with a table of two proposals (DELA Test Freelancer and Sample Freelancer (prepared)).
   Expect: under the table, the button "✦ Compare these proposals" with "Uses 2 DELA actions on Lawfecta's AI (none on your own key)."
   Do: click "✦ Compare these proposals". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel with one section for each of the two freelancers, by name, each with a short summary, a "Not said: ..." line and (often) "You could ask: ...". No sentence says one proposal is better, best or recommended. At the bottom: "DELA lists the same details for every proposal and does not rank them. You choose." Do not click "Choose".

9. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the card "The agreement".
   Do: click "✦ Check this for me" near the top of the card. Wait up to 60 seconds.
   Expect: an "AI suggestion" panel like the freelancer's in step 3. If it lists findings, it may also show "Propose changes". Do not click it, and do not sign.

10. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
    Find: the card "The agreement", then the "Milestones" table, and under it the button "✦ Improve acceptance criteria" (1 DELA action).
    Do: click "✦ Improve acceptance criteria". Wait up to 60 seconds.
    Expect: an "AI suggestion" panel with "Milestone 1: ..." and a clearer deliverable, the line "Using them starts a new version of the agreement. Both of you sign it before it applies.", and the buttons "Use suggestion" and "Edit".
    Do: click "Use suggestion".
    Expect: the card "Change order" opens with the note "DELA's suggested deliverables are filled in below. Check them, then send the new version; nothing changes until you both sign." and the suggested text in the "Deliverables" box.
    Do: click "Cancel" at the bottom of that card. Do not click "Send the new version".

11. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=adf3da25-5d7d-4a56-bf88-8bd4cac3a22a&view=agreement
    Find: the card "Monthly terms" and its list of tasks; under the tasks, the button "✦ Check monthly scope" (1 DELA action), above "Save the monthly terms".
    Do: click "✦ Check monthly scope". Wait up to 60 seconds.
    Expect: an "AI suggestion" panel whose findings start with "Task 1, ..." and the box (for example "Task 1, Turnaround:"), with "Use suggestion" where DELA can fill that box. Do not click "Save the monthly terms".

12. Go to: https://www.hirelegalhelp.com/dela?tab=work
    Expect: a card "This page is for freelancers" saying "This page is on the freelancer side of DELA. You are signed in as an attorney (DELA Test Attorney)." with a "Go to Home" button.
    Do: click "Go to Home".
    Expect: the attorney Home page opens.

13. Sign out.
