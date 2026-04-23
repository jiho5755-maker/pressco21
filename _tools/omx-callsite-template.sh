#!/bin/bash
# Template snippet for real OMX scripts to source founder-facing helpers safely.
# Copy the needed block into the real script or source this file and adapt variables.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

# Example variables that a real OMX call-site would compute from its own result flow.
OWNER_AGENT_ID="choi-minseok-cto"
SUMMARY="구조는 shared-kernel 계약과 충돌하지 않습니다."
CHECKS_JSON='["shared-kernel roster 참조", "handoff contract 사용"]'
RISKS_JSON='["Stop 훅 async"]'
NEXT_JSON='["save handoff를 운영 기준으로 본다"]'

# Pick exactly one helper depending on your output type.
# 1) Verification
omx_emit_verification "$OWNER_AGENT_ID" "$SUMMARY" "$CHECKS_JSON" "$RISKS_JSON" "$NEXT_JSON"

# 2) Handoff
# omx_emit_handoff "yoo-junho-paircoder" "요약" '["yoon-haneul-pm"]' '["확인"]' '["리스크"]' '["다음"]'

# 3) Execution report
# omx_emit_execution_report "yoo-junho-paircoder" "요약" '["확인"]' '["리스크"]' '["다음"]'

# 4) Team meeting
# omx_emit_team_meeting "han-jihoon-cso" "요약" '[{"agent_id":"han-jihoon-cso","heading":"한지훈님 종합","text":"..."}]' '["리스크"]' '["다음"]'
