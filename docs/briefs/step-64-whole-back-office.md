# Feature brief: the whole back office

Step: 64   Spec references: step 17 (the website's categories), the Lapt workflow handoff of 2026-11-19 (sections 5 and 13)
Status: first part built in acceleration mode. Stacey 2026-11-20: "Yes, Lawfecta is back office, the whole back office for law firms", with the website's category export (10 categories, 303 specialties).

## Who
Attorneys who hand over work that is not legal support (bookkeeping, intake, marketing, IT, HR, operations), and the freelancers who do that work.

## What is built now
- **DELA's instructions.** Every prompt that writes for a member (Ask DELA, document drafts, the newcomer check, automate or delegate, the public gig, profiles, proposals, the guide, the recorder, the connector) now says that Lawfecta covers the whole back office and that DELA must not add a practice area, a jurisdiction, a client matter, a court rule or an attorney decision to work that has none.
- **Words on the screens.** Home, Talent and Ask DELA no longer say "paralegals" where they mean freelancers, and the examples include a bookkeeper.
- **Profiles.** The practice area list has "All practice areas (back-office work)", so a bookkeeper or a marketer can finish their profile without choosing a practice area that does not fit.
- The categories themselves were already in DELA: the website's whole tree is copied daily (step 17), and freelancers pick from it on their profile. The export Stacey sent matches it.

## What is not built yet
- **A category on a gig**, so a marketing gig is matched to marketing freelancers by category. Today matching uses practice area (when the gig has one), skills and software.
- **A category on a Library document.**
- **Roles beyond the legal ones** in the firm profile's starting list (it has attorney, paralegal, legal assistant, intake specialist, billing/bookkeeper, office manager, outsourced freelancer). A firm can add its own.
- The document groups already include "Firm admin (HR, IT, marketing)".

## How it could go wrong
- DELA forces legal fields onto a newsletter process: the instruction forbids it; the quality check still requires an attorney decision only where the text has legal judgment words.
- A legal task loses its safeguards: nothing was removed. Attorney decision points, "Check this" and the rule against inventing court rules all stay.
- A test double keyed on an old sentence stops matching: the marker sentences were kept.

## Settings and switches it uses
None. No migration.

## Questions, and how Claude answered them (acceleration mode)
1. Change the document standard's sections? **No.** They are general already (purpose, scope, roles, steps, done when).
2. Remove "practice area" from gigs? **No, it stays optional.** DELA leaves it empty for work with no practice area.
3. Categories on gigs now? **Next step.** It changes matching, so it gets its own brief and tests.
4. Rename "Attorney" workspaces for non-attorney firm staff? **No.** The two sides stay as they are.

## Success looks like
- Asking DELA for "the steps to send our monthly client newsletter" gives a process with no invented practice area, court rule or attorney decision.
- A freelancer bookkeeper can pick "All practice areas (back-office work)".
