# ChatGPT test: the agency bench and the fee split (step 7d, part 2)

> Checked 2026-11-13 (new layout). Open point: the test freelancer and the owner each log in twice (groups 1 to 4), because the invitation, the counter-offer and the signature take turns. One login each needs Claude to prepare the invitation and the counter-offer on the test site first; the steps themselves match the screens.

Claude already tested this with the real api and database: 8 bench tests, 7 split payout tests and 30 browser checks. This test covers the real screens on the test site.

What it covers:
- The agency (the test freelancer, "Roe Test Agency LLC") invites your account to its bench with a split, with mistakes on purpose.
- Your account (its Freelancer Plus side) reads the bench agreement and proposes another split. The agency signs it.
- On the made-up job "Test job: Agency proposal", the agency assigns milestone 2 at the bench split and milestone 1 at a different split for that job. Your account accepts the job split, first without ticking the box on purpose.
- Your admin area shows every split and assignment.
- The test attorney sees your account as a subcontractor and never the split.

Not in this test (Claude's tests cover them): payouts, payout holds and chargebacks, which need real Stripe payout accounts, and a Free freelancer being told to upgrade (there is no Free test account).

Claude prepared the job on the test site: its agreement is marked signed and has two milestones of $300 each. Nothing is paid.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. The test logs in to some accounts twice, because the agency and the freelancer take turns.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- test freelancer (runs the agency "Roe Test Agency LLC"): stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- owner: stacey@lawfecta.com, password TEST_PASSWORD (in DELA this account works as a freelancer, "Stacey Lake")

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

The messages after a click show for only a few seconds. Read the small box at the bottom of the screen right after each click.

Group 1. The agency invites a bench member (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card titled "Bench", near the bottom of the page (below "The agency's jobs").
   Expect: the grey text starting "Outside freelancers you hire for your work. They never use a seat." and ending "The attorney never sees the split.", and "Nobody on your bench yet."
   Expect: at the bottom of the card, the heading "Invite to the bench" with a box "Their email on Lawfecta", a box "Agency share (%)" (empty, with "Allowed: 5% to 50%." under it), a box "Note to them (optional)", a line "Read the bench agreement", a box "Your full name", a checkbox "I have read the bench agreement and I sign it for the agency." and a dark red "Invite to the bench".
   Note: the card "Team" higher up also has a box "Their email on Lawfecta". Use the one in the card "Bench".

3. In the card "Bench", under "Invite to the bench":
   Do: type stacey@lawfecta.com in "Their email on Lawfecta". Type 60 in "Agency share (%)". Type Roe Owner in "Your full name". Tick "I have read the bench agreement and I sign it for the agency." Click "Invite to the bench".
   Expect: the message "The agency's share is outside the allowed range. Use a share inside the range shown with the box."

4. Still there:
   Do: change "Agency share (%)" to 30. Clear the box "Your full name" so it is empty. Click "Invite to the bench".
   Expect: the message "Type your full name and tick the box to sign."

5. Still there:
   Do: type Roe Owner in "Your full name" again. Make sure the checkbox is ticked. Type Intake work in "Note to them (optional)". Click "Invite to the bench".
   Expect: the message "Bench invitation sent", and in the card "Bench" the line "Stacey Lake | Invited | waiting for them to sign 30% to the agency / 70% to the freelancer | open until (a date about 30 days away)" with an outlined "Cancel invitation".

6. Sign out.

Group 2. The bench member proposes another split (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card titled "Bench invitation from Roe Test Agency LLC" (scroll down; it is below the card "Run your own agency").
   Expect: "Proposed split: 30% to the agency / 70% to you. The agency pays the platform fee from its share.", "Note from DELA Test Freelancer: Intake work" and "Open until (a date)."
   Do: click the line "Read the bench agreement" to open it.
   Expect: the agreement text, including "3. Confidentiality" and "4. No poaching".

3. Still in that card, near the bottom:
   Expect: a box "Your full name", a checkbox "I have read the bench agreement and I sign it electronically.", a dark red "Sign and join", the words "Or propose the agency's share (%):" with a small box, an outlined "Propose this split" and an outlined "Decline".
   Do: type 20 in the small box after "Or propose the agency's share (%):". Type Stacey Lake in "Your full name". Tick "I have read the bench agreement and I sign it electronically." Click "Propose this split".
   Expect: the message "Proposed and signed. Waiting for the agency." The card now says "You proposed: 20% to the agency / 80% to you. Waiting for the agency to sign." and the dark red "Sign and join" is gone.

4. Sign out.

Group 3. The agency signs and assigns milestones (log in as the test freelancer)

1. Ask me to log in as the test freelancer.
   Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card "Bench" (bottom of the page).
   Expect: the line "Stacey Lake | Invited | they proposed 20% to the agency / 80% to the freelancer | open until ..." with a dark red "Sign their split".

2. In the card "Bench":
   Do: at the bottom of the card, type Roe Owner in "Your full name" and tick "I have read the bench agreement and I sign it for the agency." Then click the dark red "Sign their split" on the line "Stacey Lake".
   Expect: the message "Signed. Stacey Lake joined your bench." and the line "Stacey Lake | On the bench | split 20% to the agency / 80% to the freelancer", with a small box, an outlined "Propose a new default split" and an outlined "Remove".

3. Go to: https://www.lawfecta.co/dela?tab=work&gig=f4546812-6749-44bd-bca0-66703c824045&view=agreement
   Find: the card "Bench assignments" (scroll down to the middle of the page; it is below "Who's working on this" and above "Confidential materials").
   Expect: the grey text starting "Give a milestone to someone on your bench." and two lines, "Milestone 1: Draft ($300)" and "Milestone 2: Final ($300)". Each line has a dropdown showing "Stacey Lake (bench split 20% to the agency / 80% to the freelancer)", the words "Agency share for this job (%):", a small box with the grey word "Bench split", and a dark red "Assign".

4. On the line "Milestone 2: Final ($300)":
   Do: leave the small box empty and click that line's dark red "Assign".
   Expect: the message "Assigned. The attorney was told who is working on it." The line now says "Assigned to Stacey Lake | split 20% to the agency / 80% to the freelancer" with an outlined "Take back".
   Expect: the card "Who's working on this" (just above) now lists "Stacey Lake | Subcontractor, Milestone 2".

5. On the line "Milestone 1: Draft ($300)":
   Do: type 3 in the small box and click that line's dark red "Assign".
   Expect: the message "The agency's share is outside the allowed range. Use a share inside the range shown with the box."
   Do: change the box to 25 and click "Assign" again.
   Expect: the message "Assigned. Waiting for them to accept the split for this job." The line now says "Assigned to Stacey Lake | split 25% to the agency / 75% to the freelancer | waiting for Stacey Lake to accept".

6. Sign out.

Group 4. Check the results (the owner, then the test attorney)

1. Ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela?tab=agency
   Find: the card "Your agency assignments" (scroll down).
   Expect: a line "Test job: Agency proposal, milestone 1: Draft" with "For Roe Test Agency LLC | $300 | your share $225 | due Nov 20, 2026" and the notice "Split for this job: 25% agency / 75% you. Work cannot start until you accept.", a checkbox "I accept this split for this job.", a dark red "Accept" and an outlined "Decline".
   Expect: a line "Test job: Agency proposal, milestone 2: Final" with "your share $240" and "Split 20% agency / 80% you | in progress".
   Expect: the card "On Roe Test Agency LLC's bench" with "Your split: 20% to the agency / 80% to you." and the words "you receive your full share and pay no fee".

2. In the card "Your agency assignments", on the line for milestone 1:
   Do: leave the checkbox unticked and click "Accept".
   Expect: the message "Tick the box to accept the split for this job."
   Do: tick "I accept this split for this job." and click "Accept".
   Expect: the message "Accepted. You can start once the milestone is funded." The line now says "Split 25% agency / 75% you | in progress".

3. Go to: https://www.lawfecta.co/dela-admin?tab=agencies
   Expect: the admin area opens on the page "Agencies" (in the left menu, "Agencies" is the last line under the heading "MEMBERS").
   Find: the card "Agency benches and splits" (the second card, below the card "Agencies").
   Expect: the line "Roe Test Agency LLC | Stacey Lake (stacey@lawfecta.com) | active | split 20% agency / 80% freelancer (version 2)".
   Find: the card "Bench assignments" (the third card, below it).
   Expect: two lines for "Roe Test Agency LLC | Test job: Agency proposal": milestone 1 with "split 25% agency / 75% | accepted" and milestone 2 with "split 20% agency / 80% | accepted".

4. Sign out of the admin area: click the button with the owner's name and "(owner)" at the top right, then "Sign out", the last line. Ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects&gig=f4546812-6749-44bd-bca0-66703c824045&view=agreement
   Find: the card "Who's working on this" (middle of the page).
   Expect: "DELA Test Freelancer | Lead paralegal" or "DELA Test Freelancer" and a line "Stacey Lake | Subcontractor, Milestone 2, 1".
   Expect: there is no card "Bench assignments" on this page, and no percentages such as 20%, 25%, 75% or 80% anywhere in the card "Who's working on this".

5. Do: click the bell (Notices) at the right of the top bar.
   Expect: a notice "A change in who is working on this job: Test job: Agency proposal" saying Stacey Lake "now works on milestone 2 as the agency's subcontractor" and "Nothing is needed from you."

6. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
