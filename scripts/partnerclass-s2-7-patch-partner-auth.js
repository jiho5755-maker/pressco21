#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var WORKFLOW_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-02-partner-auth-api.json');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function getNodeByName(workflow, name) {
    var i;
    for (i = 0; i < workflow.nodes.length; i += 1) {
        if (workflow.nodes[i].name === name) {
            return workflow.nodes[i];
        }
    }
    throw new Error('Node not found: ' + name);
}

function findNodeIndexByName(workflow, name) {
    var i;
    for (i = 0; i < workflow.nodes.length; i += 1) {
        if (workflow.nodes[i].name === name) {
            return i;
        }
    }
    return -1;
}

function upsertNode(workflow, node) {
    var index = findNodeIndexByName(workflow, node.name);
    if (index >= 0) {
        workflow.nodes[index] = node;
        return workflow.nodes[index];
    }
    workflow.nodes.push(node);
    return node;
}

function main() {
    var workflow = readJson(WORKFLOW_PATH);
    var webhookNode = getNodeByName(workflow, 'Webhook');
    var switchNode = getNodeByName(workflow, 'Switch Action');
    var parseAuthNode = getNodeByName(workflow, 'Parse Auth Params');
    var authNode = getNodeByName(workflow, 'Check Partner Exists');
    var ifNeedAppCheckNode = getNodeByName(workflow, 'IF Need App Check');
    var authAppQueryNode = getNodeByName(workflow, 'NocoDB Find Application');
    var buildNotPartnerNode = getNodeByName(workflow, 'Build Not Partner Response');
    var parseDashboardNode = getNodeByName(workflow, 'Parse Dashboard Params');
    var dashboardNode = getNodeByName(workflow, 'Auth Dashboard Partner');
    var myClassesNode = getNodeByName(workflow, 'NocoDB Get My Classes');
    var settlementsNode = getNodeByName(workflow, 'NocoDB Get Settlements');
    var touchAuthNode;
    var restoreAuthNode;
    var touchDashboardNode;
    var parseAppStatusNode = getNodeByName(workflow, 'Parse AppStatus Params');
    var checkAppStatusNode = getNodeByName(workflow, 'Check Partner (AppStatus)');
    var ifNotPartnerAppNode = getNodeByName(workflow, 'IF Not Partner (App)');
    var appStatusQueryNode = getNodeByName(workflow, 'NocoDB Find Application (AppStatus)');
    var buildAppStatusNode = getNodeByName(workflow, 'Build AppStatus Response');
    var parseEducationNode = getNodeByName(workflow, 'Parse Education Params');
    var unknownActionNode = getNodeByName(workflow, 'Unknown Action Error');
    var respondErrorNode = getNodeByName(workflow, 'Respond Error');

    webhookNode.parameters.httpMethod = 'POST';

    switchNode.typeVersion = 3.2;
    switchNode.parameters = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json.body.action || $json.query.action || "" }}',
                                rightValue: 'getPartnerAuth',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'getPartnerAuth'
                },
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json.body.action || $json.query.action || "" }}',
                                rightValue: 'getPartnerDashboard',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'getPartnerDashboard'
                },
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json.body.action || $json.query.action || "" }}',
                                rightValue: 'getPartnerApplicationStatus',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'getPartnerApplicationStatus'
                },
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json.body.action || $json.query.action || "" }}',
                                rightValue: 'getEducationStatus',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'getEducationStatus'
                }
            ]
        },
        options: {
            fallbackOutput: 'extra'
        }
    };

    parseAuthNode.parameters.jsCode = [
        '// ===================================================',
        '// getPartnerAuth 파라미터 검증',
        '// ===================================================',
        '',
        'const payload = $input.first().json.body || $input.first().json.query || {};',
        "const memberId = String(payload.member_id || '').trim();",
        '',
        'if (!memberId) {',
        '  return [{',
        '    json: {',
        '      _error: true,',
        '      success: false,',
        "      error: { code: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'return [{',
        '  json: {',
        '    memberId,',
        '    _error: false',
        '  }',
        '}];'
    ].join('\n');

    authNode.parameters.jsCode = [
        '// ===================================================',
        '// getPartnerAuth 응답 구성 + last_active_at 갱신',
        '// 파트너 존재 -> 파트너 정보 반환',
        '// 파트너 미존재 -> tbl_Applications 조회하여 상태 분기',
        '// ===================================================',
        '',
        'const partnerResponse = $input.first().json;',
        'const partnerList = partnerResponse.list || [];',
        "const memberId = $('Parse Auth Params').first().json.memberId;",
        '',
        'if (partnerList.length > 0) {',
        '  const p = partnerList[0];',
        '  const nowIso = new Date().toISOString();',
        '',
        '  return [{',
        '    json: {',
        '      _touchPartnerId: p.Id || p.id || null,',
        '      success: true,',
        '      data: {',
        '        is_partner: true,',
        '        member_id: memberId,',
        "        partner_code: p.partner_code || '',",
        "        partner_name: p.partner_name || '',",
        "        grade: p.grade || 'SILVER',",
        '        commission_rate: Number(p.commission_rate) || 0,',
        '        reserve_rate: Number(p.reserve_rate) || 0,',
        "        education_completed: p.education_completed === true || p.education_completed === 'true' || p.education_completed === 'Y' || p.education_completed === 'y',",
        "        status: p.status || 'active',",
        '        last_active_at: nowIso',
        '      },',
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'return [{',
        '  json: {',
        '    _needAppCheck: true,',
        '    memberId',
        '  }',
        '}];'
    ].join('\n');

    ifNeedAppCheckNode.type = 'n8n-nodes-base.switch';
    ifNeedAppCheckNode.typeVersion = 3.2;
    ifNeedAppCheckNode.parameters = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json._needAppCheck ? "LOOKUP_APP" : "RESPOND_PARTNER" }}',
                                rightValue: 'LOOKUP_APP',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'lookupApplication'
                }
            ]
        },
        options: {
            fallbackOutput: 'extra'
        }
    };

    authAppQueryNode.parameters.queryParameters.parameters[1].value = '-CreatedAt';

    buildNotPartnerNode.parameters.jsCode = [
        '// ===================================================',
        '// 파트너 미등록 + 신청 상태 응답 구성',
        '// ===================================================',
        '',
        'const appResponse = $input.first().json;',
        'const appList = appResponse.list || [];',
        "const memberId = $('Check Partner Exists').first().json.memberId;",
        '',
        'if (appList.length > 0) {',
        '  const app = appList[0];',
        '  return [{',
        '    json: {',
        '      success: true,',
        '      data: {',
        '        is_partner: false,',
        '        member_id: memberId,',
        "        status: 'pending',",
        "        application_status: app.status || 'PENDING',",
        "        applied_date: app.applied_date || app.CreatedAt || app.created_at || ''",
        '      },',
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        '// 신청 이력도 없음',
        'return [{',
        '  json: {',
        '    success: true,',
        '    data: {',
        '      is_partner: false,',
        '      member_id: memberId,',
        "      status: 'not_partner'",
        '    },',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ].join('\n');

    parseDashboardNode.parameters.jsCode = [
        '// ===================================================',
        '// getPartnerDashboard 파라미터 검증',
        '// ===================================================',
        '',
        'const payload = $input.first().json.body || $input.first().json.query || {};',
        "const memberId = String(payload.member_id || '').trim();",
        "const month = String(payload.month || '').trim();",
        '',
        'if (!memberId) {',
        '  return [{',
        '    json: {',
        '      _error: true,',
        '      success: false,',
        "      error: { code: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'const now = new Date();',
        "const defaultMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');",
        'const targetMonth = month || defaultMonth;',
        '',
        'return [{',
        '  json: {',
        '    memberId,',
        '    targetMonth,',
        '    _error: false',
        '  }',
        '}];'
    ].join('\n');

    dashboardNode.parameters.jsCode = [
        '// ===================================================',
        '// 대시보드: 파트너 인증 확인 + partner_code 추출 + last_active_at 갱신',
        '// ===================================================',
        '',
        'const response = $input.first().json;',
        'const partnerList = response.list || [];',
        "const memberId = $('Parse Dashboard Params').first().json.memberId;",
        "const targetMonth = $('Parse Dashboard Params').first().json.targetMonth;",
        '',
        'if (partnerList.length === 0) {',
        '  return [{',
        '    json: {',
        '      _error: true,',
        '      success: false,',
        "      error: { code: 'NOT_PARTNER', message: '파트너로 등록되지 않은 회원입니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'const p = partnerList[0];',
        '',
        "if (p.status !== 'active') {",
        '  return [{',
        '    json: {',
        '      _error: true,',
        '      success: false,',
        "      error: { code: 'PARTNER_INACTIVE', message: '비활성 상태의 파트너 계정입니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'const nowIso = new Date().toISOString();',
        '',
        'return [{',
        '  json: {',
        '    _error: false,',
        '    _touchPartnerId: p.Id || p.id || null,',
        '    partnerCode: p.partner_code,',
        '    memberId,',
        '    targetMonth,',
        '    partner: {',
        "      partner_code: p.partner_code || '',",
        "      partner_name: p.partner_name || '',",
        "      grade: p.grade || 'SILVER',",
        '      commission_rate: Number(p.commission_rate) || 0,',
        '      reserve_rate: Number(p.reserve_rate) || 0,',
        '      class_count: Number(p.class_count) || 0,',
        '      avg_rating: Number(p.avg_rating) || 0,',
        '      last_active_at: nowIso',
        '    }',
        '  }',
        '}];'
    ].join('\n');

    touchAuthNode = upsertNode(workflow, {
        parameters: {
            method: 'PATCH',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mp8t0yq15cabmj4/{{ $json._touchPartnerId }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify({ last_active_at: $json.data.last_active_at || new Date().toISOString() }) }}',
            options: {}
        },
        id: 'wf02-touch-auth',
        name: 'NocoDB Touch Partner (Auth)',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1700, 140],
        credentials: {
            httpHeaderAuth: {
                id: 'JmXQGe9254wG4qVZ',
                name: 'PRESSCO21-NocoDB'
            }
        }
    });

    restoreAuthNode = upsertNode(workflow, {
        parameters: {
            jsCode: [
                '// ===================================================',
                '// getPartnerAuth: last_active_at PATCH 이후 원래 응답 복원',
                '// ===================================================',
                '',
                "const authResponse = Object.assign({}, $('Check Partner Exists').first().json);",
                'delete authResponse._touchPartnerId;',
                'delete authResponse._needAppCheck;',
                '',
                'return [{',
                '  json: authResponse',
                '}];'
            ].join('\n')
        },
        id: 'wf02-restore-auth-response',
        name: 'Restore Auth Response',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1920, 140]
    });

    touchDashboardNode = upsertNode(workflow, {
        parameters: {
            method: 'PATCH',
            url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mp8t0yq15cabmj4/{{ $json._touchPartnerId }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify({ last_active_at: $json.partner.last_active_at || new Date().toISOString() }) }}',
            options: {}
        },
        id: 'wf02-touch-dashboard',
        name: 'NocoDB Touch Partner (Dashboard)',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1700, 300],
        credentials: {
            httpHeaderAuth: {
                id: 'JmXQGe9254wG4qVZ',
                name: 'PRESSCO21-NocoDB'
            }
        }
    });

    myClassesNode.parameters.queryParameters.parameters = [
        {
            name: 'fields',
            value: 'class_id,class_name,category,price,status,class_count,avg_rating,partner_code'
        },
        {
            name: 'limit',
            value: '200'
        }
    ];

    settlementsNode.parameters.queryParameters.parameters[0].value = '=(partner_code,eq,{{ $(\'Auth Dashboard Partner\').first().json.partnerCode }})';
    settlementsNode.parameters.queryParameters.parameters[1].value = 'settlement_id,order_id,class_id,order_amount,commission_amount,reserve_amount,class_date,status,CreatedAt,UpdatedAt';

    getNodeByName(workflow, 'Build Dashboard Response').parameters.jsCode = [
        '// ===================================================',
        '// 대시보드 응답 구성: 파트너 + 클래스 + 정산 집계',
        '// ===================================================',
        '',
        'const partnerData = $(\'Auth Dashboard Partner\').first().json;',
        'const classesResponse = $(\'NocoDB Get My Classes\').first().json;',
        'const settlementsResponse = $(\'NocoDB Get Settlements\').first().json;',
        '',
        'const partner = partnerData.partner;',
        'const targetMonth = partnerData.targetMonth;',
        '',
        'function extractPartnerCode(raw) {',
        "  if (Array.isArray(raw) && raw.length > 0) {",
        "    return String(raw[0].partner_code || raw[0].Title || raw[0].title || raw[0].value || '').trim();",
        '  }',
        "  if (raw && typeof raw === 'object') {",
        "    return String(raw.partner_code || raw.Title || raw.title || raw.value || '').trim();",
        '  }',
        "  return String(raw || '').trim();",
        '}',
        '',
        '// 클래스 목록',
        "const myClasses = (classesResponse.list || []).filter(c => extractPartnerCode(c.partner_code) === String(partner.partner_code || '')).map(c => ({",
        "  class_id: c.class_id || '',",
        "  class_name: c.class_name || '',",
        "  category: c.category || '',",
        '  price: Number(c.price) || 0,',
        "  status: c.status || '',",
        '  class_count: Number(c.class_count) || 0,',
        '  avg_rating: Number(c.avg_rating) || 0',
        '}));',
        '',
        '// 정산 내역 (해당 월 필터링)',
        'const allSettlements = settlementsResponse.list || [];',
        'const monthSettlements = allSettlements.filter(s => {',
        "  const classDate = String(s.class_date || s.CreatedAt || s.UpdatedAt || '').substring(0, 7);",
        '  return classDate === targetMonth;',
        '});',
        '',
        '// 월별 집계',
        'let totalRevenue = 0;',
        'let totalCommission = 0;',
        'let totalReserve = 0;',
        'let completedCount = 0;',
        'let pendingCount = 0;',
        'let failedCount = 0;',
        '',
        'const items = monthSettlements.map(s => {',
        '  const orderAmount = Number(s.order_amount) || 0;',
        '  const commissionAmount = Number(s.commission_amount) || 0;',
        '  const reserveAmount = Number(s.reserve_amount) || 0;',
        "  const status = String(s.status || '').toUpperCase();",
        '',
        '  totalRevenue += orderAmount;',
        '  totalCommission += commissionAmount;',
        '  totalReserve += reserveAmount;',
        '',
        "  if (status === 'COMPLETED') completedCount += 1;",
        "  else if (status === 'PENDING' || status === 'PROCESSING' || status === 'PENDING_SETTLEMENT') pendingCount += 1;",
        "  else if (status === 'FAILED') failedCount += 1;",
        '',
        '  return {',
        "    settlement_id: s.settlement_id || '',",
        "    order_id: s.order_id || '',",
        "    class_id: s.class_id || '',",
        '    order_amount: orderAmount,',
        '    commission_amount: commissionAmount,',
        '    reserve_amount: reserveAmount,',
        "    class_date: String(s.class_date || s.CreatedAt || '').substring(0, 10),",
        '    status',
        '  };',
        '});',
        '',
        'return [{',
        '  json: {',
        '    success: true,',
        '    data: {',
        '      partner,',
        '      classes: myClasses,',
        '      settlement: {',
        '        month: targetMonth,',
        '        total_revenue: totalRevenue,',
        '        total_commission: totalCommission,',
        '        total_reserve: totalReserve,',
        '        completed_count: completedCount,',
        '        pending_count: pendingCount,',
        '        failed_count: failedCount,',
        '        items',
        '      }',
        '    },',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ].join('\n');

    parseAppStatusNode.parameters.jsCode = [
        '// ===================================================',
        '// getPartnerApplicationStatus 처리',
        '// member_id로 파트너 여부 -> 신청 이력 조회',
        '// ===================================================',
        '',
        'const payload = $input.first().json.body || $input.first().json.query || {};',
        "const memberId = String(payload.member_id || '').trim();",
        '',
        'if (!memberId) {',
        '  return [{',
        '    json: {',
        '      _done: true,',
        '      success: false,',
        "      error: { code: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'return [{',
        '  json: {',
        '    memberId,',
        '    _done: false',
        '  }',
        '}];'
    ].join('\n');

    checkAppStatusNode.parameters.jsCode = [
        '// ===================================================',
        '// 이미 파트너인지 확인',
        '// boolean 플래그로 분기 안정화',
        '// ===================================================',
        '',
        'const response = $input.first().json;',
        'const partnerList = response.list || [];',
        "const memberId = $('Parse AppStatus Params').first().json.memberId;",
        '',
        'if (partnerList.length > 0) {',
        '  const p = partnerList[0];',
        '  return [{',
        '    json: {',
        '      success: true,',
        '      data: {',
        '        is_partner: true,',
        "        partner_code: p.partner_code || '',",
        "        grade: p.grade || '',",
        "        status: p.status || ''",
        '      },',
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        '// 파트너 아님 -> 신청 조회 필요',
        'return [{',
        '  json: {',
        '    _needsApplicationLookup: true,',
        '    memberId',
        '  }',
        '}];'
    ].join('\n');

    ifNotPartnerAppNode.type = 'n8n-nodes-base.switch';
    ifNotPartnerAppNode.typeVersion = 3.2;
    ifNotPartnerAppNode.parameters = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            version: 2,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'loose'
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                leftValue: '={{ $json._needsApplicationLookup ? "LOOKUP_APP" : "RESPOND_PARTNER" }}',
                                rightValue: 'LOOKUP_APP',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ]
                    },
                    renameOutput: true,
                    outputKey: 'lookupApplication'
                }
            ]
        },
        options: {
            fallbackOutput: 'extra'
        }
    };

    appStatusQueryNode.parameters.queryParameters.parameters[1].value = '-CreatedAt';

    buildAppStatusNode.parameters.jsCode = [
        '// ===================================================',
        '// 파트너 신청 상태 응답 구성',
        '// ===================================================',
        '',
        'const appResponse = $input.first().json;',
        'const appList = appResponse.list || [];',
        "const memberId = $('Check Partner (AppStatus)').first().json.memberId;",
        '',
        'if (appList.length === 0) {',
        '  return [{',
        '    json: {',
        '      success: true,',
        '      data: {',
        '        is_partner: false,',
        '        has_application: false,',
        "        message: '파트너 신청 이력이 없습니다.'",
        '      },',
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'const app = appList[0];',
        "let message = '';",
        'switch (app.status) {',
        "  case 'PENDING':  message = '신청이 심사 중입니다.'; break;",
        "  case 'APPROVED': message = '신청이 승인되었습니다.'; break;",
        "  case 'REJECTED': message = '신청이 반려되었습니다.'; break;",
        "  default:         message = '신청 상태를 확인할 수 없습니다.';",
        '}',
        '',
        'return [{',
        '  json: {',
        '    success: true,',
        '    data: {',
        '      is_partner: false,',
        '      has_application: true,',
        "      application_id: app.application_id || '',",
        "      status: app.status || '',",
        "      applied_date: app.applied_date || app.CreatedAt || app.created_at || '',",
        '      message',
        '    },',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ].join('\n');

    parseEducationNode.parameters.jsCode = [
        '// ===================================================',
        '// getEducationStatus 처리',
        '// member_id로 파트너 조회 -> education 필드 반환',
        '// ===================================================',
        '',
        'const payload = $input.first().json.body || $input.first().json.query || {};',
        "const memberId = String(payload.member_id || '').trim();",
        '',
        'if (!memberId) {',
        '  return [{',
        '    json: {',
        '      _done: true,',
        '      success: false,',
        "      error: { code: 'NOT_LOGGED_IN', message: '로그인이 필요합니다.' },",
        '      timestamp: new Date().toISOString()',
        '    }',
        '  }];',
        '}',
        '',
        'return [{',
        '  json: {',
        '    memberId,',
        '    _done: false',
        '  }',
        '}];'
    ].join('\n');

    unknownActionNode.parameters.jsCode = [
        '// Fallback: 알 수 없는 action',
        "const payload = $input.first().json.body || $input.first().json.query || {};",
        "const action = String(payload.action || '');",
        'return [{',
        '  json: {',
        '    success: false,',
        '    error: {',
        "      code: 'INVALID_ACTION',",
        "      message: '알 수 없는 요청입니다: ' + action",
        '    },',
        '    timestamp: new Date().toISOString()',
        '  }',
        '}];'
    ].join('\n');

    respondErrorNode.parameters.options.responseCode = 400;

    workflow.connections['IF Dashboard Auth OK'].main[0] = [
        { node: 'NocoDB Touch Partner (Dashboard)', type: 'main', index: 0 }
    ];
    workflow.connections['NocoDB Get My Classes'].main[0] = [
        { node: 'NocoDB Get Settlements', type: 'main', index: 0 }
    ];
    workflow.connections['NocoDB Get Settlements'].main[0] = [
        { node: 'Build Dashboard Response', type: 'main', index: 0 }
    ];
    workflow.connections['NocoDB Touch Partner (Dashboard)'] = {
        main: [[
            { node: 'NocoDB Get My Classes', type: 'main', index: 0 }
        ]]
    };
    workflow.connections['IF Need App Check'].main[0] = [
        { node: 'NocoDB Find Application', type: 'main', index: 0 }
    ];
    workflow.connections['IF Need App Check'].main[1] = [
        { node: 'NocoDB Touch Partner (Auth)', type: 'main', index: 0 }
    ];
    workflow.connections['IF Not Partner (App)'].main[0] = [
        { node: 'NocoDB Find Application (AppStatus)', type: 'main', index: 0 }
    ];
    workflow.connections['IF Not Partner (App)'].main[1] = [
        { node: 'Respond AppStatus', type: 'main', index: 0 }
    ];
    workflow.connections['NocoDB Touch Partner (Auth)'] = {
        main: [[
            { node: 'Restore Auth Response', type: 'main', index: 0 }
        ]]
    };
    workflow.connections['Restore Auth Response'] = {
        main: [[
            { node: 'Respond getPartnerAuth', type: 'main', index: 0 }
        ]]
    };

    writeJson(WORKFLOW_PATH, workflow);
    console.log('Patched WF-02 partner auth workflow for auth/app status routing, application sort fields, and response restoration.');
}

main();
