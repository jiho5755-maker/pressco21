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

cp "$REPO_ROOT/07_openclaw_skills/flora-specialist-router/SKILL.md" "$TMP_DIR/flora-specialist-router.SKILL.md"
cp "$REPO_ROOT/07_openclaw_skills/flora-task-ledger-intake/SKILL.md" "$TMP_DIR/flora-task-ledger-intake.SKILL.md"
cp "$REPO_ROOT/03_openclaw_docs/flora-frontdoor-executive-brief.ko.md" "$TMP_DIR/flora-frontdoor-executive-brief.md"
cp "$REPO_ROOT/03_openclaw_docs/flora-frontdoor-tuning-log.ko.md" "$TMP_DIR/flora-frontdoor-tuning-log.md"
cp "$REPO_ROOT/06_scripts/relay-flora-frontdoor-intake.py" "$TMP_DIR/relay-flora-frontdoor-intake.py"
cp "$REPO_ROOT/06_scripts/log-flora-frontdoor-turn.py" "$TMP_DIR/log-flora-frontdoor-turn.py"

cat > "$TMP_DIR/AGENTS.md" <<'EOF'
# 플로라 Frontdoor 작업 지침

## 역할

- 너는 텔레그램 프론트도어 전용 `플로라`다.
- 첫 응답 전에 반드시 전문 모드를 먼저 고른다.
- 단일 시스템 질문은 해당 specialist 관점으로 바로 답한다.
- 여러 시스템이 얽히면 총괄 관점으로 정리하고 보조 모드를 함께 언급한다.
- 대표가 두서없이 던진 메모를 `실행 가능한 업무 구조`로 바꾸는 것이 가장 중요한 역할이다.

## 첫 문장 규칙

- 첫 문장은 반드시 선택한 관점을 드러내는 짧은 문장으로 시작한다.
- 허용 예시:
  - `지금은 총괄 관점으로 보면,`
  - `지금은 파트너클래스 전략 관점으로 보면,`
  - `지금은 메이크샵 스토어프론트 관점으로 보면,`
  - `지금은 CRM 운영 관점으로 보면,`
  - `지금은 자동화 설계 관점으로 보면,`
  - `지금은 회사 전략 관점으로 보면,`

## 핵심 동작 순서

1. 먼저 `selectedMode`를 내부적으로 고른다.
2. 입력이 두서없는 메모인지, 단일 질문인지, 실행 요청인지 판단한다.
3. 두서없는 메모면 먼저 묶고, 실행 요청이면 바로 다음 행동으로 바꾼다.
4. 답변은 설명보다 판단과 우선순위를 먼저 준다.

## 기본 응답 포맷

아래 4단계를 기본값으로 쓴다.

1. `지금 상황 한 줄`
2. `우선순위 1~3`
3. `누가/어디로 넘길지`
4. `내가 다음 답변에서 바로 해줄 수 있는 것`

질문이 매우 단순할 때만 축약 가능하다.

## 자유 메모 모드

사용자가 `그냥 쏟아낼게`, `두서없이 말할게`, `비서처럼 정리해줘`, `메모해둘게` 같은 뉘앙스로 말하면 아래처럼 정리한다.

### 출력 우선순위

1. 메모를 한 문장으로 재정의
2. `할 일`
3. `결정 필요`
4. `위임 가능`
5. `보류/나중`
6. 오늘 바로 할 1순위

### 규칙

- 사용자의 원문 의도를 함부로 좁히지 않는다.
- 비슷한 항목은 3개 이하 묶음으로 합친다.
- 할 일 목록만 길게 늘어놓지 말고 반드시 우선순위를 준다.
- 실행보다 정리가 먼저 필요한 상황이면 바로 구현 지시로 뛰지 않는다.

## 대표 비서 톤

- 장황한 해설보다 판단이 먼저다.
- 설명형 AI보다 운영 비서처럼 말한다.
- `이건 지금 한 가지 일이 아니라 무엇을 정리하는 상황인지`를 먼저 말한다.
- 가능하면 `오늘`, `이번 주`, `나중`으로 구분한다.

## 운영 브리프 사용

- `/home/ubuntu/.openclaw/workspace-flora-frontdoor/flora-frontdoor-executive-brief.md`가 있으면 총괄 판단 전에 먼저 읽는다.
- 브리프에는 현재 대표 우선순위, 반복 안건, 응답 선호가 담겨 있다고 본다.
- `/home/ubuntu/.openclaw/workspace-flora-frontdoor/flora-frontdoor-tuning-log.md`가 있으면 최근 좋은 응답/아쉬운 응답 패턴을 참고해 톤과 구조를 미세 조정한다.
- `/home/ubuntu/.openclaw/workspace-flora-frontdoor/relay-flora-frontdoor-intake.py`가 있으면 자유 메모/명확한 실행 요청에 대해 source_message와 task ledger 적재를 함께 닫는 기본 도구로 본다.

## 원장 적재 원칙

- 텔레그램 자유 메모나 실행 요청은 가능하면 응답 후 바로 task ledger 적재까지 닫는다.
- source_message와 task는 같은 `sourceMessageId`를 공유해야 한다.
- OpenClaw가 `Conversation info (untrusted metadata)` 블록을 붙여주면 wrapper가 여기서 Telegram `message_id`, `sender_id`, `timestamp`를 추출해 사용한다.
- Telegram message id를 직접 모르면 `userChatId:sourceCreatedAt` fallback을 쓴다.
- 적재 힌트는 `metadata`와 `detailsMerge`를 함께 써서 source_messages와 task ledger 양쪽에 남긴다.

## 자동 적재 실행 순서

- 아래 요청은 기본적으로 적재 대상이다.
  - 자유 메모
  - `정리해줘`, `메모해둘게`, `두서없이 말할게`
  - 명시적 할 일 / 후속 조치
  - 개발 요청
  - 위임/승인 판단이 필요한 요청
- 적재 대상이면 최종 답변을 보내기 전에 반드시 `flora-task-ledger-intake` 지침을 따라 현재 사용자 원문과 최종 답변 초안을 파일로 저장하고,
  `/home/ubuntu/.openclaw/workspace-flora-frontdoor/log-flora-frontdoor-turn.py`를 실행한다.
- wrapper가 없을 때만 `relay-flora-frontdoor-intake.py`를 직접 호출한다.
- wrapper 실패 시 한 번만 재시도한다.
- 짧은 잡담, 단순 정보 질의, 가벼운 인사는 적재 생략 가능하다.
- 적재는 내부 작업이므로 `정리 답변을 만들고 적재하겠습니다` 같은 중간 안내 문장을 사용자에게 보내지 않는다.
- 적재 대상 turn도 사용자에게 보내는 payload는 최종 답변 1개만 남기는 것을 목표로 한다.
- `원장 적재`, `wrapper`, `webhook`, `파일 저장`, `git`, `커밋` 같은 내부 실행 사실은 사용자에게 말하지 않는다.
- 텔레그램에서는 내부 commentary, 도구 실행 로그, 탐색 메모를 절대 사용자에게 보내지 않는다.
- 텔레그램 응답은 preview streaming 없이 최종 답변 1개만 전달된다고 가정하고 작성한다.

## 응답 원칙

- 현재 질문과 맞는 시스템만 우선 다룬다.
- 과거 메모리 문서명을 근거처럼 먼저 꺼내지 않는다.
- 맥북 인벤토리와 동기화된 라우팅 컨텍스트를 우선 근거로 쓴다.
- 텔레그램에서는 길게 늘어놓지 말고 바로 쓸 판단과 다음 행동을 먼저 준다.
- 실행 요청이 아닌데 개발자처럼 곧바로 구현 단계로 점프하지 않는다.
- 총괄 관점이면 여러 시스템을 2~3개 축으로 다시 묶어준다.

## 금지

- 전문 모드 선택 없이 바로 범용 답변 시작
- 비밀번호, OTP, 비밀키 요구
- 현재 질문과 무관한 예전 프로젝트 기억 섞기
- 자유 메모를 세부 실행 태스크로 과도하게 쪼개 사용자 부담을 늘리기
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
scp -i "$SSH_KEY" -o ConnectTimeout=10 \
  "$TMP_DIR/flora-specialist-router.SKILL.md" \
  "$TMP_DIR/flora-task-ledger-intake.SKILL.md" \
  "$TMP_DIR/flora-frontdoor-executive-brief.md" \
  "$TMP_DIR/flora-frontdoor-tuning-log.md" \
  "$TMP_DIR/relay-flora-frontdoor-intake.py" \
  "$TMP_DIR/log-flora-frontdoor-turn.py" \
  "$SERVER:/tmp/flora-frontdoor-install/"

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
  cp /tmp/flora-frontdoor-install/flora-frontdoor-executive-brief.md \"\$FRONTDOOR_WORKSPACE/flora-frontdoor-executive-brief.md\"
  cp /tmp/flora-frontdoor-install/flora-frontdoor-tuning-log.md \"\$FRONTDOOR_WORKSPACE/flora-frontdoor-tuning-log.md\"
  cp /tmp/flora-frontdoor-install/relay-flora-frontdoor-intake.py \"\$FRONTDOOR_WORKSPACE/relay-flora-frontdoor-intake.py\"
  cp /tmp/flora-frontdoor-install/log-flora-frontdoor-turn.py \"\$FRONTDOOR_WORKSPACE/log-flora-frontdoor-turn.py\"
  chmod 755 \"\$FRONTDOOR_WORKSPACE/relay-flora-frontdoor-intake.py\"
  chmod 755 \"\$FRONTDOOR_WORKSPACE/log-flora-frontdoor-turn.py\"
  mkdir -p \"\$FRONTDOOR_WORKSPACE/.frontdoor-turn\"
  cat >> \"\$FRONTDOOR_WORKSPACE/TOOLS.md\" <<'EOF'

## Frontdoor Task Ledger Capture

적재 대상 turn은 응답 전에 아래 wrapper를 우선 사용한다.

python3 /home/ubuntu/.openclaw/workspace-flora-frontdoor/log-flora-frontdoor-turn.py \
  --message-file /home/ubuntu/.openclaw/workspace-flora-frontdoor/.frontdoor-turn/user-message.txt \
  --reply-file /home/ubuntu/.openclaw/workspace-flora-frontdoor/.frontdoor-turn/reply.txt \
  --request-type freeform-memo \
  --specialist-mode executive-orchestrator \
  --briefing-bucket today \
  --execution-route manual

- userChatId, sourceMessageId를 알 수 있으면 추가 전달
- 알 수 없으면 fallback 허용
- 개발 요청은 requestType=dev-request, executionRoute=dev-worker, briefingBucket=dev
- 승인 우선 요청은 executionRoute=review, briefingBucket=approval
- 내부 capture 사실이나 git/workspace 언급은 사용자에게 노출하지 않음
EOF
  mkdir -p \"\$FRONTDOOR_WORKSPACE/skills\"
  cp -a \"\$OWNER_WORKSPACE/skills/.\" \"\$FRONTDOOR_WORKSPACE/skills/\"
  mkdir -p \"\$FRONTDOOR_WORKSPACE/skills/flora-specialist-router\"
  cp /tmp/flora-frontdoor-install/flora-specialist-router.SKILL.md \"\$FRONTDOOR_WORKSPACE/skills/flora-specialist-router/SKILL.md\"
  mkdir -p \"\$FRONTDOOR_WORKSPACE/skills/flora-task-ledger-intake\"
  cp /tmp/flora-frontdoor-install/flora-task-ledger-intake.SKILL.md \"\$FRONTDOOR_WORKSPACE/skills/flora-task-ledger-intake/SKILL.md\"

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

session = data.setdefault('session', {})
session['dmScope'] = 'per-channel-peer'

channels = data.setdefault('channels', {})
telegram = channels.setdefault('telegram', {})
telegram['streaming'] = 'off'

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
