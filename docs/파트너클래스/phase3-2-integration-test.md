# Phase 3-2 통합 테스트

작성일: 2026-03-11

## 목적

S2-1부터 S2-10까지 붙인 성장 가속 기능이 실제 서비스 여정 단위로 이어지는지 다시 검증한다.

- 파트너 영업 플로우: 세일즈 랜딩 -> 신청 -> 온보딩 -> 첫 수업 -> 정산
- 협회 B2B 플로우: 제안서 생성 -> ROI 시뮬레이션 -> 협회 등록 맥락 -> 혜택 확인
- 캐시 레이어: L1/L2/L3 hit 동작
- WF-01 공개 read API: router/split 회귀 일치

## 실행 자산

- 메인 통합 러너: `scripts/partnerclass-s2-11-growth-integration-runner.js`
- 재사용 러너:
  - `scripts/partnerclass-s2-10-demo-runner.js`
  - `scripts/partnerclass-s2-8-cache-runner.js`
- 픽스처 빌드:
  - `scripts/build-partnerclass-playwright-fixtures.js`

## 실행 방법

1. 픽스처 및 Playwright 환경 준비
   - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules`
2. 통합 러너 실행
   - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-11-growth-integration-runner.js`

## 2026-03-11 실행 결과

### 파트너 영업 플로우

- 세일즈 랜딩 신청 성공
  - 완료 문구: `신청이 접수되었습니다!`
  - 신청 ID: `APP_S2_11_001`
  - 제출 payload에 회원 ID, 연락처, 포트폴리오 URL 정상 포함
- 데모 시나리오 재검증
  - 온보딩 진행률: `3/5 완료`
  - 오늘 수업: `3건`
  - 첫 수업 예약 모드: `WITH_KIT`
  - 장바구니 요청: `2건`
- 정산 구간
  - 관리자 정산 실행 시 실패 토스트 정상 노출
  - 현재 실패 원인은 기능 결함이 아니라 운영 SMTP blocker
  - 메시지: `535 Username and Password not accepted`

### 협회 B2B 플로우

- 어드민 협회 탭
  - 협회 rows `2`
  - 월간 집계 rows `1`
  - 맞춤 제안서 URL 생성 정상
- 제안서 미리보기
  - 협회명: `부케디자인협회`
  - 할인율: `15%`
  - ROI 변경 후 연간 구매액: `35,280,000원`
  - 달성 단계: `3단계`
  - 예상 인센티브: `1,400,000원`
- 목록 허브 연동
  - 세미나 수: `2`
  - 협회 수: `2`
  - 혜택 포인트: `5`
  - 혜택 카드: `5`
  - 연계 클래스: `2`

### 캐시 검증

- L1 목록 캐시
  - overall hit rate: `50%`
  - repeat hit rate: `100%`
- L2 설정 캐시
  - categories repeat hit rate: `100%`
  - affiliations repeat hit rate: `100%`
  - 상세 후기 등록 후 invalidation 정상
  - TTL 강제 만료 후 재호출 정상
- L3 n8n workflow staticData
  - categories: miss execution `49214`, hit execution `49215`
  - affiliations: miss execution `49216`, hit execution `49217`
  - miss 시 `Store ... Cache` 노드 실행
  - hit 시 NocoDB read 노드 우회 확인
  - repeat hit rate: `100%`

### WF-01 분리 회귀

- `getClasses`: status/body 일치, total `7`
- `getClassDetail`: status/body 일치, first partner `장지호 (테스트 파트너)`
- `getCategories`: status/body 일치, count `3`
- `getAffiliations`: status/body 일치, count `1`
- `getContentHub`: status/body 일치, highlight count `4`
- `getSchedules`: status/body 일치
- `getRemainingSeats`: status/body 일치
- `INVALID_ACTION`: `400`, code `INVALID_ACTION`

## 산출물

- `output/playwright/s2-11-phase3-2/phase3-2-results.json`
- `output/playwright/s2-11-phase3-2/sales-landing-flow.png`
- `output/playwright/s2-11-phase3-2/affiliation-b2b-flow.png`
- 재사용 결과:
  - `output/playwright/s2-10-demo/demo-results.json`
  - `output/playwright/s2-8-cache/cache-results.json`

## 메모

- 이번 문서는 메이크샵 디자인편집기 실배포 전 로컬 fixture + live API 기준 통합 검증 문서다.
- 메이크샵 실배포 후에는 실제 `2606/2607/2608/2609` 흐름을 live 브라우저에서 한 번 더 확인해야 한다.
- 정산/알림 계열은 UI와 집계 흐름까지는 통과했지만, 운영 SMTP credential blocker는 아직 남아 있다.
