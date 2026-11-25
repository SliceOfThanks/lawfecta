You are checking one new page in the admin area of DELA on the Lawfecta site, www.lawfecta.co: "Move members". It reads the members of the old website (www.lawfecta.com) into DELA and shows what moving them would do. Only the owner takes part. This check reads and looks. It changes nothing on either website, moves nobody, emails nobody and chooses no plan. Use a wide browser window.

No step should open a browser pop-up (a small OK / Cancel window from the browser itself). If one opens, click Cancel, write FAIL for that step and say what the pop-up said.

Steps marked REVIEW ask for your judgment. Look at the screen as it is and answer in one or two sentences each. If you cannot tell something from the screen, write "could not check".

Important for this check: do NOT change any list in the card "2. Which plan each old plan becomes" and do NOT change any list in the card "3. Categories". Those choices are the owner's.

Login (I log in for you):
- owner (admin area): stacey@lawfecta.com (I type the password myself)

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



## Part 1: the owner

Log in as the owner: go to https://www.lawfecta.co/login and ask me to log in as the owner.

1. Go to: https://www.lawfecta.co/dela-admin?tab=move
   Expect: a page headed "Move members". In the menu at the left, under the heading "MEMBERS", the line "Move members" is the marked one.
   Expect: under the heading, grey words that say members of the old website (https://www.lawfecta.com) are read into DELA, and that nothing on this page changes either website.
   Expect: a card "1. Read the old site" with a dark red button that reads "Read the old site" or "Read the old site again".
   Expect: NO blue notice in that card saying that the old site's API key is not set. (If that notice shows, write FAIL for step 1 with its words, skip steps 2 to 6 and go on to step 7.)

2. Find: the card "1. Read the old site", at the top of the page.
   Do: click the dark red button ("Read the old site" or "Read the old site again").
   Expect: a small message at the bottom of the screen: "Reading the old site. This page updates by itself." The line above the button changes to "Reading now:" with a number of members that grows.
   Do: wait, without clicking, until that line starts with "Read" and a number of members and a date. This can take up to two minutes. The page refreshes itself every five seconds.
   Expect: the line reads "Read 2596 members" or a number close to it (the old site may have gained or lost a few). Write down the exact number.
   (If the line instead starts "The last reading stopped:", write FAIL for step 2 with the whole sentence, skip steps 3 to 6 and go on to step 7.)

3. Find: the card "2. Which plan each old plan becomes", under the first card.
   Expect: a table with the columns "Old plan", "Members", "Price on the old site" and "Becomes on the new site". One row for each plan, the plan with the most members first.
   Expect: the first row is "Attorney Account" with about 1543 members. Rows for "Free Membership" (about 520) and "Claim Listing" (about 443) follow.
   Expect: in the last column, every list reads "Choose", unless the owner has already made choices. Write down how many read "Choose".
   Do: add up the numbers in the "Members" column and write down the total.
   Expect: the total is the number of members you wrote down in step 2.
   Do NOT change any list.

4. Find: the card "3. Categories", under the plan table.
   Expect: one sentence that starts with two numbers, for example "310 of 320 categories of the old site match one on this site by name." Write down the sentence.
   Expect: if a table follows, each row has an old category, a number of members and a list that reads "Leave out". Write down how many rows there are. Do NOT change any list.

5. Find: the card "4. Preview", under the categories.
   Do: click the dark red button "Work out the preview".
   Expect: six grey boxes with numbers: "Moves", "Already on the new site (linked, not made again)", "Same email as another member", "Plan not chosen yet", "Not moved (your choice for the plan)" and "Email missing or not an email address". Write down all six numbers.
   Expect: the six numbers add up to the number of members from step 2.
   Expect: a button "Download the list" with the same number of members in brackets.
   Do: click "Download the list".
   Expect: the browser saves a file named member-move-preview.csv. Do not open or share it: it holds members' names and email addresses.

6. Find: the card "5. Move", the last card on the page.
   Expect: it says the move itself is not built yet. There is NO button in it.

7. REVIEW. (a) Is it clear from the page that nothing here changes either website? (b) Is the plan table easy to read, and is it clear what "Do not move" would do? (c) Are the six numbers of the preview understandable without explanation? (d) Was anything crowded, cut off or confusing?

Sign out: click the button with your name at the far right of the top bar, then click "Sign out".

## Report

For each numbered step write PASS or FAIL and one line of what you saw, with the numbers you wrote down; for the REVIEW step (7) give your answers. Then a list of every FAIL with a screenshot, every message on screen that confused you, and anything that took you more than one try to find. Do NOT put any member's name or email address in the report.
