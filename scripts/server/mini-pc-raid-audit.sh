#!/usr/bin/env bash
set -Eeuo pipefail

print_section() {
  printf '\n== %s ==\n' "$1"
}

print_section "PRESSCO21 RAID Readiness Audit"
printf 'host: %s\n' "$(hostname)"
printf 'time: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"

print_section "Block Devices"
lsblk -e7 -o NAME,TYPE,HOTPLUG,TRAN,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS,MODEL,SERIAL

print_section "Stable Disk IDs"
find /dev/disk/by-id -maxdepth 1 -type l \
  ! -name '*-part*' \
  -printf '%f -> %l\n' 2>/dev/null | sort || true

print_section "Mounted Filesystems"
findmnt -rno TARGET,SOURCE,FSTYPE,OPTIONS | sort

print_section "Existing md RAID"
cat /proc/mdstat 2>/dev/null || true
if command -v mdadm >/dev/null 2>&1; then
  mdadm --detail --scan 2>/dev/null || true
else
  echo "mdadm not installed"
fi

print_section "Existing btrfs"
if command -v btrfs >/dev/null 2>&1; then
  btrfs filesystem show 2>/dev/null || true
else
  echo "btrfs-progs not installed"
fi

print_section "SMART Scan"
if command -v smartctl >/dev/null 2>&1; then
  smartctl --scan-open 2>/dev/null || true
else
  echo "smartmontools not installed"
fi

print_section "Candidate Rules"
cat <<'EOF'
Use two NEW or fully backed-up disks for RAID1.

Do not use these existing production disks unless their data has already been
copied elsewhere and you explicitly intend to wipe them:
- OS NVMe/root disk
- /mnt/pressco21-ssd
- /mnt/pressco21-hdd

Recommended target:
- two same-size disks, preferably 4TB or larger
- stable USB DAS/JBOD enclosure or direct self-powered drives
- Linux software RAID1 using mdadm
- btrfs filesystem on top for checksums, scrub, and future snapshots
EOF
