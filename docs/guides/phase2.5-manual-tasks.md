# Phase 2.5 수동 작업 가이드

> **목적**: 이 문서는 Phase 2.5 개발 전에 완료해야 하는 3가지 수동 작업의 단계별 가이드입니다.
> 대상: 메이크샵 관리자 + n8n 관리자
> 작성일: 2026-02-26

---

## 작업 1: 메이크샵 편집기에서 4개 페이지 js.js 재저장

### 목적

Phase 2.5에서 파트너클래스/상세/js.js (예약 WF-04 연동)와 파트너클래스/교육/js.js (answers 배열 방식)가 수정되었습니다.
메이크샵 편집기에서 최신 코드를 다시 저장해야 변경사항이 실제 서비스에 반영됩니다.

### 대상 페이지

| 페이지 이름 | 메이크샵 ID | 변경 내용 |
|-----------|-----------|---------|
| 클래스 목록 | 2606 | 크로스링크 절대경로 수정 |
| 클래스 상세 | 2607 | 예약 WF-04 연동 + 파트너 연락처 추가 |
| 파트너 신청 | 2609 | 크로스링크 절대경로 수정 |
| 파트너 교육 | 2610 | WF-10 answers 배열 방식 전환 |

### 단계별 가이드

#### 1단계: 메이크샵 관리자 로그인

1. `foreverlove.co.kr/shop/admin/main.html` 접속
2. 관리자 계정으로 로그인

#### 2단계: 개별 페이지 편집기 접속

1. 좌측 메뉴 → **홈페이지 관리** → **개별 페이지 관리**
2. 페이지 목록에서 대상 페이지 클릭 (예: "클래스 목록 2606")

#### 3단계: JS 탭에서 코드 교체

1. 편집기 상단 탭 중 **JS** 탭 클릭
2. 기존 내용 전체 선택 (Ctrl+A) → 삭제
3. 이 저장소의 해당 파일 내용을 붙여넣기:
   - 2606: `파트너클래스/목록/js.js`
   - 2607: `파트너클래스/상세/js.js`
   - 2609: `파트너클래스/파트너신청/js.js`
   - 2610: `파트너클래스/교육/js.js`
4. **저장** 버튼 클릭

> ⚠️ **주의**: HTML 탭이나 CSS 탭은 건드리지 않습니다. JS 탭만 교체합니다.

#### 4단계: 완료 확인

1. 해당 페이지 URL(`/shop/page.html?id=2607`)을 브라우저에서 새로고침
2. 브라우저 개발자도구(F12) → Console 탭에서 에러 없음 확인
3. 기능이 정상 작동하는지 간단히 테스트

---

## 작업 2: n8n WF-10 업데이트 (JSON 재임포트)

### 목적

WF-10 (파트너 교육 이수)의 Validate Input 노드가 answers 배열 방식으로 수정되었습니다.
(이전: `score/total` 파라미터 → 이후: `answers: [...]` 15개 정수 배열, 서버사이드 채점)

### 현재 WF-10 파일 위치

```
파트너클래스/n8n-workflows/WF-10-education-complete.json
```

이미 올바른 answers 배열 방식으로 업데이트되어 있습니다.

### 단계별 가이드: n8n UI에서 직접 노드 수정 (권장)

코드 노드만 수정하는 방법으로, 워크플로우 전체를 재임포트하지 않아도 됩니다.

#### 방법 A: n8n UI에서 직접 수정 (간단)

1. `https://n8n.pressco21.com` 접속 → 관리자 로그인
2. 워크플로우 목록에서 **"WF-10 Education Complete"** 클릭
3. **"Validate Input"** 노드 더블클릭
4. 기존 코드 전체 선택(Ctrl+A) → 삭제
5. `WF-10-education-complete.json`의 `wf10-validate-input` 노드의 `jsCode` 값을 붙여넣기

   아래 코드를 복사하여 붙여넣기:

```javascript
// ===================================================
// WF-10 Step 1: POST 본문 파싱 + 서버사이드 채점
// 필수 필드: member_id, answers (배열)
// 보안: CORRECT_ANSWERS / PASS_THRESHOLD 서버 고정 상수
// ===================================================

const input = $input.first().json;
const body = input.body || input;

const PASS_THRESHOLD = 11;
const TOTAL_QUESTIONS = 15;
const CORRECT_ANSWERS = [
  1,  // Q1: 꽃/식물을 건조압착해 평면 예술로 만드는 것
  1,  // Q2: 특수 보존 용액으로 생화의 아름다움을 오래 보존
  1,  // Q3: 얇고 수분 적은 꽃
  3,  // Q4: 고온 스팀 건조법 (해당하지 않는 것)
  2,  // Q5: 습기 차단, 직사광선 피해 서늘한 곳
  0,  // Q6: 재료/장비 안내와 환기 철저
  1,  // Q7: 4~8명
  1,  // Q8: 2~3시간
  1,  // Q9: 사전에 문자로 상세 안내
  1,  // Q10: 건조/경화 시간 안내, 안전한 포장 안내
  2,  // Q11: D+3 영업일 이내 적립금 지급
  1,  // Q12: 관리자 검수/승인 후 활성화
  1,  // Q13: 수업 전 전액 환불, 이후 규정에 따라
  1,  // Q14: 감사 답글 작성 가능
  1   // Q15: SILVER -> GOLD -> PLATINUM
];

function sanitizeText(str, maxLen) {
  if (!str) return '';
  maxLen = maxLen || 500;
  return String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().substring(0, maxLen);
}

const memberId = sanitizeText(body.member_id, 100);
const answersRaw = body.answers;

if (!memberId) {
  return [{ json: { _valid: false, _errorResponse: { success: false, error: { code: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' }, timestamp: new Date().toISOString() } } }];
}

if (!Array.isArray(answersRaw) || answersRaw.length !== TOTAL_QUESTIONS) {
  return [{ json: { _valid: false, _errorResponse: { success: false, error: { code: 'INVALID_SCORE', message: 'answers는 ' + TOTAL_QUESTIONS + '개 요소를 가진 배열이어야 합니다.' }, timestamp: new Date().toISOString() } } }];
}

for (let i = 0; i < answersRaw.length; i++) {
  const val = Number(answersRaw[i]);
  if (isNaN(val) || val < 0 || val > 3 || val !== Math.floor(val)) {
    return [{ json: { _valid: false, _errorResponse: { success: false, error: { code: 'INVALID_SCORE', message: 'answers의 각 값은 0~3 사이의 정수여야 합니다.' }, timestamp: new Date().toISOString() } } }];
  }
}

const answers = answersRaw.map(Number);
let score = 0;
for (let i = 0; i < TOTAL_QUESTIONS; i++) {
  if (answers[i] === CORRECT_ANSWERS[i]) score++;
}
const passed = score >= PASS_THRESHOLD;

return [{ json: { _valid: true, memberId, score, total: TOTAL_QUESTIONS, passed, passThreshold: PASS_THRESHOLD } }];
```

6. **Save** 클릭 → 워크플로우 활성화 상태 확인

#### 방법 B: 전체 JSON 재임포트 (대안)

1. n8n 워크플로우 목록에서 **"WF-10 Education Complete"** 클릭 → 설정 → **Export**로 현재 버전 백업
2. 상단 메뉴 → **Import from File** 클릭
3. `파트너클래스/n8n-workflows/WF-10-education-complete.json` 파일 선택
4. 임포트 완료 후 **Activate** 버튼 클릭

### 완료 확인 방법

```bash
# curl로 WF-10 테스트 (올바른 답안 배열로 테스트)
curl -s -X POST https://n8n.pressco21.com/webhook/education-complete \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "jihoo5755",
    "answers": [1,1,1,3,2,0,1,1,1,1,2,1,1,1,1]
  }' | python3 -m json.tool
```

예상 응답:
```json
{
  "success": true,
  "data": {
    "passed": true,
    "score": 15,
    "total": 15,
    "message": "..."
  }
}
```

> ⚠️ **보안**: answers 배열 방식으로 채점이 서버에서 이루어지므로, 클라이언트에서 점수를 임의로 조작할 수 없습니다.

---

## 작업 3: docker-compose.yml NocoDB 네트워크 통합

### 목적

현재 NocoDB는 n8n_n8n-network에 수동으로 연결해야 합니다. (`docker network connect n8n_n8n-network nocodb`)
Docker Compose를 재시작할 때마다 이 명령을 실행해야 하는 번거로움을 해소하기 위해,
docker-compose.yml에 NocoDB 네트워크 선언을 통합합니다.

### SSH 접속

```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
```

### 현재 상태 확인

```bash
# 현재 docker-compose.yml 위치 확인
ls ~/n8n/

# 현재 네트워크 연결 상태 확인
docker network inspect n8n_n8n-network | grep -E "Name|nocodb"
```

### 단계별 가이드

#### 1단계: docker-compose.yml 백업

```bash
cp ~/n8n/docker-compose.yml ~/n8n/docker-compose.yml.backup-$(date +%Y%m%d)
```

#### 2단계: docker-compose.yml 수정

`~/n8n/docker-compose.yml` 파일을 열어 nocodb 서비스 섹션에 networks 추가:

```bash
nano ~/n8n/docker-compose.yml
```

수정 전 (nocodb 서비스 예):
```yaml
  nocodb:
    image: nocodb/nocodb:latest
    container_name: nocodb
    ports:
      - "8080:8080"
    volumes:
      - nocodb_data:/usr/app/data
    restart: always
```

수정 후:
```yaml
  nocodb:
    image: nocodb/nocodb:latest
    container_name: nocodb
    ports:
      - "8080:8080"
    volumes:
      - nocodb_data:/usr/app/data
    restart: always
    networks:
      - n8n-network          # 추가: n8n 내부 네트워크에 자동 연결
```

파일 하단의 networks 섹션도 확인 (이미 있으면 수정 불필요):
```yaml
networks:
  n8n-network:
    name: n8n_n8n-network
```

#### 3단계: 변경사항 적용

> ⚠️ **주의**: 컨테이너가 잠깐 재시작됩니다. 트래픽이 적은 시간(새벽)에 진행 권장.

```bash
cd ~/n8n
docker compose down
docker compose up -d
```

#### 4단계: 완료 확인

```bash
# 네트워크 연결 확인
docker network inspect n8n_n8n-network | grep -A2 "nocodb"

# 컨테이너 상태 확인
docker ps

# n8n → nocodb 내부 통신 테스트
docker exec n8n_n8n_1 curl -s http://nocodb:8080/api/v1/auth/token/refresh | head -c 100
```

### 완료 기준

- `docker network inspect n8n_n8n-network`에서 nocodb가 포함되어 있음
- 서버 재시작 후에도 nocodb가 n8n 네트워크에 자동 연결됨
- n8n 워크플로우에서 NocoDB 호출이 정상 작동함

---

## 작업 완료 체크리스트

| 작업 | 완료 여부 | 완료일 |
|------|---------|-------|
| 메이크샵 2607(상세) js.js 재저장 | ☐ | |
| 메이크샵 2610(교육) js.js 재저장 | ☐ | |
| 메이크샵 2606(목록) js.js 재저장 | ☐ | |
| 메이크샵 2609(신청) js.js 재저장 | ☐ | |
| n8n WF-10 Validate Input 노드 수정 | ☐ | |
| docker-compose.yml NocoDB 네트워크 통합 | ☐ | |

---

> 📌 **다음 단계**: 이 3가지 작업이 완료된 후 Phase 2.5 개발(Task 293 강의등록폼, Task 291 예약연동)을 진행합니다.
