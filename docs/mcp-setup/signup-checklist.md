# MCP 세팅 — 가입·인증 체크리스트 (비전공자용)

> 작성: 2026-04-17 (장지호 팀장 직접 수행용)
> 원칙: 따라하면 되게. 막히면 `/board-call 유준호 가입도움` 세션 열기

---

## 전체 현황 한눈에

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 0 | 네이버 커머스 API | ✅ **완료** | Application ID: `7hUEKOQGxDpri42gkU0OGH` |
| 1 | Google Ads Developer Token | ✅ **신청 완료** (기본 액세스 승인 대기) | Token: `nxVEoBPdty8rbNNJqsPTGg`, ~4/22 승인 예상 |
| 2 | Google Cloud Console + OAuth | ✅ **완료** | 프로젝트: `pressco21-mcp`, JSON: `~/secrets/oauth-desktop.json` |
| 3 | Google Analytics 4 속성 ID + 뷰어 | ✅ **완료** | Property ID: `473280152`, 서비스 계정 뷰어 추가됨 |
| 4 | Meta for Developers 앱 + Access Token | ✅ **완료** | 앱 ID: `1668137334197768`, 장기토큰+광고계정 발급 완료 |
| 5 | 네이버 검색광고 API | ✅ **완료** | naver-ads-mcp Phase 3 배포 완료 |
| 6 | 네이버 개발자센터 (보조) | ✅ **완료** | DEV_CLIENT_ID: `HLhfhJLCp6sRPWDKl0He` |
| 7 | GitHub Personal Access Token | ✅ **완료** | Fine-grained token 발급됨 |

**진행률**: 7개 전부 완료 ✅ + Google Ads 기본 액세스 승인 완료 → MCP 설치 진행

---

## 작업 진행 순서 (오늘부터)

### 오늘 (월요일) — 승인 오래 걸리는 것부터

**1️⃣ Google Ads Developer Token 먼저 신청** (승인 1~7일)

### 내일~수요일 — 나머지 일괄 처리

**2️⃣ Google Cloud → 3️⃣ GA4 확인 → 4️⃣ Meta 앱 → 5️⃣ 네이버 SA → 7️⃣ GitHub**

### 목요일 — 키 전달

**모은 키를 CTO 최민석에게 전달 (새 세션)**

---

# ✅ 0번 — 네이버 커머스 API (이미 완료)

**확인된 정보** (스크린샷 캡처 기반):
- 애플리케이션 이름: `Pressco21`
- 스토어명: `프레스코21`
- 상태: 활성
- 애플리케이션 ID: `7hUEKOQGxDpri42gkU0OGH`
- 애플리케이션 시크릿: (본인만 열람 — `.secrets` 저장 필요)
- API 호출 허용 IP: 
  - 119.70.128.56 (사무실/집 고정 IP 추정)
  - 158.180.77.201 (본진 Oracle)
  - 158.179.193.173 (플로라 Oracle)
- **⚠️ 인증 기한: 2026-08-19 ~ 2026-09-01** (이때 갱신 필요, 캘린더 알림 등록 권장)

**필요한 작업**: 
- [ ] "복사" 버튼으로 **애플리케이션 시크릿** 값 복사해두기 → 아래 키 전달 템플릿에 붙여넣기

---

# ✅ 1번 — Google Ads Developer Token (2026-04-17 신청 완료)

**MCC 계정**: `636-189-5201` (프레스코21 관리자)
**광고주 계정**: `285-475-7317` (프레스코21)

**저장된 값**:
- [x] `GOOGLE_ADS_DEVELOPER_TOKEN` = `nxVEoBPdty8rbNNJqsPTGg`
- [x] `GOOGLE_ADS_MCC_ID` = `6361895201` (하이픈 제거)

**기본 액세스 신청**: 2026-04-17 22:20 제출 완료
- 디자인 문서 첨부: `PRESSCO21_Google_Ads_API_Design_Doc.rtf` (바탕화면)
- 승인 메일: `jiho5755@gmail.com`으로 수신 예정 (~4/22)
- **승인 전까지는 테스트 계정만 접근 가능**

---

# ✅ 2번 — Google Cloud Console (2026-04-17 완료)

**프로젝트**: `pressco21-mcp`
**콘솔**: https://console.cloud.google.com/apis/credentials?project=pressco21-mcp

**완료 항목**:
- [x] 프로젝트 생성: `pressco21-mcp`
- [x] API 활성화: Google Analytics Data API + Google Ads API
- [x] OAuth 동의 화면: 외부, 앱 이름 `pressco21-mcp`
- [x] OAuth 클라이언트 ID: `ga4-mcp-reader` (데스크톱 앱)
- [x] 서비스 계정: `ga4-mcp-reader` (키 JSON 발급)
- [x] 구 OAuth 시크릿(`****xkW0`) 삭제, 신규(`****nvKt`)만 유지

**저장된 값**:
- [x] OAuth JSON: `~/secrets/oauth-desktop.json`
  - Client ID: `106305278194-sro7...` (JSON 파일 참조)
  - Client Secret: JSON 파일 내 `client_secret` 참조
- [x] 서비스 계정 JSON: `~/secrets/ga4-sa.json`
  - 이메일: `ga4-mcp-reader@pressco21-mcp.iam.gserviceaccount.com`
  - Key ID: `1367e28c31536dd054c8a8d87eb3934744162b9f`

---

# ✅ 3번 — GA4 속성 ID + 서비스 계정 뷰어 (2026-04-17 완료)

**저장된 값**:
- [x] `GA4_PROPERTY_ID` = `473280152`
- [x] 측정 ID: `G-CWQYWF1580`
- [x] 서비스 계정 `ga4-mcp-reader@pressco21-mcp.iam.gserviceaccount.com` → **뷰어** 역할 추가 완료
- [x] 계정: 프레스코21 > 프레스코21 속성

---

# 🟡 4번 — Meta for Developers 앱 (30분)

**URL**: https://developers.facebook.com

**순서**:

**A. 앱 생성**
1. 우측 상단 **로그인** (페이스북 계정, PRESSCO21 광고 운영 계정으로)
2. **내 앱** → **앱 만들기**
3. 앱 유형: **비즈니스 (Business)** 선택 → 다음
4. 앱 이름: `PRESSCO21 MCP`, 담당자 이메일 → **앱 만들기**

**B. Marketing API 추가**
5. 왼쪽 메뉴 → **"제품 추가"** → **Marketing API** 찾아서 **"설정"**
6. 왼쪽 하단 **설정 > 기본 설정**
7. **앱 ID** 메모 / **앱 시크릿** → "보기" 버튼 → 패스워드 입력 → 메모

**C. Access Token 발급**
8. 상단 메뉴 **도구 > Graph API Explorer** (또는 https://developers.facebook.com/tools/explorer)
9. 좌측 **앱** 드롭다운에서 방금 만든 `PRESSCO21 MCP` 선택
10. **권한 추가**:
    - `ads_read` ✓
    - `ads_management` ✓
    - `business_management` ✓
    - `pages_read_engagement` ✓ (선택)
11. **Generate Access Token** 클릭 → 페이스북 로그인 확인 → 단기 토큰 생성됨 (2시간 유효)
12. 토큰 복사

**D. 장기 토큰 변환** (60일 유효)
13. 브라우저 주소창에 아래 URL을 **본인 값으로 채워서** 붙여넣기:
    ```
    https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id={앱ID}&client_secret={앱시크릿}&fb_exchange_token={단기토큰}
    ```
    예시 (실제 값 대입):
    - `{앱ID}` → 8번에서 메모한 앱 ID
    - `{앱시크릿}` → 7번에서 메모한 앱 시크릿
    - `{단기토큰}` → 12번에서 복사한 토큰
14. Enter → JSON 응답에서 `access_token` 값 복사 → **장기 토큰 60일 유효**

**E. 광고 계정 ID 확인**
15. https://business.facebook.com/adsmanager 접속
16. 상단 계정 드롭다운에서 PRESSCO21 광고 계정 선택
17. URL 또는 비즈니스 매니저 설정에서 `act_XXXXXXXXXX` 형식 숫자 메모

**저장할 값**:
- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `META_ACCESS_TOKEN` (장기 토큰)
- [ ] `META_AD_ACCOUNT_ID` (`act_XXXXXXXXXX` 형식)
- [ ] **갱신 일정**: 60일 후 만료 → 캘린더 알림 `2026-06-16` 등록

---

# ✅ 5번 — 네이버 검색광고 API (이미 완료, naver-ads-mcp 운영 중)

**저장된 값**:
- [x] `NAVER_SA_API_KEY` = `0100000000b1020850a46ab061637f8150f6854b8428917c6433f84392f7f5e19ef0915bfd`
- [x] `NAVER_SA_SECRET_KEY` = `AQAAAAAfrmgCNYGutQdxOVviUd1jBDqjExOzPnFGX4LtQ5VUEg==`
- [x] `NAVER_SA_CUSTOMER_ID` = `316834`

**MCP 현황**: naver-ads-mcp Phase 3 완료, 54개 도구, Oracle 서버 Docker 배포, n8n WF [F14] 활성

---

# ✅ 6번 — 네이버 개발자센터 (이미 완료)

**저장된 값**:
- [x] `NAVER_DEV_CLIENT_ID` = `HLhfhJLCp6sRPWDKl0He`
- [x] `NAVER_DEV_CLIENT_SECRET` = `kuQJrnTd0p`

---

# ✅ 7번 — GitHub Personal Access Token (이미 완료)

**저장된 값**:
- [x] `GITHUB_PAT` = `.secrets.env 참조` (Fine-grained token, pressco21-mcp)
- [x] 만료: 90일 (갱신 알림 필요)

---

# 📋 CTO 전달용 키 템플릿 (목요일 복붙)

가입 완료 후 아래 템플릿을 채워서 새 세션에서 CTO 최민석에게 전달:

```
# .secrets 추가 요청 (pressco21/.secrets에 저장)

[네이버 커머스 API - 이미 발급됨]
NAVER_COMMERCE_CLIENT_ID=7hUEKOQGxDpri42gkU0OGH
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$fLGhfY/cRL81XLSGW8ktn.

[GA4]
GA4_PROPERTY_ID=473280152
GA4_SA_PATH=/Users/jangjiho/secrets/ga4-sa.json
GA4_SA_EMAIL=ga4-mcp-reader@pressco21-mcp.iam.gserviceaccount.com
GA4_OAUTH_PATH=/Users/jangjiho/secrets/oauth-desktop.json

[Google Ads]
GADS_DEVELOPER_TOKEN=nxVEoBPdty8rbNNJqsPTGg
GADS_MCC_ID=6361895201
GADS_CUSTOMER_ID=2854757317

[Meta Ads]
META_APP_ID=1668137334197768
META_APP_SECRET=(.secrets.env 참조)
META_ACCESS_TOKEN=(.secrets.env 참조, 장기토큰 60일)
META_AD_ACCOUNT_ID=act_1473631823331263
META_TOKEN_EXPIRES=2026-06-17

[Naver SearchAd] — naver-ads-mcp 서버 .env에 이미 등록됨
NAVER_SA_API_KEY=0100000000b1020850a46ab061637f8150f6854b8428917c6433f84392f7f5e19ef0915bfd
NAVER_SA_SECRET_KEY=AQAAAAAfrmgCNYGutQdxOVviUd1jBDqjExOzPnFGX4LtQ5VUEg==
NAVER_SA_CUSTOMER_ID=316834

[Naver Developer]
NAVER_DEV_CLIENT_ID=HLhfhJLCp6sRPWDKl0He
NAVER_DEV_CLIENT_SECRET=kuQJrnTd0p

[GitHub]
GITHUB_PAT=(`.secrets.env` 참조)
GITHUB_PAT_EXPIRES=2026-07-16
```

**전달 방법**: 새 Claude Code 세션 열고 다음 문장 복붙:
> "최민석 CTO님, MEMORY의 mcp-setup-strategy 확인해주세요. API Key 7종 발급 완료했습니다. 아래 값들을 `.secrets`에 저장하고 `.mcp.json` 설정 시작해주세요. [위 템플릿 붙여넣기]"

**보안**:
- `.secrets` 파일은 **절대 git 커밋 금지** (`.gitignore` 확인됨)
- 이 체크리스트 문서도 값 채운 후엔 git에 올리지 말고 로컬 보관

---

# 🚨 막힐 때 대처법

| 상황 | 해결 |
|------|------|
| 가입 페이지에서 버튼을 못 찾겠다 | 스크린샷 찍어 새 세션에 업로드 → `"유준호 페어코더, 여기서 막혔어요"` |
| OAuth 승인 에러 | `"최민석 CTO, OAuth 에러 났어요 [에러 메시지]"` |
| 영어 폼이 이해 안 됨 | `"유준호님, 이거 영어로 뭐라고 써야 돼요? [용도 설명]"` |
| 2단계 인증·휴대폰 막힘 | 관련 계정의 본인 인증 먼저 완료 후 재시도 |
| Developer Token 반려 | 사용 목적 영문 재작성 (위 1번 예시 참고) |

---

# 캘린더 알림 등록 권장 (만료 관리)

| 날짜 | 알림 내용 |
|------|---------|
| 2026-06-16 | Meta Ads 토큰 갱신 (60일 만료) |
| 2026-07-16 | GitHub PAT 갱신 (90일 만료) |
| 2026-08-05 | 네이버 커머스 API 갱신 준비 (2주 전) |
| 2026-08-19 | 네이버 커머스 API 인증 기한 시작 |

---

# 진행 기록

**2026-04-17 (목요일) — 일괄 처리**
- [x] Google Ads Developer Token 신청 + 기본 액세스 신청 완료
- [x] Google Cloud Console 프로젝트 `pressco21-mcp` 생성
- [x] OAuth 클라이언트 JSON 다운로드 (`~/secrets/oauth-desktop.json`)
- [x] 서비스 계정 JSON 다운로드 (`~/secrets/ga4-sa.json`)
- [x] GA4 속성 ID `473280152` 확인 + 서비스 계정 뷰어 추가
- [x] OAuth 구 시크릿 삭제, 신규만 유지
- [x] Meta 앱 `1668137334197768` 생성 (토큰은 다른 세션)
- [x] naver-ads-mcp Phase 3 main 머지 + 푸시

**대기 중**
- [ ] Google Ads 기본 액세스 승인 메일 확인 (~4/22, `jiho5755@gmail.com`)
- [ ] Meta 장기 토큰 발급 (다른 세션)

**승인 후**
- [ ] google-ads-mcp 설치 + `.mcp.json` 설정
- [ ] GA4 MCP 설치 (서비스 계정 준비 완료, 즉시 가능)
- [ ] 4/27 GFA 카탈로그 ROAS 판단

---

**문서 경로**: `/Users/jangjiho/workspace/pressco21/docs/mcp-setup/signup-checklist.md`
**작성**: 2026-04-17
**소유**: 장지호 팀장 (본인만 열람 권장)
