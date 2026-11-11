# ChatGPT test: agencies, part 1 (step 7d)

Claude already tested this with the real api and database: 8 agency api tests and 14 browser checks. This test covers the real screens on the test site.

What it covers:
- The Lawfecta Team gives the test freelancer the Freelancer Business (agency) plan.
- The test freelancer's account becomes an agency. In the Agency tab it gets business details, a team and invitations, with mistakes on purpose.
- The agency sends a proposal and names who will do the work.
- The attorney sees the agency and the person on the proposal, chooses it, and sees "Who's working on this".
- The owner joins the agency as a member. In the admin area, the owner checks the business details and raises the seat limit.
- The agency owner changes the member's role and removes them.

The job used here, "Test job: Agency proposal", is a made-up open job that Claude made for this test, matched to the test freelancer. Choosing the proposal starts a draft agreement only. Nothing is paid.

Before you paste this:
1. The owner account (stacey@lawfecta.com) gets a freelancer side on the test site in Group 1, so it can be invited to the agency. Your admin area does not change. Afterwards, the owner's DELA page shows the freelancer tabs.
2. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
3. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

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

The messages after a click show for only a few seconds. Read the small box at the bottom of the screen right after each click.

Group 1. Owner: give the plans (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela-admin
   Do: click the tab "People" in the row of tabs near the top.
   Find: the search box "Search name, email or BD member ID" at the top of the page.
   Do: type stacey+dela-freelancer@lawfecta.com and click "Search" next to it.
   Expect: one row, "DELA Test Freelancer", with "Freelancer: fl_free" in the column "Sides and plans".

3. On that row, in the column "Actions":
   Do: in the dropdown "Give a side and plan...", choose "Freelancer Business (agency)". Click "Give" next to it.
   Expect: the message "Done. It applies on their next page load." and the row now says "Freelancer: fl_business (set by team)".

4. Find: the same search box at the top.
   Do: type stacey@lawfecta.com and click "Search".
   Do: on the row "Stacey Lake", in the dropdown "Give a side and plan...", choose "Freelancer Plus". Click "Give".
   Expect: "Done. It applies on their next page load." and the row says "Freelancer: fl_plus (set by team)".

5. Sign out.

Group 2. The agency owner (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=agency
   Expect: a new tab "◆ Agency" at the right end of the tab row, selected, with the heading "Agency" and the line "... | you are the owner".
   Expect: the cards "Business details", "Team", "Proposals" and "The agency's jobs" ("No jobs yet.").
   Expect: in the card "Team", the grey line starting "1 of 3 seats used, the owner included."

3. In the card "Business details" (top of the page):
   Do: type Roe Test Agency LLC in the box "Business name". Leave "State of registration" empty. Click the blue "Save business details".
   Expect: the message "Enter the business name and the two-letter state where it is registered (for example TX)."
   Do: type TX in "State of registration" and click "Save business details" again.
   Expect: "Saved. The Lawfecta Team will check it." The page now shows "Roe Test Agency LLC | you are the owner" under the heading, and the card says "Waiting for the Lawfecta Team's check."

4. In the card "Team" (below "Business details"), at the bottom of the card there is a box "Their email on Lawfecta", a dropdown "Role" and a blue button "Invite to the team".
   Do: type stacey+dela-attorney@lawfecta.com in "Their email on Lawfecta" and click "Invite to the team".
   Expect: the message "There is no Lawfecta freelancer with that email. Ask them to join Lawfecta as a freelancer first, then invite them again."
   Do: change the email to stacey+dela-freelancer@lawfecta.com and click "Invite to the team".
   Expect: the message "That person is already on your team."

5. Still in the card "Team":
   Do: change the email to stacey@lawfecta.com. Leave the dropdown "Role" on "Member". Click "Invite to the team".
   Expect: the message "Invitation sent". The card lists "Stacey Lake | invited as member | open until (a date)" with an outlined "Cancel invitation".
   Expect: the grey line now says "1 of 3 seats used, the owner included, plus 1 invitation waiting."

6. Go to: https://www.lawfecta.co/dela?tab=work&gig=f4546812-6749-44bd-bca0-66703c824045
   Find: the title "Test job: Agency proposal" at the top, then scroll down to the card "Your proposal" at the bottom of the page.
   Expect: at the top of that card, a dropdown "Send as" showing "Roe Test Agency LLC (agency)".
   Expect: under it, "Who will do this work (required). ..." and one checkbox "DELA Test Freelancer (owner)" with a greyed-out box "Role on this job, for example Lead paralegal". Stacey Lake is not listed (she has not joined yet).

7. Still in the card "Your proposal":
   Do: fill in the boxes:
   - "Total price ($)": 600
   - "Days to deliver": 5
   - "What your price includes": A made-up intake packet with a checklist.
   - "What it leaves out": Court filing.
   - "Schedule": Draft in 3 days, final 2 days after comments.
   - "Your relevant qualifications": Five years of intake work for family law firms.
   Leave the checkbox "DELA Test Freelancer (owner)" unticked. Click the blue "Send proposal (uses 1)" at the bottom of the card.
   Expect: the message "Choose at least one person in "Who will do this work"." Nothing is sent.

8. Still in the card "Your proposal":
   Do: tick "DELA Test Freelancer (owner)". Type Lead paralegal in the box next to it. Click "Send proposal (uses 1)".
   Expect: within 20 seconds, the card shows "Sent" and "$600 | sent for your agency | used one of the agency's proposals".

9. Sign out.

Group 3. The attorney (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects&gig=f4546812-6749-44bd-bca0-66703c824045
   Find: the title "Test job: Agency proposal" and the row of round buttons under it.
   Do: click "Proposals (1)".
   Expect: the card "Compare proposals" with one row. In the column "Freelancer": a small "Agency" label, "Roe Test Agency LLC", "Who will do this work:", then "DELA Test Freelancer | Lead paralegal" with an outlined "View profile", and "Sent by DELA Test Freelancer" under it.

3. Do: click "View profile" on that row.
   Expect: a window titled "Profile" with "DELA Test Freelancer" and the line "Works with: Roe Test Agency LLC".
   Do: click "Close" at the bottom of the window.

4. (POP-UP) Do: click the blue "Choose" at the right end of that row, and answer OK in the browser pop-up.
   Expect: the message starting "Chosen. The draft agreement is waiting for signing and funding." The row shows "Chosen".

5. Do: click "Agreement and work" in the row of round buttons.
   Find: the card "Who's working on this" (scroll down to the middle of the page: it is below the cards "The agreement" and "Propose changes", and above "Confidential materials").
   Expect: "You hired Roe Test Agency LLC. These are the people working on it. If the agency changes them, you get a notice; nothing is needed from you." and the line "DELA Test Freelancer | Lead paralegal".
   Expect: there is no "Add to this job" or "Take off this job" button in this card.

6. Sign out.

Group 4. Check the results (the owner, then the test freelancer)

1. Ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela?tab=agency
   Expect: the card "Invitation from Roe Test Agency LLC" saying "DELA Test Freelancer invited you to join Roe Test Agency LLC as a member. You keep your own account and your own plan. ..." with a blue "Accept" and an outlined "Decline".
   Do: click "Accept".
   Expect: the message "You joined Roe Test Agency LLC", and a card "Agencies you work with" with "Roe Test Agency LLC | Member" and an outlined "Leave".

2. Go to: https://www.lawfecta.co/dela-admin
   Do: click the tab "Agencies" in the row of tabs near the top (between "Reviews and bench" and "Lawfecta Team").
   Expect: the card "Agencies" with the line "Roe Test Agency LLC" and a badge "Not checked yet", and the line "Business name: Roe Test Agency LLC | State: TX | Owner: DELA Test Freelancer (...) | Active | Seats: 2 of 3 | Engagements: 1".

3. Still on that agency:
   Do: leave the box "Note (shown to the owner if the details need a change)" empty and click the outlined "Ask for a change".
   Expect: the message "Write a note saying what to change."
   Do: click the blue "Business details are right".
   Expect: the message "Checked. The owner was told." and the badge now says "Checked (today's date)".

4. Still on that agency, the line "Seat limit for this agency (empty for the plan's limit):":
   Do: type 5 in the small box after it and click the outlined "Save seat limit".
   Expect: the message "Seat limit set to 5" and "Seats: 2 of 5".

5. Sign out. Ask me to log in as the test freelancer.
   Go to: https://www.lawfecta.co/dela?tab=agency
   Expect: in the card "Business details", "Checked by the Lawfecta Team."
   Expect: in the card "Team", the grey line starting "2 of 5 seats used, the owner included." and the line "Stacey Lake | Member | stacey@lawfecta.com | verification not finished" with a dropdown "Member" and an outlined "Remove".

6. Still in the card "Team", on the line "Stacey Lake":
   Do: in the dropdown, choose "Manager".
   Expect: the message "Role changed" and the line now says "Manager".
   Do: click "Remove", then "Yes, remove".
   Expect: the message "Stacey Lake removed", and the line "Stacey Lake" is gone. The grey line says "1 of 5 seats used, the owner included."

7. Find: the card "The agency's jobs" (bottom of the page).
   Expect: the line "Test job: Agency proposal" with "DELA Test Freelancer" and an outlined "Open".
   Do: click "Open".
   Expect: the job page with the card "Who's working on this" saying "This engagement is with Roe Test Agency LLC. The attorney sees this list and gets a notice when it changes." and "DELA Test Freelancer | Lead paralegal".

8. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
