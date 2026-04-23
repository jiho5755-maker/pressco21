#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RENDER="$SCRIPT_DIR/omx-founder-facing-render.sh"
FIXTURES_DIR="$REPO_ROOT/docs/ai-native-upgrade/shared-agent-kernel/fixtures"
TMP_DIR="${TMPDIR:-/tmp}/omx-founder-facing-smoke"
mkdir -p "$TMP_DIR"

run_case() {
  local name="$1"
  local fixture="$2"
  local output="$TMP_DIR/${name}.md"
  bash "$RENDER" --input "$fixture" > "$output"
  echo "=== ${name} ==="
  cat "$output"
  echo
}

run_case team_meeting "$FIXTURES_DIR/team-meeting-sample.json"
run_case verification "$FIXTURES_DIR/verification-sample.json"
run_case handoff "$FIXTURES_DIR/handoff-sample.json"
run_case execution_report "$FIXTURES_DIR/execution-report-sample.json"

echo "=== assertions ==="

# Test 1 — Team meeting output
head -n 3 "$TMP_DIR/team_meeting.md" | rg "팀 회의|한지훈님|박서연님|최민석님" >/dev/null
! head -n 3 "$TMP_DIR/team_meeting.md" | rg "architect|critic|analyst" >/dev/null
rg -n "### 다음 단계" "$TMP_DIR/team_meeting.md" >/dev/null
echo "PASS 1/5: team_meeting canonical name/header and next step verified."

# Test 2 — Verification output
rg -n "^## 최민석님 검증 메모$" "$TMP_DIR/verification.md" >/dev/null
for section in "### 결론" "### 확인한 것" "### 남은 리스크" "### 다음 단계"; do
  rg -n "$section" "$TMP_DIR/verification.md" >/dev/null
done
! rg -n "verifier|analyst" "$TMP_DIR/verification.md" >/dev/null
echo "PASS 2/5: verification sections and runtime-role suppression verified."

# Test 3 — Handoff output
rg -n "담당: 유준호님" "$TMP_DIR/handoff.md" >/dev/null
rg -n "참여: 윤하늘님, 한지훈님" "$TMP_DIR/handoff.md" >/dev/null
for field in "요약" "확인" "리스크" "다음"; do
  rg -n "$field" "$TMP_DIR/handoff.md" >/dev/null
done
echo "PASS 3/5: handoff display-name mapping and required fields verified."

# Test 4 — Core 6 naming consistency
python3 - "$REPO_ROOT/docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml" <<'PY'
import sys
from pathlib import Path
import yaml

path = Path(sys.argv[1])
data = yaml.safe_load(path.read_text(encoding="utf-8"))
roster = {}
for section in ("agents", "pseudo_agents"):
    for item in data.get(section, []):
        roster[item["agent_id"]] = item.get("display_name")

expected = {
    "yoo-junho-paircoder": "유준호님",
    "choi-minseok-cto": "최민석님",
    "park-seoyeon-cfo": "박서연님",
    "han-jihoon-cso": "한지훈님",
    "yoon-haneul-pm": "윤하늘님",
    "team-meeting": "팀 회의",
}

missing = [f"{k}={v!r}" for k, v in expected.items() if roster.get(k) != v]
if missing:
    raise SystemExit("canonical naming mismatch: " + ", ".join(missing))
PY
echo "PASS 4/5: Core 6 naming matches canonical roster."

# Test 5 — Continuity-friendly summary
rg -n "다음 단계|다음 행동|다음:" "$TMP_DIR" >/dev/null
for output in "$TMP_DIR"/*.md; do
  head -n 3 "$output" | rg "팀 회의|한지훈님|박서연님|최민석님|유준호님|윤하늘님" >/dev/null
done
echo "PASS 5/5: every output keeps owner/team visible and next action discoverable."

echo "PASS: 5/5 founder-facing smoke tests passed."
