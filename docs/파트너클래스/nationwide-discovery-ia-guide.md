# 전국 탐색 IA 확장 가이드

작성일: 2026-03-11

## 목적

S2-3의 목적은 파트너클래스를 `클래스 목록`에서 `전국 탐색 허브`로 올리는 것이다.

- 수강생은 `카테고리 + 지역 + 형태` 기준으로 전국 클래스를 찾는다.
- 오프라인 클래스는 `리스트 보기 / 지도 보기` 전환으로 파트너맵 탐색까지 이어진다.
- 협회 레이어는 `협회/세미나`, `협회원 혜택`을 같은 허브 안에서 분리 탐색한다.
- 상세 페이지는 `일반 클래스 / 협회 전용 / 세미나·이벤트` 성격을 상단에서 바로 이해할 수 있어야 한다.

## 구현 범위

### 목록 2606

- 탭을 `전체 클래스 / 협회·세미나 / 혜택·이벤트` 3개로 확장
- `전체 클래스` 탭에 `리스트 보기 / 지도 보기` 토글 추가
- 지도 보기는 실서비스에서 `/partnermap`로 연결되고, 로컬 Playwright 검증에서는 `partnermap-shell.html` fixture 로 대체
- 카드 데이터에 `content_type`, `delivery_mode`, `class_format` 이 있으면 우선 사용하고, 없으면 `type/tags/affiliation_code` 기반으로 폴백 추론
- `협회·세미나` 탭은 기존 `getAffiliations` + 현재 클래스 데이터로 세미나 피드/협회 카드/요약 지표를 렌더링
- `혜택·이벤트` 탭은 협회 할인, 재료 재구매, 이벤트성 클래스, 파트너맵 탐색을 한 번에 제안

### 상세 2607

- 상단에 `detail-identity` 영역 추가
- `GENERAL / AFFILIATION / EVENT` 3가지 프로필로 상단 카피, 하이라이트, 신뢰 바 칩, 예약 노트를 변경
- 기존 데이터에 `content_type` 이 없으면 협회 코드, 태그, 클래스명으로 추론해 기본값 `GENERAL` 적용
- 오프라인 콘텐츠는 `파트너맵에서 공방 보기` 링크를 상세 탐색 링크와 강사/공방 섹션에 추가

## 데이터 사용 원칙

- 프론트는 `content_type`, `delivery_mode`, `class_format` 필드를 읽을 준비가 되어 있다.
- 실데이터에 해당 필드가 아직 없더라도 기존 클래스가 깨지지 않게 폴백 추론을 유지한다.
- 따라서 메이크샵 실배포 전에도 로컬 fixture 기준으로 IA와 상세 분기 UX를 먼저 검증할 수 있다.

## 로컬 검증

- fixture 빌드:
  - `node scripts/build-partnerclass-playwright-fixtures.js`
- Playwright 결과:
  - `output/playwright/s2-3-ia/s2-3-results.json`
  - `output/playwright/s2-3-ia/list-map-view.png`
  - `output/playwright/s2-3-ia/list-affiliations-tab.png`
  - `output/playwright/s2-3-ia/list-benefits-tab.png`
  - `output/playwright/s2-3-ia/detail-*.png`

검증 기준:

- 탭 3개가 모두 렌더링되는가
- 지도 보기 전환 시 파트너맵 통합 영역과 오프라인 스포트라이트 카드가 노출되는가
- 온라인 필터만 선택하면 지도 보기 버튼이 비활성화되는가
- 상세 `GENERAL / AFFILIATION / EVENT` 각각에서 상단 정체성 카피와 trust chip 이 달라지는가

## 실배포 메모

- 현재 검증은 로컬 fixture 기준이다.
- 메이크샵 디자인편집기 실배포 후에는 실제 `/shop/page.html?id=2606`, `/shop/page.html?id=2607` 에서 같은 흐름을 다시 확인해야 한다.
- 실서비스에서는 지도 iframe 이 `output/playwright/...` 가 아니라 기존 `/partnermap` 자산으로 연결된다.
