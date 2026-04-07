#!/bin/bash
# openclaw-sync.sh — 로컬 clawd/ ↔ 서버 openclaw/workspace 양방향 동기화
#
# 사용법:
#   openclaw-sync.sh push   # 로컬 → 서버
#   openclaw-sync.sh pull   # 서버 → 로컬
#   openclaw-sync.sh sync   # 양방향 (rsync)

SSH_KEY="$HOME/.ssh/oracle-openclaw.key"
SERVER="ubuntu@158.179.193.173"
LOCAL_DIR="$HOME/clawd/"
REMOTE_DIR="/home/ubuntu/.openclaw/workspace/"

# 동기화에서 제외할 파일
EXCLUDES="--exclude=.git --exclude=node_modules --exclude=.DS_Store --exclude=canvas/"

case "${1:-sync}" in
  push)
    echo "📤 로컬 → 서버 동기화..."
    rsync -avz --delete -e "ssh -i $SSH_KEY" $EXCLUDES "$LOCAL_DIR" "$SERVER:$REMOTE_DIR"
    echo "✅ push 완료"
    ;;
  pull)
    echo "📥 서버 → 로컬 동기화..."
    rsync -avz -e "ssh -i $SSH_KEY" $EXCLUDES "$SERVER:$REMOTE_DIR" "$LOCAL_DIR"
    echo "✅ pull 완료"
    ;;
  sync)
    echo "🔄 양방향 동기화 (서버 우선)..."
    # 먼저 서버에서 pull (서버가 최신)
    rsync -avz --update -e "ssh -i $SSH_KEY" $EXCLUDES "$SERVER:$REMOTE_DIR" "$LOCAL_DIR"
    # 로컬에만 있는 파일 push
    rsync -avz --update -e "ssh -i $SSH_KEY" $EXCLUDES "$LOCAL_DIR" "$SERVER:$REMOTE_DIR"
    echo "✅ 양방향 동기화 완료"
    ;;
  auth)
    echo "🔑 인증 토큰 동기화 (로컬 → 서버)..."
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

with open('/tmp/openclaw-auth-sync.json', 'w') as f:
    json.dump(server_auth, f, indent=2)

print("인증 파일 준비 완료")
PYEOF
    scp -i "$SSH_KEY" /tmp/openclaw-auth-sync.json "$SERVER:/home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json"
    rm /tmp/openclaw-auth-sync.json
    echo "✅ 인증 동기화 완료"
    ;;
  status)
    echo "📊 동기화 상태 확인..."
    echo "--- 로컬 ---"
    ls -la "$LOCAL_DIR"*.md 2>/dev/null
    echo "--- 서버 ---"
    ssh -i "$SSH_KEY" "$SERVER" "ls -la $REMOTE_DIR*.md" 2>/dev/null
    ;;
  *)
    echo "사용법: $0 {push|pull|sync|auth|status}"
    exit 1
    ;;
esac
