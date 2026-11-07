# Paste this into the Claude chat with the BD-lawfecta-dela MCP (Pro trial: read-only BD API check)

Copy everything below the line. It holds no secrets.

---

Rules: hirelegalhelp.com only. Read-only: do not create, change or delete anything, and do not send any email. Never ask for or show an API key or secret. Plain writing, no em dashes. End with the three headings "What you need to do next", "Next steps in general" and "What I'll build next".

Background: DELA (on Supabase) is about to build a daily job for the 7-day Pro trial on hirelegalhelp.com. The job finds freelancers on Pro (plan 8) or Plus (plan 7) whose trial has ended without a paid invoice, moves them to Free (plan 3), cancels the unpaid subscription and invoice, hides content Free cannot have, and records progress in users_meta. Attorney plans (5, 12, 13, 14) are never touched. Today DELA's API key calls only: GET /api/v2/user/get/{id}, GET /api/v2/user/fields, PUT /api/v2/user/update, GET /api/v2/list_professions/tree and POST /api/v2/email_outbox/create.

Goal: confirm, with evidence from BD's API documentation (developers.brilliantdirectories.com) and read-only calls, exactly which endpoints and API key permissions the job needs. Nothing is built until this report is back.

Step A. For each item, give the exact method and path from BD's docs, quote the doc line that settles it, and say if the docs are silent.
1. Search members: an endpoint that lists users filtered by subscription_id (plan) and by signup date. Which filter fields does it accept, does it page, and how many per page?
2. users_meta: get, search (by user and by key), create, update and delete. Which fields are required (for example database, database_id, key, value)?
3. Invoices: get, search by user, and the field that says paid or unpaid. Can an invoice be marked canceled or void through the API? List the status values.
4. Subscriptions: which endpoint holds a member's own subscription (not the plan definitions)? Can it be canceled through the API? Can a member's plan be changed with PUT /api/v2/user/update (subscription_id), and does that create a new invoice or subscription by itself?
5. Posts: search posts by user (articles, videos, events, and any other post types on this site), and the field and value that hide a post without deleting it.
6. Areas of law on a member: where they are stored and how to remove some without deleting the others.
7. API key permissions: how they are granted in BD admin (menu path) and the exact permission names for each endpoint above.

Step B. Read-only calls, to prove each read endpoint works with the current key (a 403 is a useful answer: it tells us which permission is missing).
8. GET the user record for user 687 ("DELA Test Attorney"). Report subscription_id only.
9. One member search filtered by subscription_id 8, limit 3. Report the count and the user IDs only, no names or emails.
10. users_meta for user 687 (or the closest read call). Report the keys only.
11. Invoices for user 687 (or the closest read call). Report count, status values and plan, no amounts needed.
12. Subscriptions for user 687. Report status and plan.
13. Posts for user 687. Report count and the post type names.

Step C. Report, in this shape, for Stacey to paste back to the build session:

BD API TRIAL CHECK REPORT
- Search members: (method, path, filter fields, paging, permission name, test result)
- users_meta get / search / create / update / delete: (each: method, path, required fields, permission name)
- Invoices get / search / cancel: (each, plus status values; can cancel: yes / no)
- Subscriptions get / search / cancel: (each; can cancel: yes / no)
- Change plan with user update: (yes / no; side effects)
- Posts search / hide: (method, path, hide field and value)
- Areas of law remove: (how)
- Permissions to allow on the key: (one list, exact names as BD admin shows them)
- Gaps (anything the job needs that the API cannot do):
- Anything changed or created: (must be "nothing")
- Questions:
