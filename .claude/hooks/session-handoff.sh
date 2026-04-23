#!/bin/bash
# PRESSCO21 Session Handoff Hook (Stop)
# Shared Agent Ecosystem — Claude Adapter
#
# 현재 cwd의 git worktree/branch/project scope에 맞는 handoff registry에 기록한다.
# root team/handoffs/latest.md는 main 통합 세션 또는 명시적 promote 때만 갱신한다.

set -euo pipefail

BASE_REPO_ROOT="${PRESSCO21_MAIN_WORKTREE:-/Users/jangjiho/workspace/pressco21}"
WORKTREE_ROOT="${PRESSCO21_WORKTREES:-/Users/jangjiho/workspace/pressco21-worktrees}"
AGENT_LOG="$HOME/.claude/hooks/agent-usage.log"
LOG_FILE="$HOME/.claude/hooks/session-handoff.log"
DEBOUNCE_SEC="${PRESSCO21_HANDOFF_DEBOUNCE_SEC:-120}"
PROMOTE_GLOBAL="${PRESSCO21_HANDOFF_PROMOTE_GLOBAL:-0}"

now_iso="$(TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S+09:00')"
now_epoch="$(date +%s)"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

payload="$(cat || true)"
cwd="$(echo "$payload" | jq -r '.cwd // empty' 2>/dev/null || true)"
session_id="$(echo "$payload" | jq -r '.session_id // empty' 2>/dev/null || true)"
[[ -z "$cwd" ]] && cwd="$(pwd)"

canonical_path() {
  local raw="$1"
  python3 - "$raw" <<'PY' 2>/dev/null || printf '%s\n' "$raw"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
}

is_inside_path() {
  local child parent rel
  child="$(canonical_path "$1")"
  parent="$(canonical_path "$2")"
  rel="$(python3 - "$child" "$parent" <<'PY' 2>/dev/null || true
import os, sys
try:
    print(os.path.relpath(sys.argv[1], sys.argv[2]))
except Exception:
    print('..')
PY
)"
  [[ "$rel" == "." || "$rel" != ..* ]]
}

if [[ ! -d "$cwd" ]] || ! git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "SKIP: non-git cwd=$cwd"
  exit 0
fi

git_root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$git_root" ]]; then
  log "SKIP: no git root cwd=$cwd"
  exit 0
fi

if ! is_inside_path "$git_root" "$BASE_REPO_ROOT" && ! is_inside_path "$git_root" "$WORKTREE_ROOT"; then
  log "SKIP: outside PRESSCO21 git_root=$git_root"
  exit 0
fi

branch="$(git -C "$git_root" branch --show-current 2>/dev/null || echo unknown)"
commit_sha="$(git -C "$git_root" rev-parse --short HEAD 2>/dev/null || echo unknown)"
base_real="$(canonical_path "$BASE_REPO_ROOT")"
git_real="$(canonical_path "$git_root")"

project_from_branch() {
  case "$1" in
    work/offline-crm/*) printf 'offline-crm\n' ;;
    work/partnerclass/*) printf 'partnerclass\n' ;;
    work/n8n/*) printf 'n8n\n' ;;
    work/mini-app/*) printf 'mini-app\n' ;;
    work/mobile-app/*) printf 'mobile-app\n' ;;
    work/homepage/*) printf 'homepage\n' ;;
    work/workspace/*) printf 'workspace\n' ;;
    work/team/*) printf 'team\n' ;;
    work/mcp-servers/*) printf 'mcp-servers\n' ;;
    main) printf 'repo\n' ;;
    *) printf 'unknown\n' ;;
  esac
}

safe_segment() {
  printf '%s' "$1" | tr '/ ' '__' | sed -E 's/[^A-Za-z0-9._-]+/-/g; s/^-+//; s/-+$//'
}

project="$(project_from_branch "$branch")"
if [[ "$git_real" == "$base_real" ]]; then
  worktree_slot="main"
  scope_type="repo"
else
  worktree_slot="$(basename "$git_root")"
  scope_type="worktree"
fi
safe_branch="$(safe_segment "$branch")"
safe_project="$(safe_segment "$project")"

# debounce는 세션/브랜치/작업실 단위로 적용한다.
debounce_key="${session_id:-$worktree_slot-$safe_branch}"
debounce_file="/tmp/claude-session-handoff-${debounce_key}"
if [[ -f "$debounce_file" ]]; then
  last_run="$(cat "$debounce_file" 2>/dev/null || echo 0)"
  if (( now_epoch - last_run < DEBOUNCE_SEC )); then
    log "SKIP: debounce ${DEBOUNCE_SEC}s key=$debounce_key"
    exit 0
  fi
fi
echo "$now_epoch" > "$debounce_file"

canonical_agent_id() {
  case "$1" in
    han-jihoon-cso|chief-strategy-officer) echo "han-jihoon-cso" ;;
    park-seoyeon-cfo|chief-financial-officer) echo "park-seoyeon-cfo" ;;
    jung-yuna-cmo|chief-marketing-officer) echo "jung-yuna-cmo" ;;
    kim-dohyun-coo|chief-operating-officer) echo "kim-dohyun-coo" ;;
    choi-minseok-cto|chief-technology-officer) echo "choi-minseok-cto" ;;
    yoon-haneul-pm|project-manager) echo "yoon-haneul-pm" ;;
    cho-hyunwoo-legal|compliance-advisor) echo "cho-hyunwoo-legal" ;;
    kang-yerin-hr|hr-coach|staff-development-coach) echo "kang-yerin-hr" ;;
    yoo-junho-paircoder|vibe-coder-buddy|pair-coder) echo "yoo-junho-paircoder" ;;
    *) echo "" ;;
  esac
}

agent_display_name() {
  case "$1" in
    han-jihoon-cso) echo "한지훈님(CSO)" ;;
    park-seoyeon-cfo) echo "박서연님(CFO)" ;;
    jung-yuna-cmo) echo "정유나님(CMO)" ;;
    kim-dohyun-coo) echo "김도현님(COO)" ;;
    choi-minseok-cto) echo "최민석님(CTO)" ;;
    yoon-haneul-pm) echo "윤하늘님(PM)" ;;
    cho-hyunwoo-legal) echo "조현우님(법무)" ;;
    kang-yerin-hr) echo "강예린님(HR)" ;;
    yoo-junho-paircoder) echo "유준호님(페어코더)" ;;
    *) echo "Claude 직접 작업" ;;
  esac
}

owner_agent=""
contributor_list=""
if [[ -f "$AGENT_LOG" ]]; then
  session_agents="$(tail -20 "$AGENT_LOG" 2>/dev/null | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}' | sort | uniq -c | sort -rn || true)"
  while IFS= read -r line; do
    raw_agent="$(echo "$line" | awk '{print $2}')"
    [[ -z "$raw_agent" ]] && continue
    canonical="$(canonical_agent_id "$raw_agent")"
    [[ -z "$canonical" ]] && continue
    if [[ -z "$owner_agent" ]]; then
      owner_agent="$canonical"
    elif [[ ",$contributor_list," != *",$canonical,"* && "$canonical" != "$owner_agent" ]]; then
      contributor_list="${contributor_list:+$contributor_list, }$canonical"
    fi
  done <<< "$session_agents"
fi

owner_agent="${owner_agent:-claude-direct}"
contributors="[]"
if [[ -n "$contributor_list" ]]; then
  contributors="[$contributor_list]"
fi
owner_display="$(agent_display_name "$owner_agent")"

recent_commits=""
recent_commits="$(git -C "$git_root" log --oneline -3 2>/dev/null | sed 's/^/  - /' || true)"
[[ -z "$recent_commits" ]] && recent_commits="  - (커밋 없음)"

handoff_id="HOFF-$(TZ=Asia/Seoul date '+%Y-%m-%d')-claude-$(printf '%03d' $((RANDOM % 1000)))"

case "$scope_type" in
  repo)
    primary_dir="$BASE_REPO_ROOT/team/handoffs"
    ;;
  worktree)
    primary_dir="$BASE_REPO_ROOT/team/handoffs/worktrees/$worktree_slot"
    ;;
  *)
    primary_dir="$BASE_REPO_ROOT/team/handoffs/worktrees/$worktree_slot"
    ;;
esac
branch_dir="$BASE_REPO_ROOT/team/handoffs/branches/$safe_branch"
project_dir="$BASE_REPO_ROOT/team/handoffs/projects/$safe_project"
archive_dir="$BASE_REPO_ROOT/team/handoffs/archive/$(TZ=Asia/Seoul date '+%Y-%m-%d')"

mkdir -p "$primary_dir" "$branch_dir" "$archive_dir"
if [[ "$project" != "unknown" && "$project" != "repo" ]]; then
  mkdir -p "$project_dir"
fi

handoff_file="$primary_dir/latest.md"
cat > "$handoff_file" << HANDOFF_EOF
---
handoff_id: $handoff_id
created_at: $now_iso
runtime: claude
owner_agent_id: $owner_agent
contributors: $contributors
scope_type: $scope_type
project: $project
worktree_slot: $worktree_slot
repo_root: $BASE_REPO_ROOT
branch: ${branch:-unknown}
worktree_path: $git_root
source_cwd: $cwd
commit_sha: $commit_sha
status: active
promoted_to_global: false
summary: (자동 생성 — /save 실행 시 Claude 판단으로 갱신됨)
decision: (미정 — /save 실행 시 갱신)
changed_artifacts:
$recent_commits
verification:
  - (미정 — /save 실행 시 갱신)
next_step: (미정 — /save 실행 시 갱신)
open_risks: (미정 — /save 실행 시 갱신)
learn_to_save: []
---

## 담당
$owner_display

## 메모
이 handoff는 Stop 훅에 의해 자동 생성되었습니다.
현재 작업실 scope: $scope_type / $project / $worktree_slot

branch: $branch

\`/save\`를 실행하면 summary, decision, next_step, open_risks, learn_to_save를 판단하여 이 파일을 갱신합니다.
HANDOFF_EOF

cp "$handoff_file" "$branch_dir/latest.md"
if [[ "$project" != "unknown" && "$project" != "repo" ]]; then
  cp "$handoff_file" "$project_dir/latest.md"
fi
cp "$handoff_file" "$archive_dir/${worktree_slot}-${safe_branch}-${handoff_id}.md"

if [[ "$scope_type" == "repo" || "$PROMOTE_GLOBAL" == "1" ]]; then
  cp "$handoff_file" "$BASE_REPO_ROOT/team/handoffs/latest.md"
fi

log "OK: $handoff_id scope=$scope_type project=$project branch=$branch slot=$worktree_slot owner=$owner_agent file=$handoff_file"

exit 0
