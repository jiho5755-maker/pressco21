---
handoff_id: HOFF-2026-04-29-tax-phase1-docs-complete
created_at: 2026-04-29T12:00:00+09:00
runtime: claude
owner_agent_id: choi-minseok-cto
contributors: [park-seoyeon-cfo, cho-hyunwoo-legal]
scope_type: worktree
project: n8n
worktree_slot: n8n-tax-automation-phase1
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
branch: work/n8n/tax-automation-phase1
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
source_cwd: /Users/jangjiho/workspace/pressco21-worktrees/n8n-tax-automation-phase1
commit_sha: 6e3b8a1
status: paused
promoted_to_global: false
summary: 2025년 귀속 종합소득세 세무사 전달 자료 수집 완료. 세무사 요청 9개 항목 중 기부금영수증(단체 발급 대기) 제외 전체 수집. 추가로 자동차보험, 라이나생명, 해외송금, 경조사비(25건 500만원), 기부물품내역서(500만원) 작성. 2026 폴더 번호 기반 재정리(92개 파일) + TaxVault 매핑(150개 파일). 세무사 전달 완료.
decision: 세무사 전달 자료는 01~11 번호 폴더 체계로 통일. 경조사비 건당 20만원 x 25건 = 500만원 확정. 기부금영수증은 단체 발급 시 별도 전달. 세무사 제공자료는 자료목록에 미포함.
changed_artifacts:
  - ~/Downloads/종합소득세자료 (2)/2026/ — 번호 기반 11개 폴더 재정리
  - ~/Downloads/종합소득세자료 (2)/2026/00_세무사전달_자료목록.xlsx
  - ~/Downloads/종합소득세자료 (2)/2026/11_추가확보자료/2025_경조사비_지출내역.xlsx
  - ~/Downloads/2025_기부물품내역서_500만원.xlsx — 단체 전달용
  - ~/TaxVault/2025_종합소득세_세무사전달/ — 150개 파일 매핑
verification:
  - 세무사 요청 9개 항목 전수 대조 완료
  - 과거 자료(2023~2025)와 비교하여 누락 보험 발견 및 추가 수집
  - 2026 폴더 92개, TaxVault 150개 파일 확인
  - 세무사 자료 전달 완료 확인
open_risks:
  - 기부금영수증 단체 발급 대기
  - UNI-PASS WF 2개 미배포 (NocoDB, 환경변수 미설정)
  - 2026년 세무자료 자동 수집 시스템 미착수
next_step: UNI-PASS WF 배포(NocoDB 테이블 생성 + 환경변수 주입 + dry-run) 또는 2026년 세무자료 자동 수집 설계.
learn_to_save:
  - 크레딧포유는 조회자 본인 명의 대출만 표시, 사업자 대출은 사업자 명의로 조회 필요
  - 정책자금(소진공/중진공) 대출은 크레딧포유에 미표시, 별도 사이트 조회
  - 장기렌트 차량은 렌트사 보험 포함, 별도 보험증권 불필요
---

## 담당
최민석님(CTO), 박서연님(CFO)

## 세무사 요청 9개 항목 최종 현황

| # | 항목 | 상태 |
|---|------|------|
| 1 | 통장, 카드사용내역 | 완료 (은행3+카드3) |
| 2 | 대출금이자납입내역 | 완료 (신한6+정책자금) |
| 3 | 수입신고필증, 수입정산서 | 완료 (11개월, 2월 해당없음) |
| 4 | 전기요금납부내역서 | 완료 (5계량기) |
| 5 | 퇴직연금납부내역 | 완료 |
| 6 | 보험료납부내역 | 완료 (7보험사+자동차) |
| 7 | 지방세세목별납부내역 | 완료 |
| 8 | 기부금영수증 | 단체 발급 대기 |
| 9 | 네이버광고충전내역 | 완료 |
