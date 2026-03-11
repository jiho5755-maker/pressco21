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
