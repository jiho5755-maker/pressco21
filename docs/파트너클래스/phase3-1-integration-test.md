# Phase 3-1 통합 테스트

작성일: 2026-03-11

## 목적

S1-1부터 S1-8까지 들어간 화면과 운영 흐름이 한 번에 이어지는지 로컬 Playwright 기준으로 다시 검증한다.

## 범위

- 목록: 신뢰 배지, 지역/형태 퀵 필터, 오프라인 지도 진입점
- 상세: Trust Bar, 재료 카드, FAQ 15개 fallback, 재료 장바구니 담기
- 마이페이지: 수강 완료 후 재료 재구매, 같은 강사 추천
- 파트너 대시보드: 온보딩 체크리스트, 액션 보드, 클래스 수정 모달 키트 프리필
- 어드민 정산: 주문 합계/수수료 합계 표시, 정산 실행 실패 토스트

## 실행 자산

- 픽스처 빌드: `scripts/build-partnerclass-playwright-fixtures.js`
- 통합 러너: `scripts/partnerclass-phase3-integration-runner.js`
- 로컬 조립 페이지: `output/playwright/fixtures/partnerclass/*.html`

## 실행 방법

1. 정적 서버 실행
   - `python3 -m http.server 8125 --bind 127.0.0.1 --directory /Users/jangjiho/workspace/pressco21`
2. Playwright 라이브러리 준비
   - `npm install --prefix /Users/jangjiho/workspace/pressco21/.playwright-tools playwright@1.58.2`
3. 통합 러너 실행
   - `NODE_PATH=/Users/jangjiho/workspace/pressco21/.playwright-tools/node_modules node /Users/jangjiho/workspace/pressco21/scripts/partnerclass-phase3-integration-runner.js`

## 2026-03-11 실행 결과

- 목록
  - 초기 카드 3개 로드
  - 첫 카드 배지 `신규 / 인기 / 마감임박`
  - `서울 + 오프라인` 퀵 필터 후 카드 1개로 축소
- 상세
  - Trust Bar 표시
  - 재료 카드 2개 렌더링
  - `환불` 검색 시 FAQ 결과 1개
  - 재료 장바구니 담기 요청 1회 발생
- 마이페이지
  - 전체 2건, 완료 1건
  - 재료 칩 2개
  - 같은 강사 추천 2개
- 파트너 대시보드
  - 온보딩 진행률 `3/5 완료`
  - 액션 보드 `오늘 수업 1건 / 키트 준비 2건 / 미답변 후기 2건`
  - 클래스 수정 모달에서 키트 2행 프리필 확인
  - 액션 카드 클릭 후
    - `오늘 수업 -> 일정 관리 + CL_202603_001 선택`
    - `키트 준비 -> 예약 현황 + custom 기간 + CL_202603_001 선택`
    - `미답변 후기 -> 후기 관리`
- 어드민 정산
  - 주문 합계 `136,000원`
  - 수수료 합계 `34,000원`
  - 정산 실행 시 실패 토스트 노출
  - 실패 메시지: SMTP credential 오류(`535 Username and Password not accepted`)

## 산출물

- `output/playwright/s1-9-phase3-1/phase3-1-results.json`
- `output/playwright/s1-9-phase3-1/list-flow.png`
- `output/playwright/s1-9-phase3-1/detail-flow.png`
- `output/playwright/s1-9-phase3-1/mypage-flow.png`
- `output/playwright/s1-9-phase3-1/partner-flow.png`
- `output/playwright/s1-9-phase3-1/admin-flow.png`

## 메모

- 정산 구간은 UI와 집계 계산까지 검증됐고, 실제 파트너 메일 발송만 운영 SMTP blocker 때문에 계속 실패한다.
- 이 문서는 메이크샵 디자인편집기 실배포 전 로컬/목업 기준 통합 검증 문서다.
