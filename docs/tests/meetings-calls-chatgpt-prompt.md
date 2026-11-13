# ChatGPT test: calls before a gig, the meeting room and transcripts (steps 23 to 26, 2026-11-13)

What it covers: an introductory call before a gig (booking, the meeting card, the call shown in its conversation), the meeting room inside DELA on VideoSDK up to the camera check (the "Before you join" panel, the transcript tick box, the top bar), pictures in the Inbox and on meeting cards, and the team's new cards (VideoSDK connected, flagged transcripts, firm logos). Three logins (freelancer, attorney, owner), 16 steps. Every step opens its page by a link.

What it cannot cover: a real video call. That needs two people with cameras at the same time; Stacey does it by hand from two browser windows. An agent's browser has no camera, so each room visit here stops at the camera check and leaves.

What changes on the site: the test attorney books one introductory call with the sample freelancer Hannah Kim (Claude cancels it afterwards) and ticks the transcript box for the prepared test meeting. Nothing is paid, signed or posted, and no message is sent.

What Claude prepared on the site (2026-11-13): one confirmed introductory call between the test attorney ("DELA Test Attorney", firm "Example Lantern Legal") and the test freelancer ("DELA Test Freelancer"), with its room open until 2026-11-16, and nobody's transcript box ticked. Its start time has passed (so the room is open), which is why the card also asks "Did the meeting happen?". Run this test before 2026-11-16, or tell Claude so the meeting is prepared again.

Before you paste this:
1. The passwords are filled in on the ready-to-paste copy Claude sent you in chat. This GitHub copy says TEST_PASSWORD.
2. Each time ChatGPT reaches the login page: click "Take over", log in with the account it names, hand control back and type: I'm logged in, continue.
3. Don't use www.lawfecta.co in other tabs while it runs.

Paste everything below the line into ChatGPT in agent mode.

---

You are checking meetings and calls in DELA on the Lawfecta site, www.lawfecta.co. Everything here uses test accounts. Do only what the steps say. Do not post a gig, do not pay, do not sign, do not type a message to anyone. Your browser has no camera or microphone: when the page or the browser asks for them, choose Block or Cancel and carry on with the step.

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
   - A menu down the left side of the page, with a small picture and a name on each line. Freelancers see "Home", "Work", "Ask DELA", "Earnings", then "Profile" and "Subscription" (and "Agency" on some accounts), and at the bottom "Settings", "Help" and "Collapse sidebar". Attorneys see "Home", "Projects", "Ask DELA", "Library", then "Talent", "Files", "Get set up", "Profile", "Subscription", and at the bottom "Settings", "Help" and "Collapse sidebar". The page you are on is pink with a dark red line at its left.
   - A light bar across the top of the page, to the right of the menu: the page name on the left; on the right an "Inbox" button, a bell (Notices) and a round dark red button with your initials.
   - There is no row of tabs across the top.
   - The page is made of white boxes called cards. Each card has a bold heading at its top left. Steps say "in the card titled ...".
   - Dark red buttons are the main actions. Outlined buttons and underlined dark red words are the other actions. Grey text is a hint.
   - Messages after you click appear for a few seconds in a small box at the bottom of the screen.
7. To sign out of the member area: click the round button with your initials at the far right of the top bar, then click "Sign out", the last line in the menu that opens.
8. The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.
9. Never type real client information.
10. Report one line per step: the step number, PASS or FAIL, and a few words. Add a screenshot only to FAIL lines. At the end, list every FAIL, every message that was confusing, and anything that took longer than 60 seconds. Then put the whole report (every step line, the FAIL list and the notes) in a plain text file named DELA-test-report.txt and give me a link to download it.

## Part 1: test freelancer

Log in as the test freelancer: go to https://www.lawfecta.co/login and ask me to log in as the test freelancer.

1. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the page "Your meetings", then the card whose heading ends with "Introductory call". Its heading starts with "Example Lantern Legal".
   Expect: at the left of the heading a small round picture or a small round circle with a letter; the status "Time confirmed"; the sentence "An introductory call before any gig. Nobody is hired by it."; a dark red button "Join the meeting"; a button "Open the conversation"; a line "Attendance:"; a box that asks "Did the meeting happen?" (leave it alone); and a small link "Report this meeting" (it may be missing until the next release; write whether you see it, and do not click it). There is no button named "Create a gig for".

2. Find: the dark red button "Join the meeting" on that card.
   Do: click it.
   Expect: the whole window turns dark with a bar across the top. In the bar: a line starting "Lawfecta meeting:", the line "Keep all work, contact and payment on Lawfecta.", the line "To share links or files, use your DELA messages.", a rounded label "This meeting is not being transcribed", and a white button "Leave and go back to DELA". There is no button "Stop transcript". Under the bar a white panel titled "Before you join".

3. Find: the white panel "Before you join".
   Expect: a tick box, not ticked, with the words "Transcribe this meeting (no video or audio is kept)"; the sentence "DELA's AI reads the transcript to write a summary and next steps, and to check for payment talk outside Lawfecta."; a grey paragraph that says the meeting is transcribed only when both tick the box and that the transcript is deleted 90 days after the meeting; and a dark red button "Continue to the camera and microphone check".
   Do: leave the box unticked. Click "Continue to the camera and microphone check".
   Expect: the white panel goes away and a meeting screen loads under the top bar (it may show a camera preview area, a name, and a join button, or a message that the camera is blocked). Write in your report what you see there, in one line. The top bar still reads "This meeting is not being transcribed". If the browser asks for the camera or microphone, choose Block.

4. Find: the white button "Leave and go back to DELA" at the right of the top bar.
   Do: click it. Do not click any join button inside the meeting screen.
   Expect: the dark layer is gone and "Your meetings" shows again with the same card.

5. Find: the button "Open the conversation" on that card.
   Do: click it.
   Expect: a conversation page with a card "Who you are talking with" (the name "DELA Test Attorney", "✓ Verified", the firm "Example Lantern Legal") and a green-edged line that starts "An introductory call is booked for" with a link "Open the meeting". There is no button "Book a call" (only the attorney books).

Sign out (rule 7).

## Part 2: test attorney

Log in as the test attorney: go to https://www.lawfecta.co/login and ask me to log in as the test attorney.

6. Go to: https://www.lawfecta.co/dela?tab=meetings
   Find: the card headed "DELA Test Freelancer: Introductory call".
   Expect: a small round picture at the left of the heading, a drawing on a light pink circle; the buttons "Open the conversation" and "Create a gig for DELA Test Freelancer"; "Join the meeting".

7. Do: click "Join the meeting" on that card. In the white panel "Before you join", tick the box "Transcribe this meeting (no video or audio is kept)". Click "Continue to the camera and microphone check". If the browser asks for the camera or microphone, choose Block.
   Expect: the top bar reads "This meeting is not being transcribed" (only one of the two people has ticked the box, so nothing is transcribed) and there is no "Stop transcript" button.
   Do: click "Leave and go back to DELA".
   Expect: back on "Your meetings", with the same card.

8. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the card for "DELA Test Freelancer" (use Ctrl+F for the name). Click "View profile" on it. At the right of the profile header click "Book a call".
   Expect: the conversation with DELA Test Freelancer opens. It shows the green-edged line "An introductory call is booked for" with "Open the meeting", and there is NO button "Book a call": one call at a time per conversation.

9. Go to: https://www.lawfecta.co/dela?tab=talent
   Find: the card for "Hannah Kim" (use Ctrl+F for the name; if it is not in the first 10, click "Load more freelancers" at the bottom of the list first). Click "View profile" on it.
   Expect: at the right of the profile header the buttons "☆ Bookmark", "Send message" and "Book a call".
   Do: click "Book a call".
   Expect: a conversation page headed "Hannah Kim" with a card titled "Book an introductory call". In it a pink note that starts "An introductory call is a first conversation. It hires nobody", a list "Length", a list "Date" and a row of time buttons.

10. Find: the row of time buttons in the card "Book an introductory call".
    Do: click the first time button. A box "Selected:" appears with a button "Review booking". Click "Review booking". A browser pop-up asks to confirm the booking; choose OK.
    Expect: a page with one meeting card headed "Hannah Kim: Introductory call" with the status "Time confirmed", the sentence "An introductory call before any gig. Nobody is hired by it.", and the buttons "Open the conversation" and "Create a gig for Hannah Kim". Copy into your report any line on the card about the meeting room or about joining. Do not click "Cancel".

11. Do: click "Open the conversation" on that card.
    Expect: the conversation with Hannah Kim, with the green-edged line "An introductory call is booked for" and "Open the meeting", and no button "Book a call".

12. Go to: https://www.lawfecta.co/dela?tab=inbox
    Find: the list of conversations.
    Expect: each row has a small round picture or a small round circle with a letter between the count and the name. The row for "DELA Test Freelancer" has a drawing on a light pink circle. Rows for an introduction read "Introduction from" in the grey line.

13. Go to: https://www.lawfecta.co/dela?tab=profile
    Find: the card "Firm details" near the top of the page.
    Expect: at the top of the card a dashed square that says "Logo" (or a logo picture), the button "Add a logo" (or "Change logo" and "Remove logo"), and the grey line "PNG or JPG. A square or wide logo on a plain background works best." Do not upload anything.

Sign out (rule 7).

## Part 3: owner (admin area)

Log in as the owner: go to https://www.lawfecta.co/login and ask me to log in as the owner.

14. Go to: https://www.lawfecta.co/dela-admin?tab=meet
    Find: the page "Meetings and messages".
    Expect: a sentence that starts "VideoSDK is connected: DELA makes a meeting room for each booking". In the card "Upcoming meetings", rows named "Introductory call" with "Ready" in the "Room" column. Copy the sentence about VideoSDK into your report, word for word.

15. Find: on the same page, the card titled "Meeting transcripts flagged by DELA's AI".
    Expect: a grey paragraph that says opening a transcript is written to the meeting's record each time, and either "No transcript has been flagged." or a list of flagged meetings. Do not open any transcript.

16. Go to: https://www.lawfecta.co/dela-admin?tab=people
    Find: scroll to the bottom of the page, the card titled "Firm logos".
    Expect: a grey paragraph about removing a logo only when it is offensive, misleading or not the firm's own, and either "No firm has uploaded a logo yet." or a table with a "Remove logo" button on each row. Do not remove anything.

Sign out: click the button with the owner's name at the top right, then "Sign out", the last line.
