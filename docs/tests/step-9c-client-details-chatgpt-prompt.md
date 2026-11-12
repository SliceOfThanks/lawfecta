# ChatGPT test: the client information check follows the sensitive data rule (step 9c)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested this with the real api and database: 8 new api tests (Ask DELA, the profile, the Files page, the re-check of held files, the new kinds) and a browser check, plus all 311 api tests and all 23 browser test files. This test checks the real screens on the test site.

The new rule is on for the test accounts only (switch client_details_allowed, access list). It stays off on Live until the lawyer's privacy review.

What it covers:
- Ask DELA accepts made-up client details after one reminder, and stops a made-up government ID number with no way to send it anyway.
- A gig conversation before any agreement is signed reminds you before client details go to the freelancer.
- The profile, which other members read, still warns about client details.
- The admin Switches page shows the new switch.

It sends one Ask DELA message (1 DELA action from the test attorney's monthly allowance). Nothing else is saved or sent: every reminder in the gig conversation and the profile is answered with "Cancel". Each account logs in once: freelancer, then attorney, then the owner.

Not in this test (Claude's tests cover them): uploads to the Files page (ChatGPT cannot pick a file from your computer), a conversation after signing, the connector, and the release of held files.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue. For the owner, use your own login (stacey@lawfecta.com).
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (Lawfecta Team): I log in for you.

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
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

IMPORTANT FOR THIS TEST
Every name and number below is made up. When a browser pop-up with "OK" and "Cancel" appears in the freelancer or profile steps, read it, write down its words, and click "Cancel". Only step 7 clicks a "Continue" button.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
   Find: the conversation about "Send the Welcome Packet and Intake Follow-Up", and the message box "Your message" at the bottom with "Send" next to it.
   Do: type My client Jane Roe has case no. 2024-CV-1234 (made up) in "Your message", then click "Send".
   Expect: a pop-up that starts "This may include client details. Nobody has signed an agreement on this gig yet". Write down its words, then click "Cancel". Nothing is sent: the message does not appear in the conversation.

3. On the same page:
   Do: clear the box "Your message", type Her passport number is X12345678 (made up) and click "Send".
   Expect: a message saying it looks like "a government ID number", that sensitive data cannot go in DELA, and to share a link instead. There is no pop-up and no way to send it anyway. The message does not appear in the conversation. Clear the box afterwards.

4. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the row of small buttons near the top of the Profile page, under the page heading.
   Do: click "Your profile" in that row.
   Expect: the page moves down to the card titled "Your profile".
   Find: in that card, the folded line that starts "Biography: summary, experience and education". Click it to open it if it is closed. The box "Summary" is the first box under it.
   Do: add this sentence at the end of the Summary box: I helped my client Jane Roe with case no. 2024-CV-1234 (made up). Then scroll to the bottom of the "Your profile" card and click the dark red button whose name starts with "Save".
   Expect: a pop-up that starts "This may include client details. Other members read this". Write down its words, click "Cancel", then remove the sentence you added. Do not save.

5. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

ATTORNEY (log in once)

6. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

7. Go to: https://www.lawfecta.co/dela?tab=ask
   Find: the button "New chat" near the top of the page; click it. Then find the message box "Your message" near the bottom.
   Do: type My client John Smith has case no. 2024-CV-5678 (made up). Make an intake checklist. and click "Send".
   Expect: a box that says "This includes client details. They go to OpenAI to run DELA's AI, and OpenAI may keep them up to 30 days for abuse checks. Continue?" with the buttons "Edit my message" and "Continue". The words "[Client Name]" do not appear.
   Do: click "Continue". Wait up to 60 seconds.
   Expect: DELA answers with a checklist.

8. On the same page:
   Do: type Her driver's license number is D1234567 (made up) in "Your message" and click "Send".
   Expect: a box saying it looks like "a government ID number", that sensitive data cannot go in DELA, and to share a link instead, with only the button "Edit my message" (no "Continue" and no "Send anyway").
   Do: click "Edit my message" and clear the box.

9. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

OWNER (log in once)

10. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

11. Go to: https://www.lawfecta.co/dela-admin?tab=switches
    Find: in the table, the row whose bold name is "The client information check follows the sensitive data rule (client details allowed where the rule allows them)". The small grey code name under it is "client_details_allowed".
    Expect: the dropdown at the right end of that row, in the column "State", shows "Access list". Do not change it.

12. Sign out (the button with the owner's name at the top right, then "Sign out").
