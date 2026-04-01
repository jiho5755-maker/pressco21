# flora-todo-mvp

Sprint 2.5 기준으로 구조화 품질 위에 운영 안정화를 추가합니다. 핵심은 dedupe, review/admin 수정 경로, 엔터티 추출, summary 왜곡 방지입니다.

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
- `app/api/admin/review` 검토 목록 API
- `app/api/admin/tasks/[id]` task 수정/ignore API
- `app/api/admin/reminders/[id]` reminder 수정/삭제 API
- `app/api/admin/followups/[id]` follow-up 수정/삭제 API
- `src/db/schema` Drizzle 테이블 정의
- `src/db/repositories` 저장소 경계
- `src/services` ingest / summary / review 비즈니스 로직
- `src/lib/structured-parser.ts` 규칙 기반 구조화 엔진
- `src/lib/entity-extractor.ts` 사람/업체/프로젝트 alias 추출
- `src/lib/fingerprint.ts` dedupe hash / signature 생성
- `tasks`, `reminders`, `followups` 후속 확장 경계

## API

- `POST /api/ingest`
- `GET /api/summary`
- `GET /api/admin/review?limit=50`
- `PATCH /api/admin/tasks/:id`
- `PATCH / DELETE /api/admin/reminders/:id`
- `PATCH / DELETE /api/admin/followups/:id`

`POST /api/ingest`는 `dryRun: true`를 주면 DB 저장 없이 구조화 결과만 확인할 수 있습니다.

## Demo

- `npm run demo:structure` 샘플 문장을 구조화 결과로 출력
- `npm run seed:demo` 샘플 문장을 실제 DB에 적재
- `npm run verify:sprint2` 구조화 미리보기 + 실제 DB 적재 + summary 확인
- `npm run verify:dedupe` 동일 입력 재처리 검증
- `npm run verify:review` review 수정 후 반영 검증
- `npm run verify:entities` 사람/업체/프로젝트 추출 비교 출력
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
