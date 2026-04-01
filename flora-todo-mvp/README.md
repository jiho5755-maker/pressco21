# flora-todo-mvp

Sprint 1 목표는 원문 메모를 안정적으로 저장할 수 있는 Postgres + Drizzle 기반의 입력/조회 뼈대를 만드는 것입니다.

## 시작

1. `cp .env.example .env`
2. `docker compose up -d`
3. `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`
4. `npm install`
5. `npm run db:generate`
6. `npm run db:migrate`
7. `npm run db:check`
8. `npm run dev`

## 현재 구조

- `app/api/ingest` 원문 메모 입력 API
- `app/api/summary` 기본 집계 API
- `src/db/schema` Drizzle 테이블 정의
- `src/db/repositories` 저장소 경계
- `src/services` Sprint 1 비즈니스 로직
- `tasks`, `reminders`, `followups` Sprint 2 확장용 경계

## API

- `POST /api/ingest`
- `GET /api/summary`

## 예시

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "sourceChannel": "telegram",
    "sourceMessageId": "tg-1001",
    "text": "이번 주까지 견적서 확인 후 업체 회신 필요"
  }'
```
