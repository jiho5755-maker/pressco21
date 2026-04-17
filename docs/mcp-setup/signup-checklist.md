# MCP 세팅 — 가입·인증 체크리스트 (비전공자용)

> 작성: 2026-04-17 (장지호 팀장 직접 수행용)
> 원칙: 따라하면 되게. 막히면 `/board-call 유준호 가입도움` 세션 열기

---

## 전체 현황 한눈에

| # | 항목 | 상태 | 소요 | 우선순위 |
|---|------|------|------|--------|
| 0 | 네이버 커머스 API | ✅ **완료** (Application ID: `7hUEKOQGxDpri42gkU0OGH`) | — | — |
| 1 | Google Ads Developer Token | ⏳ 신청 필요 | 5분 신청 + 승인 1~7일 | 🔴 **최우선** |
| 2 | Google Cloud Console + OAuth | ⏳ | 30분 | 🟡 |
| 3 | Google Analytics 4 속성 ID 확인 | ⏳ 확인만 | 5분 | 🟡 |
| 4 | Meta for Developers 앱 + Access Token | ⏳ | 30분 | 🟡 |
| 5 | 네이버 검색광고 API | ⏳ | 15분 | 🟡 |
| 6 | 네이버 개발자센터 (보조) | ⏳ | 10분 | 🟢 선택 |
| 7 | GitHub Personal Access Token | ⏳ | 10분 | 🟢 |

**총 소요**: 실제 작업 ~2시간, 승인 대기 포함 3~7일

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

# 🔴 1번 — Google Ads Developer Token (최우선, 승인 대기)

**왜 먼저?**: 승인 1~7일 걸려서 기다리는 시간이 가장 큽니다.

**URL**: https://ads.google.com/aw/apicenter

**전제조건 확인**:
- Google Ads 계정이 **MCC(관리자 계정)**여야 함
- 일반 광고주 계정이면 먼저 MCC 생성: https://ads.google.com/home/tools/manager-accounts/ (무료, 5분)

**순서**:
1. https://ads.google.com 로그인 (MCC 계정으로)
2. 우측 상단 **도구 및 설정** (렌치 아이콘) → **설정 > API 센터**
3. **토큰 신청 양식 입력**:
   - 회사 이름: `PRESSCO21`
   - 연락처: 지호님 이메일
   - 사용 목적 (영문 권장, 구체적으로):
     ```
     Internal use only. Automating our own Google Ads account 
     reporting and bid optimization via MCP (Model Context Protocol) 
     server connected to Claude AI. No third-party client access.
     ```
   - 예상 일 API 호출량: `1000 requests/day or less`
4. **Basic Access** 신청 버튼 클릭
5. 이메일 확인 — 승인 메일 대기 (1~7일, 평균 2~3일)

**주의**:
- 사용 목적 1~2문장으로 너무 짧으면 **반려됨** → 위 영문 그대로 복붙 추천
- 승인 전에도 토큰 문자열은 보임 — 하지만 **승인 전까지는 API 호출 불가**

**저장할 값**:
- [ ] `GOOGLE_ADS_DEVELOPER_TOKEN` (승인 후 API 센터 상단에서 복사)

---

# 🟡 2번 — Google Cloud Console (30분)

**왜**: GA4·Google Ads API를 프로그램에서 쓰려면 "열쇠"를 여기서 만듭니다.

**URL**: https://console.cloud.google.com

**순서**:

**A. 프로젝트 생성**
1. Google 계정 (jiho5755@gmail.com) 로그인
2. 상단 중앙 **프로젝트 선택** 드롭다운 → **"새 프로젝트"**
3. 프로젝트 이름: `pressco21-mcp` → **만들기**
4. 만든 후 상단 드롭다운에서 `pressco21-mcp` 선택됐는지 확인

**B. API 활성화**
5. 왼쪽 **☰ 햄버거 메뉴** → **"API 및 서비스"** → **"라이브러리"**
6. 검색창 **"Google Analytics Data API"** → 클릭 → **"사용" 버튼**
7. 라이브러리로 돌아가 **"Google Ads API"** 검색 → **"사용"**

**C. OAuth 동의 화면 구성**
8. 왼쪽 메뉴 → **"OAuth 동의 화면"**
9. User Type: **외부** 선택 → 만들기
10. 앱 이름: `pressco21-mcp`
11. 사용자 지원 이메일: 본인
12. 개발자 연락처: 본인 이메일
13. **저장 후 계속** → 범위(건너뜀) → 테스트 사용자: **본인 이메일 추가** → 저장

**D. OAuth 클라이언트 ID 발급**
14. **"사용자 인증 정보"** → **"+ 사용자 인증 정보 만들기"** → **"OAuth 클라이언트 ID"**
15. 애플리케이션 유형: **데스크톱 앱**
16. 이름: `mcp-desktop-client` → **만들기**
17. 팝업 나오면 **"JSON 다운로드"** → 바탕화면 보관 (파일명: `client_secret_xxxxx.json`)

**E. 서비스 계정 발급 (GA4용 별도)**
18. **"사용자 인증 정보"** → **"+ 사용자 인증 정보 만들기"** → **"서비스 계정"**
19. 이름: `ga4-mcp-reader` → **만들고 계속**
20. 역할: **건너뜀** (GA4 측에서 권한 부여 예정)
21. 완료 → 생성된 서비스 계정 클릭 → **"키"** 탭 → **"키 추가 > 새 키 만들기"** → **JSON** → 만들기
22. JSON 파일 다운로드 (파일명: `pressco21-mcp-xxxxx.json`) → 바탕화면 보관
23. 서비스 계정 이메일 복사해두기 (예: `ga4-mcp-reader@pressco21-mcp.iam.gserviceaccount.com`)

**결제수단**: 불필요 (이 단계는 무료 한도)

**저장할 값**:
- [ ] OAuth JSON 파일 경로
- [ ] 서비스 계정 JSON 파일 경로
- [ ] 서비스 계정 이메일

---

# 🟡 3번 — GA4 속성 ID 확인 + 서비스 계정 추가 (10분)

**URL**: https://analytics.google.com

**순서**:
1. GA4 로그인 (foreverlove.co.kr 운영 계정)
2. 좌측 하단 **⚙ 관리** 클릭
3. **속성** 칼럼 → **속성 세부정보** 클릭
4. **속성 ID** 복사 (9~10자리 숫자, 예: `123456789`)
5. **속성 액세스 관리** 클릭
6. 우측 상단 **+ 추가** → **"사용자 추가"**
7. 이메일: 2번에서 만든 **서비스 계정 이메일** 붙여넣기
8. 역할: **뷰어** (Viewer) 선택
9. **추가**

**저장할 값**:
- [ ] `GA4_PROPERTY_ID` (9~10자리 숫자만)

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

# 🟡 5번 — 네이버 검색광고 API (15분)

**왜**: PRESSCO21 자체 제작 네이버 광고 MCP의 핵심. **커머스 API와는 별개**입니다.

**URL**: https://searchad.naver.com

**순서**:
1. 로그인 (네이버 광고 운영 계정)
2. 우측 상단 본인 아이디 클릭 → **정보관리** (또는 상단 메뉴 **도구 > API 관리**)
3. 좌측 메뉴 **API 사용 관리**
4. **신규 API 라이선스 등록** 클릭
5. 약관 동의
6. 라이선스 유형: **"광고주"** 선택
7. 신청 → 즉시 발급 (일부 계정은 승인 필요)
8. 발급된 **3개 값 모두 메모**:
   - **API Key (Access License)**
   - **Secret Key**
   - **Customer ID** (광고주 고객 ID, 보통 7자리 숫자)

**저장할 값**:
- [ ] `NAVER_SA_API_KEY` (Access License)
- [ ] `NAVER_SA_SECRET_KEY`
- [ ] `NAVER_SA_CUSTOMER_ID`

**막히면**: 일부 계정은 "비즈니스 등급" 업그레이드 필요. 광고 운영 1개월 이상 계정이면 대부분 자동 승인.

---

# 🟢 6번 — 네이버 개발자센터 (선택, 10분)

**왜**: DataLab(검색 트렌드)·쇼핑 인사이트 보조 데이터. 있으면 좋음, 없어도 Phase 1에는 영향 없음.

**URL**: https://developers.naver.com/apps/#/register

**순서**:
1. 네이버 로그인 → **Application 등록**
2. 애플리케이션 이름: `pressco21-mcp`
3. 사용 API: **검색** + **데이터랩(쇼핑인사이트)** 체크
4. 환경: **WEB 설정** → 서비스 URL: `https://foreverlove.co.kr`
5. 등록 → Client ID + Client Secret 즉시 발급

**저장할 값**:
- [ ] `NAVER_DEV_CLIENT_ID`
- [ ] `NAVER_DEV_CLIENT_SECRET`

---

# 🟢 7번 — GitHub Personal Access Token (10분)

**URL**: https://github.com/settings/tokens?type=beta

**순서**:
1. 우측 상단 프로필 → **Settings**
2. 좌측 하단 **Developer settings** → **Personal access tokens > Fine-grained tokens**
3. **Generate new token**
4. 이름: `pressco21-mcp`
5. 만료: **90 days** (3개월 후 재발급 알림 캘린더 등록)
6. Resource owner: `jiho5755-maker` (본인)
7. Repository access: **Only select repositories** → 관련 저장소 체크 (예: `n8n-automation`)
8. Repository permissions:
   - **Contents**: Read and write
   - **Issues**: Read and write
   - **Pull requests**: Read and write
   - **Actions**: Read
   - **Metadata**: Read (자동)
9. **Generate token** → 토큰 즉시 복사 (한 번만 보임!)

**저장할 값**:
- [ ] `GITHUB_PAT` (`github_pat_xxx...` 형식)

---

# 📋 CTO 전달용 키 템플릿 (목요일 복붙)

가입 완료 후 아래 템플릿을 채워서 새 세션에서 CTO 최민석에게 전달:

```
# .secrets 추가 요청 (pressco21/.secrets에 저장)

[네이버 커머스 API - 이미 발급됨]
NAVER_COMMERCE_CLIENT_ID=7hUEKOQGxDpri42gkU0OGH
NAVER_COMMERCE_CLIENT_SECRET=$2a$04$fLGhfY/cRL81XLSGW8ktn.

[GA4]
GA4_PROPERTY_ID=
GA4_SA_PATH=/Users/jangjiho/secrets/ga4-sa.json
GA4_SA_EMAIL=ga4-mcp-reader@pressco21-mcp.iam.gserviceaccount.com
GA4_OAUTH_PATH=/Users/jangjiho/secrets/oauth-desktop.json

[Google Ads]
GADS_DEVELOPER_TOKEN=
GADS_MCC_ID=(하이픈 제거)

[Meta Ads]
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=act_
META_TOKEN_EXPIRES=2026-06-16

[Naver SearchAd]
NAVER_SA_API_KEY=
NAVER_SA_SECRET_KEY=
NAVER_SA_CUSTOMER_ID=

[Naver Developer (선택)]
NAVER_DEV_CLIENT_ID=
NAVER_DEV_CLIENT_SECRET=

[GitHub]
GITHUB_PAT=
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

# 진행 기록 (체크해가며)

**월요일 (2026-04-__)**
- [ ] Google Ads Developer Token 신청 완료
- [ ] 메모: 신청 영문 복붙 완료

**화요일**
- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth + 서비스 계정 JSON 다운
- [ ] GA4 속성 ID 확인 + 서비스 계정 추가

**수요일**
- [ ] Meta 앱 생성 + 장기 토큰 발급
- [ ] 네이버 SA API 라이선스 등록
- [ ] (선택) 네이버 개발자센터 앱
- [ ] GitHub PAT 발급

**목요일**
- [ ] 모든 키 위 템플릿에 정리
- [ ] 새 세션에서 CTO에게 전달

**금요일**
- [ ] MCP 13개 설치 완료 확인
- [ ] 테스트 쿼리 3개 작동 확인

**다음 주 월요일**
- [ ] Google Ads Developer Token 승인 확인
- [ ] 네이버 광고 MCP 제작 착수 세션 열기 (PRD 기반)

---

**문서 경로**: `/Users/jangjiho/workspace/pressco21/docs/mcp-setup/signup-checklist.md`
**작성**: 2026-04-17
**소유**: 장지호 팀장 (본인만 열람 권장)
