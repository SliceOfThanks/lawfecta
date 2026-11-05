-- Images in documents (brief docs/briefs/step-2e-document-images.md; Stacey 2026-11-05: "Yes", all answers as suggested).
-- Screenshots on SOP steps and Before you start, Workflow stages and the swimlane chart, and Playbook scripts and examples.
-- Policies stay text only. Each image is a firm file (purpose doc_image) with a record of its caption and its client-data
-- check. The blur is burned in by the browser before upload, so no unblurred original ever reaches DELA.
-- Additive: new tables, functions, a switch and settings.

insert into feature_switches (key, label, gate) values
  ('document_images', 'Images in documents: add, blur, caption, check, and show in exports and gigs', 'Document images tested')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('documents.images.max_mb', '5', 'Largest image in a document', 'Documents', 'MB', 'C', 'Stacey 2026-11-05 (images rules)', 'PNG and JPG only.'),
  ('documents.images.per_step', '3', 'Most images on one step or section', 'Documents', 'images', 'C', 'Stacey 2026-11-05 (images rules)', 'More means the step should be split.'),
  ('documents.images.caption_max', '120', 'Longest image caption', 'Documents', 'characters', 'C', 'Stacey 2026-11-05 (images review window)', 'The caption is also the alt text.'),
  ('documents.images.export_max_mb', '40', 'Most image data in one export', 'Documents', 'MB', 'R', 'Claude', 'Images past this show as their caption, so very large documents still export.'),
  ('documents.images.max_width_px', '2400', 'Widest image DELA keeps (larger ones are shrunk in the browser before upload)', 'Documents', 'pixels', 'C', 'Stacey 2026-11-05 (brief question 8)', '')
on conflict (key) do nothing;

alter table files drop constraint if exists files_purpose_check;
alter table files add constraint files_purpose_check check (purpose in ('member', 'recording', 'profile', 'deliverable', 'doc_image'));

-- One record per image. Edit and Replace make a new image, so older versions keep the image they had.
create table if not exists doc_images (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  playbook_id uuid references playbooks(id),
  file_id uuid not null references files(id),
  source text not null default 'upload' check (source in ('upload', 'import')),
  caption text not null default '',
  width int not null default 0,
  height int not null default 0,
  flags_found int not null default 0,
  flags_blurred int not null default 0,
  confirmed_by uuid references people(id),
  confirmed_at timestamptz,
  created_by uuid references people(id),
  request_id text not null,
  created_at timestamptz not null default now(),
  unique (org_id, request_id)
);
create unique index if not exists doc_images_file on doc_images (file_id);
create index if not exists doc_images_org on doc_images (org_id);
alter table doc_images enable row level security;

-- "Still current" marks at review time (append-only)
create table if not exists doc_image_checks (
  id bigserial primary key,
  image_id uuid not null references doc_images(id),
  playbook_id uuid not null references playbooks(id),
  person_id uuid not null references people(id),
  at timestamptz not null default now()
);
create index if not exists doc_image_checks_image on doc_image_checks (image_id, at);
alter table doc_image_checks enable row level security;

create or replace function dela_doc_images_no_change() returns trigger language plpgsql as $$
begin raise exception 'append-only'; end $$;
drop trigger if exists doc_image_checks_append on doc_image_checks;
create trigger doc_image_checks_append before update or delete on doc_image_checks for each row execute function dela_doc_images_no_change();

-- Who may add images to a document: editors and administrators of its library, on SOPs, Workflows and Playbooks
create or replace function dela_doc_image_editor(p_person uuid, p_playbook uuid) returns jsonb language plpgsql stable as $$
declare pb playbooks; v_role text;
begin
  select * into pb from playbooks where id = p_playbook;
  if pb.id is null or pb.status in ('deleted', 'trash') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, pb.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if pb.doc_type is null then return jsonb_build_object('ok', false, 'reason', 'not_a_document'); end if;
  if pb.doc_type = 'policy' then return jsonb_build_object('ok', false, 'reason', 'policy_text_only'); end if;
  return jsonb_build_object('ok', true, 'org_id', pb.org_id, 'doc_type', pb.doc_type);
end $$;

-- Step one: a place to upload. p: person_id, playbook_id, name, size_bytes, request_id, ticked
create or replace function dela_doc_image_start(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_req text := left(coalesce(p->>'request_id', ''), 80); v_name text := btrim(coalesce(p->>'name', ''));
  v_ext text; v_size bigint := (p->>'size_bytes')::bigint; v_limit bigint; v_used bigint; v_id uuid := gen_random_uuid(); e jsonb; v_org uuid; f files;
begin
  if not dela_switch_on('document_images', v_person) then return jsonb_build_object('ok', false, 'reason', 'images_off'); end if;
  e := dela_doc_image_editor(v_person, (p->>'playbook_id')::uuid);
  if not (e->>'ok')::boolean then return e; end if;
  v_org := (e->>'org_id')::uuid;
  if v_req = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  if coalesce((p->>'ticked')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'confirm_needed'); end if;
  select * into f from files where org_id = v_org and request_id = v_req;
  if f.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'file_id', f.id, 'status', f.status, 'storage_path', f.storage_path); end if;
  v_name := regexp_replace(v_name, '[[:cntrl:]/\\]+', ' ', 'g');
  if length(v_name) = 0 or length(v_name) > 200 then v_name := 'Image.png'; end if;
  v_ext := lower(substring(v_name from '\.([A-Za-z0-9]{1,8})$'));
  if v_ext = 'jpeg' then v_ext := 'jpg'; end if;
  if v_ext is null or v_ext not in ('png', 'jpg') then return jsonb_build_object('ok', false, 'reason', 'image_type'); end if;
  if v_size is null or v_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'empty_file'); end if;
  if v_size > dela_int_setting('documents.images.max_mb', 5)::bigint * 1048576 then return jsonb_build_object('ok', false, 'reason', 'image_too_big', 'max_mb', dela_int_setting('documents.images.max_mb', 5)); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || v_org::text, 0));
  v_limit := dela_storage_limit_bytes(v_org);
  v_used := dela_storage_used_bytes(v_org);
  if v_limit is not null and v_used + v_size > v_limit then return jsonb_build_object('ok', false, 'reason', 'storage_full', 'used_bytes', v_used, 'limit_bytes', v_limit); end if;
  insert into files (id, org_id, group_id, version, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at, purpose)
  values (v_id, v_org, v_id, 1, v_name, v_ext, v_size, v_org::text || '/img/' || v_id::text || '.' || v_ext, v_person, 'attorney', v_req, now(), 'doc_image')
  returning * into f;
  perform dela_audit('member', v_person, 'doc_image_upload_started', 'file', f.id::text, jsonb_build_object('ext', v_ext, 'size_bytes', v_size, 'playbook_id', p->>'playbook_id'));
  return jsonb_build_object('ok', true, 'duplicate', false, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status);
end $$;

-- Step two: the upload arrived (the real size is checked again), then the check runs
create or replace function dela_doc_image_uploaded(p_person uuid, p_file uuid, p_size bigint) returns jsonb language plpgsql as $$
declare f files; v_limit bigint; v_used bigint;
begin
  select * into f from files where id = p_file and uploaded_by = p_person and purpose = 'doc_image' for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'uploading' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', f.status, 'storage_path', f.storage_path); end if;
  if p_size is null or p_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || f.org_id::text, 0));
  v_limit := dela_storage_limit_bytes(f.org_id);
  v_used := dela_storage_used_bytes(f.org_id) - f.size_bytes;
  if p_size > dela_int_setting('documents.images.max_mb', 5)::bigint * 1048576 or (v_limit is not null and v_used + p_size > v_limit) then
    update files set status = 'refused', refuse_reason = case when v_limit is not null and v_used + p_size > v_limit then 'storage_full' else 'image_too_big' end, size_bytes = p_size, updated_at = now() where id = f.id;
    return jsonb_build_object('ok', false, 'reason', 'too_big_after_upload', 'storage_path', f.storage_path);
  end if;
  update files set status = 'checking', size_bytes = p_size, updated_at = now() where id = f.id;
  perform dela_job_enqueue('doc_image_check', jsonb_build_object('file_id', f.id), now() + interval '2 minutes', 'docimgcheck:' || f.id::text, p_person);
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', 'checking', 'storage_path', f.storage_path);
end $$;

-- Step three: the check result (same inputs as dela_file_checked). A hold after the image was confirmed takes the confirmation away.
create or replace function dela_doc_image_checked(p_file uuid, p jsonb) returns jsonb language plpgsql as $$
declare f files; v_status text; di doc_images;
begin
  select * into f from files where id = p_file and purpose = 'doc_image' for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'checking' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', f.status); end if;
  if not coalesce((p->>'ok')::boolean, false) then
    update files set status = 'refused', refuse_reason = left(coalesce(p->>'reason', 'wrong_type'), 40), updated_at = now() where id = f.id;
    perform dela_audit('worker', f.uploaded_by, 'doc_image_refused', 'file', f.id::text, jsonb_build_object('reason', p->>'reason'));
    return jsonb_build_object('ok', true, 'status', 'refused', 'storage_path', f.storage_path);
  end if;
  v_status := case when coalesce((p->>'flagged')::boolean, false) then 'held' else 'ready' end;
  update files set status = v_status, is_current = true, mime = left(coalesce(p->>'mime', ''), 100), sha256 = left(coalesce(p->>'sha256', ''), 64),
    check_state = case when v_status = 'held' then 'flagged' else 'clear' end, check_reasons = coalesce(p->'reasons', '[]'), updated_at = now()
  where id = f.id;
  perform dela_audit('worker', f.uploaded_by, case when v_status = 'held' then 'doc_image_held' else 'doc_image_ready' end, 'file', f.id::text, jsonb_build_object('reasons', coalesce(p->'reasons', '[]')));
  select * into di from doc_images where file_id = f.id;
  if di.id is not null and v_status = 'held' then
    update doc_images set confirmed_at = null, confirmed_by = null where id = di.id;
    perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', 'attorney', 'kind', 'document', 'title', 'Please check an image',
      'body', 'DELA''s check thinks an image in a document may show client information. Open the document, blur it or replace it, or confirm it shows none. Until then the document cannot be exported, approved or posted as a gig.',
      'link', '/dela?tab=library' || case when di.playbook_id is not null then '&pb=' || di.playbook_id::text else '' end, 'dedupe_key', 'docimgheld:' || di.id));
  end if;
  return jsonb_build_object('ok', true, 'status', v_status, 'image_id', di.id);
end $$;

-- Step four: save the image record. p: person_id, playbook_id, file_id, caption, confirmed, flags_found, flags_blurred, width, height, request_id
create or replace function dela_doc_image_save(p jsonb) returns jsonb language plpgsql as $$
declare v_person uuid := (p->>'person_id')::uuid; e jsonb; f files; di doc_images; v_cap text := btrim(coalesce(p->>'caption', ''));
begin
  e := dela_doc_image_editor(v_person, (p->>'playbook_id')::uuid);
  if not (e->>'ok')::boolean then return e; end if;
  select * into f from files where id = (p->>'file_id')::uuid and uploaded_by = v_person and purpose = 'doc_image' and org_id = (e->>'org_id')::uuid;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into di from doc_images where file_id = f.id;
  if di.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', di.id, 'held', f.status = 'held', 'confirmed', di.confirmed_at is not null); end if;
  if f.status = 'refused' then return jsonb_build_object('ok', false, 'reason', 'image_refused', 'why', f.refuse_reason); end if;
  if f.status not in ('ready', 'held', 'checking') then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  if v_cap = '' then return jsonb_build_object('ok', false, 'reason', 'caption_needed'); end if;
  if length(v_cap) > dela_int_setting('documents.images.caption_max', 120) then return jsonb_build_object('ok', false, 'reason', 'caption_too_long', 'max', dela_int_setting('documents.images.caption_max', 120)); end if;
  if coalesce((p->>'confirmed')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'confirm_needed'); end if;
  insert into doc_images (org_id, playbook_id, file_id, source, caption, width, height, flags_found, flags_blurred, confirmed_by, confirmed_at, created_by, request_id)
  values (f.org_id, (p->>'playbook_id')::uuid, f.id, 'upload', v_cap, greatest(coalesce((p->>'width')::int, 0), 0), greatest(coalesce((p->>'height')::int, 0), 0),
    greatest(coalesce((p->>'flags_found')::int, 0), 0), greatest(coalesce((p->>'flags_blurred')::int, 0), 0),
    case when f.status = 'held' then null else v_person end, case when f.status = 'held' then null else now() end, v_person, 'img:' || f.id::text)
  returning * into di;
  perform dela_audit('member', v_person, 'doc_image_saved', 'doc_image', di.id::text, jsonb_build_object('playbook_id', p->>'playbook_id', 'flags_found', di.flags_found, 'flags_blurred', di.flags_blurred, 'held', f.status = 'held'));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', di.id, 'held', f.status = 'held', 'reasons', f.check_reasons, 'confirmed', di.confirmed_at is not null);
end $$;

-- Confirm an image again: after DELA's check held it, or an older imported image. Editors only, and it is recorded.
create or replace function dela_doc_image_confirm(p_person uuid, p_image uuid) returns jsonb language plpgsql as $$
declare di doc_images; v_role text;
begin
  select * into di from doc_images where id = p_image for update;
  if di.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_role := dela_pb_role(p_person, di.org_id);
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(v_role) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  if (select status from files where id = di.file_id) not in ('ready', 'held') then return jsonb_build_object('ok', false, 'reason', 'not_ready'); end if;
  update files set status = 'ready', check_state = case when check_state = 'flagged' then 'confirmed' else check_state end, confirmed_by = p_person, confirmed_at = now(), updated_at = now() where id = di.file_id;
  update doc_images set confirmed_by = p_person, confirmed_at = now() where id = di.id;
  perform dela_audit('member', p_person, 'doc_image_confirmed', 'doc_image', di.id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;

-- An older screenshot (Scribe or recorder import, one per step) becomes an image record once. It was confirmed at import.
create or replace function dela_doc_image_legacy(p_file uuid, p_org uuid) returns jsonb language plpgsql as $$
declare f files; di doc_images;
begin
  select * into di from doc_images where file_id = p_file;
  if di.id is not null then return jsonb_build_object('ok', di.org_id = p_org, 'id', di.id); end if;
  select * into f from files where id = p_file and org_id = p_org and ext in ('png', 'jpg');
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into doc_images (org_id, file_id, source, caption, confirmed_by, confirmed_at, created_by, request_id)
  values (f.org_id, f.id, 'import', '', case when f.status = 'ready' then coalesce(f.confirmed_by, f.uploaded_by) end,
    case when f.status = 'ready' then coalesce(f.confirmed_at, f.created_at) end, f.uploaded_by, 'legacy:' || f.id::text)
  on conflict (file_id) do nothing returning * into di;
  if di.id is null then select * into di from doc_images where file_id = p_file; end if;
  return jsonb_build_object('ok', true, 'id', di.id);
end $$;

-- What the checks need to know about the images a document uses (only images of that firm count)
create or replace function dela_doc_images_facts(p_ids uuid[], p_org uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(di.id, jsonb_build_object('confirmed', di.confirmed_at is not null and f.status = 'ready', 'held', f.status = 'held', 'status', f.status,
      'source', di.source, 'caption', di.caption, 'created_at', di.created_at, 'width', di.width, 'height', di.height, 'ext', f.ext, 'path', f.storage_path,
      'current_at', (select max(c.at) from doc_image_checks c where c.image_id = di.id))), '{}')
  from doc_images di join files f on f.id = di.file_id
  where di.id = any(p_ids) and di.org_id = p_org and f.status in ('ready', 'held', 'checking')
$$;

-- Opening one image. Readers of the firm's library see it (held ones too, so the uploader can fix them). A freelancer sees it
-- only on a gig whose document version uses it, while invited to an open gig or hired with the engagement not yet ended.
create or replace function dela_doc_image_open(p_person uuid, p_side text, p_image uuid, p_gig uuid) returns jsonb language plpgsql as $$
declare di doc_images; f files; g gigs; v_ok boolean := false; v_access text;
begin
  select * into di from doc_images where id = p_image;
  if di.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into f from files where id = di.file_id;
  if f.status not in ('ready', 'held') then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_side = 'attorney' and dela_pb_role(p_person, di.org_id) is not null then v_ok := true; end if;
  if not v_ok and p_gig is not null then
    select * into g from gigs where id = p_gig and org_id = di.org_id;
    if g.id is not null and f.status = 'ready' and exists (select 1 from playbook_versions v where v.playbook_id = g.playbook_id and v.version = g.playbook_version and v.body::text like '%' || di.id::text || '%') then
      if p_side = 'attorney' and dela_gig_manager(p_person, g.id) then v_ok := true;
      elsif p_side = 'freelancer' then
        v_access := dela_gig_access(p_person, g.id);
        if v_access = 'invited' and g.status = 'open' then v_ok := true; end if;
        if v_access = 'hired' and exists (select 1 from agreements a where a.gig_id = g.id and a.freelancer_person = p_person and a.status not in ('completed', 'canceled')) then v_ok := true; end if;
        if not v_ok and v_access in ('invited', 'hired') then return jsonb_build_object('ok', false, 'reason', 'image_closed'); end if;
      end if;
    end if;
  end if;
  if not v_ok then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_side = 'freelancer' then perform dela_audit('member', p_person, 'doc_image_viewed', 'doc_image', di.id::text, jsonb_build_object('gig_id', p_gig)); end if;
  return jsonb_build_object('ok', true, 'path', f.storage_path, 'ext', f.ext, 'minutes', dela_int_setting('files.link_minutes', 5));
end $$;

-- "Still current" at review time
create or replace function dela_doc_image_current(p_person uuid, p_playbook uuid, p_image uuid) returns jsonb language plpgsql as $$
declare pb playbooks; di doc_images;
begin
  select * into pb from playbooks where id = p_playbook;
  if pb.id is null or dela_pb_role(p_person, pb.org_id) is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_pb_rank(dela_pb_role(p_person, pb.org_id)) < 3 then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end if;
  select * into di from doc_images where id = p_image and org_id = pb.org_id;
  if di.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if exists (select 1 from doc_image_checks where image_id = di.id and playbook_id = pb.id and at::date = current_date) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  insert into doc_image_checks (image_id, playbook_id, person_id) values (di.id, pb.id, p_person);
  perform dela_audit('member', p_person, 'doc_image_still_current', 'doc_image', di.id::text, jsonb_build_object('playbook_id', pb.id));
  return jsonb_build_object('ok', true);
end $$;

-- At a due review, which images still need "Still current" (or a replacement) before the document can be approved again
create or replace function dela_doc_images_due(p_playbook uuid, p_ids uuid[]) returns jsonb language plpgsql stable as $$
declare pb playbooks; v_cut timestamptz;
begin
  select * into pb from playbooks where id = p_playbook;
  if pb.id is null or pb.approved_version is null or pb.next_review_at is null or pb.next_review_at > current_date then return jsonb_build_object('due', false, 'ids', '[]'::jsonb); end if;
  v_cut := coalesce(pb.last_reviewed_at::timestamptz, pb.updated_at);
  return jsonb_build_object('due', true, 'ids', coalesce((select jsonb_agg(di.id) from doc_images di where di.id = any(p_ids) and di.org_id = pb.org_id and di.created_at <= v_cut
    and not exists (select 1 from doc_image_checks c where c.image_id = di.id and c.playbook_id = pb.id and c.at > v_cut)), '[]'::jsonb));
end $$;

-- The documents (current or approved version) that use an image, so their checks can be worked out again
create or replace function dela_doc_image_documents(p_image uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(distinct p.id), '[]') from doc_images di join playbooks p on p.org_id = di.org_id
  join playbook_versions v on v.playbook_id = p.id and v.version in (p.current_version, coalesce(p.approved_version, p.current_version))
  where di.id = p_image and p.status not in ('deleted') and v.body::text like '%' || di.id::text || '%'
$$;

-- What a recheck needs: the current and approved bodies and the firm owner
create or replace function dela_doc_for_recheck(p_id uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', p.id, 'org_id', p.org_id, 'owner', o.owner_person_id, 'current_version', p.current_version, 'approved_version', p.approved_version,
    'current', (select body from playbook_versions where playbook_id = p.id and version = p.current_version),
    'approved', (select body from playbook_versions where playbook_id = p.id and version = p.approved_version))
  from playbooks p join organizations o on o.id = p.org_id where p.id = p_id
$$;

-- A check result worked out again (an image confirmed or held after the save)
create or replace function dela_doc_recheck(p_id uuid, p_version int, p_blocking int, p_attention int) returns void language plpgsql as $$
begin
  insert into doc_version_checks (playbook_id, version, blocking, attention) values (p_id, p_version, p_blocking, p_attention)
  on conflict (playbook_id, version) do update set blocking = excluded.blocking, attention = excluded.attention;
  update playbooks set blocking = p_blocking, attention = p_attention where id = p_id and current_version = p_version;
end $$;

-- The image record of a file (the worker rechecks the documents that use it)
create or replace function dela_doc_image_by_file(p_file uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', id, 'org_id', org_id) from doc_images where file_id = p_file
$$;

-- The firm a document belongs to (for the image checks, which only count that firm's images)
create or replace function dela_pb_org(p_id uuid) returns uuid language sql stable as $$
  select org_id from playbooks where id = p_id
$$;

-- The image count of a document version (steps and sections, each image once)
create or replace function dela_doc_image_count(p_body jsonb) returns int language sql immutable as $$
  select count(distinct id)::int from (
    select im->>'id' as id from jsonb_array_elements(case when jsonb_typeof(p_body->'steps') = 'array' then p_body->'steps' else '[]' end) st,
      jsonb_array_elements(case when jsonb_typeof(st->'images') = 'array' then st->'images' else '[]' end) im
    union all
    select im->>'id' from jsonb_each(case when jsonb_typeof(p_body->'section_images') = 'object' then p_body->'section_images' else '{}' end) s,
      jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]' end) im) x
$$;

-- The Projects tab lists only SOPs and Workflows (and older playbooks), with the image count of the approved version for the warning
create or replace function dela_gigs_mine(p_person uuid) returns jsonb language plpgsql as $$
declare due record;
begin
  for due in select id from gigs where status in ('open', 'paused') and closes_at <= now() and dela_firm_role(p_person, org_id) in ('owner', 'manager') loop perform dela_gig_close_if_due(due.id); end loop;
  return jsonb_build_object('ok', true, 'eligibility', dela_attorney_eligibility(p_person),
    'allowance', (select e from jsonb_array_elements(dela_entitlements(p_person, 'attorney')) e where e->>'key' = 'att.gigs_active'),
    'min_budget_cents', dela_int_setting('gig.min_budget_cents', 25000),
    'gigs', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'status', g.status, 'budget_min_cents', g.budget_min_cents, 'budget_max_cents', g.budget_max_cents,
        'deadline', g.deadline, 'closes_at', g.closes_at, 'closed_at', g.closed_at, 'paused_by_team', g.paused_by_team,
        'proposals', (select count(*) from proposals p where p.gig_id = g.id and p.status in ('sent', 'selected', 'not_selected')),
        'questions_open', (select count(*) from gig_questions q where q.gig_id = g.id and q.status = 'open')) order by g.created_at desc), '[]')
      from gigs g where dela_firm_role(p_person, g.org_id) in ('owner', 'manager') and g.status <> 'canceled'),
    'playbooks', (select coalesce(jsonb_agg(jsonb_build_object('id', pb.id, 'title', pb.title, 'practice_area', pb.practice_area, 'doc_type', pb.doc_type, 'doc_id', pb.doc_id,
        'images', coalesce((select dela_doc_image_count(v.body) from playbook_versions v where v.playbook_id = pb.id and v.version = pb.approved_version), 0)) order by pb.title), '[]')
      from playbooks pb where pb.status = 'approved' and coalesce(pb.doc_type, '') not in ('policy', 'playbook') and dela_firm_role(p_person, pb.org_id) in ('owner', 'manager')));
end $$;

-- The Lawfecta Team's documents view, with image counts (never the images)
create or replace function dela_admin_documents(p_actor uuid) returns jsonb language plpgsql stable as $$
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support']);
  return jsonb_build_object('switches', (select jsonb_object_agg(key, state) from feature_switches where key in ('document_standard', 'document_conversion', 'document_images')),
    'by_type', (select coalesce(jsonb_object_agg(coalesce(doc_type, 'not converted'), c), '{}') from (select doc_type, count(*) c from playbooks where status not in ('deleted') group by doc_type) x),
    'converted', (select count(*) from playbooks where converted_at is not null), 'waiting', (select count(*) from playbooks where doc_type is null and status not in ('deleted')),
    'not_checked_by_owner', (select count(*) from playbooks where converted_at is not null and conversion_seen_at is null),
    'blocked', (select count(*) from playbooks where doc_type is not null and blocking > 0 and status not in ('deleted', 'trash')),
    'images', jsonb_build_object('total', (select count(*) from doc_images di join files f on f.id = di.file_id where f.status in ('ready', 'held')),
      'held', (select count(*) from doc_images di join files f on f.id = di.file_id where f.status = 'held'),
      'not_confirmed', (select count(*) from doc_images di join files f on f.id = di.file_id where f.status in ('ready', 'held') and di.confirmed_at is null),
      'flags_found', (select coalesce(sum(flags_found), 0) from doc_images), 'flags_blurred', (select coalesce(sum(flags_blurred), 0) from doc_images)),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'doc_id', p.doc_id, 'title', p.title, 'doc_type', p.doc_type, 'note', p.conversion_note, 'firm', o.name, 'at', p.converted_at) order by p.converted_at desc), '[]')
      from (select * from playbooks where converted_at is not null order by converted_at desc limit 30) p join organizations o on o.id = p.org_id));
end $$;

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
