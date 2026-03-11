#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function writeJson(relativePath, value) {
    fs.writeFileSync(path.join(REPO_ROOT, relativePath), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function findNode(workflow, name) {
    var i;
    for (i = 0; i < workflow.nodes.length; i++) {
        if (workflow.nodes[i].name === name) {
            return workflow.nodes[i];
        }
    }
    throw new Error('Node not found: ' + name);
}

function replaceOnce(source, before, after, label) {
    if (source.indexOf(after) !== -1) {
        return source;
    }
    if (source.indexOf(before) === -1) {
        throw new Error('Pattern not found for ' + label);
    }
    return source.replace(before, after);
}

function patchWf01() {
    var relativePath = '파트너클래스/n8n-workflows/WF-01A-class-read.json';
    var workflow = readJson(relativePath);
    var detailNode = findNode(workflow, 'Build Detail Response');
    var detailCode = detailNode.parameters.jsCode;

    detailCode = replaceOnce(
        detailCode,
        "    kit_enabled: Number(c.kit_enabled) || 0,\n    kit_items: normalizeKitItems(c.kit_items)\n  },\n  timestamp: new Date().toISOString()\n} }];",
        "    kit_enabled: Number(c.kit_enabled) || 0,\n    kit_items: normalizeKitItems(c.kit_items),\n    kit_bundle_branduid: extractBrandUid(c.kit_bundle_branduid || '')\n  },\n  timestamp: new Date().toISOString()\n} }];",
        'WF-01A Build Detail Response'
    );

    detailNode.parameters.jsCode = detailCode;
    writeJson(relativePath, workflow);
}

function patchWf16() {
    var relativePath = '파트너클래스/n8n-workflows/WF-16-class-register.json';
    var workflow = readJson(relativePath);
    var validateNode = findNode(workflow, 'Validate Input');
    var createNode = findNode(workflow, 'NocoDB Create Class');
    var validateCode = validateNode.parameters.jsCode;
    var bodyParameters = createNode.parameters.bodyParameters.parameters;

    validateCode = replaceOnce(
        validateCode,
        "const kitEnabled = Number(body.kit_enabled) === 1 ? 1 : 0;\nconst kitItems = Array.isArray(body.kit_items) ? body.kit_items.slice(0, 20).map((k) => ({\n  name: sanitizeText(k && k.name, 100),\n  product_url: normalizeKitProductUrl(k && (k.product_url || k.product_code || '')),\n  quantity: Math.min(Math.max(parseInt(k && k.quantity, 10) || 1, 1), 99),\n  price: Math.max(parseInt(k && k.price, 10) || 0, 0)\n})).filter((k) => k.name || k.product_url) : [];\n",
        "const kitEnabled = Number(body.kit_enabled) === 1 ? 1 : 0;\nconst kitItems = Array.isArray(body.kit_items) ? body.kit_items.slice(0, 20).map((k) => ({\n  name: sanitizeText(k && k.name, 100),\n  product_url: normalizeKitProductUrl(k && (k.product_url || k.product_code || '')),\n  quantity: Math.min(Math.max(parseInt(k && k.quantity, 10) || 1, 1), 99),\n  price: Math.max(parseInt(k && k.price, 10) || 0, 0)\n})).filter((k) => k.name || k.product_url) : [];\nconst kitBundleBrandUid = extractBrandUid(body.kit_bundle_branduid || body.kitBundleBranduid || '');\n",
        'WF-16 Validate Input bundle parse'
    );

    validateCode = replaceOnce(
        validateCode,
        "    kitItems,\n    _safe: {\n",
        "    kitItems,\n    kitBundleBrandUid,\n    _safe: {\n",
        'WF-16 Validate Input return'
    );

    validateNode.parameters.jsCode = validateCode;

    if (!bodyParameters.some(function(param) { return param.name === 'kit_bundle_branduid'; })) {
        bodyParameters.splice(bodyParameters.length - 1, 0, {
            name: 'kit_bundle_branduid',
            value: '={{ $json.kitBundleBrandUid || "" }}'
        });
    }

    writeJson(relativePath, workflow);
}

function patchWf20() {
    var relativePath = '파트너클래스/n8n-workflows/WF-20-class-edit.json';
    var workflow = readJson(relativePath);
    var codeNode = findNode(workflow, 'Process Edit');
    var code = codeNode.parameters.jsCode;

    code = replaceOnce(
        code,
        "  const allowedFields = ['class_name', 'description', 'price', 'category', 'level', 'duration_min', 'max_students', 'thumbnail_url', 'image_urls', 'instructor_bio', 'location', 'materials_included', 'youtube_video_id', 'tags', 'kit_enabled', 'kit_items'];\n",
        "  const allowedFields = ['class_name', 'description', 'price', 'category', 'level', 'duration_min', 'max_students', 'thumbnail_url', 'image_urls', 'instructor_bio', 'location', 'materials_included', 'youtube_video_id', 'tags', 'kit_enabled', 'kit_items', 'kit_bundle_branduid'];\n",
        'WF-20 allowedFields'
    );

    code = replaceOnce(
        code,
        "  if (updateData.kit_items !== undefined) {\n    const normalizedKitItems = normalizeKitItems(updateData.kit_items);\n    if (nextKitEnabled === 1) {\n      if (normalizedKitItems.length === 0) {\n        return [{json: {success: false, message: 'kit item required when kit is enabled', statusCode: 400}}];\n      }\n      for (const item of normalizedKitItems) {\n        if (!item.name || !item.product_url) {\n          return [{json: {success: false, message: 'invalid kit item', statusCode: 400}}];\n        }\n      }\n    }\n    updateData.kit_items = JSON.stringify(normalizedKitItems);\n  }\n\n  if (updateData.price !== undefined) {\n",
        "  if (updateData.kit_items !== undefined) {\n    const normalizedKitItems = normalizeKitItems(updateData.kit_items);\n    if (nextKitEnabled === 1) {\n      if (normalizedKitItems.length === 0) {\n        return [{json: {success: false, message: 'kit item required when kit is enabled', statusCode: 400}}];\n      }\n      for (const item of normalizedKitItems) {\n        if (!item.name || !item.product_url) {\n          return [{json: {success: false, message: 'invalid kit item', statusCode: 400}}];\n        }\n      }\n    }\n    updateData.kit_items = JSON.stringify(normalizedKitItems);\n  }\n\n  if (updateData.kit_bundle_branduid !== undefined) {\n    const normalizedBundleBrandUid = extractBrandUid(updateData.kit_bundle_branduid || '');\n    if (String(updateData.kit_bundle_branduid || '').trim() && !normalizedBundleBrandUid) {\n      return [{json: {success: false, message: 'invalid kit bundle branduid', statusCode: 400}}];\n    }\n    updateData.kit_bundle_branduid = nextKitEnabled === 1 ? normalizedBundleBrandUid : '';\n  }\n\n  if (updateData.price !== undefined) {\n",
        'WF-20 bundle normalize'
    );

    codeNode.parameters.jsCode = code;
    writeJson(relativePath, workflow);
}

function patchWf05() {
    var relativePath = '파트너클래스/n8n-workflows/WF-05-order-polling-batch.json';
    var workflow = readJson(relativePath);
    var classesMapNode = findNode(workflow, 'NocoDB Get Classes Map');
    var filterNode = findNode(workflow, 'Filter Class Orders');
    var processKitNode = findNode(workflow, 'Process Kit Order');

    classesMapNode.parameters.queryParameters.parameters = classesMapNode.parameters.queryParameters.parameters.map(function(param) {
        if (param.name === 'fields') {
            param.value = 'class_id,makeshop_product_id,partner_code,class_name,location,price,kit_enabled,kit_items,kit_bundle_branduid';
        }
        return param;
    });

    filterNode.parameters.jsCode = [
        '// ===================================================',
        '// WF-05 5a-2: 주문 목록 + 클래스맵 결합, 클래스 상품만 필터링',
        '// 같은 order_id 안에 묶음 키트 상품이 함께 담겼는지 감지',
        '// ===================================================',
        '',
        "const ordersResponse = $('Makeshop Search Orders').first().json;",
        "const classesResponse = $('NocoDB Get Classes Map').first().json;",
        "const pollMeta = $('Parse Poll Time').first().json;",
        '',
        'const orders = ordersResponse.list || ordersResponse.datas || [];',
        'const classesList = classesResponse.list || [];',
        '',
        'function extractBrandUid(raw) {',
        "  const text = String(raw || '').replace(/\\s+/g, '').trim();",
        "  const match = text.match(/[?&]branduid=([^&#]+)/i);",
        '  if (match && match[1]) return decodeURIComponent(match[1]);',
        "  if (/^[A-Za-z0-9_-]{4,64}$/.test(text)) return text;",
        "  return '';",
        '}',
        '',
        'const classMap = {};',
        'for (const c of classesList) {',
        "  const pid = String(c.makeshop_product_id || '').trim();",
        '  if (!pid) continue;',
        "  let partnerCode = '';",
        '  if (Array.isArray(c.partner_code) && c.partner_code.length > 0) {',
        "    partnerCode = c.partner_code[0].partner_code || c.partner_code[0].Title || '';",
        "  } else if (typeof c.partner_code === 'string') {",
        '    partnerCode = c.partner_code;',
        '  }',
        '  classMap[pid] = {',
        "    class_id: c.class_id || '',",
        "    class_name: c.class_name || '',",
        '    partner_code: partnerCode,',
        "    location: c.location || '',",
        "    price: Number(c.price) || 0,",
        "    kit_enabled: Number(c.kit_enabled) || 0,",
        "    kit_items: c.kit_items || '',",
        "    kit_bundle_branduid: extractBrandUid(c.kit_bundle_branduid || '')",
        '  };',
        '}',
        '',
        'const orderGroups = {};',
        'for (const order of orders) {',
        "  const orderId = String(order.order_id || order.orderno || '').trim();",
        "  const branduid = String(order.branduid || '').trim();",
        '  if (!orderId) continue;',
        '  if (!orderGroups[orderId]) {',
        '    orderGroups[orderId] = {',
        '      order_id: orderId,',
        "      member_id: String(order.member_id || order.userid || '').trim(),",
        "      buyer_name: String(order.buyer_name || order.name || '').trim(),",
        "      buyer_email: String(order.buyer_email || order.email || '').trim(),",
        "      buyer_phone: String(order.buyer_phone || order.phone || '').trim(),",
        '      lines: [],',
        '      branduids: []',
        '    };',
        '  }',
        '  orderGroups[orderId].lines.push({',
        '    order_id: orderId,',
        '    branduid: branduid,',
        "    option_value: String(order.option_value || order.option || '').trim(),",
        "    quantity: Number(order.quantity || order.ea || 1),",
        "    settle_price: Number(order.settle_price || order.price || 0),",
        "    product_name: String(order.product_name || order.goods_name || '').trim()",
        '  });',
        '  if (branduid && orderGroups[orderId].branduids.indexOf(branduid) === -1) {',
        '    orderGroups[orderId].branduids.push(branduid);',
        '  }',
        '}',
        '',
        'const classOrders = [];',
        'for (const orderId of Object.keys(orderGroups)) {',
        '  const group = orderGroups[orderId];',
        '  let classLine = null;',
        '  let classData = null;',
        '  for (const line of group.lines) {',
        '    if (line.branduid && classMap[line.branduid]) {',
        '      classLine = line;',
        '      classData = classMap[line.branduid];',
        '      break;',
        '    }',
        '  }',
        '  if (!classLine || !classData) continue;',
        '',
        "  const bundleBrandUid = String(classData.kit_bundle_branduid || '').trim();",
        '  let bundleLine = null;',
        '  if (bundleBrandUid) {',
        '    bundleLine = group.lines.find((line) => line.branduid === bundleBrandUid) || null;',
        '  }',
        '',
        '  classOrders.push({',
        '    order_id: group.order_id,',
        '    branduid: classLine.branduid,',
        '    member_id: group.member_id,',
        '    buyer_name: group.buyer_name,',
        '    buyer_email: group.buyer_email,',
        '    buyer_phone: group.buyer_phone,',
        '    option_value: classLine.option_value,',
        '    quantity: classLine.quantity,',
        '    settle_price: classLine.settle_price,',
        '    classData: classData,',
        '    all_branduids: group.branduids,',
        '    order_lines: group.lines,',
        '    bundle_branduid: bundleBrandUid,',
        '    bundle_line: bundleLine,',
        '    kitBundleSelected: !!bundleLine',
        '  });',
        '}',
        '',
        'return [{',
        '  json: {',
        '    totalOrders: orders.length,',
        '    classOrders,',
        '    classOrderCount: classOrders.length,',
        '    pollMeta',
        '  }',
        '}];'
    ].join('\n');

    processKitNode.parameters.jsCode = [
        '// ===================================================',
        '// WF-05 5a-6c: 재료키트 자동 배송 처리',
        '// 묶음 키트 상품이 실제로 함께 결제된 주문만 키트 발송 처리',
        '// ===================================================',
        '',
        "const https = require('https');",
        "const settlement = $('Calc Commission').item.json.settlement;",
        "const createResult = $('Create Settlement').first().json;",
        "const orderContext = $('Check Dup Result').item.json;",
        '',
        'if ((!createResult.Id && !createResult.id) || !orderContext || !orderContext.kitBundleSelected) {',
        '  return [$input.first()];',
        '}',
        '',
        "const classId = settlement.class_id;",
        '',
        'function nocoRequest(method, path, body) {',
        '  return new Promise((resolve, reject) => {',
        '    const options = {',
        "      hostname: 'nocodb.pressco21.com',",
        "      path: '/api/v1/db/data/noco/' + $env.NOCODB_PROJECT_ID + path,",
        '      method: method,',
        '      headers: {',
        "        'xc-token': $env.NOCODB_API_TOKEN,",
        "        'Content-Type': 'application/json'",
        '      }',
        '    };',
        '    const req = https.request(options, (res) => {',
        "      let data = '';",
        "      res.on('data', (chunk) => data += chunk);",
        "      res.on('end', () => {",
        '        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }',
        '      });',
        '    });',
        '    req.on(\'error\', reject);',
        '    if (body) req.write(JSON.stringify(body));',
        '    req.end();',
        '  });',
        '}',
        '',
        'function sendTelegram(message) {',
        '  return new Promise((resolve, reject) => {',
        "    const chatId = $env.TELEGRAM_CHAT_ID || '7713811206';",
        "    const postData = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });",
        '    const options = {',
        "      hostname: 'api.telegram.org',",
        "      path: '/bot' + $env.TELEGRAM_BOT_TOKEN + '/sendMessage',",
        "      method: 'POST',",
        "      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }",
        '    };',
        '    const req = https.request(options, (res) => {',
        "      let data = '';",
        "      res.on('data', (chunk) => data += chunk);",
        "      res.on('end', () => resolve(data));",
        '    });',
        '    req.on(\'error\', reject);',
        '    req.write(postData);',
        '    req.end();',
        '  });',
        '}',
        '',
        'function extractBrandUid(raw) {',
        "  const text = String(raw || '').replace(/\\s+/g, '').trim();",
        "  const match = text.match(/[?&]branduid=([^&#]+)/i);",
        '  if (match && match[1]) return decodeURIComponent(match[1]);',
        "  if (/^[A-Za-z0-9_-]{4,64}$/.test(text)) return text;",
        "  return '';",
        '}',
        '',
        'function normalizeKitProductUrl(raw) {',
        "  const text = String(raw || '').trim();",
        "  if (!text) return '';",
        '  const brandUid = extractBrandUid(text);',
        '  if (brandUid) {',
        "    return '/shop/shopdetail.html?branduid=' + encodeURIComponent(brandUid);",
        '  }',
        "  if (/^https?:\\/\\//i.test(text) || text.indexOf('/shop/') === 0) {",
        '    return text;',
        '  }',
        "  return '';",
        '}',
        '',
        'try {',
        "  const classResult = await nocoRequest('GET', '/mpvsno4or6asbxk?where=(class_id,eq,' + encodeURIComponent(classId) + ')&fields=class_id,class_name,kit_enabled,kit_items,kit_bundle_branduid&limit=1');",
        '  const classList = classResult.list || [];',
        '  if (classList.length === 0) return [$input.first()];',
        '',
        '  const cls = classList[0];',
        "  const kitEnabled = Number(cls.kit_enabled) || 0;",
        "  const expectedBundleBrandUid = extractBrandUid(cls.kit_bundle_branduid || orderContext.bundle_branduid || '');",
        "  const actualBundleBrandUid = extractBrandUid(orderContext.bundle_line && orderContext.bundle_line.branduid || '');",
        '  if (kitEnabled !== 1 || !expectedBundleBrandUid || expectedBundleBrandUid !== actualBundleBrandUid) {',
        '    return [$input.first()];',
        '  }',
        '',
        "  let kitItems = [];",
        "  try { kitItems = cls.kit_items ? JSON.parse(cls.kit_items) : []; } catch (e) {}",
        '  if (!Array.isArray(kitItems) || kitItems.length === 0) return [$input.first()];',
        '',
        "  let itemsList = '';",
        '  for (const item of kitItems) {',
        "    const qty = (item.quantity || 1) * (settlement.student_count || 1);",
        "    const productUrl = normalizeKitProductUrl(item.product_url || item.product_code || '');",
        "    const price = Math.max(parseInt(item.price, 10) || 0, 0);",
        "    itemsList += '  - ' + (item.name || '재료') + ' x ' + qty;",
        "    if (price > 0) itemsList += ' / 예상가 ' + price.toLocaleString('ko-KR') + '원';",
        "    if (productUrl) itemsList += ' / ' + productUrl;",
        "    itemsList += '\\n';",
        '  }',
        '',
        "  const bundleQty = orderContext.bundle_line && orderContext.bundle_line.quantity ? orderContext.bundle_line.quantity : (settlement.student_count || 1);",
        "  const bundlePrice = orderContext.bundle_line && orderContext.bundle_line.settle_price ? Number(orderContext.bundle_line.settle_price) : 0;",
        "  const msg = '📦 <b>재료키트 배송 요청</b>\\n\\n'",
        "    + '<b>클래스:</b> ' + (cls.class_name || classId) + '\\n'",
        "    + '<b>수강생:</b> ' + (settlement.student_name || '-') + '\\n'",
        "    + '<b>연락처:</b> ' + (settlement.student_phone || '-') + '\\n'",
        "    + '<b>수강일:</b> ' + (settlement.class_date || '-') + '\\n'",
        "    + '<b>클래스 수량:</b> ' + (settlement.student_count || 1) + '명\\n'",
        "    + '<b>묶음 키트 수량:</b> ' + bundleQty + '개\\n'",
        "    + (bundlePrice > 0 ? '<b>묶음 키트 결제액:</b> ' + bundlePrice.toLocaleString('ko-KR') + '원\\n\\n' : '\\n')",
        "    + '<b>키트 구성:</b>\\n' + itemsList + '\\n'",
        "    + '주문번호: ' + (settlement.order_id || '-');",
        '',
        '  try {',
        '    await sendTelegram(msg);',
        '  } catch (e) {',
        '    // 텔레그램 실패해도 정산은 정상 처리',
        '  }',
        '} catch (e) {',
        '  // kit 처리 실패해도 정산은 이미 생성됨 - 로그만',
        '}',
        '',
        'return [$input.first()];'
    ].join('\n');

    writeJson(relativePath, workflow);
}

function patchWf17() {
    var relativePath = '파트너클래스/n8n-workflows/WF-17-class-approve-auto.json';
    var workflow = readJson(relativePath);
    var parseNode = findNode(workflow, 'Parse NocoDB Webhook');
    var registerNode = findNode(workflow, 'Register MakeShop Product');
    var updateNode = findNode(workflow, 'Update NocoDB Class');
    var ifNode;

    parseNode.parameters.jsCode = [
        '// ===================================================',
        '// WF-17 Step 1: NocoDB Webhook 파싱',
        '// ACTIVE 클래스에서 클래스 상품 또는 묶음 키트 상품이 비어 있으면 순차 생성',
        '// ===================================================',
        '',
        "const input = $input.first().json;",
        "const body = input.body || input;",
        '',
        'function normalizeStatus(raw) {',
        "  const text = String(raw || '').replace(/\\s+/g, ' ').trim();",
        "  const upper = text.toUpperCase();",
        "  if (!text) return '';",
        "  if (upper === 'ACTIVE' || text.toLowerCase() === 'active') return 'ACTIVE';",
        "  if (upper === 'PAUSED' || text.toLowerCase() === 'paused') return 'PAUSED';",
        "  if (upper === 'PENDING_REVIEW' || upper === 'INACTIVE' || text.toLowerCase() === 'pending') return 'PENDING_REVIEW';",
        "  if (upper === 'REJECTED' || text.toLowerCase() === 'closed') return 'REJECTED';",
        "  if (upper === 'ARCHIVED') return 'ARCHIVED';",
        '  return upper;',
        '}',
        '',
        'function extractBrandUid(raw) {',
        "  const text = String(raw || '').replace(/\\s+/g, '').trim();",
        "  const match = text.match(/[?&]branduid=([^&#]+)/i);",
        '  if (match && match[1]) return decodeURIComponent(match[1]);',
        "  if (/^[A-Za-z0-9_-]{4,64}$/.test(text)) return text;",
        "  return '';",
        '}',
        '',
        'function parseKitItems(raw) {',
        "  let parsed = raw || [];",
        "  if (typeof raw === 'string') {",
        "    try { parsed = JSON.parse(raw); } catch (e) { parsed = []; }",
        '  }',
        '  if (!Array.isArray(parsed)) return [];',
        '  return parsed;',
        '}',
        '',
        'let record = {};',
        'if (body.data && body.data.rows && body.data.rows.length > 0) {',
        '  record = body.data.rows[0];',
        '} else if (body.rows && body.rows.length > 0) {',
        '  record = body.rows[0];',
        '} else {',
        '  record = body;',
        '}',
        '',
        "const currentStatus = normalizeStatus(record.status || '');",
        "if (currentStatus !== 'ACTIVE') {",
        "  return [{ json: { _skip: true, _skipReason: 'status가 ACTIVE가 아님: ' + currentStatus, _timestamp: new Date().toISOString() } }];",
        '}',
        '',
        "const nocodbRowId = String(record.Id || record.id || '').trim();",
        "const classId = String(record.class_id || '').trim();",
        "const title = String(record.title || record.class_name || '').trim();",
        "const price = parseInt(record.price || 0, 10);",
        "const partnerCode = String(record.partner_code || '').trim();",
        "const maxStudents = parseInt(record.max_students || 10, 10);",
        "const description = String(record.description || title + ' 강의 안내').trim().substring(0, 1000);",
        "const location = String(record.location || record.region || '').trim();",
        "const imageUrl = String(record.image_url || '').trim();",
        "const existingProductId = String(record.makeshop_product_id || '').trim();",
        "const existingBundleBrandUid = extractBrandUid(record.kit_bundle_branduid || '');",
        "const kitEnabled = Number(record.kit_enabled) === 1 ? 1 : 0;",
        'const kitItems = parseKitItems(record.kit_items);',
        'let bundlePrice = 0;',
        "let bundleDescription = title + ' 재료 키트 구성';",
        '',
        'for (const item of kitItems) {',
        "  const qty = Math.max(parseInt(item && item.quantity, 10) || 1, 1);",
        "  const unitPrice = Math.max(parseInt(item && item.price, 10) || 0, 0);",
        '  bundlePrice += unitPrice * qty;',
        "  bundleDescription += '\\n- ' + String(item && item.name || '재료') + ' x ' + qty;",
        '  if (unitPrice > 0) {',
        "    bundleDescription += ' (' + unitPrice.toLocaleString('ko-KR') + '원)';",
        '  }',
        '}',
        '',
        'const needClassProduct = !existingProductId || existingProductId === "0";',
        'const needKitBundle = kitEnabled === 1 && kitItems.length > 0 && bundlePrice > 0 && !existingBundleBrandUid;',
        '',
        'if (!needClassProduct && !needKitBundle) {',
        "  return [{ json: { _skip: true, _skipReason: '생성할 메이크샵 상품 없음', _timestamp: new Date().toISOString() } }];",
        '}',
        '',
        "if (!nocodbRowId || !title || !price) {",
        "  return [{ json: { _skip: true, _skipReason: 'Id, title, price 중 누락: ' + JSON.stringify({ nocodbRowId, title, price }), _timestamp: new Date().toISOString() } }];",
        '}',
        "if (!partnerCode) {",
        "  return [{ json: { _skip: true, _skipReason: 'partner_code 누락 — 파트너 승인 후 강의를 등록해야 합니다', _timestamp: new Date().toISOString() } }];",
        '}',
        '',
        "const productKind = needClassProduct ? 'CLASS' : 'KIT_BUNDLE';",
        "const productTitle = productKind === 'CLASS' ? title : (title + ' 재료 키트');",
        "const productPrice = productKind === 'CLASS' ? price : bundlePrice;",
        "const productQuantity = productKind === 'CLASS' ? maxStudents : 999;",
        "const productDescription = productKind === 'CLASS' ? description : bundleDescription.substring(0, 1000);",
        "const updateField = productKind === 'CLASS' ? 'makeshop_product_id' : 'kit_bundle_branduid';",
        '',
        'return [{ json: {',
        '  _skip: false,',
        '  _nocodbRowId: nocodbRowId,',
        '  _classId: classId,',
        '  _title: productTitle,',
        '  _price: productPrice,',
        '  _productQuantity: productQuantity,',
        '  _description: productDescription,',
        '  _partnerCode: partnerCode,',
        '  _maxStudents: maxStudents,',
        '  _location: location,',
        '  _imageUrl: imageUrl,',
        '  _timestamp: new Date().toISOString(),',
        '  _productKind: productKind,',
        '  _updateField: updateField,',
        '  _classTitle: title,',
        '  _classPrice: price,',
        '  _bundlePrice: bundlePrice',
        '} }];'
    ].join('\n');

    registerNode.parameters.bodyParameters.parameters = registerNode.parameters.bodyParameters.parameters.map(function(param) {
        if (param.name === 'product_name') param.value = "={{ $('Process Partner Data').first().json._title }}";
        if (param.name === 'sellprice') param.value = "={{ $('Process Partner Data').first().json._price }}";
        if (param.name === 'quantity') param.value = "={{ $('Process Partner Data').first().json._productQuantity }}";
        if (param.name === 'product_content') param.value = "={{ $('Process Partner Data').first().json._description }}";
        return param;
    });

    updateNode.parameters.jsonBody = '={{ JSON.stringify({ [$json._updateField || "makeshop_product_id"]: $json._branduid }) }}';

    ifNode = workflow.nodes.filter(function(node) {
        return node.name === 'IF Product Kind Class';
    })[0];

    if (!ifNode) {
        ifNode = {
            parameters: {
                conditions: {
                    options: {
                        caseSensitive: true,
                        leftValue: '',
                        typeValidation: 'strict',
                        version: 2
                    },
                    conditions: [
                        {
                            id: 'wf17-product-kind-class',
                            leftValue: '={{ $("Extract Branduid").first().json._productKind || "" }}',
                            rightValue: 'CLASS',
                            operator: {
                                type: 'string',
                                operation: 'equals'
                            }
                        }
                    ],
                    combinator: 'and'
                }
            },
            id: 'wf17-if-product-kind-class',
            name: 'IF Product Kind Class',
            type: 'n8n-nodes-base.if',
            typeVersion: 2.2,
            position: [
                2520,
                360
            ]
        };
        workflow.nodes.push(ifNode);
    }

    workflow.connections['Update NocoDB Class'] = {
        main: [
            [
                {
                    node: 'IF Product Kind Class',
                    type: 'main',
                    index: 0
                }
            ]
        ]
    };
    workflow.connections['IF Product Kind Class'] = {
        main: [
            [
                {
                    node: 'Build Open Email',
                    type: 'main',
                    index: 0
                }
            ],
            [
                {
                    node: 'Respond Success',
                    type: 'main',
                    index: 0
                }
            ]
        ]
    };

    writeJson(relativePath, workflow);
}

function main() {
    patchWf01();
    patchWf16();
    patchWf20();
    patchWf05();
    patchWf17();
    console.log('Patched S2-9 workflows.');
}

main();
