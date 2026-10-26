# Stacey's setup checklist (staging first, only you push to Live)

Approved 2026-10-26. Nothing members use today changes: DELA is added next to the current site.
Never paste a password, token or secret in chat. You type them only into BD, Supabase or GitHub.

## Part A. Unblock Claude (now)
1. Done: GitHub repo SliceOfThanks/lawfecta is connected (2026-10-26).
2. claude.ai/customize/connectors: reconnect Supabase and allow the Lawfecta AI organization (Staging lives here). Start a new Claude session with the lawfecta repo after Claude confirms the code is saved.

## Part B. Staging (after Claude sets it up)
3. BD: create pages /dela and /dela-admin (logged-in members only, not in any menu).
4. BD: create widgets DELA-Auth, DELA-App, DELA-Admin with the code Claude sends. Put DELA-App on /dela and DELA-Admin on /dela-admin. DELA-Auth goes on no page.
5. Make a BD secret (40 letters and numbers). Type it into DELA-Auth line 11, and into Supabase > DELA Staging > Edge Functions > Secrets as BD_SHARED_SECRET.
6. BD: create two test members on any existing free plan (a test attorney and a test paralegal). Click Refresh Live Site.
7. Tell Claude your BD member ID and the two test member IDs. You become owner of Staging at your first visit to /dela-admin.
8. /dela-admin > Releases: set your release password (at least 12 characters).
9. /dela-admin > Access list and People: add the test members and give them Attorney Pro and Freelancer Free.
10. Run the ChatGPT test prompt Claude sends. Send Claude the report.

## Part C. Live (once, before your first push)
11. Supabase: create a new organization named Lawfecta DELA Live on the Pro plan, and in it a project named dela-live (region West US). Never connect this organization to Claude.
12. In dela-live > Edge Functions > Secrets add: BD_SHARED_SECRET (same as step 5), DELA_ORIGINS = https://lawfecta.com,https://www.lawfecta.com, STAGING_API_URL (Claude gives you the Staging address).
13. Supabase > Account > Access Tokens: create a token named DELA push. Copy it once.
14. GitHub > lawfecta > Settings > Environments: create an environment named live.
    - Secrets: SUPABASE_ACCESS_TOKEN (the token from step 13), RELEASE_CI_SECRET (make 40 letters and numbers).
    - Variables: LIVE_PROJECT_REF (the dela-live project ID from its Supabase address), STAGING_API_URL (from Claude), OWNER_BD_MEMBER_ID (your BD member ID).
15. GitHub > Settings > Developer settings > Fine-grained tokens: create a token for lawfecta only, with Actions: Read and write. Put it in Supabase > DELA Staging > Secrets as GITHUB_DISPATCH_TOKEN. Also add RELEASE_CI_SECRET there (same value as step 14) and GITHUB_REPO = SliceOfThanks/lawfecta.

15b. Set up the uptime monitor for Staging and Live (docs/RUNBOOK.md, Monitoring). Before real payments start, turn on point-in-time recovery for dela-live.

## Part D. First push and after
16. /dela-admin (Staging) > Releases: tick "I tested this version on Staging", click Push to Live, enter your release password.
17. When it says Live now: in BD, put the dela-live address (https://<project id>.supabase.co/functions/v1/api) into the data-api field of DELA-App and DELA-Admin. Click Refresh Live Site.
18. Open /dela-admin: you are owner of Live automatically. On Live's Access list, add your two test members as "Staging test accounts" so they keep landing on Staging. Add real members to the access list only when you are ready.

From then on, every release is steps 10 and 16 only.
