# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소와 하위 폴더를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

## Mandatory Rules

1. 작업 시작 전에 이 파일과 `git status --short`를 먼저 확인합니다.
2. `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일을 수정하지 않습니다.
3. 첫 수정 전에 아래 `Session Lock`과 `Files In Progress`를 갱신합니다.
4. 작업 종료 전 `Last Changes`, `Next Step`, `Known Risks`를 갱신합니다.
5. `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행합니다.

## Session Lock

- Current Owner: CODEX
- Mode: IDLE
- Started At: 2026-03-09 16:05:00 KST
- Branch: main
- Working Scope: Calendar current-state analysis and upgrade proposal prepared.
- Active Subdirectory: offline-crm-v2

## Files In Progress

(없음 — 분석만 수행)

## Last Changes (2026-03-09)

### CRM 수정
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
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.
  - 운영 주소 `https://crm.pressco21.com` 기준 최신 빌드 반영 완료.

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

## Next Step

- 캘린더 고도화 1단계: Dashboard와 동일한 기간 KPI/프리셋/통합 매출 계산 로직을 Calendar로 이관.
- 캘린더 고도화 2단계: 날짜 클릭 시 `명세표/미수금/재방문 대상` 액션 패널 추가.
- CRM 운영 확인: 토스트 우하단, 과세 기본값, 거래처 자동완성, 검색/임시저장 플로우
- 파트너클래스 E2E: 일정 관리/강의 등록/키트 배송/마이페이지 전체 흐름 테스트
- Phase 1 Task 005-1: 통합 테스트
- 카카오 JS Key 실제 발급 후 교체 필요

## Known Risks

- 거래처 자동완성 exact-name hydrate는 유지되어, 동일 상호 고객이 여러 명인 케이스는 기존처럼 `customer_id` 연결 품질에 영향을 받음.
- 임시저장은 현재 `새 명세표` 1건만 로컬에 보관하는 구조라, 여러 개의 임시 명세표를 병렬로 쌓아두는 용도는 아님.
- 카카오 SDK JS Key가 플레이스홀더(`YOUR_KAKAO_JS_KEY_HERE`) 상태
- tbl_Schedules에 중복 일정 테스트 데이터 있음 (SCH_20260320_03, SCH_20260320_77 — 같은 날짜/시간)
- WF-18의 schedule_id 생성이 2자리 랜덤으로 충돌 가능성 있음 (6자리로 확장 권장)
- WF-20의 `require('https')` 방식은 동작하지만 비권장
- 기존 tbl_Partners의 grade 필드가 SILVER로 되어 있어 프론트에서 BLOOM 매핑 처리 중
