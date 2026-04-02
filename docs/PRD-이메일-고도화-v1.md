# PRD: 이메일 시스템 고도화 v1.0

> 작성일: 2026-03-27
> 작성자: CSO 팀미팅 → 대표 확정
> 상태: 승인 대기 → 착수 시 세션에서 진행

---

## 1. 배경 및 문제

### 1-1. 장애 사례
- 2026-03-21~26: 네이버 SMTP 앱 비밀번호 만료 → **5일간 이메일 발송 전면 중단**, 미감지
- FA-003 무한 재시도: 이메일 실패 시 `n8n_반려알림` 미갱신 → 같은 건 1,528회 재시도

### 1-2. 현재 이메일 현황

| 사용자 | 현재 메일 | 문제 |
|--------|----------|------|
| 원장님 (이진선) | envyco@hanmail.net | B2B 전용, 개인 계정 |
| 대표 (장지호) | pressco5755@naver.com / jiho5755@gmail.com | B2C+B2B+인증+개인 혼재 |
| 이재혁 과장 | jhl9464@naver.com | 고객 문의+개인 혼재 → **고객 메일 놓침** |

### 1-3. 자동화 이메일 현황

| WF | 용도 | 현재 발신 | 문제 |
|----|------|----------|------|
| FA-001 | 강사 승인 축하 | pressco5755@naver.com | 텍스트 HTML, 브랜딩 없음 |
| FA-003 | 강사 반려 안내 | pressco5755@naver.com | 텍스트 HTML, 무한 재시도 |

---

## 2. 목표

1. **업무/개인 메일 분리**: 고객 메일을 놓치지 않는 구조
2. **이메일 브랜딩**: 프레스코21 정체성이 담긴 공식 이메일
3. **장애 방지**: 무한 재시도 제거 + 실패 감지 + 텔레그램 경보
4. **점진적 전환**: 기존 고객에게 자동 안내 → 자연스러운 주소 교체
5. **플로라 연동**: CS 메일 모니터링 + 미회신 리마인드 (Phase 5)

---

## 3. 전략 결정 사항

### 3-1. 메일 서비스: Gmail (무료)

| 검토 | 결과 |
|------|------|
| Zoho Mail Free | SMTP/IMAP 제거 → 자동화 불가 → **탈락** |
| 가비아 비즈메일 | 월 5,500원, 한국어 → 괜찮으나 비용 발생 → **보류** |
| Namecheap Private Email | 이미 DNS 설정 → 월 6,600원 → **보류** |
| **Gmail 브랜드 계정** | **0원**, SMTP/IMAP 지원, 직원 교육 제로 → **채택** |

향후 B2B 확대 시 커스텀 도메인(Namecheap/가비아) 업그레이드 경로 열어둠.

### 3-2. 커스텀 도메인 수신: ImprovMX (무료, 선택)

`cs@pressco21.com` → `pressco21.cs@gmail.com` 전달. 즉시 필요하지 않으므로 Phase 4 이후 선택 적용.

### 3-3. 계정 구조

| Gmail | 사용자 | 용도 |
|-------|--------|------|
| `pressco21@gmail.com` | 대표 | 업무 총괄 + n8n 자동화 SMTP |
| `pressco21.cs@gmail.com` | 이재혁 과장 | 고객 CS 전용 |

### 3-4. 고객 접점 원칙

- 고객이 보는 CS 연락처는 **`pressco21.cs@gmail.com` 하나**
- 자동화 메일(FA-001/003) Reply-To도 `pressco21.cs@gmail.com`
- 고객은 어디에 답장해도 이재혁 과장 Gmail로 도착

---

## 4. 구현 Phase

### Phase 0: 긴급 안정화 (완료)

| 태스크 | 상태 | 내용 |
|--------|------|------|
| P0-001 | **완료** | SMTP 앱 비밀번호 갱신 (86XZE51817FC) |
| P0-002 | **완료** | FA-003 무한 재시도 수정 (retry 3회 상한 + 데드레터 + 텔레그램 경보) |
| P0-003 | **완료** | FA-001/003 이메일 브랜드 리디자인 (로고+컬러+CTA+푸터) |
| P0-004 | **완료** | FA-001 이메일 에러 continueOnFail 추가 |
| P0-005 | **완료** | NocoDB `n8n_반려_retry` 컬럼 추가 |
| P0-006 | **완료** | 회사 로고 MinIO 업로드 (img.pressco21.com/images/assets/company-logo.png) |

### Phase 1: Gmail 세팅 + n8n 전환

**선행 조건**: 대표가 Gmail 2개 생성 + 앱 비밀번호 발급

| 태스크 | 내용 | 담당 | 공수 |
|--------|------|------|------|
| P1-001 | Gmail 계정 2개 생성 (pressco21, pressco21.cs) | 대표 | 10분 |
| P1-002 | 각 Gmail 2단계 인증 + 앱 비밀번호 생성 | 대표 | 10분 |
| P1-003 | n8n SMTP Credential 변경 (네이버 → pressco21@gmail.com) | Claude | 10분 |
| P1-004 | FA-001 발신자/Reply-To 변경 | Claude | 5분 |
| P1-005 | FA-003 발신자/Reply-To 변경 | Claude | 5분 |
| P1-006 | 테스트: 승인/반려 이메일 발송 → 수신 확인 → 스팸 여부 | Claude+대표 | 10분 |
| P1-007 | 서버 배포 (FA-001 v3.1, FA-003 v3.1) | Claude | 15분 |

**산출물**: n8n 자동 메일이 새 Gmail에서 발송, 고객 답장은 CS Gmail로 수신

### Phase 2: 기존 메일 연결 + 필터

**선행 조건**: Phase 1 완료

| 태스크 | 내용 | 담당 | 공수 |
|--------|------|------|------|
| P2-001 | pressco21.cs@gmail.com에서 POP3로 jhl9464@naver.com 연결 | 대표+과장 | 5분 |
| P2-002 | pressco21@gmail.com에서 POP3로 pressco5755@naver.com 연결 | 대표 | 5분 |
| P2-003 | Gmail 필터 설정 (스팸/광고/마켓플레이스 알림 숨기기) | Claude 가이드 | 10분 |
| P2-004 | 이재혁 과장 핸드폰에 pressco21.cs@gmail.com 추가 | 과장 | 5분 |

**Gmail 필터 규칙**:
```
필터 1: "쿠팡" OR "coupang" → 받은편지함 건너뛰기
필터 2: "11번가" OR "11st" → 받은편지함 건너뛰기
필터 3: "광고" OR "프로모션" OR "newsletter" → 받은편지함 건너뛰기
필터 4: from:(*@foreverlove.co.kr) → 라벨 "고객문의" + 중요
필터 5: subject:(주문 OR 문의 OR 배송 OR 환불 OR 교환) → 라벨 "고객문의" + 중요
```

**산출물**: 이재혁 과장이 pressco21.cs@gmail.com 하나만 보면 기존+신규 고객 메일 전부 확인 가능

### Phase 3: 자동 안내 워크플로우 (FA-005)

**선행 조건**: Phase 2 완료 + pressco21@gmail.com 앱 비밀번호

| 태스크 | 내용 | 담당 | 공수 |
|--------|------|------|------|
| P3-001 | NocoDB `이메일_전환_안내` 테이블 생성 | Claude | 10분 |
| P3-002 | FA-005 워크플로우 개발 | Claude | 2시간 |
| P3-003 | 테스트: 네이버로 메일 발송 → 자동 안내 회신 확인 | Claude+대표 | 15분 |
| P3-004 | jhl9464@naver.com 대상 활성화 | Claude | 5분 |
| P3-005 | pressco5755@naver.com 대상 활성화 | Claude | 5분 |

**FA-005 워크플로우 설계**:

```
[5분 스케줄]
  ↓
[IMAP으로 jhl9464@naver.com 새 메일 확인]
  ↓
[발신자 필터링]
  시스템 메일 (@coupang, @naver, @11st, noreply, no-reply) → 무시
  이미 안내한 발신자 (NocoDB 조회) → 무시
  ↓
[고객 메일로 판단]
  ↓
[자동 안내 메일 발송] (pressco21@gmail.com SMTP)

  제목: [프레스코21] 문의 접수 확인 및 이메일 변경 안내

  본문 (브랜드 HTML 템플릿):
  ┌────────────────────────────────────────┐
  │ [PRESSCO21 로고 헤더]                  │
  │                                        │
  │ 안녕하세요, 프레스코21입니다.          │
  │                                        │
  │ 보내주신 메일 잘 접수되었습니다.       │
  │ 담당자가 확인 후 회신드리겠습니다.     │
  │                                        │
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
  │                                        │
  │ 안내: 고객센터 이메일이 변경되었습니다 │
  │                                        │
  │ 새 이메일: pressco21.cs@gmail.com      │
  │                                        │
  │ 다음 문의부터 새 이메일로 보내주시면   │
  │ 더 빠른 답변이 가능합니다.            │
  │                                        │
  │ [새 이메일로 문의하기] (mailto 버튼)   │
  │                                        │
  │ [푸터: 프레스코21 연락처]              │
  └────────────────────────────────────────┘

  ↓
[NocoDB 로그 기록]
  발신자 이메일, 안내 일시, 원본 제목
  → 같은 사람에게 중복 발송 방지 (1회만)
  ↓
[텔레그램 알림] (내부)
  "📧 기존 메일로 고객 문의 수신
   보낸사람: 홍길동 (hong@example.com)
   제목: 압화풀 재입고 문의
   → 자동 안내 메일 발송 완료 (1회)"
```

**NocoDB `이메일_전환_안내` 테이블 스키마**:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| Id | AutoNumber | PK |
| sender_email | Email | 안내 발송한 고객 이메일 |
| sender_name | Text | 발신자명 |
| original_subject | Text | 원본 메일 제목 |
| source_account | Text | 어느 기존 메일로 왔는지 (jhl9464/pressco5755) |
| notified_at | DateTime | 안내 발송 시각 |
| target_wf | Text | FA-005 |

**산출물**: 기존 메일로 연락하는 고객에게 접수 확인 + 주소 변경 안내 자동 발송 (1인 1회)

### Phase 4: 표기 교체

**선행 조건**: Phase 3 활성화 후 1주 안정화

| 태스크 | 내용 | 담당 | 공수 |
|--------|------|------|------|
| P4-001 | 자사몰 기본 하단 이메일 변경 | 디자이너/대표 | 5분 |
| P4-002 | 자사몰 문의 페이지 이메일 변경 | 디자이너/대표 | 5분 |
| P4-003 | 스마트스토어 판매자 정보 변경 | 대표 | 5분 |
| P4-004 | 쿠팡 셀러 정보 변경 | 대표 | 5분 |
| P4-005 | 11번가 판매자 정보 변경 | 대표 | 5분 |
| P4-006 | NocoDB 강사 신청 폼 연락처 변경 | Claude | 5분 |
| P4-007 | 명함 다음 인쇄 시 반영 | 대표 | - |

**산출물**: 모든 고객 접점에서 새 이메일 표기

### Phase 5: 플로라 모니터링 (선택, Phase 4 이후)

**선행 조건**: Phase 4 완료 + 플로라 Phase B 착수

| 태스크 | 내용 | 담당 | 공수 |
|--------|------|------|------|
| P5-001 | 플로라 pressco21.cs@gmail.com IMAP 연결 | Claude | 1시간 |
| P5-002 | 새 고객 메일 텔레그램 즉시 알림 | Claude | 1시간 |
| P5-003 | 미회신 24시간 리마인드 | Claude | 30분 |
| P5-004 | 긴급 키워드 경보 (환불/파손/불만) | Claude | 30분 |
| P5-005 | 주간 CS 요약 리포트 | Claude | 1시간 |

**산출물**: 이재혁 과장이 고객 메일을 절대 놓치지 않는 구조

---

## 5. 기술 스펙

### 5-1. n8n SMTP 설정 (Phase 1)

```
Host: smtp.gmail.com
Port: 465 (SSL)
User: pressco21@gmail.com
Password: (Gmail 앱 비밀번호)
From: PRESSCO21 <pressco21@gmail.com>
Reply-To: pressco21.cs@gmail.com
```

### 5-2. FA-001 v3.1 변경 사항

```
발신: pressco5755@naver.com → pressco21@gmail.com
발신자명: "PRESSCO21"
Reply-To: pressco21.cs@gmail.com (추가)
이메일 HTML: 브랜드 템플릿 (P0-003에서 완료)
continueOnFail: true (P0-004에서 완료)
```

### 5-3. FA-003 v3.1 변경 사항

```
발신: pressco5755@naver.com → pressco21@gmail.com
발신자명: "PRESSCO21"
Reply-To: pressco21.cs@gmail.com (추가)
이메일 HTML: 브랜드 템플릿 (P0-003에서 완료)
retry 3회 상한 + 데드레터 (P0-002에서 완료)
```

### 5-4. FA-005 신규 워크플로우

```
ID: (배포 시 생성)
트리거: 5분 Cron
IMAP: jhl9464@naver.com + pressco5755@naver.com
SMTP: pressco21@gmail.com (앱 비밀번호)
NocoDB: 이메일_전환_안내 테이블 (중복 방지)
텔레그램: -5154731145 (프레스코21 그룹)
```

### 5-5. Gmail POP3 설정 (Phase 2)

```
pressco21.cs@gmail.com:
  POP 서버: pop.naver.com
  포트: 995 (SSL)
  계정: jhl9464@naver.com
  라벨: "네이버-기존"

pressco21@gmail.com:
  POP 서버: pop.naver.com
  포트: 995 (SSL)
  계정: pressco5755@naver.com
  라벨: "네이버-기존"
```

---

## 6. 비용

| 항목 | 비용 |
|------|------|
| Gmail 계정 | 0원 |
| ImprovMX (선택) | 0원 |
| n8n/NocoDB (기존 인프라) | 0원 |
| 플로라 (기존 인프라) | 0원 |
| **합계** | **0원** |

---

## 7. 리스크

| 리스크 | 등급 | 대응 |
|--------|------|------|
| Gmail 일일 발송 제한 (500건) | LOW | 현재 이메일 발송량 일 10건 미만 |
| Gmail 앱 비밀번호 만료 | MEDIUM | morning-briefing에 SMTP 프로브 추가 (P0와 동일 패턴) |
| 고객이 새 메일로 전환 안 함 | LOW | FA-005 자동 안내 + POP3로 기존 메일도 수신 중 |
| 이재혁 과장 적응 | LOW | Gmail 앱만 사용, 교육 5분 |
| Google 계정 보안 경고 | MEDIUM | 2단계 인증 + 앱 비밀번호로 해결 |

---

## 8. 성공 기준

| 지표 | 목표 |
|------|------|
| 이재혁 과장 고객 메일 놓침 | 0건/월 |
| 이메일 발송 성공률 | 99%+ |
| 장애 감지 시간 | 1시간 이내 (텔레그램 경보) |
| 기존 메일 전환율 | 3개월 후 신규 문의 80%+ 새 주소 |
| 직원 교육 시간 | 5분 이내 |

---

## 9. 타임라인

```
[착수 전] 대표: Gmail 2개 생성 + 앱 비밀번호

[1일차] Phase 1: n8n SMTP 전환 + 테스트
[1일차] Phase 2: POP3 연결 + Gmail 필터

[2일차] Phase 3: FA-005 자동 안내 WF 개발 + 테스트 + 활성화

[1~2주] Phase 4: 자사몰/마켓플레이스 표기 점진 교체

[안정화 후] Phase 5: 플로라 CS 모니터링 (별도 세션)
```

---

## 10. 착수 체크리스트

대표님이 새 세션 시작 전 준비할 것:

- [ ] `pressco21@gmail.com` 생성 완료
- [ ] `pressco21.cs@gmail.com` 생성 완료
- [ ] 두 계정 모두 2단계 인증 설정 완료
- [ ] 두 계정 모두 앱 비밀번호 생성 완료
- [ ] 이재혁 과장 네이버 메일 비밀번호 확보 (POP3 연결용)
- [ ] 대표 네이버 메일(pressco5755) 비밀번호 확인

위 준비 후 "이메일 고도화 착수" 라고 말씀하시면 PRD Phase 1부터 순서대로 진행합니다.

---

## 부록 A: Phase 0 완료 내역 (2026-03-26)

| 완료 항목 | 서버 상태 |
|----------|----------|
| SMTP 비밀번호 갱신 | 라이브 반영 |
| FA-001 v3.0 (브랜드 이메일 + continueOnFail) | 라이브 활성화 |
| FA-003 v3.0 (브랜드 이메일 + retry 3회 + 데드레터) | 라이브 활성화 |
| NocoDB n8n_반려_retry 컬럼 | 생성 완료 |
| 로고 MinIO 업로드 | img.pressco21.com/images/assets/company-logo.png |
| n8n API Key 설정 | docker-compose.yml + .env 추가 |

## 부록 B: 향후 업그레이드 경로

```
[현재 — Gmail]
  발신: pressco21@gmail.com
  수신: pressco21.cs@gmail.com

[업그레이드 — 커스텀 도메인] (필요 시)
  ImprovMX 전달: cs@pressco21.com → pressco21.cs@gmail.com
  또는
  Namecheap Private Email: cs@pressco21.com (월 $0.99/메일박스)
  n8n SMTP만 변경하면 전환 완료
```
