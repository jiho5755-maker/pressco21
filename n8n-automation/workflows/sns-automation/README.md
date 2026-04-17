# SNS 자동화 워크플로우

Instagram + Threads 자동화 시스템 (2026-04-17 설계)

## 워크플로우 3종

| WF | 파일 | 설명 | 트리거 |
|----|------|------|--------|
| F030c | `F030c-instagram-weekly-insights.json` | 인스타 주간 인사이트 리포트 | 매주 월 08:00 KST |
| F031 | `F031-instagram-threads-publish.json` | 인스타+Threads 동시 발행 | 웹훅 POST |
| F032 | `F032-content-scheduler.json` | 콘텐츠 예약 발행 스케줄러 | 30분마다 |

## 필수 환경변수 (n8n .env)

```env
# Instagram Graph API
META_ACCESS_TOKEN=<장기토큰>
IG_BUSINESS_ACCOUNT_ID=<인스타그램 비즈니스 계정 ID>

# Threads API  
THREADS_USER_ID=<Threads 사용자 ID>

# F032 예약 발행용 NocoDB 테이블
NOCODB_TABLE_SNS_SCHEDULE=<NocoDB 테이블 ID>
```

## 세팅 순서

### 1단계: Instagram 비즈니스 계정 확인

1. 인스타그램 앱 → 설정 → 계정 → 프로페셔널 계정으로 전환 (이미 비즈니스면 스킵)
2. Facebook 페이지와 연결 확인 (설정 → 연결된 계정 → Facebook)

### 2단계: Meta 앱 토큰 생성

1. https://developers.facebook.com/apps/1668137334197768/ 접속
2. Instagram → Instagram 로그인이 포함된 API 설정
3. "계정 추가" 클릭 → Instagram 계정 로그인
4. 생성된 토큰을 장기 토큰으로 교환:
   ```
   GET https://graph.facebook.com/v25.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=1668137334197768
     &client_secret=<앱시크릿>
     &fb_exchange_token=<단기토큰>
   ```
5. 응답의 `access_token`을 n8n .env `META_ACCESS_TOKEN`에 저장

### 3단계: Instagram Business Account ID 찾기

토큰 생성 후 아래 API 호출:
```
GET https://graph.facebook.com/v25.0/me/accounts
  ?fields=id,name,instagram_business_account
  &access_token=<토큰>
```
→ `instagram_business_account.id` 값이 `IG_BUSINESS_ACCOUNT_ID`

### 4단계: n8n 배포

```bash
# .env에 환경변수 추가 후
bash pressco21/n8n-automation/_tools/deploy.sh <WF_ID> <JSON_PATH>
```

### 5단계: F032용 NocoDB 테이블 생성

Shop-BI 베이스에 `sns_schedule` 테이블 생성:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| Id | Auto | PK |
| caption | LongText | 캡션 |
| hashtags | Text | 해시태그 |
| image_url | URL | MinIO 이미지 URL |
| media_type | SingleSelect | IMAGE/VIDEO/CAROUSEL_ALBUM |
| platforms | Text | instagram,threads |
| scheduled_at | DateTime | 발행 예정 시각 |
| status | SingleSelect | pending/publishing/published/failed |
| published_at | DateTime | 실제 발행 시각 |
| error_log | LongText | 에러 내용 |

## API 제한

- Instagram Graph API: 시간당 200회 호출
- Threads API: 시간당 250회 호출  
- META_ACCESS_TOKEN 만료: 약 60일 → 자동 갱신 WF 추가 예정

## 관련 앱

- Meta App: PRESSCO21 Ads (ID: 1668137334197768)
- Instagram App: PRESSCO21 Ads-IG (ID: 2070191633541972)
- 앱 모드: 개발 (본인 계정 테스트 가능, 라이브 전환 시 앱 검수 필요)
