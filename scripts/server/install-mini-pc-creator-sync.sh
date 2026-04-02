#!/usr/bin/env bash
set -Eeuo pipefail

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"

SSD_MOUNT="${SSD_MOUNT:-/mnt/pressco21-ssd}"
HDD_MOUNT="${HDD_MOUNT:-/mnt/pressco21-hdd}"
ACTIVE_ROOT="${ACTIVE_ROOT:-${SSD_MOUNT}/PRESSCO21_ACTIVE}"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-${HDD_MOUNT}/PRESSCO21_ARCHIVE}"
CONTENT_ROOT="${CONTENT_ROOT:-/srv/pressco21-content}"

EDITOR_SLUGS="${EDITOR_SLUGS:-}"
DESIGNER_SLUGS="${DESIGNER_SLUGS:-}"

CONFIG_DIR="${CONFIG_DIR:-/etc/pressco21}"
ENV_FILE="${CONFIG_DIR}/mini-pc-creator-sync.env"
INSTALL_PATH="${INSTALL_PATH:-/usr/local/bin/pressco21-creator-sync-layout.sh}"
LAYOUT_SERVICE="${LAYOUT_SERVICE:-pressco21-creator-sync-layout.service}"
SYNCTHING_SERVICE="${SYNCTHING_SERVICE:-syncthing@${RUN_USER}.service}"
SYNCTHING_CONFIG_DIR="${SYNCTHING_CONFIG_DIR:-/home/${RUN_USER}/.local/state/syncthing}"
SYNCTHING_CONFIG_FILE="${SYNCTHING_CONFIG_FILE:-${SYNCTHING_CONFIG_DIR}/config.xml}"

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

ensure_packages() {
  if command -v syncthing >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
    return 0
  fi

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y python3 syncthing
}

install_layout_script() {
  local source_path

  source_path="$(cd "$(dirname "$0")" && pwd)/mini-pc-creator-sync-layout.sh"
  install -m 755 "$source_path" "$INSTALL_PATH"
}

write_env_file() {
  install -d "$CONFIG_DIR"

  cat >"$ENV_FILE" <<EOF
RUN_USER="${RUN_USER}"
RUN_GROUP="${RUN_GROUP}"
SSD_MOUNT="${SSD_MOUNT}"
HDD_MOUNT="${HDD_MOUNT}"
ACTIVE_ROOT="${ACTIVE_ROOT}"
ARCHIVE_ROOT="${ARCHIVE_ROOT}"
CONTENT_ROOT="${CONTENT_ROOT}"
EDITOR_SLUGS="${EDITOR_SLUGS}"
DESIGNER_SLUGS="${DESIGNER_SLUGS}"
EOF

  chmod 640 "$ENV_FILE"
}

write_layout_service() {
  cat >"/etc/systemd/system/${LAYOUT_SERVICE}" <<EOF
[Unit]
Description=PRESSCO21 Creator Sync Layout
After=local-fs.target

[Service]
Type=oneshot
EnvironmentFile=${ENV_FILE}
ExecStart=${INSTALL_PATH}

[Install]
WantedBy=multi-user.target
EOF
}

enable_services() {
  systemctl daemon-reload
  systemctl enable --now "$LAYOUT_SERVICE"
  systemctl enable --now "$SYNCTHING_SERVICE"
}

wait_for_config() {
  local attempt
  local fallback_config="/home/${RUN_USER}/.config/syncthing/config.xml"

  for attempt in $(seq 1 20); do
    if [ -f "$SYNCTHING_CONFIG_FILE" ]; then
      return 0
    fi
    if [ -f "$fallback_config" ]; then
      SYNCTHING_CONFIG_FILE="$fallback_config"
      return 0
    fi
    sleep 1
  done

  echo "syncthing config not found: $SYNCTHING_CONFIG_FILE" >&2
  exit 1
}

normalize_syncthing_config() {
  systemctl stop "$SYNCTHING_SERVICE"

  python3 - "$SYNCTHING_CONFIG_FILE" <<'PY'
import sys
import xml.etree.ElementTree as ET

config_path = sys.argv[1]
tree = ET.parse(config_path)
root = tree.getroot()

for folder in list(root.findall("folder")):
    if folder.get("id") == "default":
        root.remove(folder)

gui = root.find("gui")
if gui is not None:
    address = gui.find("address")
    if address is not None:
        address.text = "127.0.0.1:8384"

options = root.find("options")
if options is not None:
    start_browser = options.find("startBrowser")
    if start_browser is not None:
        start_browser.text = "false"

tree.write(config_path, encoding="utf-8", xml_declaration=False)
PY

  chown "$RUN_USER:$RUN_GROUP" "$SYNCTHING_CONFIG_FILE"
  systemctl start "$SYNCTHING_SERVICE"
}

read_device_id() {
  python3 - "$SYNCTHING_CONFIG_FILE" <<'PY'
import sys
import xml.etree.ElementTree as ET

config_path = sys.argv[1]
root = ET.parse(config_path).getroot()
device = root.find("device")
print(device.get("id", "unknown"))
PY
}

print_summary() {
  local device_id="$1"

  cat <<EOF
creator sync install complete

- layout service: ${LAYOUT_SERVICE}
- syncthing service: ${SYNCTHING_SERVICE}
- syncthing device id: ${device_id}
- active root: ${ACTIVE_ROOT}
- archive root: ${ARCHIVE_ROOT}
- content view: ${CONTENT_ROOT}/active-sync
- publish queue: ${CONTENT_ROOT}/publish-queue

Next:
1. Pair creator devices with Syncthing
2. Set creator folders to send-only on creator PCs
3. Keep mini PC folders receive-only
EOF
}

main() {
  local device_id

  ensure_root "$@"
  ensure_packages
  install_layout_script
  write_env_file
  write_layout_service
  enable_services
  wait_for_config
  normalize_syncthing_config
  device_id="$(read_device_id)"
  print_summary "$device_id"
}

main "$@"
