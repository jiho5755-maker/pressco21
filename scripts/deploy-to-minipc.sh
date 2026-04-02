#!/usr/bin/env bash
# 미니PC 원클릭 배포 스크립트
# 로컬 pressco21/scripts/server/ 내 변경된 스크립트를 미니PC에 배포
#
# 사용법:
#   bash pressco21/scripts/deploy-to-minipc.sh              # 변경분만
#   bash pressco21/scripts/deploy-to-minipc.sh --all         # 전체 강제 배포
#   bash pressco21/scripts/deploy-to-minipc.sh --dry-run     # 미리보기만
#   bash pressco21/scripts/deploy-to-minipc.sh FILE1 FILE2   # 특정 파일만

set -Eeuo pipefail

# --- 설정 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/pressco21/scripts/server"
MINIPC_HOST="minipc"  # ~/.ssh/config 별칭
MINIPC_BIN="/usr/local/bin"
MINIPC_VENV="/opt/pressco21-venv"
LOG_PREFIX="[deploy-minipc]"

# --- 플래그 파싱 ---
DRY_RUN=false
DEPLOY_ALL=false
SPECIFIC_FILES=()

for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --all)       DEPLOY_ALL=true ;;
    --help|-h)
      echo "사용법: bash deploy-to-minipc.sh [--all|--dry-run|FILE...]"
      echo ""
      echo "옵션:"
      echo "  --all       전체 스크립트 강제 배포"
      echo "  --dry-run   변경 파일 목록만 출력, 전송 안 함"
      echo "  FILE...     특정 파일만 배포 (server/ 내 파일명)"
      exit 0
      ;;
    *)  SPECIFIC_FILES+=("$arg") ;;
  esac
done

log() { echo "$LOG_PREFIX $*"; }
err() { echo "$LOG_PREFIX ERROR: $*" >&2; }

# --- 디렉토리 확인 ---
if [ ! -d "$SERVER_DIR" ]; then
  err "서버 스크립트 디렉토리를 찾을 수 없습니다: $SERVER_DIR"
  exit 1
fi

# --- 배포 대상 파일 결정 ---
declare -a FILES_TO_DEPLOY=()

if [ ${#SPECIFIC_FILES[@]} -gt 0 ]; then
  # 특정 파일 지정
  for f in "${SPECIFIC_FILES[@]}"; do
    full_path="$SERVER_DIR/$f"
    if [ ! -f "$full_path" ]; then
      # 전체 경로로도 시도
      if [ -f "$f" ]; then
        full_path="$f"
      else
        err "파일을 찾을 수 없습니다: $f"
        exit 1
      fi
    fi
    FILES_TO_DEPLOY+=("$full_path")
  done
elif [ "$DEPLOY_ALL" = true ]; then
  # 전체 배포
  while IFS= read -r f; do
    FILES_TO_DEPLOY+=("$f")
  done < <(find "$SERVER_DIR" -maxdepth 1 \( -name "mini-pc-*.sh" -o -name "mini-pc-*.py" -o -name "vault-*.py" -o -name "nocodb-*.sh" \) -type f | sort)
else
  # git diff 기반 변경 감지
  cd "$PROJECT_ROOT"
  while IFS= read -r f; do
    full_path="$PROJECT_ROOT/$f"
    if [ -f "$full_path" ]; then
      FILES_TO_DEPLOY+=("$full_path")
    fi
  done < <(git diff --name-only HEAD~5 HEAD -- "pressco21/scripts/server/" 2>/dev/null || true)

  # staged 변경도 포함
  while IFS= read -r f; do
    full_path="$PROJECT_ROOT/$f"
    if [ -f "$full_path" ]; then
      # 중복 제거
      local_already=false
      for existing in "${FILES_TO_DEPLOY[@]:-}"; do
        if [ "$existing" = "$full_path" ]; then
          local_already=true
          break
        fi
      done
      if [ "$local_already" = false ]; then
        FILES_TO_DEPLOY+=("$full_path")
      fi
    fi
  done < <(git diff --cached --name-only -- "pressco21/scripts/server/" 2>/dev/null || true)

  # untracked 파일도 포함
  while IFS= read -r f; do
    full_path="$PROJECT_ROOT/$f"
    if [ -f "$full_path" ]; then
      local_already=false
      for existing in "${FILES_TO_DEPLOY[@]:-}"; do
        if [ "$existing" = "$full_path" ]; then
          local_already=true
          break
        fi
      done
      if [ "$local_already" = false ]; then
        FILES_TO_DEPLOY+=("$full_path")
      fi
    fi
  done < <(git ls-files --others --exclude-standard -- "pressco21/scripts/server/" 2>/dev/null || true)
fi

if [ ${#FILES_TO_DEPLOY[@]} -eq 0 ]; then
  log "배포할 변경 파일이 없습니다."
  log "팁: --all 옵션으로 전체 강제 배포, 또는 특정 파일명 지정"
  exit 0
fi

# --- 배포 목록 출력 ---
echo "=== 미니PC 배포 ==="
echo "대상 호스트 : $MINIPC_HOST"
echo "배포 모드   : $([ "$DRY_RUN" = true ] && echo 'Dry Run' || echo '실행')"
echo "배포 파일   : ${#FILES_TO_DEPLOY[@]}개"
echo ""

PYTHON_FILES=()
SHELL_FILES=()
INSTALL_FILES=()

for f in "${FILES_TO_DEPLOY[@]}"; do
  fname="$(basename "$f")"
  echo "  - $fname"

  case "$fname" in
    install-*)  INSTALL_FILES+=("$f") ;;
    *.py)       PYTHON_FILES+=("$f") ;;
    *.sh)       SHELL_FILES+=("$f") ;;
  esac
done
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "=== Dry Run 완료 (전송 없음) ==="
  echo ""
  echo "배포하려면: bash $0 ${SPECIFIC_FILES[*]:-}"
  exit 0
fi

# --- SSH 연결 테스트 ---
log "SSH 연결 확인 중..."
if ! ssh -o ConnectTimeout=5 "$MINIPC_HOST" echo "connected" >/dev/null 2>&1; then
  err "미니PC ($MINIPC_HOST) SSH 연결 실패"
  err "네트워크 연결을 확인하세요 (같은 로컬 네트워크?)"
  exit 1
fi
log "SSH 연결 OK"

# --- Python 가상환경 확인 ---
if [ ${#PYTHON_FILES[@]} -gt 0 ]; then
  log "Python 가상환경 확인 중..."
  if ! ssh "$MINIPC_HOST" "test -d $MINIPC_VENV"; then
    log "가상환경이 없습니다. 생성합니다..."
    ssh "$MINIPC_HOST" "sudo python3 -m venv $MINIPC_VENV && sudo $MINIPC_VENV/bin/pip install --upgrade pip" || {
      err "가상환경 생성 실패"
      exit 1
    }
  fi
fi

# --- 파일 전송 + 배포 ---
DEPLOYED=0
FAILED=0

deploy_file() {
  local local_path="$1"
  local fname
  fname="$(basename "$local_path")"
  local remote_path="$MINIPC_BIN/pressco21-$fname"

  # install- 접두사 파일은 그대로 사용 (pressco21- 접두사 안 붙임)
  case "$fname" in
    install-*) remote_path="$MINIPC_BIN/$fname" ;;
    pressco21-*) remote_path="$MINIPC_BIN/$fname" ;;  # 이미 접두사 있으면 그대로
    *) remote_path="$MINIPC_BIN/pressco21-$fname" ;;
  esac

  log "배포: $fname → $remote_path"

  # scp로 임시 위치에 전송 후 sudo mv
  local tmp_remote="/tmp/deploy-$fname"
  scp -q "$local_path" "$MINIPC_HOST:$tmp_remote" || {
    err "$fname 전송 실패"
    ((FAILED++))
    return 1
  }

  ssh "$MINIPC_HOST" "sudo mv '$tmp_remote' '$remote_path' && sudo chmod +x '$remote_path'" || {
    err "$fname 설치 실패"
    ((FAILED++))
    return 1
  }

  ((DEPLOYED++))
  log "  ✅ $fname 배포 완료"
}

for f in "${SHELL_FILES[@]:-}"; do
  [ -n "$f" ] && deploy_file "$f"
done

for f in "${PYTHON_FILES[@]:-}"; do
  [ -n "$f" ] && deploy_file "$f"
done

# install 스크립트는 배포만 하고 자동 실행하지 않음 (수동 실행 필요)
for f in "${INSTALL_FILES[@]:-}"; do
  [ -n "$f" ] && deploy_file "$f"
done

# --- systemd 서비스 재시작 (install 스크립트 변경 시) ---
if [ ${#INSTALL_FILES[@]} -gt 0 ]; then
  log ""
  log "⚠️  install 스크립트가 변경되었습니다."
  log "타이머/서비스 재등록이 필요하면 미니PC에서 직접 실행하세요:"
  for f in "${INSTALL_FILES[@]}"; do
    echo "  sudo bash $(basename "$f")"
  done
fi

# --- 결과 요약 ---
echo ""
echo "=== 배포 완료 ==="
echo "성공: ${DEPLOYED}개 / 실패: ${FAILED}개"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
