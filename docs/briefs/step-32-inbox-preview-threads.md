# Step 32: the Inbox list with a quick preview, chat bubbles, and replies in a thread

Stacey 2026-11-17: sent two mockups with numbered notes ("Inbox, revised" and "Messages + Threads") and a short brief. Also that day: "remove meeting button from inbox page - they have it on the menu easily accessible". Built the same day under her standing word; the decisions Claude made for her are listed below.

## Who
Attorneys and freelancers who write to each other.

## What, from her notes
| Mockup | Note | What was built |
|---|---|---|
| Inbox | 1. A list, not stacked cards | One card "Conversations" with "N total". Rows are divided by thin lines. The chosen row has a quiet highlight. |
| Inbox | 2. More useful information per row | Picture, name, the tag ("Gig", "Introduction", "Bench") with the title, one line of the newest message, always in the same places. |
| Inbox | 3. Dates on every conversation | The time of the newest message. With no message yet: "No messages yet · Conversation started DATE", the real day the conversation was made. |
| Inbox | 4. A quick-preview pane | Beside the list on a wide screen: who, the conversation's context, the three newest messages, "Open conversation →" and "View gig". Looking at a preview does not mark the conversation read. |
| Inbox | 5. Meaningful status | The blue dot and the count show only when unread. Selected, unread and kind are told apart on screen and for a screen reader. |
| Inbox | 6. Privacy help, discreetly | A small link "Privacy and secure sharing" opens the approved blue notice in place. The banner no longer sits over the Inbox or a conversation. |
| Inbox | Her message | "Your meetings" left the Inbox page. |
| Messages | 1. Natural alignment | The member's own messages at the right, the other person's at the left. A bubble is as wide as its words. |
| Messages | 2 and 3. Reply to a specific message, in its own panel | "↪ Reply in thread · N replies" under every message. The thread opens beside the conversation on a wide screen, and in its place on a narrow one, with "← Back to the conversation". Replies stay in the thread; the message shows how many it has. |
| Messages | 4. Edit and Remove for 15 minutes | Both sit in a three-dot menu on the sender's own message, with the line "Shown only within 15 minutes of sending." After 15 minutes the menu is gone and the server refuses both. Editing does not restart the 15 minutes. |
| Messages | 5. Compact removed message | One small grey line, "Message removed", in place of a bubble. |
| Messages | 6. Composer | "Attach a file", "AI tools" and "Send" in one row, as before; the thread has its own box, "Reply in thread", with "Send reply →". |

## Decisions Claude made (change any of them)
1. On a wide screen, clicking a row shows its preview; "Open conversation →", a second click on the same row, or a double click opens it. On a narrow screen a row opens the conversation at once, since there is no room for a preview.
2. A thread is one level deep: a reply cannot have a thread of its own.
3. A reply is checked like any message (sensitive data, contact or payment outside Lawfecta) and counts as unread for the other person. A reply that is being held is not counted for the other person.
4. "Remove" was allowed at any time before; it now has the same 15 minutes as "Edit". The Lawfecta Team can still remove a message.
5. The privacy link sits at the right of the page's heading row, not in the top bar, so the top bar stays the same on every page.
6. A sort order was added to the list: most recent, oldest first, name.
7. "Your meetings" stays in the old layout only, which has no "Meetings" in its menu.

## How it could go wrong
- A reply to a message that was removed meanwhile: refused with a clear sentence, nothing is sent.
- A stranger asks for a preview or sends a reply: refused (tested).
- A held message must not show in the other person's preview (tested).
- On a phone, a thread that is open hides the conversation: "← Back to the conversation" and the X both return to it.

## Not done
- New messages arriving without a reload.
- Attaching a file to a reply in a thread.
- AI tools inside a thread.
