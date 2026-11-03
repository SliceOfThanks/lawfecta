-- Step 2a: own AI keys (BYOK), the AI chat with talking, and document uploads for attorneys.
-- Brief: docs/briefs/step-2a-ai-keys-voice-files.md. Stacey 2026-11-03: build with the suggested answers.
-- Additive only. Keys are encrypted by the api before they reach the database; only the api can read them.

-- ---------- Settings (Stacey's answers to the brief questions, and the new numbers) ----------

insert into settings (key, value, label, section, unit, status, source, note) values
  ('files.max_mb_per_file', '25', 'Largest file a member can upload', 'Files and AI', 'MB', 'C', 'Stacey 2026-11-03 (Step 2a brief)', ''),
  ('files.allowed_types', '["pdf","docx","txt","md","png","jpg"]', 'File types members can upload', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 6)', 'Excel and PowerPoint later.'),
  ('files.trash_days', '30', 'Days a deleted file stays in the trash', 'Files and AI', 'days', 'C', 'Stacey 2026-11-03 (Step 2a brief)', ''),
  ('files.upload_minutes', '60', 'Minutes an unfinished upload is kept before it is cleared', 'Files and AI', 'minutes', 'R', 'Claude', ''),
  ('files.link_minutes', '5', 'Minutes a file link works', 'Files and AI', 'minutes', 'R', 'Claude', 'Links only work for people with access, and stop working after this.'),
  ('files.tick_every_upload', 'true', 'Ask for the no client information tick box on every upload', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 8)', ''),
  ('files.flagged', '"hold"', 'A file that looks like it has client information', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 9)', 'hold: kept for the member to confirm or remove; the AI does not use it until then.'),
  ('voice.max_seconds', '120', 'Longest single recording when talking to the AI', 'Files and AI', 'seconds', 'C', 'Stacey 2026-11-03 (Step 2a brief)', ''),
  ('voice.read_aloud', 'false', 'The AI reads its answers aloud', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 3)', 'Microphone to text only at launch.'),
  ('ai.byok_failure_reminder_days', '3', 'Days a key keeps failing before the member gets a reminder', 'Files and AI', 'days', 'C', 'Stacey 2026-11-03 (Step 2a brief)', ''),
  ('ai.firm_keys', '"business_owner"', 'Who can add one AI key for the whole firm or agency', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 1)', 'The owner on a Business plan. Each person can still add their own, which they use first.'),
  ('ai.byok_backup_credits', 'true', 'Members on their own key keep their included credits as a backup', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 2)', 'Used only when the member clicks Use Lawfecta credits this time.'),
  ('ai.voice_on_claude_keys', '"lawfecta_speech_to_text"', 'Talking for members on a Claude key', 'Files and AI', '', 'C', 'Stacey 2026-11-03 (Step 2a question 4)', 'Claude does not turn speech into text, so Lawfecta''s speech to text is used and counts against included credits.'),
  ('ai.model.openai', '"gpt-5.4-mini"', 'OpenAI model used for chat', 'Files and AI', '', 'O', 'Claude', 'If the provider does not offer this model, DELA picks the newest mini model the key can use.'),
  ('ai.model.anthropic', '"claude-opus-5-5"', 'Claude model used for chat', 'Files and AI', '', 'R', 'Claude', ''),
  ('ai.model.transcribe', '"gpt-transcribe"', 'OpenAI model that turns speech into text', 'Files and AI', '', 'O', 'Claude', 'If the provider does not offer this model, DELA picks another speech to text model the key can use.'),
  ('ai.credits.chat', '1', 'Credits for one AI answer', 'Files and AI', 'credits', 'O', 'Claude', 'Only on Lawfecta''s key.'),
  ('ai.credits.file', '2', 'Credits for one AI answer that reads files', 'Files and AI', 'credits', 'O', 'Claude', 'Only on Lawfecta''s key.'),
  ('ai.credits.voice', '1', 'Credits for turning one recording into text', 'Files and AI', 'credits', 'O', 'Claude', 'Only on Lawfecta''s speech to text.'),
  ('ai.file_context_chars', '60000', 'Most characters of file text the AI reads for one answer', 'Files and AI', 'characters', 'R', 'Claude', 'Longer files are cut, and the member is told.'),
  ('ai.chat_history', '20', 'Earlier messages the AI sees in a chat', 'Files and AI', 'messages', 'R', 'Claude', '')
on conflict (key) do nothing;

-- Question 7: storage per plan approved as suggested
update features set status = 'C', source = 'Stacey 2026-11-03 (Step 2a question 7)' where key = 'storage.mb' and status <> 'C';

insert into decision_log (decision_id, status, owner, approved_at, version, value, note)
select key, status, 'Stacey', now(), '2a', value, 'Step 2a brief, built with the suggested answers (Stacey 2026-11-03)'
from settings where section = 'Files and AI' and status = 'C'
  and not exists (select 1 from decision_log d where d.decision_id = settings.key and d.version = '2a');
insert into decision_log (decision_id, status, owner, approved_at, version, value, note)
select 'storage.mb', 'C', 'Stacey', now(), '2a', '{"free":250,"plus":1000,"pro":5000,"business":20000}', 'Step 2a question 7, suggested storage approved'
where not exists (select 1 from decision_log where decision_id = 'storage.mb' and version = '2a');

insert into feature_switches (key, label, gate) values
  ('byok', 'Members add their own AI key', 'Step 2a tested, AI_KEY_ENCRYPTION_SECRET set'),
  ('voice_input', 'Talk to the AI (microphone)', 'Step 2a tested'),
  ('file_uploads', 'Attorney file uploads', 'Step 2a tested')
on conflict (key) do nothing;
update feature_switches set gate = 'Step 2a tested, Lawfecta OpenAI key set' where key = 'ai_generation' and gate = 'Step 2';

-- ---------- Tables ----------

-- A member's own key, or one key for a whole firm or agency. ciphertext is AES-GCM made by the api with
-- AI_KEY_ENCRYPTION_SECRET and bound to the row id, so the database alone can never read a key.
create table ai_keys (
  id uuid primary key,
  scope text not null check (scope in ('person', 'org')),
  person_id uuid references people(id),
  side text check (side in ('attorney', 'freelancer')),
  org_id uuid references organizations(id),
  provider text not null check (provider in ('openai', 'anthropic')),
  ciphertext text not null,
  last4 text not null check (length(last4) = 4),
  use_for text not null default 'all' check (use_for in ('all', 'chat')),
  status text not null default 'active' check (status in ('active', 'failed', 'removed')),
  last_error text not null default '',
  failed_since timestamptz,
  reminded_at timestamptz,
  last_tested_at timestamptz not null default now(),
  added_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references people(id),
  check ((scope = 'person' and person_id is not null and side is not null) or (scope = 'org' and org_id is not null))
);
create unique index ai_keys_one_person on ai_keys (person_id, side) where scope = 'person' and status <> 'removed';
create unique index ai_keys_one_org on ai_keys (org_id) where scope = 'org' and status <> 'removed';

-- Lawfecta's AI or the member's own key, per side
create table ai_prefs (
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  mode text not null default 'lawfecta' check (mode in ('lawfecta', 'own_key')),
  updated_at timestamptz not null default now(),
  primary key (person_id, side)
);

-- Every AI call, append-only. Never holds what was said.
create table ai_usage (
  id bigserial primary key,
  at timestamptz not null default now(),
  person_id uuid not null references people(id),
  side text not null,
  task text not null check (task in ('chat', 'file', 'voice', 'key_test', 'client_check')),
  source text not null check (source in ('lawfecta', 'own_key', 'firm_key')),
  key_id uuid,
  provider text not null default '',
  model text not null default '',
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  audio_seconds int not null default 0 check (audio_seconds >= 0),
  credits int not null default 0 check (credits >= 0),
  ok boolean not null,
  error text not null default ''
);
create index ai_usage_person on ai_usage (person_id, side, at desc);
create trigger ai_usage_append_only before update or delete on ai_usage for each row execute function dela_no_change();

create table ai_chats (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id),
  side text not null check (side in ('attorney', 'freelancer')),
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index ai_chats_person on ai_chats (person_id, side, updated_at desc);

create table ai_messages (
  id bigserial primary key,
  chat_id uuid not null references ai_chats(id),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  file_ids uuid[] not null default '{}',
  request_id text,
  source text not null default '',
  provider text not null default '',
  model text not null default '',
  created_at timestamptz not null default now(),
  unique (chat_id, request_id, role)
);
create index ai_messages_chat on ai_messages (chat_id, id);

create table file_folders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null check (length(name) between 1 and 80),
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index file_folders_name on file_folders (org_id, lower(name)) where deleted_at is null;

-- One row per uploaded version. Files belong to the firm (organization), not to the person who uploaded them.
create table files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  group_id uuid not null,
  version int not null default 1 check (version >= 1),
  is_current boolean not null default false,
  folder_id uuid references file_folders(id),
  name text not null check (length(name) between 1 and 200),
  ext text not null,
  mime text not null default '',
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null default '',
  storage_path text not null unique,
  status text not null default 'uploading' check (status in ('uploading', 'checking', 'ready', 'held', 'refused', 'trash', 'deleted')),
  refuse_reason text not null default '',
  check_state text not null default 'pending' check (check_state in ('pending', 'clear', 'flagged', 'confirmed')),
  check_reasons jsonb not null default '[]',
  text_chars int not null default 0,
  uploaded_by uuid not null references people(id),
  side text not null,
  request_id text not null,
  no_client_info_ticked_at timestamptz not null,
  confirmed_by uuid references people(id),
  confirmed_at timestamptz,
  trashed_by uuid references people(id),
  trashed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, request_id),
  unique (group_id, version)
);
create index files_org on files (org_id, status);

-- Text DELA read from a file, for the AI. Removed with the file.
create table file_texts (
  file_id uuid primary key references files(id),
  body text not null
);

do $$
declare t text;
begin
  foreach t in array array['ai_keys', 'ai_prefs', 'ai_usage', 'ai_chats', 'ai_messages', 'file_folders', 'files', 'file_texts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- Private storage bucket for member files (Supabase only; the local test database has no storage schema).
-- Its size ceiling follows files.max_mb_per_file; the api checks the setting again on every upload.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $b$insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      select 'dela-files', 'dela-files', false, (select (value #>> '{}')::bigint * 1048576 from settings where key = 'files.max_mb_per_file'),
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'application/octet-stream']
      on conflict (id) do nothing$b$;
  end if;
end $$;

-- ---------- AI: keys, choice, routing ----------

create or replace function dela_int_setting(p_key text, p_default int) returns int language sql stable as $$
  select coalesce((select (value #>> '{}')::int from settings where key = p_key and jsonb_typeof(value) = 'number'), p_default)
$$;

-- The tier of a side's plan right now (trial included)
create or replace function dela_side_tier(p_person uuid, p_side text) returns text language sql stable as $$
  select pl.tier from plan_versions v join plans pl on pl.code = v.plan_code where v.id = dela_effective_version(p_person, p_side)
$$;

create or replace function dela_side_org(p_person uuid, p_side text) returns uuid language sql stable as $$
  select org_id from side_profiles where person_id = p_person and side = p_side and status <> 'closed'
$$;

-- May this person add or remove the firm key for this side's organization?
create or replace function dela_may_manage_firm_key(p_person uuid, p_side text) returns boolean language sql stable as $$
  select dela_setting_text('ai.firm_keys', 'business_owner') = 'business_owner'
    and dela_side_tier(p_person, p_side) = 'business'
    and exists (select 1 from org_members m where m.org_id = dela_side_org(p_person, p_side) and m.person_id = p_person and m.status = 'active' and m.member_role = 'owner')
$$;

-- The firm key this person can use on this side: from any firm they are an active member of
create or replace function dela_firm_key_for(p_person uuid, p_side text) returns ai_keys language sql stable as $$
  select k.* from ai_keys k join org_members m on m.org_id = k.org_id and m.person_id = p_person and m.status = 'active'
  join organizations o on o.id = k.org_id and o.status = 'active'
  where k.scope = 'org' and k.status <> 'removed'
    and o.kind = case p_side when 'attorney' then 'attorney_personal' else 'freelancer_personal' end
  order by (k.org_id = dela_side_org(p_person, p_side)) desc, k.created_at limit 1
$$;

-- What the AI settings screen shows. Never the key, only the provider and its last 4 characters.
create or replace function dela_ai_state(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare own ai_keys; firm ai_keys; v_mode text; v_month date := dela_period_start('month');
begin
  select * into own from ai_keys where scope = 'person' and person_id = p_person and side = p_side and status <> 'removed';
  firm := dela_firm_key_for(p_person, p_side);
  select mode into v_mode from ai_prefs where person_id = p_person and side = p_side;
  return jsonb_build_object(
    'mode', coalesce(v_mode, 'lawfecta'),
    'byok_on', dela_switch_on('byok', p_person),
    'ai_on', dela_switch_on('ai_generation', p_person),
    'voice_on', dela_switch_on('voice_input', p_person),
    'providers', dela_setting('ai.byok_providers'),
    'own_key', case when own.id is null then null else jsonb_build_object('id', own.id, 'provider', own.provider, 'last4', own.last4, 'status', own.status,
        'use_for', own.use_for, 'last_error', own.last_error, 'failed_since', own.failed_since, 'last_tested_at', own.last_tested_at, 'added_at', own.created_at) end,
    'firm_key', case when firm.id is null then null else jsonb_build_object('id', firm.id, 'provider', firm.provider, 'last4', firm.last4, 'status', firm.status,
        'use_for', firm.use_for, 'last_error', firm.last_error, 'mine', firm.org_id = dela_side_org(p_person, p_side) and dela_may_manage_firm_key(p_person, p_side)) end,
    'may_manage_firm_key', dela_may_manage_firm_key(p_person, p_side),
    'backup_credits', coalesce((dela_setting('ai.byok_backup_credits') #>> '{}')::boolean, true),
    'voice_max_seconds', dela_int_setting('voice.max_seconds', 120),
    'credits', (select e from jsonb_array_elements(dela_entitlements(p_person, p_side)) e where e->>'key' = 'ai.runs'),
    'usage', (select jsonb_build_object(
        'own_tasks', count(*) filter (where source in ('own_key', 'firm_key') and ok and task <> 'key_test'),
        'own_input_tokens', coalesce(sum(input_tokens) filter (where source in ('own_key', 'firm_key')), 0),
        'own_output_tokens', coalesce(sum(output_tokens) filter (where source in ('own_key', 'firm_key')), 0),
        'lawfecta_tasks', count(*) filter (where source = 'lawfecta' and ok and task <> 'client_check'),
        'lawfecta_credits', coalesce(sum(credits) filter (where source = 'lawfecta'), 0),
        'failed', count(*) filter (where not ok))
      from ai_usage where person_id = p_person and side = p_side and at >= (v_month::timestamp at time zone dela_tz()))
  );
end $$;

create or replace function dela_ai_set_mode(p_person uuid, p_side text, p_mode text) returns jsonb language plpgsql as $$
begin
  if p_mode not in ('lawfecta', 'own_key') then return jsonb_build_object('ok', false, 'reason', 'bad_mode'); end if;
  if not exists (select 1 from side_profiles where person_id = p_person and side = p_side and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if p_mode = 'own_key' and not dela_switch_on('byok', p_person) then return jsonb_build_object('ok', false, 'reason', 'byok_off'); end if;
  insert into ai_prefs (person_id, side, mode) values (p_person, p_side, p_mode)
  on conflict (person_id, side) do update set mode = excluded.mode, updated_at = now();
  perform dela_audit('member', p_person, 'ai_mode_set', 'ai_prefs', p_side, jsonb_build_object('mode', p_mode));
  return jsonb_build_object('ok', true);
end $$;

-- Saves a key that the api has already tested and encrypted. Saving again replaces (rotates) the old one.
-- p: id, person_id, side, scope (person or org), provider, ciphertext, last4, use_for
create or replace function dela_ai_key_save(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_side text := p->>'side'; v_scope text := coalesce(p->>'scope', 'person');
  v_org uuid; old ai_keys; v_use text := coalesce(nullif(p->>'use_for', ''), 'all');
begin
  if not dela_switch_on('byok', v_person) then return jsonb_build_object('ok', false, 'reason', 'byok_off'); end if;
  if not exists (select 1 from side_profiles where person_id = v_person and side = v_side and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if not (dela_setting('ai.byok_providers') ? (p->>'provider')) then return jsonb_build_object('ok', false, 'reason', 'bad_provider'); end if;
  if v_use not in ('all', 'chat') then return jsonb_build_object('ok', false, 'reason', 'bad_use_for'); end if;
  if dela_has_hold(v_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if v_scope = 'org' then
    if not dela_may_manage_firm_key(v_person, v_side) then return jsonb_build_object('ok', false, 'reason', 'not_firm_owner'); end if;
    v_org := dela_side_org(v_person, v_side);
    perform pg_advisory_xact_lock(hashtextextended('aikey:org:' || v_org::text, 0));
    select * into old from ai_keys where scope = 'org' and org_id = v_org and status <> 'removed';
  elsif v_scope = 'person' then
    perform pg_advisory_xact_lock(hashtextextended('aikey:' || v_person::text || ':' || v_side, 0));
    select * into old from ai_keys where scope = 'person' and person_id = v_person and side = v_side and status <> 'removed';
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_scope');
  end if;
  -- The same save sent twice (two clicks) is one key
  if exists (select 1 from ai_keys where id = (p->>'id')::uuid) then return jsonb_build_object('ok', true, 'duplicate', true, 'id', p->>'id'); end if;
  if old.id is not null then
    update ai_keys set status = 'removed', removed_at = now(), removed_by = v_person where id = old.id;
    perform dela_ai_cancel_key_jobs(old.id);
  end if;
  insert into ai_keys (id, scope, person_id, side, org_id, provider, ciphertext, last4, use_for, added_by)
  values ((p->>'id')::uuid, v_scope, case when v_scope = 'person' then v_person end, case when v_scope = 'person' then v_side end, v_org,
          p->>'provider', p->>'ciphertext', p->>'last4', v_use, v_person);
  if v_scope = 'person' then
    insert into ai_prefs (person_id, side, mode) values (v_person, v_side, 'own_key')
    on conflict (person_id, side) do update set mode = 'own_key', updated_at = now();
  end if;
  perform dela_audit('member', v_person, case when old.id is null then 'ai_key_added' else 'ai_key_replaced' end, 'ai_key', (p->>'id'),
    jsonb_build_object('scope', v_scope, 'side', v_side, 'provider', p->>'provider', 'replaced', old.id));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', p->>'id', 'replaced', old.id is not null);
end $$;

-- AI jobs carry the key they will use (payload ai_key_id). Removing or replacing a key stops them.
create or replace function dela_ai_cancel_key_jobs(p_key uuid) returns int language sql as $$
  with c as (
    update jobs set status = 'canceled', finished_at = now(), updated_at = now(), last_error = 'ai_key_removed'
    where payload->>'ai_key_id' = p_key::text and status in ('queued', 'delayed', 'waiting_approval') returning person_id)
  select count(*)::int from c
$$;

create or replace function dela_ai_key_remove(p_person uuid, p_side text, p_scope text) returns jsonb language plpgsql as $$
declare k ai_keys; n int;
begin
  if p_scope = 'org' then
    if not dela_may_manage_firm_key(p_person, p_side) then return jsonb_build_object('ok', false, 'reason', 'not_firm_owner'); end if;
    select * into k from ai_keys where scope = 'org' and org_id = dela_side_org(p_person, p_side) and status <> 'removed' for update;
  else
    select * into k from ai_keys where scope = 'person' and person_id = p_person and side = p_side and status <> 'removed' for update;
  end if;
  if k.id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  update ai_keys set status = 'removed', removed_at = now(), removed_by = p_person, ciphertext = 'removed' where id = k.id;
  n := dela_ai_cancel_key_jobs(k.id);
  if n > 0 then
    perform dela_notify(jsonb_build_object('person_id', p_person, 'side', p_side, 'kind', 'ai_key', 'title', 'AI work stopped',
      'body', n || ' waiting AI task(s) were stopped because the key was removed. Nothing ran on Lawfecta''s key.', 'dedupe_key', 'keyjobs:' || k.id));
  end if;
  if p_scope = 'person' then update ai_prefs set mode = 'lawfecta', updated_at = now() where person_id = p_person and side = p_side; end if;
  perform dela_audit('member', p_person, 'ai_key_removed', 'ai_key', k.id::text, jsonb_build_object('scope', k.scope, 'side', p_side, 'jobs_stopped', n));
  return jsonb_build_object('ok', true, 'jobs_stopped', n);
end $$;

-- The api reads a key only to use it, and only for a member allowed to use it right now
create or replace function dela_ai_key_load(p_person uuid, p_side text, p_scope text) returns jsonb language sql stable as $$
  select case when k.id is null then null else jsonb_build_object('id', k.id, 'provider', k.provider, 'ciphertext', k.ciphertext, 'status', k.status, 'scope', k.scope) end
  from (select * from ai_keys where p_scope = 'person' and scope = 'person' and person_id = p_person and side = p_side and status <> 'removed'
        union all select * from dela_firm_key_for(p_person, p_side) where p_scope = 'org' and id is not null) k
$$;

-- Records how a key did. A failing key keeps its date so the reminder can go out after a few days.
create or replace function dela_ai_key_result(p_key uuid, p_ok boolean, p_error text) returns void language sql as $$
  update ai_keys set
    status = case when p_ok then 'active' else 'failed' end,
    last_error = case when p_ok then '' else left(coalesce(p_error, ''), 60) end,
    failed_since = case when p_ok then null else coalesce(failed_since, now()) end,
    reminded_at = case when p_ok then null else reminded_at end,
    last_tested_at = now()
  where id = p_key and status <> 'removed'
$$;

-- Decides where one AI task runs, at the moment it runs. Never moves to Lawfecta's key on its own:
-- only p_lawfecta_once (the member clicked "Use Lawfecta credits this time") does that.
-- p_task: chat, file or voice.
create or replace function dela_ai_route(p_person uuid, p_side text, p_task text, p_lawfecta_once boolean) returns jsonb language plpgsql stable as $$
declare v_mode text; own ai_keys; firm ai_keys; k ai_keys; v_src text;
begin
  if not exists (select 1 from side_profiles where person_id = p_person and side = p_side and status <> 'closed') then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if dela_paused('ai') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  if not dela_switch_on('ai_generation', p_person) then return jsonb_build_object('ok', false, 'reason', 'ai_off'); end if;
  if p_task = 'voice' and not dela_switch_on('voice_input', p_person) then return jsonb_build_object('ok', false, 'reason', 'voice_off'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  select mode into v_mode from ai_prefs where person_id = p_person and side = p_side;
  if coalesce(v_mode, 'lawfecta') = 'own_key' and dela_switch_on('byok', p_person) and not coalesce(p_lawfecta_once, false) then
    select * into own from ai_keys where scope = 'person' and person_id = p_person and side = p_side and status <> 'removed';
    firm := dela_firm_key_for(p_person, p_side);
    if own.id is not null then k := own; v_src := 'own_key'; elsif firm.id is not null then k := firm; v_src := 'firm_key'; end if;
    if k.id is null then return jsonb_build_object('ok', false, 'reason', 'no_key'); end if;
    -- "Chat and playbooks only": talking uses Lawfecta's speech to text
    if p_task = 'voice' and (k.use_for = 'chat' or k.provider = 'anthropic') then
      return jsonb_build_object('ok', true, 'source', 'lawfecta', 'credits', dela_int_setting('ai.credits.voice', 1),
        'why', case when k.provider = 'anthropic' then 'claude_key_voice' else 'key_chat_only' end);
    end if;
    return jsonb_build_object('ok', true, 'source', v_src, 'key_id', k.id, 'provider', k.provider, 'ciphertext', k.ciphertext, 'key_status', k.status, 'credits', 0);
  end if;
  if coalesce(p_lawfecta_once, false) and coalesce(v_mode, 'lawfecta') = 'own_key'
     and not coalesce((dela_setting('ai.byok_backup_credits') #>> '{}')::boolean, true) then
    return jsonb_build_object('ok', false, 'reason', 'no_backup_credits');
  end if;
  return jsonb_build_object('ok', true, 'source', 'lawfecta', 'credits',
    case p_task when 'voice' then dela_int_setting('ai.credits.voice', 1) when 'file' then dela_int_setting('ai.credits.file', 2) else dela_int_setting('ai.credits.chat', 1) end);
end $$;

-- p: person_id, side, task, source, key_id, provider, model, input_tokens, output_tokens, audio_seconds, credits, ok, error
create or replace function dela_ai_usage_log(p jsonb) returns void language sql as $$
  insert into ai_usage (person_id, side, task, source, key_id, provider, model, input_tokens, output_tokens, audio_seconds, credits, ok, error)
  values ((p->>'person_id')::uuid, p->>'side', p->>'task', p->>'source', nullif(p->>'key_id', '')::uuid, coalesce(p->>'provider', ''), left(coalesce(p->>'model', ''), 80),
          greatest(coalesce((p->>'input_tokens')::int, 0), 0), greatest(coalesce((p->>'output_tokens')::int, 0), 0), greatest(coalesce((p->>'audio_seconds')::int, 0), 0),
          greatest(coalesce((p->>'credits')::int, 0), 0), coalesce((p->>'ok')::boolean, false), left(coalesce(p->>'error', ''), 60))
$$;

-- ---------- AI chat ----------

create or replace function dela_ai_chats(p_person uuid, p_side text) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'updated_at', updated_at) order by updated_at desc), '[]')
  from (select * from ai_chats where person_id = p_person and side = p_side and archived_at is null order by updated_at desc limit 50) c
$$;

create or replace function dela_ai_chat_get(p_person uuid, p_side text, p_chat uuid) returns jsonb language sql stable as $$
  select case when c.id is null then null else jsonb_build_object('id', c.id, 'title', c.title,
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'content', m.content, 'file_ids', m.file_ids, 'source', m.source, 'created_at', m.created_at,
        'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name)), '[]') from files f where f.id = any(m.file_ids))) order by m.id)
      from ai_messages m where m.chat_id = c.id), '[]')) end
  from (select * from ai_chats where id = p_chat and person_id = p_person and side = p_side and archived_at is null) c
$$;

create or replace function dela_ai_chat_archive(p_person uuid, p_side text, p_chat uuid) returns jsonb language sql as $$
  with u as (update ai_chats set archived_at = now() where id = p_chat and person_id = p_person and side = p_side and archived_at is null returning 1)
  select jsonb_build_object('ok', true, 'changed', (select count(*) from u) > 0)
$$;

-- Saves the member's message (once per request_id) and returns what the AI needs: earlier messages and file texts.
-- p: person_id, side, chat_id (empty for a new chat), request_id, content, file_ids
create or replace function dela_ai_chat_prepare(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_side text := p->>'side'; v_chat uuid := nullif(p->>'chat_id', '')::uuid;
  v_req text := left(coalesce(p->>'request_id', ''), 80); v_files uuid[]; v_reply ai_messages; bad int; v_org uuid;
begin
  if v_req = '' or coalesce(p->>'content', '') = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select coalesce(array_agg(x::uuid), '{}') into v_files from jsonb_array_elements_text(coalesce(p->'file_ids', '[]')) x;
  if cardinality(v_files) > 5 then return jsonb_build_object('ok', false, 'reason', 'too_many_files'); end if;
  if v_chat is null then
    -- A new chat made by this request (a retry finds it again)
    select c.id into v_chat from ai_chats c join ai_messages m on m.chat_id = c.id
    where c.person_id = v_person and c.side = v_side and m.request_id = v_req and m.role = 'user';
    if v_chat is null then
      insert into ai_chats (person_id, side, title) values (v_person, v_side, left(regexp_replace(p->>'content', '\s+', ' ', 'g'), 60)) returning id into v_chat;
    end if;
  elsif not exists (select 1 from ai_chats where id = v_chat and person_id = v_person and side = v_side and archived_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  -- Files must belong to a firm the member is in, on this side, and be cleared for the AI
  v_org := dela_side_org(v_person, v_side);
  select count(*) into bad from unnest(v_files) fid
  where not exists (select 1 from files f where f.id = fid and f.status = 'ready' and f.check_state in ('clear', 'confirmed') and dela_file_member(v_person, v_side, f.org_id));
  if bad > 0 then return jsonb_build_object('ok', false, 'reason', 'file_not_usable'); end if;

  select * into v_reply from ai_messages where chat_id = v_chat and request_id = v_req and role = 'assistant';
  if v_reply.id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'chat_id', v_chat, 'reply', jsonb_build_object('id', v_reply.id, 'content', v_reply.content, 'source', v_reply.source));
  end if;
  insert into ai_messages (chat_id, role, content, file_ids, request_id) values (v_chat, 'user', left(p->>'content', 8000), v_files, v_req)
  on conflict (chat_id, request_id, role) do nothing;
  update ai_chats set updated_at = now() where id = v_chat;
  return jsonb_build_object('ok', true, 'duplicate', false, 'chat_id', v_chat,
    'history', (select coalesce(jsonb_agg(jsonb_build_object('role', role, 'content', content) order by id), '[]') from (
       select id, role, content from ai_messages where chat_id = v_chat and not (request_id = v_req and role = 'user')
       order by id desc limit dela_int_setting('ai.chat_history', 20)) h),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'ext', f.ext, 'storage_path', f.storage_path, 'size_bytes', f.size_bytes, 'text', t.body)), '[]')
       from files f left join file_texts t on t.file_id = f.id where f.id = any(v_files)),
    'context_chars', dela_int_setting('ai.file_context_chars', 60000));
end $$;

create or replace function dela_ai_chat_reply(p_chat uuid, p_request text, p_content text, p_source text, p_provider text, p_model text) returns bigint language sql as $$
  with i as (insert into ai_messages (chat_id, role, content, request_id, source, provider, model)
    values (p_chat, 'assistant', p_content, p_request, coalesce(p_source, ''), coalesce(p_provider, ''), left(coalesce(p_model, ''), 80))
    on conflict (chat_id, request_id, role) do nothing returning id),
  u as (update ai_chats set updated_at = now() where id = p_chat)
  select coalesce((select id from i), (select id from ai_messages where chat_id = p_chat and request_id = p_request and role = 'assistant'))
$$;

-- ---------- Files ----------

-- Is this person an active member of this firm, using the side the firm belongs to?
create or replace function dela_file_member(p_person uuid, p_side text, p_org uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from org_members m join organizations o on o.id = m.org_id
    where m.org_id = p_org and m.person_id = p_person and m.status = 'active' and o.status = 'active'
      and o.kind in (case p_side when 'attorney' then 'attorney_personal' else 'freelancer_personal' end, case p_side when 'attorney' then 'firm' else 'agency' end))
$$;

-- The firm's storage allowance comes from its owner's plan on that side
create or replace function dela_storage_limit_bytes(p_org uuid) returns bigint language sql stable as $$
  select case when not coalesce(pf.enabled, false) then 0 when pf.quota_limit is null then null else pf.quota_limit::bigint * 1048576 end
  from organizations o
  left join plan_features pf on pf.feature_key = 'storage.mb'
    and pf.plan_version_id = dela_effective_version(o.owner_person_id, case when o.kind in ('attorney_personal', 'firm') then 'attorney' else 'freelancer' end)
  where o.id = p_org
$$;

-- Everything not yet emptied from the trash counts, including uploads in progress
create or replace function dela_storage_used_bytes(p_org uuid) returns bigint language sql stable as $$
  select coalesce(sum(size_bytes), 0)::bigint from files where org_id = p_org and status in ('uploading', 'checking', 'ready', 'held', 'trash')
$$;

-- Step one of an upload. p: person_id, side, request_id, name, size_bytes, folder_id, replace_of, ticked (bool)
create or replace function dela_file_start(p jsonb) returns jsonb language plpgsql as $$
declare
  v_person uuid := (p->>'person_id')::uuid; v_side text := p->>'side'; v_org uuid; v_req text := left(coalesce(p->>'request_id', ''), 80);
  v_name text := btrim(coalesce(p->>'name', '')); v_ext text; v_size bigint := (p->>'size_bytes')::bigint; v_max bigint;
  v_folder uuid := nullif(p->>'folder_id', '')::uuid; v_replace uuid := nullif(p->>'replace_of', '')::uuid;
  old files; f files; v_limit bigint; v_used bigint; v_group uuid; v_version int := 1; v_id uuid := gen_random_uuid();
begin
  if v_side <> 'attorney' then return jsonb_build_object('ok', false, 'reason', 'attorneys_only'); end if;
  if not dela_switch_on('file_uploads', v_person) then return jsonb_build_object('ok', false, 'reason', 'uploads_off'); end if;
  if dela_paused('external') then return jsonb_build_object('ok', false, 'reason', 'paused'); end if;
  if dela_has_hold(v_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  v_org := dela_side_org(v_person, v_side);
  if v_org is null or not dela_file_member(v_person, v_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if v_req = '' then return jsonb_build_object('ok', false, 'reason', 'bad_request'); end if;
  select * into f from files where org_id = v_org and request_id = v_req;
  if f.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status); end if;
  if coalesce((p->>'ticked')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'tick_needed'); end if;
  v_name := regexp_replace(v_name, '[[:cntrl:]/\\]+', ' ', 'g');
  if length(v_name) = 0 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
  v_ext := lower(substring(v_name from '\.([A-Za-z0-9]{1,8})$'));
  if v_ext = 'jpeg' then v_ext := 'jpg'; elsif v_ext = 'markdown' then v_ext := 'md'; end if;
  if v_ext is null or not (dela_setting('files.allowed_types') ? v_ext) then
    return jsonb_build_object('ok', false, 'reason', 'type_not_allowed', 'allowed', dela_setting('files.allowed_types'));
  end if;
  v_max := dela_int_setting('files.max_mb_per_file', 25)::bigint * 1048576;
  if v_size is null or v_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'empty_file'); end if;
  if v_size > v_max then return jsonb_build_object('ok', false, 'reason', 'file_too_big', 'max_mb', v_max / 1048576); end if;
  if v_folder is not null and not exists (select 1 from file_folders where id = v_folder and org_id = v_org and deleted_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'bad_folder');
  end if;
  if v_replace is not null then
    select * into old from files where id = v_replace and org_id = v_org and is_current and status in ('ready', 'held');
    if old.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    v_group := old.group_id; v_folder := old.folder_id;
    select max(version) + 1 into v_version from files where group_id = old.group_id;
  else
    v_group := v_id;
  end if;
  -- One upload at a time per firm decides who gets the last of the space
  perform pg_advisory_xact_lock(hashtextextended('storage:' || v_org::text, 0));
  v_limit := dela_storage_limit_bytes(v_org);
  v_used := dela_storage_used_bytes(v_org);
  if v_limit is not null and v_used + v_size > v_limit then
    return jsonb_build_object('ok', false, 'reason', 'storage_full', 'used_bytes', v_used, 'limit_bytes', v_limit);
  end if;
  insert into files (id, org_id, group_id, version, folder_id, name, ext, size_bytes, storage_path, uploaded_by, side, request_id, no_client_info_ticked_at)
  values (v_id, v_org, v_group, v_version, v_folder, v_name, v_ext, v_size, v_org::text || '/' || v_id::text || '.' || v_ext, v_person, v_side, v_req, now())
  returning * into f;
  perform dela_audit('member', v_person, 'file_upload_started', 'file', f.id::text, jsonb_build_object('ext', v_ext, 'size_bytes', v_size, 'version', v_version));
  return jsonb_build_object('ok', true, 'duplicate', false, 'file_id', f.id, 'storage_path', f.storage_path, 'status', f.status);
end $$;

-- Step two: the browser says the upload finished; the api passes the size storage actually holds
create or replace function dela_file_uploaded(p_person uuid, p_side text, p_file uuid, p_size bigint) returns jsonb language plpgsql as $$
declare f files; v_limit bigint; v_used bigint;
begin
  select * into f from files where id = p_file and uploaded_by = p_person and side = p_side for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'uploading' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', f.status, 'storage_path', f.storage_path); end if;
  if p_size is null or p_size <= 0 then return jsonb_build_object('ok', false, 'reason', 'not_uploaded'); end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || f.org_id::text, 0));
  v_limit := dela_storage_limit_bytes(f.org_id);
  v_used := dela_storage_used_bytes(f.org_id) - f.size_bytes;
  if p_size > dela_int_setting('files.max_mb_per_file', 25)::bigint * 1048576 or (v_limit is not null and v_used + p_size > v_limit) then
    update files set status = 'refused', refuse_reason = case when v_limit is not null and v_used + p_size > v_limit then 'storage_full' else 'file_too_big' end,
      size_bytes = p_size, updated_at = now() where id = f.id;
    return jsonb_build_object('ok', false, 'reason', 'too_big_after_upload', 'storage_path', f.storage_path);
  end if;
  update files set status = 'checking', size_bytes = p_size, updated_at = now() where id = f.id;
  perform dela_job_enqueue('file_check', jsonb_build_object('file_id', f.id), now() + interval '2 minutes', 'filecheck:' || f.id::text, p_person);
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', 'checking', 'storage_path', f.storage_path, 'ext', f.ext, 'file_id', f.id);
end $$;

-- What the worker needs to check one file
create or replace function dela_file_for_check(p_file uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('id', id, 'status', status, 'ext', ext, 'storage_path', storage_path, 'size_bytes', size_bytes, 'person_id', uploaded_by, 'side', side, 'name', name)
  from files where id = p_file
$$;

-- Step three: the check result. p: ok (real type), mime, sha256, reason, text, flagged, reasons
create or replace function dela_file_checked(p_file uuid, p jsonb) returns jsonb language plpgsql as $$
declare f files; v_status text;
begin
  select * into f from files where id = p_file for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status <> 'checking' then return jsonb_build_object('ok', true, 'duplicate', true, 'status', f.status); end if;
  if not coalesce((p->>'ok')::boolean, false) then
    update files set status = 'refused', refuse_reason = left(coalesce(p->>'reason', 'wrong_type'), 40), updated_at = now() where id = f.id;
    perform dela_audit('worker', f.uploaded_by, 'file_refused', 'file', f.id::text, jsonb_build_object('reason', p->>'reason', 'ext', f.ext));
    perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', f.side, 'kind', 'file', 'title', 'A file was not accepted',
      'body', '"' || f.name || '" is not really a ' || upper(f.ext) || ' file, or it could not be opened, so DELA did not keep it.', 'dedupe_key', 'filerefused:' || f.id));
    return jsonb_build_object('ok', true, 'status', 'refused', 'storage_path', f.storage_path);
  end if;
  v_status := case when coalesce((p->>'flagged')::boolean, false) then 'held' else 'ready' end;
  update files set status = v_status, mime = left(coalesce(p->>'mime', ''), 100), sha256 = left(coalesce(p->>'sha256', ''), 64),
    check_state = case when v_status = 'held' then 'flagged' else 'clear' end, check_reasons = coalesce(p->'reasons', '[]'),
    text_chars = length(coalesce(p->>'text', '')), updated_at = now()
  where id = f.id;
  if coalesce(p->>'text', '') <> '' then
    insert into file_texts (file_id, body) values (f.id, p->>'text') on conflict (file_id) do update set body = excluded.body;
  end if;
  -- A new version becomes the one people see
  update files set is_current = (id = f.id) where group_id = f.group_id and status in ('ready', 'held', 'checking');
  perform dela_audit('worker', f.uploaded_by, case when v_status = 'held' then 'file_held' else 'file_ready' end, 'file', f.id::text,
    jsonb_build_object('reasons', coalesce(p->'reasons', '[]')));
  if v_status = 'held' then
    perform dela_notify(jsonb_build_object('person_id', f.uploaded_by, 'side', f.side, 'kind', 'file', 'title', 'Please check a file',
      'body', '"' || f.name || '" may contain client information. Open Files to confirm it has none, or remove it. The AI will not use it until then.',
      'link', '/dela?tab=files', 'dedupe_key', 'fileheld:' || f.id));
  end if;
  return jsonb_build_object('ok', true, 'status', v_status);
end $$;

create or replace function dela_files_list(p_person uuid, p_side text) returns jsonb language plpgsql stable as $$
declare v_org uuid := dela_side_org(p_person, p_side);
begin
  if v_org is null or not dela_file_member(p_person, p_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  return jsonb_build_object('ok', true,
    'uploads_on', dela_switch_on('file_uploads', p_person),
    'used_bytes', dela_storage_used_bytes(v_org), 'limit_bytes', dela_storage_limit_bytes(v_org),
    'max_mb_per_file', dela_int_setting('files.max_mb_per_file', 25), 'allowed', dela_setting('files.allowed_types'),
    'trash_days', dela_int_setting('files.trash_days', 30),
    'folders', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by lower(name)), '[]') from file_folders where org_id = v_org and deleted_at is null),
    'files', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'group_id', f.group_id, 'name', f.name, 'ext', f.ext, 'size_bytes', f.size_bytes, 'status', f.status,
        'check_state', f.check_state, 'check_reasons', f.check_reasons, 'refuse_reason', f.refuse_reason, 'folder_id', f.folder_id, 'version', f.version,
        'versions', (select count(*) from files v where v.group_id = f.group_id and v.status in ('ready', 'held')), 'has_text', f.text_chars > 0,
        'uploaded_by', p.display_name, 'created_at', f.created_at, 'trashed_at', f.trashed_at) order by f.created_at desc), '[]')
      from files f join people p on p.id = f.uploaded_by
      where f.org_id = v_org and ((f.is_current and f.status in ('ready', 'held')) or f.status in ('checking', 'trash')
        or (f.status = 'refused' and f.updated_at > now() - interval '7 days') or (f.status = 'uploading' and f.uploaded_by = p_person)))
  );
end $$;

create or replace function dela_file_versions(p_person uuid, p_side text, p_file uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'name', v.name, 'size_bytes', v.size_bytes, 'status', v.status,
      'is_current', v.is_current, 'created_at', v.created_at) order by v.version desc), '[]')
  from files f join files v on v.group_id = f.group_id
  where f.id = p_file and dela_file_member(p_person, p_side, f.org_id) and v.status in ('ready', 'held')
$$;

-- A short-lived link is made only for a member of the firm. Held files open for the member to check them.
create or replace function dela_file_open(p_person uuid, p_side text, p_file uuid, p_ip text) returns jsonb language plpgsql as $$
declare f files;
begin
  select * into f from files where id = p_file;
  if f.id is null or not dela_file_member(p_person, p_side, f.org_id) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if f.status not in ('ready', 'held', 'trash') then return jsonb_build_object('ok', false, 'reason', 'not_available'); end if;
  perform dela_audit('member', p_person, 'file_opened', 'file', f.id::text, '{}', p_ip);
  return jsonb_build_object('ok', true, 'storage_path', f.storage_path, 'name', f.name, 'ext', f.ext, 'minutes', dela_int_setting('files.link_minutes', 5));
end $$;

-- Rename, move, trash, restore, confirm (a held file has no client information), folders. p: action and its fields.
create or replace function dela_file_action(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql as $$
declare
  a text := p->>'action'; f files; v_org uuid := dela_side_org(p_person, p_side); v_name text; v_folder uuid; v_id uuid;
begin
  if v_org is null or not dela_file_member(p_person, p_side, v_org) then return jsonb_build_object('ok', false, 'reason', 'no_side'); end if;
  if a in ('folder_new', 'folder_rename', 'folder_delete') then
    v_name := btrim(regexp_replace(coalesce(p->>'name', ''), '[[:cntrl:]]+', ' ', 'g'));
    if a = 'folder_new' then
      if length(v_name) = 0 or length(v_name) > 80 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
      select id into v_id from file_folders where org_id = v_org and lower(name) = lower(v_name) and deleted_at is null;
      if v_id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'folder_id', v_id); end if;
      insert into file_folders (org_id, name, created_by) values (v_org, v_name, p_person) returning id into v_id;
      return jsonb_build_object('ok', true, 'folder_id', v_id);
    end if;
    v_folder := nullif(p->>'folder_id', '')::uuid;
    if not exists (select 1 from file_folders where id = v_folder and org_id = v_org and deleted_at is null) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    if a = 'folder_rename' then
      if length(v_name) = 0 or length(v_name) > 80 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
      if exists (select 1 from file_folders where org_id = v_org and lower(name) = lower(v_name) and deleted_at is null and id <> v_folder) then return jsonb_build_object('ok', false, 'reason', 'name_taken'); end if;
      update file_folders set name = v_name where id = v_folder;
      return jsonb_build_object('ok', true);
    end if;
    if exists (select 1 from files where folder_id = v_folder and status in ('uploading', 'checking', 'ready', 'held', 'trash')) then return jsonb_build_object('ok', false, 'reason', 'folder_not_empty'); end if;
    update file_folders set deleted_at = now() where id = v_folder;
    return jsonb_build_object('ok', true);
  end if;

  select * into f from files where id = (p->>'file_id')::uuid and org_id = v_org for update;
  if f.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if a = 'rename' then
    v_name := btrim(regexp_replace(coalesce(p->>'name', ''), '[[:cntrl:]/\\]+', ' ', 'g'));
    if length(v_name) = 0 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'reason', 'bad_name'); end if;
    -- The type comes from the file itself, so the ending stays
    if lower(v_name) not like '%.' || f.ext then v_name := v_name || '.' || f.ext; end if;
    update files set name = v_name, updated_at = now() where group_id = f.group_id and status <> 'deleted';
  elsif a = 'move' then
    v_folder := nullif(p->>'folder_id', '')::uuid;
    if v_folder is not null and not exists (select 1 from file_folders where id = v_folder and org_id = v_org and deleted_at is null) then return jsonb_build_object('ok', false, 'reason', 'bad_folder'); end if;
    update files set folder_id = v_folder, updated_at = now() where group_id = f.group_id and status <> 'deleted';
  elsif a = 'trash' then
    if f.status = 'trash' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    if f.status not in ('ready', 'held', 'refused') then return jsonb_build_object('ok', false, 'reason', 'not_now'); end if;
    update files set status = 'trash', trashed_at = now(), trashed_by = p_person, updated_at = now()
    where group_id = f.group_id and status in ('ready', 'held');
    update files set status = 'deleted', deleted_at = now(), updated_at = now() where id = f.id and status = 'refused';
  elsif a = 'restore' then
    if f.status <> 'trash' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update files set status = case when check_state = 'flagged' then 'held' else 'ready' end, trashed_at = null, trashed_by = null, updated_at = now()
    where group_id = f.group_id and status = 'trash';
  elsif a = 'confirm' then
    if f.status <> 'held' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
    update files set status = 'ready', check_state = 'confirmed', confirmed_by = p_person, confirmed_at = now(), updated_at = now() where id = f.id;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_action');
  end if;
  perform dela_audit('member', p_person, 'file_' || a, 'file', f.id::text, jsonb_build_object('folder_id', p->>'folder_id'));
  return jsonb_build_object('ok', true);
end $$;

-- Daily clean up: trash past its days, and uploads that never finished. Returns storage paths for the api to delete.
create or replace function dela_files_sweep_due() returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path)), '[]') from (
    select id, storage_path from files
    where (status = 'trash' and trashed_at < now() - make_interval(days => dela_int_setting('files.trash_days', 30)))
       or (status = 'uploading' and created_at < now() - make_interval(mins => dela_int_setting('files.upload_minutes', 60)))
       or (status = 'refused' and deleted_at is null and updated_at < now() - interval '1 day')
    limit 500) t
$$;

create or replace function dela_file_mark_deleted(p_file uuid) returns void language plpgsql as $$
begin
  delete from file_texts where file_id = p_file;
  update files set status = 'deleted', deleted_at = coalesce(deleted_at, now()), is_current = false, updated_at = now() where id = p_file;
  perform dela_audit('worker', null, 'file_deleted', 'file', p_file::text, '{}');
end $$;

-- Reminder when a member's key has failed for a few days in a row (once per failure)
create or replace function dela_ai_key_reminders() returns int language plpgsql as $$
declare k record; n int := 0;
begin
  for k in select * from ai_keys where status = 'failed' and reminded_at is null
           and failed_since < now() - make_interval(days => dela_int_setting('ai.byok_failure_reminder_days', 3)) loop
    perform dela_notify(jsonb_build_object('person_id', coalesce(k.person_id, k.added_by), 'side', k.side, 'kind', 'ai_key', 'essential', true, 'email', true,
      'title', 'Your AI key is not working',
      'body', 'Your ' || case k.provider when 'openai' then 'OpenAI' else 'Claude' end || ' key ending ' || k.last4 || ' has not worked since ' ||
              to_char(k.failed_since at time zone dela_tz(), 'FMMonth FMDD') || '. Open DELA, then AI settings, to test or replace it.',
      'link', '/dela?tab=ai', 'dedupe_key', 'keyfail:' || k.id || ':' || k.failed_since));
    update ai_keys set reminded_at = now() where id = k.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- The daily jobs now include the file clean up and key reminders
create or replace function dela_maybe_queue_daily() returns void language plpgsql as $$
declare local timestamp := now() at time zone dela_tz();
begin
  if extract(hour from local) >= 8 then
    perform dela_job_enqueue('daily_summary', '{}', now(), 'daily:' || local::date);
  end if;
  perform dela_job_enqueue('files_sweep', '{}', now(), 'files_sweep:' || local::date);
  perform dela_job_enqueue('ai_key_reminders', '{}', now(), 'ai_key_reminders:' || local::date);
end $$;

-- ---------- Admin: AI and files ----------

create or replace function dela_admin_ai_files(p_actor uuid) returns jsonb language plpgsql stable as $$
declare v_month timestamptz := (dela_period_start('month')::timestamp at time zone dela_tz());
begin
  perform dela_require_staff(p_actor, array['reviewer', 'support', 'finance']);
  return jsonb_build_object(
    'usage', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('side', u.side, 'plan', sp.plan_code, 'source', u.source, 'task', u.task,
        'calls', count(*), 'failed', count(*) filter (where not u.ok), 'credits', sum(u.credits), 'input_tokens', sum(u.input_tokens), 'output_tokens', sum(u.output_tokens)) x
      from ai_usage u left join side_profiles sp on sp.person_id = u.person_id and sp.side = u.side
      where u.at >= v_month group by u.side, sp.plan_code, u.source, u.task order by u.side, sp.plan_code, u.source, u.task) t),
    'keys', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('bd_member_id', p.bd_member_id, 'name', p.display_name, 'scope', k.scope,
        'side', coalesce(k.side, 'firm'), 'provider', k.provider, 'status', k.status, 'error', k.last_error, 'failed_since', k.failed_since, 'added_at', k.created_at) x
      from ai_keys k join people p on p.id = k.added_by where k.status <> 'removed' order by (k.status = 'failed') desc, k.created_at desc limit 200) t),
    'errors', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('at', u.at, 'bd_member_id', p.bd_member_id, 'side', u.side, 'task', u.task, 'source', u.source,
        'provider', u.provider, 'error', u.error) x
      from ai_usage u join people p on p.id = u.person_id where not u.ok order by u.id desc limit 50) t),
    'storage', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('org', o.name, 'bd_member_id', p.bd_member_id, 'used_bytes', dela_storage_used_bytes(o.id),
        'limit_bytes', dela_storage_limit_bytes(o.id), 'files', (select count(*) from files f where f.org_id = o.id and f.status in ('ready', 'held'))) x
      from organizations o join people p on p.id = o.owner_person_id where exists (select 1 from files f where f.org_id = o.id)
      order by dela_storage_used_bytes(o.id) desc limit 100) t),
    'held', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('at', f.updated_at, 'bd_member_id', p.bd_member_id, 'name', f.name, 'reasons', f.check_reasons) x
      from files f join people p on p.id = f.uploaded_by where f.status = 'held' order by f.updated_at desc limit 50) t),
    'refused', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('at', f.updated_at, 'bd_member_id', p.bd_member_id, 'name', f.name, 'ext', f.ext, 'reason', f.refuse_reason) x
      from files f join people p on p.id = f.uploaded_by where f.refuse_reason <> '' order by f.updated_at desc limit 50) t)
  );
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
