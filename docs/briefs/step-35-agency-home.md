# Step 35: the agency Home

Stacey 2026-11-17, her four answers to the questions of step 34, in her words:
1. "Owner only. Agency financial information is visible only to the main agency account. Agency freelancers see their own freelancer dashboard, earnings, projects, and activity. We do not have a manager role."
2. "Yes. Add a weekly available-hours field for each agency team member, editable by the member or agency owner. If hours aren't entered, show assigned job counts and 'Hours not set.' Never calculate capacity percentages without sufficient data. If possible a button agency can push to notify the freelancer to set it."
3. "Both. Display 'Paid by clients' and 'Paid out to agency' separately. Neither should be labeled as profit."
4. "Switch. The main agency account should have a 'My Work' / 'My Agency' toggle at the top of Home. Each view should have its own customizable widgets and saved layout. Agency freelancers only see their personal freelancer dashboard."
"Important: All figures must come from actual platform records, and agency financial information must never be exposed to individual freelancer subaccounts."

Status: built.

## Who
The main agency account: the freelancer on the Business plan who owns an active agency. Nobody else. A team member, whatever their role in the agency, has only their own freelancer Home.

## What was built
- On Home, the owner has a switch "My work" / "My agency" at the top right, next to "Customize dashboard". "My work" is their own freelancer Home. "My agency" is headed "Agency Workspace". The choice is remembered in that browser. Each view has its own widgets, order and saved layout.
- The server decides who owns an agency (dela_agency_owned). The agency summary, the agency layout and the reminder are refused for everyone else, and the refusal carries no figures (tested with two team members and a manager).

## My agency: six by default
| Widget | Shows | From |
|---|---|---|
| Agency revenue and payments | "Paid by clients" (what clients paid for the agency's jobs, without platform fees) and "Paid out to agency" (what was sent to the owner's payout account), for this month, quarter or year; "Waiting for payout to the agency" when there is some; paired bars for six months. A line says neither amount is profit. | payments and payouts of agreements made in the agency's name |
| Team workload and availability | Team members, how many are on a job now; each person with their jobs and "N hours a week" or "Hours not set"; "Ask to set hours" beside a member without hours | org_members, engagement_team |
| Recommended agency gigs | The same matching open gigs as on My work | /work |
| Proposals and sales pipeline | Invitations, under review, chosen, not chosen, and the newest rows | /work |
| Active client projects | Up to three jobs, nearest due date first: client, milestones accepted of total, next milestone and due date, who is named, "Overdue" in words | agreements, milestones, engagement_team |
| Needs team attention | Overdue jobs, jobs with no team member named, and what waits on the owner | the same records |

Optional: Upcoming meetings, Recent messages, Urgent notifications, Ask DELA, Monthly usage, Quick actions.

## Weekly hours
- Where: the Agency page, https://www.lawfecta.co/dela?tab=agency. The owner sees a box "Hours a week" with "Save hours" in every row of the "Team" card. A team member sees the same box in the card "Agencies you work with", for each agency they belong to.
- Empty means not known. It shows as "Hours not set", never as zero.
- "Ask to set hours" (owner only, on Home and on the Agency page) sends the member one notification and one email, at most once in 24 hours. The button then reads "Asked today". It is not offered once hours are set.
- No percentage of capacity is shown anywhere. When every member has hours, the card shows the team's total hours a week and says DELA does not record hours worked.

## Decisions Claude made (change any of them)
1. "Paid by clients" leaves out the platform fee the client paid to Lawfecta, because that money never belongs to the agency.
2. "Paid out to agency" is what reached the owner's payout account for agency jobs. A team member's share is never part of any agency figure on Home (an existing rule: the agency does not see a member's held payout).
3. A job is "Overdue" when its next milestone's due date has passed and the work is funded and not yet delivered. A milestone waiting for the client's review or payment is not the team's delay.
4. Hours are whole numbers from 0 to 80.
5. Revenue trend against a goal, pipeline value, utilization, at-risk scores and match percentages from the mockup are left out: DELA records none of them.
6. The "My work" / "My agency" choice is remembered per browser, like the folded menu.

## One thing to know
The Agency page lets an owner give a team member the role "Manager" (it was built in step 7d). Stacey: "We do not have a manager role." For this step a manager is treated as a team member: no agency money, no agency Home. Removing the role from the Agency page is a separate change that needs her word, because it also decides what today's managers can still do (invite members, name people on jobs).

## How it could go wrong
- A team member opens the agency view by hand: the server refuses, Home falls back to their own (tested in the browser).
- The owner stops being on the Business plan: the agency is no longer active, the switch goes away, and Home is the freelancer Home.
- Hours typed as "2.5" or "100": refused with a plain sentence.
- The owner clicks "Ask to set hours" twice: one notification.

## Success looks like
ChatGPT check 7, docs/tests/agency-home-chatgpt-prompt.md, when a test agency exists on the site (see "What you need to do next" in the update for this step).
