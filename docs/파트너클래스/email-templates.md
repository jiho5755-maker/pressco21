# PRESSCO21 이메일 템플릿 카피라이팅

> **문서 버전**: 1.0
> **작성일**: 2026-02-21
> **담당**: brand-planning-expert
> **관련 Task**: Task 221 (결제 -> 정산 -> 이메일 자동화 GAS 파이프라인)
> **브랜드 톤**: 우아 + 따뜻 + 신뢰 + 자연 + 포용
> **포인트 컬러**: #b89b5e (PRESSCO21 골드)
> **기본 컬러**: #333333 (본문), #666666 (보조), #f8f6f0 (배경)

---

## 목차

1. [공통 스타일 가이드](#1-공통-스타일-가이드)
2. [이메일 1: 수강생 예약 확인](#2-이메일-1-수강생-예약-확인)
3. [이메일 2: 수강생 D-3 리마인더](#3-이메일-2-수강생-d-3-리마인더)
4. [이메일 3: 수강생 D-1 리마인더](#4-이메일-3-수강생-d-1-리마인더)
5. [이메일 4: 수강생 후기 요청 (+7일)](#5-이메일-4-수강생-후기-요청-7일)
6. [이메일 5: 파트너 승인 안내](#6-이메일-5-파트너-승인-안내)
7. [이메일 6: 파트너 예약 알림](#7-이메일-6-파트너-예약-알림)
8. [GAS 구현 참조](#8-gas-구현-참조)

---

## 1. 공통 스타일 가이드

### 디자인 규칙

| 항목 | 값 |
|------|------|
| 최대 너비 | 600px |
| 배경 컬러 | #f8f6f0 (아이보리) |
| 카드 배경 | #ffffff |
| 포인트 컬러 | #b89b5e (골드) |
| 본문 컬러 | #333333 |
| 보조 텍스트 | #666666 |
| 경계선 | #e8e4db |
| 본문 폰트 | 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif |
| 본문 크기 | 15px, line-height: 1.7 |
| CTA 버튼 | 배경 #b89b5e, 텍스트 #ffffff, border-radius: 6px, padding: 14px 32px |

### 공통 헤더 HTML

```html
<!-- 헤더 -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-bottom: 2px solid #b89b5e;">
  <tr>
    <td style="padding: 24px 32px; text-align: center;">
      <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px; font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;">PRESSCO21</span>
      <br />
      <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
    </td>
  </tr>
</table>
```

### 공통 푸터 HTML

```html
<!-- 푸터 -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td style="padding: 24px 32px; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
        PRESSCO21 | foreverlove.co.kr
      </p>
      <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
        문의: pressco21@foreverlove.co.kr | 카카오톡 @PRESSCO21
      </p>
      <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
        이 메일은 PRESSCO21 클래스 예약 관련 안내 메일입니다.
      </p>
    </td>
  </tr>
</table>
```

### 플레이스홀더 규칙

GAS 코드에서 문자열 연결로 대체되는 플레이스홀더입니다. 실제 GAS에서는 `${var}` 대신 문자열 연결(`'...' + variable + '...'`)을 사용합니다(메이크샵 편집기 저장 오류 방지).

| 플레이스홀더 | 설명 | 예시 값 |
|------------|------|---------|
| `{studentName}` | 수강생 이름 | 홍길동 |
| `{className}` | 클래스명 | 봄꽃 압화 에코백 원데이 클래스 |
| `{partnerName}` | 파트너(강사) 이름 | 꽃향기 공방 |
| `{classDate}` | 수업 날짜 (한국어 포맷) | 2026년 3월 15일 (토) |
| `{classTime}` | 수업 시간 | 오후 2:00 |
| `{classLocation}` | 수업 장소 | 꽃향기 공방 (서울 강남구 역삼동 123-4) |
| `{personnel}` | 예약 인원 | 2명 |
| `{orderNumber}` | 주문번호 | RV-20260315-001 |
| `{totalAmount}` | 결제 금액 | 90,000원 |
| `{preparations}` | 준비물 | 편한 복장 (앞치마는 준비되어 있어요) |
| `{partnerCode}` | 파트너 코드 | P001 |
| `{partnerContact}` | 파트너 연락처 | 010-1234-5678 |
| `{maskedStudentName}` | 마스킹된 수강생 이름 | 홍** |
| `{maskedStudentPhone}` | 마스킹된 전화번호 | 010-****-5678 |
| `{reviewUrl}` | 후기 작성 URL | https://foreverlove.co.kr/... |
| `{dashboardUrl}` | 파트너 대시보드 URL | https://foreverlove.co.kr/... |

---

## 2. 이메일 1: 수강생 예약 확인

**발송 시점**: 결제 완료 직후 (GAS 주문 폴링 감지 시)
**수신자**: 수강생
**제목**: `[PRESSCO21] {className} 예약이 확정되었습니다`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 예약 확인</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 40px 32px 32px;">

            <!-- 인사말 -->
            <p style="margin: 0 0 24px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{studentName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{className}</strong> 예약이 확정되었습니다.
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{partnerName}</strong> 선생님과 함께하는 특별한 시간을 준비하고 있어요.<br />
              설레는 수업이 될 거예요!
            </p>

            <!-- 예약 정보 테이블 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f3; border-radius: 8px; border: 1px solid #e8e4db; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px 24px 12px;">
                  <p style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #b89b5e; letter-spacing: 1px;">
                    예약 정보
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; width: 90px; vertical-align: top;">클래스</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{className}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">강사</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{partnerName} 선생님</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">일시</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{classDate} {classTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">장소</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{classLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">인원</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{personnel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">결제 금액</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{totalAmount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 24px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e8e4db;">
                    <tr>
                      <td style="padding: 12px 0 0; font-size: 12px; color: #999999;">
                        주문번호: {orderNumber}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- 준비물 안내 (조건부 표시) -->
            <!-- GAS에서 preparations 값이 있을 때만 이 블록을 포함합니다 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef9f0; border-radius: 8px; border-left: 3px solid #b89b5e; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #b89b5e;">
                    준비물 안내
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #555555; line-height: 1.6;">
                    {preparations}
                  </p>
                </td>
              </tr>
            </table>

            <!-- 리마인더 예고 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td style="padding: 16px 20px; background-color: #f5f5f5; border-radius: 8px;">
                  <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6;">
                    수업 3일 전과 하루 전에 리마인더 메일을 보내드릴게요.<br />
                    수업 준비에 참고해주세요.
                  </p>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              궁금하신 점이 있으시면 언제든 연락주세요.
            </p>
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              즐거운 시간이 될 거예요!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              문의: pressco21@foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 클래스 예약 관련 안내 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| "특별한 시간을 준비하고 있어요" | 수동적 확인이 아닌, 적극적으로 준비 중임을 전달 |
| "설레는 수업이 될 거예요!" | 기대감 유발, 따뜻한 톤 |
| 리마인더 예고 | D-3, D-1 메일에 대한 사전 안내로 신뢰감 제공 |
| "PRESSCO21 드림" | 격식 있되 따뜻한 마무리 |

---

## 3. 이메일 2: 수강생 D-3 리마인더

**발송 시점**: 수업 3일 전 (GAS 시간 트리거)
**수신자**: 수강생
**제목**: `[PRESSCO21] {className} 수업까지 3일 남았습니다!`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 수업 D-3 리마인더</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 40px 32px 32px;">

            <!-- D-3 카운트다운 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <tr>
                <td align="center">
                  <span style="display: inline-block; background-color: #b89b5e; color: #ffffff; font-size: 14px; font-weight: 700; padding: 8px 20px; border-radius: 20px; letter-spacing: 1px;">
                    D-3
                  </span>
                </td>
              </tr>
            </table>

            <!-- 인사말 -->
            <p style="margin: 0 0 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{studentName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{className}</strong> 수업이 3일 앞으로 다가왔어요!
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              {partnerName} 선생님이 즐거운 수업을 준비하고 계세요.<br />
              잠시 시간을 내어 수업 정보를 다시 한번 확인해주세요.
            </p>

            <!-- 수업 정보 요약 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f3; border-radius: 8px; border: 1px solid #e8e4db; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #999999; width: 80px; vertical-align: top;">클래스</td>
                      <td style="padding: 6px 0; font-size: 14px; color: #333333; font-weight: 600;">{className}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #999999; vertical-align: top;">일시</td>
                      <td style="padding: 6px 0; font-size: 14px; color: #333333; font-weight: 600;">{classDate} {classTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #999999; vertical-align: top;">장소</td>
                      <td style="padding: 6px 0; font-size: 14px; color: #333333;">{classLocation}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- 준비물 체크리스트 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef9f0; border-radius: 8px; border-left: 3px solid #b89b5e; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #b89b5e;">
                    준비물 체크리스트
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #555555; line-height: 1.8;">
                    {preparations}
                  </p>
                </td>
              </tr>
            </table>

            <!-- 강사 연락처 (있는 경우) -->
            <!-- GAS에서 partnerContact 값이 있을 때만 이 블록을 포함합니다 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td style="padding: 12px 20px; background-color: #f5f5f5; border-radius: 8px;">
                  <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6;">
                    수업 관련 문의는 {partnerName} 선생님({partnerContact})에게 직접 연락하셔도 됩니다.
                  </p>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              3일 뒤, 꽃과 함께하는 즐거운 시간을 기대해주세요!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 클래스 예약 관련 안내 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| D-3 배지 | 시각적으로 "3일 전"임을 강조, 카운트다운 느낌 |
| "즐거운 수업을 준비하고 계세요" | 강사의 정성을 전달, 기대감 증폭 |
| 준비물 체크리스트 | 실용적 정보 재확인 |
| 강사 연락처 | 수강생-강사 직접 소통 채널 제공 |
| "꽃과 함께하는 즐거운 시간" | 브랜드 핵심 가치와 연결 |

---

## 4. 이메일 3: 수강생 D-1 리마인더

**발송 시점**: 수업 전날 (GAS 시간 트리거)
**수신자**: 수강생
**제목**: `[PRESSCO21] 내일이 수업날입니다! 준비되셨나요?`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 수업 D-1 리마인더</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 40px 32px 32px;">

            <!-- D-1 카운트다운 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <tr>
                <td align="center">
                  <span style="display: inline-block; background-color: #c8785e; color: #ffffff; font-size: 14px; font-weight: 700; padding: 8px 20px; border-radius: 20px; letter-spacing: 1px;">
                    D-1
                  </span>
                </td>
              </tr>
            </table>

            <!-- 인사말 -->
            <p style="margin: 0 0 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{studentName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 16px; color: #333333; line-height: 1.7; font-weight: 600;">
              내일이 바로 수업날이에요!
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{partnerName}</strong> 선생님이 내일 <strong>{classTime}</strong>에 기다리고 계실 거예요.<br />
              마지막으로 준비 사항을 확인해주세요.
            </p>

            <!-- 내일 체크리스트 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef9f0; border-radius: 8px; border-left: 3px solid #b89b5e; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px 20px;">
                  <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #b89b5e;">
                    내일 준비 체크리스트
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 4px 0; font-size: 14px; color: #555555; line-height: 1.6;">
                        &#9744; 수업 시간: <strong>{classDate} {classTime}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 14px; color: #555555; line-height: 1.6;">
                        &#9744; 수업 장소: <strong>{classLocation}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 14px; color: #555555; line-height: 1.6;">
                        &#9744; 준비물: {preparations}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- 오시는 길 유도 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td style="padding: 12px 20px; background-color: #f5f5f5; border-radius: 8px;">
                  <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6;">
                    처음 방문하시는 공방이라면, 미리 오시는 길을 확인해두시면 편해요.<br />
                    수업 10분 전까지 도착해주시면 여유롭게 시작할 수 있어요.
                  </p>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              내일, 꽃과 함께하는 아름다운 시간이 기다리고 있어요.
            </p>
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              편안한 마음으로 오세요!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 클래스 예약 관련 안내 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| D-1 배지 (#c8785e) | 약간 따뜻한 오렌지 톤으로 긴박감 표현 (레드는 과도) |
| "내일이 바로 수업날이에요!" | 설렘 전달, 16px bold로 시각적 강조 |
| 체크리스트 형식 | 실용적 최종 확인, 체크박스 유니코드로 친근한 느낌 |
| "10분 전까지 도착" | 구체적 도착 시간 제안으로 노쇼 방지 |
| "편안한 마음으로 오세요" | 초보 수강생의 긴장감 완화 |

---

## 5. 이메일 4: 수강생 후기 요청 (+7일)

**발송 시점**: 수업 완료 후 7일 (GAS 시간 트리거)
**수신자**: 수강생
**제목**: `[PRESSCO21] 수업은 즐거우셨나요? 후기를 남겨주세요`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 후기 요청</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 40px 32px 32px;">

            <!-- 인사말 -->
            <p style="margin: 0 0 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{studentName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              지난 <strong>{classDate}</strong>에 참여해주신
            </p>
            <p style="margin: 0 0 24px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{className}</strong>, 즐거우셨나요?
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              {partnerName} 선생님과 함께한 시간이 좋은 추억이 되셨길 바라요.<br />
              소중한 경험을 다른 분들에게도 나눠주시면 큰 도움이 됩니다.
            </p>

            <!-- 별점 유도 (시각적) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <span style="font-size: 28px; letter-spacing: 4px; color: #b89b5e;">&#9733; &#9733; &#9733; &#9733; &#9733;</span>
                  <br />
                  <span style="font-size: 13px; color: #999999; display: inline-block; margin-top: 8px;">수업은 어떠셨나요?</span>
                </td>
              </tr>
            </table>

            <!-- 인센티브 안내 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef9f0; border-radius: 8px; border: 1px solid #e8e4db; margin-bottom: 28px;">
              <tr>
                <td style="padding: 20px 24px; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #b89b5e; font-weight: 700;">
                    사진 후기를 남겨주시면
                  </p>
                  <p style="margin: 0 0 4px; font-size: 22px; color: #b89b5e; font-weight: 700;">
                    1,000원 적립금
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #999999;">
                    을 드려요!
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA 버튼 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td align="center">
                  <a href="{reviewUrl}" style="display: inline-block; background-color: #b89b5e; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 6px; letter-spacing: 0.5px;">
                    후기 작성하기
                  </a>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              작성해주신 후기는 {partnerName} 선생님에게 큰 힘이 됩니다.
            </p>
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              감사합니다!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 클래스 예약 관련 안내 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| "즐거우셨나요?" | 부드러운 질문으로 시작, 부담 없는 톤 |
| 별점 시각 표현 | 골드 색상 별 5개로 직관적 유도 |
| 인센티브 강조 박스 | "사진 후기 + 1,000원 적립금"을 시각적으로 부각 |
| CTA "후기 작성하기" | 명확한 행동 유도, 골드 버튼 |
| "선생님에게 큰 힘이 됩니다" | 이타적 동기 부여 (강사에게 도움이 된다는 메시지) |

---

## 6. 이메일 5: 파트너 승인 안내

**발송 시점**: 관리자 승인 직후 (GAS 또는 수동)
**수신자**: 파트너 (승인된 강사/공방)
**제목**: `[PRESSCO21] 파트너 신청이 승인되었습니다! 환영합니다`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 파트너 승인 안내</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 환영 배너 -->
        <tr>
          <td style="padding: 32px 32px 0; text-align: center;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #b89b5e 0%, #d4b87a 100%); border-radius: 12px;">
              <tr>
                <td style="padding: 32px 24px; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 1px;">
                    WELCOME TO
                  </p>
                  <p style="margin: 0 0 8px; font-size: 20px; color: #ffffff; font-weight: 700; letter-spacing: 2px;">
                    PRESSCO21 PARTNER
                  </p>
                  <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                    꽃으로 노는 모든 방법, 함께 만들어가요
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 32px 32px 32px;">

            <!-- 인사말 -->
            <p style="margin: 0 0 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{partnerName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              PRESSCO21 파트너 신청이 <strong>승인</strong>되었습니다.
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              30년 전통의 꽃 공예 네트워크에 함께해주셔서 진심으로 감사합니다.<br />
              멋진 수업으로 더 많은 분들에게 꽃의 아름다움을 전해주세요.
            </p>

            <!-- 파트너 코드 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f3; border-radius: 8px; border: 1px solid #e8e4db; margin-bottom: 28px;">
              <tr>
                <td style="padding: 20px 24px; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 13px; color: #999999;">
                    파트너 코드
                  </p>
                  <p style="margin: 0 0 4px; font-size: 28px; color: #b89b5e; font-weight: 700; letter-spacing: 4px;">
                    {partnerCode}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #bbbbbb;">
                    클래스 등록, 대시보드 이용 시 필요합니다
                  </p>
                </td>
              </tr>
            </table>

            <!-- 시작 3단계 -->
            <p style="margin: 0 0 16px; font-size: 15px; color: #333333; font-weight: 600;">
              클래스 등록까지 3단계만 남았어요!
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <!-- STEP 1 -->
              <tr>
                <td style="padding: 12px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width: 36px; vertical-align: top;">
                        <span style="display: inline-block; width: 28px; height: 28px; background-color: #b89b5e; color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px; border-radius: 50%;">1</span>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 4px; font-size: 14px; color: #333333; font-weight: 600;">필수 교육 이수하기</p>
                        <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.5;">YouTube 영상 3개(45분) + 퀴즈(10문항)를 완료해주세요.<br />80점 이상이면 합격이에요.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- STEP 2 -->
              <tr>
                <td style="padding: 12px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width: 36px; vertical-align: top;">
                        <span style="display: inline-block; width: 28px; height: 28px; background-color: #b89b5e; color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px; border-radius: 50%;">2</span>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 4px; font-size: 14px; color: #333333; font-weight: 600;">첫 클래스 등록하기</p>
                        <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.5;">Google Forms로 강의 정보를 작성해주세요.<br />사진과 소개글이 상세할수록 예약률이 높아져요.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- STEP 3 -->
              <tr>
                <td style="padding: 12px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width: 36px; vertical-align: top;">
                        <span style="display: inline-block; width: 28px; height: 28px; background-color: #b89b5e; color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px; border-radius: 50%;">3</span>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 4px; font-size: 14px; color: #333333; font-weight: 600;">검수 후 클래스 오픈!</p>
                        <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.5;">관리자 검수(1~2 영업일) 후 플랫폼에 자동 노출됩니다.<br />수강생들이 바로 예약할 수 있어요.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- 파트너 대시보드 안내 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <tr>
                <td style="padding: 16px 20px; background-color: #f5f5f5; border-radius: 8px;">
                  <p style="margin: 0 0 6px; font-size: 14px; color: #333333; font-weight: 600;">
                    파트너 대시보드
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6;">
                    예약 현황, 수익 리포트, 적립금 관리를 한눈에 확인할 수 있어요.<br />
                    필수 교육 이수 후 대시보드가 활성화됩니다.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA 버튼 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td align="center">
                  <a href="{dashboardUrl}" style="display: inline-block; background-color: #b89b5e; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 6px; letter-spacing: 0.5px;">
                    파트너 시작하기
                  </a>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              궁금하신 점이 있으시면 언제든 편하게 연락주세요.
            </p>
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              함께 성장하는 여정을 기대하고 있을게요!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              파트너 문의: pressco21@foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 파트너 프로그램 관련 안내 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| 골드 그라데이션 환영 배너 | 특별한 환영의 느낌, 프리미엄 톤 |
| "꽃으로 노는 모든 방법, 함께 만들어가요" | 슬로건 변형으로 파트너 맞춤형 메시지 |
| 파트너 코드 대형 표시 | 중요 정보를 시각적으로 강조 |
| 3단계 넘버링 | 다음 행동을 명확하게 안내, 허들 낮춤 ("3단계만") |
| "함께 성장하는 여정을 기대" | 파트너를 동반자로 대하는 브랜드 톤 |

---

## 7. 이메일 6: 파트너 예약 알림

**발송 시점**: 새 예약 감지 시 즉시 (GAS 주문 폴링)
**수신자**: 파트너 (해당 클래스 강사)
**제목**: `[PRESSCO21] 새 예약이 들어왔습니다 - {className}`

### HTML 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PRESSCO21 새 예약 알림</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f0; font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f0;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

        <!-- 헤더 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; border-bottom: 2px solid #b89b5e;">
            <span style="font-size: 22px; font-weight: 700; color: #b89b5e; letter-spacing: 2px;">PRESSCO21</span>
            <br />
            <span style="font-size: 11px; color: #999999; letter-spacing: 1px;">Forever and ever and Blooming</span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding: 40px 32px 32px;">

            <!-- 새 예약 알림 배지 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <tr>
                <td align="center">
                  <span style="display: inline-block; background-color: #4a8c5c; color: #ffffff; font-size: 14px; font-weight: 700; padding: 8px 20px; border-radius: 20px; letter-spacing: 1px;">
                    NEW BOOKING
                  </span>
                </td>
              </tr>
            </table>

            <!-- 인사말 -->
            <p style="margin: 0 0 20px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong style="color: #b89b5e;">{partnerName}</strong>님, 안녕하세요!
            </p>

            <p style="margin: 0 0 8px; font-size: 15px; color: #333333; line-height: 1.7;">
              <strong>{className}</strong>에 새 예약이 들어왔습니다.
            </p>

            <p style="margin: 0 0 32px; font-size: 15px; color: #333333; line-height: 1.7;">
              수강생 정보를 확인해주세요.
            </p>

            <!-- 예약 정보 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #faf8f3; border-radius: 8px; border: 1px solid #e8e4db; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px 24px 12px;">
                  <p style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #b89b5e; letter-spacing: 1px;">
                    예약 상세
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; width: 90px; vertical-align: top;">클래스</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{className}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">수강생</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{maskedStudentName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">연락처</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{maskedStudentPhone}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">수업 일시</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{classDate} {classTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">인원</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333;">{personnel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-size: 13px; color: #999999; vertical-align: top;">결제 금액</td>
                      <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">{totalAmount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 24px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e8e4db;">
                    <tr>
                      <td style="padding: 12px 0 0; font-size: 12px; color: #999999;">
                        주문번호: {orderNumber}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- 개인정보 안내 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
              <tr>
                <td style="padding: 12px 20px; background-color: #f5f5f5; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                    수강생 개인정보는 수업 진행 목적으로만 사용해주세요.<br />
                    상세 정보는 파트너 대시보드에서 확인하실 수 있습니다.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA 버튼 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
              <tr>
                <td align="center">
                  <a href="{dashboardUrl}" style="display: inline-block; background-color: #b89b5e; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 6px; letter-spacing: 0.5px;">
                    대시보드에서 확인하기
                  </a>
                </td>
              </tr>
            </table>

            <!-- 마무리 -->
            <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
              좋은 수업 준비해주세요!
            </p>

          </td>
        </tr>

        <!-- 서명 -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <p style="margin: 0; font-size: 14px; color: #b89b5e; font-weight: 600;">
              PRESSCO21 드림
            </p>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding: 24px 32px; text-align: center; background-color: #faf8f3; border-top: 1px solid #e8e4db;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
              PRESSCO21 | foreverlove.co.kr
            </p>
            <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
              이 메일은 PRESSCO21 파트너 예약 알림 메일입니다.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
```

### 카피 설계 의도

| 요소 | 의도 |
|------|------|
| 녹색 "NEW BOOKING" 배지 | 긍정적 알림임을 색상으로 전달 (골드가 아닌 녹색으로 차별화) |
| 개인정보 마스킹 | 이메일 내 개인정보 최소 노출 (홍**, 010-****-5678) |
| 개인정보 안내 문구 | 파트너의 개인정보 보호 책임 안내 |
| "대시보드에서 확인하기" CTA | 상세 정보는 보안이 유지되는 대시보드로 유도 |
| "좋은 수업 준비해주세요!" | 간결하고 격려하는 마무리 |

---

## 8. GAS 구현 참조

### 8-1. GAS 이메일 함수 시그니처

```
// 의사 코드 - Task 221 gas-backend-expert 구현 시 참조

FUNCTION sendBookingConfirmation(orderData):
    // 이메일 1: 수강생 예약 확인
    subject = '[PRESSCO21] ' + orderData.className + ' 예약이 확정되었습니다'
    body = buildBookingConfirmationHtml(orderData)
    MailApp.sendEmail({
        to: orderData.studentEmail,
        subject: subject,
        htmlBody: body
    })

FUNCTION sendD3Reminder(reservationData):
    // 이메일 2: D-3 리마인더
    subject = '[PRESSCO21] ' + reservationData.className + ' 수업까지 3일 남았습니다!'
    body = buildD3ReminderHtml(reservationData)
    MailApp.sendEmail({
        to: reservationData.studentEmail,
        subject: subject,
        htmlBody: body
    })

FUNCTION sendD1Reminder(reservationData):
    // 이메일 3: D-1 리마인더
    subject = '[PRESSCO21] 내일이 수업날입니다! 준비되셨나요?'
    body = buildD1ReminderHtml(reservationData)
    MailApp.sendEmail({
        to: reservationData.studentEmail,
        subject: subject,
        htmlBody: body
    })

FUNCTION sendReviewRequest(completedData):
    // 이메일 4: 후기 요청 (+7일)
    subject = '[PRESSCO21] 수업은 즐거우셨나요? 후기를 남겨주세요'
    body = buildReviewRequestHtml(completedData)
    MailApp.sendEmail({
        to: completedData.studentEmail,
        subject: subject,
        htmlBody: body
    })

FUNCTION sendPartnerApproval(partnerData):
    // 이메일 5: 파트너 승인
    subject = '[PRESSCO21] 파트너 신청이 승인되었습니다! 환영합니다'
    body = buildPartnerApprovalHtml(partnerData)
    MailApp.sendEmail({
        to: partnerData.email,
        subject: subject,
        htmlBody: body
    })

FUNCTION sendPartnerBookingAlert(orderData, partnerData):
    // 이메일 6: 파트너 예약 알림
    subject = '[PRESSCO21] 새 예약이 들어왔습니다 - ' + orderData.className
    body = buildPartnerBookingAlertHtml(orderData, partnerData)
    MailApp.sendEmail({
        to: partnerData.email,
        subject: subject,
        htmlBody: body
    })
```

### 8-2. HTML 빌더 패턴 (GAS 구현 권장)

```
// GAS에서 HTML 이메일을 문자열 연결로 빌드하는 패턴
// 주의: ${var} 사용 금지! 반드시 문자열 연결로.

FUNCTION buildBookingConfirmationHtml(data):
    var html = ''
    html += '<table width="100%" ...>'
    html += '  <tr><td>' + escapeHtml_(data.studentName) + '님, 안녕하세요!</td></tr>'
    html += '  <tr><td>' + escapeHtml_(data.className) + ' 예약이 확정되었습니다.</td></tr>'
    // ... (위 HTML 템플릿의 플레이스홀더를 문자열 연결로 대체)
    html += '</table>'
    return html

// XSS 방지: 모든 동적 값은 반드시 escapeHtml_()로 이스케이프
FUNCTION escapeHtml_(text):
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
```

### 8-3. 조건부 블록 처리

일부 이메일 블록은 조건에 따라 표시/비표시됩니다.

| 블록 | 조건 | 처리 |
|------|------|------|
| 준비물 안내 (이메일 1, 2, 3) | `preparations` 값 존재 시 | 값이 없으면 해당 `<table>` 블록을 빈 문자열로 대체 |
| 강사 연락처 (이메일 2) | `partnerContact` 값 존재 시 | 값이 없으면 해당 `<table>` 블록 제거 |
| 후기 인센티브 (이메일 4) | 항상 표시 | 인센티브 금액은 상수로 관리 (현재 1,000원) |

### 8-4. 이메일 발송 한도 관리

| 항목 | 값 | 비고 |
|------|------|------|
| GAS 일 한도 (무료) | 100명/일 | Gmail 기준 |
| GAS 일 한도 (Workspace) | 1,500명/일 | Google Workspace 기준 |
| 예약 1건당 발송 | 최대 4통 | 확인(1) + D-3(1) + D-1(1) + 후기(1) |
| 파트너 예약 알림 | 1통/예약 | 파트너에게 발송 |
| 일일 이메일 카운트 | Sheets에 기록 | 70건 도달 시 관리자 알림 |

---

## 브랜드 톤 체크 완료 사항

- [x] 모든 이메일에서 "~해주세요", "~할게요" 초대/권유형 표현 사용
- [x] 과도한 판촉/긴급성 표현 미사용 (D-1에서도 "긴급" 대신 "준비되셨나요?")
- [x] 에러/부정적 메시지 없음 (예약 확인/리마인더/축하 이메일만 포함)
- [x] 개인정보 보호 원칙 준수 (파트너 알림에서 수강생 정보 마스킹)
- [x] 포인트 컬러 #b89b5e 일관 사용
- [x] PRESSCO21 슬로건 "Forever and ever and Blooming" 헤더에 포함
- [x] "PRESSCO21 드림" 서명으로 따뜻한 마무리
- [x] 초보 수강생 배려 ("처음 방문하시는 공방이라면", "편안한 마음으로 오세요")
- [x] Task 212 카피(`class-detail-copy.json`)와 톤 일관성 유지

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-02-21 | 1.0 | 6종 이메일 템플릿 초기 작성 (brand-planning-expert) |
