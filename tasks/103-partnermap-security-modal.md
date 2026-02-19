# Task 103: 파트너맵 보안 + 상세 모달 + 길찾기

> **상태**: 대기
> **규모**: M
> **예상 기간**: 2~3일
> **의존성**: 없음

## 목표

파트너맵의 API 키 보안을 강화하고, 파트너 상세 모달과 길찾기 기능을 개선한다. 대량 데이터 처리를 위한 가상 스크롤링을 추가한다.

## 대상 파일

- `파트너맵/js.js` (134,684B, 3,807줄)
- `파트너맵/Index.html` (12,575B, 227줄)
- `파트너맵/css.css` (52,863B, ~1,960줄)
- `파트너맵/Code-final.gs` (8,096B, 271줄)

## 현재 상태 분석

### js.js
- **IIFE 적용 완료**: 모든 서비스가 독립 IIFE로 구성 (PartnerAPI, MapService, FilterService, SearchService, UIService)
- **API 키 노출**: `naverMapNcpKeyId: 'bfp8odep5r'` 하드코딩 (11줄)
- **상세 모달 구현됨**: `showPartnerDetail()` (2781~2887줄) - 로고, 업체명, 카테고리, 소개, 주소, 연락처, 링크
- **길찾기 구현됨**: 네이버 지도/카카오맵 외부 링크 방식 (2843~2852줄)
- **XSS 방지**: `window.escapeHtml()` 적용
- **캐싱**: localStorage 24시간 캐시 구현

### Index.html
- **네이버 지도 SDK**: `<script>` 태그에 ncpKeyId 직접 노출 (226줄)
- **구조**: 히어로 + 검색/필터 + 지도/리스트 + 모달/토스트

### css.css
- **완벽한 스코핑**: `#partnermap-container` 루트로 통일
- **다크모드**: WCAG AA 대비 기준 준수
- **접근성**: 포커스 링, 모션 민감성 대응 완료
- **반응형**: 768px / 992px / 1200px 3단계

### Code-final.gs
- **onEdit()**: P열 "승인" 시 자동 Geocoding (F열 주소 → Q/R열 좌표)
- **doGet()**: 승인된 파트너만 JSON 반환, 좌표 없는 데이터 필터링
- **18개 컬럼**: name, category, address, phone, email, hours, link, description, imageUrl 등

## 구현 단계

- [ ] **1단계: 네이버 클라우드 허용 도메인 설정 (API 보안 최우선)**
  - NCP 콘솔 > Application > Maps > 허용 도메인 설정
  - 허용 도메인: `foreverlove.co.kr`, `www.foreverlove.co.kr`
  - 개발용: `localhost` (배포 후 제거)
  - `NAVER_API_SECURITY.md` 설정 가이드에 따라 진행
  - 설정 완료 후 도메인 외 접근 시 API 차단 확인

- [ ] **2단계: 파트너 상세 모달 개선**
  - 기존 모달에 누락 정보 추가:
    - **영업시간**: hours 필드 표시 (현재 데이터 구조에 존재하나 모달에 미표시 확인)
    - **사진 갤러리**: imageUrl 필드의 다중 이미지 표시 (데이터 구조 확장 필요 시 GAS 수정)
    - **길찾기 버튼 강화**: 현재 위치 기반 거리 표시 (Geolocation API 활용)
  - 모달 오픈 시 스케일 애니메이션 유지 (기존 CSS 활용)
  - 모바일에서 모달 = 바텀 시트 스타일로 변경 검토

- [ ] **3단계: 네이버 지도 앱 딥링크 길찾기 연동**
  - 기존: 웹 브라우저에서 네이버 지도 검색 결과 페이지 오픈
  - 개선: 모바일에서 네이버 지도 앱 딥링크로 직접 길찾기 실행
    ```
    nmap://route/public?dlat={위도}&dlng={경도}&dname={업체명}
    ```
  - 앱 미설치 시 폴백: 웹 지도 URL로 이동
  - 카카오맵도 동일하게 딥링크 적용:
    ```
    kakaomap://route?ep={위도},{경도}&by=CAR
    ```
  - PC에서는 기존 웹 링크 유지

- [ ] **4단계: "가까운 파트너 추천" (검색 결과 없음 UX)**
  - 검색/필터 결과가 0건일 때 "가까운 파트너 추천" 섹션 표시
  - 사용자 현재 위치 기반 거리순 상위 3개 파트너 카드 표시
  - "필터 초기화" 버튼 제공
  - Empty State 디자인은 기존 CSS(1909~1960줄) 확장

- [ ] **5단계: 100개+ 가상 스크롤링**
  - 파트너 리스트 100개 초과 시 뷰포트 내 항목만 렌더링
  - Intersection Observer 기반 가상 스크롤 구현
  - 스크롤 위치에 따라 DOM 노드 재활용
  - 검색/필터 시 스크롤 위치 초기화

- [ ] **6단계: GAS 보안 강화**
  - GAS 배포 설정에서 접근 권한 확인
  - Referer 체크 로직 추가 (foreverlove.co.kr만 허용) - GAS 한계 내에서
  - API 응답에 캐시 헤더 설정 검토

## 수락 기준

- [ ] NCP 허용 도메인이 설정되어 foreverlove.co.kr 외 도메인에서 API 차단된다
- [ ] 파트너 상세 모달에 영업시간, 연락처, 길찾기 버튼이 표시된다
- [ ] 모바일에서 길찾기 버튼 클릭 시 네이버 지도/카카오맵 앱이 실행된다
- [ ] 앱 미설치 시 웹 지도로 폴백된다
- [ ] 검색 결과 0건 시 "가까운 파트너 추천" 섹션이 표시된다
- [ ] 100개+ 파트너 시 스크롤 성능이 저하되지 않는다
- [ ] 기존 IIFE 패턴, CSS 스코핑이 유지된다
- [ ] 메이크샵 가상 태그가 보존되어 있다

## 테스트 체크리스트

- [ ] PC 브라우저 테스트 (Chrome, Safari)
- [ ] 모바일 브라우저 테스트 (iOS Safari, Android Chrome)
- [ ] 허용 도메인 외 접근 차단 확인
- [ ] 파트너 상세 모달 정보 표시 확인
- [ ] 모바일 딥링크 길찾기 동작 확인 (네이버/카카오)
- [ ] 검색 결과 없음 시 추천 파트너 표시 확인
- [ ] 100개+ 데이터로 스크롤 성능 테스트
- [ ] 기존 검색/필터/지도 마커 기능 정상 동작
- [ ] 다크모드에서 모달/추천 섹션 스타일 확인
- [ ] 콘솔 에러 0개 확인

## 참고

- 파트너맵은 이미 코드 품질이 높은 편 (IIFE, CSS 스코핑, 접근성 모두 적용)
- 이 Task는 기존 기반 위에 기능을 추가/개선하는 작업
- 네이버 지도 앱 딥링크 문서: https://guide.ncloud-docs.com/docs/maps-url-scheme

## 변경 사항 요약

### js.js 변경
1. **processPartnerData**: `hours`, `link` 필드 매핑 추가
2. **showPartnerDetail**:
   - `partner.logo` → `partner.logoUrl || partner.imageUrl` 참조 수정 (모달 + 카드)
   - 영업시간(hours) 섹션 추가
   - `link` 필드에서 homepage/instagram 자동 분리 추출
   - 모바일: 네이버 지도 앱 딥링크(`nmap://route/public`) + 카카오맵 딥링크(`kakaomap://route`) 적용
   - PC: 기존 웹 링크 유지
   - 앱 미설치 시 1.5초 후 웹 지도 폴백
   - `rel="noopener noreferrer"` 보안 속성 추가
3. **renderPartnerList**: Empty State에 "가까운 파트너 추천" 기능 추가
   - GPS 기준점 기반 거리순 상위 3개 파트너 카드 표시
   - 추천 카드 클릭 시 상세 모달 오픈
4. **calculateDistanceSimple**: UIService에 Haversine 거리 계산 유틸 추가

### css.css 변경
1. 가까운 파트너 추천 카드 스타일 (`.pm-nearby-suggest`, `.pm-nearby-card`)
2. 영업시간 표시 스타일 (`.pm-hours-text`)

### Code-final.gs 변경
1. `doGet(e)` 시그니처 변경 + API 토큰 검증 로직 추가
2. 응답에 `cacheControl`, `serverVersion` 메타 정보 추가

### NAVER_API_SECURITY.md 변경
1. 허용 도메인 예시를 실제 도메인(`foreverlove.co.kr`)으로 수정

### 미구현 (관리자 수동 작업)
- NCP 콘솔에서 허용 도메인 설정 (가이드 제공됨)
- GAS 재배포 (토큰 검증은 선택적 - 미전송 시 기존과 동일 작동)
- VirtualScroll: 기존 30개+ 시 자동 활성화 구현이 이미 존재하여 추가 작업 불필요
