# PRESSCO21 쇼핑몰 코드 허브

> 압화(프레스드플라워) 전문 브랜드 **PRESSCO21**의 메이크샵 D4 커스터마이징 + 파트너 클래스 플랫폼 코드 저장소
> 운영 사이트: foreverlove.co.kr

## 비전공자용 OMX 실행 빠른 시작

처음 1회:

```bash
bash _tools/install-p21-omx.sh
```

그 다음부터는 이것만 기억하면 됩니다.

```bash
p21-omx
p21-omx turbo
p21-omx doctor
p21-omx repair
```

- `p21-omx` → 기본 안정 실행
- `p21-omx turbo` → 예전 `--xhigh --madmax`에 해당하는 강한 실행
- `p21-omx doctor` → 점검
- `p21-omx repair` → 복구

상세 설명: [`docs/ai-development/omx-쉬운-실행-가이드.md`](./docs/ai-development/omx-%EC%89%AC%EC%9A%B4-%EC%8B%A4%ED%96%89-%EA%B0%80%EC%9D%B4%EB%93%9C.md)

## 프로젝트 구조

| 폴더 | 용도 | 메이크샵 편집 위치 | 상태 |
|------|------|-------------------|------|
| `메인페이지/` | 쇼핑몰 메인 홈페이지 + YouTube 자동화 | 메인 디자인 (HTML/CSS/JS 탭) | 운영 중 |
| `파트너클래스/` | 파트너 클래스 플랫폼 (6페이지 + n8n WF) | 개별 페이지 | 운영 중 |
| `간편 구매/` | 상품 상세페이지 바로구매 | 상세 디자인 | 운영 중 |
| `1초 로그인(킵그로우)/` | SNS 간편 로그인 3종 | 로그인 디자인 | 운영 중 |
| `파트너맵/` | 전국 파트너 매장 지도 | 개별 페이지 | 운영 중 |
| `브랜드스토리/` | 브랜드 헤리티지 페이지 | 개별 페이지 | 운영 중 |
| `레지너스 화이트페이퍼/` | Resiners 제품 기술 백서 | 개별 페이지 | 운영 중 |
| `docs/` | 프로젝트 문서 (PRD, 가이드, 체크리스트) | — | — |

### 파트너클래스 서브 구조

```
파트너클래스/
  목록/          → 메이크샵 페이지 2606 (클래스 목록)
  상세/          → 메이크샵 페이지 2607 (클래스 상세 + 예약)
  파트너/        → 메이크샵 페이지 2608 (파트너 대시보드)
  파트너신청/    → 메이크샵 페이지 2609 (파트너 신청)
  교육/          → 메이크샵 페이지 2610 (파트너 교육)
  강의등록/      → 메이크샵 페이지 8009 (강의 등록)
  n8n-workflows/ → n8n 워크플로우 JSON (19개)
```

### 메인페이지 서브 구조

```
메인페이지/
  Index.html / css.css / js.js   → 메인 편집기
  유튜브 자동화/                 → YouTube n8n WF 5개 + 가이드
  기존 코드/                     → 리뉴얼 전 백업 (수정 금지)
```

## 기술 스택

- **플랫폼**: 메이크샵 D4 카멜레온 (foreverlove.co.kr)
- **언어**: Vanilla HTML / CSS / JS (빌드 도구 없음, CDN만 사용)
- **자동화**: n8n (19개 WF) + NocoDB (6개 테이블) — Oracle Cloud 서버
- **외부 라이브러리**: Swiper.js, Chart.js, Fuse.js (CDN)
- **외부 API**: Naver Map API, Google Gemini API (AI 매칭)
- **서버**: n8n.pressco21.com / nocodb.pressco21.com (Oracle Cloud, SSH: 158.180.77.201)

## 인증키 관리

모든 API 키, 토큰, 비밀번호는 루트의 `.secrets.env` 파일에서 중앙 관리합니다.
이 파일은 `.gitignore`에 포함되어 **git에 추적되지 않습니다.**

```bash
# .secrets.env 파일이 없는 경우 팀 내 공유 방법으로 수령
# 포함 내용: N8N_API_KEY, NOCODB_API_TOKEN, GEMINI_API_KEY, ADMIN_API_TOKEN 등
```

> **보안 주의**: 코드/문서에 키 직접 기재 금지. 반드시 `.secrets.env 참조` 또는 `$env.VAR_NAME` 형식 사용.

## 디자인 가이드

**상세 규격: [`docs/CSS-DESIGN-GUIDE.md`](./docs/CSS-DESIGN-GUIDE.md)** 참조

### 브랜드 컬러
```css
--color-primary: #7d9675        /* 메인 그린 */
--color-primary-light: #b7c9ad  /* 밝은 그린 */
--color-dark: #2c3e30           /* 다크 그린 */
```

### 폰트
- **메인**: Pretendard (프리텐다드)
- **보조**: Noto Sans KR (본고딕)

## 메이크샵 필수 규칙 (CRITICAL)

1. **`\${var}` 이스케이프**: JS 템플릿 리터럴 `${변수}` → 반드시 `\${변수}`로 작성. 안 하면 저장 실패
2. **가상태그 보존**: `<!--/코드/-->` 주석 태그 절대 수정/삭제 금지
3. **IIFE 패턴**: 모든 JS는 `(function() { 'use strict'; ... })();`로 감쌈
4. **CDN만 사용**: npm, 빌드 도구 금지
5. **메인페이지 Index.html 수정 금지**: 가상태그 손상 3곳 존재 → js.js로만 개선

## 반응형 브레이크포인트

- 모바일: ~768px / 태블릿: 768~992px / 데스크톱: 992~1200px / 와이드: 1200px~

## 파일 네이밍 규칙

각 폴더의 파일은 메이크샵 편집기 탭에 대응합니다:
- `Index.html` → HTML 탭에 붙여넣기
- `css.css` → CSS 탭에 붙여넣기
- `js.js` → JS 탭에 붙여넣기

## 백업 폴더 (수정 금지)

- `메인페이지/기존 코드/` — 리뉴얼 전 원본 (비교 참조용)
- `간편 구매/기본코드/` — 간편 구매 기본형 원본
- `간편 구매/고급형 주문서 작성/` — 간편 구매 고급형 원본

## 문서 구조

```
docs/
  PRD.md / ROADMAP.md            공통 기획/로드맵
  makeshop-dev-guide.md          메이크샵 개발 완전 가이드 (시행착오 집대성)
  CSS-DESIGN-GUIDE.md            디자인 규격
  파트너클래스/                   Phase 2 PRD, 운영 가이드, 테스트 체크리스트 (33개)
  메인페이지/                     Phase 1b 문서 (2개)
  test-checklists/               공통 Phase 1a 체크리스트
  archive/                       GAS 시절 레거시 / 마이그레이션 보고서
```
