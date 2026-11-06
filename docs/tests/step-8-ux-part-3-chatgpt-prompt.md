# ChatGPT test: UX review part 3, shared patterns (step 8)

Claude already tested this with the real api and database: 273 api tests and all 18 browser test files pass. This test checks the changed screens on the test site.

It is a look-only test: nothing is saved, sent, paid or signed. Each account logs in once: freelancer first, then attorney.

Run it on its own, not at the same time as another test. If you have not run the usage limits test yet, run this one first: the usage test changes the test attorney's plan for a while.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use hirelegalhelp.com in other tabs while it runs.

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
Do not click any button that saves, sends, signs, pays, posts, approves, cancels or deletes. Do not click any button that starts with ✦ (they run DELA's AI).

Steps

FREELANCER (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.

2. Go to: https://www.hirelegalhelp.com/dela?tab=work
   Find: the green line about proposals left this month, near the top.
   Expect: a small round "?" at the end of the line.
   Do: press Tab until the "?" is highlighted (or click it), then press Enter.
   Expect: a blue note opens under the line: "How many proposals you can send this month on your plan. It resets on the 1st. Proposals to gigs you were invited to do not count."
   Do: press Escape.
   Expect: the note closes.
   Find: the card "Matches (", lower down.
   Expect: if it says "No matches right now", there is a button "Open my profile and availability".

3. Go to: https://www.hirelegalhelp.com/dela?tab=profile
   Find: the card "Your profile", the "Headline" box near the top, and the "?" next to its label.
   Do: click the "?".
   Expect: a note explaining what to write. Press Escape: it closes.
   Expect: every button that uses DELA's AI (for example "✦ Write with DELA") looks the same: a light purple outline. Do not click it.

4. Sign out.

ATTORNEY (log in once)

5. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

6. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the signing form near the top (the box "Type your full name to sign"), if the agreement still waits for your signature.
   Expect: above the name box, a shaded box "What you are agreeing to" with what you pay ("Your total: ..."), how many days you have to review each milestone and the rounds of changes, the cancellation rule, a line about the agency's subcontractors, and "Keep all work, messages and payment on Lawfecta." Do not sign.
   Find: the card "The agreement".
   Expect: "Agency" and "Agency lead" in the first lines, and a sentence starting "By signing, the client agrees the agency may use vetted Lawfecta subcontractors." Right under the agreement's cards, the card "Who's working on this".
   Expect: the headings "Milestones" and "Fees" each have a "?" that explains the word. Click one, read it, press Escape.

7. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement".
   Expect: "Next billing" has a "?". Click it: it explains the billing day. Press Escape.
   Find: the card "Problems, disputes and canceling" near the bottom.
   Expect: its heading has a "?" that explains a dispute and says it is not a court or arbitration.

8. Go to: https://www.hirelegalhelp.com/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
   Find: the card "Quality check" on the right.
   Expect: its heading has a "?" that explains R, A, C and I. If any item is not passed, its button reads "Fix it: " followed by the name of the check (not just "Fix it"). Do not click it.

9. Go to: https://www.hirelegalhelp.com/dela?tab=inbox
   Do: click the first conversation, then click "✦ AI help" under the heading to open it (do not click the buttons inside it).
   Expect: "✦ Summarize" and "✦ What we agreed" look like the other AI buttons (light purple outline).

10. Sign out.
