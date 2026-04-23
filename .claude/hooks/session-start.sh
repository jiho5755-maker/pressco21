#!/bin/bash
# PRESSCO21 Session Start Hook (UserPromptSubmit)
# Shared Agent Ecosystem — Claude Adapter
#
# 현재 cwd의 git worktree/branch/project scope에 맞는 handoff만
# "현재 작업 이어받기" 컨텍스트로 주입한다.

set -euo pipefail

BASE_REPO_ROOT="${PRESSCO21_MAIN_WORKTREE:-/Users/jangjiho/workspace/pressco21}"
WORKTREE_ROOT="${PRESSCO21_WORKTREES:-/Users/jangjiho/workspace/pressco21-worktrees}"
MAX_AGE_SEC="${PRESSCO21_HANDOFF_MAX_AGE_SEC:-604800}"
SHOW_GLOBAL_REFERENCE="${PRESSCO21_HANDOFF_SHOW_GLOBAL:-0}"

payload="$(cat || true)"
cwd="$(echo "$payload" | jq -r '.cwd // empty' 2>/dev/null || true)"
session_id="$(echo "$payload" | jq -r '.session_id // empty' 2>/dev/null || true)"
[[ -z "$cwd" ]] && cwd="$(pwd)"

# Claude UserPromptSubmit은 매 프롬프트마다 호출되므로 세션당 1회만 출력한다.
debounce_key="${session_id:-$(printf '%s' "$cwd" | shasum | awk '{print $1}')}"
debounce_file="/tmp/claude-session-start-${debounce_key}"
if [[ -f "$debounce_file" ]]; then
  exit 0
fi
touch "$debounce_file"

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

git_root=""
branch=""
if [[ -d "$cwd" ]] && git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)"
  branch="$(git -C "$cwd" branch --show-current 2>/dev/null || true)"
fi

# PRESSCO21 전용 hook이므로 외부 폴더에서는 조용히 종료한다.
if [[ -z "$git_root" ]]; then
  exit 0
fi
if ! is_inside_path "$git_root" "$BASE_REPO_ROOT" && ! is_inside_path "$git_root" "$WORKTREE_ROOT"; then
  exit 0
fi

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

base_real="$(canonical_path "$BASE_REPO_ROOT")"
git_real="$(canonical_path "$git_root")"
project="$(project_from_branch "$branch")"
if [[ "$git_real" == "$base_real" ]]; then
  worktree_slot="main"
else
  worktree_slot="$(basename "$git_root")"
fi
safe_branch="$(safe_segment "$branch")"

get_field() {
  local file="$1" key="$2"
  awk -v key="$key" '
    $0 == "---" { count++; next }
    count == 1 {
      split($0, parts, ":")
      k=parts[1]
      gsub(/^[ \t]+|[ \t]+$/, "", k)
      if (k == key) {
        sub("^[^:]*:[ \t]*", "")
        print
        exit
      }
    }
  ' "$file" 2>/dev/null || true
}

compact_text() {
  local raw="$1" fallback="$2" max_len="${3:-160}"
  raw="$(printf '%s' "$raw" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
  if [[ -z "$raw" ]]; then
    raw="$fallback"
  fi
  if (( ${#raw} > max_len )); then
    raw="${raw:0:max_len}..."
  fi
  printf '%s\n' "$raw"
}

canonical_owner_display() {
  case "$1" in
    han-jihoon-cso|chief-strategy-officer) echo "한지훈님(CSO)" ;;
    park-seoyeon-cfo|chief-financial-officer) echo "박서연님(CFO)" ;;
    jung-yuna-cmo|chief-marketing-officer) echo "정유나님(CMO)" ;;
    kim-dohyun-coo|chief-operating-officer) echo "김도현님(COO)" ;;
    choi-minseok-cto|chief-technology-officer) echo "최민석님(CTO)" ;;
    yoon-haneul-pm|project-manager) echo "윤하늘님(PM)" ;;
    cho-hyunwoo-legal|compliance-advisor) echo "조현우님(법무)" ;;
    kang-yerin-hr|hr-coach|staff-development-coach) echo "강예린님(HR)" ;;
    yoo-junho-paircoder|vibe-coder-buddy|pair-coder) echo "유준호님(페어코더)" ;;
    claude-direct) echo "Claude 직접 작업" ;;
    "") echo "담당 미정" ;;
    *) echo "$1" ;;
  esac
}

format_age() {
  local file="$1" mod now age hours days
  if [[ "$(uname)" == "Darwin" ]]; then
    mod="$(stat -f %m "$file" 2>/dev/null || echo 0)"
  else
    mod="$(stat -c %Y "$file" 2>/dev/null || echo 0)"
  fi
  now="$(date +%s)"
  age=$(( now - mod ))
  if (( age < 3600 )); then
    echo "방금 전"
  elif (( age < 86400 )); then
    hours=$(( age / 3600 ))
    echo "${hours}시간 전"
  else
    days=$(( age / 86400 ))
    echo "${days}일 전"
  fi
}

is_fresh() {
  local file="$1" mod now age
  if [[ "$(uname)" == "Darwin" ]]; then
    mod="$(stat -f %m "$file" 2>/dev/null || echo 0)"
  else
    mod="$(stat -c %Y "$file" 2>/dev/null || echo 0)"
  fi
  now="$(date +%s)"
  age=$(( now - mod ))
  (( age <= MAX_AGE_SEC ))
}

matches_current_scope() {
  local file="$1" fm_branch fm_path fm_slot fm_scope fm_status
  fm_status="$(get_field "$file" status)"
  [[ "$fm_status" == "archived" || "$fm_status" == "merged" ]] && return 1
  fm_slot="$(get_field "$file" worktree_slot)"
  fm_path="$(get_field "$file" worktree_path)"
  fm_branch="$(get_field "$file" branch)"
  fm_scope="$(get_field "$file" scope_type)"

  if [[ "$fm_scope" == "worktree" && -n "$fm_slot" && "$fm_slot" == "$worktree_slot" ]]; then
    return 0
  fi
  if [[ -n "$fm_path" && "$fm_path" != "unknown" ]]; then
    [[ "$(canonical_path "$fm_path")" == "$git_real" ]] && return 0
  fi
  if [[ -n "$fm_branch" && -n "$branch" && "$fm_branch" == "$branch" && "$worktree_slot" != "main" ]]; then
    return 0
  fi
  return 1
}

render_handoff() {
  local label="$1" file="$2" owner summary next_step open_risks learn runtime age output is_placeholder
  owner="$(get_field "$file" owner_agent_id)"
  summary="$(compact_text "$(get_field "$file" summary)" "요약이 아직 정리되지 않았습니다." 170)"
  next_step="$(compact_text "$(get_field "$file" next_step)" "다음 단계가 아직 정리되지 않았습니다." 170)"
  open_risks="$(compact_text "$(get_field "$file" open_risks)" "" 120)"
  learn="$(compact_text "$(get_field "$file" learn_to_save)" "" 120)"
  runtime="$(get_field "$file" runtime)"
  age="$(format_age "$file")"

  is_placeholder=false
  if [[ "$summary" == *"자동 생성"* || "$summary" == *"미정"* || "$next_step" == *"미정"* ]]; then
    is_placeholder=true
  fi

  if [[ "$is_placeholder" == "true" && "$next_step" != "다음 단계가 아직 정리되지 않았습니다." ]]; then
    output="[$label][$age] 이전 세션 handoff가 미완성입니다 (/save 미실행). 이어서: $next_step"
  elif [[ "$is_placeholder" == "true" ]]; then
    output="[$label][$age] 이전 세션 handoff가 미완성입니다 (/save 미실행)."
  else
    output="[$label][$age] $(canonical_owner_display "$owner")"
    [[ "$runtime" == "codex-omx" ]] && output="$output (실행실에서)"
    output="$output: $summary"
    if [[ "$label" == "현재 작업 이어받기" ]]; then
      output="$output → 이어서: $next_step"
    else
      output="$output | 참고 다음: $next_step"
    fi
    [[ -n "$open_risks" && "$open_risks" != "[]" ]] && output="$output | 주의: $open_risks"
    [[ -n "$learn" && "$learn" != "[]" ]] && output="$output | 승격 후보: $learn"
  fi
  printf '%s\n' "$output"
}

try_render_candidate() {
  local label="$1" file="$2" mode="$3"
  [[ -f "$file" ]] || return 1
  is_fresh "$file" || return 1
  case "$mode" in
    exact)
      matches_current_scope "$file" || return 1
      ;;
    project)
      [[ "$(get_field "$file" project)" == "$project" ]] || return 1
      ;;
    repo)
      :
      ;;
  esac
  render_handoff "$label" "$file"
  return 0
}

# 1) 현재 worktree 자체에 들어 있는 latest가 현재 branch/worktree와 맞으면 사용한다.
if try_render_candidate "현재 작업 이어받기" "$git_root/team/handoffs/latest.md" exact; then
  exit 0
fi

# 2) 중앙 registry의 worktree/branch/project scope를 순서대로 확인한다.
if try_render_candidate "현재 작업 이어받기" "$BASE_REPO_ROOT/team/handoffs/worktrees/$worktree_slot/latest.md" exact; then
  exit 0
fi
if [[ -n "$safe_branch" ]] && try_render_candidate "현재 작업 이어받기" "$BASE_REPO_ROOT/team/handoffs/branches/$safe_branch/latest.md" exact; then
  exit 0
fi
if [[ "$project" != "unknown" && "$project" != "repo" ]] && try_render_candidate "같은 프로젝트 참고" "$BASE_REPO_ROOT/team/handoffs/projects/$project/latest.md" project; then
  exit 0
fi

# 3) 전역 latest는 main 통합 저장소에서만 기본 표시한다. 다른 worktree에서는 opt-in 참고만 허용한다.
if [[ "$worktree_slot" == "main" || "$SHOW_GLOBAL_REFERENCE" == "1" ]]; then
  try_render_candidate "전역 참고" "$BASE_REPO_ROOT/team/handoffs/latest.md" repo || true
fi

exit 0
