#!/bin/bash
set -euo pipefail

# Thin helper for quick/manual/runtime integration experiments.
# It builds a minimal alias-friendly JSON payload and passes it to the live wrapper.

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-founder-facing-emit.sh <context_type> <owner_agent_id> <summary> [verification] [risk] [next]

Examples:
  bash _tools/omx-founder-facing-emit.sh verification choi-minseok-cto "구조는 계약과 충돌하지 않습니다." "shared-kernel roster 참조" "Stop 훅 async" "save handoff를 기준으로 봅니다"
USAGE
}

if [ $# -lt 3 ]; then
  usage
  exit 1
fi

context_type="$1"
owner="$2"
summary="$3"
verification="${4:-}"
risk="${5:-}"
next="${6:-}"

json=$(python3 - <<'PY' "$context_type" "$owner" "$summary" "$verification" "$risk" "$next"
import json, sys
context_type, owner, summary, verification, risk, next_step = sys.argv[1:7]
payload = {
    'type': context_type,
    'owner': owner,
    'summary': summary,
}
if verification:
    payload['checks'] = [verification]
if risk:
    payload['risk'] = [risk]
if next_step:
    payload['next'] = [next_step]
print(json.dumps(payload, ensure_ascii=False))
PY
)

printf '%s' "$json" | bash "$(cd "$(dirname "$0")" && pwd)/omx-founder-facing-live.sh" --stdin-json
