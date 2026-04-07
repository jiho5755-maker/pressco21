# PRD-AUTO: 기획안 자동 생성 WF 설정 가이드

## 개요

한줄 지시 → Claude API → NocoDB 저장 → 텔레그램 알림

**웹훅**: `POST https://n8n.pressco21.com/webhook/prd-generate`

## 1단계: NocoDB 테이블 생성

Shop-BI 베이스 (Postgres: shop_bi)에 `tbl_PRD_Drafts` 테이블 생성:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| title | SingleLineText | 기획안 제목 (자동 추출) |
| prd_type | SingleLineText | product-detail / event-promo / landing-page / sns-content |
| instruction | SingleLineText | 원본 한줄 지시 |
| content_md | LongText | 기획안 마크다운 전문 |
| status | SingleLineText | draft → approved → assigned → done |
| requested_by | SingleLineText | 요청자 |
| assignee | SingleLineText | 담당자 (다경/승해) |
| created_date | SingleLineText | 생성일 (YYYY-MM-DD) |
| approved_date | SingleLineText | 승인일 |
| notes | LongText | 대표 코멘트 |

## 2단계: 환경변수 설정

서버 `/home/ubuntu/n8n/.env`에 추가:

```bash
# PRD Auto Generator (OpenAI GPT)
OPENAI_API_KEY=sk-...         # OpenAI API 키 (ChatGPT Pro 계정)
NOCODB_PRD_PROJECT_ID=pbmo0os7rnvfd48
NOCODB_PRD_TABLE_ID=muvnh3lex8cp5qq
NOCODB_API_TOKEN=...          # 이미 설정됨
```

`docker-compose.yml`의 `environment` 섹션에도 추가 (이미 완료):
```yaml
OPENAI_API_KEY: ${OPENAI_API_KEY}
NOCODB_PRD_PROJECT_ID: ${NOCODB_PRD_PROJECT_ID}
NOCODB_PRD_TABLE_ID: ${NOCODB_PRD_TABLE_ID}
```

**모델**: `gpt-4.1` (OpenAI API). 변경하려면 WF의 "GPT 기획안 생성" 노드 jsonBody에서 model 값 수정.

## 3단계: WF 배포

```bash
bash n8n-automation/_tools/deploy.sh <WF_ID> n8n-automation/workflows/automation/prd-auto-generator.json
```

## 4단계: 테스트

```bash
# 상품 상세페이지
curl -X POST https://n8n.pressco21.com/webhook/prd-generate \
  -H "Content-Type: application/json" \
  -d '{"instruction": "기획안 상세페이지 레지너스 화이트 프레임 신상품"}'

# 이벤트
curl -X POST https://n8n.pressco21.com/webhook/prd-generate \
  -H "Content-Type: application/json" \
  -d '{"instruction": "기획안 이벤트 봄맞이 압화 클래스 30% 할인"}'

# SNS
curl -X POST https://n8n.pressco21.com/webhook/prd-generate \
  -H "Content-Type: application/json" \
  -d '{"instruction": "기획안 인스타 릴스 레진아트 완성작 모음"}'
```

## 5단계: 핸드오프 테스트 (3b-003)

기획안 생성 후 승인/배정:
```bash
# 승인
curl -X POST https://n8n.pressco21.com/webhook/prd-action \
  -H "Content-Type: application/json" \
  -d '{"text": "기획안 승인 #1"}'

# 담당자 배정
curl -X POST https://n8n.pressco21.com/webhook/prd-action \
  -H "Content-Type: application/json" \
  -d '{"text": "기획안 배정 #1 다경"}'
```

## 상태 플로우

```
draft → approved (대표 승인) → assigned (담당자 배정) → done (완료)
```

## 핸드오프 자동화

- 대표가 텔레그램에서 "기획안 승인 #N" → NocoDB status=approved
- 대표가 "기획안 배정 #N 다경/승해" → NocoDB assignee 설정 + 텔레그램 알림
- 웹훅: `POST /webhook/prd-action`

## 디자인팀 열람

NocoDB 공유 뷰 생성 → `status != draft` 필터 → 다경/승해 전용 URL

## WF 정보

- **WF ID**: `XuzLJ7fB4mGdJOrU`
- **NocoDB 테이블**: `muvnh3lex8cp5qq` (tbl_PRD_Drafts, Shop-BI Postgres)
