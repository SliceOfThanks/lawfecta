-- Step 69: community (Stacey 2026-11-20). Three parts behind one switch, "community":
--   1. Discussions inside DELA (her answer the same day: "Inside DELA"): four boards. "Freelancer lounge" is read and
--      written by freelancers only, "Attorney room" by attorneys only, "Everyone" and "Help with Lawfecta" by all
--      members. The Lawfecta Team reads every board and can remove a post, with the reason kept.
--   2. A freelancer's community articles, written on the website, shown on their profile in DELA.
--   3. "Recent activity" on Home: the newest promotions and community articles from freelancers.
-- The website's posts are read by the api and kept here for a short time, so a page load never waits on the website.
-- Additive: one switch, five settings, four tables, and functions.

insert into feature_switches (key, label, gate) values ('community', 'Community: discussions inside DELA, a freelancer''s articles on their profile, and Recent activity on Home (step 69)', 'Stacey asked for it 2026-11-20; on for everyone on the site after the release')
on conflict (key) do nothing;

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bd.articles_data_id', '15'::jsonb, 'Website post type shown as Articles on a freelancer''s profile', 'Community', '', 'C', 'Read from the website 2026-11-20: 15 is "Community Article"', '0 turns articles off.'),
  ('bd.articles_write_path', '"/account/home"'::jsonb, 'Where "Write an article" sends a freelancer on the website', 'Community', '', 'O', 'Claude 2026-11-20 (step 69)', 'The address on the website where a member adds a community article. Starts with a slash.'),
  ('community.refresh_minutes', '20'::jsonb, 'How often DELA reads new promotions and articles from the website', 'Community', 'minutes', 'C', 'Claude 2026-11-20 (step 69)', 'Recent activity is read at most this often.'),
  ('community.topics_per_day', '5'::jsonb, 'New discussion topics one member may start in a day', 'Community', 'topics', 'C', 'Claude 2026-11-20 (step 69)', ''),
  ('community.replies_per_day', '40'::jsonb, 'Replies one member may write in a day', 'Community', 'replies', 'C', 'Claude 2026-11-20 (step 69)', '')
on conflict (key) do nothing;

create table if not exists community_topics (
  id uuid primary key default gen_random_uuid(),
  board text not null check (board in ('freelancers', 'attorneys', 'everyone', 'help')),
  author uuid not null references people(id),
  author_side text not null check (author_side in ('attorney', 'freelancer')),
  title text not null check (length(title) between 3 and 160),
  body text not null check (length(body) between 1 and 6000),
  status text not null default 'open' check (status in ('open', 'removed')),
  removed_by uuid references people(id),
  removed_reason text not null default '',
  removed_at timestamptz,
  request_id text not null default '',
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
alter table community_topics enable row level security;
create index if not exists community_topics_board on community_topics (board, last_at desc) where status = 'open';
create unique index if not exists community_topics_request on community_topics (author, request_id) where request_id <> '';

create table if not exists community_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references community_topics(id),
  author uuid not null references people(id),
  author_side text not null check (author_side in ('attorney', 'freelancer')),
  body text not null check (length(body) between 1 and 6000),
  status text not null default 'open' check (status in ('open', 'removed')),
  removed_by uuid references people(id),
  removed_reason text not null default '',
  removed_at timestamptz,
  request_id text not null default '',
  created_at timestamptz not null default now()
);
alter table community_replies enable row level security;
create index if not exists community_replies_topic on community_replies (topic_id, created_at);
create unique index if not exists community_replies_request on community_replies (author, request_id) where request_id <> '';

create table if not exists community_reports (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references community_topics(id),
  reply_id uuid references community_replies(id),
  reporter uuid not null references people(id),
  reason text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
alter table community_reports enable row level security;
create unique index if not exists community_reports_once on community_reports (reporter, coalesce(topic_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(reply_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- The website's promotions and articles, as last read (one row)
create table if not exists community_feed_cache (
  id int primary key check (id = 1),
  items jsonb not null default '[]',
  ok boolean not null default true,
  fetched_at timestamptz not null default now()
);
alter table community_feed_cache enable row level security;

-- May this person, on this side, read and write this board?
create or replace function dela_community_may(p_person uuid, p_side text, p_board text) returns boolean language sql stable set search_path = public, extensions, pg_temp as $$
  select dela_switch_on('community', p_person) and p_board in ('freelancers', 'attorneys', 'everyone', 'help')
    and (dela_is_staff(p_person) or p_board in ('everyone', 'help') or (p_board = 'freelancers' and p_side = 'freelancer') or (p_board = 'attorneys' and p_side = 'attorney'))
    and exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = p_side and sp.status <> 'closed')
$$;
revoke all on function dela_community_may(uuid, text, text) from public, anon, authenticated;

-- How an author is shown: a freelancer by their name (the server shortens it for people who have not hired them),
-- an attorney by first name and last initial, and the Lawfecta Team as the Team.
create or replace function dela_community_author(p_author uuid, p_side text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('person_id', p_author, 'side', p_side, 'team', dela_is_staff(p_author),
    'name', case when dela_is_staff(p_author) then 'Lawfecta Team' when p_side = 'freelancer' then dela_freelancer_name(p_author)
      else coalesce((select nullif(btrim(coalesce(mp.body->>'first_name', '')) || case when btrim(coalesce(mp.body->>'last_name', '')) <> '' then ' ' || upper(left(btrim(mp.body->>'last_name'), 1)) || '.' else '' end, '')
        from member_profiles mp where mp.person_id = p_author and mp.side = 'attorney'), dela_short_name(p_author)) end)
$$;
revoke all on function dela_community_author(uuid, text) from public, anon, authenticated;

create or replace function dela_community_boards(p_person uuid, p_side text) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
begin
  if not dela_switch_on('community', p_person) then return jsonb_build_object('ok', true, 'on', false); end if;
  return jsonb_build_object('ok', true, 'on', true, 'team', dela_is_staff(p_person),
    'boards', (select jsonb_agg(jsonb_build_object('key', b.key, 'name', b.name, 'about', b.about,
        'topics', (select count(*) from community_topics t where t.board = b.key and t.status = 'open'),
        'last_at', (select max(t.last_at) from community_topics t where t.board = b.key and t.status = 'open')) order by b.n)
      from (values ('everyone', 'Everyone', 'Attorneys and freelancers together: ideas, questions and what works.', 1),
                   ('freelancers', 'Freelancer lounge', 'Only freelancers read and write here.', 2),
                   ('attorneys', 'Attorney room', 'Only attorneys read and write here.', 3),
                   ('help', 'Help with Lawfecta', 'How to do something on Lawfecta. The Lawfecta Team reads this board.', 4)) b(key, name, about, n)
      where dela_community_may(p_person, p_side, b.key)),
    'open_reports', case when dela_is_staff(p_person) then (select count(*) from community_reports where status = 'open') end);
end $$;
revoke all on function dela_community_boards(uuid, text) from public, anon, authenticated;

create or replace function dela_community_topics(p_person uuid, p_side text, p_board text, p_offset int default 0) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare v_off int := greatest(coalesce(p_offset, 0), 0);
begin
  if not dela_community_may(p_person, p_side, p_board) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'board', p_board, 'offset', v_off, 'limit', 20,
    'total', (select count(*) from community_topics where board = p_board and status = 'open'),
    'topics', (select coalesce(jsonb_agg(x.j order by x.last_at desc), '[]') from (
      select t.last_at, jsonb_build_object('id', t.id, 'title', t.title, 'created_at', t.created_at, 'last_at', t.last_at, 'mine', t.author = p_person,
        'author', dela_community_author(t.author, t.author_side),
        'replies', (select count(*) from community_replies r where r.topic_id = t.id and r.status = 'open'),
        'reported', case when dela_is_staff(p_person) then exists (select 1 from community_reports c where c.status = 'open' and (c.topic_id = t.id or c.reply_id in (select id from community_replies where topic_id = t.id))) end) j
      from community_topics t where t.board = p_board and t.status = 'open' order by t.last_at desc limit 20 offset v_off) x));
end $$;
revoke all on function dela_community_topics(uuid, text, text, int) from public, anon, authenticated;

create or replace function dela_community_topic(p_person uuid, p_side text, p_topic uuid) returns jsonb language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare t community_topics; v_team boolean := dela_is_staff(p_person);
begin
  select * into t from community_topics where id = p_topic;
  if t.id is null or not dela_community_may(p_person, p_side, t.board) or (t.status <> 'open' and not v_team) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'team', v_team,
    'topic', jsonb_build_object('id', t.id, 'board', t.board, 'title', t.title, 'body', t.body, 'created_at', t.created_at, 'mine', t.author = p_person, 'status', t.status,
      'removed_reason', case when v_team then t.removed_reason end, 'author', dela_community_author(t.author, t.author_side),
      'reported', case when v_team then (select count(*) from community_reports c where c.topic_id = t.id and c.status = 'open') end),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'body', case when r.status = 'open' then r.body else '' end, 'created_at', r.created_at, 'mine', r.author = p_person, 'status', r.status,
        'removed_reason', case when v_team then r.removed_reason end, 'author', dela_community_author(r.author, r.author_side),
        'reported', case when v_team then (select count(*) from community_reports c where c.reply_id = r.id and c.status = 'open') end) order by r.created_at), '[]')
      from community_replies r where r.topic_id = t.id and (r.status = 'open' or v_team)));
end $$;
revoke all on function dela_community_topic(uuid, text, uuid) from public, anon, authenticated;

-- p: board, title, body, request_id. The api has already cleaned the text.
create or replace function dela_community_post(p_person uuid, p_side text, p jsonb) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_board text := p->>'board'; v_title text := btrim(coalesce(p->>'title', '')); v_body text := btrim(coalesce(p->>'body', '')); v_req text := left(coalesce(p->>'request_id', ''), 80); v uuid; n int;
begin
  if not dela_community_may(p_person, p_side, v_board) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if length(v_title) < 3 or length(v_title) > 160 then return jsonb_build_object('ok', false, 'reason', 'title_needed'); end if;
  if length(v_body) < 1 or length(v_body) > 6000 then return jsonb_build_object('ok', false, 'reason', 'text_needed'); end if;
  if v_req <> '' then
    select id into v from community_topics where author = p_person and request_id = v_req;
    if v is not null then return jsonb_build_object('ok', true, 'id', v, 'duplicate', true); end if;
  end if;
  select count(*) into n from community_topics where author = p_person and created_at > now() - interval '1 day';
  if not dela_is_staff(p_person) and n >= dela_int_setting('community.topics_per_day', 5) then return jsonb_build_object('ok', false, 'reason', 'too_many_today', 'limit', dela_int_setting('community.topics_per_day', 5)); end if;
  insert into community_topics (board, author, author_side, title, body, request_id) values (v_board, p_person, p_side, v_title, v_body, v_req) returning id into v;
  return jsonb_build_object('ok', true, 'id', v);
end $$;
revoke all on function dela_community_post(uuid, text, jsonb) from public, anon, authenticated;

create or replace function dela_community_reply(p_person uuid, p_side text, p_topic uuid, p_body text, p_request text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t community_topics; v_body text := btrim(coalesce(p_body, '')); v_req text := left(coalesce(p_request, ''), 80); v uuid; n int;
begin
  select * into t from community_topics where id = p_topic;
  if t.id is null or t.status <> 'open' or not dela_community_may(p_person, p_side, t.board) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if dela_has_hold(p_person) then return jsonb_build_object('ok', false, 'reason', 'on_hold'); end if;
  if length(v_body) < 1 or length(v_body) > 6000 then return jsonb_build_object('ok', false, 'reason', 'text_needed'); end if;
  if v_req <> '' then
    select id into v from community_replies where author = p_person and request_id = v_req;
    if v is not null then return jsonb_build_object('ok', true, 'id', v, 'duplicate', true); end if;
  end if;
  select count(*) into n from community_replies where author = p_person and created_at > now() - interval '1 day';
  if not dela_is_staff(p_person) and n >= dela_int_setting('community.replies_per_day', 40) then return jsonb_build_object('ok', false, 'reason', 'too_many_today', 'limit', dela_int_setting('community.replies_per_day', 40)); end if;
  insert into community_replies (topic_id, author, author_side, body, request_id) values (t.id, p_person, p_side, v_body, v_req) returning id into v;
  update community_topics set last_at = now() where id = t.id;
  if t.author <> p_person then
    perform dela_notify(jsonb_build_object('person_id', t.author, 'side', t.author_side, 'kind', 'message', 'title', 'New reply in your discussion',
      'body', 'Someone replied to "' || left(t.title, 100) || '".', 'link', '/dela?tab=community&topic=' || t.id, 'dedupe_key', 'comreply:' || t.id || ':' || to_char(now(), 'YYYYMMDDHH24')));
  end if;
  return jsonb_build_object('ok', true, 'id', v);
end $$;
revoke all on function dela_community_reply(uuid, text, uuid, text, text) from public, anon, authenticated;

create or replace function dela_community_report(p_person uuid, p_side text, p_topic uuid, p_reply uuid, p_reason text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare t community_topics; v_topic uuid := p_topic;
begin
  if p_reply is not null then select topic_id into v_topic from community_replies where id = p_reply; end if;
  select * into t from community_topics where id = v_topic;
  if t.id is null or not dela_community_may(p_person, p_side, t.board) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into community_reports (topic_id, reply_id, reporter, reason) values (case when p_reply is null then t.id end, p_reply, p_person, left(btrim(coalesce(p_reason, '')), 500))
  on conflict do nothing;
  if found then perform dela_alert('conduct', 'A discussion post was reported', 'A member reported a post in "' || left(t.title, 100) || '". Open Community in DELA to look.', 'comrep:' || coalesce(p_reply, t.id)); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_community_report(uuid, text, uuid, uuid, text) from public, anon, authenticated;

-- The Lawfecta Team removes a topic or a reply (kept, hidden from members) or puts it back; the reason is required and kept.
create or replace function dela_community_moderate(p_actor uuid, p_topic uuid, p_reply uuid, p_remove boolean, p_reason text) returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_reason text := left(btrim(coalesce(p_reason, '')), 500); v_author uuid; v_side text; v_title text;
begin
  perform dela_require_staff(p_actor, array['support', 'reviewer']);
  if p_remove and length(v_reason) < 5 then return jsonb_build_object('ok', false, 'reason', 'reason_needed'); end if;
  if p_reply is not null then
    update community_replies set status = case when p_remove then 'removed' else 'open' end, removed_by = case when p_remove then p_actor end, removed_reason = case when p_remove then v_reason else '' end,
      removed_at = case when p_remove then now() end where id = p_reply returning author, author_side into v_author, v_side;
    if v_author is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    update community_reports set status = 'closed' where reply_id = p_reply;
    select title into v_title from community_topics where id = (select topic_id from community_replies where id = p_reply);
  else
    update community_topics set status = case when p_remove then 'removed' else 'open' end, removed_by = case when p_remove then p_actor end, removed_reason = case when p_remove then v_reason else '' end,
      removed_at = case when p_remove then now() end where id = p_topic returning author, author_side, title into v_author, v_side, v_title;
    if v_author is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    update community_reports set status = 'closed' where topic_id = p_topic or reply_id in (select id from community_replies where topic_id = p_topic);
  end if;
  perform dela_audit('staff', p_actor, case when p_remove then 'community_post_removed' else 'community_post_restored' end, case when p_reply is not null then 'community_reply' else 'community_topic' end,
    coalesce(p_reply, p_topic)::text, jsonb_build_object('reason', v_reason));
  if p_remove then
    perform dela_notify(jsonb_build_object('person_id', v_author, 'side', v_side, 'kind', 'conduct', 'essential', true, 'title', 'A post of yours was removed',
      'body', 'The Lawfecta Team removed your post in "' || left(coalesce(v_title, 'a discussion'), 100) || '". Reason: ' || v_reason, 'link', '/dela?tab=community', 'dedupe_key', 'commod:' || coalesce(p_reply, p_topic) || ':' || to_char(now(), 'YYYYMMDDHH24MI')));
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function dela_community_moderate(uuid, uuid, uuid, boolean, text) from public, anon, authenticated;

-- The feed cache: read, and written by the api after it read the website
create or replace function dela_community_feed_get() returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce((select jsonb_build_object('items', items, 'ok', ok, 'fetched_at', fetched_at,
    'stale', fetched_at < now() - make_interval(mins => greatest(dela_int_setting('community.refresh_minutes', 20), 1))) from community_feed_cache where id = 1),
    jsonb_build_object('items', '[]'::jsonb, 'ok', true, 'fetched_at', null, 'stale', true))
$$;
revoke all on function dela_community_feed_get() from public, anon, authenticated;
create or replace function dela_community_feed_set(p_items jsonb, p_ok boolean) returns void language sql set search_path = public, extensions, pg_temp as $$
  insert into community_feed_cache (id, items, ok, fetched_at) values (1, coalesce(p_items, '[]'), coalesce(p_ok, false), now())
  on conflict (id) do update set items = case when excluded.ok then excluded.items else community_feed_cache.items end, ok = excluded.ok, fetched_at = now()
$$;
revoke all on function dela_community_feed_set(jsonb, boolean) from public, anon, authenticated;

-- The freelancers behind a list of website member ids: only people with an open freelancer workspace in DELA
create or replace function dela_community_people(p_bd bigint[]) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_object_agg(pe.bd_member_id::text, jsonb_build_object('person_id', pe.id, 'name', dela_freelancer_name(pe.id), 'headline', mp.body->>'headline',
    'photo_file', mp.body->>'photo_file', 'avatar', mp.body->>'avatar')), '{}'::jsonb)
  from people pe join side_profiles sp on sp.person_id = pe.id and sp.side = 'freelancer' and sp.status <> 'closed'
    left join member_profiles mp on mp.person_id = pe.id and mp.side = 'freelancer'
  where pe.status = 'active' and pe.bd_member_id = any(coalesce(p_bd, '{}'::bigint[]))
$$;
revoke all on function dela_community_people(bigint[]) from public, anon, authenticated;
