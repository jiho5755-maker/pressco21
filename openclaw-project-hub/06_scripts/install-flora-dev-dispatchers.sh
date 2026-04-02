#!/bin/bash
# Install Oracle-side dev-room dispatchers that enqueue local Codex/Claude tasks.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
SERVER="${SERVER:-ubuntu@158.179.193.173}"
OPENCLAW_JSON="${OPENCLAW_JSON:-/home/ubuntu/.openclaw/openclaw.json}"
FRONTDOOR_AGENT_ID="${FRONTDOOR_AGENT_ID:-flora-frontdoor}"
FRONTDOOR_WORKSPACE="${FRONTDOOR_WORKSPACE:-/home/ubuntu/.openclaw/workspace-flora-frontdoor}"
CODEX_AGENT_ID="${CODEX_AGENT_ID:-flora-codex-room}"
CLAUDE_AGENT_ID="${CLAUDE_AGENT_ID:-flora-claude-room}"
CODEX_WORKSPACE="${CODEX_WORKSPACE:-/home/ubuntu/.openclaw/workspace-flora-codex-room}"
CLAUDE_WORKSPACE="${CLAUDE_WORKSPACE:-/home/ubuntu/.openclaw/workspace-flora-claude-room}"
REMOTE_BIN_DIR="${REMOTE_BIN_DIR:-/home/ubuntu/.openclaw/bin}"
REMOTE_QUEUE_ROOT="${REMOTE_QUEUE_ROOT:-/home/ubuntu/.openclaw/dev-worker-queue}"
CODEX_CHAT_ID="${CODEX_CHAT_ID:--5198284773}"
CLAUDE_CHAT_ID="${CLAUDE_CHAT_ID:--5043778307}"
FRONTDOOR_MODEL_PRIMARY="${FRONTDOOR_MODEL_PRIMARY:-openai-codex/gpt-5.4}"
FRONTDOOR_MODEL_FALLBACKS="${FRONTDOOR_MODEL_FALLBACKS:-openai-codex/gpt-5.4-mini,anthropic/claude-opus-4-5,google/gemini-2.5-flash}"
DISPATCHER_MODEL_PRIMARY="${DISPATCHER_MODEL_PRIMARY:-openai-codex/gpt-5.4-mini}"
DISPATCHER_MODEL_FALLBACKS="${DISPATCHER_MODEL_FALLBACKS:-openai-codex/gpt-5.4,google/gemini-2.5-flash}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat > "$TMP_DIR/enqueue-flora-dev-task.sh" <<'EOF'
#!/bin/bash
set -euo pipefail

WORKER_KEY="${1:?worker key required}"
CHAT_ID="${2:?chat id required}"
PROMPT_FILE="${3:?prompt file required}"
QUEUE_ROOT="${QUEUE_ROOT:-/home/ubuntu/.openclaw/dev-worker-queue}"
PENDING_DIR="$QUEUE_ROOT/$WORKER_KEY/pending"
RUNNING_DIR="$QUEUE_ROOT/$WORKER_KEY/running"
DONE_DIR="$QUEUE_ROOT/$WORKER_KEY/done"

mkdir -p "$PENDING_DIR" "$RUNNING_DIR" "$DONE_DIR"

TASK_ID="$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)"

NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TASK_PATH="$PENDING_DIR/${STAMP}-${TASK_ID}.json"

python3 - <<'PY' "$PROMPT_FILE" "$TASK_PATH" "$TASK_ID" "$WORKER_KEY" "$CHAT_ID" "$NOW_ISO"
from pathlib import Path
import json
import sys

prompt = Path(sys.argv[1]).read_text()
payload = {
    "id": sys.argv[3],
    "worker": sys.argv[4],
    "chatId": sys.argv[5],
    "prompt": prompt,
    "createdAt": sys.argv[6],
}
Path(sys.argv[2]).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
PY

QUEUE_SIZE="$(find "$PENDING_DIR" -type f -name '*.json' | wc -l | tr -d ' ')"

if [ "$WORKER_KEY" = "codex" ]; then
  LABEL="Codex"
else
  LABEL="Claude"
fi

echo "$LABEL 로컬 작업 큐에 넣었습니다. 맥북 worker가 응답을 이어서 보냅니다. (pending=$QUEUE_SIZE)"
EOF

cat > "$TMP_DIR/AGENTS.codex.md" <<EOF
# Flora Codex Dev Dispatcher

## 역할

- 너는 텔레그램 Codex 개발 방 전용 디스패처다.
- 직접 개발 답변을 길게 하지 말고, 반드시 로컬 맥북 Codex worker 큐로 전달한다.
- 사용자의 원문을 바꾸지 말고 그대로 전달한다.

## 필수 동작

1. 사용자의 최신 메시지를 임시 파일에 그대로 저장한다.
2. 아래 명령으로 큐에 넣는다.
   - $REMOTE_BIN_DIR/enqueue-flora-dev-task.sh codex $CODEX_CHAT_ID <tempfile>
3. 명령 출력만 짧게 사용자에게 돌려준다.

## 응답 원칙

- 직접 해결 시도 금지
- 코드 수정 제안 장문 출력 금지
- 큐 등록 성공 여부만 짧게 전달
EOF

cat > "$TMP_DIR/AGENTS.claude.md" <<EOF
# Flora Claude Dev Dispatcher

## 역할

- 너는 텔레그램 Claude Code 개발 방 전용 디스패처다.
- 직접 개발 답변을 길게 하지 말고, 반드시 로컬 맥북 Claude worker 큐로 전달한다.
- 사용자의 원문을 바꾸지 말고 그대로 전달한다.

## 필수 동작

1. 사용자의 최신 메시지를 임시 파일에 그대로 저장한다.
2. 아래 명령으로 큐에 넣는다.
   - $REMOTE_BIN_DIR/enqueue-flora-dev-task.sh claude $CLAUDE_CHAT_ID <tempfile>
3. 명령 출력만 짧게 사용자에게 돌려준다.

## 응답 원칙

- 직접 해결 시도 금지
- 코드 수정 제안 장문 출력 금지
- 큐 등록 성공 여부만 짧게 전달
EOF

cat > "$TMP_DIR/IDENTITY.codex.md" <<'EOF'
# IDENTITY.md - Flora Codex Dev Dispatcher

- Name: 플로라 Codex Dispatcher
- Role: Oracle Telegram frontdoor에서 받은 Codex 개발 요청을 로컬 맥북 Codex worker 큐로 넘기는 디스패처
EOF

cat > "$TMP_DIR/IDENTITY.claude.md" <<'EOF'
# IDENTITY.md - Flora Claude Dev Dispatcher

- Name: 플로라 Claude Dispatcher
- Role: Oracle Telegram frontdoor에서 받은 Claude 개발 요청을 로컬 맥북 Claude worker 큐로 넘기는 디스패처
EOF

scp -i "$SSH_KEY" -o ConnectTimeout=10 \
  "$TMP_DIR/enqueue-flora-dev-task.sh" \
  "$TMP_DIR/AGENTS.codex.md" \
  "$TMP_DIR/AGENTS.claude.md" \
  "$TMP_DIR/IDENTITY.codex.md" \
  "$TMP_DIR/IDENTITY.claude.md" \
  "$SERVER:/tmp/"

ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "
  set -euo pipefail
  mkdir -p '$REMOTE_BIN_DIR' \
           '$REMOTE_QUEUE_ROOT/codex/pending' '$REMOTE_QUEUE_ROOT/codex/running' '$REMOTE_QUEUE_ROOT/codex/done' \
           '$REMOTE_QUEUE_ROOT/claude/pending' '$REMOTE_QUEUE_ROOT/claude/running' '$REMOTE_QUEUE_ROOT/claude/done' \
           '$CODEX_WORKSPACE' '$CLAUDE_WORKSPACE' \
           \"\$HOME/.openclaw/agents/$CODEX_AGENT_ID/agent\" \"\$HOME/.openclaw/agents/$CODEX_AGENT_ID/sessions\" \
           \"\$HOME/.openclaw/agents/$CLAUDE_AGENT_ID/agent\" \"\$HOME/.openclaw/agents/$CLAUDE_AGENT_ID/sessions\"

  install -m 755 /tmp/enqueue-flora-dev-task.sh '$REMOTE_BIN_DIR/enqueue-flora-dev-task.sh'

  for file in SOUL.md TOOLS.md USER.md HEARTBEAT.md BOOTSTRAP.md; do
    if [ -f '$FRONTDOOR_WORKSPACE/'\"\$file\" ]; then
      cp '$FRONTDOOR_WORKSPACE/'\"\$file\" '$CODEX_WORKSPACE/'\"\$file\"
      cp '$FRONTDOOR_WORKSPACE/'\"\$file\" '$CLAUDE_WORKSPACE/'\"\$file\"
    fi
  done

  cp /tmp/AGENTS.codex.md '$CODEX_WORKSPACE/AGENTS.md'
  cp /tmp/IDENTITY.codex.md '$CODEX_WORKSPACE/IDENTITY.md'
  cp /tmp/AGENTS.claude.md '$CLAUDE_WORKSPACE/AGENTS.md'
  cp /tmp/IDENTITY.claude.md '$CLAUDE_WORKSPACE/IDENTITY.md'

  cp \"\$HOME/.openclaw/agents/$FRONTDOOR_AGENT_ID/agent/auth-profiles.json\" \"\$HOME/.openclaw/agents/$CODEX_AGENT_ID/agent/auth-profiles.json\"
  cp \"\$HOME/.openclaw/agents/$FRONTDOOR_AGENT_ID/agent/models.json\" \"\$HOME/.openclaw/agents/$CODEX_AGENT_ID/agent/models.json\"
  cp \"\$HOME/.openclaw/agents/$FRONTDOOR_AGENT_ID/agent/auth-profiles.json\" \"\$HOME/.openclaw/agents/$CLAUDE_AGENT_ID/agent/auth-profiles.json\"
  cp \"\$HOME/.openclaw/agents/$FRONTDOOR_AGENT_ID/agent/models.json\" \"\$HOME/.openclaw/agents/$CLAUDE_AGENT_ID/agent/models.json\"

  python3 - <<'PY'
from pathlib import Path
import json

path = Path('$OPENCLAW_JSON')
data = json.loads(path.read_text())

def parse_fallbacks(raw):
    return [item.strip() for item in str(raw).split(',') if item.strip()]

frontdoor_model = {
    'primary': '$FRONTDOOR_MODEL_PRIMARY',
    'fallbacks': parse_fallbacks('$FRONTDOOR_MODEL_FALLBACKS'),
}
dispatcher_model = {
    'primary': '$DISPATCHER_MODEL_PRIMARY',
    'fallbacks': parse_fallbacks('$DISPATCHER_MODEL_FALLBACKS'),
}

agents = data.setdefault('agents', {}).setdefault('list', [])
def upsert_agent(agent_id, workspace, model_config):
    for item in agents:
        if item.get('id') == agent_id:
            item['workspace'] = workspace
            item['agentDir'] = f'/home/ubuntu/.openclaw/agents/{agent_id}/agent'
            item['model'] = model_config
            return
    agents.append({
        'id': agent_id,
        'name': agent_id,
        'workspace': workspace,
        'agentDir': f'/home/ubuntu/.openclaw/agents/{agent_id}/agent',
        'model': model_config
    })

upsert_agent('$FRONTDOOR_AGENT_ID', '$FRONTDOOR_WORKSPACE', frontdoor_model)
upsert_agent('$CODEX_AGENT_ID', '$CODEX_WORKSPACE', dispatcher_model)
upsert_agent('$CLAUDE_AGENT_ID', '$CLAUDE_WORKSPACE', dispatcher_model)

bindings = data['bindings'] = [item for item in data.get('bindings', []) if item.get('agentId') not in {'$CODEX_AGENT_ID', '$CLAUDE_AGENT_ID'}]

bindings.insert(0, {
    'type': 'route',
    'agentId': '$CLAUDE_AGENT_ID',
    'match': {'channel': 'telegram', 'peer': {'kind': 'group', 'id': '$CLAUDE_CHAT_ID'}}
})
bindings.insert(0, {
    'type': 'route',
    'agentId': '$CODEX_AGENT_ID',
    'match': {'channel': 'telegram', 'peer': {'kind': 'group', 'id': '$CODEX_CHAT_ID'}}
})

telegram = data.setdefault('channels', {}).setdefault('telegram', {})
telegram['enabled'] = True
telegram.setdefault('groups', {})
telegram['groups']['$CODEX_CHAT_ID'] = {'requireMention': False}
telegram['groups']['$CLAUDE_CHAT_ID'] = {'requireMention': False}

path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
PY

  systemctl --user restart openclaw-gateway.service
  sleep 3
  systemctl --user is-active openclaw-gateway.service
"

echo "Installed Oracle dev dispatchers:"
echo "  - $CODEX_AGENT_ID -> chat $CODEX_CHAT_ID"
echo "  - $CLAUDE_AGENT_ID -> chat $CLAUDE_CHAT_ID"
