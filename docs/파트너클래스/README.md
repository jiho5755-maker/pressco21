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
  - WF-01 공개 API의 action 분기, 입력 파라미터, 응답 구조, 호출 페이지 정리
- `kit-link-integration-guide.md`
  - S1-1 기준 키트 JSON 구조, 화면 반영 범위, WF-01/05/16/20 연동 방식, 라이브 DB 제약 정리
- `detail-ux-upgrade-guide.md`
  - S1-2 기준 상세 페이지 신뢰 요약 바, 포함 내역 섹션, CTA 계층, 모바일 하단 고정 바 정리
- `list-badge-filter-guide.md`
  - S1-3 기준 목록 신뢰 배지 6종, 퀵 필터 저장 규칙, 오프라인 지도 진입점, Playwright 검증 결과 정리

### QA / 검증

- `partnerclass-live-test-matrix-2026-03-09.md`
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
