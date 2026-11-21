-- Step 75a: the Ask DELA workspace rebuilt to the ten workflow mockups (Stacey 2026-11-20: "the ux/ui for dela does not
-- match the mockups - this needs to be done end to end and structured"; docs/briefs/step-75-ask-dela-workspace-mockups.md).
-- The new pages are faces on records that exist; they add no table and no function. This switch shows them.
-- It works together with ask_dela_workspace and new_layout, which stay as they are.
-- Additive: one switch, off.
insert into feature_switches (key, label, gate) values ('dela_workspace_v2', 'Ask DELA workspace as the workflow mockups draw it: a second menu, the firm''s documents, delegation opportunities, gig drafts and DELA instructions as pages (step 75)', 'Stacey asked for it 2026-11-20; built in four releases (75a to 75d)')
on conflict (key) do nothing;
