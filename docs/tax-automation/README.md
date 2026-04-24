# PRESSCO21 세무 자동화 시스템 문서 묶음

> 작성일: 2026-04-25  
> 담당: 윤하늘님(PM), 박서연님(CFO), 최민석님(CTO)  
> 상태: Draft v1  
> 기준: 세무사 최종 판단을 전제로 한 자료 수집·정리 자동화 문서

## 문서 목적

이 폴더는 “UNI-PASS API 연결”을 단일 목표로 보지 않고, PRESSCO21의 반복 세무 업무를 줄이기 위한 장기 시스템 기준선을 모은다.

궁극 목표는 다음 세 가지다.

1. 종합소득세 자료를 비전공자도 빠짐없이 모을 수 있게 한다.
2. 홈택스, 은행, 카드, 오픈마켓, PG, 4대보험, UNI-PASS, 정부24 자료를 한 번에 추적하는 세무 자료 수집 OS를 만든다.
3. 무료 API와 무료 조회 서비스를 우선 활용해 자동화 범위를 단계적으로 넓힌다.

## 문서 목록

| 문서 | 역할 |
|---|---|
| [팀미팅 기록](./team-meeting-tax-automation-2026-04-25.md) | CFO, CTO, PM 관점의 의사결정 기록 |
| [PRD](./PRD-tax-automation-system-2026.md) | 세무 자동화 시스템의 제품 요구사항 |
| [로드맵](./ROADMAP-tax-automation-system-2026.md) | Phase별 실행 계획과 완료 기준 |
| [비전공자용 종합소득세 자료 수집 가이드](./종합소득세-자료수집-가이드-비전공자용-2026.md) | 실제 자료 다운로드·정리 절차 |
| [Phase 1 실행 플레이북](./phase1-execution-playbook-2026.md) | 담당자·마감일·폴더 생성·스캔·전달 ZIP 실행 절차 |
| [무료 API·무료 조회 서비스 카탈로그](./free-api-service-catalog-tax-automation-2026.md) | 자동화 후보 소스와 우선순위 |
| [자료 수집 체크리스트 CSV](./templates/tax_collection_items_template.csv) | 바로 사용할 수 있는 2025년 귀속 수집 항목 템플릿 |
| [2025 실행 보드 CSV](./templates/tax_collection_items_2025_execution_board.csv) | 담당자와 내부 마감일을 채운 2025년 실행 보드 |
| [자료 원천 레지스트리 CSV](./templates/tax_source_registry_template.csv) | API/포털/수동 원천 관리 템플릿 |
| [세무사 확인 질문 CSV](./templates/accountant_questions_2025_template.csv) | 세무 판단이 필요한 질문 목록 템플릿 |

## 핵심 결정

- 1차 목표는 자동 신고가 아니라 `자료 수집`, `분류`, `누락 탐지`, `세무사 전달 패키지`다.
- 세액 계산 확정, 경비 인정 판단, 신고 제출, 납부 실행은 세무사 또는 대표의 명시 승인 영역으로 남긴다.
- API가 있는 곳은 n8n으로 자동 수집하고, API가 없거나 인증·법적 행위가 포함되는 곳은 “다운로드 가이드 + 업로드 검증”으로 시작한다.
- UNI-PASS는 수입·관세 자료 자동화 모듈이다. 전체 세무 자동화의 한 부분으로 배치한다.
- 민감 세무 파일은 공개 스토리지가 아니라 관리자 전용 Company Vault/Nextcloud 경로에 원본 그대로 보관한다.

## 다음 실행 우선순위

1. 세무사에게 “2025년 귀속 종합소득세 요청자료 양식”이 있는지 확인한다.
2. [`Phase 1 실행 플레이북`](./phase1-execution-playbook-2026.md)에 따라 repo 밖 세무자료 폴더를 만든다.
3. [`2025 실행 보드 CSV`](./templates/tax_collection_items_2025_execution_board.csv)를 기준으로 2025년 1월~12월 자료를 먼저 수동 수집한다.
4. 수집 중 반복·누락·불명확 항목을 `tax_source_registry` 후보로 기록한다.
5. `_tools/tax-automation/tax_package.py scan`으로 manifest, 누락표, 중복 후보를 만든다.
6. 이미 초안이 있는 UNI-PASS API001/API049 워크플로우는 실제 화물관리번호/수입신고번호 1~2건으로 dry-run한다.

## 로컬 도구와 검증

| 항목 | 경로 |
|---|---|
| 세무 자료 폴더 생성·스캔·manifest·ZIP CLI | `_tools/tax-automation/tax_package.py` |
| CLI 회귀 테스트 | `_tools/tax-automation/tests/test_tax_package.py` |

검증 명령:

```bash
python3 -m unittest discover -s _tools/tax-automation/tests -p 'test_*.py' -v
```
