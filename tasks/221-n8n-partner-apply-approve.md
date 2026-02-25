# Task 221: WF-07~08 파트너 신청/승인 n8n 워크플로우

> **Phase**: 2-C (파트너 관리)
> **담당**: gas-backend-expert
> **상태**: 구현 완료
> **완료일**: 2026-02-25
> **산출물**:
>   - `파트너클래스/n8n-workflows/WF-07-partner-apply.json` (24 노드)
>   - `파트너클래스/n8n-workflows/WF-08-partner-approve.json` (28 노드)

---

## 1. 개요

파트너 신청(WF-07)과 관리자 승인(WF-08) 워크플로우를 n8n JSON으로 구현.
기존 GAS `handlePartnerApply` / `handlePartnerApprove` 함수의 로직을 n8n + NocoDB 기반으로 이식.

---

## 2. WF-07 Partner Apply (24 노드)

### 엔드포인트
- **URL**: `POST /webhook/partner-apply`
- **인증**: 없음 (누구나 신청 가능)

### 노드 플로우

```
Webhook POST
  -> Code(입력검증 + URL sanitize)
     필수: name, studio_name, member_id, phone, email
     선택: portfolio_url, instagram_url, specialty, location, introduction
     URL: http/https만 허용, javascript:/data: 차단
  -> IF Input Valid
     -> false: Respond 400 (MISSING_PARAMS / INVALID_PARAMS)
     -> true:
       -> NocoDB GET tbl_Partners (member_id 중복 체크)
       -> Code(기존 파트너 여부 확인)
       -> IF Not Already Partner
          -> false: Respond 409 (ALREADY_PARTNER)
          -> true:
            -> NocoDB GET tbl_Applications (PENDING 중복 체크)
            -> Code(PENDING 신청 여부 확인)
            -> IF No Pending Application
               -> false: Respond 409 (DUPLICATE_APPLICATION)
               -> true:
                 -> Code(APP_YYYYMMDD_XXXXXX 생성)
                 -> NocoDB POST tbl_Applications (15필드 생성)
                 -> Code(생성 결과 확인)
                 -> IF Created OK
                    -> true: [병렬]
                       -> Build Confirm Email -> Send Email (신청 접수 확인)
                       -> Build Telegram -> Send Telegram (관리자 알림)
                       -> Build Success Response -> Respond 200
                    -> false:
                       -> Build Error Telegram -> Send Telegram -> Respond 500
```

### 이메일: 신청 접수 확인
- **수신자**: 신청자
- **제목**: `[PRESSCO21] 파트너 신청이 접수되었습니다`
- **브랜드 톤**: 따뜻 + 안심 + 포용
- **내용**: 접수 정보 테이블 + 3단계 안내 (검토 -> 결과 안내 -> 파트너 코드 발급)
- **안심 메시지**: "별도로 준비하실 것은 없습니다. 검토 결과가 나오면 바로 연락드릴게요!"

### 텔레그램: 관리자 신청 알림
- **형식**: `[파트너 신청] 새 신청이 접수되었습니다`
- **내용**: 신청자, 공방명, 전문 분야, 활동 지역, 이메일, 포트폴리오 URL

### tbl_Applications 생성 필드 (15개)

| 필드 | 타입 | 설명 |
|------|------|------|
| application_id | Text | PK, APP_YYYYMMDD_XXXXXX |
| member_id | Text | 메이크샵 회원 ID |
| applicant_name | Text | 신청자 이름 |
| workshop_name | Text | 공방명 |
| email | Text | 이메일 |
| phone | Text | 전화번호 |
| location | Text | 활동 지역 |
| specialty | Text | 전문 분야 |
| portfolio_url | Text | 포트폴리오 URL (sanitize 적용) |
| instagram_url | Text | 인스타그램 URL (sanitize 적용) |
| introduction | Text | 자기소개 (500자 제한) |
| status | Text | PENDING |
| applied_date | DateTime | 접수일시 (ISO 8601) |
| reviewed_date | Text | 빈 문자열 |
| reviewer_note | Text | 빈 문자열 |

---

## 3. WF-08 Partner Approve (28 노드)

### 엔드포인트
- **URL**: `POST /webhook/partner-approve`
- **인증**: `Authorization: Bearer {ADMIN_API_TOKEN}` 헤더 필수

### 노드 플로우

```
Webhook POST
  -> Code(ADMIN_API_TOKEN 검증 + 입력 파싱)
     필수: application_id 또는 member_id
     선택: reviewer_note
  -> IF Auth Valid
     -> false: Respond 401/403 (UNAUTHORIZED / FORBIDDEN)
     -> true:
       -> NocoDB GET tbl_Applications (application_id 또는 member_id로 조회)
       -> Code(신청 상태 검증: PENDING만 승인 가능)
       -> IF Application PENDING
          -> false: Respond 400 (APPLICATION_NOT_FOUND / ALREADY_APPROVED / INVALID_STATUS)
          -> true:
            -> NocoDB GET tbl_Partners (member_id 중복 체크)
            -> Code(기존 파트너 중복 확인)
            -> IF Can Approve
               -> false: Respond 409 (ALREADY_PARTNER)
               -> true:
                 -> NocoDB GET tbl_Partners (해당 월 partner_code 목록)
                 -> Code(PC_YYYYMM_NNN 생성, 수수료 설정)
                 -> NocoDB PATCH tbl_Applications (status=APPROVED, reviewed_date)
                 -> Code(파트너 데이터 준비)
                 -> NocoDB POST tbl_Partners (16필드 생성)
                 -> Code(파트너 생성 결과 확인)
                 -> IF Partner Created
                    -> true:
                      -> Makeshop 회원등급 변경 API (강사회원 그룹)
                      -> Code(메이크샵 결과 확인)
                      -> [병렬]
                         -> Build Approval Email -> Send Email
                         -> Build Telegram -> Send Telegram
                      -> Build Success Response -> Respond 200
                    -> false:
                      -> Build Error Telegram -> Send Telegram -> Respond 500
```

### 관리자 인증
- `Authorization: Bearer {token}` 헤더에서 토큰 추출
- `$env.ADMIN_API_TOKEN` 환경변수와 비교
- 미제공: 401 UNAUTHORIZED
- 불일치: 403 FORBIDDEN

### partner_code 생성 로직
1. NocoDB에서 해당 월(`PC_YYYYMM_`) 패턴의 기존 파트너 코드 목록 조회
2. 최대 순번(NNN) 추출
3. `PC_YYYYMM_` + (최대순번 + 1).padStart(3, '0')
4. 예: `PC_202602_001`, `PC_202602_002`, ...

### 메이크샵 회원등급 변경 API
- **URL**: `https://{MAKESHOP_DOMAIN}/list/open_api_process.html?mode=save&type=user&process=modify`
- **인증**: Makeshop API Key (httpHeaderAuth)
- **Payload**: `datas[0][id]={member_id}&datas[0][group_no]={MAKESHOP_PARTNER_GROUP_NO}`
- **onError**: continueRegularOutput (실패해도 파트너 등록은 유지, 수동 변경 가능)
- **결과**: 텔레그램 알림에 성공/실패 여부 포함

### 이메일: 파트너 승인 완료
- **수신자**: 승인된 파트너
- **제목**: `[PRESSCO21] 파트너 승인이 완료되었습니다! {이름}님 환영합니다`
- **브랜드 톤**: 축하 + 기대 + 가이드
- **내용**: PARTNER APPROVED 배지, 파트너 정보 테이블 (코드/등급/수수료율/승인일), 3단계 시작 가이드
- **등급 안내**: Bloom(블룸) -> Garden(가든) -> Atelier(아틀리에) 승급 안내

### 텔레그램: 승인 알림
- **형식**: `[파트너 승인] 새 파트너가 승인되었습니다`
- **내용**: 신청자, 회원ID, 파트너 코드, 등급, 수수료율, 메이크샵 등급변경 결과

### tbl_Partners 생성 필드 (16개)

| 필드 | 타입 | 값 |
|------|------|-----|
| partner_code | Text | PC_YYYYMM_NNN |
| member_id | Text | 메이크샵 회원 ID |
| partner_name | Text | 공방명 우선, 없으면 본명 |
| grade | Text | SILVER |
| email | Text | 파트너 이메일 |
| phone | Text | 전화번호 |
| location | Text | 활동 지역 |
| commission_rate | Number | 0.10 |
| reserve_rate | Number | 1.00 |
| class_count | Number | 0 |
| avg_rating | Number | 0 |
| education_completed | Boolean | false |
| portfolio_url | Text | 포트폴리오 URL |
| instagram_url | Text | 인스타그램 URL |
| approved_date | DateTime | 승인일시 (ISO 8601) |
| status | Text | active |

---

## 4. 보안 설계

| 항목 | WF-07 | WF-08 |
|------|-------|-------|
| 관리자 토큰 | 불필요 | **필수** (Bearer 토큰) |
| 입력 검증 | sanitizeText + sanitizeUrl | sanitizeText |
| URL sanitize | http/https만 허용 | 해당 없음 |
| XSS 방지 | escapeHtml (이메일) | escapeHtml (이메일) |
| 중복 방지 | tbl_Partners + tbl_Applications 2단계 | tbl_Partners 1단계 |
| CORS | foreverlove.co.kr | foreverlove.co.kr |
| 이메일/텔레그램 실패 | onError: continueRegularOutput | onError: continueRegularOutput |

---

## 5. 환경 변수 의존성

| 변수 | 용도 | 설정 위치 |
|------|------|----------|
| `NOCODB_PROJECT_ID` | NocoDB 프로젝트 ID | n8n 환경변수 |
| `TELEGRAM_CHAT_ID` | 관리자 텔레그램 채팅 ID | n8n 환경변수 |
| `ADMIN_API_TOKEN` | 관리자 인증 토큰 | n8n 환경변수 |
| `MAKESHOP_DOMAIN` | 메이크샵 도메인 | n8n 환경변수 |
| `MAKESHOP_PARTNER_GROUP_NO` | 강사회원 그룹 번호 | n8n 환경변수 |

### n8n Credentials 의존성

| Credential ID | 이름 | 용도 |
|--------------|------|------|
| nocodb-token | NocoDB API Token | NocoDB HTTP Request (xc-token) |
| pressco21-smtp | PRESSCO21 SMTP | 이메일 발송 |
| pressco21-telegram | PRESSCO21 Telegram Bot | 텔레그램 알림 |
| makeshop-api | Makeshop API Key | 메이크샵 회원등급 변경 (WF-08만) |

---

## 6. GAS 대비 변경사항

| 항목 | GAS (기존) | n8n (신규) |
|------|-----------|-----------|
| 동시성 제어 | LockService.waitLock(10000) | NocoDB 트랜잭션 없음 (2단계 중복 체크로 대응) |
| 캐시 | CacheService | 없음 (NocoDB 직접 조회 충분) |
| 이메일 한도 | Gmail 일 100건 | SMTP 일 500건 |
| 관리자 알림 | MailApp.sendEmail | 텔레그램 봇 |
| 에러 로그 | Logger.log + Sheets | n8n 실행 이력 + 텔레그램 |
| partner_code | Sheets 전체 스캔 | NocoDB where 필터 (LIKE) |
| 회원등급 변경 | 수동 (관리자) | 자동 (메이크샵 API) |
| 응답 형식 | `{ success, data, timestamp }` | 동일 |
| 수수료 모델 | GOLD reserveRate 0.80 | GOLD reserveRate **1.00** (개선안 B) |

---

## 7. 테스트 체크리스트

### WF-07 Partner Apply

#### 정상 케이스
- [ ] 모든 필수 필드 제공 시 PENDING 신청 생성 + 200 응답
- [ ] application_id가 APP_YYYYMMDD_XXXXXX 형식인지 확인
- [ ] tbl_Applications에 15개 필드 올바르게 저장
- [ ] 신청자에게 접수 확인 이메일 발송 (제목, 본문, XSS 안전)
- [ ] 관리자 텔레그램에 신청 알림 도착
- [ ] 응답: `{ success: true, data: { application_id, status: "PENDING", message } }`

#### 입력 검증
- [ ] name 누락 시 400 + MISSING_PARAMS
- [ ] studio_name 누락 시 400 + MISSING_PARAMS
- [ ] member_id 누락 시 400 + MISSING_PARAMS
- [ ] phone 누락 시 400 + MISSING_PARAMS
- [ ] email 누락 시 400 + MISSING_PARAMS
- [ ] email 형식 잘못된 경우 400 + INVALID_PARAMS
- [ ] portfolio_url에 `javascript:alert(1)` 입력 시 빈 문자열로 정제
- [ ] portfolio_url에 `data:text/html,...` 입력 시 빈 문자열로 정제
- [ ] portfolio_url에 `www.instagram.com/test` 입력 시 `https://` 자동 추가
- [ ] introduction이 500자 초과 시 잘림

#### 중복 방지
- [ ] 이미 파트너인 member_id로 신청 시 409 + ALREADY_PARTNER
- [ ] 이미 PENDING 신청이 있는 member_id로 신청 시 409 + DUPLICATE_APPLICATION
- [ ] REJECTED 상태의 기존 신청이 있어도 재신청 가능 (PENDING만 차단)

#### 에러 처리
- [ ] NocoDB 레코드 생성 실패 시 500 + APPLICATION_FAILED
- [ ] NocoDB 생성 실패 시 텔레그램 에러 알림 발송
- [ ] 이메일 발송 실패해도 200 응답 (onError: continueRegularOutput)
- [ ] 텔레그램 발송 실패해도 200 응답 (onError: continueRegularOutput)

### WF-08 Partner Approve

#### 관리자 인증
- [ ] Authorization 헤더 없이 요청 시 401 + UNAUTHORIZED
- [ ] Bearer 토큰이 잘못된 경우 403 + FORBIDDEN
- [ ] 올바른 Bearer 토큰으로 정상 진행

#### 정상 케이스
- [ ] application_id로 승인 시 정상 처리 + 200 응답
- [ ] member_id로 승인 시 정상 처리 (최근 PENDING 신청 대상)
- [ ] partner_code가 PC_YYYYMM_NNN 형식인지 확인
- [ ] 해당 월에 기존 파트너가 있을 때 순번이 올바르게 증가
- [ ] tbl_Applications 상태가 APPROVED로 업데이트
- [ ] tbl_Partners에 16개 필드 올바르게 생성
- [ ] 메이크샵 회원등급 변경 API 호출 (강사회원 그룹)
- [ ] 승인 이메일 발송 (파트너 코드, 등급, 시작 가이드 포함)
- [ ] 텔레그램 승인 알림 도착 (메이크샵 등급변경 결과 포함)
- [ ] 응답: `{ success: true, data: { partner_code, member_id, grade, ... } }`

#### 상태 검증
- [ ] 존재하지 않는 application_id 시 400 + APPLICATION_NOT_FOUND
- [ ] 이미 APPROVED된 신청 시 400 + ALREADY_APPROVED
- [ ] REJECTED 상태 신청 시 400 + INVALID_STATUS
- [ ] 이미 파트너인 member_id의 신청 승인 시 409 + ALREADY_PARTNER

#### 에러 처리
- [ ] 메이크샵 API 호출 실패해도 파트너 등록 유지 (onError: continueRegularOutput)
- [ ] 메이크샵 실패 시 텔레그램에 "수동 변경 필요" 메시지 포함
- [ ] NocoDB 파트너 생성 실패 시 500 + 텔레그램 에러 알림
- [ ] 이메일/텔레그램 발송 실패해도 200 응답 유지

#### 수수료 검증
- [ ] SILVER 등급: commission_rate=0.10, reserve_rate=1.00
- [ ] 응답에 commission_rate, reserve_rate 포함

---

## 8. 참고 파일

| 파일 | 설명 |
|------|------|
| `파트너클래스/class-platform-gas.gs` (3591~3904줄) | 기존 GAS handlePartnerApply / handlePartnerApprove |
| `docs/phase2/brand-strategy-comprehensive.md` | 이메일 카피, 브랜드 톤 |
| `파트너클래스/n8n-workflows/WF-04-record-booking.json` | 동일 패턴 참고 (WF-04) |
| `docs/phase2/member-group-management.md` | 메이크샵 회원그룹 관리 가이드 |
| `docs/phase2-n8n-migration-review.md` (490~527줄) | 메이크샵 회원등급 변경 API 스펙 |
