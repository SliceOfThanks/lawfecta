# ChatGPT test: the other eight AI helpers (UX Phase 4 part B, second half)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested this with the real api and database: 9 api tests and 24 browser checks (with a stand-in AI that tries to break the rules), plus all 296 api tests and all 22 browser test files. This test checks the real screens on the test site, with the real AI.

The helpers are on for the test accounts only (switch ai_helpers, access list). Each run uses 1 DELA action from the test account's monthly allowance. This test uses about 9.

It is a look-only test: nothing is saved, sent, posted or published. Each account logs in once: freelancer, then attorney.

Nothing needed preparing. The test uses:
- the approved SOP "Build the document checklist from questionnaire answers" (INT-03); the test opens a new draft form but never saves it
- the conversation on "Send the Welcome Packet and Intake Follow-Up"
- "Test job: One-off finished (prepared)", which has no reviews yet

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.
4. Run it before the usage limits test.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
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

THIS TEST SAVES NOTHING
Do not click "Save", "Save the firm profile", "Send", "Publish my review", "Approve", "Send for review" or any "Upgrade" button. Click "Search" only where a step says so. The only ✦ buttons to click are the ones the steps name. DELA's AI writes its own words, so the exact text will differ: check the layout and the labels the steps name. Every suggestion should be finished wording you could use as it is, not an instruction about what to write; note any that is an instruction.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
   Find: the conversation about "Send the Welcome Packet and Intake Follow-Up" and the message box "Your message" at the bottom, with "Send" next to it.
   Find: under the message box, the light purple button "✦ Draft an agenda" with "Uses 1 DELA action on Lawfecta's AI (none on your own key)."
   Do: click "✦ Draft an agenda". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel with "Your message: A short agenda for your meeting.", a "Suggestion: Agenda for our meeting:" with at most three numbered points, the buttons "Use suggestion", "Edit" and "Dismiss", and the line "Nothing is sent until you click Send."
   Do: click "Use suggestion".
   Expect: the agenda is now in the "Your message" box, and the message "Added to your message. Nothing is sent until you click Send." Do not click "Send". Clear the box afterwards.

3. Go to: https://www.lawfecta.co/dela?tab=ask
   Find: the message box "Your message", and under it "✦ Improve my request".
   Do: type write a checklist for intake calls in the message box, then click "✦ Improve my request". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel with "Your request: A clearer version of your request." and a suggestion, possibly lines starting "In general: Missing: ...", and "Nothing is sent until you click Send."
   Do: click "Use suggestion".
   Expect: the clearer request replaces your text in the message box. Do not click "Send".

4. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

ATTORNEY (log in once)

5. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

6. Go to: https://www.lawfecta.co/dela?tab=library&pb=2c2d5604-caae-4a6f-b7e9-4cfe8e0541d0
   Find: the card "Approved version 2" near the top.
   Do: click "Edit a new draft".
   Expect: the draft form opens (the note "New draft. Your first save makes version 3 as a draft; ...").
   Find: in the form, the "Scope" box, and just below it "✦ Improve this section" (1 DELA action).
   Do: click "✦ Improve this section". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel with findings starting "Purpose:" or "Scope:", each with a finished suggestion and "Use suggestion", "Edit" and "Dismiss".
   Do: click "Use suggestion" on the first one.
   Expect: the "Purpose" or "Scope" box now holds the suggestion. Do not save.

7. On the same page:
   Find: the "Steps" section of the form, and just below the steps "✦ Check these steps".
   Do: click "✦ Check these steps". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel whose findings start "Step 1, Step:" (or another step number). A rewritten step with "Use suggestion" is finished wording with no blanks like [deadline]; where a fact is missing, the finding says so and has no "Use suggestion". DELA does not flag what the document already says under Trigger or Timing. No finding moves a step marked "Attorney decides" away from the attorney. Do not save.

8. On the same page:
   Find: the card "Quality check" on the right.
   Expect: if any item is not passed, the button "✦ Explain these findings" under the card's buttons. If every item passed, there is no such button: write PASS with "all passed".
   Do: if the button is there, click it. Wait up to 60 seconds.
   Expect: one plain explanation per item, each starting with the item's name. No sentence says the document is approved or legally correct.
   Then go to: https://www.lawfecta.co/dela?tab=library (leave the draft unsaved).

9. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the row of small buttons near the top of the Profile page, under the page heading.
   Do: click "Document preferences" in that row.
   Expect: the page moves down to the card "Your firm profile for documents".
   Find: in that card, near its top, the box "Describe your firm (optional)" and "✦ Help me describe my firm" under it.
   Do: type Two attorneys doing family law in Texas state courts; we use Clio and Microsoft 365 in the box, then click "✦ Help me describe my firm". Wait up to 60 seconds.
   Expect: an "AI suggestion" panel listing what it found ("Firm size", "Practice areas", "Jurisdictions", "Systems") with "Use suggestion", and the line "DELA only fills in what your description says. Check it, then save the firm profile." No system appears that the description did not name.
   Do: click "Use suggestion" on "Practice areas".
   Expect: the "Practice areas" box now holds it. Do not click "Save the firm profile".

10. Go to: https://www.lawfecta.co/dela?tab=talent
    Find: the card "Find a freelancer" at the top of the page, the box "Describe the task (for ✦ Help me find a fit)" and "✦ Help me find a fit" under it.
    Do: type E-filing family law motions in Texas using Clio, then click "✦ Help me find a fit". Wait up to 60 seconds.
    Expect: suggestions for "Practice area", "Skill", "Tech tool" and "State", and the line "These are search filters only. DELA does not pick a freelancer or promise who is available." No freelancer is named.
    Do: click "Use suggestion" on each, then click "Search".
    Expect: the search boxes hold the filters and the results update.

11. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e42a647d-3028-4c7d-86ba-443a1b96cbb8&view=agreement
    Find: the card "Reviews" lower on the page (its first line starts "How was working with the freelancer?"), the rating drop-downs, the box "Your review" and "✦ Help me write a review" under it.
    Do: choose 1 in every rating drop-down, leave "Your review" empty, and click "✦ Help me write a review".
    Expect: the message "For a low rating, write your own notes in Your review first. DELA only tidies what you wrote." DELA writes nothing.
    Do: choose 5 in every rating drop-down, type calls made on time, logged in clio, clear notes in "Your review", and click "✦ Help me write a review". Wait up to 60 seconds.
    Expect: a short draft that only says what your notes said (no new praise or facts), with "Use suggestion", and the line "DELA uses only your ratings and notes. Check every word: the review is yours, and nothing is posted until you click to post it."
    Do: click "Use suggestion".
    Expect: the draft is in "Your review". Do not click "Publish my review".

12. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").
