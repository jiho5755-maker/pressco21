#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var execFileSync = require('child_process').execFileSync;
var playwright = require('playwright');

var chromium = playwright.chromium;
var request = playwright.request;

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var FIXTURE_BUILDER = path.join(REPO_ROOT, 'scripts', 'build-partnerclass-playwright-fixtures.js');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-3-subscription');
var RESULT_PATH = path.join(OUTPUT_DIR, 'subscription-results.json');
var UI_SHOT = path.join(OUTPUT_DIR, 'mypage-subscription-flow.png');
var SUBSCRIPTION_URL = 'https://n8n.pressco21.com/webhook/subscription-kit';
var TABLE_TITLE = 'tbl_Subscriptions';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildFixtures() {
    execFileSync(process.execPath, [FIXTURE_BUILDER], {
        cwd: REPO_ROOT,
        stdio: 'inherit'
    });
}

function getContentType(filePath) {
    if (/\.html$/i.test(filePath)) return 'text/html; charset=utf-8';
    if (/\.json$/i.test(filePath)) return 'application/json; charset=utf-8';
    if (/\.png$/i.test(filePath)) return 'image/png';
    if (/\.jpg$/i.test(filePath) || /\.jpeg$/i.test(filePath)) return 'image/jpeg';
    if (/\.svg$/i.test(filePath)) return 'image/svg+xml';
    if (/\.css$/i.test(filePath)) return 'text/css; charset=utf-8';
    if (/\.js$/i.test(filePath)) return 'application/javascript; charset=utf-8';
    return 'text/plain; charset=utf-8';
}

function startStaticServer(rootDir) {
    return new Promise(function(resolve, reject) {
        var server = http.createServer(function(req, res) {
            var pathname = '/';
            var targetPath = '';

            try {
                pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Bad Request');
                return;
            }

            if (pathname === '/') {
                pathname = '/output/playwright/fixtures/partnerclass/mypage.html';
            }

            targetPath = path.normalize(path.join(rootDir, pathname));
            if (targetPath.indexOf(rootDir) !== 0) {
                res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Forbidden');
                return;
            }

            fs.readFile(targetPath, function(error, buffer) {
                if (error) {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Not Found');
                    return;
                }

                res.writeHead(200, { 'Content-Type': getContentType(targetPath) });
                res.end(buffer);
            });
        });

        server.once('error', reject);
        server.listen(0, '127.0.0.1', function() {
            var address = server.address();
            resolve({
                server: server,
                baseUrl: 'http://127.0.0.1:' + address.port
            });
        });
    });
}

function closeServer(server) {
    return new Promise(function(resolve, reject) {
        server.close(function(error) {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function loadEnv(filePath) {
    var result = {};

    if (!fs.existsSync(filePath)) {
        return result;
    }

    fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach(function(line) {
        var trimmed = line.trim();
        var match = null;

        if (!trimmed || trimmed.charAt(0) === '#') {
            return;
        }

        match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            return;
        }

        result[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    });

    return result;
}

function parseJson(text) {
    try {
        return JSON.parse(text || 'null');
    } catch (error) {
        return null;
    }
}

function createLocalState() {
    return {
        memberId: 'member-test-001',
        bookings: [
            {
                settlement_id: 'SET_SUB_001',
                class_id: 'CL_SUB_001',
                class_name: '보존화 봄 리스 클래스',
                class_date: '2026-02-18',
                participants: 1,
                total_amount: 62000,
                status: 'COMPLETED',
                partner_name: '오월 플라워',
                student_name: '테스트 수강생',
                student_email: 'tester@example.com'
            },
            {
                settlement_id: 'SET_SUB_002',
                class_id: 'CL_SUB_002',
                class_name: '웨딩 부케 시즌 스터디',
                class_date: '2026-02-27',
                participants: 1,
                total_amount: 78000,
                status: 'COMPLETED',
                partner_name: '아뜰리에 라온',
                student_name: '테스트 수강생',
                student_email: 'tester@example.com'
            }
        ],
        catalogClasses: [
            { class_id: 'CL_SUB_001', class_name: '보존화 봄 리스 클래스', partner_name: '오월 플라워', category: '리스', type: 'OFFLINE', price: 62000 },
            { class_id: 'CL_SUB_002', class_name: '웨딩 부케 시즌 스터디', partner_name: '아뜰리에 라온', category: '부케', type: 'OFFLINE', price: 78000 }
        ],
        detailByClassId: {
            CL_SUB_001: {
                class_id: 'CL_SUB_001',
                class_name: '보존화 봄 리스 클래스',
                category: '리스',
                partner: { partner_name: '오월 플라워', partner_code: 'PC_SUB_001' },
                kit_bundle_branduid: 'KITSUB1001',
                kit_items: [
                    { name: '보존화 믹스', quantity: 1, price: 18000, product_url: '/shop/shopdetail.html?branduid=71001' },
                    { name: '리스 베이스', quantity: 1, price: 9000, product_url: '/shop/shopdetail.html?branduid=71002' }
                ]
            },
            CL_SUB_002: {
                class_id: 'CL_SUB_002',
                class_name: '웨딩 부케 시즌 스터디',
                category: '부케',
                partner: { partner_name: '아뜰리에 라온', partner_code: 'PC_SUB_002' },
                kit_bundle_branduid: 'KITSUB1002',
                kit_items: [
                    { name: '프리저브드 장미', quantity: 2, price: 12000, product_url: '/shop/shopdetail.html?branduid=72001' },
                    { name: '실크 리본', quantity: 1, price: 8000, product_url: '/shop/shopdetail.html?branduid=72002' },
                    { name: '부케 홀더', quantity: 1, price: 7000, product_url: '/shop/shopdetail.html?branduid=72003' }
                ]
            }
        },
        subscriptions: [
            {
                subscription_id: 'SUBS_LOCAL_001',
                member_id: 'member-test-001',
                class_id: 'CL_SUB_001',
                class_name: '보존화 봄 리스 클래스',
                partner_name: '오월 플라워',
                partner_code: 'PC_SUB_001',
                kit_bundle_branduid: 'KITSUB1001',
                regular_price: 27000,
                subscriber_price: 24300,
                preview_items: ['보존화 믹스', '리스 베이스'],
                delivery_day: 15,
                status: 'ACTIVE',
                next_order_date: '2026-03-15',
                last_order_ref: 'SUBORD_202602_SUBS_LOCAL_001',
                order_count: 1
            }
        ]
    };
}

function listSubscriptionResponse(state) {
    var active = [];
    var inactive = [];
    var totalSavings = 0;

    state.subscriptions.forEach(function(item) {
        if (String(item.status || '') === 'ACTIVE') {
            active.push(item);
            totalSavings += Math.max((Number(item.regular_price) || 0) - (Number(item.subscriber_price) || 0), 0);
        } else {
            inactive.push(item);
        }
    });

    return {
        success: true,
        data: {
            active: active,
            inactive: inactive,
            total_savings: totalSavings
        }
    };
}

function makeLocalSubscription(payload) {
    return {
        subscription_id: 'SUBS_LOCAL_' + String(Date.now()),
        member_id: payload.member_id,
        class_id: payload.class_id,
        class_name: payload.class_name,
        partner_name: payload.partner_name,
        partner_code: payload.partner_code,
        kit_bundle_branduid: payload.kit_bundle_branduid,
        regular_price: Number(payload.regular_price) || 0,
        subscriber_price: Number(payload.subscriber_price) || 0,
        preview_items: Array.isArray(payload.preview_items) ? payload.preview_items.slice(0, 3) : [],
        delivery_day: Number(payload.delivery_day) || 5,
        status: 'ACTIVE',
        next_order_date: payload.next_order_date,
        last_order_ref: '',
        order_count: 0
    };
}

async function runLocalUiFlow(baseUrl) {
    var browser = await chromium.launch({ headless: true });
    var page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
    var state = createLocalState();
    var result = {};

    page.on('dialog', function(dialog) {
        dialog.accept().catch(function() {
            return null;
        });
    });

    await page.route('**/webhook/my-bookings', async function(route) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
                success: true,
                data: {
                    bookings: state.bookings,
                    total: state.bookings.length
                }
            })
        });
    });

    await page.route('**/webhook/class-api', async function(route, requestValue) {
        var payload = parseJson(requestValue.postData()) || {};
        var responseBody = { success: true, data: {} };

        if (payload.action === 'getClasses') {
            responseBody.data.classes = state.catalogClasses;
        } else if (payload.action === 'getClassDetail') {
            responseBody.data = state.detailByClassId[payload.id] || null;
        } else {
            responseBody = { success: false, message: 'unsupported action' };
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(responseBody)
        });
    });

    await page.route('**/webhook/subscription-kit', async function(route, requestValue) {
        var payload = parseJson(requestValue.postData()) || {};
        var responseBody = null;
        var i = 0;

        if (payload.action === 'listSubscriptions') {
            responseBody = listSubscriptionResponse(state);
        } else if (payload.action === 'createSubscription') {
            state.subscriptions.unshift(makeLocalSubscription(payload));
            responseBody = {
                success: true,
                data: state.subscriptions[0]
            };
        } else if (payload.action === 'cancelSubscription') {
            for (i = 0; i < state.subscriptions.length; i += 1) {
                if (state.subscriptions[i].subscription_id === payload.subscription_id) {
                    state.subscriptions[i].status = 'CANCELLED';
                    break;
                }
            }
            responseBody = {
                success: true,
                data: { subscription_id: payload.subscription_id }
            };
        } else {
            responseBody = { success: false, message: 'unsupported action' };
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(responseBody)
        });
    });

    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/mypage.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#mbSubscriptionArea', { state: 'visible' });

    result.heroTitle = (await page.locator('.mb-subscription-hero__title').textContent() || '').trim();
    result.activeBefore = await page.locator('#mbSubscriptionListPanel .mb-subscription-card').count();
    result.recommendationCount = await page.locator('#mbSubscriptionRecommendationPanel .mb-subscription-card').count();

    await page.click('[data-subscription-open="CL_SUB_002"]');
    await page.fill('#mbSubscriptionMemberName', '테스트 수강생');
    await page.fill('#mbSubscriptionMemberEmail', 'tester@example.com');
    await page.fill('#mbSubscriptionPhone', '01012345678');
    await page.selectOption('#mbSubscriptionDeliveryDay', '25');
    await page.fill('#mbSubscriptionZipcode', '06236');
    await page.fill('#mbSubscriptionAddress1', '서울시 강남구 테헤란로 1');
    await page.fill('#mbSubscriptionAddress2', '101호');
    await page.fill('#mbSubscriptionNotes', '문 앞 배송');
    await page.click('#mbSubscriptionFormSubmit');
    await page.waitForFunction(function() {
        var area = document.getElementById('mbSubscriptionFeedback');
        return area && area.style.display !== 'none' && area.textContent.indexOf('시작되었습니다') >= 0;
    });

    result.feedbackAfterCreate = (await page.locator('#mbSubscriptionFeedback').textContent() || '').trim();
    result.activeAfterCreate = await page.locator('#mbSubscriptionListPanel .mb-subscription-card').count();

    await page.locator('#mbSubscriptionListPanel [data-subscription-cancel]').first().click();
    await page.waitForFunction(function() {
        var area = document.getElementById('mbSubscriptionFeedback');
        return area && area.textContent.indexOf('해지되었습니다') >= 0;
    });

    result.feedbackAfterCancel = (await page.locator('#mbSubscriptionFeedback').textContent() || '').trim();
    result.activeAfterCancel = await page.locator('#mbSubscriptionListPanel .mb-subscription-card').count();

    await page.screenshot({ path: UI_SHOT, fullPage: true });
    await browser.close();
    return result;
}

async function apiRequestJson(apiContext, url, body) {
    var response = await apiContext.post(url, {
        data: body,
        failOnStatusCode: false
    });
    return {
        status: response.status(),
        body: await response.json()
    };
}

async function fetchTableId(env, apiContext) {
    var response = await apiContext.get(env.NOCODB_URL + '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables', {
        headers: {
            'xc-token': env.NOCODB_API_TOKEN
        }
    });
    var data = await response.json();
    var match = (data.list || []).find(function(item) {
        return item && item.title === TABLE_TITLE;
    });
    return match ? match.id : '';
}

async function cleanupTestRows(env, apiContext, tableId, memberId) {
    var listResponse = await apiContext.get(env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + '?where=(member_id,eq,' + encodeURIComponent(memberId) + ')&limit=50', {
        headers: {
            'xc-token': env.NOCODB_API_TOKEN
        }
    });
    var data = await listResponse.json();
    var rows = data.list || [];
    var i = 0;

    for (i = 0; i < rows.length; i += 1) {
        await apiContext.delete(env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + '/' + rows[i].Id, {
            headers: {
                'xc-token': env.NOCODB_API_TOKEN
            }
        });
    }
}

async function runLiveApiFlow() {
    var env = loadEnv(ENV_PATH);
    var apiContext = await request.newContext();
    var timestamp = String(Date.now());
    var memberId = 'member-sub-test-' + timestamp;
    var tableId = '';
    var createResponse = null;
    var listResponse = null;
    var dryRunResponse = null;
    var batchResponse = null;
    var cancelResponse = null;
    var result = {
        skipped: false
    };

    if (!env.NOCODB_URL || !env.NOCODB_API_TOKEN || !env.NOCODB_PROJECT_ID) {
        result.skipped = true;
        result.reason = 'NocoDB env missing';
        await apiContext.dispose();
        return result;
    }

    tableId = await fetchTableId(env, apiContext);
    if (!tableId) {
        result.skipped = true;
        result.reason = 'tbl_Subscriptions not found';
        await apiContext.dispose();
        return result;
    }

    try {
        createResponse = await apiRequestJson(apiContext, SUBSCRIPTION_URL, {
            action: 'createSubscription',
            member_id: memberId,
            member_name: 'Codex Tester',
            member_email: 'codex.subscription+' + timestamp + '@example.com',
            member_phone: '01099998888',
            class_id: 'CL_SUB_TEST',
            class_name: '파일럿 시즌 키트',
            partner_name: 'PRESSCO21 Studio',
            partner_code: 'PC_SUB_TEST',
            kit_bundle_branduid: 'KITSUB9001',
            regular_price: 39000,
            subscriber_price: 35100,
            preview_items: ['시즌 꽃재료', '리본', '폼 베이스'],
            delivery_day: 5,
            next_order_date: '2026-03-05',
            shipping_zipcode: '06236',
            shipping_address1: '서울시 강남구 테헤란로 1',
            shipping_address2: '5층',
            notes: 'subscription runner'
        });
        result.createStatus = createResponse.status;
        result.createdSubscriptionId = createResponse.body && createResponse.body.data ? createResponse.body.data.subscription_id : '';

        listResponse = await apiRequestJson(apiContext, SUBSCRIPTION_URL, {
            action: 'listSubscriptions',
            member_id: memberId
        });
        result.listActiveCount = listResponse.body && listResponse.body.data && listResponse.body.data.active ? listResponse.body.data.active.length : 0;

        dryRunResponse = await apiRequestJson(apiContext, SUBSCRIPTION_URL, {
            action: 'runMonthlyBatch',
            member_id: memberId,
            month: '2026-03',
            target_date: '2026-03-28',
            dry_run: true
        });
        result.dryRunGeneratedCount = dryRunResponse.body && dryRunResponse.body.data ? dryRunResponse.body.data.generated_count : 0;

        batchResponse = await apiRequestJson(apiContext, SUBSCRIPTION_URL, {
            action: 'runMonthlyBatch',
            member_id: memberId,
            month: '2026-03',
            target_date: '2026-03-28',
            dry_run: false
        });
        result.batchGeneratedCount = batchResponse.body && batchResponse.body.data ? batchResponse.body.data.generated_count : 0;
        result.lastOrderRef = batchResponse.body && batchResponse.body.data && batchResponse.body.data.generated && batchResponse.body.data.generated[0]
            ? batchResponse.body.data.generated[0].last_order_ref
            : '';

        cancelResponse = await apiRequestJson(apiContext, SUBSCRIPTION_URL, {
            action: 'cancelSubscription',
            member_id: memberId,
            subscription_id: result.createdSubscriptionId
        });
        result.cancelStatus = cancelResponse.status;
        result.cancelSuccess = !!(cancelResponse.body && cancelResponse.body.success);
    } finally {
        await cleanupTestRows(env, apiContext, tableId, memberId);
        await apiContext.dispose();
    }

    return result;
}

async function main() {
    var serverInfo = null;
    var results = {};

    ensureDir(OUTPUT_DIR);
    buildFixtures();
    serverInfo = await startStaticServer(REPO_ROOT);

    try {
        results.task = 'S3-3';
        results.generatedAt = new Date().toISOString();
        results.localUi = await runLocalUiFlow(serverInfo.baseUrl);
        results.liveApi = await runLiveApiFlow();
        writeJson(RESULT_PATH, results);
        console.log(JSON.stringify(results, null, 2));
        console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
    } finally {
        await closeServer(serverInfo.server);
    }
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
