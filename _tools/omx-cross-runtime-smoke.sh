#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BRIDGE="$SCRIPT_DIR/shared-agent-bridge.sh"
LIVE="$SCRIPT_DIR/omx-founder-facing-live.sh"
CLAUDE_EXAMPLES="$HOME/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/.claude/skills/pressco21-core-personas/founder-facing-output-examples.md"
TMP_DIR="${TMPDIR:-/tmp}/omx-cross-runtime-smoke"
mkdir -p "$TMP_DIR"

log() {
  echo "$*"
}

log '=== step 1: sync status ==='
bash "$BRIDGE" sync-all > "$TMP_DIR/bridge-sync.txt"
cat "$TMP_DIR/bridge-sync.txt"

log ''
log '=== step 2: latest Claude handoff bridge ==='
bash "$LIVE" --latest-claude > "$TMP_DIR/latest-claude.md"
cat "$TMP_DIR/latest-claude.md"

log ''
log '=== step 3: OMX dedicated helper outputs ==='
TEAM_OUT="$TMP_DIR/team-meeting.md"
VERIFY_OUT="$TMP_DIR/verification.md"
HANDOFF_OUT="$TMP_DIR/handoff.md"
REPORT_OUT="$TMP_DIR/execution-report.md"

bash "$REPO_ROOT/_tools/omx-team-meeting-callsite.sh"   --summary "지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다."   --findings-json '[{"agent_id":"han-jihoon-cso","heading":"한지훈님 종합","text":"같은 직원 정체성은 유지하되 런타임 역할은 나누는 구조가 가장 현실적입니다."},{"agent_id":"park-seoyeon-cfo","heading":"박서연님 관점","text":"공통 계약 없이 병렬 구현을 밀면 유지비가 커집니다."}]'   --risks-json '["실제 runtime wrapper는 아직 미구현입니다."]'   --next-json '["Claude는 continuity를 정리합니다.","OMX는 founder-facing output wrapper를 구현합니다."]' > "$TEAM_OUT"

echo '--- team-meeting ---'
cat "$TEAM_OUT"
echo

bash "$REPO_ROOT/_tools/omx-verification-callsite.sh"   --summary "Claude-side continuity 구조는 shared-kernel 계약과 크게 충돌하지 않습니다."   --checks-json '["SessionStart/Stop 훅 존재","shared-kernel roster 참조","handoff contract 사용"]'   --risks-json '["Stop 훅 async"]'   --next-json '["save handoff를 운영 기준으로 본다"]' > "$VERIFY_OUT"

echo '--- verification ---'
cat "$VERIFY_OUT"
echo

bash "$REPO_ROOT/_tools/omx-handoff-callsite.sh"   --summary "founder-facing output wrapper 규격 초안을 만들었습니다."   --participants-json '["yoon-haneul-pm","han-jihoon-cso"]'   --checks-json '["canonical roster 기준 정렬","handoff contract 기준 확인"]'   --risks-json '["실제 runtime wrapper는 아직 미구현입니다."]'   --next-json '["team meeting / verification 출력에 이 규격을 적용합니다."]' > "$HANDOFF_OUT"

echo '--- handoff ---'
cat "$HANDOFF_OUT"
echo

bash "$REPO_ROOT/_tools/omx-execution-report-callsite.sh"   --summary "OMX founder-facing output formatter 프로토타입과 smoke fixtures를 추가했습니다."   --checks-json '["renderer가 canonical roster를 읽고 display_name으로 출력함","4종 context를 지원함"]'   --risks-json '["실제 runtime touchpoint 연결은 아직 남아 있습니다."]'   --next-json '["실제 OMX output wrapper 적용 지점을 정리합니다."]' > "$REPORT_OUT"

echo '--- execution-report ---'
cat "$REPORT_OUT"
echo

log '=== step 4: assertions on OMX outputs ==='
rg -n "한지훈님|박서연님|최민석님|유준호님|윤하늘님|팀 회의" "$TMP_DIR" >/dev/null
! rg -n "^## .*architect|^## .*critic|^## .*analyst|^## .*verifier|^## .*executor" "$TMP_DIR" >/dev/null
rg -n "다음 단계|다음 행동|다음:" "$TMP_DIR" >/dev/null
log 'PASS: OMX founder-facing outputs contain canonical names, suppress runtime-role headings, and include next-step sections.'

log ''
log '=== step 5: compare against Claude examples ==='
if [ -f "$CLAUDE_EXAMPLES" ]; then
  rg -n '^## 팀 회의 종합' "$CLAUDE_EXAMPLES" >/dev/null
  rg -n '^## 최민석님 검토' "$CLAUDE_EXAMPLES" >/dev/null
  rg -n '^## 저장 완료' "$CLAUDE_EXAMPLES" >/dev/null
  rg -n '^\[3시간 전\]' "$CLAUDE_EXAMPLES" >/dev/null || true
  log 'PASS: Claude founder-facing example file is present and contains expected headline patterns.'
else
  log 'WARN: Claude founder-facing example file not found; skipping direct example check.'
fi

log ''
log '=== result ==='
log 'Cross-runtime smoke PASS: sync, latest handoff bridge, OMX founder-facing output, and Claude example presence all checked.'
