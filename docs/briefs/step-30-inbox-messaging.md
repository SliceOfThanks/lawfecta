# Step 30: a simpler Inbox and conversation

Stacey 2026-11-17: sent three mockups with numbered notes and a written brief, "Lawfecta Inbox & Messaging: UX/UI Improvements". Built the same day under her standing word to keep building; the decisions Claude made for her are listed below so she can change any of them.

## Who
Attorneys and freelancers who write to each other on a gig, in an introduction before a gig, or on a bench.

## What, by the six points of her brief
| # | Her point | What was built |
|---|---|---|
| 1 | Cleaner Inbox: search, filters, unread marks, previews | A box "Search conversations" (name, gig, words of the newest message). Filters as tabs with counts: All, Unread, Gigs, Introductions (and Bench when the member has one). Each row: a blue dot and a bold name when unread, the picture, a tag ("Gig", "Introduction", "Bench") with the title, one line of the newest message ("You: ..." for the member's own), the time, and the unread count. 20 rows, then "Show more conversations". |
| 2 | Better messaging layout | A header card: picture, name, "Gig: TITLE" (or "Introduction, before any gig", "Bench conversation: ..."), the actions at its right ("Open the gig", "Book a call" or "Book a meeting", "More" with Report and Block). A date line where a new day starts. A visible label "Message" over the box, with the short placeholder "Write your message...". |
| 3 | Simplified AI tools | One menu "✦ AI tools" by the message box: "Draft a reply", "Suggest next steps" (new), "Summarize conversation". Each says it is working, then shows a panel. A drafted reply is a "Suggested draft" with "Use suggestion", "Edit" and "Dismiss"; nothing goes in the box or is sent by itself. "Draft an agenda" is gone from the conversation. |
| 4 | Improved file attachments | "Attach a file" is a menu: "Upload a new file" (attorneys; the file goes to Lawfecta Files with the same checks, after ticking that it has no sensitive data) and "Choose from Lawfecta Files" (freelancers: "Choose from your profile documents"). Chosen files show as chips with an × to remove. |
| 5 | Fix DELA errors | Found the cause of the misleading "You have used this month's DELA actions": asking the same thing again after a failed try. Fixed on the server, with a test that fails without the fix. An AI problem in a conversation now stays in the panel with "Try again", in words that fit what happened. |
| 6 | Accessibility and consistency | The filters are a real tab list; each row is one button with a full spoken name; unread is a dot plus bold, not color alone; menus close with Escape and return the keyboard to their button; targets are at least 44 pixels high; the blue dismissible notice sits at the top of the Inbox and of a conversation. |

## Decisions Claude made (change any of them)
1. "What we agreed" left the menu, because the brief names three tools. The server still knows it. Stacey 2026-11-17: "LEAVE OUT".
2. Button names kept as they were where the mockup differs only in wording ("Open the gig", "Book a meeting" on a gig, "Book a call" before a gig), so help texts and earlier tests stay true.
3. For an introduction, "View profile" and "Create a gig for NAME" stay visible in the header, not behind "More": they are the two things an attorney does next.
4. A new upload from a conversation is for attorneys only. Freelancers attach their profile documents, as before. An introduction or bench conversation still shares no files.
5. The list shows 20 conversations and "Show more", not numbered pages.
6. The notice keeps its approved wording. The mockup's shorter wording with "see the Help Center" was not used: there is no Help Center page for it yet, and the wording needs her word.
7. The page name in the top bar stays "Inbox" (one mockup says "Messages").

## How it could go wrong
- A held message must never show in the other person's preview: the preview only uses messages that person may see (tested).
- A member clicks an AI tool twice: the second click shows the same panel again; a failed try no longer blocks the next one.
- A file that is still being checked after upload is not attached; the member is told to choose it from Files in a moment.
- A long name or title on a phone 320 wide: rows and the header wrap.

## Not done
- Message "Seen" with a time and two ticks as in mockup 3 (today: "| Seen" after the time).
- The sender's name over each message.
- Live arrival of new messages without reloading.

## Check
One ChatGPT check, docs/tests/inbox-messaging-chatgpt-prompt.md, written after the release.
