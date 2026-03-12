# PRESSCO21 파트너클래스 엔터프라이즈 고도화 PRD

> **버전**: 6.1
> **작성일**: 2026-03-12
> **기반**: Playwright 라이브 테스트 13건 결함 + 4개 에이전트 팀미팅(CSO+CTO, CMO, CFO+COO, UX/브랜드/플랫폼 전문가) + CEO 5대 결정사항 + CSO 종합 권고 + 대표 인터뷰(2026-03-12)
> **변경점**: 라이브 테스트 기반 실제 결함 반영, Phase 재편(E0 긴급/E1 핵심/E2 성장/E3 스케일), 수수료 비공개 위반 수정, 파트너맵 통합 전략(네이버 지도 API 활용), 목록 CSS/카드 리디자인, 테스트 데이터 제거 프로토콜, 이미지 파이프라인 설계, 빈 상태 UX 패턴, 마이크로인터랙션 스펙 추가, 상세페이지 템플릿 시스템 신규, 파트너 신청 시 썸네일 필수화
> **이전 버전**: PRD v5.0 (2026-03-10) 대체
>
> ### v6.0 → v6.1 대표 인터뷰 반영 (2026-03-12)
> | # | 결정 | 반영 |
> |---|------|------|
> | **D6** | 지도 SDK: 네이버 지도 API 유지 (기존 파트너맵 ncpKeyId: `bfp8odep5r` 활용) | 전체 파트너맵 관련 스펙 |
> | **D7** | 이미지: AI 생성 일러스트 6종으로 즉시 적용 → 파트너 신청 시 썸네일 첨부 필수화 | E0-004, E1-F110 |
> | **D8** | 상세페이지 템플릿: 파트너에게 통일된 클래스 상세 템플릿(텍스트+사진 영역) 제공하여 상세페이지 제작 부담 해소 | E1-F111 (신규) |
> | **D9** | 배포 전략: C안 확정 — E0 후 파일럿 1명 소프트 론칭 | ROADMAP |

---

## 1. 프로젝트 핵심

### 1-1. 목적

꽃공예 강사(파트너)가 수업 운영에만 집중할 수 있도록, 일정 관리부터 재료 키트 연동, 수강생 성장 파이프라인까지 플랫폼이 모든 운영 부담을 대신 처리한다. 동시에 수강생은 전국의 오프라인/온라인 강의를 카테고리와 지역 기준으로 빠르게 탐색하고 예약할 수 있어야 한다.

### 1-2. 북극성 문장

> "수강생이 클래스 예약부터 재료 재구매까지 끊김 없이 흐르는 경험을 완성하여, 파트너클래스를 자사몰 트래픽과 매출의 핵심 유입 엔진으로 만든다."

확장 표현:

> PRESSCO21 파트너클래스는 수강생에게는 믿고 예약할 수 있는 클래스 허브, 파트너에게는 강의만 잘하면 되게 만드는 운영 지원 플랫폼, 협회에게는 회원 락인과 공동 홍보를 제공하는 제휴 플랫폼이다.

### 1-3. 핵심 차별점

1. **재료 공급자 = 교육 플랫폼 운영자**: 재료 공급자가 교육 플랫폼을 운영하는 유일한 구조. "배우고 끝이 아닙니다. 같은 재료로 계속 만들 수 있습니다."
2. **역수수료 구조**: 경쟁사(프립 15~20%, 클래스101 30%)와 달리 등급이 올라갈수록 수수료가 낮아지는 파트너 친화 구조
3. **파트너 OS**: 결제, 정산, 키트/재료 준비, 홍보, 일정 운영을 PRESSCO21이 대신하는 운영 대행 서비스

### 1-4. 수익 모델 3층 구조

| 층 | 수익원 | 설명 | 전략적 위치 |
|----|--------|------|-----------|
| **1층** (핵심) | 재료키트 판매 | 건당 순이익 6,000~18,000원 | 핵심 수익 엔진 |
| **2층** (플랫폼) | 강의료 수수료 | 등급별 10~25% | 플랫폼 유지 + 파트너 락인 |
| **3층** (생태계) | 파트너 도매 재료 + 수강생 후속 재구매 | 생태계 선순환 | Flywheel 동력 |

**협회원 LTV**: 24개월 기준 197,557원 (CFO 산출)

### 1-5. CEO 의사결정 반영 (2026-03-10 확정, v6 재검증)

| # | 의사결정 | 반영 위치 | v6 검증 상태 |
|---|---------|----------|-------------|
| **D1** | 키트 전략: 별도 선제작 없음. 파트너별 강의 재료를 자사몰 기존 상품으로 연결 → 정리 후 묶음 키트 상품화 → "강의만/키트포함" 선택형 | E1-F100, E2-F208 | 유지 |
| **D2** | 수수료율 온라인 비공개. 대표가 직접 메일/전화/대면으로 안내 | 2절 전체 | **위반 발견 → E0에서 즉시 수정** |
| **D3** | 협회 순서: 1차 어머니 협회 + 기존 활성 고객 → 2차 부케 관련 활성 협회 | E2-F201 | 유지 |
| **D4** | 정규화: 6개 도메인 전체 UPPERCASE 일괄 | E0-F001 | 유지 |
| **D5** | 핵심 방향: "파트너를 섭외하려면 Phase 2까지 구현된 걸 보여줘야 한다" → 테스트 데이터로 시뮬레이션하며 검증 + 구현 병행 | E1-F209 | **테스트 데이터 공개 노출 결함 발견 → E0에서 즉시 제거** |

---

## 2. 수수료 구조 (내부 운영 기준 — 온라인 비공개)

> **[D2] 절대 원칙**: 아래 수수료율 테이블은 내부 운영/정산 계산용이다. 파트너 대시보드, 파트너 신청, 목록, 상세 등 모든 온라인 화면에 수수료율(%)을 직접 노출하지 않는다. 대표가 메일/전화/대면으로 개별 안내한다.

| 등급 | 수수료율 | 파트너 수취율 | 승급 조건 |
|------|---------|-------------|----------|
| **BLOOM** (입문) | 25% | 75% | 파트너 승인 시 기본 |
| **GARDEN** (성장) | 20% | 80% | 수업 완료 10건 + 평점 4.0 이상 |
| **ATELIER** (전문) | 15% | 85% | 수업 완료 30건 + 평점 4.3 이상 |
| **AMBASSADOR** (대표) | 10% | 90% | 수업 완료 50건 + 신규 파트너 추천 3명 |

### 수수료 정책 세부

- 수수료는 **강의료(수강료)에서만** 차감. 재료키트 매출에서는 수수료 미적용.
- 적립금 지급 방식: 수수료 차감 후 금액을 메이크샵 적립금으로 지급.
- 등급 심사: WF-13이 월 1회 자동 평가, 조건 충족 시 자동 승급.
- 등급 하향: 3개월 연속 수업 0건 시 한 단계 하향 (BLOOM은 유지).

### v6 수수료 비공개 위반 수정 사항

**라이브 테스트 결함 #6**: 파트너 대시보드(2608) 수익 리포트에서 등급별 수수료율(25%/20%/15%/10%) 테이블이 공개 노출됨.

**수정 방법**:
```
파트너클래스/파트너/js.js 내 수익 리포트 렌더링 함수에서:

1. 등급별 수수료율 테이블 HTML 생성 코드 제거
2. 대체 표시:
   - 파트너 본인 등급명 (BLOOM/GARDEN/ATELIER/AMBASSADOR)
   - 등급 진행률 게이지 (승급 조건 대비 현재 달성도)
   - 비금전적 인센티브 안내
   - "수수료 정책은 담당자에게 문의해 주세요" 안내 문구
3. 파트너 본인의 정산 내역은 유지:
   - 정산 금액 (수취 금액)
   - 정산 상태 (대기/완료)
   - 정산 이력
   - 단, 수수료율(%) 자체는 표시하지 않음
```

---

## 3. 라이브 테스트 결과 기반 현재 상태 진단 (2026-03-12)

### 3-1. Playwright 라이브 테스트 결함 (13건)

#### CRITICAL (5건 — E0에서 즉시 수정)

| # | 결함 | 페이지 | 상세 | 영향 |
|---|------|--------|------|------|
| C1 | **파트너맵 403** | 상세(2607), 목록(2606) | `/partnermap` 경로가 메이크샵에 등록되지 않아 403 반환. 모든 클래스 카드의 "파트너맵에서 공방 보기" 링크 깨짐 | 수강생이 공방 위치 확인 불가 |
| C2 | **목록 CSS 렌더링** | 목록(2606) | 7개 클래스가 DOM에 존재하나 데스크탑에서 화면 미표시. "전국 탐색 허브" 섹션이 클래스 카드 영역을 가림 | 핵심 페이지 사용 불가 |
| C3 | **테스트 데이터 공개 노출** | 목록(2606), 상세(2607) | "코딩 클래스", "장지호 (테스트 파트너)", "지도 검증 필요할듯" 등 공개 페이지에 그대로 노출 | 서비스 신뢰도 손상 |
| C4 | **상세 이미지 없음** | 상세(2607) | "이미지 준비중" 텍스트만 표시. 클래스 대표 이미지 미등록 | 예약 전환율 치명적 저하 |
| C5 | **Trust Summary 0/0/0** | 상세(2607) | 수강 0명, 평점 0.0, 후기 0건이 숫자 그대로 노출 → 부정적 사회증거 | 신규 클래스의 신뢰 파괴 |

#### HIGH (8건 — E0~E1에서 수정)

| # | 결함 | 페이지 | 상세 | 영향 |
|---|------|--------|------|------|
| H1 | **수수료율 공개 위반** | 대시보드(2608) | 수익 리포트에 등급별 수수료율(25%/20%/15%/10%) 테이블 공개 → CEO 결정 D2 위반 | 정책 위반 |
| H2 | **모바일 필터 기본 오픈** | 목록(2606) | 375px 뷰포트에서 필터 패널이 기본 열린 상태로 콘텐츠 가림 | 모바일 UX 파괴 |
| H3 | **파트너 대시보드 API 에러** | 대시보드(2608) | getPartnerBookings, getPartnerReviews → "Unexpected end of JSON input" | 대시보드 핵심 기능 불가 |
| H4 | **Kakao SDK integrity 불일치** | 상세(2607) | sha384 해시 에러 → 카카오 공유 기능 불가 | 바이럴 채널 차단 |
| H5 | **ChannelIO 이중 로드** | 전체 | "ChannelIO script included twice" → 성능 저하 | 사용자 체감 속도 하락 |
| H6 | **placeholder.com 404** | 메인페이지 | Product1-4 이미지 ERR_NAME_NOT_RESOLVED | 메인 시각적 결함 |
| H7 | **영어/한글 혼재** | 목록(2606), 상세(2607) | INTERMEDIATE/BEGINNER 영어 + 입문/중급 한글 혼용 | 브랜드 일관성 저하 |
| H8 | **온보딩 체크리스트 불일치** | 대시보드(2608) | "1/4 완료"라고 하면서 5단계 존재 | UX 혼란 |

### 3-2. 양호 항목 (보존 대상)

| 항목 | 위치 | 평가 |
|------|------|------|
| 빈 상태 UX | 마이페이지(8010) | "아직 수강 내역이 없어요" + CTA 양호 |
| 대시보드 구조 | 대시보드(2608) | 온보딩, 액션보드, 탭 구조 잘 설계됨 |
| 등급 진행률 | 대시보드(2608) | 비화폐 인센티브 설계 우수 |
| Learn & Shop | 메인페이지 | YouTube 20개 + 추천 재료 양호 |
| 서비스 소개 | 메인페이지 | 파트너 클래스 서비스 소개 섹션 잘 배치 |

### 3-3. 기존 완료 자산 (Phase 2.7까지)

| 영역 | 완료 항목 |
|------|----------|
| 메이크샵 페이지 | 목록(2606), 상세(2607), 대시보드(2608), 파트너신청(2609), 교육(2610), 강의등록(8009), 마이페이지(8010), 어드민(8011) — 총 8페이지 |
| n8n 워크플로우 | 19개 WF ACTIVE + WF JSON 22개 |
| NocoDB 테이블 | 11개 테이블 운영 중 |
| 핵심 완료 기능 | 일정 시스템, 클래스 수정, 이메일 알림, 수강생 예약 확인, 재료키트 자동 배송, 관리자 어드민, 협회 제휴 DB, 4등급 회원 체계, CS FAQ, 잔여석 표시, 선물하기 |

### 3-4. 기술 부채 (CTO 진단)

| 부채 | 심각도 | 상세 |
|------|--------|------|
| NocoDB 백업 부재 | **CRITICAL** | 일일 자동 백업 미구축. 데이터 손실 시 복구 불가 |
| Google Sheets 이중관리 | **HIGH** | NocoDB와 Google Sheets에 동일 데이터 이중 기록 |
| Oracle Free Tier SPOF | **HIGH** | 단일 서버 장애점. Swap 4GB 추가했으나 근본 해결 아님 |
| SMTP 단일 의존 | **MEDIUM** | 네이버 SMTP 단일 의존. 장애 시 모든 이메일 알림 중단 |
| WF-ADMIN 중복 ID | **HIGH** | 이전 ID + 현재 ID 공존 |
| WF-01 God Workflow | **MEDIUM** | 단일 WF에 다수 액션 집중 |

---

## 4. 사용자 여정 (목표 상태)

### 4-1. 수강생 여정 (CMO 6단계 퍼널)

```
[인지] SNS/검색/협회 → 파트너클래스 목록(2606)
  |
[탐색] 퀵 필터 칩 바(지역/카테고리/난이도) → 큐레이션 섹션
       → 카테고리 / 지역 / 형태(오프라인/온라인) 선택
       → 오프라인: 리스트/지도 전환(인라인 네이버 지도)
       → 온라인: 리스트 중심 비교
       → 신뢰 배지(키트포함/초보환영/인기강의/마감임박)
  |
[예약] 상세(2607) → Trust Summary Bar
       → "이 가격에 포함된 것" 확인
       → 일정 캘린더 + 잔여석 확인 → 인원 선택
       → "강의만 예약" 또는 "키트포함 예약" 선택 [D1]
       → 로그인 → 메이크샵 결제
  |
[수강] WF-05 폴링 감지 → 결제 확인 이메일
       → D-3/D-1 리마인더(WF-11) → 수강 완료
  |
[재구매] 후기 요청(WF-12) → 후기 작성 시 쿠폰 지급
         → "이 수업에 사용된 재료 구매하기" CTA → 자사몰
  |
[팬/파트너] 수료증 1개 이상 → "강사 도전하기" CTA
            → 파트너 신청(2609) 우대 심사
```

### 4-2. 파트너 여정

```
[발견] 세일즈형 파트너 신청 랜딩(6섹션)
       → "강의만 잘하시면 됩니다. 나머지는 저희가 합니다."
  |
[신청] 파트너 신청(2609) → WF-07 접수 → 관리자 승인
       → BLOOM 등급 배정 (수수료율은 대표가 개별 안내) [D2]
  |
[온보딩] 교육 이수(2610) → 온보딩 체크리스트(5단계) 완료
         → 강의 등록(8009) → 일정 + 자사몰 상품 링크 입력 [D1]
         → 관리자 승인(WF-17) → 메이크샵 상품 자동 등록
  |
[운영] 대시보드(2608) 액션 보드
       → 오늘 수업 / 키트 준비 / 미답변 후기
       → 일정 관리 / 강의 수정 / 예약 현황 / 수익 차트
  |
[정산] WF-05 결제 감지 → D+3 보류 → D+7 확정 → 격월 지급
  |
[성장] 등급 자동 승급: BLOOM → GARDEN → ATELIER → AMBASSADOR
       → 비금전적 인센티브 (프로필 배지, 콘텐츠 허브, 멘토링)
```

### 4-3. 관리자 여정

```
어드민 페이지(8011)
  +-- 파트너 신청 승인/거부 → 상세 슬라이드 패널 + 일괄 처리
  +-- 강의 승인/거부 → WF-17 연동
  +-- 정산 현황 + 수동/자동 처리
  +-- 협회 관리 → 제휴 협회 테이블 + 월간 집계
  +-- 파트너 이탈 감지 → 비활동 파트너 경보
  +-- 감사 로그 → NocoDB tbl_AuditLog
```

---

## 5. 기능 명세 (Phase별)

### Phase E0: 긴급 수정 (1주)

> **목표**: 라이브 테스트 CRITICAL 5건 + HIGH 수수료 위반 즉시 해결. 공개 서비스 최소 품질 확보.
> **원칙**: 기능 추가 없음. 기존 코드의 버그/정책 위반만 수정.

---

#### E0-001. 테스트 데이터 제거

**결함 참조**: C3 (테스트 데이터 공개 노출)

**즉시 조치**:

1. NocoDB tbl_Classes에서 `[TEST]` prefix 또는 테스트 목적 레코드 식별
2. 테스트 클래스 status를 `DRAFT`로 변경 (삭제가 아닌 비공개 전환)
3. tbl_Partners에서 테스트 파트너 status를 `SUSPENDED`로 변경
4. 관련 tbl_Schedules, tbl_Settlements, tbl_Reviews 레코드도 비공개 처리

**WF-01 필터 추가** (즉시):
```javascript
// Code 노드 내 getClasses 쿼리에 추가
// 테스트 데이터 필터: [TEST] prefix 제외
var whereClause = '(status,eq,ACTIVE)~and~(title,nlike,%25[TEST]%25)';

// demo=true 파라미터가 있을 때만 테스트 데이터 포함
if (inputData.demo === 'true') {
  whereClause = '(status,eq,ACTIVE)';
}
```

**향후 데이터 관리 원칙** [D5]:
- 테스트 데이터는 반드시 `[TEST]` prefix 사용
- 실 운영 전환 시 일괄 비공개 스크립트 실행
- 데모 URL은 `?demo=true` 파라미터로 테스트 데이터 필터 제어

---

#### E0-002. 파트너맵 403 해결

**결함 참조**: C1 (파트너맵 403)

**즉시 조치 (A안 — 1일)**:
```javascript
// 목록/js.js, 상세/js.js 내 파트너맵 링크를 임시 비활성화
// 기존: <a href="/partnermap?partner=...">파트너맵에서 공방 보기</a>
// 변경: 링크 제거하고 공방 주소 텍스트만 표시
// 또는: Google Maps 링크로 대체
var mapLink = 'https://map.kakao.com/link/search/'
  + encodeURIComponent(partner.address);
```

**중기 조치 (E1-F110 — 2~4주)**:
- 목록 페이지 내 인라인 네이버 지도 API 연동 (기존 파트너맵 ncpKeyId 활용)
- NocoDB tbl_Partners의 latitude/longitude 필드 활용
- 별도 `/partnermap` 경로 불필요 → 목록 내 "지도에서 보기" 토글로 통합

---

#### E0-003. 목록 CSS 렌더링 수정

**결함 참조**: C2 (목록 CSS 렌더링)

**원인 분석**: "전국 탐색 허브" 섹션(`#pc-nationwide-hub`)이 절대/고정 위치로 클래스 카드 그리드 영역을 가림.

**수정 사항**:
```css
/* 목록/css.css */

/* 전국 탐색 허브 섹션을 미니 배너로 축소 */
#pc-nationwide-hub {
  position: relative; /* absolute/fixed 제거 */
  max-height: 80px;   /* 히어로 대신 미니 배너 */
  overflow: hidden;
  margin-bottom: 16px;
}

/* 클래스 그리드가 허브 아래에 정상 배치되도록 */
.pc-class-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
```

**추가 확인**:
- 데스크탑(1200px+), 태블릿(768~991px), 모바일(~767px) 각각 카드 렌더링 확인
- DOM에 7개 클래스가 있는데 화면에 0개 보이는 상황이 완전히 해결되었는지 검증

---

#### E0-004. 상세 이미지 빈 상태 처리

**결함 참조**: C4 (상세 이미지 없음)

**수정 사항**:
```javascript
// 상세/js.js 내 이미지 렌더링 함수

function renderClassImage(imageUrl, className) {
  if (imageUrl && imageUrl !== '' && imageUrl !== 'null') {
    return '<img src="' + imageUrl + '" alt="' + className
      + '" class="detail-hero__image" loading="lazy">';
  }

  // 이미지 없을 때: 카테고리별 일러스트 대체
  var categoryIllustrations = {
    'bouquet': '/shop/data/skin/pressco21/img/class-placeholder-bouquet.svg',
    'arrangement': '/shop/data/skin/pressco21/img/class-placeholder-arrangement.svg',
    'wreath': '/shop/data/skin/pressco21/img/class-placeholder-wreath.svg',
    'accessory': '/shop/data/skin/pressco21/img/class-placeholder-accessory.svg',
    'preserved': '/shop/data/skin/pressco21/img/class-placeholder-preserved.svg',
    'default': '/shop/data/skin/pressco21/img/class-placeholder-default.svg'
  };

  var category = (classData.category || 'default').toLowerCase();
  var placeholderSrc = categoryIllustrations[category]
    || categoryIllustrations['default'];

  return '<div class="detail-hero__placeholder">'
    + '<img src="' + placeholderSrc + '" alt="' + className
    + ' - 이미지 준비중" class="detail-hero__placeholder-img">'
    + '<span class="detail-hero__placeholder-badge">'
    + 'NEW</span>'
    + '</div>';
}
```

```css
/* 상세/css.css */
.detail-hero__placeholder {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  background: linear-gradient(135deg, #f8f6f3 0%, #ede9e3 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.detail-hero__placeholder-img {
  width: 60%;
  max-width: 200px;
  opacity: 0.6;
}

.detail-hero__placeholder-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #7d9675;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
```

---

#### E0-005. Trust Summary 빈 상태 처리

**결함 참조**: C5 (Trust Summary 0/0/0)

**원칙**: 0건 숫자를 그대로 노출하면 부정적 사회증거가 된다. 숫자가 유의미해질 때까지 대체 메시지를 표시한다.

**수정 사항**:
```javascript
// 상세/js.js 내 Trust Summary 렌더링

function renderTrustSummary(classData) {
  var totalBookings = parseInt(classData.total_bookings || 0);
  var avgRating = parseFloat(classData.avg_rating || 0);
  var reviewCount = parseInt(classData.review_count || 0);

  var html = '<div class="detail-trust-summary">';

  // 신뢰 배지 (항상 표시)
  html += '<div class="detail-trust-summary__badges">';
  html += '<span class="trust-badge trust-badge--verified">'
    + '<svg class="trust-badge__icon" width="16" height="16">...</svg>'
    + 'PRESSCO21 검수 완료</span>';

  if (classData.kit_enabled) {
    html += '<span class="trust-badge trust-badge--kit">'
      + '재료 키트 포함</span>';
  }

  html += '<span class="trust-badge trust-badge--refund">'
    + '수업 3일 전 전액 환불</span>';
  html += '</div>';

  // 숫자 통계 (기준치 이상일 때만)
  if (totalBookings >= 5 || reviewCount >= 3) {
    html += '<div class="detail-trust-summary__stats">';

    if (totalBookings >= 5) {
      html += '<span class="trust-stat">'
        + '<strong>' + totalBookings + '</strong>명 수강</span>';
    }

    if (avgRating >= 3.0 && reviewCount >= 3) {
      html += '<span class="trust-stat">'
        + '<strong>' + avgRating.toFixed(1) + '</strong> 평점</span>';
    }

    if (reviewCount >= 3) {
      html += '<span class="trust-stat">'
        + '<strong>' + reviewCount + '</strong>개 후기</span>';
    }

    html += '</div>';
  } else {
    // 기준치 미달: "새로 오픈한 클래스" 배지
    html += '<div class="detail-trust-summary__new">';
    html += '<span class="trust-badge trust-badge--new">'
      + '새로 오픈한 클래스</span>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}
```

**표시 기준**:
| 조건 | 표시 방식 |
|------|----------|
| 수강 5명 미만 AND 후기 3건 미만 | "새로 오픈한 클래스" 배지 + 신뢰 배지만 |
| 수강 5명 이상 OR 후기 3건 이상 | 해당 수치만 선별 표시 |
| 수강 30명 이상 + 후기 10건 이상 | 전체 수치 표시 + "인기 강의" 배지 |

---

#### E0-006. 수수료율 공개 위반 수정

**결함 참조**: H1 (수수료율 공개 위반) [D2]

**수정 위치**: `파트너클래스/파트너/js.js` 수익 리포트 탭

**수정 내용**:
```javascript
// 제거 대상: 등급별 수수료율 비교 테이블
// 기존 코드에서 아래와 유사한 HTML 생성 코드 삭제:
// BLOOM 25% / GARDEN 20% / ATELIER 15% / AMBASSADOR 10%

// 대체: 등급 성장 가이드 (수수료율 미포함)
function renderGradeGrowthGuide(currentGrade) {
  var grades = [
    { code: 'BLOOM', label: 'BLOOM', color: '#7d9675',
      benefit: '파트너 활동 시작' },
    { code: 'GARDEN', label: 'GARDEN', color: '#5a8a4f',
      benefit: '프로필 배지 + 우선 노출' },
    { code: 'ATELIER', label: 'ATELIER', color: '#c4a35a',
      benefit: '콘텐츠 허브 인터뷰 + 배너 노출' },
    { code: 'AMBASSADOR', label: 'AMBASSADOR', color: '#8b6f47',
      benefit: '멘토링 + 세미나 공동 기획' }
  ];

  // 등급 진행률 + 비금전적 인센티브만 표시
  // 수수료율(%) 절대 미포함
  var html = '<div class="pd-grade-guide">';
  html += '<h4 class="pd-grade-guide__title">등급별 혜택</h4>';
  html += '<p class="pd-grade-guide__desc">'
    + '수수료 정책은 담당자에게 문의해 주세요.</p>';

  grades.forEach(function(grade) {
    var isCurrent = grade.code === currentGrade;
    html += '<div class="pd-grade-card'
      + (isCurrent ? ' pd-grade-card--current' : '') + '">';
    html += '<span class="pd-grade-card__dot" style="background:'
      + grade.color + '"></span>';
    html += '<span class="pd-grade-card__label">'
      + grade.label + '</span>';
    html += '<span class="pd-grade-card__benefit">'
      + grade.benefit + '</span>';
    if (isCurrent) {
      html += '<span class="pd-grade-card__badge">현재 등급</span>';
    }
    html += '</div>';
  });

  html += '</div>';
  return html;
}
```

---

#### E0-007. 모바일 필터 기본 닫힘 처리

**결함 참조**: H2 (모바일 필터 기본 오픈)

**수정 사항**:
```javascript
// 목록/js.js 초기화 시점

(function() {
  'use strict';

  // 모바일 뷰포트에서 필터 패널 기본 닫힘
  function initMobileFilter() {
    var filterPanel = document.querySelector('.pc-filter-panel');
    if (!filterPanel) return;

    if (window.innerWidth <= 767) {
      filterPanel.classList.remove('pc-filter-panel--open');
      filterPanel.classList.add('pc-filter-panel--collapsed');
      filterPanel.setAttribute('aria-expanded', 'false');
    }
  }

  // DOM 로드 후 실행
  document.addEventListener('DOMContentLoaded', initMobileFilter);
  window.addEventListener('resize', function() {
    // 768px 미만으로 전환 시 자동 닫힘
    if (window.innerWidth <= 767) {
      var filterPanel = document.querySelector('.pc-filter-panel');
      if (filterPanel && filterPanel.classList.contains('pc-filter-panel--open')) {
        filterPanel.classList.remove('pc-filter-panel--open');
        filterPanel.classList.add('pc-filter-panel--collapsed');
      }
    }
  });
})();
```

```css
/* 목록/css.css */
@media (max-width: 767px) {
  .pc-filter-panel--collapsed {
    display: none;
  }

  .pc-filter-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
    margin-bottom: 12px;
  }
}
```

---

#### E0-008. 파트너 대시보드 API 에러 수정

**결함 참조**: H3 (Unexpected end of JSON input)

**원인**: WF-ADMIN의 getPartnerBookings/getPartnerReviews 응답이 빈 문자열을 반환하는 경우.

**수정 (n8n WF-ADMIN)**:
```javascript
// WF-ADMIN Code 노드 내 응답 생성

// 기존: items가 없으면 빈 문자열 반환
// 수정: 항상 유효한 JSON 반환

var result = {
  success: true,
  data: {
    bookings: items.length > 0 ? items : [],
    total: items.length,
    page: 1,
    totalPages: 1
  }
};

return [{ json: result }];
```

**프론트엔드 방어 코드**:
```javascript
// 파트너/js.js 내 API 호출부

function fetchPartnerData(action, params) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action: action }, params))
  })
  .then(function(response) {
    // 빈 응답 방어
    var contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { success: true, data: { bookings: [], total: 0 } };
    }
    return response.text().then(function(text) {
      if (!text || text.trim() === '') {
        return { success: true, data: { bookings: [], total: 0 } };
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn('JSON 파싱 실패:', e.message);
        return { success: false, error: '데이터 로딩 오류' };
      }
    });
  });
}
```

---

#### E0-009. Kakao SDK integrity 수정

**결함 참조**: H4 (Kakao SDK integrity 불일치)

**수정**: Kakao JS SDK CDN의 integrity 해시를 최신 버전으로 갱신하거나 integrity 속성 제거.

```html
<!-- 상세/Index.html -->
<!-- 기존: integrity 해시 불일치 -->
<!-- 수정: 최신 Kakao SDK + integrity 재생성 또는 제거 -->
<script
  src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
  crossorigin="anonymous">
</script>
```

> **주의**: Kakao SDK는 카카오 공유 기능 전용. 파트너맵 지도는 네이버 지도 API를 사용 (D6 결정).

---

#### E0-010. 기타 긴급 수정

| 항목 | 수정 내용 |
|------|----------|
| ChannelIO 이중 로드 (H5) | 메이크샵 전역 footer에 이미 ChannelIO 스크립트가 포함된 상태에서 개별 페이지 JS에서 재로드. 개별 페이지의 ChannelIO 초기화 코드에 중복 체크 추가: `if (window.ChannelIO) return;` |
| placeholder.com 404 (H6) | 메인페이지 Product1-4 이미지 URL을 자사몰 실제 상품 이미지로 교체 |
| 영어/한글 혼재 (H7) | 프론트 표시 시 정규화 매핑 함수 적용 (E0-F001의 부분 선행) |
| 온보딩 체크리스트 불일치 (H8) | "1/4 완료" 텍스트를 "1/5 완료"로 수정. 체크리스트 단계 수와 진행률 계산 정합성 확인 |

---

### Phase E1: 핵심 기능 완성 (2~4주)

> **목표**: 수강생→키트 재구매 연결 완성 + 정산 자동화 + 목록/상세 UX 리디자인 + 파트너 1명 소프트 론칭 준비
> **마일스톤**: 파트너 1명 파일럿 운영 + 수강 첫 건 발생 + 키트 연계 동작 확인

---

#### E1-F001. 상태값 정규화 (6개 도메인)

[D4] 6개 도메인의 상태값을 UPPERCASE ENUM으로 통일.

**정규화 대상**:

| 도메인 | 현재 상태 | 정규화 후 | 프론트 표시 (한국어) |
|--------|----------|----------|-------------------|
| difficulty | `beginner`/`입문` | `BEGINNER` | 입문 |
| difficulty | `intermediate`/`중급` | `INTERMEDIATE` | 중급 |
| difficulty | `advanced`/`심화` | `ADVANCED` | 심화 |
| difficulty | — | `ALL_LEVELS` | 전체 수준 |
| grade | `SILVER` | `BLOOM` | BLOOM |
| grade | `GOLD` | `GARDEN` | GARDEN |
| classStatus | `active` | `ACTIVE` | 활성 |
| classStatus | `INACTIVE` | `DRAFT` | 초안 |
| classStatus | `paused` | `PAUSED` | 일시정지 |
| classStatus | `rejected` | `REJECTED` | 반려 |
| region | `서울 강남구` | `SEOUL` | 서울 |
| bookingStatus | 혼재 | `PENDING`/`CONFIRMED`/`COMPLETED`/`CANCELLED`/`REFUNDED` | 한국어 |
| approvalStatus | 혼재 | `PENDING`/`APPROVED`/`REJECTED`/`SUSPENDED` | 한국어 |

**실행 순서**:
1. NocoDB 데이터 백업 (E0-F000 선행)
2. 마이그레이션 스크립트 작성 (NocoDB API 호출)
3. n8n WF 코드의 상태값 참조 일괄 변경
4. 프론트엔드 매핑 함수 적용
5. 롤백 스크립트 준비

**프론트 매핑 함수**:
```javascript
// 공통 유틸리티
var LABEL_MAP = {
  difficulty: {
    BEGINNER: '입문', INTERMEDIATE: '중급',
    ADVANCED: '심화', ALL_LEVELS: '전체 수준'
  },
  grade: {
    BLOOM: 'BLOOM', GARDEN: 'GARDEN',
    ATELIER: 'ATELIER', AMBASSADOR: 'AMBASSADOR'
  },
  classStatus: {
    DRAFT: '초안', PENDING_REVIEW: '심사중', ACTIVE: '활성',
    PAUSED: '일시정지', REJECTED: '반려', ARCHIVED: '보관'
  },
  bookingStatus: {
    PENDING: '대기', CONFIRMED: '확정', COMPLETED: '완료',
    CANCELLED: '취소', REFUNDED: '환불', NO_SHOW: '미출석',
    WAITLISTED: '대기자', RESCHEDULED: '일정변경'
  },
  approvalStatus: {
    PENDING: '대기', APPROVED: '승인',
    REJECTED: '거부', SUSPENDED: '정지'
  },
  region: {
    SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천',
    BUSAN: '부산', DAEGU: '대구', DAEJEON: '대전',
    GWANGJU: '광주', ULSAN: '울산', SEJONG: '세종',
    GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남',
    JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북',
    GYEONGNAM: '경남', JEJU: '제주', ONLINE: '온라인'
  }
};

function getLabel(domain, code) {
  if (!code) return '';
  var map = LABEL_MAP[domain];
  return (map && map[code]) || code;
}
```

---

#### E1-F100. 키트 연동 Step 1 (자사몰 상품 링크)

[D1] 강의 등록 시 자사몰 기존 상품 branduid를 연결.

**상세 페이지 "이 수업에 사용되는 재료" 섹션**:
```javascript
function renderKitSection(classData) {
  if (!classData.kit_enabled || !classData.kit_items
    || classData.kit_items.length === 0) {
    return '';
  }

  var items = typeof classData.kit_items === 'string'
    ? JSON.parse(classData.kit_items)
    : classData.kit_items;

  var html = '<section class="detail-kit">';
  html += '<h3 class="detail-kit__title">'
    + '이 수업에 사용되는 재료</h3>';
  html += '<div class="detail-kit__grid">';

  items.forEach(function(item) {
    var productUrl = 'https://foreverlove.co.kr/shop/shopdetail.html'
      + '?branduid=' + item.branduid;

    html += '<a href="' + productUrl
      + '" class="detail-kit__item" target="_blank">';
    html += '<div class="detail-kit__item-img">';
    html += '<img src="' + (item.imageUrl || '') + '" alt="'
      + item.productName + '" loading="lazy">';
    html += '</div>';
    html += '<span class="detail-kit__item-name">'
      + item.productName + '</span>';
    html += '<span class="detail-kit__item-price">'
      + item.price.toLocaleString() + '원</span>';
    html += '</a>';
  });

  html += '</div>';
  html += '</section>';
  return html;
}
```

---

#### E1-F101. 상세 페이지 UX 리디자인

**구조 재배치** (위→아래 순서):

1. **히어로 이미지** (3:2 비율, 플레이스홀더 포함)
2. **Trust Summary Bar** (검수 완료 / 환불 가능 / 키트 포함 배지)
3. **"이 가격에 포함된 것" 섹션** (강의료 + 재료키트 분리 표시)
4. **일정 캘린더 + 잔여석** (E0-005 잔여석 표시 규칙 적용)
5. **강사 프로필 카드**
6. **커리큘럼/수업 내용**
7. **키트 재료 목록** (E1-F100)
8. **FAQ** (E1-F105)
9. **후기** (기준치 이상일 때만 숫자 표시)
10. **하단 고정 CTA 바** (모바일)

**CTA 계층**:
| 우선순위 | CTA | 스타일 |
|---------|-----|--------|
| 1차 | 예약하기 | 강조색 (#7d9675), 하단 고정 (모바일) |
| 2차 | 선물하기 | 보조색 아웃라인 |
| 3차 | 공유하기 | 아이콘 버튼 (카카오/링크 복사) |

**잔여석 표시 규칙**:
| 잔여석 | 표시 | 색상 |
|--------|------|------|
| 6석 이상 | "예약 가능" | 녹색 (#4CAF50) |
| 3~5석 | "잔여 N석" | 주황 (#FF9800) |
| 1~2석 | "마감 임박!" | 빨강 (#F44336) + 펄스 애니메이션 |
| 0석 | "마감" | 회색 (#9E9E9E) + 예약 버튼 비활성화 |

---

#### E1-F102. 목록 페이지 리디자인

**CMO + UX 전문가 합동 설계 반영**:

**히어로 축소**:
```css
/* 목록/css.css */

/* 데스크탑 히어로: 200px 이하 */
.pc-list-hero {
  max-height: 200px;
  padding: 24px 0;
}

/* 모바일 히어로: 180px → 120px */
@media (max-width: 767px) {
  .pc-list-hero {
    max-height: 120px;
    padding: 16px;
  }
}
```

**필터 UI 재설계**:
```
기존: 사이드바 필터 (데스크탑) + 기본 열린 패널 (모바일)
변경: 단일 가로 필터 바 (전 기기 공통)

[카테고리 v] [지역 v] [난이도 v] [정렬 v] [지도 보기]
```

```css
/* 필터 바 */
.pc-filter-bar {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.pc-filter-bar::-webkit-scrollbar {
  display: none;
}

.pc-filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pc-filter-chip--active {
  background: #7d9675;
  color: #fff;
  border-color: #7d9675;
}
```

**클래스 카드 리디자인**:
```css
.pc-class-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.pc-class-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.pc-class-card__image {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
}

.pc-class-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 카테고리 태그 오버레이 */
.pc-class-card__category {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.pc-class-card__body {
  padding: 14px;
}

.pc-class-card__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-class-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.pc-class-card__price {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.pc-class-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
```

**그리드 레이아웃**:
| 브레이크포인트 | 열 수 | 카드 너비 |
|-------------|-------|----------|
| ~767px | 1열 (세로) 또는 2열 | 100% 또는 50% |
| 768~991px | 2열 | 자동 |
| 992~1199px | 3열 | 자동 |
| 1200px+ | 3~4열 | 자동 |

**모바일 바텀시트 필터**:
```css
@media (max-width: 767px) {
  .pc-filter-bottomsheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    max-height: 70vh;
    overflow-y: auto;
    padding: 20px;
  }

  .pc-filter-bottomsheet--open {
    transform: translateY(0);
  }

  .pc-filter-bottomsheet__handle {
    width: 40px;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
    margin: 0 auto 16px;
  }
}
```

---

#### E1-F104. 정산 자동화 WF-SETTLE

**CFO+COO 설계 반영**:

**정산 파이프라인**:
```
[WF-05 결제 감지] → [D+3 보류 기간]
  |
[D+3 경과] → tbl_Settlements status: HOLDING → CONFIRMED
  |
[D+7 확정] → 수수료 계산 + 적립금 산출
  |
[격월 지급일] → 메이크샵 적립금 API 호출
  |
[기록] → tbl_Settlements UPDATE: status=SETTLED
  |
[알림] → 파트너 이메일 + 텔레그램

[환불 분기] → D+3 이내 전액 환불 가능
             → D+3~D+7 부분 환불 (관리자 승인)
             → D+7 이후 환불 불가 (정산 확정)
```

**수수료 계산 (n8n Code 노드)**:
```javascript
// WF-SETTLE Code 노드
var orderAmount = parseInt($input.first().json.order_amount);
var partnerGrade = $input.first().json.partner_grade;

// 등급별 수수료율 (commission-policy.md 기준)
var COMMISSION_RATES = {
  BLOOM: 0.25, GARDEN: 0.20,
  ATELIER: 0.15, AMBASSADOR: 0.10,
  // 레거시 매핑
  SILVER: 0.25, GOLD: 0.20, PLATINUM: 0.15
};

var rate = COMMISSION_RATES[partnerGrade] || 0.25;
var commissionAmount = Math.round(orderAmount * rate);
var partnerAmount = orderAmount - commissionAmount;
var reserveRate = 0.80;
var reserveAmount = Math.round(partnerAmount * reserveRate);

return [{
  json: {
    commission_rate: rate,
    commission_amount: commissionAmount,
    partner_amount: partnerAmount,
    reserve_amount: reserveAmount,
    settlement_type: 'AUTO'
  }
}];
```

---

#### E1-F105. CS FAQ 확장 (5개 → 15개)

**수강생 불안 Top 15**:

| # | 질문 | 답변 요지 |
|---|------|----------|
| 1 | 환불이 가능한가요? | 수업 3일 전까지 전액 환불 가능 |
| 2 | 준비물이 필요한가요? | 키트 포함 클래스는 재료 준비 불필요 |
| 3 | 완전 초보인데 괜찮을까요? | "입문" 표시 클래스는 경험 없어도 참여 가능 |
| 4 | 강사는 어떤 분인가요? | PRESSCO21이 검수한 전문 강사만 등록 |
| 5 | 키트 배송은 언제 되나요? | 수업 2일 전까지 배송 완료 |
| 6 | 수업 일정을 변경할 수 있나요? | 수업 3일 전까지 1회 변경 가능 |
| 7 | 온라인 수업은 어떻게 참여하나요? | 예약 확정 후 접속 링크 이메일 발송 |
| 8 | 주차 가능한가요? | 각 공방별 주차 안내 상세 페이지 확인 |
| 9 | 선물하기는 어떻게 하나요? | 상세 페이지 "선물하기" 버튼으로 결제 |
| 10 | 적립금은 언제 사용 가능한가요? | 결제 시 자사몰 적립금 즉시 사용 가능 |
| 11 | 수강 후 같은 재료를 구매할 수 있나요? | "이 수업에 사용된 재료" 섹션에서 바로 구매 |
| 12 | 후기를 작성하면 혜택이 있나요? | 후기 작성 시 쿠폰 지급 |
| 13 | 여러 명이 함께 신청 가능한가요? | 예약 시 인원 선택 가능 (정원 내) |
| 14 | 수업 당일 취소하면 어떻게 되나요? | 당일 취소/미출석 시 환불 불가 |
| 15 | 강사가 되고 싶은데 어떻게 하나요? | "파트너 신청" 페이지에서 지원 가능 |

---

#### E1-F106. 파트너 온보딩 체크리스트 UX 수정

**결함 참조**: H8 (온보딩 체크리스트 불일치)

**5단계 체크리스트** (정합성 수정):

| 단계 | 항목 | 완료 조건 |
|------|------|----------|
| 1 | 프로필 작성 | 소개, 프로필 사진, 연락처 입력 완료 |
| 2 | 교육 이수 | 파트너 교육 퀴즈 합격 |
| 3 | 첫 강의 등록 | 강의 1건 이상 등록 |
| 4 | 일정 입력 | 등록한 강의에 일정 1건 이상 추가 |
| 5 | 키트 연결 | 강의에 자사몰 재료 상품 연결 (선택) |

```javascript
// 파트너/js.js 온보딩 렌더링
function renderOnboarding(partner) {
  var steps = [
    { key: 'profile', label: '프로필 작성', icon: 'user' },
    { key: 'education', label: '교육 이수', icon: 'book' },
    { key: 'firstClass', label: '첫 강의 등록', icon: 'plus' },
    { key: 'schedule', label: '일정 입력', icon: 'calendar' },
    { key: 'kit', label: '키트 연결', icon: 'package' }
  ];

  var status = partner.onboarding_status
    ? JSON.parse(partner.onboarding_status)
    : {};
  var completed = steps.filter(function(s) {
    return status[s.key] === true;
  }).length;

  // "X/5 완료" (5로 고정)
  var progressText = completed + '/5 완료';
  var progressPercent = Math.round((completed / 5) * 100);

  // ... 렌더링 코드
}
```

---

#### E1-F107. 대시보드 액션 보드

**3카드 액션 보드 (첫 화면)**:

| 카드 | 데이터 소스 | 빈 상태 |
|------|-----------|---------|
| 오늘 수업 | getPartnerSchedules(today) | "오늘 예정된 수업이 없습니다" |
| 키트 준비 | getPartnerBookings(kitRequired, upcoming) | "준비할 키트가 없습니다" |
| 미답변 후기 | getPartnerReviews(unanswered) | "모든 후기에 답변 완료!" |

---

#### E1-F110. 파트너맵 인라인 통합

**CMO 권고 반영**: 목록 내 "지도에서 보기" 토글로 통합.
**D6 반영**: 네이버 지도 API 사용 (기존 파트너맵 ncpKeyId: `bfp8odep5r` 활용).

**기존 파트너맵 자산**: `파트너맵/js.js` (3,964행) — 네이버 지도 API + Google Sheets (103개 파트너) + Fuse.js 검색 + 클러스터링 이미 구현됨. 이 코드를 목록 페이지에 인라인 모듈로 이식.

**네이버 지도 API 인라인 연동**:
```javascript
// 목록/js.js — 파트너맵 인라인 모듈 (기존 파트너맵 v3 코드 재활용)

var partnerMapModule = (function() {
  'use strict';

  var map = null;
  var markers = [];
  var isMapVisible = false;

  function initMap(containerId) {
    var container = document.getElementById(containerId);
    if (!container || !window.naver || !window.naver.maps) return;

    var options = {
      center: new naver.maps.LatLng(37.5665, 126.9780), // 서울 중심
      zoom: 11,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT
      }
    };

    map = new naver.maps.Map(container, options);
  }

  function addMarkers(classes) {
    clearMarkers();

    classes.forEach(function(cls) {
      if (!cls.latitude || !cls.longitude
        || cls.class_type === 'ONLINE') return;

      var position = new naver.maps.LatLng(cls.latitude, cls.longitude);
      var marker = new naver.maps.Marker({ position: position, map: map });

      // 인포윈도우
      var infoContent = '<div class="pc-map-info">'
        + '<strong>' + cls.title + '</strong>'
        + '<p>' + cls.partner_name + '</p>'
        + '<p>' + cls.price.toLocaleString() + '원</p>'
        + '</div>';

      var infowindow = new naver.maps.InfoWindow({
        content: infoContent
      });

      naver.maps.Event.addListener(marker, 'click', function() {
        infowindow.open(map, marker);
      });

      markers.push(marker);
    });

    // 지도 범위 자동 조정
    if (markers.length > 0) {
      var bounds = new naver.maps.LatLngBounds();
      markers.forEach(function(m) {
        bounds.extend(m.getPosition());
      });
      map.fitBounds(bounds);
    }
  }

  function clearMarkers() {
    markers.forEach(function(m) { m.setMap(null); });
    markers = [];
  }

  function toggle() {
    isMapVisible = !isMapVisible;
    var mapContainer = document.getElementById('pc-inline-map');
    if (mapContainer) {
      mapContainer.style.display = isMapVisible ? 'block' : 'none';
      if (isMapVisible && map) {
        naver.maps.Event.trigger(map, 'resize');
      }
    }
  }

  return { initMap: initMap, addMarkers: addMarkers, toggle: toggle };
})();
```

```html
<!-- 목록/Index.html 내 지도 영역 -->
<div id="pc-inline-map" style="display:none; width:100%; height:400px; border-radius:12px; margin-bottom:20px;"></div>
```

```html
<!-- 네이버 지도 API (기존 파트너맵과 동일한 ncpKeyId 사용) -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=bfp8odep5r"></script>
```

#### E1-F111. 클래스 상세 템플릿 시스템 (신규 — D8 반영)

**배경**: 파트너가 클래스를 등록할 때 상세 설명을 자유 입력하면 품질 편차가 크다. 통일된 템플릿을 제공하여 상세페이지 제작 부담을 해소하고, 수강생에게는 일관된 정보 탐색 경험을 제공한다.

**구현 방식**:
- 클래스 등록(8009) 폼에서 상세 설명을 자유 텍스트 대신 **구조화된 입력 폼**으로 변경
- 입력 항목: (1)클래스 소개 (2)이런 분께 추천해요 (3)커리큘럼 (최대 5단계) (4)준비물 (5)주의사항 (6)작품 사진 (최대 5장)
- 상세 페이지(2607)에서 이 구조화된 데이터를 통일된 레이아웃으로 렌더링

**파트너 입력 폼 구조**:
```
[클래스 소개] — 2-3줄 요약 텍스트
[이런 분께 추천] — 체크박스 (초보자/취미/자격증준비/선물제작/기타)
[커리큘럼]
  Step 1: [제목] [설명] [소요시간]
  Step 2: [제목] [설명] [소요시간]
  ...
[준비물] — "모두 제공" 또는 "개별 준비" 선택 + 목록
[주의사항] — 텍스트
[작품 사진] — 최대 5장 업로드 (필수 1장 이상)
```

**상세 페이지 렌더링 레이아웃**:
- 각 섹션이 카드 형태로 순서대로 배치
- 커리큘럼은 타임라인 UI (수직 스텝 표시)
- 작품 사진은 갤러리 그리드 (메인 1 + 서브 4)
- 빈 항목은 자동 숨김 (강제 입력이 아닌 항목)

---

#### E1-F209. 테스트 데이터 시뮬레이션 (개선)

[D5] 파트너 섭외 데모용 테스트 데이터 재구성.

**변경 사항** (v5 대비):
- `[TEST]` prefix 명확히 적용
- demo=true 파라미터 없이는 공개 페이지에 미노출
- 실제 꽃공예 카테고리로 현실감 있는 데이터 구성

| 데이터 | 수량 | 구성 |
|--------|------|------|
| 가상 파트너 | 5명 | BLOOM 2, GARDEN 2, ATELIER 1 |
| 가상 클래스 | 15개 | 꽃다발 5, 꽃꽂이 4, 소품 3, 리스 2, 프리저브드 1 |
| 가상 일정 | 30개 | 향후 2주간 분산, 정원 4~8명 |
| 가상 예약 | 50건 | CONFIRMED 30, COMPLETED 15, CANCELLED 5 |
| 가상 후기 | 30건 | 평점 4.0~5.0 분산 |

---

### Phase E2: 성장 가속 (4~8주)

> **목표**: 파트너 확보 도구 + 협회 제휴 + 콘텐츠 허브 → 파트너 섭외 시 보여줄 완성된 플랫폼
> **마일스톤**: 파트너 5~10명, 월 15건 수강, 협회 1곳 이상 제휴

---

#### E2-F200. 파트너 신청 세일즈 랜딩 리디자인

**6섹션 구조**:

| 순서 | 섹션 | 핵심 메시지 |
|------|------|-----------|
| 1 | 히어로 | "강의만 잘하시면 됩니다. 나머지는 저희가 합니다." |
| 2 | 3가지 가치 | 운영 대행 + 재료 키트 + 홍보 지원 |
| 3 | 프로세스 | 신청 → 승인 → 교육 → 등록 → 운영 시작 (5단계) |
| 4 | 등급 혜택 | BLOOM → AMBASSADOR 성장 경로 (수수료율 미포함 [D2]) |
| 5 | 파트너 후기 | 실제 파트너 또는 시뮬레이션 후기 |
| 6 | CTA | "지금 파트너 신청하기" 버튼 |

**수수료 비공개 원칙 적용**:
- 4번 섹션에서 "등급이 올라갈수록 더 많은 혜택" 표현
- 수수료율(%) 숫자 절대 노출 금지
- "수수료 정책은 승인 후 담당자가 안내합니다" 문구

---

#### E2-F201. 협회 B2B 영업 도구

[D3] 1차: 어머니 협회 + 기존 활성 고객 / 2차: 부케 관련 활성 협회

- 협회 제안서 자동 생성 (n8n WF + Google Docs)
- 협회별 전용 랜딩 URL
- 7단계 영업 시나리오 지원

---

#### E2-F202. IA 확장 (3탭 + contentType 분기)

**목록(2606) 3탭**:
```
[전체 클래스] [협회/세미나] [협회원 혜택]
```

**상세(2607) contentType 분기**:
- `CLASS`: 일반 클래스 상세
- `SEMINAR`: 세미나 상세 (협회 정보 + 일정)
- `EVENT`: 협회 이벤트 상세

---

#### E2-F203. WF-01 점진적 분리

1차: getClasses / getClassDetail → 독립 WF
2차: getCategories / getAffiliations → 독립 WF

---

#### E2-F204. 콘텐츠 허브 4영역

1. 파트너 스토리 (강사 인터뷰/작품)
2. 수강생 후기 모음
3. 꽃공예 가이드 (초보자용)
4. 시즌 큐레이션 (계절별 추천)

---

#### E2-F206. 파트너 이탈 감지 자동화

- 30일 비활동 → 텔레그램 관리자 알림 + 파트너 리텐션 이메일
- 60일 비활동 → 대표 에스컬레이션

---

#### E2-F207. 3계층 캐싱

1. localStorage 캐시 (클래스 목록 5분 TTL)
2. n8n staticData (카테고리/협회 정보 1시간 TTL)
3. NocoDB 조회 최적화 (자주 쓰는 뷰 인덱스)

---

#### E2-F208. 키트 연동 Step 2 (묶음 키트 + 선택형)

[D1] 상세 페이지:
```
[강의만 예약  50,000원]  [키트포함 예약  80,000원]
```

tbl_Classes에 `kitBundleBranduid` 필드 추가.
WF-05에서 키트 포함 결제 시 별도 주문 생성.

---

#### E2-F210. 어드민 고도화

**UX 전문가 설계 반영**:
- 파트너/클래스 상세: 슬라이드 패널 (페이지 이동 없이)
- 일괄 처리: 복수 선택 → 승인/반려/정산 일괄
- 감사 로그: NocoDB tbl_AuditLog 테이블 추가

**감사 로그 테이블 스키마**:
| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| action | TEXT | CREATE/UPDATE/DELETE/APPROVE/REJECT/SETTLE |
| targetType | TEXT | PARTNER/CLASS/BOOKING/SETTLEMENT |
| targetId | TEXT | 대상 레코드 ID |
| actorId | TEXT | 실행자 (관리자 ID 또는 SYSTEM) |
| details | JSON Text | 변경 전/후 값 |
| createdAt | TEXT | datetime |

---

### Phase E3: 스케일업 (8주+)

> **목표**: 신규 테이블 확장 + 비금전적 인센티브 + 서버 확장성 → 플랫폼 성숙
> **마일스톤**: 파트너 20명 이상, 월 80건 수강, 수강생→파트너 전환 첫 발생

---

#### E3-F300. NocoDB 신규 테이블 4개

- tbl_Seminars: 협회 세미나/이벤트
- tbl_Affiliation_Products: 협회원 전용 상품 큐레이션
- tbl_Affiliation_Content: 협회 콘텐츠
- tbl_Vocabulary: 용어 사전

(스키마는 PRD v5.0 6-2절과 동일. 변경 없음.)

#### E3-F301. 등급별 비금전적 인센티브

| 등급 | 인센티브 |
|------|---------|
| GARDEN | 프로필 배지 + 목록 우선 노출 |
| ATELIER | 콘텐츠 허브 인터뷰 게재 + 자사몰 배너 노출 |
| AMBASSADOR | 신규 파트너 멘토 + 세미나 공동 기획 |

**등급 시각 컬러**:
| 등급 | 색상 코드 | 설명 |
|------|----------|------|
| BLOOM | `#7d9675` | 새싹의 차분한 녹색 |
| GARDEN | `#5a8a4f` | 정원의 깊은 녹색 |
| ATELIER | `#c4a35a` | 장인의 골드 |
| AMBASSADOR | `#8b6f47` | 대표의 브라운골드 |

#### E3-F302. 키트 구독 모델 파일럿

- 월정액 재료 키트 구독 (10명 파일럿)
- CFO 수익성 검증 후 실행

#### E3-F303. 서버 확장성 검증

- 파트너 100명 이상 시나리오 부하 테스트
- Oracle Free Tier 한계 확인 + 확장 플랜

---

## 6. 데이터 모델

### 6-1. 기존 테이블 현황 (11개)

| 테이블 | ID | 주요 용도 |
|--------|-----|----------|
| tbl_Partners | `mp8t0yq15cabmj4` | 파트너 정보 + 등급 + 수수료율 |
| tbl_Classes | `mpvsno4or6asbxk` | 클래스 정보 + 키트 + FAQ |
| tbl_Applications | `mkciwqtnqdn8m9c` | 파트너 신청 내역 |
| tbl_Settlements | `mcoddguv4d3s3ne` | 정산 + 예약 내역 |
| tbl_Reviews | `mbikgjzc8zvicrm` | 수강 후기 |
| tbl_Settings | `mgde3g9ubqofavz` | 시스템 설정 |
| tbl_Schedules | `mschd3d81ad88fb` | 수업 일정 |
| tbl_Affiliations | `m1y7q68q1zlrvv6` | 제휴 협회 |
| tbl_Member_Affiliations | `mjrgja20gm84e71` | 회원-협회 매핑 |
| tbl_Affiliation_Stats | `mdyqit8fhsm7zqu` | 협회별 월간 집계 |

### 6-2. 기존 테이블 필드 추가

**tbl_Classes 추가 필드**:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| kitBundleBranduid | TEXT | 묶음 키트 메이크샵 상품 branduid | E2 (F208) |
| contentType | TEXT | `CLASS`/`SEMINAR`/`EVENT` | E2 (F202) |

**tbl_Partners 추가 필드**:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| onboardingStatus | JSON Text | 온보딩 체크리스트 상태 | E1 (F106) |
| lastActiveAt | TEXT | 마지막 활동 일시 | E2 (F206) |
| latitude | REAL | 공방 위도 | E1 (F110) |
| longitude | REAL | 공방 경도 | E1 (F110) |

**tbl_Settlements 추가 필드**:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| settlementType | TEXT | `AUTO`/`MANUAL` | E1 (F104) |
| settledAt | TEXT | 정산 처리 일시 | E1 (F104) |
| refundAmount | INTEGER | 환불 금액 | E1 (F104) |
| holdingUntil | TEXT | D+3 보류 만료일 | E1 (F104) |
| confirmedAt | TEXT | D+7 확정 일시 | E1 (F104) |

### 6-3. 신규 테이블 (E2~E3)

**tbl_AuditLog** (E2-F210):

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| action | TEXT | CREATE/UPDATE/DELETE/APPROVE/REJECT/SETTLE |
| targetType | TEXT | PARTNER/CLASS/BOOKING/SETTLEMENT |
| targetId | TEXT | 대상 레코드 ID |
| actorId | TEXT | 실행자 ID |
| details | JSON Text | 변경 전/후 값 |
| createdAt | TEXT | datetime |

**tbl_Seminars, tbl_Affiliation_Products, tbl_Affiliation_Content, tbl_Vocabulary** (E3-F300):
스키마는 PRD v5.0 6-2절과 동일.

---

## 7. API 설계

### 7-1. WF-01 현재 액션 맵

| Switch Index | 액션 | HTTP | 입력 | 출력 |
|-------------|------|------|------|------|
| [0] | getClasses | POST | `page`, `category`, `difficulty`, `region`, `sort` | `{success, data: {classes, page, total, totalPages}}` |
| [1] | getClassDetail | POST | `classId` | `{success, data: {class_id, ..., partner, schedules}}` |
| [2] | getCategories | POST | -- | `{success, data: [{name, class_count}]}` |
| [3] | getAffiliations | POST | -- | `{success, data: [{affiliation_code, ...}]}` |

### 7-2. WF-SETTLE 설계 (E1-F104)

```
[WF-05 결제 감지] → tbl_Settlements INSERT (status: HOLDING)
  |
[Schedule Node D+3] → status: CONFIRMED (환불 불가 시점)
  |
[Schedule Node D+7] → 수수료 계산 → status: READY_TO_SETTLE
  |
[격월 지급 Cron] → 메이크샵 적립금 API → status: SETTLED
  |
[알림] → 파트너 이메일 + 텔레그램

[환불 분기]
  D+3 이내 → 전액 환불 → status: REFUNDED
  D+3~D+7 → 관리자 승인 후 부분 환불 → status: PARTIALLY_REFUNDED
  D+7 이후 → 환불 불가 (정산 확정)
```

### 7-3. WF-ADMIN 응답 표준화 (E0-008 연계)

모든 WF-ADMIN 응답은 아래 형식을 준수:
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "totalPages": 0
  }
}
```

빈 결과일 때도 유효한 JSON 반환. 빈 문자열/null 반환 금지.

### 7-4. API 호출 예산

| API | 현재 | E2 이후 예상 | 500회/시간 대비 |
|-----|------|------------|---------------|
| 메이크샵 조회 | ~30 | ~80 | 16% (안전) |
| 메이크샵 처리 | ~10 | ~40 | 8% (안전) |
| NocoDB | ~200 | ~400 | 제한 없음 |

3계층 캐싱(E2-F207) 적용 시 메이크샵 API 호출 50% 이상 절감 예상.

---

## 8. UX 설계 원칙

### 8-1. 3단 메시지 아키텍처

| 레이어 | 대상 | 핵심 메시지 |
|--------|------|-----------|
| **수강생** | 클래스 탐색/예약 | "돈 값 할까?"를 "믿고 예약해도 되겠다"로 바꾸는 신뢰 장치 |
| **파트너** | 운영/성장 | "강의만 잘하시면 됩니다. 나머지는 저희가 합니다." |
| **협회** | 제휴/락인 | "협회원에게 실질적 혜택을, 협회에게 공동 홍보를 제공합니다." |

### 8-2. 신뢰 배지 시스템 (6종)

| 배지 | 조건 | 노출 위치 | CSS |
|------|------|----------|-----|
| 키트포함 | `kitEnabled === 1` | 목록 카드, 상세 | `background: #E8F5E9; color: #2E7D32;` |
| 초보환영 | `difficulty === 'BEGINNER'` | 목록 카드, 상세 | `background: #E3F2FD; color: #1565C0;` |
| 인기강의 | `totalBookings >= 30` | 목록 카드 | `background: #FFF3E0; color: #E65100;` |
| 마감임박 | `remaining <= 3 && remaining > 0` | 목록 카드 | `background: #FFEBEE; color: #C62828;` + 펄스 |
| 신규 | `createdAt` 30일 이내 | 목록 카드 | `background: #F3E5F5; color: #6A1B9A;` |
| 협회원전용 | `affiliationCode !== null` | 목록 카드, 상세 | `background: #FFFDE7; color: #F57F17;` |

### 8-3. 마이크로인터랙션 스펙

| 인터랙션 | 요소 | CSS/JS |
|---------|------|--------|
| 호버 리프트 | 클래스 카드 | `transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12);` |
| 찜 펄스 | 찜 아이콘 | `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }` |
| 탭 슬라이드 | 탭 인디케이터 | `transition: left 0.3s ease, width 0.3s ease;` |
| 스켈레톤 로딩 | 카드/상세 | `background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;` |
| 마감임박 펄스 | 잔여석 배지 | `animation: urgentPulse 2s ease-in-out infinite;` |

```css
/* 공통 마이크로인터랙션 CSS */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes urgentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

### 8-4. 용어 사전 (UI 표시 통일)

| 카테고리 | DB 코드 (UPPERCASE) | UI 표시 (한국어) |
|---------|-------------------|----------------|
| 난이도 | BEGINNER / INTERMEDIATE / ADVANCED / ALL_LEVELS | 입문 / 중급 / 심화 / 전체 수준 |
| 등급 | BLOOM / GARDEN / ATELIER / AMBASSADOR | BLOOM / GARDEN / ATELIER / AMBASSADOR (영어 유지) |
| 예약 상태 | PENDING / CONFIRMED / COMPLETED / CANCELLED / REFUNDED / NO_SHOW | 대기 / 확정 / 완료 / 취소 / 환불 / 미출석 |
| 승인 상태 | PENDING / APPROVED / REJECTED / SUSPENDED | 대기 / 승인 / 거부 / 정지 |
| 클래스 상태 | DRAFT / PENDING_REVIEW / ACTIVE / PAUSED / REJECTED / ARCHIVED | 초안 / 심사중 / 활성 / 일시정지 / 반려 / 보관 |
| 지역 | SEOUL / GYEONGGI / ... / ONLINE | 서울 / 경기 / ... / 온라인 |

### 8-5. 반응형 브레이크포인트

| 브레이크포인트 | 대상 | 레이아웃 |
|-------------|------|---------|
| ~767px | 모바일 | 1~2열. CTA 하단 고정. 바텀시트 필터 |
| 768~991px | 태블릿 | 2열. 사이드바 숨김 |
| 992~1199px | 소형 데스크탑 | 3열 |
| 1200px+ | 대형 데스크탑 | 3~4열 풀 레이아웃 |

---

## 9. 위험 요소 및 대응

### 9-1. 실행 리스크

| 리스크 | 등급 | 대응 | 담당 |
|--------|------|------|------|
| **라이브 서비스 신뢰 손상** (테스트 데이터 노출) | **CRITICAL** | E0-001 즉시 실행. WF-01 필터 추가 | CTO |
| **NocoDB 데이터 손실** (백업 부재) | **CRITICAL** | E0 내 cron 일일 백업 구축 | CTO |
| **수수료 비공개 위반** | **HIGH** | E0-006 즉시 실행. 대시보드 수익 리포트 수정 | CTO |
| **적립금 정산 세무 이슈** | **HIGH** | 세무사 확인 필수 (파트너 1명 소프트 론칭 전) | CFO |
| **파트너맵 링크 깨짐** | **HIGH** | E0-002 즉시 실행. 카카오 맵 링크 대체 | CTO |
| **모바일 UX 파괴** (필터 기본 오픈) | **HIGH** | E0-007 즉시 실행 | CTO |
| **Oracle Free Tier SPOF** | **MEDIUM** | E3-F303 부하 테스트 후 확장 플랜 | CTO |

### 9-2. 재무 리스크 (CFO+COO 분석)

| 리스크 | 대응 |
|--------|------|
| 세무 불확실성 (수수료 정산 원천징수 여부) | 파트너 정산 개시 전 세무사 확인 필수 |
| NocoDB 백업 부재 | E0 내 구축 |
| 수익성 미검증 (키트 연계 실제 전환율 미측정) | E1 파일럿에서 키트 전환율 측정 |

### 9-3. 운영 리스크 (COO 분석)

**5대 KPI**:
| KPI | 목표 | 측정 방법 |
|-----|------|----------|
| 월 수강완료율 | 85% 이상 | COMPLETED / CONFIRMED |
| 파트너 이탈율 | 10% 미만 | 30일 비활동 파트너 / 전체 파트너 |
| 키트 연결 전환율 | 50% 이상 | 키트 포함 예약 / 전체 예약 |
| 정산 정확도 | 99.9% | 정산 오류 건수 / 전체 정산 |
| CS 응답시간 | 24시간 이내 | 문의 접수~답변 평균 시간 |

---

## 10. 성공 지표 (KPI)

### 10-1. 비즈니스 지표

| 지표 | 현재 (2026-03-12) | 6개월 목표 | 12개월 목표 |
|------|------------------|-----------|-----------|
| 활성 파트너 수 | 0명 (테스트 중) | 10명 | 20명 |
| 월간 수강 예약 | 0건 | 30건 | 80건 |
| 예약 완료율 (상세 방문 → 결제) | 측정 불가 | 35% | 50% |
| 재료키트 연계율 | — | 50% | 70% |
| 수강완료 → 재구매 전환율 | — | 20% | 35% |
| 수강생 → 파트너 전환율 | — | — | 5% |
| 제휴 협회 수 | 0곳 | 1곳 이상 | 3곳 이상 |

### 10-2. 기술 품질 지표

| 지표 | 기준 |
|------|------|
| IIFE 미적용 JS | 0개 |
| CSS 전역 셀렉터 | 0개 |
| API 응답 시간 | 2초 이내 |
| NocoDB 백업 성공률 | 100% (일일) |
| 상태값 정규화 위반 | 0건 |
| WF-ADMIN 빈 응답 에러 | 0건 |

---

## 11. 배포 전략 (CSO 권고: C안)

### 소프트 론칭 전략

```
E0 완료 (1주)
  |
[파일럿 파트너 1명 섭외]
  - 대표(어머니) 지인 또는 어머니 협회 활성 멤버 1명
  - 데모 환경에서 전체 여정 시연
  - 강의 1개 등록 → 일정 3건 → 첫 수강 발생까지 동행
  |
E1 진행 (2~4주)
  - 파일럿 파트너 피드백 반영
  - 키트 연동 + 정산 자동화 검증
  |
[5명 확대]
  - E1 완료 후 파트너 4명 추가 모집
  - 카테고리 다양화 (꽃다발/꽃꽂이/소품 등)
  |
E2 진행 (4~8주)
  - 세일즈 랜딩 완성 후 본격 모집
  - 협회 1차 제휴 제안
```

### 배포 순서

| 순서 | 배포 대상 | 조건 |
|------|----------|------|
| 1 | E0 긴급 수정 전체 | CRITICAL 5건 + HIGH 수수료 위반 해결 확인 |
| 2 | E1 기능 (목록/상세 리디자인) | 파일럿 파트너 1명 강의 등록 완료 |
| 3 | E1 기능 (정산 자동화) | 세무사 확인 완료 + 테스트 정산 3건 검증 |
| 4 | E2 기능 (세일즈 랜딩) | 파트너 5명 운영 안정 |
| 5 | E2 기능 (협회 도구) | 협회 1차 미팅 완료 |
| 6 | E3 기능 | 파트너 20명 이상 |

---

## 12. 기술 스택 및 제약사항

### 프론트엔드 (메이크샵 D4 제약)

| 항목 | 규칙 |
|------|------|
| 언어 | Vanilla HTML/CSS/JS (빌드 도구 없음) |
| JS 패턴 | IIFE 필수 |
| JS 이스케이프 | `\${var}` 필수 (메이크샵 편집기 저장 오류 방지) |
| CSS 스코핑 | 컨테이너 클래스로 범위 제한 |
| 외부 라이브러리 | CDN `<script>` 태그만 |
| 가상태그 | `<!--/user_id/-->` 등 절대 보존 |
| 반응형 | 768px / 992px / 1200px |

### 백엔드 (n8n + NocoDB)

| 항목 | 규칙 |
|------|------|
| n8n 코드 노드 | `$input` 우선 사용 |
| NocoDB Data API | `/api/v1/db/data/noco/{projectId}/{tableId}` + `xc-token` |
| NocoDB Meta API | `/api/v2/meta/tables/{tableId}/columns` (v2, `xc-auth`) |
| Switch 노드 | `typeVersion: 3.2` + `rules.values[...]` (n8n v2.8.4 호환) |
| 메이크샵 API | 조회/처리 각 500회/시간 |

### 서버 인프라

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud Free Tier ARM (2 OCPU / 12GB RAM) |
| 현재 RAM 사용 | ~3.5GB (여유 ~8.5GB) |
| Swap | 4GB 추가됨 |
| 파트너 100명까지 | 현 스택 충분 (CTO 분석) |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-12 | 6.0 | Playwright 라이브 테스트 13건 결함 기반 전면 재편. Phase 재명명(E0/E1/E2/E3). CRITICAL 5건 + HIGH 수수료 위반 즉시 수정 스펙 추가. 목록/상세/카드 리디자인 CSS 스펙. 파트너맵 인라인 통합(Kakao Map JS). Trust Summary 빈 상태 패턴. 이미지 플레이스홀더 6종. 정산 파이프라인(D+3 보류/D+7 확정/격월 지급). 모바일 바텀시트 필터. 마이크로인터랙션 5종. 감사 로그 테이블. CSO 배포 전략 C안(E0 후 파일럿 1명 소프트 론칭). 4개 에이전트 팀미팅(CSO+CTO/CMO/CFO+COO/UX전문가) 결과 종합 반영 |
| 2026-03-10 | 5.0 | 12개 에이전트 팀미팅 + 대표 의사결정 5건 반영. Phase 전면 재편. 기능 24개(F000~F303) |
| 2026-03-09 | 4.0 | C-Suite 5인 합동 분석 반영 |
| 2026-03-04 | 3.0 | Phase 3 고도화 PRD 초안 |
