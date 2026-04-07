#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-update.sh [--session <log>] [--scope <scope> --subdirectory <scope-path>]
    [--label <label>] [--backup-label <label>] --summary "<summary>" --next "<next step>"
    [--risk "<risk>"] [path...]

Examples:
  bash pressco21/_tools/codex-update.sh --summary "parser drift checked" --next "resume from latest fixture failure" --risk "2 live cases still unverified"
  bash pressco21/_tools/codex-update.sh --label "before-chat-switch" --summary "govt-support audit paused" --next "compare 12 missing paths" n8n-automation/workflows/govt-support docs
  bash pressco21/_tools/codex-update.sh --scope "crm alert fix" --subdirectory "scripts, n8n-automation/workflows/accounting" --summary "session started and saved" --next "continue after review"
EOF
}

session_arg=""
scope=""
subdirectory=""
label=""
backup_label=""
summary=""
next_step=""
risk=""

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
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
    --label)
      label="${2:-}"
      shift 2
      ;;
    --backup-label)
      backup_label="${2:-}"
      shift 2
      ;;
    --summary)
      summary="${2:-}"
      shift 2
      ;;
    --next)
      next_step="${2:-}"
      shift 2
      ;;
    --risk)
      risk="${2:-}"
      shift 2
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

if [ -z "$summary" ] || [ -z "$next_step" ]; then
  usage
  exit 1
fi

paths=("$@")
codex_ensure_dirs

if [ -n "$session_arg" ]; then
  session_file="$(codex_resolve_session "$session_arg")"
else
  latest_session="$(codex_latest_session)"
  if [ -n "$latest_session" ]; then
    session_file="$latest_session"
  elif [ -n "$scope" ] && [ -n "$subdirectory" ]; then
    bash "$SCRIPT_DIR/codex-start.sh" "$scope" "$subdirectory" >/dev/null
    session_file="$(codex_resolve_session "")"
  else
    echo "No session log found. Start one first with codex-start.sh or pass --scope and --subdirectory." >&2
    exit 1
  fi
fi

handoff_label="${label:-update}"
effective_backup_label="${backup_label:-$handoff_label}"
timestamp="$(codex_now)"
handoff_id="$(codex_stamp)-$(codex_slugify "$handoff_label")"
handoff_file="$CODEX_HANDOFF_DIR/$handoff_id.md"
branch="$(codex_git_branch)"
head_commit="$(codex_git_head_short)"
git_status="$(codex_git_status)"
git_diff_stat="$(codex_git_diff_stat)"
recent_commits="$(git -C "$CODEX_REPO_ROOT" log --oneline -3 2>/dev/null || true)"
ai_owner="$(codex_ai_sync_field "Current Owner")"
ai_mode="$(codex_ai_sync_field "Mode")"
ai_scope="$(codex_ai_sync_field "Working Scope")"
ai_subdirectory="$(codex_ai_sync_field "Active Subdirectory")"
omx_status="$(codex_omx_status)"
active_teams="$(find "$CODEX_REPO_ROOT/.omx/state/team" -maxdepth 1 -mindepth 1 -type d -exec basename {} \; 2>/dev/null | sort || true)"
session_rel="$(codex_repo_rel "$session_file")"

codex_append_checkpoint "$session_file" "$handoff_label" "$summary"

backup_dir=""
backup_rel="(none)"
archive_rel="(none)"
patch_rel="(none)"
paths_joined="(none)"
rollback_hint="No scoped backup captured."

if [ ${#paths[@]} -gt 0 ]; then
  backup_dir="$(codex_create_backup "$session_file" "$effective_backup_label" "${paths[@]}")"
  backup_rel="$(codex_repo_rel "$backup_dir")"
  archive_rel="$(codex_repo_rel "$backup_dir/snapshot.tgz")"
  patch_rel="$(codex_repo_rel "$backup_dir/changes.patch")"
  paths_joined="$(codex_join_by ', ' "${paths[@]}")"
  rollback_hint="git -C \"$CODEX_REPO_ROOT\" apply --reject \"$CODEX_REPO_ROOT/$patch_rel\" || tar -xzf \"$CODEX_REPO_ROOT/$archive_rel\" -C \"$CODEX_REPO_ROOT\""
fi

if [ -z "$recent_commits" ]; then
  recent_commits="(none)"
fi

if [ -z "$active_teams" ]; then
  active_teams="(none)"
fi

cat > "$handoff_file" <<EOF
# Codex Handoff Note

- Handoff ID: $handoff_id
- Created At: $timestamp
- Label: $handoff_label
- Branch: $branch
- Head Commit: $head_commit
- Session Log: $session_rel
- Summary: $summary
- Next Step: $next_step
- Risk: ${risk:-"(none)"}
- Backup Folder: $backup_rel
- Backup Paths: $paths_joined

## AI_SYNC Snapshot

- Current Owner: $ai_owner
- Mode: $ai_mode
- Working Scope: $ai_scope
- Active Subdirectory: $ai_subdirectory

## OMX Snapshot

- Status: $omx_status
- Active Teams: $active_teams

## Recent Commits

\`\`\`text
$recent_commits
\`\`\`

## Git Diff Stat

\`\`\`text
$git_diff_stat
\`\`\`

## Git Status

\`\`\`text
$git_status
\`\`\`

## Rollback Hint

- Patch: $patch_rel
- Archive: $archive_rel
- Command: $rollback_hint

## Suggested Resume Prompt

\`\`\`text
이전 Codex 세션을 이어가자.
핸드오프: $session_rel
업데이트 노트: $(codex_repo_rel "$handoff_file")
요약: $summary
다음 작업: $next_step
리스크: ${risk:-"(none)"}
먼저 git status와 이 핸드오프를 기준으로 이어서 진행해줘.
\`\`\`
EOF

codex_append_session_note "$session_file" "
## Update $timestamp
- Handoff: $(codex_repo_rel "$handoff_file")
- Summary: $summary
- Next Step: $next_step
- Risks: ${risk:-"(none)"}
- Backup: $backup_rel"

printf 'Update saved: %s\n' "$(codex_repo_rel "$handoff_file")"
if [ -n "$backup_dir" ]; then
  printf 'Scoped backup: %s\n' "$backup_rel"
fi
printf '\nSuggested next-session prompt:\n'
printf '이전 Codex 세션을 이어가자. 업데이트 노트 `%s` 기준으로 다음 작업 `%s`부터 진행해줘.\n' "$(codex_repo_rel "$handoff_file")" "$next_step"
