# Task 150: 메이크샵 적립금 API 검증

> **상태**: 완료 (2026-02-20)
> **규모**: S
> **예상 기간**: 1~2일
> **의존성**: 없음
> **우선순위**: Critical (Phase 2 착수 전 필수)

## 목표

메이크샵 `process_reserve` API로 "특정 회원에게 N원 적립금 지급"이 가능한지 검증한다.
Phase 2 파트너 클래스 플랫폼의 수수료→적립금 전환 핵심 기능의 기술적 실현 가능성을 확인한다.

## 대상 파일

- `API검증/reserve-api-test.gs` (신규 생성)
- `docs/api-verification/reserve-api-result.md` (신규 생성)

## API 스펙 (공식 문서 확인 완료)

### 적립금 지급 API
- **URL**: `POST https://{도메인}/list/open_api_process.html?mode=save&type=reserve&process=give`
- **Headers**: `Shopkey`, `Licensekey`
- **Body**: `datas[0][id]=회원ID&datas[0][reserve]=금액&datas[0][content]=사유`
- **reserve에 음수 입력 시 차감**
- **Response**: `{ return_code: "0000", datas: [{ id, reserve, content, result: true/false, message }] }`

### 회원 적립금 조회 API
- **URL**: `GET https://{도메인}/list/open_api.html?mode=search&type=user_reserve&userid=회원ID`
- **Headers**: `Shopkey`, `Licensekey`
- **Response**: `{ return_code: "0000", totalCount, list: [{ uid, userid, date, reserve, content }] }`

### 스마트 적립금 지급 API
- **URL**: `POST https://{도메인}/list/open_api_process.html?mode=save&type=smart_reserve&process=give`
- **Body**: `datas[0][userid]=회원ID&datas[0][reserve_code]=코드&datas[0][reserve]=금액&datas[0][content]=사유`
- **주의**: MANUAL 타입 항목만 API 지급 가능

## 구현 단계

- [x] 1단계: 메이크샵 적립금 API 공식 문서 조사 및 스펙 정리
- [x] 2단계: GAS 테스트 스크립트 작성 (`reserve-api-test.gs`)
- [x] 3단계: 메이크샵 관리자에서 오픈 API 적립금 처리 권한 확인 (확인됨)
- [x] 4단계: 허용 IP 등록 + Shopkey/Licensekey 확보
- [x] 5단계: curl 직접 호출로 6개 테스트 케이스 검증 (전체 PASS)
- [x] 6단계: 적립금 지급(+100원) 후 차감(-100원) 원복 확인
- [x] 7단계: 결과 문서 작성 (`docs/api-verification/reserve-api-result.md`)
- [x] 8단계: ROADMAP.md 업데이트

## 테스트 케이스 (8건)

| # | 테스트 항목 | 예상 결과 |
|---|-----------|----------|
| 1 | 적립금 지급 (+100원) | return_code=0000, result=true |
| 2 | 적립금 조회 | return_code=0000, 지급 내역 존재 |
| 3 | 적립금 차감 (-100원) | return_code=0000, result=true |
| 4 | 차감 후 조회 | 차감 기록(음수 reserve) 존재 |
| 5 | 비존재 회원 에러 | result=false, "검색된 회원이 없습니다" |
| 6 | 비숫자 금액 에러 | result=false, "숫자로 입력하는 항목" |
| 7 | 스마트 적립금 항목 조회 | return_code=0000, 항목 목록 |
| 8 | 스마트 적립금 지급 | MANUAL 항목으로 지급 성공 여부 |

## 수락 기준

- [x] 적립금 지급 API 호출이 성공하고 응답코드 0000을 받는다
- [x] 테스트 회원의 적립금이 실제로 증가/감소한다
- [x] API 응답 구조(필드명, 타입)가 문서화되었다
- [x] 에러 케이스별 응답코드가 문서화되었다
- [x] Plan A 확정 (기본 적립금 API), Plan B/C는 불필요

## 사전 조건 (관리자 수동 작업)

1. 메이크샵 관리자 > 쇼핑몰구축 > 오픈 API에서 **적립금 처리 권한** 허용 확인
2. 테스트용 회원 아이디 확보
3. GAS 프로젝트 생성 + 스크립트 속성 설정

## 대안 계획

| 우선순위 | 방법 | 조건 |
|---------|------|------|
| Plan A | `process_reserve` 기본 적립금 API | API 정상 동작 시 |
| Plan A+ | `smart_reserve` 스마트 적립금 API | MANUAL 항목 존재 시 (유효기간 관리 가능) |
| Plan B | `process_coupon` 쿠폰 API | 적립금 API 불가 시 |
| Plan C | 반자동 (관리자 월 1회 수동 지급) | 모든 API 불가 시 |

## 변경 사항 요약

- 2026-02-20: curl 직접 호출로 전체 테스트 완료
- **Plan A 확정**: `process_reserve` 기본 적립금 API로 Phase 2 구현 가능
- 지급/차감/조회 모두 정상, 즉시 반영, 에러 메시지 명확
- 스마트 적립금은 미사용 상점 (N/A)
- Phase 2 주의사항: GAS에서 호출 시 IP 허용 설정 필요
- 상세: `docs/api-verification/reserve-api-result.md` 참조
