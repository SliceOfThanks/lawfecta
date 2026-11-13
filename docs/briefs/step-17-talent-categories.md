# Feature brief: Talent search by the website's categories

Step: 17 (after go-live)   Spec references: step 4 Talent (docs/briefs/step-4*), step 3 profiles, the website's member categories
Status: approved to build (Stacey 2026-11-12, in chat: "this page should load the top categories, sub categories and sub sub for BD. there should also be a search bar where they can free add something but this needs to be a more structured search experience"; she then replaced the website's old categories with new ones the same day)

## Who
Attorneys (and agencies that hire) searching for freelancers on Talent; freelancers, who say which categories they work in on their Profile page; the Lawfecta Team, who keeps the category list on the website.

## What
- Talent: one search bar ("Search roles, specialties, tasks and software") that suggests matching categories as the member types, with their place in the list ("Paralegal Services, Family Law, Discovery Support"). Below it three lists that narrow each other: "Category" (the website's top categories), "Specialty" (its sub categories) and "Task, case type or software" (the sub sub categories), plus "State you need". Typed words that are not a category still search the freelancers' headline, summary, skills, services and software.
- Profile (freelancers): a "Lawfecta categories" section where the freelancer picks the categories they work in, by search or by browsing the same three levels. Search results show each freelancer's categories.
- The old "Practice area", "Skill" and "Tech tool" boxes on Talent are replaced by the above. "✦ Help me find a fit" still works: a suggestion that names a category picks it; any other suggestion goes into the search bar.

## Where
- Member: Talent (/dela?tab=talent), Profile (/dela?tab=profile) for freelancers.
- Website: the categories are read from www.lawfecta.co (BD top categories and sub categories, sub sub categories are sub categories under another one).
- Admin: Tech catalog page, a "Website categories" card with the count, the time of the last copy and "Refresh now".

## When
- DELA keeps its own copy of the website's categories, refreshed once a day and whenever the team clicks "Refresh now". The first time anyone opens Talent with no copy yet, DELA copies them at once.
- A category removed from the website disappears from the lists at the next refresh; freelancers who had it keep the others, and the removed one stops counting in searches.

## Why
Attorneys need to find the right person in a few clicks, with the same words the website uses, instead of guessing free text. Freelancers get found for exactly what they do.

## How it could go wrong
- The website refuses the category list (the API key lacks permission for list_professions or list_services): the admin card says so with the fix; the lists stay as they were; Talent still works with the search bar.
- The website answers with no categories at all (an outage): DELA keeps its last copy rather than emptying the lists.
- Two categories with the same name (for example "Clio" under several specialties): suggestions show the full path, so the member picks the right one; choosing a top category or specialty also finds everyone in the categories below it.
- A freelancer picks many categories to show up everywhere: capped by the setting profile.categories_max (25).
- A freelancer with no categories yet still shows when no category is chosen, and is reminded on the Profile page.

## Settings and switches it uses
- categories.refresh_hours (24): how old the copy may get before DELA refreshes it.
- profile.categories_max (25): the most categories one freelancer can pick.
- bd.push_categories (false): when on, saving the profile also writes the categories to the member's website listing (top category and sub categories), so the public directory matches. Off until Stacey says so.
- Switch talent_search (unchanged).

## Questions to make it better (defaults used, Stacey's standing instruction to build)
1. Should a freelancer's categories also go onto their public website listing? Default: no (bd.push_categories off) until you say so.
2. Should picking categories be required for a freelancer to be match-ready? Default: no, so nobody drops out of search today; the Profile page asks for them.
3. Should gigs also carry a category, so DELA can suggest freelancers by it? Default: not in this step.

## Success looks like
An attorney opens Talent, types "medical chron" and picks "Legal Nurse & Medical Records, Medical Malpractice Review, Medical Chronology Creation", or clicks through the three lists, and sees only the freelancers who work in it. A freelancer finds and ticks their categories on the Profile page in under a minute.
