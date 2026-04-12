#!/usr/bin/env bash
set -euo pipefail

NC_CONTAINER="${NC_CONTAINER:-pressco21-nextcloud-app}"
UPLOADS_ROOT="${UPLOADS_ROOT:-/home/pressbackup/pressco21/nextcloud/shared}"
EMPLOYEE_GROUP="${EMPLOYEE_GROUP:-employee}"
ADMIN_GROUP="${ADMIN_GROUP:-admin}"
BRAND_MOUNT_POINT="${BRAND_MOUNT_POINT:-/브랜드}"
DESIGN_MOUNT_POINT="${DESIGN_MOUNT_POINT:-/디자인}"
PHOTO_MOUNT_POINT="${PHOTO_MOUNT_POINT:-/사진}"
DOCS_MOUNT_POINT="${DOCS_MOUNT_POINT:-/내부문서}"
VIDEO_MOUNT_POINT="${VIDEO_MOUNT_POINT:-/영상자료}"
ADMIN_VAULT_MOUNT_POINT="${ADMIN_VAULT_MOUNT_POINT:-/관리자문서함}"
UI_ROOTS_BASE="${UI_ROOTS_BASE:-$UPLOADS_ROOT/ui-roots}"

BRAND_ROOT_DIR="${BRAND_ROOT_DIR:-$UI_ROOTS_BASE/brand}"
DESIGN_ROOT_DIR="${DESIGN_ROOT_DIR:-$UI_ROOTS_BASE/design}"
PHOTO_ROOT_DIR="${PHOTO_ROOT_DIR:-$UI_ROOTS_BASE/photos}"
DOCS_ROOT_DIR="${DOCS_ROOT_DIR:-$UI_ROOTS_BASE/internal-docs}"
VIDEO_ROOT_DIR="${VIDEO_ROOT_DIR:-$UI_ROOTS_BASE/videos}"
VIDEO_DAGYEONG_ROOT_DIR="${VIDEO_DAGYEONG_ROOT_DIR:-$UI_ROOTS_BASE/video-owner-jangdagyeong}"
VIDEO_JIHO_ROOT_DIR="${VIDEO_JIHO_ROOT_DIR:-$UI_ROOTS_BASE/video-owner-jangjiho}"
ADMIN_ROOT_DIR="${ADMIN_ROOT_DIR:-$UI_ROOTS_BASE/admin-vault}"

BRAND_LOGO_DIR="${BRAND_LOGO_DIR:-$UPLOADS_ROOT/library/brand/logo}"
BRAND_GUIDE_DIR="${BRAND_GUIDE_DIR:-$UPLOADS_ROOT/library/brand/brand-guide}"
BRAND_TEMPLATES_DIR="${BRAND_TEMPLATES_DIR:-$UPLOADS_ROOT/library/brand/templates}"
BRAND_DECKS_DIR="${BRAND_DECKS_DIR:-$UPLOADS_ROOT/library/brand/company-decks}"
DESIGN_IN_REVIEW_DIR="${DESIGN_IN_REVIEW_DIR:-$UPLOADS_ROOT/library/design/in-review}"
DESIGN_FINAL_DIR="${DESIGN_FINAL_DIR:-$UPLOADS_ROOT/library/design/final}"
DESIGN_READY_DIR="${DESIGN_READY_DIR:-$UPLOADS_ROOT/library/design/ready-to-publish}"
DESIGN_CAMPAIGNS_DIR="${DESIGN_CAMPAIGNS_DIR:-$UPLOADS_ROOT/library/design/campaigns}"
PHOTO_PRODUCTS_DIR="${PHOTO_PRODUCTS_DIR:-$UPLOADS_ROOT/library/photos/products}"
PHOTO_EVENTS_DIR="${PHOTO_EVENTS_DIR:-$UPLOADS_ROOT/library/photos/classes-events}"
PHOTO_REVIEWS_DIR="${PHOTO_REVIEWS_DIR:-$UPLOADS_ROOT/library/photos/customer-reviews}"
PHOTO_SELECTED_RAW_DIR="${PHOTO_SELECTED_RAW_DIR:-$UPLOADS_ROOT/library/photos/selected-raw}"
DOCS_BASICS_DIR="${DOCS_BASICS_DIR:-$UPLOADS_ROOT/library/internal-docs/company-basics}"
DOCS_OPERATIONS_DIR="${DOCS_OPERATIONS_DIR:-$UPLOADS_ROOT/library/internal-docs/operations-manuals}"
DOCS_MEETINGS_DIR="${DOCS_MEETINGS_DIR:-$UPLOADS_ROOT/library/internal-docs/meetings-decisions}"
DOCS_FORMS_DIR="${DOCS_FORMS_DIR:-$UPLOADS_ROOT/library/internal-docs/forms-checklists}"
ADMIN_SALES_DIR="${ADMIN_SALES_DIR:-$UPLOADS_ROOT/admin-vault/sales-finance}"
ADMIN_CONTRACTS_DIR="${ADMIN_CONTRACTS_DIR:-$UPLOADS_ROOT/admin-vault/contracts-legal}"
ADMIN_HR_DIR="${ADMIN_HR_DIR:-$UPLOADS_ROOT/admin-vault/hr-confidential}"

BRAND_LOGO_MOUNT="${BRAND_LOGO_MOUNT:-$BRAND_MOUNT_POINT/로고}"
BRAND_GUIDE_MOUNT="${BRAND_GUIDE_MOUNT:-$BRAND_MOUNT_POINT/브랜드가이드}"
BRAND_TEMPLATES_MOUNT="${BRAND_TEMPLATES_MOUNT:-$BRAND_MOUNT_POINT/템플릿}"
BRAND_DECKS_MOUNT="${BRAND_DECKS_MOUNT:-$BRAND_MOUNT_POINT/소개서-제안서}"
DESIGN_IN_REVIEW_MOUNT="${DESIGN_IN_REVIEW_MOUNT:-$DESIGN_MOUNT_POINT/진행중-공유본}"
DESIGN_FINAL_MOUNT="${DESIGN_FINAL_MOUNT:-$DESIGN_MOUNT_POINT/최종본}"
DESIGN_READY_MOUNT="${DESIGN_READY_MOUNT:-$DESIGN_MOUNT_POINT/배포대기}"
DESIGN_CAMPAIGNS_MOUNT="${DESIGN_CAMPAIGNS_MOUNT:-$DESIGN_MOUNT_POINT/캠페인별}"
PHOTO_PRODUCTS_MOUNT="${PHOTO_PRODUCTS_MOUNT:-$PHOTO_MOUNT_POINT/상품}"
PHOTO_EVENTS_MOUNT="${PHOTO_EVENTS_MOUNT:-$PHOTO_MOUNT_POINT/수업-행사}"
PHOTO_REVIEWS_MOUNT="${PHOTO_REVIEWS_MOUNT:-$PHOTO_MOUNT_POINT/고객후기}"
PHOTO_SELECTED_RAW_MOUNT="${PHOTO_SELECTED_RAW_MOUNT:-$PHOTO_MOUNT_POINT/선별원본}"
DOCS_BASICS_MOUNT="${DOCS_BASICS_MOUNT:-$DOCS_MOUNT_POINT/회사기본}"
DOCS_OPERATIONS_MOUNT="${DOCS_OPERATIONS_MOUNT:-$DOCS_MOUNT_POINT/운영매뉴얼}"
DOCS_MEETINGS_MOUNT="${DOCS_MEETINGS_MOUNT:-$DOCS_MOUNT_POINT/회의-결정}"
DOCS_FORMS_MOUNT="${DOCS_FORMS_MOUNT:-$DOCS_MOUNT_POINT/양식-체크리스트}"
VIDEO_DAGYEONG_MOUNT="${VIDEO_DAGYEONG_MOUNT:-$VIDEO_MOUNT_POINT/장다경}"
VIDEO_DAGYEONG_RAW_MOUNT="${VIDEO_DAGYEONG_RAW_MOUNT:-$VIDEO_DAGYEONG_MOUNT/촬영원본}"
VIDEO_DAGYEONG_PROJECT_MOUNT="${VIDEO_DAGYEONG_PROJECT_MOUNT:-$VIDEO_DAGYEONG_MOUNT/편집프로젝트}"
VIDEO_DAGYEONG_EXPORT_MOUNT="${VIDEO_DAGYEONG_EXPORT_MOUNT:-$VIDEO_DAGYEONG_MOUNT/완성본}"
VIDEO_JIHO_MOUNT="${VIDEO_JIHO_MOUNT:-$VIDEO_MOUNT_POINT/장지호}"
VIDEO_JIHO_RAW_MOUNT="${VIDEO_JIHO_RAW_MOUNT:-$VIDEO_JIHO_MOUNT/촬영원본}"
VIDEO_JIHO_PROJECT_MOUNT="${VIDEO_JIHO_PROJECT_MOUNT:-$VIDEO_JIHO_MOUNT/편집프로젝트}"
VIDEO_JIHO_EXPORT_MOUNT="${VIDEO_JIHO_EXPORT_MOUNT:-$VIDEO_JIHO_MOUNT/완성본}"
ADMIN_SALES_MOUNT="${ADMIN_SALES_MOUNT:-$ADMIN_VAULT_MOUNT_POINT/매출-재무}"
ADMIN_CONTRACTS_MOUNT="${ADMIN_CONTRACTS_MOUNT:-$ADMIN_VAULT_MOUNT_POINT/계약-법무}"
ADMIN_HR_MOUNT="${ADMIN_HR_MOUNT:-$ADMIN_VAULT_MOUNT_POINT/인사-기밀}"

run_occ() {
  if [[ -n "${NC_PASS:-}" ]]; then
    docker exec -e NC_PASS -u www-data "$NC_CONTAINER" php occ "$@"
  else
    docker exec -u www-data "$NC_CONTAINER" php occ "$@"
  fi
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

ensure_group() {
  local group="$1"
  if ! run_occ group:info "$group" >/dev/null 2>&1; then
    run_occ group:add "$group" >/dev/null
  fi
}

disable_user_if_exists() {
  local user="$1"
  if run_occ user:info "$user" >/dev/null 2>&1; then
    run_occ user:disable "$user" >/dev/null 2>&1 || true
  fi
}

mount_id_by_point() {
  local mount_point="$1"
  python3 - "$mount_point" <<'PY'
import json, subprocess, sys
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

delete_mount_if_exists() {
  local mount_point="$1"
  local existing
  existing="$(mount_id_by_point "$mount_point" || true)"
  if [[ -n "$existing" ]]; then
    run_occ files_external:delete "$existing" --yes >/dev/null
  fi
}

configure_mount() {
  local mount_point="$1"
  local datadir="$2"
  shift 2
  local existing
  existing="$(mount_id_by_point "$mount_point" || true)"
  if [[ -z "$existing" ]]; then
    run_occ files_external:create "$mount_point" local null::null -c "datadir=$datadir" >/dev/null
    existing="$(mount_id_by_point "$mount_point")"
  fi
  run_occ files_external:applicable "$existing" --remove-all >/dev/null
  while (($#)); do
    case "$1" in
      group:*)
        run_occ files_external:applicable "$existing" --add-group "${1#group:}" >/dev/null
        ;;
      user:*)
        run_occ files_external:applicable "$existing" --add-user "${1#user:}" >/dev/null
        ;;
      sharing:true)
        run_occ files_external:option "$existing" enable_sharing true >/dev/null
        ;;
      sharing:false)
        run_occ files_external:option "$existing" enable_sharing false >/dev/null
        ;;
      readonly:true)
        run_occ files_external:option "$existing" readonly true >/dev/null
        ;;
      readonly:false)
        run_occ files_external:option "$existing" readonly false >/dev/null
        ;;
    esac
    shift
  done
  echo "$existing"
}

copy_tree_if_empty() {
  local src="$1"
  local dst="$2"
  if [[ ! -d "$src" ]]; then
    return 0
  fi
  sudo mkdir -p "$dst"
  if [[ -z "$(find "$dst" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1)" ]]; then
    sudo cp -a "$src"/. "$dst"/
  fi
}

ensure_dirs() {
  while (($#)); do
    sudo mkdir -p "$1"
    shift
  done
}

cleanup_default_user_files() {
  local user="$1"
  docker exec -e TARGET_USER="$user" -u www-data "$NC_CONTAINER" sh -lc '
    base="/var/www/html/data/${TARGET_USER}/files"
    rm -rf \
      "$base/Documents" \
      "$base/Photos" \
      "$base/Templates" \
      "$base/Nextcloud Manual.pdf" \
      "$base/Nextcloud intro.mp4" \
      "$base/Nextcloud.png" \
      "$base/Readme.md" \
      "$base/Reasons to use Nextcloud.pdf" \
      "$base/Templates credits.md"
  '
}

need_cmd docker
need_cmd python3

ensure_dirs \
  "$BRAND_ROOT_DIR" \
  "$DESIGN_ROOT_DIR" \
  "$PHOTO_ROOT_DIR" \
  "$DOCS_ROOT_DIR" \
  "$VIDEO_ROOT_DIR" \
  "$VIDEO_DAGYEONG_ROOT_DIR" \
  "$VIDEO_JIHO_ROOT_DIR" \
  "$ADMIN_ROOT_DIR" \
  "$BRAND_LOGO_DIR" \
  "$BRAND_GUIDE_DIR" \
  "$BRAND_TEMPLATES_DIR" \
  "$BRAND_DECKS_DIR" \
  "$DESIGN_IN_REVIEW_DIR" \
  "$DESIGN_FINAL_DIR" \
  "$DESIGN_READY_DIR" \
  "$DESIGN_CAMPAIGNS_DIR" \
  "$PHOTO_PRODUCTS_DIR" \
  "$PHOTO_EVENTS_DIR" \
  "$PHOTO_REVIEWS_DIR" \
  "$PHOTO_SELECTED_RAW_DIR" \
  "$DOCS_BASICS_DIR" \
  "$DOCS_OPERATIONS_DIR" \
  "$DOCS_MEETINGS_DIR" \
  "$DOCS_FORMS_DIR" \
  "$ADMIN_SALES_DIR" \
  "$ADMIN_CONTRACTS_DIR" \
  "$ADMIN_HR_DIR"

sudo rm -rf "$VIDEO_ROOT_DIR/jangdagyeong" "$VIDEO_ROOT_DIR/jangjiho"

copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/company-hub/brand-system" "$BRAND_GUIDE_DIR/brand-system"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/brand-assets" "$BRAND_LOGO_DIR/legacy-brand-assets"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/company-hub/templates" "$BRAND_TEMPLATES_DIR/company-templates"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/templates" "$BRAND_TEMPLATES_DIR/shared-templates"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/company-hub/sales-kits" "$BRAND_DECKS_DIR/legacy-sales-kits"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/company-hub/internal-docs" "$DOCS_BASICS_DIR/legacy-internal-docs"
copy_tree_if_empty "/mnt/pressco21-ssd/PRESSCO21_ACTIVE/shared/company-hub/operations" "$DOCS_OPERATIONS_DIR/legacy-operations"
copy_tree_if_empty "$UPLOADS_ROOT/admin-vault/sales-docs" "$ADMIN_SALES_DIR/legacy-sales-docs"
copy_tree_if_empty "$UPLOADS_ROOT/admin-vault/contracts" "$ADMIN_CONTRACTS_DIR/legacy-contracts"
copy_tree_if_empty "$UPLOADS_ROOT/admin-vault/confidential" "$ADMIN_HR_DIR/legacy-confidential"
sudo chown -R 33:33 "$UPLOADS_ROOT"
sudo chmod -R 775 "$UPLOADS_ROOT"

ensure_group "$EMPLOYEE_GROUP"
ensure_group "$ADMIN_GROUP"
run_occ config:system:set skeletondirectory --value="" >/dev/null

disable_user_if_exists "pressco21_employee"
disable_user_if_exists "pressco21_admin"
disable_user_if_exists "pressco21_design"
disable_user_if_exists "pressco21_staff"

for user in pressco21 envyco cardboardwindow tmdgo1993 jhl9464; do
  cleanup_default_user_files "$user"
  run_occ files:scan "$user" >/dev/null || true
done

delete_mount_if_exists "/Company Library"
delete_mount_if_exists "/Employee Uploads"
delete_mount_if_exists "/Admin Vault"
delete_mount_if_exists "/Design Uploads"
delete_mount_if_exists "/자료실"
delete_mount_if_exists "/업로드함"
for mount_point in \
  "$BRAND_LOGO_MOUNT" \
  "$BRAND_GUIDE_MOUNT" \
  "$BRAND_TEMPLATES_MOUNT" \
  "$BRAND_DECKS_MOUNT" \
  "$DESIGN_IN_REVIEW_MOUNT" \
  "$DESIGN_FINAL_MOUNT" \
  "$DESIGN_READY_MOUNT" \
  "$DESIGN_CAMPAIGNS_MOUNT" \
  "$PHOTO_PRODUCTS_MOUNT" \
  "$PHOTO_EVENTS_MOUNT" \
  "$PHOTO_REVIEWS_MOUNT" \
  "$PHOTO_SELECTED_RAW_MOUNT" \
  "$DOCS_BASICS_MOUNT" \
  "$DOCS_OPERATIONS_MOUNT" \
  "$DOCS_MEETINGS_MOUNT" \
  "$DOCS_FORMS_MOUNT" \
  "$VIDEO_DAGYEONG_RAW_MOUNT" \
  "$VIDEO_DAGYEONG_PROJECT_MOUNT" \
  "$VIDEO_DAGYEONG_EXPORT_MOUNT" \
  "$VIDEO_DAGYEONG_MOUNT" \
  "$VIDEO_JIHO_RAW_MOUNT" \
  "$VIDEO_JIHO_PROJECT_MOUNT" \
  "$VIDEO_JIHO_EXPORT_MOUNT" \
  "$VIDEO_JIHO_MOUNT" \
  "$ADMIN_SALES_MOUNT" \
  "$ADMIN_CONTRACTS_MOUNT" \
  "$ADMIN_HR_MOUNT" \
  "$BRAND_MOUNT_POINT" \
  "$DESIGN_MOUNT_POINT" \
  "$PHOTO_MOUNT_POINT" \
  "$DOCS_MOUNT_POINT" \
  "$VIDEO_MOUNT_POINT" \
  "$ADMIN_VAULT_MOUNT_POINT"; do
  delete_mount_if_exists "$mount_point"
done

configure_mount "$BRAND_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/brand" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$BRAND_LOGO_MOUNT" "/srv/pressco21-uploads/library/brand/logo" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$BRAND_GUIDE_MOUNT" "/srv/pressco21-uploads/library/brand/brand-guide" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$BRAND_TEMPLATES_MOUNT" "/srv/pressco21-uploads/library/brand/templates" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$BRAND_DECKS_MOUNT" "/srv/pressco21-uploads/library/brand/company-decks" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null

configure_mount "$DESIGN_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/design" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$DESIGN_IN_REVIEW_MOUNT" "/srv/pressco21-uploads/library/design/in-review" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DESIGN_FINAL_MOUNT" "/srv/pressco21-uploads/library/design/final" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DESIGN_READY_MOUNT" "/srv/pressco21-uploads/library/design/ready-to-publish" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DESIGN_CAMPAIGNS_MOUNT" "/srv/pressco21-uploads/library/design/campaigns" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null

configure_mount "$PHOTO_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/photos" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$PHOTO_PRODUCTS_MOUNT" "/srv/pressco21-uploads/library/photos/products" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$PHOTO_EVENTS_MOUNT" "/srv/pressco21-uploads/library/photos/classes-events" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$PHOTO_REVIEWS_MOUNT" "/srv/pressco21-uploads/library/photos/customer-reviews" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$PHOTO_SELECTED_RAW_MOUNT" "/srv/pressco21-uploads/library/photos/selected-raw" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null

configure_mount "$DOCS_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/internal-docs" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$DOCS_BASICS_MOUNT" "/srv/pressco21-uploads/library/internal-docs/company-basics" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DOCS_OPERATIONS_MOUNT" "/srv/pressco21-uploads/library/internal-docs/operations-manuals" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DOCS_MEETINGS_MOUNT" "/srv/pressco21-uploads/library/internal-docs/meetings-decisions" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$DOCS_FORMS_MOUNT" "/srv/pressco21-uploads/library/internal-docs/forms-checklists" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null

configure_mount "$VIDEO_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/videos" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_DAGYEONG_MOUNT" "/srv/pressco21-uploads/ui-roots/videos/jangdagyeong" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_DAGYEONG_RAW_MOUNT" "/srv/pressco21-active/editors/youtube-editor/raw" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_DAGYEONG_PROJECT_MOUNT" "/srv/pressco21-active/editors/youtube-editor/project" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_DAGYEONG_EXPORT_MOUNT" "/srv/pressco21-active/editors/youtube-editor/export" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_JIHO_MOUNT" "/srv/pressco21-uploads/ui-roots/videos/jangjiho" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_JIHO_RAW_MOUNT" "/srv/pressco21-active/editors/master/raw" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_JIHO_PROJECT_MOUNT" "/srv/pressco21-active/editors/master/project" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$VIDEO_JIHO_EXPORT_MOUNT" "/srv/pressco21-active/editors/master/export" \
  "group:$EMPLOYEE_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null

configure_mount "$ADMIN_VAULT_MOUNT_POINT" "/srv/pressco21-uploads/ui-roots/admin-vault" \
  "group:$ADMIN_GROUP" \
  "sharing:false" \
  "readonly:true" >/dev/null
configure_mount "$ADMIN_SALES_MOUNT" "/srv/pressco21-uploads/admin-vault/sales-finance" \
  "group:$ADMIN_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$ADMIN_CONTRACTS_MOUNT" "/srv/pressco21-uploads/admin-vault/contracts-legal" \
  "group:$ADMIN_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null
configure_mount "$ADMIN_HR_MOUNT" "/srv/pressco21-uploads/admin-vault/hr-confidential" \
  "group:$ADMIN_GROUP" \
  "sharing:false" \
  "readonly:false" >/dev/null

run_occ files:scan --all >/dev/null
run_occ files_external:list
echo "Configured Nextcloud taxonomy mounts for groups: $EMPLOYEE_GROUP and $ADMIN_GROUP"
