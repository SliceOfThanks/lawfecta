# Paste this into the Claude chat with the BD-lawfecta-dela MCP (BD email check)

Copy everything below the line. It holds no secrets.

---

Same rules as before: hirelegalhelp.com only, read-only unless Stacey says "yes" to a written plan, never change anything that already exists, never ask for or show a secret. Plain writing, no em dashes, end with the three headings.

Goal: find out whether DELA (running on Supabase) can make BD send an email to a member, so DELA can use BD's own email instead of Brevo. Report what you find, with evidence.

Step A. Look (read-only)
1. List every BD-lawfecta-dela tool whose name or description mentions email, message, inbox, notification, lead, newsletter, campaign, send or template. For each, say exactly what it does and whether it SENDS anything or only stores data.
2. List the email templates (name, ID, what event sends each one). Change nothing.
3. Read BD's developer documentation (developers.brilliantdirectories.com) if you can open it. Look for any API endpoint that sends an email, sends a member inbox message, or triggers an email template. Quote the endpoint name and its parameters.
4. Say whether BD sends an email to a member when they receive a member inbox message or a new lead, and which template it uses.

Step B. Two small tests, only after Stacey says "yes" (both go only to Stacey's own test addresses)
5. If any tool or endpoint can send an email or an inbox message: send one to the test attorney (member 687, stacey+dela-attorney@lawfecta.com) with the subject "DELA email test 1" and a one-line body. Ask Stacey whether it arrived, and how long it took.
6. If BD emails members about new leads or inbox messages: create one test lead or message for member 687 that says "DELA email test 2". Ask Stacey whether the notification email arrived, and what it looked like (sender, subject, does it show the text).
Delete nothing afterwards; tell Stacey what was created so she can remove it in BD admin if she wants.

Step C. Report, in this shape, for Stacey to paste back:

BD EMAIL REPORT
- Tools that send: (name, what it sends, to whom)
- API endpoint that sends (from the docs): (name and parameters, or "none found")
- Email templates (name, ID, event):
- Member inbox message sends an email: yes / no, template:
- New lead sends an email: yes / no, template:
- Test 1 result (arrived yes/no, minutes, sender address):
- Test 2 result (arrived yes/no, minutes, sender, subject, text shown yes/no):
- Anything changed or created: (list with IDs)
- Questions:
