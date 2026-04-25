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
    [--risk "<risk>"] [--tracked-handoff] [--promote-global] [path...]

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
tracked_handoff=0
promote_global=0

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
    --tracked-handoff)
      tracked_handoff=1
      shift
      ;;
    --promote-global)
      promote_global=1
      tracked_handoff=1
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
branch_scope="$(codex_branch_scope)"
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

## Worktree Scope Snapshot

- Branch: $branch
- Scope: $branch_scope

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

if [ "$tracked_handoff" -eq 1 ]; then
  date_ymd="$(date '+%Y-%m-%d')"
  worktree_slot="$(basename "$CODEX_REPO_ROOT")"
  safe_branch="$(codex_safe_segment "$branch")"
  safe_label="$(codex_slugify "$handoff_label")"
  scope_type="worktree"
  project="$branch_scope"
  case "$branch" in
    main)
      scope_type="repo"
      worktree_slot="main"
      project="repo"
      ;;
  esac
  case "$project" in
    ""|\(*\)) project="unknown" ;;
  esac
  safe_project="$(codex_safe_segment "$project")"
  output_handoff_rel="$(codex_repo_rel "$handoff_file")"

  changed_artifacts=()
  if [ ${#paths[@]} -gt 0 ]; then
    changed_artifacts=("${paths[@]}")
  else
    while IFS= read -r status_line; do
      [ -n "$status_line" ] && changed_artifacts+=("$status_line")
    done < <(git -C "$CODEX_REPO_ROOT" status --short || true)
    if [ ${#changed_artifacts[@]} -eq 0 ]; then
      changed_artifacts=("(no working-tree changes at handoff time)")
    fi
  fi

  primary_dir="$CODEX_REPO_ROOT/team/handoffs/worktrees/$worktree_slot"
  if [ "$scope_type" = "repo" ]; then
    primary_dir="$CODEX_REPO_ROOT/team/handoffs"
  fi
  branch_dir="$CODEX_REPO_ROOT/team/handoffs/branches/$safe_branch"
  project_dir="$CODEX_REPO_ROOT/team/handoffs/projects/$safe_project"
  archive_dir="$CODEX_REPO_ROOT/team/handoffs/archive/$date_ymd"
  named_file="$CODEX_REPO_ROOT/team/handoffs/$date_ymd-$safe_label.md"
  tracked_primary="$primary_dir/latest.md"

  mkdir -p "$primary_dir" "$branch_dir" "$archive_dir"
  if [ "$project" != "unknown" ] && [ "$project" != "repo" ]; then
    mkdir -p "$project_dir"
  fi

  cat > "$tracked_primary" <<EOF
---
handoff_id: HOFF-$handoff_id
created_at: $(date '+%Y-%m-%dT%H:%M:%S%z')
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
contributors: []
scope_type: $scope_type
project: $project
worktree_slot: $worktree_slot
repo_root: $CODEX_REPO_ROOT
branch: "$branch"
worktree_path: "$CODEX_REPO_ROOT"
source_cwd: "$PWD"
commit_sha: $head_commit
status: active
promoted_to_global: $([ "$promote_global" -eq 1 ] && printf 'true' || printf 'false')
summary: "$(codex_yaml_escape "$summary")"
decision: "$(codex_yaml_escape "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다.")"
changed_artifacts:
$(codex_yaml_list "${changed_artifacts[@]}")
verification:
  - "$(codex_yaml_escape "local output handoff saved: $output_handoff_rel")"
  - "$(codex_yaml_escape "git status captured at handoff time")"
open_risks:
  - "$(codex_yaml_escape "${risk:-"(none)"}")"
next_step: "$(codex_yaml_escape "$next_step")"
learn_to_save:
  - "$(codex_yaml_escape "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다.")"
local_output_handoff: "$output_handoff_rel"
session_log: "$session_rel"
backup_folder: "$backup_rel"
---

# Codex durable handoff

## 요약
$summary

## 다음 작업
$next_step

## 리스크
${risk:-"(none)"}

## 로컬 output handoff
\`$output_handoff_rel\`

## Git 상태

\`\`\`text
$git_status
\`\`\`

## 최근 커밋

\`\`\`text
$recent_commits
\`\`\`
EOF

  cp "$tracked_primary" "$branch_dir/latest.md"
  if [ "$project" != "unknown" ] && [ "$project" != "repo" ]; then
    cp "$tracked_primary" "$project_dir/latest.md"
  fi
  cp "$tracked_primary" "$archive_dir/$worktree_slot-$safe_branch-HOFF-$handoff_id.md"
  cp "$tracked_primary" "$named_file"
  if [ "$scope_type" = "repo" ] || [ "$promote_global" -eq 1 ]; then
    cp "$tracked_primary" "$CODEX_REPO_ROOT/team/handoffs/latest.md"
  fi

  printf '\nTracked handoff saved:\n'
  printf '  - %s\n' "$(codex_repo_rel "$tracked_primary")"
  printf '  - %s\n' "$(codex_repo_rel "$branch_dir/latest.md")"
  if [ "$project" != "unknown" ] && [ "$project" != "repo" ]; then
    printf '  - %s\n' "$(codex_repo_rel "$project_dir/latest.md")"
  fi
  printf '  - %s\n' "$(codex_repo_rel "$named_file")"
  printf '\nDurable handoff is not complete until these tracked files are committed and pushed.\n'
fi
