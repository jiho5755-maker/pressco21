#!/usr/bin/env bash
set -euo pipefail

NC_CONTAINER="${NC_CONTAINER:-pressco21-nextcloud-app}"
UPLOADS_ROOT="${UPLOADS_ROOT:-/home/pressbackup/pressco21/nextcloud/shared}"
ACTIVE_ROOT="${ACTIVE_ROOT:-/mnt/pressco21-ssd/PRESSCO21_ACTIVE}"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-/mnt/pressco21-hdd/PRESSCO21_ARCHIVE}"
INTERNAL_ROOT="${INTERNAL_ROOT:-$ARCHIVE_ROOT/_NAS_INTERNAL}"
EMPLOYEE_GROUP="${EMPLOYEE_GROUP:-employee}"
ADMIN_GROUP="${ADMIN_GROUP:-admin}"

run_occ() {
  docker exec -u www-data "$NC_CONTAINER" php occ "$@"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

mount_id_by_point() {
  local mount_point="$1"
  python3 - "$mount_point" <<'PY'
import json
import subprocess
import sys

mount_point = sys.argv[1]
raw = subprocess.check_output([
    "docker", "exec", "-u", "www-data", "pressco21-nextcloud-app",
    "php", "occ", "files_external:list", "--output=json"
], text=True)
data = json.loads(raw)
for item in data:
    if item.get("mount_point") == mount_point:
        print(item["mount_id"])
        break
PY
}

ensure_group() {
  local group="$1"
  if ! run_occ group:info "$group" >/dev/null 2>&1; then
    run_occ group:add "$group" >/dev/null
  fi
}

ensure_dir_www() {
  local path="$1"
  sudo mkdir -p "$path"
  sudo chown -R 33:33 "$path"
  sudo chmod -R 775 "$path"
}

ensure_dir_pressbackup() {
  local path="$1"
  sudo mkdir -p "$path"
  sudo chown -R pressbackup:pressbackup "$path"
  sudo chmod -R 775 "$path"
}

ensure_mount() {
  local mount_point="$1"
  local datadir="$2"
  local group="$3"
  local readonly="$4"
  local existing

  existing="$(mount_id_by_point "$mount_point" || true)"
  if [[ -z "$existing" ]]; then
    run_occ files_external:create "$mount_point" local null::null -c "datadir=$datadir" >/dev/null
    existing="$(mount_id_by_point "$mount_point")"
  else
    run_occ files_external:config "$existing" datadir "$datadir" >/dev/null
  fi

  run_occ files_external:applicable "$existing" --remove-all >/dev/null
  run_occ files_external:applicable "$existing" --add-group "$group" >/dev/null
  run_occ files_external:option "$existing" enable_sharing false >/dev/null
  run_occ files_external:option "$existing" readonly "$readonly" >/dev/null
  echo "$mount_point -> $datadir (group=$group readonly=$readonly id=$existing)"
}

ensure_nextcloud_layout() {
  ensure_group "$EMPLOYEE_GROUP"
  ensure_group "$ADMIN_GROUP"

  ensure_dir_www "$UPLOADS_ROOT/employee-uploads/직원업로드"
  ensure_dir_www "$UPLOADS_ROOT/employee-uploads/관리자검토"
  ensure_dir_www "$UPLOADS_ROOT/employee-uploads/분류실패"

  ensure_dir_www "$UPLOADS_ROOT/library/work-guides/자주묻는질문"
  ensure_dir_www "$UPLOADS_ROOT/library/work-guides/표준답변"
  ensure_dir_www "$UPLOADS_ROOT/library/work-guides/업무체크리스트"
  ensure_dir_www "$UPLOADS_ROOT/library/work-guides/AI_Wiki_공식요약본"

  ensure_dir_www "$UPLOADS_ROOT/admin-vault/sales-finance"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/tax-evidence"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/contracts-legal"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/hr-confidential"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/customer-personal-info"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/accounts-permissions"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/ai-wiki-admin-source"
  ensure_dir_www "$UPLOADS_ROOT/admin-vault/discard-hold"

  ensure_mount "/00_INBOX" "/srv/pressco21-uploads/employee-uploads" "$EMPLOYEE_GROUP" false
  ensure_mount "/업무가이드" "/srv/pressco21-uploads/library/work-guides" "$EMPLOYEE_GROUP" true
  ensure_mount "/관리자문서함/세무-증빙" "/srv/pressco21-uploads/admin-vault/tax-evidence" "$ADMIN_GROUP" false
  ensure_mount "/관리자문서함/고객개인정보" "/srv/pressco21-uploads/admin-vault/customer-personal-info" "$ADMIN_GROUP" false
  ensure_mount "/관리자문서함/계정-권한" "/srv/pressco21-uploads/admin-vault/accounts-permissions" "$ADMIN_GROUP" false
  ensure_mount "/관리자문서함/AI_Wiki_관리원본" "/srv/pressco21-uploads/admin-vault/ai-wiki-admin-source" "$ADMIN_GROUP" false
  ensure_mount "/관리자문서함/폐기-보류" "/srv/pressco21-uploads/admin-vault/discard-hold" "$ADMIN_GROUP" false
}

ensure_internal_layout() {
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/makeshop"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/sabangnet"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/smartstore"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/coupang"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/11st"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/offline-crm"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/consultation"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/customer-os/normalized-exports"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/n8n-runs"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/makeshop"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/openmarket"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/accounting"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/government"
  ensure_dir_pressbackup "$INTERNAL_ROOT/10_RAW_원본보관/system-logs"

  ensure_dir_pressbackup "$INTERNAL_ROOT/40_AI_WIKI_AI지식베이스/official"
  ensure_dir_pressbackup "$INTERNAL_ROOT/40_AI_WIKI_AI지식베이스/draft"
  ensure_dir_pressbackup "$INTERNAL_ROOT/40_AI_WIKI_AI지식베이스/retired"
  ensure_dir_pressbackup "$INTERNAL_ROOT/40_AI_WIKI_AI지식베이스/index"

  ensure_dir_pressbackup "$INTERNAL_ROOT/50_PUBLISH_배포대기/00_후보"
  ensure_dir_pressbackup "$INTERNAL_ROOT/50_PUBLISH_배포대기/10_검수중"
  ensure_dir_pressbackup "$INTERNAL_ROOT/50_PUBLISH_배포대기/20_검수완료"
  ensure_dir_pressbackup "$INTERNAL_ROOT/50_PUBLISH_배포대기/30_배포완료"
  ensure_dir_pressbackup "$INTERNAL_ROOT/50_PUBLISH_배포대기/90_반려"

  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/프로젝트"
  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/캠페인"
  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/정부지원사업"
  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/과거제안서"
  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/종료강의"
  ensure_dir_pressbackup "$INTERNAL_ROOT/60_ARCHIVE_장기보관/이전기준"

  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/oracle"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/nextcloud"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/n8n"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/nocodb"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/minipc"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/systemd"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/docker-compose"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/credentials-metadata"
  ensure_dir_pressbackup "$INTERNAL_ROOT/90_SYSTEM_시스템백업/restore-guides"
}

verify_layout() {
  echo "Nextcloud mounts:"
  run_occ files_external:list | grep -E '00_INBOX|업무가이드|관리자문서함|AI_Wiki|세무|고객개인정보|계정-권한|폐기-보류' || true
  echo
  echo "Internal NAS root:"
  find "$INTERNAL_ROOT" -maxdepth 2 -mindepth 1 -type d | sort
}

need_cmd docker
need_cmd python3

ensure_nextcloud_layout
ensure_internal_layout
verify_layout
