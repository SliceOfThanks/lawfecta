DELA Inbox, conversations and thread replies test
Site: www.lawfecta.co
Run: Tue Nov 17, 2026, about 8:50 to 8:55 PM Pacific
Browser width: 1280 pixels

PART 1: TEST FREELANCER (stacey+dela-freelancer@lawfecta.com)

1. FAIL (counts only). The heading "Inbox", the "Privacy and secure sharing" link with the circled "i", the "Search conversations" box and the "Sort / Most recent" list are all there. There is no blue notice at the top and no "Your meetings" button. The filter counts are "All (5)", "Unread (3)", "Gigs (4)" and "Introductions (1)", not "All (2)" and "Gigs (1)". The 3 extra rows are seeded QA gigs: Thornton Family Law Group (QA), Okoro and Whitfield Estate Planning and Probate Partners of Greater Sacramento (QA) and Park Litigation (QA).
2. FAIL (counts only). The "Conversations" card says "5 total" with 5 rows, not 2. The layout matches what was expected: picture or letter circle, name, time, tag, title, a grey line and "›". The "Quick preview" card has every expected label and button. Dates: Example Lantern Legal Gig row 7:56 AM. Example Lantern Legal Introduction row Nov 13, 11:49 AM ("No messages yet · Conversation started Nov 13, 11:49 AM").
3. PASS. The pale blue notice opened, starting "DELA is for operations work", with an "×". The "×" closed it.
4. PASS. The gig row highlighted and the Quick preview showed its messages. The newest is "Blah blah blah" (7:56 AM), which comes after "Test message from the Inbox check." "Open conversation →" opened the conversation with "← Inbox", the "DELA Test Attorney" card and the "Message" box.
5. PASS. All bubbles sit at the left with "Example Lantern Legal ·" and a time. The "November 5, 2026" and "November 17, 2026" date lines are there. The "Message removed" grey pill is there, and every bubble has "↪ Reply in thread · 0 replies".
6. PASS. The Thread panel opened with "Original message", "No replies yet" and the "Reply in thread" box. Sent "Thread reply from the Inbox check." The toast "Reply sent in the thread." showed. The reply appears at the right of the panel with "You · 8:52 PM" and does not appear in the main list. The link now reads "↪ Reply in thread · 1 reply".
7. PASS. "⋯" opened "Edit message", "Remove message" and "Shown only within 15 minutes of sending." Escape closed the menu, then "×" closed the panel and the messages went back to full width.

PART 2: TEST ATTORNEY (stacey+dela-attorney@lawfecta.com)

8. FAIL (counts only). The card says "6 total", not "3 total". There are 4 gig rows (3 are seeded QA gigs: Avery Collins, Monique Fairbanks-Delacroix-Whitmore, Kendra Liu) and 2 Introduction rows (Hannah Kim Nov 13, 2:05 PM; DELA Test Freelancer Nov 13, 11:49 AM, both "No messages yet"). The "DELA Test Freelancer" Gig row is correct: blue dot, dark red "1" and the grey line "Thread reply from the Inbox check."
9. PASS. Own messages are bubbles at the right with "You ·" and a time. "Test message from the Inbox check." shows "↪ Reply in thread · 1 reply". The Thread panel shows the reply at the left with "DELA Test Freelancer · 8:52 PM".
10. PASS. Sent "Second test message from the Inbox check." It shows as the last bubble at the right with "You · 8:54 PM", "↪ Reply in thread · 0 replies" and "⋯". The menu showed "Edit message", "Remove message" and "Shown only within 15 minutes of sending."
11. PASS. There is no "⋯" under "Can you start Monday? Our template is attached." and it still has "↪ Reply in thread".
12. PASS. "← Inbox" went back to the list. The row reads "You: Second test message from the Inbox check." with no blue dot.

FAIL LIST
- Steps 1, 2 and 8: the conversation counts are higher than the script expects because of seeded "(QA)" conversations on both test accounts. Everything else in those steps passed. Update the expected counts in the script or remove the QA seed data.

CONFUSING ON SCREEN
- The freelancer's left menu shows "Library", "Projects" and "Talent", which the script lists only for attorneys. The freelancer menu has no "Get set up" or "Files", but does show "Agency".
- The freelancer sees the attorney's messages labelled with the firm name "Example Lantern Legal", while the conversation card header says "DELA Test Attorney". The same person has two names on one screen.
- In the attorney Inbox, the "DELA Test Freelancer" Introduction row says "Introduction from Example Lantern Legal". This reads oddly from the attorney's side, because the attorney sent it.
- The attorney account shows a yellow bar across the top: "You have used 840 of your 1,000 DELA actions this month." The script says nothing about it.
- The "Message removed" pill sits at the end of the November 5 messages, just above the November 17 date line. It reads as if it belongs to the newer day.
- After the freelancer replied in the thread, the attorney's "Blah blah blah" bubble showed "✓ Seen 8:52 PM". After the second message was sent, the "Seen" mark disappeared.
- The toast "Reply sent in the thread." covers the "Send" button for a few seconds.
- Clicking a row's preview shows "Loading..." under "RECENT MESSAGES", and the "Open conversation →" button moves down once the messages load. A click aimed at the button can land on empty space.

TOOK LONGER THAN 60 SECONDS
- Nothing. The longest wait was about 7 seconds, for "Second test message from the Inbox check." to appear after clicking "Send".
