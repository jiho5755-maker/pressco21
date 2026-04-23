# Claude Adapter Self-Smoke Runbook

> Claude adapter 구성요소를 자체 검증하는 절차.
> 새 세션이나 변경 후 이 runbook으로 빠르게 점검한다.

---

## Test 1: SessionStart Hook

**검증 방법**: 새 세션 첫 프롬프트 시 자동 실행됨. 또는 수동 테스트:
```bash
echo '{"cwd":"/Users/jangjiho/workspace/pressco21","session_id":"test-001"}' | bash ~/.claude/hooks/session-start.sh
```

**Pass 조건**:
- [ ] handoff가 있으면 compact briefing이 stdout에 출력됨
- [ ] 사람 이름이 먼저 보임 (tool/runtime 이름 아님)
- [ ] `Explore`, `general-purpose`, `Plan`이 owner로 나오지 않음
- [ ] placeholder handoff일 때 "/save 미실행" 경고가 나옴
- [ ] OMX 작성 handoff일 때 "(실행실에서)" 레이블이 붙음
- [ ] learn_to_save가 있으면 "승격 후보:" 표시됨

**Fail 예시**:
- `[3시간 전] Explore:` — non-canonical owner 노출
- placeholder summary가 그대로 표시됨

---

## Test 2: /save

**검증 방법**: 작업 후 `/save` 실행.

**Pass 조건**:
- [ ] `team/handoffs/latest.md`에 handoff-contract YAML 기록됨
- [ ] summary, decision, next_step, open_risks가 placeholder가 아닌 실제 판단으로 채워짐
- [ ] owner_agent_id가 canonical agent_id임 (Explore, Plan 등 아님)
- [ ] founder-facing 출력에 한국어 섹션 사용 (요약/확인/리스크/다음)
- [ ] 사람 이름이 주어로 쓰임 ("최민석님이 ~했습니다")
- [ ] learn_to_save에 승격 후보가 0~3개 판단됨

**Fail 예시**:
- 영어 섹션 (Summary/Verified/Risk/Next)
- "Claude가 ~했습니다" (도구 주어)
- owner가 `Explore`

---

## Test 3: /resume

**검증 방법**: 새 세션에서 `/resume` 실행.

**Pass 조건**:
- [ ] latest handoff에서 4개 필드 로드됨 (summary, next_step, open_risks, learn_to_save)
- [ ] owner가 display_name으로 표시됨 ("최민석님", agent_id 아님)
- [ ] runtime이 직접 노출되지 않음 ("실행실에서 진행된 작업" 형태)
- [ ] handoff가 7일 이상이면 경고 표시

**Fail 예시**:
- `담당: chief-technology-officer` (agent_id 직접 노출)
- `런타임: claude` (runtime 직접 노출)

---

## Test 4: Founder-Facing Output

**검증 방법**: 에이전트 spawn 후 출력 확인.

### 4a. verification (단독 검토)
- [ ] 제목: `## {이름} 검토` (예: 최민석님 검토)
- [ ] 섹션: 결론 → 확인한 것 → 남은 리스크 → 다음 단계
- [ ] 첫 3줄에 사람 이름 포함
- [ ] `architect`, `critic`, `analyst` 미노출

### 4b. team_meeting
- [ ] 제목: `## 팀 회의 종합`
- [ ] 섹션: 결론 → {이름} 관점 → 다음 단계
- [ ] Core 6 이름 정확: 유준호님/최민석님/박서연님/한지훈님/윤하늘님/팀 회의

### 4c. handoff (/save 출력)
- [ ] 제목: `## 저장 완료`
- [ ] 섹션: 요약 → 확인 → 리스크 → 다음

### 4d. execution_report
- [ ] 제목: `## {이름} 실행 보고`
- [ ] 섹션: 무엇을 했는가 → 확인한 것 → 남은 위험 → 다음 행동

---

## Test 5: Canonical Name Consistency

모든 출력에서 아래 이름이 정확히 일치하는지 확인:

| canonical | display_name | 틀린 예시 |
|---|---|---|
| yoo-junho-paircoder | 유준호님 | "페어코더 유준호" |
| choi-minseok-cto | 최민석님 | "CTO 최민석" |
| park-seoyeon-cfo | 박서연님 | "CFO 박서연" |
| han-jihoon-cso | 한지훈님 | "CSO 한지훈" |
| yoon-haneul-pm | 윤하늘님 | "PM 윤하늘" |
| team-meeting | 팀 회의 | "팀미팅" / "Team Meeting" |

---

## Test 6: Non-Canonical Agent Filter

**검증 방법**: session-handoff.sh 로직 확인.
```bash
# agent-usage.log에 Explore가 가장 많아도 canonical만 owner가 되는지
echo "2026-04-21|Explore|test" >> ~/.claude/hooks/agent-usage.log
echo "2026-04-21|Explore|test" >> ~/.claude/hooks/agent-usage.log
echo "2026-04-21|chief-technology-officer|test" >> ~/.claude/hooks/agent-usage.log
# Stop hook 실행 후 latest.md의 owner_agent_id가 chief-technology-officer인지 확인
```

**Pass 조건**:
- [ ] owner_agent_id가 `chief-technology-officer` (Explore 아님)
- [ ] Explore가 contributors에도 나오지 않음

---

## 전체 Pass 기준

6개 테스트 모두 Pass → adapter 정상.
1개라도 Fail → 해당 hook/skill/wording 수정 후 재테스트.
