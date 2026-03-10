# PRESSCO21 수수료 정책

작성일: 2026-03-10

## 현재 기준

파트너클래스의 수수료 정책은 프론트에 노출하지 않는다. 운영 계산의 기준 문서는 이 파일과 `ROADMAP.md`다.

| 등급 | 수수료율 | 적립금 전환율 |
|------|---------|-------------|
| BLOOM | 25% | 80% |
| GARDEN | 20% | 80% |
| ATELIER | 15% | 80% |
| AMBASSADOR | 10% | 80% |

## 레거시 등급 매핑

운영 데이터에 아직 구 등급값이 남아 있어, 워크플로우에서는 아래처럼 alias로 처리한다.

| 레거시 값 | 현재 계산 기준 |
|----------|---------------|
| SILVER | BLOOM |
| GOLD | GARDEN |
| PLATINUM | ATELIER |

## 계산식

- `commission_amount = order_amount × commission_rate`
- `reserve_amount = commission_amount × reserve_rate`
- `reserve_rate`는 현재 전 등급 공통 `0.80`

## 적용 위치

- `WF-05-order-polling-batch`
- `WF-SETTLE Partner Settlement`
- 관리자 정산 응답 포맷 (`WF-ADMIN getSettlements`)

## 운영 메모

- `tbl_Partners.grade`에 아직 `SILVER`가 남아 있어도 정산 계산은 alias 매핑으로 동작한다.
- 수수료율은 파트너 프론트, 수강생 프론트 어디에도 직접 노출하지 않는다.
- Phase 3에서 등급 체계를 완전히 정리할 때까지는 canonical 등급과 legacy alias를 함께 유지한다.
