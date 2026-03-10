# 파트너클래스 제휴 DB 운영 가이드

## 목적
제휴업체, 협회, 기관 데이터를 프론트 하드코딩이 아니라 DB 단일 소스로 관리한다.  
목록 `협회 제휴` 탭, 메인페이지 추천 블록, 운영 검수 흐름이 같은 데이터 기준으로 움직이게 만드는 것이 목표다.

## 권장 테이블
기본 테이블은 `tbl_Affiliations` 기준으로 운영한다.

권장 필드:
- `affiliation_code`: 고유 코드. 예시 `AFF_202603_FLORAL`
- `name`: 노출 이름
- `logo_url`: 로고 이미지 URL
- `landing_url`: 외부 또는 내부 이동 링크
- `status`: `active`, `draft`, `archived`
- `display_order`: 노출 순서
- `discount_rate`: 기본 할인율
- `memo`: 소개 문구
- `contact_name`
- `contact_email`
- `contact_phone`
- `target_1`, `target_2`, `target_3`: 매출 구간
- `incentive_1`, `incentive_2`, `incentive_3`: 구간별 인센티브
- `home_expose`: 메인 노출 여부
- `is_test`: QA 데이터 여부
- `updated_at`

## 자료 수령 후 처리 순서
1. 원본 자료를 시트로 정리한다.
2. 필수 값이 비어 있으면 `draft`로만 넣고 노출하지 않는다.
3. 로고 URL, 링크, 할인율, 인센티브 구간을 표준 형식으로 맞춘다.
4. QA 검증용이면 `is_test=1`, 운영 반영이면 `is_test=0`으로 넣는다.
5. `status=active`로 바꾸기 전 목록 `협회 제휴` 탭에서 실제 카드 렌더링을 확인한다.

## 네이밍 규칙
- 테스트용 제휴사는 이름 앞에 `QA_` 접두사를 붙인다.
- 임시 검수 데이터는 `status=draft`로 유지한다.
- 운영 코드값은 사람이 읽을 수 있게 짓되, 공백 대신 `_`를 사용한다.

예시:
- `AFF_202603_PRESS_ASSOCIATION`
- `QA_AFF_202603_GANGNAM_CENTER`

## 메인페이지 연동용 추가 규칙
메인페이지에서 노출할 제휴사만 별도 제어할 수 있어야 한다.

권장 추가 필드:
- `home_expose`: `1`이면 메인페이지 제휴 CTA 후보로 사용
- `home_copy`: 메인페이지 요약 문구
- `home_badge`: `협회`, `기관`, `기업 제휴` 같은 짧은 배지

## 클래스 추천 데이터와 함께 관리할 항목
메인페이지 추천 클래스까지 DB에서 제어하려면 `tbl_Classes`에도 운영 필드를 추가하는 편이 좋다.

권장 필드:
- `is_home_featured`
- `home_display_order`
- `home_badge`
- `home_copy`
- `home_expose_from`
- `home_expose_to`

## QA 데이터 운영 규칙
- 실사용 데이터와 QA 데이터를 섞지 않는다.
- QA 클래스/제휴는 `QA_` 접두사와 `is_test=1`을 함께 쓴다.
- 검수 후 운영 반영이 끝나면 QA 데이터는 `archived`로 돌리거나 별도 뷰에서 제외한다.

## 운영 체크리스트
- 로고 URL 정상 출력
- landing URL 동작 확인
- 할인율과 인센티브 금액 단위 확인
- `display_order` 중복 여부 확인
- `active` 전환 후 목록 `협회 제휴` 탭 실노출 확인
- 메인페이지 노출 대상이면 `home_expose=1` 확인
