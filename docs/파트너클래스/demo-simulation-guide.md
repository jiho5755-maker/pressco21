# S2-10 테스트 데이터 시뮬레이션 가이드

작성일: 2026-03-11

## 목적

파트너 섭외와 협회 제휴 미팅에서 "지금 당장 어떤 화면을 보여줄 수 있는지"를 빠르게 설명하기 위한 데모 세트를 만든다. 실제 운영 DB에는 `[TEST][DEMO]` 배치만 넣고, 공개 목록에 노출되지 않도록 클래스 상태는 `closed` 로 유지한다.

## 구성

- 배치 ID: `DEMO20260311`
- 입력 데이터
  - 파트너 5명
  - 클래스 15개
  - 일정 30개
  - 예약/정산 row 50개
  - 후기 30개
- 분포
  - 파트너 등급: `BLOOM 2 / GARDEN 2 / ATELIER 1`
  - 예약 상태: `PENDING_SETTLEMENT 30 / COMPLETED 15 / CANCELLED 5`
  - 키트 포함 클래스: 10개
  - 오프라인/온라인 혼합, 지역은 서울/경기/부산/대전/제주 시나리오를 반영

## 파일

- 생성기: `scripts/partnerclass-s2-10-demo-data.js`
- 데모 검증 러너: `scripts/partnerclass-s2-10-demo-runner.js`
- 산출물
  - `output/playwright/s2-10-demo/demo-dataset.json`
  - `output/playwright/s2-10-demo/demo-summary.json`
  - `output/playwright/s2-10-demo/demo-results.json`
  - `output/playwright/s2-10-demo/demo-student-flow.png`
  - `output/playwright/s2-10-demo/demo-partner-flow.png`
  - `output/playwright/s2-10-demo/demo-admin-flow.png`

## 실행 방법

### 1. 데이터 생성만 확인

```bash
node scripts/partnerclass-s2-10-demo-data.js
```

기본값은 `dry-run` 이고 JSON만 생성한다.

### 2. 라이브 NocoDB에 데모 데이터 입력

```bash
node scripts/partnerclass-s2-10-demo-data.js --apply
```

동작:

- 기존 `PC_DEMO_ / CL_DEMO_ / SCH_DEMO_ / STL_DEMO_ / RV_DEMO_` 배치를 먼저 삭제
- 새 데모 배치를 다시 입력
- 입력 후 각 테이블 건수를 검증

### 3. 로컬 데모 시나리오 검증

```bash
NODE_PATH=/Users/jangjiho/workspace/codex/node_modules \
node scripts/partnerclass-s2-10-demo-runner.js
```

검증 시나리오:

- 수강생
  - 목록 15개 렌더링
  - 서울 필터 후 3개 노출
  - 상세에서 `키트 포함` 예약 분기
  - 장바구니 2건 추가
- 파트너
  - 액션 보드 값 노출
  - `오늘 수업` 클릭 시 일정 관리 탭 이동
  - `후기 답변` 클릭 시 후기 관리 탭 이동
- 관리자
  - 정산 탭 요약/이력 노출
  - 정산 실행 실패 토스트까지 확인

### 4. 데모 데이터 정리

```bash
node scripts/partnerclass-s2-10-demo-data.js --cleanup
```

## 2026-03-11 기준 결과

### 라이브 NocoDB 입력

- 검증값
  - partners=5
  - classes=15
  - schedules=30
  - settlements=50
  - reviews=30

### Playwright 데모 검증

- 결과 파일: `output/playwright/s2-10-demo/demo-results.json`
- 핵심 확인값
  - 수강생 목록: 15개
  - 서울 필터 후: 3개
  - 상세 예약: `WITH_KIT`, 장바구니 2건
  - 파트너 액션 보드: 오늘 일정/키트 준비/미답변 후기 카드 모두 활성
  - 관리자 정산 탭: 요약 카드와 이력 5행 노출

## 데모 운영 원칙

- live NocoDB에 입력되지만, 클래스는 `closed` 상태라 공개 목록에 노출되지 않는다.
- 파트너 등급과 클래스 카테고리는 live DB enum 제약 때문에 저장값과 데모 표시값을 분리했다.
  - 파트너 grade 저장: `SILVER/GOLD/PLATINUM`
  - 데모 표시: `BLOOM/GARDEN/ATELIER`
  - 클래스 category 저장: 기존 허용 enum
  - 데모 표시: `부케/꽃다발/센터피스/리스/코사지`
- 따라서 영업/제휴 미팅에서는 로컬 Playwright 산출물과 fixture 기반 화면을 먼저 보여주고, live DB는 숫자/운영감 검증용으로 사용한다.

## 남은 리스크

- 메이크샵 디자인편집기에는 아직 저장하지 않았기 때문에, 실제 live 페이지에서 이 데모 데이터를 시각적으로 쓰는 단계는 아니다.
- 파트너 대시보드 액션 카드의 숫자 기준은 `예약 건수`와 `해당 수업 수`를 섞어 계산하므로, 데모에서는 카드 활성과 탭 이동에 더 중점을 둔다.
