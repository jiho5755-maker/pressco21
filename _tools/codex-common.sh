#!/bin/bash
set -euo pipefail

CODEX_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_REPO_ROOT="$(cd "$CODEX_COMMON_DIR/.." && pwd)"
CODEX_OUTPUT_DIR="$CODEX_REPO_ROOT/output"
CODEX_SESSION_DIR="$CODEX_OUTPUT_DIR/codex-sessions"
CODEX_BACKUP_DIR="$CODEX_OUTPUT_DIR/codex-backups"

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
  mkdir -p "$CODEX_SESSION_DIR" "$CODEX_BACKUP_DIR"
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

codex_latest_session() {
  find "$CODEX_SESSION_DIR" -maxdepth 1 -type f -name '*.md' | sort | tail -n 1
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

codex_current_branch() {
  local branch
  branch="$(git -C "$CODEX_REPO_ROOT" branch --show-current)"
  if [ -z "$branch" ]; then
    echo "Detached HEAD is not supported for this helper." >&2
    exit 1
  fi
  printf '%s\n' "$branch"
}
