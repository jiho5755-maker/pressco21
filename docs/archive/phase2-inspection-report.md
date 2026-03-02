# Phase 2 전체 검수 보고서

> 작성일: 2026-02-21
> 검수 방법: Playwright MCP (실제 브라우저 자동화) + 정적 코드 분석
> 대상 URL: https://foreverlove.co.kr

---

## 1. 자동 검수 결과 요약

### 1-1. Playwright 실제 브라우저 검수

| 테스트 항목 | 결과 | 비고 |
|------------|------|------|
| 메인페이지 접속 | ✅ 정상 | 로드 완료 |
| 메인페이지 레이아웃 | ✅ 정상 | 배너/상품 섹션 정상 표시 |
| YouTube 섹션 | ❌ 에러 | GAS URL 미설정 → "데이터 없음" 에러 |
| 인기 클래스 섹션 | ⚠️ 비표시 | GAS URL 없어서 섹션 조용히 숨김 (설계대로 fallback) |
| Mixed Content 경고 | ⚠️ 경고 20건 | 기존 메이크샵 http:// 이미지 (Phase 2 무관) |
| bestPrdSlider 에러 | ⚠️ 에러 1건 | 기존 메이크샵 JS 이슈 (Phase 2 무관) |

**결론**: 메인페이지는 정상 동작 중. Phase 2 관련 섹션은 GAS URL 설정 후 활성화됨.

### 1-2. 코드 정적 분석 결과

**검수 통과 항목 (✅)**

| 항목 | 파일 | 상태 |
|------|------|------|
| 메이크샵 편집기 호환 (`var` 전용) | 전체 JS | ✅ `let`/`const` 미사용 확인 |
| IIFE 패턴 | 전체 JS | ✅ 모두 적용 |
| CSS 스코핑 | 전체 CSS | ✅ `.class-catalog`, `.class-detail`, `.partner-dashboard` |
| 가상태그 형식 | `파트너/Index.html:28` | ✅ `<!--/user_id/-->` 올바름 |
| XSS 방지 (출력 이스케이프) | 전체 JS | ✅ `escapeHtml`, `sanitizeHtml` 적용 |
| URL 인젝션 방지 | `메인페이지/js.js:560` | ✅ `sanitizeClassId()` 영숫자만 허용 |
| URL XSS 방지 | GAS | ✅ `sanitizeUrl_()` http/https만 허용 |
| TOCTOU 경쟁조건 방지 | GAS | ✅ LockService 내부 중복 체크 |
| 관리자 API 보호 | GAS | ✅ `ADMIN_API_TOKEN` 검증 |
| 점수 조작 방지 | GAS | ✅ 합격 기준 서버 고정 (PASS_THRESHOLD) |
| 파트너 대시보드 noindex | `파트너/Index.html:8` | ✅ `noindex, nofollow` 설정 |
| localStorage 캐싱 | 목록/상세/메인 JS | ✅ TTL 기반 캐싱 적용 |
| Intersection Observer | 목록 JS | ✅ 스크롤 최적화 |

---

## 2. 발견된 이슈 (수정 필요)

### 🔴 Critical (배포 전 반드시 수정)

#### C-01: GAS URL 미교체 - 목록 페이지
- **파일**: `파트너클래스/목록/js.js` L13
- **현재 값**: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`
- **영향**: 클래스 목록/상세 API 호출 전체 불가
- **해결**: GAS 배포 후 실제 URL로 교체

#### C-02: GAS URL 미교체 - 상세 페이지
- **파일**: `파트너클래스/상세/js.js` L14
- **현재 값**: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`
- **영향**: 클래스 상세 조회, 예약 기능 전체 불가
- **해결**: GAS 배포 후 실제 URL로 교체

#### C-03: 파트너 신청 Forms URL placeholder
- **파일**: `파트너클래스/파트너/Index.html` L61
- **현재 값**: `https://forms.gle/PARTNER_APPLY_FORM`
- **영향**: 비파트너가 신청 버튼 클릭 시 잘못된 URL로 이동
- **해결**: 실제 Google Forms 생성 후 URL 교체

#### C-04: 강의 등록 Forms URL placeholder
- **파일**: `파트너클래스/파트너/Index.html` L353
- **현재 값**: `https://forms.gle/CLASS_REGISTER_FORM`
- **영향**: 파트너가 강의 등록 신청 불가
- **해결**: 실제 Google Forms 생성 후 URL 교체

#### C-05: window.PRESSCO21_GAS_URL 전역변수 미설정
- **파일**: `파트너클래스/파트너/js.js` L14, `메인페이지/js.js` L535
- **현재 값**: `window.PRESSCO21_GAS_URL || ''` (빈 문자열로 fallback)
- **영향**: 파트너 대시보드 전체 기능 불가, 메인 인기 클래스 섹션 비표시
- **해결**: 메이크샵 공통 JS에 `window.PRESSCO21_GAS_URL = '(GAS URL)'` 추가

---

### ⚠️ Warning (권장 수정)

#### W-01: YouTube API 연동 오류
- **파일**: `메인페이지/js.js`
- **증상**: `[YouTube] 데이터 없음: {status: error}` 콘솔 에러
- **원인**: YouTube GAS URL(YOUTUBE_GAS_URL)이 별도 변수로 관리됨 (L12)
- **영향**: YouTube 섹션 비표시 (기존부터 발생한 이슈)
- **참고**: Phase 2 신규 이슈 아님

#### W-02: Mixed Content 경고 20건
- **파일**: 기존 메이크샵 Index.html
- **증상**: `http://jewoo.img4.kr/...` 이미지가 http로 로드
- **영향**: 브라우저 콘솔 경고 (실제 로드는 됨, 차단 없음)
- **참고**: Phase 2 무관, 기존 메이크샵 이슈

---

### ℹ️ 정보 (필요 시 확인)

#### I-01: GAS 최초 실행 시 권한 승인 필요
- GAS 함수 최초 실행 시 Google 권한 승인 팝업 발생
- "안전하지 않음" 경고가 뜨지만 정상 (본인이 만든 스크립트이므로 허용)

#### I-02: GAS 이메일 한도 모니터링 필요
- 무료 Gmail: 일 100건 한도
- 70건 도달 시 `ADMIN_EMAIL`로 자동 경고 발송
- 운영 초기 모니터링 권장

---

## 3. 아키텍처 검수

### 3-1. 데이터 흐름 검수

```
고객 ──→ 클래스 목록/상세 (메이크샵 개별 HTML)
              ↓ fetch (GAS URL)
         GAS API (class-platform-gas.gs)
              ↓ 읽기
         Google Sheets (클래스 메타)
```

검수 결과: ✅ 설계 정상. GAS URL만 교체하면 작동

```
고객 ──→ 메이크샵 상품 결제 (goods_view.php)
              ↓ 주문 완료 (메이크샵 자체 결제)
         GAS triggerPollOrders (10분 간격)
              ↓ process_reserve API 호출
         메이크샵 적립금 지급 → 파트너 지급 완료
              ↓ 기록
         Google Sheets (정산 내역)
```

검수 결과: ✅ 설계 정상. GAS 스크립트 속성 설정 + 트리거 설정 필요

### 3-2. 보안 레이어 검수

| 레이어 | 구현 | 상태 |
|--------|------|------|
| 파트너 인증 | `<!--/user_id/-->` → GAS `getPartnerAuth` | ✅ |
| 관리자 API | `ADMIN_API_TOKEN` 검증 | ✅ |
| XSS 방지 | 출력 이스케이프 (HTML/URL) | ✅ |
| TOCTOU | LockService 내부 중복 체크 | ✅ |
| 점수 조작 | 서버 고정 상수 | ✅ |
| SQL Injection | N/A (Sheets 사용, SQL 없음) | ✅ |

---

## 4. 수동 테스트 체크리스트

> 자동화로 확인 불가한 항목. 배포 후 직접 테스트 필요.

### 4-1. GAS 기능 테스트

- [ ] `checkConfig` 실행 → 모든 속성 `[OK]`
- [ ] `initSheets` 실행 → 8개 시트 생성 확인
- [ ] `?action=health` → `{"success":true}` 응답
- [ ] `?action=getClasses` → 정상 JSON 응답
- [ ] `?action=getPartnerAuth&member_id=테스트ID` → 파트너 인증 확인

### 4-2. 고객 플로우 테스트

- [ ] 클래스 목록 페이지 → 클래스 카드 표시
- [ ] 필터 (카테고리/난이도/지역) 동작
- [ ] 클래스 상세 페이지 → 갤러리/커리큘럼/후기 표시
- [ ] 날짜 선택 (flatpickr) → 선택 가능한 일정 표시
- [ ] 메이크샵 결제 연동 → 상품 페이지로 이동 확인

### 4-3. 파트너 플로우 테스트

- [ ] 비로그인 → "로그인이 필요합니다" 화면
- [ ] 일반 회원 로그인 → "파트너 전용 페이지" 화면
- [ ] 파트너 계정 로그인 → 대시보드 4개 탭 표시
- [ ] 내 강의 탭 → 등록된 강의 목록
- [ ] 예약 현황 탭 → 수강생 정보 (마스킹 처리 확인)
- [ ] 수익 리포트 탭 → 월별 정산 내역
- [ ] 후기 관리 탭 → 후기 목록 + 답글 등록

### 4-4. 이메일 자동화 테스트

- [ ] 테스트 주문 후 예약 확인 이메일 수신
- [ ] 수업 D-3일: 리마인더 이메일 수신
- [ ] 수업 D-1일: 리마인더 이메일 수신
- [ ] 수업 후 7일: 후기 요청 이메일 수신
- [ ] 파트너 신청 → 접수 확인 이메일 수신
- [ ] 파트너 승인 → 승인 완료 이메일 수신

### 4-5. 보안 테스트

- [ ] URL에 `class_id` 조작 시도 (`../../../etc/passwd` 등) → 안전하게 차단
- [ ] 일반 회원으로 파트너 API 직접 호출 시도 → `NOT_PARTNER` 에러
- [ ] 타인의 member_id로 파트너 대시보드 접근 시도 → 차단 확인

### 4-6. 모바일 반응형 테스트 (768px, 414px 기준)

- [ ] 클래스 목록: 모바일 필터 드로어 동작
- [ ] 클래스 상세: sticky 예약 패널 → 하단 바로 전환
- [ ] 파트너 대시보드: 모바일 탭 스크롤 동작

---

## 5. 성능 검수

### 5-1. 캐싱 전략 확인

| 데이터 | 캐싱 위치 | TTL |
|--------|----------|-----|
| 클래스 목록 | localStorage | 1시간 |
| 클래스 상세 | localStorage | 5분 |
| 인기 클래스 | localStorage | 30분 |
| GAS 내부 캐시 | CacheService | 5분 |
| 카테고리 | CacheService | 6시간 |
| 파트너 인증 | CacheService | 30분 |

모두 설계대로 구현됨 ✅

### 5-2. API 호출 최적화

- 중복 호출 방지 (`isLoading` 플래그) ✅
- 캐시 히트 시 API 미호출 ✅
- 메인페이지 인기 클래스: Intersection Observer로 지연 로드 ✅

---

## 6. 검수 종합 판정

| 카테고리 | Critical | Warning | Info |
|--------|----------|---------|------|
| GAS URL 설정 | 2건 | - | - |
| Forms URL 설정 | 2건 | - | - |
| 전역변수 설정 | 1건 | - | - |
| 기존 메이크샵 이슈 | - | 2건 | - |
| 기타 정보 | - | - | 2건 |

**배포 가능 여부**: ⏸️ **조건부 (5가지 Critical 수정 후 가능)**

Critical 이슈 5건 모두 "코드 수정"이 아닌 **"실제 값 입력"** 의 문제입니다.
개발 코드 자체는 완성 상태이며, GAS 배포 및 URL 교체 작업만 진행하면 배포 가능합니다.

---

*이 보고서는 Playwright 브라우저 자동화 + 정적 코드 분석으로 생성되었습니다.*
*실제 사이트 접속 테스트 URL: https://foreverlove.co.kr*
*검수 일시: 2026-02-21*
