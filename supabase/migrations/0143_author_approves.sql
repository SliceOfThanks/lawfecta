-- Step 61: the author approves (Stacey 2026-11-20: "author approves, but others can add comments for edits
-- and admin/author approves"). The author of a document is the person who created it. They may approve it and
-- decide the changes other people suggest in comments, while they are still an editor of the library.
-- The administrator may do both as before. Removing an attorney decision point stays with the administrator.
-- Additive: two helpers, one notice helper, and the same functions with one rule changed.

create or replace function dela_pb_may_approve(p_person uuid, p_id uuid) returns boolean language sql stable as $$
  select coalesce((select dela_pb_rank(dela_pb_role(p_person, p.org_id)) >= 4
    or (p.created_by = p_person and dela_pb_rank(dela_pb_role(p_person, p.org_id)) >= 3) from playbooks p where p.id = p_id), false)
$$;

-- For the page: who the author is and whether the caller may approve
create or replace function dela_pb_approver(p_person uuid, p_id uuid) returns jsonb language sql stable as $$
  select case when dela_pb_role(p_person, p.org_id) is null then null else jsonb_build_object(
    'author', (select display_name from people where id = p.created_by), 'is_author', p.created_by = p_person,
    'can_approve', dela_pb_may_approve(p_person, p.id)) end
  from playbooks p where p.id = p_id
$$;

-- Notice to the people who can decide: the administrators, and the author while they can still edit
create or replace function dela_pb_notify_deciders(p_pb uuid, p_actor uuid, p_title text, p_body text, p_key text) returns void language plpgsql as $$
declare x playbooks;
begin
  select * into x from playbooks where id = p_pb;
  if x.id is null then return; end if;
  perform dela_pb_notify_admins(x.org_id, p_actor, p_title, p_body, p_key);
  if x.created_by is distinct from p_actor and dela_pb_rank(dela_pb_role(x.created_by, x.org_id)) = 3 then
    perform dela_notify(jsonb_build_object('person_id', x.created_by, 'side', 'attorney', 'kind', 'playbook', 'title', p_title, 'body', p_body,
      'link', '/dela?tab=library', 'dedupe_key', p_key || ':' || x.created_by));
  end if;
end $$;

create or replace function dela_pb_status(p_person uuid, p_id uuid, p_action text) returns jsonb language plpgsql as $$
declare x playbooks; v_role text; v_limit int; v_count int; v_months int;
begin
  select * into x from playbooks where id = p_id for update;
  if x.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, x.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_action = 'submit' then
    if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
    if x.status <> 'draft' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if x.doc_type is not null and x.blocking > 0 then return jsonb_build_object('ok', false, 'reason', 'checks_failing', 'blocking', x.blocking); end if;
    update playbooks set status = 'in_review', updated_at = now() where id = x.id;
    perform dela_pb_notify_deciders(x.id, p_person, 'A document is ready for your review', '"' || x.title || '" was sent for approval.', 'pbreview:' || x.id || ':' || x.current_version);
  elsif p_action = 'approve' then
    -- Stacey 2026-11-20: the author approves; the administrator can too
    if not dela_pb_may_approve(p_person, x.id) then return jsonb_build_object('ok', false, 'reason', 'author_or_administrator'); end if;
    if x.status not in ('draft', 'in_review') then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if x.doc_type is not null then
      -- The block (Stacey decision 4): no approval while a step lacks its one A or a judgment step lacks the attorney flag
      if x.blocking > 0 then return jsonb_build_object('ok', false, 'reason', 'checks_failing', 'blocking', x.blocking); end if;
    elsif x.completeness < 100 or jsonb_array_length(x.missing) > 0 then return jsonb_build_object('ok', false, 'reason', 'not_complete', 'missing', x.missing);
    end if;
    v_months := case when x.high_risk then dela_int_setting('documents.review_months_high_risk', 3) else dela_int_setting('playbooks.review_months', 12) end;
    update playbooks set status = 'approved', approved_version = current_version, updated_at = now(), reminded_for = null, review_reminded_for = null,
      last_reviewed_at = (now() at time zone dela_tz())::date, next_review_at = (now() at time zone dela_tz())::date + make_interval(months => v_months) where id = x.id;
    if x.doc_type is not null then insert into document_changes (playbook_id, version, kind, what, person_id) values (x.id, x.current_version, 'approval', 'Approved', p_person); end if;
  elsif p_action in ('archive', 'trash') then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status = (case p_action when 'archive' then 'archived' else 'trash' end) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update playbooks set status = case p_action when 'archive' then 'archived' else 'trash' end,
      status_before_trash = case when p_action = 'trash' then x.status else status_before_trash end,
      trashed_at = case when p_action = 'trash' then now() else trashed_at end, updated_at = now() where id = x.id;
  elsif p_action in ('unarchive', 'restore') then
    if dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
    if x.status <> (case p_action when 'unarchive' then 'archived' else 'trash' end) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    perform pg_advisory_xact_lock(hashtextextended('playbooks:' || x.org_id::text, 0));
    v_limit := dela_pb_limit(x.org_id);
    v_count := dela_pb_count(x.org_id);
    if v_limit is not null and (p_action = 'restore' or not coalesce((dela_setting('playbooks.count_archived') #>> '{}')::boolean, true)) and v_count >= v_limit then
      return jsonb_build_object('ok', false, 'reason', 'playbook_limit', 'count', v_count, 'limit', v_limit);
    end if;
    update playbooks set status = case when p_action = 'restore' then coalesce(case when x.status_before_trash = 'archived' then 'archived' end, 'draft') else 'draft' end,
      trashed_at = null, updated_at = now() where id = x.id;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_action');
  end if;
  perform dela_pb_log(x.id, p_person, case p_action when 'submit' then 'sent_for_review' when 'approve' then 'approved' when 'archive' then 'archived'
    when 'unarchive' then 'unarchived' when 'trash' then 'deleted' else 'restored_from_trash' end, x.current_version, '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function dela_pb_decide(p_person uuid, p_suggestion uuid, p_accept boolean, p_body jsonb, p_meta jsonb, p_note text) returns jsonb language plpgsql as $$
declare s playbook_suggestions; x playbooks; v_role text; r jsonb;
begin
  select * into s from playbook_suggestions where id = p_suggestion for update;
  if s.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into x from playbooks where id = s.playbook_id;
  v_role := dela_pb_role(p_person, x.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if s.status <> 'open' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', s.status); end if;
  if s.removes_review and dela_pb_rank(v_role) < 4 then return jsonb_build_object('ok', false, 'reason', 'administrator_only'); end if;
  if s.kind = 'comment' and not dela_pb_may_approve(p_person, x.id) then return jsonb_build_object('ok', false, 'reason', 'author_or_administrator'); end if;
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if p_accept then
    if s.kind = 'ai' and s.base_version <> x.current_version then
      update playbook_suggestions set status = 'stale', decided_by = p_person, decided_at = now() where id = s.id;
      return jsonb_build_object('ok', false, 'reason', 'changed', 'current_version', x.current_version);
    end if;
    r := dela_pb_save(jsonb_build_object('person_id', p_person, 'id', x.id, 'base_version', x.current_version, 'body', p_body, 'title', p_meta->>'title',
      'completeness', p_meta->'completeness', 'missing', p_meta->'missing', 'note', left(coalesce(nullif(s.note, ''), 'Suggested change accepted'), 300),
      'action', 'suggestion_accepted'));
    if not (r->>'ok')::boolean then return r; end if;
  end if;
  update playbook_suggestions set status = case when p_accept then 'accepted' else 'rejected' end, decided_by = p_person, decided_at = now(), decision_note = left(coalesce(p_note, ''), 500)
  where id = s.id;
  update playbook_comments set resolved_at = now(), resolved_by = p_person where suggestion_id = s.id and resolved_at is null;
  if not p_accept then perform dela_pb_log(x.id, p_person, 'suggestion_rejected', x.current_version, jsonb_build_object('kind', s.kind, 'part', s.part)); end if;
  if s.author <> p_person then
    perform dela_notify(jsonb_build_object('person_id', s.author, 'side', 'attorney', 'kind', 'playbook',
      'title', 'Your suggestion was ' || case when p_accept then 'accepted' else 'not accepted' end,
      'body', 'Your suggested change to "' || x.title || '" was ' || case when p_accept then 'accepted' else 'not accepted' end || '.' || coalesce(nullif(' Note: ' || left(coalesce(p_note, ''), 200), ' Note: '), ''),
      'link', '/dela?tab=library', 'dedupe_key', 'pbdecide:' || s.id));
  end if;
  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'rejected' end, 'version', r->'version');
end $$;

create or replace function dela_patch(p_sig text, p_pairs text[]) returns void language plpgsql as $$
declare v_src text; v_new text; i int;
begin
  select pg_get_functiondef(p_sig::regprocedure) into v_src;
  v_new := v_src;
  for i in 1 .. array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[i * 2] in v_new) > 0 and position(p_pairs[i * 2 - 1] in v_new) = 0 then continue; end if;
    if position(p_pairs[i * 2 - 1] in v_new) = 0 then raise exception '% changed; update 0143 (looking for: %)', p_sig, left(p_pairs[i * 2 - 1], 80); end if;
    v_new := replace(v_new, p_pairs[i * 2 - 1], p_pairs[i * 2]);
  end loop;
  if v_new <> v_src then execute v_new; end if;
end $$;

-- Comments and suggested changes reach the author too; the Library list says which documents are the caller's own
do $$ begin
  perform dela_patch('dela_pb_suggest(jsonb)', array[
    'perform dela_pb_notify_admins(x.org_id, v_person, ''A suggested change is waiting''', 'perform dela_pb_notify_deciders(x.id, v_person, ''A suggested change is waiting''']);
  perform dela_patch('dela_pb_comment(uuid,uuid,text,integer,text)', array[
    'perform dela_pb_notify_admins(x.org_id, p_person, ''New comment on a playbook'', ''Someone commented on "''', 'perform dela_pb_notify_deciders(x.id, p_person, ''New comment on a document'', ''Someone commented on "''']);
  perform dela_patch('dela_pb_list(uuid,uuid)', array[
    '''doc_type'', p.doc_type, ''doc_id'', p.doc_id,', '''mine'', p.created_by = p_person, ''doc_type'', p.doc_type, ''doc_id'', p.doc_id,']);
end $$;
drop function if exists dela_patch(text, text[]);
revoke all on function dela_pb_may_approve(uuid, uuid) from public, anon, authenticated;
revoke all on function dela_pb_approver(uuid, uuid) from public, anon, authenticated;
revoke all on function dela_pb_notify_deciders(uuid, uuid, text, text, text) from public, anon, authenticated;
alter function dela_pb_may_approve(uuid, uuid) set search_path = public, extensions, pg_temp;
alter function dela_pb_approver(uuid, uuid) set search_path = public, extensions, pg_temp;
alter function dela_pb_notify_deciders(uuid, uuid, text, text, text) set search_path = public, extensions, pg_temp;
alter function dela_pb_status(uuid, uuid, text) set search_path = public, extensions, pg_temp;
alter function dela_pb_decide(uuid, uuid, boolean, jsonb, jsonb, text) set search_path = public, extensions, pg_temp;
