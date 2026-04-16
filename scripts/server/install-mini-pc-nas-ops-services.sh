#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  exec sudo "$0" "$@"
fi

install_script() {
  local source="$1"
  local target="$2"
  [ -f "$source" ] || {
    echo "missing script: $source" >&2
    exit 1
  }
  install -o root -g root -m 0755 "$source" "$target"
}

install -d -m 0755 /usr/local/bin /var/log/pressco21 /var/lib/pressco21

install_script "${SCRIPT_DIR}/mini-pc-smart-healthcheck.sh" /usr/local/bin/pressco21-smart-healthcheck.sh
install_script "${SCRIPT_DIR}/mini-pc-nas-config-backup.sh" /usr/local/bin/pressco21-nas-config-backup.sh
install_script "${SCRIPT_DIR}/mini-pc-nas-status.sh" /usr/local/bin/pressco21-nas-status

cat >/etc/systemd/system/pressco21-smart-healthcheck.service <<'EOF'
[Unit]
Description=PRESSCO21 SMART disk healthcheck
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pressco21-smart-healthcheck.sh
Nice=10
IOSchedulingClass=best-effort
EOF

cat >/etc/systemd/system/pressco21-smart-healthcheck.timer <<'EOF'
[Unit]
Description=Run PRESSCO21 SMART disk healthcheck every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:35:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat >/etc/systemd/system/pressco21-nas-config-backup.service <<'EOF'
[Unit]
Description=PRESSCO21 Mini PC NAS config backup
After=local-fs.target mnt-pressco21\x2dhdd.mount

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pressco21-nas-config-backup.sh
Nice=10
IOSchedulingClass=best-effort
EOF

cat >/etc/systemd/system/pressco21-nas-config-backup.timer <<'EOF'
[Unit]
Description=Run PRESSCO21 Mini PC NAS config backup daily

[Timer]
OnCalendar=*-*-* 02:20:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now pressco21-smart-healthcheck.timer
systemctl enable --now pressco21-nas-config-backup.timer

echo "NAS ops services installed."
systemctl list-timers --all | grep -E 'pressco21-(smart-healthcheck|nas-config-backup)' || true
