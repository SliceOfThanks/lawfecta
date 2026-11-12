# Claude test (track B recheck): the five failures and the confusing items

> Checked 2026-11-13 (new layout). Open point: the test attorney logs in twice (group 1 and group 3, where the attorney answers the question from group 2). One login per account needs Claude to prepare the freelancer's question and the moved meeting on the test site first.

The track B test found five failures and several confusing items. Claude fixed them and checked each fix with a test that failed before the fix. This short recheck covers them on the real site.

What was fixed:
- **"✦ Summarize" and "✦ Draft a reply" did nothing.** OpenAI refused the request because DELA asked for a JSON answer while asking for plain text. Fixed.
- **"Change the time" always said the time was taken.** The new time was checked against the meeting being moved. The new-time list also showed the current time. Both fixed, and choosing the same time is refused.
- **The freelancer's question was lost.** The page had switched to the owner's login, because www.lawfecta.co was opened as the owner in the same Chrome while the test ran. This was not a DELA error. See step 3 under "Before you paste this".
- **Smaller items:**
  - Meeting times stopped at 2:45 PM.
  - The freelancer saw "Where: [Add the menu path in your system]".
  - The gig said "1 proposals".
  - Engagements said "milestones accepted 0 of 0" before signing.
  - The admin table showed "fl_free".
  - The attorney's meeting page had no note about the meeting room.
  - DELA's AI wrote "Microsoft 365" into the qualifications and named Google Workspace.

Before you paste this:
1. Open a new Chrome tab at https://www.lawfecta.co/login and log in as the test attorney (stacey+dela-attorney@lawfecta.com, password in the ready-to-paste copy Claude sent you in chat).
2. Click the Claude icon at the top right of Chrome to open the Claude side panel.
3. Do not open www.lawfecta.co in any other Chrome tab or window until the test is done.
4. Paste everything below the line into the side panel and send it.
5. When Claude asks you to log in as another account, do it in the same tab, then type in the side panel: done, continue.

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
7. When a step says "Ask me to log in as ...", write that in the side panel and wait until I write done.
8. What every DELA page looks like:
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name and a small yellow "Test site" label on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
   - The admin area (https://www.lawfecta.co/dela-admin) has the same kind of menu on the left: "Release Control" and "Guide", then five headings in capital letters that open and close when clicked: "MEMBERS", "PLANS AND SETTINGS", "MARKETPLACE", "PAYMENTS", "SAFETY". At the top right is one button with the owner's name and "(owner)".
9. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens. To sign out of the admin area: click the button with the owner's name at the top right, then "Sign out", the last line.
10. Report one line per step: the group and step number, PASS or FAIL, and a few words. At the end, list every FAIL.

1. Attorney (I am logged in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Post a new gig", the first card on the page, under the heading "Projects".
   Do: if the card shows only a dark red "Start a new gig" button at its right, click it first. Then, in the dropdown "Document", choose "ENG-01 Send the welcome packet". Type 300 in "Budget from ($)" and 600 in "Budget to ($)". Click the dark red "Draft the gig with DELA" at the bottom of the card.
   Expect: within 60 seconds, the gig page. Write down its title (the large bold text at the top).
   Do: in the card "Budget, deadline and milestones" (the second card), pick a "Deadline" next month, then click the dark red "Post the gig" below that card.
   Expect: the status label "Open".

2. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: below the card "Find a freelancer", the card of DELA Test Freelancer.
   Do: in that card, choose the new gig in the dropdown to the right of the outlined "View profile", and click the dark red "Invite to this gig" next to it.
   Expect: "Invited DELA Test Freelancer".

3. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card whose heading starts "Engagements (", near the bottom of the page, below the card "Your gigs".
   Expect: the grey line of the engagement from the earlier test ends "milestones set when you both sign" (not "0 of 0").

4. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the booked meeting card (the label "Time confirmed" at its right).
   Expect: under the time, the grey line "Meeting room not connected yet. The link appears here once Lawfecta's meeting service is connected, and you both get it before the meeting."

5. Sign out, then ask me to log in as the test freelancer.

2. Freelancer (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=work
   Do: in the card whose heading starts "Invitations (", click the new gig.
   Find: the card "The work handed to you".
   Expect: no line that says "Where: [Add the menu path in your system]".

2. Find: the card "Questions" (near the bottom).
   Do: type Which intake form do you use? in the box at the bottom of that card and click the outlined "Ask the attorney" under the box.
   Expect: "Question sent", and the question listed with "Waiting for an answer."

3. Find: the card "Your proposal" (the last card).
   Do: click the outlined "✦ Let DELA help with qualifications", at the right of the label "Your relevant qualifications".
   Expect: within 60 seconds, the box "Your relevant qualifications" filled. Report any tool or software it names that the freelancer profile does not list (it should name none). Do not send the proposal.

4. Do: click "Inbox" at the right of the top bar, then the conversation from the earlier test.
   Do: near the top of the conversation, in the row that starts with the outlined "Open the gig", click the words "✦ AI help". Then click the outlined "✦ Summarize" that appears.
   Expect: within 60 seconds, a short summary.
   Do: at the bottom of the page, under the message box, click the outlined "✦ Draft a reply" (to the right of "Attach a file").
   Expect: within 60 seconds, a reply in the message box. You do not need to send it.

5. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the booked meeting card (the label "Time confirmed" at its right). Write down its day and time.
   Do: click the outlined "Change the time" (second button of the row at the bottom of the card).
   Expect: a card titled "Choose a new time" near the top of the page, with the dropdowns "Length" and "Date" and a row of outlined time buttons.
   Do: in "Date" choose the meeting's own day. If an outlined button that starts "Show more times (" is at the end of the row of times, click it.
   Expect: the meeting's own time is not in the list. The times run to 4:30 PM (for 30 minutes), not 2:45 PM.
   Do: click the time 15 minutes after the current meeting time (for example 10:15 AM if the meeting is at 10:00 AM). Then (POP-UP) click the dark red "Review the new time" that appears under the times.
   Expect: "Moved. One update went to both of you."

6. Sign out, then ask me to log in as the test attorney.

3. Check the results (the test attorney, then the owner)

1. Ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects
   Do: in the card "Your gigs" (the third card, below "Needs your action"), click the new gig. Then click the view button that starts "Questions" in the row under the gig's title.
   Expect: "Q: Which intake form do you use?". Type We use our standard intake form in the answer box under it and click the dark red "Answer for everyone". Expect: "Answered for every applicant".
   Expect: the grey line under the gig title says "0 proposals" or "1 proposal" (never "1 proposals").

2. Go to: https://www.lawfecta.co/dela?tab=meetings
   Expect: the meeting card shows the new time, followed by "| new time" on the same line.

3. Go to: https://www.lawfecta.co/dela?tab=delegate (the "Ask DELA" page).
   Do: type Which practice management software should a solo family law firm use? in the message box (its grey hint says "Type here, or press Talk and say it") and click the dark red "Send" at the right under the box.
   Expect: an answer that names only tools from the Lawfecta tech catalog, with no other product (for example no Google Workspace).

4. Sign out, then ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela-admin?tab=gigs ("Gigs" in the left menu, under the heading "MARKETPLACE").
   Find: the card "Proposals sent this month, by plan", the last card on the page.
   Expect: the column "Plan" says "Freelancer Free" (not "fl_free").

5. Sign out (the button with the owner's name at the top right, then "Sign out").

At the end: list every FAIL.
