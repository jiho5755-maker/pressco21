#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-RETENTION-student-lifecycle.json');

function readExistingId(filePath) {
    if (!fs.existsSync(filePath)) {
        return '';
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')).id || '';
    } catch (error) {
        return '';
    }
}

function node(id, name, type, typeVersion, position, parameters, extras) {
    var value = {
        id: id,
        name: name,
        type: type,
        typeVersion: typeVersion,
        position: position,
        parameters: parameters || {}
    };

    if (extras) {
        Object.keys(extras).forEach(function(key) {
            value[key] = extras[key];
        });
    }

    return value;
}

function main() {
    var existingId = readExistingId(OUTPUT_PATH);
    var workflow = {
        name: 'WF-RETENTION Student Lifecycle',
        nodes: [
            node(
                'wfret-schedule',
                'Schedule Daily 09:15',
                'n8n-nodes-base.scheduleTrigger',
                1.2,
                [220, 220],
                {
                    rule: {
                        interval: [
                            {
                                field: 'cronExpression',
                                expression: '15 9 * * *'
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-webhook',
                'Webhook',
                'n8n-nodes-base.webhook',
                2,
                [220, 420],
                {
                    httpMethod: 'POST',
                    path: 'student-retention',
                    responseMode: 'responseNode',
                    options: {}
                },
                {
                    webhookId: 'student-retention'
                }
            ),
            node(
                'wfret-parse-trigger',
                'Parse Trigger & Auth',
                'n8n-nodes-base.code',
                2,
                [460, 320],
                {
                    jsCode:
                        "const input = $input.first().json || {};\n" +
                        "const headers = input.headers || {};\n" +
                        "const hasWebhookBody = !!input.body || Object.keys(headers).length > 0;\n" +
                        "\n" +
                        "function pad(n) {\n" +
                        "  return String(n).padStart(2, '0');\n" +
                        "}\n" +
                        "\n" +
                        "function toDateString(date) {\n" +
                        "  return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());\n" +
                        "}\n" +
                        "\n" +
                        "function getKstNow() {\n" +
                        "  const now = new Date();\n" +
                        "  return new Date(now.getTime() + 9 * 60 * 60 * 1000);\n" +
                        "}\n" +
                        "\n" +
                        "function parseDate(value, fallback) {\n" +
                        "  const text = String(value || '').trim();\n" +
                        "  let parts;\n" +
                        "  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return fallback;\n" +
                        "  parts = text.split('-');\n" +
                        "  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));\n" +
                        "}\n" +
                        "\n" +
                        "if (!hasWebhookBody) {\n" +
                        "  const today = getKstNow();\n" +
                        "  const completionTarget = new Date(today.getTime());\n" +
                        "  const dormantTarget = new Date(today.getTime());\n" +
                        "  completionTarget.setDate(completionTarget.getDate() - 1);\n" +
                        "  dormantTarget.setDate(dormantTarget.getDate() - 30);\n" +
                        "\n" +
                        "  return [{\n" +
                        "    json: {\n" +
                        "      _source: 'schedule',\n" +
                        "      _mode: 'process',\n" +
                        "      dry_run: false,\n" +
                        "      today: toDateString(today),\n" +
                        "      target_completion_date: toDateString(completionTarget),\n" +
                        "      target_dormant_date: toDateString(dormantTarget),\n" +
                        "      run_completion: true,\n" +
                        "      run_dormant: true\n" +
                        "    }\n" +
                        "  }];\n" +
                        "}\n" +
                        "\n" +
                        "const body = input.body || {};\n" +
                        "const authHeader = headers.authorization || headers.Authorization || '';\n" +
                        "const token = typeof authHeader === 'string' && authHeader.indexOf('Bearer ') === 0 ? authHeader.substring(7).trim() : '';\n" +
                        "const expectedToken = $env.ADMIN_API_TOKEN || '';\n" +
                        "if (!token || !expectedToken || token !== expectedToken) {\n" +
                        "  return [{ json: { _source: 'webhook', _mode: 'unauthorized' } }];\n" +
                        "}\n" +
                        "\n" +
                        "const today = parseDate(body.today, getKstNow());\n" +
                        "const completionTarget = new Date(today.getTime());\n" +
                        "const dormantTarget = new Date(today.getTime());\n" +
                        "completionTarget.setDate(completionTarget.getDate() - 1);\n" +
                        "dormantTarget.setDate(dormantTarget.getDate() - 30);\n" +
                        "\n" +
                        "const only = String(body.only || 'all').trim().toLowerCase();\n" +
                        "const dryRun = body.dry_run === true || String(body.dry_run || '').toLowerCase() === 'true' || String(body.mode || '').toLowerCase() === 'dry_run';\n" +
                        "\n" +
                        "return [{\n" +
                        "  json: {\n" +
                        "    _source: 'webhook',\n" +
                        "    _mode: 'process',\n" +
                        "    dry_run: dryRun,\n" +
                        "    today: toDateString(today),\n" +
                        "    target_completion_date: toDateString(completionTarget),\n" +
                        "    target_dormant_date: toDateString(dormantTarget),\n" +
                        "    run_completion: only !== 'dormant',\n" +
                        "    run_dormant: only !== 'completion'\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-route-mode',
                'Route Mode',
                'n8n-nodes-base.switch',
                3.2,
                [700, 320],
                {
                    rules: {
                        values: [
                            {
                                conditions: {
                                    options: {
                                        version: 2,
                                        caseSensitive: true,
                                        typeValidation: 'loose'
                                    },
                                    combinator: 'and',
                                    conditions: [
                                        {
                                            leftValue: '={{ $json._mode }}',
                                            rightValue: 'unauthorized',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'unauthorized'
                            },
                            {
                                conditions: {
                                    options: {
                                        version: 2,
                                        caseSensitive: true,
                                        typeValidation: 'loose'
                                    },
                                    combinator: 'and',
                                    conditions: [
                                        {
                                            leftValue: '={{ $json._mode }}',
                                            rightValue: 'process',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'process'
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-build-unauthorized',
                'Build Unauthorized Response',
                'n8n-nodes-base.code',
                2,
                [940, 140],
                {
                    jsCode:
                        "return [{\n" +
                        "  json: {\n" +
                        "    success: false,\n" +
                        "    error: {\n" +
                        "      code: 'UNAUTHORIZED',\n" +
                        "      message: '관리자 인증이 필요합니다.'\n" +
                        "    },\n" +
                        "    timestamp: new Date().toISOString()\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-respond-unauthorized',
                'Respond Unauthorized',
                'n8n-nodes-base.respondToWebhook',
                1.1,
                [1160, 140],
                {
                    respondWith: 'json',
                    responseBody: '={{ $json }}',
                    options: {
                        responseCode: 401,
                        responseHeaders: {
                            entries: [
                                { name: 'Content-Type', value: 'application/json; charset=utf-8' }
                            ]
                        }
                    }
                }
            ),
            node(
                'wfret-get-completion',
                'NocoDB Get Completion Targets',
                'n8n-nodes-base.httpRequest',
                4.2,
                [940, 260],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mcoddguv4d3s3ne',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'where', value: '={{ $(\"Parse Trigger & Auth\").first().json.run_completion ? \"(status,eq,COMPLETED)\" : \"(status,eq,___SKIP___)\" }}' },
                            { name: 'sort', value: '-class_date' },
                            { name: 'limit', value: '500' }
                        ]
                    },
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfret-get-dormant',
                'NocoDB Get Dormant Candidates',
                'n8n-nodes-base.httpRequest',
                4.2,
                [940, 420],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mcoddguv4d3s3ne',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'where', value: '={{ $(\"Parse Trigger & Auth\").first().json.run_dormant ? \"(status,eq,COMPLETED)\" : \"(status,eq,___SKIP___)\" }}' },
                            { name: 'sort', value: '-class_date' },
                            { name: 'limit', value: '500' }
                        ]
                    },
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfret-get-recent',
                'NocoDB Get Recent Activity',
                'n8n-nodes-base.httpRequest',
                4.2,
                [940, 580],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mcoddguv4d3s3ne',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'where', value: '={{ $(\"Parse Trigger & Auth\").first().json.run_dormant ? \"(status,eq,COMPLETED)\" : \"(status,eq,___SKIP___)\" }}' },
                            { name: 'sort', value: '-class_date' },
                            { name: 'limit', value: '500' }
                        ]
                    },
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfret-get-classes',
                'NocoDB Get Classes',
                'n8n-nodes-base.httpRequest',
                4.2,
                [940, 740],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mpvsno4or6asbxk',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'where', value: '(status,eq,ACTIVE)' },
                            { name: 'limit', value: '300' }
                        ]
                    },
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfret-build-plan',
                'Build Retention Plan',
                'n8n-nodes-base.code',
                2,
                [1180, 500],
                {
                    jsCode:
                        "const meta = $('Parse Trigger & Auth').first().json;\n" +
                        "const completionRows = $('NocoDB Get Completion Targets').first().json.list || [];\n" +
                        "const dormantRows = $('NocoDB Get Dormant Candidates').first().json.list || [];\n" +
                        "const recentRows = $('NocoDB Get Recent Activity').first().json.list || [];\n" +
                        "const classRows = $('NocoDB Get Classes').first().json.list || [];\n" +
                        "\n" +
                        "function escapeHtml(str) {\n" +
                        "  if (!str) return '';\n" +
                        "  return String(str)\n" +
                        "    .replace(/&/g, '&amp;')\n" +
                        "    .replace(/</g, '&lt;')\n" +
                        "    .replace(/>/g, '&gt;')\n" +
                        "    .replace(/\\\"/g, '&quot;')\n" +
                        "    .replace(/'/g, '&#39;');\n" +
                        "}\n" +
                        "\n" +
                        "function memberKey(row) {\n" +
                        "  return String(row.member_id || row.student_member_id || row.student_email || '').trim();\n" +
                        "}\n" +
                        "\n" +
                        "function appendFlag(text, flag) {\n" +
                        "  const current = String(text || '').trim();\n" +
                        "  if (!current) return flag;\n" +
                        "  if (current.indexOf(flag) !== -1) return current;\n" +
                        "  return current + ',' + flag;\n" +
                        "}\n" +
                        "\n" +
                        "function validEmail(email) {\n" +
                        "  return String(email || '').indexOf('@') !== -1;\n" +
                        "}\n" +
                        "\n" +
                        "function getDateOnly(value) {\n" +
                        "  return String(value || '').substring(0, 10);\n" +
                        "}\n" +
                        "\n" +
                        "function classMap(rows) {\n" +
                        "  const map = {};\n" +
                        "  rows.forEach(function(row) {\n" +
                        "    if (row.class_id) {\n" +
                        "      map[row.class_id] = row;\n" +
                        "    }\n" +
                        "  });\n" +
                        "  return map;\n" +
                        "}\n" +
                        "\n" +
                        "function buildWrap(title, content) {\n" +
                        "  return '<!DOCTYPE html><html lang=\"ko\"><head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>' + title + '</title></head>'\n" +
                        "    + '<body style=\"margin:0;padding:0;background:#f8f6f0;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;\">'\n" +
                        "    + '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f8f6f0;\"><tr><td align=\"center\" style=\"padding:24px 16px;\">'\n" +
                        "    + '<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);\">'\n" +
                        "    + '<tr><td style=\"padding:24px 32px;text-align:center;border-bottom:2px solid #b89b5e;\">'\n" +
                        "    + '<span style=\"font-size:22px;font-weight:700;color:#b89b5e;letter-spacing:2px;\">PRESSCO21</span><br />'\n" +
                        "    + '<span style=\"font-size:11px;color:#999999;letter-spacing:1px;\">Forever and ever and Blooming</span>'\n" +
                        "    + '</td></tr>'\n" +
                        "    + content\n" +
                        "    + '<tr><td style=\"padding:24px 32px;text-align:center;background:#faf8f3;border-top:1px solid #e8e4db;\">'\n" +
                        "    + '<p style=\"margin:0 0 8px;font-size:12px;color:#999999;\">PRESSCO21 | foreverlove.co.kr</p>'\n" +
                        "    + '<p style=\"margin:0;font-size:11px;color:#bbbbbb;\">이 메일은 PRESSCO21 클래스 운영 안내 메일입니다.</p>'\n" +
                        "    + '</td></tr></table></td></tr></table></body></html>';\n" +
                        "}\n" +
                        "\n" +
                        "function buildCompletionHtml(target) {\n" +
                        "  const studentName = escapeHtml(target.student_name || '고객');\n" +
                        "  const className = escapeHtml(target.class_name || '클래스');\n" +
                        "  const classDate = escapeHtml(String(target.class_date || '').substring(0, 10));\n" +
                        "  const detailUrl = 'https://foreverlove.co.kr/shop/page.html?id=2607&class_id=' + encodeURIComponent(target.class_id || '');\n" +
                        "  const myPageUrl = 'https://foreverlove.co.kr/shop/page.html?id=2609';\n" +
                        "  return buildWrap('PRESSCO21 수강 완료', ''\n" +
                        "    + '<tr><td style=\"padding:36px 32px 32px;\">'\n" +
                        "    + '<p style=\"margin:0 0 18px;font-size:15px;color:#333333;line-height:1.7;\"><strong style=\"color:#b89b5e;\">' + studentName + '</strong>님, 수강을 마치셨습니다.</p>'\n" +
                        "    + '<p style=\"margin:0 0 8px;font-size:15px;color:#333333;line-height:1.7;\"><strong>' + className + '</strong> 수업이 완료되었습니다.</p>'\n" +
                        "    + '<p style=\"margin:0 0 24px;font-size:14px;color:#555555;line-height:1.7;\">' + classDate + ' 수업을 기준으로 후기 작성, 같은 강사의 다음 클래스 탐색, 재료 다시 보기를 이어갈 수 있도록 준비했습니다.</p>'\n" +
                        "    + '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#faf8f3;border:1px solid #e8e4db;border-radius:8px;margin-bottom:24px;\">'\n" +
                        "    + '<tr><td style=\"padding:20px 24px;\">'\n" +
                        "    + '<p style=\"margin:0 0 8px;font-size:14px;font-weight:700;color:#b89b5e;\">지금 이어서 할 수 있는 일</p>'\n" +
                        "    + '<p style=\"margin:0;font-size:13px;color:#666666;line-height:1.8;\">1. 후기 남기기  2. 재료 다시 보기  3. 다음 수업 비교하기</p>'\n" +
                        "    + '</td></tr></table>'\n" +
                        "    + '<div style=\"text-align:center;margin-bottom:12px;\"><a href=\"' + detailUrl + '\" style=\"display:inline-block;background:#b89b5e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:6px;\">후기와 상세 보기</a></div>'\n" +
                        "    + '<div style=\"text-align:center;\"><a href=\"' + myPageUrl + '\" style=\"display:inline-block;color:#7d9675;text-decoration:none;font-size:14px;font-weight:700;\">내 수강 내역에서 이어보기</a></div>'\n" +
                        "    + '</td></tr>');\n" +
                        "}\n" +
                        "\n" +
                        "function buildDormantHtml(target) {\n" +
                        "  const studentName = escapeHtml(target.student_name || '고객');\n" +
                        "  const className = escapeHtml(target.class_name || '클래스');\n" +
                        "  const listUrl = 'https://foreverlove.co.kr/shop/page.html?id=2606';\n" +
                        "  const myPageUrl = 'https://foreverlove.co.kr/shop/page.html?id=2609';\n" +
                        "  return buildWrap('PRESSCO21 다시 보고 싶어요', ''\n" +
                        "    + '<tr><td style=\"padding:36px 32px 32px;\">'\n" +
                        "    + '<p style=\"margin:0 0 18px;font-size:15px;color:#333333;line-height:1.7;\"><strong style=\"color:#b89b5e;\">' + studentName + '</strong>님, 다시 보고 싶어요.</p>'\n" +
                        "    + '<p style=\"margin:0 0 8px;font-size:15px;color:#333333;line-height:1.7;\">최근 참여하신 <strong>' + className + '</strong> 이후로 새로운 수업 소식이 준비되어 있습니다.</p>'\n" +
                        "    + '<p style=\"margin:0 0 24px;font-size:14px;color:#555555;line-height:1.7;\">전국 오프라인 클래스와 온라인 강의 중에서 지역과 카테고리를 골라 다시 탐색해보세요.</p>'\n" +
                        "    + '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f7fbf5;border:1px solid #dfe9dc;border-radius:8px;margin-bottom:24px;\">'\n" +
                        "    + '<tr><td style=\"padding:20px 24px;\">'\n" +
                        "    + '<p style=\"margin:0 0 8px;font-size:14px;font-weight:700;color:#52794f;\">다시 시작하기 좋은 방법</p>'\n" +
                        "    + '<p style=\"margin:0;font-size:13px;color:#666666;line-height:1.8;\">지역 필터로 가까운 수업을 찾거나, 입문 난이도 클래스로 다시 흐름을 이어보세요.</p>'\n" +
                        "    + '</td></tr></table>'\n" +
                        "    + '<div style=\"text-align:center;margin-bottom:12px;\"><a href=\"' + listUrl + '\" style=\"display:inline-block;background:#7d9675;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:6px;\">다시 클래스 탐색하기</a></div>'\n" +
                        "    + '<div style=\"text-align:center;\"><a href=\"' + myPageUrl + '\" style=\"display:inline-block;color:#b89b5e;text-decoration:none;font-size:14px;font-weight:700;\">내 수강 내역 보기</a></div>'\n" +
                        "    + '</td></tr>');\n" +
                        "}\n" +
                        "\n" +
                        "const classes = classMap(classRows);\n" +
                        "const completionTargets = [];\n" +
                        "const dormantTargets = [];\n" +
                        "let completionRawCount = 0;\n" +
                        "let dormantRawCount = 0;\n" +
                        "let completionSkippedMissingEmail = 0;\n" +
                        "let dormantSkippedMissingEmail = 0;\n" +
                        "const recentMembers = {};\n" +
                        "const dormantSeen = {};\n" +
                        "\n" +
                        "recentRows.forEach(function(row) {\n" +
                        "  const rowDate = getDateOnly(row.class_date);\n" +
                        "  const key = memberKey(row);\n" +
                        "  if (meta.run_dormant && key && rowDate > meta.target_dormant_date) recentMembers[key] = true;\n" +
                        "});\n" +
                        "\n" +
                        "completionRows.forEach(function(row) {\n" +
                        "  const rowDate = getDateOnly(row.class_date);\n" +
                        "  const email = String(row.student_email || '').trim();\n" +
                        "  const classInfo = classes[row.class_id] || {};\n" +
                        "  const emailSent = String(row.student_email_sent || '');\n" +
                        "  if (!meta.run_completion || rowDate !== meta.target_completion_date) return;\n" +
                        "  completionRawCount += 1;\n" +
                        "  if (!validEmail(email)) {\n" +
                        "    completionSkippedMissingEmail += 1;\n" +
                        "    return;\n" +
                        "  }\n" +
                        "  if (emailSent.indexOf('COMPLETE_SENT') !== -1) return;\n" +
                        "  completionTargets.push({\n" +
                        "    record_id: row.Id || row.id || '',\n" +
                        "    settlement_id: row.settlement_id || '',\n" +
                        "    member_id: memberKey(row),\n" +
                        "    student_name: row.student_name || '고객',\n" +
                        "    student_email: email,\n" +
                        "    class_id: row.class_id || '',\n" +
                        "    class_name: row.class_name || classInfo.class_name || '클래스',\n" +
                        "    class_date: row.class_date || '',\n" +
                        "    current_email_sent: emailSent,\n" +
                        "    new_email_sent: appendFlag(emailSent, 'COMPLETE_SENT'),\n" +
                        "    subject: '[PRESSCO21] 수강 완료 축하드려요. 다음 흐름을 이어가세요',\n" +
                        "    html: ''\n" +
                        "  });\n" +
                        "});\n" +
                        "\n" +
                        "dormantRows.forEach(function(row) {\n" +
                        "  const rowDate = getDateOnly(row.class_date);\n" +
                        "  const email = String(row.student_email || '').trim();\n" +
                        "  const key = memberKey(row);\n" +
                        "  const classInfo = classes[row.class_id] || {};\n" +
                        "  const emailSent = String(row.student_email_sent || '');\n" +
                        "  if (!meta.run_dormant || rowDate !== meta.target_dormant_date) return;\n" +
                        "  dormantRawCount += 1;\n" +
                        "  if (!key || dormantSeen[key] || recentMembers[key]) return;\n" +
                        "  if (!validEmail(email)) {\n" +
                        "    dormantSkippedMissingEmail += 1;\n" +
                        "    return;\n" +
                        "  }\n" +
                        "  if (emailSent.indexOf('DORMANT_30_SENT') !== -1) return;\n" +
                        "  dormantSeen[key] = true;\n" +
                        "  dormantTargets.push({\n" +
                        "    record_id: row.Id || row.id || '',\n" +
                        "    settlement_id: row.settlement_id || '',\n" +
                        "    member_id: key,\n" +
                        "    student_name: row.student_name || '고객',\n" +
                        "    student_email: email,\n" +
                        "    class_id: row.class_id || '',\n" +
                        "    class_name: row.class_name || classInfo.class_name || '클래스',\n" +
                        "    class_date: row.class_date || '',\n" +
                        "    current_email_sent: emailSent,\n" +
                        "    new_email_sent: appendFlag(emailSent, 'DORMANT_30_SENT'),\n" +
                        "    subject: '[PRESSCO21] 다시 보고 싶어요. 다음 클래스를 골라보세요',\n" +
                        "    html: ''\n" +
                        "  });\n" +
                        "});\n" +
                        "\n" +
                        "completionTargets.forEach(function(target) { target.html = buildCompletionHtml(target); });\n" +
                        "dormantTargets.forEach(function(target) { target.html = buildDormantHtml(target); });\n" +
                        "\n" +
                        "return [{\n" +
                        "  json: {\n" +
                        "    ...meta,\n" +
                        "    completion_raw_count: completionRawCount,\n" +
                        "    completion_skipped_missing_email: completionSkippedMissingEmail,\n" +
                        "    completion_count: completionTargets.length,\n" +
                        "    dormant_raw_count: dormantRawCount,\n" +
                        "    dormant_skipped_missing_email: dormantSkippedMissingEmail,\n" +
                        "    dormant_count: dormantTargets.length,\n" +
                        "    completion_targets: completionTargets,\n" +
                        "    dormant_targets: dormantTargets,\n" +
                        "    preview: {\n" +
                        "      completion: completionTargets.slice(0, 5).map(function(item) {\n" +
                        "        return {\n" +
                        "          settlement_id: item.settlement_id,\n" +
                        "          student_email: item.student_email,\n" +
                        "          class_name: item.class_name,\n" +
                        "          class_date: item.class_date\n" +
                        "        };\n" +
                        "      }),\n" +
                        "      dormant: dormantTargets.slice(0, 5).map(function(item) {\n" +
                        "        return {\n" +
                        "          settlement_id: item.settlement_id,\n" +
                        "          student_email: item.student_email,\n" +
                        "          class_name: item.class_name,\n" +
                        "          class_date: item.class_date\n" +
                        "        };\n" +
                        "      })\n" +
                        "    },\n" +
                        "    timestamp: new Date().toISOString()\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-if-dry-run',
                'Route Dry Mode',
                'n8n-nodes-base.switch',
                3.2,
                [1420, 500],
                {
                    rules: {
                        values: [
                            {
                                conditions: {
                                    options: {
                                        version: 2,
                                        caseSensitive: true,
                                        typeValidation: 'loose'
                                    },
                                    combinator: 'and',
                                    conditions: [
                                        {
                                            leftValue: '={{ String($json.dry_run) }}',
                                            rightValue: 'true',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'dry_run'
                            },
                            {
                                conditions: {
                                    options: {
                                        version: 2,
                                        caseSensitive: true,
                                        typeValidation: 'loose'
                                    },
                                    combinator: 'and',
                                    conditions: [
                                        {
                                            leftValue: '={{ String($json.dry_run) }}',
                                            rightValue: 'false',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'live_run'
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-build-dry-response',
                'Build Dry Run Response',
                'n8n-nodes-base.code',
                2,
                [1660, 380],
                {
                    jsCode:
                        "const plan = $input.first().json;\n" +
                        "return [{\n" +
                        "  json: {\n" +
                        "    success: true,\n" +
                        "    data: {\n" +
                        "      source: plan._source,\n" +
                        "      dry_run: true,\n" +
                        "      today: plan.today,\n" +
                        "      target_completion_date: plan.target_completion_date,\n" +
                        "      target_dormant_date: plan.target_dormant_date,\n" +
                        "      completion_count: plan.completion_count,\n" +
                        "      completion_raw_count: plan.completion_raw_count,\n" +
                        "      completion_skipped_missing_email: plan.completion_skipped_missing_email,\n" +
                        "      dormant_count: plan.dormant_count,\n" +
                        "      dormant_raw_count: plan.dormant_raw_count,\n" +
                        "      dormant_skipped_missing_email: plan.dormant_skipped_missing_email,\n" +
                        "      preview: plan.preview\n" +
                        "    },\n" +
                        "    timestamp: new Date().toISOString()\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-respond-dry-run',
                'Respond Dry Run',
                'n8n-nodes-base.respondToWebhook',
                1.1,
                [1880, 380],
                {
                    respondWith: 'json',
                    responseBody: '={{ $json }}',
                    options: {
                        responseHeaders: {
                            entries: [
                                { name: 'Content-Type', value: 'application/json; charset=utf-8' }
                            ]
                        }
                    }
                }
            ),
            node(
                'wfret-if-webhook-live',
                'IF Webhook Live',
                'n8n-nodes-base.if',
                2,
                [1660, 560],
                {
                    conditions: {
                        options: {
                            caseSensitive: true
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json._source }}',
                                rightValue: 'webhook',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-build-live-response',
                'Build Live Response',
                'n8n-nodes-base.code',
                2,
                [1880, 520],
                {
                    jsCode:
                        "const plan = $input.first().json;\n" +
                        "return [{\n" +
                        "  json: {\n" +
                        "    success: true,\n" +
                        "    data: {\n" +
                        "      accepted: true,\n" +
                        "      completion_count: plan.completion_count,\n" +
                        "      completion_raw_count: plan.completion_raw_count,\n" +
                        "      dormant_count: plan.dormant_count,\n" +
                        "      dormant_raw_count: plan.dormant_raw_count,\n" +
                        "      today: plan.today\n" +
                        "    },\n" +
                        "    timestamp: new Date().toISOString()\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-respond-live',
                'Respond Live Accepted',
                'n8n-nodes-base.respondToWebhook',
                1.1,
                [2100, 520],
                {
                    respondWith: 'json',
                    responseBody: '={{ $json }}',
                    options: {
                        responseCode: 202,
                        responseHeaders: {
                            entries: [
                                { name: 'Content-Type', value: 'application/json; charset=utf-8' }
                            ]
                        }
                    }
                }
            ),
            node(
                'wfret-build-summary',
                'Build Summary Message',
                'n8n-nodes-base.code',
                2,
                [1660, 700],
                {
                    jsCode:
                        "const plan = $input.first().json;\n" +
                        "const dry = plan.dry_run ? 'DRY-RUN ' : '';\n" +
                        "return [{\n" +
                        "  json: {\n" +
                        "    _telegramMessage: '*학생 리텐션 ' + dry + '실행*\\n\\n'\n" +
                        "      + '기준일: ' + plan.today + '\\n'\n" +
                        "      + '수강 완료 축하 대상: ' + plan.completion_count + '건 (후보 ' + plan.completion_raw_count + ', 이메일 누락 ' + plan.completion_skipped_missing_email + ')\\n'\n" +
                        "      + '30일 휴면 대상: ' + plan.dormant_count + '건 (후보 ' + plan.dormant_raw_count + ', 이메일 누락 ' + plan.dormant_skipped_missing_email + ')\\n'\n" +
                        "      + '완료 기준일: ' + plan.target_completion_date + '\\n'\n" +
                        "      + '휴면 기준일: ' + plan.target_dormant_date\n" +
                        "  }\n" +
                        "}];"
                }
            ),
            node(
                'wfret-telegram-summary',
                'Telegram Summary',
                'n8n-nodes-base.telegram',
                1.2,
                [1880, 700],
                {
                    operation: 'sendMessage',
                    chatId: '={{ $env.TELEGRAM_CHAT_ID }}',
                    text: '={{ $json._telegramMessage }}',
                    additionalFields: {
                        parse_mode: 'Markdown'
                    }
                },
                {
                    credentials: {
                        telegramApi: {
                            id: 'eS5YwFGpbJht6uCB',
                            name: 'PRESSCO21 Telegram Bot'
                        }
                    },
                    onError: 'continueRegularOutput'
                }
            ),
            node(
                'wfret-if-completion',
                'IF Has Completion Targets',
                'n8n-nodes-base.if',
                2,
                [1660, 860],
                {
                    conditions: {
                        options: {
                            caseSensitive: true
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.completion_count }}',
                                rightValue: 0,
                                operator: {
                                    type: 'number',
                                    operation: 'larger'
                                }
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-emit-completion',
                'Emit Completion Targets',
                'n8n-nodes-base.code',
                2,
                [1880, 820],
                {
                    jsCode:
                        "const plan = $input.first().json;\n" +
                        "return (plan.completion_targets || []).map(function(item) {\n" +
                        "  return { json: item };\n" +
                        "});"
                }
            ),
            node(
                'wfret-send-completion',
                'Send Completion Email',
                'n8n-nodes-base.emailSend',
                2.1,
                [2100, 820],
                {
                    fromEmail: 'pressco21@foreverlove.co.kr',
                    toEmail: '={{ $json.student_email }}',
                    subject: '={{ $json.subject }}',
                    emailType: 'html',
                    html: '={{ $json.html }}',
                    options: {}
                },
                {
                    credentials: {
                        smtp: {
                            id: '31jTm9BU7iyj0pVx',
                            name: 'PRESSCO21 SMTP'
                        }
                    }
                }
            ),
            node(
                'wfret-update-completion',
                'Update Completion Flag',
                'n8n-nodes-base.httpRequest',
                4.2,
                [2320, 820],
                {
                    method: 'PATCH',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mcoddguv4d3s3ne/{{ $json.record_id }}',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendBody: true,
                    specifyBody: 'json',
                    jsonBody: '={{ JSON.stringify({ student_email_sent: $json.new_email_sent }) }}',
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfret-if-dormant',
                'IF Has Dormant Targets',
                'n8n-nodes-base.if',
                2,
                [1660, 1040],
                {
                    conditions: {
                        options: {
                            caseSensitive: true
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.dormant_count }}',
                                rightValue: 0,
                                operator: {
                                    type: 'number',
                                    operation: 'larger'
                                }
                            }
                        ]
                    }
                }
            ),
            node(
                'wfret-emit-dormant',
                'Emit Dormant Targets',
                'n8n-nodes-base.code',
                2,
                [1880, 1000],
                {
                    jsCode:
                        "const plan = $input.first().json;\n" +
                        "return (plan.dormant_targets || []).map(function(item) {\n" +
                        "  return { json: item };\n" +
                        "});"
                }
            ),
            node(
                'wfret-send-dormant',
                'Send Dormant Email',
                'n8n-nodes-base.emailSend',
                2.1,
                [2100, 1000],
                {
                    fromEmail: 'pressco21@foreverlove.co.kr',
                    toEmail: '={{ $json.student_email }}',
                    subject: '={{ $json.subject }}',
                    emailType: 'html',
                    html: '={{ $json.html }}',
                    options: {}
                },
                {
                    credentials: {
                        smtp: {
                            id: '31jTm9BU7iyj0pVx',
                            name: 'PRESSCO21 SMTP'
                        }
                    }
                }
            ),
            node(
                'wfret-update-dormant',
                'Update Dormant Flag',
                'n8n-nodes-base.httpRequest',
                4.2,
                [2320, 1000],
                {
                    method: 'PATCH',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mcoddguv4d3s3ne/{{ $json.record_id }}',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendBody: true,
                    specifyBody: 'json',
                    jsonBody: '={{ JSON.stringify({ student_email_sent: $json.new_email_sent }) }}',
                    options: {}
                },
                {
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            )
        ],
        connections: {
            'Schedule Daily 09:15': {
                main: [[{ node: 'Parse Trigger & Auth', type: 'main', index: 0 }]]
            },
            Webhook: {
                main: [[{ node: 'Parse Trigger & Auth', type: 'main', index: 0 }]]
            },
            'Parse Trigger & Auth': {
                main: [[{ node: 'Route Mode', type: 'main', index: 0 }]]
            },
            'Route Mode': {
                main: [
                    [{ node: 'Build Unauthorized Response', type: 'main', index: 0 }],
                    [{ node: 'NocoDB Get Completion Targets', type: 'main', index: 0 }]
                ]
            },
            'Build Unauthorized Response': {
                main: [[{ node: 'Respond Unauthorized', type: 'main', index: 0 }]]
            },
            'NocoDB Get Completion Targets': {
                main: [[{ node: 'NocoDB Get Dormant Candidates', type: 'main', index: 0 }]]
            },
            'NocoDB Get Dormant Candidates': {
                main: [[{ node: 'NocoDB Get Recent Activity', type: 'main', index: 0 }]]
            },
            'NocoDB Get Recent Activity': {
                main: [[{ node: 'NocoDB Get Classes', type: 'main', index: 0 }]]
            },
            'NocoDB Get Classes': {
                main: [[{ node: 'Build Retention Plan', type: 'main', index: 0 }]]
            },
            'Build Retention Plan': {
                main: [[{ node: 'Route Dry Mode', type: 'main', index: 0 }]]
            },
            'Route Dry Mode': {
                main: [
                    [{ node: 'Build Dry Run Response', type: 'main', index: 0 }],
                    [
                        { node: 'IF Webhook Live', type: 'main', index: 0 },
                        { node: 'Build Summary Message', type: 'main', index: 0 },
                        { node: 'IF Has Completion Targets', type: 'main', index: 0 },
                        { node: 'IF Has Dormant Targets', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Dry Run Response': {
                main: [[{ node: 'Respond Dry Run', type: 'main', index: 0 }]]
            },
            'IF Webhook Live': {
                main: [[], [{ node: 'Build Live Response', type: 'main', index: 0 }]]
            },
            'Build Live Response': {
                main: [[{ node: 'Respond Live Accepted', type: 'main', index: 0 }]]
            },
            'Build Summary Message': {
                main: [[{ node: 'Telegram Summary', type: 'main', index: 0 }]]
            },
            'IF Has Completion Targets': {
                main: [[], [{ node: 'Emit Completion Targets', type: 'main', index: 0 }]]
            },
            'Emit Completion Targets': {
                main: [[{ node: 'Send Completion Email', type: 'main', index: 0 }]]
            },
            'Send Completion Email': {
                main: [[{ node: 'Update Completion Flag', type: 'main', index: 0 }]]
            },
            'IF Has Dormant Targets': {
                main: [[], [{ node: 'Emit Dormant Targets', type: 'main', index: 0 }]]
            },
            'Emit Dormant Targets': {
                main: [[{ node: 'Send Dormant Email', type: 'main', index: 0 }]]
            },
            'Send Dormant Email': {
                main: [[{ node: 'Update Dormant Flag', type: 'main', index: 0 }]]
            }
        },
        settings: {
            executionOrder: 'v1'
        }
    };

    if (existingId) {
        workflow.id = existingId;
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
    console.log('generated', path.relative(REPO_ROOT, OUTPUT_PATH));
}

main();
