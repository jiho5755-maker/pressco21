#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var annualEventTemplates = require('./lib/partnerclass-annual-event-templates');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_ADMIN_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-EVENT-yearly-calendar-admin.json');
var OUTPUT_AUTO_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-EVENT-d14-auto-alert.json');

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

function buildParseActionCode() {
    return joinLines([
        'const input = $input.first().json || {};',
        'const headers = input.headers || {};',
        'const body = input.body || {};',
        'const authHeader = headers.authorization || headers.Authorization || "";',
        'const token = typeof authHeader === "string" && authHeader.indexOf("Bearer ") === 0 ? authHeader.substring(7).trim() : "";',
        'const expectedToken = $env.ADMIN_API_TOKEN || "";',
        'const legacyToken = "pressco21-admin-2026";',
        'const valid = !!token && ((expectedToken && token === expectedToken) || token === legacyToken);',
        'const currentDate = new Date();',
        'const currentYear = currentDate.getFullYear();',
        'const today = String(body.today || "").trim() || currentDate.toISOString().slice(0, 10);',
        'const year = Math.max(2026, Number(body.year || currentYear) || currentYear);',
        'const action = valid ? String(body.action || "").trim() : "_unauthorized";',
        'const dryRun = body.dry_run === true || String(body.dry_run || "").toLowerCase() === "true" || String(body.mode || "").toLowerCase() === "dry_run";',
        'return [{',
        '  json: {',
        '    _mode: valid ? "process" : "unauthorized",',
        '    _action: action,',
        '    year: year,',
        '    today: today,',
        '    dry_run: dryRun,',
        '    affiliation_code: String(body.affiliation_code || body.affiliationCode || "").trim(),',
        '    requested_by: String(body.requested_by || "admin").trim() || "admin"',
        '  }',
        '}];'
    ]);
}

function buildSyncCalendarCode() {
    var templatesJson = JSON.stringify(annualEventTemplates.EVENT_TEMPLATES);

    return joinLines([
        'const payload = $("Parse Action & Auth").first().json || {};',
        'const affiliationResponse = $("Get Active Affiliations").first().json || {};',
        'const existingResponse = $("Get Existing Seminars (Sync)").first().json || {};',
        'const templates = ' + templatesJson + ';',
        '',
        'function pad2(value) { return String(value).padStart(2, "0"); }',
        'function normalizeStatus(value) {',
        '  const upper = String(value || "").replace(/\\s+/g, " ").trim().toUpperCase();',
        '  if (!upper) return "ACTIVE";',
        '  if (upper === "ACTIVE" || upper === "OPEN") return "ACTIVE";',
        '  return upper;',
        '}',
        'function buildDescription(affiliationName, template) {',
        '  return "<p>" + affiliationName + " 협회와 PRESSCO21이 함께 운영하는 " + template.season_label + " 세미나입니다.</p>"',
        '    + "<p>" + template.description + "</p>"',
        '    + "<p>대상: " + template.audience + "</p>";',
        '}',
        'function buildRow(affiliation, year, template) {',
        '  return {',
        '    seminar_id: "SEM_" + affiliation.affiliation_code + "_CAL_" + String(year) + pad2(template.month) + "_01",',
        '    affiliation_code: affiliation.affiliation_code,',
        '    title: affiliation.name + " " + template.title_suffix,',
        '    description: buildDescription(affiliation.name, template),',
        '    seminar_date: String(year) + "-" + pad2(template.month) + "-" + pad2(template.day),',
        '    seminar_time: template.time,',
        '    location: template.location,',
        '    capacity: template.capacity,',
        '    status: "ACTIVE",',
        '    image_url: template.image_url',
        '  };',
        '}',
        '',
        'const affiliations = (affiliationResponse.list || []).filter((row) => normalizeStatus(row.status || "ACTIVE") === "ACTIVE" && row.affiliation_code).map((row) => ({',
        '  affiliation_code: String(row.affiliation_code || "").trim(),',
        '  name: String(row.name || row.affiliation_code || "").trim() || String(row.affiliation_code || "").trim()',
        '}));',
        'const existingMap = {};',
        'const items = [];',
        'let i;',
        'let j;',
        '',
        '(existingResponse.list || []).forEach((row) => {',
        '  existingMap[String(row.seminar_id || "").trim()] = row;',
        '});',
        '',
        'for (i = 0; i < affiliations.length; i += 1) {',
        '  for (j = 0; j < templates.length; j += 1) {',
        '    const row = buildRow(affiliations[i], payload.year, templates[j]);',
        '    const existing = existingMap[row.seminar_id];',
        '    items.push({',
        '      json: {',
        '        _dryRun: payload.dry_run,',
        '        _operation: existing && existing.Id ? "update" : "create",',
        '        _rowId: existing && existing.Id ? existing.Id : "",',
        '        payload: row',
        '      }',
        '    });',
        '  }',
        '}',
        'if (!items.length) {',
        '  return [{ json: { _dryRun: payload.dry_run, _operation: "noop", _rowId: "", payload: null } }];',
        '}',
        'return items;'
    ]);
}

function buildSyncResponseCode() {
    return joinLines([
        'const payload = $("Parse Action & Auth").first().json || {};',
        'const rows = $("Build Sync Items").all().map((item) => item.json || {}).filter((item) => item.payload);',
        'const created = rows.filter((item) => item._operation === "create").length;',
        'const updated = rows.filter((item) => item._operation === "update").length;',
        'return [{',
        '  json: {',
        '    success: true,',
        '    data: {',
        '      year: payload.year,',
        '      dry_run: rows.length ? !!rows[0]._dryRun : !!payload.dry_run,',
        '      affiliation_count: Array.from(new Set(rows.map((item) => item.payload.affiliation_code))).length,',
        '      target_count: rows.length,',
        '      created: created,',
        '      updated: updated,',
        '      months_covered: Array.from(new Set(rows.map((item) => Number(String(item.payload.seminar_date || "").slice(5, 7))))).sort((a, b) => a - b),',
        '      preview: rows.slice(0, 6).map((item) => ({',
        '        seminar_id: item.payload.seminar_id,',
        '        title: item.payload.title,',
        '        seminar_date: item.payload.seminar_date,',
        '        affiliation_code: item.payload.affiliation_code',
        '      }))',
        '    },',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ]);
}

function buildAlertPlanCode() {
    return joinLines([
        'const payload = $("Parse Action & Auth").first().json || {};',
        'const seminarsResponse = $("Get Seminars (Alert)").first().json || {};',
        'const partnersResponse = $("Get Partners (Alert)").first().json || {};',
        'const logsResponse = $("Get Email Logs").first().json || {};',
        'const ADMIN_EMAIL = "pressco21@foreverlove.co.kr";',
        'function parseDate(value) {',
        '  const text = String(value || "").trim();',
        '  const parts = text.split("-");',
        '  if (parts.length !== 3) return null;',
        '  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));',
        '}',
        'function diffDays(dateA, dateB) {',
        '  if (!dateA || !dateB) return null;',
        '  return Math.round((dateA.getTime() - dateB.getTime()) / 86400000);',
        '}',
        'function normalizeStatus(value) {',
        '  const upper = String(value || "").replace(/\\s+/g, " ").trim().toUpperCase();',
        '  if (!upper) return "DRAFT";',
        '  if (upper === "ACTIVE" || upper === "OPEN") return "ACTIVE";',
        '  return upper;',
        '}',
        'function escapeHtml(value) {',
        '  return String(value || "")',
        '    .replace(/&/g, "&amp;")',
        '    .replace(/</g, "&lt;")',
        '    .replace(/>/g, "&gt;")',
        "    .replace(/\"/g, \"&quot;\")",
        "    .replace(/'/g, \"&#39;\");",
        '}',
        'function stripHtml(value) {',
        '  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();',
        '}',
        'function buildSubject(target) {',
        '  return target.recipient_type === "ADMIN"',
        '    ? "[PRESSCO21] D-14 이벤트 알림 - " + target.title',
        '    : "[PRESSCO21] 2주 뒤 예정된 이벤트를 확인해주세요 - " + target.title;',
        '}',
        'function buildHtml(target) {',
        '  const intro = target.recipient_type === "ADMIN"',
        '    ? "관리자용 일정 확인 메일입니다. 14일 뒤 예정된 이벤트를 다시 점검해주세요."',
        '    : "파트너 운영팀에서 14일 뒤 예정된 시즌 이벤트를 다시 안내드립니다. 일정 홍보와 수강생 유입 준비를 시작해주세요.";',
        '  return "<!DOCTYPE html><html lang=\\"ko\\"><head><meta charset=\\"UTF-8\\" /></head><body style=\\"margin:0;padding:0;background:#f7f5f1;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;\\">"',
        '    + "<table width=\\"100%\\" cellpadding=\\"0\\" cellspacing=\\"0\\" border=\\"0\\" style=\\"padding:24px 0;background:#f7f5f1;\\"><tr><td align=\\"center\\">"',
        '    + "<table width=\\"640\\" cellpadding=\\"0\\" cellspacing=\\"0\\" border=\\"0\\" style=\\"max-width:640px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;\\">"',
        '    + "<tr><td style=\\"padding:28px 32px;background:#334538;color:#ffffff;\\"><p style=\\"margin:0 0 8px;font-size:12px;letter-spacing:0.12em;opacity:0.72;\\">EVENT CALENDAR</p><h1 style=\\"margin:0;font-size:28px;\\">D-14 일정 알림</h1></td></tr>"',
        '    + "<tr><td style=\\"padding:28px 32px;\\"><p style=\\"margin:0 0 14px;font-size:15px;line-height:1.8;color:#3a3a3a;\\">" + escapeHtml(intro) + "</p>"',
        '    + "<table width=\\"100%\\" cellpadding=\\"0\\" cellspacing=\\"0\\" border=\\"0\\" style=\\"border:1px solid #e7e0d8;border-radius:10px;background:#fbfaf7;margin:0 0 20px;\\">"',
        '    + "<tr><td style=\\"padding:20px 24px;\\"><p style=\\"margin:0 0 8px;font-size:13px;color:#7a7367;\\">협회</p><p style=\\"margin:0 0 12px;font-size:24px;font-weight:700;color:#2f4234;\\">" + escapeHtml(target.affiliation_code) + "</p>"',
        '    + "<p style=\\"margin:0 0 6px;font-size:14px;color:#333;\\"><strong>" + escapeHtml(target.title) + "</strong></p>"',
        '    + "<p style=\\"margin:0 0 6px;font-size:14px;color:#555;\\">일정: " + escapeHtml(target.seminar_date) + " " + escapeHtml(target.seminar_time || "-") + "</p>"',
        '    + "<p style=\\"margin:0 0 6px;font-size:14px;color:#555;\\">장소: " + escapeHtml(target.location || "온라인/추후 안내") + "</p>"',
        '    + "<p style=\\"margin:0;font-size:14px;color:#555;\\">요약: " + escapeHtml(stripHtml(target.description || "")) + "</p></td></tr></table>"',
        '    + "<p style=\\"margin:0;font-size:13px;line-height:1.8;color:#7a7367;\\">PRESSCO21 파트너클래스 이벤트 캘린더 기준 알림입니다.</p>"',
        '    + "</td></tr></table></td></tr></table></body></html>";',
        '}',
        '',
        'const today = parseDate(payload.today);',
        'const partners = (partnersResponse.list || []).filter((row) => normalizeStatus(row.status || "ACTIVE") === "ACTIVE" && row.email).map((row) => ({',
        '  partner_code: String(row.partner_code || "").trim(),',
        '  partner_name: String(row.partner_name || row.partner_code || "").trim(),',
        '  recipient_email: String(row.email || "").trim()',
        '}));',
        'const partnerEmailsSeen = {};',
        'const uniquePartners = partners.filter((row) => {',
        '  if (!row.recipient_email || partnerEmailsSeen[row.recipient_email]) return false;',
        '  partnerEmailsSeen[row.recipient_email] = true;',
        '  return true;',
        '});',
        'const sentKeys = {};',
        '(logsResponse.list || []).forEach((row) => {',
        '  const emailType = String(row.email_type || "").trim();',
        '  const recipient = String(row.recipient || row.recipient_email || "").trim();',
        '  const status = String(row.status || "").trim().toUpperCase();',
        '  const errorMessage = String(row.error_message || "").trim();',
        '  const parts = errorMessage.split("|");',
        '  if (emailType === "EVENT_D14" && status === "SENT" && recipient && parts.length >= 2) {',
        '    sentKeys[recipient + "|" + parts[1].trim()] = true;',
        '  }',
        '});',
        '',
        'const dueEvents = (seminarsResponse.list || []).map((row) => ({',
        '  seminar_id: String(row.seminar_id || "").trim(),',
        '  affiliation_code: String(row.affiliation_code || "").trim(),',
        '  title: String(row.title || "").trim(),',
        '  description: String(row.description || "").trim(),',
        '  seminar_date: String(row.seminar_date || "").trim(),',
        '  seminar_time: String(row.seminar_time || "").trim(),',
        '  location: String(row.location || "").trim(),',
        '  capacity: Number(row.capacity || 0),',
        '  status: normalizeStatus(row.status || "")',
        '})).filter((row) => {',
        '  const eventDate = parseDate(row.seminar_date);',
        '  const dayDiff = diffDays(eventDate, today);',
        '  if (row.status !== "ACTIVE" || dayDiff !== 14) return false;',
        '  if (payload.affiliation_code && row.affiliation_code !== payload.affiliation_code) return false;',
        '  return true;',
        '}).map((row) => {',
        '  row.d_day = 14;',
        '  return row;',
        '});',
        '',
        'const sendTargets = [];',
        'dueEvents.forEach((eventRow) => {',
        '  uniquePartners.forEach((partner) => {',
        '    const dedupeKey = partner.recipient_email + "|" + eventRow.seminar_id;',
        '    if (sentKeys[dedupeKey]) return;',
        '    sendTargets.push({',
        '      alert_id: eventRow.seminar_id,',
        '      affiliation_code: eventRow.affiliation_code,',
        '      title: eventRow.title,',
        '      description: eventRow.description,',
        '      seminar_date: eventRow.seminar_date,',
        '      seminar_time: eventRow.seminar_time,',
        '      location: eventRow.location,',
        '      recipient_type: "PARTNER",',
        '      recipient_email: partner.recipient_email,',
        '      recipient_name: partner.partner_name',
        '    });',
        '  });',
        '  if (!sentKeys[ADMIN_EMAIL + "|" + eventRow.seminar_id]) {',
        '    sendTargets.push({',
        '      alert_id: eventRow.seminar_id,',
        '      affiliation_code: eventRow.affiliation_code,',
        '      title: eventRow.title,',
        '      description: eventRow.description,',
        '      seminar_date: eventRow.seminar_date,',
        '      seminar_time: eventRow.seminar_time,',
        '      location: eventRow.location,',
        '      recipient_type: "ADMIN",',
        '      recipient_email: ADMIN_EMAIL,',
        '      recipient_name: "PRESSCO21 운영팀"',
        '    });',
        '  }',
        '});',
        '',
        'sendTargets.forEach((target) => {',
        '  target.subject = buildSubject(target);',
        '  target.html = buildHtml(target);',
        '});',
        '',
        'return [{',
        '  json: {',
        '    success: true,',
        '    dry_run: payload.dry_run,',
        '    today: payload.today,',
        '    due_events: dueEvents,',
        '    send_targets: sendTargets,',
        '    summary: {',
        '      due_event_count: dueEvents.length,',
        '      partner_target_count: sendTargets.filter((item) => item.recipient_type === "PARTNER").length,',
        '      admin_target_count: sendTargets.filter((item) => item.recipient_type === "ADMIN").length,',
        '      total_target_count: sendTargets.length',
        '    },',
        '    _telegramMessage: "[이벤트 D-14] today=" + payload.today + " / due=" + dueEvents.length + " / target=" + sendTargets.length,',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ]);
}

function buildEmailItemsCode() {
    return joinLines([
        'const plan = $input.first().json || {};',
        'return (plan.send_targets || []).map((item) => ({ json: item }));'
    ]);
}

function buildEmailResultCode() {
    return joinLines([
        'const sourceItems = $("Build Email Items").all();',
        'const sendItems = $input.all();',
        'const rows = [];',
        'let i;',
        'for (i = 0; i < sourceItems.length; i += 1) {',
        '  const source = sourceItems[i] && sourceItems[i].json ? sourceItems[i].json : {};',
        '  const send = sendItems[i] && sendItems[i].json ? sendItems[i].json : {};',
        '  const sendError = send.error || "";',
        '  rows.push({',
        '    json: Object.assign({}, source, {',
        '      send_status: sendError ? "FAILED" : "SENT",',
        '      send_error: typeof sendError === "string" ? sendError : (sendError && sendError.message ? sendError.message : "")',
        '    })',
        '  });',
        '}',
        'return rows;'
    ]);
}

function buildSendResponseCode() {
    return joinLines([
        'const plan = $("Get Event Alert Plan").first().json || {};',
        'const rows = $("Build Email Result Items").all().map((item) => item.json || {});',
        'const sentCount = rows.filter((item) => String(item.send_status || "").toUpperCase() === "SENT").length;',
        'const failedRows = rows.filter((item) => String(item.send_status || "").toUpperCase() === "FAILED");',
        'const failedCount = failedRows.length;',
        'const response = {',
        '  success: failedCount === 0,',
        '  data: {',
        '    today: plan.today,',
        '    due_events: plan.due_events || [],',
        '    summary: {',
        '      due_event_count: plan.summary ? plan.summary.due_event_count : 0,',
        '      total_target_count: rows.length,',
        '      sent_count: sentCount,',
        '      failed_count: failedCount',
        '    },',
        '    send_results: rows.map((item) => ({',
        '      alert_id: item.alert_id,',
        '      recipient_email: item.recipient_email,',
        '      recipient_type: item.recipient_type,',
        '      send_status: item.send_status,',
        '      send_error: item.send_error || ""',
        '    }))',
        '  },',
        '  timestamp: new Date().toISOString()',
        '};',
        'if (failedCount > 0) {',
        '  response.error = {',
        '    code: "EVENT_ALERT_EMAIL_FAILED",',
        '    message: "이벤트 D-14 알림 메일 발송 중 일부 실패가 발생했습니다."',
        '  };',
        '}',
        'response._telegramMessage = "[이벤트 D-14] due=" + (plan.summary ? plan.summary.due_event_count : 0) + " / sent=" + sentCount + " / failed=" + failedCount;',
        'return [{ json: response }];'
    ]);
}

function setResponseHeaders(nodeRef) {
    nodeRef.parameters.options = nodeRef.parameters.options || {};
    nodeRef.parameters.options.responseHeaders = {
        entries: [
            { name: 'Content-Type', value: 'application/json; charset=utf-8' },
            { name: 'Access-Control-Allow-Origin', value: 'https://foreverlove.co.kr' },
            { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
            { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' }
        ]
    };
}

function buildAdminWorkflow() {
    var existingId = readExistingId(OUTPUT_ADMIN_PATH);
    var workflow = {
        id: existingId || undefined,
        name: 'WF-EVENT Yearly Calendar Admin',
        settings: {
            executionOrder: 'v1'
        },
        nodes: [],
        connections: {}
    };
    var respondNode;

    workflow.nodes = [
        node('wfevent-admin-webhook', 'Webhook', 'n8n-nodes-base.webhook', 2, [220, 320], {
            httpMethod: 'POST',
            path: 'partnerclass-event-calendar-admin',
            responseMode: 'responseNode',
            options: {}
        }, {
            webhookId: 'partnerclass-event-calendar-admin'
        }),
        node('wfevent-admin-parse', 'Parse Action & Auth', 'n8n-nodes-base.code', 2, [460, 320], {
            jsCode: buildParseActionCode()
        }),
        node('wfevent-admin-route-mode', 'Route Mode', 'n8n-nodes-base.switch', 3.2, [700, 320], {
            rules: {
                values: [
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                {
                                    leftValue: '={{ $json._mode }}',
                                    rightValue: 'unauthorized',
                                    operator: { type: 'string', operation: 'equals' }
                                }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'unauthorized'
                    },
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                {
                                    leftValue: '={{ $json._mode }}',
                                    rightValue: 'process',
                                    operator: { type: 'string', operation: 'equals' }
                                }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'process'
                    }
                ]
            }
        }),
        node('wfevent-admin-unauthorized', 'Build Unauthorized Response', 'n8n-nodes-base.code', 2, [940, 160], {
            jsCode: 'return [{ json: { success: false, error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." }, timestamp: new Date().toISOString() } }];'
        }),
        node('wfevent-admin-route-action', 'Route Action', 'n8n-nodes-base.switch', 3.2, [940, 380], {
            rules: {
                values: [
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json._action }}', rightValue: 'syncAnnualCalendar', operator: { type: 'string', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'syncAnnualCalendar'
                    },
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json._action }}', rightValue: 'runD14Alerts', operator: { type: 'string', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'runD14Alerts'
                    }
                ]
            },
            options: {
                fallbackOutput: 'extra'
            }
        }),
        node('wfevent-admin-get-affiliations', 'Get Active Affiliations', 'n8n-nodes-base.httpRequest', 4.2, [1200, 200], {
            method: 'GET',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/m1y7q68q1zlrvv6',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendQuery: true,
            queryParameters: {
                parameters: [
                    { name: 'limit', value: '100' },
                    { name: 'sort', value: 'affiliation_code' },
                    { name: 'fields', value: 'affiliation_code,name,status' }
                ]
            },
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-get-existing', 'Get Existing Seminars (Sync)', 'n8n-nodes-base.httpRequest', 4.2, [1440, 200], {
            method: 'GET',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/' + annualEventTemplates.DEFAULT_SEMINARS_TABLE_ID,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendQuery: true,
            queryParameters: {
                parameters: [
                    { name: 'limit', value: '400' },
                    { name: 'sort', value: 'seminar_date,seminar_time' },
                    { name: 'fields', value: 'Id,seminar_id,affiliation_code,title,seminar_date,seminar_time,status' }
                ]
            },
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-sync', 'Build Sync Items', 'n8n-nodes-base.code', 2, [1680, 200], {
            jsCode: buildSyncCalendarCode()
        }),
        node('wfevent-admin-sync-route', 'Route Sync Mode', 'n8n-nodes-base.switch', 3.2, [1920, 200], {
            rules: {
                values: [
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json._dryRun === true }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'dryRun'
                    },
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json._dryRun === false }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'apply'
                    }
                ]
            },
            options: {
                fallbackOutput: 'extra'
            }
        }),
        node('wfevent-admin-upsert', 'Upsert Seminar Row', 'n8n-nodes-base.httpRequest', 4.2, [2160, 240], {
            method: '={{ $json._rowId ? "PATCH" : "POST" }}',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/' + annualEventTemplates.DEFAULT_SEMINARS_TABLE_ID + '{{ $json._rowId ? ("/" + $json._rowId) : "" }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify($json.payload) }}',
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-sync-response', 'Build Sync Response', 'n8n-nodes-base.code', 2, [2400, 200], {
            jsCode: buildSyncResponseCode()
        }),
        node('wfevent-admin-get-seminars', 'Get Seminars (Alert)', 'n8n-nodes-base.httpRequest', 4.2, [1200, 520], {
            method: 'GET',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/' + annualEventTemplates.DEFAULT_SEMINARS_TABLE_ID,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendQuery: true,
            queryParameters: {
                parameters: [
                    { name: 'limit', value: '400' },
                    { name: 'sort', value: 'seminar_date,seminar_time' },
                    { name: 'fields', value: 'seminar_id,affiliation_code,title,description,seminar_date,seminar_time,location,capacity,status' }
                ]
            },
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-get-partners', 'Get Partners (Alert)', 'n8n-nodes-base.httpRequest', 4.2, [1440, 520], {
            method: 'GET',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mp8t0yq15cabmj4',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendQuery: true,
            queryParameters: {
                parameters: [
                    { name: 'limit', value: '500' },
                    { name: 'sort', value: 'partner_code' },
                    { name: 'fields', value: 'partner_code,partner_name,email,status' }
                ]
            },
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-get-logs', 'Get Email Logs', 'n8n-nodes-base.httpRequest', 4.2, [1680, 520], {
            method: 'GET',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/' + annualEventTemplates.DEFAULT_EMAIL_LOGS_TABLE_ID,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendQuery: true,
            queryParameters: {
                parameters: [
                    { name: 'limit', value: '1000' },
                    { name: 'sort', value: '-CreatedAt' },
                    { name: 'fields', value: 'recipient,email_type,status,error_message,CreatedAt' }
                ]
            },
            options: {}
        }, {
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        }),
        node('wfevent-admin-alert-plan', 'Get Event Alert Plan', 'n8n-nodes-base.code', 2, [1920, 520], {
            jsCode: buildAlertPlanCode()
        }),
        node('wfevent-admin-alert-route', 'Route Alert Mode', 'n8n-nodes-base.switch', 3.2, [2160, 520], {
            rules: {
                values: [
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json.dry_run === true }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'dryRun'
                    },
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ ($json.send_targets || []).length === 0 }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'noTargets'
                    },
                    {
                        conditions: {
                            options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
                            combinator: 'and',
                            conditions: [
                                { leftValue: '={{ $json.dry_run === false && ($json.send_targets || []).length > 0 }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'send'
                    }
                ]
            },
            options: {
                fallbackOutput: 'extra'
            }
        }),
        node('wfevent-admin-dryrun', 'Build Dry Run Response', 'n8n-nodes-base.code', 2, [2400, 420], {
            jsCode: 'const plan = $input.first().json || {}; return [{ json: { success: true, data: { today: plan.today, summary: plan.summary || {}, due_events: plan.due_events || [], preview: (plan.send_targets || []).slice(0, 5).map((item) => ({ alert_id: item.alert_id, recipient_email: item.recipient_email, recipient_type: item.recipient_type })) }, timestamp: new Date().toISOString() } }];'
        }),
        node('wfevent-admin-no-targets', 'Build No Targets Response', 'n8n-nodes-base.code', 2, [2400, 520], {
            jsCode: 'const plan = $input.first().json || {}; return [{ json: { success: true, data: { today: plan.today, summary: plan.summary || {}, due_events: plan.due_events || [], send_results: [] }, timestamp: new Date().toISOString() } }];'
        }),
        node('wfevent-admin-email-items', 'Build Email Items', 'n8n-nodes-base.code', 2, [2400, 640], {
            jsCode: buildEmailItemsCode()
        }),
        node('wfevent-admin-send-email', 'Send Annual Event Email', 'n8n-nodes-base.emailSend', 2.1, [2640, 640], {
            fromEmail: 'pressco21@foreverlove.co.kr',
            toEmail: '={{ $json.recipient_email }}',
            subject: '={{ $json.subject }}',
            emailType: 'html',
            html: '={{ $json.html }}',
            options: {}
        }, {
            onError: 'continueRegularOutput',
            credentials: {
                smtp: {
                    id: '31jTm9BU7iyj0pVx',
                    name: 'PRESSCO21 SMTP'
                }
            }
        }),
        node('wfevent-admin-email-result', 'Build Email Result Items', 'n8n-nodes-base.code', 2, [2880, 640], {
            jsCode: buildEmailResultCode()
        }),
        node('wfevent-admin-log-email', 'Log Email History', 'n8n-nodes-base.httpRequest', 4.2, [3120, 640], {
            method: 'POST',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/' + annualEventTemplates.DEFAULT_EMAIL_LOGS_TABLE_ID,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify({ recipient: $json.recipient_email, email_type: "EVENT_D14", status: $json.send_status, error_message: "EVENT_D14|" + $json.alert_id + "|" + $json.recipient_type + ($json.send_status === "FAILED" && $json.send_error ? ("|" + $json.send_error) : "") }) }}',
            options: {}
        }, {
            onError: 'continueRegularOutput',
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'NocoDB API Token'
                }
            }
        }),
        node('wfevent-admin-send-response', 'Build Alert Send Response', 'n8n-nodes-base.code', 2, [3360, 640], {
            jsCode: buildSendResponseCode()
        }),
        node('wfevent-admin-telegram', 'Telegram Summary', 'n8n-nodes-base.telegram', 1.2, [3600, 640], {
            operation: 'sendMessage',
            chatId: '={{ $env.TELEGRAM_CHAT_ID }}',
            text: '={{ $json._telegramMessage }}',
            additionalFields: {
                parse_mode: 'Markdown'
            }
        }, {
            onError: 'continueRegularOutput',
            credentials: {
                telegramApi: {
                    id: 'eS5YwFGpbJht6uCB',
                    name: 'PRESSCO21 Telegram Bot'
                }
            }
        }),
        node('wfevent-admin-invalid', 'Build Invalid Action Response', 'n8n-nodes-base.code', 2, [1200, 820], {
            jsCode: 'const action = String($("Parse Action & Auth").first().json._action || "").trim(); return [{ json: { success: false, error: { code: "INVALID_ACTION", message: "지원하지 않는 action입니다: " + action }, timestamp: new Date().toISOString() } }];'
        }),
        node('wfevent-admin-respond', 'Respond Result', 'n8n-nodes-base.respondToWebhook', 1.1, [3840, 520], {
            respondWith: 'json',
            responseBody: '={{ $json }}',
            options: {}
        })
    ];

    respondNode = workflow.nodes[workflow.nodes.length - 1];
    setResponseHeaders(respondNode);

    workflow.connections = {
        Webhook: { main: [[{ node: 'Parse Action & Auth', type: 'main', index: 0 }]] },
        'Parse Action & Auth': { main: [[{ node: 'Route Mode', type: 'main', index: 0 }]] },
        'Route Mode': {
            main: [
                [{ node: 'Build Unauthorized Response', type: 'main', index: 0 }],
                [{ node: 'Route Action', type: 'main', index: 0 }]
            ]
        },
        'Build Unauthorized Response': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] },
        'Route Action': {
            main: [
                [{ node: 'Get Active Affiliations', type: 'main', index: 0 }],
                [{ node: 'Get Seminars (Alert)', type: 'main', index: 0 }],
                [{ node: 'Build Invalid Action Response', type: 'main', index: 0 }]
            ]
        },
        'Get Active Affiliations': { main: [[{ node: 'Get Existing Seminars (Sync)', type: 'main', index: 0 }]] },
        'Get Existing Seminars (Sync)': { main: [[{ node: 'Build Sync Items', type: 'main', index: 0 }]] },
        'Build Sync Items': { main: [[{ node: 'Route Sync Mode', type: 'main', index: 0 }]] },
        'Route Sync Mode': {
            main: [
                [{ node: 'Build Sync Response', type: 'main', index: 0 }],
                [{ node: 'Upsert Seminar Row', type: 'main', index: 0 }],
                [{ node: 'Build Sync Response', type: 'main', index: 0 }]
            ]
        },
        'Upsert Seminar Row': { main: [[{ node: 'Build Sync Response', type: 'main', index: 0 }]] },
        'Build Sync Response': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] },
        'Build Invalid Action Response': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] },
        'Get Seminars (Alert)': { main: [[{ node: 'Get Partners (Alert)', type: 'main', index: 0 }]] },
        'Get Partners (Alert)': { main: [[{ node: 'Get Email Logs', type: 'main', index: 0 }]] },
        'Get Email Logs': { main: [[{ node: 'Get Event Alert Plan', type: 'main', index: 0 }]] },
        'Get Event Alert Plan': { main: [[{ node: 'Route Alert Mode', type: 'main', index: 0 }]] },
        'Route Alert Mode': {
            main: [
                [{ node: 'Build Dry Run Response', type: 'main', index: 0 }],
                [{ node: 'Build No Targets Response', type: 'main', index: 0 }],
                [{ node: 'Build Email Items', type: 'main', index: 0 }],
                [{ node: 'Build No Targets Response', type: 'main', index: 0 }]
            ]
        },
        'Build Dry Run Response': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] },
        'Build No Targets Response': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] },
        'Build Email Items': { main: [[{ node: 'Send Annual Event Email', type: 'main', index: 0 }]] },
        'Send Annual Event Email': { main: [[{ node: 'Build Email Result Items', type: 'main', index: 0 }]] },
        'Build Email Result Items': { main: [[{ node: 'Log Email History', type: 'main', index: 0 }]] },
        'Log Email History': { main: [[{ node: 'Build Alert Send Response', type: 'main', index: 0 }]] },
        'Build Alert Send Response': { main: [[{ node: 'Telegram Summary', type: 'main', index: 0 }]] },
        'Telegram Summary': { main: [[{ node: 'Respond Result', type: 'main', index: 0 }]] }
    };

    return workflow;
}

function buildAutoWorkflow() {
    var existingId = readExistingId(OUTPUT_AUTO_PATH);
    return {
        id: existingId || undefined,
        name: 'WF-EVENT D14 Auto Alert',
        settings: {
            executionOrder: 'v1'
        },
        nodes: [
            node('wfevent-auto-schedule', 'Schedule Daily 09:15', 'n8n-nodes-base.scheduleTrigger', 1.2, [220, 260], {
                rule: {
                    interval: [
                        {
                            field: 'cronExpression',
                            expression: '15 9 * * *'
                        }
                    ]
                }
            }),
            node('wfevent-auto-call', 'Call Event Calendar Admin', 'n8n-nodes-base.httpRequest', 4.2, [520, 260], {
                method: 'POST',
                url: 'https://n8n.pressco21.com/webhook/partnerclass-event-calendar-admin',
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: 'Authorization',
                            value: 'Bearer pressco21-admin-2026'
                        }
                    ]
                },
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '={{ JSON.stringify({ action: "runD14Alerts", dry_run: false, requested_by: "auto_schedule" }) }}',
                options: {
                    response: {
                        response: {
                            fullResponse: true,
                            neverError: true
                        }
                    }
                }
            }),
            node('wfevent-auto-summary', 'Build Auto Alert Summary', 'n8n-nodes-base.code', 2, [820, 260], {
                jsCode: 'const response = $input.first().json || {}; let body = response.body; try { if (typeof body === "string") body = JSON.parse(body); } catch (error) {} return [{ json: { statusCode: Number(response.statusCode || 200), body: body || {}, timestamp: new Date().toISOString() } }];'
            })
        ],
        connections: {
            'Schedule Daily 09:15': {
                main: [[{ node: 'Call Event Calendar Admin', type: 'main', index: 0 }]]
            },
            'Call Event Calendar Admin': {
                main: [[{ node: 'Build Auto Alert Summary', type: 'main', index: 0 }]]
            }
        }
    };
}

writeJson(OUTPUT_ADMIN_PATH, buildAdminWorkflow());
writeJson(OUTPUT_AUTO_PATH, buildAutoWorkflow());
console.log('Generated event workflows');
