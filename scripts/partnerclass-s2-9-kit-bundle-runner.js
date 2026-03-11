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
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-9-kit-bundle');
var RESULT_PATH = path.join(OUTPUT_DIR, 'kit-bundle-results.json');
var SCREENSHOT_PATH = path.join(OUTPUT_DIR, 'kit-bundle-flow.png');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
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
            var targetPath;

            try {
                pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Bad Request');
                return;
            }

            if (pathname === '/') {
                pathname = '/output/playwright/fixtures/partnerclass/detail.html';
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

function buildDataset() {
    return {
        detail: {
            class_id: 'CL_S2_9_001',
            id: 'CL_S2_9_001',
            class_name: 'Preserved Dome Masterclass',
            title: 'Preserved Dome Masterclass',
            category: '압화',
            type: '원데이',
            region: 'SEOUL',
            location: '서울 성수동',
            level: 'BEGINNER',
            price: 52000,
            avg_rating: 4.9,
            class_count: 16,
            review_count: 16,
            student_count: 42,
            booked_count: 9,
            total_remaining: 3,
            kit_enabled: 1,
            kit_bundle_branduid: 'KIT9001',
            kit_items: [
                { name: '돔 유리 재료', quantity: 1, price: 12000, product_url: '/shop/shopdetail.html?branduid=MAT1001', branduid: 'MAT1001' },
                { name: '보존화 메인 세트', quantity: 1, price: 9000, product_url: '/shop/shopdetail.html?branduid=MAT1002', branduid: 'MAT1002' }
            ],
            description: '<p>키트 포함 예약 선택 테스트용 상세입니다.</p>',
            instructor_bio: '성수 작업실에서 진행하는 입문 클래스입니다.',
            partner: {
                partner_name: 'Studio Bloom',
                name: 'Studio Bloom',
                grade: 'BLOOM',
                avg_rating: 4.9,
                location: '서울 성수동'
            },
            schedules: [
                { schedule_id: 'SCH_S2_9_001', schedule_date: '2026-03-25', schedule_time: '14:00', remaining: 3, booked_count: 5 }
            ],
            curriculum: ['도구 소개', '돔 구조 만들기', '포장 마감'],
            materials_included: '포함',
            youtube_video_id: '',
            reviews: [
                { name: 'Member A', date: '2026-03-10', rating: 5, text: '준비가 잘 된 수업이었어요.' }
            ],
            makeshop_product_id: 'CLASS9001',
            makeshop_brandcode: 'personal',
            makeshop_xcode: 'personal',
            makeshop_mcode: ''
        }
    };
}

function buildProductHtml(brandUid, productName, brandCode, price) {
    return [
        '<!DOCTYPE html>',
        '<html lang="ko">',
        '<head><meta charset="utf-8"><title>' + productName + '</title></head>',
        '<body>',
        '<form name="form1">',
        '<input type="hidden" name="brandcode" value="' + brandCode + '">',
        '<input type="hidden" name="xcode" value="000">',
        '<input type="hidden" name="mcode" value="000">',
        '<input type="hidden" name="price" value="' + String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '">',
        '</form>',
        '<div class="goods--title">' + productName + '</div>',
        '<script>var sto_id:\'1\';</script>',
        '</body>',
        '</html>'
    ].join('');
}

async function installRoutes(page, dataset, capture) {
    await page.route('**/webhook/class-api', async function(route) {
        var payload = route.request().postDataJSON();

        if (payload.action === 'getClassDetail') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json; charset=utf-8',
                body: JSON.stringify({
                    success: true,
                    data: dataset.detail,
                    timestamp: new Date().toISOString()
                })
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ success: true, data: { list: [] }, timestamp: new Date().toISOString() })
        });
    });

    await page.route('**/webhook/record-booking', async function(route) {
        capture.bookingRequests.push(route.request().postDataJSON());
        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ success: true, data: { settlement_id: 'STL_TEST_001' } })
        });
    });

    await page.route('**/shop/shopdetail.html?branduid=*', async function(route) {
        var url = new URL(route.request().url());
        var brandUid = url.searchParams.get('branduid') || '';
        var html = '';

        if (brandUid === 'CLASS9001') {
            html = buildProductHtml(brandUid, 'Preserved Dome Masterclass', '000000000168', 52000);
        } else if (brandUid === 'KIT9001') {
            html = buildProductHtml(brandUid, 'Preserved Dome Masterclass 재료 키트', '000000000169', 23000);
        } else {
            html = buildProductHtml(brandUid, 'Fallback Product', '000000000170', 10000);
        }

        await route.fulfill({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: html
        });
    });

    await page.route('**/shop/basket.action.html', async function(route) {
        var params = new URLSearchParams(route.request().postData() || '');
        capture.basketRequests.push({
            branduid: params.get('branduid') || '',
            amount: params.get('amount') || params.get('amount[]') || '',
            ordertype: params.get('ordertype') || ''
        });

        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
                status: true,
                etc_data: {
                    baro_type: 'baro'
                }
            })
        });
    });
}

async function prepareBooking(page) {
    await page.waitForSelector('#bookingOptionArea', { state: 'visible' });
    await page.evaluate(function() {
        var input = document.getElementById('datePicker');
        if (input && input._flatpickr) {
            input._flatpickr.setDate('2026-03-25', true);
            return;
        }
        if (input) {
            input.value = '2026-03-25';
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await page.click('.cd-time-slot[data-schedule-id="SCH_S2_9_001"]');
}

async function getButtonState(page, selector) {
    return page.evaluate(function(targetSelector) {
        var element = document.querySelector(targetSelector);
        return {
            exists: !!element,
            disabled: element ? !!element.disabled : null
        };
    }, selector);
}

async function runClassOnlyFlow(baseUrl, browser, dataset, results) {
    var context = await browser.newContext();
    var page = await context.newPage();
    var capture = { bookingRequests: [], basketRequests: [], dialogs: [], consoleErrors: [] };

    page.on('dialog', async function(dialog) {
        capture.dialogs.push(dialog.message());
        await dialog.accept();
    });
    page.on('console', function(msg) {
        if (msg.type() === 'error') {
            capture.consoleErrors.push(msg.text());
        }
    });

    await installRoutes(page, dataset, capture);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/detail.html?class_id=CL_S2_9_001', { waitUntil: 'networkidle' });
    await prepareBooking(page);

    assert.strictEqual(await page.locator('.booking-option__card').count(), 2, '예약 옵션 카드 2개가 렌더링되어야 합니다.');
    var classOnlyGiftState = await getButtonState(page, '#bookingGift');
    assert(classOnlyGiftState.exists, '선물하기 버튼이 렌더링되어야 합니다.');
    assert.strictEqual(classOnlyGiftState.disabled, false, '강의만 선택 시 선물하기 버튼이 활성화되어야 합니다.');
    await page.click('#bookingSubmit');
    await page.waitForURL('**/shop/order.html', { timeout: 3000 }).catch(function() {});

    results.classOnly = {
        bookingRequest: capture.bookingRequests[0] || null,
        basketRequests: capture.basketRequests,
        finalUrl: page.url(),
        dialog: capture.dialogs[0] || '',
        giftEnabled: classOnlyGiftState.disabled === false,
        consoleErrors: capture.consoleErrors
    };

    assert(results.classOnly.bookingRequest, '강의만 예약 시 booking 요청이 필요합니다.');
    assert.strictEqual(results.classOnly.bookingRequest.amount, 52000, '강의만 예약 amount는 강의료여야 합니다.');
    assert.strictEqual(results.classOnly.bookingRequest.booking_mode, 'CLASS_ONLY', '강의만 예약 모드가 전송되어야 합니다.');
    assert.strictEqual(results.classOnly.basketRequests.length, 1, '강의만 예약은 장바구니 요청 1건이어야 합니다.');
    assert.strictEqual(results.classOnly.basketRequests[0].branduid, 'CLASS9001', '강의만 예약은 클래스 상품만 담아야 합니다.');

    await context.close();
}

async function runWithKitFlow(baseUrl, browser, dataset, results) {
    var context = await browser.newContext();
    var page = await context.newPage();
    var capture = { bookingRequests: [], basketRequests: [], dialogs: [], consoleErrors: [] };

    page.on('dialog', async function(dialog) {
        capture.dialogs.push(dialog.message());
        await dialog.accept();
    });
    page.on('console', function(msg) {
        if (msg.type() === 'error') {
            capture.consoleErrors.push(msg.text());
        }
    });

    await installRoutes(page, dataset, capture);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/detail.html?class_id=CL_S2_9_001', { waitUntil: 'networkidle' });
    await page.waitForSelector('.booking-option__card[data-booking-mode="WITH_KIT"]');
    await page.click('.booking-option__card[data-booking-mode="WITH_KIT"]');
    await prepareBooking(page);
    await page.waitForFunction(function() {
        var text = document.getElementById('bookingPrice') ? document.getElementById('bookingPrice').textContent || '' : '';
        return text.indexOf('75,000원') >= 0;
    });

    var withKitGiftState = await getButtonState(page, '#bookingGift');
    var withKitNoticeText = await page.evaluate(function() {
        var element = document.getElementById('bookingNotice');
        return element ? (element.textContent || '') : '';
    });
    var withKitPriceSummary = await page.evaluate(function() {
        var element = document.getElementById('bookingPrice');
        return element ? (element.textContent || '') : '';
    });
    assert(withKitGiftState.exists, '선물하기 버튼이 렌더링되어야 합니다.');
    assert.strictEqual(withKitGiftState.disabled, true, '키트 포함 선택 시 선물하기 버튼이 비활성화되어야 합니다.');
    await page.click('#bookingSubmit');
    await page.waitForURL('**/shop/basket.html', { timeout: 3000 }).catch(function() {});

    results.withKit = {
        bookingRequest: capture.bookingRequests[0] || null,
        basketRequests: capture.basketRequests,
        finalUrl: page.url(),
        dialog: capture.dialogs[0] || '',
        notice: withKitNoticeText,
        priceSummary: withKitPriceSummary,
        giftDisabled: withKitGiftState.disabled === true,
        consoleErrors: capture.consoleErrors
    };

    assert(results.withKit.bookingRequest, '키트 포함 예약 시 booking 요청이 필요합니다.');
    assert.strictEqual(results.withKit.bookingRequest.amount, 52000, '키트 포함 예약도 booking amount는 강의료 기준이어야 합니다.');
    assert.strictEqual(results.withKit.bookingRequest.booking_mode, 'WITH_KIT', '키트 포함 예약 모드가 전송되어야 합니다.');
    assert.strictEqual(results.withKit.bookingRequest.kit_bundle_branduid, 'KIT9001', '키트 포함 예약은 묶음 branduid를 전달해야 합니다.');
    assert.strictEqual(results.withKit.basketRequests.length, 2, '키트 포함 예약은 장바구니 요청 2건이어야 합니다.');
    assert.strictEqual(results.withKit.basketRequests[0].branduid, 'CLASS9001', '첫 장바구니 요청은 클래스 상품이어야 합니다.');
    assert.strictEqual(results.withKit.basketRequests[1].branduid, 'KIT9001', '둘째 장바구니 요청은 묶음 키트 상품이어야 합니다.');

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    await context.close();
}

async function main() {
    var dataset = buildDataset();
    var serverInfo;
    var browser;
    var results = {};

    ensureDir(OUTPUT_DIR);
    buildFixtures();
    serverInfo = await startStaticServer(REPO_ROOT);

    try {
        browser = await chromium.launch({ headless: true });
        await runClassOnlyFlow(serverInfo.baseUrl, browser, dataset, results);
        await runWithKitFlow(serverInfo.baseUrl, browser, dataset, results);

        fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf8');
        console.log('saved', path.relative(REPO_ROOT, RESULT_PATH));
        console.log('saved', path.relative(REPO_ROOT, SCREENSHOT_PATH));
    } finally {
        if (browser) {
            await browser.close();
        }
        await closeServer(serverInfo.server);
    }
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
