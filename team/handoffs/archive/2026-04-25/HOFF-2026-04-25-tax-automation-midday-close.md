---
handoff_id: HOFF-2026-04-25-tax-automation-midday-close
created_at: 2026-04-25T09:15:00+09:00
enabled: true
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [park-seoyeon-cfo, choi-minseok-cto, cho-hyunwoo-legal]
scope_type: workspace-tools-docs-local-vault
project: workspace-tax-automation
worktree_slot: workspace-tax-automation-phase1
branch: work/workspace/tax-automation-phase1
status: paused
summary: 세무 자동화 시스템의 PRD·로드맵 작성부터 세무사 실제 요청자료 반영, 수동 업로드 CLI PoC, repo 밖 TaxVault 수집 폴더 생성과 초기 scan까지 완료했습니다. 오늘은 실제 세무자료 파일 수집 전 준비 단계에서 중간 마감합니다.
decision: 실제 세무자료 원본은 Git 저장소에 넣지 않고 `/Users/jangjiho/TaxVault/2025_종합소득세_세무사전달`에 수집합니다. 실행 기준은 세무사가 준 결산 요청자료 9개이며, 실행 보드 `TAX-2025-053`~`TAX-2025-061`와 `accountant_request_2025_mapping.csv`로 관리합니다. 비용 인정, 공제 가능 여부, 원금/이자 구분, 보험료/퇴직연금 처리, 광고비 기준은 자동 판단하지 않고 세무사 확인 질문으로 유지합니다.
changed_artifacts:
  - docs/tax-automation/README.md
  - docs/tax-automation/PRD-tax-automation-system-2026.md
  - docs/tax-automation/ROADMAP-tax-automation-system-2026.md
  - docs/tax-automation/team-meeting-tax-automation-2026-04-25.md
  - docs/tax-automation/phase1-execution-playbook-2026.md
  - docs/tax-automation/free-api-service-catalog-tax-automation-2026.md
  - docs/tax-automation/종합소득세-자료수집-가이드-비전공자용-2026.md
  - docs/tax-automation/templates/tax_collection_items_template.csv
  - docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv
  - docs/tax-automation/templates/tax_source_registry_template.csv
  - docs/tax-automation/templates/accountant_questions_2025_template.csv
  - docs/tax-automation/templates/accountant_request_2025_mapping.csv
  - _tools/tax-automation/tax_package.py
  - _tools/tax-automation/tests/test_tax_package.py
  - team/handoffs/latest.md
local_artifacts_not_in_git:
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/tax_collection_items.csv
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/accountant_request_2025_mapping.csv
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/accountant_questions_2025_template.csv
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/scan_summary.json
  - /Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/missing_items.csv
verification:
  - 세무사 요청 엑셀 `/Users/jangjiho/Downloads/프레스코21-결산요청자료 (2).xlsx`의 Sheet1에서 9개 요청자료를 확인했고 원본은 수정하지 않았습니다.
  - `python3 -m unittest discover -s _tools/tax-automation/tests -p 'test_*.py' -v` 결과 6 tests OK.
  - CSV 파싱 폭 확인: tax_collection_items_template 16 rows, tax_source_registry 18 rows, execution_board 61 rows, accountant_questions 20 rows, accountant_request_mapping 9 rows.
  - docs/tax-automation 내부 로컬 markdown 링크 누락 없음.
  - `git diff --check` 통과.
  - `bash _tools/pressco21-check.sh` 통과.
  - TaxVault 초기 scan 결과: item_count 61, evidence_file_count 0, missing_or_review_required_count 61, status_counts NOT_STARTED 61.
  - 최종 커밋 전 HEAD: 6b5c8c4 [codex] 세무사 요청자료 handoff 갱신.
open_risks:
  - 실제 세무자료 파일은 아직 수집하지 않았습니다. TaxVault는 폴더와 manifest만 준비된 상태입니다.
  - 대표/담당자 권한 범위와 개인정보 처리 동의는 아직 확정 전입니다.
  - 홈택스·은행·카드·네이버광고·위택스 등 로그인/본인인증이 필요한 포털은 직접 접속하지 않았습니다.
  - 수입신고필증/수입정산서에서 실제 수입신고번호를 아직 확보하지 못해 UNI-PASS dry-run은 미실행입니다.
  - 운영 n8n/NocoDB/서버 write는 사용자 명시 승인 전까지 보류해야 합니다.
  - Phase 2 운영 MVP의 요약 Excel, 세무사 전달 상태/전달일 기록, NocoDB/DB 반영은 미완료입니다.
next_step: 다음 세션은 `/Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/accountant_request_2025_mapping.csv`를 열고 세무사 요청자료 9개부터 실제 파일을 수집합니다. 자료를 넣은 뒤 `python3 _tools/tax-automation/tax_package.py scan --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달"`를 실행해 `missing_items.csv`, `collection_status.csv`, `manifest_files.csv`를 갱신합니다. 수입신고필증/수입정산서가 들어오면 UNI-PASS dry-run용 수입신고번호 후보를 추출합니다.
learn_to_save:
  - 세무사 실제 요청자료가 들어오면 PRD보다 실행 보드가 우선이며, 원문 요청자료 → item_id → 폴더/파일명/담당자 매핑을 별도 CSV로 남기는 방식이 가장 안전합니다.
  - TaxVault는 Git 밖에 둔다. repo에는 템플릿·도구·handoff만 남기고 실제 세무 원본은 커밋하지 않는다.
  - 세무자료 ZIP 생성은 scan 후 파일 변경과 symlink를 방어해야 하며, 현재 CLI는 해시 재검증과 symlink 차단 테스트를 통과했습니다.
---

## 담당
윤하늘님(PM)

## 중간 마감 요약

오늘 작업은 “세무 자동화 시스템의 방향 설정”에서 “실제 세무자료 수집 준비 완료”까지 진행했습니다.

### 1. 기획/문서

- 세무 자동화 시스템 PRD 작성
- Phase 0~8 로드맵 작성
- 비전공자용 종합소득세 자료 수집 가이드 작성
- 무료 API·무료 조회 서비스 카탈로그 작성
- 팀미팅 기록 작성

### 2. 실행 보드/세무사 요청자료 반영

- 세무사 요청 엑셀 확인
- 세무사 원문 9개 항목 매핑
- 실행 보드 61개 항목으로 확장
- 세무사 요청 매핑 CSV 추가
- 세무사 확인 질문 20개로 확장
- 원천 레지스트리 18개로 확장

### 3. 로컬 도구

- `_tools/tax-automation/tax_package.py` 추가
- 기능: `init`, `scan`, `hash`, `manifest`, `missing-report`, `zip`
- 보안: repo 내부 base-dir 차단, symlink 차단, ZIP 전 해시 재검증, path traversal 차단, CSV formula injection 완화
- 회귀 테스트 6개 추가 및 통과

### 4. 실제 수집 폴더

생성 위치:

`/Users/jangjiho/TaxVault/2025_종합소득세_세무사전달`

현재 상태:

- 폴더 생성 완료
- manifest 파일 생성 완료
- 실행 보드 복사 완료
- 세무사 요청자료 매핑표 복사 완료
- 초기 scan 완료
- 실제 증빙 파일은 아직 0개

## 다음 시작 지점

1. `/Users/jangjiho/TaxVault/2025_종합소득세_세무사전달/00_manifest/accountant_request_2025_mapping.csv` 확인
2. 세무사 요청자료 9개부터 파일 다운로드
3. 각 파일을 지정 폴더에 저장
4. scan 명령으로 누락표 갱신
5. 수입신고필증/수입정산서 확보 시 UNI-PASS dry-run 준비
