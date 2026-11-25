You are checking two things in DELA on the Lawfecta site, www.lawfecta.co. First, as an attorney: a made-up Social Security number and a made-up passport number typed into a Library document are taken out when the page saves. Second, as the owner: a new card in the admin area, "Six-hour check", which shows whether Stripe, the website, the email service and the database are well. The numbers you type are invented for this check and belong to nobody.

No step should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens, click Cancel, write FAIL for that step and say what the pop-up said.

Steps marked REVIEW ask for your judgment. Look at the screen as it is and answer in one or two sentences each. If you cannot tell something from the screen, write "could not check".

Important for this check: in Part 1 do NOT click "Save", do NOT click "← Library", and do NOT click any tab above the white page (such as "Versions") before step 4. Any of those would keep what you typed.

Logins (I log in for you each time):
- test attorney: stacey+dela-attorney@lawfecta.com, password TEST_PASSWORD
- owner: I type the owner's login myself

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features.
2. When a step says "Go to", type that link into the browser's address bar and press Enter. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading: press Ctrl+F (Cmd+F on a Mac), type the name without the quotes, press Enter, and use the highlighted match. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Notifications", "Meetings", "Profile" and "Subscription" (and "Agency" on some accounts; a freelancer who owns an agency also sees "Projects", "Library" and "Talent"), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Notifications", "Meetings", "Files", "Get set up" (only until setup is finished), "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notifications) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

Note for this check: to choose a word, double-click it. The word is then highlighted.


## Part 1: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

1. Go to: https://www.lawfecta.co/dela?tab=library
   Find: the card titled "Send the welcome packet 2" in the list of documents. (Not the card "Send the welcome packet", which has no 2.)
   Do: click the title "Send the welcome packet 2" on that card.
   Expect: the document opens as a white page that starts with a large title and then a heading "Purpose".
   Write down the version number shown beside the word "Version", above the white page.

2. Find: the text under the heading "Purpose", near the top of the white page.
   Do: click at the end of that text, press Enter, then type exactly: Check 39. Client SSN 123-45-6789 and passport number X1234567 are in the file.
   Do: wait 10 seconds without clicking anything.
   Expect: above the white page, small grey words that start "Saved".
   Write down anything new that appeared above or below the white page while you waited (a notice, a message at the bottom of the screen), word for word. If nothing appeared, write "nothing".

3. Do: reload the page (the browser's reload button). If the list of documents shows, click the title "Send the welcome packet 2" again.
   Expect: a notice above the white page that starts "Your changes from" and ends with the underlined words "Drop them".
   Find: the line under "Purpose" that starts "Check 39."
   Expect: it reads: Check 39. Client [removed: Social Security number] and [removed: government ID number] are in the file.
   Expect: the numbers 123-45-6789 and X1234567 are nowhere on the page. (Use Ctrl+F or Cmd+F to search for 6789 and for X1234567; neither should be found.)

4. Do: click the underlined words "Drop them" in the notice above the white page.
   Expect: the line that starts "Check 39." is gone from under "Purpose".
   Expect: the version number beside "Version" is the same as the one you wrote down in step 1.

Sign out: click the round button with your initials at the far right of the top bar, then click "Sign out".

## Part 2: owner (admin area)

Log in as the owner: go to https://www.lawfecta.co/login and ask me to log in as the owner.

5. Go to: https://www.lawfecta.co/dela-admin?tab=jobs
   Find: the heading "Jobs" at the top of the page, and right under its one sentence the card titled "Six-hour check".
   Expect: in the menu at the left edge, under the group "SAFETY", the line "Jobs" is the marked one.
   Expect: the card's first sentence starts "Every 6 hours DELA checks Stripe, the website, the email service and its own database."
   Expect: a dark red button "Run the check now" at the bottom of the card.
   Write down the line in the card that starts "All good." or with a number and "to look at", or the words "No check has run yet.", whichever is there.

6. Do: click "Run the check now".
   Expect: a small dark message at the bottom of the page: "The check is running. Look again in a minute."
   Do: wait 90 seconds without clicking, then reload the page.
   Find: the card "Six-hour check" again.
   Expect: a line that includes "Last check" with today's date and the words "run by hand".
   Expect: under it a table. Each row has a name on the left, a small rounded tag that reads "OK" or "Look", and a sentence. The rows include "Database", "Stripe", "Website" and "Email service".
   Write down every row of that table: its name, its tag and its sentence, word for word.
   If any row has the tag "Look": under the table there are boxes with a bold first sentence. Write down each box, word for word. A tag "Look" is not a FAIL of this check; it is what the card is for.

7. REVIEW. (a) Would an owner who is not technical understand from this card whether anything needs her attention today? (b) For a row tagged "Look", does the box under the table say clearly what to do next? (c) Is it clear how often the check runs and how she will hear about a problem? (d) Was anything crowded, cut off or confusing?

Sign out: click the round button with your initials at the far right of the top bar, then click "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw, with everything the step asked you to write down; for the REVIEW step (7) give your answers. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took you more than one try to find.
