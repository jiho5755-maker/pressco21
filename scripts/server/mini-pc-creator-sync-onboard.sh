#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/etc/pressco21/mini-pc-creator-sync.env}"

if [ -r "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"
ACTIVE_ROOT="${ACTIVE_ROOT:-/mnt/pressco21-ssd/PRESSCO21_ACTIVE}"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-/mnt/pressco21-hdd/PRESSCO21_ARCHIVE}"

ROLE="${ROLE:-${1:-}}"
CREATOR_SLUG="${CREATOR_SLUG:-${2:-}}"

usage() {
  cat <<'EOF'
Usage:
  ROLE=editor CREATOR_SLUG=video-team bash mini-pc-creator-sync-onboard.sh
  ROLE=designer CREATOR_SLUG=design-team bash mini-pc-creator-sync-onboard.sh
EOF
}

ensure_slug() {
  if [[ ! "$CREATOR_SLUG" =~ ^[a-z0-9._-]+$ ]]; then
    echo "CREATOR_SLUG must match ^[a-z0-9._-]+$" >&2
    exit 1
  fi
}

ensure_dir() {
  install -d -o "$RUN_USER" -g "$RUN_GROUP" "$@"
}

main() {
  case "$ROLE" in
    editor)
      ensure_slug
      ensure_dir \
        "${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/raw" \
        "${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/project" \
        "${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/export" \
        "${ARCHIVE_ROOT}/editors/${CREATOR_SLUG}"
      cat <<EOF
editor creator folder ready

- active raw: ${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/raw
- active project: ${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/project
- active export: ${ACTIVE_ROOT}/editors/${CREATOR_SLUG}/export
- archive root: ${ARCHIVE_ROOT}/editors/${CREATOR_SLUG}

Recommended Syncthing folder ids:
- editor-${CREATOR_SLUG}-raw
- editor-${CREATOR_SLUG}-project
- editor-${CREATOR_SLUG}-export
EOF
      ;;
    designer)
      ensure_slug
      ensure_dir \
        "${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/source" \
        "${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/export" \
        "${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/publish" \
        "${ARCHIVE_ROOT}/designers/${CREATOR_SLUG}"
      cat <<EOF
designer creator folder ready

- active source: ${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/source
- active export: ${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/export
- active publish: ${ACTIVE_ROOT}/designers/${CREATOR_SLUG}/publish
- archive root: ${ARCHIVE_ROOT}/designers/${CREATOR_SLUG}

Recommended Syncthing folder ids:
- designer-${CREATOR_SLUG}-source
- designer-${CREATOR_SLUG}-export
- designer-${CREATOR_SLUG}-publish
EOF
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
