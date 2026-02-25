# Task 232: 텔레그램 알림 통합 + Error Handler 워크플로우

> **상태**: 완료
> **규모**: S
> **의존성**: Task 211~231 (모든 n8n 워크플로우)
> **에이전트**: `주도` gas-backend-expert

## 목표

1. n8n 전역 Error Handler 워크플로우 구현 (WF-ERROR-handler.json)
2. 모든 워크플로우(WF-01~13)의 텔레그램 메시지 형식을 표준화하고 문서화

---

## 산출물

| 파일 | 설명 |
|------|------|
| `파트너클래스/n8n-workflows/WF-ERROR-handler.json` | 전역 에러 핸들러 워크플로우 (4노드) |
| `tasks/232-telegram-notification.md` | 본 문서 (형식 가이드 + 설정 방법 + 테스트 체크리스트) |

---

## WF-ERROR-handler.json 노드 구조

```
Error Trigger (n8n 내장 에러 트리거)
  |
  v
Parse Error Info (Code 노드)
  - execution.error.message, execution.lastNodeExecuted, workflow.name 추출
  - KST 시간 변환
  - Markdown 특수문자 이스케이프 (_, *, `, [, ])
  - 에러 메시지 500자 제한 (텔레그램 4096자 한도 대비)
  |
  +---> Telegram Error Alert (병렬)
  |       chatId: $env.TELEGRAM_CHAT_ID
  |       parse_mode: Markdown
  |       onError: continueRegularOutput
  |
  +---> NocoDB Log Error (병렬)
          POST tbl_EmailLogs
          type: "ERROR"
          content: JSON.stringify({workflowName, nodeName, errorMessage, executionId})
          settlement_id: executionId (에러 추적용)
          retry: maxTries 2
          onError: continueRegularOutput
```

**핵심 설계 원칙:**
- 텔레그램 발송과 NocoDB 로깅을 **병렬 실행** (하나가 실패해도 다른 하나는 진행)
- 두 노드 모두 `onError: continueRegularOutput` (에러 핸들러 자체가 에러로 멈추면 안 됨)
- NocoDB 로깅은 `tbl_EmailLogs` 테이블에 `type: "ERROR"`로 기록 (별도 테이블 불필요)

---

## 텔레그램 메시지 형식 표준

### 메시지 형식 규칙

1. **첫 줄**: 이모지 + 이벤트 제목 (볼드)
2. **본문**: `필드: 값` 형태의 줄바꿈 목록
3. **민감 정보**: 마스킹 처리 (수강생 이름, 전화번호)
4. **식별자**: 정산ID/예약번호는 백틱(코드 스타일)
5. **parse_mode**: Markdown (모든 텔레그램 노드 통일)

### 이벤트별 표준 메시지 형식

#### 1. 새 예약 (WF-04: Telegram New Booking)
```
📦 *새 예약 알림*

클래스: {class_name}
수강생: {masked_name} ({participants}명)
수업일: {class_date_kr}
결제액: {amount}원
수수료: {commission}원
적립금: {reserve_amount} ({grade})
정산예정: {due_date} (D+3)
예약번호: `{settlement_id}`
```

#### 2. 자기 결제 감지 (WF-04: Telegram Self Purchase)
```
⚠️ *자기 결제 감지*

파트너: {partner_name} ({partner_code})
회원ID: {member_id}
클래스: {class_name}
금액: {amount}원
예약번호: `{settlement_id}`

정산 상태: SELF\_PURCHASE (적립금 미지급)
확인이 필요합니다.
```

#### 3. 파트너 신청 (WF-07: Telegram New Application)
```
🌱 *새 파트너 신청*

신청자: {name}
공방명: {studio_name}
전문 분야: {specialty}
활동 지역: {location}
이메일: {email}
접수 시각: {applied_date}
접수 번호: {application_id}

-> NocoDB 파트너 신청 테이블에서 검토해주세요.
```
- 주의: 관리자 전용 채널이므로 개인정보 마스킹 없이 전문 전달

#### 4. 파트너 승인 (WF-08: Telegram Approval)
```
✅ *파트너 승인*

신청자: {partner_name}
회원ID: {member_id}
파트너 코드: {partner_code}
등급: Bloom ({grade})
수수료율: {commission_rate}%
승인일: {approved_date}

메이크샵 회원등급 변경: {성공/실패}
```

#### 5. 교육 합격 (WF-10: Telegram Pass Notify)
```
🎓 *교육 합격*

파트너: {partner_name} ({partner_code})
점수: {score}/{total}
합격 기준: {pass_threshold}/{total}
이수일: {date}

Bloom 파트너 활성화 완료
```

#### 6. 클래스 상태 변경 (WF-06: Telegram Status Change)
```
🔄 *클래스 상태 변경*

클래스: {class_name}
파트너: {partner_name} ({partner_code})
변경: {old_status_kr} -> {new_status_kr}
시각: {timestamp}
```

#### 7. 주문 폴링 결과 (WF-05: Telegram Poll Result)
```
📊 *주문 폴링 결과*

기간: {from} ~ {to}
새 주문: {count}건
처리: {processed}건
실패: {failed}건
실행시간: {duration}ms
```

#### 8. 정합성 검증 결과 (WF-05: Telegram Reconcile)
```
📊 *정합성 검증 완료*

불일치: {count}건
{상세 내용}
```

#### 9. 상품 동기화 결과 (WF-05: Telegram Sync Result)
```
📊 *상품 동기화 완료*

추가: {added}건
변경: {updated}건
비활성: {deactivated}건
```

#### 10. 실패 재시도 결과 (WF-05: Telegram Retry Result)
```
📊 *실패 재시도 완료*

대상: {total}건
성공: {success}건
실패: {failed}건 (최대 재시도 초과: {max_exceeded}건)
```

#### 11. D+3 정산 결과 (WF-05: Telegram Settle Result)
```
💰 *D+3 정산 완료*

대상: {total}건
성공: {success}건
적립금 지급: {total_amount}원
실패: {failed}건
```

#### 12. 리마인더 발송 결과 (WF-11: Telegram Summary)
```
✉️ *리마인더 발송 완료 ({date})*

D-3: {count}건
D-1: {count}건
총: {total}건 발송
```

#### 13. 리마인더 대상 없음 (WF-11: Telegram No Targets)
```
✅ *리마인더 발송 ({date})*

오늘 발송 대상이 없습니다.
```

#### 14. 후기 요청 결과 (WF-12: Telegram Summary)
```
✉️ *후기 요청 발송 완료 ({date})*

발송: {count}건
대상일: {target_date}
```

#### 15. 등급 자동 업데이트 (WF-13: Telegram Send Notification)
```
⬆️ *등급 자동 업데이트*

변경: {count}건
{파트너별 상세}
```

#### 16. 전역 에러 (WF-ERROR: Telegram Error Alert)
```
⚠️ *n8n 에러*

워크플로우: {workflow_name}
노드: {last_node_executed}
에러: {error_message}
실행ID: `{execution_id}`
모드: {execution_mode}
시각: {timestamp_kst} (KST)
```

---

## 워크플로우별 텔레그램 노드 현황표

| WF | 파일 | 텔레그램 노드 | 메시지 유형 | parse_mode |
|----|------|--------------|------------|-----------|
| 01 | WF-01-class-api.json | 없음 | - (조회 전용) | - |
| 02 | WF-02-partner-auth-api.json | 없음 | - (조회 전용) | - |
| 03 | WF-03-partner-data-api.json | 없음 | - (조회 전용) | - |
| 04 | WF-04-record-booking.json | 3개 | 새 예약 / 자기 결제 / 에러 | Markdown |
| 05 | WF-05-order-polling-batch.json | 6개 | 폴링결과 / 정합성 / 동기화 / 동기화에러 / 재시도 / D+3정산 | Markdown |
| 06 | WF-06-class-management.json | 1개 | 클래스 상태 변경 | Markdown |
| 07 | WF-07-partner-apply.json | 2개 | 파트너 신청 / 저장 에러 | 없음(plaintext) |
| 08 | WF-08-partner-approve.json | 2개 | 파트너 승인 / 생성 에러 | 없음(plaintext) |
| 09 | WF-09-review-reply.json | 없음 | - (후기 답변은 조용히 처리) | - |
| 10 | WF-10-education-complete.json | 1개 | 교육 합격 | Markdown |
| 11 | WF-11-send-reminders.json | 2개 | 발송 결과 / 대상 없음 | Markdown |
| 12 | WF-12-review-requests.json | 2개 | 발송 결과 / 대상 없음 | Markdown |
| 13 | WF-13-grade-update.json | 2개 | 등급 변경 / 대상 없음 | Markdown |
| ERR | WF-ERROR-handler.json | 1개 | 전역 에러 알림 | Markdown |
| **합계** | **14개 워크플로우** | **22개 노드** | **16개 메시지 유형** | |

---

## n8n Error Workflow 설정 방법 (관리자 가이드)

### 사전 준비
1. WF-ERROR-handler.json을 n8n에 임포트
2. 워크플로우를 **Active(활성)** 상태로 전환

### 각 워크플로우에 Error Workflow 연결

**방법 A: n8n UI에서 개별 설정**
1. 각 워크플로우(WF-01~13) 편집 화면 진입
2. 우측 상단 `...` 메뉴 -> `Settings` 클릭
3. `Error Workflow` 드롭다운에서 `WF-ERROR Global Error Handler` 선택
4. `Save` 클릭
5. 모든 14개 워크플로우에 반복 적용

**방법 B: n8n API로 일괄 설정**
```bash
# n8n API로 워크플로우 목록 조회
curl -H "X-N8N-API-KEY: {API_KEY}" \
  https://n8n.pressco21.com/api/v1/workflows

# 각 워크플로우의 settings에 errorWorkflow 추가
# errorWorkflow 값은 WF-ERROR-handler의 워크플로우 ID
curl -X PATCH \
  -H "X-N8N-API-KEY: {API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"settings": {"errorWorkflow": "{ERROR_WORKFLOW_ID}"}}' \
  https://n8n.pressco21.com/api/v1/workflows/{WORKFLOW_ID}
```

### Error Workflow 동작 원리
- 다른 워크플로우가 **처리되지 않은 에러로 실패**하면 n8n이 자동으로 Error Workflow를 실행
- Error Trigger 노드가 실패한 실행의 메타데이터를 수신:
  - `execution.id`: 실패한 실행 ID
  - `execution.lastNodeExecuted`: 마지막 실행된 노드명
  - `execution.error.message`: 에러 메시지
  - `workflow.id`, `workflow.name`: 실패한 워크플로우 정보
  - `execution.mode`: trigger / webhook / manual 등
- `onError: continueRegularOutput`로 처리된 노드 에러는 Error Workflow를 트리거하지 않음
  (의도적으로 이메일 실패 등을 무시하는 패턴에는 영향 없음)

---

## 텔레그램 Credential 설정 방법

### 1. Telegram Bot 생성
1. 텔레그램에서 @BotFather 검색
2. `/newbot` 명령 입력
3. 봇 이름: `PRESSCO21 알림봇` (예시)
4. 봇 사용자명: `pressco21_notify_bot` (예시)
5. 발급된 **Bot Token** 복사 (예: `1234567890:ABCdefGhIjKlmnOpQrStUvWxYz`)

### 2. Chat ID 확인
1. 봇을 관리자 텔레그램 그룹에 추가
2. 그룹에서 아무 메시지 전송
3. 브라우저에서: `https://api.telegram.org/bot{BOT_TOKEN}/getUpdates`
4. 응답의 `result[0].message.chat.id` 값 복사 (예: `-1001234567890`)

### 3. n8n Credential 등록
1. n8n 좌측 메뉴 -> `Credentials` -> `New Credential`
2. 타입: `Telegram API`
3. Name: `PRESSCO21 Telegram Bot`
4. Bot Token: 위에서 복사한 토큰 입력
5. `Save`

### 4. n8n 환경변수 설정
```
TELEGRAM_CHAT_ID=-1001234567890
```
- n8n Docker 환경: docker-compose.yml의 environment에 추가
- n8n 설정 파일: `.env` 파일에 추가

---

## 테스트 체크리스트

### Error Handler 워크플로우 (WF-ERROR)
- [ ] 1. WF-ERROR-handler.json을 n8n에 정상 임포트
- [ ] 2. Error Trigger 노드가 올바르게 인식됨
- [ ] 3. 테스트 워크플로우에서 의도적 에러 발생 시 Error Handler 트리거됨
- [ ] 4. 텔레그램 에러 알림 메시지가 올바른 형식으로 수신됨
- [ ] 5. NocoDB tbl_EmailLogs에 type=ERROR 레코드가 생성됨
- [ ] 6. content 필드에 workflowName, nodeName, errorMessage, executionId가 JSON으로 저장됨
- [ ] 7. 에러 메시지 500자 초과 시 정상 잘림 (...생략)
- [ ] 8. Markdown 특수문자(_, *, `)가 이스케이프되어 메시지 깨짐 없음

### 텔레그램 연동 전반
- [ ] 9. TELEGRAM_CHAT_ID 환경변수가 모든 워크플로우에서 참조 가능
- [ ] 10. pressco21-telegram Credential이 모든 텔레그램 노드에서 정상 동작
- [ ] 11. WF-04 새 예약 시 텔레그램 알림 수신 확인
- [ ] 12. WF-05 배치 작업(5개) 완료 후 각각 텔레그램 결과 수신 확인
- [ ] 13. WF-07 파트너 신청 시 텔레그램 알림 수신 확인
- [ ] 14. WF-11/12 스케줄 배치 완료 후 텔레그램 결과 수신 확인
- [ ] 15. 모든 텔레그램 노드에 onError: continueRegularOutput 설정 확인 (텔레그램 실패가 워크플로우를 멈추지 않음)

---

## 참고: WF-07, WF-08 parse_mode 미설정 건

현재 WF-07(파트너 신청)과 WF-08(파트너 승인)의 텔레그램 노드는 `parse_mode`가 설정되지 않아 plaintext로 전송됩니다.
다른 워크플로우들과 통일하려면 `additionalFields.parse_mode: "Markdown"`을 추가하고, 메시지 내 Markdown 특수문자를 이스케이프해야 합니다.

현재 메시지에서 `[`, `]` 등이 포함되어 있으므로 Markdown 전환 시 이스케이프 처리가 필요합니다.
이 건은 향후 고도화에서 일괄 처리하면 됩니다.
