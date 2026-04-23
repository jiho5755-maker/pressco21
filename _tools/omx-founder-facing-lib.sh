#!/bin/bash
# Sourceable helper functions for OMX founder-facing output integration.
set -euo pipefail

_omx_ff_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

_omx_ff_live() {
  local dir
  dir="$(_omx_ff_dir)"
  bash "$dir/omx-founder-facing-live.sh" "$@"
}

_omx_ff_json() {
  python3 - "$@" <<'PY'
import json, sys
payload = json.loads(sys.stdin.read() or '{}')
print(json.dumps(payload, ensure_ascii=False))
PY
}

omx_emit_founder_facing_json() {
  # usage: printf '%s' "$json" | omx_emit_founder_facing_json
  _omx_ff_live --stdin-json
}

omx_emit_team_meeting() {
  local owner="$1"
  local summary="$2"
  local findings_json="${3:-[]}"
  local risks_json="${4:-[]}"
  local next_json="${5:-[]}"
  python3 - "$owner" "$summary" "$findings_json" "$risks_json" "$next_json" <<'PY' | omx_emit_founder_facing_json
import json, sys
owner, summary, findings_json, risks_json, next_json = sys.argv[1:6]
payload = {
    'type': 'team_meeting',
    'owner': owner,
    'summary': summary,
    'details': json.loads(findings_json),
    'risk': json.loads(risks_json),
    'next': json.loads(next_json),
}
print(json.dumps(payload, ensure_ascii=False))
PY
}

omx_emit_verification() {
  local owner="$1"
  local summary="$2"
  local checks_json="${3:-[]}"
  local risks_json="${4:-[]}"
  local next_json="${5:-[]}"
  python3 - "$owner" "$summary" "$checks_json" "$risks_json" "$next_json" <<'PY' | omx_emit_founder_facing_json
import json, sys
owner, summary, checks_json, risks_json, next_json = sys.argv[1:6]
payload = {
    'type': 'verification',
    'owner': owner,
    'summary': summary,
    'checks': json.loads(checks_json),
    'risk': json.loads(risks_json),
    'next': json.loads(next_json),
}
print(json.dumps(payload, ensure_ascii=False))
PY
}

omx_emit_handoff() {
  local owner="$1"
  local summary="$2"
  local participants_json="${3:-[]}"
  local checks_json="${4:-[]}"
  local risks_json="${5:-[]}"
  local next_json="${6:-[]}"
  python3 - "$owner" "$summary" "$participants_json" "$checks_json" "$risks_json" "$next_json" <<'PY' | omx_emit_founder_facing_json
import json, sys
owner, summary, participants_json, checks_json, risks_json, next_json = sys.argv[1:7]
payload = {
    'type': 'handoff',
    'owner': owner,
    'summary': summary,
    'participants': json.loads(participants_json),
    'checks': json.loads(checks_json),
    'risk': json.loads(risks_json),
    'next': json.loads(next_json),
}
print(json.dumps(payload, ensure_ascii=False))
PY
}

omx_emit_execution_report() {
  local owner="$1"
  local summary="$2"
  local checks_json="${3:-[]}"
  local risks_json="${4:-[]}"
  local next_json="${5:-[]}"
  python3 - "$owner" "$summary" "$checks_json" "$risks_json" "$next_json" <<'PY' | omx_emit_founder_facing_json
import json, sys
owner, summary, checks_json, risks_json, next_json = sys.argv[1:6]
payload = {
    'type': 'execution_report',
    'owner': owner,
    'summary': summary,
    'checks': json.loads(checks_json),
    'risk': json.loads(risks_json),
    'next': json.loads(next_json),
}
print(json.dumps(payload, ensure_ascii=False))
PY
}

omx_emit_latest_handoff() {
  local mode="${1:---latest-claude}"
  _omx_ff_live "$mode"
}
