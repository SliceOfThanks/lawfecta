# ChatGPT test: UX review fixes, phases 0 and 1 (step 8)

Claude already tested this with the real api and database: 264 api tests and all 17 browser test files pass. This test checks the changed screens on the test site.

It is a look-and-type test: nothing is saved, sent, paid or signed. Each account logs in once: freelancer first, then attorney.

What it covers:
- Phase 0 fixes:
  - a monthly engagement shows only the monthly cancel
  - each notice has its own button
  - the Comments view names "Draft and review"
  - Projects keeps its card order
  - a suggestion already delegated shows its gig
- Phase 1 wording:
  - what each side pays or receives
  - the monthly price with its fee, and the cancel rule
  - the gig form fee note
  - the Library "Review" column
  - the profile Save button
  - plan names
  - AI settings
  - meeting dates
  - file sharing
  - "Not specified" exclusions

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use hirelegalhelp.com in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.hirelegalhelp.com.

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
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with your initials.
   - Just under the dark bar, a row of tabs. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out: click the round button with your initials at the far right of the dark top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.hirelegalhelp.com/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

THIS TEST SAVES NOTHING
Do not click any button that saves, sends, signs, pays, posts, approves, cancels, deletes or runs DELA's AI. You may type into a box to see what it shows, and then leave the page without saving.

Steps

FREELANCER (log in once)

1. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test freelancer.

2. Go to: https://www.hirelegalhelp.com/dela?tab=work
   Find: the top of the page, under the green line about proposals left this month.
   Expect: the card "Your engagements (" with a number, sits right under that green line, above "Invitations". Wait 5 seconds and check it did not move.

3. Go to: https://www.hirelegalhelp.com/dela?tab=work&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
   Find: the card "The agreement", near the middle of the page.
   Expect:
   - a green box under the first lines that starts "You receive" and says "in total, after your" and "platform fee."
   - a second line: "Each milestone is paid out after the client accepts it."
   - the line "Price for the work".
   - "Not included:" followed by either the excluded work or "Not specified. Confirm with the other person before signing."

4. Click "Notices" in the dark top bar.
   Expect: notices that point to a page have an outlined button on the right of their date, named for where it goes (for example "Open the agreement", "Open the gig", "Open Earnings", "Open your profile"). Write down two button names you see.
   Do: click the first of those buttons.
   Expect: DELA opens that page, and that notice no longer shows "New" when you open "Notices" again. Close the panel.

5. Go to: https://www.hirelegalhelp.com/dela?tab=profile
   Find: the card "Your profile", the "Headline" box near the top.
   Expect: the grey hint under it ends with an example for a freelancer, "Litigation paralegal for small firms."
   Find: the bottom of the same card.
   Expect: the tick box "Also update my Lawfecta directory listing", and the blue button reads "Save and update my directory listing". A grey line above it starts "These boxes also change on your directory listing:".
   Do: untick "Also update my Lawfecta directory listing".
   Expect: the button now reads "Save to DELA only" and the grey line goes away. Tick the box again. Do not click the button.

6. Sign out.

ATTORNEY (log in once)

7. Go to: https://www.hirelegalhelp.com/login and ask me to log in as the test attorney.

8. Go to: https://www.hirelegalhelp.com/dela?tab=projects
   Expect: the cards in this order from the top: "Post a new gig", then "Your gigs", then "Engagements (" with a number. Wait 5 seconds and check the order did not change.

9. On the same page, in the card "Post a new gig":
   Do: type 300 in "Budget from ($)" and 600 in "Budget to ($)". Do not click "Draft the gig with DELA".
   Expect: a grey line under the budget boxes: "The budget covers the work. Your platform fee (5%, at least $10) is added and shown before signing. Estimated total: $315 to $630."
   Do: if you see the choice "Monthly" above "Document", click it.
   Expect: the line now starts "The budget is the monthly price for the work." and says "Estimated total each month: $315 to $630." Leave the page without saving.

10. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
    Find: the card "The agreement", near the middle.
    Expect:
    - a green box with "Your total:" in bold, then "First payment:" with "(milestone 1 and the platform fee)".
    - if there is more than one milestone, a "Then" line listing the other milestones, and "The next milestone is charged automatically after you accept the previous milestone."
    - the card "Problems, disputes and canceling" lower down still has "Cancel the engagement" (this is a one-off job).

11. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the card "Monthly engagement", near the top.
    Expect:
    - a bold line "You pay $" ... " each month, including the $" ... " platform fee." If month 1 is not paid yet, it adds "Your billing day is set when you pay month 1."
    - the grey line under "Included each month" ends with "unused work does not carry over, and a month with five weeks has the same limits and price."
    - the line "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree." above the buttons "Review cancellation" and "Ask to end now". Do not click them.
    Then scroll to the card "Problems, disputes and canceling" near the bottom.
    Expect: there is NO "Cancel the engagement" in that card.

12. Go to: https://www.hirelegalhelp.com/dela?tab=library
    Find: the first table of documents.
    Expect:
    - the last column is headed "Review".
    - its cells say "Review 1 issue", "Review 2 issues", "1 suggestion", "2 suggestions" or "None". Never "blocking" or "to look at".
    - empty Owner cells say "Not assigned" and empty Next review cells say "Not scheduled".
    - an imported document says "Imported: review required" under its title (if there is one).

13. Go to: https://www.hirelegalhelp.com/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
    Find: the card "✦ Automate or delegate" near the top.
    Expect:
    - a bold line like "2 ideas | 1 already delegated".
    - each idea says "Estimated time saved:".
    - the idea that was delegated shows a green "Gig posted" or "Gig drafted" label with a "View gig" button, and no "Delegate these steps" button.
    Then click the view button "Comments (" under the document heading.
    Expect: if there are no comments, the card says "No comments yet. In "Draft and review", click "Comment" beside any part." with a button "Go to Draft and review". Click that button: the "Draft and review" view opens.

14. Go to: https://www.hirelegalhelp.com/dela?tab=home
    Find: the card whose heading starts "Your DELA plan:".
    Expect: the grey line at the bottom of it: "Your DELA plan comes from your Lawfecta directory plan. Change or pay for it in your Lawfecta account."

15. Go to: https://www.hirelegalhelp.com/dela?tab=ai
    Find: the card "Which AI DELA uses", at the top.
    Expect:
    - under "Use Lawfecta's AI", the credits line ends "Credits reset on the 1st of each month (Pacific time)."
    - if "Use Lawfecta's AI" is chosen and no key is saved, a grey line says "To add your own OpenAI or Claude key, choose "Use my own key" above." and there is no "Save and test" button.
    - if a key is saved, its card shows. Do not change anything.

16. Go to: https://www.hirelegalhelp.com/dela?tab=meetings
    Expect: each meeting shows the full date with the weekday and the year (for example "Friday, November 13, 2026"), then the time and your time zone by name (for example "Pacific Standard Time"). A booked meeting shows the label "Time confirmed". A meeting without a room link says "Meeting room not connected yet."

17. Go to: https://www.hirelegalhelp.com/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=files
    Find: the card "Files for this gig".
    Expect: the grey hint ends "Expiry cannot recall a copy someone already downloaded." Any shared file says "Access expires after" with a date, or "Access ended".
    Then click the view button "Matches" near the top.
    Expect: if nobody fits, the card shows the buttons "Search Talent" and "Review gig requirements". Do not click them.

18. Sign out.
