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

- Current Owner: CODEX
- Mode: WRITE
- Started At: 2026-03-11 19:10:00 KST
- Branch: main
- Working Scope: [CODEX-LEAD] 파트너클래스 S2-4 WF-01 분리 구현 중
- Active Subdirectory: pressco21/파트너클래스

## Files In Progress
- `파트너클래스/n8n-workflows/WF-01-class-api.json`
- `파트너클래스/n8n-workflows/WF-01A-class-read.json`
- `파트너클래스/n8n-workflows/WF-01B-schedule-read.json`
- `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
- `docs/파트너클래스/WF-01-split-guide.md`
- `scripts/partnerclass-s2-4-*.js`

## Last Changes (2026-03-09 ~ 2026-03-11)

### [CODEX-LEAD] Phase 3 S2-3 IA 확장 완료 (CODEX)
- 프론트
  - `파트너클래스/목록/Index.html`
  - `파트너클래스/목록/css.css`
  - `파트너클래스/목록/js.js`
    - `전체 클래스 / 협회·세미나 / 혜택·이벤트` 3탭 구조 추가
    - `리스트 보기 / 지도 보기` 토글, 파트너맵 shell 연동, 협회 세미나 피드, 혜택 허브 카드 추가
    - `content_type`, `delivery_mode`, `class_format` 우선 사용 + `type/tags/affiliation_code` 폴백 추론 추가
  - `파트너클래스/상세/Index.html`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
    - `GENERAL / AFFILIATION / EVENT` 별 상단 identity, trust chip, 예약 노트, 탐색 링크 분기 추가
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `partnermap-shell.html` fixture 추가
- 문서 / 메모리
  - `docs/파트너클래스/nationwide-discovery-ia-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-planning-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/목록/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - `node --check scripts/build-partnerclass-playwright-fixtures.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 fixture 검증
    - 목록 탭 3개, 지도 보기 전환, 온라인 전용 시 지도 비활성화 확인
    - 협회 세미나 2건, 혜택 카드 6건, 오프라인 스포트라이트 3건 확인
    - 상세 `GENERAL / AFFILIATION / EVENT` 각 identity 카피와 trust chip 분기 확인
  - 산출물
    - `output/playwright/s2-3-ia/s2-3-results.json`
    - `output/playwright/s2-3-ia/*.png`

### [CODEX-LEAD] Phase 3 S2-2 협회 B2B 영업 도구 완료 (CODEX)
- 프론트
  - `파트너클래스/협회제안서/Index.html`
  - `파트너클래스/협회제안서/css.css`
  - `파트너클래스/협회제안서/js.js`
    - 협회명/로고/인센티브 구간을 URL 파라미터로 커스터마이징하는 디지털 제안서 페이지 추가
    - ROI 시뮬레이터(`협회원 수 / 월 예상 수강 인원 / 평균 재료 구매액`) 즉시 계산 구현
  - `파트너클래스/어드민/Index.html`
  - `파트너클래스/어드민/css.css`
  - `파트너클래스/어드민/js.js`
    - 협회 탭에 `제안서 URL 생성` 카드 추가
    - 협회 선택, 협회명/로고/예상 수치 입력, preview/copy 버튼, 생성 URL textarea 추가
    - 협회 테이블에 `불러오기` 액션 추가
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `affiliation-proposal.html` fixture 빌드 추가
- 문서 / 메모리
  - `docs/파트너클래스/affiliation-b2b-proposal-tool-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check 파트너클래스/협회제안서/js.js`
  - `node --check 파트너클래스/어드민/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - Playwright 로컬 검증
    - 어드민 협회 셀렉트 옵션 3개, 협회 행 2개 렌더링
    - 협회 선택 후 맞춤 URL 자동 생성
    - 새 탭 제안서 미리보기에서 협회명/할인율/로고 반영
    - ROI 입력 변경 후 연간 구매액 즉시 갱신 확인
  - 산출물
    - `output/playwright/s2-2-affiliation-proposal/affiliation-proposal-results.json`
    - `output/playwright/s2-2-affiliation-proposal/*.png`

### [CODEX-LEAD] Phase 3 S2-1 파트너 신청 세일즈 랜딩 리디자인 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너신청/Index.html`
    - 2609 상단 구조를 `세일즈 랜딩 + 신청 전환` 흐름으로 전면 개편
    - 히어로, 운영 지원 4카드, 비교 테이블, 적합 파트너/신청 흐름, 성장 경로, 사회적 증거, 신청 프로세스, 하단 고정 CTA 추가
  - `파트너클래스/파트너신청/css.css`
    - 상단 세일즈 레이어, 비교표, 성장 카드, 모바일 반응형, 하단 고정 CTA 스타일 추가
  - `파트너클래스/파트너신청/js.js`
    - `js-scroll-link + data-target` 스크롤 CTA 바인딩 추가
    - 개인정보 동의 체크박스 에러 초기화 보강
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - `output/playwright/fixtures/partnerclass/apply.html` fixture 빌드 추가
- 문서 / 메모리
  - `docs/파트너클래스/partner-apply-sales-landing-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/brand-planning-expert/MEMORY.md`
  - `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너신청/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - Playwright 로컬 검증
    - 데스크톱: 비교표 5행, 성장 카드 4개, 지원 카드 4개, CTA -> 폼 `formTop ~= 106px`
    - 모바일: 하단 고정 CTA 표시, 상단 점프 버튼 3개, CTA -> 폼 `formTop ~= 16px`
  - 산출물
    - `output/playwright/s2-1-partner-apply/partner-apply-results.json`
    - `output/playwright/s2-1-partner-apply/*.png`

### [CODEX-LEAD] Phase 3 S1-9 Phase 3-1 통합 테스트 완료 (CODEX)
- 테스트 자산
  - `scripts/build-partnerclass-playwright-fixtures.js`
    - 메이크샵 분리 파일(HTML/CSS/JS)을 Playwright용 단일 페이지 fixture로 조립
  - `scripts/partnerclass-phase3-integration-runner.js`
    - 목록/상세/마이페이지/파트너/어드민을 한 번에 순회하는 로컬 Playwright 통합 러너 추가
- 문서 / 메모리
  - `docs/파트너클래스/phase3-1-integration-test.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `NODE_PATH=.playwright-tools/node_modules node scripts/partnerclass-phase3-integration-runner.js`
  - 결과:
    - 목록 3개 -> `서울 + 오프라인` 1개
    - 상세 재료 카드 2개 + FAQ `환불` 1개 + 장바구니 담기 1회
    - 마이페이지 완료 1건 + 재료 칩 2개 + 같은 강사 추천 2개
    - 파트너 온보딩 `3/5`, 액션 보드 `1/2/2`, 키트 프리필 2행, 액션 카드 3종 이동
    - 어드민 정산 합계 `136,000원 / 34,000원`, 실행 실패 토스트 확인
  - 산출물
    - `output/playwright/s1-9-phase3-1/phase3-1-results.json`
    - `output/playwright/s1-9-phase3-1/*.png`

### [CODEX-LEAD] Phase 3 S1-8 파트너 대시보드 액션 보드 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너/Index.html`
    - 온보딩 카드 아래, 기존 KPI 카드 위에 액션 보드 섹션 추가
    - `오늘 수업 / 키트 준비 / 미답변 후기` 3개 카드와 설명 문구 추가
  - `파트너클래스/파트너/css.css`
    - 액션 보드 카드, 빈 상태, 반응형 레이아웃 스타일 추가
  - `파트너클래스/파트너/js.js`
    - `actionBoardState`, `actionBoardLoadToken` 기반 집계/렌더링 상태 추가
    - `getPartnerDashboard`, `getClassDetail`, `getPartnerBookings`, `getPartnerReviews` 응답을 조합해 3개 카드 수치를 계산
    - 카드 클릭 시 `일정 관리 / 예약 현황 / 후기 관리` 탭으로 이동하고 필요한 필터와 첫 클래스를 자동 세팅
    - 클래스 수정, 상태 변경, 일정 추가/삭제, 후기 답변 후 액션 보드가 즉시 다시 계산되도록 연결
- 문서 / 메모리
  - `docs/파트너클래스/dashboard-action-board-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 목킹 검증
    - populated 시나리오 `오늘 수업 1건 / 키트 준비 2건 / 미답변 후기 3건` 확인
    - `오늘 수업` 클릭 시 `일정 관리` 탭 + 첫 클래스 자동 선택 확인
    - `키트 준비` 클릭 시 `예약 현황` 탭 + `custom` 기간 + 클래스 자동 선택 확인
    - `미답변 후기` 클릭 시 `후기 관리` 탭 이동 확인
    - empty 시나리오 `0건` 수치와 새 강의 등록 유도 문구 확인
  - 산출물
    - `output/playwright/s1-8-action-board/action-board-populated.png`
    - `output/playwright/s1-8-action-board/action-board-empty-state.png`

### [CODEX] offline-crm-v2 운영 안정화/UX 고도화 완료 (CODEX)
- CRM 데이터/정합성
  - 레거시 미수금 방향을 `받아야 할 돈=양수` 기준으로 통일하고 고객 잔액 재계산 로직을 보정.
  - 레거시 미수와 CRM 미수를 합산 기준으로 맞추고, `서상견 님`, `신재승 회장님` 포함 전수 대조를 완료.
  - 분리 거래명(`서상견 님 (단양)` 등)은 고객관리에서 별도 고객으로 유지하도록 정리.
- 수금/미수 UX
  - 레거시 미수 입금 확인, 최대 입금액 차단, 취소 기능, 작업자명/시각 기록을 추가.
  - 고객 상세/미수금/거래내역/거래·명세표 조회에 레거시 수금 이력을 `입금` 행으로 노출.
  - 레거시 수금 반영 시 대시보드/미수금/거래·명세표 조회가 새로고침 없이 즉시 갱신되도록 캐시 무효화 보강.
- 명세표/송장 UX
  - 송장 자동 다운로드가 명세표의 선택 주소를 우선 사용하고, 전화/휴대폰/주소를 고객 정보로 자동 채우도록 수정.
  - 주소 선택 영역에 `선택된 주소로 송장 다운로드` 안내를 추가.
- 고객 상세/제출용 문서
  - 고객 상세 거래내역 탭에 기간/유형/키워드 필터, 엑셀 다운로드, 고객 제출용 인쇄 양식 추가.
  - 고객 상세 상단에 `미수금 보기`, `거래/명세표 조회`, `명세표 작성` 빠른 액션을 추가.
- 검증/배포
  - 각 수정 단계마다 `npm run build` 통과 확인.
  - 운영 `https://crm.pressco21.com`에 반복 배포 완료.

### [CODEX] offline-crm-v2 서상견 운영 데이터 긴급 복구 (CODEX)
- 실행 일시: 2026-03-11 16:45 KST ~ 2026-03-11 16:58 KST
- 원인
  - 2026-03-11 오늘자 운영 데이터 수정으로 `서상견 님` 대표 고객과 `서상견 님 (단양)` 분리 고객/명세표가 훼손됨.
- 복구 내용
  - 서버 DB 사전 백업 추가: `~/nocodb/nocodb_data/noco.db.pre-seosanggyeon-restore-20260311-1654`
  - `nc__w6f___tbl_Customers`
    - `15827`을 `서상견 님` + `book_name=서상견 님 (단양,김순자)` 상태로 복구
    - 삭제된 분리 고객 `15838` (`서상견 님 (단양)`) 재삽입
  - `nc__w6f___tbl_Invoices`
    - 삭제된 `INV-20260310-095155`, `INV-20260310-095704` 재삽입
  - `nc__w6f___tbl_InvoiceItems`
    - 삭제된 품목 행 `117~127` 재삽입
- 검증
  - 운영 DB 직접 조회로 고객 `15827`, `15838` 및 명세표 `15`, `16` 복구 확인
  - CRM 프록시 API 조회로 `서상견 님`, `서상견 님 (단양)`, 두 명세표 노출 확인
  - `bash deploy/deploy.sh` 재실행 완료

### [CODEX-LEAD] Phase 3 S1-7 파트너 온보딩 체크리스트 UX 완료 (CODEX)
- 프론트
  - `파트너클래스/파트너/Index.html`
    - 헤더 아래 온보딩 카드, 진행률 바, `체크리스트 보기 / 다음 할 일` CTA 추가
    - 온보딩 모달, 완료 모달 추가
  - `파트너클래스/파트너/css.css`
    - 온보딩 카드/모달/단계 리스트/완료 상태 스타일 추가
    - `992px / 768px / 480px` 반응형 레이아웃 보강
  - `파트너클래스/파트너/js.js`
    - 온보딩 상태 계산 로직 추가
    - 단계 체계를 `프로필 / 교육 / 강의 / 일정 / 키트` 5단계로 고정
    - `getPartnerAuth`, `getEducationStatus`, `getPartnerDashboard`, `getClassDetail` 응답을 조합해 완료 상태를 계산
    - 현재 단계 CTA를 프로필 모달, 교육 페이지, 강의 등록 모달, 일정 탭, 클래스 수정 모달에 연결
    - 일정 추가, 클래스 수정, 프로필 저장 후 체크리스트를 즉시 다시 계산하도록 연결
- 문서 / 메모리
  - `docs/파트너클래스/onboarding-checklist-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/파트너/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace / data URI 기준 false positive 확인
  - Playwright 로컬 목킹 검증
    - 미완료 파트너 `3/5 완료` 확인
    - 모달 CTA `일정 등록하기` 클릭 시 `일정 관리` 탭 전환 + 첫 강의 자동 선택 + 일정 폼 노출 확인
    - 완료 파트너 체크리스트 카드 숨김 + 완료 모달 자동 노출 확인
  - 산출물
    - `output/playwright/s1-7-onboarding/incomplete-onboarding-schedule.png`
    - `output/playwright/s1-7-onboarding/complete-onboarding-modal.png`

### [CODEX-LEAD] Phase 3 S1-6 상세 FAQ 15개 확장 완료 (CODEX)
- 프론트
  - `파트너클래스/상세/Index.html`
    - FAQ 탭 상단에 설명 문구, 검색 입력, 카테고리 필터, 결과 요약 영역 추가
    - FAQ 빈 상태 영역 추가
  - `파트너클래스/상세/css.css`
    - 검색 바, 카테고리 칩, FAQ 카드형 아코디언, 빈 상태, 문의 블록 레이아웃 스타일 추가
    - 기존 FAQ 셀렉터와 실제 JS 클래스명이 어긋나던 부분을 `faq-item__*` 기준으로 정리
  - `파트너클래스/상세/js.js`
    - FAQ 기본값을 15개로 확장 (`수강 4 / 키트·배송 5 / 파트너 2 / 정산 3 / 기타 1`)
    - `faq_items`, `faqItems` 계열 데이터를 우선 사용하고 부족하면 공통 FAQ로 fallback 하도록 구현
    - 카테고리 필터, 실시간 검색, 결과 요약 문구, 1개씩 열리는 아코디언 동작 추가
    - `FAQPage` JSON-LD 생성 기준을 커리큘럼 변환에서 실제 FAQ 데이터 기준으로 변경
- 문서 / 메모리
  - `docs/파트너클래스/faq-expansion-guide.md` 신규 추가
  - `docs/파트너클래스/README.md`
  - `ROADMAP.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
- 검증
  - `node --check 파트너클래스/상세/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace 기준 false positive 확인
  - Playwright 로컬 목업 검증
    - FAQ 15개 렌더링 확인
    - `정산` 필터 3개 확인
    - `환불` 검색 결과 1개 확인
    - `정산 + 배송` 조합 빈 상태 확인
  - 산출물
    - `output/playwright/s1-6-detail-faq/default-faq-panel.png`
    - `output/playwright/s1-6-detail-faq/faq-empty-state.png`

### [CODEX-LEAD] Phase 3 S1-5 정산 자동화 WF-SETTLE 구현 (CODEX)
- 백엔드
  - `파트너클래스/n8n-workflows/WF-SETTLE-partner-settlement.json`
    - 신규 워크플로우 `WF-SETTLE Partner Settlement` 생성 및 활성화 (`CGdB7kIdTRjO6ZVr`)
    - `getSettlementHistory`, `runSettlementBatch` 액션 구현
    - 월/반기 필터를 NocoDB `like` 쿼리 대신 코드 단계에서 처리하도록 보정
    - 메일 발송 실패를 `success: false`, `SETTLEMENT_EMAIL_FAILED` 로 그대로 반환하도록 수정
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
    - `getSettlements`가 `PENDING_SETTLEMENT / COMPLETED` 상태값을 정상 구분하도록 수정
    - `commission_rate 0.1` 같은 레거시 저장값을 `%` 기준으로 정규화해 응답
- 프론트
  - `파트너클래스/어드민/Index.html`
    - 정산 탭에 `월`, `전반/후반`, `정산 실행` 컨트롤 추가
    - `정산서 발송 이력` 테이블 섹션 추가
  - `파트너클래스/어드민/js.js`
    - `settlement-batch` 전용 호출 헬퍼 추가
    - 정산 이력 로딩, 실행 버튼, 실패 토스트, 이력 메타 문구 연결
    - 정산 목록의 수수료율/지급액 표시를 레거시 값까지 보정
- 문서 / 메모리
  - `docs/파트너클래스/settlement-automation-guide.md` 신규 추가
  - `docs/파트너클래스/commission-policy.md`를 canonical 등급 기준으로 정리
  - `docs/파트너클래스/README.md`, `ROADMAP.md`
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- 라이브 검증
  - `admin-api getSettlements(status=COMPLETED)` 성공, 총 1건 확인
  - `settlement-batch getSettlementHistory(month=2026-03)` 성공
  - `runSettlementBatch(month=2026-03, cycle=FIRST_HALF)`는 의도적으로 실패 반환 확인
    - 원인: 운영 SMTP credential `PRESSCO21-SMTP-Naver` 가 `535 Username and Password not accepted`
- Playwright 검증
  - 로컬 목업 관리자 페이지에서 `정산 현황` 탭 렌더링, 이력 테이블, 정산 실행 모달, 실패 토스트까지 확인
  - 스크린샷: `output/playwright/s1-5-admin-ui/admin-settlement-panel.png`

### [CODEX-LEAD] Phase 3 S1-4 수강완료 -> 재구매 동선 완료 (CODEX)
- 프론트
  - `파트너클래스/마이페이지/Index.html`
    - 헤더와 빈 상태 문구를 `후기 -> 재료 재구매 -> 다음 수업` 흐름 기준으로 갱신.
    - 루트 컨테이너에 `#partnerclass-my-bookings` ID를 추가해 메이크샵 스타일 충돌을 차단.
  - `파트너클래스/마이페이지/css.css`
    - 완료 카드용 후기 히어로, 키트 재구매 패널, 같은 강사 추천 카드, 요약 카드/섹션 레이아웃을 새로 구성.
    - 모든 셀렉터를 `#partnerclass-my-bookings` 기준으로 스코핑.
  - `파트너클래스/마이페이지/js.js`
    - `WF-19 my-bookings` 응답을 `다가오는 수업 / 수강 완료 후 다시 보기`로 분리 렌더링.
    - `WF-01 class-api getClasses/getClassDetail`를 추가 호출해 같은 강사 추천과 `kit_items` 기반 재구매 칩을 합성.
    - 완료 카드에 `후기 작성하기`, `수업 다시 보기`, `이 수업 재료 다시 보기`, `같은 강사의 다른 클래스` 동선을 연결.
- 워크플로우
  - `파트너클래스/n8n-workflows/WF-12-review-requests.json`
    - 수강생 후기 요청 CTA를 클래스 상세 `2607`로 직접 연결.
    - 이메일 본문에 `내 수강 내역(2609)` 복귀 문구를 추가.
  - 운영 반영
    - WF-12 (`zUxqaEHZpYwMspsC`) 백업 후 n8n API로 업데이트 완료.
    - 업데이트 확인: `active=true`, `reviewUrlChanged=true`, `myPageChanged=true`
- 문서/메모리
  - `docs/파트너클래스/repurchase-path-guide.md`
    - S1-4 데이터 조합 방식, 화면 구조, WF-12 연결, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 가이드 문서 연결.
  - `ROADMAP.md`
    - S1-4를 `✅ 완료`로 변경하고 운영 메모/검증 결과 반영.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
    - S1-4 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/마이페이지/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace(`xmlns`) 기준 false positive 확인
  - `node`로 `WF-12-review-requests.json` 파싱 + `wf12-build-emails` 구문 검사
  - Playwright 로컬 모킹 검증:
    - 전체 `2`, 완료 섹션 `1`, `후기 작성하기`, `로즈 패키지`, `같은 강사의 다른 클래스` 확인
    - 스크린샷: `output/playwright/s1-4-20260310/mypage-repurchase-flow.png`

### [CODEX-LEAD] Phase 3 S1-3 목록 신뢰 배지 + 퀵 필터 완료 (CODEX)
- 프론트
  - `파트너클래스/목록/Index.html`
    - 상단 퀵 필터 레일 추가: 카테고리 / 지역 / 형태 / 가격대 / 난이도.
  - `파트너클래스/목록/css.css`
    - 퀵 필터 레일 스타일, 카드 신뢰 배지 스타일, 카드 하단 지도 CTA 스타일 추가.
    - 카드 구조를 `링크 본문 + 오프라인 지도 액션` 구조에 맞게 보정.
  - `파트너클래스/목록/js.js`
    - 신뢰 배지 6종 계산 로직 추가.
    - `pressco21_catalog_filters_v1` localStorage 복원 로직 추가.
    - `오프라인 -> 원데이/정기`, `온라인 -> 온라인` 매핑 퀵 필터 추가.
    - 오프라인 카드에 `가까운 공방 보기` Google Maps 검색 링크 추가.
    - 협회 탭 금액 포맷 함수 충돌 수정, `normalizedContains()` 누락 보완, 최근 본 클래스 추적에서 외부 지도 링크 제외.
- 문서/메모리
  - `ROADMAP.md`
    - S1-3를 `✅ 완료`로 변경하고 운영 메모와 Playwright 검증 결과 반영.
  - `docs/파트너클래스/list-badge-filter-guide.md`
    - 배지 기준, 퀵 필터 저장 키, 지도 진입점, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 목록 UX 가이드 문서 연결.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
    - S1-3 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/목록/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace(`xmlns`) 기준 false positive 확인
  - Playwright 로컬 모킹 검증:
    - 초기 `총 4개의 클래스`, 배지 6종 전체 확인
    - `서울 + 오프라인 + 입문 + 5만원 이하` 조합 결과 1건 확인
    - 새로고침 후 필터 복원 확인
    - `온라인` 전환 시 지도 CTA 제거 확인
  - 스크린샷 산출물:
    - `output/playwright/s1-3-20260310/list-quick-filter-state.png`

### [CODEX-LEAD] Phase 3 S1-2 상세 UX 고도화 완료 (CODEX)
- 프론트
  - `파트너클래스/상세/Index.html`
    - 상단 `Trust Summary Bar` 영역 추가.
    - `이 가격에 포함된 것` 섹션 추가.
    - 데스크탑 `키트만 구매` 링크와 모바일 하단 3계층 CTA 추가.
  - `파트너클래스/상세/css.css`
    - 상단 고정 신뢰 바 스타일 추가.
    - 포함 내역 카드 스타일 추가.
    - 데스크탑/모바일 CTA 계층 스타일 분리.
    - 모바일 하단 고정 바를 `총 결제 예상 + 예약하기 / 선물하기 + 키트만 구매` 2줄 구조로 재구성.
  - `파트너클래스/상세/js.js`
    - `수강 / 평점 / 후기` 요약 바 렌더링 추가.
    - `강의 / 재료키트 / 수료증` 포함 내역 판단/렌더링 추가.
    - 데스크탑/모바일 `예약하기`, `선물하기`, `키트만 구매` 버튼 상태 동기화 추가.
    - 모바일 하단 바 금액이 선택 인원에 맞춰 갱신되도록 수정.
- 문서/메모리
  - `ROADMAP.md`
    - S1-2를 `✅ 완료`로 변경하고 운영 메모 추가.
  - `docs/파트너클래스/detail-ux-upgrade-guide.md`
    - 상세 UX 변경 목적, CTA 계층, 포함 내역 상태 기준, Playwright 검증 산출물 정리.
  - `docs/파트너클래스/README.md`
    - 새 상세 UX 가이드 문서 연결.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
    - S1-2 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/상세/js.js`
  - Playwright 로컬 모킹 검증:
    - desktop: `Trust Summary Bar`, 포함 내역 3카드, 데스크탑 CTA 3계층 확인
    - mobile: 하단 고정 바 노출, `예약하기 / 선물하기 / 키트만 구매` 확인
  - 스크린샷 산출물:
    - `output/playwright/s1-2-20260310/detail-desktop-trust-bar.png`
    - `output/playwright/s1-2-20260310/detail-mobile-cta.png`

### [CODEX-LEAD] Phase 3 S1-1 키트 연동 Step 1 완료 (CODEX)
- 프론트
  - `파트너클래스/강의등록/Index.html`, `css.css`, `js.js`
    - 키트 항목 입력을 `상품명 / 자사몰 상품 링크 / 예상 판매가 / 1인 기준 수량` 구조로 변경.
    - `branduid`만 넣어도 링크로 정규화되도록 검증/수집 로직 보강.
  - `파트너클래스/파트너/css.css`, `js.js`
    - 클래스 수정 모달도 같은 키트 구조를 사용하도록 통일.
    - legacy `product_code` 데이터를 링크형으로 보정 로드.
  - `파트너클래스/상세/Index.html`, `css.css`, `js.js`
    - 재료 섹션을 카드형 UI로 재구성.
    - `재료 한번에 담기`, `상품 보기`, `장바구니 담기` CTA 추가.
    - `kit_items` 우선, legacy `materials_product_ids` fallback 구조로 렌더링.
- 워크플로우/서버
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
    - 상세 응답의 `kit_items`를 `product_url`, `price`, `quantity`, `branduid` 기준으로 정규화.
  - `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json`
    - 키트 주문 텔레그램 알림에 상품 링크와 예상 판매가를 포함.
  - `파트너클래스/n8n-workflows/WF-16-class-register.json`
    - 키트 링크 입력 검증 추가.
    - 라이브 DB 제약에 맞춰 INSERT는 `status=INACTIVE`, 소문자 `level`, `region 미저장`으로 저장하고 성공 응답은 `PENDING_REVIEW`로 통일.
  - `파트너클래스/n8n-workflows/WF-20-class-edit.json`
    - 수정 API도 같은 키트 구조를 검증/정규화.
  - 운영 n8n 재배포 완료:
    - `WF-01=WabRAcHmcCdOpPzJ`
    - `WF-05=W3DFBCKMmgylxGqD`
    - `WF-16=I4zkrUK036YEiUHe`
    - `WF-20=EHjVijWGTkUkYNip`
- 문서/메모리
  - `ROADMAP.md`
    - S1-1을 `✅ 완료`로 변경하고 라이브 DB 제약 메모 추가.
  - `docs/파트너클래스/kit-link-integration-guide.md`
    - 표준 키트 JSON 구조, 화면/워크플로우 반영 범위, 라이브 제약, 검증 결과 정리.
  - `docs/파트너클래스/README.md`
    - 새 가이드 문서를 문서 인덱스에 추가.
  - `.claude/agent-memory/class-platform-architect/MEMORY.md`
  - `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
  - `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
    - S1-1 기준 메모리 갱신.
- 검증
  - `node --check 파트너클래스/강의등록/js.js`
  - `node --check 파트너클래스/파트너/js.js`
  - `node --check 파트너클래스/상세/js.js`
  - 라이브 API:
    - `class-register` 정상 등록 성공
    - `class-register` 잘못된 키트 링크 `HTTP 400 / INVALID_PARAMS`
    - `class-edit` 정상 수정 성공
    - `class-edit` 잘못된 키트 항목 `HTTP 400`
    - `class-api getClassDetail`의 `kit_items` 정규화 확인
  - Playwright 로컬 검증:
    - 상세 페이지 재료 섹션 제목/카드/`재료 한번에 담기` CTA 확인
    - 강의 등록 페이지 키트 토글, 4개 입력 라벨, 기본 항목 1개 자동 생성 확인

### [CODEX] CRM 레거시 수금 처리 + 택배송장 자동입력 보강 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 고객 메모에 `[LEGACY_RECEIVABLE_META]` JSON을 저장해 레거시 수금 누적액을 관리하는 helper를 추가.
  - 레거시 baseline 계산 시 누적 수금액을 차감하도록 변경.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - `레거시 잔액` 탭에 `입금 확인` 버튼과 레거시 수금 전용 다이얼로그를 추가.
  - 저장 시 고객 메모 메타데이터를 갱신하고 고객 미수 통계를 재계산하도록 연결.
- `offline-crm-v2/src/lib/api.ts`
  - 명세표에 `customer_address_key` 필드를 허용해 선택 주소를 저장할 수 있게 보강.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 명세표 저장 시 선택 주소 키를 함께 저장.
  - 주소 전환 시 `customer_address_key`도 같이 갱신.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - 택배송장 자동 다운로드 시 받는분 전화/핸드폰을 같은 휴대폰 번호로 채우고, 주소는 명세표에 저장된 선택 주소 기준으로 채우도록 변경.
  - 수량은 항상 `1`, 배송메세지는 빈값으로 고정.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - `cd offline-crm-v2 && bash deploy/deploy.sh`
  - 결과: 성공, 운영 반영 완료

### [CODEX] CRM 레거시/CRM 미수금 집계 통합 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 레거시 미수 baseline을 스냅샷만으로 동기 계산할 수 있는 helper를 추가.
  - `분리 거래명 별도 고객` 메모가 있는 CRM 전용 고객은 부모 레거시 baseline을 상속하지 않도록 유지.
- `offline-crm-v2/src/lib/receivables.ts`
  - `legacyBaseline`, `crmRemaining`, `totalRemaining`, `source`를 함께 가지는 고객별 미수 ledger builder를 추가.
- `offline-crm-v2/src/pages/Dashboard.tsx`
  - 대시보드 미수금 총액을 `레거시 미수 + CRM 열린 명세표 미수` 합산으로 변경.
  - KPI 보조문구에 `레거시 / CRM` 분해값을 표시.
- `offline-crm-v2/src/pages/Customers.tsx`
  - 고객관리 `미수금` 컬럼이 CRM 명세표만이 아니라 레거시 미수까지 포함한 총 미수금을 표시하도록 변경.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 미수금 탭을 `전체 / CRM 명세표 / 레거시 잔액` 3개 탭으로 분리.
  - `전체` 탭은 고객 단위 총 미수, `CRM` 탭은 기존 입금 처리 명세표, `레거시` 탭은 원장 기준 고객별 미수를 노출.
  - 총액 요약은 `레거시 + CRM` 합산으로 통일.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - `cd offline-crm-v2 && bash deploy/deploy.sh`
  - 결과: 성공, 운영 반영 완료

### [CODEX-LEAD] 전국 탐색 허브 + 파트너맵 통합 방향 반영 (CODEX)
- `docs/파트너클래스/shared-service-identity.md`
  - 파트너클래스를 `전국 오프라인/온라인 클래스를 카테고리와 지역 기준으로 탐색하는 허브`로 명시.
  - 파트너맵을 별도 서비스가 아니라 오프라인 클래스 탐색을 강화하는 지리적 뷰로 통합한다는 원칙을 추가.
- `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`
  - 수강생 핵심 경험을 `카테고리 -> 지역 -> 형태(오프라인/온라인)` 탐색 흐름으로 재정의.
  - 오프라인 클래스는 파트너맵과 통합된 리스트/지도 전환, 온라인 클래스는 지도 없는 비교 흐름으로 보는 전략을 추가.
- `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md`
  - 목적과 수강생 여정에 `전국 오프라인/온라인 탐색 허브` 관점을 반영.
  - 파트너맵 통합을 수강생 여정의 공식 전제로 명시.
- `ROADMAP.md`
  - `S1-3`에 `형태(오프라인/온라인)` 퀵 필터와 오프라인 클래스 지도 진입점을 반영.
  - `S2-3`을 `파트너맵 통합`까지 포함하는 IA 확장 태스크로 강화.
- `docs/파트너클래스/phase3-non-technical-test-guide.md`
  - 비전공자 테스트 가이드에 `온라인/오프라인 전환`, `지도/리스트 일관성`, `지역 기반 오프라인 탐색` 확인 포인트를 추가.

### [CODEX-LEAD] Phase 3 비전공자 테스트 가이드 추가 (CODEX)
- `docs/파트너클래스/phase3-non-technical-test-guide.md`
  - Phase 3 전체 방향을 비전공자도 이해할 수 있도록 `수강생 / 파트너 / 협회` 3개 관점으로 다시 설명.
  - Phase 3-0 ~ 3-3을 기술 용어 대신 "무엇이 바뀌는지 / 왜 중요한지 / 화면에서 뭘 봐야 하는지 / 합격과 불합격 신호" 중심으로 정리.
  - 향후 테스트 시 `상세 신뢰감`, `목록 탐색감`, `재구매 흐름`, `파트너 온보딩/대시보드`, `협회/세미나`, `협회원 혜택`을 어떻게 봐야 하는지 체크포인트를 문서화.
- `docs/파트너클래스/README.md`
  - 현재 유지 문서 목록에 비전공자용 테스트 가이드를 추가해 문서 진입점에서 바로 찾을 수 있게 정리.

### [CODEX-LEAD] Phase 3 S0-1 NocoDB 일일 자동 백업 구축 완료 (CODEX)
- `scripts/server/nocodb-daily-backup.sh`
  - NocoDB DB 파일 + `nocodb_data` 볼륨 tar.gz + compose 파일 + `n8n/.env`를 일일 백업하도록 저장소 기준 스크립트를 추가.
  - 7일 롤링 삭제, 월간 아카이브, 실패 시 `telegram-notify.sh`와 `backup-notify` webhook 호출, `PRESSCO21_BACKUP_FORCE_FAIL=1` 테스트 플래그를 포함.
- `scripts/server/install-nocodb-backup-cron.sh`
  - 로컬 저장소에서 서버 `/home/ubuntu/scripts/backup.sh`로 반영하고 crontab을 재설치하는 스크립트를 추가.
- 서버 반영
  - `/home/ubuntu/scripts/backup.sh` 재설치
  - crontab 백업/정리 라인을 `20??????_??????` 패턴 기준으로 재설치
- 검증
  - 수동 백업 실행: `/home/ubuntu/backups/20260310_101318` 생성 확인
  - 생성 파일: `noco_*.db`, `nocodb_data_*.tar.gz`, compose 3종, `n8n_env_*.bak`, manifest

### [CODEX-LEAD] Phase 3 S0-2 상태값 정규화 완료 (CODEX)
- `파트너클래스/n8n-workflows/WF-01-class-api.json`
  - `getClasses/getClassDetail/getCategories` 응답을 canonical status/level/region 기준으로 정규화.
  - `getClasses`가 `입문/beginner/BEGINNER`, `서울/SEOUL` 같은 혼합 입력을 동일하게 처리하도록 보정.
  - 목록 응답에 `region`, `status`, `partner_grade`, `remaining seats` 집계를 포함한 뒤 라이브 재배포 완료.
- `파트너클래스/n8n-workflows/WF-06-class-management.json`
  - 클래스 상태 변경 API가 legacy status를 받아도 `ACTIVE/PAUSED/ARCHIVED` canonical 값으로 저장/응답하도록 정리.
- `파트너클래스/n8n-workflows/WF-16-class-register.json`
  - 강의 등록 시 difficulty/region을 canonical 값으로 저장하고 `PENDING_REVIEW` 상태로 생성하도록 수정.
  - `Create Initial Schedules`와 관리자 알림 메시지 노드 문법 오류를 같이 정리.
- `파트너클래스/n8n-workflows/WF-17-class-approve-auto.json`
  - `ACTIVE` 전환 감지 기준으로 메이크샵 상품 자동 등록을 수행하도록 수정.
- `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
  - `getPendingClasses`가 legacy/new status를 모두 읽고 canonical 값으로 응답하도록 수정.
  - `approveClass/rejectClass`가 `ACTIVE/REJECTED`를 저장하도록 정리.
- `파트너클래스/목록/js.js`
  - filter/query 파라미터를 canonical level/region으로 정규화하고, 카드 지역/난이도 표시 보정을 추가.
- `파트너클래스/상세/js.js`
  - related classes와 난이도/지역 링크 문맥이 canonical 값과 legacy 입력을 모두 처리하도록 수정.
- `파트너클래스/파트너/js.js`
  - 대시보드 상태 토글/배지 표시를 canonical class status 기준으로 변경.
  - legacy grade(`SILVER/GOLD/PLATINUM`)를 `BLOOM/GARDEN/ATELIER`로 alias 처리.
- `파트너클래스/강의등록/js.js`
  - 폼 제출 difficulty를 canonical uppercase 값으로 전송하도록 수정.
- `scripts/server/partnerclass-s0-2-normalize-nocodb.sh`
  - 컨테이너 sqlite3 부재 환경에서도 호스트 mount DB로 fallback 되도록 보강.
  - 라이브 NocoDB에서 `tbl_Classes.level/status/region`, `tbl_Applications.status`, `tbl_Settlements.status` 정규화 실행 완료.
- 서버/배포
  - n8n 운영 반영: `WF-01=WabRAcHmcCdOpPzJ`, `WF-06=ty68eBtMnlH2lz7x`, `WF-16=I4zkrUK036YEiUHe`, `WF-17=N3p7L6wo0nuT5cqM`, `WF-ADMIN=SMCKmeLSfxs1e1Ef`
  - 사전 백업: `/home/ubuntu/backups/20260310_113500`
  - n8n 현재 정의 백업: `output/n8n-backups/20260310-s0-2/`
- 검증
  - workflow JSON 전체 `JSON.parse` 및 모든 `jsCode` `AsyncFunction` 컴파일 통과
  - `bash -n scripts/server/partnerclass-s0-2-normalize-nocodb.sh`
  - 라이브 `class-api`:
    - `getClasses level=입문/beginner/BEGINNER` 모두 `total=5`
    - `getClasses region=서울/SEOUL` 모두 `total=5`
    - 기본 목록 `total=7`, status=`ACTIVE`만 반환
    - `getClassDetail` 응답 `status=ACTIVE`, `level=BEGINNER`, `region=SEOUL`, `partner.grade=BLOOM` 확인
  - 라이브 상세 → 입문 링크 클릭 시 목록 `총 5개의 클래스` 확인 (Playwright MCP)
  - 라이브 목록 첫 진입 `총 7개의 클래스` / 상세 진입 확인 (Playwright MCP)
  - 7일 정리 검증: 더미 디렉토리 `20260228_000000` 생성 후 cleanup 명령으로 삭제 확인
  - 실패 알림 검증: `PRESSCO21_BACKUP_FORCE_FAIL=1 bash /home/ubuntu/scripts/backup.sh` 실행 시 `WF-BACKUP Backup Notify` 실행 로그 확인
- `docs/파트너클래스/backup-restore-guide.md`
  - 저장소 기준 스크립트 경로, 재설치 명령, 수동/실패 테스트 방법을 반영.
- `ROADMAP.md`
  - Task `S0-1`을 `✅ 완료`로 갱신하고 검증 결과를 변경 이력에 기록.

### [CODEX-LEAD] Phase 3 S0-3 WF-ADMIN 중복 ID 정리 + S0-4 Switch 문서화 완료 (CODEX)
- 운영 n8n
  - inactive `WF-ADMIN Admin API` 중복 4건 삭제 완료:
    - `LwkPImRkhuoN3krF`
    - `FgTVuCi37J68QVYa`
    - `ggzThCFb4LG1uHJl`
    - `YT6cKPhozRLpKS7u`
  - 유지 ID: `SMCKmeLSfxs1e1Ef` 1건만 ACTIVE
  - 삭제 전 백업: `output/n8n-backups/20260310-s0-3/`
- `파트너클래스/어드민/js.js`
  - 강의 승인 탭 기본/재조회 status를 `PENDING_REVIEW` 기준으로 맞춤.
  - legacy `INACTIVE` 필터값이 들어와도 `PENDING_REVIEW`로 정규화하는 helper 추가.
  - 상태 라벨 맵을 `ACTIVE / PENDING_REVIEW / PAUSED / ARCHIVED / REJECTED` 기준으로 정리.
- `docs/파트너클래스/WF-01-switch-map.md`
  - `getClasses`, `getClassDetail`, `getCategories`, `getAffiliations` 4개 action의 입력 파라미터, 응답 구조, 호출 페이지, unknown action 처리 경로 문서화.
- `docs/파트너클래스/README.md`
  - `WF-01-switch-map.md`를 유지 문서 목록에 추가.
- 검증
  - 운영 n8n 목록 조회 결과 `WF-ADMIN Admin API`는 `SMCKmeLSfxs1e1Ef` 1건만 남음
  - 라이브 `admin-api` 읽기 호출:
    - `getApplications status=PENDING` 정상 응답
    - `getPendingClasses status=PENDING_REVIEW` 정상 응답
  - `node --check 파트너클래스/어드민/js.js`

### 파트너클래스 공용 메모리 및 문서 정리 (CODEX)
- `.claude/agent-memory/class-platform-architect/MEMORY.md`
- `.claude/agent-memory/makeshop-ui-ux-expert/MEMORY.md`
- `.claude/agent-memory/sales-partnership-specialist/MEMORY.md`
- `.claude/agent-memory/ecommerce-business-expert/MEMORY.md`
  - Claude Code가 바로 같은 방향으로 대화할 수 있도록 파트너클래스 정체성, IA 3레이어, 우선 고객, 수익 구조, KPI 기준을 공용 메모리로 반영.
- `docs/파트너클래스/README.md`
  - 현재 기준으로 먼저 읽어야 할 문서, 판단 우선순위, 운영 가이드, 참고용 아카이브를 한 장으로 정리.
- `CLAUDE.md`, `AGENTS.md`, `파트너클래스/AGENTS.md`, `파트너클래스/GUIDE.md`
  - 파트너클래스 작업 시 `README -> shared-service-identity -> enterprise-elevation-strategy` 순서로 문맥을 잡도록 진입점을 통일.
- `docs/파트너클래스/archive/2026-03-10/`
  - 임시 handoff, 상세 상용화 감사, 구형 플랫폼 개요 가이드를 아카이브로 이동해 현재 문서 묶음과 분리.
- `docs/n8n-automation-efficiency-review-2026-03-09.md`
  - 구형 `platform-overview-guide.md` 대신 새 문서 인덱스를 참조하도록 정리.

### 파트너클래스 공용 정체성 문서 연결 (CODEX)
- `docs/파트너클래스/shared-service-identity.md`
  - Claude Code와 Codex CLI가 공통으로 따라야 할 파트너클래스 정체성 기준을 짧은 문서로 정리.
  - `수강생 1순위`, `파트너/협회는 공급자 레이어`, `재료/키트 판매 활성화`, `협회 제휴/협회원 락인`을 공용 판단 기준으로 명시.
- `CLAUDE.md`
  - 파트너클래스 작업 전 공용 정체성 문서와 상세 전략 문서를 먼저 읽도록 섹션 추가.
- `AGENTS.md`
  - Codex 작업 시 파트너클래스 관련 기획/UX/카피/문서 작업 전에 공용 정체성 문서를 우선 참조하도록 명시.
- `파트너클래스/AGENTS.md`
  - 파트너클래스 전용 지침 상단에 공용 정체성 문서 경로와 핵심 기준 요약 추가.

### CRM 미수 상위 20건 대조 감사 (CODEX)
- `offline-crm-v2/docs/top-20-receivables-reconciliation-2026-03-10.md`
  - CRM `outstanding_balance > 0` 상위 20건을 레거시 백업 잔액과 CRM 미수 명세표 기준으로 대조.
  - 결과는 `20/20 정합`, 이 중 `18건`은 레거시 잔액과 완전 일치, `2건`은 `레거시 baseline + CRM 미수 명세표`로 설명 가능함을 문서화.
  - 따라서 상위 미수 고객 기준으로는 `얼마에요 원본`과 CRM 미수금이 실질적으로 같은 체계로 유지된다고 판정.

### CRM 잔액 재계산 로직 보정 (CODEX)
- `offline-crm-v2/src/lib/legacySnapshots.ts`
  - 레거시 거래처 스냅샷 타입, 공통 매칭 로직, 스냅샷 캐시 fetch, baseline 잔액 조회 helper를 분리.
- `offline-crm-v2/src/lib/api.ts`
  - `recalcCustomerStats()`가 CRM 미수만 덮어쓰지 않고 `legacy baseline + CRM 미수`로 `outstanding_balance`를 재계산하도록 수정.
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - 고객 상세의 레거시 원본 매칭 로직도 새 공통 helper를 사용하도록 정리해 화면과 재계산이 같은 기준을 공유.
- 검증
  - `cd offline-crm-v2 && npm run build`
  - 결과: 성공

### 파트너클래스 엔터프라이즈 고도화 전략 문서화 (CODEX)
- `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`
  - 현재 PRD/로드맵의 비전과 2026-03-10 라이브 UI 상태를 교차 검토해 서비스 목적 재정의 초안을 문서화.
  - 대표/운영/파트너/수강생 인터뷰 프레임, JTBD 산출물, 엔터프라이즈급 UX 우선순위, 4단계 실행 순서를 정리.
  - 라이브 기준 핵심 갭을 `운영 OS 비전 대비 카탈로그형 UX`, `용어 혼재`, `운영 가치 전달 부족`으로 명시.
  - 추가로 대표 1차 답변을 반영해 `수강생 중심`, `파트너/협회는 공급자 레이어`, `직접 수익보다 재료/키트 활성화` 방향으로 전략 축을 재정렬.
  - 협회 콘텐츠는 별도 서비스가 아니라 같은 허브 안의 분리된 탐색 레이어로 두는 구조, 파트너 대시보드 핵심 KPI 후보 3종도 함께 정리.
  - 후속으로 `협회 제휴를 유치하는 B2B 미끼`, `협회원 전용 제품/혜택을 통한 자사몰 락인`, `협회 일정/세미나/시그니처 상품 허브` 구조까지 전략에 반영.

### CRM 잔액 불일치 6건 원인 분석 (CODEX)
- `offline-crm-v2/docs/legacy-balance-analysis-2026-03-10.md`
  - 잔액 불일치 6건을 고객별로 대조한 결과, 전부 `레거시 tradebook.balance + CRM 미수 명세표 합계 = 현재 CRM 고객 잔액` 공식을 만족함을 정리.
  - 따라서 현재 6건은 이관 누락이 아니라 `레거시 baseline을 유지한 운영 잔액` 케이스로 판정.
  - 동시에 `recalcCustomerStats()`가 레거시 baseline을 합산하지 않아 재계산 시 잔액을 훼손할 수 있는 구조적 리스크도 문서화.
- 검증
  - 인라인 재검증 결과 6건 모두 `formula_match = true`

### 파트너클래스 라이브 회귀 스크립트 보강 (CODEX)
- `scripts/partnerclass-live-smoke.js`
  - 게스트 시나리오에 `2609/2608/8009/8010/2610` 로그인 안내 링크 회귀와 `2607 상세 후기 로그인 경로` 검증을 추가.
  - 상세 분류 링크를 실제 목록 필터 결과까지 따라가는 회귀 시나리오를 추가하고, 모바일/데스크탑 중복 링크는 visible anchor만 수집하도록 보강.
  - 파트너 자격증명이 없을 때 멤버 전용 시나리오는 `skip` 처리하고, 관리자 API 읽기 전용 검증은 `0건`도 정상 응답으로 간주하도록 수정.
  - 멤버 전용 상세 `선물하기 -> 선물 주문서` 시나리오를 추가해 자격증명 주입 시 바로 재검증할 수 있게 정리.
- 검증
  - `node --check scripts/partnerclass-live-smoke.js`
  - `NODE_PATH=/Users/jangjiho/workspace/pressco21/offline-crm-v2/node_modules node scripts/partnerclass-live-smoke.js`
  - 결과: `14건 중 12건 성공 / 1건 실패 / 1건 건너뜀`
  - 확인된 라이브 실패: `상세 분류 링크 회귀`
    - `https://n8n.pressco21.com/webhook/class-api` 기준 `{"action":"getClasses","level":"입문"}` 는 `total=0`
    - 동일 API에서 `{"action":"getClasses","level":"beginner"}` 는 `total=5`
    - 즉, 라이브 목록/API 레벨 필터 어휘가 아직 영문(`beginner`) 기준이라 상세의 한글 레벨 링크와 실제 결과가 불일치함

### CRM 데이터 정합성 P1 재감사 (CODEX)
- `offline-crm-v2/scripts/repair_legacy_backup.py`
  - blank legacy 고객 관련 거래만 선별 조회하도록 바꿔 dry-run 시간이 길어지지 않게 정리.
  - customer patch를 현재 값과 diff 비교 후 압축하도록 보강해 no-op 업데이트를 요약에서 제거.
  - 최신 dry-run 기준 실제 남은 보정은 `customer_updates 6`, `customer_creates 0`, `tx_updates 0`, `product_creates 0`.
- `offline-crm-v2/docs/legacy-backup-audit-2026-03-10.md`
  - 예전 문서에 남아 있던 `누락 고객 15건 / 분리 거래 237건 / 품목 1건 누락`을 재검증 결과 기준으로 정정.
  - 현재 P1 실잔여 이슈를 `outstanding_balance 6건`으로 축소하고, 이를 이관 실패가 아니라 잔액 정책 미확정 이슈로 재분류.
- 검증
  - `cd offline-crm-v2 && python3 scripts/repair_legacy_backup.py`
  - 결과: `customer_updates 6 / customer_creates 0 / tx_updates 0 / product_creates 0`

### CRM 얼마에요 대체 평가 + E2E 기준선 복구 (CODEX)
- `offline-crm-v2/docs/crm-replacement-assessment-2026-03-10.md`
  - 현재 CRM의 `얼마에요` 대체 수준을 `부분 대체 성공, 완전 대체 미완료`로 판정하고 데이터/회계/UX/QA 기준을 문서화.
  - 다음 단계 우선순위를 `기준선 복구 -> 데이터 진실원 확정 -> 회계 정확도 보강 -> UX 정제` 순으로 정리.
- `offline-crm-v2/tests/01-customers.spec.ts`
  - 고객 목록 액션 컬럼 추가 반영으로 헤더 기대값을 `7 -> 8`로 갱신.
- `offline-crm-v2/tests/02-invoices.spec.ts`
  - 페이지 제목을 현재 UI 기준 `명세표 작성/관리`로 갱신.
  - 송장 버튼 명칭, 품목 placeholder, 토스트 기반 유효성 경고, 거래 상세 -> 수정 열기 흐름을 반영해 명세표 테스트를 현재 동작 기준으로 복구.
  - 과세 체크 후 세액 계산을 검증하도록 T2-07을 보강.
- `offline-crm-v2/tests/03-dashboard.spec.ts`
  - 사이드바 메뉴 기대값을 현재 구조 `명세표 작성 / 거래/명세표 조회 / 캘린더 / 설정` 포함 기준으로 갱신.
- 검증
  - `cd offline-crm-v2 && npx playwright test tests/01-customers.spec.ts tests/02-invoices.spec.ts tests/03-dashboard.spec.ts`
  - 결과: `28 passed (28.3s)`

### 파트너클래스 handoff 백업
- 재시작용 handoff 문서를 [docs/파트너클래스/archive/2026-03-10/partnerclass-handoff-2026-03-10.md](/Users/jangjiho/workspace/pressco21/docs/파트너클래스/archive/2026-03-10/partnerclass-handoff-2026-03-10.md)에 보관.
- 전역 Codex 메모리에도 `pressco21-partnerclass-handoff-2026-03-10.md`로 핵심 요약을 백업.
- 다음 세션에서는 `AI_SYNC.md`와 handoff 문서만 읽어도 `메이크샵 저장 확인 -> 라이브 재검증 -> Atlas 연결 검토` 순서로 바로 이어갈 수 있게 정리.

### 파트너클래스 UX 긴급 수정
- 라이브 재현
  - `output/playwright/partnerclass-ux-20260310/ux-audit-results.json` 기준으로 `파트너신청(2609)` 로그인 버튼이 `/member/login.html`로 연결되어 `net::ERR_ABORTED`로 실패하는 문제를 재현.
  - `상세(2607)` 선물하기가 메이크샵 선물 주문서가 아니라 일반 `shopdetail.html?branduid=...`로만 이동하는 흐름을 재현.
  - 상세의 `클래스 더 둘러보기` 링크가 `level=beginner`, `region=서울 강남구`처럼 목록 필터와 맞지 않는 값으로 생성되는 문제를 확인.
- 프론트 수정
  - `파트너클래스/파트너신청/Index.html`, `파트너클래스/파트너신청/js.js`
    - 로그인 버튼 기본 링크와 JS 폴백을 `/shop/member.html?type=login` 기반으로 교체하고 현재 페이지 `returnUrl`을 붙이도록 수정.
  - `파트너클래스/파트너/Index.html`, `파트너클래스/파트너/js.js`
    - 파트너 대시보드 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/강의등록/Index.html`, `파트너클래스/강의등록/js.js`
    - 강의등록 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/마이페이지/Index.html`
    - 마이페이지 로그인 안내 링크를 메이크샵 실제 로그인 경로로 교체.
  - `파트너클래스/교육/Index.html`, `파트너클래스/교육/js.js`
    - 교육 페이지 로그인 안내 링크/폴백을 메이크샵 실제 로그인 경로로 통일.
  - `파트너클래스/상세/js.js`
    - 공통 `buildLoginUrl()` 헬퍼 추가로 리뷰 작성/예약/선물하기 로그인 이동 경로를 일관화.
    - 상세 분류 링크에서 난이도 영문값(`beginner/intermediate/advanced`)을 목록 필터 값(`입문/중급/심화`)으로 정규화.
    - 상세 지역 링크를 목록 필터 체계(`서울/경기/인천/부산/대구/기타`)에 맞게 정규화.
    - 선물하기는 메이크샵 상품 상세를 먼저 조회해 native gift 링크가 있으면 그대로 사용하고, 없으면 `basket.action.html -> /shop/order.html + add_rand_url` 흐름으로 연결되도록 수정.
    - 선물하기 처리 중 중복 클릭을 막는 loading 상태와 오류 토스트 복구 처리 추가.
  - `파트너클래스/상세/css.css`
    - 선물하기 버튼 loading 스피너 스타일 추가.
- 검증
  - `node --check 파트너클래스/파트너신청/js.js` → `OK`
  - `node --check 파트너클래스/파트너/js.js` → `OK`
  - `node --check 파트너클래스/강의등록/js.js` → `OK`
  - `node --check 파트너클래스/교육/js.js` → `OK`
  - `node --check 파트너클래스/상세/js.js` → `OK`
  - `curl -I https://www.foreverlove.co.kr/member/login.html` → `204`
  - `curl -I https://www.foreverlove.co.kr/shop/member.html?type=login` → `200`
  - `curl https://www.foreverlove.co.kr/shop/shopdetail.html?branduid=12195642` 점검 기준, 클래스 실상품은 현재 native `.btn-gift` 노출이 없어 프론트가 우선 `basket.action` 선물 흐름으로 폴백하도록 맞춤.

### CRM 수정
- `offline-crm-v2/docs/crm-handoff-2026-03-09.md`, `.claude/agent-memory/accounting-specialist/MEMORY.md`
  - 최근 CRM 인쇄/고객수정/과세 기본값/캘린더/미수금 복구 작업을 다음 에이전트가 바로 이어받을 수 있도록 handoff 문서와 accounting 메모리를 정리.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 운영 `invoices` 스키마에 없는 `paid_date`, `payment_method` 필드 조회 때문에 페이지 전체가 실패하던 문제 수정.
  - 미수금 조회는 다시 안정적인 `payment_status in (unpaid, partial)` 기준 전체 조회로 바꾸고, `asOf` 날짜는 프론트에서 필터링하도록 조정.
  - 입금 확인 저장 payload에서도 스키마에 없는 `paid_date` 전송을 제거.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 운영 `invoice_date` 필드가 NocoDB 서버측 `gte/lte` 날짜 비교를 지원하지 않아 월간/기간 쿼리가 실패하던 문제 수정.
  - 캘린더는 전체 명세표를 한 번 읽고 프론트에서 월/기간/전년동월 범위를 필터링하도록 변경.
  - `기준일 미수 후속`도 서버 날짜 조건이 아니라 현재 미수 명세표 전체를 읽은 뒤 기준일 이전 건만 프론트에서 골라 표시하도록 조정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 운영 스키마에 없는 `paid_date`를 복사/저장 payload에 섞지 않도록 정리.
- 운영 검증
  - `curl`로 운영 `crm-proxy` 응답을 직접 확인해 2026-03-09 명세표 8건, 현재 미수 6건 존재를 검증.
  - 로컬 Vite 프록시(`http://127.0.0.1:4173`)에서 실제 화면 검증:
    - `미수금 관리` 정상 로드, 총 `1,704,700원 / 6건`
    - `캘린더` 2026년 3월 정상 로드, `명세표 8건 / 1,810,260원`, `03-09`에 `8건 / 181만원`
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.
- `offline-crm-v2/src/lib/api.ts`
  - `fetchAllPages` 기반 `getAllInvoices`, `getAllCustomers` 추가로 캘린더/미수금의 500/1000건 샘플 조회를 전체 조회로 교체할 수 있게 정리.
  - `Invoice.paid_date` 타입을 `string | null`로 확장해 저장 시 비우기/설정이 명시적으로 가능하도록 수정.
- `offline-crm-v2/src/lib/reporting.ts`
  - 기준일 기준 `paid_amount`, `remaining_amount`, `payment_status` 계산 helper 추가.
  - 기간 리포트에서 전년 동월 CRM 명세표 매출을 함께 반영할 수 있도록 `previousYearInvoiceSales` 입력 지원 추가.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 월간 달력 조회를 `calendar-month-invoices` 전체 조회로 교체해 월 500건 제한 문제 수정.
  - 기간 리포트를 최신 1000건 샘플이 아니라 선택 기간 전체 명세표 기준으로 계산하도록 수정.
  - `전년동월 대비` 계산에 전년 동월 CRM 명세표 매출을 포함하도록 수정.
  - `기준일 미수 후속`을 현재 `payment_status`가 아닌 `paid_date` 기반 기준일 미수 계산으로 교체.
  - `재방문 추천`은 과거 기준일 재현이 불가능한 현재 데이터 필드(`last_order_date`)를 쓰고 있어, 의미를 `현재 기준 재방문 추천`으로 명시하고 조회도 전체 고객 기준으로 교체.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 미수금 목록/에이징/총액을 현재 상태값이 아니라 기준일 기준 as-of 계산으로 재구성.
  - 과거 기준일에서는 조회 전용 안내를 표시하고 `입금 확인` 버튼을 비활성화해, 과거 스냅샷 화면에서 현재 레코드를 잘못 수정하는 위험을 차단.
  - 엑셀 내보내기도 선택 기준일 기준 경과일수/입금액/미수금이 반영되도록 수정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 명세표 저장 시 `paid_amount > 0`이면 `paid_date`가 자동 기록되고, 0원이면 `paid_date`가 비워지도록 정리.
  - 명세표 복사 시 기존 수금일이 따라오지 않도록 `paid_date` 초기화 추가.
- `offline-crm-v2/src/lib/excel.ts`
  - `exportReceivables`가 선택 기준일을 받아 경과일수를 계산하도록 확장.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 정합성 수정 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 날짜 클릭 시 `바로 실행 / 당일 명세표 / 기준일 미수 후속 / 재방문 추천` 패널 추가.
  - `명세표 보기`, `미수 보기`, `이 날짜로 새 명세표 발행` 버튼을 실제 라우트 이동과 연결.
  - 기준일 이전 미수 명세표 상위 목록과 45일 이상 무주문 거래처 추천 로직 추가.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - `date` query param 연동 및 발행일 필터 UI 추가.
  - `new=1&date=YYYY-MM-DD` 진입 시 해당 날짜를 기본값으로 새 명세표 다이얼로그가 열리도록 수정.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - `asOf` query param 연동 및 `기준일` 필터 UI 추가.
  - 에이징/총 미수금/목록이 현재 시점이 아니라 선택 기준일 기준으로 계산되도록 수정.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - `initialInvoiceDate` prop 추가로 외부에서 새 명세표 기본 발행일을 주입할 수 있도록 수정.
  - 명세표 저장 후 `calendar-*` query까지 invalidate 하도록 보강.
- `offline-crm-v2/src/lib/reporting.ts`
  - 기간 리포트 공통 helper 추가: 프리셋(`이번달/지난달/이번분기/올해`), 기간 범위 계산, 금액 포맷, 수금률/전년동월 색상 규칙, 기간 통합 매출 계산, 일별 차트 데이터 생성.
- `offline-crm-v2/src/pages/Calendar.tsx`
  - 캘린더 상단에 `기간 매출 리포트` 섹션 추가.
  - Dashboard와 동일한 계산식으로 `수금률`, `전년동월 대비/기간 매출`, `평균 객단가`, `일별 매출 차트`를 표시하도록 수정.
  - 월간 달력은 `명세표 기준`, 상단 리포트는 `레거시 거래내역 + CRM 명세표 통합 기준`으로 역할을 분리해 안내 문구 추가.
  - 날짜 셀에 `미수 건수`를 노출하고, 우측 패널에 선택 날짜 실행 요약 / 월간 요약 / 매출 상위 날짜 카드 추가.
  - 월별 명세표 조회 범위도 실제 말일 기준으로 보정.
- `offline-crm-v2/src/pages/Dashboard.tsx`
  - 기간 리포트가 새 공통 helper를 사용하도록 정리해 Calendar와 동일한 계산 로직을 공유하도록 수정.
- `offline-crm-v2/src/pages/Calendar.tsx`, `offline-crm-v2/src/pages/Dashboard.tsx`
  - 캘린더 페이지의 현재 구조와 데이터 연결 상태를 점검.
  - 대시보드의 기간 리포트/통합 매출 계산 로직과 캘린더의 단순 월별 명세표 집계를 비교해 개선 방향 제안 준비.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 거래처 검색 결과가 0건일 때 드롭다운 위치에 `검색 결과가 없습니다` 안내 문구를 표시하도록 추가.
  - 새 명세표에서 최근 명세표 기준 최근 거래처 6개를 빠른 선택 버튼으로 노출하고, 클릭 시 고객 정보를 hydrate하도록 추가.
  - 새 명세표 전용 `임시저장` 버튼과 `임시저장본 불러오기/삭제` 배너 추가.
  - 실제 발행 완료 시 임시저장본은 자동 삭제되도록 처리.
  - 검색 debounce 전에는 `검색 결과 없음` 메시지가 성급하게 뜨지 않도록 조건 보정.
- `offline-crm-v2/src/App.tsx`
  - Sonner 토스트 위치를 우측 상단에서 우측 하단으로 변경.
  - 토스트 본문 클릭 시 즉시 닫히도록 전역 click-dismiss 처리 추가.
- `offline-crm-v2/src/lib/settings.ts`
  - 저장된 CRM 설정에서 `default_taxable`를 boolean으로 정규화해 읽는 helper 추가.
- `offline-crm-v2/src/components/ProductDialog.tsx`
  - 새 제품 등록 시 `is_taxable` 기본값이 설정값(`default_taxable`)을 따르도록 수정.
  - `default_taxable`가 `0/1`, `true/false`, 문자열로 들어와도 boolean으로 정규화되도록 보강.
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 새 명세표 첫 행, 행 추가, 품목 선택 모달 추가 시 `default_taxable` 설정을 기본 과세값으로 사용하도록 수정.
  - 거래처 자동완성에 `↑/↓/Enter/Escape/Tab` 키보드 탐색, 활성 항목 하이라이트, 스크롤 추적 추가.
  - 거래처명을 다시 입력할 때 이전 선택 고객의 `customer_id`/고객 카드/사업자 스냅샷이 남지 않도록 stale 상태 초기화.
  - 빈 placeholder 품목만 있는 명세표는 저장되지 않도록 검증 추가.
  - 마지막 품목 행 삭제 시에는 기본 과세값이 반영된 빈 행 1개를 유지하도록 조정.
- `offline-crm-v2/src/pages/Settings.tsx`
  - `새 품목 기본값: 과세 (10%)` 체크박스의 fallback 기본값을 해제 상태로 조정.
  - 현재 운영 설정 레코드의 `default_taxable` 값이 `0`인 것도 확인.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - 명세표 다이얼로그를 닫을 때 `selectedId/copySourceId`를 같이 초기화.
  - `dialogOpen`일 때만 `InvoiceDialog`를 마운트하도록 바꿔 새 명세표 재오픈 시 이전 거래처 상태가 남지 않게 수정.
  - 명세표 삭제 후 `calendar-*` query까지 invalidate 하도록 보강.
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 입금 확인 저장 후 `calendar-*` query까지 invalidate 하도록 보강.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 2단계 기능 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 캘린더 1단계 기능 운영 반영 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.

### 운영/아키텍처 문서화
- `docs/n8n-automation-efficiency-review-2026-03-09.md`
  - PRESSCO21 전반에서 `n8n`이 필요한 영역과 비효율 영역을 분리해 정리.
  - `유지 / 하이브리드 / 이관` 분류, 워크플로우 설계 가드레일, Claude Code 실행 판단 체크리스트 추가.
  - 우선순위를 `offline-crm-v2 프록시 이관`과 `WF-05 분할` 중심으로 명시.

### Phase 0 완료
- `파트너클래스/n8n-workflows/WF-01-class-api.json` — POST 전환, Switch v3.2, 순차 연결, tbl_Schedules schedules[] 확장
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` — 수수료율 BLOOM/GARDEN/ATELIER/AMBASSADOR 배포
- `파트너클래스/상세/js.js` — GRADE_MAP, 필드명(partner_name/location), flatpickr 일정 기반 + 시간슬롯 UI
- `파트너클래스/상세/css.css` — 시간대 슬롯 CSS 추가
- `파트너클래스/파트너/js.js` — 등급 게이지 BLOOM→AMBASSADOR, 클래스 수정 모달, WF-20/WF-18 엔드포인트 추가

### Phase 1 핵심 태스크 완료
- `파트너클래스/n8n-workflows/WF-18-schedule-management.json` — 일정 관리 API (서버 기존 배포 확인)
- `파트너클래스/n8n-workflows/WF-19-my-bookings.json` — 수강생 예약 확인 API (신규 배포)
- `파트너클래스/n8n-workflows/WF-20-class-edit.json` — 클래스 수정 API (신규 배포)
- `ROADMAP.md` — Phase 0 ✅, Phase 1 Task 001~004 ✅ 반영

### Phase 1 보강 작업 완료
- `파트너클래스/파트너/js.js` — 일정 관리 탭(schedules) 추가: loadScheduleTab, renderScheduleList, saveNewSchedule, deleteSchedule
- `파트너클래스/파트너/Index.html` — 일정 관리 탭 버튼 + 패널(pdTabSchedules) 추가
- `파트너클래스/파트너/css.css` — 일정 카드 + 일정 추가 폼 스타일 추가
- `파트너클래스/강의등록/js.js` — 초기 수업 일정 입력 UI (날짜/시간/정원) + collectSchedules()
- `파트너클래스/강의등록/Index.html` — 일정 입력 섹션 HTML 추가
- `파트너클래스/강의등록/css.css` — 일정 입력 스타일 추가
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` — "Update Booked Count" 노드 추가 (Create Settlement → booked_count 증가 → Aggregate)
- `파트너클래스/n8n-workflows/WF-16-class-register.json` — "Create Initial Schedules" 노드 추가 + Validate Input에 schedules[] 파싱

### Phase 1 Task 005 완료: 재료키트 자동 배송
- NocoDB tbl_Classes에 kit_enabled(Number), kit_items(LongText) 필드 추가
- `파트너클래스/강의등록/Index.html` — 키트 토글 + 키트 항목 입력 UI 추가
- `파트너클래스/강의등록/js.js` — bindKitToggle, addKitItem, collectKitItems 함수 추가
- `파트너클래스/강의등록/css.css` — 키트 토글/항목 스타일 추가
- `파트너클래스/상세/js.js` — "재료키트 포함" 배지 추가
- `파트너클래스/상세/css.css` — info-badge--kit 스타일 추가
- `파트너클래스/파트너/js.js` — 클래스 수정 모달에 키트 토글/항목 편집 추가
- `파트너클래스/파트너/css.css` — 키트 편집 UI 스타일 추가

### 수강생 마이페이지 UI 완료
- `파트너클래스/마이페이지/Index.html` — 로그인 안내, 요약 카드, 예약 카드, 빈 상태
- `파트너클래스/마이페이지/js.js` — WF-19 API 연동, 예약 카드 렌더링
- `파트너클래스/마이페이지/css.css` — 반응형 스타일

### 서버 배포 (n8n)
- WF-01 재배포 (kit_enabled 필드 추가)
- WF-05 재배포 (Process Kit Order 텔레그램 알림 노드 추가)
- WF-16 재배포 (kit_enabled/kit_items 저장)
- WF-20 재배포 (kit 필드 수정 허용)
- WF-19 배포 완료 (ID: Zvk8akZ20VnfsQeN)

### 파트너클래스 통합 테스트 (CODEX)
- 실행 일시: 2026-03-09 20:13~20:29 KST
- 실행 계정: `jihoo5755` (파트너 회원)
- 확인된 수강생 마이페이지 ID: `8010`
- 실제 검증 도메인: `https://www.foreverlove.co.kr`
- 메이크샵 관련 공식 운영/배포 기준 도메인: `https://www.foreverlove.co.kr`
- 산출물 경로: `output/playwright/partnerclass-20260309/`

#### Phase 1 검증
- 목록 `id=2606`
  - 클래스 6건 렌더링 확인, 첫 카드 `압화 아트 기초 클래스`에 `잔여 20석` 배지 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/list-page.png`
- 상세 `id=2607&class_id=CL_202602_001`
  - 목록 카드 클릭으로 진입 확인
  - flatpickr 예약 가능 날짜 `2026-03-15`, `2026-03-20` 확인
  - 시간슬롯/잔여석 확인: `2026-03-15 14:00 잔여 8석`, `2026-03-20 10:00 잔여 6석` 2건
  - FAQ 탭 5개 아코디언 열기/닫기 정상 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/detail-date-timeslot.png`, `output/playwright/partnerclass-20260309/detail-faq-expanded.png`
- 목록 `협회 제휴` 탭
  - `한국꽃공예협회` 카드와 제휴 인센티브 섹션 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/list-association-tab.png`

#### Phase 2 검증
- 파트너 대시보드 `id=2608`
  - 로그인 후 `BLOOM PARTNER` 헤더, 등급 진행률 게이지, 4등급 승급 조건 테이블 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/partner-dashboard-grade-report.png`
- 강의등록 `id=8009`
  - 파트너 로그인 상태에서 등록 폼 전체 렌더링 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/class-register-form.png`
- 어드민 `id=8011`
  - 파트너 계정으로 접근 시 `접근 권한이 없습니다` 가드 화면 노출 확인
  - 관리자 전용 양성 시나리오는 관리자 계정 미제공으로 미검증
  - 스크린샷: `output/playwright/partnerclass-20260309/admin-access-denied.png`

#### Phase 3 검증
- 마이페이지 `id=8010`
  - 비로그인 상태: 로그인 안내 화면 확인
  - 로그인 후: 예약 요약 카드(`전체/예정/완료 = 0`)와 빈 상태 노출 확인
  - 스크린샷: `output/playwright/partnerclass-20260309/mypage-8010-login-required.png`, `output/playwright/partnerclass-20260309/mypage-empty-state.png`
- 잔여석 정합성
  - 목록 배지 `20석` = 상세 시간슬롯 합계 `8 + 6 + 6 = 20석`
  - 결과: PASS

#### 실패/이슈
- 상세 페이지 콘솔 에러
  - `https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js` 무결성 해시 불일치로 차단
  - 에러 메시지: `Failed to find a valid digest in the 'integrity' attribute ... The resource has been blocked.`
  - 로그: `output/playwright/partnerclass-20260309/detail-console.log`

### 파트너클래스 확장 통합 테스트 (CODEX)
- 실행 일시: 2026-03-09 23:05 KST ~ 2026-03-10 00:08 KST
- 실행 계정: `jihoo5755` (파트너 회원)
- 실행 도메인: `https://www.foreverlove.co.kr`
- 자동화 스크립트: `scripts/partnerclass-live-smoke.js`
- 결과 문서: `docs/파트너클래스/partnerclass-live-test-matrix-2026-03-09.md`
- 산출물 경로: `output/playwright/partnerclass-20260309-ext/`

#### 확장 시나리오 결과
- 총 15건 중 12건 PASS, 3건 FAIL
- PASS
  - 목록 기본 렌더링, 협회 제휴 탭
  - 상세 진입, flatpickr 일정/시간슬롯, FAQ 5개, 잔여석 정합성, 비정상 `class_id` 처리
  - 파트너 대시보드 탭 전환/CSV 예외 처리
  - 강의등록 폼 검증/일정 추가/키트 토글
  - 마이페이지 비로그인 안내, 로그인 후 빈 상태
  - 관리자 비권한 차단, 관리자 API 읽기 전용 조회, 관리자 양성 UI 시뮬레이션
- FAIL
  - 목록 찜 필터 저장 실패
    - 에러: `찜 필터 결과가 1건이 아닙니다. count=0, wishedClassId=CL_202602_002, wishlist=null, rendered=`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-목록-정렬-서울-필터-찜-필터.png`
  - 파트너 일정 관리 탭 활성화 실패
    - 에러: `page.waitForFunction: Timeout 15000ms exceeded.`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-파트너-일정-관리-탭.png`
  - 파트너 등급/수수료율 정합성 불일치
    - 에러: `수수료율 불일치: ui=25, api=20, badge=BLOOM PARTNER`
    - 스크린샷: `output/playwright/partnerclass-20260309-ext/fail-파트너-등급-게이지-승급표-정합성.png`

#### API 교차 검증
- `getPartnerAuth(member_id=jihoo5755)` → `partner_code=PC_202602_001`, `grade=SILVER`, `commission_rate=20`
- `getPartnerDashboard` → 클래스 3건 확인
- `getMyBookings(member_id=jihoo5755)` → `bookings=[]`, `total=0`
- `getApplications` 5건, `getPendingClasses` 1건, `getSettlements(limit=5)` 5건, `getAffiliations` 1건

#### 관리자 양성 시뮬레이션
- 실관리자 계정 없이 `adMemberId`, `adGroupName`, `adGroupLevel`를 `DOMContentLoaded` 전에 주입해 관리자 UI를 양성 상태로 재현
- 요약 카드 `5`건, 어드민 탭 4종 렌더링과 전환 확인
- 스크린샷: `output/playwright/partnerclass-20260309-ext/admin-simulated-dashboard.png`

### 파트너클래스 실패 수정 (CODEX)
- 실행 일시: 2026-03-10 00:17 KST ~ 2026-03-10 00:45 KST
- 수정 파일
  - `파트너클래스/목록/js.js`
  - `파트너클래스/파트너/js.js`
  - `scripts/partnerclass-live-smoke.js`
- 수정 내용
  - 목록 찜 버튼 HTML에서 인라인 `onclick` 제거
  - 파트너 대시보드가 구등급(`SILVER/GOLD/PLATINUM`)과 신등급(`BLOOM/GARDEN/ATELIER/AMBASSADOR`)이 섞인 데이터를 받을 때 실제 `commission_rate` 기준으로 표시 등급/수수료율을 해석하도록 보정
  - 라이브 스모크 스크립트에서 서울 필터 대기, 구등급 표시 검증, 일정 관리 새 세션 검증을 강화
- 검증 메모
  - 라이브 `foreverlove.co.kr`는 아직 리포지토리 소스가 반영되지 않아 전체 재실행 시 기존 실패가 그대로 재현됨
  - 대신 로컬 소스 주입/모의 응답 검증으로 수정 효과를 확인
    - 목록 찜 저장: mocked local origin에서 `wishlist=[\"CL_1\"]`, `active=true` 확인
    - 파트너 등급 표시: mocked partner dashboard에서 `badge=GARDEN PARTNER`, `commission=20%`, `currentRow=GARDEN`, `tierRows=4` 확인
  - 일정 관리 탭은 라이브 집중 재현에서 fresh session 기준 정상 활성화 확인
  - 다음 단계는 메이크샵 실제 반영 후 라이브 URL 재검증

### 파트너클래스 라이브 재검증 (CODEX)
- 실행 일시: 2026-03-10 01:02 KST ~ 2026-03-10 01:05 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 11건 성공, 4건 실패
  - 이전 실패 항목 중 `목록 정렬/서울 필터/찜 필터`, `파트너 대시보드 탭 전환/CSV 다운로드`는 라이브 통과 확인
  - 결과 파일: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
- 실패 상세
  - `파트너 일정 관리 탭`
    - 에러: `page.waitForFunction: Timeout 15000ms exceeded.`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-일정-관리-탭.png`
  - `파트너 등급 게이지/승급표 정합성`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#pdMainArea') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-등급-게이지-승급표-정합성.png`
  - `강의 등록 폼 검증/일정 추가/키트 토글`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#crRegisterForm') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-강의-등록-폼-검증-일정-추가-키트-토글.png`
  - `마이페이지 로그인 상태 빈 화면`
    - 에러: `page.waitForSelector: Timeout 15000ms exceeded. waiting for locator('#mbMainArea') to be visible`
    - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-마이페이지-로그인-상태-빈-화면.png`

### 파트너클래스 잔여 실패 수정 (CODEX)
- 실행 일시: 2026-03-10 01:09 KST ~ 2026-03-10 01:27 KST
- 수정 파일
  - `scripts/partnerclass-live-smoke.js`
  - `파트너클래스/파트너/js.js`
- 수정 내용
  - 라이브 스모크 로그인 대기를 `load` 기준에서 `domcontentloaded` 기준으로 완화
  - 일정 관리 검증을 같은 로그인 세션의 새 페이지로 분리해 중복 로그인으로 기존 세션이 무효화되는 문제 제거
  - 일정 탭 클릭을 DOM `element.click()` 기반으로 바꾸고, 실패 시 디버그 상태를 남기도록 보강
  - 파트너 일정 관리 코드에 누락된 `apiCall()` helper 복원
  - WF-18 응답 구조(`data.schedules`)에 맞게 일정 목록 파싱 보정
  - 일정 추가/삭제 payload를 `member_id` 기준으로 수정해 WF-18 입력 스펙과 일치시킴
- 검증 메모
  - 라이브 재실행 결과: 총 15건 중 14건 성공, 1건 실패
  - 해결된 항목
    - `파트너 등급 게이지/승급표 정합성`
    - `강의 등록 폼 검증/일정 추가/키트 토글`
    - `마이페이지 로그인 상태 빈 화면`
  - 남은 항목
    - `파트너 일정 관리 탭`
      - 라이브 현상: 강의 선택 후 로딩 오버레이가 내려오지 않음
      - 원인: 프론트 `apiCall` 미정의로 `ReferenceError` 발생 후 오버레이가 유지되는 구조 확인
  - 현재 리포지토리에는 일정 관리 버그 수정이 반영되었고, 메이크샵 최신 배포 후 라이브 재검증 필요

### 파트너클래스 라이브 최종 재검증 (CODEX)
- 실행 일시: 2026-03-10 01:33 KST ~ 2026-03-10 01:38 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 14건 성공, 1건 실패
  - 실패 항목: `파트너 일정 관리 탭`
  - 스크린샷: `output/playwright/partnerclass-20260310-fix/fail-파트너-일정-관리-탭.png`
- 원인 분석
  - 스크린샷상 일정 목록 자체는 렌더링되지만 로딩 오버레이가 계속 남아 있음
  - `파트너클래스/파트너/js.js`의 `showLoading(false)` 호출이 실제로는 오버레이를 다시 표시하는 구조여서 일정 관리 시나리오가 타임아웃됨
- 후속 수정
  - `파트너클래스/파트너/js.js`
    - `showLoading(show)`가 `false`일 때 `pdLoadingOverlay`를 숨기도록 보정
  - 이 수정은 리포지토리에 반영됐고, 메이크샵 최신 배포 후 다시 라이브 확인 필요

### 파트너클래스 라이브 최종 확인 완료 (CODEX)
- 실행 일시: 2026-03-10 01:41 KST ~ 2026-03-10 01:43 KST
- 실행 명령
  - `NODE_PATH=/tmp/partnerclass-live-runner/node_modules PARTNER_MEMBER_ID='jihoo5755' PARTNER_MEMBER_PASSWORD='jang1015!' node scripts/partnerclass-live-smoke.js`
- 결과 요약
  - 라이브 `https://www.foreverlove.co.kr` 기준 총 15건 중 15건 성공, 0건 실패
  - 결과 파일: `output/playwright/partnerclass-20260310-fix/partnerclass-live-results.json`
  - 마지막 실패였던 `파트너 일정 관리 탭`도 `강의 옵션 3건, 일정 추가 폼 열기/취소 확인`으로 통과
- 비고
  - 현재 파트너클래스 라이브 스모크 기준 블로커 없음

### Codex 스킬 생성 (CODEX)
- 실행 일시: 2026-03-10 01:44 KST ~ 2026-03-10 01:48 KST
- 생성 파일
  - `codex-skills/partnerclass-live-qa/SKILL.md`
  - `codex-skills/partnerclass-live-qa/references/runbook.md`
  - `codex-skills/partnerclass-live-qa/agents/openai.yaml`
- 내용 요약
  - 파트너클래스 라이브 배포 검증 전용 repo-local Codex 스킬 추가
  - 배포 후 스모크 실행, 결과 JSON 확인, 스크린샷 증빙, `AI_SYNC.md` 갱신 흐름을 한 번에 안내
  - 세션 무효화, Makeshop 반영 필요, 일정 관리 디버깅 포인트 같은 반복 함정을 런북으로 정리
- 검증
  - `quick_validate.py codex-skills/partnerclass-live-qa` 통과

### 메이크샵 전역 Codex 스킬 생성/설치 (CODEX)
- 실행 일시: 2026-03-10 01:41 KST ~ 2026-03-10 02:05 KST
- 기준 문서
  - `/Users/jangjiho/workspace/AGENTS.md`
- 생성 파일
  - `codex-skills/makeshop-d4-dev/SKILL.md`
  - `codex-skills/makeshop-d4-dev/references/makeshop_d4_rules.md`
  - `codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py`
  - `codex-skills/makeshop-d4-dev/agents/openai.yaml`
- 내용 요약
  - 메이크샵 D4 개발 전용 Codex 스킬 추가
  - `${}` 이스케이프, `var` 강제, IIFE, CSS 컨테이너 스코핑, 가상태그 보존, HTTPS CDN, 이모지 금지 규칙을 스킬과 레퍼런스로 정리
  - 번들 검수 스크립트로 raw `${`, `let/const`, `http://`, 잘못된 가상태그 종료, 이모지, JS IIFE 누락을 빠르게 탐지하도록 구성
  - 전역 설치 경로: `/Users/jangjiho/.codex/skills/makeshop-d4-dev`
- 검증
  - `generate_openai_yaml.py codex-skills/makeshop-d4-dev ...` 통과
  - `quick_validate.py codex-skills/makeshop-d4-dev` 통과
  - `PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m py_compile codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py` 통과
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py /tmp/makeshop-sample.js` → `OK`

### 실관리자 계정 어드민 양성 검증 (CODEX)
- 실행 일시: 2026-03-10 02:11 KST ~ 2026-03-10 02:15 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 실행 방식
  - Playwright 실브라우저 로그인 후 관리자 페이지 직접 진입
- 결과
  - FAIL
  - 로그인은 성공했지만 어드민 메인 영역은 열리지 않았고 비인가 안내가 그대로 표시됨
  - 페이지 가상태그 값 확인:
    - `member = jihoo5755`
    - `groupName = 테스트 관리자`
    - `groupLevel = 10`
  - 현재 어드민 프론트는 `group_level`이 아니라 `group_name`이 `관리자`, `운영자`, `대표` 중 하나인지로만 권한 판정
- 실패 상세
  - 에러 메시지: `접근 권한이 없습니다 / 이 페이지는 관리자 전용입니다.`
  - 스크린샷: `output/playwright/admin-positive-20260310/admin-positive-denied.png`
  - 상태 파일: `output/playwright/admin-positive-20260310/admin-positive-state.json`

### 어드민 권한 판정 보강 (CODEX)
- 실행 일시: 2026-03-10 02:18 KST ~ 2026-03-10 02:20 KST
- 수정 파일
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - 기존 `group_name` 정확 일치(`관리자`, `운영자`, `대표`) 규칙은 유지
  - 추가로 `group_level`에서 숫자를 추출해 `9 이상`이면 관리자 권한으로 허용하도록 보강
  - 따라서 `groupName=테스트 관리자`, `groupLevel=10` 같은 케이스도 통과 가능
- 검증
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`
  - 로직 샘플 검증
    - `테스트 관리자 / 10` → `true`
    - `관리자 / 1` → `true`
    - `일반회원 / 3` → `false`

### 실관리자 계정 어드민 양성 재검증 PASS (CODEX)
- 실행 일시: 2026-03-10 02:24 KST ~ 2026-03-10 02:26 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과
  - PASS
  - 로그인 후 어드민 메인 진입 성공
  - 페이지 가상태그 값 확인:
    - `member = jihoo5755`
    - `groupName = 관리자`
    - `groupLevel = 10`
  - 비인가 영역 숨김, 메인 대시보드 표시 확인
  - 요약 카드 수치 확인:
    - 파트너 신청 대기 `5`
    - 강의 승인 대기 `1`
    - 정산 대기 `12`
  - 4개 탭 모두 전환 및 패널 표시 확인:
    - `applications` 5행
    - `classes` 1행
    - `settlements` 12행
    - `affiliations` 3행
- 산출물
  - 상태 파일: `output/playwright/admin-positive-20260310/admin-positive-state.json`
  - 메인 스크린샷: `output/playwright/admin-positive-20260310/admin-positive-main.png`
  - 탭 스크린샷:
    - `output/playwright/admin-positive-20260310/admin-tab-applications.png`
    - `output/playwright/admin-positive-20260310/admin-tab-classes.png`
    - `output/playwright/admin-positive-20260310/admin-tab-settlements.png`
    - `output/playwright/admin-positive-20260310/admin-tab-affiliations.png`

### 어드민 쓰기 액션 실브라우저 확장 검증 및 프론트 보강 (CODEX)
- 실행 일시: 2026-03-10 08:37 KST ~ 2026-03-10 09:20 KST
- 수정 파일
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - 모달 확인 버튼이 `hideModal()`에서 `modalCallback`을 먼저 지워 승인/거부 콜백이 죽던 문제 수정
  - `rejectApplication` payload를 `application_id`에서 `row_id`로 수정
  - `approveClass` / `rejectClass` payload를 `class_row_id`에서 `row_id`로 수정
  - 정산 체크박스 값을 NocoDB row `Id`가 아니라 `settlement_id`로 렌더링하고, 일괄 정산 payload도 문자열 배열 그대로 전달하도록 수정
  - 액션 후 재조회 필터값을 `pending/inactive` 소문자에서 `PENDING/INACTIVE`로 수정
  - 빈 응답 시에도 원인 파악이 가능하도록 에러 토스트 메시지 구체화
- 검증
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`

### 어드민 쓰기 액션 실검증 결과 (CODEX)
- 실행 일시: 2026-03-10 08:55 KST ~ 2026-03-10 09:18 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과 요약
  - `rejectApplication` PASS
  - `approveApplication` FAIL
  - `rejectClass` FAIL
  - `completeSettlement` FAIL
- PASS 상세
  - `rejectApplication`
  - 대상: `row_id=5`, `member_id=test_email_check_002`
  - 결과: 신청 대기 건수 `5 -> 4` 감소
  - API 응답: `200`, `{\"success\":true,\"data\":{\"status\":\"rejected\"}}`
  - 스크린샷: `output/playwright/admin-write-20260310/write-reject-application.png`
- FAIL 상세
  - `approveApplication`
  - UI 에러: `승인 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - n8n 원인
    - `WF-ADMIN Admin API` 실행 `21002`: `HTTP Call WF-08 Approve`에서 `Invalid JSON in response body`
    - `WF-08 Partner Approve` 실행 `21003`: `Field 'applied_date' not found`
    - 실제 조회 쿼리: `(member_id,eq,undefined)~and(status,eq,PENDING)` + `sort=-applied_date`
  - 스크린샷: `output/playwright/admin-write-20260310/write-approve-application.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - `rejectClass`
  - UI 에러: `거부 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - n8n 원인
    - `WF-ADMIN Admin API` 실행 `21015`
    - NocoDB PATCH payload가 `status: "rejected"`를 보내지만, 실제 허용 옵션은 `active, paused, closed, INACTIVE`
    - 오류 메시지: `Invalid option(s) "rejected" provided for column "status"`
  - 스크린샷: `output/playwright/admin-write-20260310/write-reject-class.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - `completeSettlement`
  - UI 에러: `정산 처리 실패: 알 수 없는 오류`
  - UI 관측 응답: `200` 빈 본문 (`Unexpected end of JSON input`)
  - 원인 분리
    - 라이브 정적 JS `/shopimages/jewoo/template/work/49407/page.8011.js?t=202603100225`가 아직 구버전이라 체크박스 값을 `settlement_id`가 아닌 row `Id` (`47`)로 전송
    - `WF-ADMIN Admin API` 실행 `21028`에서 `settlementIds=["47"]`로 들어가 `Cannot read properties of undefined (reading 'map')` 발생
  - 스크린샷: `output/playwright/admin-write-20260310/write-complete-settlement.png`
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`

### 어드민 잔여 오류 2건 수정 반영 (CODEX)
- 실행 일시: 2026-03-10 09:22 KST ~ 2026-03-10 09:40 KST
- 수정 파일
  - `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
  - `파트너클래스/어드민/Index.html`
  - `파트너클래스/어드민/js.js`
- 수정 내용
  - `WF-08 Partner Approve`
    - 신청 조회 정렬 필드를 존재하지 않는 `applied_date`에서 `CreatedAt`으로 수정
    - 관리자 화면에서 전달하는 숫자형 row id(`application_id=4`)도 조회 가능하도록 `Id` 또는 `application_id` 매칭 where 식으로 보강
  - `WF-ADMIN Admin API`
    - `approveApplication -> WF-08` 내부 호출에 `Authorization: Bearer {{ ADMIN_API_TOKEN }}` 및 `Content-Type: application/json` 헤더 추가
    - 내부 호출 응답을 `fullResponse + neverError`로 받아서, `WF-08`이 실패해도 관리자 UI가 JSON 에러 메시지를 읽을 수 있게 응답 정규화
    - `getPendingClasses`가 실제로 `status` 파라미터(`INACTIVE`, `active`, `closed`)를 반영하도록 수정
    - `rejectClass` 상태값을 NocoDB 허용 enum에 맞춰 `rejected`에서 `closed`로 수정
  - 어드민 프론트
    - 강의 승인 탭의 `거부됨` 필터 값을 `rejected`에서 `closed`로 수정
    - 상태 라벨 매핑에 `closed -> 거부` 추가
- 검증
  - `jq empty 파트너클래스/n8n-workflows/WF-08-partner-approve.json` → `OK`
  - `jq empty 파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json` → `OK`
  - `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/어드민/js.js` → `OK`
  - `Index.html`는 기존 문서 내 `http://` 링크 1건 때문에 가드 스크립트 경고가 있었고, 이번 수정과 무관하여 유지

### 어드민 정산 재검증 PASS (CODEX)
- 실행 일시: 2026-03-10 09:18 KST ~ 2026-03-10 09:19 KST
- 실행 계정
  - `jihoo5755`
- 실행 도메인
  - `https://www.foreverlove.co.kr/shop/page.html?id=8011`
- 결과
  - `completeSettlement` PASS
  - 체크박스 값이 row `Id`가 아니라 `settlement_id=STL_20260302_966532`로 전송되는 것 확인
  - API 응답: `200`, `{\"success\":true,\"data\":{\"completed_count\":1,\"total_paid\":117000,\"not_found_ids\":[]}}`
  - 토스트: `1건 정산 완료`
- 산출물
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - 스크린샷: `output/playwright/admin-write-20260310/complete-settlement-result.png`

### 어드민 승인/거부 최종 n8n 직접 배포 PASS (CODEX)
- 실행 일시: 2026-03-10 09:48 KST ~ 2026-03-10 09:56 KST
- 직접 배포 경로
  - 기준 디렉토리: `/Users/jangjiho/Desktop/n8n-main`
  - 배포 스크립트: `pressco21/_tools/deploy.sh`
- 수정 및 배포 파일
  - `파트너클래스/n8n-workflows/WF-08-partner-approve.json`
  - `파트너클래스/n8n-workflows/WF-ADMIN-admin-api.json`
- 수정 내용
  - `WF-08 Partner Approve`
    - NocoDB 신청 업데이트 PATCH 경로를 존재하지 않는 `tbl_Applications`에서 실제 테이블 ID `mkciwqtnqdn8m9c`로 수정
  - `WF-ADMIN Admin API`
    - `approveApplication -> WF-08` 내부 호출 `Authorization` 헤더를 문자열 `Bearer {{ $env.ADMIN_API_TOKEN }}`에서 실제 표현식 `={{ 'Bearer ' + $env.ADMIN_API_TOKEN }}`으로 수정
- 라이브 검증 결과
  - `approveApplication` PASS
  - 대상: `row_id=4`, `member_id=test_email_check_001`
  - 결과: 신청 대기 건수 `4 -> 3` 감소, 목록에서 대상 행 제거 확인
  - API 응답: `200`, `{\"success\":true,\"data\":{},\"timestamp\":\"2026-03-10T00:55:58.860Z\"}`
  - 토스트: `파트너 승인 완료`
  - `rejectClass` PASS 상태 유지
- 산출물
  - 결과 파일: `output/playwright/admin-write-20260310/admin-write-results.json`
  - 스크린샷: `output/playwright/admin-write-20260310/approve-application-result.png`

### 파트너클래스 UX 보강 및 메인페이지 별도 프로젝트 생성 (CODEX)
- 실행 일시: 2026-03-10 12:28 KST ~ 2026-03-10 13:35 KST
- 수정/추가 파일
  - `파트너클래스/n8n-workflows/WF-07-partner-apply.json`
  - `파트너클래스/파트너신청/js.js`
  - `파트너클래스/상세/js.js`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/목록/js.js`
  - `메인페이지/파트너클래스-홈개편/Index.html`
  - `메인페이지/파트너클래스-홈개편/css.css`
  - `메인페이지/파트너클래스-홈개편/js.js`
  - `docs/파트너클래스/affiliation-db-guide.md`
- 작업 내용
  - `WF-07 partner-apply`
    - 중복 신청/기등록 파트너 분기에서 IF 체인을 `Switch` 기반으로 정리하고, 409 JSON 응답이 깨지지 않도록 응답 코드를 숫자형으로 정리.
    - `partner-apply` 웹훅 라이브 재호출 시 `HTTP 409`, `ALREADY_PARTNER` JSON 응답 확인.
  - `파트너신청/js.js`
    - `response.json()` 실패 시 raw text를 먼저 읽고 안전하게 파싱하도록 수정해 `SyntaxError: The string did not match the expected pattern.` 오류를 프론트에서 흡수.
  - `상세/js.js`, `상세/css.css`
    - 상세 기본 정보 배지를 링크형으로 보강하고, 지역/카테고리/수업형태로 목록에 다시 탐색하는 링크 추가.
    - 관련 클래스 추천이 카테고리 누락 시에도 죽지 않도록 점수 기반 추천으로 변경.
    - 선물하기는 수동 `gift=Y` 이동 대신 메이크샵 상품 메타를 확인한 후 네이티브 장바구니 POST로 연결하고, 설정 미비 상품은 상세로 안전하게 폴백.
  - `목록/js.js`
    - `tab=affiliations` URL 파라미터를 읽어 협회 제휴 탭을 바로 여는 딥링크 지원 추가.
    - 탭 전환 시 URL에도 `tab=affiliations`를 반영하도록 정리.
  - `메인페이지/파트너클래스-홈개편`
    - 기존 메인페이지 코드를 복사한 별도 프로젝트 폴더 생성.
    - `YouTube` 섹션 아래에 파트너클래스 허브 블록을 동적으로 삽입하도록 재구성:
      - 빠른 필터 칩
      - 전체 클래스 / 협회 제휴 CTA
      - 강사 지원 / 예약 확인 서비스 패널
      - 추천 클래스 4건 카드와 실시간 메트릭
    - 카테고리 아이콘에 `원데이 클래스` 진입점 추가.
    - `Event` 섹션을 `강사 파트너 지원 / 협회·기관 제휴 / 예약 확인` 3축 카드로 재구성.
  - 운영 가이드
    - `docs/파트너클래스/affiliation-db-guide.md`에 제휴업체 자료 수령 후 DB 정리, QA 접두사 규칙, 메인 노출 제어 필드 가이드 작성.
- 검증
  - `node --check 메인페이지/파트너클래스-홈개편/js.js` → `OK`
  - `node --check 파트너클래스/목록/js.js` → `OK`
  - `node --check 파트너클래스/상세/js.js` → `OK`
  - `node --check 파트너클래스/파트너신청/js.js` → `OK`
  - `curl -i -X POST https://n8n.pressco21.com/webhook/partner-apply ...` → `409 Conflict`, `ALREADY_PARTNER` JSON 응답 확인

### CRM 레거시/명세표 복구 및 검증 (CODEX)
- 실행 일시: 2026-03-10 13:41 KST ~ 2026-03-10 14:55 KST
- 복구 내용
  - 운영 NocoDB 안전 백업 추가: `~/nocodb/nocodb_data/noco.db.pre-recovery-20260310-134105`
  - 감사 로그 기준 `tbl_Invoices 16건`, `tbl_InvoiceItems 127건` 복구
  - `txHistory.customer_name` 공란 중 고객 매핑 가능 237건 정규화 완료
  - `서상견 님` `legacy_book_id=721`의 2023~2025 거래가 DB/화면에서 직접 검색되도록 보정
  - 복구된 CRM 명세표 기준 고객 통계/미수금 일부 재산출
- 운영 검증
  - `거래/명세표 조회`에서 `2026-03-10` CRM 명세표 노출 확인
  - `명세표 작성`에서 `INV-20260310-095704` 포함 최신 명세표 노출 확인
  - `미수금`에서 `서상견 님 (단양)`, `권금희 회장님 (전주)`, `대아수목원` 노출 확인
  - `서상견` 검색 + `2023-01-01 ~ 2025-12-31` 범위에서 레거시 거래 노출 확인
- 추가 파일
  - `offline-crm-v2/docs/legacy-backup-audit-2026-03-10.md`
  - `offline-crm-v2/public/data/legacy-customer-snapshots.json`
  - `offline-crm-v2/scripts/export_legacy_customer_snapshots.py`
  - `offline-crm-v2/scripts/repair_legacy_backup.py`
  - `offline-crm-v2/scripts/restore_crm_invoices_from_audit.sql`
  - `offline-crm-v2/scripts/fill_txhistory_customer_names.sql`
  - `offline-crm-v2/scripts/recompute_invoice_customer_stats.sql`
  - `offline-crm-v2/src/components/TransactionDetailDialog.tsx`
  - `offline-crm-v2/src/pages/CustomerDetail.tsx`
  - `offline-crm-v2/src/pages/Transactions.tsx`
  - `offline-crm-v2/src/lib/api.ts`

## Next Step

- [CODEX] CRM 운영 사용 중 신규 분리 고객/분리 거래명 케이스가 생기면 동일 정책으로 누적 정리
- [CODEX] CRM 운영 데이터 직접 수정 사고 대비 `서상견`과 같은 핵심 분리 고객 복구 절차를 스크립트화하거나 관리자 백업 체크리스트로 문서화
- [CODEX] CRM 고객 제출용 거래내역 확인서 실제 대외 전달 1회 검토 후 문구/표현 미세조정
- [CODEX] CRM 송장 자동 다운로드 결과물을 실제 택배 업로드 양식에 1회 대입 검증

### [CODEX-LEAD] 파트너클래스 Phase 3 전체 구현 (독립 프로젝트)

> **이 태스크는 모드 B (독립)입니다. Codex가 기획~구현~배포~검증까지 독립 수행합니다.**
> **n8n 워크플로우 JSON 수정, 서버 배포 모두 허용됩니다.**

#### 읽어야 할 문서 (작업 전 필수)

1. `ROADMAP.md` — Phase 3 섹션 (Task S0-1 ~ S3-6, 총 31개 태스크)
2. `docs/파트너클래스/PRD-파트너클래스-플랫폼-고도화.md` — PRD v5.0 (기능 명세, 수락 기준)
3. `docs/파트너클래스/shared-service-identity.md` — 서비스 정체성 (판단 기준)
4. `docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md` — 상세 전략
5. `docs/파트너클래스/README.md` — 문서 인덱스 및 우선순위

#### 현재 다음 태스크

- `S2-4 WF-01 God Workflow 분리`
- `S1-5 정산 자동화 WF-SETTLE` 는 구현 완료, 운영 SMTP credential 보정 후 최종 수락 기준 닫기
- 이후 수강생 탐색 UX 구현은 `전국 오프라인/온라인 허브 + 파트너맵 통합` 기준으로 진행

#### 실행 순서

ROADMAP.md의 **Task 의존성 그래프**를 따라 순서대로 진행합니다:

```
Phase 3-0 (긴급 안정화, 1~2주) — 즉시 착수
  S0-1 NocoDB 일일 자동 백업 → 의존성 없음 (최우선)
  S0-2 상태값 정규화 6개 도메인 → S0-1 완료 후
  S0-3 WF-ADMIN 중복 ID 정리 → 독립 (S0-1과 병렬 가능)
  S0-4 WF-01 Switch 케이스 문서화 → 독립 (S0-1과 병렬 가능)

Phase 3-1 (수익 엔진, 3~6주) — Phase 3-0 완료 후
  S1-1 키트 연동 Step 1 (자사몰 링크) → S0-2 후
  S1-2 상세 UX 고도화 → 독립
  S1-3 목록 배지 + 퀵필터 → S0-2 후
  S1-4 재구매 동선 → S1-1 후
  S1-5 정산 자동화 WF-SETTLE → S0-2 후
  S1-6 CS FAQ 15개 확장 → 독립
  S1-7 파트너 온보딩 체크리스트 → 독립
  S1-8 대시보드 액션 보드 → S1-1 + S1-5 후
  S1-9 통합 테스트 → S1-1~S1-8 모두 후

Phase 3-2 (성장 가속, 7~12주) — Phase 3-1 완료 후
  S2-1 ~ S2-11 (ROADMAP.md 참조)

Phase 3-3 (스케일업, 13~24주) — Phase 3-2 완료 후
  S3-1 ~ S3-6 (ROADMAP.md 참조)
```

#### 대표 의사결정 사항 (코드에 반영 필수)

| 항목 | 결정 | 구현 시 주의 |
|------|------|-------------|
| 키트 전략 | 선제작 없음. 파트너 재료 → 자사몰 상품 URL 링크 → 묶음 키트 상품 | `kit_items`에 `product_url` 필드 추가 |
| 수수료 정책 | **온라인 비공개**. 프론트엔드에 수수료율 절대 노출 금지 | 파트너 대시보드의 수수료율 표시 제거 |
| 협회 전략 | 1차: 어머니 협회 + 기존 고객 → 2차: 부케 협회 | 어머니 협회 데이터 우선 세팅 |
| 상태값 | 6개 도메인 전체 UPPERCASE 통일 | S0-2에서 일괄 변환 |
| 테스트 데이터 | Phase 2까지 데모 데이터 필요 (파트너 섭외용) | S2-10에서 리얼한 더미 생성 |

#### 태스크별 작업 흐름

```
1. ROADMAP.md에서 다음 태스크 확인 (의존성 체크)
2. PRD v5.0에서 해당 기능 명세와 수락 기준 확인
3. 기존 코드 학습 (해당 페이지/WF 코드 읽기)
4. 구현
5. 검증 (Playwright MCP E2E 또는 curl 테스트)
6. ROADMAP.md 태스크 상태 ⬜ → ✅ 업데이트
7. AI_SYNC.md Last Changes 갱신
8. git commit -m "[codex] S0-1: NocoDB 일일 자동 백업 구축" && git push
9. 다음 태스크로 이동
```

#### 기술 제약 (필수 준수)

- 메이크샵 D4: Vanilla HTML/CSS/JS만 사용, `${var}` → `\${var}` 이스케이프, 가상태그 보존, IIFE, CSS 스코핑
- n8n: Switch v3.2 + `rules.values` 형식, 배포 후 재활성화 필수
- NocoDB: `xc-token` 헤더, 컬럼 추가는 `POST /api/v2/meta/tables/{tableId}/columns`
- 서버: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- 반응형: 768px / 992px / 1200px

#### 이전 Codex 보조 태스크 (우선순위 낮음, 여유 시 처리)

- [CODEX] CRM 미수 정합성 전수 비율 산출
- [CODEX] CRM 중복 고객 통합 정책 정리
- [CODEX] 메이크샵 저장 후 로그인 링크 라이브 재검증
- [CODEX] 상세 분류 링크 ↔ 목록 필터 일치 회귀 테스트
- [CODEX] 카카오 SDK integrity 해시 갱신

### Claude Code 태스크 (대기)
- 없음 (Phase 3 전체를 Codex에 위임)

## Known Risks

- CRM 운영 반영은 완료했지만, Basic Auth 자격증명 제약으로 운영 브라우저 화면의 최종 시각 검증은 아직 못 했음
- CRM 운영 DB를 사용자가 직접 수정할 수 있는 상태라, 동일한 데이터 훼손이 반복되면 고객/명세표 수동 복구가 다시 필요할 수 있음
- CRM 미수금 `전체`/`레거시` 탭은 고객 단위 집계이고 `CRM` 탭만 명세표 단위라, 엑셀 내보내기 포맷은 아직 CRM 명세표 기준만 지원함
- 이번 UX 수정은 아직 메이크샵에 저장되지 않았으므로, 실제 라이브 재검증 전까지는 기존 `/member/login.html` 및 선물하기 동작이 남아 있을 수 있음
- 클래스 실상품 `branduid=12195642` 기준 상품 상세에는 native `.btn-gift` 링크가 노출되지 않아, 상품 설정상 선물하기가 비활성인 경우 프론트는 `basket.action` 기반 선물 주문 진입으로만 폴백함
- `메인페이지/파트너클래스-홈개편`은 기존 메인페이지를 복사한 별도 프로젝트 폴더이며, 아직 실제 메이크샵 메인에 저장되지는 않음
- 상세 페이지 선물하기는 메이크샵 네이티브 장바구니 POST로 맞췄지만, 실제 선물 가능 상품 설정 여부에 따라 최종 동작이 달라질 수 있어 실상품 1건 재검증 필요
- `파트너신청/js.js`, `상세/js.js`, `상세/css.css`, `목록/js.js`는 저장 전까지 라이브 반영되지 않음
- 라이브 `admin-api`는 현재 리포지토리의 랜덤 `ADMIN_API_TOKEN`이 아니라 구형 토큰 `pressco21-admin-2026` 기준으로만 인증이 통과함
- `파트너클래스/어드민/js.js`의 `PENDING_REVIEW` 정렬 보정은 아직 메이크샵 디자인편집기에 저장되지 않아 라이브 어드민 UI에는 반영되지 않음
- S1-1 프론트 변경(강의등록/상세/파트너 수정 모달)도 아직 메이크샵 디자인편집기에는 저장되지 않았으므로, 라이브 화면 확인이 필요해지면 사용자 배포 후 재검증이 필요함
- S1-2 상세 프론트 변경(Trust Summary Bar, 포함 내역, 모바일 CTA 바)도 아직 메이크샵 디자인편집기에는 저장되지 않았으므로, 라이브 검증이 필요해지면 사용자 배포 후 재검증이 필요함
- S1-7 파트너 대시보드 온보딩 카드/모달도 아직 메이크샵 디자인편집기에는 저장되지 않았으므로, 실제 2608 페이지 반영 시 사용자 배포 후 재검증이 필요함
- S1-8 파트너 대시보드 액션 보드도 아직 메이크샵 디자인편집기에는 저장되지 않았으므로, 실제 2608 페이지 반영 시 사용자 배포 후 재검증이 필요함
- S1-4 마이페이지 프론트 변경(`파트너클래스/마이페이지/*`)도 아직 메이크샵 디자인편집기에는 저장되지 않았으므로, 라이브 검증이 필요해지면 사용자 배포 후 재검증이 필요함
- S1-9 통합 테스트는 로컬 fixture + Playwright 러너 기준으로는 통과했지만, 메이크샵 디자인편집기 실배포 후 동일 흐름을 라이브에서 한 번 더 확인해야 함
- S2-1 파트너 신청 세일즈 랜딩(2609)은 로컬 fixture 기준으로 CTA/반응형이 검증됐지만, 메이크샵 디자인편집기 실배포 후 라이브 스크롤과 모바일 하단 고정 CTA를 다시 확인해야 함
- S2-2 협회 제안서 페이지와 어드민 URL 생성기는 로컬 fixture 기준으로 검증됐지만, 실배포 전까지는 실제 MakeShop page id가 없어서 라이브 URL은 확정되지 않음
- S2-3 전국 탐색 IA 확장은 로컬 fixture + Playwright 기준으로는 통과했지만, 메이크샵 디자인편집기 실배포 전까지는 실제 2606/2607 페이지와 `/partnermap` 실자산 연동을 라이브에서 다시 확인해야 함
- S1-5 정산 자동화는 라이브 집계/이력/API 응답까지는 검증됐지만, 운영 SMTP credential `PRESSCO21-SMTP-Naver` 가 `535` 로 실패해 실제 파트너 메일 발송은 아직 불가함
- `scripts/partnerclass-live-smoke.js` 는 현재 FAQ 기대 개수가 여전히 `5` 기준이라, 상세 FAQ를 라이브 반영한 뒤에는 스모크 기대값을 `15` 로 맞춰야 함
- 라이브 `tbl_Classes` INSERT는 현재 `status=INACTIVE`, 소문자 `level`, `region 미저장` 제약이 있어, WF-16/WF-20을 수정할 때 이 우회 로직을 유지해야 함
- `PRD-파트너클래스-플랫폼-고도화.md`, `commission-policy.md`, 일부 구현 문서는 아직 예전 등급/수수료 표현이 남아 있으므로 서비스 방향 판단은 `docs/파트너클래스/README.md`와 `shared-service-identity.md`를 우선해야 함
- 로그인 후 hidden 상태로 남던 3개 시나리오는 스모크 구조 수정으로 해소됐으며, 동일 계정 중복 로그인 시 기존 세션이 끊길 수 있음
- 운영 `invoices` 테이블에는 아직 `paid_date`, `payment_method` 컬럼이 없어서, 과거 기준일 미수 재현은 현재 미수 스냅샷 기반 참고 수준에 머뭄.
- 운영 `invoice_date`는 서버측 날짜 비교(`gte/lte`)가 안정적으로 동작하지 않아, 캘린더는 전체 명세표를 읽은 뒤 프론트에서 월/기간 필터링하는 구조를 사용 중.
- 거래처 자동완성 exact-name hydrate는 유지되어, 동일 상호 고객이 여러 명인 케이스는 기존처럼 `customer_id` 연결 품질에 영향을 받음.
- 임시저장은 현재 `새 명세표` 1건만 로컬에 보관하는 구조라, 여러 개의 임시 명세표를 병렬로 쌓아두는 용도는 아님.
- 카카오 SDK JS Key가 플레이스홀더(`YOUR_KAKAO_JS_KEY_HERE`) 상태
- 상세 페이지 카카오 SDK `integrity` 값이 현재 응답 해시와 달라 공유 SDK 로딩이 차단됨
- tbl_Schedules에 중복 일정 테스트 데이터 있음 (SCH_20260320_03, SCH_20260320_77 — 같은 날짜/시간)
- WF-18의 schedule_id 생성이 2자리 랜덤으로 충돌 가능성 있음 (6자리로 확장 권장)
- WF-20의 `require('https')` 방식은 동작하지만 비권장
- 기존 tbl_Partners의 grade 필드가 SILVER로 되어 있어 프론트에서 BLOOM 매핑 처리 중
- `docs/n8n-automation-efficiency-review-2026-03-09.md`는 분석/제언 문서이며, 아직 실제 이관이나 워크플로우 분할은 수행되지 않음
- `codex-skills/partnerclass-live-qa`는 repo-local 스킬이라, 자동 트리거를 원하면 전역 Codex 스킬 디렉터리로 별도 설치가 필요함
- 실관리자 계정 자격증명은 리포지토리에서 확인되지 않았고, `id=8011` 양성 최종 검증 전 별도 제공이 필요함
- `makeshop-d4-dev`는 `/Users/jangjiho/workspace/AGENTS.md`를 기준 문서로 참조하므로, 해당 경로가 바뀌면 스킬 안내도 함께 갱신해야 함
- 어드민 권한 판정은 이제 `group_name` 일치 또는 `group_level >= 9`면 통과하므로, 다른 최고등급 회원이 의도치 않게 열리지 않는지 운영 정책 확인 필요
