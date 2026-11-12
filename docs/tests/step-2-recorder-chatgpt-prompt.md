# ChatGPT test: DELA Process Recorder (beta)

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

> **Not rewritten yet (2026-11-05).** Claude rewrites this in the step-by-step style (link, card, where on the page, exact button) before you run it, with the "How to work" block from docs/tests/AGENT-RULES.md. Ask Claude for the new copy first.

Before you start:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. ChatGPT's agent cannot share a real screen, so you do Part A yourself, on a Windows or Mac computer in Chrome or Edge. Then give ChatGPT Part B.
   - Record a practice task with no client information. For example: write a short letter in Word, save it as a PDF, and upload it to a Google Drive folder.
3. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

## Part A (you, about 10 minutes, logged in as the test attorney)
1. Log in at https://www.lawfecta.co/login as stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD).
   - First, clear the old stuck recording: open https://www.lawfecta.co/dela?tab=library. In the "Recordings" card, the second card from the top, the row "Sample Process" says "Upload did not finish". Click "Remove" on that row and confirm.
   - Then open https://www.lawfecta.co/dela?tab=record. The "Record a process" page opens.
2. Fill in the page:
   1. Type a name in "Process name" at the top.
   2. Pick your microphone, and check that the level bar under it moves when you talk.
   3. Tick the consent box.
   4. Click "Start recording" at the bottom.
3. When the browser asks what to share, first choose one window. Expect "DELA needs your entire screen". Click "Start recording" again and choose "Entire Screen".
4. Do the practice task in Word and the browser, talking through each step. In Chrome and Edge, a small control window stays on top of Word: try "Pause" and "Resume" there.
5. Click "Stop and save" in the control window, or "Stop sharing" in the browser's bar. Expect "Uploading", then "Analyzing", and "You can leave this page".
6. Within a few minutes, expect a notice "Your recording is ready to review". Click "Notices" in the top bar to see it, and check your email too.
7. Review the recording:
   1. Open https://www.lawfecta.co/dela?tab=library. In the "Recordings" card, the second card from the top, click "Review" on your recording.
   2. Check the steps, the screenshots, "You may want to add these", and "What you said".
   3. Mark one line of "What you said" as private.
   4. Blur one screenshot: click "Blur part of this image" under it, drag over a part, and save.
   5. Click "Build my playbook" at the bottom.
8. Keep a copy of the video: back on https://www.lawfecta.co/dela?tab=library, in the "Recordings" card, click "Download video" on your recording's row. Expect a .webm file named "DELA - <process name> - <date>.webm" that plays. Keep it for the next step.
9. Upload a recording made elsewhere: in the "Recordings" card, click "Record a process", then "Upload a recording" near the bottom of that page, and choose the .webm file from step 8. Expect it to be read (about half its length) and then to appear in the "Recordings" card.
10. On your phone, log in at https://www.lawfecta.co/login as the test attorney and open https://www.lawfecta.co/dela?tab=record. Expect "Screen recording isn't available in this browser" and an "Upload a recording" button. (A narrowed computer window still records, so this check needs a real phone.)
11. Write down:
   - how long the recording was
   - how long the analysis took
   - how many steps DELA found
   - whether any step was wrong or missing
12. Sign out: click the initials in the top right, then "Sign out".

## Part B (ChatGPT)
Paste everything below the line into ChatGPT in agent mode.

---

You are testing the Process Recorder in DELA on the Lawfecta test site, www.lawfecta.co. The test attorney already made one recording. Report every step as PASS or FAIL with what you saw. Never type real client information.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in. The steps are grouped by login.

1. Attorney (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela?tab=library. The second card from the top is "Recordings". Expect:
   - how long the plan keeps videos, and the storage used
   - a table with Process name, Date recorded, Length, Status and Video deletes on
2. On the finished recording's row, expect "Ready for review" or an "Open playbook" button. Click "Open playbook".
   - Expect a playbook with steps and screenshots.
   - Click the "Activity" view in the row of views at the top of the playbook. It says the playbook was built from a recording.
3. On the same row, click "Delete video" and confirm. Expect "Video deleted on <date>", and the playbook is still there.
4. In the "Recordings" card, click "Record a process". Leave "Process name" empty and click "Start recording". Expect a request for a name.
5. Sign out (the initials in the top right, then "Sign out").

2. Owner (ask me to log in as the owner)
1. Open www.lawfecta.co/dela-admin and click "AI and files" in the menu on the left. Scroll to the "Process Recorder" card. Expect:
   - a table by month: started, finished, ready, failed, abandoned, built
   - recordings by browser
2. Click "Settings" in the menu on the left and find the group "Process Recorder". Expect the plan lengths, video days and credits per recording shown per plan (for example "Attorney Free: 20 minutes"), and the consent wording, which says to record only practice runs or work with no client information.
3. Sign out.

Final report:
- a table of every step with PASS or FAIL
- the four numbers from Part A
- anything confusing, slow or worded badly, with the exact text of every error message
