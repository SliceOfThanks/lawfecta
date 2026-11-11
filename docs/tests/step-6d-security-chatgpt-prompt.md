# ChatGPT test: security rules and Confidential materials (step 6d)

Claude already tested all of this with the real api and database: 16 Confidential materials tests, 10 security tests, 28 browser checks for these screens and 93 for the /security page. This test covers the real screens on the test site.

The job used here, "Test job: Confidential materials", is a made-up test job that Claude made for this test. It is marked as signed and paid so that Confidential materials can open (no payment and no money).

Before you paste this:
1. Save the two made-up test files Claude sent you on your desktop:
   - Roe intake (made up).txt
   - SSN test (made up).txt
   They are also on GitHub: https://github.com/SliceOfThanks/lawfecta/tree/claude/step-2a-ai-keys-voice-files/docs/tests/files
2. ChatGPT cannot pick files from your computer. When it asks for a file, click "Take over", choose the file in the window that opened, hand control back and type: done, continue.
3. Confidential materials asks for a 6-digit code sent by email. The test attorney's and test freelancer's emails arrive in your stacey@lawfecta.com inbox. When ChatGPT asks for the code, open the email "[Test site] Your DELA code: ..." and type the 6 digits in ChatGPT.
4. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
5. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

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
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Group 1. Attorney (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b
   Find: the title "Test job: Confidential materials" at the top, and the row of round buttons under it ("Details", "Matches", "Questions", "Proposals (1)", "Files (0)", "Agreement and work").
   Do: click "Files (0)".
   Expect: the card "Files for this gig" with a checkbox "This job involves sensitive data (SSN, medical, financial, or ID documents)" and, under it in grey, "Sensitive documents must be shared using a link from your own storage (Google Drive, Dropbox, OneDrive, Box, ShareFile, Clio, NetDocuments). Do not upload them here."
   Expect: below it, a card "File activity" saying "Nobody has opened anything yet."

3. Still in the card "Files for this gig":
   Do: in the dropdown "Freelancer can open it for" (near the bottom of the card), choose "7 days". Click the outlined "Share a file from Files" next to it, then the blue "Share" next to any one file in the list that opens.
   Expect: the message "Shared until (a date 7 days from today)", and the file listed with "Freelancer access until (that date)".
   Do: click the outlined "Extend 14 days" on that file's line.
   Expect: the message "Extended to (a date 21 days from today)".

4. Do: click "Agreement and work" in the row of round buttons.
   Find: the card "Confidential materials" (scroll down, below the card "Milestones").
   Expect: the text "For your security, DELA emails you a 6-digit code before it opens this area. Once you enter it, it works for 12 hours."
   Do: click the outlined "Email me a code". Expect "We sent a code to s***@lawfecta.com". Ask me for the code. Type it in the box "6-digit code" and click the blue "Open".
   Expect: the card shows the headings "Files", "Secure document links", "Confidential messages" and "Who can see this".

5. In the card "Confidential materials", under the heading "Files":
   Do: click "Choose File" and ask me to choose "Roe intake (made up).txt". In the dropdown "Freelancer can open it for", choose "30 days". Do not tick the checkbox yet. Click the blue "Upload".
   Expect: a red message starting "Tick the box to confirm the file has no medical records".
   Do: tick "This file contains no medical records, ID documents, account numbers, logins or biometric data." and click "Upload" again.
   Expect: within 20 seconds, "Roe intake (made up).txt" listed with "Freelancer access until (a date 30 days from today)" and the buttons "Download", "Extend 14 days", "View only" and "Delete".

6. Still under "Files":
   Do: click "Choose File" and ask me to choose "SSN test (made up).txt". Tick the same checkbox and click "Upload".
   Expect: the red message "This file appears to contain sensitive data like a Social Security or card number. Please share it using a secure link instead." and an outlined button "Mark this job as sensitive" under it. Do not click it.

7. Under the heading "Secure document links" (below "Files"):
   Do: type Medical records folder in the box "Label, for example Medical records folder". Type http://drive.google.com/test in the box "Paste the sharing link from your storage". Click the blue "Add link".
   Expect: the message "Use a secure link that starts with https."
   Do: change the link to https://drive.google.com/drive/folders/made-up-test. In the dropdown "Link expires after", choose "7 days". Click "Add link".
   Expect: "Link added. It expires on (a date 7 days from today)." and the line "Medical records folder | drive.google.com, added by ..." with "Expires (that date)". The full link is not shown on the page.

8. Under "Confidential messages":
   Do: type Jane Roe called about the hearing. in the message box and click the blue "Send".
   Expect: "Sent" and the message listed.
   Do: type Her card is 4111 1111 1111 1111 and click "Send".
   Expect: a red message that says it looks like it contains a card number and to send only the last 4 digits.

9. Sign out.

Group 2. Freelancer (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b&view=agreement
   Find: the card "Confidential materials" (scroll down, below "Milestones").
   Do: click "Email me a code". Ask me for the code. Type it in "6-digit code" and click "Open".
   Expect: the promise "I will keep these materials confidential, use them only for this engagement, and delete any copies when it ends." with a checkbox, and a greyed-out "Open Confidential materials".
   Do: tick the checkbox and click "Open Confidential materials".

3. Expect: under "Files", "Roe intake (made up).txt" with "Open to you until (a date)"; there is no checkbox "This job involves sensitive data".
   Expect: under "Secure document links", "Medical records folder" with the outlined "Open link", and no "Add link" button.
   Do: click "Open link". Expect: a new tab opens to drive.google.com (it will say the folder does not exist; that is fine). Close that tab.

4. Under "Files":
   Do: click the outlined "Download" on "Roe intake (made up).txt".
   Expect: the file downloads or opens in a new tab.

5. Sign out.

Group 3. Check the results (the test attorney, then the owner)

1. Ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects&gig=bc969483-3b96-4a7e-a3ae-cce26a1c3b0b
   Do: click "Files (1)".
   Find: the card "File activity" (below "Files for this gig").
   Expect: lines showing DELA Test Freelancer "downloaded" Roe intake (made up).txt and "opened the link" Medical records folder, under "Confidential materials".

2. Do: click "Agreement and work". In the card "Confidential materials", click "Activity" (the small line near the bottom of the card) to open it.
   Expect: the same opens and downloads, each under the freelancer's name.

3. In the card "Confidential materials":
   Do: tick "This job involves sensitive data (SSN, medical, financial, or ID documents)".
   Expect: the message "Marked as sensitive: no uploads on this job, secure links only." and a note "2 files are already shared on this job. They stay until they expire. You can delete them now." (the shared Files-tab file and the confidential file) with "Delete now" and "Keep them until they expire".
   Do: click "Delete now", then "Yes, delete them".
   Expect: a message starting "Deleted.", then under "Files": "This job involves sensitive data, so files cannot be uploaded here." and "No files yet."

4. Go to: https://www.lawfecta.co/dela?tab=files
   Find: the row of round buttons above the file list ("All files", your folders, "Trash").
   Do: click "Trash".
   Expect: if the trash is empty, the text "The trash is empty." Write PASS and go on. If a file is listed: (POP-UP) click "Delete forever" on it and answer OK. Expect "Deleted forever".

5. Sign out. Ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela-admin
   Do: click the tab "Security" (in the row of tabs near the top, between "Lawfecta Team" and "Holds").
   Expect: the card "Security questions from the website" and the card "Confidential materials" with counts such as "Files", "Secure links open" and "Jobs marked sensitive". No file names, messages or links appear in these counts.

6. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
