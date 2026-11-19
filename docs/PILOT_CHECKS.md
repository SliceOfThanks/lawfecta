# Things to confirm during the pilot

Started 2026-11-13 (Stacey: "add an ongoing document on things we need to confirm work during the pilot"). This is a running list. Each line is something that is built and tested by Claude's own tests, but has not yet been seen working for real, with real people or a real outside service. Add a line whenever something is released that only real use can prove. When a line is confirmed, fill in the date and what was seen; do not delete it.

How to read the "State" column:
- Not yet: nobody has seen it work for real.
- Part: some of it was seen; the note says what is left.
- Confirmed: seen working for real, with the date.
- Problem: it was tried and did not work; the note says what happened.

## 1. Meetings and calls (VideoSDK)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 1.1 | DELA makes a meeting room at VideoSDK with Lawfecta's keys | The meeting's room reads "Ready" in the admin area, "Meetings and messages" | Confirmed 2026-11-13 | First room made on the first try for the test meeting. |
| 1.2 | One person can enter the room from "Join the meeting" | VideoSDK reports "joined" for that person and DELA records it | Confirmed 2026-11-13 | The test attorney joined for 20 seconds; the report arrived and passed both security checks. |
| 1.3 | Two people join the same meeting and see and hear each other | Both say so, and the meeting's record shows two "joined" entries and attendance "evidence received" | Not yet | Needs two people at the same time (two browser windows, or two real members). |
| 1.4 | With both boxes ticked, the meeting is transcribed and the top bar says so | The top bar reads "This meeting is being transcribed" during the call | Not yet | VideoSDK's live transcription has never run for real here. |
| 1.5 | After the call, the transcript arrives in DELA | A "Transcript" box shows on the meeting card for both people within about 5 minutes | Not yet | The form of VideoSDK's transcript text (who said what) is unknown until the first one arrives. |
| 1.6 | DELA's AI writes a summary and next steps from the transcript | The "Transcript" box shows "Summary by DELA's AI" and "Next steps" | Not yet | |
| 1.7 | "Stop transcript" ends it for the rest of the call | The top bar changes to "This meeting is not being transcribed" and the transcript holds nothing after that point | Not yet | |
| 1.8 | With only one box ticked, nothing is transcribed | No "Transcript" box appears after the call | Part, 2026-11-13 | Seen with one person alone in the room. Still to see with two people in the room and one box unticked. |
| 1.9 | Talk about paying outside Lawfecta is flagged for the team | A flag appears in the admin area, "Meeting transcripts flagged by DELA's AI", and nothing happens to either member | Not yet | Try once on purpose in a test call ("you can pay me on Venmo"). |
| 1.10 | "Read the transcript" and "Delete transcript" work for both people | Both can read it; after one deletes it, it is gone for both and the summary stays | Not yet | |
| 1.11 | The transcript is deleted by itself 90 days after the meeting | The text is gone on the date the card names | Not yet | First possible date: 90 days after the first transcribed meeting. |
| 1.12 | Screen sharing works in the room | One person shares, the other sees it | Not yet | |
| 1.13 | The room works on a phone | Camera, sound and "Leave and go back to DELA" on iPhone and Android | Not yet | |
| 1.14 | Two meetings at the same hour both get transcribed | Both show a transcript | Not yet | VideoSDK's Free plan transcribes one meeting at a time; pay as you go allows ten. |
| 1.15 | What happens when VideoSDK credit runs out | The owners get the alert "A meeting room could not be made" (in DELA and by email), and the meeting card says the room could not be set up yet | Not yet | Built 2026-11-13: one alert per meeting, with VideoSDK's answer; DELA keeps trying. Not seen for real. The account had $20 of credit on 2026-11-13. Add credit before members book. |
| 1.16 | VideoSDK's key is limited to the Lawfecta website and meetings still load | After adding the website on VideoSDK's "API Keys" page (globe icon), a call still opens | Not yet | Stacey's step. Do it after 1.3 works, so a failure has one cause. |
| 1.17 | Reminders and the "Did your meeting happen?" notice reach both people by email | Both receive them at the right times | Not yet | |
| 1.18 | "Report this meeting" reaches the team | The report shows in the admin area with the reason | Not yet | |
| 1.19 | Home shows the next meeting with "Join the meeting" when the room is open | The card "Your next meeting" on Home, and the button opens the room | Not yet | Released after 2026-11-13. |
| 1.20 | Notices about an introductory call read naturally | The notice says "A 30-minute introductory call is booked." | Not yet | |
| 1.21 | "Meetings" in the menu opens the quick view for attorneys and freelancers | The menu item is there on a computer and on a phone, and the page shows "Scheduled" or "Nothing scheduled yet." | Not yet | |
| 1.22 | "Join the meeting" appears 10 minutes before the start | On a real booked meeting, the button shows at 10 minutes before and not earlier | Not yet | The setting was 15 until 2026-11-13. |
| 1.23 | The grey heading band looks right on every page, light and dark | Stacey's look at Home, Meetings, Talent and the admin area in both looks | Not yet | #E2E4E8 light, #2B303C dark, released 2026-11-13. |

## 2. Calls before a gig

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 2.1 | An attorney books an introductory call from a freelancer's profile | The call shows in "Your meetings" for both, named "Introductory call" | Confirmed 2026-11-13 | ChatGPT check 3 booked a call with sample freelancer Hannah Kim from her profile (Nov 16, 3:15 PM Pacific); the room became "Ready". Seen from the attorney's side only: Hannah is a sample account. |
| 2.2 | The freelancer is told and can move or cancel it | Notice and email arrive; "Change the time" and "Cancel" work from the freelancer's side | Not yet | |
| 2.3 | The call leads to a gig | "Create a gig for NAME" on the meeting card ends with an invitation to that freelancer | Not yet | |

## 3. Talent and profiles

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 3.1 | The Talent page in the mockup 02 layout looks right in a browser | Stacey's look and the Talent ChatGPT check (number 1) | Part, 2026-11-13 | ChatGPT check 1: 25 of 26 steps passed. Step 14 reported the heading "DELA suggested filters" and its sentence missing; Stacey's screenshot the same day shows both, so the agent misread. Stacey's look at the rest of the page is still open. |
| 3.1b | The simpler Talent page (step 29) looks and works right in a browser, on a computer and a phone | Stacey's look: "Filters (0)" opens the five lists, a card has two buttons, "Invite to gig" opens the invitation step with the gig to choose | Part, 2026-11-17 | Stacey's screenshot shows "Filters (0)" and its open panel on the live site. Not yet seen: the cards, "Invite to gig", the "Bookmarks" tab (released 2026-11-17), and a phone. |
| 3.2 | Bookmarks are saved in the website's own bookmark system | A freelancer bookmarked in DELA shows on the website's page "My Favorites: My Saved Members" | Confirmed 2026-11-13 | Stacey bookmarked DELA Test Freelancer in DELA as the test attorney and sent a screenshot of https://www.lawfecta.co/account/favorite-members listing that freelancer. The member dashboard menu has no link to that page yet. Not yet tried: "Delete" on the website page, then the button in DELA going back to "☆ Bookmark". |
| 3.3 | Promotions from the website show on a profile | A member's live Promotion post shows under "Services" | Not yet | No real member has a promotion yet. |
| 3.4 | A real freelancer becomes match-ready through the real steps | Profile filled, LinkedIn check passed by the team, availability confirmed, then listed in Talent | Not yet | The listed freelancers today are test and sample accounts. |
| 3.5 | A firm logo upload works and freelancers see it | The logo shows in "Firm details" and on the freelancer's gig page, conversation and engagement | Not yet | By hand: an agent cannot choose a file. |
| 3.6 | Ready-made pictures show everywhere a picture is used | Talent cards, profile, Inbox, meeting cards | Part, 2026-11-13 | Seen by Stacey on a Talent card. |
| 3.6b | The blue information notice reads well and its X works with a screen reader | A person with VoiceOver or NVDA hears the notice, reaches "Dismiss notice", and lands on "Show the sensitive data notice" | Not yet | Released 2026-11-17. Automated checks pass; no person has tried it. |
| 3.7 | A person using a screen reader can search Talent and read a profile | A pass by a person with VoiceOver or NVDA | Not yet | Automated accessibility rules pass; they do not replace a person. |

## 3b. Inbox, conversations and notifications

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 3b.1 | The new Inbox and conversation work for two real people | The ChatGPT check (number 4) passes, and a pilot pair writes back and forth with a file attached | Part, 2026-11-17 | ChatGPT check 4 passed 12 of 14 (both misses fixed) and Stacey looked after the fixes: "looks good". Left: a real pilot pair, with a file. |
| 3b.2 | "Upload a new file" from a conversation | An attorney uploads a file there and the freelancer opens it | Not yet | By hand: an agent cannot choose a file. |
| 3b.3 | A retry after a failed AI request works | After any "DELA's AI could not finish" message, the same button works on the next click | Not yet | The cause of the false "out of DELA actions" was fixed 2026-11-17. |
| 3b.4 | The notification panel and page help a member with many notifications | Stacey's look with the test attorney (70 unread): six things in the panel, the page's filters, dismiss and restore | Confirmed 2026-11-17 | ChatGPT check 5 passed 13 of 13, and Stacey looked after the fixes: "tested notifications and inbox and looks good". Not yet tried: a screen reader, a phone. |

| 3b.5 | Replies in a thread work between two real people | One writes a reply in a thread, the other sees the unread mark, opens the thread and answers there | Not yet | Step 32, released 2026-11-17. The rewritten ChatGPT check 4 covers both test accounts. |
| 3b.6 | "Edit" and "Remove" are gone 15 minutes after sending | On a message older than 15 minutes there is no three-dot menu, and a fresh one has it | Not yet | The server refuses both after 15 minutes (tested). |
| 3b.7 | The Inbox and a thread on a phone | A row opens the conversation at once; an open thread takes the conversation's place and "← Back to the conversation" returns | Not yet | No agent or person has tried a phone. |

## 4. Money (from the go-live handoff)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 4.1 | The first real payment | One payment in DELA, its ledger lines, and one Stripe event with a verified signature, all matching Stripe | Not yet | Stacey skipped real test payments on 2026-11-12. Tell Claude "The first real payment happened". |
| 4.2 | The first real payout to a freelancer | The payout in DELA matches Stripe and reaches the bank | Not yet | |
| 4.3 | A refund or a dispute with real money | The amounts in DELA match Stripe | Not yet | |
| 4.4 | The Subscription page shows a paid member's real billing | A member with a paid website membership sees the amount, the cycle and the next date | Not yet | Only "No paid membership on record" has been seen (again in ChatGPT check 2, 2026-11-13, 10 of 10 steps passed). |
| 4.5 | The Pro trial ends and the plan changes on the website | A real trial ends and the member's plan is right in DELA and on the website | Not yet | Built against a stand-in for the website; needs Stacey's check first. |

## 5. Accounts and access

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 5.1 | The first member who signs up by themselves | They land on /dela with the right workspace and plan | Not yet | Tell Claude the member's name; Claude checks their records. |
| 5.2 | Password reset by email | The email arrives and the member ends up in DELA | Not yet | Stacey was asked to try it once. |
| 5.3 | Notices and emails reach real inboxes, not spam | A pilot member confirms | Not yet | |

## 6. Keeping the site safe

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 6.1 | A backup can be restored | One restore drill done with Stacey (docs/RUNBOOK.md) | Not yet | |
| 6.2 | The uptime monitor warns when DELA is down | A test alert reaches Stacey | Not yet | |
| 6.3 | A virus scanner before confidential materials are switched on | Scanner in place and one infected test file refused | Not yet | The switch is off until then. |
| 33.1 | A member's Home layout follows them to a second device (step 33) | Saved on one computer, seen on a phone or another browser | Not yet | Saved on the server per person and side. |
| 33.2 | The Customize panel with a real screen reader and on a real phone, dragging with a finger (step 33) | "Move up" is read with the new place; a row can be dragged by its handle | Not yet | The automated tests cover the keyboard, a mouse drag and a 320 pixel screen. |
| 34.1 | Earnings and spend on Home match what a member really received or paid (step 34) | One real payout and one real payment, compared with Stripe and the Earnings page | Not yet | The automated tests compare the cards with the payment records in test mode. |
| 34.2 | "Things to consider delegating" shows suggestions from a real approved document (step 34) | An attorney approves a document, runs "Automate or delegate", and sees the suggestion on Home | Not yet | Home only lists what DELA already suggested; it creates nothing. |
| 34.3 | Home at 200% text size and 400% zoom, and with a screen reader (step 34) | Cards reflow without cut-off buttons; rings are read as words | Not yet | Needs a person. |
| 35.1 | A real agency team member sees no "My agency" switch and no agency money (step 35) | A member of an agency opens Home and the Agency page | Not yet | The automated tests check it with two team members and a manager. The test agency on the site has no team member. |
| 35.2 | "Ask to set hours" reaches a real team member (step 35) | The member gets the notification and the email, sets hours, and the owner sees them | Not yet | Needs an agency with a second person. |
| 35.3 | "Paid by clients" and "Paid out to agency" against one real agency job (step 35) | Both amounts match Stripe after a paid milestone | Not yet | |
| 36.1 | Home read by a real screen reader after the review (step 36) | The cards are read in the member's order; a row is announced as its action and title; "Overdue" is heard | Not yet | The automated tests check the order in the page and the names. |
| 36.2 | The Customize panel as a dialog with a real screen reader (step 36) | The page behind cannot be reached; "Discard your changes?" is announced | Not yet | |
| 36.3 | "Ask everyone without hours to set them" with a real team (step 36) | Each member without hours gets one notification and one email | Not yet | Not clicked in the ChatGPT check: the sample team members are not real inboxes. |
| 36.4 | A real failed charge shows its day on the attorney's Home (step 36) | "Milestone N · $amount · payment failed on" with the right date | Not yet | The test data has no failed charge on record. |
| 37.1 | The Projects tabs and tables with a real screen reader (step 37) | Tabs are announced with their state; each table row is read with its column names | Not yet | The automated tests check the roles, captions and headers. |
| 37.2 | Projects on a real phone (step 37) | The four numbers, the tabs and the stacked table rows are easy to use by touch | Not yet | The automated tests check 768 and 320 pixels. |
| 38.1 | An attorney posts a real gig through the three steps, on a computer and on a phone (step 38) | The draft reads well, the costs match the agreement later, and the gig opens only after the tick box | Not yet | The automated tests post one in test mode. |
| 38.2 | The costs on step 1 and step 3 against a real signed agreement (step 38) | The platform fee in the agreement falls inside the range the page showed | Not yet | |
| 39.1 | The help tips with a real screen reader (step 39) | The "?" is announced as a button with its name, and the tip is read as its description | Not yet | The automated tests check the ties between icon and tip. |
| 39.2 | The help tips on a real phone (step 39) | A tap opens the small white box, nothing on the page moves, and a tap elsewhere closes it | Not yet | Checked locally with a touch screen setting only. |
| 40.1 | Standing arrangements folded, with real arrangements (step 40) | "Manage" opens the right arrangement, and hiring again, changing limits and ending all work from inside it | Not yet | The automated tests have no arrangement on the Projects page. |
| 40.2 | Projects at 200% and 400% browser zoom (step 40) | Every task can be done; nothing is cut off | Not yet | The automated tests check 768 and 320 pixels wide. |
| 42.1 | Projects tabs by keyboard after a mouse click (step 42) | Click a tab, press Left arrow: the tab to its left opens | Not yet | ChatGPT's browser reported the focus on the content twice; the automated test with a real click passes. Needs one try by hand. |
| 43.1 | The saved card on "Review payment" (step 43) | On an engagement paid once through Stripe, "Review payment" names the card: brand and last four digits | Not yet | Needs a real Stripe test payment first; the sample (QA) engagements have no payment records |
| 43.2 | Accepting a milestone with a saved card (step 43) | The on-page step shows the amount released and the amount charged for the next milestone, and both happen | Not yet | Automated test passes with a stand-in for Stripe |
| 43.3 | The engagement page on a real phone and with a screen reader (step 43) | One column, the next action first, sections open and close and say so | Not yet | Automated at 320 wide and by keyboard |

## How this list is kept
- Claude adds a line with every release that leaves something only real use can prove, and says so in the update to Stacey.
- When Stacey or a pilot member reports that something worked or failed, Claude fills in the state, the date and what was seen.
- A line marked "Problem" gets a fix, then goes back to "Not yet" until it is seen working.
