#!/bin/bash
# openclaw-memory-sync.sh — 서버 메모리 → 로컬 자동 동기화
# 플로라가 서버에서 쌓은 메모리를 로컬로 가져옴

SSH_KEY="$HOME/.ssh/oracle-openclaw.key"
SERVER="ubuntu@158.179.193.173"
LOCAL_DIR="$HOME/clawd/memory/"
REMOTE_DIR="/home/ubuntu/.openclaw/workspace/memory/"
LOG_FILE="$HOME/.local/log/openclaw-memory-sync.log"

mkdir -p "$(dirname "$LOG_FILE")" "$LOCAL_DIR"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# 양방향 동기화 (최신 파일 우선)
rsync -avz --update -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
    "$SERVER:$REMOTE_DIR" "$LOCAL_DIR" 2>/dev/null

if [ $? -eq 0 ]; then
    # 로컬에만 있는 것도 서버로 push
    rsync -avz --update -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
        "$LOCAL_DIR" "$SERVER:$REMOTE_DIR" 2>/dev/null
    echo "[$timestamp] OK: 메모리 동기화 완료" >> "$LOG_FILE"
else
    echo "[$timestamp] ERROR: 동기화 실패" >> "$LOG_FILE"
fi
