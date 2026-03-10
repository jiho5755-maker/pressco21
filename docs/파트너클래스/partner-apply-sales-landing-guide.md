# 파트너 신청 세일즈 랜딩 가이드

작성일: 2026-03-11

## 목적

파트너 신청 페이지(2609)를 단순 신청 폼이 아니라 `세일즈 랜딩 + 신청 전환` 구조로 재정의한다.

- 핵심 메시지: `강의만 잘하시면 됩니다. 나머지는 PRESSCO21이 합니다.`
- 공개 화면에서는 수수료율보다 운영 지원, 홍보, 키트·재료 연결, 성장 구조를 전면에 둔다.
- 신청 CTA는 히어로, 상단 내비게이션, 하단 고정 바 3군데에서 모두 폼으로 연결한다.

## 구현 범위

### 메이크샵 페이지

- `파트너클래스/파트너신청/Index.html`
- `파트너클래스/파트너신청/css.css`
- `파트너클래스/파트너신청/js.js`

### 테스트 자산

- `scripts/build-partnerclass-playwright-fixtures.js`
  - 로컬 fixture 빌드 대상에 `apply.html` 추가
- 산출물
  - `output/playwright/s2-1-partner-apply/partner-apply-results.json`
  - `output/playwright/s2-1-partner-apply/*.png`

## 정보 구조

페이지 흐름은 아래 순서로 고정한다.

1. 고정 상단 헤더
   - `운영 지원 / 성장 경로 / 신청하기` 점프 버튼
2. 히어로
   - 핵심 카피
   - 1차 CTA `지금 신청하기`
   - 2차 CTA `자세히 알아보기`
   - 운영 지원 패널
3. 혜택 스트립
   - 운영 피로 감소 / 노출 확대 / 커머스 연결
4. 운영 지원 4카드
   - 홍보와 발견 / 키트와 재료 / 예약과 정산 / 협회와 확장
5. 비교 테이블
   - `직접 운영 vs PRESSCO21`
6. 적합 파트너 / 신청 후 흐름
7. 성장 경로
   - `BLOOM -> GARDEN -> ATELIER -> AMBASSADOR`
8. 사회적 증거
   - 파트너 후기 2개 + 수강생 관점 1개
9. 신청 프로세스
10. 실제 신청 폼
    - 좌측 요약 카드 + 우측 폼
11. 하단 고정 CTA

## 구현 원칙

- 기존 로그인 분기, 이미 신청/이미 파트너 분기, 제출 웹훅 로직은 유지한다.
- 신청 폼 필드 구조는 바꾸지 않는다.
- CTA 스크롤은 `js-scroll-link` + `data-target` 구조로 통일한다.
- 메이크샵 저장 안정성을 위해 아래 규칙을 유지한다.
  - JS는 IIFE + `var`
  - raw `${` 금지
  - CSS 전부 `.partner-apply` 스코프 유지
  - 가상태그 `<!--/user_id/-->` 유지

## 검증 결과

### 정적 검증

- `node --check 파트너클래스/파트너신청/js.js`
- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/파트너신청/Index.html 파트너클래스/파트너신청/css.css 파트너클래스/파트너신청/js.js`

### Playwright 로컬 검증

fixture:

- `output/playwright/fixtures/partnerclass/apply.html`

결과:

- 데스크톱
  - 비교 테이블 5행 렌더링
  - 성장 카드 4개 렌더링
  - 지원 카드 4개 렌더링
  - CTA 클릭 후 폼 섹션 `formTop ~= 106px`
- 모바일
  - 하단 고정 CTA 표시
  - 상단 점프 버튼 3개 표시
  - CTA 클릭 후 폼 섹션 `formTop ~= 16px`

## 후속 메모

- 실제 메이크샵 디자인편집기 반영 후에는 2609 라이브 페이지에서 한 번 더 CTA 스크롤과 모바일 하단 고정 바를 확인해야 한다.
- 협회 B2B 영업 도구(S2-2)는 이 랜딩의 메시지 구조를 재사용하되, 협회 혜택과 ROI 시뮬레이터 중심으로 확장한다.
