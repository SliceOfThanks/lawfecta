# ChatGPT test: Step 3, profiles and verification (both sides)

> Checked 2026-11-13 (new layout). Open point: the steps expect both test accounts at the start of the profile journey (the freelancer with no LinkedIn check and no profile documents, the attorney with no license added and not verified). If the accounts are further along, Claude resets them on the test site before the test. The last group logs in to the attorney and the freelancer a second time to look at the results.

Claude already tested on the test site: the profile page loads, "Fill from my Lawfecta listing" reads only the name and the fields DELA uses, saving works, and the listing update. This test covers the screens, both sides and misuse.

Before you paste this:
1. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
2. The work email for the license check is stacey+license@lawfecta.com (it arrives in your lawfecta.com inbox). hello@lawwurk.com cannot be used: its mail server refuses our email service.
3. Have ready a short resume as a PDF with no client information, and any program file renamed to end in .pdf.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Never type real client information. Use only made-up details.

Logins (I log in for you each time):
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner (admin area): stacey@lawfecta.com (password TEST_PASSWORD)
Work email for the license check: stacey+license@lawfecta.com.

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
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information. Use only the made-up details in the steps.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Steps

FREELANCER (log in once)
1. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
2. Go to: https://www.lawfecta.co/dela?tab=profile
   Expect: the page heading "Profile". Under the grey line at the top, a row of section buttons: "Availability", "LinkedIn check" and "Your profile". Then these cards from top to bottom: "Where your profile stands", "Your availability", "LinkedIn check", "Your profile" and "Profile documents". (A card about meeting times may sit between "Your availability" and "LinkedIn check".)
3. Find: the card "Your profile", near its bottom, the bold line "Let DELA draft your headline, summary and services" (just above the tick box "Also update my Lawfecta directory listing", or above the Save button if that tick box is not there).
   Do: click that line to open it. Type a few made-up sentences about your work in the box, then click the outlined "Draft with DELA". Wait up to 60 seconds.
   Expect: the message "DELA filled in a draft. Check it, then Save." The "Headline" box near the top of the card is filled in. Nothing is saved yet.
4. Still in the card "Your profile", fill in, from the top:
   - "First name" and "Last name", under the small heading "About you".
   - One practice area: click the bold line that starts "Practice areas (" to open it, then click one of the buttons in it.
   - Click the bold line that starts "Biography: summary, experience and education" to open it, and type one line in "Experience".
   - Under "Tech tools you use": click one group name to open it and click one tool in it.
   - Under the small heading "Services": if there is no "Service" box, click the outlined "Add a service". Type a name in "Service", then a number after "From $" and a higher number after "to $".
   - Under the small heading "How you work" near the bottom: choose a "Time zone", type a number in "Hours a week you can take on", and fill in "LinkedIn profile address" if that box is there.
   - Tick the box that starts "I agree to keep attorneys' work confidential".
   Do: click the dark red button at the very bottom of the card. It reads "Save and update my directory listing", "Save to DELA only" or "Save". Write which.
   Expect: the message "Profile saved". At the top of the page, the card "Where your profile stands" has the label "Waiting for a check" (or "Ready" if the LinkedIn check was already done).
5. Do: in the card "Your profile", open "Biography: summary, experience and education" again and type client SSN 123-45-6789 (made up) into "Summary". Click the dark red Save button at the bottom of the card.
   Expect: a browser pop-up that starts "This may include client information". Click Cancel.
   Do: delete those words from "Summary" and click the Save button again.
   Expect: "Profile saved".
6. Do: in "Usual hours", under "How you work", type Weekdays and do not save. Then click the section button "LinkedIn check" at the top of the page. In the card "LinkedIn check", type https://www.linkedin.com/in/test-freelancer-example in "LinkedIn profile address" and click the dark red "Ask for the check" (it reads "Send for a new check" if a check was sent before).
   Expect: the message "Sent to the Lawfecta Team", and the card shows the address with the label "Waiting for the Lawfecta Team". Scroll down to "Usual hours": Weekdays is still there.
   Do: in the card "LinkedIn check", change the address to https://example.com and click the button again.
   Expect: a plain message that refuses the address. Write it.
7. Find: the card "Profile documents", the last card on the page.
   Do: click the outlined "Upload a document" without ticking the box above it.
   Expect: a message under the button that asks you to tick the box first.
   Do: tick "This document has no confidential client information." and upload the resume PDF.
   Expect: the file name in the list under the button, then "Ready".
   Do: upload the renamed program file the same way.
   Expect: "Not accepted."
   Do: click the outlined "Show to attorneys" on the resume's row.
   Expect: the row now says "Ready, shown to attorneys" and the button reads "Make private".
8. Find: the card "Your availability" near the top of the page.
   Do: click "Available for new work".
   Expect: the message "Availability saved", and the card says "You said: Available for new work, on" a date, then "Confirm again by" a date.
9. Do: click the bell (Notices) at the right of the top bar.
   Expect: a panel on the right with an outlined "Close" button in its top-right corner.
   Do: click "Close".
   Expect: the panel closes.
   Do: click the bell again, then click the dimmed page to the left of the panel.
   Expect: the panel closes.
10. Do: click the round button with the initials at the far right of the top bar.
    Expect: the menu has a line "Profile" under the name.
    Do: click "Sign out", the last line.
    Expect: you land on the Lawfecta login page.

ATTORNEY (log in once)
11. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
12. Go to: https://www.lawfecta.co/dela?tab=profile
    Expect: the page heading "Profile and verification". A row of section buttons: "Firm details", "License verification", "Your profile" (and "Document preferences" on some accounts). The first card, "Where your profile stands", has the label "Not complete" and a checklist.
13. Do: click the section button "Your profile". In the card "Your profile", click the outlined "Fill from my Lawfecta listing" at the top of the card.
    Expect: a message that starts "Filled" or "Your listing had nothing new to add". Your name is in "First name" and "Last name". Nothing else private appears.
14. Do: in the card "Your profile", fill in "Firm name", "City" and "State" (TX). Click the bold line that starts "Practice areas (" to open it and click "Family law". Type TX in "Where you are licensed or practice". Click the dark red Save button at the very bottom of the card.
    Expect: "Profile saved". At the top of the page, "Where your profile stands" has the label "Waiting for a check" (or still "Not complete" with fewer open items; write which).
15. Do: click the section button "License verification". In the card "License verification", click the bold line "Add a license" at the bottom of the card if the form under it is not showing.
    Do: choose TX in "State that issued the license" and type 24000002 in "Bar number". Leave "Name exactly as on the state bar record" as it is. Leave "Confirm an email (on my bar record or at my firm's domain)" chosen. Type testattorney@gmail.com in "Email for the check" and click the dark red "Add the license".
    Expect: a message under the button that says free email services such as Gmail do not count. Write it.
    Do: change "Email for the check" to stacey+license@lawfecta.com and click "Add the license".
    Expect: the message "License added. Check your email for the link." The card now shows "TX license 24000002" with the label "Waiting for the Lawfecta Team" and a line that starts "We emailed stacey+license@lawfecta.com." or "Delivered to stacey+license@lawfecta.com."
16. Do: ask me to open that email and click its button while logged in as the test attorney. When I say it is done, go to: https://www.lawfecta.co/dela?tab=profile and click the section button "License verification".
    Expect: under the license, the line "Email stacey+license@lawfecta.com confirmed."
17. Do: on the same license, click the outlined "Ask for a video call instead".
    Expect: the message "Video call requested".
18. Do: click the section button "Firm details" at the top of the page (the card "Firm details" is the second card, right under "Where your profile stands"). Fill in "Billing address", "Who may sign for the firm" and "Email for formal notices" with made-up details. Click "Save firm details" at the bottom of that card.
    Expect: "Firm details saved".
19. Go to: https://www.lawfecta.co/dela?tab=projects
    Expect: near the top of the page, a note that starts "Posting work and hiring need a verified license."
20. Do: click the round button with the initials at the far right of the top bar.
    Expect: the menu has a line "Profile and verification" under the name.
    Do: click "Sign out".

OWNER, ADMIN AREA (log in once)
21. Go to: https://www.lawfecta.co/login and ask me to log in as the owner.
22. Go to: https://www.lawfecta.co/dela-admin?tab=verify
    Expect: the admin area opens on the page "Verification" (in the left menu, "Verification" is the first line under the heading "MARKETPLACE").
    Find: the card whose heading starts "Attorney licenses (", the box for the TX license with bar number 24000002. It says "Email: stacey+license@lawfecta.com (confirmed" and a time.
    Do: click the dark red "Verify" in that box without choosing anything in the list "How they showed it is theirs".
    Expect: a plain message asking you to choose. Write it. The license stays in the list.
23. Do: in the same box, choose "The email is at the firm's own domain" in the list "How they showed it is theirs", type Checked on the Texas bar lookup (test) in the box "Lookup note (what you checked, where)", and click "Verify".
    Expect: the message "Verified", and the license leaves the list.
24. Find: the card whose heading starts "Freelancer LinkedIn checks (", below the licenses, the box for DELA Test Freelancer.
    Do: click the dark red "Checked" without ticking the two boxes.
    Expect: a message that says to tick both. Write it.
    Do: tick "The name on LinkedIn matches" and "LinkedIn shows its verified badge", then click "Checked".
    Expect: the message "Saved and the freelancer was told", and the check leaves the list.
25. Sign out: click the button with the owner's name and "(owner)" at the top right, then "Sign out".

CHECK THE RESULTS (looking only; the attorney and the freelancer log in one more time)
26. Go to: https://www.lawfecta.co/login and ask me to log in as the test attorney.
    Go to: https://www.lawfecta.co/dela?tab=profile
    Expect: the card "Where your profile stands" has the label "Ready". In the card "License verification", the TX license has the label "Verified".
    Go to: https://www.lawfecta.co/dela?tab=projects
    Expect: the note about a verified license is gone. Sign out.
27. Go to: https://www.lawfecta.co/login and ask me to log in as the test freelancer.
    Go to: https://www.lawfecta.co/dela?tab=profile
    Expect: the card "Where your profile stands" has the label "Ready" and the sentence "You are match-ready. Attorneys can find and invite you." Sign out.

Report as described in "How to work", line 10. Include the words you were asked to write down and the exact text of every error message.
