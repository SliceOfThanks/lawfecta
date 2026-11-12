# Claude test (track B): gigs, proposals, messages and meetings (Steps 4 and 5)

> Checked 2026-11-13 (new layout). Open point: the test still logs in as the attorney twice and the freelancer twice (groups 3 and 5). One login per account needs Claude to prepare the proposal, the conversation and the booked meeting on the test site first, and the gig, file and meeting names for that are not known here.

This replaces the separate Step 4 and Step 5 ChatGPT tests. Claude runs it in your own Chrome with the Claude in Chrome extension, at the same time as ChatGPT runs track A (documents and images). The two tracks use different documents and gigs, so they do not get in each other's way.

Claude already tested all of this with the real api and database: 12 api tests and 28 browser checks for gigs, 10 api tests and 17 browser checks for messages and meetings, both sides, mistakes and misuse. This test covers the real screens.

Before you paste this (about 5 minutes):
1. Upload the tech catalog (one time only; the test checks DELA uses it):
   1. Download the file: https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/data/tech-catalog/catalog-2026-11-05.csv (on that page, click the "Download raw file" button, the small arrow pointing down at the top right of the file box). Claude also sent it to you in chat.
   2. In Chrome, log in as the owner (stacey@lawfecta.com) at https://www.lawfecta.co/login and open https://www.lawfecta.co/dela-admin
   3. Open https://www.lawfecta.co/dela-admin?tab=catalog (this is "Tech catalog" in the menu on the left, under the heading "PLANS AND SETTINGS").
   4. In the first card on the page, titled "Upload a new catalog", click the file box (the "Choose File" button on the left of the dark red "Check the file" button), choose catalog-2026-11-05.csv, then click "Check the file".
   5. When the preview shows under the file box, click the dark red "Confirm and replace the catalog". Expect "The catalog is replaced".
   6. Sign out: click the button "Stacey Lake (owner)" at the top right of the page, then "Sign out", the last line in the menu that opens.
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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
9. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
10. Never type real client information. Use only the made-up details in the steps.
11. Report one line per step: the group and step number, PASS or FAIL, and a few words. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.

A gig page looks like this for the attorney: a small outlined "← All gigs" at the top left; the gig's title in large bold text with its status label (Draft, Open, Filled) at the right; a grey line with the budget, the closing date and the number of proposals; then a row of rounded view buttons: "Details", "Matches", "Questions", "Proposals (number)", "Files (number)", and "Agreement and work" once the gig is filled. The "Details" view has the cards "Public version" and "Budget, deadline and milestones", then the outlined "Save" and the dark red "Post the gig" below the second card. For the freelancer the small button at the top left says "← Work" and the page is one column of cards with no view buttons.

1. Attorney (I am logged in as the test attorney)

1. Approve the document this test uses.
   Go to: https://www.lawfecta.co/dela?tab=library
   Find: in the table of documents, the grey band row that starts "ENG | Engagement and onboarding", and under it the row "Send the welcome packet" with the small grey ID ENG-01 under the title. Use only this document; the other test uses others.
   Do: click that row. On the document page, if there is a green notice near the top starting "DELA moved this to the document standard", click its outlined button "The type is right". Then, in the card titled "Quality check" (right column), click the dark red "Approve".
   Expect: the status label next to the title says "Approved". If "Approve" is greyed out, report the items labelled "Required before approval" in that card and stop the test.

2. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card titled "Post a new gig", the first card on the page, under the heading "Projects".
   Do: if the card shows only a dark red "Start a new gig" button at its right, click it first. Then, in the dropdown "Document", choose "ENG-01 Send the welcome packet". Type 100 in "Budget from ($)" and 200 in "Budget to ($)". Click the dark red "Draft the gig with DELA" at the bottom of the card.
   Expect: within 60 seconds, a gig page with the card "Public version". Write down the gig's title (the large bold text at the top). This is "your gig" for the rest of the test.

3. Find: the card "Public version".
   Expect: DELA filled the boxes "Title", "The task", "Steps, one per line" and "Tools", with no client information.
   Do: in the box "The task", add the word Thanks at the end.

4. Find: the card "Budget, deadline and milestones" (below "Public version").
   Do: in "Deadline" pick a date next month. In "Milestones (private)" type Draft, press Enter, type Final. Then click the dark red "Post the gig" (below that card).
   Expect: a message that the smallest gig budget is $250, and the gig still a Draft.

5. Do: in the same card change "Budget from ($)" to 300 and "Budget to ($)" to 600, then click "Post the gig" again.
   Expect: a message starting "Your gig is open until", the status label "Open", and the "Matches" view.
   Report: what the "Matches" view lists (a fit label such as "Good fit" at the right of each name, and short reasons). It may say no one fits yet. There must be no percentages.

6. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the card titled "Find a freelancer" at the top (boxes "Practice area", "Skill", "Tech tool", the dropdown "State you need" and the dark red "Search"). Below it, one card per freelancer.
   Do: in the card of the test freelancer (DELA Test Freelancer), choose your gig in the dropdown to the right of the outlined "View profile", then click the dark red "Invite to this gig" next to it.
   Expect: a message "Invited ..." (or "Already invited").

7. Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs" (the third card, below "Needs your action"), click your gig. In the row of view buttons under the title, click "Files (0)". In the card "Files for this gig", click the outlined "Share a file from Files" at the bottom of the card, then the dark red "Share" at the right of any one file.
   Expect: that file listed in the card with "Access expires after" and a date. If there are no files, write "no files" and go on.

8. Sign out, then ask me to log in as the test freelancer.

2. Freelancer (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=profile
   Find: the card titled "Your availability for meetings" (the third card on the page, below the card "Your availability").
   Do, in that card, from the top: in "Time zone" choose my time zone (ask me which if unsure); under "Meeting lengths you offer" tick "30 minutes" and "45 minutes"; tick "Monday" to "Saturday", each with 09:00 to 17:00, and leave "Sunday" unticked; in "Days off" type next Wednesday's date as YYYY-MM-DD. Click the dark red "Save availability" at the bottom of the card.
   Expect: "Availability saved".

2. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: at the top, a green line like "5 of 5 proposals left this month."; then the cards "Your engagements (number)" (only when there is one), "Invitations (number)", "Matches (number)", "Drafts (number)", "Sent proposals (number)".
   Do: in the card whose heading starts "Invitations (", click your gig.
   Expect: the gig page with a green notice that starts "You are invited to send a proposal.", the public version (task, budget, deadline, steps, tools), a card titled "The work handed to you" with a small grey line under its heading naming who it is shared with and the same words as a faint watermark, and no card titled "Milestones".

3. Find: the card titled "Questions" (near the bottom).
   Do: type Which intake form do you use? in the box at the bottom of that card and click the outlined "Ask the attorney" under the box.
   Expect: "Question sent".
   Do: type Can you pay me on Venmo instead? and click "Ask the attorney".
   Expect: a message that starts "DELA is holding this for a quick check by the Lawfecta Team", and the question listed with "Being checked by the Lawfecta Team."

4. Find: the card titled "Your proposal" (the last card on the page).
   Do: click the outlined "✦ Let DELA help with qualifications", at the right of the label "Your relevant qualifications".
   Expect: within 60 seconds, the box "Your relevant qualifications" filled from the profile. Report anything DELA invented.
   Do: type 450 in "Total price ($)"; type Conflict check and welcome packet in "What your price includes"; type No court filings in "What it leaves out"; type Draft in 3 days, final 2 days later in "Schedule". Click the dark red "Send proposal (free: invited)" at the bottom right of the card twice quickly.
   Expect: one proposal in the card "Your proposal", with the label "Sent", $450 and the words "invited, did not use your allowance". If a pop-up appears instead, stop and ask me to click OK.

5. Go to: https://www.lawfecta.co/dela?tab=ai
   Find: the card titled "What DELA has learned about you" (scroll down, below the heading "AI and messages" and the card "What DELA knows about you").
   Report what it lists. Do: click the outlined "Remove" at the right of one item. Expect: the message "Removed", and the item goes away. If the card says "Nothing yet.", write that and go on.

6. Sign out, then ask me to log in as the test attorney.

3. Attorney again (ask me to log in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs" (the third card), click your gig. Then click the view button that starts "Questions" in the row under the title.
   Expect: only "Q: Which intake form do you use?" (not the Venmo one).
   Do: type We use our standard intake form in the answer box under it and click the dark red "Answer for everyone".
   Expect: "Answered for every applicant".

2. Do: click the view button "Proposals (1)".
   Expect: the card "Compare proposals" with a table: the columns "Freelancer", "Price" ($450 with the label "Within the budget"), "Includes", "Leaves out", "Schedule", "Qualifications", and at the right end of the row the dark red "Choose" and the outlined "Message".

3. Do: click "Message" at the right end of the freelancer's row.
   Expect: a conversation page with the freelancer's name as the heading and a grey line that starts "About the gig" and ends "Keep all work, contact and payment on Lawfecta."
   Do: in the box at the bottom of the page (its grey hint starts "Write a message."), type Can you start Monday? Our template is attached. Click the outlined "Attach a file" under the box, tick any file in the list that appears, then click the dark red "Send" at the right.
   Expect: the message in the conversation with the file name and "Open".

4. Do: type Or text me at 512-555-0199 and I will pay you directly and click "Send".
   Expect: a red message at the bottom of the screen that starts "DELA is holding this for a quick check by the Lawfecta Team".

5. Do: click the dark red "Book a meeting" in the row of buttons near the top of the conversation (to the right of the outlined "Open the gig").
   Expect: a card titled "Book a meeting" with a grey line that starts "Times are shown in your time zone", the dropdown "Length", the dropdown "Date" (each day with its number of open times), and under it a row of outlined time buttons. The "Date" list has no next Wednesday (the day off), no Sunday, and no time in the next 12 hours.
   Do: click one of the time buttons. Expect: the line "Selected:" with the day and time, and a dark red "Review booking" under it.
   Do (POP-UP): click "Review booking".
   Expect: the message "Booked. A confirmation is on its way to both of you.", and a page headed "Meeting" with the meeting in a card, the label "Time confirmed" at its right, and the grey line "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting."

6. Do: in that meeting's card, click the outlined "Add to my calendar (.ics)" (first button of the row at the bottom of the card).
   Expect: a calendar file downloads. Report its name.

7. Do: click "Inbox" at the right of the top bar.
   Expect: the heading "Inbox", the grey line "Every conversation is on a gig. Keep all work, contact and payment on Lawfecta.", and the conversation with DELA Test Freelancer listed.

8. Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs" (the third card), click your gig, then the view button "Proposals (1)".
   Do (POP-UP): click the dark red "Choose" at the right end of the freelancer's row.
   Expect: the message "Chosen. The draft agreement is waiting for signing and funding." and the gig's status label "Filled".

9. Go to: https://www.lawfecta.co/dela?tab=delegate (the "Ask DELA" page).
   Do: in the message box (its grey hint says "Type here, or press Talk and say it"), type Which practice management software should a solo family law firm use? and click the dark red "Send" at the right under the box.
   Expect: within 60 seconds, an answer that names only tools from the Lawfecta tech catalog (for example Clio, MyCase, PracticePanther, Smokeball, if they are in the catalog). Report the tools it named.

10. Go to: https://www.lawfecta.co/dela?tab=ai
    Find: the card titled "Messages" (far down the page, below the heading "AI and messages").
    Expect: one tick box whose text starts "Show "Seen" when I read a message". Report what it says. Do not change it.

11. Sign out, then ask me to log in as the owner.

4. Owner (ask me to log in as the owner)

1. Go to: https://www.lawfecta.co/dela-admin?tab=gigs ("Gigs" in the left menu, under the heading "MARKETPLACE").
   Find: the first card, whose heading starts "Held for a check (".
   Expect: the Venmo question with the label "payment outside Lawfecta" at its right, and the message with the phone number.
   Do: click the red "Do not deliver" on each of them (to the right of the dark red "It is fine: deliver it").
   Expect: "Not delivered; the member was told" each time.
   Expect, lower on the page: the card whose heading starts "Gigs (" listing your gig with the columns "Proposals" and "Matches", and the card "Proposals sent this month, by plan".

2. Go to: https://www.lawfecta.co/dela-admin?tab=meet ("Meetings and messages" in the left menu, under the heading "MARKETPLACE").
   Expect: the card "The last 30 days" with counts and a note that starts "Vectera is not connected yet", the card whose heading starts "Upcoming meetings (" with the meeting and "Waiting for Vectera" in the column "Room", and the card whose heading starts "Reports (".

3. Go to: https://www.lawfecta.co/dela-admin?tab=catalog ("Tech catalog" in the left menu, under the heading "PLANS AND SETTINGS").
   Find: the second card, whose heading starts "Tools in the catalog now (", with the tools in a table.
   Do (POP-UP): click the outlined "Pause" at the right end of the first tool's row.
   Expect: a message that the tool "is paused", and the label "Paused" in its "Status" column.
   Do: click the outlined "Resume" at the right end of the same row.
   Expect: a message that the tool "is active again", and the label "Active".

4. Sign out, then ask me to log in as the test freelancer.

5. Freelancer again (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=work
   Expect: in the card whose heading starts "Sent proposals (" (the last of the list cards), your gig with the label "Chosen". In the card whose heading starts "Your engagements (" (the first card), the gig with the label "Needs your signature". Do not sign it; the payments test does that later.

2. Do: click the bell (Notices) at the right of the top bar, between "Inbox" and the round button with the initials.
   Expect: a panel headed "Notices" with a notice that you were chosen for a gig. Close the panel with the outlined "Close" button at its top right.

3. Do: click "Inbox" at the right of the top bar (it shows a number), then click the conversation with DELA Test Attorney.
   Expect: the attorney's message with the file, and no message with a phone number.

4. Do: near the top of the conversation, in the row that starts with the outlined "Open the gig", click the words "✦ AI help". Then click the outlined "✦ Summarize" that appears.
   Expect: within 60 seconds, a short summary that ends "DELA's summary is for reading only. It does not change the gig, a proposal or an agreement."
   Do: at the bottom of the page, under the message box, click the outlined "✦ Draft a reply" (to the right of "Attach a file").
   Expect: within 60 seconds, the message "DELA drafted a reply. Check it, then Send." and a reply in the message box. Change one word and click the dark red "Send".

5. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the card of the booked meeting (its heading is the attorney's name and your gig, with the label "Time confirmed" at the right).
   Do: tick "I agree to this meeting being recorded or noted. Nothing is recorded unless both of you agree."
   Expect: "Saved. Nothing is recorded unless you both agree."
   Do: click the outlined "Change the time" (second button of the row at the bottom of the card).
   Expect: a card titled "Choose a new time" near the top of the page.
   Do: in its dropdown "Date" choose another day, click one of the time buttons, then (POP-UP) click the dark red "Review the new time".
   Expect: "Moved. One update went to both of you."

6. Sign out.

At the end: list every FAIL, every message that was confusing, and anything that took longer than 60 seconds.
