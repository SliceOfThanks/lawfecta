# ChatGPT test: Step 5, messages, booking and meetings

> Layout note, 2026-11-13: this test was written for the earlier layout and its page description is out of date. DELA now has the menu on the left on every page. Claude rewrites this test before it is run again.

> **Replaced (2026-11-05).** Use the Claude test docs/tests/claude-track-b-gigs-messages-meetings.md instead. It covers Steps 4 and 5 step by step, with where to click.

Claude already tested all of this with the real api and database: 10 api tests and 17 browser checks (both sides, two people booking the same time, reschedule, late cancel, held messages, edits, blocking, attachments, the phone screen). This test covers the real screens.

Before you paste this:
1. Run the Step 4 test first. This test uses the gig from it and the invitation to the test freelancer.
2. The logins are filled in. Passwords are not kept on GitHub: use the ready-to-paste copy Claude sent you in chat, or replace TEST_PASSWORD with the test password.
3. Vectera is not connected yet, so meetings show a note instead of a join link. That is expected.
4. The Lawfecta login has reCAPTCHA, which ChatGPT cannot pass. Each time ChatGPT reaches the login page:
   1. Click "Take over".
   2. Log in with the account it names.
   3. Hand control back and type: I'm logged in, continue.

Paste everything below the line into ChatGPT in agent mode.

---

You are testing DELA on the Lawfecta test site, www.lawfecta.co. Report every step as PASS or FAIL with what you saw. Take a screenshot of anything wrong or confusing. Never type real client information; use only made-up details.

Logins:
- test freelancer: stacey+dela-freelancer@lawfecta.com (password TEST_PASSWORD)
- test attorney: stacey+dela-attorney@lawfecta.com (password TEST_PASSWORD)
- owner: stacey@lawfecta.com (password TEST_PASSWORD)

The login page has a reCAPTCHA you cannot complete. Each time you reach https://www.lawfecta.co/login, stop and ask me to log in, naming the account. Wait until I say I'm logged in.

To sign out at the end of a group, click the initials in the top right of the DELA page, then "Sign out".

1. Freelancer (ask me to log in as the test freelancer)
1. Open www.lawfecta.co/dela?tab=profile. Find the card "Your availability for meetings", below "Your availability" near the top.
2. In that card:
   1. Choose your time zone in "Time zone".
   2. Tick "30 minutes" and "45 minutes".
   3. Tick Monday to Saturday, with 09:00 to 17:00.
   4. In "Days off", type a date next week as YYYY-MM-DD.
   5. Click "Save availability". Expect "Availability saved".
3. Look at the top bar: expect an "Inbox" button next to "Notices".
4. Sign out.

2. Attorney (ask me to log in as the test attorney)
1. Open www.lawfecta.co/dela?tab=projects and click the gig from the Step 4 test under "Your gigs".
2. Click "Matches" or "Proposals" in the row of views under the title, and click "Message" next to the test freelancer. Expect a conversation page with "Keep all work, contact and payment on Lawfecta".
3. Type "Can you start Monday? Our template is attached." in the message box, click "Attach a file", tick a file, and click "Send". Expect the message with "Open" and the file name.
4. Type "Or text me at 512-555-0199 and I will pay you directly" and click "Send". Expect a red note that DELA is holding it for a check by the Lawfecta Team.
5. Click "Book a meeting" near the top of the conversation. Expect "Book a meeting" with a "Length" choice and open times grouped by day, in your own time zone:
   - no times on the day off from group 1
   - no times on Sunday
   - nothing in the next 12 hours
6. Click one time and confirm. Expect "Your meetings" with the meeting marked "Booked", and a note that the meeting room link appears once Lawfecta's meeting service is connected (or when the room opens).
7. Click "Add to my calendar (.ics)". Expect a calendar file to download. Open it and check the time.
8. Click "Inbox" in the top bar. Expect the conversation listed.
9. Click the initials in the top right, then "Settings". Find the "Messages" card and check the "Seen" setting is there.
10. Sign out.

3. Owner (ask me to log in as the owner)
1. Open www.lawfecta.co/dela-admin and click "Gigs" in the menu on the left. Under "Held for a check", find the message with the phone number. Click "Do not deliver". Expect "Not delivered; the member was told".
2. Click "Meetings and messages" in the menu on the left. Expect:
   - "The last 30 days" with counts
   - a note that Vectera is not connected yet
   - "Upcoming meetings" with the meeting and "Waiting for Vectera"
   - "Reports"
3. Sign out.

4. Check the results (test freelancer)
1. Log in as the test freelancer and open www.lawfecta.co/dela. Click "Inbox" in the top bar (expect a number on it). Click the conversation.
2. Expect the attorney's message and the file, and no message with a phone number.
3. Click "✦ Summarize". Expect a short summary marked as reading only.
4. Click "✦ Draft a reply". Expect a reply in the box. Change a word and click "Send".
5. Click "Your meetings" (on the Inbox page) or open www.lawfecta.co/dela?tab=meetings. On the meeting, click "Change the time", choose another time, and confirm. Expect "Moved. One update went to both of you."
6. Tick "I agree to this meeting being recorded or noted". Expect "Saved".
7. Narrow the window to phone width: nothing runs off the side on the Inbox, the conversation and Your meetings. Widen it again.
8. Sign out.

Later, after the meeting time has passed (optional): log in as each test account, open www.lawfecta.co/dela?tab=meetings, choose "We met", write a short summary and click "Send". When both have answered, expect "Both confirmed: you met" and "DELA suggests".

Final report:
- a table of every step with PASS or FAIL
- anything confusing, slow (over 30 seconds) or worded badly
- the exact text of every error message
