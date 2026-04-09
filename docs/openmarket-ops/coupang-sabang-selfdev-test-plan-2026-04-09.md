# 쿠팡 OpenAPI 사방넷 + 자체개발 병행 테스트 플랜

> 작성일: 2026-04-09
> 목적: 쿠팡 OpenAPI를 `사방넷`과 `PRESSCO21 자체 프로그램`에서 함께 사용할 수 있는지 실제로 검증한다.

---

## 1. 현재 전제

- 사방넷 답변 기준:
  - 사방넷 쿠팡 연동은 `업체 입력 방식 > 연동업체 선택` 구조
  - 자체개발 API 경로로의 사방넷 연동은 `미지원`
  - 다만 `27.102.150.*` 대역을 사용할 수 있다고 안내함
- 쿠팡 공식 FAQ 기준:
  - `자체개발(직접입력)`에서는 IP를 최대 10개까지 등록 가능
- 외부 솔루션 가이드 기준:
  - 이미 다른 솔루션이 API를 사용 중이어도 `자체개발(직접입력)`으로 전환 후 여러 IP를 함께 넣는 방식 안내 사례가 있음

즉 이번 테스트는 `공식 지원 테스트`가 아니라 `실운영 가능성 검증`이다.

---

## 2. 쿠팡 화면 입력값

### 2.1 URL

1차 권장값:

- `https://n8n.pressco21.com`

사유:

- 현재 OMX/adapter 계열 서버 호출은 Oracle 서버 기반으로 설계되어 있음
- `n8n.pressco21.com`은 운영 중이며 200 응답 확인 완료
- 정적 UI 주소보다 API 처리 주체에 더 가까움

대안:

- `https://mini.pressco21.com`

비고:

- URL은 식별/기록 성격이 강하고, 실제 호출 허용은 IP가 핵심으로 보인다.

### 2.2 IP 주소

1차 테스트 입력안:

- `158.180.77.201`
- `27.102.150.*`
- `175.115.92.120`

권장 입력 형식:

```text
158.180.77.201,27.102.150.*,175.115.92.120
```

비고:

- `158.180.77.201`은 PRESSCO21 Oracle 서버 공인 IP 실측값
- `27.102.150.*`, `175.115.92.120`은 사방넷 안내값
- 쿠팡 입력창이 wildcard(`*`)를 허용하지 않으면, 이 단계에서 바로 중단하고 사방넷에 재문의해야 한다.
- wildcard가 불가한데 개별 IP만 허용하면, 사방넷 운영 IP 전체를 10개 이내로 압축할 수 없어 병행 운용 가능성이 매우 낮다.

---

## 3. 테스트 순서

### Step 1. 쿠팡 Wing 설정 변경

쿠팡 OpenAPI 수정 화면에서:

1. `자체개발(직접입력)` 선택
2. 업체명: `프레스코21`
3. URL: `https://n8n.pressco21.com`
4. IP 주소:
   - `158.180.77.201,27.102.150.*,175.115.92.120`
5. 저장

### Step 2. 반영 대기

- 쿠팡 공식 FAQ상 연동 정보/IP 변경 직후 바로 반영되지 않을 수 있다.
- 최소 `10~30분` 대기 후 read probe 실행

### Step 3. PRESSCO21 자체 프로그램 read probe

필요 정보:

- `Access Key`
- `Secret Key`
- `vendorId`
- 가능하면 `wingId`

실행 커맨드:

```bash
python3 tools/openmarket/coupang_live_test.py \
  --remote-host ubuntu@158.180.77.201 \
  --vendor-id <VENDOR_ID> \
  list-online-inquiries \
  --from-dt 2026-04-01 \
  --to-dt 2026-04-09
```

추가 확인:

```bash
python3 tools/openmarket/coupang_live_test.py \
  --remote-host ubuntu@158.180.77.201 \
  --vendor-id <VENDOR_ID> \
  list-call-center-inquiries \
  --from-dt 2026-04-01 \
  --to-dt 2026-04-09
```

### Step 4. 사방넷 유지 여부 확인

사방넷 쪽에서 확인할 항목:

1. 쿠팡 주문/문의 수집이 계속 정상인지
2. API 인증 오류 또는 IP 오류가 나는지
3. 기존 사방넷 연동 상태가 끊기지 않았는지

---

## 4. 판정 기준

### 성공

아래 2개를 동시에 만족하면 성공:

1. PRESSCO21 자체 read probe 성공
2. 사방넷 쿠팡 연동도 계속 정상

이 경우:

- `사방넷 + 자체개발 병행 가능`으로 임시 판정
- 이후 승인형 write 테스트를 별도로 진행

### 실패 A: 쿠팡 화면에서 저장 자체가 안 됨

예시:

- wildcard IP 형식 거부
- URL/IP 형식 오류

의미:

- 구조상 병행 운용이 어려울 가능성 큼

### 실패 B: 우리 프로그램만 실패

예시:

- HMAC 인증 성공했지만 IP not allowed
- 403/401 발생

의미:

- 입력한 IP가 실제 호출 IP와 다르거나
- 변경 반영이 덜 되었거나
- 쿠팡이 병행 사용을 허용하지 않는 케이스

### 실패 C: 사방넷이 끊김

의미:

- 사방넷이 말한 대로 `자체개발 API 경로는 미지원`
- 병행 운용 불가 판정

---

## 5. 즉시 실행 체크리스트

- [ ] 쿠팡 OpenAPI를 `자체개발(직접입력)`으로 전환
- [ ] URL `https://n8n.pressco21.com` 입력
- [ ] IP `158.180.77.201,27.102.150.*,175.115.92.120` 입력 시도
- [ ] 저장 가능 여부 확인
- [ ] Access Key / Secret Key / vendorId 확보
- [ ] `coupang_live_test.py` read probe 실행
- [ ] 사방넷 연동 유지 여부 확인

---

## 6. 다음 단계

테스트가 성공하면 바로 진행:

1. OMX capability matrix에서 쿠팡 inquiry를 `verified`로 승격
2. 승인형 reply payload를 OMX UI와 연결
3. 실제 고객 영향 없는 범위에서 write 검증 1회 실행

테스트가 실패하면:

1. 사방넷 유지
2. 쿠팡 direct API는 보류
3. 쿠팡은 사방넷 데이터 기반 보조 기능만 제공

---

## 7. 근거

- [omx-channel-capability-matrix-v1.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/omx-channel-capability-matrix-v1.md)
- [coupang_live_test.py](/Users/jangjiho/workspace/pressco21/tools/openmarket/coupang_live_test.py)
- https://developers.coupangcorp.com/hc/en-us/articles/26677385792409-When-issuing-an-OpenAPI-Key-can-I-register-one-Integator-and-one-self-development-direct-Input-at-the-same-time
- https://developers.coupangcorp.com/hc/en-us/articles/20376124594073-We-are-linking-with-Coupang-through-our-own-development-of-OpenAPI-What-is-the-route-to-register-an-IP-address
- https://docs.channel.io/bulsaja/ko/articles/%EC%BF%A0%ED%8C%A1-%EC%97%B0%EB%8F%99%ED%95%98%EA%B8%B0-%EC%BF%A0%ED%8C%A1-API-Key%EB%A5%BC-%EC%9D%B4%EB%AF%B8-%EC%82%AC%EC%9A%A9%ED%95%98%EA%B3%A0-%EC%9E%88%EB%8B%A4%EB%A9%B4-845f6507
