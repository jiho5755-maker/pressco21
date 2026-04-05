# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소와 하위 폴더를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

---

## 운영 모드

### 모드 A: 메인 프로젝트 (Claude Code 주도 → Codex 관리)

| 단계 | 담당 | 커밋 prefix |
|------|------|------------|
| 기획/아키텍처/신규 개발 | **Claude Code** | — |
| 테스트/리팩토링/버그수정 | **Codex CLI** | `[codex]` |

### 모드 B: 독립 프로젝트 (Codex 단독 총괄)

가벼운 프로젝트는 Codex CLI가 기획~배포까지 독립 수행. Next Step에 `[CODEX-LEAD]` prefix.

### 태스크 위임 표시

| prefix | 의미 |
|--------|------|
| `[CODEX]` | 모드 A — Codex가 보조 작업 수행 |
| `[CODEX-LEAD]` | 모드 B — Codex가 독립 주도 |
| (prefix 없음) | Claude Code 담당 |

### 공통 금지 사항 (모드 무관)

- `.secrets.env` 수정 금지
- `git push --force`, `git reset --hard` 금지
- Claude Code가 WRITE 중인 파일 수정 금지

### 모드 A 추가 금지 (보조 모드에서만)

- `n8n-workflows/*.json` 수정 금지
- 비즈니스 로직 임계값 변경 금지
- ROADMAP.md 수정 금지

---

## Mandatory Rules

1. 작업 시작 전에 이 파일과 `git status --short`를 먼저 확인합니다.
2. `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일을 수정하지 않습니다.
3. 첫 수정 전에 아래 `Session Lock`과 `Files In Progress`를 갱신합니다.
4. 작업 종료 전 `Last Changes`, `Next Step`, `Known Risks`를 갱신합니다.
5. `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행합니다.

## Session Lock

- Current Owner: IDLE
- Mode: —
- Started At: 2026-04-05 KST
- Branch: main
- Working Scope: —
- Active Subdirectory: —

## Files In Progress
- (없음)

## Last Changes

> 전체 이력: `archive/ai-sync-history/AI_SYNC_2026-04-04_full.md`

- 2026-04-05 하네스 종합 고도화 Phase 0~2 코드 완료 (커밋 이력 참조)
  - Phase 0: CLAUDE.md 경량화, 안전망 훅 3개, AI_SYNC 다이어트
  - Phase 1: 에이전트 51→25 재구성, MakeShop 스크립트 4개
  - Phase 1.5: 업무관리 체계 (브리핑/점심 체크인/메모해줘)
  - Phase 2: 주간 전략 회의 + 이재혁 자동화 + 서버 이전 준비
- 2026-04-05 WF-CRM 감사 루프 mirror 구조 전환 (codex)
- 2026-04-05 하네스 Phase 2 마무리: 서버 점검 + 로컬 최적화 진행 중

## Next Step

### Claude Code 담당
- 하네스 Phase 2 마무리 (서버 점검 + 로컬 최적화) ← 현재 진행 중
- **블로커**: 이재혁 Chat ID 확보 → WF chatId 교체 (대표님 확인 필요)
- **별도 세션**: 서버 이전 (flora-todo, n8n-staging → 플로라 서버)

### Codex 담당 (요약)
- `[CODEX-LEAD]` Flora frontdoor: open item 캐시 재빌드, 다중 사용자 분리
- `[CODEX-LEAD]` Flora 오케스트레이션: task ledger, 텔레그램 Mini App IA 스펙
- `[CODEX-LEAD]` Flora 텔레그램 방 라우팅: 3개 방, room 매핑
- `[CODEX]` CRM 운영: WF-CRM-02/03 실건 검증 (입금/감사 루프)
- `[CODEX]` 저장소: path-scoped 커밋 정리

## Known Risks

- n8n CLI `import:workflow`는 active WF를 비활성화함. 배포 후 반드시 `publish:workflow` + restart
- 이재혁 Chat ID 미확보 → 이재혁 자동화 WF 3종 활성화 불가
- 서버 이전(flora-todo, n8n-staging → 플로라) 미실행
- WF-CRM-02/03 실건 검증 미완 (입금/감사 루프)
- Flora open item 캐시는 배포 시점 스냅샷. 실시간 재빌드 루프 미구현
