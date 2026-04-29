#!/bin/bash
# n8n 워크플로우 배포 스크립트 (안전 버전)
# API 키를 pressco21/.secrets 파일에서 읽어 사용합니다.
# 사용법: bash pressco21/_tools/deploy.sh <WF_ID> <JSON_파일_경로>

set -e

# --- 플래그 파싱 ---
DRY_RUN=false
STAGING=false
CANARY=false

POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --staging)  STAGING=true ;;
    --canary)   CANARY=true ;;
    *)          POSITIONAL+=("$arg") ;;
  esac
done

# --- 인수 확인 ---
if [ ${#POSITIONAL[@]} -lt 2 ]; then
  echo "사용법: bash deploy.sh <워크플로우_ID> <JSON_파일_경로> [--staging|--canary|--dry-run]"
  echo ""
  echo "옵션:"
  echo "  --staging   staging 서버에 배포"
  echo "  --canary    staging 먼저 → 확인 → 운영 배포"
  echo "  --dry-run   PUT body 생성만, 전송 안 함"
  echo ""
  echo "예시: bash deploy.sh 7MXN1lNCR3b7VcLF workflow.json --canary"
  exit 1
fi

WF_ID="${POSITIONAL[0]}"
WF_JSON="${POSITIONAL[1]}"

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

N8N_PROD_URL="https://n8n.pressco21.com"
N8N_STAGING_URL="https://n8n-staging.pressco21.com"

# staging/canary 모드일 때 URL 교체
if [ "$STAGING" = true ]; then
  N8N_BASE_URL="$N8N_STAGING_URL"
elif [ "$CANARY" = true ]; then
  N8N_BASE_URL="$N8N_STAGING_URL"  # canary는 staging부터 시작
else
  N8N_BASE_URL="${N8N_BASE_URL:-$N8N_PROD_URL}"
fi

# --- health_check 함수 ---
health_check() {
  local URL="$1"
  local CHECK_WF_ID="$2"
  local HC_RESPONSE
  HC_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${URL}/api/v1/workflows/${CHECK_WF_ID}")

  local HC_STATUS
  HC_STATUS=$(echo "$HC_RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
  local HC_BODY
  HC_BODY=$(echo "$HC_RESPONSE" | grep -v 'HTTP_STATUS:')

  if [ "$HC_STATUS" = "200" ]; then
    local IS_ACTIVE
    IS_ACTIVE=$(echo "$HC_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('active', False))" 2>/dev/null)
    if [ "$IS_ACTIVE" = "True" ]; then
      echo "✅ Health check 통과 (${URL}, active=true)"
      return 0
    else
      echo "⚠️  워크플로우 비활성 상태 (${URL}, active=false)"
      return 1
    fi
  else
    echo "❌ Health check 실패 (${URL}, HTTP $HC_STATUS)"
    return 1
  fi
}

# --- deploy_to 함수 (PUT 실행) ---
deploy_to() {
  local TARGET_URL="$1"
  local LABEL="$2"

  echo "[$LABEL] 워크플로우 업데이트 중... → $TARGET_URL"
  local RESPONSE
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X PUT \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @"${TMP_FILE}" \
    "${TARGET_URL}/api/v1/workflows/${WF_ID}")

  local HTTP_STATUS
  HTTP_STATUS=$(echo "$RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
  local BODY
  BODY=$(echo "$RESPONSE" | grep -v 'HTTP_STATUS:')

  echo "[$LABEL] HTTP 상태: $HTTP_STATUS"

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "[$LABEL] 배포 성공!"
    echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('활성화 상태:', d.get('active'))" 2>/dev/null
    return 0
  else
    echo "[$LABEL] 배포 실패. 응답:"
    echo "$BODY" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(json.dumps(d, ensure_ascii=False, indent=2)[:500])
except:
    pass
" 2>/dev/null || echo "$BODY" | head -5
    return 1
  fi
}

MODE_LABEL="운영"
if [ "$STAGING" = true ]; then MODE_LABEL="Staging"; fi
if [ "$CANARY" = true ]; then MODE_LABEL="카나리 (Staging→운영)"; fi
if [ "$DRY_RUN" = true ]; then MODE_LABEL="Dry Run"; fi

echo "=== n8n 워크플로우 배포 ==="
echo "대상 WF ID : $WF_ID"
echo "JSON 파일  : $WF_JSON"
echo "배포 모드  : $MODE_LABEL"
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
    "settings": {**wf.get("settings", {}), "executionOrder": "v1"}
}

with open('${TMP_FILE}', 'w', encoding='utf-8') as f:
    json.dump(put_body, f, ensure_ascii=False)

print(f"PUT body 생성 완료: {len(json.dumps(put_body)):,} bytes")
PYEOF

# --- 배포 실행 ---
if [ "$DRY_RUN" = true ]; then
  echo "[Dry Run] PUT body 내용:"
  python3 -c "
import json
with open('${TMP_FILE}', encoding='utf-8') as f:
    d = json.load(f)
print(json.dumps(d, ensure_ascii=False, indent=2)[:2000])
print('...')
print(f'총 크기: {len(json.dumps(d)):,} bytes')
"
  rm -f "${TMP_FILE}"
  echo ""
  echo "=== Dry Run 완료 (전송 없음) ==="
  exit 0
fi

if [ "$CANARY" = true ]; then
  # 카나리: staging 먼저
  deploy_to "$N8N_STAGING_URL" "Staging" || { rm -f "${TMP_FILE}"; exit 1; }
  echo ""
  health_check "$N8N_STAGING_URL" "$WF_ID" || echo "(health check 경고, 계속 진행 가능)"
  echo ""

  # 사용자 확인
  read -p "Staging 배포 완료. 운영에도 배포할까요? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "운영 배포를 취소했습니다."
    rm -f "${TMP_FILE}"
    exit 0
  fi

  # 운영 배포
  echo ""
  deploy_to "$N8N_PROD_URL" "운영" || { rm -f "${TMP_FILE}"; exit 1; }
  echo ""
  health_check "$N8N_PROD_URL" "$WF_ID" || echo "(health check 경고)"
else
  # 일반 배포 (staging 또는 운영)
  deploy_to "$N8N_BASE_URL" "$MODE_LABEL" || { rm -f "${TMP_FILE}"; exit 1; }
  echo ""
  health_check "$N8N_BASE_URL" "$WF_ID" || echo "(health check 경고)"
fi

# 임시 파일 정리
rm -f "${TMP_FILE}"

echo ""
echo "=== 배포 완료 ==="
