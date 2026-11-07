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
8. /dela-admin > Release Control: set your release password (at least 12 characters).
9. /dela-admin > Access list and People: add the test members and give them Attorney Pro and Freelancer Free.
10. Run the ChatGPT test prompt Claude sends. Send Claude the report.

## Part C. Live (once, before your first push)
11. Supabase: create a new organization named Lawfecta DELA Live on the Pro plan, and in it a project named dela-live (region West US). It must be a United States region: the security page says DELA's data is stored in the United States (Stacey 2026-11-05). Never connect this organization to Claude.
12. In dela-live > Edge Functions > Secrets add the secrets in docs/LIVE_READINESS.md section 2 (https://github.com/SliceOfThanks/lawfecta/blob/claude/step-2a-ai-keys-voice-files/docs/LIVE_READINESS.md). Use a new BD_SHARED_SECRET for Live (lawfecta.com has its own DELA-Auth widget), DELA_ORIGINS = https://lawfecta.com,https://www.lawfecta.com, STAGING_API_URL (Claude gives you the Staging address), and RELEASE_CI_SECRET (same value as step 14, so Staging can read Live's problem count).
13. Supabase > Account > Access Tokens: create a token named DELA push. Copy it once.
14. GitHub > lawfecta > Settings > Environments: create an environment named live.
    - Secrets: SUPABASE_ACCESS_TOKEN (the token from step 13), RELEASE_CI_SECRET (make 40 letters and numbers).
    - Variables: LIVE_PROJECT_REF (the dela-live project ID from its Supabase address), STAGING_API_URL (from Claude), OWNER_BD_MEMBER_ID (your member ID on lawfecta.com, from lawfecta.com's own Brilliant Directories admin > Members; never the number from hirelegalhelp.com, because the two sites number their members separately).
15. GitHub > Settings > Developer settings > Fine-grained tokens: create a token for lawfecta only, with Actions: Read and write. Put it in Supabase > DELA Staging > Secrets as GITHUB_DISPATCH_TOKEN. Also add RELEASE_CI_SECRET there (same value as step 14) and GITHUB_REPO = SliceOfThanks/lawfecta.

15a. /dela-admin (Staging) > Release Control > Live setup: type the dela-live project ID (the 20 letters and numbers in its address) and click Save. Tick "I did this" for the GitHub environment once step 14 is done.
15c. Codes and alerts by email: email must be able to send (Claude sets this up with you; Brevo is the quickest). Text alerts: in Settings put your mobile number in alerts.sms_to (+1 then the number), and put the Brevo key in Staging secrets as BREVO_API_KEY. Until then codes are skipped (password only) and alerts go by email, and Release Control says so.

15b. Set up the uptime monitor for Staging and Live (docs/RUNBOOK.md, Monitoring). Before real payments start, turn on point-in-time recovery for dela-live.

## Part D. First push and after
16. /dela-admin (Staging) > Release Control: tick "I tested this version on Staging", click Push to Live, enter your release password, then the 6 digit code sent to you. Watch the steps tick through. Live is then watched for 15 minutes and goes back by itself if it becomes unhealthy.
17. When it says Live now: in Brilliant Directories on lawfecta.com (the main site), create the pages /dela and /dela-admin (logged-in members only, not in any menu) and the widgets DELA-Auth, DELA-App and DELA-Admin with the code Claude sends. Type Live's BD_SHARED_SECRET into DELA-Auth, and put the dela-live address (https://<project id>.supabase.co/functions/v1/api) into the data-api field of DELA-App and DELA-Admin. Click Refresh Live Site. The test site (hirelegalhelp.com) keeps its own widgets pointing at Staging.
18. Open lawfecta.com/dela-admin: you are owner of Live automatically. Then follow docs/LIVE_READINESS.md section 3, step C: link the eight BD plan numbers (Plans), set email (Settings), turn on the beta switches (Switches), and add real members to the access list in small groups only when you are ready. Test accounts stay on the test site.

From then on, every release is steps 10 and 16 only.
