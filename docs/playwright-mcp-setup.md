# Playwright MCP Setup

2026-03-11 기준 로컬 Codex/Claude 환경에서 `Transport closed`가 반복될 때 쓰는 안정화 메모.

## 증상

- Codex MCP 도구 호출 시 `tool call failed ... Transport closed`
- 기본 Playwright MCP 설정에서 번들 `chrome-headless-shell` 크래시가 발생할 수 있음
- macOS 로그에 `chrome-headless-shell-*.ips` 리포트가 남음

## 원인

- 기본 브라우저가 번들 headless shell 로 뜨면서 macOS 26.3 환경에서 비정상 종료
- 이전 `@playwright/mcp` 프로세스와 `mcp-chrome` 크롬 프로필 잔여 세션이 누적
- `latest` 직접 호출은 세션마다 동작 편차가 생길 수 있음

## 권장 설정

Codex는 `~/.codex/config.toml`, 프로젝트 로컬은 `.mcp.json`에서 아래 기준을 사용한다.

- package: `@playwright/mcp@0.0.68`
- launch: `npx -y`
- browser: `chrome`
- mode: `--headless --isolated`
- artifact dir: `output/playwright/mcp`

## 확인 명령

```bash
codex mcp list
codex mcp get playwright
```

정상 예시는 아래 값이 보이면 된다.

```text
command: npx
args: -y @playwright/mcp@0.0.68 --browser chrome --headless --isolated --output-dir /Users/jangjiho/workspace/pressco21/output/playwright/mcp
```

## 잔여 프로세스 정리

```bash
pkill -9 -f playwright-mcp || true
pkill -9 -f "@playwright/mcp" || true
pkill -9 -f "ms-playwright/mcp-chrome" || true
```

## 검증 방법

현재 세션 MCP가 이미 죽어 있으면, 새 Codex 세션에서 다시 확인한다.

```bash
codex exec --dangerously-bypass-approvals-and-sandbox \
  -C /Users/jangjiho/workspace/pressco21 \
  -m gpt-5.4 \
  "Use the Playwright MCP tool to open https://example.com and reply with only the page title."
```

추가 검증 예시:

```bash
codex exec --dangerously-bypass-approvals-and-sandbox \
  -C /Users/jangjiho/workspace/pressco21 \
  -m gpt-5.4 \
  "Use the Playwright MCP tool to open https://www.foreverlove.co.kr/shop/page.html?id=2606 and reply with only the page title."
```

## 참고

- 기존 세션이 죽어 있으면 설정 파일을 바꿔도 현재 대화 세션의 MCP는 바로 살아나지 않을 수 있다.
- 이 경우 새 Codex 세션 또는 앱 재시작 후 다시 호출한다.
