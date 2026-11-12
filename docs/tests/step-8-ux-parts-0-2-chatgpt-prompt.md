# ChatGPT test: UX review fixes, parts 0, 1 and 2 (step 8)

> Checked against the screens on 2026-11-13 (new layout).

Claude already tested this with the real api and database: 264 api tests and all 17 browser test files pass. This test checks the changed screens on the test site.

It is a look-and-type test: nothing is saved, sent, paid or signed. Each account logs in once: freelancer first, then attorney.

What it covers:
- Part 2 layout: the Library table, Projects with "Needs your action", Notices split, Talent labels and "View profile", Ask DELA, the Inbox menus, Files search, the Connect page and the Profile section menu.
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
  - Settings (the AI cards)
  - meeting dates
  - file sharing
  - "Not specified" exclusions

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD instead.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

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
Do not click any button that saves, sends, signs, pays, posts, approves, cancels, deletes or runs DELA's AI. You may type into a box to see what it shows, and then leave the page without saving.

Steps

FREELANCER (log in once)

1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.

2. Go to: https://www.lawfecta.co/dela?tab=work
   Find: the top of the page, under the green line about proposals left this month.
   Expect: the card "Your engagements (" with a number, sits right under that green line, above "Invitations". Wait 5 seconds and check it did not move.

3. Go to: https://www.lawfecta.co/dela?tab=work&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
   Find: the card "The agreement", near the middle of the page.
   Expect:
   - a green box under the first lines that starts "You receive" and says "in total, after your" and "platform fee."
   - a second line: "Each milestone is paid out after the client accepts it."
   - the line "Price for the work".
   - "Not included:" followed by either the excluded work or "Not specified. Confirm with the other person before signing."

4. Click the bell (Notices) at the right of the top bar.
   Expect: two headings in the panel, "Needs your action (" with a number, and "Updates". A job with several updates shows one line with "earlier updates about this job" that opens on click. Notices that point to a page have an outlined button on the right of their date, named for where it goes (for example "Open the agreement", "Open the gig", "Open Earnings"). Write down two button names you see.
   Do: click the first of those buttons.
   Expect: DELA opens that page, and that notice no longer shows "New" when you click the bell again. Close the panel with the outlined "Close" button at its top right.

5. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the row of buttons near the top of the page, under the grey line about your profile.
   Expect: section buttons "Availability", "LinkedIn check" and "Your profile". Click "Your profile": the page scrolls to that card.
   Find: the card "Your profile", the "Headline" box near the top.
   Expect: the grey hint under it ends with an example for a freelancer, "Litigation paralegal for small firms."
   Find: the bottom of the same card.
   Expect: the tick box "Also update my Lawfecta directory listing", and the dark red button reads "Save and update my directory listing". A grey line above it starts "These boxes also change on your directory listing:".
   Do: untick "Also update my Lawfecta directory listing".
   Expect: the button now reads "Save to DELA only" and the grey line goes away. Tick the box again. Do not click the button.

6. Sign out.

ATTORNEY (log in once)

7. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.

8. Go to: https://www.lawfecta.co/dela?tab=projects
   Expect: the cards in this order from the top: "Post a new gig", "Needs your action", "Your gigs", then "Engagements (" with a number. Wait 5 seconds and check the order did not change.
   - "Post a new gig" is short, with a dark red "Start a new gig" button at its right (the form opens on request once you have open gigs or drafts).
   - "Needs your action" lists what waits on you, each with an outlined button at its right such as "Review proposals", "Answer", "Open the agreement", "Review the delivery" or "Open the payment". If nothing waits, it says "Nothing waits on you right now."
   - "Your gigs" has filter buttons "Open and drafts (", "Filled (", "Closed (" and "All (", and shows at most 6 gigs. When there are more, an outlined button under the list starts with "Show", then a number, then "more". Click "Filled (" and then "Open and drafts (" to see the list change.

9. On the same page, in the card "Post a new gig":
   Do: click the dark red "Start a new gig" button at the right of the card (if the form with the "Document" list is already open, skip this click). Then type 300 in "Budget from ($)" and 600 in "Budget to ($)". Do not click "Draft the gig with DELA".
   Expect: a grey line under the budget boxes: "The budget covers the work. Your platform fee (5%, at least $10) is added and shown before signing. Estimated total: $315 to $630."
   Do: if you see the round choices "One-off" and "Monthly" above "Document", click "Monthly".
   Expect: the line now starts "The budget is the monthly price for the work." and ends "Estimated total each month: $315 to $630." Leave the page without saving.

10. Go to: https://www.lawfecta.co/dela?tab=projects&gig=6a31398c-e89f-4f58-b6ca-f5aef02639a4&view=agreement
    Find: the card "The agreement", near the middle.
    Expect:
    - a green box with "Your total:" in bold, then "First payment:" with "(milestone 1 and the platform fee)".
    - if there is more than one milestone, a "Then" line listing the other milestones, and "The next milestone is charged automatically after you accept the previous milestone."
    - the card "Problems, disputes and canceling" lower down still has "Cancel the engagement" (this is a one-off job).

11. Go to: https://www.lawfecta.co/dela?tab=projects&gig=e50f0026-e436-43e8-b668-70d9b7e00de6&view=agreement
    Find: the card "Monthly engagement", near the top.
    Expect:
    - a bold line "You pay $" ... " each month, including the $" ... " platform fee." If month 1 is not paid yet, it adds "Your billing day is set when you pay month 1."
    - the grey line under "Included each month" ends with "unused work does not carry over, and a month with five weeks has the same limits and price."
    - the line "Cancellation takes effect at the end of the paid month. Ending sooner needs both of you to agree." above the buttons "Review cancellation" and "Ask to end now". Do not click them.
    Then scroll to the card "Problems, disputes and canceling" near the bottom.
    Expect: there is NO "Cancel the engagement" in that card.

12. Go to: https://www.lawfecta.co/dela?tab=library
    Expect: the page heading "Library" with document cards under headings.
    Find: the row of underlined dark red links at the bottom of the page, under the last document cards.
    Do: click "Show as a table", the last link in that row. (This only changes how the list looks on this browser.)
    Expect: the page heading is now "Document library", and:
    - right under the card with the document count (the card with the dark red "New document" button): a search box "Search by title, ID or practice area" and the filter buttons "All", "Drafts", "In review", "Approved", "Due for review" and "More". Click "More": "Archived" (and "Trash" for an administrator) appear.
    - one table with the columns "Document", "Type", "Owner (role)", "Status", "Next review" and "Review". Each group is a shaded row inside the same table that starts with three capital letters and a line (for example "INT |"), and each document's ID sits under its title.
    - the "Review" cells say "None", or underlined dark red words such as "1 quality note", "2 quality notes" or "1 quality note (required)". Never "blocking" or "to look at".
    - empty Owner cells say "Not assigned" and empty Next review cells say "Not scheduled".
    - below the table, if there are imports, one line "Imports waiting for review (" that opens on click.
    Do: scroll to the bottom of the page and click the underlined dark red link "Show as cards".
    Expect: the heading is "Library" again, with the document cards.

13. Go to: https://www.lawfecta.co/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
    Find: the card "✦ Automate or delegate" near the top.
    Expect:
    - a bold line like "2 ideas | 1 already delegated".
    - each idea says "Estimated time saved:".
    - the idea that was delegated shows a green "Gig posted" or "Gig drafted" label with a "View gig" button, and no "Delegate these steps" button.
    Then click the view button that starts "Comments (" in the row of view buttons under the document details (the row starts with "Approved version" or "Draft and review").
    Expect: if there are no comments, the card shows one of these two:
    - "No comments yet. The approved version is read-only: to comment, start a new draft. The approved version stays in use until the new one is approved." with an outlined button "Edit a new draft". Do not click it.
    - a line that starts "No comments yet. In" and ends "click "Comment" beside any part.", naming a view that is in the row of view buttons ("Draft and review", "New draft" or one that starts "Draft (version"), with an outlined button that starts "Go to" and names the same view. Click that button: that view opens.

14. Go to: https://www.lawfecta.co/dela?tab=home
    Find: the bottom of the left column, under the cards: one grey line with your plan name, and at its right end the underlined dark red words "View plan".
    Do: click "View plan".
    Expect: a card opens under that line. Its heading starts "Your DELA plan:". The grey line at the bottom of it: "Your DELA plan comes from your Lawfecta directory plan. Change or pay for it in your Lawfecta account."

15. Go to: https://www.lawfecta.co/dela?tab=ai
    Expect: the page heading "Settings".
    Find: the heading "AI and messages", below the cards "Account and security", "Appearance", "Suggestions and alerts" and "Emails". The card "Which AI DELA uses" is the first card under that heading.
    Expect:
    - under "Use Lawfecta's AI", the grey line says "Included with your plan." or ends "DELA actions reset on the 1st of each month (Pacific time)."
    - if "Use Lawfecta's AI" is chosen and no key is saved, a grey line under the card says "To add your own OpenAI or Claude key, choose "Use my own key" above." and there is no "Save and test" button.
    - if a key is saved, its card shows. Do not change anything.

16. Go to: https://www.lawfecta.co/dela?tab=meetings
    Expect: each meeting shows the full date with the weekday and the year (for example "Friday, November 13, 2026"), then the time and your time zone by name (for example "Pacific Standard Time"). A booked meeting shows the label "Time confirmed". A meeting without a room link says "Meeting room not connected yet."

17. Go to: https://www.lawfecta.co/dela?tab=projects&gig=c00a6abf-b3fd-461c-8ca4-4b6225d8a5bd&view=files
    Find: the card "Files for this gig".
    Expect: the grey hint ends "Expiry cannot recall a copy someone already downloaded." Any shared file says "Access expires after" with a date, or "Access ended".
    Then click the view button "Matches" near the top.
    Expect: if nobody fits, the card shows the buttons "Search Talent" and "Review gig requirements". Do not click them.

18. Go to: https://www.lawfecta.co/dela?tab=talent
    Find: the card "Find a freelancer" at the top.
    Expect: the boxes have labels you can see: "Practice area", "Skill", "Tech tool" and "State you need". "State you need" is a list of full state names (for example "Texas"), starting with "Any state".
    Do: click "Search". If any freelancer shows, click "View profile" on the first one. (If none shows, write "no freelancers listed" and go on.)
    Expect: a window "Profile" with their name, "Verified" or "Verification not finished", and their details. Click "Close".

19. Go to: https://www.lawfecta.co/dela?tab=delegate
    Do: click the outlined button "New chat" at the top right of the page, on the same line as the heading "Ask DELA".
    Expect: the message box comes right under the heading, with a card "Example: ..." and a button "Use this example" below it. Click "Use this example": the example text fills the message box. Do not send it.

20. Go to: https://www.lawfecta.co/dela?tab=inbox
    Do: click the first conversation in the list.
    Expect: under the heading, "Open the gig" and a dark red "Book a meeting", then "✦ AI help" and "More", which open on click. "More" holds "Report" and "Block". Do not click any of them.

21. Go to: https://www.lawfecta.co/dela?tab=files
    Expect: a search box "Search files by name" above the list. Each file shows "Version" and when it was uploaded under its name, and a file marked "Ready" says "Available to your firm".

22. Go to: https://www.lawfecta.co/dela?tab=connect
    Expect: one card with the heading "Connect DELA to ChatGPT or Claude" and, under it, the smaller headings "What ChatGPT or Claude can access", "What it can change", "What stays private", "What leaves DELA" and "How to disconnect".

23. Go to: https://www.lawfecta.co/dela?tab=library&pb=8b835621-3ddd-4b64-baa8-e6fcf2b8707e
    Find: the row of view buttons under the document details. Look at its first button.
    Expect, if the first button is "Draft and review" (or the selected button is "New draft" or starts "Draft (version"): a card "Quality check" on the right of the document, with a grey line "Blocking items are required before approval. Needs attention items are suggestions. These checks look at how the document is written; they do not confirm it is legally correct." Items not passed are labeled "Required before approval" or "Suggestion".
    Expect, if the first button is "Approved version" and it is selected: under the card whose heading starts "Approved version", either a card whose heading starts "Quality notes (" with a grey line that starts "What the quality check suggests for this version." and items labeled "Required before approval" or "Suggestion", or no quality card at all when every check passed. Write which of these you saw.

24. Sign out.
