# PRESSCO21 파트너클래스 플랫폼 고도화 PRD

> **버전**: 5.0
> **작성일**: 2026-03-10
> **기반**: 12개 에이전트 팀미팅 + 대표 의사결정 5건 + CSO 종합 전략
> **변경점**: Phase 재편(0/1/2/3), 키트 전략 3단계 확정, 수수료 비공개 정책, 협회 우선순위 확정, 상태값 정규화 6개 도메인, 테스트 데이터 시뮬레이션 전략 추가

---

## 1. 프로젝트 핵심

### 1-1. 목적

꽃공예 강사(파트너)가 수업 운영에만 집중할 수 있도록, 일정 관리부터 재료 키트 연동, 수강생 성장 파이프라인까지 플랫폼이 모든 운영 부담을 대신 처리한다. 동시에 수강생은 전국의 오프라인/온라인 강의를 카테고리와 지역 기준으로 빠르게 탐색하고 예약할 수 있어야 한다.

### 1-2. 북극성 문장

> "수강생이 클래스 예약부터 재료 재구매까지 끊김 없이 흐르는 경험을 완성하여, 파트너클래스를 자사몰 트래픽과 매출의 핵심 유입 엔진으로 만든다." — CSO 전략 방향

확장 표현:

> PRESSCO21 파트너클래스는 수강생에게는 믿고 예약할 수 있는 클래스 허브, 파트너에게는 강의만 잘하면 되게 만드는 운영 지원 플랫폼, 협회에게는 회원 락인과 공동 홍보를 제공하는 제휴 플랫폼이다.

### 1-3. 핵심 차별점 (ecommerce-business-expert 분석)

1. **재료 공급자 = 교육 플랫폼 운영자**: 재료 공급자가 교육 플랫폼을 운영하는 유일한 구조. "배우고 끝이 아닙니다. 같은 재료로 계속 만들 수 있습니다."
2. **역수수료 구조**: 경쟁사(프립 15~20%, 클래스101 30%)와 달리 등급이 올라갈수록 수수료가 낮아지는 파트너 친화 구조
3. **파트너 OS**: 결제, 정산, 키트/재료 준비, 홍보, 일정 운영을 PRESSCO21이 대신하는 운영 대행 서비스

### 1-4. 수익 모델 3층 구조 (CFO 분석)

| 층 | 수익원 | 설명 | 전략적 위치 |
|----|--------|------|-----------|
| **1층** (핵심) | 재료키트 판매 | 건당 순이익 6,000~18,000원 | 핵심 수익 엔진 |
| **2층** (플랫폼) | 강의료 수수료 | 등급별 10~25% | 플랫폼 유지 + 파트너 락인 |
| **3층** (생태계) | 파트너 도매 재료 + 수강생 후속 재구매 | 생태계 선순환 | Flywheel 동력 |

**협회원 LTV**: 24개월 기준 ₩197,557 (CFO 산출)

### 1-5. 대표 의사결정 반영 (2026-03-10)

| # | 의사결정 | 반영 위치 |
|---|---------|----------|
| **D1** | 키트 전략: 별도 선제작 없음. 파트너별 강의 재료를 자사몰 기존 상품으로 연결 → 정리 후 묶음 키트 상품화 → "강의만/키트포함" 선택형. 최종: `A강의 5만원 + 키트 3만원` 또는 `키트포함 8만원` | F100, F208 |
| **D2** | 수수료율 온라인 비공개. 대표가 직접 메일/전화/대면으로 안내 | 2절 수수료 구조 |
| **D3** | 협회 순서: 1차 어머니 협회 + 기존 활성 고객 → 2차 부케 관련 활성 협회 | F201 |
| **D4** | 정규화: 6개 도메인 전체 일괄 | F001 |
| **D5** | 핵심 방향: "파트너를 섭외하려면 Phase 2까지 구현된 걸 보여줘야 한다" → 테스트 데이터로 시뮬레이션하며 검증 + 구현 병행 | F209, 11절 |

---

## 2. 파트너 등급별 수수료 구조

> 원칙: 강의료에서만 수수료 차감. 등급이 높을수록 수수료가 낮아져 파트너 성장 인센티브 제공.

| 등급 | 수수료율 | 파트너 수취율 | 승급 조건 | 비고 |
|------|---------|-------------|----------|------|
| **BLOOM** (입문) | 25% | 75% | 파트너 승인 시 기본 | 신규 파트너 |
| **GARDEN** (성장) | 20% | 80% | 수업 완료 10건 + 평점 4.0 이상 | 활동 검증 |
| **ATELIER** (전문) | 15% | 85% | 수업 완료 30건 + 평점 4.3 이상 | 전문 강사 |
| **AMBASSADOR** (대표) | 10% | 90% | 수업 완료 50건 + 신규 파트너 추천 3명 | 생태계 리더 |

### 수수료 정책 세부

- 수수료는 **강의료(수강료)에서만** 차감. 재료키트 매출에서는 수수료 미적용.
- 적립금 지급 방식: 수수료 차감 후 금액을 메이크샵 적립금으로 지급.
- 등급 심사: WF-13이 월 1회 자동 평가, 조건 충족 시 자동 승급.
- 등급 하향: 3개월 연속 수업 0건 시 한 단계 하향 (BLOOM은 유지).
- **[D2] 수수료율 온라인 비공개 정책**: 수수료율은 파트너 신청/상세/목록 등 공개 화면에 노출하지 않는다. 대표가 직접 메일, 전화, 대면으로 개별 안내한다. 대시보드에서는 파트너 본인의 정산 내역과 수취율만 확인 가능하다.

---

## 3. 현재 상태 진단 (2026-03-10)

### 3-1. Phase 2.7까지 완료 자산

| 영역 | 완료 항목 |
|------|----------|
| 메이크샵 페이지 | 목록(2606), 상세(2607), 대시보드(2608), 파트너신청(2609), 교육(2610), 강의등록(8009), 마이페이지(8010), 어드민(8011) — 총 8페이지 |
| n8n 워크플로우 | 19개 WF ACTIVE + WF JSON 22개 |
| NocoDB 테이블 | 11개 테이블 운영 중 (Partners, Classes, Applications, Settlements, Reviews, Settings, Schedules, Affiliations, Member_Affiliations, Affiliation_Stats + 챗봇/강사공간/정부지원) |
| 핵심 완료 기능 | 일정 시스템, 클래스 수정, 이메일 알림, 수강생 예약 확인, 재료키트 자동 배송, 관리자 어드민, 협회 제휴 DB, 4등급 회원 체계, CS FAQ, 잔여석 표시, 선물하기 |
| 수수료 체계 | BLOOM 25% / GARDEN 20% / ATELIER 15% / AMBASSADOR 10% 배포 완료 |

### 3-2. CTO 진단: 기술 부채

| 부채 | 심각도 | 상세 |
|------|--------|------|
| NocoDB 백업 부재 | **CRITICAL** | 일일 자동 백업 미구축. 데이터 손실 시 복구 불가 |
| 상태값 대소문자 혼재 | **HIGH** | Classes: `INACTIVE`/`active`/`paused`/`rejected` 혼재, Applications: 대문자, Settlements: 대문자 |
| WF-ADMIN 중복 ID | **HIGH** | 이전 ID(`YT6cKPhozRLpKS7u`) + 현재 ID(`SMCKmeLSfxs1e1Ef`) 공존 |
| WF-01 God Workflow | **MEDIUM** | 단일 워크플로우에 getClasses/getClassDetail/getCategories/getAffiliations 등 다수 액션 집중 |
| NocoDB 필드 추가 방식 | **MEDIUM** | REST API 불가 → SSH SQLite 직접 수정 or NocoDB GUI (meta API v2 사용 가능 확인) |

### 3-3. 라이브 UX 결함 (2026-03-10 handoff 기반)

| 결함 | 상태 | 상세 |
|------|------|------|
| 난이도 표기 혼재 | 수정 완료 (코드) / 정규화 미완료 (DB) | `beginner` vs `입문` — 상세 분류 링크 정규화 적용, DB 일괄 정규화 필요 |
| 로그인 경로 불일치 | 수정 완료 | `/member/login.html` → `/shop/member.html?type=login` 통일 |
| 선물하기 동작 | 수정 완료 | native gift 링크 우선 + `basket.action` 폴백 구조 |
| 카카오 SDK integrity 오류 | 미해결 | 콘솔 에러 지속. JS Key 발급 후 교체 필요 |

### 3-4. 서버 인프라 현황 (CTO 분석)

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud Free Tier ARM (2 OCPU / 12GB RAM) |
| 현재 RAM 사용 | ~3.5GB (여유 ~8.5GB, **88% 여유**) |
| 파트너 수용 | 현 스택으로 파트너 100명까지 충분 |
| Swap | 4GB 추가됨 |
| 추가 WF 수용 | 3~4개 Webhook WF 안전 추가 가능 |

---

## 4. 사용자 여정 (목표 상태)

### 4-1. 수강생 여정 (CMO 6단계 퍼널 기반)

```
[인지] SNS/검색/협회 → 파트너클래스 목록(2606)
  ↓
[관심] 신뢰 배지 + 퀵 필터 + 큐레이션(베스트/입문추천/마감임박) 탐색
      → 카테고리 / 지역 / 형태(오프라인/온라인) 선택
      → 오프라인이면 리스트/지도 전환(파트너맵 통합), 온라인이면 리스트 중심 비교
  ↓
[예약] 상세(2607) → Trust Summary Bar + "이 가격에 포함된 것" 확인
       → 일정 캘린더 + 잔여석 확인 → 인원 선택
       → "강의만 예약" 또는 "키트포함 예약" 선택 [D1]
       → 로그인 → 메이크샵 결제 (branduid 기반)
  ↓
[수강] WF-05 폴링 감지 → 결제 확인 이메일(WF-12)
       → D-3/D-1 리마인더(WF-11) → 수강 완료
  ↓
[재구매] 후기 요청(WF-12) → 후기 작성 시 쿠폰 지급
         → "이 수업에 사용된 재료 구매하기" CTA → 자사몰 상품 링크
         → 키트 추천 + 관련 재료 재구매
  ↓
[팬/파트너] 수료증 1개 이상 보유 → "강사 도전하기" CTA
            → 파트너 신청(2609) 우대 심사
```

수강생 탐색 경험의 핵심 원칙:

1. 클래스 허브는 하나로 유지한다.
2. 오프라인 클래스는 파트너맵과 통합된 지도 뷰를 제공한다.
3. 온라인 클래스는 지도 대신 비교와 신뢰 정보에 집중한다.
4. 필터의 기본 축은 `카테고리 / 지역 / 형태`다.
5. 수강생은 원하는 지역 클래스와 원하는 온라인 클래스를 같은 허브 안에서 함께 비교할 수 있어야 한다.

### 4-2. 파트너 여정

```
[발견] 세일즈형 파트너 신청 랜딩 → "강의만 잘하시면 됩니다" 메시지
  ↓
[신청] 파트너 신청(2609) → WF-07 접수 → 관리자 승인(WF-APPROVE)
       → BLOOM 등급 배정 (수수료율은 대표가 개별 안내) [D2]
  ↓
[온보딩] 교육 이수(2610) → 온보딩 체크리스트 완료
         → 강의 등록(8009) → 일정 + 자사몰 상품 링크 입력 [D1]
         → 관리자 승인(WF-17) → 메이크샵 상품 자동 등록
  ↓
[운영] 대시보드(2608) 액션 보드 — 오늘 수업/키트 준비/미답변 후기
       → 일정 관리/강의 수정/예약 현황/수익 차트
  ↓
[정산] WF-05 결제 감지 → WF-SETTLE 수수료 차감 → 적립금 지급
  ↓
[성장] 수업 10건 이상 완료 → 자동 등급 승급
       → BLOOM → GARDEN → ATELIER → AMBASSADOR
  ↓
[이탈 방지] 파트너 이탈 감지 자동화 → 30일 비활동 시 알림
```

### 4-3. 협회 여정

```
[제안] 대표 직접 접촉 (1차 어머니 협회 + 기존 활성 고객) [D3]
  ↓
[제휴] 협회 파트너십 체결 → tbl_Affiliations 등록
       → 협회 일정/세미나/이벤트/콘텐츠 게시
       → 협회원 전용 제품 큐레이션
  ↓
[활성화] 협회원 유입 → 클래스 수강 + 전용 상품 구매
         → WF-AFFIL-SYNC 매월 구매액 집계
  ↓
[락인] 협회 시그니처 제품 + 전용 혜택
       → 자사몰 반복 구매 → 커뮤니티 고착
```

### 4-4. 관리자 여정

```
어드민 페이지(8011)
  ├── 파트너 신청 승인/거부 → WF-APPROVE 연동
  ├── 강의 승인/거부 → WF-17 연동
  ├── 정산 현황 + 수동/자동 처리 → WF-SETTLE
  ├── 협회 관리 → 제휴 협회 테이블 + 월간 집계
  └── 파트너 이탈 감지 → 비활동 파트너 경보
```

---

## 5. 기능 명세 (Phase별)

### Phase 0: 긴급 안정화 (1~2주)

> **목표**: 데이터 안전 + 기술 부채 해소 → 안정적 운영 기반 확보

| ID | 기능명 | 설명 | 필수 이유 |
|----|--------|------|-----------|
| **F000** | NocoDB 일일 자동 백업 | cron + `docker exec nocodb` 기반 SQLite 백업 → 로컬/원격 보관. 7일 보관, 30일 월간 아카이브 | **CRITICAL**: 데이터 손실 시 복구 불가 (CTO) |
| **F001** | 상태값 정규화 (6개 도메인) | 아래 6개 도메인의 상태값을 대문자 ENUM으로 통일. DB 일괄 마이그레이션 + WF 코드 + 프론트 코드 동시 수정 [D4] | 상태값 혼재가 모든 버그의 근원 (CTO) |
| **F002** | WF-ADMIN 중복 ID 정리 | 이전 ID(`YT6cKPhozRLpKS7u`) 비활성화 → 현재 ID(`SMCKmeLSfxs1e1Ef`) 단일 운용. 모든 참조 코드 갱신 | 중복 WF가 예기치 않은 동작 유발 |
| **F003** | WF-01 액션 맵 문서화 | Switch 분기별 액션/입력/출력/의존 테이블을 문서화. 향후 분리 계획의 기준선 | God Workflow 관리 불가 방지 |

**F001 상태값 정규화 대상 (class-platform-architect 설계):**

| 도메인 | 현재 상태 | 정규화 후 |
|--------|----------|----------|
| difficulty (난이도) | `beginner`/`입문`/`intermediate`/`중급` | `BEGINNER` / `INTERMEDIATE` / `ADVANCED` / `ALL_LEVELS` |
| grade (등급) | `SILVER`/`BLOOM`/`GARDEN` 혼재 | `BLOOM` / `GARDEN` / `ATELIER` / `AMBASSADOR` |
| bookingStatus (예약) | 혼재 | `PENDING` / `CONFIRMED` / `COMPLETED` / `CANCELLED` / `REFUNDED` / `NO_SHOW` / `WAITLISTED` / `RESCHEDULED` |
| approvalStatus (승인) | 혼재 | `PENDING` / `APPROVED` / `REJECTED` / `SUSPENDED` |
| classStatus (클래스) | `INACTIVE`/`active`/`paused`/`rejected` | `DRAFT` / `PENDING_REVIEW` / `ACTIVE` / `PAUSED` / `REJECTED` / `ARCHIVED` |
| region (지역) | `서울 강남구`/`서울` 혼재 | `SEOUL` / `GYEONGGI` / `INCHEON` / `BUSAN` / `DAEGU` / `DAEJEON` / `GWANGJU` / `ULSAN` / `SEJONG` / `GANGWON` / `CHUNGBUK` / `CHUNGNAM` / `JEONBUK` / `JEONNAM` / `GYEONGBUK` / `GYEONGNAM` / `JEJU` / `ONLINE` |

---

### Phase 1: 수익 엔진 (3~6주)

> **목표**: 수강생→키트 재구매 연결 완성 + 정산 자동화 + 신뢰 UX 강화
> **마일스톤**: 파트너 3명 실운영 + 월 15건 수강 + 키트 연계율 50%

| ID | 기능명 | 설명 | 담당/의존 |
|----|--------|------|-----------|
| **F100** | 키트 연동 Step 1 (자사몰 상품 링크) | 강의 등록 시 자사몰 기존 상품 branduid를 연결. 상세 페이지에서 "이 수업에 사용되는 재료" 섹션으로 자사몰 상품 링크 노출. [D1] | CTO / F001 완료 후 |
| **F101** | 상세 페이지 UX 리디자인 | Trust Summary Bar(강사 검수 완료/환불 가능/키트 포함 등) + "이 가격에 포함된 것" 섹션 + CTA 계층(1차 예약/2차 선물/3차 공유). (makeshop-ui-ux-expert, customer-experience-specialist 설계) | CTO / 독립 |
| **F102** | 목록 신뢰 배지 6종 + 퀵 필터 칩 | 신뢰 배지: 키트포함/초보환영/인기강의/마감임박/신규/협회원전용. 퀵 필터 칩 바: 지역/난이도/카테고리 원터치 필터. 큐레이션 섹션: 베스트/입문추천/마감임박. (makeshop-ui-ux-expert 설계) | CTO / F001 완료 후 |
| **F103** | 수강완료 → 재구매 동선 | 수강 완료 후 후기 작성 시 쿠폰 지급. 후기 완료 화면에서 "이 수업 재료 구매하기" CTA → 자사몰 상품 링크. 키트 추천 알고리즘(동일 카테고리 인기 상품). (customer-experience-specialist 설계) | CTO / F100 |
| **F104** | 정산 자동화 WF-SETTLE | 수강 완료 D+3 자동 정산. 등급별 수수료 차감 → 적립금 지급 → tbl_Settlements 상태 갱신. 환불 시 적립금 역처리 포함. 정산 내역 대시보드 노출 (수수료율 자체는 비공개). [D2] (CFO 설계) | CTO / 독립 |
| **F105** | CS FAQ 15개 확장 | 기존 5개 → 15개. customer-experience-specialist 분석 기반 수강생 불안 Top 15 반영 (가격/환불/준비물/강사/일정변경/키트배송 등) | CTO / 독립 |
| **F106** | 파트너 온보딩 체크리스트 UX | 신규 파트너 대시보드 진입 시 온보딩 가이드: 프로필 작성 → 교육 이수 → 첫 강의 등록 → 일정 입력 → 키트 연결. 완료 게이지 + 미완료 항목 하이라이트. (makeshop-ui-ux-expert 설계) | CTO / 독립 |
| **F107** | 대시보드 액션 보드 | 대시보드 첫 화면: 3카드 액션 보드(오늘 수업/키트 준비/미답변 후기). 빈 상태 UX 강화("아직 등록된 수업이 없습니다. 첫 강의를 만들어 보세요"). (makeshop-ui-ux-expert 설계) | CTO / 독립 |

---

### Phase 2: 성장 가속 (7~12주)

> **목표**: 파트너 확보 + 협회 제휴 + 콘텐츠 허브 → "파트너 섭외 시 보여줄 수 있는 완성된 플랫폼" [D5]
> **마일스톤**: 파트너 10명 이상, 월 30건 수강, 협회 1곳 이상 제휴

| ID | 기능명 | 설명 | 담당/의존 |
|----|--------|------|-----------|
| **F200** | 파트너 신청 세일즈 랜딩 리디자인 | 히어로 섹션("강의만 잘하시면 됩니다") + 비교 테이블(타 플랫폼 vs PRESSCO21 차별점) + 성장 경로 시각화(BLOOM→AMBASSADOR) + 하단 신청 폼. 수수료율은 노출하지 않음 [D2]. (CMO, sales-partnership-specialist 설계) | CTO / 독립 |
| **F201** | 협회 B2B 영업 도구 | 협회 제안서 자동 생성. 1차 타겟: 어머니 협회 + 기존 활성 고객, 2차: 부케 관련 활성 협회 [D3]. 협회별 전용 랜딩 URL. 7단계 영업 시나리오 지원(접촉→제안→체험→체결→활성화→확대→갱신). (sales-partnership-specialist 설계) | CMO / 독립 |
| **F202** | IA 확장 (목록 3탭 + 상세 content_type 분기) | 목록(2606): 3탭("전체 클래스" / "협회/세미나" / "협회원 혜택"). 상세(2607): content_type 분기(class/seminar/affiliation_event). (class-platform-architect 설계) | CTO / F001 |
| **F203** | WF-01 점진적 분리 | God Workflow를 액션별 독립 WF로 분리 시작. 1차: getClasses/getClassDetail 분리. 2차: getCategories/getAffiliations 분리. (CTO 설계) | CTO / F003 |
| **F204** | 콘텐츠 허브 4영역 | 1) 파트너 스토리(강사 인터뷰/작품), 2) 수강생 후기 모음, 3) 꽃공예 가이드(초보자용 콘텐츠), 4) 시즌 큐레이션(계절별 추천). (content-strategist 설계) | CMO / 독립 |
| **F205** | 커뮤니티 리텐션 장치 | 완전 루프(유입→체험→공유→재구매→성장) 지원. 수강생 공유 인센티브(친구 초대 시 적립금). 12개월 이벤트 캘린더 연동. (community-manager 설계) | CMO / 독립 |
| **F206** | 파트너 이탈 감지 자동화 | 30일 비활동 파트너 자동 감지 → 텔레그램 관리자 알림 + 파트너 리텐션 이메일. 60일 비활동 시 대표 에스컬레이션. (COO 설계) | CTO / 독립 |
| **F207** | 3계층 캐싱 | 1) localStorage 캐시(클래스 목록 5분 TTL), 2) n8n staticData(카테고리/협회 정보 1시간 TTL), 3) NocoDB 조회 최적화(자주 쓰는 뷰 인덱스). API 호출 예산 최적화. (CTO 설계) | CTO / F203 |
| **F208** | 키트 연동 Step 2 (묶음 키트 + 선택형) | 자사몰 기존 상품을 묶음 키트 상품으로 구성. 상세 페이지에서 "강의만 예약 5만원" / "키트포함 8만원" 선택형 UI [D1]. WF-05에서 키트 포함 결제 시 별도 주문 생성. | CTO / F100 |
| **F209** | 테스트 데이터 시뮬레이션 | 파트너 섭외 데모용 테스트 데이터 구성 [D5]. 가상 파트너 5명/클래스 15개/예약 50건/후기 30건. 11절 상세. | CTO / F001 |

---

### Phase 3: 스케일업 (13~24주)

> **목표**: 신규 테이블 확장 + 비금전적 인센티브 + 키트 구독 → 플랫폼 성숙
> **마일스톤**: 파트너 20명 이상, 월 80건 수강, 수강생→파트너 전환 첫 발생

| ID | 기능명 | 설명 | 담당/의존 |
|----|--------|------|-----------|
| **F300** | NocoDB 4개 신규 테이블 | tbl_Seminars, tbl_Affiliation_Products, tbl_Affiliation_Content, tbl_Vocabulary. (class-platform-architect 설계, 6절 상세) | CTO / F202 |
| **F301** | 등급별 비금전적 인센티브 | GARDEN: 프로필 배지 + 우선 노출. ATELIER: 콘텐츠 허브 인터뷰 게재 + 자사몰 배너 노출. AMBASSADOR: 신규 파트너 멘토 + 세미나 공동 기획. (sales-partnership-specialist 설계) | CMO / 독립 |
| **F302** | 키트 구독 모델 파일럿 | 월정액 재료 키트 구독. 정기 수강생 대상 파일럿(10명). 구독자 전용 가격 + 배송 스케줄. (CFO 수익성 검증 후) | CFO / F208 |
| **F303** | 서버 확장성 검증 | 파트너 100명 이상 시나리오 부하 테스트. Oracle Free Tier 한계 확인 + 확장 플랜(ARM 업그레이드 or 2nd 인스턴스). (CTO, devops-monitoring-expert 설계) | CTO / 독립 |

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

### 6-2. 신규 테이블 4개 (Phase 3 — F300)

**tbl_Seminars** — 협회 세미나/이벤트

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| seminarId | TEXT UNIQUE | 세미나 고유 ID |
| affiliationCode | TEXT | → tbl_Affiliations.affiliation_code |
| title | TEXT | 세미나 제목 |
| description | TEXT | 상세 설명 |
| seminarDate | TEXT | YYYY-MM-DD |
| seminarTime | TEXT | HH:MM |
| location | TEXT | 장소 |
| capacity | INTEGER | 정원 |
| status | TEXT | `DRAFT` / `ACTIVE` / `COMPLETED` / `CANCELLED` |
| imageUrl | TEXT | 썸네일 URL |
| createdAt | TEXT | datetime |

**tbl_Affiliation_Products** — 협회원 전용 상품 큐레이션

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| affiliationCode | TEXT | → tbl_Affiliations.affiliation_code |
| branduid | TEXT | 메이크샵 상품 branduid |
| productName | TEXT | 상품명 |
| discountRate | INTEGER | 협회원 전용 할인율 (%) |
| isSignature | INTEGER | 0/1 — 협회 시그니처 상품 여부 |
| displayOrder | INTEGER | 노출 순서 |
| status | TEXT | `ACTIVE` / `INACTIVE` |

**tbl_Affiliation_Content** — 협회 콘텐츠

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| affiliationCode | TEXT | → tbl_Affiliations.affiliation_code |
| contentType | TEXT | `NOTICE` / `EVENT` / `GUIDE` / `NEWS` |
| title | TEXT | 제목 |
| body | TEXT | 본문 (HTML) |
| imageUrl | TEXT | 대표 이미지 |
| publishDate | TEXT | 게시일 |
| status | TEXT | `DRAFT` / `PUBLISHED` / `ARCHIVED` |

**tbl_Vocabulary** — 용어 사전 (brand-planning-expert 설계)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| domain | TEXT | 카테고리: `DIFFICULTY` / `GRADE` / `BOOKING` / `APPROVAL` / `CLASS` / `REGION` |
| code | TEXT | 정규화 코드 (영문 대문자) |
| labelKo | TEXT | 한국어 표시명 |
| labelEn | TEXT | 영문 표시명 |
| description | TEXT | 설명 |

### 6-3. 기존 테이블 필드 추가

**tbl_Classes** 추가/변경 필드:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| kitItems | JSON Text | 재료키트 목록 `[{branduid, productName, qty, price}]` | 기존 완료 |
| kitEnabled | Checkbox | 키트 배송 활성 | 기존 완료 |
| faqItems | JSON Text | 강의별 FAQ | 기존 완료 |
| kitBundleBranduid | TEXT | 묶음 키트 메이크샵 상품 branduid | Phase 2 (F208) |
| contentType | TEXT | `CLASS` / `SEMINAR` / `EVENT` | Phase 2 (F202) |

**tbl_Partners** 추가/변경 필드:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| grade | TEXT | `BLOOM`/`GARDEN`/`ATELIER`/`AMBASSADOR` | 기존 완료 |
| commissionRate | INTEGER | 등급별 수수료율 (25/20/15/10) | 기존 완료 |
| onboardingStatus | JSON Text | 온보딩 체크리스트 상태 | Phase 1 (F106) |
| lastActiveAt | TEXT | 마지막 활동 일시 | Phase 2 (F206) |

**tbl_Settlements** 추가 필드:

| 필드 | 타입 | 설명 | Phase |
|------|------|------|-------|
| settlementType | TEXT | `AUTO` / `MANUAL` | Phase 1 (F104) |
| settledAt | TEXT | 정산 처리 일시 | Phase 1 (F104) |
| refundAmount | INTEGER | 환불 금액 | Phase 1 (F104) |

### 6-4. 상태값 정규화 전체 매핑표 (F001)

| 도메인 | DB 필드 | 테이블 | 현재값 예시 | 정규화 후 | 프론트 표시 (한국어) |
|--------|---------|--------|-----------|----------|-------------------|
| difficulty | difficulty | tbl_Classes | `beginner` | `BEGINNER` | 입문 |
| difficulty | difficulty | tbl_Classes | `intermediate` | `INTERMEDIATE` | 중급 |
| difficulty | difficulty | tbl_Classes | `advanced` | `ADVANCED` | 심화 |
| difficulty | difficulty | tbl_Classes | — | `ALL_LEVELS` | 전체 수준 |
| grade | grade | tbl_Partners | `SILVER` | `BLOOM` | BLOOM |
| classStatus | status | tbl_Classes | `active` | `ACTIVE` | 활성 |
| classStatus | status | tbl_Classes | `INACTIVE` | `DRAFT` | 초안 |
| classStatus | status | tbl_Classes | `paused` | `PAUSED` | 일시정지 |
| classStatus | status | tbl_Classes | `rejected` | `REJECTED` | 반려 |
| approvalStatus | status | tbl_Applications | `PENDING` | `PENDING` | 대기 |
| approvalStatus | status | tbl_Applications | `APPROVED` | `APPROVED` | 승인 |
| approvalStatus | status | tbl_Applications | `REJECTED` | `REJECTED` | 거부 |
| bookingStatus | status | tbl_Settlements | `PENDING_SETTLEMENT` | `PENDING` | 정산 대기 |
| bookingStatus | status | tbl_Settlements | `COMPLETED` | `COMPLETED` | 완료 |
| bookingStatus | status | tbl_Settlements | `CANCELLED` | `CANCELLED` | 취소 |
| bookingStatus | status | tbl_Settlements | `SELF_PURCHASE` | `SELF_PURCHASE` | 자가구매 |
| region | location | tbl_Classes | `서울 강남구` | `SEOUL` | 서울 |
| region | location | tbl_Classes | `경기` | `GYEONGGI` | 경기 |

---

## 7. API 설계

### 7-1. WF-01 현재 액션 맵

| Switch Index | 액션 | HTTP | 입력 | 출력 |
|-------------|------|------|------|------|
| [0] | getClasses | POST | `page`, `category`, `difficulty`, `region`, `sort` | `{success, data: {classes, page, total, totalPages}}` |
| [1] | getClassDetail | POST | `classId` | `{success, data: {class_id, ..., partner, schedules}}` |
| [2] | getCategories | POST | — | `{success, data: [{name, class_count}]}` |
| [3] | getAffiliations | POST | — | `{success, data: [{affiliation_code, affiliation_name, ...}]}` |

### 7-2. 신규 액션 6개 (class-platform-architect 설계)

| 액션 | Phase | WF | 입력 | 출력 |
|------|-------|-----|------|------|
| getSeminars | 2 (F202) | WF-01 or 분리 WF | `affiliationCode`, `page` | 세미나 목록 + 페이지네이션 |
| getSeminarDetail | 3 (F300) | 분리 WF | `seminarId` | 세미나 상세 |
| getAffiliationDetail | 2 (F202) | WF-01 or 분리 WF | `affiliationCode` | 협회 상세 + 일정 + 콘텐츠 |
| getAffiliationProducts | 3 (F300) | 분리 WF | `affiliationCode` | 협회원 전용 상품 목록 |
| getAffiliationContent | 3 (F300) | 분리 WF | `affiliationCode`, `contentType` | 협회 콘텐츠 목록 |
| getVocabulary | 2 (F202) | WF-01 or 분리 WF | `domain` | 용어 사전 (코드→라벨 매핑) |

### 7-3. WF-SETTLE 설계 (Phase 1 — F104)

```
[트리거] WF-05 결제 감지 완료 → Schedule Node (D+3 지연)
  ↓
[검증] tbl_Settlements에서 해당 주문 조회 → 이미 정산 완료인지 확인
  ↓
[계산] 파트너 등급 조회 → 수수료율 적용 → commissionAmount / partnerAmount 산출
  ↓
[정산] 메이크샵 적립금 API (process_reserve) 호출 → 파트너에게 적립금 지급
  ↓
[기록] tbl_Settlements UPDATE: status=COMPLETED, settledAt, commissionAmount, reserveAmount
  ↓
[알림] 파트너 이메일 + 텔레그램 → "정산 완료: ₩XX,XXX 적립금 지급"
  ↓
[환불 분기] 환불 요청 시 → 적립금 역처리 + status=REFUNDED
```

### 7-4. API 호출 예산 영향

| API | 현재 호출/시간 | Phase 2 이후 예상 | 500회 제한 대비 |
|-----|-------------|-----------------|--------------|
| 메이크샵 조회 API | ~30 | ~80 | 16% (안전) |
| 메이크샵 처리 API | ~10 | ~40 | 8% (안전) |
| NocoDB API | ~200 | ~400 | 제한 없음 |
| n8n 내부 호출 | ~50 | ~120 | 제한 없음 |

3계층 캐싱(F207) 적용 시 메이크샵 API 호출 50% 이상 절감 예상.

---

## 8. UX 설계 원칙

### 8-1. 3단 메시지 아키텍처 (brand-planning-expert 설계)

| 레이어 | 대상 | 핵심 메시지 |
|--------|------|-----------|
| **수강생** | 클래스 탐색/예약 | "돈 값 할까?"를 "믿고 예약해도 되겠다"로 바꾸는 신뢰 장치 |
| **파트너** | 운영/성장 | "강의만 잘하시면 됩니다. 나머지는 저희가 합니다." |
| **협회** | 제휴/락인 | "협회원에게 실질적 혜택을, 협회에게 공동 홍보를 제공합니다." |

### 8-2. 신뢰 배지 시스템 (makeshop-ui-ux-expert 설계)

| 배지 | 조건 | 노출 위치 |
|------|------|----------|
| 키트포함 | `kitEnabled === 1` | 목록 카드, 상세 헤더 |
| 초보환영 | `difficulty === 'BEGINNER'` | 목록 카드, 상세 헤더 |
| 인기강의 | `totalBookings >= 30` | 목록 카드 |
| 마감임박 | `totalRemaining <= 3 && totalRemaining > 0` | 목록 카드 (펄스 애니메이션) |
| 신규 | `createdAt` 30일 이내 | 목록 카드 |
| 협회원전용 | `affiliationCode !== null` | 목록 카드, 상세 헤더 |

### 8-3. CTA 계층 원칙

| 페이지 | 1차 CTA | 2차 CTA | 3차 CTA |
|--------|---------|---------|---------|
| 상세 | 예약하기 (강조색) | 선물하기 (보조색) | 공유하기 (아이콘) |
| 목록 | 클래스 카드 클릭 | 퀵 필터 | 탭 전환 |
| 파트너 신청 | 지금 신청하기 (히어로 하단) | 자세히 알아보기 (스크롤) | — |
| 대시보드 | 액션 보드 카드 클릭 | 탭 이동 | — |

### 8-4. 반응형 브레이크포인트

| 브레이크포인트 | 대상 | 레이아웃 변경 |
|-------------|------|-------------|
| ~767px | 모바일 | 1열. CTA 하단 고정. 카드 세로 배치 |
| 768px~991px | 태블릿 | 2열. 사이드바 숨김 |
| 992px~1199px | 소형 데스크톱 | 3열. 사이드바 표시 |
| 1200px~ | 대형 데스크톱 | 4열. 풀 레이아웃 |

### 8-5. 용어 사전 6개 카테고리 (brand-planning-expert 설계)

모든 UI/API/DB에서 아래 용어를 통일한다:

| 카테고리 | 통일 어휘 |
|---------|----------|
| 난이도 | 입문 / 중급 / 심화 / 전체 수준 |
| 등급 | BLOOM / GARDEN / ATELIER / AMBASSADOR |
| 예약 상태 | 대기 / 확정 / 완료 / 취소 / 환불 / 미출석 / 대기자 / 일정변경 |
| 승인 상태 | 대기 / 승인 / 거부 / 정지 |
| 클래스 상태 | 초안 / 심사중 / 활성 / 일시정지 / 반려 / 보관 |
| 지역 | 서울 / 경기 / 인천 / 부산 / 대구 / 대전 / 광주 / 울산 / 세종 / 강원 / 충북 / 충남 / 전북 / 전남 / 경북 / 경남 / 제주 / 온라인 |

---

## 9. 위험 요소 및 대응

### 9-1. 실행 리스크

| 리스크 | 등급 | 대응 | 담당 |
|--------|------|------|------|
| NocoDB 데이터 손실 (백업 부재) | **CRITICAL** | F000 즉시 구축. cron 일일 백업 + 7일 보관 + 월간 아카이브 | CTO |
| 적립금 정산 세무 이슈 (부가세/원천징수) | **HIGH** | 세무사 확인 필수 (사업 개시 전). CFO 사전 검토 | CFO |
| 환불 시 적립금 역처리 미설계 | **HIGH** | F104 WF-SETTLE에서 REFUND 상태 + 역처리 로직 포함 | CTO |
| 상태값 정규화 마이그레이션 장애 | **HIGH** | F001에서 백업 후 단계별 마이그레이션. 롤백 스크립트 준비 | CTO |
| 파트너 모집 지연 (데모 부재) | **MEDIUM** | F209 테스트 데이터 시뮬레이션으로 데모 환경 구축 [D5] | CTO+CMO |

### 9-2. 미실행 리스크

| 리스크 | 등급 | 발생 조건 | 영향 |
|--------|------|----------|------|
| 키트 재구매 루프 미연결 | **HIGH** | F100/F103 미구현 시 | 핵심 수익 엔진(1층) 미가동. 플랫폼 존재 이유 약화 |
| 정산 자동화 미구현 | **HIGH** | F104 미구현 시 | 파트너 신뢰 하락. 수동 정산 CS 폭증 |
| 파트너 신청 세일즈 페이지 미개편 | **MEDIUM** | F200 미구현 시 | 파트너 전환율 정체. 첫인상에서 가치 전달 실패 |
| 협회 제휴 도구 미구축 | **MEDIUM** | F201 미구현 시 | 협회 영업 시 실물 데모 불가. 신뢰 부족 |
| 캐싱 미적용 | **LOW** | F207 미구현 시 | 파트너 100명 이상 시 API 병목. 사용자 체감 성능 저하 |

---

## 10. 성공 지표 (KPI)

### 10-1. 비즈니스 지표

| 지표 | 현재 (2026-03-10) | 6개월 목표 | 12개월 목표 |
|------|------------------|-----------|-----------|
| 활성 파트너 수 | 0명 (테스트 중) | 10명 | 20명 |
| 월간 수강 예약 | 0건 | 30건 | 80건 |
| 예약 완료율 (상세→결제) | 측정 불가 | 35% | 50% |
| 재료키트 연계율 | 50% (키트 있는 클래스 중) | 70% | 80% |
| 수강완료→재구매 전환율 | 측정 불가 | 20% | 35% |
| 수강생→파트너 전환율 | — | — | 5% |
| 제휴 협회 수 | 0곳 | 1곳 이상 | 3곳 이상 |
| 협회원 월 구매액 | 0원 | ₩500,000 | ₩2,000,000 |

### 10-2. 기술 품질 지표

| 지표 | 기준 |
|------|------|
| IIFE 미적용 JS | 0개 |
| CSS 전역 셀렉터 | 0개 |
| Playwright E2E 통과율 | 100% |
| WF 에러 알림 미발송 | 0건 |
| API 응답 시간 | 2초 이내 |
| NocoDB 백업 성공률 | 100% (일일) |
| 상태값 정규화 위반 | 0건 (DB 레벨 검증) |

---

## 11. 테스트 데이터 시뮬레이션 전략

> **근거**: 대표 의사결정 D5 — "파트너를 섭외하려면 Phase 2까지 구현된 걸 보여줘야 한다"

### 11-1. 테스트 데이터 구성

| 데이터 | 수량 | 구성 |
|--------|------|------|
| 가상 파트너 | 5명 | BLOOM 2명, GARDEN 2명, ATELIER 1명. 각 파트너별 프로필/소개/사진 |
| 가상 클래스 | 15개 | 카테고리 3종(꽃다발/꽃꽂이/소품) x 난이도 3종. 키트포함 10개, 강의만 5개 |
| 가상 일정 | 30개 | 향후 2주간 분산. 정원 4~8명, 잔여석 1~6석 다양 |
| 가상 예약 | 50건 | 상태 분산: CONFIRMED 30, COMPLETED 15, CANCELLED 5 |
| 가상 후기 | 30건 | 평점 4.0~5.0 분산. 텍스트 후기 포함 |
| 가상 정산 | 20건 | COMPLETED 15, PENDING 5. 등급별 수수료 차감 반영 |

### 11-2. 시뮬레이션 시나리오 (파트너 섭외 데모)

| 시나리오 | 데모 경로 | 보여줄 가치 |
|---------|----------|-----------|
| 수강생 체험 | 목록 → 상세 → 일정 선택 → 예약 흐름 | "이렇게 예약이 들어옵니다" |
| 파트너 대시보드 | 로그인 → 액션 보드 → 수익 차트 → 일정 관리 | "이렇게 운영합니다" |
| 키트 연동 | 상세 → "이 수업 재료" 섹션 → 자사몰 상품 링크 | "재료도 자동으로 연결됩니다" |
| 등급 성장 | 대시보드 → 등급 게이지 → 승급 조건 | "수업할수록 수수료가 낮아집니다" |
| 관리자 운영 | 어드민 → 승인/정산/협회 관리 | "관리도 한 곳에서 합니다" |

### 11-3. 테스트 데이터 관리 원칙

- 테스트 데이터는 `[TEST]` prefix로 구분 (예: `[TEST] 플라워 바스켓 클래스`)
- 실 운영 시 일괄 삭제 스크립트 준비
- 가상 파트너 member_id는 테스트 계정 사용 (실 회원과 분리)
- 데모 URL은 별도 파라미터(`?demo=true`)로 테스트 데이터 필터 가능

---

## 기술 스택 및 제약사항

### 프론트엔드 (메이크샵 D4 제약 — 변경 없음)

| 항목 | 규칙 |
|------|------|
| 언어 | Vanilla HTML/CSS/JS (빌드 도구 없음) |
| JS 패턴 | IIFE 필수 |
| JS 이스케이프 | `${var}` → `\${var}` 필수 |
| CSS 스코핑 | 컨테이너 클래스로 범위 제한 |
| 외부 라이브러리 | CDN `<script>` 태그만 |
| 가상태그 | `<!--/user_id/-->` 등 절대 보존 |
| 반응형 | 768px / 992px / 1200px |

### 백엔드 (n8n + NocoDB)

| 항목 | 규칙 |
|------|------|
| n8n 코드 노드 | `$input` 우선 사용 (`$('NodeName')` 참조 간헐적 실패) |
| NocoDB Data API | `/api/v1/db/data/noco/{projectId}/{tableId}` + `xc-token` 헤더 |
| NocoDB Meta API | `/api/v2/meta/tables/{tableId}/columns` (v2, `xc-auth` 헤더) — 컬럼 추가 가능 |
| Switch 노드 | `typeVersion: 3.2` + `rules.values[...]` 형식 필수 (n8n v2.8.4 호환) |
| 메이크샵 API | 조회/처리 각 500회/시간 제한 |

### 서버 인프라

| 항목 | 값 |
|------|-----|
| 서버 | Oracle Cloud Free Tier ARM (2 OCPU / 12GB RAM) |
| 현재 RAM 사용 | ~3.5GB (여유 ~8.5GB) |
| Swap | 4GB 추가됨 |
| 추가 WF 수용 | 3~4개 Webhook WF 안전 추가 가능 |
| 파트너 100명 까지 | 현 스택 충분 (CTO 분석) |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-10 | 5.0 | 12개 에이전트 팀미팅 + 대표 의사결정 5건 반영. Phase 전면 재편(0 긴급안정화/1 수익엔진/2 성장가속/3 스케일업). 키트 전략 3단계(상품링크→묶음→선택형), 수수료 비공개 정책, 협회 우선순위, 상태값 정규화 6개 도메인, 테스트 데이터 시뮬레이션 전략 추가. 기능 24개(F000~F303). CSO 전략 방향/CFO 3층 수익모델/CMO 6단계 퍼널/CTO 기술부채/class-platform-architect IA+신규테이블/makeshop-ui-ux-expert 배지+CTA/brand-planning-expert 용어사전/ecommerce-business-expert Flywheel/customer-experience-specialist 여정맵/sales-partnership-specialist 파이프라인/content-strategist 콘텐츠허브/community-manager 리텐션 반영 |
| 2026-03-09 | 4.0 | C-Suite 5인 합동 분석 반영. Phase 0 신설, 등급별 수수료 역구조, 실행 우선순위 전면 재편 |
| 2026-03-04 | 3.0 | Phase 3 고도화 PRD 초안 (Phase 2 완료 기준) |
