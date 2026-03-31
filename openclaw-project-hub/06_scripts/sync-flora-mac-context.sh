#!/bin/bash
# Flora Mac Copilot Harness context sync script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONFIG_PATH="${1:-$REPO_ROOT/04_reference_json/flora-mac-harness.config.example.json}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
SERVER="${SERVER:-ubuntu@158.179.193.173}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness}"
REMOTE_SKILL_DIR="${REMOTE_SKILL_DIR:-/home/ubuntu/.openclaw/workspace-owner/skills/flora-mac-copilot}"
SKILL_SOURCE="${SKILL_SOURCE:-$REPO_ROOT/07_openclaw_skills/flora-mac-copilot/SKILL.md}"
ROUTER_SKILL_SOURCE="${ROUTER_SKILL_SOURCE:-$REPO_ROOT/07_openclaw_skills/flora-specialist-router/SKILL.md}"
REMOTE_ROUTER_SKILL_DIR="${REMOTE_ROUTER_SKILL_DIR:-/home/ubuntu/.openclaw/workspace-owner/skills/flora-specialist-router}"
ROUTING_POLICY_SOURCE="${ROUTING_POLICY_SOURCE:-$REPO_ROOT/04_reference_json/flora-specialist-routing.policy.json}"
ROUTING_POLICY_DOC_SOURCE="${ROUTING_POLICY_DOC_SOURCE:-$REPO_ROOT/03_openclaw_docs/flora-specialist-routing-policy.ko.md}"
REMOTE_BOOTSTRAP_PATH="${REMOTE_BOOTSTRAP_PATH:-/home/ubuntu/.openclaw/workspace-owner/BOOTSTRAP.md}"

python3 "$SCRIPT_DIR/build-flora-mac-inventory.py" --config "$CONFIG_PATH"

INVENTORY_PATH="$(python3 - <<'PY' "$CONFIG_PATH"
import json, sys
from pathlib import Path
config_path = Path(sys.argv[1]).expanduser().resolve()
with config_path.open() as handle:
    config = json.load(handle)
print(Path(config["output"]["inventoryPath"]).expanduser().resolve())
PY
)"

SUMMARY_PATH="$(python3 - <<'PY' "$CONFIG_PATH"
import json, sys
from pathlib import Path
config_path = Path(sys.argv[1]).expanduser().resolve()
with config_path.open() as handle:
    config = json.load(handle)
print(Path(config["output"]["summaryPath"]).expanduser().resolve())
PY
)"

ANALYSIS_PATH="$(python3 - <<'PY' "$CONFIG_PATH"
import json, sys
from pathlib import Path
config_path = Path(sys.argv[1]).expanduser().resolve()
with config_path.open() as handle:
    config = json.load(handle)
print(Path(config["output"].get("analysisPath", "./output/flora-mac-harness/analysis.json")).expanduser().resolve())
PY
)"

ASSISTANT_BRIEF_PATH="$(python3 - <<'PY' "$CONFIG_PATH"
import json, sys
from pathlib import Path
config_path = Path(sys.argv[1]).expanduser().resolve()
with config_path.open() as handle:
    config = json.load(handle)
print(Path(config["output"].get("assistantBriefPath", "./output/flora-mac-harness/assistant-brief.md")).expanduser().resolve())
PY
)"

META_PROMPT_PATH="$(python3 - <<'PY' "$CONFIG_PATH"
import json, sys
from pathlib import Path
config_path = Path(sys.argv[1]).expanduser().resolve()
with config_path.open() as handle:
    config = json.load(handle)
print(Path(config["output"].get("metaPromptPath", "./output/flora-mac-harness/meta-prompt.md")).expanduser().resolve())
PY
)"

python3 "$SCRIPT_DIR/analyze-flora-mac-context.py" \
  --inventory "$INVENTORY_PATH" \
  --summary "$SUMMARY_PATH" \
  --analysis-output "$ANALYSIS_PATH" \
  --brief-output "$ASSISTANT_BRIEF_PATH"

python3 "$SCRIPT_DIR/generate-flora-mac-meta-prompt.py" \
  --inventory "$INVENTORY_PATH" \
  --summary "$SUMMARY_PATH" \
  --analysis "$ANALYSIS_PATH" \
  --assistant-brief "$ASSISTANT_BRIEF_PATH" \
  --routing-policy "$ROUTING_POLICY_SOURCE" \
  --output "$META_PROMPT_PATH"

BOOTSTRAP_SOURCE="${BOOTSTRAP_SOURCE:-$META_PROMPT_PATH}"

ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "mkdir -p '$REMOTE_DIR' '$REMOTE_SKILL_DIR' '$REMOTE_ROUTER_SKILL_DIR'"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$INVENTORY_PATH" "$SERVER:$REMOTE_DIR/inventory.json"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$SUMMARY_PATH" "$SERVER:$REMOTE_DIR/summary.json"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$ANALYSIS_PATH" "$SERVER:$REMOTE_DIR/analysis.json"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$ASSISTANT_BRIEF_PATH" "$SERVER:$REMOTE_DIR/assistant-brief.md"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$META_PROMPT_PATH" "$SERVER:$REMOTE_DIR/meta-prompt.md"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$ROUTING_POLICY_SOURCE" "$SERVER:$REMOTE_DIR/routing-policy.json"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$ROUTING_POLICY_DOC_SOURCE" "$SERVER:$REMOTE_DIR/routing-policy.md"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$SKILL_SOURCE" "$SERVER:$REMOTE_SKILL_DIR/SKILL.md"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$ROUTER_SKILL_SOURCE" "$SERVER:$REMOTE_ROUTER_SKILL_DIR/SKILL.md"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$BOOTSTRAP_SOURCE" "$SERVER:$REMOTE_BOOTSTRAP_PATH"

echo "Synced:"
echo "  - $INVENTORY_PATH -> $REMOTE_DIR/inventory.json"
echo "  - $SUMMARY_PATH -> $REMOTE_DIR/summary.json"
echo "  - $ANALYSIS_PATH -> $REMOTE_DIR/analysis.json"
echo "  - $ASSISTANT_BRIEF_PATH -> $REMOTE_DIR/assistant-brief.md"
echo "  - $META_PROMPT_PATH -> $REMOTE_DIR/meta-prompt.md"
echo "  - $ROUTING_POLICY_SOURCE -> $REMOTE_DIR/routing-policy.json"
echo "  - $ROUTING_POLICY_DOC_SOURCE -> $REMOTE_DIR/routing-policy.md"
echo "  - $SKILL_SOURCE -> $REMOTE_SKILL_DIR/SKILL.md"
echo "  - $ROUTER_SKILL_SOURCE -> $REMOTE_ROUTER_SKILL_DIR/SKILL.md"
echo "  - $BOOTSTRAP_SOURCE -> $REMOTE_BOOTSTRAP_PATH"
