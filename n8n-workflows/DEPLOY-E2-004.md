# E2-004 WF-01 점진적 분리 — 배포 가이드

> 작성일: 2026-03-21
> 대상: n8n 운영 서버 (https://n8n.pressco21.com)

## 아키텍처 변경 요약

### Before (현재)
```
프론트엔드 → /webhook/class-api (WF-01 Router)
  → /webhook/class-api-read (WF-01A: getClasses + getClassDetail + getCategories 모놀리식)
  → /webhook/class-api-schedule (WF-01B)
  → /webhook/class-api-affiliation (WF-01C)
```

### After (분리 후)
```
프론트엔드 → /webhook/class-api (WF-01 Router, 변경 없음)
  → /webhook/class-api-read (WF-01A v2: 프록시 라우터)
      → /webhook/class-list (WF-CLASS-LIST: getClasses 전용)
      → /webhook/class-detail (WF-CLASS-DETAIL: getClassDetail 전용)
      → getCategories: WF-01A v2 내부에서 자체 처리
  → /webhook/class-api-schedule (WF-01B, 변경 없음)
  → /webhook/class-api-affiliation (WF-01C, 변경 없음)
```

## 프론트엔드 영향: 없음
- 모든 프론트엔드는 기존처럼 `/webhook/class-api`로 요청
- WF-01 Router → WF-01A v2 → 독립 WF 순으로 프록시 전달
- pressco21-core.js 변경 불필요

## 배포 순서 (중요: 순서 준수!)

### Step 1: 독립 WF 먼저 배포 (WF-CLASS-LIST, WF-CLASS-DETAIL)
```bash
# 로컬 → 서버 전송
scp -i ~/.ssh/oracle-n8n.key \
  /Users/jangjiho/workspace/pressco21/n8n-workflows/WF-CLASS-LIST.json \
  /Users/jangjiho/workspace/pressco21/n8n-workflows/WF-CLASS-DETAIL.json \
  ubuntu@158.180.77.201:/tmp/

# 서버 → 컨테이너
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 '
  docker cp /tmp/WF-CLASS-LIST.json n8n:/tmp/WF-CLASS-LIST.json &&
  docker cp /tmp/WF-CLASS-DETAIL.json n8n:/tmp/WF-CLASS-DETAIL.json
'

# n8n import (새 WF → ID 자동 할당)
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 '
  docker exec n8n n8n import:workflow --input=/tmp/WF-CLASS-LIST.json &&
  docker exec n8n n8n import:workflow --input=/tmp/WF-CLASS-DETAIL.json
'
```

### Step 2: n8n UI에서 새 WF 활성화
1. https://n8n.pressco21.com 접속
2. WF-CLASS-LIST 찾아서 Toggle ON (활성화)
3. WF-CLASS-DETAIL 찾아서 Toggle ON (활성화)
4. 각 WF가 webhook URL 정상 등록되었는지 확인:
   - `/webhook/class-list` → 200 응답
   - `/webhook/class-detail` → 200 응답

### Step 3: 독립 WF 직접 테스트
```bash
# getClasses 테스트
curl -s -X POST https://n8n.pressco21.com/webhook/class-list \
  -H 'Content-Type: application/json' \
  -d '{"action":"getClasses","page":1,"limit":5}' | python3 -m json.tool | head -20

# getClassDetail 테스트 (실제 class_id로 교체)
curl -s -X POST https://n8n.pressco21.com/webhook/class-detail \
  -H 'Content-Type: application/json' \
  -d '{"action":"getClassDetail","id":"CLS_001"}' | python3 -m json.tool | head -20
```

### Step 4: WF-01A를 v2 프록시로 교체
```bash
# WF-01A v2 전송 (기존 WF-01A ID: Ebmgvd68MJfv5vRt 유지)
scp -i ~/.ssh/oracle-n8n.key \
  /Users/jangjiho/workspace/pressco21/n8n-workflows/WF-01A-class-read-v2.json \
  ubuntu@158.180.77.201:/tmp/

ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 '
  docker cp /tmp/WF-01A-class-read-v2.json n8n:/tmp/WF-01A-class-read-v2.json &&
  docker exec n8n n8n import:workflow --input=/tmp/WF-01A-class-read-v2.json
'
```

### Step 5: WF-01A 재활성화
```bash
# n8n API로 재활성화
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 '
  docker exec n8n wget -qO- --method=POST \
    --header="Content-Type: application/json" \
    "http://localhost:5678/api/v1/workflows/Ebmgvd68MJfv5vRt/activate"
'
```

### Step 6: 통합 테스트 (기존 엔드포인트로)
```bash
# 기존 경로로 getClasses (프록시 경유)
curl -s -X POST https://n8n.pressco21.com/webhook/class-api \
  -H 'Content-Type: application/json' \
  -d '{"action":"getClasses","page":1,"limit":3}' | python3 -m json.tool | head -20

# 기존 경로로 getClassDetail (프록시 경유)
curl -s -X POST https://n8n.pressco21.com/webhook/class-api \
  -H 'Content-Type: application/json' \
  -d '{"action":"getClassDetail","id":"CLS_001"}' | python3 -m json.tool | head -20

# getCategories (WF-01A v2 자체 처리)
curl -s -X POST https://n8n.pressco21.com/webhook/class-api \
  -H 'Content-Type: application/json' \
  -d '{"action":"getCategories"}' | python3 -m json.tool
```

## 롤백 절차
WF-01A v2에서 문제 발생 시 기존 WF-01A로 즉시 복원:
```bash
scp -i ~/.ssh/oracle-n8n.key \
  /Users/jangjiho/workspace/pressco21/파트너클래스/n8n-workflows/WF-01A-class-read.json \
  ubuntu@158.180.77.201:/tmp/WF-01A-rollback.json

ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201 '
  docker cp /tmp/WF-01A-rollback.json n8n:/tmp/WF-01A-rollback.json &&
  docker exec n8n n8n import:workflow --input=/tmp/WF-01A-rollback.json
'
```

## 파일 목록
| 파일 | 설명 | 서버 WF ID |
|------|------|-----------|
| WF-CLASS-LIST.json | getClasses 전용 독립 WF | 배포 후 할당 |
| WF-CLASS-DETAIL.json | getClassDetail 전용 독립 WF | 배포 후 할당 |
| WF-01A-class-read-v2.json | WF-01A 프록시 라우터 v2 | Ebmgvd68MJfv5vRt |

## 2차 분리 예정 (getCategories, getAffiliations)
현재 WF-01A v2에서 getCategories는 자체 처리합니다.
2차 분리 시 WF-CATEGORY-LIST.json 독립 WF를 만들고 동일 프록시 패턴을 적용합니다.
WF-01C의 getAffiliations도 같은 패턴으로 WF-AFFILIATION-LIST.json으로 분리합니다.
