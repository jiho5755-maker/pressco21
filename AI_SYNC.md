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
- Mode: WRITE
- Started At: 2026-03-09 15:00:00 KST
- Branch: main
- Working Scope: Improve toast UX, invoice taxable default sync, and invoice customer autocomplete keyboard UX.
- Active Subdirectory: offline-crm-v2

## Files In Progress

- offline-crm-v2/src/App.tsx
- offline-crm-v2/src/pages/Settings.tsx
- offline-crm-v2/src/components/ProductDialog.tsx
- offline-crm-v2/src/components/InvoiceDialog.tsx

## Last Changes (2026-03-09)

### CRM 수정
- `offline-crm-v2/src/components/ProductDialog.tsx`
  - 새 제품 등록 시 `is_taxable` 기본값이 설정값(`default_taxable`)을 따르도록 수정.
  - `default_taxable`가 `0/1`, `true/false`, 문자열로 들어와도 boolean으로 정규화되도록 보강.
- `offline-crm-v2/src/pages/Settings.tsx`
  - `새 품목 기본값: 과세 (10%)` 체크박스의 fallback 기본값을 해제 상태로 조정.
  - 현재 운영 설정 레코드의 `default_taxable` 값이 `0`인 것도 확인.
- `offline-crm-v2/src/pages/Invoices.tsx`
  - 명세표 다이얼로그를 닫을 때 `selectedId/copySourceId`를 같이 초기화.
  - `dialogOpen`일 때만 `InvoiceDialog`를 마운트하도록 바꿔 새 명세표 재오픈 시 이전 거래처 상태가 남지 않게 수정.
- 운영 배포
  - `npm run build` 통과.
  - `bash deploy/deploy.sh`로 운영 재배포 완료.

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

### 서버 배포 (n8n)
- WF-01 재배포 (schedules 확장)
- WF-05 재배포 (수수료율 + booked_count 증가 로직)
- WF-16 재배포 (초기 일정 저장 로직)
- WF-19 신규 배포 (ID: Zvk8akZ20VnfsQeN)
- WF-20 신규 배포 (ID: EHjVijWGTkUkYNip)

## Next Step

- E2E 테스트: 대시보드 일정 관리 탭 동작 확인, 강의 등록 시 일정 저장 확인, 결제 시 booked_count 증가 확인
- Phase 1 Task 005: 재료키트 자동 배송 연동
- 수강생 마이페이지 예약 확인 프론트 UI
- 카카오 JS Key 실제 발급 후 교체 필요

## Known Risks

- 카카오 SDK JS Key가 플레이스홀더(`YOUR_KAKAO_JS_KEY_HERE`) 상태
- tbl_Schedules에 중복 일정 테스트 데이터 있음 (SCH_20260320_03, SCH_20260320_77 — 같은 날짜/시간)
- WF-18의 schedule_id 생성이 2자리 랜덤으로 충돌 가능성 있음 (6자리로 확장 권장)
- WF-20의 `require('https')` 방식은 동작하지만 비권장
- 기존 tbl_Partners의 grade 필드가 SILVER로 되어 있어 프론트에서 BLOOM 매핑 처리 중
