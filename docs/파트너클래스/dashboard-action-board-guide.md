# 파트너 대시보드 액션 보드 가이드

작성일: 2026-03-11

## 목적

S1-8 액션 보드는 파트너가 대시보드 첫 화면에서 바로 처리해야 할 일을 보게 만드는 요약 레이어다. 온보딩 체크리스트가 `첫 예약 전 준비 상태`를 다룬다면, 액션 보드는 `이미 운영 중인 파트너의 오늘 작업`을 다룬다.

## 화면 구조

- 위치: `파트너클래스/파트너/Index.html`
  - 온보딩 카드 아래
  - 요약 KPI 카드 위
- 카드 3종
  - `오늘 수업`
  - `키트 준비`
  - `미답변 후기`

## 데이터 구성

별도 `WF-ADMIN getPartnerActionItems` 액션을 추가하지 않고, 기존 응답을 프론트에서 조합한다.

- `getPartnerDashboard`
  - 파트너 클래스 목록 확보
- `getClassDetail`
  - 클래스별 일정, `kit_items` 유무 확인
- `getPartnerBookings`
  - 오늘~7일 예약건 확인
- `getPartnerReviews`
  - 미답변 후기 수 확인

## 집계 규칙

### 오늘 수업

- 기준: 오늘 날짜 일정 중 `booked_count > 0`
- 클릭 동작:
  - `일정 관리` 탭 이동
  - 해당 일정이 있는 첫 클래스 자동 선택
  - 일정 목록 재조회

### 키트 준비

- 기준:
  - 오늘~7일 예약 중
  - 상태가 `cancelled/completed/failed` 가 아님
  - 연결된 클래스에 `kit_items` 가 1개 이상 있음
- 클릭 동작:
  - `예약 현황` 탭 이동
  - 기간을 `custom` 으로 전환
  - 오늘~7일 범위 자동 입력
  - 관련 첫 클래스 자동 선택

### 미답변 후기

- 기준: `getPartnerReviews.summary.unanswered_count`
- 클릭 동작:
  - `후기 관리` 탭 이동
  - 후기 리스트 영역으로 스크롤

## 빈 상태 규칙

- 등록 클래스가 0개면 설명 문구를 `아직 등록된 수업이 없습니다. 첫 강의를 만들어 보세요.` 로 변경
- 카드 수치는 모두 `0건`
- `오늘 수업`, `키트 준비` 클릭 시 새 강의 등록 모달을 연다
- `미답변 후기`는 탭 이동만 유지한다

## 구현 메모

- 파일:
  - `파트너클래스/파트너/Index.html`
  - `파트너클래스/파트너/css.css`
  - `파트너클래스/파트너/js.js`
- 상태는 `actionBoardState` 로 관리한다.
- 비동기 중복 반영 방지를 위해 `actionBoardLoadToken` 을 사용한다.
- 갱신 트리거:
  - 대시보드 최초 로딩
  - 클래스 수정 성공
  - 수업 상태 변경 성공
  - 일정 추가/삭제 성공
  - 후기 답변 성공

## 검증

- 정적 검증
  - `node --check 파트너클래스/파트너/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
    - `http://` 경고는 SVG namespace/data URI 기준 false positive
- Playwright 로컬 목킹
  - populated 시나리오
    - `오늘 수업 1건 / 키트 준비 2건 / 미답변 후기 3건`
    - 각 카드 클릭 시 `일정 관리 / 예약 현황 / 후기 관리` 로 이동 확인
  - empty 시나리오
    - 설명 문구, `0건` 수치, 빈 상태 레이아웃 확인
- 산출물
  - `output/playwright/s1-8-action-board/action-board-populated.png`
  - `output/playwright/s1-8-action-board/action-board-empty-state.png`
