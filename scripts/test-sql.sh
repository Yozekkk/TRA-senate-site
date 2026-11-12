#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project_dir="$PWD"
pg_data="$project_dir/.local-pg"
pg_socket="$project_dir/.pg-socket"
pg_port=55432
test_db="argenti_ci_$$"
started=0
mkdir -p "$pg_socket"
if [[ ! -f "$pg_data/PG_VERSION" ]]; then
  initdb -D "$pg_data" --no-instructions --auth=trust >/dev/null
fi
if ! pg_isready -h "$pg_socket" -p "$pg_port" >/dev/null; then
  pg_ctl -D "$pg_data" -o "-k $pg_socket -p $pg_port" -l "$pg_data/server.log" start >/dev/null
  started=1
fi
cleanup() {
  dropdb -h "$pg_socket" -p "$pg_port" --if-exists "$test_db" >/dev/null 2>&1 || true
  if [[ "$started" == 1 ]]; then pg_ctl -D "$pg_data" stop >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
createdb -h "$pg_socket" -p "$pg_port" "$test_db"
psql -h "$pg_socket" -p "$pg_port" -d "$test_db" -v ON_ERROR_STOP=1 -q -f scripts/sql-test-setup.sql
psql -h "$pg_socket" -p "$pg_port" -d "$test_db" -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261111185609_initial_schema.sql
psql -h "$pg_socket" -p "$pg_port" -d "$test_db" -v ON_ERROR_STOP=1 -q -f scripts/sql-test-empty.sql
psql -h "$pg_socket" -p "$pg_port" -d "$test_db" -v ON_ERROR_STOP=1 -q -f scripts/sql-test-rls.sql >/dev/null
echo "SQL schema, empty state, RLS and audit tests passed"
