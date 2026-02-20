# PRESSCO21 웹사이트 고도화 개발 로드맵

메이크샵 D4 기반 압화/보존화 전문 쇼핑몰의 코드 품질 개선, 파트너 클래스 플랫폼 구축, 선순환 생태계 완성을 위한 체계적 개발 계획

## 개요

PRESSCO21(foreverlove.co.kr)은 30년 전통의 압화/보존화 전문 브랜드로, 메이크샵 D4 위에서 운영 중이다. 현재 7개 프로젝트가 배포되어 있으며, 다음 방향으로 고도화를 진행한다:

- **기존 코드 품질 개선**: IIFE 패턴 적용, CSS 스코핑, 성능/접근성/SEO 향상
- **파트너 클래스 플랫폼**: 제휴업체 강의 홍보 + 결제 + 수수료 적립금 선순환 생태계
- **강사 도구 및 리뷰 강화**: 수업 기획 도우미 + 리뷰 허브로 커뮤니티 활성화

### 기술적 전제조건

| 항목 | 규칙 |
|------|------|
| 플랫폼 | 메이크샵 D4 (Vanilla HTML/CSS/JS, CDN만 사용, 빌드 도구 없음) |
| JS 이스케이프 | 템플릿 리터럴 `${var}` -> `\${var}` 필수 |
| 가상 태그 | `{$치환코드}`, `<!-- -->` 절대 보존 |
| JS 격리 | IIFE 패턴 필수 |
| CSS 스코핑 | 컨테이너 ID/클래스로 범위 제한 필수 |
| 반응형 | 768px / 992px / 1200px |
| 코드 레퍼런스 | `레지너스 화이트페이퍼/script.js` 구조 참고 |

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - `/tasks` 디렉토리에 새 작업 파일 생성
   - 명명 형식: `XXX-description.md` (예: `001-setup.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함
   - 예시를 위해 `/tasks` 디렉토리의 마지막 완료된 작업 참조
   - 초기 상태의 샘플로 `000-sample.md` 참조

3. **작업 구현**
   - 작업 파일의 명세서를 따름
   - **에이전트 자동 투입**: 태스크의 `에이전트:` 필드를 확인하여 `주도` 에이전트를 Task tool로 호출
   - **협업 에이전트**: 특정 영역(카피/수수료/보안 등) 작업 시 `협업` 에이전트를 병렬 호출
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수
   - **구현 완료 후**: `makeshop-code-reviewer`로 코드 검수 자동 실행
   - 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 완료로 표시
   - 완료된 작업에 `See: /tasks/XXX-xxx.md` 참조 추가

---

## 에이전트 투입 체계

> 각 태스크에 전문가 에이전트를 자동 투입하기 위한 매핑 테이블.
> `주도`: 해당 태스크의 핵심 설계/구현 담당 | `협업`: 특정 영역에서 자문/검수 참여

### 에이전트 목록

| 에이전트 ID | 역할 | 모델 | 투입 Phase |
|------------|------|------|-----------|
| `makeshop-planning-expert` | 메이크샵 API, 치환코드, 상품 체계, 플랫폼 아키텍처 | opus | 1.5, 2 |
| `gas-backend-expert` | GAS 엔드포인트, Sheets 설계, 이메일 자동화, 정산 | opus | 1.5, 2, 3 |
| `brand-planning-expert` | 브랜드 톤&보이스, 카피라이팅, 파트너 프로그램 | opus | 2, 3 |
| `makeshop-ui-ux-expert` | UI/UX 디자인, 반응형, CSS 스코핑, 인터랙션 | opus | 2, 3 |
| `ecommerce-business-expert` | 수수료 모델, 정산 로직, 전환율, KPI | opus | 2, 3 |
| `seo-performance-expert` | Schema.org, Lighthouse, GA4, Core Web Vitals | sonnet | 2, 3 |
| `qa-test-expert` | E2E 테스트, 보안, Playwright, 통합 검증 | sonnet | 1.5, 2, 3 |
| `makeshop-code-reviewer` | 코드 품질, 보안, 메이크샵 제약 준수 검증 | opus | 전 Phase |

### 태스크별 에이전트 투입 요약

| Task | 주도 | 협업 |
|------|------|------|
| **Phase 1.5** | | |
| 150 적립금 API | `makeshop-planning-expert` | `gas-backend-expert`, `qa-test-expert` |
| 151 치환코드/옵션 | `makeshop-planning-expert` | `qa-test-expert` |
| 152 API 예산 | `makeshop-planning-expert` | `gas-backend-expert`, `ecommerce-business-expert` |
| **Phase 2-A** | | |
| 201 Sheets+GAS | `gas-backend-expert` | `makeshop-planning-expert`, `ecommerce-business-expert` |
| 202 클래스 상품 | `makeshop-planning-expert` | `gas-backend-expert`, `ecommerce-business-expert` |
| **Phase 2-B** | | |
| 211 목록 UI | `makeshop-ui-ux-expert` | `brand-planning-expert`, `seo-performance-expert` |
| 212 상세 UI | `makeshop-ui-ux-expert` | `brand-planning-expert`, `ecommerce-business-expert`, `seo-performance-expert` |
| **Phase 2-C** | | |
| 221 정산 자동화 | `gas-backend-expert` | `ecommerce-business-expert`, `makeshop-planning-expert`, `brand-planning-expert` |
| 222 파트너 대시보드 | `makeshop-ui-ux-expert`, `gas-backend-expert` | `makeshop-planning-expert`, `ecommerce-business-expert` |
| 223 파트너 등급 | `ecommerce-business-expert`, `brand-planning-expert` | `gas-backend-expert` |
| **Phase 2-D** | | |
| 231 교육 아카데미 | `brand-planning-expert` | `gas-backend-expert` |
| 232 메인 진입점 | `makeshop-ui-ux-expert` | `brand-planning-expert`, `seo-performance-expert` |
| **Phase 2-E** | | |
| 241 통합 테스트 | `qa-test-expert` | `seo-performance-expert`, `makeshop-planning-expert` |
| **Phase 3-A** | | |
| 301 기획도우미 GAS | `gas-backend-expert` | `ecommerce-business-expert` |
| 302 기획 계산기 UI | `makeshop-ui-ux-expert` | `brand-planning-expert`, `ecommerce-business-expert` |
| 303 가이드 라이브러리 | `makeshop-ui-ux-expert` | `brand-planning-expert` |
| 304 교육기관 특화 | `gas-backend-expert` | `ecommerce-business-expert` |
| **Phase 3-B** | | |
| 311 리뷰 허브 | `gas-backend-expert`, `makeshop-ui-ux-expert` | `ecommerce-business-expert`, `seo-performance-expert` |
| 312 리뷰 위젯 | `makeshop-ui-ux-expert` | `seo-performance-expert` |
| 313 리뷰 통합 테스트 | `qa-test-expert` | `seo-performance-expert` |

> **코드 리뷰**: 모든 태스크의 구현 완료 후 `makeshop-code-reviewer`로 자동 검수

---

## 프로젝트 현황

### 배포 완료 프로젝트 (7개)

| 프로젝트 | 경로 | 핵심 이슈 |
|---------|------|----------|
| 메인페이지 | `메인페이지/` | jQuery 의존, 인라인 스크립트 혼재, IIFE 미적용 |
| 간편 구매 | `간편 구매/` | 전역 스코프 오염, MutationObserver body 전체 감시 |
| 1초 로그인 x3 | `1초 로그인(킵그로우)/` | CSS 전역 오염(`*` 셀렉터), 3개 파일 완전 중복 |
| 유튜브 자동화 | `유튜브 자동화/현재-배포/` | 관련 상품 하드코딩, GAS 프록시 단일 장애점 |
| 파트너맵 | `파트너맵/` | JS 134KB 거대 단일 파일, API 키 노출 |
| 브랜드스토리 | `브랜드스토리/브랜드페이지/` | 이미지 경로 로컬 상대경로, CSS 대형 |
| 레지너스 화이트페이퍼 | `레지너스 화이트페이퍼/` | 가장 잘 정리됨 (코드 패턴 모범 사례) |

### 미배포 / 미구현

| 프로젝트 | 경로 | 상태 |
|---------|------|------|
| 유튜브 하이브리드 | `유튜브 자동화/신규-hybrid-미배포/` | 미배포 (v4로 대체 예정) |
| 가이드 페이지 | `가이드 페이지/` | 폴더만 존재 (빈 디렉토리) |

---

## 개발 단계

---

### Phase 0: 수정본 적용 (완료)

> **상태**: 완료
> **기간**: 완료됨

- **Task 001: 간편 구매 수정본 적용** - 완료
  - 대상: `간편 구매/js.fixed.js`
  - IIFE 감싸기, null 체크, rAF, MutationObserver 범위 축소
  - 완료: 배포 적용됨

- **Task 002: 1초 로그인 CSS 수정본 적용** - 완료
  - 대상: `1초 로그인(킵그로우)/*/css.fixed.css` x3
  - `*` 셀렉터를 `#loginWrap *`로 스코핑
  - 완료: 3개 변형 모두 배포 적용됨

- **Task 003: 1초 로그인 HTML 수정본 적용** - 완료
  - 대상: `1초 로그인(킵그로우)/*/index.fixed.html` x3
  - 인라인 스크립트 IIFE, const/let -> var 변환
  - 완료: 3개 변형 모두 배포 적용됨

---

### Phase 1a: 기존 코드 개선 (2~3주)

> **상태**: ✅ 1차 개발 완료 (2026-02-20), 일부 항목 후속 보완 예정
> **기간**: 2~3주
> **시작**: Phase 0 완료 후 즉시
> **목표**: 배포된 프로젝트들의 코드 품질, 성능, 접근성을 한 단계 끌어올린다
> **비고**: Phase 1b와 병렬 진행 가능

- **Task 101: 메인페이지 JS IIFE + 탭 지연 로드 + 스켈레톤 UI** - ✅ 완료 (87%)
  - See: `/tasks/101-mainpage-iife-skeleton.md`
  - 대상: `메인페이지/js.js`, `메인페이지/Index.html`, `메인페이지/css.css`
  - 완료: IIFE 패턴, 탭 지연 로드, 스켈레톤 UI, 인라인 스크립트 통합, Schema.org, OG 태그
  - 잔여: 이미지 lazy loading 미적용

- **Task 102: 간편 구매 상품 상세 UX 강화** - 🟡 부분 완료 (55%)
  - See: `/tasks/102-quick-purchase-ux.md`
  - 대상: `간편 구매/index.html`, `간편 구매/js.fixed.js`, `간편 구매/css.css`
  - 완료: IIFE, localStorage 최근 본 상품, OG 메타, ARIA 접근성, XSS 방지
  - 잔여: 핀치 줌, 리뷰 앵커 버튼, 전환 유도 배지

- **Task 103: 파트너맵 보안 + 상세 모달 + 길찾기** - ✅ 완료 (90%)
  - See: `/tasks/103-partnermap-security-modal.md`
  - 대상: `파트너맵/js.js`, `파트너맵/Index.html`, `파트너맵/css.css`, `파트너맵/Code-final.gs`
  - 완료: 5개 IIFE 모듈화, 상세 모달, 네이버/카카오 딥링크, 가까운 파트너 추천, WCAG 접근성
  - 잔여: NCP 콘솔 허용 도메인 설정 (관리자 수동 작업)

- **Task 104: 전체 사이트 이미지 lazy loading + 접근성** - 🟡 부분 완료 (50%)
  - See: `/tasks/104-lazy-loading-accessibility.md`
  - 대상: 전체 프로젝트 HTML 파일
  - 완료: 간편 구매/파트너맵/1초 로그인 ARIA 접근성
  - 잔여: 메인/간편 구매 이미지 lazy loading, 메인페이지 탭 ARIA

- **Task 105: SEO 기본 개선** - ✅ 완료 (75%)
  - See: `/tasks/105-seo-improvement.md`
  - 대상: 전체 프로젝트 HTML 파일
  - 완료: 메인페이지 Organization+WebSite Schema.org, 메인/간편 구매 OG 태그
  - 잔여: 브랜드스토리/파트너맵 Schema.org 확인 필요

- **Task 106: 1초 로그인 CSS 중복 제거 + 접근성** - ✅ 완료 (95%)
  - See: `/tasks/106-login-css-dedup-a11y.md`
  - 대상: `1초 로그인(킵그로우)/회원 로그인/`, `1초 로그인(킵그로우)/구매시 로그인/`, `1초 로그인(킵그로우)/주문 조회 로그인/`
  - 완료: CSS 분석/워크플로우, IIFE, ARIA (토글+탭), autocomplete, 비밀번호 토글
  - 잔여: 에러 메시지 role="alert" (배포 후 확인)

---

### Phase 1b: 신규 개발 + 리뉴얼 (2~3주, Phase 1a와 병렬)

> **상태**: ✅ 1차 개발 완료 (2026-02-20), 배포 전 테스트 및 보완 예정
> **기간**: 2~3주
> **시작**: Phase 1a와 동시 착수 가능
> **목표**: 유튜브 v4, 브랜드스토리, 화이트페이퍼의 신규 개발 및 디자인 리뉴얼

- **Task 111: 유튜브 v4 카테고리 자동매칭 버전 개발** - ✅ 1차 완료
  - See: `/tasks/111-youtube-v4-category-matching.md`
  - 대상: `유튜브 자동화/v4-카테고리/` (신규 생성)
  - 의존성: 없음
  - 규모: M
  - 구현 사항:
    - Google Sheets에 카테고리 키워드 테이블 + 카테고리별 상품 목록 작성
    - `youtube-proxy-v3.gs` GAS 개발 (YouTube API + Sheets 통합 응답)
    - v4 프론트엔드 개발 (`Index.html` + `css.css` + `js.js`)
    - 카테고리 자동매칭 로직 (긴 키워드 우선 매칭, 매칭 실패 시 전체 인기상품)
    - 영상 썸네일 클릭 시 iframe 로드 (Intersection Observer 활용)
    - 카테고리 배지, 조회수 표시("1.5만 조회"), NEW 배지(3일 이내), 모바일 토글
    - 매칭 결과 Sheets 로깅 + 관리자 수동 오버라이드 필드
    - 메인페이지 `<!--s: section_youtube-->` 영역 v4 교체 (기존 v3 백업 필수)
  - 테스트 체크리스트:
    - 영상 로드, 카테고리 매칭 정확도, 상품 표시 검증
    - 매칭 실패 시 "전체 인기 상품" 폴백 동작 확인
    - PC/모바일 반응형 확인, GAS 캐시 동작 확인

- **Task 112: 브랜드스토리 이미지 CDN + 디자인 전면 리뉴얼** - ✅ 1차 완료
  - See: `/tasks/112-brandstory-cdn-redesign.md`
  - 대상: `브랜드스토리/브랜드페이지/` (index.html, css/, js/)
  - 의존성: 없음
  - 규모: M
  - 구현 사항:
    - 로컬 이미지 경로를 CDN 절대 경로로 마이그레이션
    - PNG 갤러리 이미지 WebP 변환
    - 갤러리 라이트박스 (이미지 클릭 시 전체화면 뷰어, swipe 지원)
    - `@media print` 스타일 (B2B 프레젠테이션용)
    - 현대적 럭셔리 브랜드 느낌으로 디자인 전면 재설계 (11개 섹션 전체)

- **Task 113: 레지너스 화이트페이퍼 CTA + PDF + 디자인 전면 리뉴얼** - ✅ 1차 완료
  - See: `/tasks/113-whitepaper-cta-pdf-redesign.md`
  - 대상: `레지너스 화이트페이퍼/style.css`, `레지너스 화이트페이퍼/index.html`, `레지너스 화이트페이퍼/script.js`
  - 의존성: 없음
  - 규모: S
  - 구현 사항:
    - 하단 "Resiners Purair 구매하기" CTA 버튼 추가
    - `window.print()` 활용 PDF 내보내기 기능
    - Schema.org Article 마크업 적용
    - 신뢰감 있는 전문 문서 디자인으로 전면 격상 (12개 섹션, JS 로직 유지)

---

### Phase 1.5: 메이크샵 API 검증 (1~2주)

> **상태**: 완료 (Task 150~152 모두 완료, Phase 2 착수 가능)
> **기간**: 1~2주
> **시작**: Phase 1b 중반 이후 착수 가능 (Phase 2 착수 전 필수 완료)
> **목표**: Phase 2 파트너 클래스 플랫폼의 핵심 기술 전제조건을 사전 검증한다
> **중요도**: Critical -- 검증 결과에 따라 Phase 2 아키텍처가 달라질 수 있음

- **Task 150: 메이크샵 적립금 API 검증** - ✅ 완료 (2026-02-20)
  - See: `/tasks/150-makeshop-reserve-api-test.md`
  - 대상: curl 직접 호출 테스트 + GAS 테스트 스크립트
  - 의존성: 없음
  - **결과: Plan A 확정 (process_reserve 기본 적립금 API)**
  - 지급(+)/차감(-)/조회 모두 정상, 즉시 반영, 에러 처리 명확
  - 스마트 적립금은 미사용 상점 (N/A)
  - 상세: `docs/api-verification/reserve-api-result.md`
  - 규모: S
  - 에이전트: `주도` makeshop-planning-expert | `협업` gas-backend-expert, qa-test-expert
  - 구현 사항:
    - `process_reserve` API로 "특정 회원에게 N원 적립금 지급" 호출 테스트
    - 테스트 계정에서 적립금 지급/차감/조회 정상 동작 확인
    - API 응답 구조, 에러 코드, 호출 제한 문서화
    - 불가 시 대안 검토: 반자동(관리자 월 1회 수동) -> 쿠폰 API(`process_coupon`)
  - 테스트 체크리스트:
    - 적립금 지급 API 호출 성공 여부
    - 지급된 적립금이 회원 마이페이지에 반영되는지 확인
    - API 호출 실패 시 에러 메시지 확인 및 문서화

- **Task 151: 메이크샵 가상태그 + 옵션 제한 검증** - ✅ 완료 (2026-02-21)
  - See: `/tasks/151-makeshop-substitution-options.md`
  - 대상: 테스트 HTML 페이지, 의사결정 문서
  - 의존성: 없음
  - **결과: 가상태그 기반 3단계 인증 확정, 옵션 제한 없음**
  - `<!--/user_id/-->`: 개별 페이지에서 로그인 시 "jihoo5755" 치환 성공, 비로그인 시 빈 문자열
  - `<!--/group_name/-->`: "강사회원", `<!--/group_level/-->`: "2" 치환 성공
  - `<!--/if_login/-->...<!--/end_if/-->`: 개별 페이지에서 정상 동작
  - 옵션 제한: **제한 없음** (관리자 실측), 옵션별 개별 재고 설정 가능
  - v1(`{$member_id}`)은 잘못된 형식으로 실패 -> v2(`<!--/user_id/-->`)로 성공
  - 상세: `docs/api-verification/substitution-options-result.md`
  - 규모: S
  - 에이전트: `주도` makeshop-planning-expert | `협업` qa-test-expert

- **Task 152: API 호출 예산(Budget) 산정 및 캐싱 전략 수립** - 완료 (2026-02-21)
  - See: `/tasks/152-api-budget-caching-strategy.md`
  - 대상: 설계 문서 (신규 생성)
  - 의존성: Task 150, Task 151
  - **결과: API 한도 10% 미만 사용, Phase 2 착수 가능 확인**
  - 현재 메이크샵 API 사용량: 0회/시간 (유튜브 v4/파트너맵은 Sheets 기반)
  - Phase 2 추가 후: 조회 ~28회, 처리 ~10회/시간 (한도의 5.6%, 2.0%)
  - 주문 폴링: 10분 간격 확정 (6회/시간)
  - 2계층 캐싱: GAS CacheService + localStorage 조합 확정
  - 상세: `docs/api-budget-caching-strategy.md`
  - 규모: S
  - 에이전트: `주도` makeshop-planning-expert | `협업` gas-backend-expert, ecommerce-business-expert

---

### Phase 2: 파트너 클래스 플랫폼 (2~3개월)

> **상태**: 대기
> **기간**: 2~3개월
> **시작**: Phase 1.5 API 검증 완료 후
> **목표**: 제휴업체 강의 홍보 + 결제 + 수수료 적립금 선순환 생태계 구축
> **규모**: XL
> **핵심 리스크**: 파트너 인증 메커니즘(C-1), API 호출 경합(C-2), Sheets 정산 무결성(C-3)

#### Phase 2-A: 데이터 구조 + GAS 백엔드 (2~3주)

- **Task 201: Google Sheets 데이터 구조 설계 + GAS 기초 API** - 우선순위
  - See: `/tasks/201-sheets-structure-gas-api.md`
  - 대상: `파트너클래스/class-platform-gas.gs` (신규 생성), Google Sheets 3개
  - 의존성: Task 150, Task 151, Task 152 (API 검증 완료 필수)
  - 규모: L
  - 에이전트: `주도` gas-backend-expert | `협업` makeshop-planning-expert, ecommerce-business-expert
  - 구현 사항:
    - Google Sheets 설계: "파트너 상세" 시트 (코드, 등급, 교육이수, 포트폴리오, 수수료율)
    - Google Sheets 설계: "클래스 메타" 시트 (클래스ID, 커리큘럼JSON, 강사소개, 이미지, 유튜브ID)
    - Google Sheets 설계: "정산 내역" 시트 (파트너코드, 월, 매출, 수수료, 적립금전환, 잔액)
    - GAS `doGet`/`doPost` 엔드포인트 구현 (클래스 조회, 파트너 조회, 예약 기록)
    - 파트너 인증 로직: `{$member_id}` + 파트너 코드 매칭 + 인증 토큰 + Referer 체크
    - LockService 기반 동시 쓰기 방지 구현
    - 정산 상태 관리: "대기 -> 처리중 -> 완료/실패" 3단계
  - 테스트 체크리스트:
    - GAS 엔드포인트 응답 정상 확인 (각 API별)
    - 동시 쓰기 방지 (LockService) 동작 검증
    - 비파트너 접근 차단 테스트
    - Referer 체크 정상 동작 확인

- **Task 202: 메이크샵 클래스 상품 등록 체계 구축**
  - See: `/tasks/202-makeshop-class-product.md`
  - 대상: 메이크샵 관리자 설정 + GAS 연동
  - 의존성: Task 201
  - 규모: M
  - 에이전트: `주도` makeshop-planning-expert | `협업` gas-backend-expert, ecommerce-business-expert
  - 구현 사항:
    - 클래스를 메이크샵 "상품"으로 등록하는 프로세스 정립
    - 옵션(날짜/시간) = 예약 슬롯, 재고 = 정원으로 매핑
    - 회원그룹 API로 파트너/수강생 그룹 관리 체계 구축
    - 주문 조회 API로 새 주문 감지 -> 정산 트리거 GAS 구현
    - 상품(클래스) 정보: GAS에서 일 1회 배치로 Sheets 동기화
  - 테스트 체크리스트:
    - 클래스 상품 등록/수정/삭제 정상 동작
    - 옵션(일정) 선택 시 재고(정원) 차감 확인
    - 주문 조회 API 폴링으로 새 주문 감지 정상 동작

#### Phase 2-B: 프론트엔드 UI 개발 (2~3주)

- **Task 211: 클래스 목록 페이지 UI + 필터/검색** - 우선순위
  - See: `/tasks/211-class-catalog-ui.md`
  - 대상: `파트너클래스/목록/Index.html`, `파트너클래스/목록/css.css`, `파트너클래스/목록/js.js` (신규 생성)
  - 의존성: Task 201 (GAS API 완성)
  - 규모: L
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert, seo-performance-expert
  - 구현 사항:
    - 카드형 클래스 목록 (썸네일, 강의명, 강사명, 별점, 가격, 남은 자리, 지역)
    - 필터 UI: 지역(파트너맵 연동) / 카테고리 / 난이도 / 형태(원데이, 정기, 온라인) / 가격대 / 날짜
    - 정렬: 인기순, 평점순, 가격순, 최신순
    - IIFE 패턴, `.class-catalog` CSS 스코핑
    - GAS 호출 + localStorage 1h 캐싱 (반정적 데이터)
    - 반응형 디자인 (768px / 992px / 1200px)
    - 로딩 스켈레톤 UI + 에러 시 "일시적 장애" 안내

- **Task 212: 클래스 상세 페이지 UI + 결제 연동**
  - See: `/tasks/212-class-detail-ui-payment.md`
  - 대상: `파트너클래스/상세/Index.html`, `파트너클래스/상세/css.css`, `파트너클래스/상세/js.js` (신규 생성)
  - 의존성: Task 211, Task 202
  - 규모: L
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert, ecommerce-business-expert, seo-performance-expert
  - 구현 사항:
    - 대표 이미지 갤러리 (Swiper CDN)
    - 강의 설명 + 커리큘럼 아코디언
    - 강사/공방 프로필 (파트너맵 데이터 연동)
    - 일정 캘린더 (flatpickr CDN) - 날짜/시간, 정원/잔여석
    - 수강 후기 (별점 + 텍스트 + 사진)
    - "이 강의에 필요한 재료" 상품 링크 -> 간편구매 연결
    - 관련 YouTube 영상 (유튜브 v4 연동)
    - 일정 선택 -> 인원 -> 옵션(재료 포함/별도) -> 메이크샵 결제 연동
    - Graceful Degradation: 파트너맵/유튜브/간편구매 연동 실패 시 해당 영역만 "준비 중" 표시
  - 테스트 체크리스트:
    - 상세 페이지 데이터 로딩 + 렌더링 정상 동작
    - 일정 선택 -> 결제 플로우 전체 검증
    - 잔여석 실시간 반영 확인
    - 연동 서비스(파트너맵, 유튜브, 간편구매) 장애 시 Graceful Degradation 동작

#### Phase 2-C: 자동화 + 파트너 시스템 (2~3주)

- **Task 221: 결제 -> 정산 -> 이메일 자동화 GAS 파이프라인**
  - See: `/tasks/221-payment-settlement-email-gas.md`
  - 대상: `파트너클래스/class-platform-gas.gs` (확장)
  - 의존성: Task 202, Task 212
  - 규모: L
  - 에이전트: `주도` gas-backend-expert | `협업` ecommerce-business-expert, makeshop-planning-expert, brand-planning-expert
  - 구현 사항:
    - GAS 시간 트리거: 주기적 새 주문 감지 (10~15분 간격, 시간당 4~6회)
    - 수강생 확인 이메일 (예약번호, 일정, 장소, 준비물)
    - 파트너 예약 안내 이메일 (수강생 정보 - 개인정보 마스킹 010-****-1234)
    - Sheets에 예약 기록 저장
    - 수수료 계산 (매출 구간별 10%/12%/15%) + 적립금 전환 (100%/80%/60%)
    - 적립금 API 호출 (`process_reserve`) + 실패 시 관리자 알림 + 수동 복구 프로세스
    - D-3, D-1 리마인더 이메일 (수강생 + 파트너)
    - 수강 완료 +7일: 후기 작성 유도 이메일
    - 일일 이메일 발송 카운트 Sheets 기록 + 70건 도달 시 Workspace 전환 알림
    - 일 1회 Sheets 잔액 vs 메이크샵 적립금 잔액 정합성 검증 배치
  - 테스트 체크리스트:
    - 새 주문 감지 -> 이메일 발송 전체 파이프라인 E2E 테스트
    - 수수료 계산 정확도 검증 (각 매출 구간별)
    - 적립금 API 호출 성공/실패 시나리오
    - 동시 주문 처리 시 LockService 동작 확인
    - 이메일 발송 실패 시 재시도 로직
    - 정합성 검증 배치 정상 동작 확인

- **Task 222: 파트너 대시보드 + 인증 시스템**
  - See: `/tasks/222-partner-dashboard-auth.md`
  - 대상: `파트너클래스/파트너/Index.html`, `파트너클래스/파트너/css.css`, `파트너클래스/파트너/js.js` (신규 생성)
  - 의존성: Task 201, Task 221
  - 규모: M
  - 에이전트: `주도` makeshop-ui-ux-expert, gas-backend-expert | `협업` makeshop-planning-expert, ecommerce-business-expert
  - 구현 사항:
    - 파트너 인증: `{$member_id}` 치환코드 -> JS에서 읽기 -> GAS 파라미터 전달
    - GAS에서 회원 ID -> 파트너 데이터 매칭 (비파트너 접근 차단)
    - 파트너별 고유 인증 토큰 + Referer 체크(foreverlove.co.kr만 허용)
    - 내 강의 관리: 등록/수정/일정 추가/중단
    - 예약 현황: 실시간 예약 목록, 수강생 연락처 (마스킹)
    - 수익 리포트: 월별 매출, 수수료, 적립금 잔액
    - 적립금 사용: 재료 주문(도매가), 광고 부스트 신청
    - 후기 관리: 수강생 후기 확인 + 답변
    - `.partner-dashboard` CSS 스코핑, IIFE 패턴
  - 테스트 체크리스트:
    - 파트너 인증 플로우 E2E (로그인 -> 치환코드 -> GAS 인증 -> 대시보드)
    - 비파트너 회원 접근 차단 확인
    - 대시보드 각 기능(강의관리, 예약현황, 수익리포트, 적립금) 동작 검증
    - 개인정보 마스킹 정상 표시 확인

- **Task 223: 파트너 가입 및 인증 등급 시스템**
  - See: `/tasks/223-partner-registration-grade.md`
  - 대상: Google Forms + GAS + Sheets
  - 의존성: Task 201
  - 규모: S
  - 에이전트: `주도` ecommerce-business-expert, brand-planning-expert | `협업` gas-backend-expert
  - 구현 사항:
    - 파트너 신청 Google Forms (사업자등록증 + 포트폴리오 제출)
    - 관리자 심사 -> 승인 -> 파트너 코드 자동 발급 (GAS)
    - 인증 등급 체계: 실버(기본) / 골드(10건+, 4.0+) / 플래티넘(50건+, 4.5+)
    - 파트너맵 배지 연동 (등급별 표시)
    - 강의 등록 프로세스: Google Forms -> 관리자 검수 -> 승인 -> 플랫폼 자동 노출

#### Phase 2-D: 교육 + 메인 연동 (1~1.5주)

- **Task 231: 파트너 교육 아카데미 (필수교육 + 인증)**
  - See: `/tasks/231-partner-academy-education.md`
  - 대상: YouTube unlisted 영상 + Google Forms 퀴즈 + GAS
  - 의존성: Task 223
  - 규모: S
  - 에이전트: `주도` brand-planning-expert | `협업` gas-backend-expert
  - 구현 사항:
    - 필수 교육 콘텐츠: 브랜드 가이드라인 / 기본 안전 수칙 / 플랫폼 사용법
    - 선택 교육: 트렌드 업데이트 / 신상품 활용법 / 교육 기법
    - YouTube unlisted 영상 + Google Forms 퀴즈 -> 합격 시 인증서 발급 (GAS)
    - 교육 이수 상태 Sheets 기록 -> 등급 반영

- **Task 232: 메인페이지에 클래스 플랫폼 진입점 추가**
  - See: `/tasks/232-mainpage-class-entry.md`
  - 대상: `메인페이지/Index.html`, `메인페이지/css.css`, `메인페이지/js.js`
  - 의존성: Task 211, Task 212
  - 규모: S
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert, seo-performance-expert
  - 구현 사항:
    - 메인페이지에 "원데이 클래스" 배너/섹션 추가
    - 인기 클래스 3~4개 카드형 미리보기
    - `/클래스` 페이지로의 CTA 버튼
    - GAS에서 인기 클래스 데이터 조회 + 캐싱

#### Phase 2-E: 통합 테스트 (1주)

- **Task 241: 파트너 클래스 플랫폼 통합 테스트**
  - See: `/tasks/241-class-platform-integration-test.md`
  - 대상: 전체 Phase 2 결과물
  - 의존성: Task 221, Task 222, Task 231, Task 232
  - 규모: M
  - 에이전트: `주도` qa-test-expert | `협업` seo-performance-expert, makeshop-planning-expert
  - 구현 사항:
    - 고객 플로우 E2E: 강의 탐색 -> 상세 -> 결제 -> 확인 이메일 -> 리마인더 -> 후기
    - 파트너 플로우 E2E: 가입 -> 교육 -> 강의 등록 -> 대시보드 -> 정산 -> 적립금
    - API 호출 예산 실측: 동시 사용 시 500회/시간 이내 확인
    - 에러 핸들링: GAS 다운, API 실패, Sheets 동시 쓰기 시나리오
    - 이메일 발송 한도 모니터링 테스트
    - PC/모바일 전체 반응형 테스트
    - 보안 테스트: 비인가 접근, 토큰 위조, Referer 우회 시도
  - 테스트 체크리스트:
    - Playwright MCP를 사용한 전체 사용자 플로우 E2E 테스트
    - 시나리오 1(일반 고객 원데이 클래스) 전체 경로 테스트
    - 시나리오 2(제휴 공방 파트너) 전체 경로 테스트
    - 시나리오 3(기업 단체) 문의 -> 알림 테스트
    - 성능: LCP, CLS, Lighthouse 점수 측정
    - 접근성: Lighthouse Accessibility 90+ 확인

---

### Phase 3: 수업 기획 도우미 + 리뷰 고도화 (Phase 2 완료 후)

> **상태**: 대기
> **기간**: 5~7주
> **시작**: Phase 2 완료 후
> **목표**: 강사/체험업체 대상 도구 강화 + 리뷰 생태계 활성화

#### Phase 3-A: 수업 기획 도우미 (3~4주)

- **Task 301: Google Sheets 템플릿 데이터 + GAS API** - 우선순위
  - See: `/tasks/301-planner-sheets-gas.md`
  - 대상: Google Sheets 3개 + `수업기획도우미/planner-gas.gs` (신규 생성)
  - 의존성: Task 201 (Sheets/GAS 패턴 재활용)
  - 규모: M
  - 에이전트: `주도` gas-backend-expert | `협업` ecommerce-business-expert
  - 구현 사항:
    - "프로젝트 템플릿" 시트: ID, 유형명, 카테고리, 난이도, 기본 시간, 설명, 썸네일 (20종+)
    - "재료 매핑" 시트: 템플릿ID, 재료명, branduid, 1인 수량, 단가, 대체재료ID
    - "가이드 콘텐츠" 시트: 템플릿ID, 단계, 제목, 본문(HTML), 이미지URL, YouTube ID
    - GAS 엔드포인트: 템플릿 조회, 재료 산출, 가이드 조회, 이메일 발송
  - 테스트 체크리스트:
    - 각 GAS 엔드포인트 응답 정상 확인
    - 재료 산출 로직 (수량 x 인원 + 여유분 15%) 정확도
    - 이메일 발송 (견적서) 테스트

- **Task 302: 수업 기획 계산기 UI + 로직**
  - See: `/tasks/302-planner-calculator-ui.md`
  - 대상: `수업기획도우미/Index.html`, `수업기획도우미/css.css`, `수업기획도우미/js.js` (신규 생성)
  - 의존성: Task 301
  - 규모: M
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert, ecommerce-business-expert
  - 구현 사항:
    - 프로젝트 템플릿 선택 UI (20종+ 카드형)
    - 파라미터 입력: 수업 유형, 인원, 1인당 예산, 시간, 난이도
    - 자동 산출: 재료 목록 + 수량(여유분 15%) + 단가 + 총액
    - 예산 초과 시 대체 재료 자동 제안
    - 수익 시뮬레이션: 수강료 설정 -> 재료비 차감 -> 예상 수익
    - "전체 재료 장바구니 담기" -> 간편구매 연결
    - HTML -> PDF 견적서 출력 (교육기관 발주용)
    - localStorage에 기획안 저장/불러오기
    - `.class-planner` CSS 스코핑, IIFE 패턴
  - 테스트 체크리스트:
    - 재료 자동 산출 정확도 (다양한 인원/예산 조합)
    - 예산 초과 시 대체 재료 제안 동작
    - 수익 시뮬레이션 계산 정확도
    - "장바구니 담기" -> 간편구매 연결 정상 동작
    - PDF 견적서 출력 정상 동작
    - localStorage 저장/불러오기 정상 동작

- **Task 303: 수업 가이드 라이브러리 + 검색**
  - See: `/tasks/303-guide-library-search.md`
  - 대상: `수업기획도우미/` (Index.html, js.js 확장)
  - 의존성: Task 302
  - 규모: S
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert
  - 구현 사항:
    - 커리큘럼 템플릿 (60분/90분/120분 시간표)
    - 단계별 가이드: 텍스트 + 이미지 + YouTube (v4 연동)
    - 난이도 구분: 입문 / 중급 / 심화
    - 인쇄용 자료: 수강생 배포용 요약 시트
    - Fuse.js 퍼지 검색(CDN) + 필터

- **Task 304: 교육기관 특화 기능 (대량 발주 + 이메일)**
  - See: `/tasks/304-institution-bulk-order.md`
  - 대상: `수업기획도우미/` (js.js 확장) + GAS
  - 의존성: Task 302
  - 규모: S
  - 에이전트: `주도` gas-backend-expert | `협업` ecommerce-business-expert
  - 구현 사항:
    - 재료 목록 + 견적서 이메일 발송 (GAS MailApp)
    - 학교 발주서 양식 기관 형태 견적서 포맷
    - 30명+ 시 B2B 도매가 안내 자동 표시

#### Phase 3-B: 리뷰 고도화 (2~3주)

- **Task 311: 리뷰 허브 페이지 + GAS 백엔드**
  - See: `/tasks/311-review-hub-gas.md`
  - 대상: `리뷰허브/Index.html`, `리뷰허브/css.css`, `리뷰허브/js.js`, `리뷰허브/review-gas.gs` (신규 생성)
  - 의존성: Task 201 (GAS 패턴 재활용)
  - 규모: M
  - 에이전트: `주도` gas-backend-expert, makeshop-ui-ux-expert | `협업` ecommerce-business-expert, seo-performance-expert
  - 구현 사항:
    - 전체 리뷰 모아보기 허브 페이지 (`.review-hub` CSS 스코핑)
    - 필터: 상품별 / 별점 / 리뷰 타입(텍스트/사진/영상)
    - 인피니트 스크롤 (Intersection Observer)
    - GAS 리뷰 CRUD + 이메일 유도(구매 후 7일) + 인센티브 관리
    - 리뷰어 등급: 루키 -> 크래프터 -> 마스터
    - 인센티브: 텍스트 500원 / 사진 1,000원 / 영상 2,000원 / 베스트 5,000원
    - 주간/월간 베스트 리뷰 자동 선정 (좋아요 기반)
  - 테스트 체크리스트:
    - 리뷰 목록 로딩 + 필터 + 인피니트 스크롤 동작 확인
    - 리뷰 작성/수정/삭제 정상 동작
    - 인센티브 적립금 자동 지급 확인
    - 베스트 리뷰 자동 선정 로직 검증

- **Task 312: 상품 상세 리뷰 위젯 (간편구매 삽입용)**
  - See: `/tasks/312-review-widget-product.md`
  - 대상: `리뷰허브/widget/css.css`, `리뷰허브/widget/js.js` (신규 생성)
  - 의존성: Task 311
  - 규모: S
  - 에이전트: `주도` makeshop-ui-ux-expert | `협업` seo-performance-expert
  - 구현 사항:
    - 간편구매 상품 상세에 삽입 가능한 "포토 리뷰" 위젯
    - 해당 상품의 최신 사진/영상 리뷰 3~5개 표시
    - "전체 리뷰 보기" -> 리뷰 허브 연결
    - 위젯 코드 독립적 (다른 페이지에도 삽입 가능하게)

- **Task 313: 리뷰 고도화 통합 테스트**
  - See: `/tasks/313-review-integration-test.md`
  - 대상: 전체 Phase 3-B 결과물
  - 의존성: Task 311, Task 312
  - 규모: S
  - 에이전트: `주도` qa-test-expert | `협업` seo-performance-expert
  - 구현 사항:
    - 리뷰 작성 -> 인센티브 지급 -> 등급 반영 전체 플로우 테스트
    - 베스트 리뷰 선정 + 표시 테스트
    - 상품 상세 위젯 -> 리뷰 허브 연동 테스트
    - PC/모바일 반응형 확인
  - 테스트 체크리스트:
    - Playwright MCP를 사용한 리뷰 플로우 E2E 테스트
    - 리뷰 작성 -> 인센티브 적립 -> 등급 업데이트 전체 경로
    - 위젯에서 리뷰 허브 이동 정상 동작
    - 에러 핸들링 (네트워크 실패, GAS 다운) 시 사용자 안내

---

## 타임라인 요약

```
2026년
2월              3월                 4월~5월                        6월~7월
|-- Phase 1a ---|
| 기존코드개선   |
| Task 101~106  |
|               |
|-- Phase 1b ---|--- Phase 1b ---|
| 유튜브v4      | 브랜드리뉴얼    |
| Task 111      | Task 112~113   |
|               |                |
|               |-- Phase 1.5 ---|
|               | API 검증       |
|               | Task 150~152   |
|               |                |-- Phase 2 --------------------|
|               |                | 파트너 클래스 플랫폼            |
|               |                | Task 201~241                  |-- Phase 3 ---------|
|               |                |                               | 수업 기획 도우미    |
|               |                |                               | 리뷰 고도화         |
|               |                |                               | Task 301~313       |
```

---

## 성공 지표 (KPI)

### 비즈니스 지표

| 지표 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| 페이지 로드 시간 (LCP) | 30% 감소 | - | - |
| 상품->장바구니 전환율 | 10% 증가 | 20% 증가 | 25% 증가 |
| 메인페이지 이탈률 | 15% 감소 | 25% 감소 | - |
| 등록 파트너 강사 | - | 20명 (3개월) | 50명 (6개월) |
| 월간 수강 예약 | - | 50건+ | 150건+ |
| 월 수수료 수익 | - | 25만원+ (검증 보정) | 100만원+ (검증 보정) |
| 파트너 적립금->재료 구매 | - | 50% | 60%+ |
| 수강 후 재료 구매 전환 | - | 40%+ | 50%+ |
| 수업 기획 도우미 월 사용 | - | - | 300회+ |
| 재료 장바구니 전환율 | - | - | 45%+ |
| 사진 리뷰 비율 | - | - | 40%+ |
| 월 신규 리뷰 | - | - | 100건+ |

### 기술 품질 지표

| 지표 | Phase 1 | Phase 2 |
|------|---------|---------|
| IIFE 미적용 JS | 0개 | 0개 |
| CSS 전역 셀렉터 | 0개 | 0개 |
| Lighthouse Performance | 80+ | 85+ |
| Lighthouse Accessibility | 85+ | 90+ |
| Core Web Vitals 합격 | 전체 통과 | 전체 유지 |

---

## 기술 검증 추적

### Critical Issues (Phase 2 착수 전 해결 필수)

| ID | 이슈 | 상태 | 담당 Task |
|----|------|------|----------|
| C-1 | 파트너 인증/인가 메커니즘 | 설계 완료, 구현 대기 | Task 151, Task 222 |
| C-2 | 메이크샵 조회 API 500회/시간 경합 | **분석 완료: 한도 10% 미만 (여유 충분)** | Task 152, Task 241 |
| C-3 | Sheets 기반 정산 데이터 무결성 | 설계 완료, 구현 대기 | Task 201, Task 221 |

### Major Issues

| ID | 이슈 | 상태 | 담당 Task |
|----|------|------|----------|
| M-1 | GAS 이메일 한도 (일 100명) | 모니터링 설계 완료 | Task 221 |
| M-2 | GAS 엔드포인트 보안 | 설계 완료 | Task 201, Task 222 |
| M-3 | 유튜브 v4 카테고리 매칭 정확도 | 긴 키워드 우선 정렬 적용 | Task 111 |
| M-4 | Phase 1 일정 과소평가 | 1a/1b 분리 반영 완료 | Phase 1a, 1b |

### 확장 시나리오 (필요할 때만)

| 전환 시점 | 지표 | 대응 |
|----------|------|------|
| 이메일 100명/일 초과 | 일일 예약 50건+ | Workspace 또는 SendGrid |
| GAS 응답 불만 | 사용자 체감 지연 | Cloudflare Workers 프록시 |
| Sheets 과다 | 10,000행+ | CF D1 (SQLite) 전환 |

---

## Task 의존성 그래프

```
Phase 0 (완료)
  Task 001 -----> (완료)
  Task 002 -----> (완료)
  Task 003 -----> (완료)

Phase 1a (병렬 진행, 서로 독립)
  Task 101 (메인페이지 IIFE)
  Task 102 (간편구매 UX)
  Task 103 (파트너맵 보안)
  Task 104 (lazy loading + 접근성)
  Task 105 (SEO)
  Task 106 (1초 로그인)

Phase 1b (Phase 1a와 병렬, 서로 독립)
  Task 111 (유튜브 v4)
  Task 112 (브랜드스토리 리뉴얼)
  Task 113 (화이트페이퍼 리뉴얼)

Phase 1.5 (Phase 2 착수 전 필수)
  Task 150 (적립금 API 검증)
  Task 151 (치환코드/옵션 검증)
  Task 152 (API 예산 산정) --> Task 150, Task 151에 의존

Phase 2
  Task 201 (Sheets+GAS) --> Task 150, 151, 152에 의존
  Task 202 (클래스 상품) --> Task 201에 의존
  Task 211 (목록 UI) --> Task 201에 의존
  Task 212 (상세 UI) --> Task 211, Task 202에 의존
  Task 221 (정산 자동화) --> Task 202, Task 212에 의존
  Task 222 (파트너 대시보드) --> Task 201, Task 221에 의존
  Task 223 (파트너 가입/등급) --> Task 201에 의존
  Task 231 (교육 아카데미) --> Task 223에 의존
  Task 232 (메인 진입점) --> Task 211, Task 212에 의존
  Task 241 (통합 테스트) --> Task 221, 222, 231, 232에 의존

Phase 3
  Task 301 (기획도우미 GAS) --> Task 201 패턴 재활용
  Task 302 (기획 계산기 UI) --> Task 301에 의존
  Task 303 (가이드 라이브러리) --> Task 302에 의존
  Task 304 (교육기관 특화) --> Task 302에 의존
  Task 311 (리뷰 허브) --> Task 201 패턴 재활용
  Task 312 (리뷰 위젯) --> Task 311에 의존
  Task 313 (리뷰 통합 테스트) --> Task 311, Task 312에 의존
```

---

## 서비스 연동 맵

```
메인페이지 --> 파트너 클래스 플랫폼 --> 간편구매 (재료 구매)
    |              |                        |
    |              |-- 파트너맵 연동         |-- 리뷰 허브 (포토 리뷰 위젯)
    |              |   (강사 위치/프로필)     |
    |              |                        +-- 수업 기획 도우미
    |              |-- 유튜브 v4 연동              |
    |              |   (미리보기 영상)              |-- 재료 일괄 구매 -> 간편구매
    |              |                              +-- 대량 주문 -> 파트너 클래스
    |              +-- 수업 기획 도우미
    |                  (강사 수업 기획)
    |
    +-- 유튜브 v4 (Learn & Shop)

파트너 클래스 플랫폼 (선순환 엔진)
    |-- 고객 결제 -> 수수료 -> 적립금
    |-- 적립금 -> 재료 구매 (간편구매/B2B 도매가)
    +-- 적립금 -> 광고 부스트 -> 더 많은 수강 -> 더 많은 수수료
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-19 | 1.0 | 초기 로드맵 생성 (PRD v1.2 기술 검증 반영) |
| 2026-02-20 | 1.1 | Phase 1a 1차 개발 완료 (Task 101~106), Phase 1b 1차 개발 완료 (Task 111~113) |
| 2026-02-20 | 1.2 | 에이전트 투입 체계 추가 -- 7개 전문가 에이전트 매핑 (Phase 1.5~3 전 태스크), 자동 투입 워크플로우 정의 |
| 2026-02-21 | 1.3 | Task 151 완료 -- 가상태그 `<!--/user_id/-->` 검증 성공, Phase 2 파트너 인증 확정, 옵션 제한 없음 확인 |
| 2026-02-21 | 1.4 | Task 152 완료 -- API 예산 산정 완료 (한도 10% 미만), Phase 1.5 전체 완료, Phase 2 착수 가능 |
