#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-6-retention');
var FIXTURE_URL = 'http://127.0.0.1:8125/output/playwright/fixtures/partnerclass/mypage.html';
var WORKFLOW_URL = 'https://n8n.pressco21.com/webhook/student-retention';
var DETAIL_PAGE_URL = '/shop/page.html?id=2607&class_id=';
var env = {};
var playwright = require(path.join(REPO_ROOT, '.playwright-tools', 'node_modules', 'playwright'));

function loadEnv() {
    var envPath = path.join(REPO_ROOT, '.secrets.env');
    var lines;
    var i;
    var match;

    if (!fs.existsSync(envPath)) {
        return;
    }

    lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (i = 0; i < lines.length; i += 1) {
        match = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            continue;
        }
        env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildMockData() {
    var bookings = [
        {
            settlement_id: 'STL_TEST_001',
            class_id: 'CL_RET_001',
            class_name: '서울 플라워 테이블 센터피스',
            class_date: '2026-03-20',
            participants: 1,
            total_amount: 58000,
            status: 'PENDING_SETTLEMENT',
            partner_name: '모먼트블룸'
        },
        {
            settlement_id: 'STL_TEST_002',
            class_id: 'CL_RET_002',
            class_name: '리스 입문 원데이',
            class_date: '2026-03-06',
            participants: 1,
            total_amount: 68000,
            status: 'COMPLETED',
            partner_name: '모먼트블룸'
        },
        {
            settlement_id: 'STL_TEST_003',
            class_id: 'CL_RET_003',
            class_name: '웨딩 부케 베이직',
            class_date: '2026-03-02',
            participants: 1,
            total_amount: 70000,
            status: 'COMPLETED',
            partner_name: '라라플라워'
        },
        {
            settlement_id: 'STL_TEST_004',
            class_id: 'CL_RET_004',
            class_name: '봄꽃 컬러 믹싱',
            class_date: '2026-02-14',
            participants: 1,
            total_amount: 54000,
            status: 'COMPLETED',
            partner_name: '모먼트블룸'
        }
    ];
    var details = {
        CL_RET_002: {
            class_id: 'CL_RET_002',
            class_name: '리스 입문 원데이',
            category: '리스',
            partner: { partner_name: '모먼트블룸' },
            kit_items: [
                { name: '리스 베이스', product_url: 'https://foreverlove.co.kr/shop/goods/goods_view.php?goodsno=1', quantity: 1, price: 12000 },
                { name: '드라이 소재 세트', product_url: 'https://foreverlove.co.kr/shop/goods/goods_view.php?goodsno=2', quantity: 1, price: 18000 }
            ]
        },
        CL_RET_003: {
            class_id: 'CL_RET_003',
            class_name: '웨딩 부케 베이직',
            category: '부케',
            partner: { partner_name: '라라플라워' },
            kit_items: [
                { name: '리본 키트', product_url: 'https://foreverlove.co.kr/shop/goods/goods_view.php?goodsno=3', quantity: 1, price: 9000 }
            ]
        },
        CL_RET_004: {
            class_id: 'CL_RET_004',
            class_name: '봄꽃 컬러 믹싱',
            category: '컬러',
            partner: { partner_name: '모먼트블룸' },
            kit_items: []
        }
    };
    var classes = [
        { class_id: 'CL_RET_005', class_name: '모먼트블룸 시즌 센터피스', partner_name: '모먼트블룸', category: '리스', type: '원데이', price: 62000 },
        { class_id: 'CL_RET_006', class_name: '모먼트블룸 컬러 부케', partner_name: '모먼트블룸', category: '부케', type: '원데이', price: 71000 },
        { class_id: 'CL_RET_007', class_name: '라라플라워 미니 부케', partner_name: '라라플라워', category: '부케', type: '원데이', price: 59000 }
    ];

    return {
        bookings: bookings,
        details: details,
        classes: classes
    };
}

async function runWorkflowChecks(request) {
    var completionResponse = await request.post(WORKFLOW_URL, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer pressco21-admin-2026'
        },
        data: {
            dry_run: true,
            only: 'completion',
            today: '2026-03-06'
        }
    });
    var dormantResponse = await request.post(WORKFLOW_URL, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer pressco21-admin-2026'
        },
        data: {
            dry_run: true,
            only: 'dormant',
            today: '2026-04-04'
        }
    });

    return {
        completion: {
            status: completionResponse.status(),
            body: await completionResponse.json()
        },
        dormant: {
            status: dormantResponse.status(),
            body: await dormantResponse.json()
        }
    };
}

async function runUiChecks(browser) {
    var mock = buildMockData();
    var context = await browser.newContext();
    var page = await context.newPage();
    var pageErrors = [];
    var consoleErrors = [];
    var results;

    page.on('pageerror', function(error) {
        pageErrors.push(String(error && error.message ? error.message : error));
    });

    page.on('console', function(message) {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleErrors.push(message.text());
        }
    });

    await context.addInitScript(function(payload) {
        localStorage.setItem('pressco21_review_thanks_v1', JSON.stringify(payload));
    }, {
        class_id: 'CL_RET_002',
        class_name: '리스 입문 원데이',
        at: '2026-03-11T00:00:00+09:00'
    });

    await page.route('**/webhook/my-bookings', async function(route) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    bookings: mock.bookings
                }
            })
        });
    });

    await page.route('**/webhook/class-api', async function(route, request) {
        var postData = request.postDataJSON() || {};
        var detail = null;

        if (postData.action === 'getClasses') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        classes: mock.classes
                    }
                })
            });
            return;
        }

        if (postData.action === 'getClassDetail') {
            detail = mock.details[postData.id] || null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: detail
                })
            });
            return;
        }

        await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'UNEXPECTED_ACTION' })
        });
    });

    await page.goto(FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(function() {
        var total = document.getElementById('mbTotalCount');
        var list = document.getElementById('mbBookingList');
        return !!(total && total.textContent !== '0') || !!(list && list.innerHTML.trim());
    }, { timeout: 10000 });
    await page.waitForTimeout(800);

    results = await page.evaluate(function() {
        function getText(selector) {
            var el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
        }

        var earnedBadges = Array.prototype.slice.call(document.querySelectorAll('.mb-badge-item.is-earned')).map(function(el) {
            return el.querySelector('.mb-badge-item__title').textContent.trim();
        });

        return {
            retentionVisible: window.getComputedStyle(document.getElementById('mbRetentionArea')).display !== 'none',
            totalCount: document.getElementById('mbTotalCount').textContent.trim(),
            noticeTitle: getText('.mb-retention-notice__title'),
            monthlyTitle: getText('#mbMonthlyReportCard .mb-retention-card__title'),
            monthlyMetrics: Array.prototype.slice.call(document.querySelectorAll('#mbMonthlyReportCard .mb-report-metric__value')).map(function(el) {
                return el.textContent.trim();
            }),
            streakCount: getText('.mb-streak-hero__count'),
            nextMilestone: getText('.mb-streak-hero__next'),
            earnedBadges: earnedBadges,
            bookingSections: Array.prototype.slice.call(document.querySelectorAll('.mb-section__title')).map(function(el) {
                return el.textContent.trim();
            }),
            firstCompletedLink: document.querySelector('.mb-section--completed .mb-inline-btn--primary') ? document.querySelector('.mb-section--completed .mb-inline-btn--primary').getAttribute('href') : '',
            reviewStorage: localStorage.getItem('pressco21_review_thanks_v1')
        };
    });

    if (!results.retentionVisible) {
        throw new Error(JSON.stringify({
            message: 'retention hidden',
            pageErrors: pageErrors,
            consoleErrors: consoleErrors,
            totalCount: results.totalCount
        }));
    }

    await page.screenshot({
        path: path.join(OUTPUT_DIR, 'mypage-retention.png'),
        fullPage: true
    });

    await context.close();
    results.pageErrors = pageErrors;
    results.consoleErrors = consoleErrors;
    return results;
}

async function main() {
    var browser;
    var request;
    var workflowResults;
    var uiResults;
    var output;

    loadEnv();
    ensureDir(OUTPUT_DIR);

    browser = await playwright.chromium.launch({ headless: true });
    request = await playwright.request.newContext();

    try {
        workflowResults = await runWorkflowChecks(request);
        uiResults = await runUiChecks(browser);
        output = {
            workflow: workflowResults,
            ui: uiResults,
            checkedAt: new Date().toISOString(),
            detailPageUrlExample: DETAIL_PAGE_URL + 'CL_RET_002'
        };
        writeJson(path.join(OUTPUT_DIR, 'retention-results.json'), output);
        console.log('saved', path.relative(REPO_ROOT, path.join(OUTPUT_DIR, 'retention-results.json')));
    } finally {
        await request.dispose();
        await browser.close();
    }
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
