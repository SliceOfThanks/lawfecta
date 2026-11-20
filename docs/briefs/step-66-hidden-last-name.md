# Feature brief: a freelancer's last name stays hidden until hired

Step: 66   Spec references: step 17 and 18 (Talent, the profile page), step 6 (agreements)
Status: built in acceleration mode. Stacey 2026-11-20: "their last name should be only visible when an attorney hires them ... 'Stacey L.' and not 'Stacey Lake' until hired", "so attorney cannot bypass".

## Who
Attorneys and agencies looking for people, and every freelancer.

## What
An attorney who has not hired a freelancer sees the first name and the first letter of the last name: "Stacey L.". The full name shows once both have signed an agreement. The freelancer, the Lawfecta Team, people on the same team (firm or agency), an agency looking at its own bench and an attorney looking at their own bench see the full name.

## Where
Everywhere a name is sent: Talent, the profile page, the profile pop-up, bookmarks, gig matches, proposals and compare, agency team members on a proposal, the Inbox and conversations, meetings and the name shown inside a meeting room, "freelancers who fit this document", Home, the engagements list, the agreement's own text before both have signed, and the ChatGPT and Claude connector.

## Why
A full name is enough to find someone on LinkedIn or by a web search and hire them outside Lawfecta.

## How it could go wrong
- One page is forgotten and leaks the name: the rule does not live in the pages. Every answer the server sends to a signed-in member passes one guard that shortens names. A new page is covered without anyone remembering to.
- The attorney picks a proposal only to read the name in the agreement, then cancels: the agreement's text shows the short name until both have signed. The stored agreement keeps the full legal name, and the name the freelancer typed to sign is hidden until then too.
- A file or a gig that sits next to a person's id is renamed by mistake: only a value that is exactly that person's name is changed.
- The freelancer types their own last name in a message or a proposal: DELA does not rewrite what people write. The existing check for contact details in messages still applies.
- The guard fails: the answer is not sent (an error), so a failure never shows the full name.
- The public website listing shows the full name: it does. See "Open".

## Settings and switches it uses
Switch hide_last_names (group "Gigs and hiring"). Migration 0147.

## Questions, and how Claude answered them (acceleration mode)
1. When exactly is someone "hired"? **When both have signed the agreement.** Choosing a proposal is not enough, or an attorney could choose, read the name and cancel.
2. Does the whole firm see the name after one of its attorneys hires? **Yes**, the hire is the firm's.
3. Agency team members named on a proposal? **Short too**, until the agency is hired.
4. Do freelancers see attorneys' full names? **Unchanged.** Attorneys show their firm name.
5. The name in a meeting room before a hire? **Short.**
6. Reviews the freelancer wrote? Already first name only.

## Open
- The public listing on the website shows the freelancer's full name to any visitor. DELA cannot hide that. It needs a change in the website's listing settings or template, as a prompt for the BD connector.
- A profile photo can identify a person as well. Not changed.

## Success looks like
Attorney login, a freelancer not hired: "Fran L." on Talent, the profile page (with the line "The last name shows once you have hired this freelancer."), proposals and the Inbox. After both sign: "Fran Lance" for that freelancer only.
