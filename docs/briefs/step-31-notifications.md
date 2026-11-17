# Step 31: a simpler notification panel and a Notifications page

Stacey 2026-11-17: sent a mockup (the panel, one grouped notification, the full page) and a written brief, "Lawfecta Notifications: UX/UI Improvements". Built the same day under her standing word to keep building; the decisions Claude made for her are listed below.

## Who
Attorneys and freelancers. The Lawfecta Team sees the same panel and page for their own member account.

## What, by the six points of her brief
| # | Her point | What was built |
|---|---|---|
| 1 | Cleaner panel, about six items | The panel from the bell is headed "Notifications" with "N unread". It shows at most six things: up to two that need action, then the newest update for each job. |
| 2 | Clear priorities | "Needs your action" (with "N pending") is separate from "Recent updates". It is the live list of what waits on the member, the same list as Projects and Home, so a finished task never keeps asking. With more than two: "See all N pending actions →". |
| 3 | A Notifications page | "Notifications" in the menu, and "View all notifications →" in the panel. Filters as tabs: All (N), Needs action (N), Unread (N), Updates, Payments, Disputes, Meetings, Messages, and Dismissed (N) when there are any. A search box, a time range (all time, 7, 30 or 90 days), a sort order. Tick boxes with "N selected", "Mark as read" and "Dismiss"; a "⋯" menu on each row. |
| 4 | Grouped by job | The panel shows one update per job, with "View N earlier updates for this job →". It opens the page filtered to that job's history; nothing expands inside the panel. |
| 5 | Relevant actions | The button says what it does: "Review and sign", "Review proposals", "View invitation", "Write review", "View payment", "View details", or the page it opens ("Open the meeting", "Open the conversation"). |
| 6 | Accessibility | Tabs are a real tab list; unread is a dot plus bold plus the spoken word "unread"; every tick box and "⋯" menu is named after its notification; results are announced; the page fits a phone 320 wide. |

## Decisions Claude made (change any of them)
1. "Dismiss" and "archive" are one thing. A dismissed notification leaves the panel and the main lists, is marked read, and stays under "Dismissed", where "Restore" brings it back. Nothing is ever deleted.
2. What needs action cannot be dismissed. It goes when the task is done.
3. The page lists the newest 300 notifications; older ones are kept in the database.
4. The mockup's "More ▾" for extra filters is not a menu: Meetings and Messages are shown as tabs like the others, which is one click fewer.
5. "Notifications" is in the menu of the new layout for both sides. The old bottom bar keeps its seven items.
6. The word everywhere is now "Notifications" (it was "Notices").
7. Which tag a notification gets (Payment, Dispute, Meeting, Message, Update) is worked out from its kind and title, since older notifications carry no category.

## How it could go wrong
- A notification about a job the member no longer has: its button still opens the page, which says the job is not available.
- Dismissing by mistake: "Dismissed" and "Restore".
- Someone posts another member's notification IDs: the server only touches the caller's own (tested).

## Not done
- "View receipt" as its own page: payments open the job's payment view ("View payment").
- Email and push settings per notification type.
