#!/usr/bin/env bash
# Runs every migration on a throwaway local database, then the SQL tests in supabase/tests.
# Needs a local Postgres. PGHOST/PGPORT/PGUSER pick the server (default 127.0.0.1:55432, postgres).
set -euo pipefail
cd "$(dirname "$0")/.."
export PGHOST=${PGHOST:-127.0.0.1} PGPORT=${PGPORT:-55432} PGUSER=${PGUSER:-postgres}
DB=dela_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -d $DB -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
SQL
for f in supabase/migrations/[0-9]*.sql; do
  case "$f" in *cron*) echo "skip $f (Supabase only)"; continue;; esac
  psql -q -d $DB -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  echo "applied $f"
done
for t in supabase/tests/*.sql; do
  # A failed check stops the script (and the GitHub run) here
  psql -q -d $DB -v ON_ERROR_STOP=1 -f "$t"
  echo "passed $t"
done
