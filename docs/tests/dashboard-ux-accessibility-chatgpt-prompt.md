# ChatGPT review: the three Home dashboards, customizing them, and their UX, UI and accessibility (2026-11-17)

REPLACED on 2026-11-17 by docs/tests/home-review-fixes-chatgpt-prompt.md (check 9). Home changed with step 36; do not run this one.

What it covers: the default Home of the freelancer, the agency owner and the attorney with the test data now on the site; customizing each one ("+ Add", the arrow buttons, "Remove", "Save changes", reload, "Restore default"); that "My work" and "My agency" keep separate layouts; and a structured review of each Home and of the Customize panel: clarity, numbers, empty states, wording, consistency, contrast, charts with text, the keyboard, 200% zoom and click targets.

What it cannot cover: a real screen reader (ChatGPT sees the screen, it does not hear it), measured color contrast, a phone, dragging a row, and what an agency team member sees (the test agency has no team member besides its owner). Treat its accessibility findings as a first look, not as proof of meeting WCAG 2.2 AA.

What changes on the site: each of the three layouts gets one card added and one removed, then is put back to the default. Nothing is paid, signed, posted, sent or booked, and nobody is invited or reminded.

Two logins, each once: the test freelancer (who is also the agency owner), then the test attorney.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.
4. This one is longer than the other checks: about 26 steps. Let it finish before you start another.

Paste everything below the line into ChatGPT in agent mode.

---

You are reviewing the Home dashboards of DELA on the Lawfecta site, www.lawfecta.co, for three roles: a freelancer, an agency owner and an attorney. For each one you customize the dashboard, then judge the user experience, the visual design and the accessibility. Everything here uses test accounts with test data. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not send a message or a proposal, do not invite or remove anyone, and do not click any button inside a card on Home other than the ones named. Use a browser window at least 1200 pixels wide.

Two logins cover the three roles: the test freelancer owns a test agency, so its Home has a switch between "My work" (the freelancer) and "My agency" (the agency owner).

This test is a review as well as a check. Steps marked REVIEW ask for your judgment. For those, look at the screen as it is and answer the questions in the step; do not click around to find out more. Say what you saw, not what you assume. If you cannot tell something from the screen (for example what a screen reader would say), write "could not check" instead of guessing.

About the "Customize dashboard" panel: never close it with its "Close" button or the Escape key while it has unsaved changes, because that opens a browser pop-up. Use "Cancel" or "Save changes" as the steps say.

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Notifications", "Meetings", "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Notifications", "Meetings", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notifications) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test freelancer (also the agency owner)

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

### 1A. The freelancer's Home ("My work")

1. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the top right of the page, to the left of the button "Customize dashboard": a switch of two buttons, "My work" and "My agency".
   Do: click "My work" (even if it is already highlighted). If the panel "Customize dashboard" was left changed by an earlier test, open it, click "Restore default" and "Save changes" first.
   Expect: the heading "Your Workspace" and white cards in two columns: "Recommended gigs", "Earnings and payments", "My proposals and invitations", "Active work and deadlines" (or "Work opportunities"), "Needs your attention", "Business growth insights".
   Write into your report: the name of every card in reading order, and for each card one line of what it shows right now (numbers included).

2. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right and Home stays visible behind it. It has the title "Customize dashboard", a heading "Your dashboard (" with a number, the underlined words "Restore default", a list of rows, a heading "Available widgets" with a second list, and "Cancel" and "Save changes" at the bottom. Each row under "Your dashboard" has six small dots, an icon, the widget's name, a button with an arrow up, a button with an arrow down, and a button "Remove".
   Write into your report: the names under "Your dashboard" in order, and the names under "Available widgets".

3. Find: the first row under "Available widgets" and its button "+ Add".
   Do: click "+ Add". Write down which widget you added.
   Expect: the number after "Your dashboard" goes up by one, the widget is the last row of that list, and a card with that name shows on Home behind the panel.
   Do: in that widget's row under "Your dashboard", click the button with the arrow up twice.
   Expect: the row moves up two places, and the card on Home moves with it.

4. Find: the second row under "Your dashboard" and its button "Remove".
   Do: click "Remove". Write down which widget you removed.
   Expect: the row leaves the list and now shows under "Available widgets". Its card is gone from Home behind the panel.
   Do: click "Save changes" at the bottom of the panel.
   Expect: the panel closes and a short message "Your Home layout is saved." shows.

5. Do: reload the page (F5, or Cmd+R on a Mac).
   Expect: Home shows the layout you saved: the widget you added is there, the one you removed is not.

6. REVIEW of the Customize panel. Open it again with "Customize dashboard" and answer, without changing anything:
   a. Was it clear at once what the panel is for and that Home behind it previews your changes?
   b. Were "+ Add", the two arrow buttons, "Remove", "Restore default", "Cancel" and "Save changes" easy to find and to tell apart? Is it clear what each arrow does before you click it? (Hold the mouse over an arrow for two seconds and write what the small label says.)
   c. Is anything missing that you looked for (for example a way to undo one change, or a sign of which widgets are on by default)?
   d. Did anything in the panel overlap, get cut off, or need sideways scrolling?
   Then keyboard only, no mouse: click once on the title "Customize dashboard" in the panel, then press Tab up to 15 times.
   e. Does a clearly visible outline show which control has focus each time? Write the order of the first six controls that got focus.
   f. Press Tab until an arrow-up button in the second row has focus, then press Enter once. Did the row move up one place, and is focus still on a control in that same row?
   Do: click "Cancel" at the bottom of the panel.
   Expect: the panel closes and Home is as it was after step 5 (the move from f is not kept).

7. Find: the button "Customize dashboard" at the top right.
   Do: click it, click the underlined words "Restore default", then click "Save changes".
   Expect: the panel closes and the message "Home is back to the default layout." shows. Home has the six cards of step 1 again.

8. REVIEW of this Home (the freelancer, "My work"). Scroll slowly from the top of the page to the bottom once, then answer. Give each lettered item a score from 1 (poor) to 5 (very good) and one or two sentences with the example you saw.
   a. First impression: in five seconds, can you tell what this page is for and what this person should do first?
   b. For each card, three questions: what is happening, why does it matter, what can I do next. Name every card that fails one of the three, and say which.
   c. Numbers and money: is every figure labeled with what it counts and its period (for example "this month")? Name any figure you could not explain. Name anything that looks invented or decorative (a percentage, score, star rating or trend with no explanation).
   d. Empty and low-data cards: where a card has little or nothing to show, does it say why and offer one sensible next step? Name any card with a large blank area.
   e. Visual order: do the most urgent things stand out? Is anything too loud, too faint, or repeated on the page?
   f. Wording: quote any label, sentence or button name that is unclear, too long, or uses a word a lawyer or paralegal would not know.
   g. Consistency: do the cards share the same heading style, spacing, link style ("... →") and button style? Name any that differ.
   h. Color and contrast: is any text hard to read against its background (name it and where)? Is anything shown by color alone, with no word or icon?
   i. Rings and bars: for each ring or bar chart on the page, is the same information also written in words and numbers next to it?
   j. Keyboard: click once on the page heading, then press Tab 20 times. Is focus always visible? Does it move in reading order? Did it ever get stuck or disappear? Could you open the "Customize dashboard" button with Enter?
   k. Zoom: press Ctrl and + (Cmd and + on a Mac) until the browser shows 200%. Does the page become one column without sideways scrolling, with no text or button cut off? Then press Ctrl and 0 (Cmd and 0) to go back to 100%.
   l. Click and tap targets: name any button or link that looks smaller than about 24 by 24 pixels or sits too close to another to click safely.

### 1B. The agency owner's Home ("My agency")

9. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the switch at the top right.
   Do: click "My agency".
   Expect: the heading "Agency Workspace" and the cards "Agency revenue and payments", "Team workload and availability", "Recommended agency gigs", "Proposals and sales pipeline", "Active client projects", "Needs team attention".
   Write into your report: the name of every card in reading order, and for each card one line of what it shows right now (numbers included). For "Agency revenue and payments" write both amounts with their labels. For "Team workload and availability" write each team member's line.

10. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right and Home stays visible behind it. It has the title "Customize dashboard", a heading "Your dashboard (" with a number, the underlined words "Restore default", a list of rows, a heading "Available widgets" with a second list, and "Cancel" and "Save changes" at the bottom. Each row under "Your dashboard" has six small dots, an icon, the widget's name, a button with an arrow up, a button with an arrow down, and a button "Remove".
   Write into your report: the names under "Your dashboard" in order, and the names under "Available widgets".

11. Find: the first row under "Available widgets" and its button "+ Add".
   Do: click "+ Add". Write down which widget you added.
   Expect: the number after "Your dashboard" goes up by one, the widget is the last row of that list, and a card with that name shows on Home behind the panel.
   Do: in that widget's row under "Your dashboard", click the button with the arrow up twice.
   Expect: the row moves up two places, and the card on Home moves with it.

12. Find: the second row under "Your dashboard" and its button "Remove".
   Do: click "Remove". Write down which widget you removed.
   Expect: the row leaves the list and now shows under "Available widgets". Its card is gone from Home behind the panel.
   Do: click "Save changes" at the bottom of the panel.
   Expect: the panel closes and a short message "Your Home layout is saved." shows.

13. Do: reload the page (F5, or Cmd+R on a Mac).
   Expect: Home shows the layout you saved: the widget you added is there, the one you removed is not.
   Do: click "My work" in the switch at the top right, look at the cards, then click "My agency" again.
   Expect: "My work" still shows the freelancer's own six cards (your agency changes are not there), and "My agency" still shows the layout you saved.

14. REVIEW of the Customize panel. Open it again with "Customize dashboard" and answer, without changing anything:
   a. Was it clear at once what the panel is for and that Home behind it previews your changes?
   b. Were "+ Add", the two arrow buttons, "Remove", "Restore default", "Cancel" and "Save changes" easy to find and to tell apart? Is it clear what each arrow does before you click it? (Hold the mouse over an arrow for two seconds and write what the small label says.)
   c. Is anything missing that you looked for (for example a way to undo one change, or a sign of which widgets are on by default)?
   d. Did anything in the panel overlap, get cut off, or need sideways scrolling?
   Then keyboard only, no mouse: click once on the title "Customize dashboard" in the panel, then press Tab up to 15 times.
   e. Does a clearly visible outline show which control has focus each time? Write the order of the first six controls that got focus.
   f. Press Tab until an arrow-up button in the second row has focus, then press Enter once. Did the row move up one place, and is focus still on a control in that same row?
   Do: click "Cancel" at the bottom of the panel.
   Expect: the panel closes and Home is as it was after step 13 (the move from f is not kept).

15. Find: the button "Customize dashboard" at the top right.
   Do: click it, click the underlined words "Restore default", then click "Save changes".
   Expect: the panel closes and the message "Home is back to the default layout." shows. Home has the six cards of step 9 again.

16. REVIEW of this Home (the agency owner, "My agency"). Scroll slowly from the top of the page to the bottom once, then answer. Give each lettered item a score from 1 (poor) to 5 (very good) and one or two sentences with the example you saw.
   a. First impression: in five seconds, can you tell what this page is for and what this person should do first?
   b. For each card, three questions: what is happening, why does it matter, what can I do next. Name every card that fails one of the three, and say which.
   c. Numbers and money: is every figure labeled with what it counts and its period (for example "this month")? Name any figure you could not explain. Name anything that looks invented or decorative (a percentage, score, star rating or trend with no explanation).
   d. Empty and low-data cards: where a card has little or nothing to show, does it say why and offer one sensible next step? Name any card with a large blank area.
   e. Visual order: do the most urgent things stand out? Is anything too loud, too faint, or repeated on the page?
   f. Wording: quote any label, sentence or button name that is unclear, too long, or uses a word a lawyer or paralegal would not know.
   g. Consistency: do the cards share the same heading style, spacing, link style ("... →") and button style? Name any that differ.
   h. Color and contrast: is any text hard to read against its background (name it and where)? Is anything shown by color alone, with no word or icon?
   i. Rings and bars: for each ring or bar chart on the page, is the same information also written in words and numbers next to it?
   j. Keyboard: click once on the page heading, then press Tab 20 times. Is focus always visible? Does it move in reading order? Did it ever get stuck or disappear? Could you open the "Customize dashboard" button with Enter?
   k. Zoom: press Ctrl and + (Cmd and + on a Mac) until the browser shows 200%. Does the page become one column without sideways scrolling, with no text or button cut off? Then press Ctrl and 0 (Cmd and 0) to go back to 100%.
   l. Click and tap targets: name any button or link that looks smaller than about 24 by 24 pixels or sits too close to another to click safely.

17. REVIEW of the switch and the agency figures (still on "My agency").
   a. Is it clear which of "My work" and "My agency" is on, without relying on color alone? Is it clear what each one means?
   b. In "Agency revenue and payments": are "Paid by clients" and "Paid out to agency" clearly two different things? Is either one called profit anywhere? Quote the sentence under them.
   c. In "Team workload and availability": is there any percentage of capacity? (There should be none.) Where hours are missing, does it say "Hours not set"? If a button "Ask to set hours" shows, do NOT click it; only say whether its purpose is clear.
   d. In "Active client projects" and "Needs team attention": for each row, can you tell which client, what is due, when, and who works on it? Is "Overdue" written as a word?

Sign out: click the round button with initials at the top right, then "Sign out".

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

18. Go to: https://www.lawfecta.co/dela?tab=home
   Find: the button "Customize dashboard" at the top right.
   Do: click it, click the underlined words "Restore default", then click "Save changes" if it is dark red, or "Cancel" if it is pale.
   Expect: Home shows "Your Workspace" with the cards "Needs your attention", "Things to consider delegating", "My projects and milestones", "Proposals and talent matches", "Delegation spend and results", "Ask DELA".
   Write into your report: the name of every card in reading order, and for each card one line of what it shows right now (numbers included). For "Delegation spend and results" write the amount in the ring, the lines beside it, and the results under it.

19. Find: the button "Customize dashboard" at the top right of the page.
   Do: click it.
   Expect: a white panel opens at the right and Home stays visible behind it. It has the title "Customize dashboard", a heading "Your dashboard (" with a number, the underlined words "Restore default", a list of rows, a heading "Available widgets" with a second list, and "Cancel" and "Save changes" at the bottom. Each row under "Your dashboard" has six small dots, an icon, the widget's name, a button with an arrow up, a button with an arrow down, and a button "Remove".
   Write into your report: the names under "Your dashboard" in order, and the names under "Available widgets".

20. Find: the first row under "Available widgets" and its button "+ Add".
   Do: click "+ Add". Write down which widget you added.
   Expect: the number after "Your dashboard" goes up by one, the widget is the last row of that list, and a card with that name shows on Home behind the panel.
   Do: in that widget's row under "Your dashboard", click the button with the arrow up twice.
   Expect: the row moves up two places, and the card on Home moves with it.

21. Find: the second row under "Your dashboard" and its button "Remove".
   Do: click "Remove". Write down which widget you removed.
   Expect: the row leaves the list and now shows under "Available widgets". Its card is gone from Home behind the panel.
   Do: click "Save changes" at the bottom of the panel.
   Expect: the panel closes and a short message "Your Home layout is saved." shows.

22. Do: reload the page (F5, or Cmd+R on a Mac).
   Expect: Home shows the layout you saved: the widget you added is there, the one you removed is not.

23. REVIEW of the Customize panel. Open it again with "Customize dashboard" and answer, without changing anything:
   a. Was it clear at once what the panel is for and that Home behind it previews your changes?
   b. Were "+ Add", the two arrow buttons, "Remove", "Restore default", "Cancel" and "Save changes" easy to find and to tell apart? Is it clear what each arrow does before you click it? (Hold the mouse over an arrow for two seconds and write what the small label says.)
   c. Is anything missing that you looked for (for example a way to undo one change, or a sign of which widgets are on by default)?
   d. Did anything in the panel overlap, get cut off, or need sideways scrolling?
   Then keyboard only, no mouse: click once on the title "Customize dashboard" in the panel, then press Tab up to 15 times.
   e. Does a clearly visible outline show which control has focus each time? Write the order of the first six controls that got focus.
   f. Press Tab until an arrow-up button in the second row has focus, then press Enter once. Did the row move up one place, and is focus still on a control in that same row?
   Do: click "Cancel" at the bottom of the panel.
   Expect: the panel closes and Home is as it was after step 22 (the move from f is not kept).

24. Find: the button "Customize dashboard" at the top right.
   Do: click it, click the underlined words "Restore default", then click "Save changes".
   Expect: the panel closes and the message "Home is back to the default layout." shows. Home has the six cards of step 18 again.

25. REVIEW of this Home (the attorney). Scroll slowly from the top of the page to the bottom once, then answer. Give each lettered item a score from 1 (poor) to 5 (very good) and one or two sentences with the example you saw.
   a. First impression: in five seconds, can you tell what this page is for and what this person should do first?
   b. For each card, three questions: what is happening, why does it matter, what can I do next. Name every card that fails one of the three, and say which.
   c. Numbers and money: is every figure labeled with what it counts and its period (for example "this month")? Name any figure you could not explain. Name anything that looks invented or decorative (a percentage, score, star rating or trend with no explanation).
   d. Empty and low-data cards: where a card has little or nothing to show, does it say why and offer one sensible next step? Name any card with a large blank area.
   e. Visual order: do the most urgent things stand out? Is anything too loud, too faint, or repeated on the page?
   f. Wording: quote any label, sentence or button name that is unclear, too long, or uses a word a lawyer or paralegal would not know.
   g. Consistency: do the cards share the same heading style, spacing, link style ("... →") and button style? Name any that differ.
   h. Color and contrast: is any text hard to read against its background (name it and where)? Is anything shown by color alone, with no word or icon?
   i. Rings and bars: for each ring or bar chart on the page, is the same information also written in words and numbers next to it?
   j. Keyboard: click once on the page heading, then press Tab 20 times. Is focus always visible? Does it move in reading order? Did it ever get stuck or disappear? Could you open the "Customize dashboard" button with Enter?
   k. Zoom: press Ctrl and + (Cmd and + on a Mac) until the browser shows 200%. Does the page become one column without sideways scrolling, with no text or button cut off? Then press Ctrl and 0 (Cmd and 0) to go back to 100%.
   l. Click and tap targets: name any button or link that looks smaller than about 24 by 24 pixels or sits too close to another to click safely.

26. REVIEW of the attorney's delegation cards.
   a. "Things to consider delegating": for each row, can you tell which document it comes from and why DELA suggests it? Is it clear that these are suggestions to review, and that nothing is posted or sent by clicking? Do NOT click a row.
   b. "Proposals and talent matches": are new proposals and recommended freelancers clearly two different things? For each freelancer shown, is the reason for the match written in words? Is there any match percentage or star rating? (There should be none.)
   c. "Delegation spend and results": is it clear what period the amounts cover and how to change it? Are "For the work" and "Platform fee" clear? Does anything claim hours saved or a return on investment? (Nothing should.)

Sign out: click the round button with initials at the top right, then "Sign out".

## Report

Write the report in this order:
1. One line per numbered step: the step number, PASS or FAIL (for REVIEW steps write DONE), and a few words. A screenshot only for FAIL lines.
2. For each of the three Homes (freelancer, agency owner, attorney): the card list you wrote down, then the scores a to l from its REVIEW step in a small table, then the three most important problems and the three things that work best.
3. The Customize panel: your answers a to f for each of the three roles, and whether the panel behaved the same in all three.
4. Accessibility findings, each with: where (role, card or control), what you saw, who it would hurt (keyboard, low vision, screen reader, touch), and how sure you are (saw it / likely / could not check).
5. A ranked list of at most 12 recommended changes for the whole dashboard, most valuable first. For each: the problem in one sentence, the change you suggest in one sentence, and the role it affects. Do not suggest features that need data the page does not show today.
6. Anything that took longer than 60 seconds, and every message on screen that confused you.
Add three screenshots: the freelancer Home (step 1), the agency Home (step 9) and the attorney Home (step 18).
