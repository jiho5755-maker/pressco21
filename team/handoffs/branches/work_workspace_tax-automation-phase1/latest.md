---
handoff_id: HOFF-2026-04-25-tax-automation-prd-roadmap-guide
created_at: 2026-04-25T04:00:00+09:00
enabled: true
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [park-seoyeon-cfo, choi-minseok-cto]
scope_type: workspace-docs
project: workspace-tax-automation
worktree_slot: workspace-tax-automation-phase1
branch: work/workspace/tax-automation-phase1
status: active
summary: 세무 자동화 시스템의 근본 목표를 “종합소득세 자료 수집 OS → 무료 API/서비스 기반 자동화 → 세무사 전달 패키지”로 재정의하고, 팀미팅 기록·PRD·로드맵·비전공자용 자료 수집 가이드·무료 API/서비스 카탈로그·CSV 템플릿을 작성했습니다.
decision: UNI-PASS API 자동화는 전체 목표 중 수입·통관·관세 증빙 모듈로 배치합니다. 1차 제품 범위는 자동 신고나 세액 확정이 아니라 자료 수집, 원본 보관, 상태 관리, 누락/중복 후보 탐지, 세무사 전달 패키지 생성입니다. 홈택스·은행·카드처럼 인증/법적 행위가 포함되는 원천은 수동 다운로드와 업로드 검증을 먼저 사용합니다.
changed_artifacts:
  - docs/tax-automation/README.md
  - docs/tax-automation/team-meeting-tax-automation-2026-04-25.md
  - docs/tax-automation/PRD-tax-automation-system-2026.md
  - docs/tax-automation/ROADMAP-tax-automation-system-2026.md
  - docs/tax-automation/종합소득세-자료수집-가이드-비전공자용-2026.md
  - docs/tax-automation/free-api-service-catalog-tax-automation-2026.md
  - docs/tax-automation/templates/tax_collection_items_template.csv
  - docs/tax-automation/templates/tax_source_registry_template.csv
verification:
  - PM/CFO/CTO 관점 팀미팅 결과를 문서에 반영했습니다.
  - 국세청, 홈택스/국세상담센터, 금융위원회, 금융결제원, 여신금융협회, 국민건강보험 사회보험통합징수포털, 정부24, 공공데이터포털, 관세청 공식 출처를 확인해 문서 출처에 남겼습니다.
  - 작성 파일 라인 수 확인 완료: PRD 400줄, 로드맵 380줄, 비전공자 가이드 1081줄, API/서비스 카탈로그 235줄, 팀미팅 156줄, README 44줄, CSV 템플릿 2개.
  - 문서 내 지정 이모지 검사 통과.
  - pressco21 scope check 통과: branch work/workspace/tax-automation-phase1, allowed path docs/ and team/handoffs/.
  - CSV 템플릿 파싱 확인: tax_collection_items_template.csv 16 rows, tax_source_registry_template.csv 10 rows.
  - docs/tax-automation 내부 로컬 링크 누락 없음.
open_risks:
  - 세무사가 실제로 요구하는 2025년 귀속 종합소득세 요청자료 양식은 아직 확보하지 못했습니다.
  - 실제 홈택스 화면 메뉴명은 개편될 수 있어, 가이드에는 검색창 기반 절차를 함께 사용했습니다.
  - 실제 PRESSCO21 화물관리번호/수입신고번호 기반 UNI-PASS dry-run은 아직 미실행입니다.
  - NocoDB 테이블 생성, n8n 환경변수 주입, 운영 배포는 외부 서비스 write이므로 명시 승인 전까지 보류 상태입니다.
  - 세무 판단, 경비 인정, 공제 가능 여부, 신고 제출은 세무사 확인 영역으로 남아 있습니다.
next_step: 세무사 요청자료 양식을 확보한 뒤 docs/tax-automation/templates/tax_collection_items_template.csv를 실제 담당자/마감일/상태값으로 채우고, 2025년 귀속 자료 수동 수집을 시작합니다. 병행해서 UNI-PASS 실제 테스트용 화물관리번호/수입신고번호 1~2건을 확보해 n8n 브랜치의 dry-run을 준비합니다.
learn_to_save:
  - 세무 자동화의 핵심은 “API 연결”이 아니라 원천별 자료 지도, 원본 파일 보관, 기간/출처/금액 메타데이터, 세무사 확인 상태를 관리하는 것입니다.
  - 자동화 우선순위는 수동 업로드 MVP → 무료 API dry-run → 원천별 파서 → 대조/검증 큐 → 세무사 패키지 순서가 안전합니다.
  - 홈택스·은행·카드·4대보험·정부24는 인증과 법적 발급/납부 행위가 얽혀 있으므로 초기에는 자동 로그인보다 다운로드 가이드와 파일 검증이 더 안전합니다.
---

## 담당
윤하늘님(PM)

## 이번 세션 결과

세무 자동화의 거시 목표를 다시 잡았습니다. 이전 UNI-PASS 워크플로우 초안은 유지하되, 이제는 전체 세무 자료 수집 OS의 `통관·관세 모듈`로 위치를 조정했습니다.

새 문서 묶음은 `docs/tax-automation/`에 있습니다.

1. `README.md`
   - 문서 묶음의 인덱스와 다음 실행 우선순위
2. `team-meeting-tax-automation-2026-04-25.md`
   - 박서연님, 최민석님, 윤하늘님 관점의 팀미팅 기록
3. `PRD-tax-automation-system-2026.md`
   - 제품 정의, 범위, 사용자, 기능 요구사항, 데이터 모델, 성공 지표
4. `ROADMAP-tax-automation-system-2026.md`
   - Phase 0~8 실행 계획과 완료 기준
5. `종합소득세-자료수집-가이드-비전공자용-2026.md`
   - 홈택스, 은행, 카드, 오픈마켓, PG, 공제자료, 정부24, 4대보험, UNI-PASS 다운로드 절차
6. `free-api-service-catalog-tax-automation-2026.md`
   - 무료 API, 조건부 API, 무료 조회 서비스, 수동 다운로드 포털 분류
7. `templates/tax_collection_items_template.csv`
   - 바로 수집 체크리스트로 쓸 CSV
8. `templates/tax_source_registry_template.csv`
   - 원천/API/포털 레지스트리 CSV

## 중요한 결정

- 1차 목표: 2025년 귀속 종합소득세 자료 수집과 세무사 전달 패키지.
- 하지 않을 것: 자동 신고, 세액 확정, 납부 실행, 인증 우회.
- 먼저 만들 것: 수동 다운로드 가이드와 업로드/파일명/누락 검증 MVP.
- API는 무료·공식·read-only dry-run부터 시작.
- UNI-PASS API001/API049는 수입·관세 증빙 자동화의 첫 PoC.

## 다음 작업

1. 세무사에게 실제 요청자료 양식이 있는지 확인한다.
2. `tax_collection_items_template.csv`를 실제 담당자와 마감일로 채운다.
3. 가이드에 따라 2025년 1월~12월 자료를 수집한다.
4. 수집 중 막히는 메뉴명, 누락 자료, 반복 다운로드 항목을 기록한다.
5. UNI-PASS 실제 테스트 번호를 확보한 뒤 n8n 브랜치 dry-run을 진행한다.
