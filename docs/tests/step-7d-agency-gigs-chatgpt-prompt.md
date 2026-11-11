# ChatGPT test: the agency's own gigs (step 7d, part 2c)

Claude already tested this with the real api and database: 9 agency gig tests and 39 agency browser checks. This test covers the real screens on the test site.

Each account logs in once. Claude prepared these on the test site before the test:
- An approved document, "Test SOP: Agency intake", in Roe Test Agency LLC's Library (the test freelancer's agency).
- A prepared job, "Test job: Agency own gig (prepared)", where the agency has already chosen your proposal (stacey@lawfecta.com, "Stacey Lake", who is on its bench). Nothing is paid; signing is the last step.

What it covers:
- The agency's new Library, Projects and Talent tabs.
- Its client details, with a mistake on purpose.
- Posting a gig from its SOP, and its bench shown first.
- The fees on a bench hire: the agency pays both, and the bench member gets the full price.
- Both of you signing.
- An attorney not seeing any of it.

Your account's freelancer profile is not finished, so the agency cannot invite you to the new gig. The test checks that DELA says so. Claude's tests cover a real invitation.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co.

Logins:
- test freelancer (runs the agency "Roe Test Agency LLC"): stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- owner (in DELA this account works as a freelancer, "Stacey Lake"): stacey@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD

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

Each account below logs in once. Do every step of a group before signing out.

Group 1. The agency (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=agency
   Expect: the tab row now also has "▥ Library", "▣ Projects" and "◌ Talent" after "◆ Agency".
   Find: the card titled "Posting gigs", near the top, just below the card "Business details".
   Expect: the line "Ready to post gigs from your Library (Projects tab).", three boxes "Who signs for the agency", "Billing address" and "Email for notices", and a blue "Save client details".

3. In the card "Posting gigs":
   Do: leave all three boxes empty and click "Save client details".
   Expect: a red line at the top of the card, "Add who signs for the agency and the billing address.", that stays there.
   Do: type Roe Owner in "Who signs for the agency", 1 Test Street, Austin TX 78701 in "Billing address", and stacey+dela-freelancer@lawfecta.com in "Email for notices". Click "Save client details".
   Expect: the line at the top of the card changes to "Client details saved".

4. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: the agency's Library lists "Test SOP: Agency intake".

5. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Post a new gig" (top of the page).
   Expect: no message about a "verified license".
   Do:
   - In the dropdown under "Document", choose "Test SOP: Agency intake".
   - Type 300 in "Budget from ($)" and 900 in "Budget to ($)".
   - Click the blue "Draft the gig with DELA".
   Expect: DELA writes for up to 60 seconds, then the gig page opens with a "Public version" section and a box "Gig title".

6. On that gig page:
   Do: type 12/31/2026 in "Deadline" (or choose that date). Type Draft on the first line and Final on the second line of "Milestones, one per line". Click the blue "Post the gig".
   Expect:
   - the matches view opens
   - a card "Your bench" with the grey line "Invite your bench first. A bench member you hire pays no platform fee; the agency pays it with its own."
   - the line "Stacey Lake" with "Not available right now", because her freelancer profile is not finished, and no "Invite to this gig" button for her
   - below it, the card "Freelancers who fit"

7. Go to: https://www.lawfecta.co/dela?tab=talent
   Expect: the "Talent" page with search boxes for "Practice area", "Skill", "Tech tool" and "State you need (two letters)".

8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=7976f867-1cff-470c-b483-b6a6b6ea38d9&view=agreement
   Find: the title "Test job: Agency own gig (prepared)", then the card "The agreement" (middle of the page) and its "Fees" list.
   Expect these four lines:
   - "Price for the work: $600"
   - "The agency also pays the platform fee: $60 (charged once, with the first milestone)"
   - "The agency also pays the freelancer's platform fee, because they are on its bench. The freelancer pays no platform fee."
   - "The freelancer receives: $600 (the full price)"
   Expect: in the same card, "Client (firm)" shows "Roe Test Agency LLC" and "Signs for the firm" shows "Roe Owner".

9. Scroll up to the card "What happens next" (top of the page):
   Do: type Roe Owner in the box under "Your full name". Tick "I have read version 1 of this agreement and I sign it electronically." Click the blue "Sign version 1".
   Expect: the card says "You signed version 1. Waiting for the freelancer to sign."

10. Sign out.

Group 2. The bench member (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela?tab=work&gig=7976f867-1cff-470c-b483-b6a6b6ea38d9
   Expect: the title "Test job: Agency own gig (prepared)" and the line "Posted by Roe Test Agency LLC (agency)."
   Find: the card "The agreement" (scroll down).
   Expect: the same four fee lines as in Group 1 step 8, including "The freelancer receives: $600 (the full price)".

3. Scroll up to the card "What happens next":
   Do: type Stacey Lake in the box under "Your full name", tick "I have read version 1 of this agreement and I sign it electronically." and click the blue "Sign version 1".
   Expect: the message "Signed by both of you. The agency pays the first milestone next." The badge at the top right changes from "Waiting for signatures" to "Signed: waiting for the first payment".

4. Sign out.

Group 3. Check the results (log in as the test attorney; only look)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: the attorney's Library does not list "Test SOP: Agency intake".

3. Go to: https://www.lawfecta.co/dela?tab=projects&gig=7976f867-1cff-470c-b483-b6a6b6ea38d9
   Expect: no gig details for "Test job: Agency own gig (prepared)", only a short message that it is not available.

4. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
