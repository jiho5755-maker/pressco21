#!/usr/bin/env bash
set -Eeuo pipefail

print_section() {
  printf '\n== %s ==\n' "$1"
}

print_section "Mini PC Storage Audit"
printf 'host: %s\n' "$(hostname)"
printf 'time: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"

print_section "Block Devices"
lsblk -e7 -o NAME,HOTPLUG,TRAN,SIZE,FSTYPE,LABEL,MOUNTPOINT,MODEL

print_section "External Device Summary"
lsblk -d -e7 -o NAME,HOTPLUG,TRAN,SIZE,MODEL,SERIAL | awk 'NR==1 || $2 == 1'

print_section "Filesystem UUIDs"
blkid 2>/dev/null || true

print_section "Mounted Filesystems"
df -hT

print_section "findmnt"
findmnt -rno TARGET,SOURCE,FSTYPE,OPTIONS | sort

print_section "Recommended Company Roots"
cat <<'EOF'
1. SSD work area
   target company folder: <ssd-mount>/PRESSCO21_CONTENT

2. HDD archive area
   target company folder: <hdd-mount>/PRESSCO21_BACKUP

3. If drives already contain personal files:
   - do not format
   - do not use the whole disk root
   - create company-only top-level folders

4. If a drive is APFS:
   - stop and inspect first
   - do not assume Ubuntu write support is safe enough for production use
EOF
