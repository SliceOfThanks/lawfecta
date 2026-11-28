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
| 45.1 | DELA uses a chosen document well (step 45) | With an approved document chosen, the answer follows the firm's own steps and names the document | Not yet | Only a real AI answer shows this; the automated tests use a stand-in |
| 45.2 | DELA says a named document is not attached (step 45) | Asking about a checklist that was not chosen: DELA says it is not attached and does not describe it | Not yet | ChatGPT check 12, step 5 |
| 45.3 | A document that tries to give DELA orders (step 45) | A chosen document containing "ignore your rules": DELA treats it as material | Not yet | The rule is sent and tested; the AI's behavior needs a real try |
| 45.2 result | DELA says a named document is not attached | Passed in ChatGPT check 12, 2026-11-19 | Done 2026-11-19 | DELA said the checklist was not attached and asked for it to be added |
| 46.1 | DELA follows approved firm guidance (step 46) | With a line approved, the next answer follows it, and a request that disagrees is said, not chosen silently | Not yet | ChatGPT check 13, step 6; only a real AI answer shows this |
| 46.2 | A firm with staff: a team member proposes, the administrator approves (step 46) | The proposer cannot approve; the administrator sees the proposal waiting | Not yet | Automated test passes; needs two real people in one firm |
| 46.1 result | DELA follows approved firm guidance | Passed in ChatGPT check 13, 2026-11-19 | Done 2026-11-19 | DELA asked who confirms the missing documents and gave numbered steps, as the guidance and the preference said |
| 49.1 | Home: each column of cards stacks on its own | On a wide screen no empty space sits under a short card; the order with the Tab key is still the member's order | Not yet | Automated test passes; Stacey to look on her own Home |
| 49.2 | A freelancer edits the live profile in place (step 49) | The change shows at once on the page attorneys see, and an attorney who opens the profile sees it too | Not yet | ChatGPT check 14; the attorney's view needs a second real login |
| 50.1 | A picture in the profile text shows for an attorney (step 50) | A freelancer adds a picture to the summary and saves; an attorney who opens the profile sees it | Not yet | Automated tests pass with a stand-in for storage; needs a real upload on Live |
| 50.2 | "Write with DELA" writes a section with light formatting (step 50) | The section comes back with a heading or a list and no invented facts | Not yet | Only a real AI answer shows this |
| 51.1 | The formatted box in Safari and Firefox (step 51) | Bold, Heading, lists and a picture work in the box in each browser a member uses; "Show the marks" is the way out if one does not | Not yet | The automated test runs in Chrome only |
| 52.1 | The Profile page in tabs and sections on a real account (step 52) | A member finds every required box, and "Add it" in the checklist opens the right section | Not yet | ChatGPT check 14 |
| 53.1 | The public profile to the mockups, seen by a real attorney (step 53) | The header line, About, services, timeline and reviews read well with real content | Not yet | ChatGPT check 14, step 16 |
| 55.1 | The newcomer check finds real gaps (step 55) | On a real document DELA lists what an outsider would not know, and nothing silly | Not yet | ChatGPT check 15, step 6; only a real AI answer shows this |
| 55.2 | Answers written into the document (step 55) | The attorney's answers land where a newcomer meets them, in the attorney's own words, and nothing else changes | Not yet | Automated tests use a stand-in; needs a real AI answer |
| 55.3 | A stranger does the work from the page (steps 55 to 58) | Someone who never worked with the firm finishes a handed-over part without asking the firm | Not yet | A human test; Claude prepares three cases and a scoring sheet when Stacey asks |
| 56.1 | A gig hands over only the chosen steps (step 56) | The freelancer's page, the Word copy and the decision points show only that part | Not yet | ChatGPT check 15, steps 7 to 10 |
| 57.1 | A need marked after hiring (step 57) | The attorney marks a thing supplied; the freelancer's "I still need this" shows for both | Not yet | Automated tests pass; needs two real logins on one engagement |
| 59.1 | A freelancer's note becomes a better document (step 59) | The note shows on the document and DELA's suggested edit answers it | Not yet | ChatGPT check 15, steps 1 to 5; the suggestion itself needs a real AI answer |
| 60.1 | The workflow path matches real work (step 60) | On the firm's real documents each path shows the true step and the next action leads to the right place | Not yet | ChatGPT check 15, steps 4 and 11 |

## Steps 61 to 64 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 61-1 | An editor who wrote a document approves it, and another editor cannot | A firm with two people in its Library tries both | Not yet | Covered by automated tests; the pilot's test accounts are one-person firms |
| 62-1 | Closing a real member's DELA account signs them out and keeps them out until reopened | Stacey closes and reopens a test member on the Members page | Not yet | Check 17 only tries closing with no reason |
| 63-1 | A member gets a real OpenAI key by following the five steps and DELA runs on it | A pilot member does it and Ask DELA shows it is using their key | Not yet | OpenAI may rename its pages or buttons |
| 63-2 | The same for a Claude key from the Claude Console | A pilot member does it | Not yet | Anthropic may rename its pages or buttons |
| 64-1 | DELA writes a non-legal process (newsletter, bookkeeping, IT) without adding a practice area, court rule or attorney decision | Check 17 step 6, then real use | Problem, then fixed 2026-11-20 | Check 17: the newsletter answer listed "Practice area and jurisdiction: Needs your input" and asked about attorney review. Instructions changed (code_version bf6c3df). Not yet seen again with the real AI |

## Steps 65 to 67 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 65-1 | A real analytics or chat script pasted in "Site code" loads on member pages and reports visits | Stacey pastes her HockeyStack or other script and sees data in that tool | Not yet | Check 18 uses a plain line of text |
| 66-1 | An attorney cannot learn a freelancer's last name before hiring, on any page | A pilot attorney goes through Talent, a proposal, the Inbox and a meeting | Not yet | The public website listing still shows the full name |
| 66-2 | The full name appears right after both sign | A real hire in the pilot | Not yet | |
| 67-1 | Contact details written in unusual ways are caught (numbers in words, spaces between letters) | The Team reads new freelancer profiles in the first weeks | Not yet | The patterns are code; add what gets through |
| 67-2 | Honest profile text is not damaged | Pilot freelancers report any "[removed]" that was wrong | Not yet | |

## Step 68 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 68-1 | A real freelancer on Free is chosen, subscribes on the website, comes back and signs | The first such hire in the pilot | Not yet | The website's checkout and the plan arriving in DELA are outside DELA's own tests |
| 68-2 | After paying on the website, "I have subscribed, check again" shows the signing box without a new login | Same hire | Not yet | DELA reads the plan at each page load |
| 68-3 | A freelancer who does not subscribe: the agreement closes at its sign-by date and the attorney can choose again | A case in the pilot, or a prepared one | Not yet | Existing daily job |

## Step 69 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 69-1 | A real community article published on the website shows on the author's profile in DELA | Check 20, then a pilot freelancer's article | Not yet | The website had no article on release day |
| 69-2 | A new promotion or article reaches "Recent activity" within 20 minutes | Same | Not yet | Which date field the website fills for a new post is assumed, not seen |
| 69-3 | "Write an article on the Lawfecta website" opens the right page | Stacey clicks it as a freelancer | Not yet | The address is a setting, set to the member dashboard for now |
| 69-4 | Real members use the boards without leaking contact details or client information | The Team reads the boards in the first weeks | Not yet | |

## Step 70 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 70-1 | A gig with a category and no practice area (bookkeeping, marketing) suggests the right freelancers | A pilot attorney posts one and looks at its matches | Not yet | Check 21 only drafts a gig |
| 70-2 | Attorneys find the right category for non-legal work | Pilot attorneys pick one without help | Not yet | The list is the website's; missing kinds of work are added there |

## Step 71 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 71-1 | A freelancer who gets part of a document sees what the firm still owes them from the step before, and the firm supplies it | A real partial handoff in the pilot | Not yet | |
| 71-2 | "Stop" appears while the real AI answers and puts the message back | Check 22 step 2, then real use | Not yet | The test AI answers at once, so my browser tests cannot click Stop in time |
| 71-3 | The status tags read right through a whole real engagement (signing, needs, payment, review) | A pilot engagement from start to end | Not yet | |

## Step 72 (released 2026-11-20)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 72-1 | The real AI labels its own suggestions as "DELA's suggestion" and what the attorney said as "Confirmed by the firm" | Stacey or a pilot attorney drafts a document from a short description and reads the tags | Not yet | The test AI returns a fixed document, so only the screens and the code rule are proven |
| 72-2 | Attorneys read the note and confirm or change suggestions before approving | Watching the first pilot drafts | Not yet | Nothing blocks approval |

## Step 73 (released 2026-11-21)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 73-1 | A firm with real staff assigns a document, the staff member accepts, does it and submits, the attorney accepts | A pilot firm with at least two people on its Library team | Not yet | The pilot's test attorney has no team yet |
| 73-2 | The emails for assigned, accepted, submitted and changes requested arrive and their link opens the assignment | The same firm | Not yet | |

## Step 74 (released 2026-11-21)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 74-1 | An attorney with several real bookmarks tags them, writes notes and finds people again with the tag and category filters | A pilot attorney with five or more bookmarks | Not yet | The test attorney has one bookmark |
| 74-2 | The profile header looks right with a real photo upload, a long name, a long headline and no agency | Stacey or a pilot member looks at three real profiles | Not yet | Seen so far only with the ready-made picture |

## Step 75a to 75c (released 2026-11-21, Access list)

| # | What must be seen working | How we will know | State | Notes |
|---|---|---|---|---|
| 75-1 | An attorney walks from a chat to a selected playbook, to tasks to delegate, to a handoff, to a gig draft, to an invitation, without leaving Ask DELA and without help | Stacey or a pilot attorney does it once on their own | Not yet | Each page was tested by itself; the whole walk by a person has not been seen |
| 75-2 | "Find tasks to delegate" gives sensible tasks and roles on a real playbook with the real AI | A pilot attorney reads the suggestions for one of their own playbooks | Not yet | Tested with a stand-in AI |
| 75-4 | A proposed change to a playbook is applied to the draft from the changes page, sent for review and approved, by the people who may | A pilot firm with an author and an administrator who are different people | Not yet | The test firm's attorney is both |
| 75-5 | The decision queue shows a real firm's waiting items correctly and nothing is missing from it | A pilot attorney compares it with Home and Projects on a busy day | Not yet | |
| 76-1 | A real key from a real Scribe account connects, and the firm's guides show in the list | A firm with a Scribe plan that offers "Developer Access" connects it on "Import a guide from Scribe" | Not yet | |
| 76-2 | Screenshots of a guide picked from the list come in (Scribe's screenshot addresses are in the setting import.image_hosts) | The same firm imports one guide with screenshots and looks at the review screen | Not yet | |
| 76-3 | Which Scribe plans allow the connection, so the page can say it exactly | The firm reports its Scribe plan and whether Settings shows "Developer Access" | Not yet | |
| 77-1 | A member who has never seen Ask DELA knows what to type and finds earlier chats and the other pages behind "Chats & pages" | A pilot attorney opens Ask DELA for the first time and says what they would do | Not yet | |
| 77-2 | "Talk" and "Send when I stop talking" work in the new message box with a real microphone | A member dictates one request on their own computer | Not yet | |
| 78-1 | With the real AI, an answer about handing work off lists tasks under "Tasks that can be delegated" and "Keep with an attorney", and every "Source: Step N" matches the playbook | An attorney selects an approved playbook, asks which steps a freelancer could do, and opens two of the sources | Not yet | |
| 78-2 | A firm with many playbooks finds an older one in "Manage sources" by typing part of its name | A pilot firm with more than ten playbooks tries it | Not yet | |
| 79-1 | A screenshot pasted into the Ask DELA message box from a real clipboard is attached, and DELA's answer shows it was read | An attorney takes a screenshot, pastes it and asks what it shows | Not yet | |
| 79-2 | A playbook draft made from a chat with screenshots shows them under "Before you start" | The same attorney clicks "Save as a playbook draft" and opens the draft | Not yet | |
| 80-1 | An attorney who has never seen the new editor changes a sentence, reorders a step and drops a screenshot on a step without being told how | A pilot attorney is asked to fix one playbook while someone watches | Not yet | |
| 80-2 | Typing survives a closed laptop: the words are back the next day | The same attorney types, closes the browser without Save, and opens the playbook the next day | Not yet | |
| 80-3 | Dragging a step and a picture works with a real mouse and on a tablet | Tried on a laptop and an iPad | Not yet | |
| 81-1 | Members find Files, Team work, Subscription and Notifications after they left the menu | Ask two pilot members to open each one | Not yet | |
| 75-3 | The pages read well on a laptop screen of ordinary width (about 1280) and on a phone | Stacey looks at the chat page, My Playbooks and the handoff page on both | Not yet | The tests check the layout by measurement, not by eye |
| 80-2 | An attorney makes a word bold, adds a link and a bulleted list in a playbook, and the Word and PDF exports show them | A pilot attorney formats one playbook and exports it | Not yet | Check file 32 covers the editor; the exports are covered by automated tests only |
| 83-1 | The Blog's Topic list shows the topics Stacey set on the website, and an article shows its topic | Stacey renames "Category 1" to "Category 3" in the post type "Community Article" and sets a topic on an article, then looks at the Blog an hour later | Not yet | Until then the list reads "All topics" only |
| 83-2 | A real promotion or article written on the website by a member shows in DELA within the hour, without contact details | A pilot freelancer posts one on the website | Not yet | The sample members' posts show; a member's own first post has not been seen |
| 83-3 | An attorney finds a freelancer from the Services page and invites them | A pilot attorney starts from Services | Not yet | |
| 82-1 | Claude or ChatGPT connects to the Team connector with the owner's login, lists the tools, and answers "who is stuck" from the same list as the Pipeline page | Stacey adds the address from the Pipeline page to her own Claude or ChatGPT and approves it on DELA | Not yet | Covered by automated tests with a stand-in app; a real app has not connected |
| 82-2 | Michelle, with only the role "Growth", opens the Pipeline page and connects her own app, and nothing else in the admin area opens for her | Stacey gives Michelle the role; Michelle tries | Not yet | |
| 82-3 | A real attorney moves through the stages by themself: claimed, gig posted, proposals received, hired | The first pipeline attorney who claims | Not yet | The dates come from DELA's own records |
| 82-4 | A playbook prepared from a real firm's website reads as useful to that attorney, and holds nothing copied that should not be | After the lawyer's review, Stacey prepares one for a firm she knows and reads it | Not yet | The switch pipeline_prefill is off |
| 82-5 | A claim listing is created on the real website from a reviewed row, opens by its direct link, does not show in the website's search, and no email went to the person | After her website steps and the lawyer's review, Stacey approves a batch of three rows she chose | Not yet | Tested with a stand-in for the website only; the real "create member" call has never run |
| 84-1 | A real event published on the website shows in DELA within the hour with its day, time, place and picture | Stacey publishes one event on the website and looks at Community an hour later | Not yet | The website has no events yet; tested with a stand-in |
| 84-2 | The Category list on Events shows the categories Stacey set in the post type "Event" | Stacey renames the three placeholders, then looks | Not yet | Until then the list reads "All categories" only |
| 84-3 | An event shows "Open the event page" when its organizer gave a link | An event on the website that has a link of its own | Not yet | The test event (post 69) carries its link in DELA's copy since 2026-11-24; the button has not been seen on screen by a person |
| 85-1 | Blog cards show the article pictures above the headings, and they look right at the card's size | Stacey looks at the Blog | Not yet | 5 of 5 articles have a picture in DELA's copy |
| 86-1 | The new editor's bold, italic, list and link work for a person on the live site | Check 32 run again on "Send the welcome packet 2" | Seen 2026-11-24 (ChatGPT, check 32, second run) | Bold, italic, the list and the link all worked and were kept after a reload; one fault, fixed in step 87 |
| 90b-1 | Three members moved with "Try with 3 members first" look right on www.lawfecta.co: name, plan, category, listing text, picture | Stacey looks at the three on the website | Not yet | The website's real create call has not been made by the move yet |
| 90b-2 | A moved attorney logs in and finds the example in their Library, with the notice "Example from Lawfecta" | One moved attorney account, logged in | Not yet | |
| 90b-3 | A moved member sets a password with "Forgot password" on www.lawfecta.co/login and gets in | One moved member | Not yet | |
| 90b-4 | The full move ends with "Still to move 0" and the counts add up to the preview | The full run | Not yet | |
| 90b-5 | The website copies a member's picture from the old site when asked (auto_image_import) | Look at a moved member with a picture | Not yet | |
| 94b-1 | The server function is released from the Mac with tools/deploy_function.sh and the site answers healthy | One release after Stacey logs the Supabase tool in | Not yet | |
| 94b-2 | Release Control, Activity: the releases since 8 November show, newest first, and the next switch change shows by itself | Stacey looks at the card | Not yet | |
| 94-1 | With the new widgets and code.source on "storage", the member area, the admin area and the security page load from DELA's own copy | Claude reads the pages' network requests after the switch | Confirmed 2026-11-27 | All three pages load every DELA script and the logo from the bucket dela-code; signed-out screens seen. A signed-in look is Stacey's |
| 94-2 | A version is copied with the repository private and the key in Supabase | One copy after Stacey types GITHUB_CODE_TOKEN | Not yet | |
| 93-1 | The three members of "Try with 3 members first" get no email at all, from the website or from DELA, for 8 days | Ask the three, or use three addresses Stacey can read | Not yet | The website's API says a create is silent unless asked; only a real create proves it |
| 93-2 | The six-hour check emails Stacey when something is wrong | The first real problem it finds, or a key changed on purpose | Part | First run 2026-11-25: all good, Stripe in live mode. 2026-11-27 16:00 PT: the check raised "Brevo did not answer: status 500" and queued the owner's email; whether it reached Stacey's inbox is hers to say |
| 93-3 | A backup restored to a new copy holds the same members, documents and agreements | The restore drill, docs/restore-drills.md | Not yet | Stacey 2026-11-27: not paying for a test copy for now. The steps are in the admin Guide and docs/RECOVERY.md |
| 90a-1 | "Read the old site" reads every member of www.lawfecta.com (2,596 on 2026-11-25) and the plan table's counts add up to it | The owner clicks it with the key set (check 38) | Not yet | The stand-in sites are tested; the real old site has not been read by DELA yet |
| 90a-2 | Plan names and prices of both sites show in the plan table | Same reading | Not yet | The website address DELA reads plans from is not proven on the real sites |
| 90a-3 | The old site's categories match this site's by name (10 of 10 top categories do, read by hand 2026-11-25) | Same reading, card "3. Categories" | Not yet | |
| 88-1 | Headings, a numbered list, a centered and underlined line, a table and a video card work for a person and come back after a reload | Check 37 | Seen 2026-11-25 (ChatGPT, check 37) | Every step passed; a YouTube video played on www.lawfecta.co. One fault, fixed in step 89: the first click on Play did nothing |
| 89-1 | The first click on "Play" plays a video that was just added | Add a video, click Play once | Not yet | Covered by a browser test |
| 88-2 | A picture put inside a text with "Picture": the review window, no caption needed, the picture shows in the text | Stacey or a member, by hand (an agent cannot upload a file) | Not yet | Covered by browser tests |
| 88-3 | Word and PDF exports show a heading, a numbered list, a table and a centered line as they look on the page | Export a document that uses them | Not yet | Covered by tests on the file contents, not opened in Word by a person |
| 88-4 | A YouTube, a Vimeo and a Loom video each play inside a document on the real site | Paste one link of each kind | Not yet | The site may block frames from other sites; not known until tried on www.lawfecta.co |
| 80c-1 | A playbook still in the older format moves with "Move to the current format" and opens as a page to type on | A playbook in the older format on Live (none exists today) | Not yet | Covered by tests only; all 24 playbooks on Live were already moved by DELA |
| 80c-2 | Restoring an older-format version keeps the document on the new page | Versions, "Restore" on an older-format version | Not yet | Covered by tests only; check 36 does not restore anything |
| 80c-3 | Decision points, links and the court rule button work for a person | Check 36 | Seen 2026-11-25 (ChatGPT, check 36) | Every step passed |
| 87-1 | A word that was just given a link stays when you press Enter or type straight after | Add a link to a word, then type without clicking first | Not yet | Covered by a browser test; not seen by a person on the live site |

## How this list is kept
- Claude adds a line with every release that leaves something only real use can prove, and says so in the update to Stacey.
- When Stacey or a pilot member reports that something worked or failed, Claude fills in the state, the date and what was seen.
- A line marked "Problem" gets a fix, then goes back to "Not yet" until it is seen working.
