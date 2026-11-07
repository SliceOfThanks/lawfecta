-- Step 8b Part B (docs/briefs/step-8b-ux-retest.md, Stacey's answers B1 to B10, 2026-11-07): the plain-language Library.
-- Behind the switch library_workspace (access list on the test site, off on Live until Stacey has reviewed it).
-- Additive: one switch and one read-only function.

insert into feature_switches (key, label, gate) values
  ('library_workspace', 'The plain-language Library: cards, plain categories, "What would you like to document?"', 'Stacey reviews it on computer and phone (step 8b Part B, question B10)')
on conflict (key) do nothing;

-- The card facts for each document the person can see: the purpose and the first step of the version in use (the
-- approved one when there is one, otherwise the latest draft). Older documents kept the purpose as "outcome"; a policy's
-- first rule stands in for a first step.
create or replace function dela_pb_cards(p_person uuid, p_org uuid) returns jsonb language plpgsql stable as $$
declare v_role text := dela_pb_role(p_person, p_org);
begin
  if v_role is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', p.id,
      'purpose', coalesce(nullif(btrim(v.body->>'purpose'), ''), nullif(btrim(v.body->>'outcome'), ''), ''),
      'first_step', coalesce(nullif(btrim(case when jsonb_typeof(v.body->'steps'->0) = 'object' then v.body->'steps'->0->>'text' else v.body->'steps'->>0 end), ''),
        nullif(btrim(v.body->'rules_must'->>0), ''), nullif(btrim(v.body->'situations'->>0), ''), ''))), '[]')
    from playbooks p
    left join playbook_versions v on v.playbook_id = p.id and v.version = coalesce(p.approved_version, p.current_version)
    where p.org_id = p_org and p.status not in ('deleted', 'trash'));
end $$;
revoke all on function dela_pb_cards(uuid, uuid) from public, anon, authenticated;
alter function dela_pb_cards(uuid, uuid) set search_path = public, extensions, pg_temp;
