# ChatGPT test: screens, uploads and your own AI key (Steps 2a and 2)

> Checked 2026-11-13 (new layout). Open point: step 9 opens the document "New Family Law Client Intake After Signature" and expects its row of tabs to include "Export". Older documents have "Read", "Edit" and "Export" tabs; documents made with the newer document standard have "Draft and review" or "Approved version" and export buttons inside the page. Which kind this document is depends on the test site's data.

Claude already tested these on the test site with the real AI:
- Ask DELA answers, and the client information warning
- a document drafted by DELA, its questions answered, approval, and a chat change accepted as a new version
- Word and CSV exports
- refusing screenshots from unknown websites

This test covers what needs a real browser. Three logins, 23 steps.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. Replace YOUR_OPENAI_KEY with your own OpenAI key from https://platform.openai.com/api-keys. Only do this in ChatGPT on your own computer. After the test, revoke that key on the same page.
3. Have ready on your computer:
   - a short process write-up as a Word file or PDF, with no client information
   - any program file renamed to end in .pdf
4. ChatGPT cannot pick files from your computer. When it asks for a file, click "Take over", choose the file in the window that opened, hand control back and type: done, continue.
5. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
6. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

Own key for steps 15 to 17: YOUR_OPENAI_KEY.

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
   - Some steps were written for the earlier layout. Read them this way: "tab" or "row of tabs" means a line in the menu on the left; a name with a symbol in front (for example "⌂ Home") is the same name without the symbol; "blue button" means the dark red main button; "AI settings" means "Settings". In the admin area a "tab" is a line in the left menu under its heading: MEMBERS (Overview, Access list, People, Lawfecta Team, Agencies), PLANS AND SETTINGS (Plans, Settings, Switches, AI and files, Tech catalog, Trials, Usage), MARKETPLACE (Verification, Gigs, Meetings and messages, Reviews and bench), PAYMENTS (Payments, Disputes, Recurring), SAFETY (Security, Holds, Audit log, Jobs). Click the heading first if its lines are not showing.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Steps

TEST FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: a small yellow "Test site" label in the top bar, right of the page name "Home". The menu on the left has "Home", "Work", "Ask DELA", "Earnings" and "Profile". This test does not need the lines "Library" or "Files": write down whether you see them.
3. Go to: https://www.lawfecta.co/dela?tab=ask
   Find: the large white message box near the top, under the heading "Ask DELA" (its grey hint says "Type here, or press Talk and say it").
   Do: type: Give me a five step checklist for a filing day. Click the dark red "Send" under the box, at the right. Wait up to 60 seconds.
   Expect: an answer, with the small words "Answered with Lawfecta's AI" under it.
4. Sign out (the round button with your initials, then "Sign out").

TEST ATTORNEY (log in once)
5. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
6. Go to: https://www.lawfecta.co/dela?tab=home
   Expect: the menu on the left has "Home", "Projects", "Ask DELA", "Library", then "Talent" and "Files", and "Profile" below them.
7. Go to: https://www.lawfecta.co/dela?tab=delegate
   Do: click the outlined "New chat" at the right of the heading "Ask DELA". In the large white message box near the top, type: Give me a five step checklist for opening a new matter. Click the dark red "Send". Wait up to 60 seconds.
   Expect: an answer, with "Answered with Lawfecta's AI" under it.
8. On the same page:
   Find: the row of buttons under the message box, at the bottom of the conversation. The first one is "● Talk".
   Do: click "● Talk", allow the microphone if the browser asks, say one sentence, and click the same button again (it now reads "■ Stop").
   Expect: your words appear in the message box. They are not sent yet. If there is no "● Talk" button, write that down and go on.
9. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the document card titled "New Family Law Client Intake After Signature".
   Do: click the button at the bottom of that card (for example "Open document" or "Continue draft").
   Find: the row of tabs across the document page, under the title. This row belongs to the document.
   Do: click each tab in that row once, from left to right.
   Expect: every tab shows content. Write the names of the tabs, and any tab that is empty, broken or confusing.
10. On the same document:
    Do: click the tab "Export" in that row. Click the dark red "Word (.docx)", then the dark red "PDF" (a print view opens; close it).
    Expect: a Word file downloads. Open it: it has the title, numbered steps, and a footer with the version and date.
11. Go to: https://www.lawfecta.co/dela?tab=files
    Find: the card "Add files" at the top.
    Do: click the file box in that card and ask me to choose the process write-up. Do not tick the checkbox that starts "These files have no sensitive data". Click the dark red "Upload".
    Expect: the message "Tick the confirmation box above the upload first." Nothing is uploaded.
    Do: tick that checkbox and click "Upload" again.
    Expect: within 30 seconds the file is in the list below with "Ready".
12. In the card "Add files":
    Do: click the file box and ask me to choose the renamed program file. Tick the checkbox and click "Upload".
    Expect: the file shows in the list with "Not accepted".
13. In the file list, on the row of the process write-up (the one that says "Ready"):
    Do: click the outlined "Ask DELA" on that row. In the message box, type: Turn this into a playbook. Click "Send". Wait up to 60 seconds.
    Expect: a draft based on the file.
14. Go to: https://www.lawfecta.co/dela?tab=library
    Find: the outlined "Import" button at the top of the page, right of the dark red "Create a document".
    Do: click "Import", then "From a file or text you already have". Click the outlined "Use a file I uploaded", tick the process write-up in the list that opens, and click the dark red "Draft it with DELA". Wait up to 60 seconds.
    Expect: a document page opens with a card "DELA's questions".
15. Go to: https://www.lawfecta.co/dela?tab=ai
    Find: the heading "AI and messages" about halfway down the page, and under it the card "Which AI DELA uses".
    Do: click the round choice "Use my own key" in that card.
    Expect: a card "Your own key" appears below it.
    Do: in the card "Your own key", leave "Provider" on "OpenAI", paste YOUR_OPENAI_KEY into the box under "Your key", and click the dark red "Save and test". Wait up to 60 seconds.
    Expect: the message "Key saved. DELA will use it from now on." The card shows "Key" with "ending" and 4 characters. Reload the page: the full key appears nowhere on it.
16. Go to: https://www.lawfecta.co/dela?tab=delegate
    Do: click "New chat", type: Give me three tips for a tidy file name. Click "Send". Wait up to 60 seconds.
    Expect: an answer with "Answered with your own key" under it.
17. Go to: https://www.lawfecta.co/dela?tab=ai
    Find: the card "Your own key", under the heading "AI and messages".
    Do: (POP-UP) click the red "Remove" in that card and answer OK in the browser pop-up.
    Expect: the message "Key removed".
    Do: in the card "Which AI DELA uses", click the round choice "Use Lawfecta's AI".
    Expect: the message "Saved" and "Use Lawfecta's AI" is chosen.
18. Do: click the bell (Notices) at the right of the top bar, between the "Inbox" button and the round button with your initials.
    Expect: a panel on the right with a "Close" button in its top right corner.
    Do: click "Close".
    Expect: the panel closes.
    Do: click the bell again, then click the dimmed page to the left of the panel.
    Expect: the panel closes.
19. Sign out (the round button with your initials, then "Sign out").
    Expect: the Lawfecta login page, or the Lawfecta website signed out.

OWNER, ADMIN AREA (log in once)
20. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
21. Go to: https://www.lawfecta.co/dela-admin?tab=aifiles (this is "AI and files" in the left menu, under the heading "PLANS AND SETTINGS").
    Expect these cards, from top to bottom (a green or red line about Lawfecta's AI key comes first): "AI use this month", "Members' own keys", "Recent AI problems", "Storage by member", "Files held for a client information check", "Files not accepted", "Documents by plan", "Process Recorder", "ChatGPT and Claude connections".
22. On the same page:
    Find: the card "Members' own keys".
    Expect: no key for the test attorney (it was removed in step 17).
    Find: the card "Files not accepted".
    Expect: the renamed program file from step 12.
    Expect: no key and no words from inside a file appear anywhere on this page.
23. Sign out (the button with the owner's name at the top right, then "Sign out").

Report as described in "How to work", line 10. Give the exact words of every error message you saw.
