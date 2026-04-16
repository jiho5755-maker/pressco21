#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_ROOTS="${BACKUP_ROOTS:-/srv/pressco21-backup-ext4-mirror/system-config /srv/pressco21-backup-node/system-config}"
RETENTION_DAYS="${RETENTION_DAYS:-60}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/nas-config-backup.log}"
NODE_NAME="${NODE_NAME:-$(hostname)}"

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

add_if_exists() {
  local path="$1"
  [ -e "$path" ] && printf '%s\n' "$path"
}

main() {
  local timestamp tmp_list dest archive created=0
  timestamp="$(date '+%Y%m%d_%H%M%S')"
  tmp_list="$(mktemp)"
  trap "rm -f '$tmp_list'" EXIT

  {
    add_if_exists /etc/fstab
    add_if_exists /etc/pressco21
    add_if_exists /etc/mdadm/mdadm.conf
    add_if_exists /etc/default/pressco21-rtc-wake
    add_if_exists /etc/systemd/system/nextcloud-oracle-reverse-tunnel.service
    find /etc/systemd/system -maxdepth 3 \( -name 'pressco21*' -o -name 'mnt-pressco21*' \) -print 2>/dev/null || true
    find /usr/local/bin /usr/local/sbin -maxdepth 1 -name 'pressco21*' -print 2>/dev/null || true
    add_if_exists /home/pressbackup/pressco21/nextcloud/docker-compose.yml
    add_if_exists /home/pressbackup/pressco21/nextcloud/.env
    add_if_exists /home/pressbackup/pressco21/nextcloud-admin-credentials.txt
    add_if_exists /home/pressbackup/pressco21/nextcloud-company-credentials.txt
    add_if_exists /home/pressbackup/pressco21/nextcloud-user-credentials.txt
    add_if_exists /home/pressbackup/.ssh/oracle-nextcloud-tunnel
    add_if_exists /home/pressbackup/.ssh/oracle-nextcloud-tunnel.pub
  } | sort -u >"$tmp_list"

  for dest in $BACKUP_ROOTS; do
    [ -n "$dest" ] || continue
    mkdir -p "$dest"
    chmod 700 "$dest"
    archive="${dest}/nas-config-${NODE_NAME}-${timestamp}.tar.gz"
    tar --ignore-failed-read --warning=no-file-changed -czf "$archive" --files-from "$tmp_list" 2>/tmp/pressco21-nas-config-tar.err || {
      cat /tmp/pressco21-nas-config-tar.err >&2 || true
      exit 1
    }
    rm -f /tmp/pressco21-nas-config-tar.err
    chmod 600 "$archive"
    find "$dest" -type f -name "nas-config-${NODE_NAME}-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
    log "config backup written: $archive"
    created=$((created + 1))
  done

  [ "$created" -gt 0 ] || {
    log "no config backup destinations configured"
    exit 1
  }
}

main "$@"
