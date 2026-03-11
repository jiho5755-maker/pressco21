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
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-8-cache');
var RESULT_PATH = path.join(OUTPUT_DIR, 'cache-results.json');
var SCREENSHOT_PATH = path.join(OUTPUT_DIR, 'cache-flow.png');

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
                pathname = '/output/playwright/fixtures/partnerclass/list.html';
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

function parsePayload(route) {
    try {
        return route.request().postDataJSON();
    } catch (err) {
        return {};
    }
}

function buildDataset() {
    return {
        classes: [
            {
                class_id: 'CL_CACHE_001',
                class_name: 'Cache Flower Box',
                partner_name: 'Raffine Flower',
                partner_code: 'PC_CACHE_001',
                category: '보존화',
                type: '원데이',
                region: 'SEOUL',
                location: '서울 강남구 압구정로 12',
                level: 'BEGINNER',
                price: 68000,
                avg_rating: 4.9,
                class_count: 12,
                total_remaining: 2,
                review_count: 12,
                student_count: 24,
                status: 'ACTIVE',
                thumbnail_url: 'https://dummyimage.com/800x600/e8d9c8/3d2c1e.jpg&text=Cache+Flower+Box',
                makeshop_product_id: '900001',
                makeshop_brandcode: 'personal',
                makeshop_xcode: 'personal',
                makeshop_mcode: ''
            },
            {
                class_id: 'CL_CACHE_002',
                class_name: 'Cache Wreath Class',
                partner_name: 'Raffine Flower',
                partner_code: 'PC_CACHE_001',
                category: '리스',
                type: '정기',
                region: 'BUSAN',
                location: '부산 해운대구 센텀로 9',
                level: 'INTERMEDIATE',
                price: 72000,
                avg_rating: 4.7,
                class_count: 8,
                total_remaining: 5,
                review_count: 8,
                student_count: 15,
                status: 'ACTIVE',
                thumbnail_url: 'https://dummyimage.com/800x600/e5e0cf/3d2c1e.jpg&text=Cache+Wreath',
                makeshop_product_id: '900002',
                makeshop_brandcode: 'personal',
                makeshop_xcode: 'personal',
                makeshop_mcode: ''
            }
        ],
        detail: {
            class_id: 'CL_CACHE_001',
            id: 'CL_CACHE_001',
            class_name: 'Cache Flower Box',
            title: 'Cache Flower Box',
            partner_name: 'Raffine Flower',
            partner_code: 'PC_CACHE_001',
            category: '보존화',
            type: '원데이',
            region: 'SEOUL',
            location: '서울 강남구 압구정로 12',
            level: 'BEGINNER',
            price: 68000,
            avg_rating: 4.9,
            class_count: 12,
            review_count: 12,
            student_count: 24,
            booked_count: 8,
            total_remaining: 2,
            kit_enabled: 1,
            kit_items: [
                { name: 'Flower Kit', quantity: 1, price: 24000, product_url: '/shop/shopdetail.html?branduid=2001', branduid: '2001' }
            ],
            description: '<p>Cache invalidation review flow test.</p>',
            instructor_bio: 'Partner focused on entry classes.',
            partner: {
                partner_name: 'Raffine Flower',
                name: 'Raffine Flower',
                grade: 'BLOOM',
                avg_rating: 4.9,
                location: '서울 강남구 압구정로 12'
            },
            schedules: [
                { schedule_id: 'SCH_CACHE_001', schedule_date: '2026-03-20', schedule_time: '14:00', remaining: 2, booked_count: 6 }
            ],
            curriculum: ['Warm up', 'Flower box structure', 'Wrapping'],
            materials_included: '포함',
            materials_note: 'Materials are prepared ahead of class.',
            youtube_video_id: '',
            reviews: [
                { name: 'Member A', date: '2026-03-10', rating: 5, text: 'Very helpful class with clean flow.' }
            ],
            makeshop_product_id: '900001',
            makeshop_brandcode: 'personal',
            makeshop_xcode: 'personal',
            makeshop_mcode: ''
        },
        categories: [
            { name: '보존화', class_count: 1 },
            { name: '리스', class_count: 1 }
        ],
        affiliations: [
            {
                affiliation_code: 'AFF_CACHE_001',
                name: 'Cache Association',
                logo_url: '',
                discount_rate: 10,
                incentive_tiers: [
                    { target: 5000000, incentive: 250000 }
                ],
                contact_name: 'Hong',
                memo: 'Members get curated benefits.'
            }
        ]
    };
}

function getStorageSnapshot(page) {
    return page.evaluate(function() {
        var result = {
            catalogVersion: localStorage.getItem('pressco21_catalog_cache_version') || '',
            settingsVersion: localStorage.getItem('pressco21_catalog_settings_cache_version') || '',
            catalogKeys: [],
            settingsKeys: []
        };
        var i;

        for (i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('classCatalog_') === 0) {
                result.catalogKeys.push(key);
            } else if (key && key.indexOf('classSettings_') === 0) {
                result.settingsKeys.push(key);
            }
        }

        result.catalogKeys.sort();
        result.settingsKeys.sort();
        return result;
    });
}

function expireCacheEntries(page, prefixes, ageMs) {
    return page.evaluate(function(args) {
        var i;
        var keys = [];
        var staleTimestamp = Date.now() - args.ageMs;

        for (i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
        }

        keys.forEach(function(key) {
            var raw;
            var entry;
            var matched = false;
            var j;

            for (j = 0; j < args.prefixes.length; j++) {
                if (key && key.indexOf(args.prefixes[j]) === 0) {
                    matched = true;
                    break;
                }
            }

            if (!matched) return;
            raw = localStorage.getItem(key);
            if (!raw) return;

            try {
                entry = JSON.parse(raw);
            } catch (err) {
                return;
            }

            entry.timestamp = staleTimestamp;
            localStorage.setItem(key, JSON.stringify(entry));
        });
    }, {
        prefixes: prefixes,
        ageMs: ageMs
    });
}

function resetCounters(counters) {
    counters.getClassesList = 0;
    counters.getClassesRelated = 0;
    counters.getCategories = 0;
    counters.getAffiliations = 0;
    counters.getClassDetail = 0;
    counters.reviewSubmit = 0;
}

async function installMocks(page, data, counters) {
    await page.route('**/webhook/class-api', async function(route) {
        var payload = parsePayload(route);
        var response;

        if (payload.action === 'getCategories') {
            counters.getCategories += 1;
            await route.fulfill({
                json: {
                    success: true,
                    data: data.categories
                }
            });
            return;
        }

        if (payload.action === 'getAffiliations') {
            counters.getAffiliations += 1;
            await route.fulfill({
                json: {
                    success: true,
                    total: data.affiliations.length,
                    data: data.affiliations
                }
            });
            return;
        }

        if (payload.action === 'getClassDetail') {
            counters.getClassDetail += 1;
            await route.fulfill({
                json: {
                    success: true,
                    data: data.detail
                }
            });
            return;
        }

        if (payload.action === 'getClasses') {
            response = data.classes.slice();
            if (payload.category) {
                response = response.filter(function(item) {
                    return item.category === payload.category;
                });
            }

            if (payload.limit === 24 || String(payload.limit || '') === '24') {
                counters.getClassesRelated += 1;
            } else {
                counters.getClassesList += 1;
            }

            await route.fulfill({
                json: {
                    success: true,
                    data: {
                        classes: response,
                        total: response.length,
                        page: 1,
                        totalPages: 1
                    }
                }
            });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/review-submit', async function(route) {
        counters.reviewSubmit += 1;
        await route.fulfill({
            json: {
                success: true,
                data: {
                    review_id: 'RV_CACHE_001'
                }
            }
        });
    });

    await page.route('**/shop/shopdetail.html?branduid=*', async function(route) {
        var url = new URL(route.request().url());
        var branduid = url.searchParams.get('branduid') || '';
        var html = '<!doctype html><html><body><form name="detailform"><input name="brandcode" value="BC_' + branduid + '"><input name="xcode" value="000"><input name="mcode" value="000"><input name="typep" value="X"><input name="opt_type" value="NO"><input name="basket_use" value="Y"><input name="cart_free" value=""><input name="sto_id" value="1"></form><h1>Product ' + branduid + '</h1></body></html>';
        await route.fulfill({ contentType: 'text/html', body: html });
    });

    await page.route('**/shop/basket.action.html', async function(route) {
        await route.fulfill({ json: { status: true, message: 'ok' } });
    });
}

async function main() {
    var browser;
    var page;
    var serverInfo;
    var fixtureBase;
    var data = buildDataset();
    var counters = {
        getClassesList: 0,
        getClassesRelated: 0,
        getCategories: 0,
        getAffiliations: 0,
        getClassDetail: 0,
        reviewSubmit: 0
    };
    var results = {};
    var storageBeforeInvalidate;
    var storageAfterInvalidate;
    var countsAfterInvalidate;

    ensureDir(OUTPUT_DIR);
    buildFixtures();
    serverInfo = await startStaticServer(REPO_ROOT);
    fixtureBase = serverInfo.baseUrl + '/output/playwright/fixtures/partnerclass';

    browser = await chromium.launch({ headless: true });

    try {
        page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
        await installMocks(page, data, counters);

        await page.goto(fixtureBase + '/list.html', { waitUntil: 'networkidle' });
        await page.evaluate(function() {
            localStorage.clear();
            sessionStorage.clear();
        });
        resetCounters(counters);

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.querySelectorAll('.class-card').length === 2;
        });
        results.initialLoad = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getClassesList, 1);
        assert.strictEqual(counters.getCategories, 1);
        assert.strictEqual(results.initialLoad.storage.catalogKeys.length, 1);
        assert.strictEqual(results.initialLoad.storage.settingsKeys.length, 1);

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.querySelectorAll('.class-card').length === 2;
        });
        results.listCacheHit = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getClassesList, 1);
        assert.strictEqual(counters.getCategories, 1);

        await page.click('.catalog-tabs__btn[data-tab="affiliations"]');
        await page.waitForFunction(function() {
            return document.querySelectorAll('.affil-card').length === 1;
        });
        results.affiliationFirstLoad = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getAffiliations, 1);
        assert.strictEqual(results.affiliationFirstLoad.storage.settingsKeys.length, 2);

        await page.goto(fixtureBase + '/list.html?tab=affiliations', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.querySelectorAll('.affil-card').length === 1;
        });
        results.affiliationCacheHit = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getAffiliations, 1);

        storageBeforeInvalidate = await getStorageSnapshot(page);
        await page.goto(fixtureBase + '/detail.html?class_id=CL_CACHE_001', { waitUntil: 'networkidle' });
        await page.click('#tab-reviews');
        await page.waitForSelector('#reviewForm');
        await page.click('.star-rating__btn[data-value="5"]');
        await page.fill('#reviewTextarea', 'Cache invalidation review submission for phase three verification.');
        await page.waitForFunction(function() {
            var button = document.getElementById('reviewSubmitBtn');
            return button && !button.disabled;
        });
        await page.click('#reviewSubmitBtn');
        await page.waitForFunction(function() {
            return !!document.querySelector('.review-toast');
        });
        storageAfterInvalidate = await getStorageSnapshot(page);
        results.detailReviewInvalidate = {
            counters: Object.assign({}, counters),
            before: storageBeforeInvalidate,
            after: storageAfterInvalidate
        };
        assert.strictEqual(counters.reviewSubmit, 1);
        assert.notStrictEqual(storageAfterInvalidate.catalogVersion, storageBeforeInvalidate.catalogVersion);
        assert.strictEqual(storageAfterInvalidate.catalogKeys.length, 0);

        countsAfterInvalidate = Object.assign({}, counters);
        await page.goto(fixtureBase + '/list.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.querySelectorAll('.class-card').length === 2;
        });
        results.afterInvalidateReload = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getClassesList, countsAfterInvalidate.getClassesList + 1);
        assert.strictEqual(counters.getCategories, countsAfterInvalidate.getCategories);

        await expireCacheEntries(page, ['classCatalog_', 'classSettings_'], 2 * 60 * 60 * 1000);
        await page.goto(fixtureBase + '/list.html', { waitUntil: 'networkidle' });
        await page.waitForFunction(function() {
            return document.querySelectorAll('.class-card').length === 2;
        });
        await page.click('.catalog-tabs__btn[data-tab="affiliations"]');
        await page.waitForFunction(function() {
            return document.querySelectorAll('.affil-card').length === 1;
        });
        results.afterTtlExpiry = {
            counters: Object.assign({}, counters),
            storage: await getStorageSnapshot(page)
        };
        assert.strictEqual(counters.getClassesList, results.afterInvalidateReload.counters.getClassesList + 1);
        assert.strictEqual(counters.getCategories, results.afterInvalidateReload.counters.getCategories + 1);
        assert.strictEqual(counters.getAffiliations, results.afterInvalidateReload.counters.getAffiliations + 1);

        await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

        fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2), 'utf8');
        console.log(JSON.stringify(results, null, 2));
    } finally {
        if (browser) {
            await browser.close();
        }
        if (serverInfo && serverInfo.server) {
            await closeServer(serverInfo.server);
        }
    }
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
