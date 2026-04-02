#!/bin/bash
# Install a clean Flora Telegram frontdoor agent and bind Telegram to it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

POLICY_PATH="${1:-$REPO_ROOT/04_reference_json/flora-specialist-routing.policy.json}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
SERVER="${SERVER:-ubuntu@158.179.193.173}"
OWNER_AGENT_ID="${OWNER_AGENT_ID:-owner}"
FRONTDOOR_AGENT_ID="${FRONTDOOR_AGENT_ID:-}"
OWNER_WORKSPACE="${OWNER_WORKSPACE:-/home/ubuntu/.openclaw/workspace-owner}"
FRONTDOOR_WORKSPACE="${FRONTDOOR_WORKSPACE:-}"
REMOTE_OPENCLAW_BIN="${REMOTE_OPENCLAW_BIN:-\$HOME/.npm-global/bin/openclaw}"
FRONTDOOR_MODEL_PRIMARY="${FRONTDOOR_MODEL_PRIMARY:-openai-codex/gpt-5.4}"
FRONTDOOR_MODEL_FALLBACKS="${FRONTDOOR_MODEL_FALLBACKS:-openai-codex/gpt-5.4-mini,anthropic/claude-opus-4-5,google/gemini-2.5-flash}"

if [ -z "$FRONTDOOR_AGENT_ID" ]; then
  FRONTDOOR_AGENT_ID="$(python3 - <<'PY' "$POLICY_PATH"
import json
import sys
from pathlib import Path

policy = json.loads(Path(sys.argv[1]).read_text())
print(policy.get("frontdoorAgentId", "flora-frontdoor"))
PY
)"
fi

if [ -z "$FRONTDOOR_WORKSPACE" ]; then
  FRONTDOOR_WORKSPACE="/home/ubuntu/.openclaw/workspace-$FRONTDOOR_AGENT_ID"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat > "$TMP_DIR/AGENTS.md" <<'EOF'
# 플로라 Frontdoor 작업 지침

## 역할

- 너는 텔레그램 프론트도어 전용 `플로라`다.
- 첫 응답 전에 반드시 전문 모드를 먼저 고른다.
- 단일 시스템 질문은 해당 specialist 관점으로 바로 답한다.
- 여러 시스템이 얽히면 총괄 관점으로 정리하고 보조 모드를 함께 언급한다.

## 첫 문장 규칙

- 첫 문장은 반드시 선택한 관점을 드러내는 짧은 문장으로 시작한다.
- 허용 예시:
  - `지금은 총괄 관점으로 보면,`
  - `지금은 파트너클래스 전략 관점으로 보면,`
  - `지금은 메이크샵 스토어프론트 관점으로 보면,`
  - `지금은 CRM 운영 관점으로 보면,`
  - `지금은 자동화 설계 관점으로 보면,`
  - `지금은 회사 전략 관점으로 보면,`

## 응답 원칙

- 현재 질문과 맞는 시스템만 우선 다룬다.
- 과거 메모리 문서명을 근거처럼 먼저 꺼내지 않는다.
- 맥북 인벤토리와 동기화된 라우팅 컨텍스트를 우선 근거로 쓴다.
- 텔레그램에서는 길게 늘어놓지 말고 바로 쓸 판단과 다음 행동을 먼저 준다.

## 금지

- 전문 모드 선택 없이 바로 범용 답변 시작
- 비밀번호, OTP, 비밀키 요구
- 현재 질문과 무관한 예전 프로젝트 기억 섞기
EOF

cat > "$TMP_DIR/IDENTITY.md" <<'EOF'
# IDENTITY.md - Who Am I?

- **Name:** 플로라 Frontdoor
- **Creature:** PRESSCO21 telegram frontdoor orchestrator
- **Vibe:** 간결하고 실용적. 먼저 전문 모드를 고르고 바로 다음 행동을 정리한다.
- **Emoji:** 🪴
- **Avatar:** _(미설정)_

---

대표 텔레그램 요청을 가장 맞는 specialist 관점으로 연결하는 PRESSCO21 프론트도어 비서
EOF

ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "mkdir -p /tmp/flora-frontdoor-install"
scp -i "$SSH_KEY" -o ConnectTimeout=10 "$TMP_DIR/AGENTS.md" "$TMP_DIR/IDENTITY.md" "$SERVER:/tmp/flora-frontdoor-install/"

ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "
  set -euo pipefail
  OPENCLAW_BIN=\"$REMOTE_OPENCLAW_BIN\"
  FRONTDOOR_AGENT_ID=\"$FRONTDOOR_AGENT_ID\"
  OWNER_AGENT_ID=\"$OWNER_AGENT_ID\"
  OWNER_WORKSPACE=\"$OWNER_WORKSPACE\"
  FRONTDOOR_WORKSPACE=\"$FRONTDOOR_WORKSPACE\"

  if ! \"\$OPENCLAW_BIN\" agents list --json | python3 -c \"import json,sys; data=json.load(sys.stdin); sys.exit(0 if any(item['id']==\\\"\$FRONTDOOR_AGENT_ID\\\" for item in data) else 1)\"; then
    \"\$OPENCLAW_BIN\" agents add \"\$FRONTDOOR_AGENT_ID\" --non-interactive --workspace \"\$FRONTDOOR_WORKSPACE\" --model openai-codex/gpt-5.4 --json >/dev/null
  fi

  rm -rf \"\$FRONTDOOR_WORKSPACE\"
  mkdir -p \"\$FRONTDOOR_WORKSPACE\"
  for name in SOUL.md TOOLS.md USER.md HEARTBEAT.md BOOTSTRAP.md; do
    if [ -f \"\$OWNER_WORKSPACE/\$name\" ]; then
      cp \"\$OWNER_WORKSPACE/\$name\" \"\$FRONTDOOR_WORKSPACE/\$name\"
    fi
  done
  cp /tmp/flora-frontdoor-install/AGENTS.md \"\$FRONTDOOR_WORKSPACE/AGENTS.md\"
  cp /tmp/flora-frontdoor-install/IDENTITY.md \"\$FRONTDOOR_WORKSPACE/IDENTITY.md\"
  mkdir -p \"\$FRONTDOOR_WORKSPACE/skills\"
  cp -a \"\$OWNER_WORKSPACE/skills/.\" \"\$FRONTDOOR_WORKSPACE/skills/\"

  mkdir -p \"\$HOME/.openclaw/agents/\$FRONTDOOR_AGENT_ID/agent\"
  cp \"\$HOME/.openclaw/agents/\$OWNER_AGENT_ID/agent/auth-profiles.json\" \"\$HOME/.openclaw/agents/\$FRONTDOOR_AGENT_ID/agent/auth-profiles.json\"
  cp \"\$HOME/.openclaw/agents/\$OWNER_AGENT_ID/agent/models.json\" \"\$HOME/.openclaw/agents/\$FRONTDOOR_AGENT_ID/agent/models.json\"

  rm -rf \"\$HOME/.openclaw/agents/\$FRONTDOOR_AGENT_ID/sessions\"
  mkdir -p \"\$HOME/.openclaw/agents/\$FRONTDOOR_AGENT_ID/sessions\"

  \"\$OPENCLAW_BIN\" agents unbind --agent \"\$OWNER_AGENT_ID\" --bind telegram >/dev/null 2>&1 || true
  \"\$OPENCLAW_BIN\" agents unbind --agent \"\$FRONTDOOR_AGENT_ID\" --bind telegram >/dev/null 2>&1 || true
  \"\$OPENCLAW_BIN\" agents bind --agent \"\$FRONTDOOR_AGENT_ID\" --bind telegram >/dev/null

  python3 - <<'PY'
import json
from pathlib import Path

path = Path('/home/ubuntu/.openclaw/openclaw.json')
data = json.loads(path.read_text())

fallbacks = [item.strip() for item in '$FRONTDOOR_MODEL_FALLBACKS'.split(',') if item.strip()]
model_config = {
    'primary': '$FRONTDOOR_MODEL_PRIMARY',
    'fallbacks': fallbacks,
}

for item in data.get('agents', {}).get('list', []):
    if item.get('id') == '$FRONTDOOR_AGENT_ID':
        item['model'] = model_config
        break

path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
PY

  rm -rf /tmp/flora-frontdoor-install
  systemctl --user restart openclaw-gateway.service

  python3 - <<'PY'
import json
from pathlib import Path

data = json.loads(Path('/home/ubuntu/.openclaw/openclaw.json').read_text())
summary = {
    'frontdoorAgentId': '$FRONTDOOR_AGENT_ID',
    'bindings': data.get('bindings', []),
    'agents': [item['id'] for item in data.get('agents', {}).get('list', [])],
}
print(json.dumps(summary, ensure_ascii=False, indent=2))
PY
"
