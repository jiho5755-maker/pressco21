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
# PRD Auto Generator
ANTHROPIC_API_KEY=sk-ant-...  # .secrets.env 참조
NOCODB_PRD_PROJECT_ID=...     # Shop-BI 프로젝트 ID
NOCODB_PRD_TABLE_ID=...       # tbl_PRD_Drafts 테이블 ID
NOCODB_API_TOKEN=...          # .secrets.env 참조
```

`docker-compose.yml`의 `environment` 섹션에도 추가:
```yaml
ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
NOCODB_PRD_PROJECT_ID: ${NOCODB_PRD_PROJECT_ID}
NOCODB_PRD_TABLE_ID: ${NOCODB_PRD_TABLE_ID}
NOCODB_API_TOKEN: ${NOCODB_API_TOKEN}
```

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

## 5단계: Flora 연동 (3b-003에서 구현)

Flora 텔레그램 봇에서 "기획안 ..." 패턴 감지 시 이 웹훅 호출.

## 상태 플로우

```
draft → approved (대표 승인) → assigned (담당자 배정) → done (완료)
```

## 디자인팀 열람

NocoDB 공유 뷰 생성 → `status != draft` 필터 → 다경/승해 전용 URL
