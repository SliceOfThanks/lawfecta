# ChatGPT live check on www.lawfecta.co (2026-11-11)

A short check of what changed on 2026-11-10 and 2026-11-11, on the new address. Three logins and one page with no login, 13 steps. Stripe is still in test mode, so no real money moves, and this test moves no money at all: it only looks, and switches one email setting off and on again.

What Claude prepared: the job "Repeat: Run a Conflict Check" was paid, delivered, accepted, disputed and settled in Stripe's test mode on 2026-11-11, so its numbers are there to look at.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking DELA on the Lawfecta site, www.lawfecta.co. Everything here is made up. Do not pay, submit or delete anything.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com, password TEST_PASSWORD
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner (admin area): stacey@lawfecta.com

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

Steps

NO LOGIN
1. Go to: https://www.lawfecta.co/security?unsubscribe=test
   Find: the first card on the page, titled "Stop reminder and alert emails".
   Do: click the blue button "Unsubscribe" once.
   Expect: a red message in the same card that starts "This unsubscribe link did not work." (the link in this test is made up on purpose).

TEST FREELANCER (log in once)
2. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
3. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card "DELA guide" at the top, under the greeting.
   Expect: a message in a pink bubble and at least one button under it. Write the message word for word.
4. Go to: https://www.lawfecta.co/dela?tab=earnings
   Find: the two tiles under the heading "Earnings", then the card "Payouts to your bank".
   Expect: the tile "Paid to you" shows $190. The card "Payouts to your bank" shows the badge "Ready".
5. Go to: https://www.lawfecta.co/dela?tab=ai
   Find: the card "Messages" (scroll down; it is one of the last cards), and in it the small heading "Emails".
   Expect: under "Emails", a ticked box with the words "Email me reminders and alerts, such as new gig alerts and next-step reminders. Emails about your account, payments and signed work always arrive."
   Do: click the box to untick it. Expect "Saved" in the small box at the bottom of the screen.
   Do: click the box again to tick it. Expect "Saved" again.
   Do: reload the page and find the same box. Expect it is ticked, and the box above it (about "Seen") is as it was before.
6. Sign out.

TEST ATTORNEY (log in once)
7. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
8. Go to: https://www.lawfecta.co/dela?tab=projects&gig=64ed7250-64b3-4423-a4f1-e0e890da40dc&view=agreement
   Expect: the agreement for "Repeat: Run a Conflict Check" opens with no error.
   Do: click the collapsed line "The terms" inside the card "The agreement" (press Ctrl+F and type The terms if you do not see it).
   Expect: write the first 12 words of the terms. (This agreement was signed before 2026-11-11, so it may still start with the words DRAFT FOR LAWFECTA'S LAWYER TO REVIEW. That is expected for this one; new agreements start with "1. The parties.")
9. Find: on the same page, the card "Your payments" (scroll down, or press Ctrl+F and type Your payments).
   Expect: two payments, $165 and $150. Write each line word for word.
   Find: the heading "Milestones" on the same page.
   Expect: write what each of the two milestones says about its status.
10. Sign out.

OWNER, ADMIN AREA (log in once)
11. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
12. Go to: https://www.lawfecta.co/dela-admin
    Do: in the row of tabs near the top, click "Payments".
    Find: the card "Money on DELA" at the top.
    Expect: Charged $315, Paid out $190, Refunded $100, Attorney fees $15, Freelancer fees $10. Write the number in every tile.
13. Sign out.

AT THE END
Report one line per step (PASS or FAIL and a few words), the FAIL list, any confusing message, and anything that took longer than 60 seconds. Put it all in DELA-test-report.txt.
