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
- Started At: 2026-04-07 11:40:53 KST
- Branch: main
- Working Scope: —
- Active Subdirectory: —

## Files In Progress
- (없음)

## Last Changes

> 전체 이력: `archive/ai-sync-history/AI_SYNC_2026-04-04_full.md`

- 2026-04-07 고객 상세 거래내역에서 명세표 수정 시 인라인 유지로 전환 (codex)
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`에서 고객 상세 내부에 `InvoiceDialog`를 직접 연결해, 거래내역 상세의 `수정 열기`가 `/invoices`로 이동하지 않고 현재 고객 상세 위에서 바로 수정 모달을 띄우도록 변경
  - `offline-crm-v2/src/components/TransactionDetailDialog.tsx`에 선택적 편집 콜백을 추가해 호출 컨텍스트별로 라우팅/인라인 편집을 분기
  - `offline-crm-v2/src/components/InvoiceDialog.tsx` 저장 후 `['customer', customerId]` 쿼리도 무효화해 고객 상세 KPI/잔액 카드가 즉시 갱신되도록 보강
  - 회귀 테스트 추가: `offline-crm-v2/tests/01-customers.spec.ts` T1-12, `tests/helpers.ts` 테스트용 명세표 생성 헬퍼
  - 검증 완료: `npm run build`, `npx playwright test tests/01-customers.spec.ts -g "T1-12"`
- 2026-04-07 HTML 메일 연락처/주소 정정 및 신청 랜딩 URL 통일 (codex)
  - 소스 파일: `FA-001_강사회원_등급_자동변경.json`, `FA-003_강사_반려_이메일_자동발송.json`, `onboard-email-sequence.json`, `partner-onboard-campaign.json`
  - HTML 메일 푸터를 회사 프로필 기준 최신 정보로 교체: `서울특별시 송파구 송이로 15길 33 가락2차쌍용상가 201호`, `02-403-4012`, `pressco21@foreverlove.co.kr`
  - `FA-003` 재신청 CTA와 `partner-onboard-campaign` 메일/SMS 신청 링크를 `https://nocodb.pressco21.com/apply`로 통일
  - 운영 워크플로우 4건 반영 완료: `jaTfiQuY35DjgrxN`, `Ks4JvBC06cEj6b8b`, `EHSTmyM5TXdcqIev`, `T2AIOstBD9JKdNOg`
- 2026-04-07 FA-003 반려 이메일 재신청 링크 수정 및 운영 반영 (codex)
  - `FA-003_강사_반려_이메일_자동발송.json` 메일 버튼 URL을 `https://www.foreverlove.co.kr/page.html?id=2609`에서 `https://www.foreverlove.co.kr/shop/page.html?id=2609`로 수정
  - 잘못된 루트 경로는 `HTTP 204`, 정상 `/shop/` 경로는 `HTTP 200` 응답 확인
  - 운영 워크플로우 `Ks4JvBC06cEj6b8b` 배포 성공 및 live 노드 `반려 이메일 발송`에 수정 URL 반영 확인
- 2026-04-07 WF-CRM-03 감사 경보를 사건별 1회 알림 구조로 전환 (codex)
  - `presscoBankReconIssueState` state map 추가: 같은 issue key는 `open` 동안 1회만 알림, 사라지면 `resolved`로 종료
  - 해결 후 동일 key 재발 시에만 재알림, 해결된 과거 건은 반복 경보 금지
  - 현재 운영 mirror 기준 local 재평가 결과 `[]`, 시뮬레이션으로 `1회 알림 -> 무음 유지 -> 해결 후 재발 시 재알림` 확인
  - 운영 워크플로우 `txw9CRdpJbxNRWuZ` 반영 완료, 백업: `output/n8n-backups/2026-04-07-01-52-13-wf-crm03-issue-state/`
- 2026-04-07 WF-CRM-03 반복 감사 경보 소거 로직 반영 (codex)
  - 현재 mirror 기준 실제 actionable issue는 0건이고, 반복 경보 원인은 `2026-04-06 parseFailure 1건`이 일일 요약에 계속 잡히는 설계였음
  - `WF-CRM-03_입금알림_정합성_감사.json`에서 일일 경보 조건을 `parseFailure 전체`가 아니라 `parseAlertStatus != sent` 또는 Telegram `failed/pending`만 대상으로 축소
  - 운영 워크플로우 `txw9CRdpJbxNRWuZ` 갱신 완료, 새 로직을 현재 staticData에 대입하면 결과 `[]`
  - 운영 백업: `output/n8n-backups/2026-04-07-01-24-06-wf-crm03-audit-logic/`
- 2026-04-07 WF-CRM-03 감사 경보 라우팅 분리 및 운영 반영 (codex)
  - `WF-CRM-03_입금알림_정합성_감사.json` Telegram 노드를 `PRESSCO_AUDIT_CHAT_ID -> TELEGRAM_CHAT_ID -> PRESSCO_BANK_CHAT_ID` 우선순위로 변경
  - 운영 워크플로우 `txw9CRdpJbxNRWuZ` 단독 PUT 배포 완료, 기존 정의는 `output/n8n-backups/2026-04-07-01-00-03-wf-crm03-audit-routing/` 백업
  - `scripts/deploy-crm-deposit-telegram.js`에 WF-CRM-03 동기화 패치 추가, `docs/crm-deposit-parser-guidelines.md`에 은행방/감사방 분리 원칙 문서화
- 2026-04-05 CRM E2E 확장 완료 (codex)
  - `offline-crm-v2` 신규 Playwright 6개 파일 추가: 거래내역, 제품, 공급처, 명세표 고도화, 고객 CRUD, 캘린더
  - `tests/helpers.ts`에 제품/공급처/고객 정리용 헬퍼 및 테스트 API 유틸 추가
  - 공급처 수정 PATCH auto field 오류 수정, 명세표 역산 후 수량 변경 계산 오류 수정
  - 전체 E2E 검증 완료: `77 passed, 2 skipped`
- 2026-04-05 하네스 종합 고도화 Phase 0~2 코드 완료 (커밋 이력 참조)
  - Phase 0: CLAUDE.md 경량화, 안전망 훅 3개, AI_SYNC 다이어트
  - Phase 1: 에이전트 51→25 재구성, MakeShop 스크립트 4개
  - Phase 1.5: 업무관리 체계 (브리핑/점심 체크인/메모해줘)
  - Phase 2: 주간 전략 회의 + 이재혁 자동화 + 서버 이전 준비
- 2026-04-05 WF-CRM 감사 루프 mirror 구조 전환 (codex)
- 2026-04-05 하네스 Phase 2 마무리: 서버 점검 + 로컬 최적화 진행 중
- 2026-04-06 WF-CRM-02 입금 메일 파서 보완 및 회귀 케이스 추가 (codex)
  - `scripts/lib/crm-deposit-parser-source.js`로 WF-CRM-02 파서/텔레그램 요약 코드를 공용 소스로 분리
  - `scripts/sync-crm-deposit-parser.js` 추가: WF-CRM-02 JSON 노드 코드 동기화 자동화
  - `scripts/test-crm-deposit-parser.js` 및 fixture 3종 추가: 입금/출금/기본 본문형 회귀 검증
  - 농협 VestMail 입출금 메일에서 `거래은행` 빈칸으로 `기록사항` 컬럼이 당겨지는 케이스 파싱 보완
  - 텔레그램 입금/은행 거래 요약에 `기록` 상세가 함께 노출되도록 보강
- 2026-04-06 WF-CRM-02 운영 반영 및 텔레그램 보정 완료 (codex)
  - `docs/crm-deposit-parser-guidelines.md` 추가: 실패 메일 fixture 수집, 회귀 테스트, 워크플로우 동기화, 텔레그램 확인 절차 문서화
  - `node scripts/deploy-crm-deposit-telegram.js` 실행으로 WF-CRM-01/02 운영 워크플로우 반영
  - 누락됐던 2026-04-06 농협 입금 메일 1건을 은행 알림 텔레그램 방에 수동 보정 발송

## Next Step

### Claude Code 담당
- 하네스 Phase 2 마무리 (서버 점검 + 로컬 최적화) ← 현재 진행 중
- **블로커**: 이재혁 Chat ID 확보 → WF chatId 교체 (대표님 확인 필요)
- **별도 세션**: 서버 이전 (flora-todo, n8n-staging → 플로라 서버)

### Codex 담당 (요약)
- `[CODEX]` 고객지원: 이미 발송된 구버전 메일은 본문이 소급 수정되지 않으므로 필요 시 최신 신청 링크 `https://nocodb.pressco21.com/apply` 별도 안내
- `[CODEX]` 고객지원: 이미 발송된 FA-003 반려 메일 수신자에게는 `/shop/page.html?id=2609` 재신청 링크 별도 안내 또는 재발송 필요 여부 점검
- `[CODEX]` CRM 운영: WF-CRM-03 첫 감사 경보 수신 방 확인 (`PRESSCO_AUDIT_CHAT_ID` 미설정 fallback은 `TELEGRAM_CHAT_ID`)
- `[CODEX]` CRM 운영: `PRESSCO_AUDIT_CHAT_ID` 서버 env 추가 시 플로라 방 고정
- `[CODEX]` CRM 운영: 다음 실제 감사 경보 발생 시 `presscoBankReconIssueState` 기준으로 동일 key 재발 여부 확인
- `[CODEX]` CRM 운영: skipped 2건 재검토 (`02-invoices` 조건부 스킵, `09-calendar` 데이터 의존 스킵)
- `[CODEX]` CRM 운영: 신규 E2E 6종 장기 플래키 여부 모니터링
- `[CODEX]` CRM 운영: 고객 상세 거래내역에서 실제 운영 명세표 수정 저장 후 동일 탭/필터 맥락 유지되는지 수동 확인
- `[CODEX-LEAD]` Flora frontdoor: open item 캐시 재빌드, 다중 사용자 분리
- `[CODEX-LEAD]` Flora 오케스트레이션: task ledger, 텔레그램 Mini App IA 스펙
- `[CODEX-LEAD]` Flora 텔레그램 방 라우팅: 3개 방, room 매핑
- `[CODEX]` CRM 운영: WF-CRM-02/03 실건 검증 (입금/감사 루프)
- `[CODEX]` CRM 운영: 파서 실패 실메일 fixture 추가 수집 및 `scripts/test-crm-deposit-parser.js` 회귀군 확대
- `[CODEX]` CRM 운영: 신규 파싱 실패 메일 발생 시 `docs/crm-deposit-parser-guidelines.md` 절차로 fixture/회귀군 즉시 확대
- `[CODEX]` 저장소: path-scoped 커밋 정리

## Known Risks

- n8n CLI `import:workflow`는 active WF를 비활성화함. 배포 후 반드시 `publish:workflow` + restart
- `PRESSCO_AUDIT_CHAT_ID`가 아직 없으면 WF-CRM-03은 `TELEGRAM_CHAT_ID` fallback 방으로 간다. Flora 전용 방 고정이 필요하면 env 추가 세팅 필요
- WF-CRM-03은 이제 `parseFailure 알림이 이미 sent인 과거 이력`만으로는 경보를 내지 않는다. 과거 parseFailure 수동 조치 추적이 필요하면 별도 ack 필드/대시보드가 추가로 필요
- 새 issue key 설계는 `messageKey/eventKey/day` 단위다. 더 세밀한 운영 ack가 필요하면 별도 issue grouping 정책을 추가해야 함
- 이재혁 Chat ID 미확보 → 이재혁 자동화 WF 3종 활성화 불가
- 서버 이전(flora-todo, n8n-staging → 플로라) 미실행
- WF-CRM-02/03 실건 검증 미완 (입금/감사 루프)
- Flora open item 캐시는 배포 시점 스냅샷. 실시간 재빌드 루프 미구현
- 파서 실패 이력의 원본 메일은 저장소에 축적되지 않으므로, 신규 실패 건 발생 시 fixture를 별도로 수집해야 회귀군을 넓힐 수 있음
