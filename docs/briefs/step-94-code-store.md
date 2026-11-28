# Feature brief: DELA keeps its own copy of its code, so the repository can be private

Step: 94
Spec references: the audit of 2026-11-25 (public repository; widgets that can load old code), docs/SESSION_HANDOFF.md (how a release is done)
Status: built in acceleration mode. Stacey 2026-11-27: "Yes, build it", after the repository had been private for some hours and no release could go out.

## Who
- Every member: their pages must load whatever happens to the repository.
- The owner: decides whether the repository is public or private.
- Claude: releases versions.

## What
Until now every DELA page loaded its code through jsDelivr, a free service that reads public GitHub repositories. That has two costs: the repository must be public (anyone can read the code and the documents in it), and when it is private nothing can be released and the site runs on copies jsDelivr happens to hold.

From this step DELA copies each version's files from GitHub into its own Supabase Storage, and the pages load them from there.

## Where
- Database: migration 0171 (bucket `dela-code`, table `code_versions`, settings `code.source` and `code.repo`).
- Server: `lib/code/store.ts`, jobs `code_pull` and `code_seal`, the answer of `/bootstrap` (a new field `base`), the email logo, a new line "Code" in the six-hour check.
- Website: the widgets DELA-App (1.3.0), DELA-Admin (1.3.0) and DELA-Security (1.1.0). They load from the address the server names. They never load "main" again.

## When
- At every release: the version is copied first, then switched on.
- The change of address happens once, when the setting `code.source` is set to "storage", after the new widgets are installed.

## Why
So the repository can be private for good, and so a change of its visibility can never again stop a release or put the live site at risk.

## How it works
1. `select dela_code_pull('<commit>', array['<migration file>'])` starts the copy.
2. The job reads GitHub's list of files for that exact commit, and copies:
   - what a browser loads (`shared/`, `app/`, `admin/`, `brand/`, `docs/images/`; only .js, .png, .jpg) to `dela-code/<commit>/...`;
   - the migration files named for the release to `dela-code/<commit>/_s/<32 random characters>/...`.
   - The server's own code, test files, documents and widgets are never copied.
3. Every file is checked against the fingerprint GitHub's list gives for it. One mismatch stops the copy.
4. A migration is fetched from the random address and checked by its hash, as before. `select dela_code_seal('<commit>')` then removes it from the store.
5. The server function is not released from the store (see "What was tried"). It is deployed from Stacey's Mac with Supabase's own tool once she has logged it in; until then it still comes through jsDelivr, which needs the repository to be public.
6. `select dela_code_release('<commit>')` switches the pages to the version. With `code.source` on "storage" it refuses a version that was not copied.

## How it could go wrong
- The pages are pointed at files that are not there: `/bootstrap` names the new address only for a version whose copy is complete, and `dela_code_release` refuses one that is not.
- A changed file is served: each file is checked against GitHub's fingerprint for that commit; a version's files are never overwritten with other content because a ready version is not copied again.
- The server's code becomes readable: it is never copied to the store. Only a migration file sits under a random 32-character name in a bucket nobody can list, for the minutes of a release.
- A document or a test ends up public: only the listed folders and file types are copied; a test checks that CLAUDE.md, the handoff notes, tests and widgets are not.
- GitHub is down: the job waits and tries again. The live site is not affected.
- The repository is private and the key is missing: the copy fails with a sentence that names the Supabase secret, and the owner gets an email.
- The old widgets are still installed when the repository goes private: they ignore the new address and ask jsDelivr, which then fails for new versions. So the order is fixed: widgets first, then the setting, then private. The six-hour check's new line "Code" tells the owner if the pages' code stops loading.
- Going back: set `code.source` to "jsdelivr". The new widgets fall back to jsDelivr when the server names no address.

## Settings and switches it uses
- New setting `code.source`: "jsdelivr" (as today) or "storage". Starts on "jsdelivr".
- New setting `code.repo`: the repository's name.
- New Supabase secret `GITHUB_CODE_TOKEN`: only needed when the repository is private. A fine-grained GitHub token that can read the contents of this one repository and nothing else. Stacey types it.
- No business number.

## Questions Claude answered itself (acceleration mode, 2026-11-27)
1. Where does the copy live? **Supabase Storage, a public bucket for the browser's files.** They are public by nature (every browser downloads them), Supabase serves them fast, and no page view costs a function call.
2. Who does the copying? **DELA's own server, from GitHub.** No key leaves Supabase, no secret goes into GitHub, and it works from any session.
3. Does the server function still need a public address? **Yes, until it is deployed from the Mac.** See "What was tried".
4. Is the change switched on by this release? **No.** The setting stays on "jsdelivr" until the widgets are installed. This release proves the copy on the live site and changes nothing for members.
5. Is there an admin page for it? **No.** The six-hour check shows where the pages load from. A page can follow if Stacey wants one.
6. What about the migrations' own delivery? **The same store**, under the random name, with the same hash check as before.

## What was tried on the live site (2026-11-27)
- The copy: version c898493 was copied in three turns, 67 files, no problem. The six browser files checked were byte for byte the committed ones, served as JavaScript and images, compressed, kept by browsers for a year. The bucket cannot be listed.
- Deploying the server function with its imports pointing at the store: **refused by Supabase** ("Cannot import from ...supabase.co"). The live function was not touched. The server files were removed from the store, and the code was changed so they are never copied.
- So one piece is still open: the function's own release. The way that needs no public address is Supabase's command-line tool on Stacey's Mac (`supabase functions deploy`), which reads the files from this folder. It needs her to log the tool in once.

## Release 94b (2026-11-27)
**The server function from the Mac.** `tools/deploy_function.sh <commit>` releases the function with Supabase's own tool (pinned to supabase@3.1.0, run through npx; nothing is added to the project's packages). It refuses to run unless this folder is exactly that commit, the function's files are unchanged and GitHub Tests passed. The tool must be logged in once on Stacey's Mac; its login stays with the tool on the Mac.

**The Activity list shows everything.** Stacey: "why does the activity in dela-admin not update automatically? A lot of activity has happened since November 20."
- The list is automatic, but it reads the audit log, and only the admin area's own buttons wrote to it. Since the site went live, versions were released and switches set straight in the database, which wrote nothing.
- From here every change of a switch, a setting or the live version writes one line, whoever made it and however (migration 0172). A change made in the database reads "Claude or DELA, in the database".
- `dela_code_release('<commit>', '<what it was>')` writes the release's own line with its note.
- The 90 releases since 8 November are added from the project's history, each at its real time and marked "added afterwards". Switches and settings changed directly in that time cannot be added back: nothing recorded when.
- The list now sorts by time and holds 200 lines.

## What Stacey does, in order
1. Install the three widgets (by hand, code sent by Claude).
2. Tell Claude. Claude sets `code.source` to "storage" and checks that the pages load from DELA's own copy.
3. Make a GitHub token that can read this one repository, and type it into Supabase as `GITHUB_CODE_TOKEN`.
4. Log Supabase's command-line tool in on her Mac, once (step 94b; Claude gives the steps and proves one function release with it).
5. Claude proves one copy with the token. Then Stacey makes the repository private.

## Success looks like
- A version is copied: status "ready", the browser's files at their address with the right type, the server's files under the random name.
- With the setting on "jsdelivr", `/bootstrap` has no `base`; on "storage" it has the storage address of the live version.
- A version that was not copied is refused by `dela_code_release`.
- A tampered file stops the copy. A private repository without the key fails with the sentence about the secret; with the key it works.
- After the seal, no server file is left in the store.
- On the live site: the copied `shared/dela-core.js` is byte for byte the committed file, served as JavaScript.
