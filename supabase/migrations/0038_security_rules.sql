-- Security and sensitive data rules (docs/briefs/step-6d-security-sensitive-data.md, Stacey's answers 2026-11-05).
-- Additive and backward compatible: older api versions keep working (old function signatures stay and follow the new rules).
--  1. Files shared on a gig expire for the freelancer (7, 14 or 30 days, default 14; "Extend 14 days"; access also ends
--     when the job is complete). Expiry removes only the share: the attorney's copy in the Files tab stays.
--  2. A job can be marked sensitive: no new uploads or shares on it, secure links only.
--  3. Message attachments follow the same rule for the freelancer (the default days, or the job ending).
--  4. The attorney sees every view and download on the job page.
--  5. Files shared on a job (deliverables and their saved copies) are never attached in Ask DELA.
--  6. Drafts (Ask DELA chats, playbooks in Draft with no approved version) and job uploads (deliverables) are deleted
--     90 days after last use unless saved, with a notice 7 days before. People can delete them at once.
--  7. Trash on the Files tab gets "Delete forever".
--  8. The /security page's contact form.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('drafts.auto_delete_days', '90', 'Days after last use that drafts and job uploads are deleted unless saved', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', 'Drafts: Ask DELA chats and documents in Draft with no approved version. Job uploads: deliverables. The Files tab counts as saved.'),
  ('drafts.warn_days', '7', 'Days before the 90-day deletion that the member sees a notice with "Save to library"', 'Sharing and retention', 'days', 'C', 'Stacey 2026-11-05', ''),
  ('security.contact_per_hour', '5', 'Most security questions one address can send in an hour', 'Security page', 'messages', 'C', 'Stacey 2026-11-05', ''),
  ('security.data_location', '"Supabase, hosted on Amazon Web Services (AWS) in the United States"', 'Where DELA keeps its data (shown on the security page)', 'Security page', '', 'C', 'Stacey 2026-11-05', 'The test site is in AWS us-west-2 (Oregon). Live must be created in a US region.'),
  ('security.openai_zdr', 'false', 'OpenAI has approved Zero Data Retention for Lawfecta''s API account', 'Security page', '', 'O', 'Stacey 2026-11-05', 'Until true, the security page says OpenAI may keep inputs for up to 30 days for abuse monitoring and does not train on them.')
on conflict (key) do nothing;
-- CSV files on the Files tab (scanned like the others)
update settings set value = value || '["csv"]'::jsonb where key = 'files.allowed_types' and not (value ? 'csv');

alter table files add column if not exists from_job boolean not null default false;
alter table files add column if not exists saved_at timestamptz;
alter table ai_chats add column if not exists saved_at timestamptz;
alter table playbooks add column if not exists saved_at timestamptz;

-- ---------- 1. Gig shares expire ----------
alter table gig_files add column if not exists expires_at timestamptz;
update gig_files set expires_at = shared_at + make_interval(days => dela_int_setting('sharing.expiry_default', 14)) where expires_at is null;
alter table gig_files alter column expires_at set default (now() + make_interval(days => 14));

-- Hired freelancers keep shared files only until the job is complete (it was: until canceled)
create or replace function dela_gig_files_open(p_gig uuid, p_person uuid) returns boolean language sql stable as $$
  select case
    when exists (select 1 from agreements a where a.gig_id = p_gig and a.freelancer_person = p_person and a.status not in ('canceled', 'completed')) then true
    when g.status = 'open' and exists (select 1 from gig_invitations i where i.gig_id = p_gig and i.freelancer_id = p_person and i.status in ('sent', 'answered')) then true
    else false end
  from gigs g where g.id = p_gig
$$;

create or replace function dela_gig_file_share(p_person uuid, p_gig uuid, p_file uuid, p_share boolean, p_days int) returns jsonb language plpgsql as $$
declare g gigs; f files; gf gig_files;
begin
  if dela_gig_close_if_due(p_gig) is null or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into g from gigs where id = p_gig;
  select * into f from files where id = p_file;
  if f.id is null or f.org_id <> g.org_id or f.purpose <> 'member' or f.status <> 'ready' then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;
  if p_share then
    if g.sensitive then return jsonb_build_object('ok', false, 'reason', 'sensitive_job'); end if;
    insert into gig_files (gig_id, file_id, shared_by, expires_at) values (p_gig, p_file, p_person, now() + make_interval(days => dela_sharing_days(p_days)))
    on conflict (gig_id, file_id) do update set removed_at = null, shared_at = now(), shared_by = p_person, expires_at = excluded.expires_at
    returning * into gf;
  else
    update gig_files set removed_at = now() where gig_id = p_gig and file_id = p_file and removed_at is null;
  end if;
  perform dela_gig_event(p_gig, case when p_share then 'file_shared' else 'file_unshared' end, 'member', p_person, jsonb_build_object('file', p_file, 'expires_at', gf.expires_at));
  return jsonb_build_object('ok', true, 'expires_at', gf.expires_at);
end $$;
-- The older signature (older api versions) follows the same rules with the default days
create or replace function dela_gig_file_share(p_person uuid, p_gig uuid, p_file uuid, p_share boolean) returns jsonb language sql as $$
  select dela_gig_file_share(p_person, p_gig, p_file, p_share, null::int)
$$;

create or replace function dela_gig_file_extend(p_person uuid, p_gig uuid, p_file uuid) returns jsonb language plpgsql as $$
declare gf gig_files;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update gig_files set expires_at = greatest(expires_at, now()) + make_interval(days => dela_int_setting('sharing.extend_days', 14))
  where gig_id = p_gig and file_id = p_file and removed_at is null returning * into gf;
  if gf.gig_id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_gig_event(p_gig, 'file_extended', 'member', p_person, jsonb_build_object('file', p_file, 'expires_at', gf.expires_at));
  return jsonb_build_object('ok', true, 'expires_at', gf.expires_at);
end $$;

-- A download: the gig's managers, and invited or hired freelancers while the share lasts. Every download is logged.
create or replace function dela_gig_file_get(p_person uuid, p_side text, p_gig uuid, p_file uuid) returns jsonb language plpgsql as $$
declare f files; gf gig_files; v_ok boolean;
begin
  perform dela_gig_close_if_due(p_gig);
  select * into gf from gig_files where gig_id = p_gig and file_id = p_file and removed_at is null;
  select fi.* into f from files fi where fi.id = gf.file_id and fi.status = 'ready';
  if gf.gig_id is null or f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_ok := (p_side = 'attorney' and dela_gig_manager(p_person, p_gig)) or (p_side = 'freelancer' and dela_gig_files_open(p_gig, p_person));
  if not v_ok then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_side = 'freelancer' and gf.expires_at <= now() then return jsonb_build_object('ok', false, 'reason', 'share_expired'); end if;
  insert into gig_file_downloads (gig_id, file_id, person_id) values (p_gig, p_file, p_person);
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'name', f.name);
end $$;

-- The gig view: each share's expiry for the attorney; freelancers see only shares that have not expired; the job's
-- sensitive flag and the expiry choices. Only these parts of dela_gig_get change.
do $$
declare v_src text; v_new text;
begin
  select pg_get_functiondef('dela_gig_get(uuid,text,uuid)'::regprocedure) into v_src;
  if position('sharing_choices' in v_src) > 0 then return; end if;
  v_new := replace(v_src,
    $a$'files', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.id, 'name', f.name, 'size_bytes', f.size_bytes) order by f.name), '[]')
      from gig_files gf join files f on f.id = gf.file_id where gf.gig_id = g.id and gf.removed_at is null and f.status = 'ready'
        and (v_mgr or (v_access in ('invited', 'hired') and dela_gig_files_open(g.id, p_person)))),$a$,
    $b$'files', (select coalesce(jsonb_agg(jsonb_build_object('file_id', f.id, 'name', f.name, 'size_bytes', f.size_bytes, 'expires_at', gf.expires_at, 'expired', gf.expires_at <= now()) order by f.name), '[]')
      from gig_files gf join files f on f.id = gf.file_id where gf.gig_id = g.id and gf.removed_at is null and f.status = 'ready'
        and (v_mgr or (v_access in ('invited', 'hired') and dela_gig_files_open(g.id, p_person) and gf.expires_at > now()))),
    'sensitive', g.sensitive,
    'sharing_choices', case when v_mgr then jsonb_build_object('choices', dela_setting('sharing.expiry_choices'), 'default', dela_int_setting('sharing.expiry_default', 14), 'extend_days', dela_int_setting('sharing.extend_days', 14)) end,$b$);
  if v_new = v_src then raise exception 'dela_gig_get changed; update 0038'; end if;
  execute v_new;
end $$;

-- The upload check also reports why a file was refused
create or replace function dela_file_for_check(p_file uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', id, 'status', status, 'ext', ext, 'storage_path', storage_path, 'size_bytes', size_bytes, 'person_id', uploaded_by, 'side', side, 'name', name,
    'purpose', purpose, 'org_id', org_id, 'refuse_reason', refuse_reason)
  from files where id = p_file
$$;

-- ---------- 2. Sensitive jobs ----------
-- On: no new uploads or shares on this job, secure links only. Files already shared stay until they expire; the answer
-- counts them so the screen can offer "Delete now".
create or replace function dela_gig_sensitive(p_person uuid, p_gig uuid, p_on boolean) returns jsonb language plpgsql as $$
declare g gigs; v_shares int; v_conf int;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update gigs set sensitive = p_on, sensitive_at = case when p_on then now() else sensitive_at end, sensitive_by = case when p_on then p_person else sensitive_by end
  where id = p_gig and sensitive is distinct from p_on returning * into g;
  if g.id is not null then perform dela_gig_event(p_gig, case when p_on then 'marked_sensitive' else 'unmarked_sensitive' end, 'member', p_person, '{}'); end if;
  select count(*) into v_shares from gig_files where gig_id = p_gig and removed_at is null;
  select count(*) into v_conf from conf_files c join agreements a on a.id = c.agreement_id where a.gig_id = p_gig and c.deleted_at is null;
  return jsonb_build_object('ok', true, 'sensitive', p_on, 'shared_files', v_shares, 'confidential_files', v_conf);
end $$;

-- "Delete now": remove every share on the gig (the Files tab copies stay) and return the confidential files to delete
create or replace function dela_gig_shared_delete_all(p_person uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare v_n int; v_ag uuid;
begin
  if not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update gig_files set removed_at = now() where gig_id = p_gig and removed_at is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then perform dela_gig_event(p_gig, 'files_unshared_all', 'member', p_person, jsonb_build_object('count', v_n)); end if;
  select id into v_ag from agreements where gig_id = p_gig and status <> 'canceled' order by created_at desc limit 1;
  return jsonb_build_object('ok', true, 'unshared', v_n, 'agreement_id', v_ag);
end $$;

-- ---------- 3. Message attachments ----------
-- The freelancer can open an attachment the attorney side sent for the default days, and not after the job is complete
create or replace function dela_message_file_get(p_person uuid, p_side text, p_thread uuid, p_file uuid) returns jsonb language plpgsql as $$
declare f files; m messages; t threads;
begin
  if dela_thread_role(p_person, p_side, p_thread) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into m from messages where thread_id = p_thread and status = 'sent' and p_file = any(attachments) order by created_at desc limit 1;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = p_file and status = 'ready';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_side = 'freelancer' and m.side = 'attorney' then
    select * into t from threads where id = p_thread;
    if m.created_at + make_interval(days => dela_int_setting('sharing.expiry_default', 14)) <= now()
       or exists (select 1 from agreements a where a.gig_id = t.gig_id and a.freelancer_person = p_person and a.status = 'completed') then
      return jsonb_build_object('ok', false, 'reason', 'share_expired');
    end if;
  end if;
  insert into message_file_downloads (thread_id, file_id, person_id) values (p_thread, p_file, p_person);
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'name', f.name);
end $$;

-- ---------- 4. The job's file activity, for the attorney ----------
-- Every view and download of anything shared on this job, newest first, under each person's name. Confidential
-- materials entries only for people who may see that area.
create or replace function dela_job_activity(p_person uuid, p_side text, p_gig uuid) returns jsonb language plpgsql stable as $$
declare v_conf boolean := false; a agreements;
begin
  if p_side <> 'attorney' or not dela_gig_manager(p_person, p_gig) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into a from agreements where gig_id = p_gig and status <> 'canceled' order by created_at desc limit 1;
  if a.id is not null then v_conf := dela_conf_role(p_person, a.id) in ('hiring', 'firm', 'staff'); end if;
  return jsonb_build_object('ok', true, 'items', (select coalesce(jsonb_agg(x order by (x->>'at') desc), '[]') from (select x from (
    select jsonb_build_object('at', d.at, 'who', pe.display_name, 'action', 'download', 'what', fi.name, 'where', 'Shared files') x
      from gig_file_downloads d join people pe on pe.id = d.person_id join files fi on fi.id = d.file_id where d.gig_id = p_gig
    union all
    select jsonb_build_object('at', d.at, 'who', pe.display_name, 'action', 'download', 'what', fi.name, 'where', 'Messages')
      from message_file_downloads d join threads t on t.id = d.thread_id join people pe on pe.id = d.person_id join files fi on fi.id = d.file_id where t.gig_id = p_gig
    union all
    select jsonb_build_object('at', d.at, 'who', pe.display_name, 'action', 'download', 'what', fi.name, 'where', 'Deliverables')
      from deliverable_downloads d join milestone_submissions s on s.id = d.submission_id join milestones m on m.id = s.milestone_id join people pe on pe.id = d.person_id join files fi on fi.id = d.file_id
      where a.id is not null and m.agreement_id = a.id
    union all
    select jsonb_build_object('at', l.at, 'who', coalesce(pe.display_name, 'DELA'), 'action', l.action, 'what', coalesce(fi.name, l.detail->>'name', k.label), 'where', 'Confidential materials')
      from conf_log l left join people pe on pe.id = l.person_id left join conf_files c on c.id = l.file_id left join files fi on fi.id = c.file_id left join conf_links k on k.id = l.link_id
      where v_conf and l.agreement_id = a.id and l.action in ('open', 'download', 'link_open')
    ) y(x) order by (x->>'at') desc limit 300) z(x)));
end $$;

-- ---------- 5. Ask DELA: Files-tab files only, never files shared on a job ----------
create or replace function dela_ai_file_usable(p_person uuid, p_side text, p_file uuid) returns boolean language sql stable as $$
  select exists (select 1 from files f where f.id = p_file and f.status = 'ready' and f.check_state in ('clear', 'confirmed')
    and f.purpose = 'member' and not f.from_job and dela_file_member(p_person, p_side, f.org_id))
$$;
do $$
declare v_src text;
begin
  -- dela_ai_chat_prepare keeps its body; only its file rule changes (Files-tab files only)
  select pg_get_functiondef('dela_ai_chat_prepare(jsonb)'::regprocedure) into v_src;
  if position('dela_ai_file_usable' in v_src) = 0 then
    v_src := replace(v_src,
      'where not exists (select 1 from files f where f.id = fid and f.status = ''ready'' and f.check_state in (''clear'', ''confirmed'') and dela_file_member(v_person, v_side, f.org_id));',
      'where not dela_ai_file_usable(v_person, v_side, fid);');
    if position('dela_ai_file_usable' in v_src) = 0 then raise exception 'dela_ai_chat_prepare changed; update 0038'; end if;
    execute v_src;
  end if;
end $$;

-- ---------- 6. The 90-day rule ----------
-- Some history tables are append-only. A never-approved draft is not a record anyone relies on, so the purge below may
-- remove its rows; nothing else can.
create or replace function dela_no_change_unless_purge() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('dela.purge', true) = 'on' then return old; end if;
  raise exception 'append-only';
end $$;
do $$
declare t text;
begin
  foreach t in array array['playbook_versions', 'playbook_activity', 'document_changes', 'doc_image_checks'] loop
    if exists (select 1 from pg_trigger where tgrelid = t::regclass and tgname = t || '_append_only') then
      execute format('drop trigger %I on %I', t || '_append_only', t);
      execute format('create trigger %I before update or delete on %I for each row execute function dela_no_change_unless_purge()', t || '_append_only', t);
    elsif exists (select 1 from pg_trigger where tgrelid = t::regclass and tgname = t || '_append') then
      execute format('drop trigger %I on %I', t || '_append', t);
      execute format('create trigger %I before update or delete on %I for each row execute function dela_no_change_unless_purge()', t || '_append', t);
    end if;
  end loop;
end $$;

-- A chat is deleted at once and for good when its owner deletes it
create or replace function dela_ai_chat_delete(p_person uuid, p_side text, p_chat uuid) returns jsonb language plpgsql as $$
begin
  if not exists (select 1 from ai_chats where id = p_chat and person_id = p_person and side = p_side) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  delete from ai_messages where chat_id = p_chat;
  delete from ai_chats where id = p_chat;
  perform dela_audit('member', p_person, 'ai_chat_deleted', 'ai_chat', p_chat::text, '{}');
  return jsonb_build_object('ok', true);
end $$;
create or replace function dela_ai_chat_save(p_person uuid, p_side text, p_chat uuid, p_on boolean) returns jsonb language plpgsql as $$
begin
  update ai_chats set saved_at = case when p_on then coalesce(saved_at, now()) end where id = p_chat and person_id = p_person and side = p_side;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;
-- The chat list says when each unsaved chat will be deleted
create or replace function dela_ai_chats(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'updated_at', updated_at, 'saved', saved_at is not null,
    'delete_at', case when saved_at is null then updated_at + make_interval(days => dela_int_setting('drafts.auto_delete_days', 90)) end) order by updated_at desc), '[]')
  from (select * from ai_chats where person_id = p_person and side = p_side and archived_at is null order by updated_at desc limit 50) c
$$;

-- A playbook in Draft that was never approved: removed for good, with its versions, comments, images and log.
-- Returns the storage paths of its images for the api to remove. Approved documents use Trash as before.
create or replace function dela_pb_draft_purge(p_playbook uuid) returns jsonb language plpgsql as $$
declare v_paths jsonb;
begin
  select coalesce(jsonb_agg(f.storage_path), '[]') into v_paths from doc_images di join files f on f.id = di.file_id where di.playbook_id = p_playbook;
  perform set_config('dela.purge', 'on', true);
  update files set status = 'deleted', deleted_at = now(), updated_at = now() where id in (select file_id from doc_images where playbook_id = p_playbook) and status <> 'deleted';
  delete from doc_image_checks where playbook_id = p_playbook;
  delete from doc_images where playbook_id = p_playbook;
  delete from doc_version_checks where playbook_id = p_playbook;
  delete from doc_review_notices where playbook_id = p_playbook;
  delete from document_changes where playbook_id = p_playbook;
  delete from playbook_comments where playbook_id = p_playbook;
  delete from playbook_suggestions where playbook_id = p_playbook;
  delete from playbook_files where playbook_id = p_playbook;
  delete from playbook_imports where playbook_id = p_playbook;
  delete from playbook_activity where playbook_id = p_playbook;
  delete from bench_suggestions where playbook_id = p_playbook;
  delete from playbook_versions where playbook_id = p_playbook;
  delete from playbooks where id = p_playbook;
  perform set_config('dela.purge', 'off', true);
  return v_paths;
end $$;
create or replace function dela_pb_draft_delete(p_person uuid, p_playbook uuid) returns jsonb language plpgsql as $$
declare pb playbooks;
begin
  select * into pb from playbooks where id = p_playbook for update;
  if pb.id is null then return jsonb_build_object('ok', true, 'duplicate', true, 'paths', '[]'::jsonb); end if;
  if dela_firm_role(p_person, pb.org_id) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if pb.approved_version is not null or pb.status <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_a_draft'); end if;
  if pb.created_by <> p_person and dela_firm_role(p_person, pb.org_id) not in ('owner', 'manager') then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if exists (select 1 from gigs where playbook_id = pb.id) or exists (select 1 from gig_references where playbook_id = pb.id) then return jsonb_build_object('ok', false, 'reason', 'in_use'); end if;
  perform dela_audit('member', p_person, 'draft_deleted', 'playbook', pb.id::text, jsonb_build_object('title', left(pb.title, 80)));
  return jsonb_build_object('ok', true, 'paths', dela_pb_draft_purge(pb.id));
end $$;
create or replace function dela_pb_save_draft(p_person uuid, p_playbook uuid, p_on boolean) returns jsonb language plpgsql as $$
declare pb playbooks;
begin
  select * into pb from playbooks where id = p_playbook;
  if pb.id is null or dela_firm_role(p_person, pb.org_id) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update playbooks set saved_at = case when p_on then coalesce(saved_at, now()) end where id = pb.id;
  return jsonb_build_object('ok', true);
end $$;
-- When an unsaved draft would be deleted (null when the rule does not apply)
create or replace function dela_pb_delete_at(pb playbooks) returns timestamptz language sql stable as $$
  select case when pb.status = 'draft' and pb.approved_version is null and pb.saved_at is null
    then pb.updated_at + make_interval(days => dela_int_setting('drafts.auto_delete_days', 90)) end
$$;
create or replace function dela_pb_drafts_due(p_person uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'delete_at', dela_pb_delete_at(p)) order by p.updated_at), '[]')
  from playbooks p where dela_firm_role(p_person, p.org_id) <> '' and dela_pb_delete_at(p) is not null
$$;

-- A deliverable (a job upload) is deleted 90 days after it was sent unless the attorney saved it to the library.
-- "Save to library" copies it into the firm's Files tab; the copy keeps from_job, so Ask DELA never reads it.
create or replace function dela_deliverable_delete_at(f files) returns timestamptz language sql stable as $$
  select case when f.purpose = 'deliverable' and f.saved_at is null and f.status = 'ready' then f.created_at + make_interval(days => dela_int_setting('drafts.auto_delete_days', 90)) end
$$;
create or replace function dela_deliverable_save_start(p_person uuid, p_side text, p_submission uuid, p_file uuid) returns jsonb language plpgsql as $$
declare r jsonb; src files; a agreements; v_id uuid := gen_random_uuid(); n files;
begin
  if p_side <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select ag.* into a from milestone_submissions s join milestones m on m.id = s.milestone_id join agreements ag on ag.id = m.agreement_id where s.id = p_submission and p_file = any(s.files);
  if a.id is null or dela_firm_role(p_person, a.attorney_org) = '' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into src from files where id = p_file and purpose = 'deliverable' and status = 'ready';
  if src.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into n from files where org_id = a.attorney_org and request_id = 'saved:' || src.id::text;
  if n.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'file_id', n.id); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || a.attorney_org::text, 0));
  if dela_storage_limit_bytes(a.attorney_org) is not null and dela_storage_used_bytes(a.attorney_org) + src.size_bytes > dela_storage_limit_bytes(a.attorney_org) then
    return jsonb_build_object('ok', false, 'reason', 'storage_full');
  end if;
  insert into files (id, org_id, group_id, version, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at, purpose, status, check_state, mime, sha256, from_job, is_current)
  values (v_id, a.attorney_org, v_id, 1, src.name, src.ext, src.size_bytes, a.attorney_org::text || '/' || v_id::text || '.' || src.ext, p_person, 'attorney', 'saved:' || src.id::text, now(), 'member', 'uploading', 'confirmed', src.mime, src.sha256, true, true)
  returning * into n;
  return jsonb_build_object('ok', true, 'file_id', n.id, 'from_path', src.storage_path, 'to_path', n.storage_path, 'source_id', src.id);
end $$;
create or replace function dela_deliverable_saved(p_new uuid, p_source uuid) returns void language plpgsql as $$
begin
  update files set status = 'ready', updated_at = now() where id = p_new and status = 'uploading';
  update files set saved_at = coalesce(saved_at, now()) where id = p_source;
end $$;

-- Daily: notices 7 days before, then the deletions. Returns the storage paths for the api to remove.
create or replace function dela_retention_daily() returns jsonb language plpgsql as $$
declare r record; v_paths jsonb := '[]'; v_days int := dela_int_setting('drafts.auto_delete_days', 90); v_warn int := dela_int_setting('drafts.warn_days', 7);
  v_chats int := 0; v_drafts int := 0; v_files int := 0;
begin
  -- Notices: one a day per person, naming how many items and when
  for r in select c.person_id, c.side, count(*) n, min(c.updated_at + make_interval(days => v_days)) d from ai_chats c
           where c.saved_at is null and c.updated_at + make_interval(days => v_days) <= now() + make_interval(days => v_warn) and c.updated_at + make_interval(days => v_days) > now()
           group by 1, 2 loop
    perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', r.side, 'kind', 'retention',
      'title', r.n || case when r.n = 1 then ' Ask DELA chat' else ' Ask DELA chats' end || ' will be deleted on ' || to_char(r.d at time zone dela_tz(), 'Mon FMDD, YYYY'),
      'body', 'Unsaved chats are deleted ' || v_days || ' days after you last used them. Open Ask DELA and click "Save to library" on any chat you want to keep.',
      'link', '/dela?tab=delegate', 'dedupe_key', 'retchat:' || r.person_id || ':' || r.side || ':' || (now() at time zone dela_tz())::date));
  end loop;
  for r in select p.created_by as person_id, count(*) n, min(dela_pb_delete_at(p)) d from playbooks p
           where dela_pb_delete_at(p) <= now() + make_interval(days => v_warn) and dela_pb_delete_at(p) > now() group by 1 loop
    perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'retention',
      'title', r.n || case when r.n = 1 then ' draft' else ' drafts' end || ' will be deleted on ' || to_char(r.d at time zone dela_tz(), 'Mon FMDD, YYYY'),
      'body', 'Drafts that were never approved are deleted ' || v_days || ' days after the last change. Open the Library and click "Save to library" on any draft you want to keep.',
      'link', '/dela?tab=library', 'dedupe_key', 'retdraft:' || r.person_id || ':' || (now() at time zone dela_tz())::date));
  end loop;
  for r in select a.attorney_person as person_id, a.gig_id, count(*) n, min(dela_deliverable_delete_at(f)) d
           from files f join milestone_submissions s on f.id = any(s.files) join milestones m on m.id = s.milestone_id join agreements a on a.id = m.agreement_id
           where dela_deliverable_delete_at(f) <= now() + make_interval(days => v_warn) and dela_deliverable_delete_at(f) > now() group by 1, 2 loop
    perform dela_notify(jsonb_build_object('person_id', r.person_id, 'side', 'attorney', 'kind', 'retention',
      'title', r.n || case when r.n = 1 then ' deliverable' else ' deliverables' end || ' will be deleted on ' || to_char(r.d at time zone dela_tz(), 'Mon FMDD, YYYY'),
      'body', 'Files uploaded on a job are deleted ' || v_days || ' days after they were sent. Open the job and click "Save to library" on any file you want to keep.',
      'link', '/dela?tab=projects&gig=' || r.gig_id::text || '&view=agreement', 'dedupe_key', 'retdel:' || r.person_id || ':' || r.gig_id || ':' || (now() at time zone dela_tz())::date));
  end loop;
  -- Deletions
  for r in select id from ai_chats where saved_at is null and updated_at + make_interval(days => v_days) <= now() limit 2000 loop
    delete from ai_messages where chat_id = r.id;
    delete from ai_chats where id = r.id;
    v_chats := v_chats + 1;
  end loop;
  for r in select p.id from playbooks p where dela_pb_delete_at(p) <= now()
           and not exists (select 1 from gigs g where g.playbook_id = p.id) and not exists (select 1 from gig_references x where x.playbook_id = p.id) limit 500 loop
    v_paths := v_paths || dela_pb_draft_purge(r.id);
    v_drafts := v_drafts + 1;
  end loop;
  for r in select f.id, f.storage_path from files f where dela_deliverable_delete_at(f) <= now()
           and not exists (select 1 from milestone_submissions s join milestones m on m.id = s.milestone_id join disputes d on d.agreement_id = m.agreement_id
                           where f.id = any(s.files) and d.status in ('notice', 'team_review')) limit 2000 loop
    update files set status = 'deleted', deleted_at = now(), updated_at = now() where id = r.id;
    delete from file_texts where file_id = r.id;
    v_paths := v_paths || to_jsonb(r.storage_path);
    v_files := v_files + 1;
  end loop;
  if v_chats + v_drafts + v_files > 0 then
    perform dela_audit('system', null, 'retention_deleted', 'retention', (now() at time zone dela_tz())::date::text, jsonb_build_object('chats', v_chats, 'drafts', v_drafts, 'deliverables', v_files));
  end if;
  return jsonb_build_object('paths', v_paths, 'chats', v_chats, 'drafts', v_drafts, 'deliverables', v_files);
end $$;

-- ---------- 7. "Delete forever" in Trash ----------
create or replace function dela_file_delete_forever(p_person uuid, p_side text, p_file uuid) returns jsonb language plpgsql as $$
declare f files; v_org uuid := dela_side_org(p_person, p_side); v_paths jsonb;
begin
  if v_org is null or not dela_file_member(p_person, p_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  select * into f from files where id = p_file and org_id = v_org and purpose = 'member';
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status = 'deleted' then return jsonb_build_object('ok', true, 'duplicate', true, 'paths', '[]'::jsonb); end if;
  if f.status <> 'trash' then return jsonb_build_object('ok', false, 'reason', 'not_in_trash'); end if;
  -- Every version of the file goes
  select coalesce(jsonb_agg(storage_path), '[]') into v_paths from files where group_id = f.group_id and status = 'trash';
  delete from file_texts where file_id in (select id from files where group_id = f.group_id and status = 'trash');
  update gig_files set removed_at = now() where file_id in (select id from files where group_id = f.group_id) and removed_at is null;
  update files set status = 'deleted', deleted_at = now(), updated_at = now() where group_id = f.group_id and status = 'trash';
  perform dela_audit('member', p_person, 'file_deleted_forever', 'file', f.id::text, '{}');
  return jsonb_build_object('ok', true, 'paths', v_paths);
end $$;

create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
    perform dela_job_enqueue('playbooks_daily', '{}', now(), 'playbooks_daily:' || local::date);
    perform dela_job_enqueue('recordings_daily', '{}', now(), 'recordings_daily:' || local::date);
    perform dela_job_enqueue('profiles_daily', '{}', now(), 'profiles_daily:' || local::date);
    perform dela_job_enqueue('bench_daily', '{}', now(), 'bench_daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
  perform dela_job_enqueue('engagements_daily', '{}', now(), 'engagements_daily:' || local::date);
  perform dela_job_enqueue('confidential_daily', '{}', now(), 'confidential_daily:' || local::date);
  perform dela_job_enqueue('retention_daily', '{}', now(), 'retention_daily:' || local::date);
  perform dela_job_enqueue('links_hourly', '{}', now(), 'links_hourly:' || to_char(local, 'YYYY-MM-DD HH24'));
end $$;

-- ---------- 8. The /security page's contact form ----------
create table if not exists security_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null,
  topic text not null default '',
  message text not null check (length(message) between 1 and 4000),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references people(id)
);
create index if not exists security_messages_ip on security_messages (ip_hash, created_at desc);
alter table security_messages enable row level security;

create or replace function dela_security_contact(p jsonb) returns jsonb language plpgsql as $$
declare v_ip text := left(coalesce(p->>'ip_hash', ''), 64); v_id uuid; v_email text := lower(btrim(coalesce(p->>'email', ''))); v_msg text := btrim(coalesce(p->>'message', ''));
begin
  if v_ip = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if (select count(*) from security_messages where ip_hash = v_ip and created_at > now() - interval '1 hour') >= dela_int_setting('security.contact_per_hour', 5) then
    return jsonb_build_object('ok', false, 'reason', 'too_many_messages');
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or length(v_email) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_email'); end if;
  if length(v_msg) < 5 then return jsonb_build_object('ok', false, 'reason', 'message_needed'); end if;
  insert into security_messages (name, email, topic, message, ip_hash)
  values (left(btrim(coalesce(p->>'name', '')), 120), v_email, left(btrim(coalesce(p->>'topic', '')), 80), left(v_msg, 4000), v_ip) returning id into v_id;
  perform dela_alert('security', 'Security question from the website',
    'From: ' || coalesce(nullif(left(btrim(coalesce(p->>'name', '')), 120), ''), 'No name given') || ' (' || v_email || ')' || chr(10) ||
    'Topic: ' || coalesce(nullif(left(btrim(coalesce(p->>'topic', '')), 80), ''), 'Not given') || chr(10) || chr(10) || left(v_msg, 4000) || chr(10) || chr(10) ||
    'It is also in the admin area, Security tab.', 'security_msg:' || v_id);
  return jsonb_build_object('ok', true);
end $$;
create or replace function dela_admin_security(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  return jsonb_build_object('ok', true, 'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'email', email, 'topic', topic, 'message', message,
    'at', created_at, 'handled', handled_at is not null) order by created_at desc), '[]') from (select * from security_messages order by created_at desc limit 100) m),
    'open', (select count(*) from security_messages where handled_at is null));
end $$;
create or replace function dela_admin_security_handled(p_actor uuid, p_id uuid) returns jsonb language plpgsql as $$
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  update security_messages set handled_at = coalesce(handled_at, now()), handled_by = coalesce(handled_by, p_actor) where id = p_id;
  return jsonb_build_object('ok', found);
end $$;
-- The facts the public page shows, from settings (never written into the page)
create or replace function dela_security_facts() returns jsonb language sql stable as $$
  select jsonb_build_object('data_location', dela_setting_text('security.data_location', 'the United States'),
    'expiry_choices', dela_setting('sharing.expiry_choices'), 'expiry_default', dela_int_setting('sharing.expiry_default', 14),
    'extend_days', dela_int_setting('sharing.extend_days', 14), 'grace_days', dela_int_setting('sharing.grace_days', 7),
    'link_minutes', dela_int_setting('confidential.link_minutes', 5), 'drafts_days', dela_int_setting('drafts.auto_delete_days', 90),
    'warn_days', dela_int_setting('drafts.warn_days', 7), 'login_hours', dela_int_setting('confidential.login_hours', 12),
    'link_warn_days', dela_int_setting('links.warn_days', 2), 'openai_zdr', dela_setting_text('security.openai_zdr', 'false') = 'true')
$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dela_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
    end if;
  end loop;
end $$;
