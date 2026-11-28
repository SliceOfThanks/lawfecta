-- Step 94: DELA keeps its own copy of each released version (docs/briefs/step-94-code-store.md).
-- Until now every page loaded its code through jsDelivr, which can only read a public GitHub repository. On
-- 2026-11-27 the repository was private for some hours: nothing could be released, and the site ran on copies jsDelivr
-- happened to hold. From here DELA copies a version's files from GitHub into its own Supabase Storage, and the pages
-- load them from there. Additive: two settings, one bucket, one table, new functions. The old way stays the default
-- until the setting code.source is changed.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('code.source', '"jsdelivr"'::jsonb, 'Where DELA''s pages load their code from: jsdelivr (needs a public repository) or storage (DELA''s own copy)', 'Releases', '', 'O', 'Claude 2026-11-27',
    'Change to "storage" only after the widgets of step 94 are installed on the website and the live version has been copied.'),
  ('code.repo', '"SliceOfThanks/lawfecta"'::jsonb, 'The GitHub home of DELA''s code', 'Releases', '', 'C', 'Stacey',
    'Read with the Supabase secret GITHUB_CODE_TOKEN when the repository is private.')
on conflict (key) do nothing;

-- The files a browser loads are public by nature. The bucket is public so they load fast and without a login;
-- nobody can list it, so a file is found only by its full address.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $b$insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('dela-code', 'dela-code', true, 5242880, array['text/javascript', 'application/typescript', 'text/plain', 'image/png', 'image/jpeg'])
      on conflict (id) do nothing$b$;
  end if;
end $$;

create table if not exists code_versions (
  commit text primary key check (commit ~ '^[0-9a-f]{40}$'),
  status text not null default 'pulling' check (status in ('pulling', 'ready', 'failed')),
  -- The server's own files sit under a long random name for the minutes a release needs them, then are removed
  key text not null,
  files int not null default 0,
  attempt int not null default 1,
  todo jsonb,
  server_files jsonb not null default '[]',
  problem text not null default '',
  started_at timestamptz not null default now(),
  ready_at timestamptz,
  sealed_at timestamptz
);
alter table code_versions enable row level security;

-- Start copying one version. Asking again for a version that is ready does nothing (it may be the one the pages are
-- loading); a failed one starts over.
create or replace function dela_code_pull(p_commit text, p_migrations text[] default '{}') returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare c code_versions; v_try int;
begin
  if p_commit !~ '^[0-9a-f]{40}$' then return jsonb_build_object('ok', false, 'reason', 'bad_commit'); end if;
  select * into c from code_versions where commit = p_commit for update;
  if c.commit is not null and c.status = 'ready' then return jsonb_build_object('ok', true, 'status', 'ready'); end if;
  insert into code_versions (commit, key) values (p_commit, encode(gen_random_bytes(16), 'hex'))
  on conflict (commit) do update set status = 'pulling', key = excluded.key, files = 0, attempt = code_versions.attempt + 1, todo = null, server_files = '[]', problem = '', started_at = now(), ready_at = null, sealed_at = null
  returning attempt into v_try;
  perform dela_job_enqueue('code_pull', jsonb_build_object('commit', p_commit, 'migrations', to_jsonb(coalesce(p_migrations, '{}'))), now(), 'code_pull:' || p_commit || ':try' || v_try, null);
  return jsonb_build_object('ok', true, 'status', 'pulling');
end $$;
revoke all on function dela_code_pull(text, text[]) from public, anon, authenticated;

-- For the server only: the version's row, with the random name of its server files
create or replace function dela_code_row(p_commit text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select to_jsonb(c) from code_versions c where c.commit = p_commit
$$;
revoke all on function dela_code_row(text) from public, anon, authenticated;

create or replace function dela_code_step(p_commit text, p_todo jsonb, p_done int, p_server jsonb) returns void language sql set search_path = public, extensions, pg_temp as $$
  update code_versions set todo = p_todo, files = files + coalesce(p_done, 0), server_files = server_files || coalesce(p_server, '[]'::jsonb) where commit = p_commit and status = 'pulling'
$$;
revoke all on function dela_code_step(text, jsonb, int, jsonb) from public, anon, authenticated;

create or replace function dela_code_end(p_commit text, p_ok boolean, p_problem text) returns void language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  update code_versions set status = case when p_ok then 'ready' else 'failed' end, problem = left(coalesce(p_problem, ''), 300), ready_at = case when p_ok then now() end, todo = null where commit = p_commit and status = 'pulling';
  if not p_ok then
    perform dela_alert('health', 'DELA could not copy a new version of its code', 'Version ' || left(p_commit, 7) || ': ' || left(coalesce(p_problem, ''), 300) || ' The site keeps running on the version it has. Tell Claude.', 'code_pull:' || p_commit);
  end if;
end $$;
revoke all on function dela_code_end(text, boolean, text) from public, anon, authenticated;

-- Is this version served from DELA's own copy?
create or replace function dela_code_own(p_commit text) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_setting_text('code.source', 'jsdelivr') = 'storage' and exists (select 1 from code_versions where commit = p_commit and status = 'ready')
$$;
revoke all on function dela_code_own(text) from public, anon, authenticated;

-- The switch to a version. With DELA's own copy in use, a version that was not copied is refused, so the pages can
-- never be pointed at files that are not there.
create or replace function dela_code_release(p_commit text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if p_commit !~ '^[0-9a-f]{40}$' then return jsonb_build_object('ok', false, 'reason', 'bad_commit'); end if;
  if dela_setting_text('code.source', 'jsdelivr') = 'storage' and not exists (select 1 from code_versions where commit = p_commit and status = 'ready') then
    return jsonb_build_object('ok', false, 'reason', 'not_copied');
  end if;
  update settings set value = to_jsonb(p_commit) where key = 'code_version';
  return jsonb_build_object('ok', true, 'code_version', p_commit);
end $$;
revoke all on function dela_code_release(text) from public, anon, authenticated;

-- After the server function is deployed: its files are taken out of the store again
create or replace function dela_code_seal(p_commit text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if not exists (select 1 from code_versions where commit = p_commit) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  perform dela_job_enqueue('code_seal', jsonb_build_object('commit', p_commit), now(), 'code_seal:' || p_commit || ':' || floor(extract(epoch from clock_timestamp()))::text, null);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_code_seal(text) from public, anon, authenticated;

create or replace function dela_code_sealed(p_commit text) returns void language sql set search_path = public, extensions, pg_temp as $$
  update code_versions set sealed_at = now(), server_files = '[]' where commit = p_commit
$$;
revoke all on function dela_code_sealed(text) from public, anon, authenticated;
