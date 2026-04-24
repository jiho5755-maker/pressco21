---
handoff_id: HOFF-2026-04-25-tax-automation-phase1-n8n-wf-draft
enabled: true
created_at: 2026-04-25T03:45:00+09:00
runtime: codex-omx
owner_agent_id: choi-minseok-cto
contributors: [park-seoyeon-cfo, han-jihoon-cso, yoon-haneul-pm]
scope_type: cross-worktree
project: n8n
source_worktree_slot: workspace-tax-automation-phase1
implementation_worktree_slot: n8n-tax-automation-phase1
source_branch: work/workspace/tax-automation-phase1
implementation_branch: work/n8n/tax-automation-phase1
implementation_commit_sha: ebeed26
status: active
summary: 종합소득세 자료 자동 수집 체계 Phase 1 후속으로 UNI-PASS API049 수입 제세 납부조회 WF와 API001 화물통관 진행조회 WF 초안을 작성했습니다. 운영 배포·NocoDB 테이블 생성은 아직 하지 않았습니다.
decision: 비밀 인증키는 WF JSON에 넣지 않고 n8n 환경변수로 주입합니다. API049는 기간 조회가 아니라 수입신고번호 단건 조회만 지원하므로, 월 단위 자동화는 API001에서 확보한 dclrNo 또는 별도 수입신고번호 목록을 입력 소스로 삼는 구조로 잡습니다.
changed_artifacts:
  - n8n-automation/workflows/tax-automation/WF-TAX-001_UNIPASS_수입제세_납부조회.json
  - n8n-automation/workflows/tax-automation/WF-TAX-002_UNIPASS_화물통관_진행조회.json
  - n8n-automation/workflows/tax-automation/README.md
verification:
  - UNI-PASS 연계가이드 v3.9 확인: API049 필수 입력은 impDclrNo이며 수리일자/납부일자 기간 검색 파라미터는 없음.
  - API049 더미 수입신고번호 읽기 프로브: HTTP 200, XML root taxMgQryRtnVo, tCnt=-1 응답 확인.
  - API001 가이드 샘플 화물관리번호 읽기 프로브: HTTP 200, XML root cargCsclPrgsInfoQryRtnVo, tCnt=0 응답 확인.
  - WF JSON 2개 python json.tool 파싱 성공.
  - Code 노드 8개 Node 구문 검사 성공.
  - UNI-PASS 인증키 literal 유입 검사 통과.
  - pressco21 scope check 통과: work/n8n/tax-automation-phase1, allowed path n8n-automation/.
  - n8n 구현 커밋 완료: ebeed26 [codex] 세무 자동화 UNI-PASS WF 초안.
open_risks:
  - 실제 PRESSCO21 수입신고번호/화물관리번호로 운영 데이터 조회 검증은 아직 미실행.
  - 운영 NocoDB customs_tax_payments, customs_clearance_status 테이블은 아직 미생성.
  - 운영 n8n 서버 환경변수 UNIPASS_API049_CRKYCN, UNIPASS_API001_CRKYCN, NOCODB_*_TABLE_ID는 아직 미주입.
  - 운영 n8n 배포/활성화는 외부 서비스 write라 명시 승인 전까지 보류.
next_step: 운영 NocoDB 테이블 2개 생성과 n8n 환경변수 주입을 승인받은 뒤, 실제 신고번호/화물번호 1~2건으로 dry-run webhook을 실행하고 NocoDB upsert를 검증합니다.
learn_to_save:
  - UNI-PASS API049는 “납부내역 월간 수집 API”가 아니라 impDclrNo 기준 납부여부/납부일자 확인 API입니다. 월간 자동화에는 신고번호 소스 테이블이 반드시 필요합니다.
  - 세무/관세 API 키는 WF JSON에 직접 넣지 말고 n8n 환경변수로만 주입해야 합니다.
  - 통관 진행 API001 상세 이력의 dclrNo가 API049 입력 후보가 되므로, Phase 1은 API001 → 신고번호 적재 → API049 확인 순서가 안전합니다.
---

## 담당
최민석님(CTO)

## 요약
UNI-PASS 세무 자동화 Phase 1의 첫 n8n 워크플로우 초안을 만들었습니다. 기존 handoff의 다음 단계 중 “API049 curl 테스트”와 “n8n WF JSON 작성”을 먼저 처리했고, 외부 서비스 쓰기인 NocoDB 테이블 생성과 운영 배포는 보류했습니다.

## 작성한 워크플로우

1. `WF-TAX-001 UNI-PASS 수입제세 납부조회`
   - 수동 webhook: `tax-unipass-payments-sync`
   - 월 1회 스케줄: 매월 1일 09:00 KST 기준
   - 입력: 수입신고번호 목록
   - 처리: API049 XML 조회 → 납부여부/납부일자 파싱 → NocoDB upsert → 텔레그램 요약

2. `WF-TAX-002 UNI-PASS 화물통관 진행조회`
   - 수동 webhook: `tax-unipass-clearance-sync`
   - 일 1회 스케줄: 매일 08:30 KST 기준
   - 입력: 화물관리번호 또는 BL 정보
   - 처리: API001 XML 조회 → 진행상태/상세 이력/dclrNo 파싱 → NocoDB upsert → 텔레그램 요약

## 중요한 발견

기존 handoff에는 API049를 “수리일자 기준 1개월 단위 반복 호출”로 적었지만, 가이드 v3.9 기준 API049는 기간 조회를 지원하지 않습니다. 수입신고번호 `impDclrNo`를 알아야만 납부여부/납부일자를 확인할 수 있습니다. 그래서 월간 자동화는 API001 통관 진행조회에서 `dclrNo`를 모으거나, 별도 수입신고번호 소스 테이블을 먼저 만드는 방식으로 이어가야 합니다.

## 운영 전 필요 작업

- NocoDB 테이블 2개 생성
  - `customs_tax_payments`
  - `customs_clearance_status`
- n8n 서버 환경변수 주입
  - `UNIPASS_API049_CRKYCN`
  - `UNIPASS_API001_CRKYCN`
  - `NOCODB_CUSTOMS_TAX_PAYMENTS_TABLE_ID`
  - `NOCODB_CUSTOMS_CLEARANCE_STATUS_TABLE_ID`
- 실제 PRESSCO21 수입신고번호/화물관리번호 1~2건 확보
- webhook dry-run 후 NocoDB 저장 테스트

## 현재 상태

n8n 구현 브랜치 `work/n8n/tax-automation-phase1`에 커밋 `ebeed26`으로 저장했습니다. 운영 배포는 하지 않았습니다.
