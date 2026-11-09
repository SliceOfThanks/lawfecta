-- Fix (2026-11-09): the Lawfecta Team's "Draft with DELA" on a dispute logs its AI use with task 'dispute_draft', which
-- the ai_usage check (last set in 0031) did not allow, so the use went unrecorded. Additive: the check only widens.
alter table ai_usage drop constraint if exists ai_usage_task_check;
alter table ai_usage add constraint ai_usage_task_check check (task in ('chat', 'file', 'voice', 'key_test', 'client_check', 'conduct_review', 'milestone_check', 'review_check', 'dispute_draft'));
