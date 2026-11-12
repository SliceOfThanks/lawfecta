# Claude test (track B recheck): the five failures and the confusing items

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

The track B test found five failures and several confusing items. Claude fixed them and checked each fix with a test that failed before the fix. This short recheck covers them on the real site.

What was fixed:
- **"✦ Summarize" and "✦ Draft a reply" did nothing.** OpenAI refused the request because DELA asked for a JSON answer while asking for plain text. Fixed.
- **"Change the time" always said the time was taken.** The new time was checked against the meeting being moved. The new-time list also showed the current time. Both fixed, and choosing the same time is refused.
- **The freelancer's question was lost.** The page had switched to the owner's login, because www.lawfecta.co was opened as the owner in the same Chrome while the test ran. This was not a DELA error. See step 6 under "Before you paste this".
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
8. What every DELA page looks like: a dark bar at the top (logo on the left; "Inbox", "Notices" and a round button with the initials on the right), a menu on the left under it, and white cards with bold headings.
9. To sign out: click the round button with the initials at the far right of the top bar, then "Sign out", the last line in the menu.
10. Report one line per step: the group and step number, PASS or FAIL, and a few words. At the end, list every FAIL.

1. Attorney (I am logged in as the test attorney)

1. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Post a new gig" (middle of the page).
   Do: in the dropdown "Document" choose "ENG-01 Send the welcome packet". Type 300 in "Budget from ($)" and 600 in "Budget to ($)". Click the blue "Draft the gig with DELA".
   Expect: within 60 seconds, the gig page. Write down its title.
   Do: in the card "Budget, deadline and milestones", pick a "Deadline" next month, then click the blue "Post the gig" below that card.
   Expect: the status label "Open".

2. Go to: https://www.lawfecta.co/dela?tab=talent
   Do: in the card of DELA Test Freelancer, choose the new gig in the dropdown and click the blue "Invite to this gig".
   Expect: "Invited DELA Test Freelancer".

3. Go to: https://www.lawfecta.co/dela?tab=projects
   Find: the card "Engagements" near the top.
   Expect: the engagement from the earlier test shows "milestones set when you both sign" (not "0 of 0").

4. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the booked meeting card.
   Expect: under the time, the line "The meeting room link appears here once Lawfecta's meeting service is connected."

5. Sign out, then ask me to log in as the test freelancer.

2. Freelancer (ask me to log in as the test freelancer)

1. Go to: https://www.lawfecta.co/dela?tab=work
   Do: in the card "Invitations", click the new gig.
   Find: the card "The work handed to you".
   Expect: no line that says "Where: [Add the menu path in your system]".

2. Find: the card "Questions" (near the bottom).
   Do: type Which intake form do you use? and click the outlined "Ask the attorney".
   Expect: "Question sent", and the question listed with "Waiting for an answer."

3. Find: the card "Your proposal" (the last card).
   Do: click the outlined "✦ Let DELA help with qualifications".
   Expect: within 60 seconds, the box filled. Report any tool or software it names that the freelancer profile does not list (it should name none). Do not send the proposal.

4. Do: click "Inbox" in the top bar, then the conversation from the earlier test.
   Do: click the outlined "✦ Summarize" near the top of the conversation.
   Expect: within 60 seconds, a short summary.
   Do: click the outlined "✦ Draft a reply".
   Expect: within 60 seconds, a reply in the message box. You do not need to send it.

5. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the booked meeting card. Write down its day and time.
   Do: click the outlined "Change the time".
   Expect: a card "Choose a new time". On the meeting's day, the meeting's own time is not in the list. The times run to 4:30 PM (for 30 minutes), not 2:45 PM.
   Do (POP-UP): click the time 15 minutes after the current meeting time (for example 10:15 AM if the meeting is at 10:00 AM).
   Expect: "Moved. One update went to both of you."

6. Sign out, then ask me to log in as the test attorney.

3. Check the results (the test attorney, then the owner)

1. Ask me to log in as the test attorney.
   Go to: https://www.lawfecta.co/dela?tab=projects and click the new gig in the card "Your gigs".
   Do: click the view tab "Questions".
   Expect: "Which intake form do you use?". Type We use our standard intake form in the answer box and click "Answer for everyone". Expect: "Answered for every applicant".
   Expect: the grey line under the gig title says "0 proposals" or "1 proposal" (never "1 proposals").

2. Go to: https://www.lawfecta.co/dela?tab=meetings
   Expect: the meeting shows the new time and "new time".

3. Go to: https://www.lawfecta.co/dela?tab=delegate (the "✦ Ask DELA" tab).
   Do: type Which practice management software should a solo family law firm use? in the box at the bottom and send it.
   Expect: an answer that names only tools from the Lawfecta tech catalog, with no other product (for example no Google Workspace).

4. Sign out, then ask me to log in as the owner.
   Go to: https://www.lawfecta.co/dela-admin and click the tab "Gigs".
   Find: the card "Proposals sent this month, by plan".
   Expect: the plan column says "Freelancer Free" (not "fl_free").

5. Sign out.

At the end: list every FAIL.
