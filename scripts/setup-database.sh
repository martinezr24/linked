#!/usr/bin/env bash
set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@18/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="linked_db"

if ! "${PG_BIN}/pg_isready" -q 2>/dev/null; then
  echo "PostgreSQL is not running. Start it first:" >&2
  echo "  ./scripts/start-postgresql.sh" >&2
  exit 1
fi

exists="$("${PG_BIN}/psql" postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'")"
if [[ "${exists}" != "1" ]]; then
  echo "Creating database ${DB_NAME}..."
  "${PG_BIN}/psql" postgres -c "CREATE DATABASE ${DB_NAME};"
else
  echo "Database ${DB_NAME} already exists."
fi

echo "Applying schema..."
"${PG_BIN}/psql" "${DB_NAME}" -f "${SCRIPT_DIR}/init-linked_db.sql"

echo "Done. Connect with:"
echo "  ${PG_BIN}/psql ${DB_NAME}"
