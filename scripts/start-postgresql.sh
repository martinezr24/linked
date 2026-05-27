#!/usr/bin/env bash
# Homebrew postgresql@18: "brew services start" often loads launchd but does not
# spawn postgres on recent macOS. kickstart is required.
set -euo pipefail

LABEL="homebrew.mxcl.postgresql@18"
PG_BIN="/opt/homebrew/opt/postgresql@18/bin"

brew services start postgresql@18

UID_NUM="$(id -u)"
launchctl kickstart -k "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true

sleep 1

if "${PG_BIN}/pg_isready" -q; then
  echo "PostgreSQL 18 is ready."
  "${PG_BIN}/psql" postgres -c "SELECT version();" | head -1
else
  echo "PostgreSQL did not start. Check: tail -50 /opt/homebrew/var/log/postgresql@18.log" >&2
  exit 1
fi
