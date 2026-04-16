#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_BACKUP_ROOT="${CURRENT_BACKUP_ROOT:-/srv/pressco21-backup-node}"
RAID_MOUNT="${RAID_MOUNT:-/mnt/pressco21-raid}"
RAID_BACKUP_ROOT="${RAID_BACKUP_ROOT:-${RAID_MOUNT}/PRESSCO21_BACKUP/backup-node}"
APPLY="${APPLY:-0}"
TIMESTAMP="${TIMESTAMP:-$(date '+%Y%m%d_%H%M%S')}"
RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"

BACKUP_UNITS=(
  pressco21-mini-pc-backup.timer
  pressco21-mini-pc-backup.service
  pressco21-mini-pc-backup-healthcheck.timer
  pressco21-mini-pc-backup-healthcheck.service
  pressco21-backup-verify.timer
  pressco21-backup-verify.service
  pressco21-backup-ext4-mirror.timer
  pressco21-backup-ext4-mirror.service
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
    exec sudo -E "$0" "$@"
  fi
}

main() {
  require_root "$@"

  [ -e "$CURRENT_BACKUP_ROOT" ] || { echo "missing current root: $CURRENT_BACKUP_ROOT" >&2; exit 1; }
  mountpoint -q "$RAID_MOUNT" || { echo "RAID mount is not active: $RAID_MOUNT" >&2; exit 1; }

  local source_root old_link_target backup_link
  source_root="$(readlink -f "$CURRENT_BACKUP_ROOT")"
  [ -d "$source_root" ] || { echo "source is not a directory: $source_root" >&2; exit 1; }

  cat <<EOF
Backup root migration plan

- current path: ${CURRENT_BACKUP_ROOT}
- current physical source: ${source_root}
- RAID target: ${RAID_BACKUP_ROOT}
- mode: $( [ "$APPLY" = "1" ] && echo apply || echo dry-run )

This copies the current backup tree into the RAID volume, then points
${CURRENT_BACKUP_ROOT} at the RAID copy.
EOF

  run_cmd install -d -o "$RUN_USER" -g "$RUN_GROUP" "$RAID_BACKUP_ROOT"

  local unit
  for unit in "${BACKUP_UNITS[@]}"; do
    if systemctl list-unit-files "$unit" >/dev/null 2>&1; then
      run_cmd systemctl stop "$unit"
    fi
  done

  run_cmd rsync -a --delete --partial "${source_root}/" "${RAID_BACKUP_ROOT}/"

  if [ -L "$CURRENT_BACKUP_ROOT" ]; then
    old_link_target="$(readlink "$CURRENT_BACKUP_ROOT")"
    backup_link="${CURRENT_BACKUP_ROOT}.symlink-${TIMESTAMP}"
    run_cmd ln -s "$old_link_target" "$backup_link"
    run_cmd ln -sfn "$RAID_BACKUP_ROOT" "$CURRENT_BACKUP_ROOT"
  else
    run_cmd mv "$CURRENT_BACKUP_ROOT" "${CURRENT_BACKUP_ROOT}.pre-raid-${TIMESTAMP}"
    run_cmd ln -s "$RAID_BACKUP_ROOT" "$CURRENT_BACKUP_ROOT"
  fi

  run_cmd install -d -m 0755 \
    /etc/systemd/system/pressco21-mini-pc-backup.service.d \
    /etc/systemd/system/pressco21-mini-pc-backup-healthcheck.service.d \
    /etc/systemd/system/pressco21-backup-verify.service.d \
    /etc/systemd/system/pressco21-backup-ext4-mirror.service.d

  for unit in \
    pressco21-mini-pc-backup.service \
    pressco21-mini-pc-backup-healthcheck.service \
    pressco21-backup-verify.service \
    pressco21-backup-ext4-mirror.service; do
    run_cmd sh -c "cat > /etc/systemd/system/${unit}.d/20-pressco21-raid-mount.conf <<'DROPIN'
[Unit]
RequiresMountsFor=/mnt/pressco21-raid
After=mnt-pressco21\\x2draid.mount
DROPIN"
  done

  run_cmd systemctl daemon-reload
  for unit in "${BACKUP_UNITS[@]}"; do
    case "$unit" in
      *.timer)
        if systemctl list-unit-files "$unit" >/dev/null 2>&1; then
          run_cmd systemctl start "$unit"
        fi
        ;;
    esac
  done

  log "migration complete"
}

main "$@"
