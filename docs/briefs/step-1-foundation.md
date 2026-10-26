# Feature brief: Step 1, Foundation

Step: 1   Spec references: 1A sections 3, 4, 5, 6, 8, 25, 26, 27, 29; C-01, C-25, C-29, O-01, O-09, G-IDENTITY
Status: built and tested locally; questions below waiting on Stacey

## Who
- Attorneys and freelancers with a Lawfecta account (each side on its own plan).
- Firm and agency owners later (the structure is in place).
- The Lawfecta Team: owner (Stacey), and later reviewers, support and finance.

## What
- Members open DELA from the Lawfecta site without a second login, and land on the right side (Attorney DELA or Freelancer DELA).
- They see their plan and what it includes, and notices about their work.
- The Lawfecta Team controls who can open DELA, which plan each BD plan maps to, every business number, and every on and off switch, with full history.

## Where
- BD page /dela (DELA-App widget) and /dela-admin (DELA-Admin widget). Both need the member to be logged in to BD.
- Notices: in DELA (Notices button) and by email.

## When
- Every page load makes a new one-use pass that lasts 10 minutes. A DELA sign in lasts 8 hours (setting session.hours).
- Removing someone from the access list signs them out right away.
- Changing a plan or a setting applies on the member's next page load.

## Why
- Every later step (playbooks, gigs, payments) depends on knowing exactly who someone is, what side they are on, what their plan allows, and what the Lawfecta Team has approved.

## How it could go wrong (and what stops it)
- Someone fakes a member ID: the pass is signed on BD's server with a secret the browser never sees.
- Someone reuses a pass: each pass works once.
- A member opens the admin area: refused on the server, not just hidden.
- Two clicks use an allowance twice: reservations with one key count once, and a lock stops two requests from overspending.
- BD styles break DELA: DELA draws inside its own sealed area.
- A bad change to prices: plan edits are drafts until approved, old versions are kept and locked.
- An admin change nobody can explain: every change is in the audit log, which cannot be edited.

## Settings and switches it uses
access.mode, session.hours, quota.timezone, trial.days, trial.tier, trial.starts, data.notice_text, email.sender, code_version, environment. Switch: trials (off).

## Questions to make it better
1. What is the Lawfecta site address, and should DELA live at /dela and the admin area at /dela-admin?
2. What time zone should Lawfecta use for monthly resets and deadlines? (Pacific is the placeholder.)
3. Do you have Lawfecta brand colors, fonts and a logo? Step 1 uses a neutral navy look until then.
4. Is 8 hours right for how long a DELA sign in lasts before a page refresh is needed?
5. Should the free trial (switch "trials") be on at launch, and should it unlock Pro for 7 days?
6. When a member's BD plan is not linked to DELA yet, they see "Almost there". Do you want to be emailed when that happens?

## Success looks like
- Logged out: asked to log in. Off the access list: told DELA is not open yet.
- Test attorney lands on Attorney DELA with attorney limits only. Test freelancer lands on Freelancer DELA with 5 proposals a month.
- A person with both sides can switch.
- Stacey can add and remove people, link BD plans, change a price through draft and approve, change a setting, flip a switch, send herself a test notice, and see all of it in the audit log.
- A member cannot open the admin area. A removed member is turned away.
- Works on a phone with no sideways scrolling.
