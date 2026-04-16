#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_SCRIPT="${SCRIPT_DIR}/mini-pc-raid-healthcheck.sh"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  exec sudo "$0" "$@"
fi

[ -f "$HEALTH_SCRIPT" ] || {
  echo "missing script: $HEALTH_SCRIPT" >&2
  exit 1
}

install -d -m 0755 /usr/local/bin /var/log/pressco21 /var/lib/pressco21 /etc/systemd/system
install -o root -g root -m 0755 "$HEALTH_SCRIPT" /usr/local/bin/pressco21-raid-healthcheck.sh

cat >/etc/systemd/system/pressco21-raid-healthcheck.service <<'EOF'
[Unit]
Description=PRESSCO21 RAID healthcheck
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pressco21-raid-healthcheck.sh
Nice=10
IOSchedulingClass=best-effort
EOF

cat >/etc/systemd/system/pressco21-raid-healthcheck.timer <<'EOF'
[Unit]
Description=Run PRESSCO21 RAID healthcheck every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:20:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat >/etc/systemd/system/pressco21-raid-scrub.service <<'EOF'
[Unit]
Description=PRESSCO21 btrfs scrub on RAID volume
ConditionPathIsMountPoint=/mnt/pressco21-raid

[Service]
Type=oneshot
ExecStart=/usr/bin/btrfs scrub start -Bd /mnt/pressco21-raid
Nice=10
IOSchedulingClass=best-effort
TimeoutStartSec=1d
EOF

cat >/etc/systemd/system/pressco21-raid-scrub.timer <<'EOF'
[Unit]
Description=Run PRESSCO21 btrfs scrub monthly

[Timer]
OnCalendar=Sun *-*-01..07 04:30:00
RandomizedDelaySec=900
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now pressco21-raid-healthcheck.timer
systemctl enable --now pressco21-raid-scrub.timer

echo "RAID services installed."
systemctl list-timers --all | grep -E 'pressco21-raid-(healthcheck|scrub)' || true
