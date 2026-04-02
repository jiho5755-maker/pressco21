# PRESSCO21 원가 원장 운영 방식

> 상태: working draft v0.1
> 작성일: 2026-03-21

## 1. 왜 별도 원가 원장이 필요한가

현재 회사에는 `확정 원가 양식`이 따로 없고, 필요할 때마다 임시 계산을 해 온 이력이 있다.

그래서 앞으로는 아래 3개를 분리해서 운영한다.

- `연계마스터 / SKU마스터`
  - 상품 찾기
  - SKU, branduid, 사방넷코드, 판매가 조회
- `원가 원장 엑셀`
  - 사람이 검토하는 기준 원장
  - 상품별 고정 원가 항목과 검토 상태 관리
- `reviewed.json`
  - OpenClaw가 실제로 읽는 확정 원가 규칙

즉, 연계마스터는 `식별용`, 원가 원장은 `검토용`, reviewed.json은 `실행용`이다.

## 2. 생성되는 파일

- 원가 원장 엑셀
  - `output/spreadsheet/pressco21-product-cost-ledger.seed.xlsx`
- 검토 결과 JSON
  - `docs/reference/openclaw-pressco21-product-cost-profiles.reviewed.json`
- 시드 JSON
  - `docs/reference/openclaw-pressco21-product-cost-profiles.seed.json`

## 3. 시트 구성

### README

- 사용 순서
- 검토 상태 의미
- 내보내기 명령

### base_profiles

- 조달 유형별 기본 프로필
- 예: `china_import_floral`, `china_import_resin_liquid`

### existing_products

- 현재 시드된 기존 상품 검토용
- 안정 상품은 시드 원가가 미리 들어가고
- 충돌 상품은 `확정원가입력`을 사람이 채워야 한다

### new_products

- 신규 상품 템플릿
- 기본 프로필별로 미리 행을 만들어 둠
- 상품명, 확정원가, 판매가만 우선 넣으면 계산이 나온다

## 4. 검토 상태 의미

- `seeded_review_pending`
  - 시드값은 들어갔지만 아직 확정 전
- `conflict_needs_review`
  - 연계마스터 이력 충돌이 있어서 사람 확인 필요
- `review_in_progress`
  - 검토 중
- `verified_ready`
  - OpenClaw가 신뢰 가능한 기준으로 사용 가능
- `new_draft`
  - 신규 상품 초안
- `archived`
  - 비활성

## 5. 기존 상품 운영 방식

1. `existing_products`에서 상품을 찾는다.
2. `시드원가`, `현재판매가`, `원가이력`, `검토메모`를 본다.
3. 확정 가능한 상품이면 `확정원가입력`을 채우고 `verified_ready`로 바꾼다.
4. 내보내기 후 OpenClaw가 reviewed.json을 우선 사용한다.

## 6. 신규 상품 운영 방식

1. `new_products`에서 맞는 기본 프로필 행을 고른다.
2. 상품명, SKU/branduid, 확정원가, 판매가를 채운다.
3. 필요하면 포장비, 검품비, 관세율 등 고정값을 수정한다.
4. 계산COGS, 원가율, 매출총이익률을 확인한다.
5. `verified_ready`로 바꾸고 내보낸다.

## 7. 계산 원칙

### `purchase_cny`

- 매입가(CNY)
- 환율
- 지사관리비
- 운임
- 관세
- 포장비
- 검품비
- 손실충당
- VAT 포함 여부

### `purchase_krw`

- 매입가(KRW)
- 단위당 배송비
- 포장비
- 검품비
- 손실충당

### `cogs`

- 이미 확정된 단위 원가를 그대로 사용

## 8. 내보내기

```bash
cd /Users/jangjiho/workspace/OMX\(오_마이_코덱스\)/oh-my-codex

python3 scripts/export-pressco21-cost-ledger.py \
  --input output/spreadsheet/pressco21-product-cost-ledger.seed.xlsx \
  --output docs/reference/openclaw-pressco21-product-cost-profiles.reviewed.json \
  --seed docs/reference/openclaw-pressco21-product-cost-profiles.seed.json
```

## 9. OpenClaw 동작 방식

- reviewed.json이 있으면 그것을 우선 읽는다.
- reviewed.json이 없으면 seed.json을 읽는다.
- `draft_conflict_from_master`는 자동 원가 입력을 막는다.
- `verified_ready`는 상품별 원가 규칙의 우선 기준이 된다.

## 10. 현재 한계

- 상위 20개 상품만 시드됨
- 대부분이 아직 `conflict_needs_review`
- 원가 원장은 처음부터 쌓는 단계라 검토 습관이 중요함

## 11. 권장 다음 단계

1. 상위 20개 상품의 `확정원가입력` 채우기
2. `verified_ready` 상품을 5개 이상 만들기
3. 그 뒤 Telegram 대화형 라우팅에서 가격/마진 검토를 front door로 연결하기
