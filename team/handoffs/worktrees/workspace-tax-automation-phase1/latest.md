---
handoff_id: HOFF-2026-04-25-tax-automation-phase1
created_at: 2026-04-25T03:30:00+09:00
runtime: claude
owner_agent_id: choi-minseok-cto
contributors: [park-seoyeon-cfo, han-jihoon-cso]
scope_type: worktree
project: workspace
worktree_slot: workspace-tax-automation-phase1
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/workspace-tax-automation-phase1
branch: work/workspace/tax-automation-phase1
commit_sha: 60786c1
status: active
summary: 종합소득세 자료 자동 수집 체계 구축 Phase 1 — UNI-PASS API 연동 n8n WF 개발 시작점
decision: UNI-PASS 16종 API 승인 완료, Phase 1은 API049(납부세액)+API001(통관진행) WF 우선 개발
---

## 프로젝트 배경

PRESSCO21은 매년 종소세 때 10개 사이트를 수동 순회하며 자료를 수집(~1.5시간). 이를 자동화하여 세무사 의존도를 낮추고, 장기적으로 내부 세무 관리 서비스를 구축.

## Phase 0 완료 사항

- 홈택스 사업용 신용카드 2장 등록 완료 (신한BC + 삼성)
- 홈택스 사업용 계좌 신고: 평일에 지호님 직접 처리 예정
- UNI-PASS Open API 16종 승인 완료, 인증키 전부 ~/.claude/pressco21-infra.md에 기록

## Phase 1 작업 범위

### 1. API049 납부세액 조회 WF (최우선)
- 관세 + 수입부가세 납부내역 자동 수집
- 수리일자 기준, 1개월 단위 반복 호출
- Base URL: https://unipass.customs.go.kr:38010/ext/rest/
- 응답: XML only → n8n XML 파싱 필요

### 2. API001 통관진행 조회 WF
- 수입 화물 상태 실시간 추적, 화물관리번호 기반

### 3. NocoDB 테이블 (Postgres 필수)
- customs_tax_payments, customs_clearance_status

### 4. 텔레그램 알림
- 수집 완료/누락 시 지호님(7713811206)에 알림

## API 참조

| API ID | 서비스명 | crkyCn | 용도 |
|--------|--------|--------|------|
| API049 | 수입 제세 납부여부/납부일자 | v230t286p074q235o060p040b0 | 관세+수입부가세 |
| API001 | 화물통관진행정보조회 | b260w286d064y295w080c060v0 | 화물 진행상태 |
| API012 | 관세환율정보조회 | y210a236y044g235n050g030x0 | 환율 기록 |

전체 16종: ~/.claude/pressco21-infra.md 참조
API 가이드: /Users/jangjiho/Downloads/MYC_OpenAPI 연계가이드_v3.9/

## n8n 규칙

- Switch typeVersion: 3.2, Code $input, WF JSON → n8n-automation/workflows/tax-automation/
- 배포: bash _tools/deploy.sh <WF_ID> <JSON>

## 다음 단계

1. API049 curl 테스트 (XML 응답 확인)
2. n8n WF JSON 작성 (HTTP Request → XML 파싱 → NocoDB)
3. NocoDB customs_tax_payments 테이블 생성
4. 스케줄 트리거 (매월 1일) + 텔레그램 알림
