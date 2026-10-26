# Stacey's setup checklist for DELA Step 1

Rule: nothing members use today changes. DELA is added next to the current site. Existing pages, widgets, plans,
sign up forms, emails and billing stay exactly as they are. Members cannot see DELA until you add them to the access list.

Do these after Claude confirms the GitHub repo and both Supabase projects are ready. Claude sends the final widget code.

## In Brilliant Directories (additions only)
1. Create two new pages: /dela and /dela-admin. Logged-in members only. Do not add them to any menu.
2. Make a secret: 40 letters and numbers, no symbols. Keep it somewhere safe. Never paste it in chat.
3. Create three new widgets and paste in the code Claude sends:
   - DELA-Auth. Put your secret on line 11, between the quotes. Do not place this widget on any page.
   - DELA-App. Place it on /dela only.
   - DELA-Admin. Place it on /dela-admin only.
4. Click Refresh Live Site.
5. Create two test members on any existing free plan (for example "Test Attorney" and "Test Paralegal"). Note their member IDs.
   Do not create the eight DELA plans in BD yet. Test accounts get their DELA plan from the DELA admin area.
   The eight BD plans are created at launch, hidden from sign up until then.

## In Supabase (both DELA projects, Staging and Live)
6. Edge Functions, Secrets: add BD_SHARED_SECRET with the same secret as step 2.

## Then
7. Open /dela once while logged in as yourself. You will see "DELA is not open for your account yet". That is expected.
8. Tell Claude your BD member ID (BD admin, Members). Claude makes you the owner.
9. Open /dela-admin:
   - Access list: add both test members.
   - People: give the test attorney "Attorney Pro" and the test paralegal "Freelancer Free".
10. Run the ChatGPT test prompt in docs/tests/step-1-chatgpt-prompt.md.
