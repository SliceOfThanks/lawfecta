# ChatGPT re-test: the steps that failed in the security test (step 6d)

The first run (2026-11-05) failed mostly because text files could not finish uploading. That is fixed. The warnings now also stay on the card instead of disappearing, the admin area has "Sign out", and amounts never show "$NaN". This re-test covers only the steps that failed.

Before you paste this:
1. Keep the two made-up test files on your desktop: "Roe intake (made up).txt" and "SSN test (made up).txt" (sent again with this message; also on GitHub: https://github.com/SliceOfThanks/lawfecta/tree/claude/step-2a-ai-keys-voice-files/docs/tests/files).
2. When ChatGPT asks for a file: click "Take over", choose the file, hand control back, and type: done, continue.
3. If ChatGPT asks for a 6-digit code: open the email "[Test site] Your DELA code: ..." in your stacey@lawfecta.com inbox and type the digits in ChatGPT.
4. If ChatGPT asks before clicking "Extend 14 days" or "Delete now": these are made-up test files, so type: yes, go ahead.
5. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
6. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
7. A message that says only "probe" on this job is Claude's check from the first run. Ignore it.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. This is a re-test of a few steps. Every file and detail here is made up.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- owner: stacey@lawfecta.com, password TEST_PASSWORD

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
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens. In the admin area (dela-admin), click "Sign out" at the right end of the dark top bar.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Group 1. Attorney (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b
   Do: click "Files (0)" or "Files (1)" in the row of round buttons under the title.
   Find: the card "Files for this gig".
   Expect: the checkbox "This job involves sensitive data (SSN, medical, financial, or ID documents)" is ticked (from the first run). Untick it.
   Expect: the message "No longer marked as sensitive."
   Do: choose "7 days" in "Freelancer can open it for", click "Share a file from Files", then the blue "Share" next to any file.
   Expect: "Shared until (a date)" and the line "Freelancer access until (that date)".
   Do: click "Extend 14 days" on that line. These are made-up test files, so extending is safe.
   Expect: "Extended to (a date 14 days later)".

3. Do: click "Agreement and work" in the row of round buttons.
   Find: the card "Confidential materials" (scroll down, below "Milestones").
   If it asks for a code: click "Email me a code", ask me for the code, type it in "6-digit code" and click "Open".
   Expect: the headings "Files", "Secure document links", "Confidential messages" and "Who can see this".

4. Under "Files" in that card:
   Do: click "Choose File" and ask me to choose "Roe intake (made up).txt". Choose "30 days" in "Freelancer can open it for". Tick "This file contains no medical records, ID documents, account numbers, logins or biometric data." Click "Upload".
   Expect: within 20 seconds, "Roe intake (made up).txt" listed with "Freelancer access until (a date 30 days from today)".

5. Still under "Files":
   Do: click "Choose File" and ask me to choose "SSN test (made up).txt". Tick the same checkbox and click "Upload".
   Expect: near the top of the card, a box that stays on the page saying "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead." Under the upload, the outlined button "Mark this job as sensitive". Do not click it.

6. Under "Secure document links":
   Do: type Test folder in "Label, for example Medical records folder", type http://drive.google.com/test in "Paste the sharing link from your storage", and click "Add link".
   Expect: the box near the top of the card says "Use a secure link that starts with https." and is still there after 10 seconds.

7. Under "Confidential messages":
   Do: click in the message box, type Jane Roe called about the hearing. and click the blue "Send".
   Expect: the box near the top of the card says "Sent", and the message is listed.
   Do: type Her card is 4111 1111 1111 1111 and click "Send".
   Expect: the box near the top of the card says it looks like it contains a card number, and to send only the last 4 digits.

8. Sign out.

Group 2. Freelancer (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b&view=agreement
   Find: the card "Confidential materials" (scroll down). If it asks for a code, do the same as Group 1, step 3.
   Expect: under "Files", "Roe intake (made up).txt" with "Open to you until (a date)".
   Do: click "Download" on that file.
   Expect: the file downloads or opens in a new tab.

3. Sign out.

Group 3. Check the results (the test attorney, then the owner)

1. Ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b
   Do: click "Files (1)".
   Find: the card "File activity" (below "Files for this gig").
   Expect: a line showing DELA Test Freelancer "downloaded" Roe intake (made up).txt, under "Confidential materials".

2. Do: click "Agreement and work". In "Confidential materials", tick "This job involves sensitive data (SSN, medical, financial, or ID documents)".
   Expect: the note "2 files are already shared on this job. They stay until they expire. You can delete them now." with "Delete now" and "Keep them until they expire".
   Do: click "Delete now", then "Yes, delete them". These are made-up test files.
   Expect: a message starting "Deleted.", and under "Files": "No files yet."

3. Sign out. Ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela-admin
   Find: the dark bar at the very top of the page.
   Expect: a "Sign out" button at the right end of the dark bar, next to "Member view".
   Do: click "Sign out".
   Expect: you are logged out of the website.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.
