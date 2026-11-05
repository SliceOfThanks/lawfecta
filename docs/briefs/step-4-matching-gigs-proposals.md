# Feature brief: Matching, Flex Gigs, proposals and the tech catalog

Step: 4   Spec references: 1A sections 13 (technology catalog), 15 (Matching, Flex Gigs and expiration), 16 (Proposals, Q&A and quotas); Decision Sheet sections 4 and 5 (C-10, C-11, O-10)
Status: draft, waiting on Stacey's answers (each question has a suggested answer)

## Already decided (Decision Sheet, confirmed)
- Open Flex Gigs at one time: Free 1, Plus 3, Pro 10, Business no cap (spam and security limits still apply).
- Proposals per month: Free 5, Plus 20, Pro 50, Business no cap (spam and rate limits still apply). Matches stay visible when the allowance runs out. No buying extra proposals.
- A gig stays open 14 days. The attorney gets reminders on days 10 and 13. One extension of 14 days.
- Proposals stay actionable for 7 days after a gig closes.
- Only verified attorneys post gigs and hire (Step 3).

## Who
- Attorneys on every plan, plus firm staff with a role that allows it.
- Freelancers on every plan who are match-ready (Step 3).
- The Lawfecta Team: moderates gigs, the tech catalog and reports of misuse.

## What
Attorney side
1. **Post a Flex Gig from an approved playbook.**
   - DELA writes a public version of the playbook: the task, the outcome, the steps in short form, tools, timing and the state. The attorney reviews and edits it before it posts.
   - The attorney sets a budget range (in cents), a deadline, and the milestones (for example "draft" and "final").
   - The full playbook and any shared files go only to the freelancers the attorney invites or hires, never to public applicants.
2. **Matches.**
   - DELA first checks who is eligible:
     - match-ready
     - availability confirmed in the last 14 days
     - the right practice area and skills
     - not excluding the attorney's state
     - no hold
   - Then it ranks them, with a plain reason for each, for example "Uses Clio; family law; 15 hours a week free". It shows fewer people rather than inactive ones, and no "fit percentage".
3. **Invite.** The attorney invites matched freelancers to send a proposal. An invited freelancer sees the full playbook for that gig only.
4. **Compare proposals side by side:**
   - price against the budget range (outside the range is labeled, never hidden)
   - what is included and what is left out
   - milestones and the timeline
   - the freelancer's relevant qualifications
5. **Questions and answers.** Freelancers ask questions on the gig. The attorney answers either for everyone or privately for one person. The client information check runs on both.
6. **Select a proposal.**
   - Selecting starts a draft agreement. Signing and funding come in Step 6.
   - The gig closes, unless the attorney chose more than one hire.
   - Other applicants get a polite closing notice, with no details about the chosen proposal.
7. **Talent tab.** Search match-ready freelancers by practice area, skill, tech tool and state, and invite one to a gig.

Freelancer side
1. **Work tab.**
   - Matches: gigs that fit the profile, each with a plain reason.
   - Invitations.
   - Open gigs (when public gigs are on).
   - Saved drafts.
   - Sent proposals.
2. **Before spending a proposal,** the freelancer sees the task, budget range, deadline and milestones.
3. **Proposal form:**
   - total fixed price and the amount for each milestone
   - what's included and what's excluded
   - schedule
   - relevant qualifications, taken from the profile. DELA may draft these but never invents qualifications.
4. **The allowance counter:** "3 of 5 proposals left this month". A proposal counts once, when it is sent. Drafts, edits and technical retries never count twice.
5. **Withdraw a proposal.** The allowance comes back only in the cases question 2 allows.

Tech catalog
- A Lawfecta-approved list of legal tools: name, category, what it is good for, the website, and the plans that suit a small firm.
- The Lawfecta Team adds, edits and pauses entries in the admin area.
- DELA recommends tools only from this list, and says plainly when no listed tool fits.
- The profile tech tools (Step 3) link to catalog entries, so matching can use them.

DELA in ChatGPT and Claude (connector)
- Attorneys: list my gigs; draft a gig from a playbook (saved as a draft); see proposals for a gig.
- Freelancers: list my matches and invitations; draft a proposal (saved as a draft; sending stays on the website while connector write actions are off).

## Where
- Attorney:
  - "Projects" tab: my gigs, posting, proposals, comparison and selection.
  - "Talent" tab: search and invite.
  - Playbook page: a "Post as a Flex Gig" button for approved playbooks.
- Freelancer: "Work" tab: matches, invitations, open gigs, drafts and sent proposals.
- Emails and notices:
  - new invitation
  - new proposal
  - a question answered
  - gig reminders (days 10 and 13)
  - gig closing
  - selected, or not selected
- Admin area: a "Gigs" tab (open gigs, reports, proposals per plan, pause a gig) and a "Tech catalog" tab.

## When
- A gig is open 14 days, with one 14-day extension and reminders on days 10 and 13. After that it closes by itself, and the server checks the time on every action.
- Proposals stay actionable 7 days after the gig closes.
- Allowances reset each month (question 3).
- Changing a gig's budget or scope notifies everyone who applied, once. A big change asks applicants to confirm their proposal again.

## Why
- This is where attorneys get work done and freelancers get paid work: the core of the marketplace.
- Clear matching reasons, visible budgets and honest comparisons build trust on both sides.
- The tech catalog lets DELA recommend tools responsibly, from a list Lawfecta controls.

## How it could go wrong
- An unverified attorney tries to post: refused with a plain message (Step 3 already checks this).
- A freelancer becomes unavailable or goes on hold after matching: they are checked again when invited and when hired.
- Two clicks on "Send proposal" with the last allowance left: exactly one proposal is sent and counted.
- Sending to a gig that has closed: refused, even if the page is old.
- A low price that leaves out work: the comparison shows what is included, so cheap and complete are not confused.
- Client information in a gig, a question or a proposal: the same check as everywhere else, plus the notice.
- Contact details or payment talk to go around Lawfecta in a proposal or question: flagged and held for the Lawfecta Team (this grows in Step 5 with chat).
- Spam proposals on Business (no cap): rate limits per hour and per day.
- A competitor sees another applicant's proposal: never. Each applicant sees only their own.
- An invited freelancer shares the full playbook: they agreed to confidentiality on their profile (Step 3). The playbook view shows a watermark with their name.
- The attorney picks a proposal after it expired: they are asked to reconfirm with the freelancer first.

## Settings and switches it uses
- Switches:
  - flex_gigs
  - public_gigs (off: gigs go only to matches and invited freelancers)
  - talent_search
  - tech_catalog
  - multiple_hires (off)
- Settings already in the Decision Sheet: gig days, reminders, extensions, the actionable days, the plan allowances.
- New settings: proposal rate limits, the minimum budget for a gig (question 8) and the matching weights (question 6).

## Questions to make it better
1. Does a proposal sent in answer to an attorney's invitation use the freelancer's monthly allowance? Suggested: no, so invited freelancers answer quickly.
2. When does a withdrawn proposal give the allowance back? Suggested: only if the attorney canceled the gig or changed it a lot.
3. Allowances reset on the 1st of each month, Pacific time? Suggested: yes (please confirm Lawfecta's time zone).
4. Can an attorney hire more than one freelancer from one gig? Suggested: no by default; a switch you can turn on later.
5. Should gigs also be open to any match-ready freelancer (public gigs), or only to matches and invited freelancers at first? Suggested: matches and invitations first; public gigs once there are enough freelancers, with the public_gigs switch.
6. How should matches be ranked? Suggested:
   - practice area and skills first
   - then tech tools in common
   - then hours free
   - then people the attorney worked with before (Step 7)
   - then recent activity
   - No ranking by reviews until there are enough, and never by membership plan.
7. What should a freelancer see before using a proposal? Suggested: the public gig (task, outcome, short steps, tools, state, budget range, deadline, milestones); the full playbook only when invited.
8. Should there be a minimum gig budget? Suggested: $50 (an Open setting), so gigs cover Lawfecta's $10 per party fee floor.
9. Questions on a gig: may the attorney answer publicly for all applicants? Suggested: yes, or privately to one; both go through the client information check.
10. Tech catalog: start with about 40 common legal tools for you to approve, maintained by the Lawfecta Team? Suggested: yes; DELA recommends only from this list.
11. Talent tab: may attorneys browse and search match-ready freelancers and invite them directly, without posting a gig first? Suggested: yes, an invitation needs a gig, so DELA offers to create one from a playbook in the same step.
12. Files for a gig: may the attorney share Files (Step 2a) with invited or hired freelancers? Suggested: yes, read only, only for that gig, with downloads logged, and access ends when the gig closes without a hire.

## Success looks like (the test, grouped by login)
1. Attorney:
   - Post a gig from an approved playbook, editing the public version.
   - See matches with reasons, and invite two freelancers.
   - Answer one question publicly and one privately.
   - Compare proposals, with one outside the budget labeled.
   - Select one: a draft agreement is waiting for Step 6, and the gig closes.
2. Freelancer 1:
   - See the match and the invitation, and read the full playbook (watermarked).
   - Send a proposal, and see the allowance drop by one, or not if invited (question 1).
   - Try to send twice quickly: only one is sent.
3. Freelancer 2: with no allowance left, matches stay visible and sending explains the limit.
4. Owner:
   - The Gigs tab shows the gig and the proposals.
   - Pause a gig.
   - Add and pause a tech catalog entry.
5. Check the results:
   - The chosen freelancer is told they were selected.
   - The other freelancer gets a closing notice without competitor details.
   - A closed gig refuses a new proposal.
