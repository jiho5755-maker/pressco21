#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_TARGET_ROOT="${BACKUP_TARGET_ROOT:-}"
CONTENT_TARGET_ROOT="${CONTENT_TARGET_ROOT:-}"
APPLY="${APPLY:-0}"
RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"
TIMESTAMP="${TIMESTAMP:-$(date '+%Y%m%d_%H%M%S')}"

CURRENT_BACKUP_ROOT="${CURRENT_BACKUP_ROOT:-/srv/pressco21-backup-node}"
CURRENT_CONTENT_ROOT="${CURRENT_CONTENT_ROOT:-/srv/pressco21-content}"

BACKUP_SERVICES=(
  pressco21-mini-pc-backup.timer
  pressco21-mini-pc-backup.service
  pressco21-mini-pc-backup-healthcheck.timer
  pressco21-mini-pc-backup-healthcheck.service
)

CONTENT_SERVICES=(
  pressco21-content-curator.timer
  pressco21-content-curator.service
  pressco21-content-browser.service
)

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_cmd() {
  if [ "$APPLY" = "1" ]; then
    "$@"
  else
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
  fi
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

require_inputs() {
  if [ -z "$BACKUP_TARGET_ROOT" ] || [ -z "$CONTENT_TARGET_ROOT" ]; then
    echo "BACKUP_TARGET_ROOT and CONTENT_TARGET_ROOT are required." >&2
    exit 1
  fi
}

ensure_target_dir() {
  local dir="$1"

  if [ ! -d "$dir" ]; then
    echo "Target directory not found: $dir" >&2
    exit 1
  fi
}

ensure_not_symlink() {
  local dir="$1"

  if [ -L "$dir" ]; then
    echo "Current path is already a symlink: $dir" >&2
    exit 1
  fi
}

stop_services() {
  local unit

  for unit in "${CONTENT_SERVICES[@]}" "${BACKUP_SERVICES[@]}"; do
    if systemctl list-unit-files "$unit" >/dev/null 2>&1; then
      run_cmd systemctl stop "$unit"
    fi
  done
}

start_services() {
  local unit

  for unit in "${BACKUP_SERVICES[@]}"; do
    if systemctl list-unit-files "$unit" >/dev/null 2>&1; then
      case "$unit" in
        *.timer) run_cmd systemctl start "$unit" ;;
      esac
    fi
  done

  for unit in "${CONTENT_SERVICES[@]}"; do
    if systemctl list-unit-files "$unit" >/dev/null 2>&1; then
      case "$unit" in
        pressco21-content-browser.service|*.timer) run_cmd systemctl start "$unit" ;;
      esac
    fi
  done
}

prepare_targets() {
  run_cmd install -d -o "$RUN_USER" -g "$RUN_GROUP" "$BACKUP_TARGET_ROOT" "$CONTENT_TARGET_ROOT"
}

sync_tree() {
  local source_root="$1"
  local target_root="$2"

  run_cmd rsync -a --info=progress2 "${source_root}/" "${target_root}/"
}

switch_path() {
  local current_root="$1"
  local target_root="$2"
  local backup_root="${current_root}.internal-${TIMESTAMP}"

  if [ ! -d "$current_root" ]; then
    echo "Current root not found: $current_root" >&2
    exit 1
  fi

  run_cmd mv "$current_root" "$backup_root"
  run_cmd ln -s "$target_root" "$current_root"
}

print_plan() {
  cat <<EOF
Storage migration plan

- backup target: ${BACKUP_TARGET_ROOT}
- content target: ${CONTENT_TARGET_ROOT}
- current backup root: ${CURRENT_BACKUP_ROOT}
- current content root: ${CURRENT_CONTENT_ROOT}
- mode: $( [ "$APPLY" = "1" ] && echo "apply" || echo "dry-run" )

This script will:
1. stop backup/content services
2. rsync current data into the target folders
3. rename current /srv roots to *.internal-${TIMESTAMP}
4. replace them with symlinks
5. restart timers and content browser
EOF
}

main() {
  require_root "$@"
  require_inputs
  ensure_target_dir "$BACKUP_TARGET_ROOT"
  ensure_target_dir "$CONTENT_TARGET_ROOT"
  ensure_not_symlink "$CURRENT_BACKUP_ROOT"
  ensure_not_symlink "$CURRENT_CONTENT_ROOT"

  print_plan
  prepare_targets
  stop_services
  sync_tree "$CURRENT_BACKUP_ROOT" "$BACKUP_TARGET_ROOT"
  sync_tree "$CURRENT_CONTENT_ROOT" "$CONTENT_TARGET_ROOT"
  switch_path "$CURRENT_BACKUP_ROOT" "$BACKUP_TARGET_ROOT"
  switch_path "$CURRENT_CONTENT_ROOT" "$CONTENT_TARGET_ROOT"
  start_services

  log "storage migration complete"
  log "backup root -> $CURRENT_BACKUP_ROOT"
  log "content root -> $CURRENT_CONTENT_ROOT"
}

main "$@"
