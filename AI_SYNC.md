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
- Started At: —
- Branch: main
- Working Scope: —
- Active Subdirectory: —

## Files In Progress

- (none)

## Last Changes (2026-03-09)

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

## Next Step

### Codex CLI 위임 태스크
- [CODEX] offline-crm-v2 E2E 테스트 04~09 작성 (상세 지침: offline-crm-v2/AGENTS.md 참조)
- [CODEX] 파트너클래스/파트너/css.css 중복 스타일 정리
- [CODEX] 파트너클래스/상세/js.js 코드 리뷰 및 리팩토링 제안
- [CODEX] 필요 시 `codex-skills/partnerclass-live-qa`를 전역 Codex 스킬 디렉터리로 설치

### Claude Code 태스크
- 파트너클래스 상세 페이지 카카오 SDK `integrity` 해시 불일치 수정
- 실관리자 계정으로 `id=8011` 최종 양성 시나리오 재검증
- CRM 운영 확인: 실제 운영 브라우저에서 `미수금` 복구와 `캘린더 2026-03-09 8건` 표기를 확인
- 캘린더 운영 판단: 과거 기준일 `미수 후속`은 현재 미수 기준 참고용이라는 점을 UX 문구로 더 명확히 할지 검토
- 필요 시 캘린더 3단계: 최근 미주문 고객/고액 미수 고객 추천과 후속 액션 버튼 추가
- n8n 효율화 검토 문서 기준으로 `offline-crm-v2`의 프록시 이관 여부와 `WF-05` 분할 착수 여부 결정
- 카카오 JS Key 실제 발급 후 교체 필요

## Known Risks

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
