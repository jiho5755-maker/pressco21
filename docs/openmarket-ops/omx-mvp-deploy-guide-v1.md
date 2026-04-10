# OMX MVP Deploy Guide v1

> 작성일: 2026-04-09  
> 범위: 스마트스토어 + 메이크샵 문의/리뷰 승인형 응답 허브

---

## 1. 현재 MVP 상태

- OMX 프런트: `mini-app-v2 /omx`
- 주문 처리: 사방넷
- 응답 운영: 스마트스토어 + 메이크샵
- 채널톡/쿠팡/11번가: 현재 범위 제외

---

## 2. 배포 자산

### 2.1 프런트

- 코드: `mini-app-v2`
- runtime config:
  - 기본 파일: `mini-app-v2/public/omx-config.json`
  - 샘플 파일: `mini-app-v2/public/omx-config.sample.json`
- build-time env 샘플:
  - `mini-app-v2/.env.example`

### 2.2 n8n workflow

- `n8n-automation/workflows/automation/omx-smartstore-inquiries.json`
- `n8n-automation/workflows/automation/omx-smartstore-replies.json`
- `n8n-automation/workflows/automation/omx-makeshop-items.json`
- `n8n-automation/workflows/automation/omx-makeshop-replies.json`
- `n8n-automation/workflows/automation/omx-new-items-alert.json`

### 2.3 n8n upsert 스크립트

- `tools/openmarket/omx_n8n_upsert.py`

이 스크립트는 workflow 이름 기준으로 `create/update`를 자동 처리한다.

---

## 3. 생성된 운영 workflow ID

2026-04-09 생성 완료:

- 스마트스토어 fetch: `ziX2O7lkl8pyeKBW`
- 스마트스토어 send: `UQS8JOcWqMUtuJdq`
- 메이크샵 fetch: `XPGHCada6xaqXp1Y`
- 메이크샵 send: `fbkI72Jy0teldzy2`

2026-04-10 생성 대상:

- 신규 문의 알림: `I63edSHDF50cdCEB`

현재 상태:

- 4개 모두 `inactive`
- 이유:
  - 운영 n8n env에 `OMX_SHARED_KEY`, `NAVER_COMMERCE_*`, `MAKESHOP_*` 주입 및 proxy 연결 확인 전
  - 현재 workflow는 fail-closed로 동작하므로 shared key가 없으면 요청을 거부한다.

---

## 4. 운영 적용 순서

1. n8n 운영 환경 변수 추가
   - `OMX_SHARED_KEY`
   - `NAVER_COMMERCE_CLIENT_ID`
   - `NAVER_COMMERCE_CLIENT_SECRET`
   - `MAKESHOP_DOMAIN`
   - `MAKESHOP_SHOPKEY`
   - `MAKESHOP_LICENSEKEY`
   - `OMX_NOTIFY_CHAT_ID`
   - 선택:
     - `OMX_NOTIFY_APP_URL`
     - `OMX_NOTIFY_INCLUDE_MAKESHOP_REVIEWS`
     - `OMX_NOTIFY_MAX_LINES`
     - `OMX_NOTIFY_INITIAL_SEED_QUIET`

2. workflow upsert

```bash
python3 tools/openmarket/omx_n8n_upsert.py \
  n8n-automation/workflows/automation/omx-smartstore-inquiries.json \
  n8n-automation/workflows/automation/omx-smartstore-replies.json \
  n8n-automation/workflows/automation/omx-makeshop-items.json \
  n8n-automation/workflows/automation/omx-makeshop-replies.json \
  n8n-automation/workflows/automation/omx-new-items-alert.json
```

3. openclaw nginx reverse proxy 추가

- `mini.pressco21.com/api/omx/` → `https://n8n.pressco21.com/webhook/openmarket/`
- `x-omx-source-key`는 nginx가 서버단에서 주입
- 브라우저에는 shared key를 배포하지 않는다

4. n8n에서 4개 핵심 workflow 활성화

5. 신규 문의 알림 workflow 검토

- 현재 workflow ID: `I63edSHDF50cdCEB`
- 첫 실행 기본값은 `기준선만 저장하고 무음`이다.
- 알림은 텔레그램으로 전송된다.
- 상세 가이드는 `docs/openmarket-ops/omx-notify-poller-v1.md` 참조

6. OMX runtime config 작성

`mini-app-v2/public/omx-config.sample.json` 기준으로 `omx-config.json`을 채운다.

예시:

```json
{
  "forceMock": false,
  "smartstore": {
    "fetchUrl": "/api/omx/smartstore/inquiries?onlyPending=true",
    "sendUrl": "/api/omx/smartstore/replies"
  },
  "makeshop": {
    "fetchUrl": "/api/omx/makeshop/items",
    "sendUrl": "/api/omx/makeshop/replies"
  }
}
```

7. 프런트 배포

```bash
cd mini-app-v2
bash scripts/deploy.sh
```

8. 첫 검증 순서
   - OMX `/omx` 접속
   - `DRY_RUN` 상태에서 새로고침
   - 스마트스토어/메이크샵 source card 확인
   - 문의 1건 선택 후 `DRY_RUN`
   - 승인된 테스트 케이스 1건만 `LIVE_SEND`
   - 신규 문의 알림 workflow는 수동 실행 후 텔레그램 포맷 확인
   - 문제가 없으면 alert workflow 활성화

---

## 5. 현재까지 검증된 것

- 스마트스토어
  - 실계정 문의 조회 검증 완료
  - 상품 문의 답변 실발송 검증 완료
- 메이크샵
  - 실read 검증 완료
  - write는 공식 문서 검증 완료, 실write는 승인된 케이스 1건 남음
- OMX 프런트
  - 실조회/일괄 선택/DRY_RUN/LIVE_SEND UI 구현 완료
  - runtime config fallback 추가 완료

---

## 6. 남은 MVP 체크리스트

- 운영 n8n env 주입
- workflow activation
- 신규 문의 alert workflow upsert + activation
- 신규 문의 alert 첫 정시 실행 결과 확인
- 스마트스토어 fetch endpoint 실응답 확인
- 메이크샵 fetch endpoint 실응답 확인
- 메이크샵 inquiry/review 실write 1건 검증
- mini.pressco21.com `/omx` 실사용 테스트
