# Phase 2.7 UX 통합 테스트 + Lighthouse 체크리스트

작성일: 2026-02-26
버전: Phase 2.7
작성자: QA/테스트 전문가 에이전트
참조 Task: Task 316
관련 Task: Task 310, 311, 312, 313, 314, 315

---

## 개요

### 이 체크리스트가 다루는 범위

| Task | 기능 | 페이지 |
|------|------|--------|
| Task 310 | 상세 페이지 공유 (카카오톡 + URL 복사 + Web Share API) | 클래스 상세 (id=2607) |
| Task 311 | 찜(관심) + 최근 본 클래스 | 클래스 목록 (id=2606) |
| Task 312 | 이미지 라이트박스 + 관련 클래스 추천 | 클래스 상세 (id=2607) |
| Task 313 | 수익 시각화 (Chart.js 바 차트 + 등급 게이지) | 파트너 대시보드 (id=2608) |
| Task 314 | 파트너 프로필 편집 + CSV 내보내기 | 파트너 대시보드 (id=2608) |
| Task 315 | 메인페이지 클래스 진입점 (인기 클래스 3개, 30분 캐시) | 메인페이지 (foreverlove.co.kr) |

### 테스트 환경

| 항목 | 값 |
|------|-----|
| 메인페이지 | `https://foreverlove.co.kr` |
| 클래스 목록 | `https://foreverlove.co.kr/shop/page.html?id=2606` |
| 클래스 상세 | `https://foreverlove.co.kr/shop/page.html?id=2607&class_id=CL_202602_001` |
| 파트너 대시보드 | `https://foreverlove.co.kr/shop/page.html?id=2608` |
| n8n API | `https://n8n.pressco21.com` |
| 파트너 테스트 계정 | `jihoo5755` (SILVER, active, education_completed=Y) |
| 일반 회원 테스트 계정 | 별도 일반 회원 계정 |

### 전제 조건

본 테스트를 시작하기 전 아래가 모두 완료되어야 한다:

- [ ] 메이크샵 편집기에서 5개 페이지 js.js 최신 버전 저장 완료 (id=2606/2607/2608/2609/2610)
- [ ] n8n 모든 워크플로우 ACTIVE 상태 확인 (`https://n8n.pressco21.com`)
- [ ] NocoDB tbl_Partners에 jihoo5755 active 상태 확인
- [ ] NocoDB tbl_Classes에 active 상태 클래스 3개 이상 존재
- [ ] 메인페이지 js.js에 PRESSCO21 클래스 진입점 코드 포함 여부 확인

---

## 섹션 1. 찜(관심) 기능 테스트 (Task 311)

> 대상 페이지: `https://foreverlove.co.kr/shop/page.html?id=2606`
> 구현 파일: `파트너클래스/목록/js.js` — `initWishlist()`, `toggleWishlist()`
> CSS 파일: `파트너클래스/목록/css.css` — `.wishlist-btn.is-active`, `.wishlist-btn.is-animating`

### 1-1. 찜 버튼 클릭 기본 동작

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 1 | 찜 버튼 클릭 → 색상 전환 | 목록 페이지에서 클래스 카드의 하트 버튼 클릭 | `.wishlist-btn__outline` 숨김, `.wishlist-btn__filled` 표시 (빨간 하트) | |
| 2 | 찜 버튼 클릭 → 애니메이션 | 하트 버튼 클릭 직후 확인 | `.wishlist-btn.is-animating` 클래스 적용 → `ccHeartPop` 키프레임 0.35s 재생 후 제거 | |
| 3 | 찜 해제 클릭 → 원래 상태 복귀 | 이미 찜한 버튼 재클릭 | `.wishlist-btn.is-active` 제거, 빈 하트(outline)로 복귀 | |
| 4 | 찜 배지 카운트 증가 | 새 클래스 찜 추가 | 상단 `#wishlistCount` 배지 숫자 +1 증가 | |
| 5 | 찜 배지 카운트 감소 | 찜 해제 | `#wishlistCount` 배지 숫자 -1 감소 (0이면 배지 숨김) | |

**DevTools로 확인:**
```javascript
// 콘솔에서 현재 찜 목록 확인
JSON.parse(localStorage.getItem('pressco21_wishlist'));
```

### 1-2. 찜 필터 토글

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 6 | 찜 필터 버튼 활성화 | `#wishlistFilterBtn` 클릭 | 버튼에 `.is-active` 클래스 적용, `aria-pressed="true"` 속성 설정 | |
| 7 | 찜 필터 적용 시 클래스 목록 | 찜 필터 활성화 후 목록 확인 | 찜한 클래스만 카드 표시, 나머지 카드 숨김 | |
| 8 | 찜한 클래스 없을 때 빈 상태 | 찜 목록 비운 후 필터 활성화 | "찜한 클래스가 없습니다" 빈 상태 화면 표시 | |
| 9 | 찜 필터 재클릭 → 해제 | 활성화된 필터 버튼 재클릭 | `.is-active` 제거, `aria-pressed="false"`, 전체 클래스 목록 복귀 | |

### 1-3. localStorage 영속성

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 10 | 찜 후 새로고침 상태 유지 | 클래스 찜 → F5 새로고침 | 새로고침 후에도 해당 클래스 하트가 빨간색(is-active)으로 유지 | |
| 11 | localStorage 키 확인 | DevTools > Application > Local Storage | `pressco21_wishlist` 키에 JSON 배열 `[class_id, ...]` 형태로 저장 | |

### 1-4. 접근성 확인

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 12 | 찜 버튼 aria-label | DevTools에서 `.wishlist-btn` 요소 검사 | `aria-label="클래스명 찜하기"` 속성 존재 | |
| 13 | 찜 버튼 SVG 접근성 | `.wishlist-btn__icon` 확인 | SVG에 `aria-hidden="true"` 적용 (스크린리더 중복 읽기 방지) | |
| 14 | 찜 필터 버튼 aria-pressed | 필터 버튼 상태 전환 확인 | 활성화 시 `aria-pressed="true"`, 비활성 시 `aria-pressed="false"` 동적 변경 | |
| 15 | 키보드로 찜 버튼 조작 | Tab 키로 찜 버튼 포커스 → Enter 클릭 | 마우스 클릭과 동일하게 찜 토글 동작 | |

---

## 섹션 2. 최근 본 클래스 테스트 (Task 311)

> 구현 파일: `파트너클래스/목록/js.js` — `addToRecent()`, `renderRecentSection()`
> 상수: `RECENT_MAX = 10`, `RECENT_KEY = 'pressco21_recent'`

### 2-1. 최근 본 클래스 추가

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 16 | 클래스 카드 클릭 → 목록에 추가 | 목록 페이지에서 클래스 카드 클릭 | 페이지 하단 `#recentSection`에 해당 클래스 카드 표시 | |
| 17 | 최근 본 섹션 자동 표시 | 첫 번째 클래스 클릭 | 이전까지 숨겨진 `#recentSection`이 자동으로 표시됨 | |
| 18 | 중복 클릭 시 순서 갱신 | 이미 최근 본 클래스를 재클릭 | 목록 내 중복 없이 맨 앞으로 순서 갱신 (총 개수 유지) | |

**DevTools로 확인:**
```javascript
// 최근 본 목록 확인
JSON.parse(localStorage.getItem('pressco21_recent'));
```

### 2-2. 최근 본 클래스 제한 및 삭제

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 19 | 최대 10개 제한 | 11개 이상 클래스 순차 클릭 | `#recentScrollContainer` 내 카드 최대 10개 표시 (이후 항목은 가장 오래된 것부터 제거) | |
| 20 | "전체 삭제" 버튼 클릭 | `#recentClearBtn` 클릭 | `#recentSection` 숨김, localStorage `pressco21_recent` 키 삭제 | |

### 2-3. localStorage 영속성

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 21 | 새로고침 후 유지 | 클래스 3개 클릭 → F5 새로고침 | 새로고침 후에도 최근 본 클래스 섹션과 동일한 카드 목록 유지 | |
| 22 | localStorage 키 확인 | DevTools > Application > Local Storage | `pressco21_recent` 키에 `[{class_id, class_name, thumbnail, visited_at}, ...]` 형태 저장 | |

---

## 섹션 3. 상세 페이지 공유 기능 테스트 (Task 310)

> 대상 페이지: `https://foreverlove.co.kr/shop/page.html?id=2607&class_id=CL_202602_001`
> 구현 파일: `파트너클래스/상세/js.js`

### 3-1. URL 복사 기능

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 23 | URL 복사 버튼 클릭 | 상세 페이지의 "URL 복사" 또는 링크 아이콘 버튼 클릭 | 클립보드에 현재 페이지 URL 복사 완료 + 토스트 메시지 표시 | |
| 24 | 복사 후 토스트 확인 | URL 복사 직후 UI 확인 | "링크가 복사되었습니다" 또는 유사한 토스트 2초 내 표시 | |
| 25 | 복사된 URL 형식 | 텍스트 에디터에 붙여넣기 | `https://foreverlove.co.kr/shop/page.html?id=2607&class_id=CL_202602_001` 형식 확인 | |

### 3-2. 카카오톡 공유 버튼

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 26 | 카카오톡 공유 버튼 표시 | 상세 페이지 로드 후 UI 확인 | 카카오 아이콘이 있는 공유 버튼 표시 | |
| 27 | 카카오 SDK 로드 | DevTools > Network 탭 | `developers.kakao.com` 또는 `t1.kakaocdn.net` 스크립트 정상 로드 (200 응답) | |
| 28 | 카카오톡 공유 버튼 클릭 (PC) | PC 브라우저에서 클릭 | 카카오톡 공유 팝업 또는 카카오 공유 대화상자 표시 | |

### 3-3. Web Share API (모바일)

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|------호------|
| 29 | 모바일 공유 버튼 동작 | Chrome DevTools 모바일 에뮬레이터(375px)에서 공유 버튼 클릭 | `navigator.share()` API 동작 → OS 기본 공유 시트 표시 | |
| 30 | Web Share API 미지원 폴백 | PC 브라우저(navigator.share 미지원 환경) | URL 복사 기능으로 자동 대체 (폴백 처리 확인) | |

### 3-4. OG 메타태그 확인

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 31 | og:title 동적 설정 | 상세 페이지 로드 후 DevTools > Elements > `<head>` 확인 | `<meta property="og:title">` 값이 클래스명으로 설정됨 | |
| 32 | og:description 동적 설정 | `<head>` 메타태그 확인 | `<meta property="og:description">` 값이 클래스 소개 텍스트로 설정됨 | |
| 33 | og:image 설정 | `<head>` 메타태그 확인 | `<meta property="og:image">` 값에 클래스 대표 이미지 URL 포함 | |

---

## 섹션 4. 이미지 라이트박스 + 관련 클래스 추천 테스트 (Task 312)

> 대상 페이지: `https://foreverlove.co.kr/shop/page.html?id=2607&class_id=CL_202602_001`
> 구현 파일: `파트너클래스/상세/js.js`

### 4-1. 이미지 라이트박스

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 34 | 이미지 클릭 → 라이트박스 열림 | 상세 페이지 이미지 갤러리에서 이미지 클릭 | 라이트박스 오버레이 표시, 선택한 이미지 확대 표시 | |
| 35 | 라이트박스 닫기 — 버튼 | 라이트박스 내 닫기(X) 버튼 클릭 | 라이트박스 오버레이 닫힘 | |
| 36 | 라이트박스 닫기 — ESC 키 | 라이트박스 열린 상태에서 ESC 키 입력 | 라이트박스 즉시 닫힘 | |
| 37 | 라이트박스 닫기 — 배경 클릭 | 라이트박스 오버레이 배경 영역 클릭 | 라이트박스 닫힘 | |
| 38 | 이미지 내비게이션 (좌/우) | 라이트박스 내 이전/다음 버튼 또는 화살표 키 | 이전/다음 이미지로 전환 | |

### 4-2. 관련 클래스 추천

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 39 | 관련 클래스 카드 표시 | 상세 페이지 하단 관련 클래스 섹션 확인 | 최대 4개 추천 클래스 카드 표시 | |
| 40 | 동일 카테고리 필터링 | 현재 클래스 카테고리 확인 후 추천 카드 비교 | 추천 카드가 현재 클래스와 동일한 카테고리(예: 압화, 캔들) | |
| 41 | 추천 카드 클릭 → 이동 | 추천 카드 클릭 | 해당 클래스 상세 페이지(`?id=2607&class_id=...`)로 정상 이동 | |
| 42 | 관련 클래스 없을 때 처리 | 동일 카테고리 클래스 1개뿐인 상태 테스트 | 관련 클래스 섹션 숨김 또는 "관련 클래스 없음" 처리 | |

---

## 섹션 5. 파트너 대시보드 시각화 테스트 (Task 313)

> 대상 페이지: `https://foreverlove.co.kr/shop/page.html?id=2608`
> 로그인 필요: 파트너 계정 `jihoo5755`
> 구현 파일: `파트너클래스/파트너/js.js` — `renderRevenueChart()`, `renderGradeGauge()`

**전제:** 파트너 계정으로 로그인 후 대시보드 접속. NocoDB tbl_Settlements에 정산 데이터 1건 이상 필요.

### 5-1. Chart.js 월별 수익 바 차트

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 43 | Chart.js 스크립트 로드 | DevTools > Network 탭 | `cdn.jsdelivr.net` 또는 `cdnjs.cloudflare.com`에서 `chart.js` 파일 정상 로드 (200 응답) | |
| 44 | 바 차트 렌더링 | 대시보드 로드 후 UI 확인 | `#pdRevenueChart` 캔버스에 최근 6개월 월별 수익 바 차트 표시 | |
| 45 | 정산 데이터 없을 때 | 정산 내역 0건인 계정으로 접속 | 차트 영역 "데이터 없음" 처리 또는 빈 차트 (에러 없음) | |
| 46 | 콘솔 에러 없음 | DevTools > Console | 차트 렌더링 중 콘솔 에러 0건 | |

### 5-2. 전월 대비 증감 표시

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 47 | 전월 대비 수익 증가 | 이번 달 > 전달 데이터 상태에서 확인 | 상승 표시 (↑ 화살표 + 파란색 또는 초록색 텍스트) | |
| 48 | 전월 대비 수익 감소 | 이번 달 < 전달 데이터 상태에서 확인 | 하락 표시 (↓ 화살표 + 빨간색 텍스트) | |
| 49 | 전월 데이터 없을 때 | 이번 달 첫 정산인 상태 | 전월 비교 없이 이번 달 수익만 단독 표시 | |

### 5-3. 등급 게이지

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 50 | 게이지 렌더링 | 대시보드 수익 섹션 확인 | `.pd-gauge-wrap` 내 반원형 게이지 표시, conic-gradient로 채움 % 표현 | |
| 51 | 진행률 % 텍스트 | 게이지 중앙 텍스트 확인 | `.pd-gauge-text__pct`에 "X%" 텍스트 표시 (누적 매출 / 다음 등급 목표) | |
| 52 | 현재 등급 라벨 | 게이지 하단 텍스트 확인 | `.pd-gauge-text__label`에 "SILVER" 또는 현재 등급 표시 | |
| 53 | 누적 매출 표시 | 게이지 아래 정보 영역 확인 | `.pd-gauge-info__current`에 "누적 매출: N원" 형식 표시 | |
| 54 | 다음 등급 목표 표시 | 게이지 아래 정보 영역 확인 | `.pd-gauge-info__next`에 "목표: N원 (GOLD)" 형식 표시 | |
| 55 | 진행률 바 | 게이지 아래 선형 프로그레스 바 확인 | `.pd-gauge-info__bar-fill` 너비가 % 값과 일치 | |

---

## 섹션 6. 프로필 편집 + CSV 내보내기 테스트 (Task 314)

> 대상 페이지: `https://foreverlove.co.kr/shop/page.html?id=2608`
> 구현 파일: `파트너클래스/파트너/js.js`

### 6-1. 프로필 편집 모달

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 56 | 프로필 편집 버튼 클릭 | 대시보드에서 프로필 편집 버튼 클릭 | `#pdProfileModal` 모달 표시 | |
| 57 | 모달 기존 데이터 채워짐 | 모달 열린 후 입력 필드 확인 | `#pdProfilePhone`, `#pdProfileInstagram`, `#pdProfileKakao` 필드에 기존 데이터 자동 입력 | |
| 58 | 모달 닫기 — X 버튼 | 모달 내 X 버튼 또는 취소 버튼 클릭 | 모달 닫힘, 데이터 변경 없음 | |
| 59 | 모달 닫기 — 배경 클릭 | 모달 오버레이 배경 영역 클릭 | 모달 닫힘 | |
| 60 | 프로필 저장 → API 호출 | 전화번호 수정 후 저장 버튼 클릭 | `POST https://n8n.pressco21.com/webhook/partner-auth` + `{"action":"updatePartnerProfile",...}` 요청 발생 | |
| 61 | 저장 성공 토스트 | 저장 완료 후 UI 확인 | "저장되었습니다" 또는 "프로필이 업데이트되었습니다" 토스트 표시 | |
| 62 | 저장 후 모달 닫힘 | 저장 완료 후 확인 | 성공 응답 수신 시 `#pdProfileModal` 자동 닫힘 | |

**API 테스트 (curl):**
```bash
curl -s -X POST https://n8n.pressco21.com/webhook/partner-auth \
  -H "Content-Type: text/plain" \
  -d '{
    "action": "updatePartnerProfile",
    "member_id": "jihoo5755",
    "phone": "01012345678",
    "instagram_url": "https://instagram.com/test",
    "kakao_channel": ""
  }' | python3 -m json.tool
# 기대 결과: {"success": true, ...}
```

### 6-2. 정산 내역 CSV 내보내기

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 63 | CSV 내보내기 버튼 표시 | 정산 내역 섹션 확인 | `#pdBtnCsvExport` 버튼 표시 | |
| 64 | CSV 다운로드 트리거 | CSV 내보내기 버튼 클릭 | 브라우저 파일 다운로드 시작 (`PRESSCO21_정산내역_YYYY-MM.csv` 형식) | |
| 65 | CSV 파일 열기 — 한글 깨짐 없음 | 다운로드된 CSV를 Excel 또는 Numbers로 열기 | 한글 문자 정상 표시 (BOM `\uFEFF` 포함으로 UTF-8 인식) | |
| 66 | CSV 헤더 확인 | CSV 파일 첫 번째 행 확인 | 정산ID, 주문ID, 클래스명, 수강생명, 금액, 상태, 날짜 헤더 존재 | |
| 67 | CSV 데이터 내용 확인 | CSV 파일 데이터 행 확인 | NocoDB tbl_Settlements 데이터와 일치 | |
| 68 | 정산 데이터 없을 때 | 정산 내역 0건인 계정에서 CSV 버튼 클릭 | 빈 CSV (헤더만 포함) 또는 "내보낼 데이터 없음" 토스트 | |
| 69 | CSV 저장 완료 토스트 | 다운로드 직후 UI 확인 | "CSV 파일이 다운로드되었습니다" 토스트 표시 | |

---

## 섹션 7. 메인페이지 클래스 진입점 테스트 (Task 315)

> 대상 페이지: `https://foreverlove.co.kr`
> 구현 파일: `메인페이지/js.js`
> 상수: `CACHE_KEY = 'pressco21_popular_classes_v2'`, `CACHE_TTL = 30 * 60 * 1000` (30분)

### 7-1. 인기 클래스 카드 표시

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 70 | 페이지 로드 시 클래스 카드 자동 표시 | 메인페이지 접속 | 인기 클래스 섹션에 3개 클래스 카드 자동 렌더링 (API 응답 후) | |
| 71 | n8n API 호출 확인 | DevTools > Network 탭 | `POST https://n8n.pressco21.com/webhook/class-api` + `{"action":"getClasses"}` 요청 발생 | |
| 72 | 카드 정보 정확성 | 렌더링된 카드와 NocoDB 데이터 비교 | 클래스명, 강사명, 가격, 등급(SILVER/GOLD), 카테고리 일치 | |
| 73 | 카드 클릭 → 상세 이동 | 클래스 카드 클릭 | `/shop/page.html?id=2607&class_id=CL_XXXXXX_XXX` 형식으로 이동 | |

### 7-2. CTA 버튼

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 74 | "전체 클래스 보기" 버튼 | 섹션 하단 CTA 버튼 클릭 | `/shop/page.html?id=2606` (클래스 목록 페이지)로 이동 | |

### 7-3. 30분 캐시 동작

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 75 | 캐시 저장 확인 | 메인페이지 로드 후 DevTools > Application > Local Storage | `pressco21_popular_classes_v2` 키에 `{ts: 타임스탬프, data: [...]}` 형태 저장 | |
| 76 | 캐시 히트 확인 | 30분 이내 F5 새로고침 | DevTools Network 탭에서 `n8n.pressco21.com` 요청 미발생 (캐시 사용) | |
| 77 | 캐시 만료 후 재호출 | DevTools 콘솔에서 캐시 수동 만료: `localStorage.setItem('pressco21_popular_classes_v2', JSON.stringify({ts: Date.now() - 31*60*1000, data:[]}))` → F5 새로고침 | `n8n.pressco21.com/webhook/class-api` 요청 재발생 | |

### 7-4. API 실패 처리

| # | 테스트 항목 | 테스트 방법 | 기대 결과 | 결과 |
|---|------------|-----------|---------|------|
| 78 | API 실패 시 섹션 숨김 | DevTools Network 탭에서 `n8n.pressco21.com` 요청을 Block (Request Blocking 기능) → 페이지 새로고침 | 클래스 진입점 섹션 전체 숨김 (`display:none`), 콘솔 에러만 표시 | |
| 79 | 콘솔 에러 출력 여부 | API 실패 시 DevTools Console 확인 | 사용자에게 노출되는 alert/confirm 없음, console.error만 기록 | |

---

## 섹션 8. 반응형 테스트

> 테스트 도구: Chrome DevTools 기기 에뮬레이터 (F12 → Toggle device toolbar)

### 8-1. 모바일 (375px — iPhone 14 기준)

| # | 테스트 항목 | 기대 결과 | 결과 |
|---|------------|---------|------|
| 80 | 목록 페이지 레이아웃 | 클래스 카드 1열 또는 2열 (가로 스크롤 없음) | |
| 81 | 찜 버튼 터치 타겟 | `.wishlist-btn` 터치 영역 44x44px 이상 | |
| 82 | 최근 본 클래스 가로 스크롤 | `#recentScrollContainer` 가로 스크롤 동작 확인 | |
| 83 | 메인페이지 클래스 카드 1열 | 인기 클래스 카드 1열 표시 (세로 나열) | |
| 84 | 가로 스크롤 없음 확인 | DevTools Console: `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5` → `true` | |
| 85 | 공유 버튼 Web Share API 동작 | 모바일 에뮬레이터에서 공유 버튼 클릭 → 공유 시트 또는 URL 복사 폴백 | |

### 8-2. 태블릿 (768px — iPad 기준)

| # | 테스트 항목 | 기대 결과 | 결과 |
|---|------------|---------|------|
| 86 | 목록 페이지 레이아웃 | 클래스 카드 2~3열 레이아웃 | |
| 87 | 메인페이지 클래스 카드 | 카드 2~3열 표시 | |
| 88 | 찜 필터 버튼 표시 | 필터 영역 레이아웃 정상 (버튼 잘림 없음) | |

### 8-3. 데스크탑 (1280px 이상)

| # | 테스트 항목 | 기대 결과 | 결과 |
|---|------------|---------|------|
| 89 | 목록 페이지 카드 3열 | 클래스 카드 3열 그리드 | |
| 90 | 파트너 대시보드 전체 레이아웃 | 차트 + 게이지 나란히 표시 | |
| 91 | 메인페이지 인기 클래스 3열 | 카드 3개 한 줄 표시 | |

---

## 섹션 9. Lighthouse 성능 측정

> 측정 도구: Chrome DevTools > Lighthouse 탭 (또는 PageSpeed Insights)
> 모드: Navigation, Device: Desktop / Mobile 각각 측정

### 9-1. 측정 방법

```
1. Chrome에서 측정 대상 페이지 접속
2. DevTools(F12) > Lighthouse 탭 선택
3. Categories: Performance, Accessibility, Best Practices, SEO 모두 체크
4. Device: Desktop 선택 → "Analyze page load" 실행
5. Desktop 완료 후 Device: Mobile 선택 → 재실행
6. 각 점수 기록
```

### 9-2. 페이지별 목표 점수

#### 메인페이지 (foreverlove.co.kr)

| 항목 | 목표 | 실제 (Desktop) | 실제 (Mobile) |
|------|------|--------------|-------------|
| Performance | 80+ | | |
| Accessibility | 85+ | | |
| Best Practices | 80+ | | |
| SEO | 90+ | | |

#### 클래스 목록 페이지 (id=2606)

| 항목 | 목표 | 실제 (Desktop) | 실제 (Mobile) |
|------|------|--------------|-------------|
| Performance | 80+ | | |
| Accessibility | 85+ | | |
| Best Practices | 80+ | | |
| SEO | 90+ | | |

#### 클래스 상세 페이지 (id=2607)

| 항목 | 목표 | 실제 (Desktop) | 실제 (Mobile) |
|------|------|--------------|-------------|
| Performance | 80+ | | |
| Accessibility | 85+ | | |
| Best Practices | 80+ | | |
| SEO | 90+ | | |

#### 파트너 대시보드 (id=2608)

| 항목 | 목표 | 실제 (Desktop) | 실제 (Mobile) |
|------|------|--------------|-------------|
| Performance | 75+ | | |
| Accessibility | 85+ | | |
| Best Practices | 80+ | | |
| SEO | 80+ | | |

> 참고: 파트너 대시보드는 Chart.js 로드로 인해 Performance 기준을 75+ 로 완화 적용

### 9-3. Lighthouse 핵심 지표 체크

| # | 지표 | 목표 | 측정 페이지 | 결과 |
|---|------|------|-----------|------|
| 92 | LCP (Largest Contentful Paint) | < 3.0s | 메인, 목록, 상세 | |
| 93 | CLS (Cumulative Layout Shift) | < 0.1 | 모든 페이지 | |
| 94 | FID / INP (Interaction to Next Paint) | < 200ms | 목록 (필터 클릭) | |
| 95 | 이미지 lazy loading | alt 속성 + loading="lazy" | 목록 카드 이미지 | |
| 96 | 콘솔 에러 0건 | DevTools Console 에러 없음 | 모든 페이지 | |

### 9-4. SEO 체크리스트 (Lighthouse SEO 항목)

| # | 항목 | 확인 방법 | 기대 결과 | 결과 |
|---|------|---------|---------|------|
| 97 | meta description | `<head>` 확인 | 각 페이지에 고유한 `<meta name="description">` 존재 | |
| 98 | OG 메타태그 (상세 페이지) | `<head>` 확인 | `og:title`, `og:description`, `og:image` 3개 모두 존재 | |
| 99 | canonical 태그 | `<head>` 확인 | 중복 페이지 방지를 위한 `<link rel="canonical">` 존재 여부 | |
| 100 | 이미지 alt 텍스트 | 페이지 내 모든 `<img>` 확인 | 의미있는 이미지에 alt 속성 존재 | |

---

## 섹션 10. 오류 시나리오 (엣지 케이스) 테스트

| # | 시나리오 | 테스트 방법 | 기대 결과 | 결과 |
|---|---------|-----------|---------|------|
| 101 | 오프라인 상태 | DevTools Network 탭 → "Offline" 설정 후 목록 페이지 새로고침 | 에러 토스트 또는 빈 화면 (JS 예외 없음), 콘솔 에러만 기록 | |
| 102 | n8n API 응답 지연 | Network 탭 → Throttling: Slow 3G → 목록 페이지 로드 | 스켈레톤 UI 표시 → 로드 완료 후 정상 카드 렌더링 | |
| 103 | 비로그인 상태에서 대시보드 접근 | 로그아웃 후 `/shop/page.html?id=2608` 직접 접속 | 로그인 안내 화면 표시 (파트너 데이터 API 미호출) | |
| 104 | localStorage 비활성화 | DevTools > Application > Storage > Clear site data → 브라우저 localStorage 차단 후 테스트 | 찜/최근 본 기능 무응답 없이 graceful 실패 (에러 없음) | |
| 105 | 클래스 ID 유효하지 않을 때 | `/shop/page.html?id=2607&class_id=INVALID_ID` 접속 | "클래스를 찾을 수 없습니다" 오류 메시지 또는 목록 페이지 리다이렉트 | |

---

## 섹션 11. Phase 2.7 완료 선언 기준

### 필수 조건 (모두 충족해야 Phase 2.7 완료 선언 가능)

| 조건 | 체크 |
|------|------|
| 섹션 1 (찜 기능) — 필수 항목 1~14번 전체 PASS | - [ ] |
| 섹션 2 (최근 본 클래스) — 필수 항목 16~22번 전체 PASS | - [ ] |
| 섹션 5 (수익 시각화) — Chart.js 렌더링 + 게이지 PASS | - [ ] |
| 섹션 6 (CSV 내보내기) — 다운로드 + 한글 인코딩 PASS | - [ ] |
| 섹션 7 (메인페이지 진입점) — 카드 표시 + 캐시 동작 PASS | - [ ] |
| 섹션 8 (반응형) — 375px 가로 스크롤 없음 PASS | - [ ] |
| Lighthouse Performance 80+ (파트너 대시보드는 75+) | - [ ] |
| Lighthouse Accessibility 85+ | - [ ] |
| Lighthouse SEO 90+ (목록, 상세, 메인) | - [ ] |
| 콘솔 에러 0건 (모든 페이지) | - [ ] |

### 조건부 허용 (미완료 시 다음 Phase에서 처리)

| 조건 | 비고 |
|------|------|
| 섹션 3 (공유 기능) — 카카오 SDK 환경에 따라 동작 불가 가능 | 카카오 앱키 미설정 시 Task 310 후속 작업 필요 |
| 섹션 4 (라이트박스/관련 클래스) — Task 312 미완료 시 섹션 제외 | Task 312 배포 완료 후 별도 확인 |
| Lighthouse SEO 90+ (파트너 대시보드) | 로그인 필요 페이지 특성상 85+ 허용 |

---

## 테스트 결과 요약

테스트 일자: _______________
테스터: _______________
테스트 환경: 메이크샵 foreverlove.co.kr (운영 서버)

| 섹션 | 항목 수 | PASS | FAIL | 블로커 |
|------|---------|------|------|--------|
| 1. 찜 기능 | 15 | | | |
| 2. 최근 본 클래스 | 7 | | | |
| 3. 공유 기능 | 11 | | | |
| 4. 라이트박스 | 9 | | | |
| 5. 대시보드 시각화 | 13 | | | |
| 6. 프로필 편집 + CSV | 14 | | | |
| 7. 메인페이지 진입점 | 10 | | | |
| 8. 반응형 | 12 | | | |
| 9. Lighthouse | 9 | | | |
| 10. 오류 시나리오 | 5 | | | |
| **합계** | **105** | | | |

### 발견된 버그

| 심각도 | 현상 | 재현 방법 | 담당 |
|--------|------|---------|------|
| Critical | | | |
| Major | | | |
| Minor | | | |

### 완료 선언

- [ ] **Phase 2.7 완료** — 필수 조건 전체 충족, 블로커 없음
- [ ] 미완료 항목 있음 — 아래 후속 작업 필요:
  - 후속 작업: _______________
