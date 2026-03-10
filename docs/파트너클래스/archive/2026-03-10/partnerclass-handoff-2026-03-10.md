# 파트너클래스 Handoff 2026-03-10

## 목적

Codex를 재시작한 뒤에도 바로 이어서 작업할 수 있도록, 2026-03-10 기준 파트너클래스 최근 상태와 보류 항목을 정리한다.

## 현재 상태 요약

- 파트너클래스 핵심 통합 테스트 범위는 카카오 SDK 이슈를 제외하면 대부분 완료된 상태다.
- 어드민 양성 검증과 쓰기 액션 검증도 라이브 기준으로 한 차례 끝냈다.
- 이번 최신 수정은 라이브 UX 결함 보정용이다.
  - 로그인 버튼이 `/member/login.html`로 가서 죽는 문제 수정
  - 상세 `선물하기`를 메이크샵 기본 선물 주문 흐름에 맞추는 보정
  - 상세 분류 링크와 목록 필터 값 불일치 수정
- 최신 관련 커밋은 [d9be746](https://github.com/jiho5755-maker/pressco21/commit/d9be746) 이다.

## 이번에 확인된 실제 라이브 문제

### 1. 로그인 버튼 비정상

- 재현 페이지: `2609 파트너신청`
- 기존 링크: `/member/login.html`
- 실제 응답: `204`
- 정상 경로: `/shop/member.html?type=login`
- 증빙: [ux-audit-results.json](/Users/jangjiho/workspace/pressco21/output/playwright/partnerclass-ux-20260310/ux-audit-results.json)

### 2. 상세 선물하기 비정상

- 재현 페이지: `2607 상세`
- 기존 동작:
  - 날짜/시간 선택 후 `선물하기` 클릭
  - 메이크샵 선물 주문서가 아니라 일반 `shopdetail.html?branduid=...` 로만 이동
- 실측 결과:
  - 클래스 실상품 `branduid=12195642` 기준 상품 상세에서 native `.btn-gift`는 노출되지 않음
  - 대신 `basket.action.html` POST 응답에는 `etc_data.add_rand_url = "?direct_order=giveapresent"` 가 반환됨
- 이번 수정 방향:
  - 상품 상세에서 native gift 링크가 있으면 우선 사용
  - 없으면 `basket.action.html` POST 후 `/shop/order.html + add_rand_url` 로 이동

### 3. 상세 분류 링크 비정상

- 기존 생성값 예시:
  - `level=beginner`
  - `region=서울 강남구`
- 목록 필터 실제 기준:
  - 난이도: `입문`, `중급`, `심화`
  - 지역: `서울`, `경기`, `인천`, `부산`, `대구`, `기타`
- 이번 수정으로 상세 링크를 목록 필터 체계에 맞게 정규화했다.

## 이번에 수정한 파일

### 파트너신청 `2609`

- 폴더: [파트너클래스/파트너신청](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너신청)
- 파일:
  - [Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너신청/Index.html)
  - [js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너신청/js.js)

변경:
- 로그인 안내 링크를 `/shop/member.html?type=login` 으로 수정
- JS 폴백에 `returnUrl` 추가

### 파트너 대시보드 `2608`

- 폴더: [파트너클래스/파트너](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너)
- 파일:
  - [Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너/Index.html)
  - [js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너/js.js)

변경:
- 로그인 안내 링크/폴백 경로 수정

### 강의등록 `8009`

- 폴더: [파트너클래스/강의등록](/Users/jangjiho/workspace/pressco21/파트너클래스/강의등록)
- 파일:
  - [Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/강의등록/Index.html)
  - [js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/강의등록/js.js)

변경:
- 로그인 안내 링크/폴백 경로 수정

### 마이페이지 `8010`

- 폴더: [파트너클래스/마이페이지](/Users/jangjiho/workspace/pressco21/파트너클래스/마이페이지)
- 파일:
  - [Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/마이페이지/Index.html)

변경:
- 로그인 안내 링크 수정

### 교육 `2610`

- 폴더: [파트너클래스/교육](/Users/jangjiho/workspace/pressco21/파트너클래스/교육)
- 파일:
  - [Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/교육/Index.html)
  - [js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/교육/js.js)

변경:
- 로그인 안내 링크/폴백 경로 수정

### 상세 `2607`

- 폴더: [파트너클래스/상세](/Users/jangjiho/workspace/pressco21/파트너클래스/상세)
- 파일:
  - [js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/상세/js.js)
  - [css.css](/Users/jangjiho/workspace/pressco21/파트너클래스/상세/css.css)

변경:
- `buildLoginUrl()` 추가
- 리뷰 작성/예약/선물하기 로그인 이동 경로 통일
- `normalizeLevelValue()` 추가
- `getRegionFilterValue()` 추가
- 상세 분류 링크를 목록 필터 체계로 정규화
- 선물하기를 메이크샵 native gift 링크 우선, `basket.action -> order.html` 폴백 구조로 변경
- 선물하기 버튼 loading 상태 추가

## 메이크샵 저장 필요 파일

아래 파일들은 커밋은 되었지만, 메이크샵 저장 여부는 별도 확인이 필요하다.

### 저장 대상

- `2609 파트너신청`
  - [파트너클래스/파트너신청/Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너신청/Index.html)
  - [파트너클래스/파트너신청/js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너신청/js.js)
- `2608 파트너 대시보드`
  - [파트너클래스/파트너/Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너/Index.html)
  - [파트너클래스/파트너/js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/파트너/js.js)
- `8009 강의등록`
  - [파트너클래스/강의등록/Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/강의등록/Index.html)
  - [파트너클래스/강의등록/js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/강의등록/js.js)
- `8010 마이페이지`
  - [파트너클래스/마이페이지/Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/마이페이지/Index.html)
- `2610 교육`
  - [파트너클래스/교육/Index.html](/Users/jangjiho/workspace/pressco21/파트너클래스/교육/Index.html)
  - [파트너클래스/교육/js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/교육/js.js)
- `2607 상세`
  - [파트너클래스/상세/js.js](/Users/jangjiho/workspace/pressco21/파트너클래스/상세/js.js)
  - [파트너클래스/상세/css.css](/Users/jangjiho/workspace/pressco21/파트너클래스/상세/css.css)

## 재시작 후 가장 먼저 할 일

1. `AI_SYNC.md` 읽기
2. `git pull --ff-only`
3. `git status --short`
4. 메이크샵 저장 여부 확인
5. 저장이 끝났다면 아래 순서로 라이브 재검증

## 재검증 우선순위

### P0

1. `2609 파트너신청`
   - 로그인 버튼 클릭 시 `/shop/member.html?type=login...` 으로 이동하는지
2. `2607 상세`
   - 날짜 선택
   - 시간 선택
   - `선물하기` 클릭 시 `선물 주문하기` 흐름으로 들어가는지
3. `2607 상세`
   - `클래스 더 둘러보기`의 카테고리/난이도/지역 링크가 목록 필터와 실제 맞는지

### P1

4. `2608`, `8009`, `8010`, `2610`
   - 로그인 안내 링크가 모두 정상 이동하는지

## 아틀라스 브라우저 메모

- `/Applications/ChatGPT Atlas.app` 설치 확인
- `Info.plist` 기준 Chromium 계열 브라우저로 보임
- 직접 자동화하려면 보통 `remote-debugging-port` 를 열고 Playwright가 CDP attach 해야 함
- 현재까지는 Atlas 세션 직접 attach 테스트는 아직 시작하지 않았음

## 주요 증빙 파일

- [ux-audit-results.json](/Users/jangjiho/workspace/pressco21/output/playwright/partnerclass-ux-20260310/ux-audit-results.json)
- [partner-apply-login-click.png](/Users/jangjiho/workspace/pressco21/output/playwright/partnerclass-ux-20260310/partner-apply-login-click.png)
- [detail-gift-after-click.png](/Users/jangjiho/workspace/pressco21/output/playwright/partnerclass-ux-20260310/detail-gift-after-click.png)
- [detail-classification-link-result.png](/Users/jangjiho/workspace/pressco21/output/playwright/partnerclass-ux-20260310/detail-classification-link-result.png)

## 주의

- 대화에서 제공된 테스트 계정 자격증명은 저장소 문서에 기록하지 않았다.
- 재검증 시에는 최신 대화에서 받은 계정을 다시 사용하거나 별도 안전한 주입 방식으로 환경변수에 넣는 쪽이 맞다.
