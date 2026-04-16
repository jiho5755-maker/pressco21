# 🎓 에이전트 레벨업 프로세스 v2

> "직원이 매년 배우듯, AI도 매일 자라야 한다."
> 확정: 2026-04-16 (공식 패턴 반영 v2)

---

## 📚 공식 4원칙 준수 (Anthropic Agent Autonomy)

Anthropic이 제시한 에이전트 자율성의 4대 조건:

1. **Memory** — 에이전트는 과거 실수를 반복하면 안 된다
2. **Governance** — 검증 가능한 계약으로 행동이 제한되어야 한다
3. **Self-improvement** — 사용할수록 더 커지는 게 아니라 더 나아져야 한다
4. **Transparency** — 결정이 감사·설명 가능해야 한다

이 프로토콜은 위 4원칙을 **파일 시스템 + Hooks + 스킬**로 구현한다.

---

## 🧬 3+1 레이어 구조 (업데이트)

각 에이전트는 **4개 파일 + 1개 훅**으로 구성:

```
team/personas/XX-이름.md              ← [01 Core] 거의 안 바뀜 (Level 4+ 시만 갱신)
team/knowledge-base/이름/
├── industry-trends.md / case-studies.md  ← [02 Knowledge] 주간 업데이트
├── growth-log.md                          ← [03 Experience] CHANGELOG 형식
└── external-feed/                         ← [04 External] 자동 수집

~/.claude/hooks/levelup-auto.sh           ← [Hooks] Stop 시 자동 마킹
```

### Layer 01: Core (Persona) — Governance
- 이름·직급·성격·말투
- 기본 담당 영역
- **주의사항** (반복 실수 기록)
- 변경은 `/levelup promote`로만

### Layer 02: Knowledge — Memory (명시적)
- 회사 지식 (company-profile 연동)
- 업계 트렌드
- 사례 라이브러리
- `/levelup train`으로 수동 주입
- `/levelup research`로 자동 수집

### Layer 03: Experience — Memory (암묵적) + Self-improvement
- **CHANGELOG 표준 포맷**으로 기록
- 긍정/부정 피드백 누적
- **Failed Approaches** 섹션 (재실패 방지 — 공식 필수)
- 에이전트 자기 기록 (`/levelup self-update`)

### Layer 04: External Feed — 지속 학습
- WebSearch 결과
- korean-law MCP 조문
- 경쟁사 동향
- 날짜별 파일 자동 적재

### Hook Layer — Transparency + 자동화
- Stop hook이 세션 종료 시 자동 마킹
- 7일 로그 로테이션
- 비활성화: `PRESSCO21_LEVELUP_AUTO=0`

---

## 🎮 8가지 명령 세트

### 수동 (지호님 주도) — 5개
| 명령 | 주기 | 공식 패턴 |
|------|------|----------|
| `/levelup train` | 주 2-3 | CLAUDE.md 점진 정제 |
| `/levelup feedback` | 매일 | 실수 반복 방지 |
| `/levelup research` | 월 3-5 | External knowledge 주입 |
| `/levelup review` | 분기 1 | Measure & iterate |
| `/levelup promote` | 반기 1 | 자기 편집 승인 |

### 반자동 (지호님 확인) — 3개
| 명령 | 주기 | 공식 패턴 |
|------|------|----------|
| `/levelup evaluate` | 중요 산출물마다 | Evaluator-Optimizer |
| `/levelup self-update` | 세션 종료 시 | Claude self-edit |
| `/levelup cross-check` | 이견 검증 시 | Writer/Reviewer |

### 자동 (Hooks) — 1개
| 훅 | 트리거 | 동작 |
|----|-------|------|
| `levelup-auto.sh` | Stop event | growth-log에 세션 마커 |

---

## 📝 Growth-Log CHANGELOG 표준 포맷

공식 패턴: ["CHANGELOG.md as portable long-term memory"](https://www.anthropic.com/research/long-running-Claude)

```markdown
## [Lv.N] - YYYY-MM-DD (사유: feedback/train/research/self-update/promote)

### ✅ Added
- 새 지식/학습

### 🎯 Improved
- 개선된 패턴

### ⚠️ Known Issues
- 반복 실수 (주의)

### 🚫 Failed Approaches (공식 필수)
- 시도했다 실패한 접근법 + 이유
- "다시 하지 말 것" 리스트

### 📝 Learned
- Self-update로 에이전트 본인 기록

### 🔗 Next Session TODO
- 다음에 적용할 것
```

**핵심**: `Failed Approaches` 섹션이 공식 요구사항. 없으면 같은 실수 반복.

---

## 🏅 레벨 시스템 + 혜택

| Lv | XP | 혜택 | 공식 근거 |
|----|-----|------|---------|
| **1** | 0-20 | 기본 | 신규 생성 |
| **2** | 21-50 | feedback 자동 요약, growth-log 활성 | - |
| **3** | 51-100 | 자율 결정 범위 확대 | - |
| **4** | 101-200 | research 스스로 트리거 가능, Skills 승격 자격 | "Claude can edit instructions" |
| **5** | 201+ | 신규 에이전트 온보딩 멘토 | - |

### XP 획득 규칙
| 활동 | XP |
|------|-----|
| 긍정 피드백 | +5 |
| 부정 피드백 | -3 |
| `/review` 통과 | +10 |
| `/train` 수용 | +3 |
| `/research` 반영 | +1 |
| 중대 결정 참여 | +8 |
| 지호님 "정확해" | +10 |
| `/evaluate` 8+ 점 | +5 |
| `/self-update` 기록 | +2 |
| `/cross-check` 합의 | +3 |

---

## 🔄 공식 Evaluator-Optimizer 루프

```
1. 에이전트 A 생성 (답변/카피/분석)
    ↓
2. /levelup evaluate A "산출물"
    ↓
3. Evaluator (독립 세션) 7차원 평가
    ↓
4. 점수 < 7 → 개선 지시 생성
    ↓
5. A가 개선본 작성
    ↓
6. 재평가 (Loop 최대 3회)
    ↓
7. 통과 → 산출물 확정
```

**공식 인용**:
> "One LLM generates a response while another provides evaluation and feedback in a loop."

---

## 🤝 공식 Writer/Reviewer 패턴

```
Writer (A) → 산출물
    ↓
/levelup cross-check A B
    ↓
Reviewer (B, 독립 세션) → 같은 문제 답변
    ↓
비교 분석:
  - 공통점 (합의)
  - 차이점 (쟁점)
  - 누락 (양쪽 사각지대)
    ↓
지호님 최종 판단
```

**공식 인용**:
> "fresh context improves code review since Claude won't be biased toward code it just wrote"

**추천 페어**:
- 정유나 ⟷ 조현우 (카피 ↔ 법률)
- 박서연 ⟷ 한지훈 (숫자 ↔ 전략)
- 최민석 ⟷ 유준호 (기술 ↔ 비전공)
- 김도현 ⟷ 강예린 (프로세스 ↔ 수용도)

---

## 🤖 공식 Self-Improvement 패턴

공식 인용:
> "Claude can edit these instructions as it works, updating them for future work as it works through issues."

### 구현
1. 에이전트가 세션 중 문제 해결
2. Stop hook이 트리거 → `levelup-auto.sh` 실행
3. growth-log에 마커 추가
4. 지호님이 원할 때 `/levelup self-update [이름]` 호출
5. 에이전트가 스스로:
   - "이번에 배운 것 3가지"
   - "실패한 접근법"
   - "다음 세션 TODO"
   를 작성
6. growth-log에 자동 추가

### 에이전트 자기 편집 허용 범위
- ✅ `knowledge-base/[이름]/growth-log.md` — 직접 쓰기 가능
- ✅ `knowledge-base/[이름]/external-feed/` — 직접 쓰기 가능
- ⚠️ `knowledge-base/[이름]/*.md` (지식 파일) — `/train` 경유 권장
- ❌ `personas/XX-이름.md` (Core) — `/promote`만 가능 (지호님 승인 필요)

---

## 📊 성장 대시보드 (미니앱 확장 계획)

미니앱 `https://mini.pressco21.com`에 AI 팀 섹션 추가:

```
┌─────────────────────────────────────┐
│ 🏛️ PRESSCO21 AI 팀 현황              │
├─────────────────────────────────────┤
│ [1층 임원실]                          │
│ 한지훈 CSO      Lv.3 ████░░ 82 XP    │
│ 박서연 CFO      Lv.4 █████░ 147 XP   │
│ 정유나 CMO      Lv.3 ███░░░ 68 XP    │
│ 김도현 COO      Lv.2 ██░░░░ 45 XP    │
│ 최민석 CTO      Lv.4 █████░ 132 XP   │
│ 윤하늘 PM       Lv.3 ████░░ 98 XP    │
│ 조현우 법무     Lv.3 ███░░░ 73 XP    │
│ 강예린 HR       Lv.2 ██░░░░ 41 XP    │
│ 유준호 페어코더 Lv.3 ████░░ 89 XP    │
├─────────────────────────────────────┤
│ [이번 주 학습]                        │
│ • 박서연: 쿠팡 수수료 정책 업데이트    │
│ • 한지훈: Q2 업계 트렌드 조사         │
│ • 유준호: 미니앱 파일첨부 스니펫 3개   │
└─────────────────────────────────────┘
```

---

## ✅ 최종 체크리스트 (공식 패턴 준수)

- [x] Memory: growth-log에 Failed Approaches 섹션
- [x] Governance: 페르소나 "주의사항" + 에스컬레이션
- [x] Self-improvement: self-update + promote + Hook 자동
- [x] Transparency: meeting-logs + performance-reviews + growth-log
- [x] CHANGELOG 표준 포맷 채택
- [x] Claude 자기 편집 허용 범위 정의
- [x] Evaluator-Optimizer 루프 (`/levelup evaluate`)
- [x] Writer/Reviewer 패턴 (`/levelup cross-check`)
- [x] Hooks 기반 자동 실행 (`levelup-auto.sh`)
- [x] 레벨별 혜택 차등화

---

## 🎖️ 핵심 약속

1. **실수는 기록**하고 **반복하지 않는다**
2. **학습은 누적**되고 **사라지지 않는다**
3. **자율성은 경계** 안에서만
4. **모든 결정은 설명 가능**하다
5. **성장은 강제되지 않고 선순환**으로
