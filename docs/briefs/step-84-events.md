# Feature brief: Events, the first tab of Community

Step: 84   Spec references: step 69 (Community), step 83 (the master pages and the copy of the website's posts), step 67 (contact details), step 71 (the last name)
Status: built in acceleration mode. Stacey 2026-11-24, with a picture of the Community page: "For the post type setting events, there should be a page that shows up here. It should be the first tab. Earnings should be able to see them. Freelancers should be able to see them and agencies. And they should be able to filter using the filters that we have in events, or I think it's called categories. Additionally, they should be able to click on it and see the event information and then click the buttons. They should be able to have a view of card type, view, and then a list type view."

## Who
Every member who has Community: attorneys, freelancers and agencies. ("Earnings" in her message is read as "attorneys": she names freelancers and agencies next, and the picture is an attorney's page.)

## What
- A tab "Events" in Community, before "Blog" and the boards. Community opens on it.
- Events written on the website (post type "Event"), the soonest first. Each shows its day and time, where it is, its category, its price, who organizes it and its picture.
- One filter by category. The categories are the website's own list for the Event post type. A second list switches between "Coming up" and "Past events".
- Two views: "Cards" and "List". The choice is remembered on that browser.
- An event opens on the same page with all its information and its buttons: "Open the event page" (the event's own link, in a new tab), "Add to my calendar" (a calendar file) and, for attorneys, "View the organizer's profile" when the organizer is a freelancer who shows in Talent search.

## Where
/dela?tab=community, the tab "Events". Server: migration 0164, GET /master/events, the job posts_sync (the same one that copies promotions and articles).

## When
DELA copies events with the promotions and articles: the first time a page needs them, and again when the copy is older than an hour and someone opens a page. An event leaves "Coming up" the day after it ends.

## Why
Events bring members back and show that Lawfecta is alive. Today they exist only on the website, where a member inside DELA never sees them.

## How it could go wrong
- No events exist yet: the tab says "No events are coming up yet."
- The placeholders "Category 1", "Category 2", "Category 3" show as categories: they are never shown.
- A link sends members to a bad place: only a link that starts with https is kept, it opens in a new tab with no access back to DELA, and a line under the button says it leaves Lawfecta.
- Contact details in the text: taken out, as everywhere. The event's own link is the one address kept, as a button. The venue's street address is kept, since it is where the event is.
- A picture from another site: only pictures stored on the Lawfecta website are shown. One that does not load leaves no gap.
- The organizer's full name: a freelancer organizer shows by first name and last initial, and only if they show in Talent search. An event the Lawfecta Team posted says "Lawfecta". Anyone else is not named; the venue shows.
- An event with no start day: not listed.
- The website is down: the last copy is shown, and the page says when it was read.
- A calendar file with the wrong time: the file carries the event's local time as the website holds it, with no time zone, so it lands at that clock time in the member's calendar.

## Settings and switches it uses
- Existing switches master_pages and community. No new switch: Events appears for the members who have the Blog today.
- New setting bd.events_data_id (8). 0 turns Events off.
- Existing: posts.refresh_minutes (60), master.page_size (12).
- No business number.

## Questions Claude answered itself (acceleration mode, 2026-11-24)
1. Whose events show? **Every published event on the website.** The Blog shows only authors who are in Talent search; events are announcements, and Lawfecta's own events must show.
2. What are "the buttons"? **The event's own link, a calendar file, and the organizer's profile.** DELA has no sign-up or ticket button of its own; the event's link is where that happens.
3. Past events? **Hidden by default, one choice away** under "When".
4. Which view first? **Cards.**
5. Is the view choice kept on the account or the browser? **The browser.**
6. Does a new switch gate it? **No.** It rides on the master pages switch, which is on for the Access list.
7. Order of the tabs? **Events, Blog, then the boards**, as she said first tab.

## Success looks like
Freelancer login: Community opens on "Events". The Category list offers "All categories" and the website's categories, never "Category 1". "List" turns the cards into rows and back. An event opens with When, Where and its buttons, and "Add to my calendar" saves a file.

Attorney login: the same, and an event organized by a freelancer in Talent search offers that person's profile.

Check the results (owner, on the website): after an event is published on the website, it shows in DELA within about an hour.
