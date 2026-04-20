# MakeShop 스킨 로컬 사본

> 메이크샵 D4(카멜레온) 디자인 편집기의 코드를 로컬에 그대로 저장한 폴더.
> **편집기에서 수정 후 → 이 폴더에도 반드시 동기화**하여 최신 상태 유지.
> 디자인 기준점 문서: [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)

---

## 폴더 ↔ 편집기 매핑 가이드

| 로컬 경로 | 메이크샵 편집기 위치 | 탭 |
|-----------|-------------------|-----|
| `_common/common.css` | 공통 CSS-js > CSS | CSS |
| `_common/common.js` | 공통 CSS-js > JS | JS |
| `_env/design-env.txt` | 디자인 환경 설정 | DTD/메타/HEAD |
| `header/basic/header.html` | 상단/하단 디자인 > 상단 > 기본 상단 [C] | 디자인 편집(HTML) |
| `header/basic/header.css` | 상단/하단 디자인 > 상단 > 기본 상단 [C] | CSS |
| `header/basic/header.js` | 상단/하단 디자인 > 상단 > 기본 상단 [C] | JS |
| `header/mypage-common/` | 상단/하단 디자인 > 상단 > 마이페이지 공통 [C] | |
| `footer/basic/` | 상단/하단 디자인 > 하단 > 기본 하단 [C] | |
| `main/` | 중앙 디자인 > 메인 | |
| `category/` | 중앙 디자인 > 카테고리 | |
| `product/` | 중앙 디자인 > 상품관련 | |
| `member/` | 중앙 디자인 > 회원관련 | |
| `order/` | 중앙 디자인 > 주문관련 | |
| `community/` | 중앙 디자인 > 커뮤니티 | |
| `mypage/` | 중앙 디자인 > 마이페이지 | |
| `pages/partner-map/` | 중앙 디자인 > 개별 페이지 > 파트너 맵 | |
| `pages/resiners/` | 중앙 디자인 > 개별 페이지 > Resiners | |
| `pages/brand/` | 중앙 디자인 > 개별 페이지 > 브랜드 페이지 | |
| `pages/test/` | 중앙 디자인 > 개별 페이지 > 테스트 | |
| `pages/partnerclass-list/` | 개별 페이지 > 파트너클래스-목록 (`page.html?id=2606`) | |
| `pages/partnerclass-detail/` | 개별 페이지 > 파트너클래스-상세 (`page.html?id=2607`) | |
| `pages/partnerclass-partner/` | 개별 페이지 > 파트너클래스-파트너 (`page.html?id=2608`) | |
| `pages/partnerclass-apply/` | 개별 페이지 > 파트너클래스-파트너신청 (`page.html?id=2609`) | |
| `pages/partnerclass-edu/` | 개별 페이지 > 파트너클래스-교육 (`page.html?id=2610`) | |
| `pages/partnerclass-register/` | 개별 페이지 > 파트너클래스-강의등록 (`page.html?id=8009`) | |
| `pages/partnerclass-mypage/` | 개별 페이지 > 파트너클래스-마이페이지 (`page.html?id=8010`) | |
| `pages/partnerclass-admin/` | 개별 페이지 > 파트너클래스-어드민 (`page.html?id=8011`) | |
| `mobile-banner/` | 중앙 디자인 > 모바일 메인 배너 | |
| `event-popup/` | 중앙 디자인 > 이벤트 팝업 | |
| `boards/resiners-auth/` | 게시판 디자인 > 레저너스 정품 등록 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/power-review/` | 게시판 디자인 > 파워리뷰 (상품 리뷰) | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/certification/` | 게시판 디자인 > 민간자격 안내 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/technique/` | 게시판 디자인 > 제작기법 공유 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/exhibition/` | 게시판 디자인 > 전시 및 행사안내 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-accessory/` | 게시판 디자인 > 갤러리/악세서리 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-wood/` | 게시판 디자인 > 갤러리/원목제품 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-living/` | 게시판 디자인 > 갤러리/생활소품 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-resin/` | 게시판 디자인 > 갤러리/레진플라워 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-preserved/` | 게시판 디자인 > 갤러리/프리저브드플라워 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/gallery-fluid/` | 게시판 디자인 > 갤러리/플루이드아트 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/free-board/` | 게시판 디자인 > 자유 게시판 | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |
| `boards/power-review-2/` | 게시판 디자인 > 파워리뷰 (두 번째) | ⚠️ 빈 폴더 — 실제 파일은 numbered 폴더 참조 |

---

## 게시판 번호 ↔ 이름 매핑 (관리자 확인 완료)

실제 파일은 `boards/board-N/`, `boards/image-N/` numbered 폴더에 있다.
2026-03-17 메이크샵 관리자 > 게시판 설정에서 직접 확인.

| No | 폴더 | 게시판 코드 | 게시판 이름 | 타입 |
|----|------|------------|------------|------|
| 01 | `boards/board-11/` | jewoo_board11 | 레지너스 정품 등록 | 일반 |
| 02 | `boards/board-10/` | jewoo_board10 | 파워리뷰 (상품리뷰) | 일반 [파워리뷰] |
| 03 | `boards/board-6/` | jewoo_board6 | 민간자격 안내 | 일반 |
| 04 | `boards/board-2/` | jewoo_board2 | 제작기법 공유 | 일반 |
| 05 | `boards/board-7/` | jewoo_board7 | 전시 및 행사안내 | 일반 |
| 06 | `boards/image-11/` | jewoo_image11 | 갤러리/악세사리 | 갤러리 |
| 07 | `boards/image-9/` | jewoo_image9 | 갤러리/원목제품 | 갤러리 |
| 08 | `boards/image-10/` | jewoo_image10 | 갤러리/생활소품 | 갤러리 |
| 09 | `boards/image-7/` | jewoo_image7 | 갤러리/레칸플라워 | 갤러리 |
| 10 | `boards/board-8/` | jewoo_board8 | 갤러리/프리저브드플라워 | 일반 |
| 11 | `boards/board-9/` | jewoo_board9 | 갤러리/플루이드아트 | 일반 |
| 12 | `boards/base/` | jewoo | 자유 게시판 | 기본 |

---

## 페이지별 파일 구성

각 폴더에는 3개 파일이 존재:

```
{페이지}/
├── {page}.html      ← 디자인 편집(HTML) 탭
├── {page}.css       ← CSS 탭
├── {page}.js        ← JS 탭 (없으면 해당 페이지에 JS 없음)
└── {page}.vtags.txt ← 페이지별 사용 가능한 가상태그 목록
```

게시판 폴더는 list/view/write/password 4개 서브페이지로 구성:
```
boards/{template}/
├── list.html / list.css / list.js / list.vtags.txt
├── view.html / view.css / view.js / view.vtags.txt
├── write.html / write.css / write.js / write.vtags.txt
└── password.html / password.css / password.js / password.vtags.txt
```

---

## 편집기 스킨 정보

- **스킨명**: 리뉴얼 1b 03.01(COPY) [내 쇼핑몰 스킨]
- **dgnset_id**: `49435`
- **common.css**: 3,338줄 / 94KB
- **main.css**: 2,835줄 / 71KB
- **main.html**: 1,281줄 / 90KB

---

## 코드 추출 방법 (CodeMirror)

메이크샵 편집기는 CodeMirror 에디터를 사용한다.

**Chrome 개발자 도구 콘솔에서 실행:**
```javascript
// 현재 활성 탭의 CodeMirror 에디터 내용 추출
document.querySelector('.CodeMirror').CodeMirror.getValue()
```

**전체 자동 추출 방법:**
1. 편집기 페이지에서 원하는 탭(HTML/CSS/JS) 클릭
2. F12 → Console → 위 명령어 실행
3. 결과를 복사하여 로컬 파일에 저장

---

## 동기화 시스템 (`_sync/`)

편집기 ↔ 로컬 코드 동기화를 자동화하는 도구 모음.

```
[메이크샵 편집기] ←── skin-pull ──→ [로컬 makeshop-skin/]
    (라이브)        skin-push         (git 추적)
                    skin-diff
```

### 도구 목록

| 파일 | 용도 |
|------|------|
| `_sync/editor-map.json` | 538개 파일 → 편집기 위치 매핑 테이블 |
| `_sync/skin-pull.js` | Chrome MCP로 편집기 코드 자동 추출 |
| `_sync/skin-push.js` | Chrome MCP로 편집기에 코드 삽입 |
| `_sync/pre-push-check.sh` | push 전 충돌 감지 |
| `_sync/merge-css.sh` | CSS 3-way 병합 (디자이너+개발자) |
| `_sync/SYNC-STATUS.md` | 동기화 상태 추적 |
| `_sync/MANUAL-PULL.md` | 수동 추출 절차서 |

### 개발 워크플로우

**개발 시작:**
```
1. skin-pull: 편집기 최신 코드 → 로컬
2. git diff: 디자이너 변경분 확인
3. git commit -m "sync: 편집기 코드 pull"
4. 개발 시작
```

**개발 완료:**
```
1. git commit -m "feat: [작업내용]"
2. pre-push-check: 디자이너 중간 수정 확인
3. 변경 감지 시 → pull + 병합 → 재커밋
4. skin-push: 로컬 → 편집기
5. SYNC-STATUS.md 업데이트
```

### Claude Code 사용법

- **pull**: 편집기 페이지 열고 → "이 페이지 pull 해줘"
- **push**: "main.css push 해줘" (pre-push-check 자동 실행)
- **전체**: "skin sync" → 전체 동기화 프로세스

---

## 동기화 규칙

1. **편집기 수정 후**: 해당 로컬 파일도 즉시 업데이트
2. **로컬 작업 후**: 편집기에 붙여넣기 → 저장 (메이크샵 저장 주의사항 준수)
3. **`${variable}` 이스케이프**: 편집기 저장 시 `\${variable}` 형태 유지
4. **CSS 수정 주의**: 디자이너 영역 CSS 수정 시 반드시 최신 pull 후 작업

---

## 마지막 동기화

> 최초 구조 생성: 2026-03-17
> 동기화 시스템 구축: 2026-03-30
> 동기화 상태: `_sync/SYNC-STATUS.md` 참조

## 디자이너 핸드북

CSS/이미지 중심의 웹디자인 작업은 [`DESIGNER_HANDBOOK.md`](./DESIGNER_HANDBOOK.md)를 먼저 확인하세요.
