#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SRC_DIR="${DEPLOY_SRC_DIR:-$SCRIPT_DIR/../../ops/mini-pc-nextcloud}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/pressbackup/pressco21/nextcloud}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.yml}"
CREDENTIALS_FILE="${CREDENTIALS_FILE:-/home/pressbackup/pressco21/nextcloud-admin-credentials.txt}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

rand_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '\n'
  else
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(24))
PY
  fi
}

require_cmd docker
require_cmd python3

mkdir -p "$DEPLOY_DIR" /home/pressbackup/pressco21

cp "$DEPLOY_SRC_DIR/docker-compose.yml" "$COMPOSE_FILE"

if [[ ! -f "$ENV_FILE" ]]; then
  admin_password="$(rand_secret)"
  mysql_password="$(rand_secret)"
  mysql_root_password="$(rand_secret)"
  cat >"$ENV_FILE" <<EOF
COMPOSE_PROJECT_NAME=pressco21-nextcloud
BIND_ADDRESS=0.0.0.0
HTTP_PORT=18080
DEPLOY_DIR=$DEPLOY_DIR
APP_DATA_DIR=$DEPLOY_DIR/app
DB_DATA_DIR=$DEPLOY_DIR/db
REDIS_DATA_DIR=$DEPLOY_DIR/redis
EXTERNAL_SHARED_DIR=/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared
ACTIVE_ROOT_DIR=/mnt/pressco21-ssd/PRESSCO21_ACTIVE
UPLOADS_SHARED_DIR=/home/pressbackup/pressco21/nextcloud/shared
MYSQL_DATABASE=nextcloud
MYSQL_USER=nextcloud
MYSQL_PASSWORD=$mysql_password
MYSQL_ROOT_PASSWORD=$mysql_root_password
NEXTCLOUD_ADMIN_USER=pressco21_admin
NEXTCLOUD_ADMIN_PASSWORD=$admin_password
NEXTCLOUD_TRUSTED_DOMAINS=192.168.0.54 100.76.25.105 pressco21-backup.tailee581a.ts.net
EOF

  cat >"$CREDENTIALS_FILE" <<EOF
PRESSCO21 Nextcloud admin
generated_at=$(date '+%Y-%m-%d %H:%M:%S %Z')
url_lan=http://192.168.0.54:18080
url_tailscale=http://100.76.25.105:18080
url_tailnet=http://pressco21-backup.tailee581a.ts.net:18080
admin_user=pressco21_admin
admin_password=$admin_password
EOF
  chmod 600 "$CREDENTIALS_FILE"
fi

python3 - "$ENV_FILE" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
text = env_path.read_text()
append = []
if "UPLOADS_SHARED_DIR=" not in text:
    append.append("UPLOADS_SHARED_DIR=/home/pressbackup/pressco21/nextcloud/shared")
if "ACTIVE_ROOT_DIR=" not in text:
    append.append("ACTIVE_ROOT_DIR=/mnt/pressco21-ssd/PRESSCO21_ACTIVE")
if append:
    if not text.endswith("\n"):
        text += "\n"
    text += "\n".join(append) + "\n"
    env_path.write_text(text)
PY

mkdir -p "$DEPLOY_DIR/app" "$DEPLOY_DIR/db" "$DEPLOY_DIR/redis"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "Nextcloud deploy requested."
echo "Compose file: $COMPOSE_FILE"
echo "Env file: $ENV_FILE"
echo "Credentials: $CREDENTIALS_FILE"
