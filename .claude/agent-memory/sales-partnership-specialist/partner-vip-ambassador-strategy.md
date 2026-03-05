# 파트너/VIP/엠버서더 전략 설계 (2026-03-05)

## 배경

- 거래처 13,298건, 누적 거래내역 10만건 (2013~2026)
- B2B 42% / 개인 58%
- 강사회원 약 1,200명 (전체 4,000명 중)

## 등급별 핵심 설계

### 파트너스

자격: 협회 MOU 후 소속 회원 일괄 등록 OR 인정 자격증 개인 신청

인정 자격증 3원칙:
1. 공인 협회(등록 법인) 발급
2. 꽃공예 관련 분야 (압화/플로리스트/레진/캔들/석고/하바리움)
3. 이론+실기 포함 (시험/심사 있음)

### VIP

- 협회원 구매 활성화 메커니즘: 분기 실적 리포트 이메일 발송
- 월 2회 VIP 전용 딜 (첫째/셋째 주 월요일)
- VIP 전용 단톡방 운영 (PRESSCO21 담당자 포함)

### 엠버서더

- 전속 계약 아님, 6개월 단위 협력 약정서
- 월 2건 포스팅 (스토리 제외, 릴스/게시물)
- 금전 보상 없음 (협찬 현물 + 30% 할인 + 전용코드 인센티브)
- 전용 할인코드로 ROI 직접 측정

## NocoDB 추가 필드 (Phase 6)

tbl_Partners:
- member_grade: SingleSelect (PARTNER_S / VIP / AMBASSADOR)
- affiliation_id: LinkToTable (tbl_Affiliations)
- discount_rate: Number
- ambassador_code: Text
- vip_incentive_total: Currency

tbl_Affiliations 신규:
- affiliation_type: SingleSelect
- vip_member_id: Text
- quarterly_purchase: Currency
- incentive_rate: Number

## 즉시 실행 우선순위

1. 강사회원 1,200명 파트너스 안내 이메일 발송 (1주 내)
2. 인스타/블로그 엠버서더 후보 20명 리스트업 (1주 내)
3. 거래처 데이터에서 VIP 후보 3곳 선정 (2주 내)
4. 협회 제휴 미팅 1~2개 (1개월 내)
