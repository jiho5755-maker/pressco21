# Phase 1 실행 플레이북: 2025년 귀속 종합소득세 자료 수집

> 작성일: 2026-04-25  
> 담당: 윤하늘님(PM), 박서연님(CFO), 최민석님(CTO), 조현우님(법무/보안)  
> 기준 문서: [PRD](./PRD-tax-automation-system-2026.md), [로드맵](./ROADMAP-tax-automation-system-2026.md), [비전공자 가이드](./종합소득세-자료수집-가이드-비전공자용-2026.md)

## 1. 이번 Phase의 목표

이번 Phase는 자동 신고가 아니라 `자료 수집을 실제로 끝낼 수 있는 운영 보드와 폴더 체계`를 만드는 단계다.

완료 상태는 다음처럼 정의한다.

1. 세무사 요청자료 양식이 없어도 기본 수집을 시작할 수 있다.
2. 담당자와 내부 마감일이 들어간 실행 보드가 있다.
3. 민감한 원본 파일은 Git 저장소 밖 폴더에 보관한다.
4. 스캔 도구로 파일명, 누락, 중복, 해시 manifest를 확인한다.
5. 세무 판단 항목은 `ACCOUNTANT_REVIEW` 또는 `확인 필요`로 분리한다.

## 2. 실행 보드

기본 실행 보드:

- [`templates/tax_collection_items_2025_execution_board.csv`](./templates/tax_collection_items_2025_execution_board.csv)

이 보드는 2025년 귀속 자료 수집을 위해 기본 담당자와 내부 마감일을 채운 CSV다.
세무사 실제 요청자료 양식을 받으면 이 파일을 복사해서 세무사 양식 기준으로 항목을 추가·삭제한다.

권장 운영 방식:

1. CSV를 Google Sheets, Excel, NocoDB 중 하나로 가져온다.
2. `status`는 처음에 `NOT_STARTED`로 둔다.
3. 수집 중이면 `IN_PROGRESS`, 파일을 넣었으면 `COLLECTED`, 세무사 확인이 필요하면 `ACCOUNTANT_REVIEW`로 바꾼다.
4. 해당 없는 플랫폼이나 자료는 `NOT_APPLICABLE`로 바꾸고 `internal_note`에 사유를 남긴다.
5. 파일을 받은 뒤에는 로컬 스캔 도구로 `collection_status.csv`를 생성해 실제 파일 상태와 보드 상태를 비교한다.

## 3. 내부 마감 게이트

| 날짜 | 게이트 | 담당 |
|---|---|---|
| 2026-04-27 | 기본정보 1차 수집 | 박서연님 |
| 2026-04-28 | 소득자료 1차 수집 | 박서연님 |
| 2026-04-29 | 홈택스 매출·비용 자료 수집 | 박서연님 |
| 2026-04-30 | 은행·카드·플랫폼·PG 자료 수집 | 박서연님, 김도현님 |
| 2026-05-01 | 공제자료·신고납부 이력 수집 | 대표, 박서연님 |
| 2026-05-02 | 통관관세·급여4대보험 자료 수집 | 김도현님, 박서연님 |
| 2026-05-04 | 설명 메모와 누락 의심 목록 취합 | 윤하늘님 |
| 2026-05-06 | manifest 초안과 확인 필요 목록 생성 | 윤하늘님, 최민석님 |
| 2026-05-07 | 세무사 1차 전달 패키지 생성 | 대표, 윤하늘님 |

## 4. 폴더 생성 방법

민감한 세무 원본 파일은 Git 저장소 안에 넣지 않는다. 아래 예시는 사용자의 홈 폴더 아래 안전한 로컬 폴더를 사용한다.

```bash
python3 _tools/tax-automation/tax_package.py init \
  --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달" \
  --items-csv docs/tax-automation/templates/tax_collection_items_2025_execution_board.csv \
  --tax-year 2025 \
  --company PRESSCO21
```

생성되는 핵심 폴더:

| 폴더 | 용도 |
|---|---|
| `00_manifest` | 체크리스트 사본, 스캔 결과, 파일 목록, 누락표 |
| `01_기본정보` | 사업자등록증명, 전년도 신고서 등 |
| `02_소득자료` | 지급명세서 등 |
| `03_매출자료` | 홈택스 매출, 자사몰, PG, 오픈마켓 |
| `04_비용증빙` | 매입, 카드, 계좌, 광고비, 배송비 |
| `05_공제자료` | 연말정산 간소화, 보험료, 연금저축 등 |
| `06_세금신고이력` | 부가세, 원천세, 국세·지방세 납부내역 |
| `07_통관관세` | UNI-PASS, 수입신고, 수입제세 |
| `08_급여4대보험` | 급여대장, 사회보험, 외주·프리랜서 |
| `09_설명메모` | 큰 금액 입출금, 개인/사업 혼합 지출 |
| `90_확인필요` | 누락 의심, 세무사 질문 목록 |
| `99_세무사전달` | 최종 전달 ZIP |

## 5. 파일명 규칙

기본 규칙:

```text
{귀속연도}_{출처}_{자료명}_{기간}.{확장자}
```

예시:

```text
2025_홈택스_전자세금계산서_매출_연간.xlsx
2025_은행별_사업용계좌_거래내역_연간.xlsx
2025_UNIPASS_수입제세납부확인_연간.pdf
```

금지:

- 파일명에 주민등록번호 전체값 입력 금지
- 파일명에 계좌 전체번호 입력 금지
- 파일명에 카드 전체번호 입력 금지
- 파일명에 비밀번호, API key, token 입력 금지

## 6. 스캔과 manifest 생성

자료를 폴더에 넣은 뒤 실행한다.

```bash
python3 _tools/tax-automation/tax_package.py scan \
  --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달"
```

생성 결과:

| 파일 | 설명 |
|---|---|
| `00_manifest/manifest_files.csv` | 원본 파일 목록, 크기, 수정일, SHA-256 해시 |
| `00_manifest/tax_evidence_files.csv` | PRD의 `tax_evidence_files` 초안과 호환되는 증빙 파일 원장 |
| `00_manifest/collection_status.csv` | 체크리스트 항목별 실제 파일 매칭 결과 |
| `00_manifest/missing_items.csv` | 필수·권장·조건부 중 미수집 또는 확인 필요 항목 |
| `00_manifest/duplicate_candidates.csv` | 같은 해시 또는 같은 파일명 중복 후보 |
| `00_manifest/filename_rule_issues.csv` | 민감정보 의심 파일명, 지원 외 확장자 등 |
| `00_manifest/monthly_coverage.csv` | 1월~12월 월별 자료 존재 여부 |
| `00_manifest/scan_summary.json` | 전체 요약 |

호환 명령:

```bash
python3 _tools/tax-automation/tax_package.py hash --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달"
python3 _tools/tax-automation/tax_package.py manifest --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달"
python3 _tools/tax-automation/tax_package.py missing-report --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달"
```

위 세 명령은 1차 MVP에서는 `scan`과 같은 결과를 만든다. 나중에 기능이 커지면 독립 명령으로 분리한다.

## 7. 세무사 전달 ZIP 생성

먼저 dry-run으로 포함 파일 수를 확인한다.

```bash
python3 _tools/tax-automation/tax_package.py zip \
  --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달" \
  --tax-year 2025 \
  --dry-run
```

문제가 없을 때만 ZIP을 만든다.

```bash
python3 _tools/tax-automation/tax_package.py zip \
  --base-dir "$HOME/TaxVault/2025_종합소득세_세무사전달" \
  --tax-year 2025
```

ZIP은 `99_세무사전달`에 생성된다.

ZIP 생성 전 도구가 확인하는 안전장치:

- manifest에 기록된 파일이 현재도 `base-dir` 내부 일반 파일인지 확인한다.
- symlink 파일은 ZIP에 포함하지 않는다.
- scan 때 기록한 SHA-256 해시와 현재 파일 해시가 다르면 생성을 중단한다.
- scan 이후 파일을 교체했거나 수정했다면 `scan`을 다시 실행해야 한다.

## 8. 보안 원칙

1. 홈택스, 은행, 카드사 비밀번호와 인증서는 저장하지 않는다.
2. API 키와 OAuth 토큰은 문서, CSV, n8n JSON, 로그에 넣지 않는다.
3. 원본 파일은 Git 저장소 밖에 둔다.
4. 공개 링크로 세무사 ZIP을 전달하지 않는다.
5. 전송 링크는 수신자, 만료일, 접근 권한을 확인한다.
6. 개인자료는 세무사 요청 범위에 필요한 것만 최소 수집한다.
7. AI 도구에는 원본 세무파일, 계좌내역, 주민정보를 보내지 않는다.
8. 스캔 도구가 표시한 민감정보 의심 파일명은 전달 전 반드시 수정한다.

## 9. 세무사 확인 필요 질문

기본 질문 템플릿:

- [`templates/accountant_questions_2025_template.csv`](./templates/accountant_questions_2025_template.csv)

중요 원칙:

- 경비 인정 여부, 공제 가능 여부, 신고 방식 선택은 자동 결론을 내리지 않는다.
- 시스템은 `검토 후보`와 `확인 필요`만 표시한다.
- 세무사의 답변을 받으면 관련 `item_id`에 연결해 다음 연도 체크리스트 개선에 반영한다.
