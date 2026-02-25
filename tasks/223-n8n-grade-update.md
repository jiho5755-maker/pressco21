# Task 223: WF-13 파트너 등급 자동 업데이트 n8n 워크플로우 (뼈대)

> **Phase**: 2-C (n8n + NocoDB)
> **담당**: gas-backend-expert
> **상태**: 구현 완료
> **생성일**: 2026-02-25
> **산출물**: `파트너클래스/n8n-workflows/WF-13-grade-update.json`, `tasks/223-n8n-grade-update.md`

---

## 1. 개요

WF-13 파트너 등급 자동 업데이트 워크플로우는 PRESSCO21의 파트너 성과 기반 등급 자동 승급 시스템입니다.

### 목적
- 매일 오전 6시 자동 실행
- 모든 활성 파트너(status=active)의 성과 집계
- 등급 기준 판정 (SILVER → GOLD → PLATINUM)
- 등급 변경 시 파트너에게 이메일 알림

### 범위 제한
**⚠️ 실제 등급 기준 수치는 회사 파트너 정책 확정 후 별도 고도화 예정**

현재는 **뼈대 구조만** 구현합니다:
- 조회 로직: NocoDB tbl_Partners + tbl_Settlements 집계
- 검토/변경건수 카운트 + 텔레그램 알림
- TODO 주석: 실제 grade Update는 비활성화 (placeholder)

---

## 2. 워크플로우 아키텍처

### 트리거
- **Schedule Trigger**: 매일 오전 6시 (Asia/Seoul)
- Cron: `0 6 * * *`

### 노드 플로우 (13개 노드)

```
Schedule Trigger (매일 06:00 KST)
  ↓
1. HTTP Request: Get All Partners
   - NocoDB tbl_Partners: status=active 전체 조회
   ↓
2. Code: Parse Partners
   - 파트너 목록 파싱
   - 빈 배열 체크 → IF 분기
   ↓
3. IF: Partners Found?
   ├─ [False] → 6번 노드로 (대상 없음)
   └─ [True] ↓
4. Loop: For Each Partner
   ├─ 4a. HTTP Request: Get Partner Settlements
   │     NocoDB tbl_Settlements:
   │     - partner_code={partnerId}
   │     - status=COMPLETED
   │     조회
   │
   ├─ 4b. Code: Aggregate & Judge Grade
   │     집계:
   │     - completedCount = 정산 레코드 수
   │     - avgRating = ? (선택적, 나중에)
   │
   │     판정:
   │     currentGrade → nextGrade (TODO)
   │     등급 강등 없음
   │
   │     return {
   │       partnerId,
   │       partnerName,
   │       currentGrade,
   │       completedCount,
   │       nextGrade: null, // TODO
   │       gradeChanged: false
   │     }
   │
   └─ 루프 끝 (배열 누적)
   ↓
5. Code: Aggregate Results
   - 전체 검토건수
   - 등급 변경건수
   - 변경된 파트너 목록
   ↓
6. Telegram: Send Notification
   - Message: "등급 업데이트 완료: {N}건 검토, {M}건 변경"
   ↓
7. Respond to Webhook
   - { success: true, result: {...} }
```

### 노드 상세

#### 1. Schedule Trigger
```
매일 06:00 KST
cronExpression: "0 6 * * *"
```

#### 2. HTTP Request: Get All Partners
```
Method: GET
URL: https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/tbl_Partners
Authentication: HTTP Header (xc-token)
Headers:
  xc-token: {{ $env.NOCODB_API_TOKEN }}
Params:
  where: (status,eq,active)
```

Response: `{ list: [{id, partner_code, member_id, name, grade, ...}] }`

#### 3. Code: Parse Partners
```javascript
// 파트너 목록 파싱
const response = items[0].json;
const partners = response.list || [];

return {
  json: {
    partners: partners,
    totalCount: partners.length
  }
};
```

#### 4. Loop: For Each Partner
**반복 대상**: `$node["Code"].output.json.partners`

#### 4a. HTTP Request: Get Partner Settlements
```
Method: GET
URL: https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/tbl_Settlements
Authentication: HTTP Header
Headers:
  xc-token: {{ $env.NOCODB_API_TOKEN }}
Params:
  where: (partner_code,eq,{{ $item(1).partner_code }})~and(status,eq,COMPLETED)
```

Response: `{ list: [{...settlement records}] }`

#### 4b. Code: Aggregate & Judge Grade
```javascript
// items[0]: HTTP Request의 settlements 응답
// items[1]: Loop 아이템 (파트너)

const settlements = items[0].json.list || [];
const partner = items[1];

const completedCount = settlements.length;

// TODO: 회사 파트너 정책 확정 후 아래 기준 채워넣기
// SILVER (grade=1) -> GOLD (grade=2): completedCount >= ? && avgRating >= ?
// GOLD (grade=2) -> PLATINUM (grade=3): completedCount >= ? && avgRating >= ?
// 등급 강등 없음

let nextGrade = partner.grade; // 기본: 현재 등급 유지
let gradeChanged = false;

if (completedCount >= 10 && partner.grade === 1) {
  // TODO: SILVER -> GOLD 조건 확인
  // nextGrade = 2;
  // gradeChanged = true;
}

if (completedCount >= 50 && partner.grade === 2) {
  // TODO: GOLD -> PLATINUM 조건 확인
  // nextGrade = 3;
  // gradeChanged = true;
}

return {
  json: {
    partnerId: partner.id,
    partnerCode: partner.partner_code,
    partnerName: partner.name,
    memberId: partner.member_id,
    currentGrade: partner.grade,
    completedCount: completedCount,
    nextGrade: nextGrade,
    gradeChanged: gradeChanged
  }
};
```

#### 5. Code: Aggregate Results
```javascript
// 루프 완료 후 모든 파트너의 결과 집계
const allResults = items[0].json;

const totalReviewed = allResults.length;
const gradeChanges = allResults.filter(r => r.gradeChanged === true);
const totalChanged = gradeChanges.length;

const summary = {
  executedAt: new Date().toISOString(),
  totalPartnersReviewed: totalReviewed,
  totalGradeChanges: totalChanged,
  changedPartners: gradeChanges.map(r => ({
    partnerCode: r.partnerCode,
    partnerName: r.partnerName,
    oldGrade: r.currentGrade,
    newGrade: r.nextGrade
  }))
};

return {
  json: summary
};
```

#### 6. Telegram: Send Notification
```
Chat ID: {{ $env.TELEGRAM_CHAT_ID }}
Message (Markdown):

⭐ 파트너 등급 업데이트 완료

실행 시간: {{ $node["Code"].output.json.executedAt }}
검토 파트너: {{ $node["Code"].output.json.totalPartnersReviewed }}명
등급 변경: {{ $node["Code"].output.json.totalGradeChanges }}건

변경 내역:
{{ $node["Code"].output.json.changedPartners
  .map(p => `• ${p.partnerCode} (${p.partnerName}): Grade ${p.oldGrade} → ${p.newGrade}`)
  .join('\n')
  || '없음' }}
```

#### 7. Respond to Webhook
```json
{
  "success": true,
  "result": "{{ $node[\"Code\"].output.json }}",
  "timestamp": "{{ new Date().toISOString() }}"
}
```

---

## 3. 테스트 체크리스트

### 3.1 Unit Test

- [ ] **Parse Partners 코드**
  - [ ] 빈 배열 처리: `list: []` → totalCount = 0
  - [ ] 다중 파트너: 3개 파트너 → 3개 반복

- [ ] **Aggregate & Judge Grade 코드**
  - [ ] SILVER (completedCount=5): 등급 변경 없음
  - [ ] SILVER (completedCount=10): TODO 주석 상태 확인
  - [ ] GOLD (completedCount=50): TODO 주석 상태 확인
  - [ ] 등급 강등: GOLD(grade=2) → SILVER로 변경되지 않음

- [ ] **Aggregate Results 코드**
  - [ ] 변경 파트너 0건: `changedPartners: []`
  - [ ] 변경 파트너 2건: 배열에 2개 포함

### 3.2 Integration Test

- [ ] **전체 워크플로우**
  - [ ] 스케줄 트리거 수동 실행
  - [ ] NocoDB tbl_Partners 조회 성공 (status=active 필터)
  - [ ] 각 파트너별 tbl_Settlements 집계
  - [ ] 텔레그램 알림 발송 확인
  - [ ] 응답 JSON 형식: `{ success, result, timestamp }`

- [ ] **NocoDB 인증**
  - [ ] xc-token 헤더 정확히 전달
  - [ ] 401 에러 시 credentials 확인

### 3.3 실제 데이터 테스트

- [ ] NocoDB 테스트 DB에 다음 생성:
  - [ ] 파트너 3명 (SILVER, GOLD, PLATINUM)
  - [ ] 각 파트너별 COMPLETED 정산 10~60건
  - [ ] 워크플로우 실행
  - [ ] 결과 확인 (텔레그램 메시지)

---

## 4. 향후 고도화 (Task 223-ext)

실제 등급 기준이 회사 정책으로 확정되면:

1. **등급 판정 로직 완성**
   ```javascript
   // CODE: Aggregate & Judge Grade에서
   if (completedCount >= 10 && avgRating >= 4.0 && partner.grade === 1) {
     nextGrade = 2;
     gradeChanged = true;
   }
   ```

2. **NocoDB Update 활성화**
   ```javascript
   // 루프 내 HTTP Request 추가
   // PATCH tbl_Partners: grade = nextGrade
   // (현재는 비활성화)
   ```

3. **등급 변경 이메일 발송**
   - Upgrade 이메일 (축하, 새 수수료율)
   - 강등 이메일 (없음, 현 정책상)

---

## 5. 배포 체크리스트

- [ ] WF-13-grade-update.json을 n8n 에디터에 import
- [ ] Credentials 설정:
  - [ ] NocoDB API Token (xc-token)
  - [ ] Telegram Bot Token & Chat ID
- [ ] 환경변수 확인:
  - [ ] NOCODB_PROJECT_ID
  - [ ] TELEGRAM_CHAT_ID
- [ ] 스케줄 트리거 활성화 (06:00 KST)
- [ ] 수동 테스트 실행
- [ ] 텔레그램 알림 확인
- [ ] 최종 배포

---

## 6. 참고

- **등급 강등 없음**: gradeOrder 맵 (SILVER=1, GOLD=2, PLATINUM=3), 현재 등급보다 상위만 변경
- **NocoDB where 문법**: `(field,operator,value)~and(...)`
- **TODO 마킹**: 뼈대이므로 실제 grade Update는 주석 처리 (회사 정책 확정 후 활성화)
- **텔레그램 Markdown**: parse_mode: "Markdown", `*굵게*`, `_이탤릭_` 등 지원

---

## 7. 파일 경로

- **n8n 워크플로우**: `/Users/jangjiho/workspace/pressco21/파트너클래스/n8n-workflows/WF-13-grade-update.json`
- **Task 정의**: `/Users/jangjiho/workspace/pressco21/tasks/223-n8n-grade-update.md`
