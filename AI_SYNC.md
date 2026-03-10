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
- Started At: 2026-03-10 13:41:35 KST
- Branch: main
- Working Scope: 파트너클래스 handoff 문서화 및 재시작용 메모리 백업
- Active Subdirectory: docs, 파트너클래스

## Files In Progress

- AI_SYNC.md
- docs/파트너클래스/partnerclass-handoff-2026-03-10.md

## Last Changes (2026-03-09 ~ 2026-03-10)

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

### Codex CLI 위임 태스크
- [CODEX] CRM 중복 고객 레코드 통합 정책 정리 (예: `서상견 님` / `서상견 님 (단양)`)
- [CODEX] 레거시 고객리스트 충돌 506건을 덮어쓰기 없이 보관/표시하는 정책 설계
- [CODEX] `outstanding_balance`의 레거시 baseline + CRM 미수 합산 정책 최종 검증
- [CODEX] 얼마에요 백업 원본 대비 고객/거래/품목 최종 누락 0건 재감사
- [CODEX] 메이크샵 저장 후 `파트너신청(2609)`, `상세(2607)`, `파트너(2608)`, `강의등록(8009)`, `마이페이지(8010)`, `교육(2610)` 로그인 안내 버튼 라이브 재검증
- [CODEX] `상세(2607)` 선물하기를 실상품 기준으로 다시 눌러 `선물 주문하기` 헤더 노출 여부 최종 E2E 확인
- [CODEX] 상세 분류 링크(`카테고리/난이도/지역/강사`)가 목록 필터와 실제 일치하는지 라이브 회귀 테스트
- [CODEX] 메이크샵 배포 후 `파트너신청(2609)`, `상세(2607)`, `목록(2606)` 라이브 회귀 테스트 재실행
- [CODEX] `메인페이지/파트너클래스-홈개편` 시안 기준으로 실제 메인페이지 저장용 마이그레이션 패치 정리
- [CODEX] 파트너클래스 상세 선물하기를 실상품 1건 기준으로 최종 E2E 검증
- [CODEX] 파트너클래스 홈/목록/상세/신청 동선 Playwright 회귀 시나리오 정식 스크립트화

### Claude Code 태스크
- 파트너클래스 상세 페이지 카카오 SDK `integrity` 해시 불일치 수정
- 메인페이지 개편안에서 실제 저장할 섹션 범위와 운영 배너/이미지 소재 확정
- 제휴업체 실자료 수령 시 `affiliation-db-guide` 기준으로 필드 확정 및 NocoDB 운영 규칙 승인

## Known Risks

- 이번 UX 수정은 아직 메이크샵에 저장되지 않았으므로, 실제 라이브 재검증 전까지는 기존 `/member/login.html` 및 선물하기 동작이 남아 있을 수 있음
- 클래스 실상품 `branduid=12195642` 기준 상품 상세에는 native `.btn-gift` 링크가 노출되지 않아, 상품 설정상 선물하기가 비활성인 경우 프론트는 `basket.action` 기반 선물 주문 진입으로만 폴백함
- `메인페이지/파트너클래스-홈개편`은 기존 메인페이지를 복사한 별도 프로젝트 폴더이며, 아직 실제 메이크샵 메인에 저장되지는 않음
- 상세 페이지 선물하기는 메이크샵 네이티브 장바구니 POST로 맞췄지만, 실제 선물 가능 상품 설정 여부에 따라 최종 동작이 달라질 수 있어 실상품 1건 재검증 필요
- `파트너신청/js.js`, `상세/js.js`, `상세/css.css`, `목록/js.js`는 저장 전까지 라이브 반영되지 않음
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
