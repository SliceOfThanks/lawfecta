# Feature brief: categories on documents and gigs

Step: 70   Spec references: step 17 (the website's categories, Talent), step 4 (gigs and matching), step 64 (the whole back office)
Status: built in acceleration mode. Stacey 2026-11-20: "Lawfecta is back office, the whole back office for law firms", and "Yes, build it" to categories on gigs and documents.

## Who
Attorneys who post work that is not tied to a practice area (bookkeeping, intake, marketing, IT, HR), and the freelancers who do that work.

## What
- A document (SOP or Workflow) has a card "Category": up to 5 of Lawfecta's categories, picked with the same search box freelancers use on their profile. Saved as soon as one is picked or removed.
- A gig made from a document starts with the document's categories. On the gig form the attorney sees them under "Category" and can change them.
- Freelancers reading the gig see its categories.
- Matching: a freelancer who picked a category in the same branch (the category itself, one directly under it, or the one it sits under) gets more points and the reason "Works in <category>". On a gig that has categories and no practice area, a freelancer outside them starts lower, so they are no longer suggested just for being available.

## Where
- A document's page in the Library, the card "Category" under "Automate or delegate" (on the draft and the other tabs, not on "Approved version").
- Post a New Gig, step 2, "What freelancers will read", the field "Category" above "Practice area".
- A gig's page for freelancers, under the budget and deadline boxes.

## Why
Until now a gig was matched by practice area, tools and skills. A bookkeeping or marketing gig has no practice area, so nothing told DELA who does that kind of work.

## How it could go wrong
- DELA invents a category: it cannot. Only keys that exist in the website's categories are kept, and the gig draft takes them from the document, never from the AI.
- A gig with a category finds nobody: true until freelancers pick categories on their profile. The match list says so by being short; tools and skills still count.
- A legal gig loses matches: no. A gig with a practice area is matched as before; the category only adds points.
- Someone from another firm sets a document's categories: refused. Only an editor of that Library.
- Older gigs break: a gig without categories keeps its old shape and is matched exactly as before.

## Settings and switches it uses
Switch gig_categories. Settings gig.categories_max (5), matching.category_points (25), matching.category_miss_base (5). Migration 0151.

## Questions, and how Claude answered them (acceleration mode)
1. Where do a gig's categories come from? **From its document**, changeable on the gig.
2. Which levels can be picked? **A specialty or a task**, as on the freelancer profile. Not a top category alone: it is too wide to match on.
3. Must a gig have a category? **No.** It is optional, like practice area.
4. Should a category be a hard filter? **No, points.** Few freelancers have picked categories yet; a hard filter would return nobody.
5. How wide is "the same category"? **One step up or down the tree.** A gig in "Medical Malpractice Review" fits someone who picked "Medical Chronology Creation" under it.
6. Policies and Playbooks (the guidance types)? **No card.** They are not handed over as gigs.

## What is not built
- "Freelancers who fit this document" still goes by practice area, tools and skills.
- Filtering the Library or Projects by category.
- DELA suggesting a category for a document.

## Success looks like
- A document shows "Category" with a search box; picking "Bookkeeping" saves it.
- A new gig from that document shows the same category on step 2.
- The gig's matches list a freelancer who picked that category, with "Works in ..." as a reason.
