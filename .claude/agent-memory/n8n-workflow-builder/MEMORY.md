# n8n Workflow Builder Agent Memory

## n8n API 배포 패턴 (검증 완료)
- API Key: DB `user_api_keys` 테이블에서 확인 (label: `pressco21_automation`)
- POST body에 `active` 필드 포함하면 400 에러 → 반드시 제거
- 워크플로우 생성: `POST /api/v1/workflows` (active 필드 없이)
- 워크플로우 활성화: `POST /api/v1/workflows/{id}/activate`
- 워크플로우 삭제: `DELETE /api/v1/workflows/{id}`
- curl에서 한글 파일 경로 사용 시 문제 발생 가능 → `/tmp/`에 영문명으로 복사 후 사용
- **Python으로 jsCode 생성 시 주의**: zsh가 Python 문자열 내 `$input`, `${var}` 등을 셸 변수로 치환함 → heredoc(`<< 'PYEOF'`)으로 감싸거나, `2>/dev/null`로 경고 무시 후 생성 결과 검증 필수
- **jsCode 셸 치환 재발 사례 (2026-03-02)**: 중소벤처24 정규화 노드에서 `${d.slice(0,4)}`, `${id}` 등 백틱 템플릿 리터럴이 셸에 의해 빈 문자열로 치환됨 + `!`가 `\!`로 이스케이프됨. **배포 후 반드시 서버 코드를 재검증**할 것
- **검증된 안전 패턴 (2026-03-02)**: Python raw string(`r"""..."""`)으로 jsCode를 감싸면 `$input`, `$json` 등이 셸 치환 없이 안전하게 보존됨. JS 템플릿 리터럴 대신 문자열 연결(`+`)을 사용하면 더 안전

## 월간리포트 워크플로우
- **워크플로우 ID**: `oeIOcnDYpSDmbkKp`
- **스케줄**: 매월 1일 10:00 KST (cron: `0 1 1 * *` UTC)
- **기능**: 지난달 수집 공고 집계 → 관련도/상태/소스별 분류 → 텔레그램 리포트
- **노드 5개**: Schedule Trigger → Code_날짜계산 → Airtable_월간조회 → Code_월간집계 → Telegram_월간리포트
- **Airtable**: Base `app6CynYU5qzIFyKl`, Table `tblkFgVYyDr6lWJNs`, Cred ID `JK1lFxPvfCkIFclZ`
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/govt-support/workflows/정부지원사업_월간리포트.json`

## 마감임박 재알림 워크플로우 v2.0 (GS-806 고도화, 2026-03-01)
- **워크플로우 ID**: `3TXzJ9AADTf9oNL6`
- **스케줄**: 매일 09:30 KST (cron: `30 0 * * *` UTC)
- **기능**: D-7/D-3/D-1/D-0 4단계 마감알림 + 기간만료 자동처리
- **노드 19개**: Schedule → 2개 병렬 브랜치
  - 브랜치1: NocoDB 조회(70+, 8일 이내) → Code(D-Day 분류) → IF → Switch(5출력) → 단계별 Telegram + NocoDB PATCH(마감알림_단계) / expired → NocoDB PATCH(상태=기간만료)
  - 브랜치2: NocoDB 기간만료 조회 → IF → 벌크 업데이트
- **중복 알림 방지**: `마감알림_단계` 필드로 stageOrder 비교 (D-7=1 < D-3=2 < D-1=3 < D-0=4), 동일/더 긴급 단계 이미 발송 시 스킵
- **NocoDB 필드 추가**: `마감알림_단계` (SingleLineText, 2026-03-01 추가)
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/govt-support/workflows/정부지원사업_마감임박_재알림.json`

### n8n API 접근 패턴 (2026-03-01 업데이트)
- SSH: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- API Key: DB `user_api_keys` 테이블 `"apiKey"` 컬럼 (postgres user: n8nuser)
- 외부 접근 가능 확인 (2026-03-01): `X-N8N-API-KEY` 헤더로 직접 curl 호출 성공
- API Key는 JWT 형식 (eyJ... 으로 시작)

## WF#1 정부지원사업 자동수집 (3개 소스 + 키워드점수화 + 배치 Gemini, 2026-03-03 업데이트)
- **워크플로우 ID**: `7MXN1lNCR3b7VcLF`
- **노드 41개**: 3개 API 병렬 수집 → Merge → 중복제거 → 사전필터 → **키워드 점수화** → **상위 30건 선별** → 원문 크롤링 → **배치 Gemini 분석 (1회 호출)** → 관련도 분기 → NocoDB 저장 + Telegram
- **2026-03-03 키워드 사전 점수화 추가**: 200건 전체 Gemini 전송 시 HTTP 413 오류 → 키워드 점수화로 상위 30건만 선별 후 Gemini 호출
  - `키워드 점수화` (Code, runOnceForEachItem): HIGH_KW(+20/+10), MID_KW(+10/+5), LOW_KW(-15) 점수 부여
  - `상위 30건 선별` (Code, runOnceForAllItems): kwScore 내림차순 정렬 후 상위 30건 slice
  - `배치 Limit`, `프롬프트 있는것만1` 노드 삭제 (불필요)
  - `HTTP Body 준비`: ...item.json spread 제거 → requestBody만 전달 (경량화)
  - `Gemini 응답 파싱`: 원본 참조 `$('사전 필터링1')` → `$('상위 30건 선별')` 변경
- **2026-03-02 배치 전환**: Gemini 건별 N회 호출 → 단일 배치 1회 호출로 전환
  - Gemini 프롬프트 생성: `runOnceForAllItems` 모드, 전체 공고를 JSON 배열로 묶어 단일 프롬프트 생성
  - gemini 분석1: `maxOutputTokens: 20000`
  - Gemini 응답 파싱: `runOnceForAllItems` 모드, 1개 배치 응답 → N개 아이템으로 확장 (scoreMap 패턴)
- **2026-03-02 수정**: 중소벤처24 API/정규화 노드 제거 (셸 치환 버그 반복 + 데이터 품질 문제), Merge 4→3 입력으로 변경
- **2026-03-02 수정**: 날짜 필터에 endDate OR 조건 추가 — `(postDate 14일 이내) OR (endDate >= 오늘)` 둘 중 하나면 통과
- **3개 수집 소스**:
  1. 기업마당 API (bizinfo.go.kr) - crtfcKey=FmSrV3
  2. K-Startup API (apis.data.go.kr) - 공공데이터포털 serviceKey
  3. 보조금24 API (api.odcloud.kr) - 동일 serviceKey
- **Merge 노드**: `3개 API 통합` (numberInputs=3)
- **GS-802 원문 크롤링 (2026-03-01 추가)**:
  - 파이프라인: 회사정보 통합1 → `공고 원문 크롤링` (HTTP, continueOnFail) → `원문 파싱 & 데이터 병합` (Code) → Gemini 프롬프트 생성
  - 크롤링 실패 시 워크플로우 중단 없이 API 요약 정보만 사용
  - HTML → 텍스트 추출 (script/style/nav/header/footer 제거), 3,000자 제한
  - NocoDB 필드 추가: `원문내용` (LongText), `원문_크롤링여부` (Checkbox)
- **GS-804 Gemini 프롬프트 v2 (2026-03-01 추가)**:
  - `회사정보 조회` 노드: Code(하드코딩) → HTTP Request(NocoDB 회사_프로파일 테이블 `mptlhf2fqskxwkk`)
  - 시스템 프롬프트: 회사명/업종/업종코드/소재지/직원수/연매출/설립연도/주요사업/고민사항/보유인증/수혜이력 동적 주입
  - 유저 프롬프트: 공고 기본정보 + 원문내용 포함
  - 출력 12필드: 기존 9 + 신청자격_충족여부 + 신청성공가능성 + 핵심신청자격
  - NocoDB 필드 추가: `신청자격_충족여부`(SingleSelect), `신청성공가능성`(SingleSelect), `핵심신청자격`(LongText), `신청자격_불일치사항`(LongText)
  - 텔레그램 알림에 성공가능성/자격충족여부/핵심신청자격 표시 추가
- **파일**: `정부지원사업_Pressco21.json`

## WF#7 주간 TOP5 공고 리포트 (GS-805, 2026-03-01)
- **워크플로우 ID**: `FedVm1QWsvUeUjUn`
- **스케줄**: 매주 금요일 17:00 KST (cron: `0 8 * * 5` UTC)
- **기능**: 이번 주 수집 공고 중 관련도 50+ 상위 5건 텔레그램 리포트
- **노드 7개**: Schedule → Code(날짜) → HTTP(NocoDB 조회, continueOnFail) → Code(TOP5+메시지) → IF → Telegram(리포트/없음)
- **NocoDB where**: `(수집일시,gte,{yyyy-MM-dd})~and(상태,neq,기간만료)~and(관련도점수,gte,50)` + sort=-관련도점수 + limit=20
- **정렬**: 1차 관련도점수 내림차순, 2차 신청성공가능성(높음>보통>낮음)
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/govt-support/workflows/정부지원사업_주간TOP5리포트.json`

### n8n CLI execute 주의사항 (2026-03-01 발견)
- `docker exec n8n n8n execute --id {wfId}`는 Task Broker 포트(5679) 충돌 발생
- 기존 n8n 프로세스가 죽을 수 있음 → **절대 사용 금지**
- 컨테이너 복구: `cd /home/ubuntu/n8n && docker compose up -d`
- 수동 테스트는 n8n UI에서 직접 실행하는 것이 안전

### 서울시 API 조사 결과 (2026-03-01)
- 서울 열린데이터광장(data.seoul.go.kr): 소상공인/중소기업 지원사업 전용 API 없음
- SBA(서울경제진흥원): 공식 API/RSS 없음
- 기업마당 API `areaNm=서울` 파라미터: 파라미터 유효하나 서울 공고 데이터 거의 없음
- 중소벤처24 `smes.go.kr/fnct/apiReqst/extPblancInfo`: 공고정보 조회 API 발견, 인증키 없이 호출 가능

## F1 워크플로우 (텔레그램 -> 노션 할 일 등록)

### 노드 ID 매핑
- `node-trigger`: TelegramBot (트리거)
- `node-parse`: 메시지 파싱 (Code)
- `node-switch`: 커맨드 라우터 (Switch, 5개 output)
- `node-gemini-call`: Gemini AI 파싱 (HTTP Request, continueOnFail=true)
- `node-gemini-parse`: Gemini 응답 파싱 (Code)
- `node-ai-success`: AI 성공? (If, boolean)
- `node-ai-to-parsed`: AI결과 변환 (Code, true 경로)
- `node-ai-fallback`: AI 폴백 파서 (Code, false 경로)
- `node-find-project`: 프로젝트 검색 (HTTP, Notion API)
- `node-project-result`: 프로젝트 매칭 결과 (Code)
- `node-find-calendar` ~ `node-reply`: 캘린더 조회 -> 할 일 생성 -> 회신

### AI 파싱 파이프라인 (2026-02-25 추가)
- Gemini 2.0 Flash 사용, `$env.GEMINI_API_KEY` 환경변수 필요
- 타임아웃 5초, continueOnFail로 실패 시 기존 Regex 폴백
- responseMimeType: 'application/json'으로 구조화 출력 강제
- AI 폴백 파서: node-parse의 기존 파싱 결과를 그대로 전달 (usedAI: false)
- 확인 메시지에 usedAI===false 시 "기본 파서 사용" 표시

### 프로젝트 매칭 결과 노드 주의사항
- AI결과 변환 또는 AI 폴백 파서 두 경로에서 합류
- n8n에서 실행되지 않은 노드 $() 참조 시 에러 발생
- try/catch 체인으로 실행된 소스 노드를 탐색하는 패턴 사용

### Credential IDs
- Telegram: id="1", name="Telegram Bot"
- Notion API: id="2" (직접 사용 안 함, HTTP Request로 호출)
- Notion Header Auth: id="3" (워크플로우에서는 직접 헤더 설정)

### 워크플로우 파일 위치
- `/Users/jangjiho/Desktop/n8n-main/automation-project/workflows/telegram-todo-bot.json`
- 총 34개 노드, 27개 커넥션

## FA-001 강사회원 등급 자동 변경 v2.0 (homepage-automation)
- **워크플로우 ID**: `jaTfiQuY35DjgrxN`
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/homepage-automation/workflows/FA-001_강사회원_등급_자동변경.json`
- **스케줄**: 5분 간격
- **노드 24개**: Schedule → 그룹코드 조회 → NocoDB 조회(승인대기) → 레코드 분리 → IF → 식별 추출 → 회원 조회(ID/연락처) → 그룹 변경 → NocoDB PATCH(진행상태=승인완료 포함) → 텔레그램 → IF(이메일 존재) → 이메일 발송
- **NocoDB 조회 조건**: `(진행 상태,eq,승인대기)~and(n8n_처리완료,eq,0)` (2026-02-26 변경: 승인완료→승인대기)
- **NocoDB PATCH body**: `n8n_처리완료`, `n8n_처리일시`, `진행 상태: 승인완료` (2026-02-26 추가)
- **이메일 발송**: 이메일 필드 존재 시 SMTP로 승인 축하 이메일 자동 발송 (fa001-n20-check → fa001-n20-email)
- **SMTP Credential**: id=`31jTm9BU7iyj0pVx`, name=`PRESSCO21-SMTP-Naver`
- **텔레그램 Credential**: id=`RdFu3nsFuuO5NCff`, name=`Pressco메이크샵봇`

## FA-003 강사 반려 이메일 자동 발송 (homepage-automation)
- **워크플로우 ID**: `Ks4JvBC06cEj6b8b`
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/homepage-automation/workflows/FA-003_강사_반려_이메일_자동발송.json`
- **스케줄**: 5분 간격
- **노드 10개**: Schedule → NocoDB 조회(반려, n8n_반려알림=0) → 레코드 분리 → IF(Id) → IF(반려사유+이메일) → 이메일 발송 → NocoDB PATCH(n8n_반려알림=true) → 텔레그램 완료/보류 알림
- **NocoDB 조회 조건**: `(진행 상태,eq,반려)~and(n8n_반려알림,eq,0)`
- **이메일 내용**: 반려 사유 + 서류 보완 안내 + 재신청 링크 (NocoDB form URL)
- **SMTP Credential**: id=`31jTm9BU7iyj0pVx`, name=`PRESSCO21-SMTP-Naver`
- **텔레그램 Credential**: id=`RdFu3nsFuuO5NCff`, name=`Pressco메이크샵봇`

## F010 무통장 미수금 자동관리 워크플로우 (homepage-automation)
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/homepage-automation/workflows/F010_무통장_미수금_자동관리.json`
- **스케줄**: 매 1시간
- **노드 15개**: Schedule Trigger → Code(날짜) → HTTP(주문조회) → Code(72h계산) → IF → 분기
  - true: Code(아이템화) → SplitInBatches → HTTP(취소) → Code(결과확인) → HTTP(알림톡,disabled) → Wait 1s → Loop back → Code(집계) → Telegram
  - false: Code(대기메시지) → Telegram
- **메이크샵 API 인증**: httpHeaderAuth credential 미사용, 헤더에 openapikey/licensekey 직접 입력 (FA-001 패턴)
- **알림톡**: disabled=true (PRESSCO_CANCEL 템플릿 검수 완료 전)
- **플레이스홀더**: SHOPKEY_PLACEHOLDER, LICENSEKEY_PLACEHOLDER, PROFILE_KEY_PLACEHOLDER
- **텔레그램 Credential**: id="PRESSCO21-Telegram-Bot" (서버에서 실제 ID 확인 필요)

### 메이크샵 API dual-header 패턴
- 메이크샵 API는 `openapikey`와 `licensekey` 두 헤더가 필요
- n8n httpHeaderAuth는 단일 헤더만 지원 → sendHeaders로 수동 추가가 안정적
- FA-001에서 검증된 패턴: `sendHeaders: true` + `headerParameters.parameters`에 Shopkey/Licensekey 직접 입력

## F030 SNS 콘텐츠 캘린더 리마인더 (homepage-automation)

### F030a 일일 리마인더
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/homepage-automation/workflows/F030a_SNS_콘텐츠_일일리마인더.json`
- **스케줄**: 매일 21:00 KST (cron: `0 12 * * *` UTC)
- **노드 6개**: Schedule → Code(날짜) → HTTP(내일예정) → HTTP(오늘미완성) → Code(메시지) → Telegram
- **순차 실행**: 날짜계산 → 내일예정 → 오늘미완성 → 메시지조합 (이전 노드 결과는 `$('노드이름')` 참조)
- **Notion DB**: 콘텐츠 캘린더 `312d119f-a669-8101-8340-dc7991e3e805`
- **Notion Credential**: placeholder `NOTION_CREDENTIAL_ID` (서버에서 실제 httpHeaderAuth ID로 교체 필요)
- **텔레그램 Credential**: id=`eS5YwFGpbJht6uCB`, name=`PRESSCO21-Telegram-Bot`

### F030b 주간 리포트
- **파일**: `/Users/jangjiho/Desktop/n8n-main/pressco21/homepage-automation/workflows/F030b_SNS_콘텐츠_주간리포트.json`
- **스케줄**: 매주 일요일 20:00 KST (cron: `0 11 * * 0` UTC)
- **노드 6개**: Schedule → Code(주간날짜) → HTTP(이번주) → HTTP(다음주) → Code(리포트) → Telegram
- **웨딩 시즌 이벤트 캘린더**: Code 노드에 하드코딩 (1~12월 이벤트)
- **Notion DB/Credential**: F030a와 동일

### Notion API HTTP Request 패턴 (검증된 패턴)
- `authentication: "genericCredentialType"`, `genericAuthType: "httpHeaderAuth"`
- `sendHeaders: true` + `Notion-Version: 2022-06-28` 헤더 추가
- `sendBody: true`, `specifyBody: "json"`, `jsonBody: "={{ JSON.stringify({...}) }}"`
- 순차 실행 시 이전 노드 참조: `$('노드이름').first().json.fieldName`
- 직전 노드 참조: `$json.fieldName` 또는 `$input.first().json`
