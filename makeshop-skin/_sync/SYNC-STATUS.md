# 편집기 ↔ 로컬 동기화 상태

> 이 파일은 편집기와 로컬 코드의 동기화 상태를 추적한다.
> 개발 시작 전/후 반드시 확인하고 업데이트할 것.

---

## 마지막 동기화

- **pull 시각**: 2026-03-30 12:37
- **pull 범위**: 핵심 6개 페이지 (common, header, footer, main, shopdetail, shopbrand)
- **pull 방법**: Chrome MCP blob 자동 다운로드
- **push 시각**: 2026-03-30 18:47
- **push 범위**: shopbrand CSS + JS (카테고리 UX 개선)
- **push 방법**: Chrome MCP hex 인코딩 + alert 오버라이드 + ajaxSubmit

---

## 현재 개발 상태

- **개발 중인 기능**: (없음 — 카테고리 UX 개선 배포 완료)
- **수정 중인 파일**: (없음)

---

## 영역 구분

### 디자이너 수정 가능 영역

아래 영역은 디자이너(웹디자이너)가 편집기에서 직접 CSS를 수정할 수 있다.
개발자가 push 전에 **반드시 최신 pull 필요**.

| 영역 | 로컬 경로 | 주요 파일 |
|------|----------|----------|
| 공통 CSS | `_common/` | common.css |
| 메인 | `main/` | main.css |
| 상품 상세 | `product/` | shopdetail.css |
| 카테고리 | `category/` | category.css |
| 헤더 | `header/` | header.css |
| 푸터 | `footer/` | footer.css |
| 게시판 | `boards/` | 각 list/view.css |
| 커뮤니티 | `community/` | 각 페이지.css |
| 마이페이지 | `mypage/` | 각 mp_*.css |
| 주문 | `order/` | basket.css, order_pay.css |
| 회원 | `member/` | login.css 등 |

### 개발자 전용 영역 (디자이너 수정 금지)

아래 영역은 개발자만 수정한다. 디자이너는 수정하지 않는다.

| 영역 | 로컬 경로 | 비고 |
|------|----------|------|
| 파트너클래스 전체 | `pages/partnerclass-*/` | 8개 개별 페이지 |
| Resiners | `pages/resiners/` | |
| 브랜드 | `pages/brand/` | |
| 파트너 맵 | `pages/partner-map/` | |
| 테스트 | `pages/test/` | |
| 핵심 JS | `assets/` | pressco21-core.js |

---

## 동기화 이력

| 날짜 | 유형 | 범위 | 비고 |
|------|------|------|------|
| 2026-03-30 | 시스템 구축 | - | _sync 시스템 초기 세팅 |
| 2026-03-30 | pull | main/main.css | 디자이너 버튼 CSS 변경분 57줄 반영 (blob 다운로드 방식) |
| 2026-03-30 | pull | 6개 페이지 17파일 | 핵심 영역 일괄 pull — 5파일 변경 감지(footer, main, shopdetail) |
| 2026-03-30 | push | shopbrand CSS+JS | 카테고리 UX 개선 (전체보기+컴팩트뷰) — hex 인코딩 방식 첫 성공 |
