# Feature brief: three master pages (Services, Promotions, the Blog)

Step: 83   Spec references: step 17 (the website's categories), step 18 (Talent, the profile page, promotions), step 67 (contact details), step 69 (Community, articles), step 71 (the last name), step 81 (pages under a menu line)
Status: built in acceleration mode. Stacey 2026-11-24: "Need a master pages for all active plans (not claim listings) (1) services (2) promotions page that attorneys can filter & sort (by top category, sub, and sub category) (3) community blog by order of posting and able to filter by topic".

## Who
- Attorneys (every attorney plan): Services, Promotions and the Blog.
- Freelancers and agency members (every freelancer plan): the Blog.
- Whose content shows: the freelancers who show in Talent search (active, checked by the Lawfecta Team, taking work, availability confirmed), on Free, Plus, Pro and Agency. A member on a claim listing has no DELA workspace and never shows.

## What
- **Services.** One card for each service of each of those freelancers: the service, who it is for, the price, the provider (first name and last initial), the provider's category. Filters: words, the three category lists, the price type (fixed or by the hour), "starts at or under" an amount. Order: newest, price low to high, price high to low. "View profile" opens the provider's profile on its Services tab.
- **Promotions.** Every promotion that has not ended: the title, the text, the code, the end date, the provider. Filters: the three category lists (the provider's categories) and words. Order: newest, ending soonest. "View profile" opens the provider.
- **The Blog.** Every published article in order of posting, newest first: the title, the first lines, the topic, the day, the author. One filter: the topic. "Read the article" opens it in full. An author's own article is marked "Yours".

## Where
- Attorneys: a row at the top of Talent reads "Find talent", "Services" and "Promotions" (as Files sits in the Library). Addresses: /dela?tab=services and /dela?tab=promotions. Talent stays the marked line in the menu.
- Everyone: Community opens on "Blog", with the boards after it in the same row.
- Server: migration 0160, routes GET /master/services, /master/promotions and /master/blog, the job posts_sync.

## When
- Services are read from the profiles in DELA, so a change shows at once.
- Promotions and articles are written on the website. DELA copies them the first time a page needs them, and again when the copy is older than the setting posts.refresh_minutes (60) and someone opens a page. The page says when the website was last read.
- A promotion leaves the page the day after its end date, and at the next refresh when it is taken down on the website.

## Why
An attorney who does not yet know who to hire can start from what is offered. The pages give every paying freelancer a second and third place to be found, and give the Blog a home that follows DELA's rules on names and contact details.

## How it could go wrong
- A member who should not be seen shows up: all three lists use one rule, the Talent search's rule (dela_talent_shown). A freelancer who stops taking work, is put on hold or lets their availability lapse leaves all three at once. A test holds the rule and the Talent search to the same answer.
- A claim listing shows: posts are matched to people who have a DELA freelancer workspace. A website member with none is skipped.
- The last name or contact details leak: names go through the same shortening as every other page. Text is cleaned of markup and contact details before DELA stores it. An article never links to its page on the website, which shows the full name.
- A freelancer opens the attorney's pages by typing the address: the server refuses, and the page does not draw.
- The website is slow or down: pages read DELA's copy and never wait for the website, except the first time ever. A failed read keeps the last good copy, and the page says the copy may be out of date.
- Every page view asks the website: staleness counts from the last try, and one job is queued for each time the copy falls due.
- The topic list cannot be read (the website's API key may not read post types): the last list stays. If no list was ever read, the topics are the ones the shown articles carry.
- The placeholders "Category 1", "Category 2", "Category 3" show as topics: they are never shown, as a topic on a card or in the list.
- Stacey renames a topic and old articles keep the old name: those articles show with no topic until she changes them on the website. The Blog still lists them.
- An ended promotion lingers: the end date is checked on every read, not only at refresh.
- A price is hard-coded: none is. Prices are the freelancers' own, from their profiles.

## Settings and switches it uses
- New switch master_pages: off, then the Access list, then everyone.
- Existing switches: talent_search (Services, Promotions), community (the Blog), hide_last_names.
- New settings: posts.refresh_minutes (60), master.page_size (12).
- Existing settings: bd.promotions_data_id (7), bd.articles_data_id (15), profile.availability_days.
- No business number.

## Stacey's answers (2026-11-24)
1. Where do the pages live? **Inside DELA, for logged-in members.**
2. Whose content shows? **Members who show in Talent search.**
3. Who sees what? **Attorneys see all three; freelancers see the Community blog.**
4. On Services, is one line one service or one provider? **One service.**
5. Blog topics? **"whats in post type settings for this, i will update categories in BD and the frontend needs to update same"**. The website's post type "Community Article" holds the list in "Post Categories". Today it reads "Category 1, Category 2, Category 3".

## Questions Claude answered itself (acceleration mode, 2026-11-24)
1. What are the promotion filters, when a promotion has no kind-of-work category of its own? **The provider's categories**, at all three levels.
2. What does "newest" mean for a service, which has no date? **The day the provider last saved their profile.**
3. What is the price filter? **A price type (fixed or by the hour) and "starts at or under" an amount the attorney types.** A service with no price is left out when an amount is typed.
4. How many cards at a time? **12, then "Load more"** (a setting).
5. Does an author who is not shown in Talent see their own article? **Yes, marked "Yours".** Nobody else sees it.
6. Do articles show the website's picture? **Not in this release.** The author's DELA photo or initial shows.
7. Is the Blog the first view of Community, or one more board at the end? **The first view**, as the plan said.
8. What is the first item of Talent's row called? **"Find talent"**, since the row sits under the menu line "Talent".

## Where the build differs from the plan she approved
- The Home card "Recent activity" keeps its own small copy of the website's posts (eight items). The plan said the new copy would replace it. It reads the same posts; joining the two is a clean-up with no change on screen, and is left for a later step.
- The three category lists are one shared piece for the two new pages. The Talent search and the Bookmarks tab keep their own copies for now; changing them belongs with a change to those pages.

## Success looks like
Freelancer login:
- Community opens on "Blog". Articles are listed newest first. The topic list offers "All topics" and the website's topics, never "Category 1".
- Typing the address /dela?tab=services shows no Services page.

Attorney login:
- Talent has a row "Find talent", "Services", "Promotions".
- Services lists one card for each service, with a price and a provider shown by first name and last initial. Each filter narrows the list; "Clear filters" brings it back. "View profile" opens the provider's profile on Services.
- Promotions lists current offers with the code and end date. "Ending soonest" changes the order.
- The Blog reads the same as for the freelancer, and "View ...'s profile" under an article opens the author.

Check the results (owner, in the website's admin): after a topic is renamed in the post type's "Post Categories", the Blog's Topic list shows the new name within about an hour.
