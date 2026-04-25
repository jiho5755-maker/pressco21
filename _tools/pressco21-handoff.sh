#!/bin/bash
# Durable PRESSCO21 handoff for Codex/Claude/operator session switches.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/pressco21-handoff.sh "<summary>" "<next step>" [--risk "<risk>"] [--label "<label>"]
    [--scope "<scope>" --subdirectory "<scope-path>"] [--promote-global]
    [--no-commit] [--no-push] [path...]

Meaning:
  This is the safe command for "핸드오프해줘". It creates both:
    1) ignored local output/codex-handoffs note, and
    2) Git-tracked team/handoffs registry entries.
  By default it commits the tracked handoff files and pushes the current branch.

Examples:
  bash _tools/pressco21-handoff.sh "CRM QA paused" "Run Playwright smoke" --risk "login fixture unverified"
  bash _tools/pressco21-handoff.sh "docs done" "merge branch later" --label docs-final docs/
USAGE
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ $# -lt 2 ]; then
  usage
  exit 1
fi

summary="$1"
next_step="$2"
shift 2

risk=""
label="handoff"
scope=""
subdirectory=""
promote_global=0
commit_handoff=1
push_branch=1
paths=()

while [ $# -gt 0 ]; do
  case "$1" in
    --risk)
      risk="${2:-}"
      shift 2
      ;;
    --label)
      label="${2:-}"
      shift 2
      ;;
    --scope)
      scope="${2:-}"
      shift 2
      ;;
    --subdirectory)
      subdirectory="${2:-}"
      shift 2
      ;;
    --promote-global)
      promote_global=1
      shift
      ;;
    --no-commit)
      commit_handoff=0
      shift
      ;;
    --no-push)
      push_branch=0
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      paths+=("$1")
      shift
      ;;
  esac
done

branch="$(codex_current_branch)"
if [ "$branch" = "main" ] && [ "$commit_handoff" -eq 1 ]; then
  cat >&2 <<'EOF_MAIN'
Refusing to commit a handoff directly on main.
Create/open a project worktree first, or rerun with --no-commit --no-push for a local-only emergency note.
EOF_MAIN
  exit 1
fi

pre_staged="$(git -C "$CODEX_REPO_ROOT" diff --cached --name-only || true)"
if [ -n "$pre_staged" ]; then
  echo "Index already has staged changes. Commit/unstage them before durable handoff." >&2
  echo "$pre_staged" >&2
  exit 1
fi

save_args=("$summary" "$next_step" --label "$label")
if [ -n "$risk" ]; then
  save_args+=(--risk "$risk")
fi
if [ -n "$scope" ] || [ -n "$subdirectory" ]; then
  if [ -z "$scope" ] || [ -z "$subdirectory" ]; then
    echo "--scope and --subdirectory must be used together." >&2
    exit 1
  fi
  save_args+=(--scope "$scope" --subdirectory "$subdirectory")
fi
if [ "$promote_global" -eq 1 ]; then
  save_args+=(--promote-global)
fi
if [ ${#paths[@]} -gt 0 ]; then
  save_args+=("${paths[@]}")
fi

bash "$SCRIPT_DIR/codex-save.sh" "${save_args[@]}"

tracked_changes="$(git -C "$CODEX_REPO_ROOT" status --porcelain -- team/handoffs || true)"
if [ -z "$tracked_changes" ]; then
  echo "No tracked team/handoffs changes were created. Durable handoff did not produce a Git-tracked record." >&2
  exit 1
fi

printf '\nTracked handoff changes:\n%s\n' "$tracked_changes"

if [ "$commit_handoff" -eq 1 ]; then
  git -C "$CODEX_REPO_ROOT" add -- team/handoffs
  if git -C "$CODEX_REPO_ROOT" diff --cached --quiet -- team/handoffs; then
    echo "No staged handoff diff after git add." >&2
    exit 1
  fi

  commit_message="[codex] handoff 저장: $label"
  git -C "$CODEX_REPO_ROOT" commit -m "$commit_message"
  commit_hash="$(git -C "$CODEX_REPO_ROOT" rev-parse --short HEAD)"
  printf '\nCommitted durable handoff: %s %s\n' "$commit_hash" "$commit_message"
fi

if [ "$push_branch" -eq 1 ]; then
  if [ "$commit_handoff" -ne 1 ]; then
    echo "Skipping push because --no-commit was used." >&2
  else
    if git -C "$CODEX_REPO_ROOT" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
      git -C "$CODEX_REPO_ROOT" push origin "$branch"
    else
      git -C "$CODEX_REPO_ROOT" push -u origin "$branch"
    fi
    printf '\nPushed durable handoff branch: origin/%s\n' "$branch"
  fi
fi

remaining="$(git -C "$CODEX_REPO_ROOT" status --short || true)"
printf '\nFinal git status:\n%s\n' "${remaining:-'(clean)'}"
if [ -n "$remaining" ]; then
  cat <<'EOF_WARN'

WARNING: Some working-tree changes remain local. The handoff was pushed, but those remaining files are not preserved on remote unless separately committed/pushed.
EOF_WARN
fi
