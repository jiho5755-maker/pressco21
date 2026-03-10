# S1-4 수강완료 -> 재구매 동선 가이드

작성일: 2026-03-10

## 목적

- 수강 완료 이후 흐름을 `후기 작성 -> 같은 강사 다음 수업 탐색 -> 재료 재구매`로 자연스럽게 잇는다.
- 파트너클래스의 수강생 경험을 예약 종료형이 아니라 재방문형으로 바꾼다.
- 커뮤니티 활성화가 자사몰 재료/키트 구매로 이어지도록 마이페이지와 이메일을 같이 보강한다.

## 반영 범위

### 마이페이지

- 파일
  - `파트너클래스/마이페이지/Index.html`
  - `파트너클래스/마이페이지/css.css`
  - `파트너클래스/마이페이지/js.js`
- 변경 사항
  - `다가오는 수업`과 `수강 완료 후 다시 보기` 2개 섹션으로 예약 내역을 분리한다.
  - 수강 완료 카드 상단에 후기 유도 히어로를 추가한다.
  - `후기 작성하기`, `수업 다시 보기` CTA를 같은 카드 안에 둔다.
  - 상세 API의 `kit_items`를 읽어 `이 수업 재료 다시 보기` 칩 리스트를 노출한다.
  - 같은 파트너/강사의 다른 공개 클래스를 `같은 강사의 다른 클래스` 카드로 추천한다.

### 이메일

- 파일
  - `파트너클래스/n8n-workflows/WF-12-review-requests.json`
- 변경 사항
  - 후기 요청 CTA를 메인 홈이 아니라 실제 클래스 상세 경로로 연결한다.
  - 이메일 안에 `내 수강 내역` 복귀 문구를 넣어 재료 재구매와 다음 수업 탐색 흐름을 이어준다.

## 구현 메모

- 마이페이지는 `WF-19 my-bookings` 응답만으로는 추천 정보가 부족하므로 프론트에서 `WF-01 class-api`를 추가 호출한다.
- 데이터 조합 방식
  - 예약 목록: `my-bookings`
  - 추천 클래스 목록: `class-api getClasses`
  - 수강 완료 상세/키트 정보: `class-api getClassDetail`
- 추천 기준
  - 현재 수강 완료 클래스의 `partner_name`과 동일한 공개 클래스를 최대 3개까지 추천한다.
- 키트 재구매 기준
  - `detail.kit_items[{ name, product_url, quantity, price }]`가 있으면 우선 노출한다.
  - 키트가 없으면 상세 페이지 링크로 fallback 한다.

## 메이크샵 제약 대응

- JS는 IIFE + `var` 기준으로 유지한다.
- CSS는 `#partnerclass-my-bookings` 컨테이너 ID로 스코핑한다.
- D4 guard의 `http://` 경고는 SVG `xmlns` 값 기준 false positive다.

## 검증

- 정적 검증
  - `node --check 파트너클래스/마이페이지/js.js`
  - `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `node`로 `WF-12-review-requests.json` 파싱 + `wf12-build-emails` 코드 구문 검사
- Playwright 로컬 모킹 검증
  - 전체 2건, 예정 1건, 완료 1건 카운트 확인
  - `수강 완료 후 다시 보기` 섹션 렌더링 확인
  - `후기 작성하기` CTA 확인
  - `로즈 패키지` 등 키트 재구매 칩 확인
  - `같은 강사의 다른 클래스` 추천 카드 확인
- 산출물
  - `output/playwright/s1-4-20260310/mypage-repurchase-flow.png`
