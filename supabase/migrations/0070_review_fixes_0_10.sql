-- Fixes from the AI review of 0.10.0 (GitHub issue #11). Additive.

-- Security 3, payments 2, tests 1: one trial check at a time. The daily run, "Run the check now" and the sign-in backstop
-- take this lease first; a second check skips while one is running. The lease ends by itself after p_minutes, so a run
-- that stops without letting go never blocks the job for good.
create table if not exists trial_lock (
  id int primary key check (id = 1),
  holder text not null default '',
  until timestamptz
);
alter table trial_lock enable row level security;
insert into trial_lock (id) values (1) on conflict (id) do nothing;

create or replace function dela_trial_lock(p_holder text, p_minutes int) returns boolean language sql as $$
  with u as (update trial_lock set holder = p_holder, until = now() + make_interval(mins => greatest(p_minutes, 1))
    where id = 1 and (until is null or until < now()) returning 1)
  select exists (select 1 from u)
$$;

create or replace function dela_trial_unlock(p_holder text) returns void language sql as $$
  update trial_lock set until = null where id = 1 and holder = p_holder
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('dela_trial_lock', 'dela_trial_unlock') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.sig);
  end loop;
end $$;
