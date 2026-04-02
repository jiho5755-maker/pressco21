# flora-todo-mvp

Sprint 3 기준으로 홈 대시보드와 review desk를 함께 운영합니다. 핵심은 "지금 뭐부터 해야 하는지"를 홈에서 바로 보고, review/admin 수정 루프로 이어지는 최소 운영 관제 화면입니다.

## 시작

1. `cp .env.example .env`
2. `docker compose up -d`
3. `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`
4. `npm install`
5. `npm run db:generate`
6. `npm run db:migrate`
7. `npm run db:check`
8. `npm run dev`

`npm run db:migrate`는 fresh DB뿐 아니라 예전 로컬 스키마에도 Sprint 2.5 컬럼과 unique index를 idempotent하게 맞춥니다.

## 현재 구조

- `/` Sprint 3 홈 대시보드. summary 카드, 최우선/오늘/이번주/대기/일정 임박/최근 입력 섹션, task detail, explorer 필터/정렬을 제공합니다.
- `/review` Sprint 2.5 Review Desk. quick ingest, review queue, task/reminder/follow-up 수정 UI를 제공합니다.
- `app/api/dashboard` 홈 대시보드 데이터 API
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
- `GET /api/dashboard`
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
- `npm run verify:review` task 전 필드 수정 + reminder 수정 + follow-up 삭제 후 재ingest 유지 검증
- `npm run verify:entities` 사람/업체/프로젝트 alias 기반 추출 검증
- `npm run verify:sprint2` summary 왜곡 방지 케이스 검증
- `npm run verify:dashboard` 홈 대시보드 summary/section 기준 검증
- `npm run demo:ingest` 로컬 API로 ingest 호출
- `npm run demo:summary` 로컬 API로 summary 호출

## 재현용 점검 명령

```bash
docker compose up -d
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
npm run db:migrate
npm run db:check
npm run verify:entities
npm run verify:dedupe
npm run verify:review
npm run verify:sprint2
npm run verify:dashboard
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

서버 실행 후 브라우저에서 `http://127.0.0.1:3000/`에 접속하면 홈 대시보드에서 운영 우선순위와 상세를 확인할 수 있고, `http://127.0.0.1:3000/review`에서 review/admin 수정 흐름을 바로 검수할 수 있습니다.

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
