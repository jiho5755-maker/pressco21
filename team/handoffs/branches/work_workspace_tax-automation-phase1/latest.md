---
handoff_id: HOFF-2026-04-25-tax-accountant-request-mapping
created_at: 2026-04-25T09:00:00+09:00
enabled: true
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [park-seoyeon-cfo, choi-minseok-cto]
scope_type: workspace-tools-docs
project: workspace-tax-automation
worktree_slot: workspace-tax-automation-phase1
branch: work/workspace/tax-automation-phase1
status: active
summary: 세무사가 제공한 결산 요청자료 엑셀을 확인해 9개 요청 항목을 실행 보드와 원천 레지스트리, 세무사 질문 템플릿에 반영했습니다.
decision: 세무사 원문 9개 중 “통장, 카드사용내역”은 기존 은행·카드 항목으로 커버하고, 나머지 대출금이자납입내역·수입신고필증/수입정산서·전기요금납부내역서·퇴직연금납부내역·보험료/보험증권·지방세세목별납부내역·기부금영수증·네이버광고충전내역은 실행 보드에 `TAX-2025-053`~`TAX-2025-061`로 추가했습니다. 비용/공제/처리 방식은 자동 판단하지 않고 세무사 확인 질문으로 유지합니다.
changed_artifacts:
  - _tools/tax-automation/tests/test_tax_package.py
  - docs/tax-automation/README.md
  - docs/tax-automation/ROADMAP-tax-automation-system-2026.md
  - docs/tax-automation/phase1-execution-playbook-2026.md
  - docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv
  - docs/tax-automation/templates/accountant_request_2025_mapping.csv
  - docs/tax-automation/templates/accountant_questions_2025_template.csv
  - docs/tax-automation/templates/tax_source_registry_template.csv
verification:
  - 세무사 요청 엑셀 원본 `/Users/jangjiho/Downloads/프레스코21-결산요청자료 (2).xlsx`의 Sheet1에서 9개 항목을 확인했습니다. 원본 파일은 수정하지 않았습니다.
  - `python3 -m unittest discover -s _tools/tax-automation/tests -p 'test_*.py' -v` 결과 6 tests OK.
  - CSV 파싱 폭 확인: tax_collection_items_template 16 rows, tax_source_registry 18 rows, execution_board 61 rows, accountant_questions 20 rows, accountant_request_mapping 9 rows.
  - docs/tax-automation 내부 로컬 markdown 링크 누락 없음.
  - `git diff --check` 통과.
  - `bash _tools/pressco21-check.sh` 통과.
  - 커밋: 6e0a5a5 [codex] 세무사 요청자료 실행 보드 반영
open_risks:
  - 실제 자료 파일은 아직 수집하지 않았습니다.
  - 대표/담당자 권한 범위와 개인정보 처리 동의는 아직 확정 전입니다.
  - 대출금 이자/원금 구분, 퇴직연금 처리, 보험료 비용 처리, 기부금 공제/비용 처리, 네이버 광고 충전액과 실제 광고비 대조 기준은 세무사 확인 영역입니다.
  - UNI-PASS 실제 수입신고번호/화물관리번호 dry-run은 아직 미실행입니다.
  - 운영 n8n/NocoDB/서버 write는 사용자 명시 승인 전까지 보류해야 합니다.
next_step: repo 밖 세무자료 폴더를 생성하고 세무사 요청자료 9개부터 실제 파일 수집을 시작합니다. 실행 명령은 `python3 _tools/tax-automation/tax_package.py init --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달" --items-csv docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv --tax-year 2025 --company PRESSCO21`입니다. 수집 후 `scan`을 실행해 `00_manifest/missing_items.csv`와 `accountant_request_2025_mapping.csv`를 대조합니다.
learn_to_save:
  - 세무사가 실제로 준 요청자료는 큰 PRD보다 우선하는 Phase 1 실행 기준이다. 다만 요청자료 원문은 “자료 수집 단위”이며 세무 판단은 별도 질문으로 분리한다.
  - accountant_request_mapping.csv처럼 세무사 원문 → 실행 보드 item_id → 파일명/폴더/담당자 매핑을 두면 누락 없이 수집을 시작할 수 있다.
---

## 담당
윤하늘님(PM)

## 이번 세션 결과

세무사 요청자료 엑셀을 읽고 실행 보드에 반영했습니다.

세무사 원문 9개:

1. 통장, 카드사용내역
2. 대출금이자납입내역
3. 수입신고필증, 수입정산서
4. 전기요금납부내역서
5. 퇴직연금납부내역
6. 보험료납부내역, 화재·차량 보험증권
7. 지방세세목별납부내역
8. 기부금영수증
9. 네이버광고충전내역

반영 방식:

- 기존 은행·카드 항목으로 커버 가능한 1번은 기존 `TAX-2025-020`, `TAX-2025-022`, `TAX-2025-023`에 매핑했습니다.
- 2~9번은 실행 보드에 `TAX-2025-053`~`TAX-2025-061`로 추가했습니다.
- `accountant_request_2025_mapping.csv`를 새로 만들어 세무사 원문과 실행 보드 item_id를 연결했습니다.
- `tax_source_registry_template.csv`에 은행/카드/위택스/네이버광고/전기요금/보험/퇴직연금/기부금 수동 원천을 추가했습니다.
- `accountant_questions_2025_template.csv`에 대출이자, 퇴직연금, 보험료, 공과금, 광고비 질문을 추가했습니다.

## 다음 작업

1. repo 밖 `TaxVault` 폴더를 생성한다.
2. 세무사 요청자료 9개부터 실제 파일을 수집한다.
3. 수집 후 CLI `scan`을 실행해 누락표와 manifest를 만든다.
4. 수입신고필증/수입정산서에서 수입신고번호를 확보하면 UNI-PASS dry-run으로 연결한다.
