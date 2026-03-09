# AI Sync Board

이 파일은 Claude Code와 Codex CLI가 같은 저장소와 하위 폴더를 교대로 작업할 때 충돌을 줄이기 위한 공용 인수인계 보드입니다.

## Mandatory Rules

1. 작업 시작 전에 이 파일과 `git status --short`를 먼저 확인합니다.
2. `Current Owner`가 다른 에이전트이고 `Mode`가 `WRITE`면 파일을 수정하지 않습니다.
3. 첫 수정 전에 아래 `Session Lock`과 `Files In Progress`를 갱신합니다.
4. 작업 종료 전 `Last Changes`, `Next Step`, `Known Risks`를 갱신합니다.
5. `git commit`, 브랜치 변경, 의존성 설치, lockfile 수정, dev server 재시작은 기록 후 한 번에 한 에이전트만 수행합니다.

## Session Lock

- Current Owner: CLAUDE
- Mode: READ
- Started At: 2026-03-09 14:20:00 KST
- Ended At: 2026-03-09
- Branch: main
- Working Scope: 파트너클래스 Phase 0 완료 + Phase 1 핵심 태스크 001~004 완료
- Active Subdirectory: 파트너클래스

## Files In Progress

(없음 — 세션 종료)

## Last Changes (2026-03-09)

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

### 서버 배포 (n8n)
- WF-01 재배포 (schedules 확장)
- WF-05 재배포 (수수료율)
- WF-19 신규 배포 (ID: Zvk8akZ20VnfsQeN)
- WF-20 신규 배포 (ID: EHjVijWGTkUkYNip)

## Next Step

- Phase 1 남은 작업: 강의 등록(8009) 일정 입력, 대시보드 스케줄 탭, 수강생 마이페이지 UI
- Phase 1 Task 005: 재료키트 자동 배송 연동
- WF-16 강의 등록 시 tbl_Schedules 초기 일정 동시 저장
- WF-05 결제 완료 시 booked_count 증가 로직 추가
- 카카오 JS Key 실제 발급 후 교체 필요

## Known Risks

- 카카오 SDK JS Key가 플레이스홀더(`YOUR_KAKAO_JS_KEY_HERE`) 상태
- tbl_Schedules에 중복 일정 테스트 데이터 있음 (SCH_20260320_03, SCH_20260320_77 — 같은 날짜/시간)
- WF-18의 schedule_id 생성이 2자리 랜덤으로 충돌 가능성 있음 (6자리로 확장 권장)
- WF-20의 `require('https')` 방식은 동작하지만 비권장
- 기존 tbl_Partners의 grade 필드가 SILVER로 되어 있어 프론트에서 BLOOM 매핑 처리 중
