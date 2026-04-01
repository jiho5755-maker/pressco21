# flora-todo-mvp

Sprint 2 기준으로 원문 메모를 안정적으로 저장하면서, 규칙 기반으로 Task / Reminder / Follow-up까지 구조화합니다.

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
- `app/api/summary` 구조화 반영 집계 API
- `src/db/schema` Drizzle 테이블 정의
- `src/db/repositories` 저장소 경계
- `src/services` ingest / summary 비즈니스 로직
- `src/lib/structured-parser.ts` 규칙 기반 구조화 엔진
- `tasks`, `reminders`, `followups` 후속 확장 경계

## API

- `POST /api/ingest`
- `GET /api/summary`

`POST /api/ingest`는 `dryRun: true`를 주면 DB 저장 없이 구조화 결과만 확인할 수 있습니다.

## Demo

- `npm run demo:structure` 샘플 문장을 구조화 결과로 출력
- `npm run seed:demo` 샘플 문장을 실제 DB에 적재
- `npm run demo:ingest` 로컬 API로 ingest 호출
- `npm run demo:summary` 로컬 API로 summary 호출

## 예시

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "sourceChannel": "telegram",
    "sourceMessageId": "tg-1001",
    "text": "다음주 월요일 불량품 수거, 안소영 연락 대기",
    "dryRun": true
  }'
```
