# ChatGPT test: screens, uploads and your own AI key (Steps 2a and 2)

> DO NOT RUN AS IT IS (2026-11-13). This test was written for the earlier layout. It checks the old row of tabs in the member area, including on a phone. The new layout is tested by docs/tests/workspace-chatgpt-prompt.md. Claude rewrites this test before it is needed again.


> **Not rewritten yet (2026-11-05).** Claude rewrites this in the step-by-step style (link, card, where on the page, exact button) before you run it, with the "How to work" block from docs/tests/AGENT-RULES.md. Ask Claude for the new copy first.

Claude already tested these on the test site with the real AI:
- Ask DELA answers, and the client information warning
- a playbook drafted by DELA, its questions answered, approval, and a chat change accepted as a new version
- Word and CSV exports
- refusing screenshots from unknown websites

This test covers what needs a real browser.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Replace YOUR_OPENAI_KEY with your own OpenAI key from https://platform.openai.com/api-keys. Only do this in ChatGPT on your own computer. After the test, revoke that key on the same page.
3. Have ready on your computer:
   - a short process write-up as a Word file or PDF, with no client information
   - any program file renamed to end in .pdf
4. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.
   The steps are grouped by login, so this happens three times.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

Own key for group 2: YOUR_OPENAI_KEY.

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

The steps are grouped by login. To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Freelancer (ask me to log in as the test freelancer)
1. Open www.lawfecta.co/dela.
   - Expect: a "Test site" badge in the top bar.
   - The menu on the left under it shows Home, Ask DELA, Profile, Work and Earnings, and no Library or Files tab.
2. Click "Ask DELA" in that menu on the left. Type a short made-up question in the message box at the bottom of the page and click "Send".
   - Expect an answer within 30 seconds, with "Answered with Lawfecta's AI" under it.
3. Sign out.

2. Attorney (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela.
   - Expect the tabs Home, Ask DELA, Library, Files, Projects and Talent.
   - Narrow the window to phone width: the tabs move to the bottom of the screen and nothing runs off the side. Widen it again.
2. Click "Ask DELA". Type a question and click "Send".
   - Expect an answer within 30 seconds, with "Answered with Lawfecta's AI".
   - Then click "● Talk" next to the message box, allow the microphone, say a sentence, and click "■ Stop". Expect your words in the message box, not sent yet.
3. Click "Library" in the menu on the left. Scroll past the first two cards (the playbook count and "Recordings") to the list of playbooks, and click "New Family Law Client Intake After Signature".
   - At the top of the playbook there is a row of views: Read, Edit, Chat, Suggestions, Comments, Activity, Versions, Files and Export. Click each one.
   - Report any view that is empty, broken or confusing.
4. In the "Export" view, click "Word (.docx)", then "PDF". Open both files. Expect the title, numbered steps, and a footer with the version and date.
5. Click "Files" in the menu on the left. In the "Add files" area at the top:
   1. Choose the process write-up and click "Upload" without ticking the box that starts "These files have no confidential client information". Expect a red message.
   2. Tick that box and upload again. Expect the file in the list below with "Ready".
6. Upload the renamed program file (tick the box). Expect "Not accepted".
7. In the file list, on the ready file's row, click "Ask DELA". Type "Turn this into a playbook" and send. Expect a draft based on the file.
8. Click "Library". In the first card at the top (the one showing how many playbooks you have), click "New playbook":
   1. Choose "Use a file I uploaded", pick the file, and click "Draft it with DELA".
   2. Expect a playbook page with DELA's questions.
9. Open your own key settings: click the initials in the top right, then "Settings".
   1. In the "Your own key" card, keep "OpenAI", paste YOUR_OPENAI_KEY into the "Your key" box, and click "Save and test".
   2. Expect "Key saved" and "ending" with 4 characters. The full key must appear nowhere on the page, even after you reload it.
10. Click "Ask DELA", ask a question, and send. Expect "Answered with your own key".
11. Back in "Settings", in the "Your own key" card, click "Remove" and confirm. Expect "Use Lawfecta's AI" chosen again in the "Which AI DELA uses" card at the top.
12. Click the bell (Notices) at the right of the top bar. Expect a panel on the right with a "Close" button in its top-right corner. Click "Close": it closes. Open it again and click the dimmed page to the left: it closes.
13. Sign out. Expect the Lawfecta login page.

3. Owner (ask me to log in as the owner)
1. Open www.lawfecta.co/dela-admin and click "AI and files" in the menu on the left near the top. Expect these cards, from top to bottom (other cards, such as "Recent AI problems" and "Storage by member", sit between them):
   - "AI use this month"
   - "Members' own keys": none, after group 2 step 11
   - "Files not accepted": the renamed program
   - "Playbooks by plan"
   - "Process Recorder"
   - "ChatGPT and Claude connections"
   No key or file contents appear anywhere.
2. Sign out.

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message
