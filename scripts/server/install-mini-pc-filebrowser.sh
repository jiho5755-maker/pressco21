#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME="${SCRIPT_NAME:-install-mini-pc-filebrowser}"
SERVICE_NAME="${SERVICE_NAME:-pressco21-content-browser}"
CONFIG_DIR="${CONFIG_DIR:-/etc/pressco21}"
ENV_FILE="${CONFIG_DIR}/content-browser.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"

BROWSER_ROOT="${BROWSER_ROOT:-/srv/pressco21-content}"
BROWSER_DB_DIR="${BROWSER_DB_DIR:-/var/lib/${SERVICE_NAME}}"
BROWSER_DB="${BROWSER_DB:-${BROWSER_DB_DIR}/filebrowser.db}"
BROWSER_ADDRESS="${BROWSER_ADDRESS:-0.0.0.0}"
BROWSER_PORT="${BROWSER_PORT:-8090}"
BROWSER_USER="${BROWSER_USER:-pressco21}"
BROWSER_BRANDING_NAME="${BROWSER_BRANDING_NAME:-PRESSCO21 Content}"
CREDENTIALS_FILE="${CREDENTIALS_FILE:-/home/${RUN_USER}/pressco21/content-browser-credentials.txt}"
ADMIN_CREDENTIALS_FILE="${ADMIN_CREDENTIALS_FILE:-/home/${RUN_USER}/pressco21/content-browser-admin-credentials.txt}"
UPLOAD_CREDENTIALS_FILE="${UPLOAD_CREDENTIALS_FILE:-/home/${RUN_USER}/pressco21/content-browser-upload-credentials.txt}"

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

ensure_packages() {
  apt-get update
  apt-get install -y curl
}

install_filebrowser() {
  if command -v filebrowser >/dev/null 2>&1; then
    return 0
  fi

  curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | bash
}

write_env_file() {
  install -d "$CONFIG_DIR"
  cat >"$ENV_FILE" <<EOF
RUN_USER="${RUN_USER}"
RUN_GROUP="${RUN_GROUP}"
BROWSER_ROOT="${BROWSER_ROOT}"
BROWSER_DB="${BROWSER_DB}"
BROWSER_ADDRESS="${BROWSER_ADDRESS}"
BROWSER_PORT="${BROWSER_PORT}"
BROWSER_USER="${BROWSER_USER}"
EOF
  chmod 640 "$ENV_FILE"
}

random_password() {
  local raw

  raw="$(openssl rand -hex 16)"
  printf '%s' "${raw:0:20}"
}

bootstrap_database() {
  local password

  install -d -o "$RUN_USER" -g "$RUN_GROUP" "$BROWSER_ROOT" "$BROWSER_DB_DIR"

  if [ -f "$BROWSER_DB" ]; then
    return 0
  fi

  password="$(random_password)"

  sudo -u "$RUN_USER" filebrowser config init \
    -d "$BROWSER_DB" \
    -a "$BROWSER_ADDRESS" \
    -p "$BROWSER_PORT" \
    -r "$BROWSER_ROOT"

  sudo -u "$RUN_USER" filebrowser config set \
    -d "$BROWSER_DB" \
    --branding.name "$BROWSER_BRANDING_NAME" \
    --disableExec \
    --locale ko

  sudo -u "$RUN_USER" filebrowser users add "$BROWSER_USER" "$password" \
    -d "$BROWSER_DB" \
    --perm.admin

  cat >"$ADMIN_CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser Admin
local_url=http://192.168.0.54:${BROWSER_PORT}/login
tailscale_url=http://pressco21-backup.tailee581a.ts.net:${BROWSER_PORT}/login
tailscale_ip_url=http://100.76.25.105:${BROWSER_PORT}/login
username=${BROWSER_USER}
password=${password}
scope=/
role=admin
EOF

  cat >"$CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser
admin_credentials=${ADMIN_CREDENTIALS_FILE}
upload_credentials=${UPLOAD_CREDENTIALS_FILE}
tailscale_url=http://pressco21-backup.tailee581a.ts.net:${BROWSER_PORT}/login
tailscale_ip_url=http://100.76.25.105:${BROWSER_PORT}/login
EOF

  chown "$RUN_USER:$RUN_GROUP" "$ADMIN_CREDENTIALS_FILE" "$CREDENTIALS_FILE"
  chmod 600 "$ADMIN_CREDENTIALS_FILE" "$CREDENTIALS_FILE"
}

write_service() {
  cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=PRESSCO21 Content Browser
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=${ENV_FILE}
User=${RUN_USER}
Group=${RUN_GROUP}
ExecStart=/usr/local/bin/filebrowser -d ${BROWSER_DB}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

enable_service() {
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.service"
}

print_summary() {
  cat <<EOF
설치 완료

- service: ${SERVICE_NAME}.service
- local url: http://192.168.0.54:${BROWSER_PORT}/login
- tailscale url: http://pressco21-backup.tailee581a.ts.net:${BROWSER_PORT}/login
- admin credentials: ${ADMIN_CREDENTIALS_FILE}
- upload credentials: ${UPLOAD_CREDENTIALS_FILE}
EOF
}

main() {
  ensure_root "$@"
  ensure_packages
  install_filebrowser
  write_env_file
  bootstrap_database
  write_service
  enable_service
  print_summary
}

main "$@"
