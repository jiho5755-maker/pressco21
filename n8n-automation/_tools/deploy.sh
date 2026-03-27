#!/bin/bash
# n8n 워크플로우 배포 스크립트 (안전 버전)
# API 키를 pressco21/.secrets 파일에서 읽어 사용합니다.
# 사용법: bash pressco21/_tools/deploy.sh <WF_ID> <JSON_파일_경로>

set -e

# --- 인수 확인 ---
if [ $# -lt 2 ]; then
  echo "사용법: bash pressco21/_tools/deploy.sh <워크플로우_ID> <JSON_파일_경로>"
  echo "예시: bash pressco21/_tools/deploy.sh 7MXN1lNCR3b7VcLF pressco21/govt-support/workflows/정부지원사업_Pressco21.json"
  exit 1
fi

WF_ID="$1"
WF_JSON="$2"

# --- .secrets 파일에서 API 키 로드 ---
SECRETS_FILE="$(dirname "$0")/../../pressco21/.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  # 루트 기준 경로도 시도
  SECRETS_FILE="pressco21/.secrets"
fi

if [ ! -f "$SECRETS_FILE" ]; then
  echo "오류: .secrets 파일을 찾을 수 없습니다."
  echo "pressco21/.secrets 파일에 N8N_API_KEY를 설정하세요."
  echo "참조: pressco21/secrets.example.env"
  exit 1
fi

# .secrets에서 N8N_API_KEY 추출 (주석 제외)
N8N_API_KEY=$(grep '^N8N_API_KEY=' "$SECRETS_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$N8N_API_KEY" ]; then
  echo "오류: .secrets 파일에 N8N_API_KEY가 설정되지 않았습니다."
  echo "n8n UI → Settings → n8n API → Create API Key 에서 발급 후 입력하세요."
  exit 1
fi

# --- JSON 파일 확인 ---
if [ ! -f "$WF_JSON" ]; then
  echo "오류: JSON 파일을 찾을 수 없습니다: $WF_JSON"
  exit 1
fi

N8N_BASE_URL="${N8N_BASE_URL:-https://n8n.pressco21.com}"

echo "=== n8n 워크플로우 배포 ==="
echo "대상 WF ID : $WF_ID"
echo "JSON 파일  : $WF_JSON"
echo "서버 주소  : $N8N_BASE_URL"
echo ""

# --- PUT body 생성 ---
TMP_FILE="/tmp/n8n_deploy_${WF_ID}.json"

python3 - <<PYEOF
import json, sys

with open('${WF_JSON}', encoding='utf-8') as f:
    wf = json.load(f)

put_body = {
    "name": wf["name"],
    "nodes": wf["nodes"],
    "connections": wf["connections"],
    "settings": {"executionOrder": "v1"}
}

with open('${TMP_FILE}', 'w', encoding='utf-8') as f:
    json.dump(put_body, f, ensure_ascii=False)

print(f"PUT body 생성 완료: {len(json.dumps(put_body)):,} bytes")
PYEOF

# --- n8n API PUT 요청 ---
echo "워크플로우 업데이트 중..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PUT \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${TMP_FILE}" \
  "${N8N_BASE_URL}/api/v1/workflows/${WF_ID}")

HTTP_STATUS=$(echo "$RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v 'HTTP_STATUS:')

echo "HTTP 상태: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "배포 성공!"
  ACTIVE=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('활성화 상태:', d.get('active'))" 2>/dev/null)
  echo "$ACTIVE"
else
  echo "배포 실패. 응답:"
  echo "$BODY" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(json.dumps(d, ensure_ascii=False, indent=2)[:500])
except:
    pass
" 2>/dev/null || echo "$BODY" | head -5
  exit 1
fi

# 임시 파일 정리
rm -f "${TMP_FILE}"

echo ""
echo "=== 배포 완료 ==="
