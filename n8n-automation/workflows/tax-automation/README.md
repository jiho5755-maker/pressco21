# 세무 자동화 Phase 1 — UNI-PASS n8n 워크플로우

## 목적

종합소득세 자료 수집을 줄이기 위한 1차 자동화입니다. 관세청 UNI-PASS XML API를 n8n에서 호출해 통관 진행 상태와 수입 제세 납부여부를 NocoDB에 누적하고, 실행 결과를 텔레그램으로 알립니다.

## 산출물

| 파일 | 역할 |
|---|---|
| `WF-TAX-001_UNIPASS_수입제세_납부조회.json` | API049 `retrieveTaxMgPayYnAndPayDt` 수입 제세 납부여부/납부일자 조회 |
| `WF-TAX-002_UNIPASS_화물통관_진행조회.json` | API001 `retrieveCargCsclPrgsInfo` 화물통관 진행정보 조회 |

두 워크플로우 모두 `active: false`로 작성했습니다. 운영 배포 전 아래 환경변수와 NocoDB 테이블을 먼저 준비해야 합니다.

## 확인된 API 제약

UNI-PASS 연계가이드 v3.9 기준:

- API049 입력값은 `impDclrNo`(수입신고번호) 1개가 필수입니다.
- API049 자체에는 수리일자/납부일자 기간 검색 파라미터가 없습니다.
- 따라서 “월 단위 자동 수집”은 다음 중 하나가 선행되어야 합니다.
  1. API001 통관진행 조회에서 확보한 `dclrNo`를 API049 입력으로 사용
  2. 관세사/수입신고필증/기존 장부에서 수입신고번호 목록을 별도 적재
  3. 임시로 `UNIPASS_IMPORT_DECLARATION_NUMBERS` 환경변수 또는 수동 webhook body로 목록 전달

## 필수 n8n 환경변수

비밀값은 워크플로우 JSON에 넣지 않습니다. 운영 n8n 서버 환경변수로 주입하세요.

| 환경변수 | 필요 WF | 설명 |
|---|---|---|
| `UNIPASS_API049_CRKYCN` | WF-TAX-001 | API049 인증키 |
| `UNIPASS_API001_CRKYCN` | WF-TAX-002 | API001 인증키 |
| `NOCODB_API_TOKEN` 또는 `NOCODB_TOKEN` | 둘 다 | NocoDB 저장용 토큰 |
| `NOCODB_CUSTOMS_TAX_PAYMENTS_TABLE_ID` | WF-TAX-001 | `customs_tax_payments` 테이블 ID |
| `NOCODB_CUSTOMS_CLEARANCE_STATUS_TABLE_ID` | WF-TAX-002 | `customs_clearance_status` 테이블 ID |
| `NOCODB_BASE_ID` | 선택 | 기본값 `pu0mwk97kac8a5p` |
| `UNIPASS_IMPORT_DECLARATION_NUMBERS` | 선택 | 수동 목록 미전달 시 API049 조회 대상. 쉼표/공백/줄바꿈 구분 |
| `UNIPASS_CARGO_QUERIES` | 선택 | 수동 목록 미전달 시 API001 조회 대상. JSON 배열 권장 |
| `UNIPASS_TAX_DRY_RUN` | 선택 | `true`면 NocoDB 저장 생략 |
| `UNIPASS_STORE_RAW_XML` | 선택 | `true`면 원본 XML도 NocoDB에 저장. 기본은 저장 안 함 |

## NocoDB 테이블 설계

### `customs_tax_payments`

| 필드명 | 권장 타입 | 비고 |
|---|---|---|
| `source_api` | SingleLineText | `API049` |
| `import_declaration_no` | SingleLineText | 수입신고번호. unique 권장 |
| `payment_yn` | SingleLineText | `Y/N` |
| `payment_date` | SingleLineText 또는 Date | API 응답 `YYYYMMDD` |
| `notice` | LongText | `ntceInfo` |
| `t_cnt` | SingleLineText 또는 Number | API 응답 건수 |
| `fetched_at` | DateTime | 조회 시각 |
| `run_label` | SingleLineText | 실행 라벨 |
| `last_result` | SingleLineText | `success`, `empty_or_error` |
| `raw_xml` | LongText | 선택 저장 |

### `customs_clearance_status`

| 필드명 | 권장 타입 | 비고 |
|---|---|---|
| `source_api` | SingleLineText | `API001` |
| `lookup_key` | SingleLineText | 화물관리번호 또는 `blYy-mblNo-hblNo`. unique 권장 |
| `cargo_management_no` | SingleLineText | `cargMtNo` |
| `mbl_no` | SingleLineText | MBL 번호 |
| `hbl_no` | SingleLineText | HBL 번호 |
| `bl_year` | SingleLineText | BL 년도 |
| `progress_status` | SingleLineText | `prgsStts` |
| `progress_code` | SingleLineText | `prgsStCd` |
| `customs_progress_status` | SingleLineText | `csclPrgsStts` |
| `import_declaration_no` | SingleLineText | 상세 이력의 `dclrNo`. API049 입력 후보 |
| `product_name` | LongText | 품명 |
| `entry_date` | SingleLineText 또는 Date | 입항일자 `YYYYMMDD` |
| `processed_at` | SingleLineText | 처리일시 |
| `latest_process_type` | SingleLineText | 최신 상세 이력 처리구분 |
| `latest_release_content` | LongText | 최신 반출입내용 |
| `latest_release_at` | SingleLineText | 최신 반출입일시 |
| `warehouse_name` | SingleLineText | 장치장명 |
| `detail_count` | Number | 상세 이력 건수 |
| `notice` | LongText | `ntceInfo` |
| `t_cnt` | SingleLineText 또는 Number | API 응답 건수 |
| `fetched_at` | DateTime | 조회 시각 |
| `run_label` | SingleLineText | 실행 라벨 |
| `last_result` | SingleLineText | `success`, `empty_or_error` |
| `raw_xml` | LongText | 선택 저장 |

## 수동 실행 예시

```bash
# API049 납부여부 dry-run
curl -X POST "https://n8n.pressco21.com/webhook/tax-unipass-payments-sync" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true,"importDeclarationNumbers":["수입신고번호"]}'

# API001 통관진행 dry-run
curl -X POST "https://n8n.pressco21.com/webhook/tax-unipass-clearance-sync" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true,"cargoQueries":[{"cargMtNo":"화물관리번호"},{"mblNo":"MBL","hblNo":"HBL","blYy":"2026"}]}'
```

## 로컬 API 프로브 결과

2026-04-25 로컬에서 인증키를 출력하지 않고 읽기 호출만 확인했습니다.

- API049 더미 수입신고번호: HTTP 200, root `taxMgQryRtnVo`, `tCnt=-1`, `ntceInfo=예상치 못한 오류...`
- API001 가이드 샘플 화물관리번호: HTTP 200, root `cargCsclPrgsInfoQryRtnVo`, `tCnt=0`

의미: 엔드포인트와 XML 응답 구조는 확인됐지만, 실제 PRESSCO21 수입신고번호/화물관리번호로 운영 데이터 검증이 아직 필요합니다.

## 배포 전 체크리스트

1. 운영 NocoDB에 위 2개 테이블 생성
2. 운영 n8n 서버 환경변수 주입
3. 실제 화물관리번호 또는 수입신고번호 1~2건으로 webhook dry-run 실행
4. NocoDB 저장을 켠 상태로 테스트 row 생성/수정 확인
5. 확인 후 schedule 활성화

