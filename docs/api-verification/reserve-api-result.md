# 메이크샵 적립금 API 검증 결과

> **검증일**: 2026-02-20
> **Task**: Task 150
> **상태**: 검증 완료 (Plan A 확정)

---

## 1. API 스펙 정리

### 1.1 적립금 지급 (기본)

| 항목 | 값 |
|------|---|
| Permission | 적립금 (process_reserve) |
| Method | POST |
| URL | `https://{도메인}/list/open_api_process.html?mode=save&type=reserve&process=give` |
| Headers | `Shopkey: {상점키}`, `Licensekey: {라이센스키}` |

**Request (datas 배열)**:

| 필드명 | 필드 정의 | 필수 | 비고 |
|--------|----------|------|------|
| id | 회원 아이디 | O | |
| reserve | 적립금 | O | 음수(-) 입력 시 차감 |
| content | 사유 | O | |
| date | 일시 | | 0000-00-00 00:00:00 |

**Response (datas 배열)**:

| 필드명 | 필드 정의 | 비고 |
|--------|----------|------|
| return_code | 처리 결과 | 성공 시 0000 |
| id | 회원 아이디 | |
| reserve | 적립금액 | |
| content | 사유 | |
| result | 결과 | true=성공, false=실패 |
| message | 실패 사유 | Array, result=false 시 출력 |

### 1.2 회원 적립금 조회

| 항목 | 값 |
|------|---|
| Permission | 회원 (process_user) |
| Method | GET |
| URL | `https://{도메인}/list/open_api.html?mode=search&type=user_reserve` |

**Request**:

| 필드명 | 필드 정의 | 필수 | 비고 |
|--------|----------|------|------|
| userid | 회원 ID | | ID 검색 시 기간 검색 불필요 |
| InquiryTimeFrom | 검색 시작 일자 | O* | 특정 회원 검색이 아니면 필수 |
| InquiryTimeTo | 검색 종료 일자 | | 시작+24시간이 최대 |
| limit | 검색 한도 | | MAX: 5000 |
| page | 페이지 | | default: 1 |
| orderByType | 정렬 | | asc/desc |
| purpose | 적립금 타입 | | U(사용), R(적립), all(전체) |

**Response (list 배열)**:

| 필드명 | 필드 정의 | 비고 |
|--------|----------|------|
| uid | 내역번호 | |
| userid | 회원 아이디 | |
| date | 적립금 일시 | 0000-00-00 00:00:00 |
| reserve | 적립금 | 양수=지급, 음수=차감 |
| content | 내용 | |

### 1.3 스마트 적립금 지급

| 항목 | 값 |
|------|---|
| Permission | 적립금 (process_reserve) |
| Method | POST |
| URL | `https://{도메인}/list/open_api_process.html?mode=save&type=smart_reserve&process=give` |

**Request (datas 배열)**:

| 필드명 | 필드 정의 | 필수 | 비고 |
|--------|----------|------|------|
| userid | 회원 아이디 | O | |
| reserve_code | 스마트 적립금 항목 코드 | O | MANUAL 타입만 API 지급 가능 |
| reserve | 적립금 | O | 음수(-) 입력 시 차감 |
| content | 사유 | | |

### 1.4 적립금 지급 요청 (부운영자)

| 항목 | 값 |
|------|---|
| Permission | 적립금 (process_reserve) |
| Method | POST |
| URL | `https://{도메인}/list/open_api_process.html?mode=save&type=reserve_temp&process=give` |

**Request (datas 배열)**:

| 필드명 | 필드 정의 | 필수 | 비고 |
|--------|----------|------|------|
| id | 회원 아이디 | O | |
| sub_admin_id | 부운영자 ID | O | 적립금 지급 요청 권한 필요 |
| reserve | 적립금 | O | 음수(-) 입력 시 차감 |
| content | 사유 | O | |

---

## 2. 테스트 결과

테스트 실행: 2026-02-20 17:46 KST, curl 직접 호출 (foreverlove.co.kr)

| # | 테스트 항목 | 결과 | 상세 |
|---|-----------|------|------|
| 1 | 적립금 지급 (+100원) | **PASS** | return_code=0000, result=true, 즉시 반영 |
| 2 | 적립금 조회 | **PASS** | return_code=0000, totalCount=4, 지급 내역 확인 |
| 3 | 적립금 차감 (-100원) | **PASS** | return_code=0000, result=true, reserve=-100 |
| 4 | 비존재 회원 에러 | **PASS** | result=false, message="`NONEXISTENT_USER_XYZ99` 검색된 회원이 없습니다." |
| 5 | 비숫자 금액 에러 | **PASS** | result=false, message="reserve 은(는) 숫자로 입력하는 항목입니다." |
| 6 | 스마트 적립금 항목 조회 | **N/A** | return_code=9999, "스마트 적립금을 사용중인 상점 아닙니다" |

### 실제 API 응답 원본

**적립금 지급 성공**:
```json
{"return_code":"0000","datas":[{"id":"jihoo5755","reserve":"100","content":"[API테스트] Task150 적립금 지급 검증","result":true}]}
```

**적립금 조회 성공**:
```json
{"return_code":"0000","totalCount":"4","totalPage":1,"page":1,"count":4,"list":[
  {"uid":"92514","userid":"jihoo5755","date":"2022-07-29 11:25:06","reserve":"1000","content":"가입축하금입니다."},
  {"uid":"115249","userid":"jihoo5755","date":"2026-01-14 17:16:56","reserve":"860","content":"물품구입에 대한 적립금입니다. ^^"},
  {"uid":"115250","userid":"jihoo5755","date":"2026-01-14 17:16:56","reserve":"430","content":"물품구입에 대한 적립금입니다. ^^"},
  {"uid":"116209","userid":"jihoo5755","date":"2026-02-20 17:46:19","reserve":"100","content":"[API테스트] Task150 적립금 지급 검증"}
],"orderVersion":"2.0"}
```

**적립금 차감 성공**:
```json
{"return_code":"0000","datas":[{"id":"jihoo5755","reserve":"-100","content":"[API테스트] Task150 적립금 차감(원복)","result":true}]}
```

**비존재 회원 에러**:
```json
{"return_code":"0000","datas":[{"id":"NONEXISTENT_USER_XYZ99","reserve":"100","content":"에러테스트","result":false,"message":["`NONEXISTENT_USER_XYZ99` 검색된 회원이 없습니다."]}]}
```

**비숫자 금액 에러**:
```json
{"return_code":"0000","datas":[{"id":"jihoo5755","reserve":"abc","content":"에러테스트","result":false,"message":["reserve 은(는) 숫자로 입력하는 항목입니다."]}]}
```

---

## 3. 결론 및 의사결정

### 3.1 기본 적립금 API 사용 가능 여부

- **결과: 사용 가능 (확정)**
- 지급(양수), 차감(음수) 모두 정상 동작
- 즉시 반영 (지급 후 조회 시 바로 확인됨)
- 에러 처리 명확 (비존재 회원, 비숫자 금액 등)
- Phase 2 영향: Task 221 (정산 자동화)에서 직접 활용 가능

### 3.2 스마트 적립금 API 사용 가능 여부

- **결과: 사용 불가 (해당 상점 미사용)**
- "스마트 적립금을 사용중인 상점 아닙니다" 응답
- Phase 2 활용: 기본 적립금 API로 충분, 스마트 적립금 불필요

### 3.3 권장 방안

- **Plan A 확정: `process_reserve` 기본 적립금 API**
- 근거: 지급/차감/조회 모두 정상 동작, 즉시 반영, 에러 처리 명확

---

## 4. Phase 2 아키텍처 영향

### 적립금 API 사용 가능 확정 -> Phase 2 설계 반영사항

1. **Task 201 (GAS 백엔드)**: 적립금 지급/차감 함수를 GAS 모듈로 구현
   - `grantReserve(memberId, amount, reason)` 패턴 재사용
   - 단, GAS에서 호출 시 IP 허용 필요 (Google 서버 IP 등록 or 프록시)
2. **Task 221 (정산 자동화)**: 수수료 계산 후 자동 적립금 전환 가능
   - `datas` 배열로 여러 회원 동시 지급 가능 (배치 처리)
   - 실패 시 `result=false`와 `message` 배열로 에러 원인 파악 가능
3. **IP 제한 해결 필요** (Phase 2 착수 시)
   - 현재: 특정 IP만 허용 (112.219.232.181, 119.70.128.56)
   - GAS: Google 서버 IP가 유동적 -> IP 제한 해제 또는 프록시 필요
   - 대안: Cloudflare Workers를 프록시로 사용 (고정 IP 가능)

---

## 5. 에러 코드 정리

| 코드 | 의미 | 테스트에서 확인 |
|------|------|---------------|
| 0000 | 정상 처리 | 지급/차감/조회 모두 |
| 9001 | 상점키가 없습니다 | |
| 9002 | 검색된 상점키가 없습니다 | Shopkey 틀렸을 때 |
| 9007 | API 조회 권한이 없습니다 (상점 문의) | 상점 설정 조회 시 |
| 9008 | API 조회 권한이 없습니다 (담당자 문의) | |
| 9009 | 허가된 IP가 아닙니다 | |
| 9999 | 실패 (상세 메시지 제공) | 스마트 적립금 미사용 |

### 적립금 지급 시 개별 에러 (return_code=0000이지만 result=false)

| 에러 메시지 | 원인 |
|------------|------|
| "`{id}` 검색된 회원이 없습니다." | 존재하지 않는 회원 ID |
| "reserve 은(는) 숫자로 입력하는 항목입니다." | 금액에 문자열 입력 |
| "content 은(는) 필수 입력 항목입니다." | 사유 미입력 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-20 | API 스펙 문서 작성 (공식 문서 기반) |
| 2026-02-20 | GAS 테스트 스크립트 작성 완료 |
| 2026-02-20 | curl 직접 호출로 전체 테스트 완료 - **Plan A 확정** |
