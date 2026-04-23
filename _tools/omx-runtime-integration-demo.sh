#!/bin/bash
set -euo pipefail

# Demo script showing how real OMX shell call-sites would source and use
# the founder-facing helper functions directly.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

TMP_DIR="${TMPDIR:-/tmp}/omx-runtime-integration-demo"
mkdir -p "$TMP_DIR"

emit_case() {
  local name="$1"
  local out="$TMP_DIR/${name}.md"
  shift
  "$@" > "$out"
  echo "=== ${name} ==="
  cat "$out"
  echo
}

FINDINGS='[
  {"agent_id":"han-jihoon-cso","heading":"한지훈님 종합","text":"같은 직원 정체성은 유지하되 런타임 역할은 나누는 구조가 가장 현실적입니다."},
  {"agent_id":"park-seoyeon-cfo","heading":"박서연님 관점","text":"공통 계약 없이 병렬 구현을 밀면 유지비가 커집니다."}
]'
TEAM_RISKS='["실제 runtime wrapper는 아직 미구현입니다."]'
TEAM_NEXT='["Claude는 continuity를 정리합니다.","OMX는 founder-facing output wrapper를 구현합니다."]'

emit_case team_meeting omx_emit_team_meeting "han-jihoon-cso" \
  "지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다." \
  "$FINDINGS" "$TEAM_RISKS" "$TEAM_NEXT"

CHECKS='["SessionStart/Stop 훅 존재","shared-kernel roster 참조","handoff contract 사용"]'
VERIFY_RISKS='["Stop 훅 async"]'
VERIFY_NEXT='["save handoff를 운영 기준으로 본다"]'
emit_case verification omx_emit_verification "choi-minseok-cto" \
  "Claude-side continuity 구조는 shared-kernel 계약과 크게 충돌하지 않습니다." \
  "$CHECKS" "$VERIFY_RISKS" "$VERIFY_NEXT"

PARTICIPANTS='["yoon-haneul-pm","han-jihoon-cso"]'
HANDOFF_CHECKS='["canonical roster 기준 정렬","handoff contract 기준 확인"]'
HANDOFF_RISKS='["실제 runtime wrapper는 아직 미구현입니다."]'
HANDOFF_NEXT='["team meeting / verification 출력에 이 규격을 적용합니다."]'
emit_case handoff omx_emit_handoff "yoo-junho-paircoder" \
  "founder-facing output wrapper 규격 초안을 만들었습니다." \
  "$PARTICIPANTS" "$HANDOFF_CHECKS" "$HANDOFF_RISKS" "$HANDOFF_NEXT"

REPORT_CHECKS='["renderer가 canonical roster를 읽고 display_name으로 출력함","4종 context를 지원함"]'
REPORT_RISKS='["실제 runtime touchpoint 연결은 아직 남아 있습니다."]'
REPORT_NEXT='["실제 OMX output wrapper 적용 지점을 정리합니다."]'
emit_case execution_report omx_emit_execution_report "yoo-junho-paircoder" \
  "OMX founder-facing output formatter 프로토타입과 smoke fixtures를 추가했습니다." \
  "$REPORT_CHECKS" "$REPORT_RISKS" "$REPORT_NEXT"

emit_case latest_handoff omx_emit_latest_handoff --latest-claude

echo "=== assertions ==="
rg -n "한지훈님|박서연님|최민석님|유준호님|윤하늘님|팀 회의" "$TMP_DIR" >/dev/null
! rg -n "^## .*architect|^## .*critic|^## .*analyst|^## .*verifier|^## .*executor" "$TMP_DIR" >/dev/null
rg -n "다음 단계|다음 행동|다음:" "$TMP_DIR" >/dev/null
echo "PASS: runtime integration demo emits founder-facing outputs through sourceable helpers."
