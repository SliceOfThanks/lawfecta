# Feature brief: community articles, the activity feed and discussions

Step: 69   Spec references: step 18 (the profile page, which already shows a freelancer's promotions from the website), the website's post types
Status: built in acceleration mode. Stacey 2026-11-20 asked for it (freelancers post community blogs that show on a tab of their profile; the attorney's Home shows a recent activity feed of new promotions and community blogs; a forum, with boards for freelancers, for attorneys and for everyone, and help with the platform), and answered the first question the same day: "Inside DELA". Claude answered the other six with its recommendations, below.

## What the website has today (read from the website on 2026-11-20)
| Post type | On the website | Who can post now |
|---|---|---|
| Community Article | /articles | Plus, Pro, Agency Business, Pro Founding Member. Not Free. |
| Promotion | /promotions | Pro, Agency Business, Pro Founding Member. |
| Discussion | /discussions | Free, Plus, Pro, Agency Business and the admin author plan. **No attorney plan can post.** |
Each has three placeholder categories ("Category 1, 2, 3"). DELA already reads one freelancer's promotions from the website and shows them on their profile page.

## The proposal, in three parts

### A. "Articles" on the profile
A tab "Articles" on the freelancer's profile page in DELA, next to Overview, Services, Experience, Work samples and Reviews. It lists that freelancer's published Community Articles from the website (title, date, first lines), newest first. The freelancer writes and edits them on the website's own form, as today; their own profile shows a button "Write an article" that opens it.

### B. "Recent activity" on the attorney's Home
A Home widget for attorneys: the newest promotions and community articles from freelancers, each with the freelancer's name (short, by the last name rule), their photo, the title, and "View profile". Read from the website a few times an hour, not on every page load.

### C. Discussions
Boards for three audiences: Freelancers, Attorneys, Everyone, plus "Help with Lawfecta" for everyone.

## What must be decided first
**The website's pages are outside DELA's rules.** A community article or a discussion on the website shows the author's full name and whatever they write, to anyone, including an email address or a booking link. That works against the two rules built today (last names hidden until hired, no contact details in profiles). There are two ways to do parts A and C:

| | Keep them on the website (BD pages) | Show them inside DELA |
|---|---|---|
| Last name hidden until hired | No. The website shows the full name. | Yes. |
| Contact details removed | No, unless someone moderates by hand. | Yes, the same rule as profiles. |
| Boards only freelancers or only attorneys can read | Posting can be limited by plan. Reading a board is public on the website unless each board gets its own post type and a members-only page; this needs checking in the website's settings. | Yes, enforced by DELA. |
| Good for search engines | Yes. | No, members only. |
| Work | Mostly website settings, by BD connector prompts. | DELA reads and shows the website's posts (articles), and holds the discussions itself. |

Recommended: **articles and promotions stay written on the website and are shown inside DELA** (profile tab and Home feed) with the name and contact rules applied to what DELA shows; **discussions live inside DELA**, where the three audiences and the rules can be enforced. If "using Brilliant Directories discussions" is a must, the boards will be public website pages with full names.

## Questions, and the answers
1. Discussions: inside DELA with the rules enforced, or on the website's Discussion pages, public and with full names? **Stacey: "Inside DELA".**
2. May freelancers on Free write community articles? Today the website allows Plus and up. Changing it is a website plan setting. **Claude: unchanged for now.** It is a plan benefit on the website; DELA shows whatever is published.
3. May attorneys post in discussions? Today no attorney plan can. If discussions stay on the website, the four attorney plans need the Discussion post type added. **Claude: yes, inside DELA attorneys post** in "Attorney room", "Everyone" and "Help with Lawfecta". Nothing changes on the website.
4. Should the public article pages on the website stay public? If yes, an attorney can read the author's full name there. Options: keep public (good for search), or make the article pages members-only. **Claude: left as they are.** DELA never links to them, so the leak is only for someone who goes looking on the website. Open with Stacey.
5. Board names. Proposed: "Freelancer lounge" (freelancers), "Attorney room" (attorneys), "Everyone", "Help with Lawfecta". **Claude: these four.**
6. Who moderates, and may the Lawfecta Team remove a post? **Claude: the Lawfecta Team, on the Community page itself**: "Remove" with a reason on every post, "Put back", and a line saying how many reported posts wait. The author is told the reason. Members have "Report".
7. The activity feed: attorneys only, or freelancers too (their own community)? **Claude: attorneys see promotions and articles; freelancers see articles.**

## What was built
- Switch community. Migration 0150.
- **Community** page in the DELA menu for both sides (/dela?tab=community): the boards a member may read as tabs, topics with their reply count, a topic with its replies, "Start a topic", "Reply", "Report". Contact details are taken out of every post before it is saved; sensitive data stops a post. A daily allowance of topics and replies (settings). The Lawfecta Team reads every board and removes or puts back a post with a reason.
- Names in discussions: a freelancer by first name and last initial to people who have not hired them (the rule of step 66), an attorney by first name and last initial, the Team as "Lawfecta Team".
- **Articles** tab on a freelancer's profile page: their published community articles from the website (post type in setting bd.articles_data_id), newest first, without contact details, read inside DELA. The author's own page has "Write an article on the Lawfecta website" (address in setting bd.articles_write_path).
- **Recent activity** card on Home, under Home's own cards: the newest promotions and articles, read from the website at most every 20 minutes (setting) and kept; the last good copy shows if the website does not answer. Posts by people with no freelancer workspace in DELA are left out.
- Not built: a notice to members about new topics; search in discussions; editing or deleting one's own post; the activity feed as a widget in "Customize dashboard" (it is a fixed card).

## How it could go wrong
- The feed shows expired promotions or unpublished drafts: only published posts, promotions only until their end date (already so on the profile page).
- The website is slow or does not answer: the feed shows the last good copy and says when it was read.
- A post carries contact details: removed in what DELA shows.
- Spam in discussions: allowance per day, report button, the Team's removal.

## Success looks like
- A freelancer's profile has "Articles" with their posts.
- An attorney's Home shows "Recent activity" with new promotions and articles.
- A freelancer cannot open the attorneys' board, and an attorney cannot open the freelancers' board.
