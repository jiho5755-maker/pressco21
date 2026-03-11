# 파트너클래스 문서 인덱스

작성일: 2026-03-10

이 폴더는 문서가 많아져서 현재 의사결정에 쓰는 문서와 과거 참고 문서를 분리했다.

## 먼저 읽을 문서

1. `shared-service-identity.md`
   - 파트너클래스의 공용 정체성, 우선 고객, IA 3레이어, 판단 기준
2. `enterprise-elevation-strategy-2026-03-10.md`
   - 대표 인터뷰 반영 전략, 인터뷰 프레임, 엔터프라이즈급 UX 방향
3. `PRD-파트너클래스-플랫폼-고도화.md`
   - 구현 범위와 기능 로드맵의 기본 베이스
4. `협회-제휴-제안서.md`
   - 협회 제휴 세일즈 관점의 현재 메시지 초안

## 판단 우선순위

- 서비스 목적, IA, UX 방향 판단은 `shared-service-identity.md`를 최우선으로 본다.
- 사업/인터뷰/개편 방향은 `enterprise-elevation-strategy-2026-03-10.md`를 따른다.
- 구현 세부와 운영 절차는 아래 운영 문서를 참고한다.
- 예전 문서와 충돌하면 `archive/` 문서는 참고만 하고 현재 판단 근거로 쓰지 않는다.

## 현재 유지 문서

### 전략 / 사업

- `shared-service-identity.md`
- `enterprise-elevation-strategy-2026-03-10.md`
- `PRD-파트너클래스-플랫폼-고도화.md`
- `협회-제휴-제안서.md`
- `brand-strategy-comprehensive.md`
- `phase3-non-technical-test-guide.md`
  - 비전공자 기준으로 Phase 3 방향과 테스트 포인트를 이해하는 설명서

### 운영 / 구현 가이드

- `makeshop-pages-guide.md`
- `partner-registration-guide.md`
- `partner-academy-guide.md`
- `nocodb-admin-guide.md`
- `member-group-management.md`
- `commission-policy.md`
- `class-product-registration.md`
- `class-detail-copy-guide.md`
- `email-templates.md`
- `phase2-deploy-guide.md`
- `phase2-deployment-check.md`
- `affiliation-db-guide.md`
- `WF-01-switch-map.md`
  - 2026-03-10 기준 monolith source map 문서. 분리 전 액션 맵과 입력/출력 기준선 정리
- `WF-01-split-guide.md`
  - S2-4 기준 router + WF-01A/B/C 분리 구조, 운영 ID, 배포/회귀 검증 결과 정리
- `kit-link-integration-guide.md`
  - S1-1 기준 키트 JSON 구조, 화면 반영 범위, WF-01/05/16/20 연동 방식, 라이브 DB 제약 정리
- `detail-ux-upgrade-guide.md`
  - S1-2 기준 상세 페이지 신뢰 요약 바, 포함 내역 섹션, CTA 계층, 모바일 하단 고정 바 정리
- `list-badge-filter-guide.md`
  - S1-3 기준 목록 신뢰 배지 6종, 퀵 필터 저장 규칙, 오프라인 지도 진입점, Playwright 검증 결과 정리
- `repurchase-path-guide.md`
  - S1-4 기준 마이페이지 수강완료 후 후기/재구매/같은 강사 추천 동선, WF-12 후기 메일 연결 방식 정리
- `settlement-automation-guide.md`
  - S1-5 기준 WF-SETTLE 구조, 관리자 정산 실행/이력 화면, 라이브 SMTP blocker 정리
- `faq-expansion-guide.md`
  - S1-6 기준 상세 FAQ 15개 구조, 카테고리 필터/검색 규칙, FAQPage JSON-LD 반영 기준 정리
- `onboarding-checklist-guide.md`
  - S1-7 기준 파트너 대시보드 온보딩 5단계, 완료 조건, CTA 매핑, 로컬 저장 규칙 정리
- `dashboard-action-board-guide.md`
  - S1-8 기준 파트너 대시보드 액션 보드 3카드, 기존 API 조합 방식, 클릭 이동 규칙 정리
- `partner-apply-sales-landing-guide.md`
  - S2-1 기준 파트너 신청(2609) 세일즈 랜딩 구조, 비교 테이블, 성장 경로, CTA 스크롤 검증 정리
- `affiliation-b2b-proposal-tool-guide.md`
  - S2-2 기준 협회 제안서 페이지, ROI 시뮬레이터, 어드민 URL 생성기 구조와 로컬 검증 결과 정리
- `nationwide-discovery-ia-guide.md`
  - S2-3 기준 목록 3탭, 지도 보기, 파트너맵 통합 셸, 상세 content_type 분기 구조와 로컬 검증 결과 정리
- `content-hub-guide.md`
  - S2-5 기준 콘텐츠 허브 4영역, `getContentHub` API, 기존 Classes+Partners 합성 방식, Playwright 검증 결과 정리
- `community-retention-guide.md`
  - S2-6 기준 월간 리포트, 연속 배지, 후기 감사 메시지, 수강 완료/휴면 자동화 WF와 검증 결과 정리

### QA / 검증

- `partnerclass-live-test-matrix-2026-03-09.md`
- `phase3-1-integration-test.md`
  - S1-1~S1-8 로컬 Playwright 통합 검증, 픽스처 빌드/러너 실행 방법, 2026-03-11 결과
- `phase2-e2e.md`
- `phase2-integration-test.md`
- `phase2-v2-integration-test.md`
- `phase2.5-e2e.md`
- `phase2.6-ops.md`
- `phase2.7-ux.md`

### 기술 참고

- `api-budget-caching-strategy.md`
- `backup-restore-guide.md`
- `nocodb-field-additions.md`
- `settlement-pipeline-verification.md`
- `PRD-phase2-n8n.md`

## 아카이브

`archive/2026-03-10/` 아래 문서는 다음 성격의 자료다.

- 재시작용 handoff
- 특정 날짜 기준 감사 보고서
- 현재 기준보다 오래된 개요 설명서

새 기획이나 카피, IA 판단에는 기본적으로 사용하지 않는다.

## 메모

- 현재 문서 중 일부 구현 문서는 예전 등급/수수료 표현이 남아 있다.
- 서비스 방향 판단은 반드시 `shared-service-identity.md`와 `enterprise-elevation-strategy-2026-03-10.md`를 우선한다.
