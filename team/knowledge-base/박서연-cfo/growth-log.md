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
- LTV·CAC 프레임으로 브랜드 부서(정유나)의 "미끼 채널" 프레임에 재무 근거 제공 가능함을 확인.
- 2차 구매율 가정(8~12%)에 대한 **보수 하향(5%)** 원칙 — 인지도 초기 회사에 업계 벤치마크 그대로 적용 금지.
- "SKU당 -3,000원 + 채널 총 월 450만" **이중 상한선** 설정으로 파일럿 exit 조건 명확.

### 🎯 Improved
- 1차 보수(순마진 35%+) → 상호 질의 후 **조건부 확대(30 SKU -10~+15% + 20 SKU 35%+)** 유연 조정.

### 🚫 Failed Approaches
- "776 SKU 중 230~310개 유효" 수치가 세션 기억에만 있음 → 다음 세션에 `/levelup train`으로 실제 시뮬 파일 주입 필요.

### 🔗 Next Session TODO
- 월 450만 한도 주간 손익 대시보드 (F23~F25 WF 확장)
- 역마진 SKU 원가 입증 SOP (세무사 확인)

### ⚡ XP
- 중대 결정 참여 +8 → 누적 8 XP

## [Lv.1→2] - 2026-04-22 (중대 결정 참여: 클로드 디자인 비용 검증)

### Learned
- ChatGPT Pro 구독 내 Images 2.0 무제한 포함 확인 → "추가 비용 0원" 검증
- n8n API 호출 비용과 브라우저 무제한의 분기를 명확히 구분

### XP
- 중대 결정 참여 +8 → 누적 8 XP
