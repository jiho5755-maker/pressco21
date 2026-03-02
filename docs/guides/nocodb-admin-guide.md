# PRESSCO21 NocoDB 관리자 운영 매뉴얼

> Task 300 산출물 | 작성일: 2026-02-26
> 대상: 비개발자 관리자

---

## 1. NocoDB 접속

**URL:** https://nocodb.pressco21.com

**계정:**
- 이메일: pressco5755@naver.com
- 비밀번호: (.secrets.env 참조)

접속 후 프로젝트 목록에서 **PRESSCO21** 선택.

---

## 2. 테이블 구조 한눈에 보기

| 테이블명 | 역할 | 주요 작업 |
|---------|------|----------|
| `tbl_Applications` | 파트너 신청 접수 | 신청 심사, 승인/거절 |
| `tbl_Partners` | 승인된 파트너 목록 | 등급 관리, 활성 상태 |
| `tbl_Classes` | 등록된 강의 목록 | 강의 검수, 공개/비공개 |
| `tbl_Settlements` | 정산 내역 | 정산 현황 확인, 완료 처리 |
| `tbl_Reviews` | 수강후기 | 후기 관리, 부적절 내용 삭제 |
| `tbl_PollLogs` | 주문 폴링 로그 | 자동 생성 (수정 불필요) |
| `tbl_EmailLogs` | 이메일 발송 로그 | 자동 생성 (수정 불필요) |
| `tbl_Settings` | 시스템 설정값 | 수수료율, 합격 점수 등 |

---

## 3. 파트너 신청 관리 (tbl_Applications)

### 3-1. 신규 신청 확인

1. 왼쪽 사이드바에서 **tbl_Applications** 클릭
2. **Toolbar** → **Filter** 버튼 클릭
3. `status` = `pending` 필터 적용
4. 신청자 정보 확인:
   - `name`: 신청자 본명
   - `studio_name`: 공방/스튜디오명
   - `specialty`: 전문 분야
   - `email`: 연락처
   - `introduction`: 자기소개

### 3-2. 신청 승인 (자동화 연동)

> **중요:** `status`를 `approved`로 변경하면 NocoDB Webhook이 발동되어 n8n WF-APPROVE가 자동 실행됩니다.

**자동 실행 내용:**
1. WF-APPROVE → WF-08 호출
2. 파트너 코드 자동 생성 (예: `PC_202602_007`)
3. tbl_Partners에 파트너 레코드 자동 생성
4. 메이크샵 회원 그룹을 '파트너' 등급으로 자동 변경
5. 승인 안내 이메일 자동 발송
6. 텔레그램으로 관리자 알림 발송

**승인 절차:**
1. 해당 행의 `status` 셀 클릭
2. `pending` → `approved` 로 변경
3. 클릭 외부를 클릭하거나 Enter로 저장
4. 잠시 후 텔레그램으로 완료 알림 수신 확인

### 3-3. 신청 거절

1. 해당 행의 `status` 셀 클릭
2. `pending` → `rejected` 로 변경 후 저장
3. (선택) `rejection_reason` 필드에 거절 사유 메모

> 거절 시 자동 알림 이메일이 발송되지 않습니다. 필요시 직접 이메일로 안내해주세요.

### 3-4. status 유효값 정리

| status 값 | 의미 |
|-----------|------|
| `pending` | 심사 대기 중 |
| `approved` | 승인 완료 (자동화 실행됨) |
| `rejected` | 거절 |

---

## 4. NocoDB Webhook 설정 (최초 1회 수동 설정 필요)

> 파트너 승인 자동화가 동작하려면 NocoDB Webhook을 한 번만 설정해야 합니다.

### 설정 절차

1. **tbl_Applications** 테이블 선택
2. 우측 상단 **Details** 아이콘 클릭 (또는 Toolbar의 Details)
3. **Webhook** 탭 클릭
4. **+ New Webhook** 버튼 클릭
5. 아래 값 입력:
   - **Title:** NocoDB Auto Approve
   - **Event:** After Update
   - **URL:** `https://n8n.pressco21.com/webhook/nocodb-approve`
   - **Method:** POST
6. **Condition 추가** (선택 사항이지만 권장):
   - Field: `status`
   - Operator: `is`
   - Value: `approved`
7. **Save** 클릭

> Condition을 설정하면 status가 `approved`로 변경될 때만 Webhook이 발동됩니다.
> Condition 없이도 동작하며, WF-APPROVE 내부에서 status 필터를 처리합니다.

### Webhook 테스트

Webhook 설정 후 **Test** 버튼을 눌러 n8n으로 신호가 전달되는지 확인합니다.
n8n에서 `WF-APPROVE NocoDB Auto Approve` 워크플로우의 실행 내역이 생성되면 정상입니다.

---

## 5. 파트너 관리 (tbl_Partners)

### 5-1. 파트너 상태 변경

| status 값 | 의미 |
|-----------|------|
| `active` | 정상 활동 중 |
| `paused` | 일시 정지 (클래스 비공개, 예약 불가) |
| `closed` | 탈퇴/영구 정지 |

> `inactive`는 사용하지 않습니다. 반드시 `paused`를 사용하세요.

### 5-2. 파트너 등급 수동 변경

자동 등급 업데이트(WF-13)는 매주 월요일 새벽 2시에 실행됩니다.
긴급히 등급을 변경해야 하는 경우:

1. `tbl_Partners`에서 해당 파트너 행 찾기
2. `grade` 필드를 직접 수정

| grade 값 | 등급명 | 조건 |
|---------|------|------|
| `SILVER` | Bloom (블룸) | 기본 등급 |
| `GOLD` | Garden (가든) | 10건+, 평점 4.0+ |
| `PLATINUM` | Atelier (아틀리에) | 50건+, 평점 4.5+ |

### 5-3. 수수료율 개별 조정

특정 파트너에게 특별 수수료율을 적용하려면:
1. `tbl_Partners`에서 해당 파트너 행 찾기
2. `commission_rate` 필드 직접 수정 (소수점 형식: 0.15 = 15%)

---

## 6. 강의 검수 (tbl_Classes)

### 6-1. 신규 강의 검수

파트너가 강의 등록을 요청하면 `tbl_Classes`에 `pending` 상태로 추가됩니다.

1. `tbl_Classes` → Filter → `status` = `pending`
2. 강의 정보 확인:
   - `class_name`: 강의명
   - `description`: 강의 설명
   - `price`: 수강료
   - `max_participants`: 최대 인원
   - `partner_code`: 담당 파트너
3. 이상 없으면 `status` → `active` 변경
4. 문제가 있으면 `status` → `rejected` 변경 후 파트너에게 직접 연락

### 6-2. status 유효값

| status 값 | 의미 |
|-----------|------|
| `pending` | 검수 대기 |
| `active` | 공개 (수강 예약 가능) |
| `paused` | 일시 중단 |
| `closed` | 종료 |
| `rejected` | 검수 거절 |

> `inactive`는 사용하지 않습니다. WF-06에서 400 에러 발생합니다.

---

## 7. 정산 관리 (tbl_Settlements)

### 7-1. 정산 현황 확인

필터 활용:
- `status` = `pending`: 정산 대기 건
- `status` = `completed`: 완료된 정산
- `status` = `failed`: 처리 실패 건

### 7-2. 정산 실패 재처리

`status` = `failed`인 건이 있으면 n8n에서 자동 재시도됩니다 (최대 5회).
5회 초과 실패 시 관리자가 직접 처리해야 합니다.

1. 실패 원인 확인: `error_message` 필드 참조
2. 원인 해결 후 `status` → `pending` 으로 변경
3. 다음 배치 실행 시 자동 재처리

### 7-3. 주요 컬럼 설명

| 컬럼명 | 설명 |
|--------|------|
| `order_id` | 메이크샵 주문번호 |
| `partner_code` | 파트너 코드 |
| `class_id` | 강의 ID |
| `order_amount` | 주문 금액 |
| `commission_amount` | 파트너 수수료 (적립금으로 지급) |
| `reserve_amount` | 적립금 지급 금액 |
| `status` | 정산 상태 |
| `student_name` | 수강생 이름 |
| `student_email` | 수강생 이메일 |

---

## 8. 후기 관리 (tbl_Reviews)

### 8-1. 후기 목록 보기

1. `tbl_Reviews` 테이블 선택
2. 최신순 정렬: **Sort** → `CreatedAt` → 내림차순

### 8-2. 부적절 후기 처리

후기 내용이 부적절한 경우:
- 해당 행을 우클릭 → **Delete Row** 로 삭제
- 또는 별도 `is_hidden` 필드 추가 후 `true`로 표시 (프론트엔드 연동 필요)

### 8-3. 관리자 후기 작성

직접 후기 레코드를 삽입할 수 있습니다:
1. **+ Add Row** 클릭
2. 필드 입력:
   - `class_id`: 강의 ID
   - `rating`: 평점 (1~5)
   - `content`: 후기 내용
   - `reviewer_name`: 작성자명 (실제 이름 또는 익명)
   - `is_admin_created`: `true` (관리자 생성 후기 구분용)
3. 저장

---

## 9. 시스템 설정 (tbl_Settings)

운영 관련 주요 값들이 저장되어 있습니다.

| setting_key | 현재값 | 설명 |
|------------|--------|------|
| `TELEGRAM_CHAT_ID` | 7713811206 | 알림 수신 텔레그램 채팅 ID |
| `class_category_id` | 022 | 메이크샵 클래스 카테고리 번호 |
| `commission_silver` | 0.10 | SILVER 등급 수수료율 |
| `commission_gold` | 0.12 | GOLD 등급 수수료율 |
| `commission_platinum` | 0.15 | PLATINUM 등급 수수료율 |
| `education_pass_score` | 70 | 교육 이수 합격 점수 |

> 수정이 필요한 경우 해당 행의 `setting_value` 필드만 변경하세요.
> `setting_key`는 절대 변경하지 마세요. n8n 워크플로우와 연동되어 있습니다.

---

## 10. 유용한 필터 단축 활용

### 자주 쓰는 필터 저장 방법

1. 원하는 필터 조건 설정 (예: `status` = `pending`)
2. **Toolbar** → **Views** → **+ New View** 클릭
3. 뷰 이름 입력 (예: "신청 대기 목록")
4. 이후 해당 뷰를 클릭하면 즉시 필터 적용 상태로 접근

### 권장 뷰 목록

| 뷰 이름 | 테이블 | 필터 조건 |
|--------|--------|---------|
| 신청 대기 | tbl_Applications | status = pending |
| 검수 대기 강의 | tbl_Classes | status = pending |
| 정산 실패 | tbl_Settlements | status = failed |
| 정산 대기 | tbl_Settlements | status = pending |

---

## 11. 자주 묻는 질문 (FAQ)

**Q. status를 approved로 바꿨는데 텔레그램 알림이 안 와요.**
A. NocoDB Webhook 설정이 되어 있는지 확인하세요 (섹션 4 참조). Webhook이 설정되어 있다면 n8n 워크플로우가 ACTIVE 상태인지 `https://n8n.pressco21.com`에서 확인하세요.

**Q. 파트너가 등록되었는데 메이크샵에서 등급이 안 바뀌었어요.**
A. n8n 실행 로그를 확인하세요. 텔레그램 알림 메시지에 "메이크샵 회원등급 변경: 실패"라고 표시된 경우 메이크샵 관리자 페이지에서 직접 회원 등급을 변경해주세요.

**Q. NocoDB에서 실수로 데이터를 삭제했어요.**
A. 최신 백업 파일로 복원하세요 (백업 복원 가이드 참조). 매일 새벽 3시에 자동 백업이 생성됩니다.

**Q. 필드를 추가하거나 삭제해도 되나요?**
A. n8n 워크플로우와 연동된 필드는 수정하면 오류가 발생합니다. 필드 추가는 가능하지만, 기존 필드명 변경 및 삭제는 개발자에게 문의하세요.

---

## 12. 긴급 연락

시스템 오류 또는 데이터 이상 발생 시:
- 텔레그램 알림 채널 확인 (자동 에러 알림 수신)
- 백업 복원 가이드: `docs/guides/backup-restore-guide.md` 참조
- n8n 접속: https://n8n.pressco21.com
- 서버 SSH: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
