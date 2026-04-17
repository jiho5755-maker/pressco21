# naver-ads-mcp

네이버 검색광고 + 커머스(스마트스토어) + DataLab MCP 서버 및 HTTP API.

- **MCP 서버** (stdio): Claude Code에서 54개 도구로 광고 관리
- **HTTP API** (FastAPI): n8n에서 자동화 워크플로우 호출

## 실행

```bash
# MCP 서버 (Claude Code 연동)
naver-ads-mcp

# HTTP API (n8n 연동)
naver-ads-api
```

## 서버 배포 (Docker)

```bash
cp .env.example .env
# .env에 API 키 + API_SECRET_KEY 설정

docker compose up -d
```

n8n과 같은 `n8n-network`에서 `http://naver-ads-api:8400`으로 접근.

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 (인증 불필요) |
| POST | `/api/v1/daily-cycle` | 벌크 키워드 수확→가지치기→입찰최적화→예산체크 |
| POST | `/api/v1/budget-alert` | 예산 소진 경보 |
| POST | `/api/v1/quality-report` | 품질지수 리포트 |

인증: `X-Api-Key` 헤더에 `API_SECRET_KEY` 값.

## n8n 워크플로우

`n8n-workflows/F14-naver-sa-daily.json` — 매일 02:00 자동 최적화 + 14:00 예산 경보.

## 테스트

```bash
uv run pytest tests/ -v
```
