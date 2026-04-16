# [이름] 성장 이력 (Growth Log)

> **공식 패턴**: [CHANGELOG.md as portable long-term memory](https://www.anthropic.com/research/long-running-Claude)
> **4원칙**: Memory · Governance · Self-improvement · Transparency
> **형식**: [Keep a Changelog](https://keepachangelog.com/) 확장판

---

## 현재 상태

**Level**: 1 (신입)
**경험치**: 0 / 20
**최근 업데이트**: (자동 기록 예정)

---

## 📝 Growth Log 포맷 가이드

각 업데이트는 아래 섹션 구조로 기록:

```markdown
## [Lv.N] - YYYY-MM-DD (사유: feedback/train/research/self-update/promote)

### ✅ Added (신규 학습/지식)
- 지호님이 /levelup train으로 주입한 자료
- /levelup research로 자동 수집한 외부 정보

### 🎯 Improved (개선된 패턴)
- 지호님 긍정 피드백으로 강화된 표현/접근

### ⚠️ Known Issues (반복 실수 — 주의할 것)
- 지호님 부정 피드백 패턴
- 세 번 이상 지적된 항목

### 🚫 Failed Approaches (다시 하지 말 것)
- 시도했다 실패한 접근법
- 이유와 함께 기록 (중요)

### 📝 Learned (이번 세션 교훈)
- Self-update로 에이전트 본인이 기록

### 🔗 Next Session TODO
- 다음에 적용해볼 것
- 확인 필요한 사항
```

---

## [Lv.1] - 2026-04-16 (최초 생성)

### ✅ Added
- 페르소나 정의 완료
- 회사 프로파일 v1 로드
- 기본 역할·책임 정의

### ⚠️ Known Issues
- (데이터 축적 전, 없음)

### 🔗 Next Session TODO
- 첫 호출 시 Self-Update 자동 트리거

---

<!-- 이 아래부터 자동/수동 업데이트 누적 -->

## [Lv.1→2] - 2026-04-16 (중대 결정 참여: 쿠팡 로켓배송 등록 우선순위)

### 📝 Learned
- "풀필먼트 모델이 먼저, API는 그 다음" 한 줄로 회의 방향 전환. **기술 질문을 운영 결정으로 되돌리는** CTO 역할 정립.
- **재고 동기화 ≠ 재고 원천 이원화** — 진짜 로켓(FBR)은 API 문제가 아닌 물리적 재고 분리 문제. API로 해결 불가 영역 구분.
- F23~F25 매출 리포팅 확장 1~2일 (4채널 수집 구조 재활용) — 채널 추가 마찰 없음 확인.

### 🎯 Improved
- 쿠팡 윙 파트너 승인 2~4주 리드타임을 **기술 작업 전 선행 신청** 제안 — "승인 대기" 변수를 공수 산정에 포함.

### 🚫 Failed Approaches
- HMAC SHA256 서명 래퍼 Code 노드 필수 사실은 언급했으나 **공수(1주 PoC) 구두 추정**에 그침. 다음엔 `/levelup train`으로 쿠팡 윙 API 문서 주입 후 정확 견적.

### 🔗 Next Session TODO
- 쿠팡 윙 API 신청서 지원 (CSO·COO)
- Staging HMAC 서명 래퍼 PoC (Week 1-2)
- 사방넷 이원화 설계서 초안 (4채널 재고 아키텍처)

### ⚡ XP
- 중대 결정 참여 +8 → 누적 8 XP
