# Feature brief: tags and notes on bookmarked freelancers

Step: 74   Spec references: step 18 (Talent, bookmarks), step 17 (categories), Stacey's message and screenshots of 2026-11-20
Status: built in acceleration mode. Stacey 2026-11-20: "allow the attorney to add tags/labels to bookmarked freelancers and notes, so they can remember why they added them. They should also be able to filter them by tag, and top level / sub level / sub-sub level categories." The same day, with a screenshot of a freelancer's profile: "the LinkedIn users and details in profile are crammed. Make the header background the blue we've used elsewhere instead of pink."

## Who
Attorneys, and agency owners who hire. Every plan. Freelancers never see any of it.

## What
- On the Bookmarks tab, each bookmarked freelancer has a line for the member's own tags and a private note, with the button "Add tags and a note" (later "Edit tags and note").
- A card "Filter your bookmarks" above the list: "Your tag", "Category", "Practice area / Specialty" and "Services / Tasks" (the three category levels of the Lawfecta website), and "Clear filters".
- Clicking a tag on a card filters by that tag.
- On a bookmarked freelancer's profile, a button "Tags and note" beside "★ Bookmarked" opens the Bookmarks tab with that freelancer's tags and note ready to edit.
- The profile header: the photo no longer runs into the name and details, the details line has more room, and the band behind it is light blue.

## Where
- Talent, tab "Bookmarks": https://www.lawfecta.co/dela?tab=talent&view=bookmarks
- A freelancer's profile opened from Talent (the header, and "Tags and note").

## When
Any time after a freelancer is bookmarked. Tags and notes can be changed as often as the member likes.

## Why
A bookmark alone does not say why the person was saved. Tags and a note keep the reason, and the filters find the right saved person when a job comes up, which leads to more invitations and hires.

## How it could go wrong
- The freelancer learns what an attorney wrote about them: tags and notes are read only by the member who wrote them. No notice is sent, and no page of the freelancer shows them. Tested.
- Someone else in the firm reads them: they belong to the member, as bookmarks do, and are not shared.
- Sensitive data typed into a note: the same check as everywhere else. A Social Security number, an account number, health details or a password stops the save, and the notice sits where the member types.
- Near-double tags ("probate", "Probate"): a tag written twice counts once, and a tag the member already uses keeps its first spelling.
- Tags or a note on someone who is not bookmarked: refused ("Bookmark this freelancer first").
- A bookmark is removed: its tags and note are no longer shown. They are kept, and come back if the member bookmarks the freelancer again.
- A bookmarked freelancer who is not listed in Talent right now: still shown under "Not available right now" with tags and note. A tag filter keeps them; a category filter leaves them out, because they are not in the search.
- The website's bookmarks cannot be reached: the tab says so, as before, and nothing is saved.
- Too many or too long: refused in plain words with the limit.

## Settings and switches it uses
- bookmarks.tags_max (8), bookmarks.tag_length (30), bookmarks.note_length (1000). New, changeable in the admin area under Settings.
- bd.bookmarks (existing): turns bookmarks, and with them tags and notes, on or off.
- No new switch. Migration 0154 adds one table and three functions.

## Questions, and how Claude answered them (acceleration mode)
1. Are tags and notes private to the member, or shared with the firm's team? **Private to the member**, because bookmarks themselves are personal. Sharing with the team can be added if Stacey wants it.
2. Does the freelancer ever see them or get told? **No.**
3. A fixed list of tags, or free words? **Free words**, the member's own, with the tags already in use offered as one-click choices.
4. Where are they stored? **In DELA.** The bookmark stays in the website's bookmark system; the website's "My Saved Members" page does not show the tags or notes.
5. How many tags, how long? **8 tags of up to 30 characters, a note of up to 1,000 characters.** All three are settings.
6. What happens to them when the bookmark is removed? **Hidden, and kept** in case the member bookmarks the person again.
7. Can the Lawfecta Team read members' notes in the admin area? **No screen shows them.**
8. Filter by one tag or several? **One tag at a time**, together with the category filters.
9. The blue for the profile header: **the light blue DELA already uses for notices and the member's own messages.** The tags on the profile stay pink. The same band on the freelancer's own profile form turns blue with it.

## Not built
- Tags and notes on My bench.
- Several tags in one filter.
- Sharing tags and notes inside a firm.

## Success looks like
Attorney login:
- The Bookmarks tab shows "Filter your bookmarks" and, on each card, "Add tags and a note".
- Saving "Probate, Fast replies" and a note shows both on the card, and "Your tag" lists both tags.
- Choosing a tag, a category or a specialty narrows the list; "Clear filters" brings everyone back.
- Nine tags are refused with "That is more than 8 tags. Take some out."
- On the freelancer's profile, "Tags and note" opens the editor with what was saved.
- The profile header is light blue and the photo sits clear of the name.
Freelancer login:
- No notification about being tagged, and nothing about tags or notes anywhere.
