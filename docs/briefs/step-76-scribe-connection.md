# Feature brief: connect a firm's Scribe account

Step: 76   Spec references: step 2s (Import from Scribe), step 2a (members' own keys), step 75 (the Ask DELA message box)
Status: built in acceleration mode. Stacey 2026-11-23, about the Ask DELA message box: "this is the most important feature on the website! ... they should be able to (1) access screen recorder (2) connect Scribe project with the integration (3) a button to talk directly into this box." Asked whether to build the direct connection, she answered "Yes, build it".

## Who
Attorneys and firm staff with a place in the firm's Library. The Library's administrator connects and disconnects the firm's Scribe account. Editors and the administrator pick guides from it. Commenters and viewers do not see it. Freelancers are not part of this step.

## What
Today a firm brings in a Scribe guide by exporting it from Scribe as a file and choosing that file in DELA. With the connection, the firm pastes one key from its Scribe account once. After that, "Import from Scribe" shows the firm's guides in a list with a search box. The member picks one, and DELA reads its steps and screenshots and opens the same review screen the file import uses. "Done" is the guide on the review screen, ready for "Build my document".

The import by exported file stays, for firms whose Scribe plan does not offer the connection.

## Where
- Ask DELA, the message box: "Import from Scribe" (https://www.lawfecta.co/dela?tab=delegate).
- Library: "Import from Scribe" (https://www.lawfecta.co/dela?tab=library). The page "Import a guide from Scribe" gets a card "From your Scribe account" above the card "From an exported file".
- Admin area, Switches: "scribe_connect".

## When
The administrator connects once. The key stays until the administrator disconnects it or replaces it. Each time a member opens the import page, DELA asks Scribe for the list at that moment; nothing from Scribe is copied until a member clicks "Import" on one guide.

## Why
Stacey named the message box the most important feature: it is how a law firm turns work it already does into a playbook it can hand off. Many firms already keep their procedures in Scribe. Picking a guide from a list is one click; exporting a file, saving it and choosing it again is six steps, and the export is a paid Scribe feature too.

## What Scribe offers (read from Scribe's own published description, 2026-11-23)
- Address: public-api.scribehow.com. Read-only: list guides, search them by name, read one guide with its steps and a screenshot address for each step, list teams.
- It works with a key the firm creates in Scribe under Settings, Developer Access. Scribe shows the key once. The key is tied to the Scribe teams the firm picks.
- There is no "Sign in with Scribe". A key is the only way.
- Scribe refuses the connection on plans that do not include it ("Your plan does not support Public API access"). Which plans include it is not confirmed.
- Limits: 60 guide reads a minute, 300 searches a minute, and a monthly limit by plan.

## How it could go wrong
- The key leaks: it is sealed with the same encryption as members' AI keys before it reaches the database, bound to its own row, never sent back to the browser, never logged. The page shows only its last 4 characters. Disconnecting wipes the sealed key.
- Someone without the right connects or reads: the administrator check for connecting and the editor check for reading run in the database at the moment of each call, for the Library named in the call. A member of another firm gets nothing.
- The key stops working, or the plan does not allow it: DELA says which of the two, marks the connection as failing, and points to the file import. Nothing is retried in a loop.
- Scribe is slow or down, or the firm passed its limit: one plain message, and the file import still works.
- A guide holds client or sensitive information: nothing changes from the file import. The same tick box, the same screenshot check, the same review screen, and nothing goes to the AI before "Build my document".
- A screenshot sits at an address DELA does not know: DELA fetches screenshots only from the addresses in the setting "import.image_hosts", over https. A screenshot from another address is skipped and the page says so. The steps still come in.
- Text in a guide tries to give DELA instructions: guide text is shown as text and is sent to the AI as material, as with the file import.
- Two clicks on "Connect Scribe": one connection. A new key replaces the old one, and the old sealed key is wiped.
- A document that is a Scribe "Page" and not a step-by-step guide: the list asks Scribe for guides only, and a page opened by its id is refused with a plain message.
- DELA changes something in Scribe: it cannot. The connection is read-only at Scribe.

## Settings and switches it uses
- New switch scribe_connect: off, then the Access list, then everyone. It needs scribe_import on as well.
- New setting import.scribe_page_size (25): how many guides one page of the list shows.
- Existing: import.image_hosts, import.max_steps, the Supabase secret AI_KEY_ENCRYPTION_SECRET (already set for members' AI keys).
- No business number.

## Questions, and how Claude answered them (acceleration mode)
1. One Scribe connection for each member, or one for the firm? **One for the firm's Library.** Scribe keys belong to an organization and its teams, and the Library is the firm's shared place.
2. Who may connect and disconnect? **The Library's administrator only.** Editors use the connection and cannot see or change the key.
3. Where does the firm connect? **On the import page itself**, in the card "From your Scribe account", where the member is when they need it. No separate settings page.
4. Does the file import stay? **Yes**, under the heading "From an exported file", for firms whose Scribe plan does not offer the connection and for free Scribe accounts.
5. Does DELA copy the firm's whole Scribe library? **No.** It lists names at the moment the page is open and reads one guide when a member clicks "Import".
6. Does DELA keep imported guides in step with Scribe afterwards? **No.** An import is a copy at that moment, as with the file. Keeping two places in step is its own step if Stacey wants it.
7. Scribe "Pages" (long texts with no steps)? **Not in this step.** Only step-by-step guides.
8. Is the tick box "no confidential client information" kept? **Yes, the same one as the file import**, so both ways follow one rule.
9. Switch state at release? **Access list**, like the workspace, until a real Scribe key has been seen working.

## Success looks like
Attorney login (Library administrator), switch on:
- "Import from Scribe" opens "Import a guide from Scribe" with the cards "From your Scribe account" and "From an exported file".
- A wrong key is refused with a plain reason and nothing is saved.
- A good key connects; the card shows "Connected" and the last 4 characters, never the key.
- The list shows the firm's guides; the search narrows it; "Import" on one opens "Review your guide" with its steps and screenshots.
- "Disconnect" asks once, then the card returns to the connect form.
Editor login: sees the list and can import; sees no key box and no "Disconnect".
Check the results (owner, admin area): the switch "scribe_connect" is listed; with it off the page shows the file import only.
