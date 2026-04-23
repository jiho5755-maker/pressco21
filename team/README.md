# 🏛️ PRESSCO21 AI 컴퍼니

> "실제 회사처럼 토론하고, 각자의 전문성으로 실행하는 AI 팀"
> 마지막 업데이트: 2026-04-16

---

## founder-facing quick start

프레스코21 AI 팀은 내부적으로 더 많은 specialist가 있지만, 대표가 먼저 이해하면 되는 핵심 roster는 아래 6개입니다.

- **유준호님** — 같이 만들고 쉽게 설명하는 페어코더
- **최민석님** — 기술 구조와 자동화 판단
- **박서연님** — 마진/비용/리스크 판단
- **한지훈님** — 전략과 복합 이슈 종합
- **윤하늘님** — 우선순위와 다음 행동 정리
- **팀 회의** — 여러 관점을 모아 종합안 도출

> 같은 직원이 회의실(Claude)과 실행실(OMX)에서 일합니다. founder-facing 경험에서는 위 6개를 중심으로 이해하면 충분합니다.

## 📂 디렉토리 구조

```
team/
├── README.md                   # 이 파일 (전체 개요)
├── boardroom.md                # 조직도 + 호칭체계 + 에스컬레이션
│
├── personas/                   # 1층 임원실 9명 프로파일
│   ├── 01-han-jihoon-cso.md
│   ├── 02-park-seoyeon-cfo.md
│   ├── 03-jung-yuna-cmo.md
│   ├── 04-kim-dohyun-coo.md
│   ├── 05-choi-minseok-cto.md
│   ├── 06-yoon-haneul-pm.md
│   ├── 07-cho-hyunwoo-legal.md
│   ├── 08-kang-yerin-hr.md
│   └── 09-yoo-junho-paircoder.md
│
├── protocols/                  # 운영 프로토콜
│   ├── weekly-meeting.md       # 주간 전략회의 (금 17:00)
│   ├── monthly-review.md       # 월간 리뷰 (WF#3 대체)
│   ├── escalation.md           # 에스컬레이션 경로
│   ├── communication-tone.md   # 호칭·말투 규칙
│   └── levelup-process.md      # 에이전트 성장 프로세스
│
├── meeting-logs/               # 회의 기록 자동 저장
│   └── YYYY-MM-DD-주제.md
│
├── knowledge-base/             # 에이전트별 학습 지식
│   ├── 한지훈-cso/
│   │   ├── industry-trends.md
│   │   ├── case-studies.md
│   │   ├── feedback-log.md
│   │   └── external-feed/      # WebSearch 자동 수집
│   └── (각 임원별 동일 구조)
│
└── performance-reviews/        # 레벨업 이력
    └── YYYY-Q#-reviews.md
```

---

## 🎯 이 조직의 목표

1. **비전공자 바이브코딩 지원** — 장지호님이 "이런거 만들고 싶은데"를 실제로 구현
2. **실제 회사처럼 토론** — 단일 AI 답변이 아닌, 다관점 임원진 토론
3. **직무별 자율 실행** — 각자 전문성으로 직접 실행, 대표 확인은 중대 결정만
4. **지속 성장** — 회사지식·업계트렌드·피드백을 학습해 매일 진화

---

## 🧑‍💼 조직 구성 요약

| 층위 | 인원 | 역할 |
|------|------|------|
| **경영위원회** (실제) | 3 | 이진선 원장님·장준혁 사장님·장지호 팀장 |
| **1층 임원실** (AI) | 9 | CSO·CFO·CMO·COO·CTO·PM·법무·HR·페어코더 |
| **2층 실무진** (AI) | 26 | 각 임원 산하 전문 실무자 |
| **합계 AI** | **35** | 내부 specialist 포함 전체 규모 (founder-facing 핵심 roster는 Core 6 우선) |

---

## 📋 사용 방법

### 일상 사용
- **"박서연님"** — CFO 호출 (재무 질문)
- **"유준호님"** — 페어코더 호출 (바이브코딩 도움)
- **"최민석님"** — CTO 호출 (기술 설계)

### 회의
- **`/team-meeting [주제]`** — CSO 한지훈 주도 다관점 회의
- **`/monthly-report`** — 박서연 CFO + 한지훈 CSO 월간 종합

### 성장
- **`/train [이름] [자료]`** — 새 지식 주입
- **`/feedback [이름] [평가]`** — 피드백 누적
- **`/research [이름] [주제]`** — 외부 정보 자동 수집
- **`/review [이름]`** — 분기 리뷰
- **`/promote [이름]`** — 누적 반영한 프로파일 강화

---

## 📖 중요 원칙

1. **호칭**: 원장님·사장님만 존칭. 그 외 **"님" 평등**. 장지호는 동료로.
2. **단일 진실 소스**: 회사 정보는 `pressco21/company-profile.md`
3. **브랜드 기준**: 진심·전문·즐거운 (2026-03-20 확정)
4. **금전 관련**: 반드시 CFO(박서연) 경유
5. **법령/계약**: 반드시 법무고문(조현우) 경유
6. **복합 도메인(2+)**: CSO(한지훈) 주도

---

## 🔗 연결 문서

- 회사 프로파일: `pressco21/company-profile.md`
- 브랜드 전략: `pressco21/docs/파트너클래스/brand-strategy-comprehensive.md`
- 인프라 레퍼런스: `~/.claude/pressco21-infra.md`
- 에이전트 라우팅: `~/.claude/rules/agent-routing.md`
