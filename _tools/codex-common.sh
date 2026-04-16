#!/bin/bash
set -euo pipefail

CODEX_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_REPO_ROOT="$(cd "$CODEX_COMMON_DIR/.." && pwd)"
CODEX_OUTPUT_DIR="$CODEX_REPO_ROOT/output"
CODEX_SESSION_DIR="$CODEX_OUTPUT_DIR/codex-sessions"
CODEX_BACKUP_DIR="$CODEX_OUTPUT_DIR/codex-backups"
CODEX_HANDOFF_DIR="$CODEX_OUTPUT_DIR/codex-handoffs"

codex_now() {
  date '+%Y-%m-%d %H:%M:%S %Z'
}

codex_stamp() {
  date '+%Y%m%d-%H%M%S'
}

codex_slugify() {
  local raw="${1:-session}"
  local slug
  slug="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  if [ -z "$slug" ]; then
    slug="session"
  fi
  printf '%s\n' "$slug"
}

codex_ensure_dirs() {
  mkdir -p "$CODEX_SESSION_DIR" "$CODEX_BACKUP_DIR" "$CODEX_HANDOFF_DIR"
}

codex_git_branch() {
  git -C "$CODEX_REPO_ROOT" branch --show-current
}

codex_git_status() {
  local output
  output="$(git -C "$CODEX_REPO_ROOT" status --short || true)"
  if [ -z "$output" ]; then
    output="(clean)"
  fi
  printf '%s\n' "$output"
}

codex_git_diff_stat() {
  local output
  output="$(git -C "$CODEX_REPO_ROOT" diff --stat || true)"
  if [ -z "$output" ]; then
    output="(no diff)"
  fi
  printf '%s\n' "$output"
}

codex_git_head_short() {
  local head
  head="$(git -C "$CODEX_REPO_ROOT" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    head="(none)"
  fi
  printf '%s\n' "$head"
}

codex_latest_session() {
  find "$CODEX_SESSION_DIR" -maxdepth 1 -type f -name '*.md' | sort | tail -n 1
}

codex_latest_handoff() {
  find "$CODEX_HANDOFF_DIR" -maxdepth 1 -type f -name '*.md' | sort | tail -n 1
}

codex_latest_backup() {
  find "$CODEX_BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d | sort | tail -n 1
}

codex_resolve_session() {
  local requested="${1:-}"
  local session_file

  if [ -n "$requested" ]; then
    if [ -f "$requested" ]; then
      session_file="$requested"
    elif [ -f "$CODEX_SESSION_DIR/$requested" ]; then
      session_file="$CODEX_SESSION_DIR/$requested"
    else
      echo "Session log not found: $requested" >&2
      exit 1
    fi
  else
    session_file="$(codex_latest_session)"
    if [ -z "$session_file" ]; then
      echo "No session log found in $CODEX_SESSION_DIR" >&2
      exit 1
    fi
  fi

  printf '%s\n' "$session_file"
}

codex_resolve_handoff() {
  local requested="${1:-}"
  local handoff_file

  if [ -n "$requested" ]; then
    if [ -f "$requested" ]; then
      handoff_file="$requested"
    elif [ -f "$CODEX_HANDOFF_DIR/$requested" ]; then
      handoff_file="$CODEX_HANDOFF_DIR/$requested"
    else
      echo "Handoff note not found: $requested" >&2
      exit 1
    fi
  else
    handoff_file="$(codex_latest_handoff)"
    if [ -z "$handoff_file" ]; then
      echo "No handoff note found in $CODEX_HANDOFF_DIR" >&2
      exit 1
    fi
  fi

  printf '%s\n' "$handoff_file"
}

codex_join_by() {
  local delimiter="$1"
  shift
  local first=1
  local item
  for item in "$@"; do
    if [ $first -eq 1 ]; then
      printf '%s' "$item"
      first=0
    else
      printf '%s%s' "$delimiter" "$item"
    fi
  done
  printf '\n'
}

codex_repo_rel() {
  local path="$1"
  path="${path#"$CODEX_REPO_ROOT"/}"
  printf '%s\n' "$path"
}

codex_require_paths_exist() {
  local path
  for path in "$@"; do
    if [ ! -e "$CODEX_REPO_ROOT/$path" ]; then
      echo "Path not found relative to repo root: $path" >&2
      exit 1
    fi
  done
}

codex_append_session_note() {
  local session_file="$1"
  local note_block="$2"

  if [ -n "$session_file" ] && [ -f "$session_file" ]; then
    printf '%s\n' "$note_block" >> "$session_file"
  fi
}

codex_append_checkpoint() {
  local session_file="$1"
  local title="$2"
  local note="${3:-}"
  local timestamp
  local git_status
  local git_diff_stat

  timestamp="$(codex_now)"
  git_status="$(codex_git_status)"
  git_diff_stat="$(codex_git_diff_stat)"

  {
    printf '\n## Checkpoint %s - %s\n' "$timestamp" "$title"
    if [ -n "$note" ]; then
      printf -- '- Note: %s\n' "$note"
    fi
    printf '\n### Git Diff Stat\n'
    printf '```text\n%s\n```\n' "$git_diff_stat"
    printf '\n### Git Status\n'
    printf '```text\n%s\n```\n' "$git_status"
  } >> "$session_file"
}

codex_create_backup() {
  local session_file="$1"
  local label="$2"
  shift 2
  local paths=("$@")
  local backup_id
  local backup_dir
  local archive_file
  local patch_file
  local status_file
  local manifest_file

  codex_ensure_dirs
  codex_require_paths_exist "${paths[@]}"

  backup_id="$(codex_stamp)-$(codex_slugify "$label")"
  backup_dir="$CODEX_BACKUP_DIR/$backup_id"
  archive_file="$backup_dir/snapshot.tgz"
  patch_file="$backup_dir/changes.patch"
  status_file="$backup_dir/status.txt"
  manifest_file="$backup_dir/manifest.txt"

  mkdir -p "$backup_dir"

  git -C "$CODEX_REPO_ROOT" status --short -- "${paths[@]}" > "$status_file" || true
  git -C "$CODEX_REPO_ROOT" diff --binary -- "${paths[@]}" > "$patch_file" || true
  tar -czf "$archive_file" -C "$CODEX_REPO_ROOT" "${paths[@]}"

  {
    printf 'Backup ID: %s\n' "$backup_id"
    printf 'Created At: %s\n' "$(codex_now)"
    printf 'Session Log: %s\n' "$(codex_repo_rel "$session_file")"
    printf 'Label: %s\n' "$label"
    printf 'Paths:\n'
    printf '%s\n' "${paths[@]}"
  } > "$manifest_file"

  if command -v shasum >/dev/null 2>&1; then
    (
      cd "$backup_dir"
      shasum -a 256 snapshot.tgz changes.patch status.txt manifest.txt > checksums.txt
    )
  fi

  {
    printf '\n## Backup %s - %s\n' "$(codex_now)" "$label"
    printf -- '- Folder: %s\n' "$(codex_repo_rel "$backup_dir")"
    printf -- '- Archive: %s\n' "$(codex_repo_rel "$archive_file")"
    printf -- '- Patch: %s\n' "$(codex_repo_rel "$patch_file")"
    printf -- '- Paths: %s\n' "$(codex_join_by ', ' "${paths[@]}")"
  } >> "$session_file"

  printf '%s\n' "$backup_dir"
}

codex_ai_sync_field() {
  # AI_SYNC.md retired on 2026-04-16. Kept as compatibility shim for old handoff logs.
  printf '(retired: use worktree/branch scope)\n'
}

codex_branch_scope() {
  local scope_script="$CODEX_COMMON_DIR/project-scope.sh"
  local branch
  branch="$(git -C "$CODEX_REPO_ROOT" branch --show-current)"
  if [ -f "$scope_script" ]; then
    # shellcheck source=/dev/null
    source "$scope_script"
    p21_project_from_branch "$branch" 2>/dev/null || printf '(unscoped)\n'
  else
    printf '(scope helper unavailable)\n'
  fi
}

codex_omx_status() {
  local omx_script="$CODEX_COMMON_DIR/omx-run.sh"
  if [ ! -f "$omx_script" ]; then
    printf '(omx helper unavailable)\n'
    return 0
  fi
  bash "$omx_script" status 2>/dev/null || true
}

codex_current_branch() {
  local branch
  branch="$(git -C "$CODEX_REPO_ROOT" branch --show-current)"
  if [ -z "$branch" ]; then
    echo "Detached HEAD is not supported for this helper." >&2
    exit 1
  fi
  printf '%s\n' "$branch"
}
