---
handoff_id: HOFF-2026-04-25-tax-automation-cli-poc
created_at: 2026-04-25T08:40:00+09:00
enabled: true
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [park-seoyeon-cfo, choi-minseok-cto, cho-hyunwoo-legal]
scope_type: workspace-tools-docs
project: workspace-tax-automation
worktree_slot: workspace-tax-automation-phase1
branch: work/workspace/tax-automation-phase1
status: active
summary: 세무 자동화 PRD·로드맵 기준으로 Phase 1 실행 준비와 Phase 2 수동 업로드 CLI PoC를 구현했습니다. 2025년 실행 보드, Phase 1 실행 플레이북, 세무사 확인 질문 템플릿, repo 밖 세무자료 폴더 init/scan/manifest/zip 로컬 도구와 6개 회귀 테스트를 추가했습니다.
decision: 실제 세무자료 원본은 Git 저장소 밖 base-dir에 두고, 도구는 기본적으로 저장소 내부 base-dir을 차단합니다. 세무사 전달 ZIP은 scan manifest의 SHA-256 해시와 현재 파일을 재검증하고 symlink·base-dir 외부 파일을 차단합니다. Phase 2는 운영 MVP 완료가 아니라 CLI PoC 일부 완료로만 표시하며, 요약 Excel·전달 상태/전달일·DB/NocoDB 운영 반영은 다음 작업으로 남깁니다.
changed_artifacts:
  - .gitignore
  - _tools/tax-automation/tax_package.py
  - _tools/tax-automation/tests/test_tax_package.py
  - docs/tax-automation/README.md
  - docs/tax-automation/ROADMAP-tax-automation-system-2026.md
  - docs/tax-automation/phase1-execution-playbook-2026.md
  - docs/tax-automation/templates/tax_collection_items_template.csv
  - docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv
  - docs/tax-automation/templates/accountant_questions_2025_template.csv
verification:
  - 박서연님(CFO) 관점으로 Phase 1 실행 보드 항목·담당자·마감일·세무사 질문을 검토했습니다.
  - 조현우님(법무/보안) 관점으로 민감정보·인증정보·세무 판단 분리·운영 write 리스크 안전장치를 검토했습니다.
  - 최민석님(CTO) 관점 1차 검증에서 symlink ZIP 취약점과 과장 표현이 반려되었고, 수정 후 재검증 APPROVED를 받았습니다.
  - `python3 -m unittest discover -s _tools/tax-automation/tests -p 'test_*.py' -v` 결과 6 tests OK.
  - `python3 -m py_compile _tools/tax-automation/tax_package.py _tools/tax-automation/tests/test_tax_package.py` 통과.
  - CSV 파싱 폭 확인: 기존/신규 tax automation CSV 4개 모두 컬럼 수 일관.
  - docs/tax-automation 내부 로컬 markdown 링크 누락 없음.
  - `git diff --check` 통과.
  - `bash _tools/pressco21-check.sh` 통과.
  - 커밋: d5aa783 [codex] 세무 자료 수집 CLI PoC 작성
open_risks:
  - 세무사 실제 2025년 귀속 요청자료 양식은 아직 확보하지 못했습니다.
  - 대표/담당자 권한 범위와 개인정보 처리 동의는 아직 확정 전입니다.
  - 실제 2025년 홈택스·은행·카드·플랫폼 자료 수집은 아직 시작하지 않았습니다.
  - Phase 2 운영 MVP의 요약 Excel, 세무사 전달 상태/전달일 기록, NocoDB/DB 테이블 반영은 미완료입니다.
  - UNI-PASS 실제 화물관리번호/수입신고번호 기반 dry-run은 아직 미실행입니다.
  - 운영 n8n/NocoDB/서버 write는 사용자 명시 승인 전까지 보류해야 합니다.
next_step: 세무사 요청자료 양식을 확보하면 `docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv`에 항목을 반영하고, `python3 _tools/tax-automation/tax_package.py init --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달" --items-csv docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv --tax-year 2025 --company PRESSCO21`로 repo 밖 수집 폴더를 만든 뒤 실제 자료 수동 수집을 시작합니다. 병행해서 Phase 2 다음 작업인 요약 Excel 생성기와 전달 상태/전달일 manifest 확장을 진행합니다.
learn_to_save:
  - 세무 자동화의 안전한 1차 구현은 운영 API write보다 repo 밖 원본 폴더, 해시 manifest, 누락표, 세무사 질문표가 먼저입니다.
  - scan과 ZIP 생성 사이 파일 교체·symlink 공격을 막으려면 ZIP 생성 직전에 symlink 차단, base-dir 내부 resolve 검증, manifest 해시 재검증이 필요합니다.
  - Phase 완료 표시는 실제 업무 완료와 PoC 완료를 분리해야 합니다. 이번 산출물은 Phase 1 실행 준비와 Phase 2 CLI PoC 일부 완료입니다.
---

## 담당
윤하늘님(PM)

## 이번 세션 결과

세무 자동화 시스템을 실제 실행 가능한 단계로 옮기기 위해 팀 검토와 Ralph 검증 루프를 진행했습니다.

1. 박서연님이 2025년 종합소득세 자료 수집 실행 보드 항목, 담당자, 내부 마감일, 세무사 질문을 정리했습니다.
2. 최민석님이 수동 업로드 MVP의 최소 CLI 구조를 제안했고, 최종 구현 후 재검증에서 승인했습니다.
3. 조현우님이 민감정보, 인증정보, 세무 판단 분리, 운영 write 리스크를 검토했습니다.
4. `_tools/tax-automation/tax_package.py`를 추가해 repo 밖 세무자료 폴더 생성, scan, hash/manifest, missing-report, 세무사 전달 ZIP dry-run/생성을 지원합니다.
5. ZIP 생성 전 symlink 차단, base-dir 내부 검증, SHA-256 재검증을 넣었습니다.
6. 6개 회귀 테스트를 추가해 기본 흐름, repo 내부 base-dir 차단, path traversal, formula injection, scan 후 파일 변경, symlink 교체를 검증했습니다.

## 새로 추가된 핵심 파일

- `_tools/tax-automation/tax_package.py`
- `_tools/tax-automation/tests/test_tax_package.py`
- `docs/tax-automation/phase1-execution-playbook-2026.md`
- `docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv`
- `docs/tax-automation/templates/accountant_questions_2025_template.csv`

## 다음 작업

1. 세무사 실제 요청자료 양식을 확보한다.
2. 실행 보드 CSV에 세무사 양식과 권한 범위를 반영한다.
3. repo 밖 `TaxVault` 폴더를 생성하고 실제 2025년 자료 수동 수집을 시작한다.
4. 수집 후 `scan`을 실행해 `00_manifest`의 누락표와 파일 목록을 확인한다.
5. Phase 2 다음 기능으로 요약 Excel 생성기와 전달 상태/전달일 기록을 추가한다.
