# Claude test (track B): gigs, proposals, messages and meetings (Steps 4 and 5)

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

This replaces the separate Step 4 and Step 5 ChatGPT tests. Claude runs it in your own Chrome with the Claude in Chrome extension, at the same time as ChatGPT runs track A (documents and images). The two tracks use different documents and gigs, so they do not get in each other's way.

Claude already tested all of this with the real api and database: 12 api tests and 28 browser checks for gigs, 10 api tests and 17 browser checks for messages and meetings, both sides, mistakes and misuse. This test covers the real screens.

Before you paste this (about 5 minutes):
1. Upload the tech catalog (one time only; the test checks DELA uses it):
   1. Download the file: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/data/tech-catalog/catalog-2026-11-05.csv (on that page, click the "Download raw file" button, the small arrow pointing down at the top right of the file box). Claude also sent it to you in chat.
   2. In Chrome, log in as the owner (stacey@lawfecta.com) at https://www.lawfecta.co/login and open https://www.lawfecta.co/dela-admin
   3. In the menu on the left near the top, click "Tech catalog".
   4. In the card at the top, click the file box under "Tech catalog CSV", choose catalog-2026-11-05.csv, then click "Check the file".
   5. When the preview shows, click "Confirm and replace the catalog". Expect "The catalog is replaced".
   6. Sign out: click your initials at the top right, then "Sign out".
2. Install Claude in Chrome if you have not: open https://claude.ai/chrome in Chrome, click "Add to Chrome", then sign in with your Claude account when it asks.
3. Open a new Chrome tab at https://www.lawfecta.co/login and log in as the test attorney (stacey+dela-attorney@lawfecta.com, password in the ready-to-paste copy Claude sent you in chat).
4. Click the Claude icon at the top right of Chrome (in the toolbar, or under the puzzle-piece icon) to open the Claude side panel. If Claude asks to allow www.lawfecta.co, allow it.
5. Paste everything below the line into the Claude side panel and send it.
6. While the test runs, do not open www.lawfecta.co in any other Chrome tab or window. A page load there switches the login for every tab, and the test's actions go out as the wrong person. A separate Chrome profile for Claude tests avoids this.
7. During the test Claude asks you to do two kinds of things. Do them in the same Chrome tab, then type in the side panel: done, continue.
   - Log in as another account. Claude cannot pass the login check (reCAPTCHA).
   - Choose a file from your computer.

Paste everything below the line into the Claude side panel.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co, in my Chrome. I am logged in as the test attorney.

Logins (I type them myself when you ask):
- test attorney: stacey+dela-attorney@lawfecta.com
- test freelancer: stacey+dela-freelancer@lawfecta.com
- owner: stacey@lawfecta.com

HOW TO WORK (read this first; it saves time and credits)
1. Do only the numbered steps below, in order. Do not explore, do not open other menus, and do not look for other features. Work in one tab.
2. When a step says "Go to", put that link in the address bar. Do not get there by clicking around.
3. Every button, box and link is named in quotes, exactly as the screen writes it, with where it is. First scroll to the card heading the step names, then look for the item.
4. If you cannot see it after scrolling to that heading, read the page text once to find it. If it is still not there, take one screenshot, write FAIL for that step with what you saw, and go on to the next step. Never try more than this one other way.
5. When a step says DELA is writing or checking, wait up to 60 seconds without clicking anything else.
6. A button marked (POP-UP) opens a browser "OK / Cancel" pop-up, which your browser cancels by itself. Before clicking it, run this in the page so it answers OK on its own: window.confirm = () => true; window.prompt = () => "Test". Then click the button.
7. When a step says "Ask me to log in as ...", write that in the side panel and wait until I write done. The login page has a check you cannot pass.
8. What every DELA page looks like:
   - A dark bar across the very top: the Lawfecta logo and a small yellow "Test site" label on the left; on the right, an "Inbox" button, a "Notices" button and a round button with the person's initials.
   - Just under the dark bar, a menu on the left. Attorneys see "⌂ Home", "✦ Ask DELA", "▥ Library", "▤ Files", "▣ Projects", "◌ Talent". Freelancers see "⌂ Home", "✦ Ask DELA", "☺ Profile", "▣ Work", "$ Earnings".
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Blue buttons are the main actions. Outlined buttons (white with a dark pink border) are the other actions. Grey text is a hint.
   - Messages after a click appear for a few seconds in a small box at the bottom of the screen.
9. To sign out: click the round button with the initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
10. Never type real client information. Use only the made-up details in the steps.
11. Report one line per step: the group and step number, PASS or FAIL, and a few words. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.

A gig page looks like this: a small outlined "← All gigs" at the top left; the gig's title in large bold text with its status label (Draft, Open, Filled) at the right; then a row of view tabs: "Details", "Matches", "Questions", "Proposals (number)", "Files (number)", "Agreement and work". The "Details" view has the cards "Public version" and "Budget, deadline and milestones", then the buttons "Save" and "Post the gig" below the second card.

1. Attorney (I am logged in as the test attorney)

1. Approve the document this test uses.
   Go to: https://www.lawfecta.co/dela?tab=library
   Find: the table under the heading "ENG | Engagement and onboarding", the row with ID ENG-01, "Send the welcome packet". Use only this document; the other test uses others.
   Do: click that row. On the document page, if there is a green notice near the top starting "DELA moved this...", click its outlined button "The type is right". Then, in the card titled "Quality check" (right column), click the blue "Approve".
   Expect: the status label next to the title says "Approved". If "Approve" is greyed out, report the items marked "Blocking" in that card and stop the test.

2. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card titled "Post a new gig" (in the middle of the page, under "Engagements" if that card is there).
   Do: in the dropdown "Document" choose "ENG-01 Send the welcome packet". Type 100 in "Budget from ($)" and 200 in "Budget to ($)". Click the blue "Draft the gig with DELA" at the bottom of the card.
   Expect: within 60 seconds, a gig page with the card "Public version". Write down the gig's title (the large bold text at the top). This is "your gig" for the rest of the test.

3. Find: the card "Public version".
   Expect: DELA wrote a title, "The task", "Steps, one per line" and "Tools", with no client information.
   Do: in the box "The task", add the word Thanks at the end.

4. Find: the card "Budget, deadline and milestones" (below "Public version").
   Do: in "Deadline" pick a date next month. In "Milestones (private)" type Draft, press Enter, type Final. Then click the blue "Post the gig" (below that card).
   Expect: a message that the smallest gig budget is $250, and the gig still a Draft.

5. Do: in the same card change "Budget from ($)" to 300 and "Budget to ($)" to 600, then click "Post the gig" again.
   Expect: a message starting "Your gig is open until", the status label "Open", and the "Matches" view.
   Report: what the "Matches" view lists ("Good fit" or "Fair fit" labels and short reasons). It may say no one fits yet. There must be no percentages.

6. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the search card at the top ("Practice area", "Skill", "Tech tool", "State you need (two letters)", "Search"). Below it, one card per freelancer.
   Do: in the card of the test freelancer (DELA Test Freelancer), choose your gig in the dropdown, then click the blue "Invite to this gig" next to it.
   Expect: a message "Invited ..." (or "Already invited").

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs" (lower on the page), click your gig. In the row of view tabs under the title, click "Files (0)". Click the outlined "Share a file from Files", then the outlined "Share" next to any one file.
   Expect: that file listed. If there are no files, write "no files" and go on.

8. Sign out, then ask me to log in as the test freelancer.

2. Freelancer (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card titled "Your availability for meetings" (near the top, below the card "Your availability").
   Do, in that card, from the top: in "Time zone" choose my time zone (ask me which if unsure); tick "30 minutes" and "45 minutes"; tick Monday to Saturday with 09:00 to 17:00; in "Days off" type next Wednesday's date as YYYY-MM-DD. Click the blue "Save availability" at the bottom of the card.
   Expect: "Availability saved".

2. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: at the top, a line like "5 of 5 proposals left this month"; then the cards "Your engagements", "Invitations (number)", "Matches", "Drafts", "Sent proposals".
   Do: in the card "Invitations", click your gig.
   Expect: the gig page with the public version (task, budget, deadline, steps, tools), a card titled "The work handed to you" with a faint "Shared with ..." watermark, and no milestones.

3. Find: the card titled "Questions" (near the bottom).
   Do: type Which intake form do you use? in its box and click the outlined "Ask the attorney".
   Expect: "Question sent".
   Do: type Can you pay me on Venmo instead? and click "Ask the attorney".
   Expect: a message that DELA is holding it for a check by the Lawfecta Team.

4. Find: the card titled "Your proposal" (the last card on the page).
   Do: click the outlined "✦ Let DELA help with qualifications".
   Expect: within 60 seconds, the qualifications box filled from the profile. Report anything DELA invented.
   Do: type 450 in "Your total price ($)"; type Conflict check and welcome packet in "What your price includes"; type No court filings in "What it leaves out"; type Draft in 3 days, final 2 days later in "Schedule". Click the blue "Send proposal (free: invited)" twice quickly.
   Expect: one proposal, marked "Sent", with a line that it did not use your allowance. If a pop-up appears instead, stop and ask me to click OK.

5. Go to: https://www.lawfecta.co/dela?tab=ai
   Find: the card titled "What DELA has learned about you" (scroll down).
   Report what it lists. Do: click "Remove" on one item. Expect: it goes away.

6. Sign out, then ask me to log in as the test attorney.

3. Attorney again (ask me to log in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=projects and click your gig in the card "Your gigs".
   Do: click the view tab "Questions".
   Expect: only "Which intake form do you use?" (not the Venmo one).
   Do: type We use our standard intake form in the answer box under it and click "Answer for everyone".
   Expect: "Answered for every applicant".

2. Do: click the view tab "Proposals (1)".
   Expect: a table with the freelancer, "Price" 450, "Within the budget", "Includes", "Leaves out", "Schedule", "Qualifications", and at the right end of the row the buttons "Choose" and "Message".

3. Do: click "Message" at the right end of the freelancer's row.
   Expect: a conversation page with the grey line "Every conversation is on a gig. Keep all work, contact and payment on Lawfecta."
   Do: in the box at the bottom ("Write a message..."), type Can you start Monday? Our template is attached. Click the outlined "Attach a file", tick any file, then click the blue "Send".
   Expect: the message in the conversation with the file name and "Open".

4. Do: type Or text me at 512-555-0199 and I will pay you directly and click "Send".
   Expect: a red note that DELA is holding it for a check by the Lawfecta Team.

5. Do: click the blue "Book a meeting" in the row of buttons near the top of the conversation.
   Expect: "Book a meeting" with a "Length" choice and open times grouped by day, in my time zone. No times on next Wednesday (the day off), none on Sunday, none in the next 12 hours.
   Do (POP-UP): click one of the times.
   Expect: "Your meetings" with the meeting marked "Booked", and a note that the meeting room link appears once Lawfecta's meeting service is connected.

6. Do: on that meeting, click the outlined "Add to my calendar (.ics)".
   Expect: a calendar file downloads. Report its name.

7. Do: click "Inbox" in the top bar.
   Expect: the conversation listed.

8. Go to: https://www.lawfecta.co/dela?tab=projects, click your gig, then the view tab "Proposals (1)".
   Do (POP-UP): click "Choose" at the right end of the freelancer's row.
   Expect: the gig's status label "Filled".

9. Go to: https://www.lawfecta.co/dela?tab=delegate (the "✦ Ask DELA" tab).
   Do: in the message box at the bottom, type Which practice management software should a solo family law firm use? and send it.
   Expect: within 60 seconds, an answer that names only tools from the Lawfecta tech catalog (for example Clio, MyCase, PracticePanther, Smokeball, if they are in the catalog). Report the tools it named.

10. Go to: https://www.lawfecta.co/dela?tab=ai
    Find: the card titled "Messages".
    Expect: a setting about "Seen". Report what it says.

11. Sign out, then ask me to log in as the owner.

4. Owner (ask me to log in as the owner)

1. Go to: https://www.lawfecta.co/dela-admin?tab=gigs ("Gigs" in the left menu, under the heading "MARKETPLACE").
   Find: the card "Held for a check" at the top.
   Expect: the Venmo question labelled "payment outside Lawfecta" and the message with the phone number.
   Do: click the red "Do not deliver" on each of them.
   Expect: "Not delivered; the member was told" each time.
   Expect, lower on the page: the card "Gigs" listing your gig with its proposals and matches, and "Proposals sent this month, by plan".

2. Go to: https://www.lawfecta.co/dela-admin?tab=meet ("Meetings and messages" in the left menu, under the heading "MARKETPLACE").
   Expect: "The last 30 days" with counts, a note that Vectera is not connected yet, "Upcoming meetings" with the meeting marked "Waiting for Vectera", and "Reports".

3. Go to: https://www.lawfecta.co/dela-admin?tab=catalog ("Tech catalog" in the left menu, under the heading "PLANS AND SETTINGS").
   Expect: "Tools in the catalog now" with the tools listed.
   Do (POP-UP): click "Pause" on the first tool.
   Expect: that tool shows "Paused".
   Do: click "Resume" on the same tool.
   Expect: it is active again.

4. Sign out, then ask me to log in as the test freelancer.

5. Freelancer again (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: in the card "Sent proposals", your gig marked "Chosen". In the card "Your engagements", the gig with "Needs your signature". Do not sign it; the payments test does that later.

2. Do: click the bell (Notices) at the right of the top bar.
   Expect: a notice that you were chosen for a gig. Close the Notices panel with its "Close" button at the top.

3. Do: click "Inbox" in the top bar (it shows a number), then click the conversation.
   Expect: the attorney's message with the file, and no message with a phone number.

4. Do: click the outlined "✦ Summarize" near the top of the conversation.
   Expect: a short summary marked as reading only.
   Do: click the outlined "✦ Draft a reply". Expect: a reply in the box at the bottom. Change one word and click "Send".

5. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the booked meeting.
   Do: tick "I agree to this meeting being recorded or noted. Nothing is recorded unless both of you agree."
   Expect: "Saved".
   Do: click the outlined "Change the time". Choose another day.
   Do (POP-UP): click one of the new times.
   Expect: "Moved. One update went to both of you."

6. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
