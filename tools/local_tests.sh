#!/usr/bin/env bash
# Runs the whole test set on Stacey's Mac, the same suites as .github/workflows/tests.yml (read from that file).
# Usage: tools/local_tests.sh [db|api|browser|all]   (default all)
# Postgres: PostgreSQL 16 from Postgres.app, a separate test server on port 55432 with its data in
# ~/Library/Application Support/DELA-test-postgres. It is created and started here when it is not running.
set -uo pipefail
cd "$(dirname "$0")/.."
WHAT=${1:-all}
PGBIN=${PGBIN:-/Applications/Postgres.app/Contents/Versions/16/bin}
PGDATA_DIR=${PGDATA_DIR:-"$HOME/Library/Application Support/DELA-test-postgres"}
export PATH="$PGBIN:$PWD/node_modules/.bin:$PATH" PGHOST=${PGHOST:-127.0.0.1} PGPORT=${PGPORT:-55432} PGUSER=${PGUSER:-postgres}
LOGS=${LOGS:-"${TMPDIR:-/tmp}/dela-tests"}; mkdir -p "$LOGS"

if ! psql -d postgres -Atc "select 1" >/dev/null 2>&1; then
  if [ ! -f "$PGDATA_DIR/PG_VERSION" ]; then mkdir -p "$PGDATA_DIR" && initdb -D "$PGDATA_DIR" -U postgres --auth=trust -E UTF8 >/dev/null; fi
  pg_ctl -D "$PGDATA_DIR" -o "-p $PGPORT -k /tmp" -l "$PGDATA_DIR/log" start >/dev/null && sleep 3
fi
psql -d postgres -Atc "select 1" >/dev/null || { echo "Postgres is not reachable on $PGHOST:$PGPORT"; exit 1; }

fail=0
if [ "$WHAT" = all ] || [ "$WHAT" = db ] || [ "$WHAT" = api ]; then
  tools/dbtest.sh > "$LOGS/dbtest.log" 2>&1 && echo "PASS database and SQL tests" || { echo "FAIL database (see $LOGS/dbtest.log)"; exit 1; }
fi
if [ "$WHAT" = all ] || [ "$WHAT" = api ]; then
  cmd=$(grep -o 'npx deno test -A .*' .github/workflows/tests.yml | head -1)
  # macOS has no PHP; the two widget-helper tests then run only on GitHub
  if ! command -v php >/dev/null; then cmd=${cmd//tests\/php\/auth_test.ts/}; echo "SKIP tests/php/auth_test.ts (no PHP on this computer; GitHub Tests runs it)"; fi
  if eval "$cmd" > "$LOGS/api.log" 2>&1; then echo "PASS api: $(sed "s/\x1b\[[0-9;]*m//g" "$LOGS/api.log" | grep -Eo "[0-9]+ passed" | tail -1)"; else echo "FAIL api (see $LOGS/api.log)"; fail=1; fi
fi
if [ "$WHAT" = all ] || [ "$WHAT" = browser ]; then
  # tests/pw/server.ts renders each page through the BD widget with PHP (tests/php/render_widget.php)
  command -v php >/dev/null || { echo "STOP browser suites: they need PHP (php command) on this computer"; exit 1; }
  for t in $(grep -Eo 'tests/pw/[a-z0-9-]+-test\.js' .github/workflows/tests.yml); do
    n=$(basename "$t" .js)
    pkill -f tests/pw/server.ts 2>/dev/null; sleep 1
    tools/dbtest.sh > "$LOGS/dbtest-$n.log" 2>&1 || { echo "FAIL $n (database, see $LOGS/dbtest-$n.log)"; fail=1; continue; }
    (nohup npx deno run -A tests/pw/server.ts > "$LOGS/server-$n.log" 2>&1 &)
    sleep 12
    if SHOTS="$LOGS/shots" node "$t" > "$LOGS/$n.log" 2>&1; then echo "PASS $n"; else echo "FAIL $n (see $LOGS/$n.log)"; fail=1; fi
  done
  pkill -f tests/pw/server.ts 2>/dev/null
fi
exit $fail
