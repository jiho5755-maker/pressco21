# Flora Telegram Room Router 설정 가이드 v0.2

## 상태

이 문서는 이제 `legacy direct router` 기준이다.

메인 플로라를 복구하는 현재 권장 구조는 이 문서가 아니라 아래를 따른다.

- [flora-frontdoor-local-dev-worker-setup.ko.md](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/03_openclaw_docs/flora-frontdoor-local-dev-worker-setup.ko.md)

핵심 원칙:

- `@pressco21_openclaw_bot` 메인 수신은 서버 `flora-frontdoor`
- 로컬 맥북은 `flora-local-dev-worker`로만 개발 실행을 담당
- `run-flora-telegram-room-router.js`는 메인 봇에 쓰지 않는다

## 이 문서가 다루는 범위

room router는 아래처럼 `전용 개발 봇`이 따로 있을 때만 쓴다.

1. `Codex 개발 방`
2. `Claude Code 개발 방`

즉, 더 이상 `통합 비서 방`을 메인 플로라 ingress로 다루지 않는다.

## 왜 메인 플로라에는 쓰지 않는가

- 메인 봇을 서버 frontdoor와 로컬 room router가 동시에 polling 하면 `getUpdates 409` 충돌이 난다
- 예전 플로라의 강점은 `frontdoor가 먼저 메모를 구조화하는 것`인데, room router의 executive 방은 그냥 로컬 CLI 실행기로 흐르기 쉽다
- 개발 실행은 이미 `server dispatcher -> local dev worker queue` 구조가 더 안정적이다

## 권장 구성

- 메인 비서: 서버 `flora-frontdoor`
- 개발 방 route: 서버 `flora-codex-room`, `flora-claude-room`
- 실제 실행: 로컬 `flora-local-dev-worker`
- room router: 별도 실험용 dev bot에서만 사용

## 추가된 파일

- [run-flora-telegram-room-router.js](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/run-flora-telegram-room-router.js)
- [flora-telegram-room-router.config.example.json](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/04_reference_json/flora-telegram-room-router.config.example.json)
- [install-flora-telegram-room-router-launchagent.sh](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/install-flora-telegram-room-router-launchagent.sh)

## 준비물

### 1. 전용 개발 봇 하나

중요:

- `@pressco21_openclaw_bot`를 그대로 쓰면 안 된다
- room router는 전용 dev bot을 따로 만들어야 한다
- BotFather에서 `privacy mode`는 꺼두는 편이 좋다

### 2. 텔레그램 방 3개

예시 이름:

- `플로라 Codex 개발실`
- `플로라 Claude 개발실`

### 3. 로컬에 설치되어 있어야 하는 CLI

이 맥북 기준 확인된 것:

- `codex`
- `claude`
- `node`

## 설정 파일 만들기

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub

cp 04_reference_json/flora-telegram-room-router.config.example.json \
   04_reference_json/flora-telegram-room-router.config.json

open -a TextEdit 04_reference_json/flora-telegram-room-router.config.json
```

처음에는 아래만 확인하면 된다.

- `botUsername`
- `rooms.executive.workingDirectory`
- `rooms.codex.workingDirectory`
- `rooms.claude.workingDirectory`

기본 예시는:

- Codex/Claude 개발 방 -> `pressco21` 루트

## 환경변수 준비

예시:

```bash
export PRESSCO21_DEV_ROUTER_BOT_TOKEN='여기에_dev_router_봇_토큰'
export PRESSCO21_DEV_ROUTER_REGISTER_CODE='dev-router-room-2026'
```

## healthcheck

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub

node 06_scripts/run-flora-telegram-room-router.js \
  --config 04_reference_json/flora-telegram-room-router.config.json \
  --healthcheck
```

정상이면 아래 성격의 정보가 나온다.

- bot username
- state/log path
- room 목록

## 수동 실행

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub

node 06_scripts/run-flora-telegram-room-router.js \
  --config 04_reference_json/flora-telegram-room-router.config.json
```

이 터미널이 켜져 있는 동안 플로라 봇이 3개 방을 polling 한다.

## 각 방 등록

플로라가 들어간 각 방에서 아래처럼 한 번씩 보낸다.

통합 비서 방:

```text
/register executive flora-room-2026
```

Codex 개발 방:

```text
/register codex flora-room-2026
```

Claude 개발 방:

```text
/register claude flora-room-2026
```

이 등록은 방별 `chat_id -> room` 매핑을 state 파일에 저장한다.

따라서 chat id를 수동으로 찾을 필요가 없다.

## 등록 후 사용법

### Codex 개발 방

```text
offline-crm-v2 기준으로 최근 거래내역 관련 코드 흐름 정리해줘
```

또는

```text
/run openclaw-project-hub에 텔레그램 운영 문서를 추가해줘
```

### Claude 개발 방

이 방은 기존 로컬 Claude Code 작업을 이어가는 용도다.

기본 예시는 `claude -c`를 쓰도록 되어 있어서, 현재 작업 디렉토리의 가장 최근 Claude 대화를 계속 이어가려 한다.

```text
지금 진행 중인 makeshop-skin 작업 이어서 다음 단계 진행해줘
```

## 지원 명령

- `/help`
- `/rooms`
- `/register <room> <code>`
- `/status`
- `/session`
- `/new`
- `/run <요청>`
- 일반 텍스트

## 세션 동작

각 방은 자기 세션을 따로 가진다.

- 통합 비서 방은 Codex 세션을 이어간다.
- Codex 방은 Codex 세션을 이어간다.
- Claude 방은 Claude 세션을 이어간다.

즉 방이 달라도 문맥이 섞이지 않는다.

단, Claude 방 기본 예시는 `sessionMode = continue`라서 room router가 저장한 세션보다 `현재 작업 디렉토리의 최신 Claude 대화`를 우선 이어간다.

이 모드는 지금 로컬 Cursor/터미널에서 이미 진행 중인 Claude Code 작업을 텔레그램으로 이어받고 싶을 때 가장 적합하다.

## launchd 자동 실행

환경변수 파일을 하나 만든다.

예시:

```bash
cat > ~/.flora-telegram-room-router.env <<'EOF'
export FLORA_TELEGRAM_BOT_TOKEN='여기에_플로라_봇_토큰'
export FLORA_TELEGRAM_REGISTER_CODE='flora-room-2026'
EOF
```

그다음 설치:

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub

bash 06_scripts/install-flora-telegram-room-router-launchagent.sh \
  04_reference_json/flora-telegram-room-router.config.json \
  ~/.flora-telegram-room-router.env
```

그러면 로그인 시 자동 실행되고, 죽어도 다시 올라오게 설정된다.

로그 확인:

- `~/Library/Logs/flora-telegram-room-router.log`
- `~/Library/Logs/flora-telegram-room-router.err.log`

## 추천 운영 원칙

### 1. 메인 플로라는 서버 frontdoor 하나로 유지

중앙 비서 감각을 살리려면 메인 ingress는 다시 하나로 모아야 한다.

### 2. room router는 dev bot 전용으로만 사용

메인 봇을 공유하지 않는다.

### 3. 개발 실행은 가능하면 local dev worker를 우선 사용

server dispatcher -> local queue -> local CLI 구조가 더 안정적이다.

## 이 구조가 Cursor 자동입력보다 나은 이유

- Cursor 창 포커스에 의존하지 않는다.
- 맥북 화면이 잠겨도 CLI 기반 운용이 더 안정적이다.
- 세션 ID를 방별로 관리할 수 있다.
- 나중에 `/approve`, `/stop`, `/diff` 같은 명령을 붙이기 쉽다.

## 다음 단계

1. 실제 방 3개를 등록해서 응답 확인
2. 통합 비서 방 프롬프트를 더 회사 맞춤형으로 다듬기
3. Codex/Claude 방에 `/new`, `/status` 사용 습관 정착
4. 필요하면 파일 첨부 처리 추가
