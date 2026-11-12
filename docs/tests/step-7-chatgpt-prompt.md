# ChatGPT test: Step 7, reviews, the bench and webhooks

> Checked 2026-11-13 (new layout). Open point: the test freelancer logs in three times (group 1, group 3 and group 5, step 3) and the attorney's bench invitation is answered in group 3. One login per account needs Claude to prepare the attorney's review and bench invitation on the test site first. Also, groups 1 and 2 need the completed engagement from "Before you paste this", point 1; with a link to it from Claude the steps can say "Go to" instead of "click the row".

Claude already tested all of this with the real api and database: 9 api tests and 21 browser checks. They cover both sides, mistakes and misuse:
- a review before completion
- client information in a review
- a threat
- a negative review (it publishes)
- edits after 14 days
- reports and appeals
- past-client links, limits and opting out
- the bench conversation without files
- leaving a bench
- webhooks to internal addresses, redirects, retries, pausing and plan limits

This test covers the real screens.

Before you paste this:
1. You need a completed engagement between the test attorney and the test freelancer (from the Step 6 test, with every milestone accepted). If you do not have one yet, ask Claude to make one on the test site.
2. The logins are filled in. Passwords are not kept on GitHub. Use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
3. For the webhook part, open https://webhook.site in a new tab first. It gives you a free test address (it starts with https://webhook.site/). Paste that address when the test asks for it.
4. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Everything here is made up.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

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

GROUP 1. FREELANCER (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the card whose heading starts "Your engagements (", near the bottom of the page.
   Do: click the row of the completed engagement (its label says "Complete"). If you do not see it, first click the folded line that starts "Finished and canceled (" at the bottom of that card.
   Expect: the engagement page. Scroll down: a card titled "Closeout" with "Milestones accepted", "Paid for the work", "Paid out to the freelancer" and "Still open", and a card titled "Reviews" below it.

3. Find: the card "Reviews". Its first line starts "How was working with the attorney?".
   Do: choose a rating in every rating dropdown, choose "Yes" in the dropdown next to "Would you work with them again?", type Client John Smith, SSN 123-45-6789, was happy in the box "Your review", and click the dark red "Publish my review".
   Expect: a message asking you to remove client information. Nothing is published.
   Do: replace the text in "Your review" with Clear instructions and quick feedback on every draft. and click "Publish my review".
   Expect: the message "Review published. Thank you." and your review under the heading "Your review of the attorney".

4. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card titled "Your reviews", the last card at the bottom of the page. In it, the heading "Ask a past client for a review".
   Do: type a made-up name in the box "Their name" and stacey+pastclient@lawfecta.com in the box "Their work email", then click the dark red "Send the request".
   Expect: a message that starts "Request sent to", and the request listed under the boxes, ending ": Sent".

5. Go to: https://www.lawfecta.co/dela?tab=ai
   Expect: the page heading "Settings".
   Find: the folded line "Advanced: webhooks", the last thing at the bottom of the page.
   Do: click "Advanced: webhooks" to open it.
   Expect: a card titled "Webhooks" with the part "Add an endpoint" (click "Add an endpoint" if its boxes are not showing).
   Do: in the box "Address" type https://10.0.0.1/dela, tick "A bench invitation" and click the dark red "Add the endpoint".
   Expect: the message "That address points inside a private network, so DELA cannot send to it."
   Do: replace the address with the webhook.site address I give you (ask me for it), keep "A bench invitation" ticked, also tick "A new review about you", and click "Add the endpoint".
   Expect: a panel titled "Your signing secret" with a long value. Click "Close" on that panel.
   Do: in the "Webhooks" card, on the new endpoint, click the dark red "Send a test".
   Expect: the message "Test notice delivered (200)."

6. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

GROUP 2. ATTORNEY (log in as the test attorney)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

2. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card whose heading starts "Engagements (", below the card "Your gigs".
   Do: click the row of the completed engagement (the same job as in group 1). If you do not see it, first click the folded line that starts "Finished and canceled (" at the bottom of that card.
   Find: the card "Reviews" lower on the page.
   Expect: the heading "The review the freelancer wrote about you" with the freelancer's text from group 1.

3. Find: in the card "Reviews", the box "Your public response (one)".
   Do: type a short thank you in it and click the outlined "Post the response".
   Expect: the message "Response published." and your words under the review, starting "Response:".

4. Find: in the same card, the line that starts "How was working with the freelancer?" and the rating dropdowns under it.
   Do: choose 2 in every rating dropdown, choose "No" next to "Would you hire them again?", type The packet came in two days late and needed a lot of fixing. in "Your review", and click the dark red "Publish my review".
   Expect: "Review published. Thank you." The review is published, not held.

5. Find: in the same card, the heading "Your bench" at the bottom.
   Do: type a short note in the box "A short note (optional)" and click the dark red "Invite to my bench".
   Expect: the message "Invitation sent." and the line "Your bench invitation is waiting for their answer."

6. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the two rounded buttons "Search" and "My bench" under the page heading "Talent".
   Do: click "My bench".
   Expect: a card whose heading starts "My bench (" with DELA Test Freelancer and the label "Invitation sent".

7. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

GROUP 3. FREELANCER AGAIN (log in as the test freelancer)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the card whose heading starts "Benches (", near the top of the page.
   Expect: the attorney's name with "Invited you to their bench:" and the note.
   Do: click the dark red "Accept".
   Expect: the message "You joined the bench. Your bench conversation is in the Inbox."

3. Find: the same card "Benches".
   Do: click the dark red "Message".
   Expect: the Inbox opens on the bench conversation. The grey line under the name says "your ongoing bench conversation. It shares no files and is not a contract". There is no "Attach a file" and no "Book a meeting".
   Do: type Happy to help with the next one. in the box "Your message" and click "Send".
   Expect: the message appears in the conversation.

4. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the card whose heading starts "Your engagements (", near the bottom.
   Do: click the row of the completed engagement (inside "Finished and canceled (" if it is folded away there).
   Find: in the card "Reviews", the heading "The review the attorney wrote about you".
   Do: click the outlined "Report this review" under it. A browser pop-up asks why: type It is unfair. and click OK.
   Expect: the message "Reported to the Lawfecta Team".

5. Sign out (the round button with your initials at the far right of the top bar, then "Sign out").

GROUP 4. OWNER (log in as the owner)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.

2. Go to: https://www.lawfecta.co/dela-admin?tab=reviews
   Expect: a first card titled "Reviews, the bench and webhooks" with counts ("Published reviews", "Held for a check", "Bench members" and others), and further down a card titled "Reported reviews (1)".

3. Find: the card "Reported reviews (1)" and the report in it.
   Do: type An honest negative opinion stays up. in the box under the review, and click the dark red "Keep it up".
   Expect: the message "Kept up; both were told".

4. Sign out (the button with the owner's name at the top right, then "Sign out").

GROUP 5. CHECK THE RESULTS

1. Ask me to open the email sent to stacey+pastclient@lawfecta.com (group 1, step 4) and give you its link. The email asks for a review and says there is no reward.
   Go to: that link (no login needed).
   Expect: a page headed "Write a review" with the grey line that starts "There is no reward for reviewing".

2. On that page:
   Do: type TX in "License state" and x in "Bar number", choose a rating in every dropdown, choose "Yes" next to "Would you hire them again?", type Careful and on time. in "Your review", tick the box that starts "I am a licensed attorney", and click the dark red "Send my review".
   Expect: the message "Check your bar number (letters, numbers and dashes)."
   Do: type 24055555 in "Bar number" and click "Send my review" again.
   Expect: the heading "Thank you".

3. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
   Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card "Your reviews", the last card at the bottom of the page.
   Expect: the attorney's review, and a separate part headed "From past clients (outside Lawfecta)" with the new review.
   Sign out (the round button with your initials, then "Sign out").

4. Ask me to look at webhook.site.
   Expect (I check this): the test notice and a "bench.invited" notice from group 2, step 5. Each has a "dela-signature" header.

Report as described in "How to work", line 10. Also give the exact text of every error message you saw.
