#!/bin/bash
# Validate owner routing behavior against the Flora specialist routing policy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

POLICY_PATH="${1:-$REPO_ROOT/04_reference_json/flora-specialist-routing.policy.json}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
SERVER="${SERVER:-ubuntu@158.179.193.173}"
OWNER_AGENT="${OWNER_AGENT:-}"
REMOTE_OPENCLAW_BIN="${REMOTE_OPENCLAW_BIN:-\$HOME/.npm-global/bin/openclaw}"
OUTPUT_DIR="${OUTPUT_DIR:-$REPO_ROOT/../output/flora-routing-validation}"

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_PATH="$OUTPUT_DIR/owner-routing-validation-$TIMESTAMP.md"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ -z "$OWNER_AGENT" ]; then
  OWNER_AGENT="$(python3 - <<'PY' "$POLICY_PATH"
import json
import sys
from pathlib import Path

policy = json.loads(Path(sys.argv[1]).read_text())
print(policy.get("frontdoorAgentId", "owner"))
PY
)"
fi

python3 - <<'PY' "$POLICY_PATH" "$TMP_DIR/cases.tsv"
import json
import sys
from pathlib import Path

policy = json.loads(Path(sys.argv[1]).read_text())
mode_to_lead = {item["modeId"]: item.get("openingLead", "") for item in policy["modeSelectionRules"]}

cases = [
    (
        "storefront",
        "storefront-ops",
        "메이크샵 상세페이지 전환율을 높이려면 어디부터 봐야 해?",
    ),
    (
        "crm",
        "crm-ops",
        "CRM 명세표 인쇄 흐름 점검할 때 우선 확인할 포인트를 짧게 정리해줘.",
    ),
    (
        "automation",
        "automation-ops",
        "n8n으로 입금 검토 자동화를 다시 설계하면 어디부터 쪼개야 해?",
    ),
    (
        "strategy",
        "partnerclass-strategy",
        "파트너클래스 Phase 3 우선순위를 제품 전략 기준으로 다시 잡아줘.",
    ),
    (
        "knowledge",
        "knowledge-strategy",
        "우리 회사 전략 문서를 볼 때 지금 제일 부족한 판단 기준이 뭐야?",
    ),
    (
        "executive",
        "executive-orchestrator",
        "CRM이랑 n8n 자동화 중 지금 뭐부터 손대는 게 맞는지 회사 전체 기준으로 정리해줘.",
    ),
]

lines = []
for case_id, mode_id, prompt in cases:
    lead = mode_to_lead.get(mode_id, "")
    lines.append("\t".join([case_id, mode_id, lead, prompt]))

Path(sys.argv[2]).write_text("\n".join(lines) + "\n")
PY

{
  echo "# Flora Owner Routing Validation"
  echo ""
  echo "- date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "- server: $SERVER"
  echo "- ownerAgent: $OWNER_AGENT"
  echo "- policy: $POLICY_PATH"
  echo ""
  echo "## Results"
} > "$REPORT_PATH"

pass_count=0
total_count=0

while IFS=$'\t' read -r case_id expected_mode expected_lead prompt; do
  [ -n "$case_id" ] || continue
  total_count=$((total_count + 1))
  raw_path="$TMP_DIR/$case_id.json"

  ssh -n -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" \
    "$REMOTE_OPENCLAW_BIN agent --agent $(printf '%q' "$OWNER_AGENT") --message $(printf '%q' "$prompt") --json" \
    > "$raw_path"

  python3 - <<'PY' "$raw_path" "$expected_lead" "$case_id" "$expected_mode" >> "$REPORT_PATH"
import json
import sys
from pathlib import Path

raw_path = Path(sys.argv[1])
expected_lead = sys.argv[2]
case_id = sys.argv[3]
expected_mode = sys.argv[4]

data = json.loads(raw_path.read_text())
payloads = data.get("result", {}).get("payloads", [])
text = payloads[0].get("text", "") if payloads else ""
first_line = text.splitlines()[0].strip() if text else ""
duration = data.get("result", {}).get("meta", {}).get("durationMs")
memory_bleed = "Source: memory/" in text or "memory/" in text
lead_ok = expected_lead in first_line
status = "PASS" if lead_ok and not memory_bleed else "FAIL"

print(f"### {case_id}")
print(f"- expectedMode: `{expected_mode}`")
print(f"- expectedLead: `{expected_lead}`")
print(f"- status: **{status}**")
print(f"- durationMs: `{duration}`")
print(f"- firstLine: {first_line}")
print(f"- memoryBleed: `{str(memory_bleed).lower()}`")
print("")
PY

  if python3 - <<'PY' "$raw_path" "$expected_lead"
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
payloads = data.get("result", {}).get("payloads", [])
text = payloads[0].get("text", "") if payloads else ""
first_line = text.splitlines()[0].strip() if text else ""
memory_bleed = "Source: memory/" in text or "memory/" in text
lead_ok = sys.argv[2] in first_line
raise SystemExit(0 if lead_ok and not memory_bleed else 1)
PY
  then
    pass_count=$((pass_count + 1))
  fi
done < "$TMP_DIR/cases.tsv"

{
  echo "## Summary"
  echo ""
  echo "- passed: $pass_count / $total_count"
} >> "$REPORT_PATH"

echo "$REPORT_PATH"
