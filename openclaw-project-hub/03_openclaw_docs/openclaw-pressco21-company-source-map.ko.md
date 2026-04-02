# PRESSCO21 OpenClaw 회사 자료 소스 맵

## 목적

이 문서는 PRESSCO21 로컬 폴더 중 OpenClaw가 실제로 활용할 수 있는 핵심 입력원을 정리한 지도다.
에이전트를 늘릴 때는 이 문서에 적힌 자료가 있는 역할만 먼저 활성화한다.

## 핵심 원칙

- 자료가 있는 역할만 활성화한다.
- 회사 기준 문서는 `pressco21/`을 우선 진실 소스로 둔다.
- OpenClaw는 실행보다 준비, 정리, 분류, 초안에 먼저 쓴다.

## 1. 회사 코어 지식

경로:

- `pressco21/company-profile.md`
- `pressco21/company-knowledge/*.md`

주요 내용:

- 브랜드 기준
- 고객 세그먼트
- 채널 비중
- 조직 구조
- 제품 카테고리
- 재무 현황

주로 쓰는 에이전트:

- `company-core`
- `executive-assistant`
- `detail-page-planner`
- `video-content-planner`
- `cs-triage-specialist`

## 2. 메이크샵 / 오픈마켓 운영 자료

경로:

- `pressco21/docs/openmarket-detail-planning-plan.md`
- `pressco21/docs/makeshop-dev-guide.md`
- `pressco21/makeshop-skin/*`
- `pressco21/tasks/151-makeshop-substitution-options.md`

주요 내용:

- 자사몰 상세 원본 기준
- 오픈마켓 등록 흐름
- 채널별 제목/이미지/제약
- 메이크샵 구현 제한

주로 쓰는 에이전트:

- `detail-page-planner`
- `marketplace-ops-specialist`

## 3. 콘텐츠 / 마케팅 / 채널 전략

경로:

- `pressco21/company-knowledge/content-strategy.md`
- `pressco21/company-knowledge/channel-analysis.md`
- `pressco21/docs/PRESSCO21-이커머스-사업전략.md`

주요 내용:

- 채널 포트폴리오 전략
- 콘텐츠 방향
- 채널별 역할
- 자사몰/네이버/쿠팡/유튜브 전략

주로 쓰는 에이전트:

- `video-content-planner`
- `operations-analyst`
- `pricing-margin-analyst`

## 4. CRM / 직접거래 / 고객 분석

경로:

- `pressco21/docs/offline-crm-PRD.md`
- `pressco21/docs/offline-crm-bank-automation-ops-guide-2026-03-15.md`
- `pressco21/company-knowledge/customer-profile.md`

주요 내용:

- 고객 15,830건 구조
- 거래내역 97,086건 구조
- B2B 고객/강사/직접거래 흐름
- 입금 매칭과 검토 규칙

주로 쓰는 에이전트:

- `crm-account-manager`
- `bank-ops-assistant`
- `cs-triage-specialist`

## 5. 원가 / 가격 / SKU 운영

경로:

- `pressco21/docs/원가마진분석-PRD.md`
- `pressco21/docs/마진전략-종합설계서.md`
- `pressco21/docs/원가관리체계-완성본.md`

주요 내용:

- SKU 원가 구조
- 사방넷 SKU ↔ 메이크샵 branduid 연결
- 채널별 마진 판단
- 가격 시뮬레이션

주로 쓰는 에이전트:

- `pricing-margin-analyst`
- `marketplace-ops-specialist`

## 6. n8n / 운영 자동화

경로:

- `pressco21/docs/n8n-automation-efficiency-review-2026-03-09.md`
- `pressco21/n8n-workflows/*.json`

주요 내용:

- 어떤 작업을 n8n에 둘지
- 어떤 작업을 코드로 이관할지
- 배치/알림/재시도/시크릿 관리 기준

주로 쓰는 에이전트:

- `operations-analyst`
- `company-admin`
- `bank-ops-assistant`

## 7. 다음 확장 판단 기준

다음 중 2개 이상 만족하면 새 에이전트를 켠다.

- 로컬 기준 문서가 2개 이상 있다
- 실제 담당자와 업무 수요가 명확하다
- 반복 입력 포맷을 만들 수 있다
- 승인 경계를 문서로 분리할 수 있다

## 8. 지금 활성화 추천

즉시 활성화:

- `executive-assistant`
- `detail-page-planner`
- `video-content-planner`
- `cs-triage-specialist`
- `operations-analyst`
- `knowledge-curator`
- `crm-account-manager`
- `pricing-margin-analyst`
- `marketplace-ops-specialist`
- `bank-ops-assistant`

보류:

- `sabangnet-ops-specialist`
- `procurement-bid-assistant`
- `hr-policy-assistant`

보류 이유:

- 실제 화면 검증 또는 기준 문서 정리가 더 필요하다.
