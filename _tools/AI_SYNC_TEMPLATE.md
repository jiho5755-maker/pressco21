# AI Sync Board

> Claude Code + Codex CLI 공용 인수인계 대시보드.
> **50줄 이하 유지.** 상세 기록은 git log + `_tools/ai-sync-archive/` 참조.

---

## Session Lock

- Owner: IDLE
- Scope: -
- Subdirectory: -
- Since: -

## Active Work

| 영역 | 담당 | 상태 | 마지막 작업 |
|------|------|------|-----------|
| offline-crm-v2 | CODEX | 운영 중 | 가이드 UX, 입금 수집 |
| 파트너클래스 | CODEX | E2 완료 | Phase 3 S2-11 통합테스트 |
| 하네스 | CLAUDE | 고도화 중 | 체크포인트 워크플로우 |

## Next Steps (우선순위순)

1. [CODEX] CRM 명세표 모바일 밀도 정리
2. [CLAUDE] 파트너클래스 E2 메이크샵 배포 10개 페이지
3. [CLAUDE] 플로라 원장님 실사용 테스트
4. [CODEX] CRM Safari 견적서 인쇄 1페이지 확인

## Risks

- CRM 구분값 레거시(`영수/청구`) + 신규(`거래명세표/견적서`) 혼재
- 파트너클래스 E2 메이크샵 저장 대기 (로컬 완료, 운영 미반영)
- AI_SYNC.md 아카이빙 필요 (720줄 → 50줄 전환 시점)

## Last Handoff

| 시각 | 에이전트 | 요약 |
|------|---------|------|
| 03-30 01:05 | CODEX | CRM 가이드/명세표/입금수집 UX 정리 중 |
| 03-30 00:50 | CLAUDE | 하네스 고도화: 체크포인트 워크플로우, MEMORY 정리, stop hook 수정 |

---

## Rules (접어둠 — 양쪽 CLAUDE.md/AGENTS.md에 상세)

- Owner가 WRITE 중이면 해당 Subdirectory 파일 수정 금지
- 체크포인트 시: Lock→IDLE + Last Handoff 1줄 추가 + git commit & push
- 다른 Subdirectory면 동시 WRITE 가능
- `.secrets.env` 수정 금지, `git push --force` 금지
