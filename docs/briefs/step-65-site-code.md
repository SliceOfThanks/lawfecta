# Feature brief: site code in the admin area

Step: 65   Spec references: step 1 (the admin area)
Status: built in acceleration mode. Stacey 2026-11-20: "Header injection: a section where I can add code that will be injected into the header. Footer. Before /body."

## Who
The owner. Other Lawfecta Team roles can read the page and cannot save.

## What
A page "Site code" in the admin area with three boxes: "Header code" (added inside the page's head), "Footer code" (added at the page's footer) and "Before the closing body tag" (the last thing on the page). Each box has an "On" tick, a save button, a character count, who saved it last and when, and "Earlier versions" with "Put back".

## Where
https://www.lawfecta.co/dela-admin?tab=code (menu on the left, group "Plans and settings", line "Site code").

## When
Whenever the owner adds or changes analytics, a tag manager, a chat bubble or a notice.

## Why
Today a tracking script means a new release or a change in the website's own settings. This gives the owner one place for DELA's pages.

## How it could go wrong
- Broken code locks the owner out: the code is never added to the admin area, so the page that fixes it always opens.
- Broken code breaks DELA for members: DELA loads first and catches errors while adding the code. A script that misbehaves after that can still disturb a page, so each box has "On" to switch it off at once.
- Someone else adds code: only the owner can save, checked on the server. Every save is in the audit log and in the history.
- A secret is pasted: the page warns that members' browsers can read all of it.
- A script does not run: scripts are added as real script elements, in the order written.
- The same code is added twice on one page: it is added once per page load.

## Settings and switches it uses
None. Migration 0146 (two tables, three functions).

## Questions, and how Claude answered them (acceleration mode)
1. Which pages get the code? **DELA's member pages** (every page under /dela). Not the admin area. The rest of the website (home page, login, public profiles) has its own code settings in the website's back end.
2. What is "Footer" when the website page has no footer element? **The end of the page content.**
3. A size limit? **20,000 characters per box.** Longer code belongs in a file loaded with one script tag.
4. Should a release password be asked? **No.** Owner only, with history and "Put back".
5. Per-side code (attorneys only, freelancers only)? **Not now.** One set for all members.

## Success looks like
- The owner pastes a script in "Header code" and saves; a member's next page load has it in the head and it runs once.
- Unticking "On" and saving removes it from member pages and keeps the text.
- "Put back" restores an earlier version.
