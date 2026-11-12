# ChatGPT test: UX retest, Part C (step 8b): layout and wording

> Checked 2026-11-13 (new layout). Open point: steps 8 and 15 need the open change on "Test job: Monthly running (prepared)". The monthly test (step-7c-monthly-chatgpt-prompt.md, step 4) approves that change, so run this test first or have Claude prepare the change again.

Claude already tested these with the real api and database: all api tests and all browser test files, including new checks for each item below. This check looks at the real screens on the test site.

What it covers (all look only; nothing is booked, saved, sent, signed or paid):
- Booking: a date first, then that date's times (8 at first, then "Show more times"), with your time zone named.
- The notice beside AI boxes: keep sensitive data in your own storage (Ask DELA, Talent's task box), and the page notice agrees with it.
- Standing arrangements: what is left this month, the cap rule, and "Past arrangements".
- Profile: the firm essentials first, with the biography and practice areas folded.
- Settings: "DELA actions" as the one word for the allowance, where each learned fact came from, webhooks under "Advanced"; Connect says what leaves DELA.
- The agreement names the contracting agency and its lead.
- A change note that disagrees with the change is flagged, and DELA does not decide which one is meant.
- The milestone tip in plain words.

Not in this check (Claude's browser tests cover them): the meeting answer "Choose what happened", because it needs a meeting that has already taken place.

Each account logs in once: attorney, then freelancer.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD

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

THIS TEST CHANGES NOTHING
Do not click "Review booking", "Hire again from my standing arrangement", "Review limits", "Approve the change", "Decline", "Send", "Save", "Sign" or "Pay". Only click what a step names.

Steps

ATTORNEY (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
   Find: the conversation page, with a grey line under the name that starts "About the gig" and names "Send the Welcome Packet and Intake Follow-Up". Under that line is a row of buttons: the outlined "Open the gig", then the dark red "Book a meeting".
   Do: click "Book a meeting".
   Expect: a card titled "Book a meeting" with the grey line "Times are shown in your time zone (...)", naming a time zone in words (for example "Pacific Time"); a "Length" box; and a "Date" box with one date chosen, written like "Mon, Nov 10 (12 open times)".
   Expect: under the "Date" box, the full date in bold with the year (for example "Monday, November 10, 2026"), then "| 30 minutes | times in" and the time zone, then no more than 8 time buttons. If that date has more than 8 times, a button "Show more times (N)" follows them.
   If the card instead says the freelancer has not set their availability, write that down as a note and go on to step 3.

3. In the same "Book a meeting" card:
   Do: in the "Date" box, choose the second date in the list.
   Expect: the bold date and the time buttons change to that date.
   Do: click any one time button.
   Expect: a line "Selected:" with the date, the time and the time zone, and a dark red "Review booking" button under it. Do not click "Review booking".

4. Go to: https://www.lawfecta.co/dela?tab=delegate
   Find: the page "Ask DELA", the white message box whose grey hint says "Type here, or press Talk and say it", and the grey line just above that box.
   Expect: the grey line says "Never enter sensitive data: SSNs or ITINs, government ID numbers, financial account numbers, health information, biometric data, or logins and passwords. Keep it in your own storage. You are responsible for what you enter." It does not say "Share a link".
   Find: the pink notice at the very top of the page, above the "Ask DELA" heading.
   Expect: it names the same kinds of sensitive data, says "Keep it in your own storage", and says sharing with someone on a job is by a secure link on the job, never to DELA's AI. It does not say "client names" or "case numbers". Do not type anything.

5. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the card "Find a freelancer" at the top of the page, and in it the box "Describe the task (for ✦ Help me find a fit)", below the row with "Search".
   Expect: the same grey "Never enter sensitive data ... Keep it in your own storage." line right above the box. Do not type anything.

6. Go to: https://www.lawfecta.co/dela?tab=profile
   Expect, from the top down: the heading "Profile and verification", a row of small buttons ("Firm details", "License verification", "Your profile" and others), the card "Where your profile stands", then the card "Firm details" (billing address, who may sign, email for formal notices), then the card "License verification", then the card "Your profile".
   Expect: if any firm detail is missing, a pink line in "Where your profile stands" that starts "Still needed before paid work:" with a "Go to Firm details" link. If none is missing, there is no such line; write which you saw.
   Find: in the card "Your profile", the folded lines "Practice areas (N selected)" and "Biography: summary, experience and education".
   Do: click "Practice areas (N selected)".
   Expect: it opens with a "Find a practice area" box, and the selected areas come first in the list (filled dark red; the others are outlined). Do not click any area and do not click "Save".

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Standing arrangements (1)", the last card, at the bottom of the page.
   Expect: the active arrangement shows a line like "$X left this month | N open-job places left", and the grey line "The cap counts the job price. Lawfecta's platform fee is added to each charge."
   Expect: either the dark red "Hire again from my standing arrangement" button, or a red reason (for example the cap or the open jobs) with a "Review limits" button. Do not click either.
   Expect: at the bottom of the card, a folded line "Past arrangements (1)". Click it once to see the ended arrangement, then leave it.

8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
   Find: the card "Monthly engagement" (the second card, below "What happens next") and, at the bottom of it, the box "A change to approve" or "Your change, waiting for the other person".
   Expect: the "Now" and "Proposed" table, the line "Note: Two more welcome packets a week", and right under it a red message that starts "Check this before approving: the note says" and ends "approve only if the table is what you both mean." Do not click "Approve the change" or "Decline".

9. Go to: https://www.lawfecta.co/dela?tab=projects&gig=f4546812-6749-44bd-bca0-66703c824045&view=agreement
   Find: the card "The agreement" (below the card "What happens next"), and the list of parties at its top.
   Expect: "Agency (the contracting party)" with "Roe Test Agency LLC", and below it "Agency lead" with a person's name.

10. Go to: https://www.lawfecta.co/dela?tab=ai
    Expect: the page heading "Settings".
    Find: the card "Which AI DELA uses", the first card under the heading "AI and messages" (below the cards "Account and security", "Appearance", "Suggestions and alerts" and "Emails").
    Expect: the line under "Use Lawfecta's AI" says "DELA actions left this month" and "DELA actions reset on the 1st of each month" (or "Included with your plan." for an unlimited plan). Nowhere on this page says "credits".
    Find: the card "What DELA has learned about you", further down the same page, if it is there.
    Expect: each fact has a grey line under it like "Learned from a proposal you sent, Nov 5, 2026." and the hint says what removing a fact does. Do not click "Remove".
    Find: near the bottom of the page, the folded line "Advanced: webhooks".
    Expect: the webhook boxes are hidden until you click it. Click it once: the card "Webhooks" opens. Do not add anything.

11. Go to: https://www.lawfecta.co/dela?tab=connect
    Expect: the headings "What ChatGPT or Claude can access", "What it can change", "What stays private", "What leaves DELA" and "How to disconnect". Under "What leaves DELA": what ChatGPT or Claude reads is processed by OpenAI or Anthropic, and disconnecting cannot recall what was already read.

12. Sign out (the round button with the initials at the far right of the top bar, then "Sign out").

FREELANCER (log in once)

13. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

14. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
    Do: click the dark red "Book a meeting" button near the top of the conversation, to the right of the outlined "Open the gig".
    Expect: the same layout as step 2: "Times are shown in your time zone (...)", a "Date" box, the full date in bold, and no more than 8 time buttons before "Show more times". Do not click any time and do not click "Review booking".

15. Go to: https://www.lawfecta.co/dela?tab=work&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the heading "Milestones" inside the card "The agreement", and the small "?" button next to it.
    Do: click the "?".
    Expect: "A portion of work with its own price, due date and review. Funds are released after acceptance."
    Find: the card "Monthly engagement" higher on the page (the second card, below "What happens next").
    Expect: the same red "Check this before approving: the note says ..." message as in step 8. Do not click "Approve the change".

16. Sign out (the round button with the initials, then "Sign out").
