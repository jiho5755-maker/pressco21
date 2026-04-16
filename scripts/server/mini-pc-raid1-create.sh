#!/usr/bin/env bash
set -Eeuo pipefail

RAID_NAME="${RAID_NAME:-pressco21_raid1}"
RAID_DEVICE="${RAID_DEVICE:-/dev/md/${RAID_NAME}}"
MOUNT_POINT="${MOUNT_POINT:-/mnt/pressco21-raid}"
FS_LABEL="${FS_LABEL:-PRESSCO21_RAID1}"
DISK1="${DISK1:-}"
DISK2="${DISK2:-}"
CONFIRM="${I_UNDERSTAND_THIS_WIPES_DATA:-}"
ALLOW_PRODUCTION_DISK_WIPE="${ALLOW_PRODUCTION_DISK_WIPE:-}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo -E "$0" "$@"
  fi
}

real_disk() {
  local disk="$1"
  readlink -f "$disk"
}

has_mounted_children() {
  local disk="$1"
  lsblk -nr -o MOUNTPOINTS "$disk" | awk 'NF {found=1} END {exit found ? 0 : 1}'
}

protect_known_disk() {
  local disk="$1"
  local uuid

  while IFS= read -r uuid; do
    case "$uuid" in
      6d6fafdd-be4b-4d66-9b20-cc0cefb8338c|E655-3056|67BE-810A|FAE204FDE204C03D)
        if [ "$ALLOW_PRODUCTION_DISK_WIPE" != "YES" ]; then
          die "$disk contains a known production UUID ($uuid); set ALLOW_PRODUCTION_DISK_WIPE=YES only after data is copied elsewhere"
        fi
        log "WARNING: $disk contains known production UUID ($uuid), override accepted"
        ;;
    esac
  done < <(lsblk -nr -o UUID "$disk" | awk 'NF')
}

partition_path() {
  local disk="$1"
  local part

  part="$(lsblk -nr -o PATH "$disk" | sed -n '2p')"
  [ -n "$part" ] || die "partition not found for $disk"
  echo "$part"
}

main() {
  require_root "$@"

  command -v mdadm >/dev/null 2>&1 || die "mdadm is not installed"
  command -v mkfs.btrfs >/dev/null 2>&1 || die "btrfs-progs is not installed"
  command -v parted >/dev/null 2>&1 || die "parted is not installed"

  [ -n "$DISK1" ] || die "DISK1 is required, use a stable /dev/disk/by-id path"
  [ -n "$DISK2" ] || die "DISK2 is required, use a stable /dev/disk/by-id path"
  [ "$CONFIRM" = "YES" ] || die "set I_UNDERSTAND_THIS_WIPES_DATA=YES to continue"

  local d1 d2 p1 p2 fs_uuid array_line
  d1="$(real_disk "$DISK1")"
  d2="$(real_disk "$DISK2")"

  [ "$d1" != "$d2" ] || die "DISK1 and DISK2 resolve to the same device"
  [ -b "$d1" ] || die "not a block device: $DISK1 -> $d1"
  [ -b "$d2" ] || die "not a block device: $DISK2 -> $d2"
  [ "$(lsblk -dn -o TYPE "$d1")" = "disk" ] || die "$d1 is not a whole disk"
  [ "$(lsblk -dn -o TYPE "$d2")" = "disk" ] || die "$d2 is not a whole disk"

  has_mounted_children "$d1" && die "$d1 has mounted filesystems; unmount or choose another disk"
  has_mounted_children "$d2" && die "$d2 has mounted filesystems; unmount or choose another disk"
  protect_known_disk "$d1"
  protect_known_disk "$d2"

  log "THIS WILL WIPE BOTH DISKS:"
  lsblk -e7 -o NAME,TYPE,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS,MODEL,SERIAL "$d1" "$d2"

  log "creating GPT RAID partitions"
  parted -s "$d1" mklabel gpt mkpart primary 1MiB 100% set 1 raid on
  parted -s "$d2" mklabel gpt mkpart primary 1MiB 100% set 1 raid on
  partprobe "$d1" "$d2" || true
  udevadm settle

  p1="$(partition_path "$d1")"
  p2="$(partition_path "$d2")"

  log "creating mdadm RAID1: $RAID_DEVICE"
  mdadm --create "$RAID_DEVICE" \
    --metadata=1.2 \
    --level=1 \
    --raid-devices=2 \
    --name="$RAID_NAME" \
    "$p1" "$p2"

  udevadm settle
  log "creating btrfs filesystem: label=$FS_LABEL"
  mkfs.btrfs -f -L "$FS_LABEL" "$RAID_DEVICE"

  install -d -m 0755 "$MOUNT_POINT"
  fs_uuid="$(blkid -s UUID -o value "$RAID_DEVICE")"
  [ -n "$fs_uuid" ] || die "failed to read filesystem UUID from $RAID_DEVICE"

  if ! grep -q "UUID=${fs_uuid}" /etc/fstab; then
    printf 'UUID=%s %s btrfs defaults,noatime,compress=zstd:3,x-systemd.device-timeout=120 0 0\n' \
      "$fs_uuid" "$MOUNT_POINT" >>/etc/fstab
  fi

  mount "$MOUNT_POINT"
  install -d -o pressbackup -g pressbackup \
    "$MOUNT_POINT/PRESSCO21_BACKUP" \
    "$MOUNT_POINT/PRESSCO21_ARCHIVE" \
    "$MOUNT_POINT/PRESSCO21_SNAPSHOTS"

  array_line="$(mdadm --detail --scan "$RAID_DEVICE")"
  if [ -n "$array_line" ] && ! grep -Fq "$array_line" /etc/mdadm/mdadm.conf; then
    printf '%s\n' "$array_line" >>/etc/mdadm/mdadm.conf
    update-initramfs -u
  fi

  install -d -m 0755 /etc/pressco21
  cat >/etc/pressco21/raid1.env <<EOF
RAID_NAME="${RAID_NAME}"
RAID_DEVICE="${RAID_DEVICE}"
MOUNT_POINT="${MOUNT_POINT}"
FS_LABEL="${FS_LABEL}"
EOF

  log "RAID1 created and mounted"
  mdadm --detail "$RAID_DEVICE"
  btrfs filesystem usage "$MOUNT_POINT"
}

main "$@"
