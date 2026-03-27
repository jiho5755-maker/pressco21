#!/bin/bash
# ============================================================
# set-error-workflow.sh
# 운영 중인 WF들에 중앙 에러 핸들러 WF를 자동 연결하는 스크립트
#
# 사용법:
#   1. n8n UI에서 central-error-handler.json을 Import하고 활성화
#   2. 활성화된 WF의 ID를 아래 ERROR_HANDLER_WF_ID 변수에 입력
#   3. pressco21/.secrets 파일에 N8N_API_KEY 입력
#   4. bash pressco21/_tools/set-error-workflow.sh
#
# 롤백 방법:
#   스크립트 실행 시 backup/ 폴더에 원본 저장됨
#   bash pressco21/_tools/set-error-workflow.sh --rollback
# ============================================================

set -euo pipefail

# ============================================================
# 설정값 (실행 전 반드시 확인!)
# ============================================================

# ⚠️ n8n UI에서 central-error-handler.json Import 후 확인한 WF ID 입력
ERROR_HANDLER_WF_ID="${ERROR_HANDLER_WF_ID:-}"

N8N_BASE_URL="https://n8n.pressco21.com"
BACKUP_DIR="$(dirname "$0")/backup/error-workflow-$(date +%Y%m%d-%H%M%S)"
SECRETS_FILE="$(dirname "$0")/../.secrets"

# ============================================================
# 대상 WF 목록 (쇼핑몰 7개 + 정부지원사업 7개 = 14개)
# ============================================================
TARGET_WF_IDS=(
  # 쇼핑몰 운영 자동화
  "jaTfiQuY35DjgrxN"   # FA-001: 강사 등급 자동 변경
  "ovWkhq7E0ZqvjBIZ"   # FA-002: 강사 신청 알림
  "Ks4JvBC06cEj6b8b"   # FA-003: 반려 이메일 자동 발송
  "A2VToTXNoaeHu29N"   # F030a: SNS 일일 리마인더
  "3X7AM40dgQP4SQAO"   # F030b: SNS 주간 리포트
  "krItUablejX8YLNV"   # F050: AI 챗봇 백엔드
  "C3VQdprEjzQiiEW9"   # F050b: AI 챗봇 피드백 수집

  # 정부지원사업 자동수집
  "7MXN1lNCR3b7VcLF"   # WF#1: 자동수집+AI분석
  "3TXzJ9AADTf9oNL6"   # WF#2: 마감임박 재알림
  "oeIOcnDYpSDmbkKp"   # WF#3: 월간리포트
  "Is13frkTT5USFXyI"   # WF#4: 이벤트기반탐색
  "TsJQE6BxL3HQM6Ax"   # WF#5: 행정서류자동생성
  "HxskyYvTbFvRzgaa"   # WF#6: 텔레그램허브
  "FedVm1QWsvUeUjUn"   # GS-805: 주간TOP5 리포트
)

# ============================================================
# 함수 정의
# ============================================================

log() {
  echo "[$(date '+%H:%M:%S')] $1"
}

error() {
  echo "[ERROR] $1" >&2
  exit 1
}

# .secrets 파일에서 API 키 로드
load_api_key() {
  if [[ -f "$SECRETS_FILE" ]]; then
    source "$SECRETS_FILE"
  fi

  if [[ -z "${N8N_API_KEY:-}" ]]; then
    error ".secrets 파일에 N8N_API_KEY가 없습니다.\n  설정 방법: n8n UI → Settings → n8n API → Create API Key"
  fi

  log "✅ API 키 로드 완료"
}

# WF 정보 조회
get_workflow() {
  local wf_id="$1"
  curl -s \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${N8N_BASE_URL}/api/v1/workflows/${wf_id}"
}

# WF 업데이트 (errorWorkflow 설정 추가)
update_workflow() {
  local wf_id="$1"
  local wf_data="$2"

  # settings에 errorWorkflow 추가
  local updated_data
  updated_data=$(echo "$wf_data" | python3 -c "
import json, sys
data = json.load(sys.stdin)
settings = data.get('settings', {})
settings['errorWorkflow'] = '${ERROR_HANDLER_WF_ID}'
data['settings'] = settings

# PUT에 필요한 필드만 추출
put_body = {
  'name': data['name'],
  'nodes': data['nodes'],
  'connections': data['connections'],
  'settings': data['settings']
}
print(json.dumps(put_body))
")

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X PUT \
    -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$updated_data" \
    "${N8N_BASE_URL}/api/v1/workflows/${wf_id}")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | head -n -1)

  echo "$http_code"
}

# 롤백 실행
rollback() {
  local latest_backup
  latest_backup=$(ls -d "$(dirname "$0")/backup/"*/ 2>/dev/null | sort -r | head -1)

  if [[ -z "$latest_backup" ]]; then
    error "롤백할 백업 파일이 없습니다."
  fi

  log "롤백 시작: $latest_backup"
  load_api_key

  for backup_file in "${latest_backup}"*.json; do
    wf_id=$(basename "$backup_file" .json)
    log "롤백 중: $wf_id"

    local wf_data
    wf_data=$(cat "$backup_file")

    local put_body
    put_body=$(echo "$wf_data" | python3 -c "
import json, sys
data = json.load(sys.stdin)
put_body = {
  'name': data['name'],
  'nodes': data['nodes'],
  'connections': data['connections'],
  'settings': data['settings']
}
print(json.dumps(put_body))
")

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PUT \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$put_body" \
      "${N8N_BASE_URL}/api/v1/workflows/${wf_id}")

    if [[ "$http_code" == "200" ]]; then
      log "  ✅ $wf_id 롤백 완료"
    else
      log "  ❌ $wf_id 롤백 실패 (HTTP $http_code)"
    fi
  done

  log "롤백 완료"
  exit 0
}

# ============================================================
# 메인 실행
# ============================================================

# 롤백 모드 확인
if [[ "${1:-}" == "--rollback" ]]; then
  rollback
fi

# 사전 검증
if [[ -z "$ERROR_HANDLER_WF_ID" ]]; then
  error "ERROR_HANDLER_WF_ID를 설정해야 합니다.

  사용법:
    ERROR_HANDLER_WF_ID=<WF_ID> bash pressco21/_tools/set-error-workflow.sh

  WF ID 확인: n8n UI에서 central-error-handler.json Import 후
  해당 WF URL (예: https://n8n.pressco21.com/workflow/abcde12345) 에서 ID 확인"
fi

load_api_key

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"
log "백업 경로: $BACKUP_DIR"

# 통계 초기화
success_count=0
fail_count=0

log ""
log "=========================================="
log "에러 워크플로우 설정 시작"
log "대상 WF 수: ${#TARGET_WF_IDS[@]}"
log "에러 핸들러 WF ID: $ERROR_HANDLER_WF_ID"
log "=========================================="
log ""

for wf_id in "${TARGET_WF_IDS[@]}"; do
  log "처리 중: $wf_id"

  # 원본 조회
  wf_data=$(get_workflow "$wf_id")

  # 조회 실패 확인
  if echo "$wf_data" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then
    # 백업 저장
    echo "$wf_data" > "${BACKUP_DIR}/${wf_id}.json"

    # 현재 errorWorkflow 값 확인
    current_error_wf=$(echo "$wf_data" | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(d.get('settings',{}).get('errorWorkflow','NOT SET'))
")

    if [[ "$current_error_wf" == "$ERROR_HANDLER_WF_ID" ]]; then
      log "  ⏭️  이미 설정됨 (건너뜀)"
      ((success_count++)) || true
      continue
    fi

    # 업데이트
    http_code=$(update_workflow "$wf_id" "$wf_data")

    if [[ "$http_code" == "200" ]]; then
      log "  ✅ 설정 완료 (이전: $current_error_wf → $ERROR_HANDLER_WF_ID)"
      ((success_count++)) || true
    else
      log "  ❌ 실패 (HTTP $http_code)"
      ((fail_count++)) || true
    fi
  else
    log "  ⚠️  WF 조회 실패 (존재하지 않거나 권한 없음)"
    ((fail_count++)) || true
  fi

  # API 부하 방지
  sleep 0.5
done

log ""
log "=========================================="
log "완료!"
log "  성공: $success_count / ${#TARGET_WF_IDS[@]}"
log "  실패: $fail_count"
log "  백업: $BACKUP_DIR"
log "=========================================="

if [[ $fail_count -gt 0 ]]; then
  log ""
  log "⚠️  일부 WF 설정에 실패했습니다. 로그를 확인하세요."
  log "롤백: bash pressco21/_tools/set-error-workflow.sh --rollback"
  exit 1
fi

log ""
log "✅ 모든 WF에 에러 핸들러가 연결되었습니다."
log ""
log "테스트 방법:"
log "  1. 테스트 WF에서 의도적으로 오류 발생"
log "  2. 텔레그램 프레스코21 그룹에서 🚨 알림 확인"
