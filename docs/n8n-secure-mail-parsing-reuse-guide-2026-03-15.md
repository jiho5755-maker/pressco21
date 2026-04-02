# n8n 보안메일 파싱 재사용 가이드

작성일: 2026-03-15  
대상: 향후 다른 프로젝트에서 NH 보안메일, VestMail, 첨부형 암호메일 파싱을 다시 구현할 때 참고할 공통 팁

## 1. 결론 먼저

NH 보안메일 자동화에서 가장 중요한 포인트는 다음 4가지다.

1. `Code` node 파서보다 먼저 `Email Trigger` 출력 포맷을 확인한다.
2. 안내 본문 HTML과 실제 보안 첨부 HTML을 구분해야 한다.
3. n8n task runner sandbox에서는 `this.helpers`보다 `helpers` 사용을 우선 검토한다.
4. 실패 원인을 좁히기 위해 parser 로그를 남겨야 한다.

## 2. 실제로 맞았던 구조

실동작 기준 구조:

- `WF-CRM-02 Gmail 입금알림 수집`
- `Email Trigger (IMAP)`가 Gmail 수신 메일을 읽음
- `Code: Parse Deposit Email`이 NH 보안메일을 파싱
- `WF-CRM-01 입금자동반영 엔진`으로 입금 payload 전달

NH 메일은 실제로 두 겹으로 온다.

- `json.html` 또는 `json.textHtml`
  - 농협 안내 본문
- `binary.attachment_0`
  - 실제 거래내역이 들어 있는 `Message.html`

즉 `첨부형 보안메일`로 봐야 한다.

## 3. 가장 많이 틀리는 지점

### 3.1 Email Trigger 포맷 선택

처음 문제의 핵심은 `format: simple`이었다.

`simple`에서는 케이스에 따라 첨부가 안정적으로 안 남을 수 있다.  
NH 메일처럼 첨부 `Message.html`이 핵심인 경우에는 `resolved`가 더 안전했다.

권장 설정:

- `format: resolved`
- `downloadAttachments: true`
- `dataPropertyAttachmentsPrefixName: attachment_`

### 3.2 안내 본문을 보안본문으로 오인

농협 메일의 `json.html`은 종종 아래 성격이다.

- “보안메일 확인방법”
- “첨부파일 열기”
- “비밀번호 입력”

이 본문은 거래내역 자체가 아니다.  
`농협 통합 메시징 서비스` 문구만 보고 보안메일로 판단하면 오탐이 난다.

실제 보안메일 판정 조건은 더 좁혀야 한다.

유효했던 힌트:

- `VestMail`
- `YettieSoft`
- `window.doAction`
- `doAction()`
- `fnLoadEncMail`

무효했던 힌트:

- `농협 통합 메시징 서비스`

## 4. n8n Code node 구현 팁

### 4.1 helpers 접근

n8n task runner sandbox에서는 `helpers`가 주입된다.

실무 팁:

- `helpers.getBinaryDataBuffer()` 우선 사용
- 필요 시 `this.helpers`는 fallback으로만 사용

권장 패턴:

```js
const binaryHelpers =
  typeof helpers === 'object' && helpers
    ? helpers
    : (typeof this === 'object' && this && typeof this.helpers === 'object'
      ? this.helpers
      : null);
```

### 4.2 filesystem-v2 binary 처리

첨부 메타데이터는 보통 이렇게 온다.

- `data: "filesystem-v2"`
- `id: "filesystem-v2:workflows/.../binary_data/..."`

권장 순서:

1. `getBinaryDataBuffer(itemIndex, binaryKey)`
2. `getBinaryPath(itemIndex, binaryKey)` 가능 여부 확인
3. 마지막 fallback으로 storage path 직접 조합

## 5. resolved 포맷에서 실제 입력 구조

실검증에서 확인된 구조:

- `json.html`
  - 농협 안내 본문
- `binary.attachment_0`
  - `Message.html`
  - `mimeType: text/html`
  - `data: filesystem-v2`

즉 parser는 아래 우선순위가 맞다.

1. `direct html`이 실제 VestMail인지 판정
2. 아니면 `binary attachment`를 순회
3. `Message.html`을 우선적으로 복호화

## 6. 디버깅 팁

실패를 빠르게 좁히려면 parser에 최소 로그를 남긴다.

권장 로그 항목:

- `subject`
- `messageId`
- `binaryKeys`
- `secureHtmlDetected`
- `transactionsCount`
- `depositsCount`

예시:

```js
console.log('[WF-CRM-02 parser]', JSON.stringify({
  subject,
  messageId,
  binaryKeys: Object.keys(binary),
  secureHtmlDetected: Boolean(secureHtml),
  transactionsCount: transactions.length,
  depositsCount: transactions.filter((entry) => entry.direction === 'deposit').length,
}));
```

## 7. 검증 순서

다른 프로젝트에서 다시 구현할 때는 이 순서로 본다.

1. 트리거가 메일을 실제로 받는가
2. 실행 데이터에 `binary.attachment_0`가 존재하는가
3. `json.html`이 안내 본문인지 실제 보안본문인지 구분되는가
4. `Code` node에서 첨부를 UTF-8로 읽을 수 있는가
5. 복호화 후 거래내역 라인이 추출되는가
6. 최종 payload가 다음 노드로 이어지는가

## 8. 재사용 시 권장 체크리스트

- NH 메일이 `multipart/mixed`인지 확인
- `Message.html` 첨부가 있는지 확인
- IMAP trigger 포맷을 먼저 점검
- 첨부 없는 케이스와 첨부 있는 케이스를 분리해 테스트
- 오탐 방지를 위해 안내 HTML 탐지 조건을 배제
- 실메일 테스트 2건 이상으로 검증

## 9. 이번 프로젝트에서 실제로 유효했던 교훈

- 문제는 “복호화 알고리즘”보다 “어느 HTML을 파싱해야 하는지”에서 더 많이 났다.
- 첨부가 안 보이면 parser를 고치기 전에 trigger 포맷부터 봐야 한다.
- NH 보안메일은 메일 포맷이 완전히 동일하지 않을 수 있으므로, 직접 본문형과 첨부형 둘 다 대비해야 한다.
- 자동화 성공 여부는 `collector 성공`이 아니라 `다음 workflow 전달`까지 봐야 한다.

