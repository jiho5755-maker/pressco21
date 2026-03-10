#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var execFileSync = require('child_process').execFileSync;
var chromium = require('playwright').chromium;

var REPO_ROOT = path.resolve(__dirname, '..');
var FIXTURE_BUILDER = path.join(REPO_ROOT, 'scripts', 'build-partnerclass-playwright-fixtures.js');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's1-9-phase3-1');
var RESULT_PATH = path.join(OUTPUT_DIR, 'phase3-1-results.json');
var BASE_URL = process.env.PARTNERCLASS_FIXTURE_BASE_URL || 'http://127.0.0.1:8125';
var FIXTURE_BASE = BASE_URL + '/output/playwright/fixtures/partnerclass';
var TODAY = '2026-03-11';
var NEXT_WEEK = '2026-03-15';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function buildFixtures() {
    execFileSync(process.execPath, [FIXTURE_BUILDER], {
        cwd: REPO_ROOT,
        stdio: 'inherit'
    });
}

function buildDataset() {
    var detailData;
    var catalogClasses = [
        {
            class_id: 'CL_202603_001',
            class_name: '시그니처 플라워 박스',
            partner_name: '라피네 플라워',
            partner_code: 'PC_202603_001',
            category: '보존화',
            type: 'OFFLINE',
            format: '원데이',
            region: 'SEOUL',
            location: '서울 강남구 압구정로 12',
            level: 'BEGINNER',
            price: 68000,
            avg_rating: 4.9,
            class_count: 12,
            total_remaining: 2,
            thumbnail_url: 'https://dummyimage.com/800x600/e8d9c8/3d2c1e.jpg&text=Flower+Box',
            kit_enabled: 1,
            tags: '협회 추천',
            student_count: 18,
            review_count: 12
        },
        {
            class_id: 'CL_202603_002',
            class_name: '온라인 압화 카드 클래스',
            partner_name: '라피네 플라워',
            partner_code: 'PC_202603_001',
            category: '압화',
            type: 'ONLINE',
            format: '온라인',
            region: 'GYEONGGI',
            location: '온라인',
            level: 'INTERMEDIATE',
            price: 45000,
            avg_rating: 4.6,
            class_count: 4,
            total_remaining: 10,
            thumbnail_url: 'https://dummyimage.com/800x600/dce9df/3d2c1e.jpg&text=Online+Pressed+Flower',
            kit_enabled: 0,
            tags: '',
            student_count: 7,
            review_count: 4
        },
        {
            class_id: 'CL_202603_003',
            class_name: '리스 센터피스 클래스',
            partner_name: '라피네 플라워',
            partner_code: 'PC_202603_001',
            category: '리스',
            type: 'OFFLINE',
            format: '정기',
            region: 'BUSAN',
            location: '부산 해운대구 센텀로 9',
            level: 'ADVANCED',
            price: 82000,
            avg_rating: 4.8,
            class_count: 8,
            total_remaining: 6,
            thumbnail_url: 'https://dummyimage.com/800x600/e5e0cf/3d2c1e.jpg&text=Wreath+Centerpiece',
            kit_enabled: 1,
            tags: '',
            student_count: 11,
            review_count: 8
        }
    ];

    detailData = {
        class_id: 'CL_202603_001',
        class_name: '시그니처 플라워 박스',
        partner_name: '라피네 플라워',
        partner_code: 'PC_202603_001',
        category: '보존화',
        type: 'OFFLINE',
        region: 'SEOUL',
        location: '서울 강남구 압구정로 12',
        level: 'BEGINNER',
        price: 68000,
        avg_rating: 4.9,
        review_count: 12,
        student_count: 18,
        materials_included: '포함',
        description: '처음 배우는 분도 완성도 높은 박스를 가져갈 수 있는 시그니처 입문 클래스입니다.',
        thumbnail_url: 'https://dummyimage.com/1200x800/e8d9c8/3d2c1e.jpg&text=Flower+Box+Hero',
        partner: { partner_name: '라피네 플라워', name: '라피네 플라워' },
        schedules: [
            { schedule_id: 'SCH_TODAY_001', schedule_date: TODAY, schedule_time: '11:00', remaining: 2, booked_count: 2 },
            { schedule_id: 'SCH_NEXT_001', schedule_date: NEXT_WEEK, schedule_time: '14:00', remaining: 4, booked_count: 1 }
        ],
        curriculum: ['컬러 매칭', '박스 구조 잡기', '포장 마감'],
        materials_note: '꽃 상태에 맞춰 당일 컨디션이 가장 좋은 재료로 구성합니다.',
        kit_enabled: 1,
        kit_items: [
            { name: '보존화 믹스 팩', product_url: '/shop/shopdetail.html?branduid=2001', quantity: 1, price: 24000, branduid: '2001' },
            { name: '리본 세트', product_url: '/shop/shopdetail.html?branduid=2002', quantity: 2, price: 7000, branduid: '2002' }
        ],
        review_summary: { avg_rating: 4.9, total_count: 12 }
    };

    return {
        catalogClasses: catalogClasses,
        detailData: detailData,
        myBookings: [
            { booking_id: 'BK_UPCOMING_001', class_id: 'CL_202603_002', class_name: '온라인 압화 카드 클래스', partner_name: '라피네 플라워', class_date: '2026-03-20', participants: 1, amount: 45000, status: 'CONFIRMED' },
            { booking_id: 'BK_COMPLETED_001', class_id: 'CL_202603_001', class_name: '시그니처 플라워 박스', partner_name: '라피네 플라워', class_date: '2026-03-01', participants: 1, amount: 68000, status: 'COMPLETED' }
        ],
        partnerAuth: {
            success: true,
            data: {
                partner_code: 'PC_202603_001',
                member_id: 'partner-test-001',
                partner_name: '라피네 플라워',
                grade: 'BLOOM',
                status: 'ACTIVE',
                email: 'partner@example.com',
                phone: '010-1234-5678',
                instagram: '@raffine_flower',
                education_completed: false
            }
        },
        partnerDashboard: {
            success: true,
            data: {
                summary: {
                    total_revenue: 136000,
                    total_fee: 34000,
                    available_reserve: 102000,
                    total_bookings: 3
                },
                available_months: ['2026-03', '2026-02'],
                classes: [
                    {
                        class_id: 'CL_202603_001',
                        class_name: '시그니처 플라워 박스',
                        category: '보존화',
                        status: 'ACTIVE',
                        avg_rating: 4.9,
                        booking_count: 3,
                        thumbnail_url: 'https://dummyimage.com/800x600/e8d9c8/3d2c1e.jpg&text=Flower+Box',
                        kit_enabled: 1,
                        kit_items: JSON.stringify(detailData.kit_items)
                    }
                ],
                revenue_chart: [],
                revenue_summary: []
            }
        },
        partnerBookings: {
            success: true,
            data: {
                bookings: [
                    { booking_id: 'PB_001', class_id: 'CL_202603_001', class_name: '시그니처 플라워 박스', class_date: TODAY, class_time: '11:00', participants: 1, amount: 68000, status: 'CONFIRMED', customer_name: '김민지' },
                    { booking_id: 'PB_002', class_id: 'CL_202603_001', class_name: '시그니처 플라워 박스', class_date: NEXT_WEEK, class_time: '14:00', participants: 1, amount: 68000, status: 'CONFIRMED', customer_name: '이서연' }
                ]
            }
        },
        partnerReviews: {
            success: true,
            data: {
                reviews: [
                    { review_id: 'RV_001', class_id: 'CL_202603_001', class_name: '시그니처 플라워 박스', rating: 5, content: '설명이 차분하고 결과물이 만족스러웠어요.', reply_text: '', member_name: '김민지', created_at: '2026-03-10 10:00:00' },
                    { review_id: 'RV_002', class_id: 'CL_202603_001', class_name: '시그니처 플라워 박스', rating: 4, content: '재료 구성이 좋아서 집에서도 다시 만들 수 있었어요.', reply_text: '', member_name: '이서연', created_at: '2026-03-09 09:00:00' }
                ],
                pagination: { page: 1, totalPages: 1 },
                summary: {
                    avg_rating: 4.5,
                    total_count: 2,
                    unanswered_count: 2,
                    rating_distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 }
                }
            }
        },
        settlementRows: [
            {
                Id: 77,
                settlement_id: 'STL_20260311_000001',
                partner_code: 'PC_202603_001',
                partner_name: '라피네 플라워',
                class_id: 'CL_202603_001',
                class_name: '시그니처 플라워 박스',
                class_date: '2026-03-11',
                order_amount: 136000,
                commission_rate: 25,
                commission_amount: 34000,
                reserve_amount: 102000,
                partner_amount: 102000,
                status: 'PENDING_SETTLEMENT',
                CreatedAt: '2026-03-11 00:00:00+00:00'
            }
        ],
        settlementHistory: [
            {
                statement_id: 'SETB_202603_H1_PC_202603_001',
                cycle_label: '2026-03 전반',
                partner_code: 'PC_202603_001',
                partner_name: '라피네 플라워',
                grade: 'BLOOM',
                recipient_email: 'partner@example.com',
                classes_count: 1,
                total_order_amount: 136000,
                total_commission_amount: 34000,
                total_reserve_amount: 102000,
                last_sent_at: ''
            }
        ]
    };
}

function parsePayload(route) {
    try {
        return route.request().postDataJSON();
    } catch (err) {
        return {};
    }
}

function normalizeType(text) {
    var value = String(text || '').toUpperCase();
    if (value === '오프라인') return 'OFFLINE';
    if (value === '온라인') return 'ONLINE';
    return value;
}

function normalizeRegion(text) {
    var map = { '서울': 'SEOUL', '경기': 'GYEONGGI', '부산': 'BUSAN' };
    return map[text] || String(text || '').toUpperCase();
}

function screenshotPath(name) {
    return path.join(OUTPUT_DIR, name);
}

async function installMocks(page, data, basketAdds) {
    await page.route('**/webhook/class-api', async function(route) {
        var payload = parsePayload(route);
        if (payload.action === 'getCategories') {
            await route.fulfill({ json: { success: true, data: ['보존화', '압화', '리스'] } });
            return;
        }
        if (payload.action === 'getClasses') {
            var filtered = data.catalogClasses.slice();
            if (payload.region) {
                var regions = String(payload.region).split(',').map(normalizeRegion);
                filtered = filtered.filter(function(item) {
                    return regions.indexOf(normalizeRegion(item.region)) > -1;
                });
            }
            if (payload.type) {
                var types = String(payload.type).split(',');
                filtered = filtered.filter(function(item) {
                    if (types.indexOf('온라인') > -1) return normalizeType(item.type) === 'ONLINE';
                    if (types.indexOf('원데이') > -1 || types.indexOf('정기') > -1) return normalizeType(item.type) !== 'ONLINE';
                    return true;
                });
            }
            await route.fulfill({ json: { success: true, data: { classes: filtered, total: filtered.length, page: 1, totalPages: 1 } } });
            return;
        }
        if (payload.action === 'getClassDetail') {
            var target = payload.id === 'CL_202603_001'
                ? data.detailData
                : data.catalogClasses.find(function(item) { return item.class_id === payload.id; });
            var response = target && target.class_id === 'CL_202603_001'
                ? data.detailData
                : Object.assign({}, data.detailData, {
                    class_id: target.class_id,
                    class_name: target.class_name,
                    category: target.category,
                    type: target.type,
                    region: target.region,
                    price: target.price,
                    avg_rating: target.avg_rating,
                    review_count: target.review_count || target.class_count,
                    student_count: target.student_count,
                    kit_enabled: target.kit_enabled,
                    kit_items: target.kit_enabled ? data.detailData.kit_items : [],
                    materials_included: target.kit_enabled ? '포함' : '개별 준비',
                    schedules: [],
                    location: target.location,
                    partner_name: target.partner_name,
                    partner: { partner_name: target.partner_name, name: target.partner_name }
                });
            await route.fulfill({ json: { success: true, data: response } });
            return;
        }
        if (payload.action === 'getAffiliations') {
            await route.fulfill({ json: { success: true, total: 1, data: [{ affiliation_code: 'AFF001', name: '테스트 협회', contact_name: '홍길동', discount_rate: 10, incentive_tiers: [] }] } });
            return;
        }
        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/partner-auth', async function(route) {
        var payload = parsePayload(route);
        if (payload.action === 'getPartnerAuth') {
            await route.fulfill({ json: data.partnerAuth });
            return;
        }
        if (payload.action === 'getPartnerDashboard') {
            await route.fulfill({ json: data.partnerDashboard });
            return;
        }
        if (payload.action === 'getEducationStatus') {
            await route.fulfill({ json: { success: true, data: { is_partner: true, education_completed: false } } });
            return;
        }
        if (payload.action === 'updatePartnerProfile') {
            await route.fulfill({ json: { success: true, data: { updated: true } } });
            return;
        }
        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/partner-data', async function(route) {
        var payload = parsePayload(route);
        if (payload.action === 'getPartnerBookings') {
            await route.fulfill({ json: data.partnerBookings });
            return;
        }
        if (payload.action === 'getPartnerReviews') {
            await route.fulfill({ json: data.partnerReviews });
            return;
        }
        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/class-management', async function(route) {
        await route.fulfill({ json: { success: true, data: { updated: true } } });
    });
    await page.route('**/webhook/class-edit', async function(route) {
        await route.fulfill({ json: { success: true, data: { updated: true } } });
    });
    await page.route('**/webhook/schedule-manage', async function(route) {
        var payload = parsePayload(route);
        await route.fulfill({ json: { success: true, data: { schedule_id: payload.schedule_id || 'SCH_NEW_001' } } });
    });
    await page.route('**/webhook/review-reply', async function(route) {
        await route.fulfill({ json: { success: true, data: { replied: true } } });
    });
    await page.route('**/webhook/my-bookings', async function(route) {
        await route.fulfill({ json: { success: true, data: { bookings: data.myBookings } } });
    });

    await page.route('**/webhook/admin-api', async function(route) {
        var payload = parsePayload(route);
        if (payload.action === 'getApplications') {
            await route.fulfill({ json: { success: true, data: { applications: [], total: 0 } } });
            return;
        }
        if (payload.action === 'getPendingClasses') {
            await route.fulfill({ json: { success: true, data: { classes: [], total: 0 } } });
            return;
        }
        if (payload.action === 'getSettlements') {
            await route.fulfill({ json: { success: true, data: { settlements: data.settlementRows, total: data.settlementRows.length, summary: { total_order_amount: 136000, total_commission: 34000, total_partner_amount: 102000 } } } });
            return;
        }
        if (payload.action === 'completeSettlement') {
            await route.fulfill({ json: { success: true, data: { completed_count: 1, total_paid: 102000, not_found_ids: [] } } });
            return;
        }
        if (payload.action === 'getAffilStats') {
            await route.fulfill({ json: { success: true, data: [] } });
            return;
        }
        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/settlement-batch', async function(route) {
        var payload = parsePayload(route);
        if (payload.action === 'getSettlementHistory') {
            await route.fulfill({ json: { success: true, data: { history: data.settlementHistory, total: data.settlementHistory.length, summary: { month: payload.month || '2026-03', total_order_amount: 136000, total_reserve_amount: 102000, sent_count: 0 } } } });
            return;
        }
        if (payload.action === 'runSettlementBatch') {
            await route.fulfill({ json: { success: false, data: { cycle_label: '2026-03 전반', sent_count: 0, failed_count: 1, total_order_amount: 136000, total_reserve_amount: 102000, message: '정산서 발송 중 실패가 발생했습니다.' }, error: { code: 'SETTLEMENT_EMAIL_FAILED', message: 'Invalid login: 535 5.7.1 Username and Password not accepted' } } });
            return;
        }
        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/shop/shopdetail.html?branduid=*', async function(route) {
        var url = new URL(route.request().url());
        var branduid = url.searchParams.get('branduid') || '';
        var html = '<!doctype html><html><body><form name="detailform"><input name="brandcode" value="BC_' + branduid + '"><input name="xcode" value="000"><input name="mcode" value="000"><input name="typep" value="X"><input name="opt_type" value="NO"><input name="basket_use" value="Y"><input name="cart_free" value=""><input name="sto_id" value="1"></form><h1 class="goods--title">상품 ' + branduid + '</h1></body></html>';
        await route.fulfill({ contentType: 'text/html', body: html });
    });

    await page.route('**/shop/basket.action.html', async function(route) {
        basketAdds.push(route.request().postData() || '');
        await route.fulfill({ json: { status: true, message: 'ok' } });
    });
}

async function main() {
    var browser;
    var page;
    var basketAdds = [];
    var data = buildDataset();
    var results = {};

    ensureDir(OUTPUT_DIR);
    buildFixtures();

    browser = await chromium.launch({ headless: true });

    try {
        page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
        await installMocks(page, data, basketAdds);

        await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(function() {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto(FIXTURE_BASE + '/list.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() { return document.querySelectorAll('.class-card').length === 3; });
        results.listBefore = await page.evaluate(function() {
            return {
                cardCount: document.querySelectorAll('.class-card').length,
                firstTitle: document.querySelector('.class-card__title').textContent.trim(),
                firstBadges: Array.from(document.querySelectorAll('.class-card__trust-badge')).slice(0, 3).map(function(el) { return el.textContent.trim(); }),
                hasMapEntry: !!document.querySelector('.class-card__map-entry')
            };
        });
        await page.click('.quick-filter-chip[data-quick-key="region"][data-value="서울"]');
        await page.click('.quick-filter-chip[data-quick-key="format"][data-value="오프라인"]');
        await page.waitForFunction(function() { return document.querySelectorAll('.class-card').length === 1; });
        results.listAfter = await page.evaluate(function() {
            return {
                cardCount: document.querySelectorAll('.class-card').length,
                activeFilters: Array.from(document.querySelectorAll('.quick-filter-chip.is-active')).map(function(el) { return el.textContent.trim(); }),
                firstTitle: document.querySelector('.class-card__title').textContent.trim()
            };
        });
        assert.strictEqual(results.listBefore.cardCount, 3);
        assert.strictEqual(results.listAfter.cardCount, 1);
        assert.strictEqual(results.listAfter.firstTitle, '시그니처 플라워 박스');
        await page.screenshot({ path: screenshotPath('list-flow.png'), fullPage: true });

        await page.goto(FIXTURE_BASE + '/detail.html?class_id=CL_202603_001', { waitUntil: 'networkidle' });
        await page.waitForSelector('#detailTrustBarStats .detail-trust-bar__stat');
        await page.click('.js-material-add');
        await page.waitForTimeout(1000);
        await page.click('#tab-faq');
        await page.fill('#faqSearchInput', '환불');
        await page.waitForFunction(function() { return document.getElementById('faqResultCount').textContent.indexOf('1개') > -1; });
        results.detail = await page.evaluate(function(count) {
            return {
                trustVisible: document.getElementById('detailTrustBar').style.display !== 'none',
                trustStats: Array.from(document.querySelectorAll('#detailTrustBarStats .detail-trust-bar__stat')).map(function(el) { return el.textContent.trim(); }),
                materialCount: document.querySelectorAll('.material-card').length,
                faqMessage: document.getElementById('faqResultCount').textContent.trim(),
                lastToast: document.querySelector('.detail-toast') ? document.querySelector('.detail-toast').textContent.trim() : '',
                basketAddCount: count
            };
        }, basketAdds.length);
        assert.strictEqual(results.detail.trustVisible, true);
        assert.strictEqual(results.detail.materialCount, 2);
        assert.strictEqual(results.detail.basketAddCount, 1);
        await page.screenshot({ path: screenshotPath('detail-flow.png'), fullPage: true });

        await page.goto(FIXTURE_BASE + '/mypage.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('.mb-booking-card');
        results.mypage = await page.evaluate(function() {
            return {
                total: document.getElementById('mbTotalCount').textContent.trim(),
                completed: document.getElementById('mbCompletedCount').textContent.trim(),
                completedCards: document.querySelectorAll('.mb-booking-card--completed').length,
                kitChipCount: document.querySelectorAll('.mb-kit-chip').length,
                relatedCount: document.querySelectorAll('.mb-related-card').length
            };
        });
        assert.strictEqual(results.mypage.total, '2');
        assert.strictEqual(results.mypage.completed, '1');
        assert.strictEqual(results.mypage.kitChipCount, 2);
        await page.screenshot({ path: screenshotPath('mypage-flow.png'), fullPage: true });

        await page.goto(FIXTURE_BASE + '/partner.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.getElementById('pdActionTodayValue') && document.getElementById('pdActionTodayValue').textContent.trim() === '1건';
        });
        results.partner = await page.evaluate(function() {
            return {
                onboardingProgress: document.getElementById('pdOnboardingCardProgressText').textContent.trim(),
                actionToday: document.getElementById('pdActionTodayValue').textContent.trim(),
                actionKit: document.getElementById('pdActionKitValue').textContent.trim(),
                actionReview: document.getElementById('pdActionReviewValue').textContent.trim()
            };
        });
        assert.strictEqual(results.partner.actionToday, '1건');
        assert.strictEqual(results.partner.actionKit, '2건');
        assert.strictEqual(results.partner.actionReview, '2건');

        if (await page.locator('#pdOnboardingModal').isVisible()) {
            await page.click('#pdOnboardingModal .pd-modal__close');
            await page.waitForFunction(function() {
                var modal = document.getElementById('pdOnboardingModal');
                return modal && modal.style.display === 'none';
            });
        }

        await page.click('.js-edit-class');
        await page.waitForSelector('#pdEditClassModal');
        results.partner.editModal = await page.evaluate(function() {
            return {
                kitRowCount: document.querySelectorAll('#editKitItems .pd-kit-row').length,
                firstKitName: document.querySelector('#editKitItems .pd-kit-name').value,
                firstKitUrl: document.querySelector('#editKitItems .pd-kit-url').value
            };
        });
        assert.strictEqual(results.partner.editModal.kitRowCount, 2);

        await page.click('#pdEditClassModal .pd-modal__close');
        await page.waitForFunction(function() {
            var modal = document.getElementById('pdEditClassModal');
            return modal && !modal.classList.contains('pd-modal--open');
        });

        await page.click('#pdActionCardToday');
        await page.waitForFunction(function() {
            return document.getElementById('pdTabBtnSchedules').classList.contains('is-active')
                && document.getElementById('pdScheduleClass').value === 'CL_202603_001';
        });
        results.partner.todayTab = await page.evaluate(function() {
            return {
                activeTab: document.querySelector('.pd-tabs__btn.is-active').textContent.trim(),
                selectedClass: document.getElementById('pdScheduleClass').value
            };
        });
        assert.strictEqual(results.partner.todayTab.selectedClass, 'CL_202603_001');

        await page.click('#pdActionCardKit');
        await page.waitForFunction(function() {
            return document.getElementById('pdTabBtnBookings').classList.contains('is-active')
                && document.getElementById('pdBookingPeriod').value === 'custom';
        });
        results.partner.kitTab = await page.evaluate(function() {
            return {
                activeTab: document.querySelector('.pd-tabs__btn.is-active').textContent.trim(),
                period: document.getElementById('pdBookingPeriod').value,
                selectedClass: document.getElementById('pdBookingClass').value
            };
        });
        assert.strictEqual(results.partner.kitTab.period, 'custom');

        await page.click('#pdActionCardReview');
        await page.waitForFunction(function() { return document.getElementById('pdTabBtnReviews').classList.contains('is-active'); });
        results.partner.reviewTab = await page.evaluate(function() {
            return {
                activeTab: document.querySelector('.pd-tabs__btn.is-active').textContent.trim(),
                reviewCards: document.querySelectorAll('.pd-review-card').length
            };
        });
        assert.strictEqual(results.partner.reviewTab.reviewCards, 2);
        await page.screenshot({ path: screenshotPath('partner-flow.png'), fullPage: true });

        await page.goto(FIXTURE_BASE + '/admin.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            var main = document.getElementById('adMain');
            return main && main.style.display !== 'none';
        });
        await page.click('button[data-tab="settlements"]');
        await page.waitForFunction(function() {
            return document.querySelector('button[data-tab="settlements"]').classList.contains('ad-tabs__btn--active');
        });
        results.adminBeforeRun = await page.evaluate(function() {
            return {
                summaryOrder: document.getElementById('settleOrderTotal').textContent.trim(),
                summaryCommission: document.getElementById('settleCommission').textContent.trim(),
                historyRows: document.querySelectorAll('#tbodySettlementHistory tr').length
            };
        });
        assert.notStrictEqual(results.adminBeforeRun.summaryOrder.indexOf('136,000'), -1);
        assert.notStrictEqual(results.adminBeforeRun.summaryCommission.indexOf('34,000'), -1);
        assert.strictEqual(results.adminBeforeRun.historyRows, 1);

        await page.click('#btnRunSettlement');
        await page.waitForFunction(function() {
            var modal = document.getElementById('adModal');
            return modal && modal.style.display !== 'none';
        });
        await page.click('#modalConfirm');
        await page.waitForSelector('.ad-toast');
        results.adminAfterRun = await page.evaluate(function() {
            return {
                toastText: document.querySelector('.ad-toast').textContent.trim(),
                historyMeta: document.getElementById('settlementHistoryMeta').textContent.trim()
            };
        });
        assert.notStrictEqual(results.adminAfterRun.toastText.indexOf('정산 실행 실패'), -1);
        await page.screenshot({ path: screenshotPath('admin-flow.png'), fullPage: true });

        fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2), 'utf8');
        console.log(JSON.stringify(results, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch(function(err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
