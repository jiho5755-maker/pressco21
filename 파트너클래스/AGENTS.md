# AGENTS.md — 파트너클래스 (Codex CLI 지침)

> 꽃 공예 온라인 클래스 플랫폼. 메이크샵 D4(카멜레온) 위에 구축.
> 모드 A(보조): 리팩토링, 코드 리뷰, 버그 수정 | 모드 B(독립): 기획~개발까지 총괄 가능
> 모드 확인: AI_SYNC.md의 태스크 prefix 참조 (`[CODEX]` vs `[CODEX-LEAD]`)

---

## 공용 정체성 문서

파트너클래스 관련 기획, UX, 카피, IA, 운영 전략 판단은 아래 문서를 공통 기준으로 삼습니다.

- `/Users/jangjiho/workspace/pressco21/docs/파트너클래스/README.md`
- `/Users/jangjiho/workspace/pressco21/docs/파트너클래스/shared-service-identity.md`
- `/Users/jangjiho/workspace/pressco21/docs/파트너클래스/enterprise-elevation-strategy-2026-03-10.md`

핵심 기준:

- 1순위 고객은 수강생
- 파트너와 협회는 공급자/제휴 레이어
- 파트너클래스는 수강 허브이자 파트너 운영 지원 서비스이며 협회 제휴 유치 장치
- 직접 수수료 극대화보다 재료/키트 판매 활성화와 자사몰 락인 강화가 우선

문서가 충돌하면 `shared-service-identity.md`와 `enterprise-elevation-strategy-2026-03-10.md`를 예전 구현 문서보다 우선한다.

---

## 기술 스택

- **Vanilla HTML/CSS/JS** (빌드 도구 없음, npm 없음)
- 메이크샵 D4 카멜레온 엔진 위에 동작
- 외부 라이브러리: CDN `<script>` 태그로 로드 (flatpickr 등)
- 백엔드: n8n 웹훅 API (NocoDB 경유)

---

## 디렉토리 구조

```
파트너클래스/
  상세/           # 클래스 상세 페이지 (수강생 뷰)
    Index.html    # 메이크샵 치환코드 포함 HTML
    js.js         # 상세 페이지 JS (IIFE)
    css.css       # 상세 페이지 CSS

  파트너/          # 파트너 대시보드 (강사 뷰)
    Index.html
    js.js         # 대시보드 JS (IIFE) — 가장 큰 파일
    css.css

  강의등록/        # 클래스 등록 폼
    Index.html
    js.js
    css.css

  마이페이지/      # 수강생 예약 확인
    Index.html
    js.js
    css.css

  관리자/          # 관리자 페이지
    Index.html
    js.js
    css.css

  n8n-workflows/  # n8n 워크플로우 JSON (수정 금지!)
    WF-01-class-api.json        # 클래스 API
    WF-05-order-polling-batch.json  # 주문 폴링 + 정산
    WF-08-partner-approve.json  # 파트너 승인
    WF-13-grade-update.json     # 등급 자동 심사
    WF-16-class-register.json   # 클래스 등록
    WF-18-schedule-management.json  # 일정 관리
    WF-19-my-bookings.json      # 예약 확인
    WF-20-class-edit.json       # 클래스 수정
```

---

## 메이크샵 필수 제약 (위반 시 운영 장애)

1. **`${variable}` 이스케이프**: JS 내 템플릿 리터럴에서 반드시 `\${variable}` 사용
   ```javascript
   // 올바른 예
   const url = `https://api.example.com/\${id}`;
   // 잘못된 예 (메이크샵에서 치환코드로 오인 → 저장 실패)
   const url = `https://api.example.com/${id}`;
   ```

2. **가상 태그 보존**: `<!-- -->`, `{$치환코드}` 절대 수정/삭제 금지

3. **IIFE 패턴**: 모든 JS는 즉시 실행 함수로 감싸야 함
   ```javascript
   ;(function() {
     'use strict';
     // 코드
   })();
   ```

4. **CSS 스코핑**: 상점 전체 스타일 오염 방지
   ```css
   /* 올바른 예 */
   #partner-dashboard .pd-card { ... }
   /* 잘못된 예 */
   .card { ... }  /* 전역 오염 */
   ```

5. **var 사용 금지**: `const` / `let` 만 사용

---

## 모드 A: 보조 작업 (Claude Code 주도 프로젝트)

**허용:**
- CSS 최적화 / 중복 제거
- JS 코드 리팩토링 (로직 변경 없이 구조 개선)
- 접근성(a11y) 개선
- 성능 최적화 (불필요한 DOM 조작 제거 등)
- 코드 리뷰 및 개선 제안
- 간단한 UI 버그 수정 (레이아웃 깨짐 등)

**금지:**
- n8n 워크플로우 JSON 파일 수정
- 비즈니스 로직 변경 (등급 기준, 수수료율, 정산 로직)
- 새 페이지/기능 추가
- 서버 배포

## 모드 B: 독립 프로젝트 (`[CODEX-LEAD]` 태스크)

**허용 (모드 A 허용 + 추가):**
- 새 페이지/기능 개발
- API 엔드포인트/URL 추가
- n8n 워크플로우 JSON 수정 (필요 시)
- 서버 배포

**여전히 금지:**
- `.secrets.env` 수정
- `git push --force`

---

## 4등급 파트너 체계 (참조)

| 등급 | 수수료율 | 승급 조건 |
|------|---------|----------|
| BLOOM | 25% | 기본 등급 |
| GARDEN | 20% | 완료 10건 + 평점 ★4.0 |
| ATELIER | 15% | 완료 30건 + 평점 ★4.3 |
| AMBASSADOR | 10% | 완료 50건 |

강등 없음. 매월 1일 자동 심사 (WF-13).

---

## API 엔드포인트 (참조용)

| 용도 | URL 패턴 |
|------|---------|
| 클래스 API | `POST https://n8n.pressco21.com/webhook/class-api` |
| 클래스 수정 | `POST https://n8n.pressco21.com/webhook/class-edit` |
| 일정 관리 | `POST https://n8n.pressco21.com/webhook/schedule-management` |
| 예약 확인 | `POST https://n8n.pressco21.com/webhook/my-bookings` |
| 클래스 등록 | `POST https://n8n.pressco21.com/webhook/class-register` |
