#!/bin/bash
# OMX Handoff Reader — Claude의 latest.md를 파싱하여 compact 출력
# Codex/OMX 세션 시작 시 이전 세션 컨텍스트를 파악하는 데 사용
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo /Users/jangjiho/workspace/pressco21)"

HANDOFF_SEARCH_ROOTS=(
  "$REPO_ROOT/team/handoffs"
  "/Users/jangjiho/workspace/pressco21/team/handoffs"
  "/Users/jangjiho/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/team/handoffs"
)

get_display_name() {
  case "$1" in
    han-jihoon-cso|chief-strategy-officer) echo "한지훈님(CSO)" ;;
    park-seoyeon-cfo|chief-financial-officer) echo "박서연님(CFO)" ;;
    choi-minseok-cto|chief-technology-officer) echo "최민석님(CTO)" ;;
    jung-yuna-cmo|chief-marketing-officer) echo "정유나님(CMO)" ;;
    kim-dohyun-coo|chief-operating-officer) echo "김도현님(COO)" ;;
    yoon-haneul-pm|project-manager) echo "윤하늘님(PM)" ;;
    cho-hyunwoo-legal|compliance-advisor) echo "조현우님(법무)" ;;
    kang-yerin-hr|hr-coach) echo "강예린님(HR)" ;;
    yoo-junho-paircoder|vibe-coder-buddy) echo "유준호님(페어코더)" ;;
    claude-direct) echo "Claude 직접 작업" ;;
    *) echo "$1" ;;
  esac
}

handoff_file=""
for root in "${HANDOFF_SEARCH_ROOTS[@]}"; do
  candidate="$root/latest.md"
  if [[ -f "$candidate" ]]; then
    handoff_file="$candidate"
    break
  fi
done

if [[ -z "$handoff_file" ]]; then
  echo "이전 세션 handoff를 찾을 수 없습니다."
  exit 0
fi

summary="" next_step="" open_risks="" runtime="" owner="" learn_to_save=""
in_frontmatter=false frontmatter_done=false

while IFS= read -r line; do
  [[ "$frontmatter_done" == "true" ]] && break
  if [[ "$line" == "---" ]]; then
    if [[ "$in_frontmatter" == "true" ]]; then frontmatter_done=true
    else in_frontmatter=true; fi
    continue
  fi
  if [[ "$in_frontmatter" == "true" ]]; then
    key=$(echo "$line" | cut -d: -f1 | tr -d ' ')
    val=$(echo "$line" | cut -d: -f2- | sed 's/^ *//')
    case "$key" in
      summary) summary="$val" ;;
      next_step) next_step="$val" ;;
      open_risks) open_risks="$val" ;;
      runtime) runtime="$val" ;;
      owner_agent_id) owner="$val" ;;
      learn_to_save) learn_to_save="$val" ;;
    esac
  fi
done < "$handoff_file"

if [[ "$(uname)" == "Darwin" ]]; then
  handoff_mod=$(stat -f %m "$handoff_file" 2>/dev/null || echo 0)
else
  handoff_mod=$(stat -c %Y "$handoff_file" 2>/dev/null || echo 0)
fi
now=$(date +%s)
age_sec=$(( now - handoff_mod ))
age_hours=$(( age_sec / 3600 ))

if (( age_hours < 1 )); then age_label="방금 전"
elif (( age_hours < 24 )); then age_label="${age_hours}시간 전"
else age_label="$(( age_hours / 24 ))일 전"; fi

owner_display="$(get_display_name "$owner")"
room_label=""
[[ "$runtime" == "codex-omx" ]] && room_label=" (실행실에서)"

output="[$age_label] ${owner_display}${room_label}:"
[[ -n "$summary" ]] && output="$output $summary"
[[ -n "$next_step" ]] && output="$output -> 이어서: $next_step"
[[ -n "$open_risks" ]] && output="$output | 주의: $open_risks"

echo "$output"
