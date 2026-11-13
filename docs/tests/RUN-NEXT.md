# ChatGPT checks waiting for Stacey

Stacey 2026-11-12: "Any tests that ChatGPT needs to do, collect them and I will handle in the morning." Run them in this order, each in a new ChatGPT agent chat, and paste each report back to Claude as text. The ready-to-paste copies with the test password are on her Mac in ~/Documents/Lawfecta DELA for Stacey (not on GitHub).

| Order | Check | Ready copy on her Mac | Covers | Needs on the site |
|---|---|---|---|---|
| 1 | docs/tests/talent-journey-chatgpt-prompt.md | talent-journey-chatgpt-prompt-READY-2.txt (rewritten 2026-11-13 for mockup 02; the older READY.txt is out of date) | Steps 18 to 22: categories and the Talent line on the profile, who posted a gig, five independent filters, keywords in any order, match-ready help, DELA suggested filters, cards, Load more, the profile page and the Back button, the invitation review, a chat before a gig, suggested freelancers on a document, bookmarks, the team's checks | Released (code_version c9bd839). Run before 2026-11-19, when the first test gig closes |
| 2 | docs/tests/subscription-chatgpt-prompt.md | subscription-chatgpt-prompt-READY-3.txt | Step 19: the four areas, real billing, usage, the plan comparison, the plan change review | The Subscription redesign released |

After her runs Claude checks in the database what the reports cannot see: the invitation and conversation records on the freelancer's side, and that no bookmark or plan was left changed.
