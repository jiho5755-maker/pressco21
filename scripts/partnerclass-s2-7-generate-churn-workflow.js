#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-CHURN-partner-risk-monitor.json');

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

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function joinLines(lines) {
    return lines.join('\n');
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
        id: existingId || undefined,
        name: 'WF-CHURN Partner Risk Monitor',
        settings: {
            executionOrder: 'v1'
        },
        nodes: [
            node(
                'wfch-schedule',
                'Schedule Weekly Mon 10:05',
                'n8n-nodes-base.scheduleTrigger',
                1.2,
                [220, 220],
                {
                    rule: {
                        interval: [
                            {
                                field: 'cronExpression',
                                expression: '5 10 * * 1'
                            }
                        ]
                    }
                }
            ),
            node(
                'wfch-webhook',
                'Webhook',
                'n8n-nodes-base.webhook',
                2,
                [220, 420],
                {
                    httpMethod: 'POST',
                    path: 'partner-churn-scan',
                    responseMode: 'responseNode',
                    options: {}
                },
                {
                    webhookId: 'partner-churn-scan'
                }
            ),
            node(
                'wfch-parse',
                'Parse Trigger & Auth',
                'n8n-nodes-base.code',
                2,
                [460, 320],
                {
                    jsCode: joinLines([
                        'const input = $input.first().json || {};',
                        'const headers = input.headers || {};',
                        "const hasWebhookBody = !!input.body || Object.keys(headers).length > 0;",
                        '',
                        'function pad(n) {',
                        "  return String(n).padStart(2, '0');",
                        '}',
                        '',
                        'function toDateString(date) {',
                        "  return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());",
                        '}',
                        '',
                        'function getKstNowDate() {',
                        '  const now = new Date();',
                        '  return new Date(now.getTime() + 9 * 60 * 60 * 1000);',
                        '}',
                        '',
                        'function parseDate(value, fallback) {',
                        "  const text = String(value || '').trim();",
                        '  let parts;',
                        "  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return fallback;",
                        "  parts = text.split('-');",
                        '  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));',
                        '}',
                        '',
                        'function normalizeCodes(value) {',
                        '  if (Array.isArray(value)) {',
                        "    return value.map((item) => String(item || '').trim()).filter(Boolean);",
                        '  }',
                        "  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);",
                        '}',
                        '',
                        'if (!hasWebhookBody) {',
                        '  const today = getKstNowDate();',
                        '  return [{',
                        '    json: {',
                        "      _source: 'schedule',",
                        "      _mode: 'process',",
                        '      dry_run: false,',
                        '      today: toDateString(today),',
                        '      include_partner_codes: []',
                        '    }',
                        '  }];',
                        '}',
                        '',
                        'const body = input.body || {};',
                        "const authHeader = headers.authorization || headers.Authorization || '';",
                        "const token = typeof authHeader === 'string' && authHeader.indexOf('Bearer ') === 0 ? authHeader.substring(7).trim() : '';",
                        "const expectedToken = $env.ADMIN_API_TOKEN || '';",
                        'if (!token || !expectedToken || token !== expectedToken) {',
                        "  return [{ json: { _source: 'webhook', _mode: 'unauthorized' } }];",
                        '}',
                        '',
                        'const today = parseDate(body.today, getKstNowDate());',
                        "const dryRun = body.dry_run === true || String(body.dry_run || '').toLowerCase() === 'true' || String(body.mode || '').toLowerCase() === 'dry_run';",
                        '',
                        'return [{',
                        '  json: {',
                        "    _source: 'webhook',",
                        "    _mode: 'process',",
                        '    dry_run: dryRun,',
                        '    today: toDateString(today),',
                        '    include_partner_codes: normalizeCodes(body.include_partner_codes || body.partner_codes || body.partner_code || \'\')',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-route-mode',
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
                'wfch-unauthorized',
                'Build Unauthorized Response',
                'n8n-nodes-base.code',
                2,
                [940, 140],
                {
                    jsCode: joinLines([
                        'return [{',
                        '  json: {',
                        '    success: false,',
                        '    error: {',
                        "      code: 'UNAUTHORIZED',",
                        "      message: '관리자 인증이 필요합니다.'",
                        '    },',
                        '    timestamp: new Date().toISOString()',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-get-partners',
                'Get Partners',
                'n8n-nodes-base.httpRequest',
                4.2,
                [980, 260],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mp8t0yq15cabmj4',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'limit', value: '500' },
                            { name: 'sort', value: 'partner_code' },
                            { name: 'fields', value: 'Id,CreatedAt,UpdatedAt,partner_code,member_id,partner_name,email,status,grade,class_count,avg_rating,last_active_at' }
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
                'wfch-get-classes',
                'Get Classes',
                'n8n-nodes-base.httpRequest',
                4.2,
                [980, 380],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mpvsno4or6asbxk',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'limit', value: '1000' },
                            { name: 'fields', value: 'Id,class_id,partner_code,status,CreatedAt,UpdatedAt' }
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
                'wfch-get-schedules',
                'Get Schedules',
                'n8n-nodes-base.httpRequest',
                4.2,
                [980, 500],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mschd3d81ad88fb',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'limit', value: '1000' },
                            { name: 'fields', value: 'Id,class_id,status,schedule_date,CreatedAt,UpdatedAt' }
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
                'wfch-get-reviews',
                'Get Reviews',
                'n8n-nodes-base.httpRequest',
                4.2,
                [980, 620],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mbikgjzc8zvicrm',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'limit', value: '1000' },
                            { name: 'fields', value: 'Id,review_id,class_id,partner_code,partner_answer,created_at,CreatedAt,UpdatedAt' }
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
                'wfch-get-email-logs',
                'Get Email Logs',
                'n8n-nodes-base.httpRequest',
                4.2,
                [980, 740],
                {
                    method: 'GET',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mfsc5xg3ospeonz',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendQuery: true,
                    queryParameters: {
                        parameters: [
                            { name: 'limit', value: '1000' },
                            { name: 'sort', value: '-CreatedAt' },
                            { name: 'fields', value: 'Id,recipient,email_type,status,error_message,CreatedAt,UpdatedAt' }
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
                'wfch-build-plan',
                'Build Risk Plan',
                'n8n-nodes-base.code',
                2,
                [1240, 500],
                {
                    jsCode: joinLines([
                        "const params = $('Parse Trigger & Auth').first().json;",
                        "const partners = $('Get Partners').first().json.list || [];",
                        "const classes = $('Get Classes').first().json.list || [];",
                        "const schedules = $('Get Schedules').first().json.list || [];",
                        "const reviews = $('Get Reviews').first().json.list || [];",
                        "const logs = $('Get Email Logs').first().json.list || [];",
                        '',
                        'function parseDateValue(value) {',
                        "  const text = String(value || '').trim();",
                        '  if (!text) return null;',
                        "  const normalized = text.indexOf('T') === -1 && text.indexOf(' ') > -1 ? text.replace(' ', 'T') : text;",
                        '  const date = new Date(normalized);',
                        '  if (isNaN(date.getTime())) return null;',
                        '  return date;',
                        '}',
                        '',
                        'function parseYmd(value) {',
                        "  const text = String(value || '').trim();",
                        '  let parts;',
                        "  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return null;",
                        "  parts = text.split('-');",
                        '  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));',
                        '}',
                        '',
                        'function isoDate(value) {',
                        '  const date = parseDateValue(value);',
                        '  return date ? date.toISOString() : "";',
                        '}',
                        '',
                        'function validEmail(value) {',
                        "  return String(value || '').indexOf('@') > -1;",
                        '}',
                        '',
                        'function latestIso(a, b) {',
                        '  if (!a) return b || "";',
                        '  if (!b) return a || "";',
                        '  return parseDateValue(a) > parseDateValue(b) ? a : b;',
                        '}',
                        '',
                        'function diffDays(todayDate, value) {',
                        '  const other = parseDateValue(value);',
                        '  if (!other) return 9999;',
                        '  const utcToday = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());',
                        '  const utcOther = Date.UTC(other.getUTCFullYear(), other.getUTCMonth(), other.getUTCDate());',
                        '  return Math.floor((utcToday - utcOther) / (24 * 60 * 60 * 1000));',
                        '}',
                        '',
                        'const includeCodes = Array.isArray(params.include_partner_codes) ? params.include_partner_codes : [];',
                        'const todayDate = parseYmd(params.today);',
                        '',
                        'if (!todayDate) {',
                        '  return [{',
                        '    json: {',
                        "      _next: 'dry_run',",
                        '      success: false,',
                        '      error: { code: "INVALID_DATE", message: "today 파라미터가 올바르지 않습니다." },',
                        '      timestamp: new Date().toISOString()',
                        '    }',
                        '  }];',
                        '}',
                        '',
                        'const classToPartner = {};',
                        'const lastClassActivityByPartner = {};',
                        'for (const row of classes) {',
                        "  const partnerCode = String(row.partner_code || '').trim();",
                        "  const classId = String(row.class_id || '').trim();",
                        '  const latest = latestIso(isoDate(row.UpdatedAt), isoDate(row.CreatedAt));',
                        '  if (classId) classToPartner[classId] = partnerCode;',
                        '  if (partnerCode && latest) {',
                        '    lastClassActivityByPartner[partnerCode] = latestIso(lastClassActivityByPartner[partnerCode], latest);',
                        '  }',
                        '}',
                        '',
                        'for (const row of schedules) {',
                        "  const classId = String(row.class_id || '').trim();",
                        '  const partnerCode = classToPartner[classId] || "";',
                        '  const latest = latestIso(isoDate(row.UpdatedAt), isoDate(row.CreatedAt));',
                        '  if (partnerCode && latest) {',
                        '    lastClassActivityByPartner[partnerCode] = latestIso(lastClassActivityByPartner[partnerCode], latest);',
                        '  }',
                        '}',
                        '',
                        'const unansweredByPartner = {};',
                        'for (const row of reviews) {',
                        "  let partnerCode = String(row.partner_code || '').trim();",
                        "  const classId = String(row.class_id || '').trim();",
                        "  const hasAnswer = String(row.partner_answer || '').trim().length > 0;",
                        '  if (!partnerCode && classId) partnerCode = classToPartner[classId] || "";',
                        '  if (!partnerCode || hasAnswer) continue;',
                        '  unansweredByPartner[partnerCode] = (unansweredByPartner[partnerCode] || 0) + 1;',
                        '}',
                        '',
                        'const lastAlertByTypePartner = {};',
                        'for (const row of logs) {',
                        "  const rawType = String(row.email_type || row.type || '').trim();",
                        "  const logStatus = String(row.status || '').trim().toUpperCase();",
                        "  const marker = String(row.error_message || '').trim();",
                        '  let partnerCode = "";',
                        "  let stage = '';",
                        '  const sentAt = row.CreatedAt || row.UpdatedAt || "";',
                        "  if (marker.indexOf('PARTNER_CHURN_30') > -1) stage = 'PARTNER_CHURN_30';",
                        "  else if (marker.indexOf('PARTNER_CHURN_60') > -1) stage = 'PARTNER_CHURN_60';",
                        "  else if (rawType === 'PARTNER_CHURN_30' || rawType === 'PARTNER_CHURN_60') stage = rawType;",
                        '  else continue;',
                        "  if (logStatus && logStatus !== 'SENT') continue;",
                        "  if (marker.indexOf('PC_') > -1) {",
                        "    partnerCode = marker.substring(marker.indexOf('PC_')).split(/[^A-Z0-9_]/)[0];",
                        '  }',
                        '  if (!partnerCode) continue;',
                        "  const key = stage + '::' + partnerCode;",
                        '  if (!lastAlertByTypePartner[key] || sentAt > lastAlertByTypePartner[key]) {',
                        '    lastAlertByTypePartner[key] = sentAt;',
                        '  }',
                        '}',
                        '',
                        'const candidates = [];',
                        'const sendTargets = [];',
                        'let activePartnerCount = 0;',
                        'let atRiskCount = 0;',
                        'let escalationCount = 0;',
                        'let skippedMissingEmail = 0;',
                        'let skippedRecentAlert = 0;',
                        '',
                        'for (const partner of partners) {',
                        "  const partnerCode = String(partner.partner_code || '').trim();",
                        "  const status = String(partner.status || '').trim().toUpperCase();",
                        "  const email = String(partner.email || '').trim();",
                        "  const partnerName = String(partner.partner_name || partnerCode || '').trim();",
                        '  let lastActiveAt;',
                        '  let lastClassActivityAt;',
                        '  let inactivityDays;',
                        '  let classStaleDays;',
                        '  let unansweredCount;',
                        '  let signalCount = 0;',
                        '  let reasons = [];',
                        "  let riskLevel = 'NONE';",
                        "  let alertType = '';",
                        '  let lastAlertAt = "";',
                        '  let alertId = "";',
                        '  let suppressedReason = "";',
                        '',
                        "  if (status !== 'ACTIVE' && status !== 'PAUSED') continue;",
                        '  if (includeCodes.length && includeCodes.indexOf(partnerCode) === -1) continue;',
                        '',
                        '  activePartnerCount += 1;',
                        '  lastActiveAt = partner.last_active_at || partner.UpdatedAt || partner.CreatedAt || "";',
                        '  lastClassActivityAt = lastClassActivityByPartner[partnerCode] || partner.UpdatedAt || partner.CreatedAt || "";',
                        '  inactivityDays = diffDays(todayDate, lastActiveAt);',
                        '  classStaleDays = diffDays(todayDate, lastClassActivityAt);',
                        '  unansweredCount = unansweredByPartner[partnerCode] || 0;',
                        '',
                        '  if (inactivityDays >= 30) {',
                        '    signalCount += 1;',
                        "    reasons.push('최근 ' + inactivityDays + '일 동안 파트너 페이지 활동이 없습니다.');",
                        '  }',
                        '  if (classStaleDays >= 60) {',
                        '    signalCount += 1;',
                        "    reasons.push('최근 ' + classStaleDays + '일 동안 수업 또는 일정 등록/수정이 없습니다.');",
                        '  }',
                        '  if (unansweredCount >= 5) {',
                        '    signalCount += 1;',
                        "    reasons.push('미답변 후기가 ' + unansweredCount + '건 쌓였습니다.');",
                        '  }',
                        '',
                        '  if (inactivityDays >= 60 || signalCount >= 3) {',
                        "    riskLevel = 'ESCALATE';",
                        "    alertType = 'PARTNER_CHURN_60';",
                        '  } else if ((inactivityDays >= 30 && classStaleDays >= 60) || signalCount >= 2) {',
                        "    riskLevel = 'AT_RISK';",
                        "    alertType = 'PARTNER_CHURN_30';",
                        '  } else {',
                        '    continue;',
                        '  }',
                        '',
                        "  lastAlertAt = lastAlertByTypePartner[alertType + '::' + partnerCode] || '';",
                        "  alertId = (alertType === 'PARTNER_CHURN_60' ? 'CHURN_60_' : 'CHURN_30_') + params.today.replace(/-/g, '') + '_' + partnerCode;",
                        '',
                        '  if (riskLevel === "ESCALATE") escalationCount += 1;',
                        '  else atRiskCount += 1;',
                        '',
                        '  const candidate = {',
                        '    partner_code: partnerCode,',
                        '    partner_name: partnerName,',
                        '    member_id: String(partner.member_id || ""),',
                        '    email: email,',
                        '    grade: String(partner.grade || ""),',
                        '    risk_level: riskLevel,',
                        '    alert_type: alertType,',
                        '    alert_id: alertId,',
                        '    inactivity_days: inactivityDays,',
                        '    class_stale_days: classStaleDays,',
                        '    unanswered_count: unansweredCount,',
                        '    reasons: reasons,',
                        '    last_active_at: lastActiveAt,',
                        '    last_class_activity_at: lastClassActivityAt,',
                        '    last_alert_at: lastAlertAt',
                        '  };',
                        '',
                        '  if (!validEmail(email)) {',
                        '    skippedMissingEmail += 1;',
                        "    candidate.suppressed_reason = 'MISSING_EMAIL';",
                        '  } else if (lastAlertAt && diffDays(todayDate, lastAlertAt) < 14) {',
                        '    skippedRecentAlert += 1;',
                        "    candidate.suppressed_reason = 'RECENT_ALERT';",
                        '  } else {',
                        '    sendTargets.push(candidate);',
                        '  }',
                        '',
                        '  candidates.push(candidate);',
                        '}',
                        '',
                        'let next = "no_targets";',
                        'if (params.dry_run) next = "dry_run";',
                        'else if (sendTargets.length > 0) next = "send";',
                        '',
                        'return [{',
                        '  json: {',
                        '    _next: next,',
                        '    _source: params._source,',
                        '    dry_run: params.dry_run === true,',
                        '    today: params.today,',
                        '    active_partner_count: activePartnerCount,',
                        '    risk_count: candidates.length,',
                        '    at_risk_count: atRiskCount,',
                        '    escalation_count: escalationCount,',
                        '    skipped_missing_email: skippedMissingEmail,',
                        '    skipped_recent_alert: skippedRecentAlert,',
                        '    send_target_count: sendTargets.length,',
                        '    send_targets: sendTargets,',
                        '    preview: candidates.slice(0, 10)',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-route-outcome',
                'Route Outcome',
                'n8n-nodes-base.switch',
                3.2,
                [1480, 500],
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
                                            leftValue: '={{ $json._next }}',
                                            rightValue: 'dry_run',
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
                                            leftValue: '={{ $json._next }}',
                                            rightValue: 'send',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'send'
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
                                            leftValue: '={{ $json._next }}',
                                            rightValue: 'no_targets',
                                            operator: {
                                                type: 'string',
                                                operation: 'equals'
                                            }
                                        }
                                    ]
                                },
                                renameOutput: true,
                                outputKey: 'no_targets'
                            }
                        ]
                    }
                }
            ),
            node(
                'wfch-dry-response',
                'Build Dry Run Response',
                'n8n-nodes-base.code',
                2,
                [1720, 300],
                {
                    jsCode: joinLines([
                        'const plan = $input.first().json;',
                        'return [{',
                        '  json: {',
                        '    success: true,',
                        '    data: {',
                        "      mode: 'dry_run',",
                        '      today: plan.today,',
                        '      active_partner_count: plan.active_partner_count,',
                        '      risk_count: plan.risk_count,',
                        '      at_risk_count: plan.at_risk_count,',
                        '      escalation_count: plan.escalation_count,',
                        '      skipped_missing_email: plan.skipped_missing_email,',
                        '      skipped_recent_alert: plan.skipped_recent_alert,',
                        '      send_target_count: plan.send_target_count,',
                        '      preview: plan.preview',
                        '    },',
                        '    timestamp: new Date().toISOString()',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-no-targets-response',
                'Build No Targets Response',
                'n8n-nodes-base.code',
                2,
                [1720, 700],
                {
                    jsCode: joinLines([
                        'const plan = $input.first().json;',
                        'return [{',
                        '  json: {',
                        '    success: true,',
                        '    data: {',
                        "      mode: 'process',",
                        '      today: plan.today,',
                        '      active_partner_count: plan.active_partner_count,',
                        '      risk_count: plan.risk_count,',
                        '      at_risk_count: plan.at_risk_count,',
                        '      escalation_count: plan.escalation_count,',
                        '      skipped_missing_email: plan.skipped_missing_email,',
                        '      skipped_recent_alert: plan.skipped_recent_alert,',
                        "      message: '발송할 이탈 위험 파트너가 없습니다.'",
                        '    },',
                        '    timestamp: new Date().toISOString()',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-build-email-items',
                'Build Partner Email Items',
                'n8n-nodes-base.code',
                2,
                [1720, 500],
                {
                    jsCode: joinLines([
                        'const plan = $input.first().json;',
                        "const dashboardUrl = 'https://foreverlove.co.kr/shop/page.html?id=2608';",
                        "const supportEmail = 'pressco21@foreverlove.co.kr';",
                        'const items = [];',
                        '',
                        'function escapeHtml(str) {',
                        '  if (!str) return "";',
                        '  return String(str)',
                        "    .replace(/&/g, '&amp;')",
                        "    .replace(/</g, '&lt;')",
                        "    .replace(/>/g, '&gt;')",
                        "    .replace(/\\\"/g, '&quot;')",
                        "    .replace(/'/g, '&#39;');",
                        '}',
                        '',
                        'function statRow(label, value) {',
                        '  return \'<tr><td style="padding:8px 0;font-size:13px;color:#999;">\' + label + \'</td><td style="padding:8px 0;font-size:14px;color:#333;text-align:right;">\' + value + \'</td></tr>\';',
                        '}',
                        '',
                        'for (const target of plan.send_targets || []) {',
                        '  const partnerName = escapeHtml(target.partner_name || target.partner_code);',
                        '  const levelLabel = target.risk_level === "ESCALATE" ? "운영 점검 필요" : "다시 흐름을 시작해보세요";',
                        '  const reasonHtml = (target.reasons || []).map((reason) => \'<li style="margin:0 0 6px;">\' + escapeHtml(reason) + \'</li>\').join("");',
                        '  const subject = target.risk_level === "ESCALATE"',
                        "    ? '[PRESSCO21] 파트너 운영 점검이 필요합니다' ",
                        "    : '[PRESSCO21] 최근 활동이 잠시 멈췄어요. 다시 수업을 이어가볼까요?' ;",
                        '  const intro = target.risk_level === "ESCALATE"',
                        "    ? '최근 파트너 활동이 길게 멈춰 있어 운영 점검이 필요한 상태로 감지되었습니다. PRESSCO21 팀이 다시 흐름을 잡을 수 있도록 바로 도와드리겠습니다.'",
                        "    : '최근 파트너 활동이 잠시 멈춘 것으로 보여 간단한 점검 메일을 드립니다. 대시보드에서 수업, 일정, 후기만 다시 확인해도 흐름이 빠르게 살아납니다.';",
                        '  const html = \'<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8" /></head><body style="margin:0;padding:0;background:#f7f5f1;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;">\'',
                        '    + \'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 0;background:#f7f5f1;"><tr><td align="center">\'',
                        '    + \'<table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">\'',
                        '    + \'<tr><td style="padding:28px 32px;background:#2f4234;color:#ffffff;">\'',
                        '    + \'<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;opacity:0.72;">PARTNER CARE</p>\'',
                        '    + \'<h1 style="margin:0;font-size:28px;">\' + levelLabel + \'</h1>\'',
                        '    + \'</td></tr>\'',
                        '    + \'<tr><td style="padding:28px 32px;">\'',
                        '    + \'<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#333;">\' + partnerName + \' 파트너님,</p>\'',
                        '    + \'<p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#666;">\' + escapeHtml(intro) + \'</p>\'',
                        '    + \'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#faf8f3;border:1px solid #ebe3d5;border-radius:8px;"><tr><td style="padding:20px 24px;">\'',
                        '    + statRow("최근 활동 공백", target.inactivity_days + "일")',
                        '    + statRow("최근 수업/일정 공백", target.class_stale_days + "일")',
                        '    + statRow("미답변 후기", target.unanswered_count + "건")',
                        '    + \'</td></tr></table>\'',
                        '    + \'<div style="margin:0 0 20px;padding:16px 20px;background:#fef9f0;border-left:4px solid #b88956;border-radius:8px;">\'',
                        '    + \'<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#8a6f4d;">감지된 신호</p>\'',
                        '    + \'<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.8;color:#666;">\' + reasonHtml + \'</ul>\'',
                        '    + \'</div>\'',
                        '    + \'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr><td align="center">\'',
                        '    + \'<a href="\' + dashboardUrl + \'" style="display:inline-block;background:#b88956;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:6px;">파트너 대시보드 열기</a>\'',
                        '    + \'</td></tr></table>\'',
                        '    + \'<p style="margin:0 0 8px;font-size:13px;line-height:1.8;color:#777;">진행이 막힌 부분이 있다면 PRESSCO21 팀이 같이 정리해드리겠습니다.</p>\'',
                        '    + \'<p style="margin:0;font-size:13px;line-height:1.8;color:#777;">문의: <a href="mailto:\' + supportEmail + \'" style="color:#b88956;text-decoration:none;">\' + supportEmail + \'</a></p>\'',
                        '    + \'</td></tr>\'',
                        '    + \'<tr><td style="padding:24px 32px;text-align:center;background:#faf8f3;border-top:1px solid #e8e4db;">\'',
                        '    + \'<p style="margin:0 0 8px;font-size:12px;color:#999;">PRESSCO21 | foreverlove.co.kr</p>\'',
                        '    + \'<p style="margin:0;font-size:11px;color:#bbbbbb;">이 메일은 파트너 운영 지원 안내 메일입니다.</p>\'',
                        '    + \'</td></tr></table></td></tr></table></body></html>\';',
                        '',
                        '  items.push({',
                        '    json: {',
                        '      partner_code: target.partner_code,',
                        '      partner_name: target.partner_name,',
                        '      recipient_email: target.email,',
                        '      alert_type: target.alert_type,',
                        '      alert_id: target.alert_id,',
                        '      risk_level: target.risk_level,',
                        '      subject: subject,',
                        '      html: html',
                        '    }',
                        '  });',
                        '}',
                        '',
                        'return items;'
                    ])
                }
            ),
            node(
                'wfch-send-email',
                'Send Partner Risk Email',
                'n8n-nodes-base.emailSend',
                2.1,
                [1960, 500],
                {
                    fromEmail: 'pressco21@foreverlove.co.kr',
                    toEmail: '={{ $json.recipient_email }}',
                    subject: '={{ $json.subject }}',
                    emailType: 'html',
                    html: '={{ $json.html }}',
                    options: {}
                },
                {
                    onError: 'continueRegularOutput',
                    credentials: {
                        smtp: {
                            id: '31jTm9BU7iyj0pVx',
                            name: 'PRESSCO21 SMTP'
                        }
                    }
                }
            ),
            node(
                'wfch-log-email',
                'Build Email Result Items',
                'n8n-nodes-base.code',
                2,
                [2200, 500],
                {
                    jsCode: joinLines([
                        "const sourceItems = $('Build Partner Email Items').all();",
                        'const sendItems = $input.all();',
                        'const rows = [];',
                        'let i;',
                        '',
                        'for (i = 0; i < sourceItems.length; i += 1) {',
                        '  const source = sourceItems[i] && sourceItems[i].json ? sourceItems[i].json : {};',
                        '  const send = sendItems[i] && sendItems[i].json ? sendItems[i].json : {};',
                        '  const sendError = send.error || "";',
                        '',
                        '  rows.push({',
                        '    json: Object.assign({}, source, {',
                        '      send_status: sendError ? "FAILED" : "SENT",',
                        '      send_error: typeof sendError === "string" ? sendError : (sendError && sendError.message ? sendError.message : "")',
                        '    })',
                        '  });',
                        '}',
                        '',
                        'return rows;'
                    ])
                }
            ),
            node(
                'wfch-log-email',
                'Log Email History',
                'n8n-nodes-base.httpRequest',
                4.2,
                [2440, 500],
                {
                    method: 'POST',
                    url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mfsc5xg3ospeonz',
                    authentication: 'genericCredentialType',
                    genericAuthType: 'httpHeaderAuth',
                    sendBody: true,
                    specifyBody: 'json',
                    jsonBody: '={{ JSON.stringify({ recipient: $json.recipient_email, email_type: "PARTNER_NOTIFY", status: $json.send_status, error_message: $json.alert_type + " | " + $json.alert_id + ($json.send_status === "FAILED" && $json.send_error ? (" | " + $json.send_error) : "") }) }}',
                    options: {}
                },
                {
                    onError: 'continueRegularOutput',
                    credentials: {
                        httpHeaderAuth: {
                            id: 'JmXQGe9254wG4qVZ',
                            name: 'NocoDB API Token'
                        }
                    }
                }
            ),
            node(
                'wfch-final-response',
                'Build Final Response',
                'n8n-nodes-base.code',
                2,
                [2680, 500],
                {
                    jsCode: joinLines([
                        "const plan = $('Build Risk Plan').first().json;",
                        "const sentItems = $('Build Email Result Items').all();",
                        'let sentCount = 0;',
                        'let failedCount = 0;',
                        'let firstError = "";',
                        'let atRiskPreview = [];',
                        'let escalationPreview = [];',
                        '',
                        'for (const item of sentItems) {',
                        '  const json = item && item.json ? item.json : {};',
                        '  const errorValue = json.send_error || "";',
                        '  const sendStatus = String(json.send_status || "").toUpperCase();',
                        '  if (sendStatus === "FAILED") {',
                        '    failedCount += 1;',
                        '    if (!firstError) {',
                        '      firstError = typeof errorValue === "string" ? errorValue : (errorValue.message || JSON.stringify(errorValue));',
                        '    }',
                        '  } else {',
                        '    sentCount += 1;',
                        '  }',
                        '}',
                        '',
                        'for (const item of plan.preview || []) {',
                        '  const label = (item.partner_name || item.partner_code) + " (" + item.inactivity_days + "일/" + item.class_stale_days + "일/" + item.unanswered_count + "건)";',
                        '  if (item.risk_level === "ESCALATE") escalationPreview.push(label);',
                        '  else atRiskPreview.push(label);',
                        '}',
                        '',
                        'const telegramMessage =',
                        "  '*파트너 이탈 감지 실행*\\n\\n'",
                        "  + '기준일: ' + plan.today + '\\n'",
                        "  + '활성 파트너: ' + plan.active_partner_count + '명\\n'",
                        "  + '위험 후보: ' + plan.risk_count + '명\\n'",
                        "  + '재활성화 메일 대상: ' + plan.send_target_count + '명\\n'",
                        "  + '30일 위험: ' + plan.at_risk_count + '명\\n'",
                        "  + '60일 에스컬레이션: ' + plan.escalation_count + '명\\n'",
                        "  + '이메일 누락 skip: ' + plan.skipped_missing_email + '명\\n'",
                        "  + '최근 알림 skip: ' + plan.skipped_recent_alert + '명\\n'",
                        "  + '발송 성공: ' + sentCount + '건 / 실패: ' + failedCount + '건\\n\\n'",
                        "  + (atRiskPreview.length ? '[재활성화 대상]\\n- ' + atRiskPreview.slice(0, 5).join('\\n- ') + '\\n\\n' : '')",
                        "  + (escalationPreview.length ? '[대표 에스컬레이션]\\n- ' + escalationPreview.slice(0, 5).join('\\n- ') : '');",
                        '',
                        'return [{',
                        '  json: {',
                        '    success: failedCount === 0,',
                        '    data: {',
                        "      mode: 'process',",
                        '      today: plan.today,',
                        '      active_partner_count: plan.active_partner_count,',
                        '      risk_count: plan.risk_count,',
                        '      at_risk_count: plan.at_risk_count,',
                        '      escalation_count: plan.escalation_count,',
                        '      skipped_missing_email: plan.skipped_missing_email,',
                        '      skipped_recent_alert: plan.skipped_recent_alert,',
                        '      send_target_count: plan.send_target_count,',
                        '      sent_count: sentCount,',
                        '      failed_count: failedCount,',
                        '      preview: plan.preview',
                        '    },',
                        '    error: failedCount === 0 ? null : {',
                        "      code: 'PARTNER_CHURN_EMAIL_FAILED',",
                        '      message: firstError || "SMTP 또는 이메일 로그 설정을 확인해 주세요."',
                        '    },',
                        '    _telegramMessage: telegramMessage,',
                        '    timestamp: new Date().toISOString()',
                        '  }',
                        '}];'
                    ])
                }
            ),
            node(
                'wfch-restore-response',
                'Restore Final Response',
                'n8n-nodes-base.code',
                2,
                [3160, 500],
                {
                    jsCode: joinLines([
                        "return [{ json: $('Build Final Response').first().json }];"
                    ])
                }
            ),
            node(
                'wfch-telegram',
                'Telegram Summary',
                'n8n-nodes-base.telegram',
                1.2,
                [2920, 500],
                {
                    chatId: '={{ $env.TELEGRAM_CHAT_ID }}',
                    text: '={{ $json._telegramMessage }}',
                    additionalFields: {
                        parse_mode: 'Markdown'
                    }
                },
                {
                    onError: 'continueRegularOutput',
                    credentials: {
                        telegramApi: {
                            id: 'eS5YwFGpbJht6uCB',
                            name: 'PRESSCO21 Telegram Bot'
                        }
                    }
                }
            ),
            node(
                'wfch-respond',
                'Respond Result',
                'n8n-nodes-base.respondToWebhook',
                1.1,
                [3400, 500],
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
            )
        ],
        connections: {
            'Schedule Weekly Mon 10:05': {
                main: [
                    [
                        { node: 'Parse Trigger & Auth', type: 'main', index: 0 }
                    ]
                ]
            },
            Webhook: {
                main: [
                    [
                        { node: 'Parse Trigger & Auth', type: 'main', index: 0 }
                    ]
                ]
            },
            'Parse Trigger & Auth': {
                main: [
                    [
                        { node: 'Route Mode', type: 'main', index: 0 }
                    ]
                ]
            },
            'Route Mode': {
                main: [
                    [
                        { node: 'Build Unauthorized Response', type: 'main', index: 0 }
                    ],
                    [
                        { node: 'Get Partners', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Unauthorized Response': {
                main: [
                    [
                        { node: 'Respond Result', type: 'main', index: 0 }
                    ]
                ]
            },
            'Get Partners': {
                main: [
                    [
                        { node: 'Get Classes', type: 'main', index: 0 }
                    ]
                ]
            },
            'Get Classes': {
                main: [
                    [
                        { node: 'Get Schedules', type: 'main', index: 0 }
                    ]
                ]
            },
            'Get Schedules': {
                main: [
                    [
                        { node: 'Get Reviews', type: 'main', index: 0 }
                    ]
                ]
            },
            'Get Reviews': {
                main: [
                    [
                        { node: 'Get Email Logs', type: 'main', index: 0 }
                    ]
                ]
            },
            'Get Email Logs': {
                main: [
                    [
                        { node: 'Build Risk Plan', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Risk Plan': {
                main: [
                    [
                        { node: 'Route Outcome', type: 'main', index: 0 }
                    ]
                ]
            },
            'Route Outcome': {
                main: [
                    [
                        { node: 'Build Dry Run Response', type: 'main', index: 0 }
                    ],
                    [
                        { node: 'Build Partner Email Items', type: 'main', index: 0 }
                    ],
                    [
                        { node: 'Build No Targets Response', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Dry Run Response': {
                main: [
                    [
                        { node: 'Respond Result', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build No Targets Response': {
                main: [
                    [
                        { node: 'Respond Result', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Partner Email Items': {
                main: [
                    [
                        { node: 'Send Partner Risk Email', type: 'main', index: 0 }
                    ]
                ]
            },
            'Send Partner Risk Email': {
                main: [
                    [
                        { node: 'Build Email Result Items', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Email Result Items': {
                main: [
                    [
                        { node: 'Log Email History', type: 'main', index: 0 }
                    ]
                ]
            },
            'Log Email History': {
                main: [
                    [
                        { node: 'Build Final Response', type: 'main', index: 0 }
                    ]
                ]
            },
            'Build Final Response': {
                main: [
                    [
                        { node: 'Telegram Summary', type: 'main', index: 0 }
                    ]
                ]
            },
            'Telegram Summary': {
                main: [
                    [
                        { node: 'Restore Final Response', type: 'main', index: 0 }
                    ]
                ]
            },
            'Restore Final Response': {
                main: [
                    [
                        { node: 'Respond Result', type: 'main', index: 0 }
                    ]
                ]
            }
        }
    };

    if (!existingId) {
        delete workflow.id;
    }

    writeJson(OUTPUT_PATH, workflow);
    console.log('Generated ' + OUTPUT_PATH);
}

main();
