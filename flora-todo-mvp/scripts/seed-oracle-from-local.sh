#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${ORACLE_SSH_HOST:-ubuntu@158.180.77.201}"
REMOTE_KEY="${ORACLE_SSH_KEY:-$HOME/.ssh/oracle-n8n.key}"
LOCAL_DB_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/flora_todo_mvp}"
REMOTE_DB_CONTAINER="${REMOTE_FLORA_DB_CONTAINER:-flora-todo-mvp-postgres}"
LOCAL_DB_CONTAINER="${LOCAL_FLORA_DB_CONTAINER:-flora-todo-mvp-postgres}"

if command -v pg_dump >/dev/null 2>&1; then
  DUMP_CMD=(pg_dump "$LOCAL_DB_URL")
else
  DUMP_CMD=(docker exec -i "$LOCAL_DB_CONTAINER" pg_dump -U postgres -d flora_todo_mvp)
fi

ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "docker exec -i ${REMOTE_DB_CONTAINER} psql -U postgres -d flora_todo_mvp -c 'truncate table reminders, followups, tasks, project_catalogs, calendar_catalogs restart identity cascade;'"

"${DUMP_CMD[@]}" \
  --data-only \
  --inserts \
  --table=project_catalogs \
  --table=calendar_catalogs \
  --table=tasks \
  --table=reminders \
  --table=followups \
  | ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "docker exec -i ${REMOTE_DB_CONTAINER} psql -U postgres -d flora_todo_mvp"

echo "[flora] seeded remote database from local snapshot"
