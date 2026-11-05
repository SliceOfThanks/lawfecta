# Feature brief: Agencies (team, hiring and bench for freelancers on the Business plan)

Step: 7d   Spec references: Decision Register C-25 (separate Business offerings for firms and agencies), Phase 1A roles table ("Agency owner / team: explicitly assigned agency or engagement resources; never owner access to all client records or auto-approved subcontracting"), threat T02 (agency members never reach unrelated firm work), plans in config/decisions.json (fl_business: $59 a month, 3% fee, 3 seats with the owner, extra seats $15 a month)
Status: answered by Stacey 2026-11-05 (see "Stacey's answers" at the end; they replace the suggestions where they differ). Approved to build, all three parts before the beta.

## Stacey's goal (2026-11-05)
In the MVP, a freelancer who works solo can upgrade to the agency plan (Freelancer Business) and grow:
- post their own gigs and get proposals from other freelancers
- add people to their bench
- add team members as the agency grows

## What exists today
| Part | Built | Missing for agencies |
|---|---|---|
| The plan | Freelancer Business (agency): $59 a month, 3% fee, 3 team seats with the owner, extra seats $15 a month (Decision Register) | Nothing changes the experience yet: today a Business freelancer works like a solo one |
| Organizations | The database already knows an "agency" organization and team members with roles | No screens to invite or remove team members on the freelancer side; the solo account is not turned into an agency |
| Posting gigs | Only verified attorneys, from an approved SOP or Workflow in the firm's Library | Freelancers have no Library and cannot post, fund milestones or review proposals |
| Proposals | Freelancers propose to attorneys' gigs | Proposals to an agency's gig; proposals sent by an agency on behalf of a team member |
| Bench | Attorneys keep a personal or firm bench of freelancers | Agencies cannot keep a bench |
| Talent search | Attorneys only | Agencies cannot search or invite freelancers |
| Payments | Attorneys fund milestones; freelancers get payouts (Stripe Connect) | An agency both pays (its own gigs) and gets paid (attorney gigs) |
| Confidential materials | Only the hiring attorney's side and the one hired freelancer | Agency team members and subcontractors |

## The important question: whose work is the agency handing out?
An agency can post two kinds of gigs, and the rules must be different:

1. **The agency's own work.** Examples: its marketing, bookkeeping, or building its own templates. No attorney's client is involved. This works like an attorney's gig today, with the agency as the client.
2. **Part of an attorney's engagement (subcontracting).** The attorney hired the agency, and the agency hands part of that work to another freelancer.
   - This means the attorney's client information and work reach someone the attorney did not choose.
   - The spec forbids subcontracting that is approved automatically.
   - So the hiring attorney must approve each subcontractor in DELA first, by name, for that engagement.
   - The supervising attorney stays Accountable (A) in the RACI.
   - The subcontractor sees only what the agency shares, and never the attorney's Confidential materials unless the attorney adds them.

Suggested: build both, with the second kind needing the attorney's approval every time.

## How it would work (suggested)

### A. Becoming an agency
- On upgrade to Freelancer Business, the freelancer's account becomes an agency.
  - The agency name comes from "Company or agency" on the profile, and it keeps the freelancer's profile, reviews and history.
  - The owner is the first of the 3 included seats.
- A new "Agency" tab on the freelancer side holds four things:
  - the team
  - the bench
  - the agency's gigs
  - the agency's Library
- **Downgrading** keeps everything readable. New gigs, invites and team changes stop. Team members keep working on jobs they were already assigned until those jobs end.

### B. The team (people who work inside the agency)
- The owner invites team members by email or Lawfecta member, up to the seats on the plan.
- Each team member needs their own Lawfecta freelancer account and their own verification.
- Roles:
  - Owner: everything.
  - Manager: posts gigs, sends proposals, assigns work.
  - Member: works on what they are assigned.
- When the agency sends a proposal to an attorney, it names who does the work. The attorney sees the agency and those team members before hiring.
- **Assigned access only.** A team member sees only the engagements assigned to them. This is the spec's T02 rule: agency members never reach unrelated work.
  - The owner sees the agency's engagements.
  - Nobody automatically sees an attorney's Confidential materials. The hiring attorney adds each named person.
- **Extra seats** ($15 a month) need billing for seats, which DELA does not have yet (BD sells the plans). Suggested: 3 seats at launch, with extra seats shipping as a setting that is off until billing for seats exists.

### C. The bench (outside freelancers the agency works with)
- It works like the attorney bench:
  - invite a freelancer
  - they accept or decline
  - the agency sees their availability
  - DELA suggests people the agency has hired before
- The agency invites bench members to its gigs first, before the open market.

### D. Posting gigs and hiring
- **The agency's Library.** An agency gets SOPs and Workflows on the Business plan, using the same document standard as attorneys. Gigs come from an approved document, so DELA's milestone check has a rubric.
- **Who may post.** The owner or a manager, on the Business plan, after the owner's verification passes. Attorneys need a verified license; for agencies, the owner's freelancer verification (LinkedIn check, profile) is suggested.
- **Talent.** Agencies get the Talent search to find and invite freelancers, the same as attorneys. Freelancers can see that a gig comes from an agency.
- **Proposals, agreement, milestones and payment** follow the attorney path:
  - the agency compares proposals and asks questions
  - both sign a fixed-fee agreement
  - the agency funds each milestone before work starts, through Stripe
  - DELA checks the work, the agency accepts it, and the freelancer is paid
- **Fees: an open decision for you.** Today the attorney (client) pays a platform fee and the freelancer pays the freelancer fee. Suggested: an agency posting a gig pays the client-side fee at the rate of its own plan (3% on Business), and the hired freelancer pays their usual fee.
- **Subcontracting an attorney's engagement.** On an engagement it was hired for, the agency clicks "Hand part of this to a subcontractor". The attorney gets a request in DELA naming the person and the part of the work, and must approve it before the gig can be posted or the person invited.
  - The agency's deadline to the attorney does not change.
  - The agency pays the subcontractor; the attorney keeps paying the agency.

## Who
- **Freelancers:** solo on Free, Plus and Pro; agencies on Business (owner, managers, members).
- **Attorneys:** they hire agencies, see who does the work, and approve subcontractors.
- **The Lawfecta Team:** sees agencies, seats and subcontracting in the admin area, and handles disputes.

## Where
- Freelancer side: the new "Agency" tab (Team, Bench, Gigs, Library), Talent, Projects for the agency's own gigs, and Work for assigned jobs.
- Attorney side: the agency badge on proposals and Talent, who does the work, subcontractor requests, and Confidential materials (adding agency people by name).
- Admin: agencies, seats and subcontractor approvals.

## How it could go wrong
- **Client information reaching people the attorney never approved.** Each subcontractor needs the attorney's approval. Team members see only their assigned jobs. Confidential materials never opens to agency people automatically.
- **An agency marking client work as "its own" to avoid the approval.** Suggested:
  - a gig made from an engagement's document always needs the approval
  - the conduct check flags agency gigs that copy an engagement's text
- **Taking the attorney client off Lawfecta, or a subcontractor going around the agency.** The same off-platform checks as messages, plus a no-poaching term in the agency's gig agreement.
- **Money timing.** The agency must fund the subcontractor's milestone before work starts, even if the attorney has not paid the agency yet. The screens say this clearly.
- **A team member leaves.** Their access to every engagement ends at once, and their work and the record stay with the agency.
- **Seats.** A fourth team member is refused until extra seats can be billed.
- **One person in two roles.** A person can be a solo freelancer, a member of an agency and an attorney, each on its own side, with nothing mixing (the "two sides" rule).

## Settings and switches it uses
New settings in the admin area:
- agency.seats from fl.team_seats
- agency.extra_seat_cents 1500 (off until billing exists)
- agency.fee_bps by plan
- agency.post_requires_verification true

New switches, all off until tested:
- agency_team
- agency_hiring
- agency_subcontracting
- agency_extra_seats

## Questions to make it better (suggested answers in brackets)
1. **Team or bench.** "Add more team members to their bench" can mean two things: people who work inside the agency (seats), or outside freelancers the agency hires gig by gig (bench). Do you want both? [Yes, both: the Team for people inside the agency, and the Bench for outside freelancers it hires through gigs.]
2. **Subcontracting attorney work.** Must the hiring attorney approve each subcontractor by name before an agency hands part of their engagement out? [Yes, every time. This follows the spec and keeps client information with people the attorney chose.]
3. **The agency's own work.** Can agencies also post gigs for their own work (marketing, admin, templates) with no attorney approval? [Yes.]
4. **Who may post.** Is the owner's freelancer verification enough for an agency to post gigs, or do you want a business check too (business name and state registration)? [The owner's verification, plus the agency's business name and state, which the team checks once.]
5. **Fees on an agency's gig.** The agency pays the client-side fee at its plan's rate, and the hired freelancer pays their usual fee? [Yes, as a setting you can change.]
6. **Proposals.** When an agency proposes to an attorney, it names the team members who will do the work? [Yes, and the attorney sees them before hiring.]
7. **Seats.** 3 seats at launch, with extra seats off until DELA can bill them? Or should BD sell extra seats as an add-on now? [3 seats at launch, extras later.]
8. **Library for agencies.** Give agencies the document Library (SOPs and Workflows) so they can post gigs from approved documents? [Yes, on Business. The milestone check needs the rubric.]
9. **The agency's proposals allowance.** Is the Business plan's monthly proposals limit shared across the whole agency, or per person? [Shared across the agency.]
10. **Downgrade.** If an agency drops back to Pro: team members finish the jobs they were already on, and no new gigs, invites or seats? [Yes.]
11. **Reviews.** Reviews after a job go to the agency and to the named team member? [Both: the agency's profile shows all of them, and each person's profile shows their own.]
12. **MVP timing.** This is a large build. Suggested order:
    1. Team and agency proposals.
    2. The agency bench, Talent and the agency's own gigs.
    3. Subcontracting with the attorney's approval.

    All before the beta? [Parts 1 and 2 before the beta. Part 3 before the beta if you want agencies to hand out client work at launch; otherwise at the end of Phase 1.]

## Success looks like
- A solo freelancer upgrades and sees the Agency tab with themselves as owner.
- They invite a team member, who signs up and verifies, and only sees jobs assigned to them.
- The agency sends a proposal naming a team member, and the attorney hires the agency.
- The agency posts its own gig from an approved SOP and invites a bench freelancer.
- The freelancer proposes, both sign, the agency funds the milestone, DELA checks the work, and the agency accepts and pays.
- An attempt to subcontract part of an attorney's job waits for the attorney's approval. If the attorney declines, the gig cannot be posted.
- A team member who leaves loses access at once.
- A fourth seat is refused.
- Downgrading stops new gigs but keeps current jobs running.

## Stacey's answers (2026-11-05)
1. **Team and bench: build both.**
   - Team: people inside the agency, who use seats.
   - Bench: outside freelancers hired gig by gig, who never use a seat.
   - Only Plus or higher can join a bench (setting agency.bench_min_plan = fl_plus).
   - In Talent, a Free freelancer's card shows "Plus plan or higher required to join a bench".
   - An email invite to a Free freelancer says they must upgrade to accept, with an "Upgrade to Plus" button. It stays open 30 days.
   - A bench member who drops to Free shows "Inactive: Free plan". They cannot be invited to new gigs, current jobs run to the end, and upgrading makes them active again.
2. **Subcontracting needs no attorney approval.**
   - The proposal and the agreement say: "This agency may use vetted subcontractors from Lawfecta to complete this work." The attorney agrees once, by signing.
   - The optional "No subcontractors on this engagement" in the agreement is off by default.
   - The engagement page lists "Who's working on this". The attorney gets an information-only notice when a subcontractor is added.
   - Every subcontractor is a verified Lawfecta freelancer, and accepts a confidentiality and no-poaching term before seeing anything.
   - The agency decides what to share and is responsible for its subcontractors. The supervising attorney stays Accountable (A).
   - The Decision Register is updated (done: config/decisions.json "Agencies", and the Phase 1A roles table).
3. **The agency's own work.**
   - Agencies post gigs for their own work and for parts of attorney engagements, with no attorney approval.
   - A gig posted from an engagement is linked to it, and its subcontractor appears on the attorney's list.
   - "No subcontractors on this engagement" blocks linked gigs.
   - The conduct check flags agency gigs that copy an engagement's text but are not linked to it.
4. **Who may post.** The owner's verification, plus the business name and state of registration, checked once by the Lawfecta Team in the admin area before the first gig goes live.
5. **Fees.** The agency pays the client-side fee at its plan's rate (3% on Business), and the hired freelancer pays their usual fee. Both are settings.
6. **Proposals.**
   - The required "Who will do this work" field lists the agency's active team members, and the agency picks at least one.
   - The attorney sees each person (name, photo, role on the job, link to their profile with experience, verification, skills and reviews), next to the agency's name, badge and reviews.
   - A change of team member after the hire sends an information-only notice and updates the list.
7. **Seats.** 3 seats at launch. The Lawfecta Team can raise one agency's seat limit by hand in the admin area, and BD bills extra seats. The agency_extra_seats switch stays off.
8. **Library.** Business agencies get SOPs and Workflows under the same standard. Every agency gig comes from an approved document.
9. **Allowance.** The proposals allowance is shared across the agency.
10. **Downgrade.** Team members and subcontractors finish their jobs. No new gigs, invites, team changes or seats. Everything stays readable.
11. **Reviews.** Each review goes to the agency and to every team member picked on the proposal. The agency profile shows all reviews, and each person shows only their own.
12. **Order, all before the beta:**
    1. Team and agency proposals.
    2. The bench with the Plus minimum, Talent and the agency's own gigs.
    3. Subcontracting.

## Build notes (Claude)
- **Team members and Confidential materials.** Team members picked on the proposal (and later assigned) act for the agency, the hired party. So they open the engagement's Confidential materials with the freelancer's rights: their own 12-hour code and their own promise. Subcontractors never see the attorney's area. They get their own engagement with the agency, and the agency chooses what to put there.
- **Who sends proposals.** The owner and managers send as the agency. A team member can still freelance on their own account, under their own plan.
- **Accepting a team invite** needs an existing Lawfecta freelancer account. A team member can be picked on a proposal only once their own verification is done.
- **Suggested for the lawyer's review:** the disclosure sentence and the subcontractor's confidentiality and no-poaching term, alongside the confidentiality clause already on that list. Some states expect a lawyer to tell the client when outside help is used.

## Addition from Stacey (2026-11-05): a fee split between the agency and a bench freelancer
**What Stacey asked:**
- When an agency adds a freelancer to its bench, the two agree on a percentage split of the fee (for example 50/50, or 30% to the agency and 70% to the freelancer).
- Both sign an agreement that sets out the split before the freelancer joins the bench.
- When milestones are paid, each one gets their own share released directly.

**How it would work (suggested):**
1. **The bench agreement.** The agency invites a freelancer to its bench with a proposed split. The freelancer can accept it or propose another split. Both sign the bench agreement (typed name and a checkbox, the same as engagement agreements). The freelancer joins the bench only after both have signed. The agreement includes the confidentiality and no-poaching terms.
2. **Assigning bench work.** On an attorney's engagement, the agency assigns a milestone, or the whole engagement, to a bench member. They then show in "Who's working on this".
3. **Paying out.** When the attorney accepts that milestone, DELA splits the freelancer side of the payment by the signed percentage. Each share is sent to its owner's own Stripe payout account, and each is recorded on its own in the money records.
4. **No separate funding.** On a split milestone the agency does not fund anything itself: the attorney's payment is shared.
5. **Separate gigs stay.** The agency's own gigs (answer 3) are still there for work outside the bench and for one-off freelancers.

**Questions (suggested answers in brackets):**
13. **Whose fee comes off each share?** [Each pays the freelancer fee of their own plan on their own share. Example on a $1,000 milestone at 30/70, with the agency on Business (3%) and the freelancer on Plus (4%): the agency gets $300 minus $9, and the freelancer gets $700 minus $28. The attorney's fee is unchanged.]
14. **One split, or one per job?** [The bench agreement sets the split for all bench work. A different split for one job needs a short addendum both sign, and it applies only to milestones not yet paid.]
15. **Limits on the split?** [The agency's share must be between 10% and 50%, as a setting you can change, so the person doing the work keeps most of it. Or should any split be allowed?]
16. **Several people on one milestone?** [One bench member per milestone at launch. Split larger jobs into more milestones.]
17. **Refunds and chargebacks** on a split milestone. [They come back from both shares in the same percentages. Any amount still held is taken first.]
18. **Payout account not set up.** If the freelancer has not set up payouts, their share waits for them. The agency's share is not held back? [Yes.]
19. **Changing or ending.** To change the split, both sign a new version, and it applies only to future milestones. If either side leaves the bench, new assignments stop, and milestones already assigned keep their split. [Yes.]
20. **Can the attorney see the split?** [No. It is private between the agency and the freelancer. The attorney sees who is working, not how the fee is shared.]
21. **Bench members and the Plus plan.** A Free freelancer cannot join a bench (answer 1). If a bench member drops to Free, their assigned milestones still pay out by the split? [Yes. Jobs already on run to the end.]

Note: paying two people from one milestone needs Stripe Connect "separate transfers" through the payments adapter. Stripe supports this. It stays in test mode until live payments are turned on.
