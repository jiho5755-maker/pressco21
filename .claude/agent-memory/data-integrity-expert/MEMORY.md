# data-integrity-expert 에이전트 메모리

## NocoDB 접속 정보
- Token: `${NOCODB_API_TOKEN: .secrets.env 참조}`
- Base URL: `https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf`

## 정산 비즈니스 규칙
- SILVER: commission_rate=20%, reserve_rate=80%
- GOLD: commission_rate=25%, reserve_rate=80%
- PLATINUM: commission_rate=30%, reserve_rate=80%
- 계산: commission_amount = order_amount × commission_rate / 100
- 계산: reserve_amount = commission_amount × reserve_rate / 100

## tbl_Settlements 핵심 필드
- `CreatedAt` (NocoDB 자동 생성, created_date 아님)
- `status`: pending / completed / failed
- `retry_count`: 재시도 횟수 (3 초과 시 수동 처리 필요)
- `order_id`: 중복 방지 키 (UNIQUE 체크 필수)

## NocoDB where 파라미터 문법
- 단일: `(status,eq,failed)`
- 복합: `(status,eq,failed)~and(retry_count,gte,3)`
- 정렬: `sort=-CreatedAt` (내림차순)
