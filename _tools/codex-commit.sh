#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-commit.sh [--session <log>] [--dry-run] --message "<message>" <path> [path...]

Examples:
  bash pressco21/_tools/codex-commit.sh --message "CRM 인증 복구 루틴 추가" _tools docs/codex-vibe-routine.md OPS_STATE.md
  bash pressco21/_tools/codex-commit.sh --session output/codex-sessions/20260402-120000-crm.md --dry-run --message "명세표 UX 정리" offline-crm-v2/src/pages
EOF
}

session_arg=""
message=""
dry_run=0

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
      shift 2
      ;;
    --message)
      message="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [ -z "$message" ] || [ $# -lt 1 ]; then
  usage
  exit 1
fi

paths=("$@")
codex_require_paths_exist "${paths[@]}"
session_file=""
if [ -n "$session_arg" ]; then
  session_file="$(codex_resolve_session "$session_arg")"
fi

if git -C "$CODEX_REPO_ROOT" status --short -- .secrets.env .secrets .env.local | grep -q .; then
  echo "Secret file changes detected. Commit helper is blocked." >&2
  exit 1
fi

pre_staged="$(git -C "$CODEX_REPO_ROOT" diff --cached --name-only || true)"
if [ -n "$pre_staged" ]; then
  echo "Index already has staged changes. Commit them manually or unstage before using this helper." >&2
  echo "$pre_staged" >&2
  exit 1
fi

commit_message="$message"
case "$commit_message" in
  "[codex]"*) ;;
  *)
    commit_message="[codex] $commit_message"
    ;;
esac

git -C "$CODEX_REPO_ROOT" add -- "${paths[@]}"
staged_target="$(git -C "$CODEX_REPO_ROOT" diff --cached --name-only -- "${paths[@]}" || true)"
if [ -z "$staged_target" ]; then
  echo "No staged changes found for target paths." >&2
  exit 1
fi

printf 'Target paths:\n'
printf '%s\n' "${paths[@]}"
printf '\nStaged diff stat:\n'
git -C "$CODEX_REPO_ROOT" diff --cached --stat -- "${paths[@]}" || true
printf '\nCommit message: %s\n' "$commit_message"

if [ $dry_run -eq 1 ]; then
  git -C "$CODEX_REPO_ROOT" reset -- "${paths[@]}" >/dev/null
  printf '\nDry run only. Nothing was committed.\n'
  exit 0
fi

git -C "$CODEX_REPO_ROOT" commit -m "$commit_message"
commit_hash="$(git -C "$CODEX_REPO_ROOT" rev-parse --short HEAD)"

codex_append_session_note "$session_file" "
## Commit $(codex_now)
- Hash: $commit_hash
- Message: $commit_message
- Paths: $(codex_join_by ', ' "${paths[@]}")"

printf '\nCommitted: %s %s\n' "$commit_hash" "$commit_message"
