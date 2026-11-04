# Short ChatGPT test: what Claude could not test (screens, uploads, own key)

Claude already tested on the test site, with the real AI: Ask DELA answers, the client information warning, a playbook drafted by DELA, its questions answered (100% complete), approval, a chat change accepted as a new version, Word and CSV exports, and refusing screenshots from unknown websites.
This test covers what needs a real browser session. It replaces the three longer prompts.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Fill in YOUR_OPENAI_KEY with your own OpenAI key (only on your own computer; remove it afterwards).
3. Have ready: a short process write-up as a Word file or PDF (no client information), and any program file renamed to end in .pdf.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com. Report every step as PASS or FAIL with what you saw, and take a screenshot of anything wrong or confusing. Never type real client information.

Logins: test attorney stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD); test freelancer stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD); owner stacey@lawfecta.com (password TEST_PASSWORD). Own key for step C: YOUR_OPENAI_KEY.

A. Screens (test attorney)
1. Open www.hirelegalhelp.com/dela. Expect a "Test site" badge and tabs Home, Ask DELA, Library, Files, Projects, Talent. Narrow the window to phone width: the tabs move to the bottom and nothing runs off the side.
2. Ask DELA: type a question, click Send, expect an answer within 30 seconds with "Answered with Lawfecta's AI". Click Talk, allow the microphone, say a sentence, click Stop: your words appear in the box, not sent yet.
3. Library: expect the playbook "New Family Law Client Intake After Signature". Open it. Click through Read, Edit, Chat, Suggestions, Comments, Activity, Versions, Files, Export. Report any view that is empty, broken or confusing.
4. In Export click Word (.docx) and PDF. Open both files: expect the title, numbered steps and a footer with the version and date.

B. Files (test attorney)
1. Files: upload the process file WITHOUT ticking the box: expect a red message. Tick the box and upload: expect "Ready".
2. Upload the renamed program file: expect "Not accepted".
3. On the ready file click Ask DELA, ask "Turn this into a playbook": expect a draft based on the file.
4. In Library click New playbook, then "Use a file I uploaded", choose the file, click Draft it with DELA: expect a playbook page with DELA's questions.

C. Own key (test attorney)
1. Account menu (initials, top right), AI settings. Paste YOUR_OPENAI_KEY, keep OpenAI, click Save and test: expect "Key saved", "Key ending" with 4 characters, and the full key nowhere on the page, even after reload.
2. Ask DELA a question: expect "Answered with your own key".
3. Back in AI settings click Remove: expect Lawfecta's AI chosen again.

D. Other people
1. Log in as the test freelancer: expect Ask DELA but no Library or Files tab.
2. Log in as the owner, open www.hirelegalhelp.com/dela-admin, tab "AI and files": expect AI use this month, members' keys (none after C3), files not accepted (the renamed program), and playbook and recorder counts. No key or file contents appear anywhere.

Final report: a table of every step with PASS or FAIL, then anything confusing, slow (over 30 seconds) or worded badly, with the exact text of every error message.
