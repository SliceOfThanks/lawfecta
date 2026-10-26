# Stacey's setup checklist for DELA Step 1

Do these after Claude confirms the accounts are set up. Claude sends the final widget code with the addresses filled in.

## In Brilliant Directories
1. Create the eight DELA plans (names below). Send Claude their plan IDs, or type them in later on the DELA admin Plans tab under "Link to a BD plan".
   - Attorney Free, Attorney Plus, Attorney Pro, Attorney Business (firm)
   - Freelancer Free, Freelancer Plus, Freelancer Pro, Freelancer Business (agency)
2. Create two pages: /dela and /dela-admin. Both for logged-in members only. Keep /dela-admin out of menus.
3. Make a secret: 40 letters and numbers, no symbols. Keep it somewhere safe. Never paste it in chat.
4. Create three widgets and paste in the code Claude sends:
   - DELA-Auth. Put your secret on line 11, between the quotes. Do not place this widget on any page.
   - DELA-App. Place it on /dela.
   - DELA-Admin. Place it on /dela-admin.
5. Click Refresh Live Site.
6. Create two test members: one on Attorney Pro, one on Freelancer Free.

## In Supabase (both DELA projects, Staging and Live)
7. Project Settings, Edge Functions, Secrets: add BD_SHARED_SECRET with the same secret as step 3.

## Then
8. Open /dela once while logged in as yourself. You will see "DELA is not open for your account yet". That is expected.
9. Tell Claude your BD member ID (BD admin, Members). Claude makes you the owner.
10. Open /dela-admin. Add your two test members on the Access list, then run the ChatGPT test prompt.
