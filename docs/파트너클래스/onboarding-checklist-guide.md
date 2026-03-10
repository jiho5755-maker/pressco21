# 파트너 온보딩 체크리스트 가이드

작성일: 2026-03-11

## 목적

`파트너클래스/파트너/` 대시보드에 신규 파트너용 온보딩 체크리스트를 넣어 첫 예약 전까지 필요한 행동을 순서대로 안내한다.

## 적용 범위

- 대상 페이지: `2608` 파트너 대시보드
- 적용 파일:
  - `파트너클래스/파트너/Index.html`
  - `파트너클래스/파트너/css.css`
  - `파트너클래스/파트너/js.js`

## 온보딩 5단계

1. 프로필 완성
2. 교육 이수
3. 첫 강의 등록
4. 일정 추가
5. 키트 설정

모든 단계가 끝나면 체크리스트 카드는 숨기고 완료 모달을 1회 노출한다. 완료 문구는 `첫 예약을 받을 준비가 끝났어요` 로 고정한다.

## 상태 판단 기준

- `프로필 완성`
  - `studio_name`, `phone`, `introduction` 필수
  - `instagram_url` 또는 `kakao_channel` 중 1개 이상 필요
- `교육 이수`
  - `getEducationStatus` 또는 `getPartnerAuth`의 `education_completed`
- `첫 강의 등록`
  - `getPartnerDashboard.data.classes.length > 0`
- `일정 추가`
  - `getClassDetail.data.schedules.length > 0`
- `키트 설정`
  - `kit_enabled = 1` 이고 `kit_items.length > 0`

## UX 규칙

- 첫 진입 시 미완료 파트너는 체크리스트 모달을 자동으로 1회 연다.
- 카드와 모달 모두 같은 진행률을 쓴다.
- 현재 단계의 CTA는 바로 다음 행동으로 연결한다.
- CTA 매핑:
  - 프로필: 프로필 편집 모달
  - 교육: `/shop/page.html?id=2610`
  - 강의: 새 강의 등록 안내 모달
  - 일정: 일정 관리 탭 전환 + 첫 강의 자동 선택 + 일정 폼 열기
  - 키트: 내 강의 탭 전환 + 첫 강의 수정 모달 열기

## 저장 규칙

- localStorage key prefix: `partnerDash_onboarding_{memberId}_*`
- 저장 항목:
  - `auto_open_progress`
  - `complete_modal_shown`
  - `progress`

## 검증 결과

- `node --check 파트너클래스/파트너/js.js`
- MakeShop D4 가드 확인
  - `http://` 경고는 SVG `xmlns` / data URI 기반 오탐만 존재
- Playwright 로컬 목킹 검증 완료
  - 미완료 파트너:
    - 진행률 `3/5 완료`
    - 모달 CTA `일정 등록하기`
    - 클릭 시 `일정 관리` 탭 전환 + 첫 강의 자동 선택 + 일정 폼 노출 확인
  - 완료 파트너:
    - 체크리스트 카드 숨김 확인
    - 완료 모달 자동 노출 확인

## 스크린샷

- `output/playwright/s1-7-onboarding/incomplete-onboarding-schedule.png`
- `output/playwright/s1-7-onboarding/complete-onboarding-modal.png`
