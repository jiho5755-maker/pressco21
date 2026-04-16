#!/bin/bash
# PRESSCO21 project scope helpers.
# 이 파일은 Git hook과 작업 스크립트가 공통으로 사용합니다.

p21_slugify() {
  local raw="${1:-task}"
  local slug
  slug="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  if [ -z "$slug" ]; then
    slug="task"
  fi
  printf '%s\n' "$slug"
}

p21_normalize_project() {
  case "${1:-}" in
    crm|offline-crm|offline-crm-v2) printf 'offline-crm\n' ;;
    partner|partnerclass|partner-class|파트너클래스) printf 'partnerclass\n' ;;
    n8n|automation) printf 'n8n\n' ;;
    mini|mini-app|mini-app-v2|omx) printf 'mini-app\n' ;;
    mobile|mobile-app) printf 'mobile-app\n' ;;
    homepage|makeshop|skin) printf 'homepage\n' ;;
    workspace|governance|tools|repo) printf 'workspace\n' ;;
    *) return 1 ;;
  esac
}

p21_project_from_branch() {
  local branch="${1:-}"
  case "$branch" in
    work/offline-crm/*) printf 'offline-crm\n' ;;
    work/partnerclass/*) printf 'partnerclass\n' ;;
    work/n8n/*) printf 'n8n\n' ;;
    work/mini-app/*) printf 'mini-app\n' ;;
    work/mobile-app/*) printf 'mobile-app\n' ;;
    work/homepage/*) printf 'homepage\n' ;;
    work/workspace/*) printf 'workspace\n' ;;
    *) return 1 ;;
  esac
}

p21_branch_project_name() {
  case "$1" in
    offline-crm) printf 'offline-crm\n' ;;
    partnerclass) printf 'partnerclass\n' ;;
    n8n) printf 'n8n\n' ;;
    mini-app) printf 'mini-app\n' ;;
    mobile-app) printf 'mobile-app\n' ;;
    homepage) printf 'homepage\n' ;;
    workspace) printf 'workspace\n' ;;
    *) return 1 ;;
  esac
}

p21_slot_prefix() {
  case "$1" in
    offline-crm) printf 'offline-crm\n' ;;
    partnerclass) printf 'partnerclass\n' ;;
    n8n) printf 'n8n\n' ;;
    mini-app) printf 'mini-app\n' ;;
    mobile-app) printf 'mobile-app\n' ;;
    homepage) printf 'homepage\n' ;;
    workspace) printf 'workspace\n' ;;
    *) return 1 ;;
  esac
}

p21_allowed_paths_print() {
  case "$1" in
    offline-crm)
      printf '%s\n' 'offline-crm-v2/'
      ;;
    partnerclass)
      printf '%s\n' 'makeshop-skin/' '파트너클래스/' 'docs/파트너클래스/'
      ;;
    n8n)
      printf '%s\n' 'n8n-automation/'
      ;;
    mini-app)
      printf '%s\n' 'mini-app-v2/'
      ;;
    mobile-app)
      printf '%s\n' 'mobile-app/'
      ;;
    homepage)
      printf '%s\n' 'makeshop-skin/' 'homepage-automation/' '메인페이지/' '간편 구매/' '브랜드스토리/' '파트너맵/' '레지너스 화이트페이퍼/' '1초 로그인(킵그로우)/'
      ;;
    workspace)
      printf '%s\n' 'AGENTS.md' '*/AGENTS.md' 'CLAUDE.md' 'README.md' 'OPS_STATE.md' 'HARNESS.md' 'ROADMAP.md' '.gitignore' '.codex/' '.claude/' '_tools/' 'docs/' 'archive/' 'tools/' 'AI_SYNC.md'
      ;;
    *) return 1 ;;
  esac
}

p21_sparse_paths_print() {
  # worktree 안에서 AI 도구와 hook이 동작하도록 루트 지침과 _tools는 항상 포함합니다.
  printf '%s\n' '/AGENTS.md' '/CLAUDE.md' '/.gitignore' '/_tools/'
  case "$1" in
    offline-crm)
      printf '%s\n' '/offline-crm-v2/'
      ;;
    partnerclass)
      printf '%s\n' '/makeshop-skin/' '/파트너클래스/' '/docs/파트너클래스/'
      ;;
    n8n)
      printf '%s\n' '/n8n-automation/'
      ;;
    mini-app)
      printf '%s\n' '/mini-app-v2/'
      ;;
    mobile-app)
      printf '%s\n' '/mobile-app/'
      ;;
    homepage)
      printf '%s\n' '/makeshop-skin/' '/homepage-automation/' '/메인페이지/' '/간편 구매/' '/브랜드스토리/' '/파트너맵/' '/레지너스 화이트페이퍼/' '/1초 로그인(킵그로우)/'
      ;;
    workspace)
      printf '%s\n' '/README.md' '/OPS_STATE.md' '/HARNESS.md' '/ROADMAP.md' '/.codex/' '/.claude/' '/docs/' '/archive/' '/tools/'
      ;;
    *) return 1 ;;
  esac
}

p21_is_path_allowed() {
  local project="$1"
  local path="$2"

  case "$project" in
    offline-crm)
      case "$path" in offline-crm-v2|offline-crm-v2/*) return 0 ;; esac
      ;;
    partnerclass)
      case "$path" in makeshop-skin|makeshop-skin/*|파트너클래스|파트너클래스/*|docs/파트너클래스|docs/파트너클래스/*) return 0 ;; esac
      ;;
    n8n)
      case "$path" in n8n-automation|n8n-automation/*) return 0 ;; esac
      ;;
    mini-app)
      case "$path" in mini-app-v2|mini-app-v2/*) return 0 ;; esac
      ;;
    mobile-app)
      case "$path" in mobile-app|mobile-app/*) return 0 ;; esac
      ;;
    homepage)
      case "$path" in makeshop-skin|makeshop-skin/*|homepage-automation|homepage-automation/*|메인페이지|메인페이지/*|간편\ 구매|간편\ 구매/*|브랜드스토리|브랜드스토리/*|파트너맵|파트너맵/*|레지너스\ 화이트페이퍼|레지너스\ 화이트페이퍼/*|1초\ 로그인\(킵그로우\)|1초\ 로그인\(킵그로우\)/*) return 0 ;; esac
      ;;
    workspace)
      case "$path" in AGENTS.md|*/AGENTS.md|CLAUDE.md|README.md|OPS_STATE.md|HARNESS.md|ROADMAP.md|.gitignore|AI_SYNC.md|.codex|.codex/*|.claude|.claude/*|_tools|_tools/*|docs|docs/*|archive|archive/*|tools|tools/*) return 0 ;; esac
      ;;
  esac

  return 1
}

p21_is_secret_path() {
  case "$1" in
    .secrets|.secrets.env|.env.local|*/.secrets|*/.secrets.env|*/.env.local|n8n-automation/.secrets)
      return 0
      ;;
  esac
  return 1
}
