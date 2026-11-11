# ChatGPT test: re-check of the UI review fixes (light and dark)

A short check of the fixes from the UI review of 2026-11-08 (docs/reviews/test-reports/2026-11-08-step-10-ui-review.txt). It looks only. It changes one thing and puts it back: the attorney's own "Appearance" choice (Dark for part of the test, then "Match my device" again).

Each account logs in once: attorney, then freelancer.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs, and run it on its own.

Paste everything below the line into ChatGPT in agent mode.

---

You are re-checking visual fixes in DELA on the Lawfecta test site, www.lawfecta.co, on a computer screen. You only look: you do not type, save, send, sign or pay anything, except the Appearance choice the steps name.

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
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with your initials.
   - Just under the dark bar, a row of tabs. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Badge colors DELA now uses on every page (check against these):
- Yellow: something you need to do (for example "Needs your signature").
- Blue: in progress (for example "Active", "Sent", "Filled").
- Green: done or ready (for example "Complete", "Chosen", "Open", "Ready", "Verified").
- Grey: waiting on someone else, or a draft (for example "Signed: waiting for the first payment", "Draft").
- Faded grey outline: closed (for example "Canceled", "Closed").

Steps

ATTORNEY (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
2. Do: click the round button with your initials at the far right of the dark top bar. In the menu under "Appearance", click "Light".
   Expect: the page turns light.
3. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the card titled "Verification", about a third of the way down, left.
   Expect: a green badge "Verified" (capital V) next to the heading. Further down, under "What DELA will do for you", row 4 "Engagements and payments" has an "Open Projects" button, not "COMING SOON".
4. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the card "Not sure where to start?" near the bottom.
   Expect: the "✦ Help me create a document" button is the same blue as the "Create a document" button at the top right. Under the card, the grey line reads like "13 documents saved. Your plan allows 50. Your access to this Library: Administrator." and does not say "not switched on".
5. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Engagements", near the top.
   Expect: badges follow the colors above: "Active" blue, "Complete" green, "Canceled" faded grey, "Needs your signature" yellow. Gig badges: "Draft" grey, not green.
6. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card "Your firm profile for documents", near the bottom, then the "Team roles" heading in it.
   Expect: the role names, the "Nobody yet" boxes and the "No one assigned" labels each line up in straight columns, also for "Supervising attorney" and "Outsourced freelancer". No row reads "Attorney (attorney)".
7. Go to: https://www.lawfecta.co/dela?tab=ai
   Find: the card "This month", the second card.
   Expect: "Included DELA actions used" shows the same number as the blue link at the very bottom of the page ("DELA actions: N of 1000 this month"), and the first card's "N of 1000 DELA actions left this month" adds up with it to 1000.
8. Do: click the round button with your initials, and under "Appearance" click "Dark".
   Expect: the page turns dark.
9. Go to: https://www.lawfecta.co/dela?tab=library
   Expect: the tab row at the top shows "✦ Ask DELA" like the other tabs (no purple pill around it); only "▥ Library" is highlighted. The selected filters "All categories" and "All" are clearly highlighted (light pink fill). Near the bottom, the links "Library settings", "Recordings", "Recently deleted" and "Show as a table" are light pink and easy to read.
10. Go to: https://www.lawfecta.co/dela?tab=profile
    Find: the card "Firm details", near the top.
    Expect: each empty box (for example "Firm's legal name") has a clearly visible edge and a darker fill than its card, and grey example text in boxes is easy to read.
11. Do: click the round button with your initials, and under "Appearance" click "Match my device" (this puts it back).
12. Sign out.

FREELANCER (log in once)
13. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
14. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the dark card "Your profile, through an attorney's eyes" at the top.
    Expect: a green "Ready" badge (the same word and color as on the Profile page). Under "What DELA will do for you", rows 1, 2 and 4 have buttons ("Open your profile", "Open your profile", "Open Earnings"), not "COMING SOON".
15. Go to: https://www.lawfecta.co/dela?tab=work
    Find: the card "Your engagements (13)" at the top, then "Sent proposals" at the bottom.
    Expect: badge colors as listed above. "Needs your signature" is yellow. "Sent" is blue and "Chosen" is green.
16. Go to: https://www.lawfecta.co/dela?tab=earnings
    Find: the card "Your engagements".
    Expect: the same badge colors as on Work for the same jobs ("Needs your signature" yellow). No line says "accepted 0 of 0": lines say "milestones accepted N of N", "milestones set when you both sign", or nothing about milestones for finished or canceled jobs.
17. Go to: https://www.lawfecta.co/dela?tab=inbox&thread=4ad45c8e-ac59-4300-9577-48b42e50e3b4
    Do: click the blue "Book a meeting" button near the top of the conversation.
    Expect: the booking card shows the date, length and times. There is no empty grey strip under "Show more times". Do not click a time.
18. Sign out.

AT THE END
List every FAIL and anything that still looks inconsistent. Put all of it in DELA-test-report.txt.
