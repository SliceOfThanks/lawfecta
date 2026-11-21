-- Step 74: tags and a private note on a bookmarked freelancer (Stacey 2026-11-20: "allow the attorney to add
-- tags/labels to bookmarked freelancers and notes, so they can remember why they added them. They should also be
-- able to filter them by tag, and top level / sub level / sub-sub level categories").
-- The bookmark itself stays in the website's own bookmark table (0108). The tags and the note are DELA's: one row per
-- member and freelancer, read and written only by the member who wrote them. The freelancer is never told and never
-- sees them; neither does anyone else in the firm.
-- Additive: three settings, one table, three functions.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('bookmarks.tags_max', '8'::jsonb, 'Tags one member may put on one bookmarked freelancer', 'Profiles and verification', 'tags', 'C', 'Claude 2026-11-20 (step 74)', 'A tag is a short label the member chooses, such as "Probate" or "Call in January".'),
  ('bookmarks.tag_length', '30'::jsonb, 'Longest tag on a bookmarked freelancer', 'Profiles and verification', 'characters', 'C', 'Claude 2026-11-20 (step 74)', ''),
  ('bookmarks.note_length', '1000'::jsonb, 'Longest private note on a bookmarked freelancer', 'Profiles and verification', 'characters', 'C', 'Claude 2026-11-20 (step 74)', '')
on conflict (key) do nothing;

create table if not exists bookmark_notes (
  owner_id uuid not null references people(id),
  person_id uuid not null references people(id),
  tags text[] not null default '{}',
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner_id, person_id)
);
alter table bookmark_notes enable row level security;

-- The member's tags and notes for the people named (their current bookmarks), and every tag in use among them
create or replace function dela_bookmark_notes(p_owner uuid, p_people jsonb) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  with mine as (
    select n.person_id, n.tags, n.note from bookmark_notes n
    where n.owner_id = p_owner and (cardinality(n.tags) > 0 or n.note <> '')
      and n.person_id::text in (select x #>> '{}' from jsonb_array_elements(case when jsonb_typeof(p_people) = 'array' then p_people else '[]' end) x))
  select jsonb_build_object(
    'items', coalesce((select jsonb_object_agg(m.person_id::text, jsonb_build_object('tags', to_jsonb(m.tags), 'note', m.note)) from mine m), '{}'),
    'tags', coalesce((select jsonb_agg(t order by lower(t)) from (select distinct t from mine m, unnest(m.tags) t) d), '[]'),
    'limits', jsonb_build_object('tags', dela_int_setting('bookmarks.tags_max', 8), 'tag_length', dela_int_setting('bookmarks.tag_length', 30), 'note_length', dela_int_setting('bookmarks.note_length', 1000)))
$$;
revoke all on function dela_bookmark_notes(uuid, jsonb) from public, anon, authenticated;

-- Save the tags and the note. Tags are trimmed, a tag written twice counts once, and a tag the member already uses
-- keeps its first spelling ("probate" becomes "Probate"), so the filter list has no near-doubles.
create or replace function dela_bookmark_note_set(p_owner uuid, p_person uuid, p_tags jsonb, p_note text)
returns jsonb language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_note text := btrim(coalesce(p_note, '')); v_tags text[] := '{}'; v_t text; v_known text;
  v_max int := dela_int_setting('bookmarks.tags_max', 8); v_len int := dela_int_setting('bookmarks.tag_length', 30); v_nlen int := dela_int_setting('bookmarks.note_length', 1000);
begin
  if p_owner = p_person or not exists (select 1 from side_profiles sp where sp.person_id = p_person and sp.side = 'freelancer') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if length(v_note) > v_nlen then return jsonb_build_object('ok', false, 'reason', 'note_too_long', 'limit', v_nlen); end if;
  for v_t in select btrim(regexp_replace(x #>> '{}', '\s+', ' ', 'g')) from jsonb_array_elements(case when jsonb_typeof(p_tags) = 'array' then p_tags else '[]' end) x loop
    if v_t is null or v_t = '' then continue; end if;
    if length(v_t) > v_len then return jsonb_build_object('ok', false, 'reason', 'tag_too_long', 'limit', v_len, 'tag', left(v_t, 60)); end if;
    if exists (select 1 from unnest(v_tags) u where lower(u) = lower(v_t)) then continue; end if;
    select u into v_known from bookmark_notes n, unnest(n.tags) u where n.owner_id = p_owner and lower(u) = lower(v_t) order by n.updated_at limit 1;
    v_tags := v_tags || coalesce(v_known, v_t);
  end loop;
  if cardinality(v_tags) > v_max then return jsonb_build_object('ok', false, 'reason', 'too_many_tags', 'limit', v_max); end if;
  insert into bookmark_notes (owner_id, person_id, tags, note) values (p_owner, p_person, v_tags, v_note)
  on conflict (owner_id, person_id) do update set tags = excluded.tags, note = excluded.note, updated_at = now();
  return jsonb_build_object('ok', true, 'tags', to_jsonb(v_tags), 'note', v_note);
end $$;
revoke all on function dela_bookmark_note_set(uuid, uuid, jsonb, text) from public, anon, authenticated;

-- The people this member gave a tag (for the tag filter on the Bookmarks tab)
create or replace function dela_bookmark_tagged(p_owner uuid, p_tag text) returns jsonb language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(n.person_id), '[]') from bookmark_notes n
  where n.owner_id = p_owner and exists (select 1 from unnest(n.tags) u where lower(u) = lower(btrim(coalesce(p_tag, ''))))
$$;
revoke all on function dela_bookmark_tagged(uuid, text) from public, anon, authenticated;
