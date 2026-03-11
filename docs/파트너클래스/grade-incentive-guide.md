# S3-2 등급별 비금전적 인센티브 가이드

작성일: 2026-03-11

## 목적

Phase 3 스케일업 구간에서 파트너 성장의 체감 가치를 금전 외 노출, 브랜딩, 멘토링 기회로 확장한다.

이번 구현은 수강생에게는 더 신뢰할 만한 파트너를 먼저 보이게 하고, 파트너에게는 등급이 올라갈수록 운영 화면과 노출 레이어가 실제로 달라진다는 점을 보여주는 1차 레이어다.

## 등급별 노출 원칙

- `BLOOM`
  - 기본 등급. 일반 카드와 동일 레벨로 노출
- `GARDEN`
  - 파트너 대시보드 혜택 패널 진입
  - 목록 추천 레일 우선 노출
  - 신뢰 배지 노출 시작
- `ATELIER`
  - GARDEN 혜택 포함
  - 대시보드 전용 배너 메시지
  - 콘텐츠 허브 인터뷰 후보 노출
  - 상세 연관 클래스 추천 우선도 강화
- `AMBASSADOR`
  - ATELIER 혜택 포함
  - 목록 추천 최상단 우선도
  - 콘텐츠 허브 멘토 파트너 라벨
  - 메인 노출/멘토링 후보용 스포트라이트 라벨

## 반영 화면

### 1. 파트너 대시보드 `2608`

- 위치: 수익 탭 내부 `등급 혜택` 패널
- 구현 포인트:
  - 현재 등급 요약 배지
  - 현재 받을 수 있는 비금전적 혜택 하이라이트
  - 상위 등급 비교 카드 3장
- 핵심 문구 예시:
  - `ATELIER 파트너는 브랜드 스토리 레이어까지 확장됩니다.`

### 2. 목록 `2606`

- `혜택·이벤트` 레일과 추천 카드에서 `GARDEN` 이상 우선 노출
- 우선순위 정렬 기준:
  - `partner_grade > avg_rating > class_count > total_remaining`
- 카드에는 등급 칩을 추가해 수강생이 신뢰 근거를 즉시 인지하도록 한다.

### 3. 상세 `2607`

- 연관 클래스 추천 점수에 파트너 등급 가중치를 추가한다.
- `GARDEN` 이상은 연관 카드 태그에 등급 라벨을 선행 노출한다.
- 목적은 `비슷한 수업 중 더 신뢰할 만한 파트너`를 먼저 보여주는 것이다.

### 4. 콘텐츠 허브

- 파트너 스토리 카드는 등급 우선순위로 정렬한다.
- 스포트라이트 라벨:
  - `GARDEN` → `추천 파트너`
  - `ATELIER` → `인터뷰 후보`
  - `AMBASSADOR` → `멘토 파트너`

## 구현 파일

- `파트너클래스/파트너/Index.html`
- `파트너클래스/파트너/css.css`
- `파트너클래스/파트너/js.js`
- `파트너클래스/목록/css.css`
- `파트너클래스/목록/js.js`
- `파트너클래스/상세/css.css`
- `파트너클래스/상세/js.js`
- `파트너클래스/콘텐츠허브/css.css`
- `파트너클래스/콘텐츠허브/js.js`
- `scripts/partnerclass-s3-2-incentive-runner.js`

## 검증

### 정적 검증

- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `http://www.w3.org/2000/svg` 는 SVG namespace false positive
- `node --check` 로 JS 문법 확인

### Playwright 검증

- 실행:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-2-incentive-runner.js`
- 결과:
  - 대시보드 배지: `ATELIER PARTNER`
  - 대시보드 현재 티어: `ATELIER`
  - 추천 레일 첫 카드: `앰배서더 온라인 세미나`
  - 상세 연관 추천 첫 태그: `ATELIER`
  - 콘텐츠 허브 첫 스토리: `AMBASSADOR / 멘토 파트너`
- 산출물:
  - `output/playwright/s3-2-incentives/incentive-results.json`
  - `output/playwright/s3-2-incentives/partner-grade-benefits.png`
  - `output/playwright/s3-2-incentives/list-benefit-priority.png`
  - `output/playwright/s3-2-incentives/detail-related-priority.png`
  - `output/playwright/s3-2-incentives/content-hub-story-priority.png`

## 남은 확인

- 메이크샵 디자인편집기 실배포 전이므로 실제 운영 `2606/2607/2608` 화면에서 최종 육안 확인은 아직 남아 있다.
