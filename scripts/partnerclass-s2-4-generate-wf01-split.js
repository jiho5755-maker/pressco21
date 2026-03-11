#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var DEFAULT_CLASS_SOURCE = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-01A-class-read.json');
var DEFAULT_SCHEDULE_SOURCE = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-01B-schedule-read.json');
var DEFAULT_AFFILIATION_SOURCE = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-01C-affiliation-read.json');
var DEFAULT_ROUTER_SOURCE = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-01-class-api.json');
var DEFAULT_TARGET_DIR = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows');

function parseArgs(argv) {
    var result = {
        classSource: DEFAULT_CLASS_SOURCE,
        scheduleSource: DEFAULT_SCHEDULE_SOURCE,
        affiliationSource: DEFAULT_AFFILIATION_SOURCE,
        routerSource: DEFAULT_ROUTER_SOURCE,
        targetDir: DEFAULT_TARGET_DIR
    };
    var i;

    for (i = 2; i < argv.length; i += 1) {
        if (argv[i] === '--source' && argv[i + 1]) {
            result.classSource = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--class-source' && argv[i + 1]) {
            result.classSource = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--schedule-source' && argv[i + 1]) {
            result.scheduleSource = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--affiliation-source' && argv[i + 1]) {
            result.affiliationSource = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--router-source' && argv[i + 1]) {
            result.routerSource = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i] === '--target-dir' && argv[i + 1]) {
            result.targetDir = path.resolve(argv[i + 1]);
            i += 1;
        }
    }

    return result;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function indexNodes(workflow) {
    var map = {};

    workflow.nodes.forEach(function (node) {
        map[node.name] = node;
    });

    return map;
}

function pickNodes(nodeMap, names) {
    return names.map(function (name) {
        if (!nodeMap[name]) {
            throw new Error('Missing node in source workflow: ' + name);
        }
        return clone(nodeMap[name]);
    });
}

function pickConnections(workflow, names) {
    var result = {};

    names.forEach(function (name) {
        if (workflow.connections[name]) {
            result[name] = clone(workflow.connections[name]);
        }
    });

    return result;
}

function buildBaseWorkflow(name, id, settings) {
    return {
        id: id || '',
        name: name,
        nodes: [],
        connections: {},
        settings: clone(settings || { executionOrder: 'v1' }),
        staticData: null,
        tags: [],
        pinData: {}
    };
}

function setResponseHeaders(node, allowOrigin) {
    var entries = [
        {
            name: 'Content-Type',
            value: 'application/json; charset=utf-8'
        }
    ];

    if (allowOrigin) {
        entries.push({
            name: 'Access-Control-Allow-Origin',
            value: allowOrigin
        });
        entries.push({
            name: 'Access-Control-Allow-Headers',
            value: 'Content-Type'
        });
        entries.push({
            name: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS'
        });
    }

    if (!node.parameters.options) {
        node.parameters.options = {};
    }

    node.parameters.options.responseHeaders = {
        entries: entries
    };
}

function buildWebhookActionRule(action, outputKey) {
    return {
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
                    leftValue: '={{ ($json.body && $json.body.action) || $json.action || "" }}',
                    rightValue: action,
                    operator: {
                        type: 'string',
                        operation: 'equals'
                    }
                }
            ]
        },
        renameOutput: true,
        outputKey: outputKey
    };
}

function buildWorkflowCacheCheckNode(name, id, cacheKey, position) {
    return {
        parameters: {
            jsCode: [
                'const workflowStaticData = $getWorkflowStaticData(\'global\');',
                'const cacheStore = workflowStaticData.presscoCache || {};',
                'const entry = cacheStore[\'' + cacheKey + '\'];',
                '',
                'if (entry && entry.payload && Number(entry.expires_at || 0) > Date.now()) {',
                '  return [{ json: Object.assign({ _cacheStatus: \'HIT\' }, entry.payload) }];',
                '}',
                '',
                'return [{ json: { _cacheStatus: \'MISS\' } }];'
            ].join('\n')
        },
        id: id,
        name: name,
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: position
    };
}

function buildCacheStatusSwitchNode(name, id, position) {
    return {
        parameters: {
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
                                    leftValue: '={{ $json._cacheStatus }}',
                                    rightValue: 'HIT',
                                    operator: {
                                        type: 'string',
                                        operation: 'equals'
                                    }
                                }
                            ]
                        },
                        renameOutput: true,
                        outputKey: 'cacheHit'
                    }
                ]
            },
            options: {
                fallbackOutput: 'extra'
            }
        },
        id: id,
        name: name,
        type: 'n8n-nodes-base.switch',
        typeVersion: 3.2,
        position: position
    };
}

function buildWorkflowCacheStoreNode(name, id, cacheKey, ttlMs, position) {
    return {
        parameters: {
            jsCode: [
                'const workflowStaticData = $getWorkflowStaticData(\'global\');',
                'const payload = $input.first().json;',
                '',
                'if (payload && payload.success) {',
                '  if (!workflowStaticData.presscoCache) {',
                '    workflowStaticData.presscoCache = {};',
                '  }',
                '  workflowStaticData.presscoCache[\'' + cacheKey + '\'] = {',
                '    payload: JSON.parse(JSON.stringify(payload)),',
                '    cached_at: new Date().toISOString(),',
                '    expires_at: Date.now() + ' + String(ttlMs),
                '  };',
                '}',
                '',
                'return [{ json: payload }];'
            ].join('\n')
        },
        id: id,
        name: name,
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: position
    };
}

function buildBooleanIfNode(name, id, leftValue, position) {
    return {
        parameters: {
            conditions: {
                options: {
                    caseSensitive: true
                },
                conditions: [
                    {
                        leftValue: leftValue,
                        rightValue: true,
                        operator: {
                            type: 'boolean',
                            operation: 'equals'
                        }
                    }
                ]
            }
        },
        id: id,
        name: name,
        type: 'n8n-nodes-base.if',
        typeVersion: 2,
        position: position
    };
}

function buildClassReadWorkflow(source, nodeMap) {
    var names = [
        'Webhook',
        'Switch Action',
        'Parse getClasses Params',
        'NocoDB Get Classes',
        'NocoDB Get Partners (Join)',
        'NocoDB Get Schedules for List',
        'Merge Classes + Partners',
        'Respond getClasses',
        'Parse getClassDetail Params',
        'IF Detail Params Valid',
        'NocoDB Get Class Detail',
        'Format Class Detail',
        'NocoDB Get Partner (Detail)',
        'NocoDB Get Schedules for Detail',
        'Build Detail Response',
        'Respond getClassDetail',
        'Respond Detail Error',
        'NocoDB Get Active Classes (Categories)',
        'Aggregate Categories',
        'Respond getCategories',
        'Unknown Action Error',
        'Respond Error'
    ];
    var workflow = buildBaseWorkflow('WF-01A Class Read API', source.id || '', source.settings);
    var nodes = pickNodes(nodeMap, names);
    var checkCategoriesCacheNode = buildWorkflowCacheCheckNode('Check Categories Cache', 'wf01-categories-cache-check', 'getCategories_v1', [460, 500]);
    var categoriesCacheSwitchNode = buildCacheStatusSwitchNode('Switch Categories Cache', 'wf01-categories-cache-switch', [660, 500]);
    var storeCategoriesCacheNode = buildWorkflowCacheStoreNode('Store Categories Cache', 'wf01-categories-cache-store', 'getCategories_v1', 60 * 60 * 1000, [1100, 500]);
    var webhookNode;
    var switchNode;
    var respondCategoriesNode;

    workflow.nodes = nodes;
    workflow.connections = pickConnections(source, names);

    webhookNode = workflow.nodes.find(function (node) {
        return node.name === 'Webhook';
    });
    webhookNode.parameters.path = 'class-api-read';
    webhookNode.webhookId = 'class-api-read';

    switchNode = workflow.nodes.find(function (node) {
        return node.name === 'Switch Action';
    });
    switchNode.parameters.rules.values = switchNode.parameters.rules.values.slice(0, 3);
    switchNode.parameters.options = switchNode.parameters.options || { fallbackOutput: 'extra' };
    workflow.nodes.push(checkCategoriesCacheNode, categoriesCacheSwitchNode, storeCategoriesCacheNode);
    respondCategoriesNode = workflow.nodes.find(function (node) {
        return node.name === 'Respond getCategories';
    });
    if (respondCategoriesNode) {
        respondCategoriesNode.position = [1320, 500];
        respondCategoriesNode.parameters.responseBody = '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._cacheStatus; return payload; })() }}';
    }
    workflow.connections['Switch Action'] = {
        main: [
            [{ node: 'Parse getClasses Params', type: 'main', index: 0 }],
            [{ node: 'Parse getClassDetail Params', type: 'main', index: 0 }],
            [{ node: 'Check Categories Cache', type: 'main', index: 0 }],
            [{ node: 'Unknown Action Error', type: 'main', index: 0 }]
        ]
    };
    workflow.connections['Check Categories Cache'] = {
        main: [[{ node: 'Switch Categories Cache', type: 'main', index: 0 }]]
    };
    workflow.connections['Switch Categories Cache'] = {
        main: [
            [{ node: 'Respond getCategories', type: 'main', index: 0 }],
            [{ node: 'NocoDB Get Active Classes (Categories)', type: 'main', index: 0 }]
        ]
    };
    workflow.connections['Aggregate Categories'] = {
        main: [[{ node: 'Store Categories Cache', type: 'main', index: 0 }]]
    };
    workflow.connections['Store Categories Cache'] = {
        main: [[{ node: 'Respond getCategories', type: 'main', index: 0 }]]
    };

    workflow.nodes.forEach(function (node) {
        if (node.type === 'n8n-nodes-base.respondToWebhook') {
            setResponseHeaders(node, 'https://foreverlove.co.kr');
        }
    });

    return workflow;
}

function buildAffiliationReadWorkflow(source, nodeMap) {
    var names = [
        'Webhook',
        'Switch Action',
        'NocoDB Get Affiliations',
        'Format Affiliations',
        'Respond getAffiliations',
        'Unknown Action Error',
        'Respond Error'
    ];
    var workflow = buildBaseWorkflow('WF-01C Affiliation Read API', source.id || '', source.settings);
    var nodes = pickNodes(nodeMap, names);
    var checkAffiliationsCacheNode = buildWorkflowCacheCheckNode('Check Affiliations Cache', 'wf01-affiliations-cache-check', 'getAffiliations_v1', [460, 820]);
    var affiliationsCacheSwitchNode = buildCacheStatusSwitchNode('Switch Affiliations Cache', 'wf01-affiliations-cache-switch', [660, 820]);
    var storeAffiliationsCacheNode = buildWorkflowCacheStoreNode('Store Affiliations Cache', 'wf01-affiliations-cache-store', 'getAffiliations_v1', 60 * 60 * 1000, [1100, 820]);
    var webhookNode;
    var switchNode;
    var respondAffiliationsNode;

    workflow.nodes = nodes;
    workflow.connections = pickConnections(source, names);

    webhookNode = workflow.nodes.find(function (node) {
        return node.name === 'Webhook';
    });
    webhookNode.parameters.path = 'class-api-affiliation';
    webhookNode.webhookId = 'class-api-affiliation';

    switchNode = workflow.nodes.find(function (node) {
        return node.name === 'Switch Action';
    });
    switchNode.parameters.rules.values = [
        buildWebhookActionRule('getAffiliations', 'getAffiliations'),
        buildWebhookActionRule('getContentHub', 'getContentHub')
    ];
    switchNode.parameters.options = switchNode.parameters.options || { fallbackOutput: 'extra' };
    workflow.nodes.push(checkAffiliationsCacheNode, affiliationsCacheSwitchNode, storeAffiliationsCacheNode);
    respondAffiliationsNode = workflow.nodes.find(function (node) {
        return node.name === 'Respond getAffiliations';
    });
    if (respondAffiliationsNode) {
        respondAffiliationsNode.position = [1320, 820];
        respondAffiliationsNode.parameters.responseBody = '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._cacheStatus; return payload; })() }}';
    }

    workflow.nodes.push(
        {
            parameters: {
                method: 'GET',
                url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mpvsno4or6asbxk',
                authentication: 'genericCredentialType',
                genericAuthType: 'httpHeaderAuth',
                sendQuery: true,
                queryParameters: {
                    parameters: [
                        {
                            name: 'fields',
                            value: 'class_id,class_name,category,level,price,duration_min,thumbnail_url,location,region,tags,class_count,avg_rating,partner_code,type,status,kit_enabled'
                        },
                        {
                            name: 'limit',
                            value: '1000'
                        },
                        {
                            name: 'sort',
                            value: '-CreatedAt'
                        }
                    ]
                },
                options: {}
            },
            id: 'wf01c-content-classes',
            name: 'NocoDB Get Content Classes',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [900, 420],
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        },
        {
            parameters: {
                method: 'GET',
                url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mp8t0yq15cabmj4',
                authentication: 'genericCredentialType',
                genericAuthType: 'httpHeaderAuth',
                sendQuery: true,
                queryParameters: {
                    parameters: [
                        {
                            name: 'where',
                            value: '(status,eq,active)'
                        },
                        {
                            name: 'fields',
                            value: 'partner_code,partner_name,grade,location,avg_rating,instagram_url,portfolio_url'
                        },
                        {
                            name: 'limit',
                            value: '1000'
                        }
                    ]
                },
                options: {}
            },
            id: 'wf01c-content-partners',
            name: 'NocoDB Get Content Partners',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [1140, 420],
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// WF-01C: getContentHub - 콘텐츠 허브 4영역 응답 생성',
                    '// 기존 Classes + Partners 데이터만으로 하이라이트/인터뷰/트렌드/가이드를 구성',
                    '// ===================================================',
                    '',
                    'const classResponse = $(\'NocoDB Get Content Classes\').first().json;',
                    'const partnerResponse = $(\'NocoDB Get Content Partners\').first().json;',
                    'const classesList = classResponse.list || [];',
                    'const partnersList = partnerResponse.list || [];',
                    '',
                    'function normalizeStatus(raw) {',
                    '  const text = String(raw || \'\').replace(/\\s+/g, \' \').trim();',
                    '  const upper = text.toUpperCase();',
                    '  if (!text) return \'DRAFT\';',
                    '  if (upper === \'ACTIVE\' || text.toLowerCase() === \'active\') return \'ACTIVE\';',
                    '  if (upper === \'PAUSED\' || text.toLowerCase() === \'paused\') return \'PAUSED\';',
                    '  if (upper === \'PENDING_REVIEW\' || upper === \'INACTIVE\' || text.toLowerCase() === \'pending\') return \'PENDING_REVIEW\';',
                    '  if (upper === \'REJECTED\' || text.toLowerCase() === \'closed\') return \'REJECTED\';',
                    '  return upper;',
                    '}',
                    '',
                    'function normalizeLevel(raw) {',
                    '  const text = String(raw || \'\').replace(/\\s+/g, \' \').trim();',
                    '  const upper = text.toUpperCase();',
                    '  const lower = text.toLowerCase();',
                    '  if (!text) return \'ALL_LEVELS\';',
                    '  if (upper === \'BEGINNER\' || lower === \'beginner\' || lower === \'basic\' || text.indexOf(\'입문\') !== -1 || text.indexOf(\'초급\') !== -1) return \'BEGINNER\';',
                    '  if (upper === \'INTERMEDIATE\' || lower === \'intermediate\' || text.indexOf(\'중급\') !== -1) return \'INTERMEDIATE\';',
                    '  if (upper === \'ADVANCED\' || lower === \'advanced\' || text.indexOf(\'심화\') !== -1 || text.indexOf(\'고급\') !== -1) return \'ADVANCED\';',
                    '  return \'ALL_LEVELS\';',
                    '}',
                    '',
                    'function normalizeRegion(raw) {',
                    '  const text = String(raw || \'\').replace(/\\s+/g, \' \').trim();',
                    '  const upper = text.toUpperCase();',
                    '  if (!text) return \'NATIONWIDE\';',
                    '  if (upper === \'SEOUL\' || text.indexOf(\'서울\') !== -1) return \'SEOUL\';',
                    '  if (upper === \'GYEONGGI\' || text.indexOf(\'경기\') !== -1) return \'GYEONGGI\';',
                    '  if (upper === \'INCHEON\' || text.indexOf(\'인천\') !== -1) return \'INCHEON\';',
                    '  if (upper === \'BUSAN\' || text.indexOf(\'부산\') !== -1) return \'BUSAN\';',
                    '  if (upper === \'ONLINE\' || text.indexOf(\'온라인\') !== -1) return \'ONLINE\';',
                    '  return upper;',
                    '}',
                    '',
                    'function getRegionLabel(code) {',
                    '  const labels = { SEOUL: \'서울\', GYEONGGI: \'경기\', INCHEON: \'인천\', BUSAN: \'부산\', ONLINE: \'온라인\', NATIONWIDE: \'전국\' };',
                    '  return labels[code] || code || \'전국\';',
                    '}',
                    '',
                    'function getLevelLabel(code) {',
                    '  const labels = { BEGINNER: \'입문\', INTERMEDIATE: \'중급\', ADVANCED: \'심화\', ALL_LEVELS: \'누구나\' };',
                    '  return labels[code] || \'누구나\';',
                    '}',
                    '',
                    'function getTypeLabel(raw) {',
                    '  const text = String(raw || \'\').trim();',
                    '  if (!text) return \'원데이\';',
                    '  if (text.toUpperCase() === \'ONLINE\' || text.indexOf(\'온라인\') !== -1) return \'온라인\';',
                    '  return text;',
                    '}',
                    '',
                    'function normalizeGrade(raw) {',
                    '  const upper = String(raw || \'BLOOM\').toUpperCase();',
                    '  if (upper === \'SILVER\') return \'BLOOM\';',
                    '  if (upper === \'GOLD\') return \'GARDEN\';',
                    '  if (upper === \'PLATINUM\') return \'ATELIER\';',
                    '  return upper || \'BLOOM\';',
                    '}',
                    '',
                    'function topCategory(classes) {',
                    '  const counts = {};',
                    '  let best = \'\';',
                    '  let bestCount = 0;',
                    '  classes.forEach((item) => {',
                    '    const category = String(item.category || \'\').trim() || \'꽃 공예\';',
                    '    counts[category] = (counts[category] || 0) + 1;',
                    '    if (counts[category] > bestCount) {',
                    '      best = category;',
                    '      bestCount = counts[category];',
                    '    }',
                    '  });',
                    '  return best || \'꽃 공예\';',
                    '}',
                    '',
                    'function buildGuideChecklist(item, levelLabel) {',
                    '  const list = [];',
                    '  const duration = Number(item.duration_min || 0);',
                    '  list.push(levelLabel + \' 난이도에서 시작하기 좋은 클래스\');',
                    '  if (duration > 0) {',
                    '    list.push(\'예상 수업 시간 \' + duration + \'분\');',
                    '  }',
                    '  if (Number(item.kit_enabled || 0) === 1) {',
                    '    list.push(\'재료 연동 상품 확인 가능\');',
                    '  } else {',
                    '    list.push(\'상세 페이지에서 준비물 안내 확인\');',
                    '  }',
                    '  list.push(getRegionLabel(item.regionCode) + \'에서 예약 가능한 클래스\');',
                    '  return list;',
                    '}',
                    '',
                    'const activeClasses = classesList',
                    '  .map((item) => ({',
                    '    class_id: item.class_id || \'\',',
                    '    class_name: item.class_name || \'\',',
                    '    category: String(item.category || \'\').trim() || \'꽃 공예\',',
                    '    levelCode: normalizeLevel(item.level || \'\'),',
                    '    levelLabel: getLevelLabel(normalizeLevel(item.level || \'\')),',
                    '    price: Number(item.price || 0),',
                    '    duration_min: Number(item.duration_min || 0),',
                    '    thumbnail_url: item.thumbnail_url || \'\',',
                    '    location: item.location || \'\',',
                    '    regionCode: normalizeRegion(item.region || item.location || \'\'),',
                    '    regionLabel: getRegionLabel(normalizeRegion(item.region || item.location || \'\')),',
                    '    tags: item.tags || \'\',',
                    '    class_count: Number(item.class_count || 0),',
                    '    avg_rating: Number(item.avg_rating || 0),',
                    '    partner_code: item.partner_code || \'\',',
                    '    typeLabel: getTypeLabel(item.type || \'\'),',
                    '    status: normalizeStatus(item.status || \'\'),',
                    '    kit_enabled: Number(item.kit_enabled || 0)',
                    '  }))',
                    '  .filter((item) => item.status === \'ACTIVE\');',
                    '',
                    'const partnerMap = {};',
                    'partnersList.forEach((item) => {',
                    '  partnerMap[item.partner_code] = {',
                    '    partner_code: item.partner_code || \'\',',
                    '    partner_name: item.partner_name || \'\',',
                    '    grade: normalizeGrade(item.grade || \'BLOOM\'),',
                    '    location: item.location || \'\',',
                    '    avg_rating: Number(item.avg_rating || 0),',
                    '    instagram_url: item.instagram_url || \'\',',
                    '    portfolio_url: item.portfolio_url || \'\'',
                    '  };',
                    '});',
                    '',
                    'const partnerClassesMap = {};',
                    'activeClasses.forEach((item) => {',
                    '  if (!partnerClassesMap[item.partner_code]) partnerClassesMap[item.partner_code] = [];',
                    '  partnerClassesMap[item.partner_code].push(item);',
                    '});',
                    '',
                    'const summary = {',
                    '  total_classes: activeClasses.length,',
                    '  total_partners: Object.keys(partnerClassesMap).length,',
                    '  total_beginner_classes: activeClasses.filter((item) => item.levelCode === \'BEGINNER\').length,',
                    '  total_regions: Array.from(new Set(activeClasses.map((item) => item.regionCode).filter(Boolean))).length',
                    '};',
                    '',
                    'const highlights = activeClasses',
                    '  .slice()',
                    '  .sort((a, b) => {',
                    '    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;',
                    '    if (b.class_count !== a.class_count) return b.class_count - a.class_count;',
                    '    return a.price - b.price;',
                    '  })',
                    '  .slice(0, 4)',
                    '  .map((item) => ({',
                    '    class_id: item.class_id,',
                    '    title: item.class_name,',
                    '    category: item.category,',
                    '    partner_name: (partnerMap[item.partner_code] || {}).partner_name || \'\',',
                    '    region_label: item.regionLabel,',
                    '    price: item.price,',
                    '    avg_rating: item.avg_rating,',
                    '    type_label: item.typeLabel,',
                    '    level_label: item.levelLabel,',
                    '    thumbnail_url: item.thumbnail_url,',
                    '    highlight_copy: item.regionLabel + \'에서 예약 가능한 \' + item.category + \' 추천 클래스\'',
                    '  }));',
                    '',
                    'const partnerStories = partnersList',
                    '  .map((partner) => {',
                    '    const related = partnerClassesMap[partner.partner_code] || [];',
                    '    const beginnerCount = related.filter((item) => item.levelCode === \'BEGINNER\').length;',
                    '    const mainCategory = topCategory(related);',
                    '    const regionLabel = getRegionLabel(normalizeRegion(partner.location || (related[0] && related[0].regionCode) || \'\'));',
                    '    let gradeCopy = \'첫 수업부터 신뢰를 쌓는 파트너\';',
                    '    if (normalizeGrade(partner.grade || \'\') === \'AMBASSADOR\') gradeCopy = \'협업과 멘토링까지 확장하는 대표 파트너\';',
                    '    else if (normalizeGrade(partner.grade || \'\') === \'ATELIER\') gradeCopy = \'콘텐츠 허브 인터뷰 대상 파트너\';',
                    '    else if (normalizeGrade(partner.grade || \'\') === \'GARDEN\') gradeCopy = \'재수강이 쌓이는 성장 파트너\';',
                    '    return {',
                    '      partner_code: partner.partner_code || \'\',',
                    '      partner_name: partner.partner_name || \'\',',
                    '      grade: normalizeGrade(partner.grade || \'BLOOM\'),',
                    '      region_label: regionLabel,',
                    '      class_count: related.length,',
                    '      avg_rating: Number(partner.avg_rating || 0),',
                    '      featured_category: mainCategory,',
                    '      headline: regionLabel + \'에서 만나는 \' + (partner.partner_name || \'파트너\'),',
                    '      quote: (partner.partner_name || \'파트너\') + \' 파트너는 \' + mainCategory + \' 중심으로 수강생이 다시 찾는 수업 흐름을 만들고 있습니다.\',',
                    '      focus_points: [',
                    '        gradeCopy,',
                    '        beginnerCount > 0 ? \'입문 클래스 \' + beginnerCount + \'개 운영\' : \'중급 이상 클래스 운영\',',
                    '        partner.instagram_url ? \'인스타그램 포트폴리오 확인 가능\' : \'PRESSCO21 허브 안에서 작품 맥락 노출\'',
                    '      ],',
                    '      search_keyword: partner.partner_name || \'\'',
                    '    };',
                    '  })',
                    '  .filter((item) => item.class_count > 0)',
                    '  .sort((a, b) => {',
                    '    if (b.class_count !== a.class_count) return b.class_count - a.class_count;',
                    '    return b.avg_rating - a.avg_rating;',
                    '  })',
                    '  .slice(0, 4);',
                    '',
                    'const categoryBuckets = {};',
                    'activeClasses.forEach((item) => {',
                    '  if (!categoryBuckets[item.category]) categoryBuckets[item.category] = [];',
                    '  categoryBuckets[item.category].push(item);',
                    '});',
                    '',
                    'const trends = Object.keys(categoryBuckets)',
                    '  .map((category) => {',
                    '    const items = categoryBuckets[category];',
                    '    const regionList = Array.from(new Set(items.map((item) => item.regionLabel))).slice(0, 3);',
                    '    return {',
                    '      title: category + \' 트렌드\',',
                    '      eyebrow: items.length + \'개 클래스가 쌓인 주제\',',
                    '      description: category + \' 카테고리의 활성 클래스가 \' + items.length + \'개 있고, \' + regionList.join(\', \') + \' 중심으로 탐색됩니다.\',',
                    '      category: category,',
                    '      class_count: items.length,',
                    '      chips: regionList.length ? regionList : [\'전국\']',
                    '    };',
                    '  })',
                    '  .sort((a, b) => b.class_count - a.class_count)',
                    '  .slice(0, 4);',
                    '',
                    'const guides = activeClasses',
                    '  .filter((item) => item.levelCode === \'BEGINNER\')',
                    '  .slice()',
                    '  .sort((a, b) => {',
                    '    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;',
                    '    return a.price - b.price;',
                    '  })',
                    '  .slice(0, 4)',
                    '  .map((item) => ({',
                    '    class_id: item.class_id,',
                    '    title: item.class_name,',
                    '    category: item.category,',
                    '    partner_name: (partnerMap[item.partner_code] || {}).partner_name || \'\',',
                    '    region_label: item.regionLabel,',
                    '    price: item.price,',
                    '    level_label: item.levelLabel,',
                    '    checklist: buildGuideChecklist(item, item.levelLabel)',
                    '  }));',
                    '',
                    'return [{',
                    '  json: {',
                    '    success: true,',
                    '    data: {',
                    '      summary: summary,',
                    '      highlights: highlights,',
                    '      partner_stories: partnerStories,',
                    '      trends: trends,',
                    '      guides: guides,',
                    '      featured_message: highlights[0] ? highlights[0].highlight_copy : \'전국 파트너 클래스와 콘텐츠를 한 허브에서 탐색하세요.\',',
                    '      updated_at: new Date().toISOString()',
                    '    },',
                    '    timestamp: new Date().toISOString()',
                    '  }',
                    '}];'
                ].join('\n')
            },
            id: 'wf01c-content-build',
            name: 'Build Content Hub Response',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [1380, 420]
        },
        {
            parameters: {
                respondWith: 'json',
                responseBody: '={{ $json }}',
                options: {}
            },
            id: 'wf01c-content-respond',
            name: 'Respond getContentHub',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1.1,
            position: [1620, 420]
        }
    );

    workflow.connections['Switch Action'] = {
        main: [
            [{ node: 'Check Affiliations Cache', type: 'main', index: 0 }],
            [{ node: 'NocoDB Get Content Classes', type: 'main', index: 0 }],
            [{ node: 'Unknown Action Error', type: 'main', index: 0 }]
        ]
    };
    workflow.connections['Check Affiliations Cache'] = {
        main: [[{ node: 'Switch Affiliations Cache', type: 'main', index: 0 }]]
    };
    workflow.connections['Switch Affiliations Cache'] = {
        main: [
            [{ node: 'Respond getAffiliations', type: 'main', index: 0 }],
            [{ node: 'NocoDB Get Affiliations', type: 'main', index: 0 }]
        ]
    };
    workflow.connections['Format Affiliations'] = {
        main: [[{ node: 'Store Affiliations Cache', type: 'main', index: 0 }]]
    };
    workflow.connections['Store Affiliations Cache'] = {
        main: [[{ node: 'Respond getAffiliations', type: 'main', index: 0 }]]
    };
    workflow.connections['NocoDB Get Content Classes'] = {
        main: [[{ node: 'NocoDB Get Content Partners', type: 'main', index: 0 }]]
    };
    workflow.connections['NocoDB Get Content Partners'] = {
        main: [[{ node: 'Build Content Hub Response', type: 'main', index: 0 }]]
    };
    workflow.connections['Build Content Hub Response'] = {
        main: [[{ node: 'Respond getContentHub', type: 'main', index: 0 }]]
    };

    workflow.nodes.forEach(function (node) {
        if (node.type === 'n8n-nodes-base.respondToWebhook') {
            setResponseHeaders(node, 'https://foreverlove.co.kr');
        }
    });

    return workflow;
}

function buildScheduleReadWorkflow(source) {
    var workflow = buildBaseWorkflow('WF-01B Schedule Read API', source.id || '', source.settings);

    workflow.nodes = [
        {
            parameters: {
                httpMethod: 'POST',
                path: 'class-api-schedule',
                responseMode: 'responseNode',
                options: {}
            },
            id: 'wf01b-webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [220, 300],
            webhookId: 'class-api-schedule'
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// WF-01B Step 1: 스케줄 조회 요청 검증',
                    '// 지원 액션: getSchedules, getRemainingSeats',
                    '// ===================================================',
                    '',
                    'const input = $input.first().json;',
                    'const body = input.body || input || {};',
                    'const action = String(body.action || \'\').trim();',
                    'const classId = String(body.classId || body.id || \'\').trim();',
                    'const allowedActions = new Set([\'getSchedules\', \'getRemainingSeats\']);',
                    '',
                    'if (!allowedActions.has(action)) {',
                    '  return [{',
                    '    json: {',
                    '      _error: true,',
                    '      _status: 400,',
                    '      success: false,',
                    '      error: {',
                    '        code: \'INVALID_ACTION\',',
                    '        message: \'지원하지 않는 schedule action입니다.\'',
                    '      },',
                    '      timestamp: new Date().toISOString()',
                    '    }',
                    '  }];',
                    '}',
                    '',
                    'if (!classId) {',
                    '  return [{',
                    '    json: {',
                    '      _error: true,',
                    '      _status: 200,',
                    '      success: false,',
                    '      error: {',
                    '        code: \'MISSING_PARAMS\',',
                    '        message: \'classId 또는 id 파라미터가 필요합니다.\'',
                    '      },',
                    '      timestamp: new Date().toISOString()',
                    '    }',
                    '  }];',
                    '}',
                    '',
                    'return [{',
                    '  json: {',
                    '    action,',
                    '    classId,',
                    '    _error: false',
                    '  }',
                    '}];'
                ].join('\n')
            },
            id: 'wf01b-parse',
            name: 'Parse Schedule Params',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [440, 300]
        },
        {
            parameters: {
                conditions: {
                    options: {
                        caseSensitive: true
                    },
                    conditions: [
                        {
                            leftValue: '={{ $json._error }}',
                            rightValue: false,
                            operator: {
                                type: 'boolean',
                                operation: 'equals'
                            }
                        }
                    ]
                }
            },
            id: 'wf01b-if-valid',
            name: 'IF Schedule Params Valid',
            type: 'n8n-nodes-base.if',
            typeVersion: 2,
            position: [660, 300]
        },
        {
            parameters: {
                method: 'GET',
                url: '=https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/mschd3d81ad88fb',
                authentication: 'genericCredentialType',
                genericAuthType: 'httpHeaderAuth',
                sendQuery: true,
                queryParameters: {
                    parameters: [
                        {
                            name: 'where',
                            value: '=(class_id,eq,{{ $json.classId }})~and(status,eq,active)'
                        },
                        {
                            name: 'sort',
                            value: 'schedule_date,schedule_time'
                        },
                        {
                            name: 'limit',
                            value: '50'
                        },
                        {
                            name: 'fields',
                            value: 'schedule_id,class_id,schedule_date,schedule_time,capacity,booked_count,status'
                        }
                    ]
                },
                options: {}
            },
            id: 'wf01b-get-schedules',
            name: 'NocoDB Get Schedules',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [900, 220],
            credentials: {
                httpHeaderAuth: {
                    id: 'JmXQGe9254wG4qVZ',
                    name: 'PRESSCO21-NocoDB'
                }
            }
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// WF-01B Step 2: 스케줄 응답 구성',
                    '// ===================================================',
                    '',
                    'const payload = $(\'Parse Schedule Params\').first().json;',
                    'const response = $input.first().json;',
                    'const scheduleList = Array.isArray(response.list) ? response.list : [];',
                    '',
                    'function normalizeStatus(raw) {',
                    '  const text = String(raw || \'\').replace(/\\s+/g, \' \').trim();',
                    '  const upper = text.toUpperCase();',
                    '  if (upper === \'ACTIVE\' || text.toLowerCase() === \'active\') return \'ACTIVE\';',
                    '  if (upper === \'CANCELLED\' || text.toLowerCase() === \'cancelled\') return \'CANCELLED\';',
                    '  return upper || \'UNKNOWN\';',
                    '}',
                    '',
                    'const schedules = scheduleList.map((row) => {',
                    '  const capacity = Number(row.capacity || 0);',
                    '  const bookedCount = Number(row.booked_count || 0);',
                    '  const remaining = Math.max(capacity - bookedCount, 0);',
                    '  return {',
                    '    schedule_id: row.schedule_id || \'\',',
                    '    class_id: row.class_id || payload.classId,',
                    '    schedule_date: row.schedule_date || \'\',',
                    '    schedule_time: row.schedule_time || \'\',',
                    '    capacity: capacity,',
                    '    booked_count: bookedCount,',
                    '    remaining: remaining,',
                    '    status: normalizeStatus(row.status || \'\')',
                    '  };',
                    '});',
                    '',
                    'const summary = schedules.reduce((acc, row) => {',
                    '  acc.schedule_count += 1;',
                    '  acc.total_capacity += Number(row.capacity || 0);',
                    '  acc.total_booked += Number(row.booked_count || 0);',
                    '  acc.total_remaining += Number(row.remaining || 0);',
                    '  if (!acc.next_schedule && row.schedule_date) {',
                    '    acc.next_schedule = {',
                    '      schedule_id: row.schedule_id,',
                    '      schedule_date: row.schedule_date,',
                    '      schedule_time: row.schedule_time,',
                    '      remaining: row.remaining',
                    '    };',
                    '  }',
                    '  return acc;',
                    '}, {',
                    '  class_id: payload.classId,',
                    '  schedule_count: 0,',
                    '  total_capacity: 0,',
                    '  total_booked: 0,',
                    '  total_remaining: 0,',
                    '  next_schedule: null',
                    '});',
                    '',
                    'if (payload.action === \'getSchedules\') {',
                    '  return [{',
                    '    json: {',
                    '      success: true,',
                    '      data: {',
                    '        class_id: payload.classId,',
                    '        schedules: schedules',
                    '      },',
                    '      timestamp: new Date().toISOString()',
                    '    }',
                    '  }];',
                    '}',
                    '',
                    'return [{',
                    '  json: {',
                    '    success: true,',
                    '    data: Object.assign({}, summary, { schedules: schedules }),',
                    '    timestamp: new Date().toISOString()',
                    '  }',
                    '}];'
                ].join('\n')
            },
            id: 'wf01b-format',
            name: 'Format Schedule Response',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [1140, 220]
        },
        {
            parameters: {
                respondWith: 'json',
                responseBody: '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._status; return payload; })() }}',
                options: {
                    responseCode: '={{ $json._status || 200 }}'
                }
            },
            id: 'wf01b-respond-success',
            name: 'Respond Schedule',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1.1,
            position: [1380, 220]
        },
        {
            parameters: {
                respondWith: 'json',
                responseBody: '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._status; return payload; })() }}',
                options: {
                    responseCode: '={{ $json._status || 400 }}'
                }
            },
            id: 'wf01b-respond-error',
            name: 'Respond Schedule Error',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1.1,
            position: [900, 420]
        }
    ];

    setResponseHeaders(workflow.nodes[5], 'https://foreverlove.co.kr');
    setResponseHeaders(workflow.nodes[6], 'https://foreverlove.co.kr');

    workflow.connections = {
        Webhook: {
            main: [[{ node: 'Parse Schedule Params', type: 'main', index: 0 }]]
        },
        'Parse Schedule Params': {
            main: [[{ node: 'IF Schedule Params Valid', type: 'main', index: 0 }]]
        },
        'IF Schedule Params Valid': {
            main: [
                [{ node: 'NocoDB Get Schedules', type: 'main', index: 0 }],
                [{ node: 'Respond Schedule Error', type: 'main', index: 0 }]
            ]
        },
        'NocoDB Get Schedules': {
            main: [[{ node: 'Format Schedule Response', type: 'main', index: 0 }]]
        },
        'Format Schedule Response': {
            main: [[{ node: 'Respond Schedule', type: 'main', index: 0 }]]
        }
    };

    return workflow;
}

function buildRouterWorkflow(source) {
    var workflow = buildBaseWorkflow('WF-01 Class API', source.id || '', source.settings);

    workflow.nodes = [
        {
            parameters: {
                httpMethod: 'POST',
                path: 'class-api',
                responseMode: 'responseNode',
                options: {}
            },
            id: 'wf01-router-webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [220, 320],
            webhookId: 'class-api'
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// WF-01 Router: action -> 하위 워크플로우 라우팅 정보 구성',
                    '// ===================================================',
                    '',
                    'const input = $input.first().json;',
                    'const body = input.body || input || {};',
                    'const action = String(body.action || \'\').trim();',
                    '',
                    'const classReadActions = new Set([\'getClasses\', \'getClassDetail\', \'getCategories\']);',
                    'const scheduleReadActions = new Set([\'getSchedules\', \'getRemainingSeats\']);',
                    'const affiliationReadActions = new Set([\'getAffiliations\', \'getSeminars\', \'getAffiliationDetail\', \'getVocabulary\', \'getContentHub\']);',
                    '',
                    'let routeGroup = \'invalid\';',
                    'if (classReadActions.has(action)) {',
                    '  routeGroup = \'classRead\';',
                    '} else if (scheduleReadActions.has(action)) {',
                    '  routeGroup = \'scheduleRead\';',
                    '} else if (affiliationReadActions.has(action)) {',
                    '  routeGroup = \'affiliationRead\';',
                    '}',
                    '',
                    'return [{',
                    '  json: {',
                    '    _action: action,',
                    '    _routeGroup: routeGroup,',
                    '    _forwardBody: body',
                    '  }',
                    '}];'
                ].join('\n')
            },
            id: 'wf01-router-parse',
            name: 'Parse Route Request',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [460, 320]
        },
        {
            parameters: {
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
                                        leftValue: '={{ $json._routeGroup }}',
                                        rightValue: 'classRead',
                                        operator: {
                                            type: 'string',
                                            operation: 'equals'
                                        }
                                    }
                                ]
                            },
                            renameOutput: true,
                            outputKey: 'classRead'
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
                                        leftValue: '={{ $json._routeGroup }}',
                                        rightValue: 'scheduleRead',
                                        operator: {
                                            type: 'string',
                                            operation: 'equals'
                                        }
                                    }
                                ]
                            },
                            renameOutput: true,
                            outputKey: 'scheduleRead'
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
                                        leftValue: '={{ $json._routeGroup }}',
                                        rightValue: 'affiliationRead',
                                        operator: {
                                            type: 'string',
                                            operation: 'equals'
                                        }
                                    }
                                ]
                            },
                            renameOutput: true,
                            outputKey: 'affiliationRead'
                        }
                    ]
                },
                options: {
                    fallbackOutput: 'extra'
                }
            },
            id: 'wf01-router-switch',
            name: 'Switch Route Group',
            type: 'n8n-nodes-base.switch',
            typeVersion: 3.2,
            position: [700, 320]
        },
        {
            parameters: {
                method: 'POST',
                url: 'https://n8n.pressco21.com/webhook/class-api-read',
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '={{ JSON.stringify($json._forwardBody) }}',
                options: {
                    response: {
                        response: {
                            fullResponse: true,
                            neverError: true
                        }
                    }
                }
            },
            id: 'wf01-router-call-class',
            name: 'Call WF-01A Class Read',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [980, 160]
        },
        {
            parameters: {
                method: 'POST',
                url: 'https://n8n.pressco21.com/webhook/class-api-schedule',
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '={{ JSON.stringify($json._forwardBody) }}',
                options: {
                    response: {
                        response: {
                            fullResponse: true,
                            neverError: true
                        }
                    }
                }
            },
            id: 'wf01-router-call-schedule',
            name: 'Call WF-01B Schedule Read',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [980, 320]
        },
        {
            parameters: {
                method: 'POST',
                url: 'https://n8n.pressco21.com/webhook/class-api-affiliation',
                sendBody: true,
                specifyBody: 'json',
                jsonBody: '={{ JSON.stringify($json._forwardBody) }}',
                options: {
                    response: {
                        response: {
                            fullResponse: true,
                            neverError: true
                        }
                    }
                }
            },
            id: 'wf01-router-call-affiliation',
            name: 'Call WF-01C Affiliation Read',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [980, 480]
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// Router downstream 응답 포맷 정리',
                    '// ===================================================',
                    '',
                    'const response = $input.first().json || {};',
                    'let body = response.body;',
                    'const statusCode = Number(response.statusCode || 200);',
                    '',
                    'if (typeof body === \'string\') {',
                    '  try {',
                    '    body = JSON.parse(body);',
                    '  } catch (error) {',
                    '    body = {',
                    '      success: false,',
                    '      _status: 502,',
                    '      error: {',
                    '        code: \'DOWNSTREAM_RESPONSE_PARSE_FAILED\',',
                    '        message: \'하위 워크플로우 응답을 해석하지 못했습니다.\'',
                    '      },',
                    '      timestamp: new Date().toISOString()',
                    '    };',
                    '  }',
                    '}',
                    '',
                    'if (!body || typeof body !== \'object\') {',
                    '  body = {',
                    '    success: false,',
                    '    _status: statusCode || 502,',
                    '    error: {',
                    '      code: \'EMPTY_DOWNSTREAM_RESPONSE\',',
                    '      message: \'하위 워크플로우 응답이 비어 있습니다.\'',
                    '    },',
                    '    timestamp: new Date().toISOString()',
                    '  };',
                    '}',
                    '',
                    'if (typeof body._status === \'undefined\') {',
                    '  body._status = statusCode || 200;',
                    '}',
                    '',
                    'return [{ json: body }];'
                ].join('\n')
            },
            id: 'wf01-router-unwrap',
            name: 'Unwrap Routed Response',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [1240, 320]
        },
        {
            parameters: {
                jsCode: [
                    '// ===================================================',
                    '// Router fallback: 지원하지 않는 action',
                    '// ===================================================',
                    '',
                    'const action = String($input.first().json._action || \'\').trim();',
                    '',
                    'return [{',
                    '  json: {',
                    '    success: false,',
                    '    _status: 400,',
                    '    error: {',
                    '      code: \'INVALID_ACTION\',',
                    '      message: action ? `알 수 없는 요청입니다: ${action}` : \'지원하지 않는 action입니다.\'',
                    '    },',
                    '    timestamp: new Date().toISOString()',
                    '  }',
                    '}];'
                ].join('\n')
            },
            id: 'wf01-router-invalid',
            name: 'Unknown Action Error',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [980, 700]
        },
        {
            parameters: {
                respondWith: 'json',
                responseBody: '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._status; return payload; })() }}',
                options: {
                    responseCode: '={{ $json._status || 200 }}'
                }
            },
            id: 'wf01-router-respond-success',
            name: 'Respond Routed Success',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1.1,
            position: [1480, 320]
        },
        {
            parameters: {
                respondWith: 'json',
                responseBody: '={{ (() => { const payload = JSON.parse(JSON.stringify($json)); delete payload._status; return payload; })() }}',
                options: {
                    responseCode: '={{ $json._status || 400 }}'
                }
            },
            id: 'wf01-router-respond-error',
            name: 'Respond Routed Error',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1.1,
            position: [1240, 700]
        }
    ];

    setResponseHeaders(workflow.nodes[8], 'https://foreverlove.co.kr');
    setResponseHeaders(workflow.nodes[9], 'https://foreverlove.co.kr');

    workflow.connections = {
        Webhook: {
            main: [[{ node: 'Parse Route Request', type: 'main', index: 0 }]]
        },
        'Parse Route Request': {
            main: [[{ node: 'Switch Route Group', type: 'main', index: 0 }]]
        },
        'Switch Route Group': {
            main: [
                [{ node: 'Call WF-01A Class Read', type: 'main', index: 0 }],
                [{ node: 'Call WF-01B Schedule Read', type: 'main', index: 0 }],
                [{ node: 'Call WF-01C Affiliation Read', type: 'main', index: 0 }],
                [{ node: 'Unknown Action Error', type: 'main', index: 0 }]
            ]
        },
        'Call WF-01A Class Read': {
            main: [[{ node: 'Unwrap Routed Response', type: 'main', index: 0 }]]
        },
        'Call WF-01B Schedule Read': {
            main: [[{ node: 'Unwrap Routed Response', type: 'main', index: 0 }]]
        },
        'Call WF-01C Affiliation Read': {
            main: [[{ node: 'Unwrap Routed Response', type: 'main', index: 0 }]]
        },
        'Unwrap Routed Response': {
            main: [[{ node: 'Respond Routed Success', type: 'main', index: 0 }]]
        },
        'Unknown Action Error': {
            main: [[{ node: 'Respond Routed Error', type: 'main', index: 0 }]]
        }
    };

    return workflow;
}

function main() {
    var args = parseArgs(process.argv);
    var classSource = readJson(args.classSource);
    var scheduleSource = readJson(args.scheduleSource);
    var affiliationSource = readJson(args.affiliationSource);
    var routerSource = readJson(args.routerSource);
    var classReadWorkflow = buildClassReadWorkflow(classSource, indexNodes(classSource));
    var scheduleReadWorkflow = buildScheduleReadWorkflow(scheduleSource);
    var affiliationReadWorkflow = buildAffiliationReadWorkflow(affiliationSource, indexNodes(affiliationSource));
    var routerWorkflow = buildRouterWorkflow(routerSource);

    if (!fs.existsSync(args.targetDir)) {
        fs.mkdirSync(args.targetDir, { recursive: true });
    }

    writeJson(path.join(args.targetDir, 'WF-01A-class-read.json'), classReadWorkflow);
    writeJson(path.join(args.targetDir, 'WF-01B-schedule-read.json'), scheduleReadWorkflow);
    writeJson(path.join(args.targetDir, 'WF-01C-affiliation-read.json'), affiliationReadWorkflow);
    writeJson(path.join(args.targetDir, 'WF-01-class-api.json'), routerWorkflow);

    console.log('Generated WF-01 split workflows in ' + args.targetDir);
}

main();
