# 2026-03-20 통합 회의 핸드오프

> 회의 답변을 받으면 두 프로젝트에 각각 반영하는 가이드.

## 두 프로젝트 개요

### 프로젝트 A: MakeShop Developer 스킬
- **위치**: `~/.claude/skills/makeshop-developer/`
- **목적**: 메이크샵 자사몰 개발 시 최적화된 코드/디자인 생성
- **회의에서 받을 것**: 브랜드 결정(컬러/키워드/배경/로고) + 고객/상품 맥락
- **반영 대상 파일**:
  - `references/brand-decisions.md` → [TBD] 항목 확정값으로 교체
  - `references/components.md` → 상품 카드 표준 업데이트
  - `references/feature-unlock.md` → 기능 우선순위 반영
  - `references/channel-analysis.md` → 유튜브/인스타 전략 방향 반영
  - `references/customization-questionnaire.md` → 답변 완료 항목 정리

### 프로젝트 B: OpenClaw (회사 맞춤 AI 체계) — Codex가 개발
- **코드 위치**: `~/workspace/OMX(오_마이_코덱스)/oh-my-codex/src/openclaw/`
- **아키텍처**: config.ts(설정읽기) → dispatcher.ts(게이트웨이전송) → index.ts(Public API)
- **현재 상태**: v0.8.6 — 비동기 알림 게이트웨이 (HTTP+CLI) 프로덕션급 완성
- **지원 이벤트**: session-start, session-end, session-idle, ask-user-question, stop
- **설정**: `~/.codex/.omx-config.json` → notifications.openclaw 블록
- **환경변수**: OMX_OPENCLAW=1 (활성화), OMX_OPENCLAW_COMMAND=1 (CLI게이트웨이)
- **목적**: 직원들이 각자 업무에서 AI를 활용할 수 있는 회사 맞춤 AI 비서
- **회의에서 받을 것**: 업무 병목 + AI 도울 업무 + AI 금지 영역 + 직군별 니즈
- **Codex가 할 일**: 회의 답변 기반 company-core/coach/admin 구조 설계 + n8n 연동
- **Claude Code는 건드리지 않음** — OpenClaw 코드는 Codex 전용

## 회의 답변 → 프로젝트 매핑

| 질문 | 프로젝트 A (스킬) | 프로젝트 B (OpenClaw) |
|------|----------------|-------------------|
| Q1 메인 컬러 | brand-decisions.md | - |
| Q2 키워드 3개 | brand-decisions.md | OpenClaw 톤앤보이스 |
| Q3 배경색 | brand-decisions.md | - |
| Q4 로고 | brand-decisions.md | - |
| Q5 고객 80% | brand-decisions.md 맥락 | company-core 고객 프로파일 |
| Q6 첫 구매 TOP 3 | - | company-core 상품 지식 |
| Q7 시즌 패턴 | feature-unlock.md 기획전 | company-core 계절 전략 |
| Q8 선택 이유 TOP 3 | - | company-core 차별화 |
| Q9 반복 업무 | - | 자동화 우선순위 |
| Q10 AI 도울 업무 | - | OpenClaw 유스케이스 |
| Q11 AI 금지 | - | 정책 문서 |
| Q12 모바일 불편 | test-checklists.md | - |
| Q13 기능 우선순위 | feature-unlock.md | - |
| Q14~15 아이디어 | - | 콘텐츠 전략 |
| Q16 3개월 목표 | - | KPI 설정 |
| Q17 자유 의견 | 양쪽 해당사항 반영 | 양쪽 해당사항 반영 |

## 회의 후 실행 순서

### 즉시 (당일)
1. 답변 텍스트를 Claude Code에 전달
2. `brand-decisions.md` [TBD] → 확정값 교체
3. 메인 컬러 기반 5단계 팔레트 + 버튼/카드/인풋 표준 자동 생성
4. makeshop-developer 스킬 재패키징

### 1~3일 내
5. 디자이너 업무 지시서 생성 (로고/파비콘/템플릿 시안 요청)
6. OpenClaw 구조 초안 설계 (직군별 유스케이스 기반)
7. 내부 공식 문서 6종 초안 자동 생성

### 1~2주 내
8. 디자이너 시안 리뷰 → 2차 미팅
9. OpenClaw 프로토타입 (Codex 토큰 활용)

## 프로젝트 충돌 방지 규칙

| 구분 | 프로젝트 A (스킬) | 프로젝트 B (OpenClaw) |
|------|----------------|-------------------|
| 담당 | makeshop-developer 스킬 파일 | OpenClaw 설계 + n8n 워크플로우 |
| 건드리는 파일 | `~/.claude/skills/makeshop-developer/` | 별도 프로젝트 폴더 (미정) |
| 공유 데이터 | brand-decisions.md (읽기 전용 참조) | brand-decisions.md (읽기 전용 참조) |
| AI 에이전트 | makeshop-* 4종 에이전트 | OpenClaw 전용 에이전트 (별도 생성) |
| 트리거 | "메이크샵", "가상태그", "자사몰 개발" | "OpenClaw", "AI 비서", "업무 자동화" |

### 핵심 원칙
- `brand-decisions.md`는 **단일 진실 소스** — 두 프로젝트 모두 여기를 참조
- 스킬 파일은 스킬 세션에서만 수정
- OpenClaw 파일은 OpenClaw 세션에서만 수정
- 공유 영역(브랜드 기준)은 회의 결과로만 변경

## 1차 질문지 답변 요약 (이미 확보)

### 디자인기획사원
- 폰트: Noto Serif KR(제목) + Pretendard(본문) 확정
- 색상: #7d9675 표현력 약하다고 지적, #6eb92b 대안 제안
- 배경: #fff 순백 선호
- 로고: 가독성 떨어져서 변경 희망, 영문 위주
- 참고: 키위글로우(kiwiglow.co.kr), Pinterest
- 도구: 포토샵, 피그마, 일러스트, 미리캔버스, Gemini
- 니즈: 사전 기획안 + 상품 리스트 미리 정리해주면 작업 수월
- 상세페이지: 860px, 1차 시안까지 약 1주, 모음전/단일 템플릿 구분 원함

### 영상기획팀장
- 편집 시간: 롱폼 4일, 숏폼 1일
- 장비: 폰 카메라만 사용
- 톤: "DIY"
- 썸네일: Canva, 규칙 없음
- 업로드: 숏츠 주 1회 유지 (롱폼은 5개월 공백)
- 페인포인트: 수정 요청이 기한 없이 중구난방으로 옴
- 영상 보관: 관리 미흡 (경영기획팀장 지적)

### 채널 데이터
- 유튜브: 구독자 2,160 / 467개 / 부케웨딩=1만+ / 숏츠 평균 2,000
- 인스타: 팔로워 1,683 / 203개 / 브랜드 일관성 5/10
