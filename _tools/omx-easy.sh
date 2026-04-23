#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

find_repo_root() {
  local git_root=""

  if git_root="$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null)" && [ -f "$git_root/_tools/omx-run.sh" ]; then
    printf '%s\n' "$git_root"
    return 0
  fi

  printf '%s\n' "$SCRIPT_REPO_ROOT"
}

REPO_ROOT="$(find_repo_root)"
OMX_RUN_SCRIPT="$REPO_ROOT/_tools/omx-run.sh"
OMX_BOOTSTRAP_SCRIPT="$REPO_ROOT/_tools/omx-bootstrap.sh"
SCOPE_CHECK_SCRIPT="$REPO_ROOT/_tools/pressco21-check.sh"

say() {
  printf '[p21-omx] %s\n' "$*"
}

usage() {
  cat <<'EOF'
PRESSCO21 OMX 쉬운 실행기

추천 명령:
  p21-omx                 안정 실행 (xhigh)
  p21-omx turbo           강한 실행 (xhigh + madmax)
  p21-omx doctor          상태 점검
  p21-omx repair          프로필/프롬프트 복구
  p21-omx team "작업"     팀 실행 (기본 3:executor)

세부 명령:
  start | run | 시작
      기본 안정 실행. 내부적으로:
      bash _tools/omx-run.sh --refresh-profile --xhigh

  turbo | madmax | 강하게
      승인 우회 포함 강한 실행. 내부적으로:
      bash _tools/omx-run.sh --refresh-profile --xhigh --madmax

  doctor | 점검
      worktree 범위 체크 + omx doctor

  repair | 복구
      OMX overlay/profile 재설치 후 doctor 수행

  team | 팀 [lanes] "작업 내용"
      예시:
      p21-omx team "offline-crm-v2 회귀 테스트"
      p21-omx team 4:executor "파트너클래스 QA"

  status | 상태
      현재 OMX 상태 보기

  resume <session-id>
      이전 Codex 세션 이어서 열기

  raw <omx args...>
      고급 사용자용 원본 omx 인자 전달

  help | --help | -h
      도움말 표시

권장 루틴:
  1) 처음/문제 발생 시: p21-omx repair
  2) 평소 실행:       p21-omx
  3) 승인 없이 강행:   p21-omx turbo
  4) 막히면 점검:      p21-omx doctor
EOF
}

ensure_scripts() {
  if [ ! -f "$OMX_RUN_SCRIPT" ]; then
    echo "OMX 실행 스크립트를 찾을 수 없습니다: $OMX_RUN_SCRIPT" >&2
    exit 1
  fi

  if [ ! -f "$OMX_BOOTSTRAP_SCRIPT" ]; then
    echo "OMX bootstrap 스크립트를 찾을 수 없습니다: $OMX_BOOTSTRAP_SCRIPT" >&2
    exit 1
  fi

  if [ ! -f "$SCOPE_CHECK_SCRIPT" ]; then
    echo "PRESSCO21 scope check 스크립트를 찾을 수 없습니다: $SCOPE_CHECK_SCRIPT" >&2
    exit 1
  fi
}

run_omx_exec() {
  cd "$REPO_ROOT"
  exec bash "$OMX_RUN_SCRIPT" "$@"
}

run_omx() {
  cd "$REPO_ROOT"
  bash "$OMX_RUN_SCRIPT" "$@"
}

run_scope_check() {
  cd "$REPO_ROOT"
  bash "$SCOPE_CHECK_SCRIPT"
}

run_repair() {
  cd "$REPO_ROOT"
  bash "$OMX_BOOTSTRAP_SCRIPT"
  printf '\n'
  run_scope_check
  printf '\n'
  run_omx doctor
}

ensure_scripts

command_name="${1:-start}"
if [ $# -gt 0 ]; then
  shift
fi

case "$command_name" in
  start|run|chat|시작|"")
    say "안정 모드로 OMX를 시작합니다. (xhigh + refresh-profile)"
    run_omx_exec --refresh-profile --xhigh
    ;;
  turbo|madmax|강하게)
    say "강한 모드로 OMX를 시작합니다. (xhigh + madmax + refresh-profile)"
    run_omx_exec --refresh-profile --xhigh --madmax
    ;;
  doctor|점검)
    say "PRESSCO21 범위와 OMX 상태를 점검합니다."
    run_scope_check
    printf '\n'
    run_omx doctor
    ;;
  repair|복구)
    say "OMX overlay/profile을 복구합니다."
    run_repair
    ;;
  status|상태)
    run_omx status
    ;;
  team|팀)
    lanes="3:executor"
    if [ $# -gt 0 ] && [[ "${1:-}" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
      lanes="$1"
      shift
    fi

    task_text="$*"
    if [ -z "$task_text" ]; then
      echo "team 명령에는 작업 설명이 필요합니다. 예: p21-omx team \"offline-crm-v2 회귀 테스트\"" >&2
      exit 1
    fi

    say "팀 모드로 OMX를 시작합니다. (lanes=$lanes)"
    run_omx_exec --refresh-profile team "$lanes" "$task_text"
    ;;
  resume)
    if [ $# -lt 1 ]; then
      echo "resume 명령에는 session id가 필요합니다. 예: p21-omx resume 019db29d-c7bc-72c2-ab96-a36bdc317b4b" >&2
      exit 1
    fi
    run_omx_exec resume "$@"
    ;;
  raw|직접)
    if [ $# -lt 1 ]; then
      echo "raw 명령에는 omx 인자가 필요합니다. 예: p21-omx raw --help" >&2
      exit 1
    fi
    run_omx_exec "$@"
    ;;
  help|-h|--help|도움말)
    usage
    ;;
  -*)
    set -- "$command_name" "$@"
    say "원본 OMX 인자를 그대로 전달합니다."
    run_omx_exec --refresh-profile "$@"
    ;;
  *)
    echo "알 수 없는 명령: $command_name" >&2
    printf '\n'
    usage
    exit 1
    ;;
esac
