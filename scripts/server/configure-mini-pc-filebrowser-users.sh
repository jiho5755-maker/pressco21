#!/usr/bin/env bash
set -Eeuo pipefail

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"
WORK_DIR="${WORK_DIR:-/home/${RUN_USER}/pressco21}"
DB_PATH="${DB_PATH:-/var/lib/pressco21-content-browser/filebrowser.db}"
CONTENT_ROOT="${CONTENT_ROOT:-/srv/pressco21-content}"
ADMIN_SCOPE="${ADMIN_SCOPE:-/}"
INBOX_SCOPE="${INBOX_SCOPE:-/inbox}"
LIBRARY_SCOPE="${LIBRARY_SCOPE:-/worker-library}"
WORKER_LIBRARY_ROOT="${WORKER_LIBRARY_ROOT:-${CONTENT_ROOT}/worker-library}"
MINIMUM_PASSWORD_LENGTH="${MINIMUM_PASSWORD_LENGTH:-}"
BROWSER_SERVICE="${BROWSER_SERVICE:-pressco21-content-browser.service}"

ADMIN_USER="${ADMIN_USER:-pressco21}"
UPLOAD_USER="${UPLOAD_USER:-pressco21-upload}"
LIBRARY_USER="${LIBRARY_USER:-pressco21-library}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
UPLOAD_PASSWORD="${UPLOAD_PASSWORD:-}"
LIBRARY_PASSWORD="${LIBRARY_PASSWORD:-}"

ADMIN_CREDENTIALS_FILE="${ADMIN_CREDENTIALS_FILE:-${WORK_DIR}/content-browser-admin-credentials.txt}"
UPLOAD_CREDENTIALS_FILE="${UPLOAD_CREDENTIALS_FILE:-${WORK_DIR}/content-browser-upload-credentials.txt}"
LIBRARY_CREDENTIALS_FILE="${LIBRARY_CREDENTIALS_FILE:-${WORK_DIR}/content-browser-library-credentials.txt}"
LEGACY_CREDENTIALS_FILE="${LEGACY_CREDENTIALS_FILE:-${WORK_DIR}/content-browser-credentials.txt}"

LOCAL_URL="${LOCAL_URL:-http://192.168.0.54:8090/login}"
TAILSCALE_URL="${TAILSCALE_URL:-http://pressco21-backup.tailee581a.ts.net:8090/login}"
TAILSCALE_IP_URL="${TAILSCALE_IP_URL:-http://100.76.25.105:8090/login}"

random_password() {
  openssl rand -hex 16 | cut -c1-20
}

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

ensure_requirements() {
  if ! command -v filebrowser >/dev/null 2>&1; then
    echo "filebrowser is not installed" >&2
    exit 1
  fi

  if [ ! -f "$DB_PATH" ]; then
    echo "filebrowser database not found: $DB_PATH" >&2
    exit 1
  fi

  install -d -o "$RUN_USER" -g "$RUN_GROUP" "$WORK_DIR"
}

ensure_symlink() {
  local target="$1"
  local link_path="$2"

  if [ -L "$link_path" ]; then
    ln -sfn "$target" "$link_path"
    return 0
  fi

  if [ -e "$link_path" ]; then
    echo "path already exists and is not a symlink: $link_path" >&2
    exit 1
  fi

  ln -s "$target" "$link_path"
}

ensure_worker_library() {
  install -d -o "$RUN_USER" -g "$RUN_GROUP" "$WORKER_LIBRARY_ROOT"
  ensure_symlink "${CONTENT_ROOT}/active-sync" "${WORKER_LIBRARY_ROOT}/active-sync"
  ensure_symlink "${CONTENT_ROOT}/archive-sync" "${WORKER_LIBRARY_ROOT}/archive-sync"
  ensure_symlink "${CONTENT_ROOT}/company-hub" "${WORKER_LIBRARY_ROOT}/company-hub"
  ensure_symlink "${CONTENT_ROOT}/legacy-ssd-by-role" "${WORKER_LIBRARY_ROOT}/legacy-ssd-by-role"
  ensure_symlink "${CONTENT_ROOT}/publish-ready" "${WORKER_LIBRARY_ROOT}/publish-ready"
  ensure_symlink "${CONTENT_ROOT}/publish-minio-ready" "${WORKER_LIBRARY_ROOT}/publish-minio-ready"
}

configure_password_policy() {
  if [ -z "$MINIMUM_PASSWORD_LENGTH" ]; then
    return 0
  fi

  sudo -u "$RUN_USER" filebrowser config set \
    -d "$DB_PATH" \
    --minimumPasswordLength "$MINIMUM_PASSWORD_LENGTH" >/dev/null
}

stop_browser_service() {
  if systemctl list-unit-files "$BROWSER_SERVICE" >/dev/null 2>&1; then
    systemctl stop "$BROWSER_SERVICE"
  fi
}

start_browser_service() {
  if systemctl list-unit-files "$BROWSER_SERVICE" >/dev/null 2>&1; then
    systemctl start "$BROWSER_SERVICE"
  fi
}

on_exit() {
  start_browser_service || true
}

upsert_admin_user() {
  if [ -n "$ADMIN_PASSWORD" ]; then
    if sudo -u "$RUN_USER" filebrowser users update "$ADMIN_USER" -d "$DB_PATH" -p "$ADMIN_PASSWORD" --perm.admin >/dev/null 2>&1; then
      return 0
    fi

    sudo -u "$RUN_USER" filebrowser users add "$ADMIN_USER" "$ADMIN_PASSWORD" \
      -d "$DB_PATH" \
      --perm.admin \
      --locale ko >/dev/null
    return 0
  fi

  if sudo -u "$RUN_USER" filebrowser users update "$ADMIN_USER" -d "$DB_PATH" --perm.admin >/dev/null 2>&1; then
    return 0
  fi

  ADMIN_PASSWORD="$(random_password)"
  sudo -u "$RUN_USER" filebrowser users add "$ADMIN_USER" "$ADMIN_PASSWORD" \
    -d "$DB_PATH" \
    --perm.admin \
    --locale ko >/dev/null
}

upsert_upload_user() {
  if [ -n "$UPLOAD_PASSWORD" ]; then
    if sudo -u "$RUN_USER" filebrowser users update "$UPLOAD_USER" \
      -d "$DB_PATH" \
      -p "$UPLOAD_PASSWORD" \
      --scope "$INBOX_SCOPE" \
      --locale ko \
      --perm.create=true \
      --perm.modify=true \
      --perm.rename=true \
      --perm.download=true \
      --perm.delete=false \
      --perm.execute=false \
      --perm.share=false >/dev/null 2>&1; then
      return 0
    fi

    sudo -u "$RUN_USER" filebrowser users add "$UPLOAD_USER" "$UPLOAD_PASSWORD" \
      -d "$DB_PATH" \
      --scope "$INBOX_SCOPE" \
      --locale ko \
      --perm.create=true \
      --perm.modify=true \
      --perm.rename=true \
      --perm.download=true \
      --perm.delete=false \
      --perm.execute=false \
      --perm.share=false >/dev/null
    return 0
  fi

  if sudo -u "$RUN_USER" filebrowser users update "$UPLOAD_USER" \
    -d "$DB_PATH" \
    --scope "$INBOX_SCOPE" \
    --locale ko \
    --perm.create=true \
    --perm.modify=true \
    --perm.rename=true \
    --perm.download=true \
    --perm.delete=false \
    --perm.execute=false \
    --perm.share=false >/dev/null 2>&1; then
    return 0
  fi

  UPLOAD_PASSWORD="$(random_password)"
  sudo -u "$RUN_USER" filebrowser users add "$UPLOAD_USER" "$UPLOAD_PASSWORD" \
    -d "$DB_PATH" \
    --scope "$INBOX_SCOPE" \
    --locale ko \
    --perm.create=true \
    --perm.modify=true \
    --perm.rename=true \
    --perm.download=true \
    --perm.delete=false \
    --perm.execute=false \
    --perm.share=false >/dev/null
}

upsert_library_user() {
  if [ -n "$LIBRARY_PASSWORD" ]; then
    if sudo -u "$RUN_USER" filebrowser users update "$LIBRARY_USER" \
      -d "$DB_PATH" \
      -p "$LIBRARY_PASSWORD" \
      --scope "$LIBRARY_SCOPE" \
      --locale ko \
      --perm.create=false \
      --perm.modify=false \
      --perm.rename=false \
      --perm.download=true \
      --perm.delete=false \
      --perm.execute=false \
      --perm.share=false >/dev/null 2>&1; then
      return 0
    fi

    sudo -u "$RUN_USER" filebrowser users add "$LIBRARY_USER" "$LIBRARY_PASSWORD" \
      -d "$DB_PATH" \
      --scope "$LIBRARY_SCOPE" \
      --locale ko \
      --perm.create=false \
      --perm.modify=false \
      --perm.rename=false \
      --perm.download=true \
      --perm.delete=false \
      --perm.execute=false \
      --perm.share=false >/dev/null
    return 0
  fi

  if sudo -u "$RUN_USER" filebrowser users update "$LIBRARY_USER" \
    -d "$DB_PATH" \
    --scope "$LIBRARY_SCOPE" \
    --locale ko \
    --perm.create=false \
    --perm.modify=false \
    --perm.rename=false \
    --perm.download=true \
    --perm.delete=false \
    --perm.execute=false \
    --perm.share=false >/dev/null 2>&1; then
    return 0
  fi

  LIBRARY_PASSWORD="$(random_password)"
  sudo -u "$RUN_USER" filebrowser users add "$LIBRARY_USER" "$LIBRARY_PASSWORD" \
    -d "$DB_PATH" \
    --scope "$LIBRARY_SCOPE" \
    --locale ko \
    --perm.create=false \
    --perm.modify=false \
    --perm.rename=false \
    --perm.download=true \
    --perm.delete=false \
    --perm.execute=false \
    --perm.share=false >/dev/null
}

write_credentials_files() {
  if [ -n "$ADMIN_PASSWORD" ]; then
    cat >"$ADMIN_CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser Admin
local_url=${LOCAL_URL}
tailscale_url=${TAILSCALE_URL}
tailscale_ip_url=${TAILSCALE_IP_URL}
username=${ADMIN_USER}
password=${ADMIN_PASSWORD}
scope=${ADMIN_SCOPE}
role=admin
EOF
  fi

  if [ -n "$UPLOAD_PASSWORD" ]; then
    cat >"$UPLOAD_CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser Upload
local_url=${LOCAL_URL}
tailscale_url=${TAILSCALE_URL}
tailscale_ip_url=${TAILSCALE_IP_URL}
username=${UPLOAD_USER}
password=${UPLOAD_PASSWORD}
scope=${INBOX_SCOPE}
role=upload-only
EOF
  fi

  if [ -n "$LIBRARY_PASSWORD" ]; then
    cat >"$LIBRARY_CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser Library
local_url=${LOCAL_URL}
tailscale_url=${TAILSCALE_URL}
tailscale_ip_url=${TAILSCALE_IP_URL}
username=${LIBRARY_USER}
password=${LIBRARY_PASSWORD}
scope=${LIBRARY_SCOPE}
role=download-only
EOF
  fi

  cat >"$LEGACY_CREDENTIALS_FILE" <<EOF
PRESSCO21 Content Browser
admin_credentials=${ADMIN_CREDENTIALS_FILE}
upload_credentials=${UPLOAD_CREDENTIALS_FILE}
library_credentials=${LIBRARY_CREDENTIALS_FILE}
tailscale_url=${TAILSCALE_URL}
tailscale_ip_url=${TAILSCALE_IP_URL}
EOF

  chown "$RUN_USER:$RUN_GROUP" "$LEGACY_CREDENTIALS_FILE"
  chmod 600 "$LEGACY_CREDENTIALS_FILE"

  for path in "$ADMIN_CREDENTIALS_FILE" "$UPLOAD_CREDENTIALS_FILE" "$LIBRARY_CREDENTIALS_FILE"; do
    if [ -f "$path" ]; then
      chown "$RUN_USER:$RUN_GROUP" "$path"
      chmod 600 "$path"
    fi
  done
}

print_summary() {
  cat <<EOF
configured filebrowser users

- admin user: ${ADMIN_USER}
- upload user: ${UPLOAD_USER}
- library user: ${LIBRARY_USER}
- admin credentials: ${ADMIN_CREDENTIALS_FILE}
- upload credentials: ${UPLOAD_CREDENTIALS_FILE}
- library credentials: ${LIBRARY_CREDENTIALS_FILE}
EOF
}

main() {
  ensure_root "$@"
  ensure_requirements
  trap on_exit EXIT

  stop_browser_service
  configure_password_policy
  ensure_worker_library
  upsert_admin_user
  upsert_upload_user
  upsert_library_user
  write_credentials_files
  print_summary
}

main "$@"
