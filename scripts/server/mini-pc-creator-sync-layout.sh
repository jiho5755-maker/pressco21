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

require_mount() {
  local path="$1"

  if ! mountpoint -q "$path"; then
    echo "required mount is not active: $path" >&2
    exit 1
  fi
}

ensure_dir() {
  install -d -o "$RUN_USER" -g "$RUN_GROUP" "$@"
}

ensure_symlink() {
  local target="$1"
  local link_path="$2"

  if [ -L "$link_path" ]; then
    ln -sfn "$target" "$link_path"
    return 0
  fi

  if [ -e "$link_path" ]; then
    echo "path already exists and is not a symlink: $link_path" >&2
    exit 1
  fi

  ln -s "$target" "$link_path"
}

write_readme() {
  cat >"${ACTIVE_ROOT}/README.txt" <<'EOF'
PRESSCO21 ACTIVE sync storage

- editors/{name}/raw : shooting originals
- editors/{name}/project : editing project files
- editors/{name}/export : final exported videos
- designers/{name}/source : design source files
- designers/{name}/export : exported images
- designers/{name}/publish : approved publish assets
- shared/company-hub/internal-docs : company internal documents
- shared/company-hub/brand-assets : logos, source assets, icons, fonts
- shared/company-hub/brand-system : guidelines, tone, colors, references
- shared/company-hub/templates : reusable templates
- shared/company-hub/sales-kits : proposals, decks, one-pagers
- shared/company-hub/operations : SOP, automation docs, workflows
- shared/publish-queue : assets waiting for external publish
- publish/makeshop-ready : final web-ready assets
- publish/minio-stage : files prepared for future MinIO publishing
- publish/minio-ready : files approved for future MinIO bucket sync

This tree is intended for Syncthing receive-only folders on the mini PC.
Do not point the creator sync folders at /srv/pressco21-content/inbox.
EOF

  cat >"${ACTIVE_ROOT}/shared/company-hub/README.txt" <<'EOF'
PRESSCO21 company shared hub

- internal-docs/01-company-profile : company overview, mission, business summary
- internal-docs/02-policies-sop : policies, SOP, process docs
- internal-docs/03-legal-contracts : contracts, agreements, legal documents
- internal-docs/04-meetings-notes : meeting notes, decision logs
- internal-docs/05-finance-admin : tax/admin reference docs without secrets

- brand-assets/01-logos : logo source and exports
- brand-assets/02-fonts : licensed fonts and font guides
- brand-assets/03-icons : icon packs and UI assets
- brand-assets/04-photo-video-source : reusable branded source assets
- brand-assets/05-illustrations-graphics : reusable design assets

- brand-system/01-brand-guidelines : official brand guide
- brand-system/02-colors : palette references
- brand-system/03-typography : type rules
- brand-system/04-messaging-tone : copy and tone guide
- brand-system/05-reference-examples : examples and references

- templates/01-doc-templates : doc templates
- templates/02-slide-templates : slide and pitch deck templates
- templates/03-sheet-templates : spreadsheet templates
- templates/04-design-templates : PSD/AI/Figma exports
- templates/05-video-templates : intro/outro/lower-third templates

- sales-kits/01-company-overview : company intro decks
- sales-kits/02-one-pagers : single-page sales docs
- sales-kits/03-proposals : proposal templates and finals
- sales-kits/04-case-studies : case study material
- sales-kits/05-client-facing-assets : brochures and handoff assets

- operations/01-automation : automation docs
- operations/02-checklists : ops checklists
- operations/03-manuals : manuals and runbooks
- operations/04-vendors-tools : vendor/tool references
- operations/05-system-maps : system maps, IA, architecture docs
EOF

  cat >"${ARCHIVE_ROOT}/README.txt" <<'EOF'
PRESSCO21 ARCHIVE storage

Use this area for completed projects and long-term retention.
Oracle system backups continue to live under PRESSCO21_BACKUP on the HDD.
EOF

  chown "$RUN_USER:$RUN_GROUP" "${ACTIVE_ROOT}/README.txt" "${ARCHIVE_ROOT}/README.txt" "${ACTIVE_ROOT}/shared/company-hub/README.txt"
  chmod 644 "${ACTIVE_ROOT}/README.txt" "${ARCHIVE_ROOT}/README.txt" "${ACTIVE_ROOT}/shared/company-hub/README.txt"
}

create_editor_dirs() {
  local slug="$1"

  ensure_dir \
    "${ACTIVE_ROOT}/editors/${slug}/raw" \
    "${ACTIVE_ROOT}/editors/${slug}/project" \
    "${ACTIVE_ROOT}/editors/${slug}/export" \
    "${ARCHIVE_ROOT}/editors/${slug}"
}

create_designer_dirs() {
  local slug="$1"

  ensure_dir \
    "${ACTIVE_ROOT}/designers/${slug}/source" \
    "${ACTIVE_ROOT}/designers/${slug}/export" \
    "${ACTIVE_ROOT}/designers/${slug}/publish" \
    "${ARCHIVE_ROOT}/designers/${slug}"
}

split_csv() {
  local raw="$1"
  local item

  raw="${raw//,/ }"
  for item in $raw; do
    printf '%s\n' "$item"
  done
}

main() {
  local slug

  require_mount "$SSD_MOUNT"
  require_mount "$HDD_MOUNT"

  ensure_dir \
    "$ACTIVE_ROOT" \
    "$ACTIVE_ROOT/editors" \
    "$ACTIVE_ROOT/designers" \
    "$ACTIVE_ROOT/shared/company-hub/internal-docs/01-company-profile" \
    "$ACTIVE_ROOT/shared/company-hub/internal-docs/02-policies-sop" \
    "$ACTIVE_ROOT/shared/company-hub/internal-docs/03-legal-contracts" \
    "$ACTIVE_ROOT/shared/company-hub/internal-docs/04-meetings-notes" \
    "$ACTIVE_ROOT/shared/company-hub/internal-docs/05-finance-admin" \
    "$ACTIVE_ROOT/shared/company-hub/brand-assets/01-logos" \
    "$ACTIVE_ROOT/shared/company-hub/brand-assets/02-fonts" \
    "$ACTIVE_ROOT/shared/company-hub/brand-assets/03-icons" \
    "$ACTIVE_ROOT/shared/company-hub/brand-assets/04-photo-video-source" \
    "$ACTIVE_ROOT/shared/company-hub/brand-assets/05-illustrations-graphics" \
    "$ACTIVE_ROOT/shared/company-hub/brand-system/01-brand-guidelines" \
    "$ACTIVE_ROOT/shared/company-hub/brand-system/02-colors" \
    "$ACTIVE_ROOT/shared/company-hub/brand-system/03-typography" \
    "$ACTIVE_ROOT/shared/company-hub/brand-system/04-messaging-tone" \
    "$ACTIVE_ROOT/shared/company-hub/brand-system/05-reference-examples" \
    "$ACTIVE_ROOT/shared/company-hub/templates/01-doc-templates" \
    "$ACTIVE_ROOT/shared/company-hub/templates/02-slide-templates" \
    "$ACTIVE_ROOT/shared/company-hub/templates/03-sheet-templates" \
    "$ACTIVE_ROOT/shared/company-hub/templates/04-design-templates" \
    "$ACTIVE_ROOT/shared/company-hub/templates/05-video-templates" \
    "$ACTIVE_ROOT/shared/company-hub/sales-kits/01-company-overview" \
    "$ACTIVE_ROOT/shared/company-hub/sales-kits/02-one-pagers" \
    "$ACTIVE_ROOT/shared/company-hub/sales-kits/03-proposals" \
    "$ACTIVE_ROOT/shared/company-hub/sales-kits/04-case-studies" \
    "$ACTIVE_ROOT/shared/company-hub/sales-kits/05-client-facing-assets" \
    "$ACTIVE_ROOT/shared/company-hub/operations/01-automation" \
    "$ACTIVE_ROOT/shared/company-hub/operations/02-checklists" \
    "$ACTIVE_ROOT/shared/company-hub/operations/03-manuals" \
    "$ACTIVE_ROOT/shared/company-hub/operations/04-vendors-tools" \
    "$ACTIVE_ROOT/shared/company-hub/operations/05-system-maps" \
    "$ACTIVE_ROOT/shared/publish-queue" \
    "$ACTIVE_ROOT/publish/makeshop-ready" \
    "$ACTIVE_ROOT/publish/minio-stage" \
    "$ACTIVE_ROOT/publish/minio-ready" \
    "$ACTIVE_ROOT/publish/reviewed" \
    "$ARCHIVE_ROOT" \
    "$ARCHIVE_ROOT/editors" \
    "$ARCHIVE_ROOT/designers" \
    "$ARCHIVE_ROOT/shared" \
    "$ARCHIVE_ROOT/publish" \
    "$ARCHIVE_ROOT/publish/minio-history"

  while IFS= read -r slug; do
    [ -n "$slug" ] || continue
    create_editor_dirs "$slug"
  done < <(split_csv "$EDITOR_SLUGS")

  while IFS= read -r slug; do
    [ -n "$slug" ] || continue
    create_designer_dirs "$slug"
  done < <(split_csv "$DESIGNER_SLUGS")

  write_readme

  ensure_symlink "$ACTIVE_ROOT" "${CONTENT_ROOT}/active-sync"
  ensure_symlink "${ACTIVE_ROOT}/shared/company-hub" "${CONTENT_ROOT}/company-hub"
  ensure_symlink "${ACTIVE_ROOT}/shared/publish-queue" "${CONTENT_ROOT}/publish-queue"
  ensure_symlink "${ACTIVE_ROOT}/publish/makeshop-ready" "${CONTENT_ROOT}/publish-ready"
  ensure_symlink "${ACTIVE_ROOT}/publish/minio-stage" "${CONTENT_ROOT}/publish-minio-stage"
  ensure_symlink "${ACTIVE_ROOT}/publish/minio-ready" "${CONTENT_ROOT}/publish-minio-ready"
  ensure_symlink "$ARCHIVE_ROOT" "${CONTENT_ROOT}/archive-sync"

  printf 'creator sync layout ready\n'
  printf -- '- active root: %s\n' "$ACTIVE_ROOT"
  printf -- '- archive root: %s\n' "$ARCHIVE_ROOT"
}

main "$@"
