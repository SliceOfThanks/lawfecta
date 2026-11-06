# Feature brief: attorney plan usage limits (MVP)

Step: 9b   Spec references: developer notes from Stacey 2026-11-06; config/decisions.json att.playbooks_saved, ai.runs, storage.mb
Status: questions answered 2026-11-06 (four by Stacey, the rest use the suggested answers until she says otherwise). Approved to build.

## Who
Attorneys on the four attorney plans: Attorney Free (BD plan 5), Attorney Plus (13), Attorney Pro (12) and Attorney Business (14). Business limits are shared by the whole firm. The Lawfecta Team manages limits and bonus actions in the admin area.

## What
- Each plan gets its own limits on saved playbooks, DELA actions per month and storage:

  | Plan | Saved playbooks | DELA actions a month | Storage |
  |---|---|---|---|
  | Free | 3 | 50 | 1 GB |
  | Plus | 15 | 300 | 10 GB |
  | Pro | 50 | 1,000 | 50 GB |
  | Business | Unlimited | 2,500, shared by the firm | 200 GB, shared |

- **Warning and blocking:** at 80% of any limit DELA shows a yellow banner with "Upgrade". At 100%, only that one action stops, with a pop-up offering "Upgrade" and "Not now".
- **Never blocked:** viewing, exporting and assigning playbooks, messaging, posting engagements, hiring and paying.
- **Downgrades:** the most recently edited playbooks stay editable up to the new limit. The rest are read-only, with a lock and "Upgrade to edit this playbook." Over-limit storage blocks only new uploads.
- **Where attorneys see usage:** a Usage page at /account/usage, and a small meter "38 of 50 this month".
- **Admin:** a page lists every attorney's usage and AI cost, flags anyone over $10 of AI cost in a month, and lets the team grant bonus actions with a note.

## What DELA already has (code check 2026-11-06)
- **Plans:** att_free, att_plus, att_pro and att_business, each with its own limits (plan_features). The Lawfecta Team edits the limits in the admin area without a release, and the admin Plans tab links each BD plan ID to a DELA plan. The four attorney plan IDs are not linked yet.
- **Counters:**
  - monthly counters per person (quota_usage) that reset on the 1st, Pacific time;
  - a reserve-then-confirm step, so two clicks never count twice;
  - "Set by the Lawfecta Team" plan grants.
- **AI use:** counted as weighted credits on Lawfecta's key (ai.runs: Free 25, Plus 100, Pro 300, Business 1,000 a month; provisional). Each task costs a set number of credits; a member's own key uses none. Every AI call is logged with its provider, model and tokens (ai_usage), but not with a cost in money yet.
- **Storage:** storage.mb, suggested at Free 250 MB, Plus 1 GB, Pro 5 GB, Business 20 GB. Not confirmed.
- **Playbooks:** att.playbooks_saved is unlimited on every plan (Stacey, Decision Register v1.1).
- **How DELA learns the plan:** from the signed DELA-Auth pass each time a DELA page opens, not from the BD API. A plan change shows on the next DELA page load, so there is no 15-minute gap for an attorney who reloads. DELA can also read the plan through the BD API (user get already works).
- **Firms:** firms already have members and roles in DELA, but counters are kept per person today, not per firm.

## How it could go wrong
- Two counts of AI use (credits and actions) confuse members. Answer below decides one.
- A shared firm counter on Business races when two people act at once. It uses the same reserve-then-confirm step, at firm level.
- A downgrade locks the playbook someone is editing. The lock applies at the next save, and the editor's unsaved text is kept in the box.
- The pop-up blocks something that earns money. Guard: the never-blocked list is enforced in code and tested.
- The BD plan read fails (BD down, key permission). DELA keeps the last known plan and never drops a paying member to Free on an error.
- AI cost in dollars depends on the model's price. The price per model is a setting, so the cost follows the provider's real price.

## Settings and switches it uses
- **Per-plan limits:** the three limits above (plan_features), editable in admin.
- **Warning and cost:** the 80% warning point and the $10 monthly AI cost flag.
- **Bonus actions:** grants per member per month.
- **Model prices:** price per million tokens for each AI model.
- **Switch:** "usage_limits_enforced", off until Stacey turns it on. While it is off, DELA counts and shows usage but blocks nothing.

## Questions to make it better
1. AI use: today DELA counts weighted credits (a long document draft costs more than a short answer). The note counts every AI response as one DELA action. Switch to one action per response (simpler for members, less tied to cost), or keep weighted credits and rename them "DELA actions"? Suggested: one action per response, with the cost recorded so you can see real cost.
2. Freelancers share ai.runs today. Keep freelancer AI limits as they are for now (the note sets attorney values only)?
3. Saved playbooks were "unlimited on every plan" (Decision Register v1.1). Confirm the new 3, 15, 50, unlimited, and that it counts every saved document (SOPs, workflows, policies and playbooks, drafts included, archived and trash not counted).
4. Plan check: DELA already reads the plan each time a DELA page opens, from the signed sign-in pass. Is that enough, plus the 2:00 AM nightly BD API sync and the admin "Resync plan" button? A 15-minute timer adds BD API calls for every open tab. Suggested: page load plus nightly plus Resync.
5. /account/usage and /account/upgrade are Brilliant Directories pages. Claude makes the Usage widget; you add the page in BD (Member Dashboard, Account Settings). What address on hirelegalhelp.com opens the upgrade page with a plan already chosen? Claude can check BD's upgrade page if you confirm the address.
6. Attorneys who use their own AI key: do their actions count against the monthly limit? Today they do not use credits. Suggested: they do not count, as today.
7. Business "shared by the firm": count all members of the firm's DELA workspace together, owner included?
8. Turn on: count and show usage on the test site first, with blocking off, then turn blocking on after a test. Agreed?

## Success looks like
- A Free attorney with 3 saved playbooks gets the pop-up on the 4th, and can still view, export and assign the 3.
- At 40 of 50 actions the yellow banner shows. At 50, AI answers stop with the pop-up, and hiring, messages and payments still work.
- A Business firm's counter is shared: two members' actions add up.
- A downgrade from Pro to Free with 10 playbooks leaves the 3 most recently edited ones editable and 7 read-only with the lock.
- The admin page shows each attorney's usage and AI cost, flags anyone over $10, and a bonus grant raises that month's limit only.

## Stacey's answers (2026-11-06)
1. AI use: keep weighted credits, shown to members as "DELA actions". A heavier task (for example a full document draft) uses more than a short answer. The monthly numbers become 50, 300, 1,000 and 2,500 for attorneys. Each response also records its real AI cost.
2. Freelancer AI limits stay as they are (suggested answer; the note sets attorney values only).
3. Saved playbooks: 3, 15, 50, unlimited, counting every saved document (SOPs, workflows, policies, playbooks, drafts included; archived and trash not counted). Suggested answer.
4. Plan check: page load (already built) plus the 2:00 AM Pacific nightly BD sync and the admin "Resync plan" button. No 15-minute timer.
5. Upgrade address: open. Until Stacey confirms the address that preselects a plan, the Upgrade buttons open /account/upgrade.
6. Own AI keys do not count against the monthly limit.
7. Business: one shared counter for everyone in the firm's DELA workspace, owner included. Suggested answer.
8. Go live: counting, banners, the Usage page and the admin page ship on; blocking ships behind the switch usage_limits_enforced, off until Stacey turns it on after the test.
