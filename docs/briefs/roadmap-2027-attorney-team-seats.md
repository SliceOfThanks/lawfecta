# Roadmap note: attorney team seats (after the MVP, 2027)

Status: roadmap only. No build before 2027. The first 2027 task is a feasibility review and a written estimate; Lawfecta decides whether to build after that.

## The request (Stacey 2026-11-06, summarized)
- **Where it lives:** a Team tab at /account/team, with a seat counter ("2 of 3 seats used") and a list of team members (name, email, role, date added, Active or Invite sent).
- **Roles:**
  - Owner: one per firm, cannot be removed.
  - Admin: adds and removes people.
  - Member: uses DELA only.
- **Adding people:** "Add team member" sends a 30-day invite. Accepting creates a BD sub-account under the Owner (BD post type 73, "Sub Accounts"), or links an existing login.
- **Removing people:** removal is immediate and the work stays with the firm. A removed person's login becomes their own Attorney Free account, with none of the firm's data.
- **Lower plans:** Free, Plus and Pro show "Team members are part of the Business plan. Add up to 3 people, including you." with "Upgrade to Business".
- **Extra seats:** $25 a month or $250 a year each, as an admin setting. Billed as a line item on the firm's billing date, first charge prorated. A seat can't be removed while someone uses it.
- **Downgrade from Business:** team members keep access until the end of the paid period. The Owner is emailed 7 days before access ends.
- **Activity log:** every add, remove and seat change is logged for the Owner and the Lawfecta Team.
- **Agencies:** one seat system, also used by Agency Business (freelancer plan 9). Extra-seat purchase for agencies stays off until Lawfecta turns it on.

## What already exists in DELA (2026-11-06)
- Firms and agencies already have members and roles in DELA (organizations, org_members). Agencies already have team seats, invites, roles and a seat limit the Lawfecta Team can raise by hand (step 7d).
- config/decisions.json: att.team_seats is 1, 1, 1 and 3 (Business includes the owner). The extra seat price on file is $15 a month (seats.extra_monthly_cents = 1500, Decision Register v1.1), not $25. The 2027 review needs one price.
- BD sub-accounts are not used by DELA today.

## Feasibility review (first 2027 task)
1. How BD Sub Accounts link to the owner, and whether DELA can create and remove them through the BD API.
2. Whether BD billing can charge a recurring add-on line item on the plan's billing date, or seats must bill through Stripe.
3. A written recommendation:
   - the approach
   - an estimate in hours
   - any part BD cannot support
   - the closest workable alternative for each of those parts
