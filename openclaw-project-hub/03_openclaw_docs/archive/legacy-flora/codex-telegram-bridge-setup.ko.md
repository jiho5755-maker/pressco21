# Codex Telegram Bridge 설정 가이드 v0.1

## 목적

이 문서는 로컬 맥북의 `Codex CLI`를 텔레그램 전용 대화방 하나로 원격 실행하는 최소 구조를 정리한다.

목표는 아래 하나다.

`Telegram 방 1개 -> 로컬 Codex CLI -> 결과를 같은 방으로 회신`

이 구조가 먼저 안정화되면, 같은 패턴으로 `Claude Code 방`을 별도로 추가하면 된다.

## 왜 이렇게 나누는가

통합 비서, Codex 개발봇, Claude Code 개발봇을 한 대화창에 몰아넣으면 아래 문제가 생긴다.

- 문맥이 섞여서 작업 추적이 어렵다.
- 어떤 봇이 어떤 작업을 수행했는지 흐려진다.
- 개발 지시와 운영 지시가 한 화면에서 충돌한다.

그래서 권장 구조는 아래다.

1. 통합 비서 전용 방 1개
2. Codex 개발 전용 방 1개
3. Claude Code 개발 전용 방 1개

중요한 점은 `방만 분리`하는 것이 아니라, 가능하면 `봇 토큰도 분리`하는 것이다.

이유:

- Telegram Bot API의 `getUpdates`는 토큰 단위로 큐를 소비한다.
- 같은 봇 토큰을 여러 프로세스가 동시에 polling 하면 업데이트를 서로 먹어버릴 수 있다.
- 따라서 `Codex 방용 봇 1개`, `Claude 방용 봇 1개`가 운영상 가장 안정적이다.

## 이번 MVP 범위

이번 브리지는 아래만 지원한다.

- 텍스트 메시지 수신
- `/register`로 현재 톡방 승인
- 승인된 방에서만 Codex 실행
- 같은 톡방의 이전 Codex 세션 이어서 실행
- `/new`로 세션 초기화
- 긴 응답은 여러 메시지로 분할 회신

이번 버전에서 일부러 제외한 것:

- 파일 업로드/다운로드
- 이미지 첨부
- 여러 방 동시 분기 운영
- 관리자 승인 플로우
- 장기 실행 중간 스트리밍

## 추가된 파일

- [run-codex-telegram-bridge.js](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/06_scripts/run-codex-telegram-bridge.js)
- [codex-telegram-bridge.config.example.json](/Users/jangjiho/workspace/pressco21/openclaw-project-hub/04_reference_json/codex-telegram-bridge.config.example.json)

## 사전 준비

### 1. Telegram 방 만들기

추천 이름:

- `Codex 개발실`
- `Codex 원격 작업실`
- `Codex CLI`

### 2. BotFather에서 전용 봇 만들기

권장:

- Codex 방 전용 봇을 따로 만든다.
- 예: `@pressco21_codex_dev_bot`

### 3. 그룹방이면 privacy mode를 꺼야 한다

그룹방에서 일반 텍스트를 그대로 Codex에 보내고 싶다면 BotFather에서 `privacy mode`를 꺼야 한다.

끄지 않으면 봇은 일반 대화를 못 받고 `/command` 류만 받는다.

즉, 자연어 작업 지시를 그대로 보내고 싶다면 이 단계가 필요하다.

### 4. 로컬 환경변수 준비

토큰은 파일에 박지 말고 환경변수로 둔다.

예시:

```bash
export PRESSCO21_CODEX_TELEGRAM_BOT_TOKEN='123456:replace-me'
export PRESSCO21_CODEX_TELEGRAM_REGISTER_CODE='codex-room-2026'
```

## 설정 파일 만들기

예시 파일을 복사한다.

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
cp 04_reference_json/codex-telegram-bridge.config.example.json \
   04_reference_json/codex-telegram-bridge.config.json
```

수정할 항목:

- `bridgeName`
- `botUsername`
- `workingDirectory`

처음에는 `allowedChatIds`를 비워둬도 된다.

이유:

- 새 방에서 `/register 등록코드`를 보내면 state 파일에 승인된 chat id가 자동 저장된다.
- chat id를 수동으로 찾을 필요가 없다.

## 실행 전 점검

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
node 06_scripts/run-codex-telegram-bridge.js \
  --config 04_reference_json/codex-telegram-bridge.config.json \
  --healthcheck
```

정상이면 아래 성격의 정보가 출력된다.

- workingDirectory
- statePath
- logPath
- codexBinary
- executionMode

## 브리지 실행

```bash
cd /Users/jangjiho/workspace/pressco21/openclaw-project-hub
node 06_scripts/run-codex-telegram-bridge.js \
  --config 04_reference_json/codex-telegram-bridge.config.json
```

이 프로세스가 살아 있는 동안 텔레그램 메시지를 polling 한다.

## 텔레그램에서 최초 등록

새로 만든 Codex 방에서 아래처럼 보낸다.

```text
/register codex-room-2026
```

성공하면 이 방은 승인된다.

그다음부터는 아래처럼 일반 문장을 그대로 보낼 수 있다.

```text
openclaw-project-hub 기준으로 텔레그램 개발봇 구조를 정리해줘
```

또는 명시적으로:

```text
/run 현재 저장소에서 텔레그램 관련 문서와 스크립트를 요약해줘
```

## 지원 명령

- `/help` : 도움말
- `/status` : 현재 실행 상태와 세션 상태
- `/session` : 현재 Codex 세션 ID 확인
- `/new` : 현재 톡방의 세션 초기화
- `/run <요청>` : 명시 실행
- 일반 텍스트 : `/run`과 동일

## 세션 동작 방식

이 브리지는 톡방별로 마지막 `Codex session id`를 저장한다.

그래서 같은 방에서 연속으로 말하면 이전 Codex 흐름을 이어서 실행하려고 시도한다.

필요할 때만 `/new`로 세션을 끊으면 된다.

## 실행 모드

기본 예시는 `codex.executionMode = full-auto`다.

의미:

- Codex가 workspace-write sandbox 안에서 비교적 자연스럽게 작업한다.
- 처음부터 무제한 권한을 주지 않는다.

정말 필요할 때만 아래로 바꾼다.

```json
"executionMode": "danger-full-access"
```

이 모드는 더 강력하지만 위험도도 크다.

## 로그와 상태 파일

기본 경로:

- 상태 파일: `07_openclaw_workspace/codex-telegram-bridge/state.json`
- 로그 파일: `07_openclaw_workspace/codex-telegram-bridge/bridge.log`

상태 파일에는 아래가 저장된다.

- 마지막 update offset
- 승인된 chat id
- 방별 Codex session id
- 최근 실행 요약

## 운영 팁

### 1. 통합 비서와 개발봇은 분리

대표 운영 질문은 통합 비서 방으로 보내고, 코드 수정/스크립트 작성/리팩토링은 Codex 방으로 보낸다.

### 2. Claude Code 방은 복제해서 만들면 된다

이번 구조가 성공하면 아래만 바꾸면 된다.

- 새 봇 토큰
- 새 등록코드
- 새 설정 파일
- 실행 바이너리 또는 브리지 스크립트

### 3. 같은 봇 토큰을 여러 브리지에 재사용하지 않는 편이 낫다

업데이트 큐 충돌을 피하려면 에이전트별 토큰 분리가 가장 단순하다.

## 첫 테스트 추천 문장

```text
현재 작업 폴더를 기준으로 텔레그램 브리지 MVP 구조를 5줄로 요약해줘
```

그다음:

```text
이 저장소에 Codex 전용 텔레그램 방 운영 규칙 문서를 추가해줘
```

## 한계

- 브리지가 살아 있는 터미널 프로세스여야 한다.
- Telegram 장문 응답은 여러 조각으로 나뉜다.
- 스트리밍 중간 토큰은 아직 보내지 않는다.
- 파일 첨부 기반 작업은 아직 없다.

## 다음 단계 제안

1. `launchd`로 맥북 로그인 시 자동 실행
2. `/approve` 같은 위험 작업 승인 레이어 추가
3. 파일 첨부를 받아 작업 폴더에 저장하는 흐름 추가
4. Claude Code 전용 브리지 복제
