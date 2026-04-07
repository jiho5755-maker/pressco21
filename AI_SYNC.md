# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

---

## 운영 모드

- **모드 A (보조)**: Claude Code 주도 → Codex 테스트/리팩토링 (`[CODEX]` prefix)
- **모드 B (독립)**: Codex가 기획~배포 총괄 (`[CODEX-LEAD]` prefix)
- 서브디렉토리 격리: 서로 다른 서브디렉토리면 동시 WRITE 가능

### 공통 금지사항

- `.secrets.env` 수정 금지
- `git push --force`, `git reset --hard` 금지
- 다른 에이전트 WRITE 중인 파일 수정 금지

---

## Session Lock

- Current Owner: IDLE
- Mode: —
- Started At: —
- Branch: main
- Active Subdirectory: —

## Files In Progress
- —

## Last Changes

> 전체 이력: `archive/ai-sync-history/`

- 2026-04-07 하네스 v4.0 경량화 — CLAUDE.md/MEMORY/AI_SYNC/settings 축소 (Claude Code)
- 2026-04-07 WF-CRM-02 오배선 수정 + 텔레그램 포맷 정리 + 톤 다운 (codex)
- 2026-04-07 고객 상세 거래내역 인라인 편집 전환 (codex)

## Next Step

### Claude Code 담당
- Phase 3b 기획안 파이프라인 구현 (PRD 템플릿 + n8n WF + 디자인팀 핸드오프)
- Phase 3c OpenClaw + 텔레그램 고도화 (3방 라우팅, Codex 원격 실행, task ledger)
- **블로커**: 이재혁 Chat ID 확보 (대표님 확인 필요)
- **별도 세션**: 서버 이전 (flora-todo, n8n-staging → 플로라)

### Codex 담당
- `[CODEX]` WF-CRM-02/03 실건 검증 (입금/감사 루프)
- `[CODEX]` CRM E2E skipped 2건 재검토 + 플래키 모니터링
- `[CODEX]` 파서 실패 fixture 수집 확대
- `[CODEX-LEAD]` Flora frontdoor: open item 캐시 재빌드
- `[CODEX-LEAD]` Flora 텔레그램 방 라우팅 + task ledger

## Known Risks

- 이재혁 Chat ID 미확보 → 자동화 WF 3종 + 텔레그램 3방 활성화 불가
- 서버 이전 미실행 (flora-todo, n8n-staging → 플로라)
- ONBOARD-SEQ/PARTNER-ONBOARD WF 의도적 비활성 — 파트너클래스 런칭 전 재활성 금지
- WF-CRM-02/03 실건 검증 미완 (파서 정확도 지속 모니터링 필요)
- 2026-04-07 누락 입금 3건 수동 재처리 또는 CRM 반영 확인 필요
