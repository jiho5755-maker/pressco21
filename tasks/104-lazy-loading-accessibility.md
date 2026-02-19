# Task 104: 전체 사이트 이미지 lazy loading + 접근성

> **상태**: 대기
> **규모**: S
> **예상 기간**: 1~2일
> **의존성**: 없음

## 목표

전체 배포 프로젝트의 이미지에 lazy loading을 적용하고, 접근성(alt 텍스트, ARIA 속성)을 개선한다.

## 대상 파일

- `메인페이지/Index.html`
- `간편 구매/index.html`
- `1초 로그인(킵그로우)/회원 로그인/index.fixed.html`
- `1초 로그인(킵그로우)/구매시 로그인/index.fixed.html`
- `1초 로그인(킵그로우)/주문 조회 로그인/Index.fixed.html`
- `유튜브 자동화/현재-배포/` (해당 HTML 파일)
- `브랜드스토리/브랜드페이지/index.html` (Phase 1b에서 리뉴얼 예정이므로 최소한만)
- `레지너스 화이트페이퍼/index.html` (Phase 1b에서 리뉴얼 예정이므로 최소한만)

**제외**: `파트너맵/` (이미 접근성 WCAG 2.2 준수)

## 현재 상태 분석

### lazy loading 현황
| 프로젝트 | 상태 | 비고 |
|---------|------|------|
| 메인페이지 | 미적용 | 모든 이미지 `src` 직접 로드 |
| 간편 구매 | 미적용 | 상품 이미지 즉시 로드 |
| 1초 로그인 x3 | 해당 없음 | 이미지 거의 없음 (로고 정도) |
| 유튜브 자동화 | 부분 적용 | 썸네일 Intersection Observer 사용 |
| 브랜드스토리 | 미적용 | 대형 PNG 갤러리 이미지 다수 |
| 레지너스 화이트페이퍼 | 미적용 | 다수의 섹션 이미지 |
| 파트너맵 | 적용 완료 | 접근성 포함 완료 (제외) |

### 접근성 현황
| 프로젝트 | alt 텍스트 | ARIA 속성 | 비고 |
|---------|-----------|----------|------|
| 메인페이지 | 부분적 (일부 빈 alt) | 미적용 | 인터랙티브 요소 role 없음 |
| 간편 구매 | 부분적 | 미적용 | 탭, 버튼에 role 없음 |
| 1초 로그인 | 미적용 | 미적용 | 토글, 탭에 aria 없음 |
| 유튜브 | 부분적 | 미적용 | 영상 제목으로 alt 가능 |
| 파트너맵 | 적용 완료 | 적용 완료 | WCAG 2.2 준수 (제외) |

## 구현 단계

- [ ] **1단계: 이미지 lazy loading 일괄 적용**
  - 각 프로젝트 HTML 파일에서 `<img>` 태그 전수 조사
  - **적용 기준**:
    - 첫 화면(Above the fold) 이미지: `loading="eager"` 유지 + `fetchpriority="high"`
    - 하단 섹션 이미지: `loading="lazy"` 추가
  - CLS 방지: `width`/`height` 속성 또는 `aspect-ratio` CSS 추가
  - 메이크샵 가상태그로 렌더링되는 이미지는 제외 (서버 사이드 생성)

- [ ] **2단계: alt 텍스트 추가/개선**
  - 모든 `<img>` 태그에 의미 있는 `alt` 텍스트 작성
  - **작성 기준**:
    - 상품 이미지: "상품명 - 카테고리" (예: "압화 에코백 키트 - DIY")
    - 배너: 배너 내용 요약 (예: "2026 봄 신상품 런칭 배너")
    - 아이콘: 기능 설명 (예: "장바구니 담기")
    - 순수 장식: `alt=""` (빈 alt)
  - 메이크샵 가상태그 이미지는 치환코드 기반 alt 검토

- [ ] **3단계: 인터랙티브 요소 ARIA 속성**
  - **탭 메뉴** (메인페이지, 간편 구매):
    - `role="tablist"`, `role="tab"`, `role="tabpanel"`
    - `aria-selected="true/false"`, `aria-controls="panelId"`
  - **토글 버튼** (1초 로그인 아이디 로그인 토글):
    - `role="button"`, `aria-expanded="true/false"`
  - **모달/레이어**:
    - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
  - **폼 요소**:
    - `aria-label` 또는 `aria-labelledby` 연결
    - 에러 메시지에 `role="alert"`

- [ ] **4단계: 키보드 네비게이션 확인**
  - 탭 메뉴: 좌/우 화살표로 탭 이동, Enter로 선택
  - 모달: Escape로 닫기, 포커스 트래핑
  - `tabindex` 적절히 설정 (인터랙티브 요소만)

## 수락 기준

- [ ] 배너 제외 하단 이미지에 `loading="lazy"` 적용되어 있다
- [ ] 모든 `<img>` 태그에 의미 있는 `alt` 텍스트가 있다 (장식 이미지는 `alt=""`)
- [ ] 탭 메뉴에 `role="tablist/tab/tabpanel"` + `aria-selected` 적용
- [ ] 토글 버튼에 `aria-expanded` 적용
- [ ] 기존 기능에 영향이 없다
- [ ] 메이크샵 가상 태그가 보존되어 있다

## 테스트 체크리스트

- [ ] PC/모바일 브라우저 테스트
- [ ] 이미지 lazy loading 동작 확인 (Chrome DevTools Network 탭)
- [ ] 스크린 리더 테스트 (macOS VoiceOver)
- [ ] 키보드 탭 순서 확인 (Tab/Shift+Tab)
- [ ] Lighthouse Accessibility 점수 측정
- [ ] 이미지 CLS(Layout Shift) 발생 여부 확인
- [ ] 콘솔 에러 0개 확인

## 참고

- Phase 1b에서 리뉴얼 예정인 브랜드스토리/화이트페이퍼는 최소한의 lazy loading만 적용
- 파트너맵은 이미 WCAG 2.2 준수하므로 제외
- 메이크샵 가상태그 이미지(`<!--/img_src/-->` 등)는 서버 렌더링이므로 JS로 후처리 필요할 수 있음

## 변경 사항 요약

### 메인페이지/Index.html
1. 손상된 모바일 배너 이미지 태그 수정 (line 21)
2. 카테고리 아이콘 7개: `alt=""` → 의미 있는 alt + `loading="lazy"`
3. 서브 배너 이미지 7개: alt 설명 강화 + `loading="lazy"`
4. 레진공예 슬라이드 누락 img 태그 복원
5. DIY 슬라이드 손상된 img 태그 복원
6. 플레이스홀더 상품 이미지 4개: alt 텍스트 + `loading="lazy"`
7. 탭 메뉴: `role="tablist"`, `role="tab"`, `aria-selected`, `role="presentation"` 추가

### 메인페이지/js.js
1. `initTabs`: 탭 전환 시 `aria-selected` 동적 토글 추가

### 간편 구매/index.html
1. 탭 네비게이션: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `id` 추가
2. 탭 콘텐츠 4개: `role="tabpanel"`, `aria-labelledby` 추가

### 1초 로그인 x3
1. 회원 로그인, 구매시 로그인, 주문 조회 로그인: 토글 버튼에 `role="button"`, `aria-expanded="false"`, `aria-controls` 추가
2. 로그인 폼에 `id="traditionalLoginForm"` 추가

### 브랜드스토리/브랜드페이지/index.html
1. 갤러리 이미지 10개: `loading="lazy"` 추가
2. 책 표지 이미지 4개: `loading="lazy"` 추가
3. 투명 식물 표본 이미지: `loading="lazy"` 추가
4. CTA 섹션 이미지: `loading="lazy"` 추가

### 미수정 (Phase 1b 또는 제외)
- 메이크샵 가상태그 이미지(`<!--/..@image_l/-->`)는 서버 렌더링이므로 직접 수정 불가 → JS `applyLazyLoading`이 처리
- 레지너스 화이트페이퍼: 이미지 0개, 수정 불필요
- 파트너맵: 이미 WCAG 2.2 준수, 제외
