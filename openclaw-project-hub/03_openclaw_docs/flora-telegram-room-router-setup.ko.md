# Flora Telegram Room Router 설정 가이드 v0.1

## 목표

이 구조의 목표는 하나다.

- 텔레그램 봇은 `플로라` 하나만 유지
- 텔레그램 방은 3개로 분리
- 방마다 다른 runner를 호출

권장 방 구성:

1. `통합 비서 방`
2. `Codex 개발 방`
3. `Claude Code 개발 방`

사용자는 모두 같은 플로라 봇과 대화하지만, 내부적으로는 방별로 다른 세션과 다른 CLI를 쓴다.

현재 추천 기본값은 이렇다.

- 통합 비서 방도 `Codex CLI + GPT-5.4`
- Codex 개발 방도 `Codex CLI + GPT-5.4`
- Claude 개발 방만 `Claude Code CLI`

## 왜 이 방식이 가장 안정적인가

이 방식은 `Cursor 화면 자동 조작` 같은 GUI 자동화에 의존하지 않는다.

대신 아래처럼 동작한다.

- 통합 비서 방 -> Codex CLI + Flora 프롬프트
- Codex 개발 방 -> Codex CLI
- Claude Code 개발 방 -> Claude CLI

즉, 밖에서 텔레그램으로 말해도 로컬 맥북에서 직접 CLI가 실행된다.

## 추가된 파일

- [run-flora-telegram-room-router.js](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/run-flora-telegram-room-router.js)
- [flora-telegram-room-router.config.example.json](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/04_reference_json/flora-telegram-room-router.config.example.json)
- [install-flora-telegram-room-router-launchagent.sh](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/install-flora-telegram-room-router-launchagent.sh)

## 준비물

### 1. 플로라 봇 하나

이미 `플로라 / @pressco21_openclaw_bot`를 쓰고 있다면 그대로 써도 된다.

중요:

- 같은 봇을 여러 방에 다 넣는다.
- BotFather에서 `privacy mode`는 꺼두는 편이 좋다.

### 2. 텔레그램 방 3개

예시 이름:

- `플로라 통합 비서`
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

- 통합 비서 방 -> `openclaw-project-hub`
- Codex/Claude 개발 방 -> `pressco21` 루트

## 환경변수 준비

예시:

```bash
export FLORA_TELEGRAM_BOT_TOKEN='여기에_플로라_봇_토큰'
export FLORA_TELEGRAM_REGISTER_CODE='flora-room-2026'
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

### 통합 비서 방

그냥 평소처럼 보낸다.

```text
이번 주 운영 우선순위를 5줄로 정리해줘
```

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

### 1. 봇은 하나만 유지

사용자 입장에서는 플로라가 하나의 중앙 코파일럿처럼 보이는 것이 좋다.

### 2. 방은 기능별로 나눈다

문맥 충돌을 줄이려면 개발방과 운영방은 분리하는 편이 낫다.

### 3. 통합 비서 방도 Codex를 쓴다

ChatGPT Pro 활용을 최대화하려면 통합 비서 방과 Codex 개발 방을 둘 다 Codex로 두는 편이 맞다.

### 4. Claude 방은 기존 로컬 작업 이어받기 전용으로 둔다

Claude 토큰이 필요한 이유가 `이미 로컬에서 이어오던 Claude Code 작업`을 원격으로 계속하기 위한 것이라면, Claude 방은 그 목적에만 집중시키는 게 가장 깔끔하다.

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
