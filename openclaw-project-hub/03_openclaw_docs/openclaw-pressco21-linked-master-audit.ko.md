# PRESSCO21 연계마스터 정합성 점검

> 점검일: 2026-03-21
> 대상 파일: `/Users/jangjiho/Downloads/1688-SKU-메이크샵_연계마스터.xlsx`
> 참고 파일: `/Users/jangjiho/Downloads/SKU마스터_통합데이터.xlsx`

## 결론

연계마스터는 `상품 식별/연결 조회용`으로는 유용하지만, `확정 원가 원장`으로 바로 쓰기에는 위험하다.

핵심 이유는 다음과 같다.

- 같은 `SKU코드`가 여러 번 반복된다.
- 같은 `SKU + branduid + 상품명` 조합인데도 `최근단가(CNY)`가 여러 값으로 남아 있다.
- 매핑 누락 행도 아직 남아 있다.
- 판매가/카테고리 없이 부분매핑으로 끝난 행이 존재한다.

즉, 연계마스터는 `상품 연결 정보`와 `원가 이력 힌트`는 주지만, 단일 진실 원장(single source of truth)은 아니다.

## 정량 점검 요약

### 연계마스터

- 총 행 수: `2,477`
- `branduid` 누락: `148`
- 메이크샵 판매가 누락: `148`
- 메이크샵 카테고리 누락: `148`
- 중복 SKU 수: `324`
- 동일 SKU에서 원가가 여러 값으로 충돌하는 경우: `305`
- 동일 식별자(`SKU + branduid + 상품명`)에서 원가가 여러 값으로 충돌하는 경우: `305`

### SKU마스터_통합데이터

- 총 행 수: `2,477`
- 매핑상태 `완전매핑`: `2,329`
- 매핑상태 `부분매핑`: `148`
- 사방넷 상품코드 누락: `333`

## 왜 문제가 되는가

가격/마진 검토에서 정말 필요한 것은 아래 2종이다.

1. `연결 정보`
   - SKU
   - branduid
   - 사방넷 상품코드
   - 현재 판매가
   - 카테고리

2. `확정 원가 정보`
   - 조달 유형
   - 원가 항목별 고정값
   - 마지막 검증일
   - 누가 검증했는지
   - 어떤 변동값으로 계산하는지

연계마스터는 1번에 가깝고, 사용자가 원하는 구조는 2번까지 포함한 별도 원장이다.

## 추천 구조

### 1. Identifier Master

역할:

- 상품 찾기
- SKU / branduid / 사방넷 연결
- 자사몰 판매가 / 카테고리 조회

현재 후보:

- `연계마스터.xlsx`
- `SKU마스터_통합데이터.xlsx`

### 2. Cost Profile Master

역할:

- 상품별 원가 계산 규칙의 단일 원장
- 고정 원가 항목 저장
- 조달 유형별 계산 공식 저장

예시 필드:

- `productId`
- `productName`
- `skuCode`
- `branduid`
- `procurementType`
- `baseProfileId`
- `fixedCosts.packagingCost`
- `fixedCosts.inspectionCost`
- `fixedCosts.lossRate`
- `fixedCosts.branchManagementRate`
- `variableInputs.purchaseCny`
- `variableInputs.exchangeRate`
- `variableInputs.freightPerUnit`
- `variableInputs.tariffRate`
- `verifiedAt`
- `verifiedBy`
- `status`

### 3. Pricing Engine

역할:

- Identifier Master에서 상품 연결 정보 조회
- Cost Profile Master에서 확정 원가 규칙 조회
- 변동값만 질문
- 자동으로 COGS, 판매가, 마진율 계산

## 사용자 요구와 맞는 운영 방식

### A. 기존 상품

목표:

- 상품 하나만 찍으면 원가 관련 값이 자동으로 채워짐

필요 조건:

- 해당 상품의 `Cost Profile`이 미리 등록되어 있어야 함

실행 흐름:

1. 상품명/SKU 입력
2. Identifier Master에서 상품 식별
3. Cost Profile Master에서 고정 원가 항목 조회
4. 최신 변동값만 반영
5. 판매가/원가율/마진율 자동 계산

### B. 신규 상품

목표:

- 고정 조건은 미리 세팅
- 변동값만 질문

실행 흐름:

1. 조달 유형 선택
2. 기본 프로필 로드
3. 변동값만 입력
4. 자동 계산
5. 검토 후 상품 프로필로 승격 저장

## 권장 다음 단계

1. 연계마스터는 `조회용`으로만 유지한다.
2. 별도 `Product Cost Profile` 원장을 만든다.
3. 가격/마진 에이전트는 앞으로 Cost Profile을 우선 참조한다.
4. 연계마스터에서 원가 충돌이 있는 경우 자동 경고를 띄운다.

## 이번에 만든 운영 산출물

- 시드 원장 JSON
  - `docs/reference/openclaw-pressco21-product-cost-profiles.seed.json`
- 검토용 원가 원장 엑셀
  - `output/spreadsheet/pressco21-product-cost-ledger.seed.xlsx`
- OpenClaw 우선 참조 reviewed JSON
  - `docs/reference/openclaw-pressco21-product-cost-profiles.reviewed.json`
- 운영 가이드
  - `docs/openclaw-pressco21-cost-ledger-workflow.ko.md`

## 메모

이번 OpenClaw 가격/마진 검토 흐름에는 이미 `연계마스터 신뢰 경고`가 반영돼 있다. 같은 식별자에 원가 이력이 여러 개면, 연계마스터를 참고치로만 쓰도록 프롬프트에 전달한다.
