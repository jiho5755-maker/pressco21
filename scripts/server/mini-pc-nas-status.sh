#!/usr/bin/env bash
set -Eeuo pipefail

section() {
  printf '\n== %s ==\n' "$1"
}

section "PRESSCO21 Mini PC NAS Status"
printf 'host: %s\n' "$(hostname)"
printf 'time: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
printf 'uptime: %s\n' "$(uptime -p)"

section "Failed Units"
systemctl --failed --no-pager || true

section "Core Services"
for unit in \
  docker.service \
  nextcloud-oracle-reverse-tunnel.service \
  pressco21-content-browser.service \
  syncthing@pressbackup.service \
  pressco21-mini-pc-backup.timer \
  pressco21-mini-pc-backup-healthcheck.timer \
  pressco21-disk-alert.timer \
  pressco21-smart-healthcheck.timer \
  pressco21-nas-config-backup.timer \
  pressco21-raid-healthcheck.timer \
  pressco21-rtc-wake.timer; do
  printf '%-48s %s\n' "$unit" "$(systemctl is-active "$unit" 2>/dev/null || true)"
done

section "Nextcloud"
curl -fsS http://127.0.0.1:18080/status.php 2>/dev/null || true
printf '\n'
docker ps --format '{{.Names}} {{.Status}}' | grep -E 'nextcloud|NAME' || true

section "Storage"
df -hT / /mnt/pressco21-ssd /mnt/pressco21-hdd /srv/pressco21-backup-ext4-mirror 2>/dev/null || true
findmnt -T /mnt/pressco21-ssd -o TARGET,SOURCE,FSTYPE,OPTIONS --noheadings 2>/dev/null || true
findmnt -T /mnt/pressco21-hdd -o TARGET,SOURCE,FSTYPE,OPTIONS --noheadings 2>/dev/null || true

section "RAID"
cat /proc/mdstat 2>/dev/null || true
if [ -e /dev/md/pressco21_raid1 ]; then
  mdadm --detail /dev/md/pressco21_raid1 2>/dev/null || true
  btrfs filesystem usage /mnt/pressco21-raid 2>/dev/null || true
else
  echo "RAID not configured yet"
fi

section "Backup"
tail -n 8 /var/log/pressco21/mini-pc-backup-healthcheck.log 2>/dev/null || true
tail -n 4 /var/log/pressco21/backup-ext4-mirror.log 2>/dev/null || true
du -sh /srv/pressco21-backup-node/oracle /srv/pressco21-backup-ext4-mirror/oracle 2>/dev/null || true

section "SMART"
tail -n 12 /var/log/pressco21/smart-healthcheck.log 2>/dev/null || true

section "Next Timers"
systemctl list-timers --all --no-pager | grep -E 'pressco21|backup|raid|smart|nas' || true
