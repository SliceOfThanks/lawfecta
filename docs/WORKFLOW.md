# How DELA gets built: who does what, where

Decided 2026-10-28. Stacey's BD MCP server (BD-lawfecta-dela) runs on her own computer, so the cloud Claude Code session cannot reach it.

## The three places
1. Claude Code (cloud), the "build session": all code, the GitHub repo, tests, the safety kit, Supabase Staging (database and api). One build session at a time, so changes never clash.
2. Claude chat with the BD MCP, the "BD session" on Stacey's computer: everything inside Brilliant Directories. Pages, widgets, test members, and reading BD facts (member IDs, plans, payment setup, email options). It installs code the build session made; it does not write DELA code.
3. Stacey: secrets (typed only into Supabase, GitHub and the DELA-Auth widget in BD), approvals, Push to Live, and carrying the hand-off text between the two sessions.

## Why this split
- Building everything in chat would lose the repo history, the automatic tests, the rule checker, the AI reviewers and the release gate. Those are what keep Staging good and pushes safe.
- Building everything in the cloud session cannot reach BD, because the BD MCP runs on Stacey's computer.
- Later option: run Claude Code on Stacey's computer in the lawfecta folder with the BD MCP connected (Claude Desktop, or `claude remote-control`). One session could then do both. Only worth it once the local test setup is installed there.

## The loop for every release
1. Build session: builds and tests on Staging, records the version, and writes a "BD hand-off" (what to install or change in BD, with the exact code version).
2. Stacey pastes the hand-off into the BD session.
3. BD session: shows the plan, waits for Stacey's yes, makes the BD changes, and ends with a "BD report".
4. Stacey pastes the BD report back into the build session.
5. Build session checks Staging (sign in works, the right version loads) and sends the ChatGPT test prompt.
6. Stacey tests, then pushes to Live from Release Control.

## Rules for the BD session
- The current Lawfecta site stays unchanged. Only add: pages /dela and /dela-admin, widgets DELA-Auth, DELA-App, DELA-Admin, and test members.
- Read-only unless Stacey says yes to a written plan. Never edit or delete existing pages, widgets, members, plans or settings.
- No new BD membership plans until launch.
- Secrets are never typed in chat. Stacey types the BD secret into DELA-Auth line 11 herself, in BD admin.
- Widget code comes only from the GitHub repo at the exact commit in the hand-off, copied exactly.
