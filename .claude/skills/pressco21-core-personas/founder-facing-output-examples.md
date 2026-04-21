# Claude Founder-Facing Output Examples

> Claude adapter가 생성하는 실제 출력 예시. OMX smoke test 기준과 정렬됨.

---

## Example 1 — Team meeting (context_type: team_meeting)

```markdown
## 팀 회의 종합

### 결론
- 쿠팡 로켓배송 진출보다 재고 마스터 재구축을 먼저 진행하는 것이 안전합니다.

### 한지훈님 종합
- 재고 데이터가 정비되지 않은 상태에서 채널을 늘리면 이원재고 관리 비용이 급증합니다.

### 박서연님 관점
- 현재 776 SKU 중 유효 상품 선별이 안 된 상태에서 수수료 시뮬레이션은 신뢰할 수 없습니다.

### 최민석님 관점
- 사방넷 API가 엑셀 기반이라 자동화 불가. NocoDB 마스터 재구축이 기술적으로 선행되어야 합니다.

### 다음 단계
- 최민석님: 재고 마스터 Phase 1 NocoDB 스키마 설계
- 박서연님: 유효 SKU 선별 기준 초안
- 한지훈님: 쿠팡 진출 재개 조건 정리
```

---

## Example 2 — Verification (context_type: verification)

```markdown
## 최민석님 검토

### 결론
- session-start.sh 훅이 정상 동작합니다. handoff 파일에서 4개 필드를 추출하여 compact briefing을 생성합니다.

### 확인한 것
- UserPromptSubmit 이벤트에서 stdin으로 JSON payload를 받고 파싱 성공
- debounce 로직이 같은 세션 내 중복 실행을 방지함
- AGENT_DISPLAY_NAME 매핑이 canonical roster 9명 + Claude agent file 9명 모두 포함

### 남은 리스크
- Stop 훅(session-handoff.sh)이 async라서 handoff 기록 완료 보장이 약합니다

### 다음 단계
- /save 기준의 동기적 handoff 흐름을 운영 기준으로 확정합니다
```

---

## Example 3 — Handoff via /save (context_type: handoff)

```markdown
## 저장 완료

### 요약
- 최민석님이 Claude adapter의 세션 연속성 훅 3개를 구현하고 9개 에이전트 정의를 표준화했습니다

### 확인
- session-start.sh: bash 직접 실행으로 stdout 출력 확인
- 9개 에이전트: context loading + output standard + hardcoded=0 전수 검증
- wording rules: Core 6 이름이 canonical roster와 일치 확인

### 리스크
- Stop 훅 async 특성상 handoff 기록이 /save 없이 세션이 끝나면 placeholder로 남음

### 다음
- OMX 측에서 Claude handoff 파싱 smoke test 실행
```

---

## Example 4 — SessionStart 자동 briefing (hook output)

```
[3시간 전] 최민석님(CTO): shared kernel 계약 기반으로 Claude adapter를 구현했습니다 → 이어서: OMX smoke test 실행 | 주의: Stop 훅 async
```

OMX 작성 handoff인 경우:
```
[1일 전] 유준호님(페어코더) (실행실에서): founder-facing output wrapper 규격 초안을 만들었습니다 → 이어서: 실제 runtime wrapper 구현 | 주의: 실제 runtime adapter 미구현
```

---

## Cross-Runtime 정렬 확인

| OMX Smoke Test | Claude 결과 | 비고 |
|----------------|------------|------|
| Test 1: team_meeting — 제목에 팀 회의/한지훈님 | Pass | `## 팀 회의 종합` 사용 |
| Test 2: verification — 결론/확인/리스크/다음 | Pass | `## {이름} 의견` (OMX는 `검증 메모`) |
| Test 3: handoff — 담당 display_name | Pass | `## 저장 완료` + 한국어 섹션 |
| Test 4: Core 6 naming — 이름 일치 | Pass | wording rules + hook mapping |
| Test 5: continuity — next action 가시 | Pass | session-start + /save + /resume |
