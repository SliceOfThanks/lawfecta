# ChatGPT test prompt: DELA Process Recorder (beta)

Before you paste this:
1. The two Supabase secrets from Step 2a must be in place (AI_KEY_ENCRYPTION_SECRET and OPENAI_API_KEY).
2. ChatGPT's agent cannot share a real screen. Do Part A yourself on a Windows or Mac computer in Chrome or Edge, then give ChatGPT Parts B to D. Record a practice task with no client information (for example: write a short letter in Word, save it as a PDF, upload it to a test website or a Google Drive folder).
3. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.

## Part A (you, about 10 minutes)
1. Log in to www.hirelegalhelp.com as the test attorney. Open DELA, then Library. In Recordings, click Record a process.
2. Type a process name. Pick your microphone and check the level bar moves when you talk. Tick the consent box. Click Start recording.
3. When the browser asks what to share, first choose one window: expect "DELA needs your entire screen". Click Start recording again and choose Entire Screen.
4. Do the practice task in Word and the browser, talking through each step. In Chrome and Edge a small control window stays on top of Word: try Pause and Resume there.
5. Click Stop and save (or the browser's Stop sharing bar). Expect Uploading, then Analyzing, and "You can leave this page".
6. Within a few minutes expect a notice (and an email once email is set up) "Your recording is ready to review".
7. Open Library, Recordings, click Review. Check the steps, screenshots, "You may want to add these", and What you said. Mark one transcript line as private. Blur one screenshot. Click Build my playbook.
8. Write down: how long the recording was, how long analysis took, how many steps DELA found, and whether any step was wrong or missing.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing the Process Recorder in DELA on the Lawfecta test site (www.hirelegalhelp.com). The attorney already made one recording. Report every step as PASS or FAIL with what you saw. Never type real client information.

Logins: test attorney stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD); owner stacey@lawfecta.com (password TEST_PASSWORD).

Part B: Recordings list
1. Log in as the test attorney. Open www.hirelegalhelp.com/dela, Library. Expect a Recordings card with the plan's video keeping time, storage used, and a table: Process name, Date recorded, Length, Status, Video deletes on.
2. The finished recording shows "Ready for review" or an "Open playbook" button. Click Open playbook: expect a playbook with steps and screenshots, marked as built from a recording in its Activity.
3. Click Download video. Expect a .webm file named "DELA - <process name> - <date>.webm" that plays.
4. Click Delete video and confirm. Expect "Video deleted on <date>" and the playbook still there.

Part C: Misuse
1. Click Record a process, leave the process name empty, and click Start recording. Expect a request for a name.
2. On a phone (or with the browser narrowed to phone size and the page reloaded on a phone), open Record a process. Expect "Screen recording isn't available in this browser" and an Upload a recording button.
3. Upload a recording: choose a short MP4 or WebM screen recording made elsewhere (for example with Loom or the computer's own recorder). Expect it to be read (about half its length) and to appear under Recordings.

Part D: Owner
1. Log in as the owner, open www.hirelegalhelp.com/dela-admin, AI and files. Expect a Process Recorder table by month (started, finished, ready, failed, abandoned, built) and recordings by browser.
2. Settings, group Process Recorder: expect the plan lengths, video days, credits per recording, and the consent wording.

Final report: a table of every step with PASS or FAIL, then anything confusing, slow, worded badly or unsafe, with the exact text of every error message.
