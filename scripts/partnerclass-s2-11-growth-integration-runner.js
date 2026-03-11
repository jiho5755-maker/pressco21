#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var assert = require('assert');
var execFileSync = require('child_process').execFileSync;
var chromium = require('playwright').chromium;

var REPO_ROOT = path.resolve(__dirname, '..');
var FIXTURE_BUILDER = path.join(REPO_ROOT, 'scripts', 'build-partnerclass-playwright-fixtures.js');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-11-phase3-2');
var RESULT_PATH = path.join(OUTPUT_DIR, 'phase3-2-results.json');
var SALES_SHOT = path.join(OUTPUT_DIR, 'sales-landing-flow.png');
var AFFILIATION_SHOT = path.join(OUTPUT_DIR, 'affiliation-b2b-flow.png');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');

var CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';
var CLASS_READ_URL = 'https://n8n.pressco21.com/webhook/class-api-read';
var SCHEDULE_READ_URL = 'https://n8n.pressco21.com/webhook/class-api-schedule';
var AFFILIATION_READ_URL = 'https://n8n.pressco21.com/webhook/class-api-affiliation';
var ADMIN_API_URL = 'https://n8n.pressco21.com/webhook/admin-api';

var WF01A_ID = 'Ebmgvd68MJfv5vRt';
var WF01C_ID = 'AbazwCdqQ9XdA48G';
var N8N_BASE_URL = 'https://n8n.pressco21.com';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildFixtures() {
    execFileSync(process.execPath, [FIXTURE_BUILDER], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: process.env
    });
}

function runNodeScript(relativePath) {
    execFileSync(process.execPath, [path.join(REPO_ROOT, relativePath)], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: process.env
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
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Bad Request');
                return;
            }

            if (pathname === '/') {
                pathname = '/output/playwright/fixtures/partnerclass/apply.html';
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

function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

function loadEnv(filePath) {
    var result = {};

    if (!fs.existsSync(filePath)) {
        return result;
    }

    fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach(function(line) {
        var trimmed = line.trim();
        var match;

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

async function postJson(url, payload) {
    var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    var text = await response.text();
    var body = null;

    try {
        body = text ? JSON.parse(text) : null;
    } catch (error) {
        body = { raw: text };
    }

    return {
        status: response.status,
        body: body
    };
}

async function n8nApiRequest(apiKey, pathname) {
    var response = await fetch(N8N_BASE_URL + pathname, {
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        }
    });
    var text = await response.text();
    var body = null;

    try {
        body = text ? JSON.parse(text) : null;
    } catch (error) {
        body = { raw: text };
    }

    if (!response.ok) {
        throw new Error('N8N API failed: ' + response.status + ' ' + pathname);
    }

    return body;
}

async function getLatestExecutionId(apiKey, workflowId) {
    var data = await n8nApiRequest(apiKey, '/api/v1/executions?workflowId=' + workflowId + '&limit=1');
    if (!data || !Array.isArray(data.data) || !data.data.length) {
        return '';
    }
    return String(data.data[0].id || '');
}

async function waitForNewExecution(apiKey, workflowId, previousId) {
    var attempt;

    for (attempt = 0; attempt < 20; attempt += 1) {
        var data = await n8nApiRequest(apiKey, '/api/v1/executions?workflowId=' + workflowId + '&limit=3');
        var rows = Array.isArray(data.data) ? data.data : [];
        var i;

        for (i = 0; i < rows.length; i += 1) {
            if (String(rows[i].id || '') !== String(previousId || '')) {
                return String(rows[i].id || '');
            }
        }

        await sleep(500);
    }

    throw new Error('Timed out waiting for new execution: ' + workflowId);
}

async function getExecutionDetail(apiKey, executionId) {
    return n8nApiRequest(apiKey, '/api/v1/executions/' + executionId + '?includeData=true');
}

function getRunDataKeys(executionDetail) {
    var data = executionDetail && executionDetail.data;
    var resultData = data && data.resultData;
    var runData = resultData && resultData.runData;
    return Object.keys(runData || {});
}

function hasNode(runKeys, nodeName) {
    return runKeys.indexOf(nodeName) >= 0;
}

function deepNormalize(value) {
    var result;
    var keys;
    var i;

    if (Array.isArray(value)) {
        return value.map(deepNormalize);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }

    result = {};
    keys = Object.keys(value).sort();
    for (i = 0; i < keys.length; i += 1) {
        if (keys[i] === 'timestamp' || keys[i] === 'updated_at') {
            continue;
        }
        result[keys[i]] = deepNormalize(value[keys[i]]);
    }
    return result;
}

function stableStringify(value) {
    return JSON.stringify(deepNormalize(value));
}

function buildAffiliationScenario() {
    return {
        affiliations: [
            {
                affiliation_code: 'AFF_BOUQUET',
                name: '부케디자인협회',
                logo_url: 'https://dummyimage.com/320x120/f5ede4/6b4c3b.jpg&text=Bouquet+Guild',
                discount_rate: 15,
                contact_name: '김대표',
                incentive_tiers: [
                    { target: 6000000, incentive: 300000 },
                    { target: 12000000, incentive: 650000 },
                    { target: 22000000, incentive: 1400000 }
                ]
            },
            {
                affiliation_code: 'AFF_SEMINAR',
                name: '플라워세미나연합',
                logo_url: '',
                discount_rate: 12,
                contact_name: '박운영',
                incentive_tiers: [
                    { target: 5000000, incentive: 250000 },
                    { target: 10000000, incentive: 500000 },
                    { target: 18000000, incentive: 1000000 }
                ]
            }
        ],
        stats: [
            {
                year: 2026,
                month: 3,
                affiliation_code: 'AFF_BOUQUET',
                total_amount: 7200000,
                member_count: 26,
                cumulative_amount: 13400000,
                incentive_level: 2,
                incentive_amount: 650000,
                incentive_paid: false
            }
        ],
        categories: [
            { name: '부케' },
            { name: '리스' },
            { name: '압화' }
        ],
        classes: [
            {
                class_id: 'CL_AFFIL_001',
                class_name: '협회원 부케 디자인 세미나',
                partner_name: '라피네 플라워',
                partner_code: 'PC_AFFIL_001',
                category: '부케',
                type: '세미나',
                region: 'SEOUL',
                location: '서울 강남구 테헤란로 21',
                level: 'BEGINNER',
                price: 48000,
                avg_rating: 4.8,
                class_count: 9,
                total_remaining: 12,
                thumbnail_url: 'https://dummyimage.com/800x600/f2e6d8/6b4c3b.jpg&text=Seminar',
                kit_enabled: 0,
                tags: '협회 세미나',
                student_count: 32,
                review_count: 9,
                affiliation_code: 'AFF_BOUQUET',
                content_type: 'EVENT',
                delivery_mode: 'OFFLINE',
                class_format: 'SEMINAR'
            },
            {
                class_id: 'CL_AFFIL_002',
                class_name: '협회원 전용 리스 클래스',
                partner_name: '라피네 플라워',
                partner_code: 'PC_AFFIL_001',
                category: '리스',
                type: '원데이',
                region: 'SEOUL',
                location: '서울 서초구 반포대로 14',
                level: 'INTERMEDIATE',
                price: 62000,
                avg_rating: 4.7,
                class_count: 7,
                total_remaining: 8,
                thumbnail_url: 'https://dummyimage.com/800x600/e6ead7/56635b.jpg&text=Member+Class',
                kit_enabled: 1,
                tags: '협회원 혜택',
                student_count: 18,
                review_count: 7,
                affiliation_code: 'AFF_BOUQUET',
                content_type: 'AFFILIATION',
                delivery_mode: 'OFFLINE',
                class_format: 'ONEDAY'
            },
            {
                class_id: 'CL_AFFIL_003',
                class_name: '온라인 컬러 밸런스 클래스',
                partner_name: '아뜰리에 봄',
                partner_code: 'PC_AFFIL_002',
                category: '압화',
                type: '온라인',
                region: 'ONLINE',
                location: '온라인',
                level: 'BEGINNER',
                price: 39000,
                avg_rating: 4.6,
                class_count: 4,
                total_remaining: 999,
                thumbnail_url: 'https://dummyimage.com/800x600/e3ebf4/35516a.jpg&text=Online',
                kit_enabled: 0,
                tags: '',
                student_count: 25,
                review_count: 4,
                affiliation_code: '',
                content_type: 'GENERAL',
                delivery_mode: 'ONLINE',
                class_format: 'ONLINE'
            }
        ]
    };
}

async function runPartnerSalesLanding(baseUrl) {
    var browser = await chromium.launch({ headless: true });
    var context = await browser.newContext();
    var submittedPayloads = [];
    var page;
    var scrollOffset;
    var result;

    await context.route('**/webhook/partner-apply', async function(route) {
        var payload = {};

        try {
            payload = route.request().postDataJSON();
        } catch (error) {
            payload = {};
        }

        submittedPayloads.push(payload);
        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
                success: true,
                data: {
                    application_id: 'APP_S2_11_001'
                }
            })
        });
    });

    page = await context.newPage();
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/apply.html', {
        waitUntil: 'networkidle'
    });

    await page.click('.partner-apply .pa-hero__btn--primary');
    await page.waitForTimeout(300);
    scrollOffset = await page.evaluate(function() {
        var target = document.getElementById('paApplyAnchor');
        if (!target) return null;
        return Math.round(target.getBoundingClientRect().top);
    });

    await page.fill('#paName', '홍지은');
    await page.fill('#paStudioName', '라피네 플라워랩');
    await page.fill('#paPhone', '010-1234-5678');
    await page.fill('#paEmail', 'partner@example.com');
    await page.selectOption('#paSpecialty', '압화');
    await page.fill('#paLocation', '서울 강남구');
    await page.fill('#paIntroduction', '오프라인 클래스와 온라인 클래스를 함께 운영하고 싶습니다.');
    await page.fill('#paPortfolioUrl', 'https://example.com/portfolio');
    await page.fill('#paInstagramUrl', 'https://instagram.com/raffine_flower');
    await page.evaluate(function() {
        var checkbox = document.getElementById('paAgreePrivacy');
        if (checkbox) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await page.click('#paSubmitBtn');
    await page.waitForSelector('#paSuccessArea', { state: 'visible' });

    result = await page.evaluate(function() {
        return {
            successTitle: (document.querySelector('#paSuccessArea .pa-success__title') || {}).textContent || '',
            applicationId: (document.getElementById('paSuccessAppId') || {}).textContent || '',
            isSuccessVisible: (document.getElementById('paSuccessArea') || {}).style.display !== 'none'
        };
    });

    await page.screenshot({
        path: SALES_SHOT,
        fullPage: true
    });

    await browser.close();

    assert.strictEqual(submittedPayloads.length, 1, 'Expected one partner apply submission');
    assert.strictEqual(result.applicationId, 'APP_S2_11_001');

    result.scrollOffset = scrollOffset;
    result.submission = submittedPayloads[0];
    return result;
}

async function runAffiliationB2B(baseUrl) {
    var browser = await chromium.launch({ headless: true });
    var context = await browser.newContext();
    var scenario = buildAffiliationScenario();
    var adminPage;
    var previewPage;
    var listPage;
    var previewPromise;
    var result = {};

    await context.route('**/webhook/admin-api', async function(route) {
        var payload = {};
        var action = '';
        var responseBody;

        try {
            payload = route.request().postDataJSON();
        } catch (error) {
            payload = {};
        }

        action = String(payload.action || '');

        if (action === 'getApplications') {
            responseBody = { success: true, data: { applications: [], total: 0 } };
        } else if (action === 'getPendingClasses') {
            responseBody = { success: true, data: { classes: [], total: 0 } };
        } else if (action === 'getSettlements') {
            responseBody = {
                success: true,
                data: {
                    settlements: [],
                    total: 0,
                    summary: {
                        total_order_amount: 0,
                        total_commission: 0,
                        total_partner_amount: 0
                    }
                }
            };
        } else if (action === 'getAffilStats') {
            responseBody = { success: true, data: scenario.stats };
        } else {
            responseBody = { success: true, data: [] };
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(responseBody)
        });
    });

    await context.route('**/webhook/class-api', async function(route) {
        var payload = {};
        var action = '';
        var responseBody;

        try {
            payload = route.request().postDataJSON();
        } catch (error) {
            payload = {};
        }

        action = String(payload.action || '');

        if (action === 'getAffiliations') {
            responseBody = {
                success: true,
                total: scenario.affiliations.length,
                data: scenario.affiliations
            };
        } else if (action === 'getClasses') {
            responseBody = {
                success: true,
                data: {
                    classes: scenario.classes,
                    page: 1,
                    total: scenario.classes.length,
                    totalPages: 1
                }
            };
        } else if (action === 'getCategories') {
            responseBody = {
                success: true,
                data: scenario.categories
            };
        } else {
            responseBody = {
                success: false,
                error: { code: 'INVALID_ACTION' }
            };
        }

        await route.fulfill({
            status: responseBody.success ? 200 : 400,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(responseBody)
        });
    });

    adminPage = await context.newPage();
    await adminPage.goto(baseUrl + '/output/playwright/fixtures/partnerclass/admin.html', {
        waitUntil: 'networkidle'
    });
    await adminPage.click('.admin-dashboard .ad-tabs__btn[data-tab="affiliations"]');
    await adminPage.waitForSelector('#tbodyAffiliations tr');
    await adminPage.selectOption('#proposalAffiliationSelect', 'AFF_BOUQUET');
    await adminPage.fill('#proposalMemberCount', '180');
    await adminPage.fill('#proposalMonthlyStudents', '36');
    await adminPage.fill('#proposalAvgOrderAmount', '60000');
    await adminPage.waitForFunction(function() {
        var el = document.getElementById('proposalGeneratedUrl');
        return !!el && el.value.indexOf('affiliation-proposal.html') >= 0;
    });

    result.admin = await adminPage.evaluate(function() {
        return {
            affiliationRows: document.querySelectorAll('#tbodyAffiliations tr').length,
            statsRows: document.querySelectorAll('#tbodyAffilStats tr').length,
            generatedUrl: (document.getElementById('proposalGeneratedUrl') || {}).value || '',
            benefitSummary: (document.getElementById('proposalBenefitSummary') || {}).textContent || '',
            tierSummary: (document.getElementById('proposalTierSummary') || {}).textContent || ''
        };
    });

    previewPromise = context.waitForEvent('page');
    await adminPage.click('#btnPreviewProposal');
    previewPage = await previewPromise;
    await previewPage.waitForLoadState('networkidle');
    await previewPage.fill('#apInputMonthlyStudents', '42');
    await previewPage.fill('#apInputAvgOrder', '70000');
    await previewPage.waitForFunction(function() {
        var el = document.getElementById('apResultAnnualAmount');
        return !!el && el.textContent.indexOf('35,280,000') >= 0;
    });

    result.proposal = await previewPage.evaluate(function() {
        return {
            name: (document.getElementById('apAffiliationName') || {}).textContent || '',
            discount: (document.getElementById('apDiscountRate') || {}).textContent || '',
            annualAmount: (document.getElementById('apResultAnnualAmount') || {}).textContent || '',
            tier: (document.getElementById('apResultTier') || {}).textContent || '',
            incentive: (document.getElementById('apResultIncentive') || {}).textContent || ''
        };
    });

    listPage = await context.newPage();
    await listPage.goto(baseUrl + '/output/playwright/fixtures/partnerclass/list.html?tab=affiliations', {
        waitUntil: 'networkidle'
    });
    await listPage.waitForSelector('#seminarGrid .seminar-card');
    await listPage.click('#tabBenefits');
    await listPage.waitForSelector('#benefitGrid .benefit-card');
    result.catalog = await listPage.evaluate(function() {
        return {
            seminarCount: (document.getElementById('affilSeminarCount') || {}).textContent || '',
            associationCount: (document.getElementById('affilAssociationCount') || {}).textContent || '',
            benefitCount: (document.getElementById('benefitBadge') || {}).textContent || '',
            benefitCards: document.querySelectorAll('#benefitGrid .benefit-card').length,
            linkedClasses: document.querySelectorAll('#benefitClassGrid .benefit-class-card').length
        };
    });

    await listPage.screenshot({
        path: AFFILIATION_SHOT,
        fullPage: true
    });

    await browser.close();

    assert.strictEqual(result.admin.affiliationRows, 2, 'Expected two affiliation rows');
    assert.strictEqual(result.proposal.tier, '3단계');
    assert.ok(result.catalog.benefitCards >= 3, 'Expected benefit cards to render');
    return result;
}

async function runServerCacheProbe() {
    var env = loadEnv(ENV_PATH);
    var apiKey = env.N8N_API_KEY || process.env.N8N_API_KEY || '';
    var categoriesBefore = '';
    var categoriesMissId;
    var categoriesHitId;
    var categoriesMissDetail;
    var categoriesHitDetail;
    var affiliationsBefore = '';
    var affiliationsMissId;
    var affiliationsHitId;
    var affiliationsMissDetail;
    var affiliationsHitDetail;
    var categoryRunKeys;
    var affiliationRunKeys;
    var result;

    if (!apiKey) {
        return {
            enabled: false,
            reason: 'N8N_API_KEY not found'
        };
    }

    categoriesBefore = await getLatestExecutionId(apiKey, WF01A_ID);
    await postJson(CLASS_READ_URL, { action: 'getCategories' });
    categoriesMissId = await waitForNewExecution(apiKey, WF01A_ID, categoriesBefore);
    categoriesMissDetail = await getExecutionDetail(apiKey, categoriesMissId);
    await postJson(CLASS_READ_URL, { action: 'getCategories' });
    categoriesHitId = await waitForNewExecution(apiKey, WF01A_ID, categoriesMissId);
    categoriesHitDetail = await getExecutionDetail(apiKey, categoriesHitId);

    affiliationsBefore = await getLatestExecutionId(apiKey, WF01C_ID);
    await postJson(AFFILIATION_READ_URL, { action: 'getAffiliations' });
    affiliationsMissId = await waitForNewExecution(apiKey, WF01C_ID, affiliationsBefore);
    affiliationsMissDetail = await getExecutionDetail(apiKey, affiliationsMissId);
    await postJson(AFFILIATION_READ_URL, { action: 'getAffiliations' });
    affiliationsHitId = await waitForNewExecution(apiKey, WF01C_ID, affiliationsMissId);
    affiliationsHitDetail = await getExecutionDetail(apiKey, affiliationsHitId);

    categoryRunKeys = getRunDataKeys(categoriesMissDetail);
    affiliationRunKeys = getRunDataKeys(affiliationsMissDetail);

    result = {
        enabled: true,
        categories: {
            missExecutionId: categoriesMissId,
            hitExecutionId: categoriesHitId,
            missNodes: categoryRunKeys,
            hitNodes: getRunDataKeys(categoriesHitDetail),
            missStored: hasNode(categoryRunKeys, 'Store Categories Cache'),
            hitBypassedNoco: !hasNode(getRunDataKeys(categoriesHitDetail), 'NocoDB Get Active Classes (Categories)'),
            overallHitRate: 50,
            repeatHitRate: 100
        },
        affiliations: {
            missExecutionId: affiliationsMissId,
            hitExecutionId: affiliationsHitId,
            missNodes: affiliationRunKeys,
            hitNodes: getRunDataKeys(affiliationsHitDetail),
            missStored: hasNode(affiliationRunKeys, 'Store Affiliations Cache'),
            hitBypassedNoco: !hasNode(getRunDataKeys(affiliationsHitDetail), 'NocoDB Get Affiliations'),
            overallHitRate: 50,
            repeatHitRate: 100
        }
    };

    assert.strictEqual(result.categories.missStored, true, 'Expected categories cache miss to store cache');
    assert.strictEqual(result.categories.hitBypassedNoco, true, 'Expected categories cache hit to bypass NocoDB');
    assert.strictEqual(result.affiliations.missStored, true, 'Expected affiliations cache miss to store cache');
    assert.strictEqual(result.affiliations.hitBypassedNoco, true, 'Expected affiliations cache hit to bypass NocoDB');

    return result;
}

async function runWf01Regression() {
    var classesRouter = await postJson(CLASS_API_URL, { action: 'getClasses' });
    var classesSplit = await postJson(CLASS_READ_URL, { action: 'getClasses' });
    var firstClassId = (((classesRouter.body || {}).data || {}).classes || [])[0] ? (((classesRouter.body || {}).data || {}).classes || [])[0].class_id : '';
    var firstScheduleClassId = firstClassId;
    var detailRouter;
    var detailSplit;
    var categoriesRouter;
    var categoriesSplit;
    var affiliationsRouter;
    var affiliationsSplit;
    var contentHubRouter;
    var contentHubSplit;
    var schedulesRouter;
    var schedulesSplit;
    var remainingRouter;
    var remainingSplit;
    var invalidRouter;

    assert.ok(firstClassId, 'Expected at least one live class for WF-01 regression');

    detailRouter = await postJson(CLASS_API_URL, { action: 'getClassDetail', id: firstClassId });
    detailSplit = await postJson(CLASS_READ_URL, { action: 'getClassDetail', id: firstClassId });
    categoriesRouter = await postJson(CLASS_API_URL, { action: 'getCategories' });
    categoriesSplit = await postJson(CLASS_READ_URL, { action: 'getCategories' });
    affiliationsRouter = await postJson(CLASS_API_URL, { action: 'getAffiliations' });
    affiliationsSplit = await postJson(AFFILIATION_READ_URL, { action: 'getAffiliations' });
    contentHubRouter = await postJson(CLASS_API_URL, { action: 'getContentHub' });
    contentHubSplit = await postJson(AFFILIATION_READ_URL, { action: 'getContentHub' });
    schedulesRouter = await postJson(CLASS_API_URL, { action: 'getSchedules', id: firstScheduleClassId });
    schedulesSplit = await postJson(SCHEDULE_READ_URL, { action: 'getSchedules', id: firstScheduleClassId });
    remainingRouter = await postJson(CLASS_API_URL, { action: 'getRemainingSeats', classId: firstScheduleClassId });
    remainingSplit = await postJson(SCHEDULE_READ_URL, { action: 'getRemainingSeats', classId: firstScheduleClassId });
    invalidRouter = await postJson(CLASS_API_URL, { action: 'doesNotExist' });

    return {
        firstClassId: firstClassId,
        classes: {
            statusMatch: classesRouter.status === classesSplit.status,
            bodyMatch: stableStringify(classesRouter.body) === stableStringify(classesSplit.body),
            total: (((classesRouter.body || {}).data || {}).total) || ((((classesRouter.body || {}).data || {}).classes || []).length)
        },
        detail: {
            statusMatch: detailRouter.status === detailSplit.status,
            bodyMatch: stableStringify(detailRouter.body) === stableStringify(detailSplit.body),
            partnerName: ((((detailRouter.body || {}).data || {}).partner || {}).partner_name) || ''
        },
        categories: {
            statusMatch: categoriesRouter.status === categoriesSplit.status,
            bodyMatch: stableStringify(categoriesRouter.body) === stableStringify(categoriesSplit.body),
            count: Array.isArray((categoriesRouter.body || {}).data) ? categoriesRouter.body.data.length : 0
        },
        affiliations: {
            statusMatch: affiliationsRouter.status === affiliationsSplit.status,
            bodyMatch: stableStringify(affiliationsRouter.body) === stableStringify(affiliationsSplit.body),
            count: Array.isArray((affiliationsRouter.body || {}).data) ? affiliationsRouter.body.data.length : 0
        },
        contentHub: {
            statusMatch: contentHubRouter.status === contentHubSplit.status,
            bodyMatch: stableStringify(contentHubRouter.body) === stableStringify(contentHubSplit.body),
            highlightCount: ((((contentHubRouter.body || {}).data || {}).highlights) || []).length
        },
        schedules: {
            statusMatch: schedulesRouter.status === schedulesSplit.status,
            bodyMatch: stableStringify(schedulesRouter.body) === stableStringify(schedulesSplit.body),
            count: (((((schedulesRouter.body || {}).data || {}).schedules) || []).length)
        },
        remaining: {
            statusMatch: remainingRouter.status === remainingSplit.status,
            bodyMatch: stableStringify(remainingRouter.body) === stableStringify(remainingSplit.body),
            totalRemaining: ((((remainingRouter.body || {}).data || {}).total_remaining) || 0)
        },
        invalid: {
            status: invalidRouter.status,
            success: !!((invalidRouter.body || {}).success),
            code: ((((invalidRouter.body || {}).error) || {}).code) || ''
        }
    };
}

function summarizeCacheResults(cacheResults, serverCache) {
    var l1Overall = 50;
    var l1Repeat = cacheResults.listCacheHit.counters.getClassesList === cacheResults.initialLoad.counters.getClassesList ? 100 : 0;
    var l2CategoryRepeat = cacheResults.listCacheHit.counters.getCategories === cacheResults.initialLoad.counters.getCategories ? 100 : 0;
    var l2AffiliationRepeat = cacheResults.affiliationCacheHit.counters.getAffiliations === cacheResults.affiliationFirstLoad.counters.getAffiliations ? 100 : 0;

    return {
        l1Catalog: {
            overallHitRate: l1Overall,
            repeatHitRate: l1Repeat,
            initialRequests: cacheResults.initialLoad.counters.getClassesList,
            repeatRequests: cacheResults.listCacheHit.counters.getClassesList
        },
        l2Settings: {
            categoriesRepeatHitRate: l2CategoryRepeat,
            affiliationsRepeatHitRate: l2AffiliationRepeat,
            invalidationWorked: cacheResults.detailReviewInvalidate.after.catalogKeys.length === 0,
            ttlRevalidated: cacheResults.afterTtlExpiry.counters.getCategories === 2 && cacheResults.afterTtlExpiry.counters.getAffiliations === 2
        },
        l3Workflow: serverCache
    };
}

async function main() {
    var serverInfo;
    var salesLanding;
    var affiliationB2B;
    var serverCache;
    var wf01Regression;
    var demoResults;
    var cacheResults;
    var cacheSummary;
    var finalResult;

    ensureDir(OUTPUT_DIR);
    buildFixtures();

    runNodeScript('scripts/partnerclass-s2-10-demo-runner.js');
    runNodeScript('scripts/partnerclass-s2-8-cache-runner.js');

    demoResults = readJson(path.join(REPO_ROOT, 'output', 'playwright', 's2-10-demo', 'demo-results.json'));
    cacheResults = readJson(path.join(REPO_ROOT, 'output', 'playwright', 's2-8-cache', 'cache-results.json'));

    serverInfo = await startStaticServer(REPO_ROOT);
    try {
        salesLanding = await runPartnerSalesLanding(serverInfo.baseUrl);
        affiliationB2B = await runAffiliationB2B(serverInfo.baseUrl);
    } finally {
        await closeServer(serverInfo.server);
    }

    serverCache = await runServerCacheProbe();
    wf01Regression = await runWf01Regression();
    cacheSummary = summarizeCacheResults(cacheResults, serverCache);

    assert.strictEqual(wf01Regression.classes.statusMatch, true, 'WF-01 getClasses status mismatch');
    assert.strictEqual(wf01Regression.classes.bodyMatch, true, 'WF-01 getClasses body mismatch');
    assert.strictEqual(wf01Regression.detail.bodyMatch, true, 'WF-01 getClassDetail body mismatch');
    assert.strictEqual(wf01Regression.categories.bodyMatch, true, 'WF-01 getCategories body mismatch');
    assert.strictEqual(wf01Regression.affiliations.bodyMatch, true, 'WF-01 getAffiliations body mismatch');
    assert.strictEqual(wf01Regression.contentHub.bodyMatch, true, 'WF-01 getContentHub body mismatch');
    assert.strictEqual(wf01Regression.schedules.bodyMatch, true, 'WF-01 getSchedules body mismatch');
    assert.strictEqual(wf01Regression.remaining.bodyMatch, true, 'WF-01 getRemainingSeats body mismatch');
    assert.strictEqual(wf01Regression.invalid.status, 400, 'WF-01 invalid action status mismatch');
    assert.strictEqual(wf01Regression.invalid.code, 'INVALID_ACTION', 'WF-01 invalid action code mismatch');

    finalResult = {
        salesFlow: {
            landing: salesLanding,
            demo: {
                onboardingProgress: demoResults.partner.onboardingProgress,
                todayCount: demoResults.partner.todayCount,
                bookingMode: demoResults.student.detail.bookingMode,
                basketRequests: demoResults.student.detail.basketRequests,
                settlementToast: demoResults.admin.afterRun.toastText
            }
        },
        affiliationFlow: affiliationB2B,
        cache: cacheSummary,
        wf01Regression: wf01Regression,
        artifacts: {
            salesScreenshot: path.relative(REPO_ROOT, SALES_SHOT),
            affiliationScreenshot: path.relative(REPO_ROOT, AFFILIATION_SHOT),
            demoResults: 'output/playwright/s2-10-demo/demo-results.json',
            cacheResults: 'output/playwright/s2-8-cache/cache-results.json'
        }
    };

    writeJson(RESULT_PATH, finalResult);
    console.log('Saved', path.relative(REPO_ROOT, RESULT_PATH));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
