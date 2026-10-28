# Paste this into the Claude chat with the BD-lawfecta-dela MCP (BD email outbox check, part 2)

Copy everything below the line. It holds no secrets.

---

Same rules as before: hirelegalhelp.com only, read-only unless Stacey says "yes" to a written plan, never change anything that already exists, never ask for or show a secret or API key. Plain writing, no em dashes, end with the three headings.

Background: DELA (on Supabase) sent a test email through BD's API, POST /api/v2/email_outbox/create, at 03:28 UTC on 2026-10-28. BD answered "success" and gave it outbox ID 2. The fields sent were: to_email stacey@lawfecta.com, from_email dela@lawfecta.com, from_name Lawfecta DELA, subject "[Staging] DELA email test through BD (4)", an html body, and status "pending". The email has not arrived.

Goal: find out why, with evidence.

Step A. Look (read-only)
1. Read outbox record ID 2 (an email_outbox get or list tool, or GET /api/v2/email_outbox/get/2 if a tool can call it). Report every field, especially status, send_date, date sent, any error, and from_email. Do not show the html body in full; say only how long it is.
2. List the newest 10 outbox records (ID, status, to address with the name part hidden, date). Say whether any older record was ever sent, and what its status says.
3. Find BD's outbox documentation (developers.brilliantdirectories.com, Email Outbox). Quote what it says about: which status values exist, what makes BD send a queued email, how often it sends, and whether send_date is needed.
4. Find the site's email sender settings (the "from" address BD uses for its own emails on hirelegalhelp.com, and whether it uses BD's mail service or an outside SMTP service). Report the from address and the service name only. No passwords or keys.
5. Say whether BD admin shows a sent email log, and where (exact menu path). If you can read it, say whether the test email appears there.

Step B. One small test, only after Stacey says "yes"
6. If Step A shows a different status value or a send_date is needed, or the from address must be the site's own address: write the exact fields you would change, and ask Stacey before doing anything. Do not create a new outbox email yourself; Claude in the build session sends the next test from DELA.

Step C. Report, in this shape, for Stacey to paste back to the build session:

BD OUTBOX REPORT
- Outbox record 2: (status, send_date, date sent, error, from_email)
- Older outbox records ever sent: yes / no (statuses seen)
- What makes BD send a queued email (from the docs):
- Status values allowed:
- send_date needed: yes / no
- Site from address and mail service:
- Sent email log in BD admin: (menu path, does test 4 appear)
- Suggested fix:
- Anything changed or created: (list with IDs, or "nothing")
- Questions:
