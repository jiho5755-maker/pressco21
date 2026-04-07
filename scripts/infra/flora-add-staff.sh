#!/bin/bash
# flora-add-staff.sh — 플로라 봇에 직원 추가
# 사용법: ./flora-add-staff.sh <이름> <Chat_ID>
# 예시:   ./flora-add-staff.sh 이재혁 1234567890
#
# 이 스크립트가 하는 일:
# 1. openclaw.json의 allowFrom에 Chat ID 추가
# 2. bindings를 peer-specific 라우팅으로 업데이트
# 3. OpenClaw 게이트웨이 재시작

set -euo pipefail

# --- 설정 ---
SSH_KEY="$HOME/.ssh/oracle-openclaw.key"
SERVER="ubuntu@158.179.193.173"
CONFIG="/home/ubuntu/.openclaw/openclaw.json"

# owner Chat ID 목록 (이 ID들은 owner 에이전트로 라우팅)
OWNER_IDS=("7713811206" "8606163783")

# --- 인자 확인 ---
if [ $# -lt 2 ]; then
    echo "사용법: $0 <이름> <Chat_ID>"
    echo "예시:   $0 이재혁 1234567890"
    exit 1
fi

NAME="$1"
CHAT_ID="$2"

# Chat ID 숫자 검증
if ! [[ "$CHAT_ID" =~ ^[0-9]+$ ]]; then
    echo "오류: Chat ID는 숫자만 가능합니다. 입력값: $CHAT_ID"
    exit 1
fi

echo "=== 플로라 봇 직원 추가 ==="
echo "이름: $NAME"
echo "Chat ID: $CHAT_ID"
echo ""

# --- 1단계: 현재 설정 백업 ---
echo "[1/4] 현재 설정 백업..."
ssh -i "$SSH_KEY" "$SERVER" "cp $CONFIG ${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"

# --- 2단계: allowFrom에 Chat ID 추가 ---
echo "[2/4] allowFrom에 Chat ID 추가..."
ssh -i "$SSH_KEY" "$SERVER" "
    cd /home/ubuntu
    node -e \"
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));

        // allowFrom에 추가 (중복 방지)
        const allowFrom = config.channels.telegram.allowFrom;
        if (!allowFrom.includes('$CHAT_ID')) {
            allowFrom.push('$CHAT_ID');
            console.log('allowFrom에 $CHAT_ID 추가 완료');
        } else {
            console.log('$CHAT_ID는 이미 allowFrom에 존재');
        }

        fs.writeFileSync('$CONFIG', JSON.stringify(config, null, 2));
    \"
"

# --- 3단계: bindings를 peer-specific으로 업데이트 ---
echo "[3/4] bindings 업데이트 (peer-specific 라우팅)..."
ssh -i "$SSH_KEY" "$SERVER" "
    cd /home/ubuntu
    node -e \"
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));

        // owner ID 목록
        const ownerIds = [$(printf '\"tg:%s\",' "${OWNER_IDS[@]}" | sed 's/,$//')];

        // bindings 재구성: owner별 개별 라우팅 + staff fallback
        const bindings = [];

        // owner별 명시적 바인딩
        ownerIds.forEach(id => {
            bindings.push({
                type: 'route',
                agentId: 'owner',
                match: { channel: 'telegram', peer: { id: id } }
            });
        });

        // staff fallback (나머지 모든 telegram → staff)
        bindings.push({
            type: 'route',
            agentId: 'staff',
            match: { channel: 'telegram' }
        });

        config.bindings = bindings;
        fs.writeFileSync('$CONFIG', JSON.stringify(config, null, 2));
        console.log('bindings 업데이트 완료: owner ' + ownerIds.length + '명 + staff fallback');
    \"
"

# --- 4단계: 게이트웨이 재시작 ---
echo "[4/4] OpenClaw 게이트웨이 재시작..."
ssh -i "$SSH_KEY" "$SERVER" "systemctl --user restart openclaw-gateway && sleep 2 && systemctl --user is-active openclaw-gateway"

echo ""
echo "=== 완료 ==="
echo "$NAME ($CHAT_ID) 직원 추가 완료!"
echo "이제 $NAME 님이 텔레그램에서 @pressco21_openclaw_bot에게 메시지를 보낼 수 있습니다."
echo ""
echo "다음 단계:"
echo "  1. $NAME 에게 텔레그램에서 봇 검색 후 /start 누르라고 안내"
echo "  2. 테스트 메시지 확인"
