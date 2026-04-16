#!/bin/bash
# Git pre-commit scope guard for PRESSCO21.
# 브랜치 이름을 기준으로 허용된 프로젝트 경로 밖의 커밋을 차단합니다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/project-scope.sh"

REPO_ROOT="$(git rev-parse --show-toplevel)"
branch="$(git -C "$REPO_ROOT" branch --show-current)"

# main 직접 커밋 차단. merge commit은 허용합니다.
if [ "$branch" = "main" ]; then
  if [ -f "$REPO_ROOT/.git/MERGE_HEAD" ] || [ -n "${ALLOW_MAIN_COMMIT:-}" ]; then
    :
  else
    cat >&2 <<'MSG'

ERROR: main 브랜치 직접 커밋이 차단되었습니다.

새 작업은 프로젝트별 worktree/branch에서 진행하세요.
예: bash _tools/pressco21-task.sh crm invoice-fix

긴급 예외가 정말 필요하면 ALLOW_MAIN_COMMIT=1 git commit ... 을 사용하세요.
MSG
    exit 1
  fi
fi

project=""
if project="$(p21_project_from_branch "$branch" 2>/dev/null)"; then
  :
else
  # work/*인데 알 수 없는 프로젝트면 차단, 그 외 legacy branch는 경고만 합니다.
  case "$branch" in
    work/*)
      echo "ERROR: 알 수 없는 work 브랜치 패턴입니다: $branch" >&2
      echo "허용 패턴: work/offline-crm/*, work/partnerclass/*, work/n8n/*, work/mini-app/*, work/mobile-app/*, work/homepage/*, work/workspace/*" >&2
      exit 1
      ;;
    *)
      echo "WARN: scope guard가 정의되지 않은 브랜치입니다: $branch" >&2
      exit 0
      ;;
  esac
fi

bad=0
secret_bad=0
out_of_scope=()
secret_files=()

while IFS= read -r -d '' path; do
  if p21_is_secret_path "$path"; then
    secret_bad=1
    secret_files+=("$path")
    continue
  fi
  if ! p21_is_path_allowed "$project" "$path"; then
    bad=1
    out_of_scope+=("$path")
  fi
done < <(git -C "$REPO_ROOT" diff --cached --name-only -z --diff-filter=ACMRD)

if [ "$secret_bad" -ne 0 ]; then
  echo "ERROR: 인증키/환경 파일은 커밋할 수 없습니다:" >&2
  printf '  - %s\n' "${secret_files[@]}" >&2
  exit 1
fi

if [ "$bad" -ne 0 ]; then
  echo "ERROR: 현재 브랜치($branch)는 프로젝트 범위 밖 파일을 커밋할 수 없습니다." >&2
  echo "프로젝트: $project" >&2
  echo "허용 경로:" >&2
  p21_allowed_paths_print "$project" | sed 's/^/  - /' >&2
  echo "차단된 파일:" >&2
  printf '  - %s\n' "${out_of_scope[@]}" >&2
  echo "" >&2
  echo "해결: 잘못 staging된 파일을 git restore --staged <file> 로 제거하거나, 올바른 프로젝트 브랜치를 만드세요." >&2
  exit 1
fi

exit 0
