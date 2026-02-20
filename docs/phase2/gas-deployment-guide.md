# PRESSCO21 파트너 클래스 플랫폼 - GAS 배포 가이드

> **Task**: Task 201
> **작성일**: 2026-02-21
> **대상**: `파트너클래스/class-platform-gas.gs`

---

## 1. 사전 준비

### 1.1 필요한 계정/권한

| 항목 | 필요 여부 | 비고 |
|------|----------|------|
| Google 계정 | 필수 | Google Apps Script 실행용 |
| 메이크샵 관리자 접근 | 필수 | Shopkey, Licensekey 확인 |
| 메이크샵 오픈 API 권한 | 필수 | 적립금(process_reserve), 주문(search_order) 허용 |

### 1.2 메이크샵 관리자에서 확인할 사항

1. **상점 관리 > 쇼핑몰구축 > 오픈 API**에서:
   - "적립금 처리(process_reserve)" 권한: **허용**
   - "주문 조회(search_order)" 권한: **허용**
   - Shopkey와 Licensekey 복사
2. **허용 IP 설정**:
   - GAS는 Google 서버에서 실행되므로 IP가 유동적
   - IP 제한이 있다면 **IP 제한 해제** 또는 프록시 검토 필요
   - 상세: `docs/api-verification/reserve-api-result.md` 4절 참고

---

## 2. Google Sheets 스프레드시트 생성

### 2.1 새 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. "빈 스프레드시트" 생성
3. 이름을 **"PRESSCO21 클래스 플랫폼"**으로 변경
4. URL에서 스프레드시트 ID 복사:
   ```
   https://docs.google.com/spreadsheets/d/{이 부분이 SPREADSHEET_ID}/edit
   ```

### 2.2 시트 자동 초기화 (권장)

아래 3단계의 GAS 프로젝트 생성 후 `initSheets()` 함수를 실행하면 자동으로 6개 시트가 생성됩니다.

### 2.3 시트 수동 생성 (자동 초기화 실패 시)

시트 6개를 아래 이름과 헤더로 생성합니다:

**시트 1: "파트너 상세"**
```
A: partner_code
B: member_id
C: partner_name
D: grade
E: email
F: phone
G: location
H: commission_rate
I: reserve_rate
J: class_count
K: avg_rating
L: education_completed
M: portfolio_url
N: instagram_url
O: partner_map_id
P: approved_date
Q: status
R: notes
```

**시트 2: "클래스 메타"**
```
A: class_id
B: makeshop_product_id
C: partner_code
D: class_name
E: category
F: level
G: price
H: duration_min
I: max_students
J: description
K: curriculum_json
L: instructor_bio
M: thumbnail_url
N: image_urls
O: youtube_video_id
P: location
Q: materials_included
R: materials_product_ids
S: tags
T: status
U: created_date
V: class_count
W: avg_rating
```

**시트 3: "정산 내역"**
```
A: settlement_id
B: order_id
C: partner_code
D: class_id
E: member_id
F: order_amount
G: commission_rate
H: commission_amount
I: reserve_rate
J: reserve_amount
K: class_date
L: student_count
M: status
N: reserve_paid_date
O: reserve_api_response
P: error_message
Q: student_email_sent
R: partner_email_sent
S: created_date
T: completed_date
```

**시트 4: "주문 처리 로그"**
```
A: log_id
B: poll_time
C: orders_found
D: orders_processed
E: errors
F: duration_ms
```

**시트 5: "이메일 발송 로그"**
```
A: log_date
B: daily_count
C: recipient
D: email_type
E: status
F: error_message
```

**시트 6: "시스템 설정"**
```
A: key
B: value
C: updated_at
```

---

## 3. GAS 프로젝트 생성

### 3.1 새 GAS 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. 좌측 상단 "새 프로젝트" 클릭
3. 프로젝트 이름을 **"PRESSCO21-ClassPlatform"**으로 변경

### 3.2 코드 복사

1. 기본 생성된 `Code.gs` 파일을 클릭
2. 기존 내용을 모두 삭제
3. `파트너클래스/class-platform-gas.gs` 파일의 전체 내용을 복사-붙여넣기
4. `Ctrl+S` (또는 `Cmd+S`)로 저장

### 3.3 스크립트 속성 설정

1. 좌측 메뉴 > "프로젝트 설정" (톱니바퀴 아이콘) 클릭
2. 하단 "스크립트 속성" 섹션에서 "속성 추가"를 반복:

| 속성 이름 | 값 | 설명 |
|----------|---|------|
| `SHOPKEY` | (메이크샵 상점키) | 메이크샵 관리자 > 오픈 API에서 확인 |
| `LICENSEKEY` | (메이크샵 라이센스키) | 메이크샵 관리자 > 오픈 API에서 확인 |
| `SHOP_DOMAIN` | `foreverlove.co.kr` | 상점 도메인 |
| `SPREADSHEET_ID` | (위 2.1에서 복사한 ID) | Google Sheets 스프레드시트 ID |
| `ADMIN_EMAIL` | (관리자 이메일) | 에러 알림 수신 이메일 |
| `GAS_ENDPOINT` | (배포 후 설정) | 웹 앱 배포 URL (4단계 후 설정) |

3. "스크립트 속성 저장" 클릭

---

## 4. 시트 초기화 실행

### 4.1 initSheets 함수 실행

1. GAS 편집기로 돌아가기
2. 상단 함수 선택 드롭다운에서 **`initSheets`** 선택
3. "실행" 버튼 클릭
4. 첫 실행 시 권한 승인 팝업:
   - "권한 검토" 클릭
   - Google 계정 선택
   - "고급" > "PRESSCO21-ClassPlatform(으)로 이동" 클릭
   - "허용" 클릭
5. 실행 로그 확인 (하단 "실행 로그" 탭):
   - `[생성] 시트: 파트너 상세 (컬럼 18개)` 등의 메시지 확인

### 4.2 설정 확인

1. 함수 선택 드롭다운에서 **`checkConfig`** 선택
2. "실행" 버튼 클릭
3. 실행 로그에서 모든 항목이 `[OK]`인지 확인
4. `[누락]` 항목이 있으면 3.3 스크립트 속성을 다시 확인

---

## 5. 웹 앱 배포

### 5.1 배포

1. 상단 메뉴 > "배포" > "새 배포"
2. 배포 유형: **"웹 앱"** 선택
3. 설정:
   - **설명**: "PRESSCO21 클래스 플랫폼 API v1"
   - **실행 계정**: "나" (본인 Google 계정)
   - **액세스 권한**: "모든 사용자" (누구나 액세스 가능)
     - 주의: 보안은 코드 내 Referer 체크 + 파트너 인증으로 처리
4. "배포" 클릭
5. 배포된 웹 앱 URL 복사:
   ```
   https://script.google.com/macros/s/AKfyc.../exec
   ```

### 5.2 GAS_ENDPOINT 속성 업데이트

1. "프로젝트 설정" > "스크립트 속성"
2. `GAS_ENDPOINT` 속성의 값을 위 5.1에서 복사한 URL로 설정
3. 저장

### 5.3 배포 테스트

브라우저에서 아래 URL을 직접 입력하여 테스트:

```
{배포 URL}?action=health
```

응답 예시:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-02-21 15:30:00"
}
```

클래스 목록 테스트:
```
{배포 URL}?action=getClasses&sort=latest&page=1&limit=5
```

---

## 6. 시간 트리거 설정

### 6.1 주문 폴링 트리거 (10분 간격)

1. 좌측 메뉴 > "트리거" (시계 아이콘) 클릭
2. 우하단 "트리거 추가" 클릭
3. 설정:
   - **실행할 함수**: `triggerPollOrders`
   - **배포**: "헤드"
   - **이벤트 소스**: "시간 기반"
   - **시간 기반 트리거 유형**: "분 타이머"
   - **분 간격**: "10분마다"
4. "저장" 클릭

### 6.2 리마인더 이메일 트리거 (매일 오전 9시)

1. "트리거 추가" 클릭
2. 설정:
   - **실행할 함수**: `triggerSendReminders`
   - **배포**: "헤드"
   - **이벤트 소스**: "시간 기반"
   - **시간 기반 트리거 유형**: "일 타이머"
   - **시간**: "오전 9시~10시"
3. "저장" 클릭

### 6.3 후기 요청 트리거 (매일 오전 10시)

1. "트리거 추가" 클릭
2. 설정:
   - **실행할 함수**: `triggerSendReviewRequests`
   - **배포**: "헤드"
   - **이벤트 소스**: "시간 기반"
   - **시간 기반 트리거 유형**: "일 타이머"
   - **시간**: "오전 10시~11시"
3. "저장" 클릭

### 6.4 정합성 검증 트리거 (매일 자정)

1. "트리거 추가" 클릭
2. 설정:
   - **실행할 함수**: `triggerReconciliation`
   - **배포**: "헤드"
   - **이벤트 소스**: "시간 기반"
   - **시간 기반 트리거 유형**: "일 타이머"
   - **시간**: "자정~오전 1시"
3. "저장" 클릭

### 6.5 트리거 설정 요약

| 트리거 | 함수 | 간격 | 용도 |
|--------|------|------|------|
| 주문 폴링 | `triggerPollOrders` | 매 10분 | 새 주문 감지 + 정산 |
| 리마인더 | `triggerSendReminders` | 매일 9시 | D-3, D-1 리마인더 |
| 후기 요청 | `triggerSendReviewRequests` | 매일 10시 | 수강 +7일 후기 유도 |
| 정합성 검증 | `triggerReconciliation` | 매일 자정 | Sheets vs API 잔액 비교 |

---

## 7. 테스트 데이터 입력

### 7.1 테스트 파트너 등록

Google Sheets의 "파트너 상세" 시트에 테스트 데이터 입력:

| partner_code | member_id | partner_name | grade | email | phone | location | commission_rate | reserve_rate | class_count | avg_rating | education_completed | status |
|-------------|-----------|-------------|-------|-------|-------|----------|----------------|-------------|------------|-----------|-------------------|--------|
| PTN001 | jihoo5755 | 테스트 공방 | SILVER | test@example.com | 010-1234-5678 | 서울 강남 | 0.10 | 1.00 | 0 | 0 | TRUE | active |

### 7.2 테스트 클래스 등록

"클래스 메타" 시트에 테스트 데이터 입력:

| class_id | makeshop_product_id | partner_code | class_name | category | level | price | duration_min | max_students | description | status |
|---------|-------------------|-------------|-----------|----------|-------|-------|------------|------------|------------|--------|
| CLS001 | (메이크샵 상품 branduid) | PTN001 | 압화 원데이 클래스 | 압화 | beginner | 55000 | 120 | 8 | 압화를 처음 접하는 분을 위한 입문 클래스입니다. | active |

### 7.3 전체 테스트 실행

1. GAS 편집기에서 **`runFullTest`** 함수 실행
2. 실행 로그 확인:
   - `[getClasses] success=true` 메시지 확인
   - `[getCategories] success=true` 메시지 확인

### 7.4 API 엔드포인트 테스트

브라우저 또는 curl로 각 엔드포인트 테스트:

```bash
# 클래스 목록
curl "{배포URL}?action=getClasses"

# 클래스 상세
curl "{배포URL}?action=getClassDetail&id=CLS001"

# 파트너 인증
curl "{배포URL}?action=getPartnerAuth&member_id=jihoo5755"

# 파트너 대시보드
curl "{배포URL}?action=getPartnerDashboard&member_id=jihoo5755"

# 카테고리
curl "{배포URL}?action=getCategories"
```

---

## 8. 배포 후 코드 업데이트

GAS 코드를 수정한 후 반영하려면:

1. GAS 편집기에서 코드 수정 + 저장
2. 상단 메뉴 > "배포" > "배포 관리"
3. 해당 배포의 "수정" (연필 아이콘) 클릭
4. **버전**: "새 버전"으로 변경
5. "배포" 클릭

주의: "새 버전"을 선택하지 않으면 이전 코드가 계속 실행됩니다.

---

## 9. 모니터링

### 9.1 실행 로그 확인

- GAS 편집기 > 좌측 "실행" 메뉴
- 각 실행의 시작/종료 시간, 상태, 로그 확인 가능

### 9.2 Google Sheets 확인

| 시트 | 확인 사항 |
|------|----------|
| 정산 내역 | 새 주문 정산 기록, status 컬럼 (COMPLETED/FAILED) |
| 주문 처리 로그 | 폴링 실행 이력, 오류 건수 |
| 이메일 발송 로그 | 일일 발송 카운트, 실패 건 |
| 시스템 설정 | last_poll_time 정상 업데이트 여부 |

### 9.3 알림 이메일

다음 상황에서 관리자 이메일(ADMIN_EMAIL)로 알림이 발송됩니다:

| 상황 | 제목 패턴 |
|------|----------|
| 적립금 지급 실패 | `[PRESSCO21] 적립금 지급 실패 알림` |
| 이메일 70건 도달 | `[PRESSCO21] 일일 이메일 70건 도달` |
| 정합성 불일치 | `[PRESSCO21] 정합성 검증 불일치 감지` |
| 심각한 에러 | `[PRESSCO21] Critical Error: {함수명}` |

---

## 10. 트러블슈팅

### Q1: "허가된 IP가 아닙니다" 에러

메이크샵 오픈 API에 IP 제한이 설정되어 있습니다.
- **해결**: 메이크샵 관리자 > 오픈 API > IP 제한 설정에서 제한 해제
- **대안**: Cloudflare Workers를 프록시로 사용 (고정 IP 확보)

### Q2: "데이터 수정 실패" 에러 (메이크샵 편집기)

이 에러는 메이크샵 HTML 편집기에서 발생하는 것으로, GAS 코드와 무관합니다.
- 프론트엔드 JS에서 `${variable}` 대신 `\${variable}` 사용 필수

### Q3: GAS 실행 시간 초과 (6분)

- 개인 Gmail: 최대 6분/실행
- 대용량 주문 처리 시 배치 분할 필요
- **권장**: Google Workspace 전환 (30분/실행)

### Q4: 이메일 발송 한도 초과

- Gmail 무료: 일 100명
- 70건 도달 시 자동 알림 발송됨
- **해결**: Google Workspace Starter 전환 (약 8,000원/월, 1,500건/일)

### Q5: "정산 내역" 시트가 10,000행 이상

- 성능 저하 시작점: 약 10,000행
- **해결**: 월별로 시트 분리 (예: "정산 내역 2026-01", "정산 내역 2026-02")
- 또는 완료된 건을 "정산 아카이브" 시트로 이동

---

## 11. 프론트엔드 연동 참고

### 11.1 메이크샵 HTML에서 GAS 호출 패턴

```html
<!-- 파트너 인증용 가상태그 (메이크샵 HTML에 삽입) -->
<!-- 주의: {$member_id} 형식은 동작하지 않음! -->
<span id="ptn-user-id" style="display:none"><!--/user_id/--></span>
```

```javascript
// 프론트엔드 JS (IIFE 패턴, 메이크샵 편집기용)
(function() {
  var GAS_URL = '배포 URL';

  // 회원 ID 가져오기 (가상태그에서 치환된 값)
  var memberId = document.getElementById('ptn-user-id').textContent.trim();

  // 클래스 목록 조회 (localStorage 캐싱 포함)
  function getClasses(options) {
    var cacheKey = 'pc21_class_list';
    var cached = localStorage.getItem(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 3600000) { // 1시간
        return Promise.resolve(parsed.data);
      }
    }

    var url = GAS_URL + '?action=getClasses'
      + '&sort=' + (options.sort || 'latest')
      + '&page=' + (options.page || 1)
      + '&limit=' + (options.limit || 20);

    return fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: data,
            timestamp: Date.now()
          }));
        }
        return data;
      });
  }

  // 파트너 인증 (캐시 30분)
  function checkPartnerAuth() {
    if (!memberId) return Promise.resolve({ success: true, data: { is_partner: false } });

    var url = GAS_URL + '?action=getPartnerAuth&member_id=' + encodeURIComponent(memberId);
    return fetch(url).then(function(res) { return res.json(); });
  }
})();
```

### 11.2 에러 코드 처리

| GAS 에러 코드 | 프론트엔드 대응 |
|-------------|--------------|
| NOT_LOGGED_IN | 로그인 유도 모달 표시 |
| NOT_PARTNER | "파트너 전용" 안내 |
| PARTNER_INACTIVE | "계정 비활성" 안내 |
| CLASS_NOT_FOUND | 404 페이지 또는 목록으로 이동 |
| LOCK_TIMEOUT | "잠시 후 다시 시도" 안내 |
| INTERNAL_ERROR | "일시적 오류" 안내 + 새로고침 버튼 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-21 | 초기 배포 가이드 작성 (Task 201) |
