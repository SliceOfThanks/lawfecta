# ChatGPT test: UX review part 3, shared patterns (step 8)

> Layout note, 2026-11-13: DELA now has the menu on the left on every page (the compact workspace). The page description in "How to work" below is current. Steps written before that date may still name the old places (a row of tabs, a blue button, buttons in a dark top bar); line 6 of "How to work" says how to read them. Claude checks every step against the screen again before this test is next sent.

Claude already tested this with the real api and database: 273 api tests and all 18 browser test files pass. This test checks the changed screens on the test site.

It is a look-only test: nothing is saved, sent, paid or signed. Each account logs in once: freelancer first, then attorney.

Run it on its own, not at the same time as another test. If you have not run the usage limits test yet, run this one first: the usage test changes the test attorney's plan for a while.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

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

THIS TEST SAVES NOTHING
Do not click any button that saves, sends, signs, pays, posts, approves, cancels or deletes. Do not click any button that starts with ✦ (they run DELA's AI).

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the green line about proposals left this month, near the top.
   Expect: a small round "?" at the end of the line.
   Do: press Tab until the "?" is highlighted (or click it), then press Enter.
   Expect: a blue note opens under the line: "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count."
   Do: press Escape.
   Expect: the note closes.
   Find: the card "Matches (", lower down.
   Expect: if it says "No matches right now", there is a button "Open my profile and availability".

3. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card "Your profile", the "Headline" box near the top, and the "?" next to its label.
   Do: click the "?".
   Expect: a note explaining what to write. Press Escape: it closes.
   Expect: every button that uses DELA's AI (for example "✦ Write with DELA") looks the same: a light purple outline. Do not click it.

4. Sign out.

ATTORNEY (log in once)

5. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

6. Go to: https://www.lawfecta.co/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the signing form near the top (the box "Type your full name to sign"), if the agreement still waits for your signature.
   Expect: above the name box, a shaded box "What you are agreeing to" with what you pay ("Your total: ..."), how many days you have to review each milestone and the rounds of changes, the cancellation rule, a line about the agency's subcontractors, and "Keep all work, messages and payment on Lawfecta." Do not sign.
   Find: the card "The agreement".
   Expect: "Agency" and "Agency lead" in the first lines, and a sentence starting "By signing, the client agrees the agency may use vetted Lawfecta subcontractors." Right under the agreement's cards, the card "Who's working on this".
   Expect: the headings "Milestones" and "Fees" each have a "?" that explains the word. Click one, read it, press Escape.

7. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement".
   Expect: "Next billing" has a "?". Click it: it explains the billing day. Press Escape.
   Find: the card "Problems, disputes and canceling" near the bottom.
   Expect: its heading has a "?" that explains a dispute and says it is not a court or arbitration.

8. Go to: https://www.lawfecta.co/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
   Find: the card "Quality check" on the right.
   Expect: its heading has a "?" that explains R, A, C and I. If any item is not passed, its button reads "Fix it: " followed by the name of the check (not just "Fix it"). Do not click it.

9. Go to: https://www.lawfecta.co/dela?tab=inbox
   Do: click the first conversation, then click "✦ AI help" under the heading to open it (do not click the buttons inside it).
   Expect: "✦ Summarize" and "✦ What we agreed" look like the other AI buttons (light purple outline).

10. Sign out.
