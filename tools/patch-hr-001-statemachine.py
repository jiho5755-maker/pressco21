#!/usr/bin/env python3
"""HR-001 WF 상태머신 + 10분 취소 버튼 패치 스크립트.

수정 내역:
1. 명령어 파싱 Code: hr:cancel:{id} 콜백 분기 추가
2. 명령어 라우팅 Switch: do_cancel rule 추가
3. 출근/퇴근/동의+출근 결과 포맷 Code: 409/422 에러 분기 + recordId 전달
4. 출근 결과 분기 Switch: error 분기 추가
5. 퇴근 결과 분기 Switch 신규 추가
6. 신규 노드 6개: 취소 플로우 + 에러 전용 발송
7. 출근/퇴근/동의+출근 발송: 취소 버튼 reply_markup 추가
"""
import json
import sys
from pathlib import Path

WF_PATH = Path(
    "/Users/jangjiho/workspace/pressco21/n8n-automation/workflows/hr/WF-HR-001_clock-inout.json"
)

PARSE_CODE = r"""var item = $input.first().json;
var userTier = item._tier || 'senior';
var isCallback = !!item.callback_query;
var chatId = '', telegramUserId = '', callbackQueryId = '', messageId = '', firstName = '';
var action = 'unknown', args = '', workMode = '', pendingWorkMode = '', pendingCancelId = '';

if (isCallback) {
  var cq = item.callback_query;
  chatId = String(cq.message && cq.message.chat ? cq.message.chat.id : (cq.from ? cq.from.id : ''));
  telegramUserId = String(cq.from ? cq.from.id : '');
  callbackQueryId = cq.id || '';
  messageId = String(cq.message ? cq.message.message_id : '');
  firstName = cq.from ? (cq.from.first_name || '') : '';
  var data = cq.data || '';
  if (data.indexOf('hr:consent:yes:') === 0) {
    action = 'do_consent';
    pendingWorkMode = data.split(':')[3];
  } else if (data === 'hr:consent:no') {
    action = 'consent_declined';
  } else if (data.indexOf('hr:cancel:') === 0) {
    action = 'do_cancel';
    pendingCancelId = data.substring('hr:cancel:'.length);
  }
} else if (item.message) {
  var msg = item.message;
  chatId = String(msg.chat ? msg.chat.id : (msg.from ? msg.from.id : ''));
  telegramUserId = String(msg.from ? msg.from.id : '');
  messageId = String(msg.message_id || '');
  firstName = msg.from ? (msg.from.first_name || '') : '';
  var text = (msg.text || '').trim();
  var firstWord = text.split(' ')[0] || '';
  firstWord = firstWord.split('@')[0].toLowerCase();
  var menuCmds = ['/시작', '/start', '/menu', '/메뉴'];
  var clockoutCmds = ['/퇴근', '/clockout'];
  if (menuCmds.indexOf(firstWord) >= 0) {
    action = 'show_keyboard';
  } else if (text === '🏢 사업장 출근' || firstWord === '/clockin_office') {
    action = 'clockin'; workMode = 'office';
  } else if (text === '🏠 재택 출근' || firstWord === '/clockin_remote') {
    action = 'clockin'; workMode = 'remote';
  } else if (text === '📸 외근 출근' || firstWord === '/clockin_field') {
    action = 'clockin'; workMode = 'field';
  } else if (text === '✅ 퇴근' || clockoutCmds.indexOf(firstWord) >= 0) {
    action = 'clockout';
  } else if (text) {
    action = 'free_text'; args = text;
  }
}

if (action === 'show_keyboard') {
  if (userTier === 'junior_remote') action = 'show_remote_intro';
  else if (userTier === 'admin_cmd_only') action = 'show_admin_intro';
}

return [{ json: {
  action: action, userTier: userTier, chatId: chatId, telegramUserId: telegramUserId,
  args: args, workMode: workMode, pendingWorkMode: pendingWorkMode,
  pendingCancelId: pendingCancelId,
  callbackQueryId: callbackQueryId, messageId: messageId, firstName: firstName
} }];"""

CLOCKIN_FORMAT_CODE = r"""var parse = $('명령어 파싱').first().json;
var resp = $input.first().json;
var statusCode = resp.statusCode || 200;
var body = resp.body || resp;
if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} }

var mode = 'direct';
var message = '';
var consentKeyboard = '';
var recordId = '';

function fmtTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var k = new Date(d.getTime() + 9*3600000);
  return String(k.getUTCHours()).padStart(2,'0') + ':' + String(k.getUTCMinutes()).padStart(2,'0');
}

if (statusCode === 201 && body.ok) {
  mode = 'direct';
  recordId = body.record ? body.record.id : '';
  var now = new Date(Date.now() + 9*3600000);
  var hh = String(now.getUTCHours()).padStart(2,'0');
  var mm = String(now.getUTCMinutes()).padStart(2,'0');
  var modeLabel = { office: '사업장', remote: '재택', field: '외근/촬영' };
  var modeText = modeLabel[parse.workMode] || parse.workMode;
  if (body.isDeemedHours) {
    message = '✅ ' + body.staffName + '님, 업무 시작 보고 접수 (' + hh + ':' + mm + ', ' + modeText + ')\n\n소정근로시간(8시간) 근로한 것으로 간주합니다.\n\n📝 업무 내용은 메시지로 보내주세요.\n\n⏱ 실수로 누르셨다면 10분 내 아래 버튼으로 취소 가능합니다.';
  } else {
    message = '✅ ' + body.staffName + '님, 출근 기록 완료 (' + hh + ':' + mm + ', ' + modeText + ')\n\n⏱ 실수로 누르셨다면 10분 내 아래 버튼으로 취소 가능합니다.';
  }
} else if (statusCode === 403 && body.needsConsent) {
  mode = 'consent';
  message = '📋 개인정보 수집·이용 동의\n\n출퇴근 기록, 업무일지 등 HR 데이터가 근로기준법 제42조에 따라 3년간 보관됩니다.\n\n동의하시겠습니까?';
  consentKeyboard = JSON.stringify({ inline_keyboard: [[{ text: '✅ 동의합니다', callback_data: 'hr:consent:yes:' + parse.workMode }, { text: '❌ 거부', callback_data: 'hr:consent:no' }]] });
} else if (statusCode === 409 && body.error === 'already_clocked_in') {
  mode = 'error';
  var t = fmtTime(body.existingRecord ? body.existingRecord.recordedAt : null);
  message = '⚠️ 이미 ' + (t ? t + '에 ' : '') + '출근 기록이 있습니다.\n\n수정이 필요하면 관리자(장지호)에게 요청해주세요.';
} else if (statusCode === 409 && body.error === 'already_clocked_out') {
  mode = 'error';
  message = '⚠️ 오늘 이미 퇴근까지 완료되었습니다.\n\n재출근은 관리자(장지호) 정정 요청이 필요합니다.';
} else if (statusCode === 404) {
  mode = 'error';
  message = '❌ 등록되지 않은 사용자입니다. 관리자에게 문의하세요.';
} else {
  mode = 'error';
  message = '❌ 오류: ' + (body.message || body.error || '알 수 없는 오류');
}

return [{ json: { mode: mode, message: message, consentKeyboard: consentKeyboard, chatId: parse.chatId, recordId: recordId } }];"""

CLOCKOUT_FORMAT_CODE = r"""var parse = $('명령어 파싱').first().json;
var resp = $input.first().json;
var statusCode = resp.statusCode || 200;
var body = resp.body || resp;
if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} }

var mode = 'direct';
var message = '';
var recordId = '';

function fmtTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var k = new Date(d.getTime() + 9*3600000);
  return String(k.getUTCHours()).padStart(2,'0') + ':' + String(k.getUTCMinutes()).padStart(2,'0');
}

if (statusCode === 201 && body.ok) {
  mode = 'direct';
  recordId = body.record ? body.record.id : '';
  var now = new Date(Date.now() + 9*3600000);
  var hh = String(now.getUTCHours()).padStart(2,'0');
  var mm = String(now.getUTCMinutes()).padStart(2,'0');
  if (body.isDeemedHours) {
    message = '✅ ' + body.staffName + '님, 업무 종료 보고 접수 (' + hh + ':' + mm + ')\n\n오늘도 수고하셨습니다.\n\n⏱ 실수로 누르셨다면 10분 내 아래 버튼으로 취소 가능합니다.';
  } else {
    message = '✅ ' + body.staffName + '님, 퇴근 기록 완료 (' + hh + ':' + mm + ')\n\n오늘도 수고하셨습니다.\n\n⏱ 실수로 누르셨다면 10분 내 아래 버튼으로 취소 가능합니다.';
  }
} else if (statusCode === 409 && body.error === 'already_clocked_out') {
  mode = 'error';
  var t = fmtTime(body.existingRecord ? body.existingRecord.recordedAt : null);
  message = '⚠️ 이미 ' + (t ? t + '에 ' : '') + '퇴근 기록이 있습니다.\n\n수정이 필요하면 관리자(장지호)에게 요청해주세요.';
} else if (statusCode === 422 && body.error === 'needs_clock_in') {
  mode = 'error';
  message = '⚠️ 출근 기록이 없습니다.\n\n먼저 🏢/🏠/📸 출근 버튼을 사용해주세요.';
} else if (statusCode === 403) {
  mode = 'error';
  message = '📋 개인정보 동의가 필요합니다.\n출근 버튼을 먼저 사용해주세요.';
} else if (statusCode === 404) {
  mode = 'error';
  message = '❌ 등록되지 않은 사용자입니다.';
} else {
  mode = 'error';
  message = '❌ 오류: ' + (body.message || body.error || '알 수 없는 오류');
}

return [{ json: { mode: mode, message: message, chatId: parse.chatId, recordId: recordId } }];"""

CONSENT_CLOCKIN_FORMAT_CODE = r"""var parse = $('명령어 파싱').first().json;
var resp = $input.first().json;
var body = resp.body || resp;
if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} }

var message = '';
var recordId = '';
if (body.ok && body.record) {
  recordId = body.record.id;
  var now = new Date(Date.now() + 9*3600000);
  var hh = String(now.getUTCHours()).padStart(2,'0');
  var mm = String(now.getUTCMinutes()).padStart(2,'0');
  var modeLabel = { office: '사업장', remote: '재택', field: '외근/촬영' };
  var modeText = modeLabel[parse.pendingWorkMode] || parse.pendingWorkMode;
  message = '✅ 동의 완료 + 출근 기록 완료 (' + hh + ':' + mm + ', ' + modeText + ')\n\n⏱ 실수로 누르셨다면 10분 내 아래 버튼으로 취소 가능합니다.';
} else {
  message = '❌ 기록 실패: ' + (body.message || body.error || '알 수 없는 오류');
}

return [{ json: { message: message, chatId: parse.chatId, recordId: recordId } }];"""

CANCEL_FORMAT_CODE = r"""var parse = $('명령어 파싱').first().json;
var resp = $input.first().json;
var statusCode = resp.statusCode || 200;
var body = resp.body || resp;
if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} }

var message = '';
if (statusCode === 200 && body.ok) {
  var typeLabel = body.originalType === 'clock_in' ? '출근' : '퇴근';
  message = '↩️ ' + typeLabel + ' 기록이 취소되었습니다.\n\n필요하면 다시 버튼을 눌러주세요.';
} else if (statusCode === 408) {
  message = '⏰ 취소 가능 시간(10분)이 지났습니다.\n\n관리자(장지호)에게 정정을 요청해주세요.';
} else if (statusCode === 409) {
  message = '⚠️ 이미 취소된 기록입니다.';
} else if (statusCode === 403) {
  message = '⛔ 본인의 기록만 취소할 수 있습니다.';
} else if (statusCode === 404) {
  message = '❌ 해당 기록을 찾을 수 없습니다.';
} else {
  message = '❌ 오류: ' + (body.message || body.error || '알 수 없는 오류');
}

return [{ json: { message: message, chatId: parse.chatId } }];"""


def main():
    with open(WF_PATH) as f:
        wf = json.load(f)

    nodes = wf["nodes"]
    connections = wf["connections"]

    # 노드 이름→인덱스 맵
    name_to_idx = {n["name"]: i for i, n in enumerate(nodes)}

    # 1. 명령어 파싱 Code 교체
    nodes[name_to_idx["명령어 파싱"]]["parameters"]["jsCode"] = PARSE_CODE

    # 2. 출근 결과 포맷 Code 교체
    nodes[name_to_idx["출근 결과 포맷"]]["parameters"]["jsCode"] = CLOCKIN_FORMAT_CODE

    # 3. 퇴근 결과 포맷 Code 교체
    nodes[name_to_idx["퇴근 결과 포맷"]]["parameters"]["jsCode"] = CLOCKOUT_FORMAT_CODE

    # 4. 동의+출근 결과 포맷 Code 교체
    nodes[name_to_idx["동의+출근 결과 포맷"]]["parameters"][
        "jsCode"
    ] = CONSENT_CLOCKIN_FORMAT_CODE

    # 5. 출근 결과 분기 Switch에 'error' rule 추가
    clockin_switch = nodes[name_to_idx["출근 결과 분기"]]
    existing_rules = clockin_switch["parameters"]["rules"]["values"]
    # 현재 '동의필요'(mode==consent) 하나만 있음. 'error' 추가
    if not any(r.get("outputKey") == "에러" for r in existing_rules):
        existing_rules.append(
            {
                "conditions": {
                    "options": {
                        "version": 2,
                        "caseSensitive": True,
                        "leftValue": "",
                    },
                    "conditions": [
                        {
                            "leftValue": "={{ $json.mode }}",
                            "rightValue": "error",
                            "operator": {"type": "string", "operation": "equals"},
                        }
                    ],
                    "combinator": "and",
                },
                "renameOutput": True,
                "outputKey": "에러",
            }
        )

    # 6. 명령어 라우팅 Switch에 do_cancel rule 추가
    route_switch = nodes[name_to_idx["명령어 라우팅"]]
    route_rules = route_switch["parameters"]["rules"]["values"]
    if not any(r.get("outputKey") == "취소" for r in route_rules):
        route_rules.append(
            {
                "conditions": {
                    "options": {
                        "version": 2,
                        "caseSensitive": True,
                        "leftValue": "",
                    },
                    "conditions": [
                        {
                            "leftValue": "={{ $json.action }}",
                            "rightValue": "do_cancel",
                            "operator": {"type": "string", "operation": "equals"},
                        }
                    ],
                    "combinator": "and",
                },
                "renameOutput": True,
                "outputKey": "취소",
            }
        )

    # 7. 기존 퇴근 플로우에 Switch 추가 (현재 없음)
    # 퇴근 결과 포맷 → 퇴근 결과 발송 인 기존 연결 분해 → 퇴근 결과 포맷 → 퇴근 결과 분기 Switch → 성공/에러
    # 먼저 신규 Switch 노드 생성
    clockout_switch_node = {
        "parameters": {
            "rules": {
                "values": [
                    {
                        "conditions": {
                            "options": {
                                "version": 2,
                                "caseSensitive": True,
                                "leftValue": "",
                            },
                            "conditions": [
                                {
                                    "leftValue": "={{ $json.mode }}",
                                    "rightValue": "error",
                                    "operator": {
                                        "type": "string",
                                        "operation": "equals",
                                    },
                                }
                            ],
                            "combinator": "and",
                        },
                        "renameOutput": True,
                        "outputKey": "에러",
                    }
                ]
            },
            "options": {"fallbackOutput": "extra"},
        },
        "type": "n8n-nodes-base.switch",
        "typeVersion": 3.2,
        "position": [1640, 960],
        "id": "clockout-result-switch",
        "name": "퇴근 결과 분기",
    }
    if "퇴근 결과 분기" not in name_to_idx:
        nodes.append(clockout_switch_node)

    # 8. 신규 에러 전용 Telegram 노드 (출근/퇴근 공통 사용 가능하지만 각각 분리)
    clockin_error_node = {
        "parameters": {
            "chatId": "={{ $json.chatId }}",
            "text": "={{ $json.message }}",
            "additionalFields": {"appendAttribution": False},
        },
        "type": "n8n-nodes-base.telegram",
        "typeVersion": 1.2,
        "position": [1700, 400],
        "id": "clockin-error-send",
        "name": "출근 에러 발송",
        "credentials": {
            "telegramApi": {
                "id": "RdFu3nsFuuO5NCff",
                "name": "Pressco메이크샵봇",
            }
        },
    }
    clockout_error_node = {
        "parameters": {
            "chatId": "={{ $json.chatId }}",
            "text": "={{ $json.message }}",
            "additionalFields": {"appendAttribution": False},
        },
        "type": "n8n-nodes-base.telegram",
        "typeVersion": 1.2,
        "position": [1900, 1060],
        "id": "clockout-error-send",
        "name": "퇴근 에러 발송",
        "credentials": {
            "telegramApi": {
                "id": "RdFu3nsFuuO5NCff",
                "name": "Pressco메이크샵봇",
            }
        },
    }
    if "출근 에러 발송" not in name_to_idx:
        nodes.append(clockin_error_node)
    if "퇴근 에러 발송" not in name_to_idx:
        nodes.append(clockout_error_node)

    # 9. 취소 플로우 신규 노드들
    cancel_api_node = {
        "parameters": {
            "method": "POST",
            "url": "https://mini.pressco21.com/api/hr/attendance/cancel",
            "authentication": "none",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "x-flora-automation-key",
                        "value": "={{ $env.FLORA_HR_API_KEY }}",
                    },
                    {"name": "Content-Type", "value": "application/json"},
                ]
            },
            "sendBody": True,
            "bodyContentType": "json",
            "jsonBody": "={{ { \"recordId\": $('명령어 파싱').first().json.pendingCancelId, \"telegramUserId\": $('명령어 파싱').first().json.telegramUserId } }}",
            "options": {"response": {"response": {"neverError": True, "fullResponse": True}}},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [900, 1400],
        "id": "api-cancel",
        "name": "API 기록 취소",
    }
    cancel_ack_node = {
        "parameters": {
            "resource": "callback",
            "queryId": "={{ $('명령어 파싱').first().json.callbackQueryId }}",
            "results": "↩️ 취소 처리 중...",
        },
        "type": "n8n-nodes-base.telegram",
        "typeVersion": 1.2,
        "position": [700, 1400],
        "id": "cancel-callback-ack",
        "name": "콜백 응답 (취소)",
        "credentials": {
            "telegramApi": {
                "id": "RdFu3nsFuuO5NCff",
                "name": "Pressco메이크샵봇",
            }
        },
    }
    cancel_format_node = {
        "parameters": {"jsCode": CANCEL_FORMAT_CODE},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1100, 1400],
        "id": "cancel-format",
        "name": "취소 결과 포맷",
    }
    cancel_send_node = {
        "parameters": {
            "chatId": "={{ $json.chatId }}",
            "text": "={{ $json.message }}",
            "additionalFields": {"appendAttribution": False},
        },
        "type": "n8n-nodes-base.telegram",
        "typeVersion": 1.2,
        "position": [1300, 1400],
        "id": "cancel-send",
        "name": "취소 결과 발송",
        "credentials": {
            "telegramApi": {
                "id": "RdFu3nsFuuO5NCff",
                "name": "Pressco메이크샵봇",
            }
        },
    }
    for new_node in [cancel_ack_node, cancel_api_node, cancel_format_node, cancel_send_node]:
        if new_node["name"] not in name_to_idx:
            nodes.append(new_node)

    # 10. 출근/퇴근/동의+출근 발송에 취소 버튼 reply_markup 추가
    cancel_inline_keyboard = {
        "rows": [
            {
                "row": {
                    "buttons": [
                        {
                            "text": "↩️ 방금 기록 취소",
                            "additionalFields": {
                                "callback_data": "=hr:cancel:{{ $json.recordId }}"
                            },
                        }
                    ]
                }
            }
        ]
    }
    for send_name in ["출근 결과 발송", "퇴근 결과 발송", "동의+출근 발송"]:
        # Telegram 발송 파라미터에 inlineKeyboard 추가
        for n in nodes:
            if n["name"] == send_name:
                n["parameters"]["replyMarkup"] = "inlineKeyboard"
                n["parameters"]["inlineKeyboard"] = cancel_inline_keyboard

    # 11. Connections 수정
    # 기존: 출근 결과 분기 (동의필요) → 동의 요청 발송
    # 기존: 출근 결과 분기 (기본) → 출근 결과 발송
    # 추가: 출근 결과 분기 (에러) → 출근 에러 발송
    # Switch의 output 순서는 rules 순서와 일치
    # 현재 rules: [동의필요, 에러], 추가 전엔 [동의필요] 하나였음
    # Switch의 outputs 인덱스:
    #   - 0: 동의필요
    #   - 1: 에러 (새로 추가)
    #   - extra (fallbackOutput): 둘 다 아닌 경우 → 성공

    clockin_switch_conn = connections.get("출근 결과 분기", {})
    # n8n의 출력 순서는 main[0], main[1], ... 순
    # 기존 connections[출근 결과 분기].main은 [ [동의 요청 발송], [출근 결과 발송] ] 구조일 가능성
    # 실제 확인 필요 - 일단 새로 생성
    # Switch v3.2에서 fallbackOutput=extra는 마지막 output

    # 직접 connections 재구성
    # 기존 출근 결과 분기 연결 유지하면서 에러 output 추가
    if "출근 결과 분기" in connections:
        main_list = connections["출근 결과 분기"]["main"]
        # rules 순서: [동의필요(0), 에러(1)], fallback=extra → 마지막
        # 기존에 main이 2개짜리면 [동의필요, 성공(fallback)]
        # 새로 추가된 '에러'는 index 1에 들어가고 fallback은 맨 뒤로
        # 기존: [[동의 요청 발송], [출근 결과 발송]]
        # 목표: [[동의 요청 발송], [출근 에러 발송], [출근 결과 발송]]
        if len(main_list) == 2:
            consent_out = main_list[0]
            success_out = main_list[1]
            connections["출근 결과 분기"]["main"] = [
                consent_out,
                [{"node": "출근 에러 발송", "type": "main", "index": 0}],
                success_out,
            ]

    # 퇴근 결과 포맷 → 퇴근 결과 분기 → (에러 → 퇴근 에러 발송) (fallback → 퇴근 결과 발송)
    # 기존: 퇴근 결과 포맷 → 퇴근 결과 발송
    if "퇴근 결과 포맷" in connections:
        # 기존 연결 해제 + 새 연결 추가
        connections["퇴근 결과 포맷"] = {
            "main": [[{"node": "퇴근 결과 분기", "type": "main", "index": 0}]]
        }
    connections["퇴근 결과 분기"] = {
        "main": [
            [{"node": "퇴근 에러 발송", "type": "main", "index": 0}],  # 에러
            [{"node": "퇴근 결과 발송", "type": "main", "index": 0}],  # fallback (성공)
        ]
    }

    # 명령어 라우팅 → 취소 분기
    # 현재 명령어 라우팅.main은 [키보드, 출근, 동의처리, 동의거부, 퇴근, 자유텍스트, 재택안내, 대표자안내] 8개
    # 취소(9번째) 추가
    if "명령어 라우팅" in connections:
        route_main = connections["명령어 라우팅"]["main"]
        # 9번째 output = 취소 분기 → 콜백 응답 (취소)
        while len(route_main) < 9:
            route_main.append([])
        route_main[8] = [{"node": "콜백 응답 (취소)", "type": "main", "index": 0}]

    # 콜백 응답 (취소) → API 기록 취소
    connections["콜백 응답 (취소)"] = {
        "main": [[{"node": "API 기록 취소", "type": "main", "index": 0}]]
    }
    # API 기록 취소 → 취소 결과 포맷
    connections["API 기록 취소"] = {
        "main": [[{"node": "취소 결과 포맷", "type": "main", "index": 0}]]
    }
    # 취소 결과 포맷 → 취소 결과 발송
    connections["취소 결과 포맷"] = {
        "main": [[{"node": "취소 결과 발송", "type": "main", "index": 0}]]
    }

    # Save
    with open(WF_PATH, "w") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)

    print(f"✅ WF 패치 완료: {WF_PATH}")
    print(f"   노드 개수: {len(nodes)} (기존 27 + 신규 {len(nodes) - 27})")


if __name__ == "__main__":
    main()
