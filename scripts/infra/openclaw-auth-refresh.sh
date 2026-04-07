#!/bin/bash
# openclaw-auth-refresh.sh — OpenClaw 인증 토큰 자동 갱신
# 로컬 clawdbot의 OAuth 토큰을 서버 OpenClaw(main/owner/staff)에 동기화
#
# launchd로 1시간마다 실행

SSH_KEY="$HOME/.ssh/oracle-openclaw.key"
SERVER="ubuntu@158.179.193.173"
LOCAL_AUTH="$HOME/.clawdbot/agents/main/agent/auth-profiles.json"
REMOTE_TMP="/tmp/openclaw-auth-auto.json"
LOG_FILE="$HOME/.local/log/openclaw-auth.log"

mkdir -p "$(dirname "$LOG_FILE")"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# 로컬 인증 파일 존재 확인
if [ ! -f "$LOCAL_AUTH" ]; then
    echo "[$timestamp] ERROR: 로컬 인증 파일 없음" >> "$LOG_FILE"
    exit 1
fi

# 토큰 만료 확인 및 OpenAI Codex expiry 보정 (python3으로)
NEEDS_SYNC=$(python3 << 'PYEOF'
import base64
import json
import time

path = '/Users/jangjiho/.clawdbot/agents/main/agent/auth-profiles.json'

with open(path) as f:
    local = json.load(f)

# Codex CLI에서 받은 access JWT의 exp를 우선 신뢰해 stale expiry를 보정한다.
openai = local.get('profiles', {}).get('openai-codex:codex-cli')
if openai and openai.get('access'):
    try:
        payload = openai['access'].split('.')[1]
        payload += '=' * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        jwt_exp_ms = int(claims['exp']) * 1000
        if jwt_exp_ms > int(openai.get('expires', 0)):
            openai['expires'] = jwt_exp_ms
    except Exception:
        pass

with open(path, 'w') as f:
    json.dump(local, f, indent=2)
    f.write('\n')

now_ms = time.time() * 1000
any_valid = False

for k, v in local['profiles'].items():
    expires = v.get('expires', 0)
    remaining_hours = (expires - now_ms) / 3600000
    if remaining_hours > 1:  # 1시간 이상 남은 토큰이 있으면
        any_valid = True

print("yes" if any_valid else "no")
PYEOF
)

if [ "$NEEDS_SYNC" = "yes" ]; then
    # 서버로 인증 복사
    python3 << 'PYEOF'
import json

with open('/Users/jangjiho/.clawdbot/agents/main/agent/auth-profiles.json') as f:
    local = json.load(f)

server_auth = {
    "version": 1,
    "profiles": {},
    "lastGood": {},
    "usageStats": {}
}

for key, val in local["profiles"].items():
    server_auth["profiles"][key] = val
    provider = val.get("provider", "")
    server_auth["lastGood"][provider] = key

with open('/tmp/openclaw-auth-auto.json', 'w') as f:
    json.dump(server_auth, f, indent=2)
    f.write('\n')
PYEOF

    scp -i "$SSH_KEY" -o ConnectTimeout=10 /tmp/openclaw-auth-auto.json "$SERVER:$REMOTE_TMP" 2>/dev/null
    if [ $? -eq 0 ]; then
        ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" '
            set -e
            for target in \
                /home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json \
                /home/ubuntu/.openclaw/agents/owner/agent/auth-profiles.json \
                /home/ubuntu/.openclaw/agents/staff/agent/auth-profiles.json
            do
                install -D -m 600 /tmp/openclaw-auth-auto.json "$target"
            done
            rm -f /tmp/openclaw-auth-auto.json
        ' >/dev/null 2>&1
    fi
    rm -f /tmp/openclaw-auth-auto.json

    if [ $? -eq 0 ]; then
        echo "[$timestamp] OK: 인증 동기화 완료 (main/owner/staff)" >> "$LOG_FILE"
    else
        echo "[$timestamp] ERROR: 서버 동기화 실패" >> "$LOG_FILE"
    fi
else
    echo "[$timestamp] SKIP: 유효한 토큰 없음 (로컬에서 먼저 갱신 필요)" >> "$LOG_FILE"
fi
