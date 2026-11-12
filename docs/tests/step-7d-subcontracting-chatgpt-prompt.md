# ChatGPT test: agency subcontracting (step 7d, part 3)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested this with the real api and database: 7 subcontracting tests and 47 agency browser checks. This test covers the real screens on the test site.

Each account logs in once. Claude prepared these on the test site before the test:
- "Test job: Subcontracting choice (prepared)": the test attorney chose Roe Test Agency LLC's proposal. Nobody has signed.
- "Test job: Subcontracting active (prepared)": the same agency is hired and the agreement is signed.
- "Test gig: Linked part (prepared)": the agency posted it for part of the active job and chose your proposal (stacey@lawfecta.com, "Stacey Lake"). So you are its subcontractor. Nothing is signed or paid.

What it covers:
- The attorney reads the disclosure on the agency's proposal and agreement, and chooses "No subcontractors on this engagement".
- The attorney sees the subcontractor on "Who's working on this", with a notice.
- The agency cannot post a gig for part of a job that says no subcontractors. It can on the other job, and the gig shows what it is linked to.
- An agency gig that copies a job's words without being linked is flagged for the Lawfecta Team.
- The subcontractor's agreement has the confidentiality and no-poaching terms. The subcontractor never sees which attorney job it is linked to.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer (runs the agency "Roe Test Agency LLC"): stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- owner (in DELA this account works as a freelancer, "Stacey Lake", and also opens the admin area): stacey@lawfecta.com, password TEST_PASSWORD

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

Each account below logs in once. Do every step of a group before signing out.

Group 1. The attorney (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=proposals
   Expect: the title "Test job: Subcontracting choice (prepared)".
   Find: the agency's proposal, in the box with the "Agency" label and "Roe Test Agency LLC", near the top.
   Expect: under "Who will do this work:", the grey line "This agency may use vetted subcontractors from Lawfecta to complete this work."

3. Go to: https://www.lawfecta.co/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the card "Subcontractors", just below the card "The agreement" (middle of the page).
   Expect: the line "This agency may use vetted subcontractors from Lawfecta to complete this work.", a tick box "No subcontractors on this engagement" and an outlined "Save" button.
   Do: tick "No subcontractors on this engagement" and click "Save".
   Expect: a line at the top of the card, "Saved as version 2. Both of you sign the new version.", that stays there. The card's first line now reads "No subcontractors on this engagement: only the agency's own team works on it."
   Do: scroll up to the card "The agreement", click "The terms" to open it, and scroll to its end.
   Expect: the last clause starts "10. No subcontractors on this engagement."

4. Go to: https://www.lawfecta.co/dela?tab=projects&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
   Expect: the title "Test job: Subcontracting active (prepared)".
   Find: the card "Subcontractors" (middle of the page).
   Expect: "This agency may use vetted subcontractors from Lawfecta to complete this work." and no tick box (both of you signed, so it cannot change).
   Find: the card "Who's working on this" (scroll down).
   Expect: "You hired Roe Test Agency LLC.", and the line "Stacey Lake" with "Subcontractor, Test gig: Linked part (prepared)".

5. Find: the bell at the right end of the top bar, between the "Inbox" button and the round button with your initials.
   Do: click the bell.
   Expect: a panel titled "Notices" with a notice "A change in who is working on this job: Test job: Subcontracting active (prepared)". Opening it says Stacey Lake works on part of this job as the agency's subcontractor and "Nothing is needed from you."

6. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

Group 2. The agency (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=agreement
   Find: the card "Subcontractors" (middle of the page).
   Expect: "No subcontractors on this engagement: only the agency's own team works on it." and the grey line "The attorney chose this. Bench assignments and gigs for part of this job are off."
   Find: the card "Bench assignments" (scroll down).
   Expect: the line "This engagement says no subcontractors, so its milestones cannot be assigned to bench members and no gig can be posted for part of it." and no button "Post a gig for part of this job".

3. Go to: https://www.lawfecta.co/dela?tab=work&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
   Find: the card "Bench assignments" (scroll down, below "Who's working on this").
   Do: click the outlined "Post a gig for part of this job".
   Expect: the Projects page opens. In the card "Post a new gig" (top), a line "Linked to: Test job: Subcontracting active (prepared). Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor. Share with them only what their part needs." and a button "Do not link".

4. In the card "Post a new gig":
   Do:
   - In the dropdown under "Document", choose "Test SOP: Agency intake".
   - Type 300 in "Budget from ($)" and 600 in "Budget to ($)".
   - Click the dark red "Draft the gig with DELA" at the bottom of the card.
   Expect: DELA writes for up to 60 seconds, then the gig page opens. Near the top: "Linked to Test job: Subcontracting active (prepared). Whoever you hire is listed on the attorney's "Who's working on this", as your subcontractor."
   Do: in the card "Budget, deadline and milestones", type 12/31/2026 in "Deadline" (or choose that date), and type Draft on the first line and Final on the second line of "Milestones (private)". Click the dark red "Post the gig" at the bottom.
   Expect: the matches view opens with the card "Your bench".

5. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Your gigs" (below "Post a new gig").
   Expect: the new gig's grey line starts "Linked to Test job: Subcontracting active (prepared)".

6. Still on https://www.lawfecta.co/dela?tab=projects, in the card "Post a new gig" (top):
   Do: if the card shows only its heading and a dark red button "Start a new gig" at the right, click "Start a new gig".
   Expect: the card opens with the dropdown "Document" and the budget boxes, and no "Linked to" line this time.
   Do: choose "Test SOP: Agency intake" under "Document", type 300 in "Budget from ($)" and 600 in "Budget to ($)", and click the dark red "Draft the gig with DELA".
   Expect: after up to 60 seconds, the gig page opens with the card "Public version" and no "Linked to" line.
   Do: in the card "Public version", replace what is in each box with exactly this:
   - "Title": Family intake packet
   - "The task": Prepare the family intake packet: conflict screening questionnaire, retainer letter draft, document checklist, welcome email and calendar reminders for new divorce clients.
   - "What done looks like": A ready family intake packet.
   - "Steps, one per line": Prepare the family intake packet
   Then in the card "Budget, deadline and milestones", type 12/31/2026 in "Deadline" and Draft and Final on two lines of "Milestones (private)". Click the dark red "Post the gig" at the bottom.
   Expect: the gig posts as usual and the matches view opens. (This gig copies the active job's words without being linked, so the Lawfecta Team gets a flag. The agency is not told.)

7. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

Group 3. The subcontractor and the Lawfecta Team (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=3f3c6b67-df75-4681-8029-3e5bbe00d83b&view=agreement
   Expect: the title "Test gig: Linked part (prepared)", the line "Posted by Roe Test Agency LLC (agency).", and no "Linked to" line and no "Test job: Subcontracting active (prepared)" anywhere on the page.
   Find: the card "The agreement" (middle of the page). Click "The terms" to open it and scroll to its end.
   Expect: the last clause starts "11. Confidentiality and no poaching." and says the freelancer keeps everything the agency shares confidential and, for 12 months, does not take work directly from the agency's clients.

3. Go to: https://www.lawfecta.co/dela-admin?tab=gigs
   Find: the first card, whose heading starts "Held for a check (" (top of the page).
   Expect: an item for a gig on "Family intake packet", with the label "copies an engagement's text but is not linked to it", and the line "Gig "Family intake packet" shares ...% of its words with the engagement "Test job: Subcontracting active (prepared)" but is not linked to it." The buttons say "It is fine" and "Pause the gig".
   Do: click the red "Pause the gig" on that item.
   Expect: the message "Gig paused; the agency was told", and the item leaves the list.

4. Sign out (the button with the owner's name at the top right of the admin area, then "Sign out").

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
