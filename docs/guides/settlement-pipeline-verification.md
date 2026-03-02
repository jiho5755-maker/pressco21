# 정산 파이프라인 실 검증 가이드 (Task 295)

> **목적**: 메이크샵 네이티브 결제 → WF-05 폴링 → 정산 → 적립금 지급 전체 파이프라인 검증
> 작성일: 2026-02-26

---

## 전제조건 체크

시작 전 반드시 확인:
- [ ] 메이크샵 관리자 > 오픈 API > 접근 허용 IP에 `158.180.77.201` 등록 완료
- [ ] n8n WF-05 워크플로우 ACTIVE 상태
- [ ] NocoDB tbl_Partners에 테스트 파트너 계정(`jihoo5755`) status=active
- [ ] n8n WF-05 수수료율 상수 확인 (아래 주의사항 참고)

> ⚠️ **수수료율 불일치 주의**: WF-05 코드 내 `COMMISSION_RATES`가 구버전(SILVER 10%, GOLD 12%, PLATINUM 15%)으로 남아 있을 수 있습니다. 확정 정책(SILVER 20%, GOLD 25%, PLATINUM 30%)과 다릅니다. 검증 전 n8n에서 WF-05 > "Calculate Commission" 노드를 열어 `COMMISSION_RATES` 값을 확인하고 필요 시 수정하세요.
> - 확정 정책: `docs/guides/commission-policy.md` 참고

---

## 섹션 1: 테스트 상품 등록 (메이크샵)

### 목적
파트너 강의를 메이크샵 상품으로 등록하여 실제 결제 흐름을 테스트합니다.

### 단계

1. **메이크샵 관리자 로그인**
   - `foreverlove.co.kr/shop/admin/main.html`

2. **테스트 상품 등록**
   - 상품관리 > 상품 등록
   - 상품명: `[테스트] 파트너 클래스 검증용`
   - 가격: `1,000원` (최소 금액으로 테스트)
   - 카테고리: 파트너 클래스 카테고리 (class_category_id=022)
   - 재고: 10개

3. **메이크샵 상품 ID 확인**
   - 등록 후 상품 상세 URL에서 `branduid` 파라미터 값 메모
   - 이 값이 WF-04/05에서 `class_id`로 매핑됨

4. **NocoDB tbl_Classes에 매핑 레코드 생성**
   - NocoDB GUI(`https://nocodb.pressco21.com`) 접속
   - tbl_Classes에 신규 레코드 추가:
     ```
     class_id: CL_202602_TEST
     partner_code: PC_202602_001  (jihoo5755 파트너 코드 확인)
     class_name: [테스트] 파트너 클래스 검증용
     price: 1000
     status: active
     makeshop_product_id: {메이크샵 상품 branduid}
     ```

### 완료 확인
- [ ] 메이크샵 상품 등록 완료, branduid 메모
- [ ] NocoDB tbl_Classes 매핑 레코드 생성

---

## 섹션 2: 테스트 결제 진행

### 목적
실제 결제를 통해 메이크샵 주문 데이터가 WF-05에서 감지되는지 확인합니다.

### 방법 A: 실제 결제 (권장)

1. **다른 계정으로 로그인** (자기 결제 방지 테스트를 위해 파트너 계정이 아닌 계정 사용)
2. 테스트 상품 페이지 접속 → 결제 진행
3. 결제 완료 후 주문번호 메모

> ⚠️ **자기 결제 방지**: 파트너 본인 계정(jihoo5755)으로 테스트 상품 결제 시 WF-05가 `SELF_PURCHASE` 처리 → tbl_Settlements 미생성. 반드시 다른 계정으로 결제하세요.

### 방법 B: 메이크샵 관리자 테스트 주문

1. 메이크샵 관리자 > 주문관리 > 테스트 주문
2. 실 결제 없이 주문 데이터만 생성 (메이크샵에서 지원 시)

### 결제 후 확인사항

```
메모 양식:
- 주문번호(order_id):
- 주문자 계정(member_id):
- 상품명: [테스트] 파트너 클래스 검증용
- 결제금액: 1,000원
- 결제일시:
```

---

## 섹션 3: WF-05 폴링 모니터링

### 목적
결제 감지 후 WF-05가 올바르게 실행되는지 확인합니다.

### WF-05 스케줄
- **5a 주문폴링**: 매 10분마다 실행 (Schedule 트리거)
- 최대 10분 대기 후 n8n 실행 내역 확인

### 모니터링 방법

```bash
# n8n API로 WF-05 최근 실행 확인
curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY: .secrets.env 참조}" \
  "https://n8n.pressco21.com/api/v1/executions?workflowId={WF-05-ID}&limit=5" | python3 -m json.tool
```

### n8n GUI에서 확인

1. `https://n8n.pressco21.com` 로그인
2. 좌측 메뉴 **Executions** 클릭
3. WF-05 `order-polling-batch` 최근 실행 내역 확인
4. 실행 클릭 → 각 노드 결과 확인:
   - `Get Recent Orders`: 메이크샵 주문 목록 응답 확인
   - `Check Dup Result`: 중복 주문 필터 결과
   - `Calculate Commission`: 수수료 계산 결과
   - `NocoDB Create Settlement`: tbl_Settlements 생성 성공 여부

### 수동 실행 방법

```bash
# WF-05 수동 실행 (폴링 10분 기다리기 싫을 때)
# 1. n8n UI에서 WF-05 열기
# 2. Test workflow 버튼 클릭 (Schedule 트리거 시뮬레이션)
# 또는 웹훅 없이 직접 Execute 버튼 사용
```

### 완료 확인
- [ ] WF-05 실행 내역에서 테스트 주문 감지됨
- [ ] "Calculate Commission" 노드에서 수수료 계산 결과 확인
- [ ] "NocoDB Create Settlement" 성공 응답

---

## 섹션 4: NocoDB tbl_Settlements 레코드 확인

### 목적
WF-05가 정산 레코드를 올바르게 생성했는지 확인합니다.

### 확인 방법

**방법 A: NocoDB GUI**
1. `https://nocodb.pressco21.com` 로그인
2. tbl_Settlements 테이블 접속
3. 최신 레코드 확인

**방법 B: API 직접 조회**
```bash
curl -s -H "xc-token: ${NOCODB_API_TOKEN: .secrets.env 참조}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements?sort=-CreatedAt&limit=5" \
  | python3 -m json.tool
```

### 검증 항목

| 필드 | 기대값 | 실제값 | 일치 |
|------|--------|--------|------|
| `status` | `PENDING_SETTLEMENT` | | ☐ |
| `order_id` | 섹션2에서 메모한 주문번호 | | ☐ |
| `partner_code` | `PC_202602_001` (테스트 파트너) | | ☐ |
| `commission_rate` | 0.20 (SILVER 20%) | | ☐ |
| `commission_amount` | 200원 (1,000 × 20%) | | ☐ |
| `reserve_rate` | 0.80 (80%) | | ☐ |
| `reserve_amount` | 160원 (200 × 80%) | | ☐ |
| `settlement_due_date` | 수업일 + 3일 | | ☐ |
| `retry_count` | 0 | | ☐ |

> ⚠️ **자기 결제 방지 확인**: 파트너 계정으로 결제 시 status=`SELF_PURCHASE`가 되어야 합니다.

---

## 섹션 5: D+3 정산 시뮬레이션

### 목적
실제 3일을 기다리지 않고 정산 프로세스를 시뮬레이션합니다.

### 방법: settlement_due_date를 오늘로 수정

**방법 A: NocoDB GUI에서 직접 수정**
1. tbl_Settlements에서 테스트 레코드 클릭
2. `settlement_due_date`를 오늘 날짜(YYYY-MM-DD)로 수정
3. 저장

**방법 B: API로 수정**
```bash
# 먼저 레코드 ID 확인
RECORD_ID="..." # NocoDB에서 확인한 Id 필드 값

curl -s -X PATCH \
  -H "xc-token: ${NOCODB_API_TOKEN: .secrets.env 참조}" \
  -H "Content-Type: application/json" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements/${RECORD_ID}" \
  -d "{\"settlement_due_date\": \"$(date +%Y-%m-%d)\"}" | python3 -m json.tool
```

### WF-05 5e (D+3 정산 배치) 수동 실행

1. n8n UI에서 WF-05 열기
2. `Schedule D+3 Settlement` 트리거 노드의 실행 버튼 클릭 (또는 Test 실행)
3. `Parse Due Settlements` 노드 결과에서 테스트 레코드 포함 확인
4. `D+3 Process Reserve` 노드 실행 결과 확인

### 완료 확인
- [ ] D+3 배치 실행 후 tbl_Settlements 레코드 status=`COMPLETED` 변경됨
- [ ] `completed_date` 필드에 완료 일시 기록됨

---

## 섹션 6: process_reserve API 호출 확인

### 목적
메이크샵 적립금 지급 API가 실제로 호출되었는지 확인합니다.

### n8n 실행 내역에서 확인

1. WF-05 D+3 배치 실행 내역 클릭
2. `D+3 Process Reserve` 노드 결과 확인
3. HTTP Request 출력:
   ```json
   {
     "return_code": "0000",
     "datas": [{
       "result": true,
       "message": []
     }]
   }
   ```

### 직접 API 테스트 (선택)

```bash
# 메이크샵 적립금 지급 직접 테스트 (별도 테스트용)
curl -s -X POST "https://openapi.makeshop.co.kr/list/open_api_process.html" \
  -H "Shopkey: {SHOPKEY}" \
  -H "Licensekey: {LICENSEKEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "process_reserve",
    "datas": [{
      "content": "[PRESSCO21] 강의 수수료 적립금 지급 테스트",
      "reserve_price": 160,
      "member_id": "jihoo5755"
    }]
  }' | python3 -m json.tool
```

### 기대 응답
```json
{
  "return_code": "0000",
  "datas": [{"result": true, "message": []}]
}
```

### 실패 시 점검사항
| 오류 | 원인 | 해결 |
|------|------|------|
| `return_code: 9000` | API 키 오류 | n8n Credentials 확인 |
| `return_code: 9001` | 권한 없음 | 메이크샵 오픈API 적립금 수정 권한 확인 |
| `return_code: 9003` | IP 차단 | 메이크샵 허용 IP에 158.180.77.201 추가 |
| `result: false` | 회원 없음 | member_id 정확한지 확인 |

---

## 섹션 7: 파트너 마이페이지 적립금 반영 확인

### 목적
실제 파트너 계정의 메이크샵 마이페이지에서 적립금이 증가했는지 확인합니다.

### 확인 방법

1. **결제 전 적립금 잔액 메모**
   - 파트너 계정(jihoo5755)으로 `foreverlove.co.kr` 로그인
   - 마이페이지 > 적립금 현황 확인
   - 현재 잔액: ____원

2. **D+3 정산 배치 실행 후 확인**
   - 마이페이지 새로고침
   - 적립금 잔액: ____원 (160원 증가 기대)

3. **적립금 사용 내역 확인**
   - 지급 내용: `[PRESSCO21] D+3 정산 적립금 지급 - {order_id}`

### 완료 확인
- [ ] 마이페이지 적립금 잔액 160원 증가 확인
- [ ] 사용 내역에 지급 항목 표시 확인

---

## 섹션 8: 환불 시나리오

### 목적
메이크샵 주문 취소/환불 시 WF-05가 올바르게 처리하는지 확인합니다.

### 테스트 방법

1. **메이크샵 관리자에서 주문 취소 처리**
   - 주문관리 > 해당 주문 > 취소 처리
   - 취소 후 주문 상태: 취소완료

2. **WF-05 폴링 실행 후 확인**
   - WF-05 실행 내역에서 취소 주문 감지 여부 확인
   - `Get Recent Orders` → `check_cancelled_orders` 분기 확인

3. **취소 처리 결과**
   - PENDING_SETTLEMENT 상태의 정산 레코드는 취소 주문 감지 시 `CANCELLED` 상태로 변경 (WF-05 구현 여부 확인 필요)
   - 이미 COMPLETED인 경우 → 별도 환불 처리 필요 (수동)

### 현재 WF-05 환불 처리 상태 확인

```bash
# WF-05 JSON에서 환불/취소 처리 로직 검색
grep -o '"cancelled\|cancel\|refund' 파트너클래스/n8n-workflows/WF-05-order-polling-batch.json
```

> ℹ️ **현재 WF-05 버전 한계**: 주문 취소 자동 감지 로직이 완전하지 않을 수 있습니다. 취소 주문 처리는 NocoDB에서 수동으로 status=`CANCELLED`로 변경하는 것을 권장합니다.

---

## 섹션 9: 정합성 검증 (NocoDB vs 메이크샵 금액 대조)

### 목적
NocoDB 정산 합계와 메이크샵 실 결제 금액을 대조하여 누락/중복 없음을 확인합니다.

### NocoDB 정산 합계 조회

```bash
# tbl_Settlements에서 특정 기간 COMPLETED 정산 조회
curl -s -H "xc-token: ${NOCODB_API_TOKEN: .secrets.env 참조}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Settlements?where=(status,eq,COMPLETED)~and(partner_code,eq,PC_202602_001)&limit=100" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
records = data.get('list', [])
total_order = sum(r.get('order_amount', 0) for r in records)
total_commission = sum(r.get('commission_amount', 0) for r in records)
total_reserve = sum(r.get('reserve_amount', 0) for r in records)
print(f'결제 총액: {total_order:,}원')
print(f'수수료 총액: {total_commission:,}원')
print(f'적립금 총액: {total_reserve:,}원')
print(f'레코드 수: {len(records)}건')
"
```

### 메이크샵 주문 금액 대조

```bash
# 메이크샵 오픈 API로 주문 목록 조회
curl -s -X POST "https://openapi.makeshop.co.kr/list/open_api_process.html" \
  -H "Shopkey: {SHOPKEY}" \
  -H "Licensekey: {LICENSEKEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "get_order_list",
    "s_date": "2026-02-01",
    "e_date": "2026-02-28",
    "status": "완료",
    "category_id": "022"
  }' | python3 -m json.tool
```

### 검증 체크리스트

| 항목 | NocoDB | 메이크샵 | 일치 |
|------|--------|----------|------|
| 완료 주문 건수 | | | ☐ |
| 총 결제 금액 | | | ☐ |
| PENDING 레코드 수 | | | ☐ |
| 중복 settlement_id | 없음 | - | ☐ |

### WF-05 5c 정합성 검증 (자동)

WF-05의 5c 배치(매일 00:00)가 자동으로 NocoDB vs 메이크샵 적립금 정합성을 검증합니다:
- n8n 실행 내역 > WF-05 > `Integrity Check` 노드 결과 확인
- 불일치 발견 시 텔레그램으로 관리자에게 알림 발송

---

## 전체 검증 완료 체크리스트

| 섹션 | 내용 | 상태 |
|------|------|------|
| 1 | 테스트 상품 등록 + NocoDB 매핑 | ☐ |
| 2 | 결제 완료 + 주문번호 메모 | ☐ |
| 3 | WF-05 실행 내역 확인 | ☐ |
| 4 | tbl_Settlements 레코드 검증 | ☐ |
| 5 | D+3 시뮬레이션 → status=COMPLETED | ☐ |
| 6 | process_reserve API 성공 응답 | ☐ |
| 7 | 파트너 마이페이지 적립금 증가 | ☐ |
| 8 | 환불 시나리오 확인 | ☐ |
| 9 | NocoDB vs 메이크샵 정합성 | ☐ |

---

## 알려진 이슈 및 해결 방법

### 이슈 1: WF-05 수수료율 불일치
- **현상**: WF-05 코드의 SILVER=10%, 확정 정책=20%
- **해결**: n8n UI에서 WF-05 > "Calculate Commission" 노드 직접 편집
  ```javascript
  const COMMISSION_RATES = {
    SILVER:   { commissionRate: 0.20, reserveRate: 0.80 },
    GOLD:     { commissionRate: 0.25, reserveRate: 0.80 },
    PLATINUM: { commissionRate: 0.30, reserveRate: 0.80 }
  };
  ```

### 이슈 2: NocoDB n8n 네트워크 연결 끊김
- **현상**: WF-05 실행 시 NocoDB 호출 타임아웃
- **해결**:
  ```bash
  ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
  docker network connect n8n_n8n-network nocodb
  ```

### 이슈 3: 메이크샵 IP 화이트리스트 미등록
- **현상**: process_reserve API `return_code: 9003`
- **해결**: 메이크샵 관리자 > 오픈 API > 접근 허용 IP에 `158.180.77.201` 추가

### 이슈 4: tbl_Classes 매핑 없음
- **현상**: WF-05에서 상품 조회 시 classData 없음 → 정산 미생성
- **해결**: NocoDB tbl_Classes에 `makeshop_product_id` 기준 레코드 추가

---

> 📌 **참고 문서**:
> - `docs/guides/commission-policy.md` — 수수료 정책 확정판
> - `docs/guides/nocodb-field-additions.md` — NocoDB 필드 구성
> - `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` — 정산 워크플로우
> - `docs/api-verification/reserve-api-result.md` — process_reserve API 검증 결과
