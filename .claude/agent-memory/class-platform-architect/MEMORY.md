# class-platform-architect 에이전트 메모리

## 플랫폼 현황 (Phase 2 완료 기준, 2026-02-26)

### 확정된 시스템 구성
- **프론트엔드**: 메이크샵 D4 개별 페이지 5개 (2606~2610)
- **백엔드**: n8n 13개 워크플로우 + NocoDB 8개 테이블
- **서버**: Oracle Cloud (158.180.77.201), n8n.pressco21.com / nocodb.pressco21.com

### 핵심 아키텍처 결정 사항
- 모든 n8n 웹훅은 POST 전용
- NocoDB는 n8n HTTP Request 노드로만 접근 (내장 노드 미사용)
- 정산 멱등성: order_id 중복 체크 필수
- 비동기 원칙: 이메일 발송은 데이터 저장 후 실행

### 다음 개발 단계
- Phase 3: 수업 기획 도우미 (Task 301/302)
- 관리자 어드민 페이지 (partner-admin-developer 담당)
- 선행 필요: 메이크샵 편집기 js.js 재저장 4개 페이지

## 2026-03-10 공용 정체성 업데이트

- 파트너클래스의 1순위 고객은 파트너가 아니라 수강생이다.
- 파트너와 협회는 공급자이자 제휴 레이어다.
- 플랫폼의 직접 목표는 수수료 극대화가 아니라 커뮤니티 활성화, 재료/키트 판매, 자사몰 락인 강화다.
- 정보 구조는 `클래스 예약`, `협회/세미나`, `협회원 혜택` 3레이어를 같은 허브 안에서 분리해 운영한다.
- 협회 기능은 부가 게시판이 아니라 제휴 유치와 협회원 락인 장치다.
- 현재 문서 진입점은 `docs/파트너클래스/README.md` 이고, 충돌 시 `shared-service-identity.md`와 `enterprise-elevation-strategy-2026-03-10.md`를 우선한다.

## 2026-03-10 S1-1 키트 링크 연동 완료

- 키트 표준 데이터 구조는 `kit_items[{ name, product_url, quantity, price }]`로 고정한다.
- 강의 등록, 파트너 수정, 상세 페이지가 모두 같은 구조를 사용한다.
- 상세 페이지는 키트를 단순 안내가 아니라 `상품 보기`와 `재료 한번에 담기`가 있는 재구매 진입점으로 본다.
- 라이브 DB INSERT 제약 때문에 `WF-16/WF-20`은 `status=INACTIVE`, 소문자 `level`, `region 미저장`으로 저장하고, `WF-01` 읽기 응답에서 canonical 값으로 재정규화한다.
- 운영 기준 문서는 `docs/파트너클래스/kit-link-integration-guide.md` 이다.

## 2026-03-10 S1-2 상세 UX 고도화 완료

- 상세 페이지는 이제 `신뢰 요약 -> 포함 내역 -> 탭 상세 -> 재료 재구매` 흐름으로 읽히도록 구성한다.
- 상단 고정 신뢰 바는 `수강 / 평점 / 후기` 3개 수치만 유지한다.
- CTA 계층은 데스크탑과 모바일 모두 `예약하기 > 선물하기 > 키트만 구매` 순서로 통일한다.
- 운영 기준 문서는 `docs/파트너클래스/detail-ux-upgrade-guide.md` 이다.

## 2026-03-10 S1-3 목록 탐색 UX 완료

- 목록은 이제 `카테고리 -> 지역 -> 형태 -> 가격대 -> 난이도` 순서의 퀵 탐색 레일을 가진다.
- 퀵 필터 상태는 `pressco21_catalog_filters_v1` 로 저장해 URL 파라미터가 없을 때도 마지막 탐색 맥락을 복원한다.
- 오프라인 클래스는 카드 하단 `가까운 공방 보기` CTA로 지도 탐색에 바로 진입한다.
- 신뢰 배지는 WF-01 응답 필드만으로 프론트에서 계산한다. 정식 파트너맵 통합 전까지는 이 카드 CTA가 지역 탐색의 임시 진입점 역할을 맡는다.
- 운영 기준 문서는 `docs/파트너클래스/list-badge-filter-guide.md` 이다.

## 2026-03-10 S1-4 수강완료 재방문 동선 완료

- 수강생 마이페이지는 이제 `예정 관리`와 `수강 완료 후 다시 보기`를 분리해 예약 이후 흐름을 이어준다.
- 완료 카드의 핵심 구조는 `후기 작성 -> 수업 다시 보기 -> 키트 재구매 -> 같은 강사 다음 수업 추천` 이다.
- 구현은 `WF-19 my-bookings`에 직접 필드를 늘리지 않고 프론트에서 `WF-01 class-api`를 추가 호출해 추천 컨텍스트를 합성하는 방식으로 고정했다.
- 후기 요청 이메일 `WF-12`는 클래스 상세로 직접 들어가도록 바꾸고, `내 수강 내역` 복귀 문구로 마이페이지 후속 동선을 연결한다.
- 운영 기준 문서는 `docs/파트너클래스/repurchase-path-guide.md` 이다.

## 2026-03-10 S1-5 정산 자동화 구조 확정

- 정산 자동화는 별도 워크플로우 `WF-SETTLE Partner Settlement` 로 분리해 `WF-ADMIN`과 결합도를 낮춘다.
- 관리자 정산 화면은 `대기/완료 목록`과 `정산서 발송 이력`을 같은 패널 안에서 함께 본다.
- 정산 이력의 기본 단위는 settlement row가 아니라 `statement_id=SETB_YYYYMM_H1|H2_PARTNER_CODE` 다.
- 라이브 SMTP credential이 현재 깨져 있으므로, 정산 실행 API는 메일 발송 실패를 성공으로 숨기지 않고 그대로 오류로 반환해야 한다.
- 운영 기준 문서는 `docs/파트너클래스/settlement-automation-guide.md` 이다.

## 2026-03-11 S1-6 FAQ 레이어 확장 완료

- 상세 FAQ는 `faq_items` 데이터가 있으면 우선 사용하고, 없으면 공통 FAQ 15개로 보강하는 구조로 고정한다.
- 카테고리 체계는 `수강 / 키트·배송 / 파트너 / 정산 / 기타` 로 통일한다.
- FAQPage JSON-LD도 이제 커리큘럼 변환이 아니라 실제 FAQ 데이터 기준으로 생성한다.
- 수강생이 예약 전 답을 못 찾았을 때 바로 문의 채널로 빠질 수 있게 FAQ와 문의를 한 탭 안에서 이어준다.
- 운영 기준 문서는 `docs/파트너클래스/faq-expansion-guide.md` 이다.

## 2026-03-11 S1-7 파트너 온보딩 구조 확정

- 파트너 대시보드에는 신규 파트너용 온보딩 상태 머신을 둔다.
- 완료 판단은 프론트 단독 하드코딩이 아니라 `getPartnerAuth + getEducationStatus + getPartnerDashboard + getClassDetail` 조합으로 계산한다.
- 단계는 `프로필 / 교육 / 강의 / 일정 / 키트` 5단계다.
- 현재 단계 액션은 기존 화면을 재사용한다:
  - 프로필 편집 모달
  - 교육 페이지 2610
  - 새 강의 등록 안내 모달
  - 일정 관리 탭
  - 클래스 수정 모달
- 완료 후에는 카드 숨김 + 완료 모달 1회 노출로 상태를 닫는다.
- 운영 기준 문서는 `docs/파트너클래스/onboarding-checklist-guide.md` 이다.

## 2026-03-11 S1-8 파트너 액션 보드 구조 확정

- 대시보드 상단에는 온보딩 카드 다음 레이어로 액션 보드를 둔다.
- 별도 집계 API를 늘리지 않고 `getPartnerDashboard + getClassDetail + getPartnerBookings + getPartnerReviews` 조합으로 3개 카드를 계산한다.
- 카드 기준은 `오늘 일정 중 예약 있는 수업 / 7일 내 키트 준비 예약 / 미답변 후기 수` 로 고정한다.
- 카드 클릭 시 각 탭으로 이동할 때 첫 관련 클래스와 기간 필터를 자동 세팅한다.
- 운영 기준 문서는 `docs/파트너클래스/dashboard-action-board-guide.md` 이다.

## 2026-03-11 S1-9 통합 테스트 구조 확정

- 메이크샵 분리 자산은 `build-partnerclass-playwright-fixtures.js` 로 단일 HTML fixture 로 조립한 뒤 검증한다.
- `partnerclass-phase3-integration-runner.js` 가 목록, 상세, 마이페이지, 파트너, 어드민까지 한 세션에서 순회한다.
- 현재 로컬 fixture 기준으로 S1-1~S1-8 연결 흐름은 통과했고, 최종 남은 검증은 메이크샵 디자인편집기 실배포 후 라이브 재확인이다.
- 운영 기준 문서는 `docs/파트너클래스/phase3-1-integration-test.md` 이다.

## 2026-03-11 S2-1 파트너 신청 구조 확정

- 파트너 신청(2609)의 역할은 `신청 게이트`가 아니라 `세일즈 랜딩 + 신청 전환` 으로 고정한다.
- 공개 레이어는 `운영 지원`, `직접 운영 vs PRESSCO21 비교`, `성장 경로`, `사회적 증거`, `신청 프로세스`, `폼` 순서로 설계한다.
- 신청 플로우 자체는 기존 `로그인 체크 -> 중복 신청/기존 파트너 분기 -> WF-07 제출` 구조를 유지한다.
- 로컬 fixture 빌더는 이제 `apply.html` 도 조립하므로, 2609도 메이크샵 배포 전 Playwright 로컬 검증이 가능하다.
- 운영 기준 문서는 `docs/파트너클래스/partner-apply-sales-landing-guide.md` 이다.

## 2026-03-11 S2-2 협회 B2B 영업 도구 구조 확정

- 협회 제안서는 별도 워크플로우 없이 `getAffiliations` 읽기 응답만으로 구성 가능한 프론트 자산으로 시작한다.
- 새 페이지 `파트너클래스/협회제안서/*` 는 URL 파라미터로 협회명, 로고, 할인율, 인센티브 구간을 받는다.
- 어드민 협회 탭은 기존 협회 목록 위에 제안서 생성기를 두고, 로컬 fixture preview 또는 실배포 page id 기반 URL을 조합한다.
- 로컬 fixture 빌더는 이제 `affiliation-proposal.html` 도 조립하므로 협회 제안서도 배포 전 Playwright 검증이 가능하다.
- 운영 기준 문서는 `docs/파트너클래스/affiliation-b2b-proposal-tool-guide.md` 이다.

## 2026-03-11 S2-8 3계층 캐시 구조 확정

- 목록 읽기 성능은 `L1 localStorage + L2 n8n staticData + L3 NocoDB` 3계층으로 고정한다.
- 브라우저 캐시는 하나로 뭉개지 않고 `classCatalog_*` 와 `classSettings_*` 로 분리한다.
- TTL 기준:
  - 목록 `5분`
  - 카테고리/협회 설정 `1시간`
- 상세 페이지에서 데이터가 바뀌는 액션(후기/예약)이 끝나면 `pressco21_catalog_cache_version` 을 갱신해 목록 캐시를 강제로 새로 읽게 한다.
- `WF-01A` 는 `getCategories`, `WF-01C` 는 `getAffiliations` 만 staticData cache 대상이다.
- 라이브 검증 기준은 `응답 정상 + warm miss 1회 후 cache-hit branch only` 이다.
- 운영 기준 문서는 `docs/파트너클래스/cache-layering-guide.md` 이다.

## 2026-03-11 S2-9 묶음 키트 선택형 구조 확정

- 키트 전략 2단계는 `강의만 수강 / 키트 포함 수강` 선택형으로 고정한다.
- 클래스 데이터의 canonical 필드는 `kit_bundle_branduid` 이고, `kit_items` 는 재료 구성 설명 레이어로 유지한다.
- 예약 기록의 금액 기준과 커머스 결제 구성은 분리한다:
  - booking amount 는 항상 강의료 기준
  - `WITH_KIT` 일 때만 장바구니에 클래스 상품 + 묶음 키트 상품을 함께 담는다
- `WF-17` 은 클래스 상품 생성 후 묶음 키트 상품 생성까지 책임지고, `WF-05` 는 실제 주문에 키트 상품이 같이 결제됐을 때만 후속 키트 처리를 탄다.
- 운영 기준 문서는 `docs/파트너클래스/kit-bundle-selection-guide.md` 이다.

## 2026-03-11 S2-10 데모 데이터 구조 확정

- 파트너 섭외 데모는 live 메이크샵 노출보다 `live NocoDB + 로컬 fixture 시연` 조합으로 먼저 간다.
- 데모 배치는 `[TEST][DEMO]` prefix 와 `PC_DEMO_/CL_DEMO_/SCH_DEMO_/STL_DEMO_/RV_DEMO_` 식별자를 사용한다.
- live NocoDB에는 입력하되 클래스 상태는 `closed` 로 두어 공개 목록 노출을 막는다.
- enum 제약 때문에 저장값과 데모 표시값을 일부 분리한다:
  - 파트너 grade 저장 `SILVER/GOLD/PLATINUM`, 표시 `BLOOM/GARDEN/ATELIER`
  - 클래스 category/region 은 저장용 legacy 값과 데모 표시값을 분리
- 운영 기준 문서는 `docs/파트너클래스/demo-simulation-guide.md` 이다.

## 2026-03-11 S2-11 Phase 3-2 통합 검증 기준

- 성장 가속 구간의 통합 기준은 `세일즈 랜딩 -> 신청 -> 온보딩 -> 첫 수업 -> 정산`, `협회 제안서 -> ROI -> 혜택 허브`, `L1/L2/L3 cache`, `WF-01 router/split 회귀` 4축이다.
- 메인 검증 러너는 `scripts/partnerclass-s2-11-growth-integration-runner.js` 이고, 내부에서 `S2-10 demo`, `S2-8 cache` 결과를 다시 묶는다.
- L3 cache 는 latency 추정이 아니라 n8n execution API 기준으로 `miss execution -> Store Cache`, `hit execution -> NocoDB read bypass` 까지 확인하는 방식을 기준으로 삼는다.
- Phase 3-2는 로컬 fixture + live API 통합 검증까지 완료된 상태로 보고, 다음 확장 단계는 `S3-1 신규 테이블 4종` 이다.
- 운영 기준 문서는 `docs/파트너클래스/phase3-2-integration-test.md` 이다.

## 2026-03-11 S3-1 스케일업 스키마 4종 생성

- Phase 3-3 진입점으로 live NocoDB에 `tbl_Seminars`, `tbl_Affiliation_Products`, `tbl_Affiliation_Content`, `tbl_Vocabulary` 4개 테이블을 선반영했다.
- 스키마 생성은 수동 SQL 이 아니라 `scripts/partnerclass-s3-1-create-tables.js` 기준 meta API 로 고정했다.
- 스크립트는 `create or reuse table -> add missing columns -> sample rows upsert` 순서로 동작해 재실행 가능하다.
- 기준 샘플 협회는 `KPFA_001 / 한국꽃공예협회` 이다.
- 실제 live table id:
  - `tbl_Seminars`: `m9gh6baz3vow966`
  - `tbl_Affiliation_Products`: `mm75dgbohhth2ll`
  - `tbl_Affiliation_Content`: `mit4xyrzn4s81b9`
  - `tbl_Vocabulary`: `mhf2e1hqj5vqmi5`
- 이후 `협회/세미나`, `협회원 혜택`, `용어 표준화` 구현은 이 4개 테이블을 우선 데이터 소스로 본다.
- 운영 기준 문서는 `docs/파트너클래스/s3-1-schema-guide.md` 이다.

## 2026-03-11 S3-2 등급 인센티브 레이어 확정

- 파트너 성장 인센티브는 1차로 `노출 / 브랜딩 / 스토리 / 멘토링 기회` 레이어에 붙인다.
- 파트너 대시보드 수익 탭에는 현재 등급 요약과 상위 등급 비교를 보여주는 `등급 혜택` 패널을 둔다.
- 수강생 노출 우선순위는 `partner_grade > avg_rating > class_count > total_remaining` 기준으로 맞춘다.
- 상세 연관 추천과 콘텐츠 허브 스토리도 같은 grade priority 를 사용해 UI 레이어마다 기준이 갈라지지 않게 한다.
- `GARDEN` 은 추천 파트너, `ATELIER` 는 인터뷰 후보, `AMBASSADOR` 는 멘토 파트너라는 공개 서사 구조를 유지한다.
- 운영 기준 문서는 `docs/파트너클래스/grade-incentive-guide.md` 이다.

## 2026-03-11 S3-3 키트 구독 파일럿 구조 확정

- 구독 파일럿은 `메이크샵 정기결제`까지 가지 않고 `마이페이지 관리 + live subscription table + 월간 내부 주문 ref 생성` 까지를 완성선으로 본다.
- live NocoDB 신규 테이블은 `tbl_Subscriptions (mtyaeamavml7www)` 이다.
- 신규 워크플로우 `WF-SUB Subscription Kit Pilot (BpyDxiaCb1PwVInY)` 는 `list/create/cancel/runMonthlyBatch` 만 담당하고 기존 예약/정산 흐름과 분리한다.
- 월간 자동 생성 결과물은 현재 `SUBORD_YYYYMM_SUBS_*` 형식의 내부 운영 ref 다.
- 수강생 표면에서는 완료 수업 + kit data 를 조합해 추천 구독 후보를 만들고, 이미 ACTIVE 인 동일 클래스는 추천에서 제외한다.
- 운영 기준 문서는 `docs/파트너클래스/subscription-pilot-guide.md` 이다.

## 2026-03-11 S3-4 서버 확장성 판단 기준 확정

- Oracle Free Tier 현재 스펙은 idle 기준 여유가 있다. 지금 당장 서버 이전이 1순위는 아니다.
- live read burst 한계는 DB row 수보다 `n8n public read queue + webhook orchestration` 에서 먼저 드러난다.
- 실측 기준:
  - `10c/5s` 는 통과
  - `50c/5s` 도 통과하지만 avg `6s+`
  - `100c/10s` 는 successRate `42~68%` 수준으로 엔터프라이즈 기준 미달
- 같은 하드웨어의 SQLite 10만 row indexed query 는 충분히 빠르므로, 우선 과제는 인프라 교체보다 `cache 강화 + read path 분리 + hot query index/view 점검` 이다.
- 운영 기준 문서는 `docs/파트너클래스/scalability-verification-guide.md` 이다.

## 2026-03-11 S2-3 전국 탐색 IA 구조 확정

- 목록 2606은 이제 `전체 클래스 / 협회·세미나 / 혜택·이벤트` 3탭 구조로 본다.
- 오프라인 탐색은 목록 안의 `리스트 보기 / 지도 보기` 토글로 처리하고, 실서비스 지도 뷰는 기존 `/partnermap` 자산을 같은 흐름 안에 흡수한다.
- 상세 2607은 `GENERAL / AFFILIATION / EVENT` 3가지 content profile 로 상단 identity, trust chip, 예약 노트를 분기한다.
- `content_type`, `delivery_mode`, `class_format` 값이 실데이터에 아직 없더라도 기존 `type/tags/affiliation_code` 로 폴백 추론해 기존 클래스를 깨지 않게 한다.
- 운영 기준 문서는 `docs/파트너클래스/nationwide-discovery-ia-guide.md` 이다.

## 2026-03-11 S2-4 WF-01 공개 API 분리

- 공개 read API는 이제 `라우터 + 3개 하위 워크플로우` 구조다.
- 라우터 `WF-01 Class API` 는 기존 `/webhook/class-api` URL을 유지하고 action 기준으로 `WF-01A/B/C` 에 전달한다.
- `WF-01A` 는 `getClasses / getClassDetail / getCategories`, `WF-01B` 는 `getSchedules / getRemainingSeats`, `WF-01C` 는 `getAffiliations` 를 담당한다.
- 분리 후에도 기존 5개 회귀 시나리오(`classes/detail/categories/affiliations/invalid`) 응답 본문은 baseline 과 동일하게 유지됐다.
- 운영 기준 문서는 `docs/파트너클래스/WF-01-split-guide.md` 이다.

## 2026-03-11 S2-5 콘텐츠 허브 read 레이어 확장

- `WF-01C` 는 이제 `getAffiliations` 뿐 아니라 `getContentHub` 도 담당한다.
- `getContentHub` 는 신규 테이블 없이 `tbl_Classes + tbl_Partners` 를 합성해 허브형 읽기 응답을 만든다.
- 응답 구조는 `summary / featured_message / highlights / partner_stories / trends / guides` 로 고정했다.
- 허브는 별도 API endpoint 를 늘리지 않고 기존 `class-api` 라우터의 action 확장으로 유지했다.
- 파트너 grade 는 과거 데이터 호환을 위해 `SILVER/GOLD/PLATINUM -> BLOOM/GARDEN/ATELIER` alias 를 먼저 정규화한다.
- 전용 콘텐츠 테이블은 향후 `F300` 에서 붙이고, 현재 허브는 탐색/영업용 1차 레이어로 본다.
- 운영 기준 문서는 `docs/파트너클래스/content-hub-guide.md` 이다.

## 2026-03-11 S2-6 학생 리텐션 자동화 구조

- 리텐션 1차는 신규 CRM 테이블 없이 `my-bookings + class-api + completed bookings` 조합으로 먼저 구현했다.
- 프론트는 `파트너클래스/마이페이지/*` 에서 월간 리포트, streak badge, review thanks notice 를 로컬 상태와 기존 예약 응답에서 계산한다.
- 백엔드는 신규 `WF-RETENTION Student Lifecycle` 로 분리했고, 스케줄 트리거와 `/webhook/student-retention` 수동 dry run 을 함께 제공한다.
- NocoDB 날짜 eq 필터 제약 때문에 완료 예약은 `status=COMPLETED` 집합을 먼저 읽고 Code 노드에서 날짜 재계산하는 구조를 채택했다.
- 레거시 완료 예약에 `student_email` 누락이 남아 있어 자동화는 현재 `raw_count` 와 `skipped_missing_email` 을 함께 보여주는 운영 구조로 본다.
- 운영 기준 문서는 `docs/파트너클래스/community-retention-guide.md` 이다.

## 2026-03-11 S2-7 파트너 이탈 감지 구조

- 파트너 활동 추적의 기준 필드는 `tbl_Partners.last_active_at` 이다.
- `WF-02 partner-auth` 는 인증/대시보드 조회 시 NocoDB credential PATCH 노드로 `last_active_at` 를 갱신한다.
- `WF-CHURN Partner Risk Monitor` 는 `partners -> classes -> schedules -> reviews -> email logs` 직렬 수집 후 risk plan 을 계산한다.
- 이메일 로그는 기존 테이블 제약 때문에 `email_type=PARTNER_NOTIFY` 로 저장하고, 실제 churn stage 와 `alert_id` 는 `error_message` 에 태깅한다.
- send 모드는 이제 최종 응답을 텔레그램 에러가 덮지 않으며, 메일 실패 시 `PARTNER_CHURN_EMAIL_FAILED` 로 구조화해서 돌려준다.
- 운영 기준 문서는 `docs/파트너클래스/partner-churn-monitor-guide.md` 이다.
