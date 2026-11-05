-- The Process Recorder uploads video and audio pieces (webm, or mp4 on Safari), but the dela-files bucket
-- only allowed documents and images, so every piece was refused (Stacey's recorder check 2026-11-05).
-- Additive: adds the recorder's types to the bucket's allowed list. Supabase only; the local test database has no storage schema.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $b$update storage.buckets
      set allowed_mime_types = (select array_agg(distinct t order by t) from unnest(coalesce(allowed_mime_types, '{}') || array['video/webm', 'audio/webm', 'video/mp4', 'audio/mp4']) t)
      where id = 'dela-files'$b$;
  end if;
end $$;
