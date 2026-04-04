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
- Started At: 2026-04-05 01:20:00 KST
- Branch: main
- Working Scope: WF-CRM-03 self-call 인증 실패 보완 및 mirror 감사 루프 전환
- Active Subdirectory: n8n-automation/workflows/accounting

## Files In Progress
- AI_SYNC.md
- n8n-automation/workflows/accounting/WF-CRM-03_입금알림_정합성_감사.json
- n8n-automation/workflows/accounting/WF-CRM-02_Gmail_입금알림_수집.json

## Last Changes

> 전체 이력: `archive/ai-sync-history/AI_SYNC_2026-04-04_full.md`

- 2026-04-04 하네스 종합 고도화 Phase 0 착수: CLAUDE.md 194→80줄 경량화, orchestration 스킬 생성, AI_SYNC 2307→200줄 다이어트
- 2026-04-05 WF-CRM 입금 정합성 보강: WF-CRM-02에 mail/transaction ledger 추가, Telegram 성공 후 sent-map 기록으로 수정, Telegram 실패 failure log 보강, 신규 WF-CRM-03 정합성 감사 루프 생성 및 live 활성화
- 2026-04-05 WF-CRM 감사 루프 self-call 제거: WF-CRM-03를 webhook mirror + schedule 감사 구조로 전환, WF-CRM-02에 mirror sync 추가, 실입금 `장지호 / 1,245원` 건으로 Gmail 파싱 → CRM review → Telegram sent → WF-CRM-03 mirror 적재 → scheduled success 실행까지 확인
- 2026-04-04 WF-CRM-02 live 패치: NH 메일 파싱 실패 경보, intake 실패 경보, failure log(static data), 동일 externalId 재실행 중복 알림 억제키 보강. 운영 WF `7ql6pPWlBoJhoZqH` 갱신 완료
- 2026-04-03 flora-frontdoor 회상 기능을 최근 메모+미완료 open item 기준으로 확장
- 2026-04-03 CRM 입금 알림에 입금별칭추천 줄 추가, 메시지 1건당 1개로 단일화하고 live 재배포
- 2026-04-03 flora-frontdoor 메모 기입 모드 추가, 응답 톤 비서형으로 조정
- 2026-04-03 flora-frontdoor Telegram 메타데이터 경로 보강, 자동 capture 경로 연결

## Next Step

### Claude Code 담당
- 하네스 종합 고도화 Phase 0 진행 중 (PRD: `docs/PRD-하네스-종합고도화-v2.md`)
  - 안전망 훅 3개 생성 (Bash 가드, MakeShop 가드, 에이전트 로깅)
  - 텔레그램 로그 로테이션, settings.json 수정
- Phase 1 대기: 에이전트 49→28 재구성, MakeShop 스크립트 추가

### Codex 담당 (요약)
- `[CODEX-LEAD]` Flora frontdoor: open item 캐시 주기적 재빌드, 메타 task 필터 강화, 다중 사용자 캐시 분리
- `[CODEX-LEAD]` Flora 오케스트레이션: task ledger 구현, 텔레그램 Mini App IA 스펙
- `[CODEX-LEAD]` Flora 텔레그램 방 라우팅: 3개 방 초대, room 매핑, harness 인벤토리 확장
- `[CODEX]` CRM 운영: 입금 자동반영 실건 검증, 견적서/납품서/청구서 인쇄 확인
- `[CODEX]` CRM 운영: WF-CRM-03 첫 scheduled execution 결과 확인, 신규 NH 메일 1건으로 ledger/감사 루프 실건 검증
- `[CODEX]` CRM 운영: WF-CRM-02 신규 NH 메일 1건 실건 검증 필요 (parse failure / intake failure / 정상 반영 각각 확인)
- `[CODEX]` CRM 운영: WF-CRM-03 mirror ledger 백필 범위를 최근 72시간 전체로 확장할지 검토
- `[CODEX]` CRM 운영: parse failure / intake failure / Telegram failure 실건이 발생했을 때 WF-CRM-03 mirror 경보까지 도달하는지 후속 검증
- `[CODEX]` 저장소: path-scoped 커밋 정리, 배포 후 workflow export 재동기화 루틴 고정
- `[CODEX]` FA-001/003 메일 가드 실건 운영 확인

## Known Risks

- 저장소 dirty 상태 지속 (`modified 12 / untracked 162`). path-scoped 커밋으로 분리 정리 필요
- Flora open item 캐시는 배포 시점 스냅샷. 실시간 재빌드 루프 미구현
- n8n CLI `import:workflow`는 active WF를 비활성화함. 배포 후 반드시 `publish:workflow` + restart
- `memory-watchdog.sh`의 swap 단독 CRITICAL 기준이 과민. 재부팅 후 재발 시 조합 기준으로 재설계
- 입금 알림 포맷 live 배포 완료했으나 실제 NH 신규 입금 메일 1건 운영 검증 미완
- WF-CRM-03는 mirror 구조로 정상화됐지만, 현재 mirror 백필은 실검증한 최신 입금 1건만 적재됨. 기존 72시간 전체 이력은 필요 시 추가 백필 가능
- `server-monitor.sh` hotfix가 운영서버에만 반영. canonical source 역반영 경로 미확정
