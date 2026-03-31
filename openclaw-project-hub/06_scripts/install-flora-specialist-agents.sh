#!/bin/bash
# Install or refresh Flora specialist agents on the OpenClaw server.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

POLICY_PATH="${1:-$REPO_ROOT/04_reference_json/flora-specialist-routing.policy.json}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
SERVER="${SERVER:-ubuntu@158.179.193.173}"
REMOTE_CONTEXT_DIR="${REMOTE_CONTEXT_DIR:-/home/ubuntu/.openclaw/workspace-owner/context/flora-mac-harness}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

python3 - <<'PY' "$POLICY_PATH" "$TMP_DIR" "$REMOTE_CONTEXT_DIR"
import json
import sys
from pathlib import Path

policy_path = Path(sys.argv[1]).expanduser().resolve()
tmp_dir = Path(sys.argv[2]).resolve()
remote_context_dir = sys.argv[3]
policy = json.loads(policy_path.read_text())

shared_rules = [
    "한국어로만 답하고, 군더더기 없이 본론부터 정리한다.",
    "맥북 절대경로는 메타데이터로만 보고 서버에서 직접 열려고 하지 않는다.",
    "근거는 routing-policy, assistant-brief, analysis, inventory 컨텍스트를 우선 사용한다.",
    "비밀번호, OTP, 비밀키 업로드를 요구하지 않는다.",
]

for specialist in policy["specialists"]:
    agent_dir = tmp_dir / specialist["agentId"]
    agent_dir.mkdir(parents=True, exist_ok=True)

    identity = "\n".join(
        [
            "# IDENTITY.md - Who Am I?",
            "",
            f"- **Name:** {specialist['name']}",
            f"- **Creature:** PRESSCO21 specialist agent for {specialist['modeId']}",
            f"- **Vibe:** 차분하고 실용적. 전문 영역을 먼저 구조화하고 다음 액션을 제안한다.",
            f"- **Emoji:** {specialist['emoji']}",
            "- **Avatar:** _(미설정)_",
            "",
            "---",
            "",
            specialist["purpose"],
            "",
        ]
    )

    agents_md = "\n".join(
        [
            "# Specialist Agent Rules",
            "",
            "## 공통 원칙",
            *[f"- {rule}" for rule in shared_rules],
            "",
            "## 전문 역할",
            f"- 모드: `{specialist['modeId']}`",
            f"- 목적: {specialist['purpose']}",
            "",
            "## 응답 습관",
            *[f"- {item}" for item in specialist.get("responseStyle", [])],
            "",
        ]
    )

    user_md = "\n".join(
        [
            "# USER.md",
            "",
            "- 주 사용자: 장지호",
            "- 이 에이전트는 owner 프론트도어 뒤에서 특정 전문 영역을 깊게 보는 용도다.",
            "- 전체 회사 우선순위 조정 요청은 `flora-executive`가 총괄한다.",
            "",
        ]
    )

    context_files = "\n".join(
        f"- `{remote_context_dir}/{name}`" for name in specialist.get("focusContexts", [])
    )
    response_style = "\n".join(f"- {item}" for item in specialist.get("responseStyle", []))

    bootstrap = "\n".join(
        [
            f"# {specialist['name']} Bootstrap",
            "",
            specialist["purpose"],
            "",
            "## 먼저 읽을 컨텍스트",
            context_files,
            "",
            "## 작업 방식",
            response_style,
            "",
            "## 주의",
            "- 절대경로 `/Users/...` 는 설명용 메타데이터다.",
            "- 직접 파일 접근 대신 동기화된 context 파일만 근거로 사용한다.",
            "- 필요하면 owner에게 추가 동기화 또는 캡처 요청을 제안한다.",
            "",
        ]
    )

    (agent_dir / "IDENTITY.md").write_text(identity)
    (agent_dir / "AGENTS.md").write_text(agents_md)
    (agent_dir / "USER.md").write_text(user_md)
    (agent_dir / "BOOTSTRAP.md").write_text(bootstrap)
PY

python3 - <<'PY' "$POLICY_PATH" "$TMP_DIR/install.sh"
import json
import shlex
import sys
from pathlib import Path

policy_path = Path(sys.argv[1]).expanduser().resolve()
script_path = Path(sys.argv[2]).resolve()
policy = json.loads(policy_path.read_text())

lines = [
    "#!/bin/bash",
    "set -euo pipefail",
    "OPENCLAW_BIN=\"$HOME/.npm-global/bin/openclaw\"",
]

for specialist in policy["specialists"]:
    agent_id = specialist["agentId"]
    workspace = specialist["workspace"]
    model = specialist["model"]
    lines.append(
        "if ! \"$OPENCLAW_BIN\" agents list --json | python3 -c "
        + shlex.quote(
            f"import json,sys; data=json.load(sys.stdin); sys.exit(0 if any(item['id']=={agent_id!r} for item in data) else 1)"
        )
        + "; then"
    )
    lines.append(
        f"  \"$OPENCLAW_BIN\" agents add {shlex.quote(agent_id)} --non-interactive --workspace {shlex.quote(workspace)} --model {shlex.quote(model)} --json >/dev/null"
    )
    lines.append("fi")
    lines.append(f"mkdir -p {shlex.quote(workspace)}")

script_path.write_text("\n".join(lines) + "\n")
PY

chmod +x "$TMP_DIR/install.sh"

ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "mkdir -p /tmp/flora-specialists"
scp -i "$SSH_KEY" -o ConnectTimeout=10 -r "$TMP_DIR/"* "$SERVER:/tmp/flora-specialists/"
ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" '
  set -euo pipefail
  bash /tmp/flora-specialists/install.sh
  for dir in /tmp/flora-specialists/flora-*; do
    [ -d "$dir" ] || continue
    agent_id="$(basename "$dir")"
    workspace="$HOME/.openclaw/workspace-$agent_id"
    mkdir -p "$workspace"
    cp "$dir"/IDENTITY.md "$workspace/IDENTITY.md"
    cp "$dir"/AGENTS.md "$workspace/AGENTS.md"
    cp "$dir"/USER.md "$workspace/USER.md"
    cp "$dir"/BOOTSTRAP.md "$workspace/BOOTSTRAP.md"
    "$HOME/.npm-global/bin/openclaw" agents set-identity --agent "$agent_id" --workspace "$workspace" --from-identity >/dev/null
  done
  rm -rf /tmp/flora-specialists
  systemctl --user restart openclaw-gateway.service
  "$HOME/.npm-global/bin/openclaw" agents list --json
'
