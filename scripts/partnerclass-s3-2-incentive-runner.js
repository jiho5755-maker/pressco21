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
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-2-incentives');
var RESULT_PATH = path.join(OUTPUT_DIR, 'incentive-results.json');
var PARTNER_SHOT = path.join(OUTPUT_DIR, 'partner-grade-benefits.png');
var LIST_SHOT = path.join(OUTPUT_DIR, 'list-benefit-priority.png');
var DETAIL_SHOT = path.join(OUTPUT_DIR, 'detail-related-priority.png');
var HUB_SHOT = path.join(OUTPUT_DIR, 'content-hub-story-priority.png');

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
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Bad Request');
                return;
            }

            if (pathname === '/') {
                pathname = '/output/playwright/fixtures/partnerclass/partner.html';
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
    } catch (error) {
        return {};
    }
}

function buildState() {
    var classes = [
        {
            class_id: 'CL_S32_001',
            class_name: '블룸 시작 클래스',
            category: '부케',
            level: 'BEGINNER',
            region: 'SEOUL',
            location: '서울 성수동',
            price: 42000,
            avg_rating: 4.6,
            class_count: 6,
            total_remaining: 4,
            kit_enabled: 0,
            content_type: 'GENERAL',
            partner_name: '블룸 플라워',
            partner_code: 'PC_BLOOM_001',
            partner_grade: 'BLOOM',
            thumbnail_url: 'https://dummyimage.com/800x600/e8dcc9/3d2c1e.jpg&text=BLOOM'
        },
        {
            class_id: 'CL_S32_002',
            class_name: '가든 시그니처 리스',
            category: '리스',
            level: 'INTERMEDIATE',
            region: 'SEOUL',
            location: '서울 마포구',
            price: 56000,
            avg_rating: 4.8,
            class_count: 14,
            total_remaining: 5,
            kit_enabled: 1,
            content_type: 'GENERAL',
            partner_name: '가든 아뜰리에',
            partner_code: 'PC_GARDEN_001',
            partner_grade: 'GARDEN',
            thumbnail_url: 'https://dummyimage.com/800x600/dce9d8/2f4634.jpg&text=GARDEN'
        },
        {
            class_id: 'CL_S32_003',
            class_name: '아뜰리에 웨딩 부케',
            category: '부케',
            level: 'ADVANCED',
            region: 'BUSAN',
            location: '부산 해운대구',
            price: 76000,
            avg_rating: 4.9,
            class_count: 18,
            total_remaining: 3,
            kit_enabled: 1,
            content_type: 'AFFILIATION',
            partner_name: '아뜰리에 부케랩',
            partner_code: 'PC_ATELIER_001',
            partner_grade: 'ATELIER',
            thumbnail_url: 'https://dummyimage.com/800x600/dce5f2/29486b.jpg&text=ATELIER'
        },
        {
            class_id: 'CL_S32_004',
            class_name: '앰배서더 온라인 세미나',
            category: '센터피스',
            level: 'INTERMEDIATE',
            region: 'ONLINE',
            location: '온라인 라이브',
            price: 68000,
            avg_rating: 5.0,
            class_count: 24,
            total_remaining: 20,
            kit_enabled: 1,
            content_type: 'EVENT',
            partner_name: '앰배서더 스튜디오',
            partner_code: 'PC_AMB_001',
            partner_grade: 'AMBASSADOR',
            thumbnail_url: 'https://dummyimage.com/800x600/f1d9df/7a3040.jpg&text=AMBASSADOR'
        }
    ];
    var details = {
        CL_S32_001: {
            class_id: 'CL_S32_001',
            id: 'CL_S32_001',
            class_name: '블룸 시작 클래스',
            category: '부케',
            level: 'BEGINNER',
            region: 'SEOUL',
            location: '서울 성수동',
            price: 42000,
            avg_rating: 4.6,
            class_count: 6,
            student_count: 16,
            booked_count: 4,
            total_remaining: 4,
            kit_enabled: 0,
            description: '<p>블룸 단계 파트너의 입문 클래스입니다.</p>',
            instructor_bio: '블룸 단계 운영 파트너',
            partner: {
                partner_code: 'PC_BLOOM_001',
                partner_name: '블룸 플라워',
                name: '블룸 플라워',
                grade: 'BLOOM',
                avg_rating: 4.6,
                location: '서울 성수동'
            },
            schedules: [
                { schedule_id: 'SCH_S32_001', schedule_date: '2026-03-20', schedule_time: '14:00', remaining: 4, booked_count: 4 }
            ],
            reviews: [],
            thumbnail_url: 'https://dummyimage.com/800x600/e8dcc9/3d2c1e.jpg&text=BLOOM',
            image_urls: ['https://dummyimage.com/800x600/e8dcc9/3d2c1e.jpg&text=BLOOM'],
            materials_included: '꽃 재료 기본 제공',
            contact_phone: '010-1234-1111',
            contact_instagram: 'https://instagram.com/bloom',
            contact_kakao: 'https://pf.kakao.com/_bloom'
        },
        CL_S32_002: {
            class_id: 'CL_S32_002',
            id: 'CL_S32_002',
            class_name: '가든 시그니처 리스',
            category: '리스',
            level: 'INTERMEDIATE',
            region: 'SEOUL',
            location: '서울 마포구',
            price: 56000,
            avg_rating: 4.8,
            class_count: 14,
            total_remaining: 5,
            kit_enabled: 1,
            partner: {
                partner_code: 'PC_GARDEN_001',
                partner_name: '가든 아뜰리에',
                name: '가든 아뜰리에',
                grade: 'GARDEN',
                avg_rating: 4.8,
                location: '서울 마포구'
            },
            schedules: [{ schedule_id: 'SCH_S32_002', schedule_date: '2026-03-22', schedule_time: '11:00', remaining: 5, booked_count: 3 }]
        },
        CL_S32_003: {
            class_id: 'CL_S32_003',
            id: 'CL_S32_003',
            class_name: '아뜰리에 웨딩 부케',
            category: '부케',
            level: 'ADVANCED',
            region: 'BUSAN',
            location: '부산 해운대구',
            price: 76000,
            avg_rating: 4.9,
            class_count: 18,
            total_remaining: 3,
            kit_enabled: 1,
            partner: {
                partner_code: 'PC_ATELIER_001',
                partner_name: '아뜰리에 부케랩',
                name: '아뜰리에 부케랩',
                grade: 'ATELIER',
                avg_rating: 4.9,
                location: '부산 해운대구'
            },
            schedules: [{ schedule_id: 'SCH_S32_003', schedule_date: '2026-03-25', schedule_time: '15:00', remaining: 3, booked_count: 5 }]
        },
        CL_S32_004: {
            class_id: 'CL_S32_004',
            id: 'CL_S32_004',
            class_name: '앰배서더 온라인 세미나',
            category: '센터피스',
            level: 'INTERMEDIATE',
            region: 'ONLINE',
            location: '온라인 라이브',
            price: 68000,
            avg_rating: 5.0,
            class_count: 24,
            total_remaining: 20,
            kit_enabled: 1,
            partner: {
                partner_code: 'PC_AMB_001',
                partner_name: '앰배서더 스튜디오',
                name: '앰배서더 스튜디오',
                grade: 'AMBASSADOR',
                avg_rating: 5.0,
                location: '온라인 라이브'
            },
            schedules: [{ schedule_id: 'SCH_S32_004', schedule_date: '2026-03-28', schedule_time: '20:00', remaining: 20, booked_count: 12 }]
        }
    };

    return {
        classes: classes,
        details: details,
        affiliations: [
            {
                affiliation_code: 'KPFA_001',
                name: '한국꽃공예협회',
                contact_name: '김협회',
                discount_rate: 12,
                incentive_tiers: []
            }
        ],
        contentHub: {
            summary: {
                total_classes: classes.length,
                total_partners: 4,
                total_beginner_classes: 1,
                total_regions: 3
            },
            featured_message: '상위 등급 파트너는 추천 노출과 스토리 허브에서 먼저 보입니다.',
            highlights: [
                {
                    class_id: 'CL_S32_003',
                    title: '아뜰리에 웨딩 부케',
                    category: '부케',
                    partner_name: '아뜰리에 부케랩',
                    region_label: '부산',
                    price: 76000,
                    highlight_copy: 'ATELIER 파트너 스토리와 연결되는 대표 클래스',
                    level_label: '심화',
                    type_label: '오프라인',
                    avg_rating: 4.9,
                    thumbnail_url: 'https://dummyimage.com/800x600/dce5f2/29486b.jpg&text=ATELIER'
                }
            ],
            partner_stories: [
                {
                    partner_name: '블룸 플라워',
                    grade: 'BLOOM',
                    region_label: '서울',
                    featured_category: '부케',
                    class_count: 3,
                    quote: '기초 운영을 정리하는 단계입니다.',
                    focus_points: ['입문 클래스', '후기 확보'],
                    search_keyword: '블룸 플라워'
                },
                {
                    partner_name: '앰배서더 스튜디오',
                    grade: 'AMBASSADOR',
                    region_label: '전국',
                    featured_category: '세미나',
                    class_count: 11,
                    quote: '생태계를 넓히는 공동 세미나를 기획합니다.',
                    focus_points: ['멘토링', '공동 세미나', '대표 노출'],
                    search_keyword: '앰배서더 스튜디오'
                },
                {
                    partner_name: '아뜰리에 부케랩',
                    grade: 'ATELIER',
                    region_label: '부산',
                    featured_category: '웨딩 부케',
                    class_count: 8,
                    quote: '브랜드 스토리와 시그니처 수업을 함께 확장합니다.',
                    focus_points: ['인터뷰 후보', '시그니처 수업'],
                    search_keyword: '아뜰리에 부케랩'
                },
                {
                    partner_name: '가든 아뜰리에',
                    grade: 'GARDEN',
                    region_label: '서울',
                    featured_category: '리스',
                    class_count: 6,
                    quote: '추천 레이어에서 먼저 보이는 파트너 운영 예시입니다.',
                    focus_points: ['우선 노출', '신뢰형 운영'],
                    search_keyword: '가든 아뜰리에'
                }
            ],
            trends: [],
            guides: []
        },
        partnerAuth: {
            success: true,
            data: {
                partner_code: 'PC_ATELIER_001',
                member_id: 'partner-test-001',
                partner_name: '아뜰리에 부케랩',
                grade: 'ATELIER',
                status: 'ACTIVE',
                phone: '010-5555-8888',
                instagram: 'https://instagram.com/atelier',
                education_completed: true,
                avg_rating: 4.9
            }
        },
        partnerDashboard: {
            success: true,
            data: {
                summary: {
                    total_revenue: 480000,
                    total_fee: 72000,
                    available_reserve: 408000,
                    total_bookings: 7
                },
                available_months: ['2026-03', '2026-02'],
                classes: [
                    {
                        class_id: 'CL_S32_003',
                        class_name: '아뜰리에 웨딩 부케',
                        category: '부케',
                        status: 'ACTIVE',
                        avg_rating: 4.9,
                        booking_count: 7,
                        thumbnail_url: 'https://dummyimage.com/800x600/dce5f2/29486b.jpg&text=ATELIER',
                        kit_enabled: 1,
                        kit_items: JSON.stringify([{ name: '부케 키트', quantity: 1, price: 23000 }])
                    }
                ]
            }
        },
        educationStatus: {
            success: true,
            data: {
                is_partner: true,
                education_completed: true
            }
        },
        partnerBookings: {
            success: true,
            data: {
                bookings: [
                    {
                        booking_id: 'BK_S32_001',
                        class_id: 'CL_S32_003',
                        class_name: '아뜰리에 웨딩 부케',
                        class_date: '2026-03-25',
                        class_time: '15:00',
                        participants: 3,
                        amount: 228000,
                        status: 'CONFIRMED',
                        customer_name: '홍수강'
                    }
                ]
            }
        },
        partnerReviews: {
            success: true,
            data: {
                reviews: [
                    {
                        review_id: 'RV_S32_001',
                        class_id: 'CL_S32_003',
                        class_name: '아뜰리에 웨딩 부케',
                        rating: 5,
                        content: '수업 퀄리티가 높고 설명이 좋았습니다.',
                        reply_text: '',
                        member_name: '김리뷰',
                        created_at: '2026-03-11 10:00:00'
                    }
                ],
                pagination: { page: 1, totalPages: 1 },
                summary: {
                    avg_rating: 4.9,
                    total_count: 12,
                    unanswered_count: 1,
                    rating_distribution: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 }
                }
            }
        }
    };
}

async function installMocks(page, state) {
    await page.route('**/webhook/partner-auth', async function(route) {
        var payload = parsePayload(route);

        if (payload.action === 'getPartnerAuth') {
            await route.fulfill({ json: state.partnerAuth });
            return;
        }
        if (payload.action === 'getPartnerDashboard') {
            await route.fulfill({ json: state.partnerDashboard });
            return;
        }
        if (payload.action === 'getEducationStatus') {
            await route.fulfill({ json: state.educationStatus });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/partner-data', async function(route) {
        var payload = parsePayload(route);

        if (payload.action === 'getPartnerBookings') {
            await route.fulfill({ json: state.partnerBookings });
            return;
        }
        if (payload.action === 'getPartnerReviews') {
            await route.fulfill({ json: state.partnerReviews });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/class-api', async function(route) {
        var payload = parsePayload(route);

        if (payload.action === 'getCategories') {
            await route.fulfill({ json: { success: true, data: ['부케', '리스', '센터피스'] } });
            return;
        }
        if (payload.action === 'getAffiliations') {
            await route.fulfill({ json: { success: true, total: state.affiliations.length, data: state.affiliations } });
            return;
        }
        if (payload.action === 'getClassDetail') {
            await route.fulfill({ json: { success: true, data: state.details[payload.id] || state.details.CL_S32_001 } });
            return;
        }
        if (payload.action === 'getContentHub') {
            await route.fulfill({ json: { success: true, data: state.contentHub } });
            return;
        }
        if (payload.action === 'getClasses') {
            await route.fulfill({
                json: {
                    success: true,
                    data: {
                        classes: state.classes,
                        total: state.classes.length,
                        page: 1,
                        totalPages: 1
                    }
                }
            });
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
        await route.fulfill({ json: { success: true, data: { schedule_id: 'SCH_NEW_001' } } });
    });
    await page.route('**/webhook/review-reply', async function(route) {
        await route.fulfill({ json: { success: true, data: { replied: true } } });
    });
}

async function runPartnerDashboard(browser, baseUrl, state, result) {
    var page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

    await installMocks(page, state);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/partner.html', { waitUntil: 'networkidle' });
    if (await page.locator('#pdOnboardingModal .pd-modal__cancel').isVisible().catch(function() { return false; })) {
        await page.click('#pdOnboardingModal .pd-modal__cancel');
    }
    await page.click('#pdTabBtnRevenue');
    await page.waitForSelector('#pdGradeBenefits .pd-grade-benefits__title');
    await page.screenshot({ path: PARTNER_SHOT, fullPage: true });

    result.partnerDashboard = await page.evaluate(function() {
        var badge = document.getElementById('pdGradeBadge');
        var title = document.querySelector('#pdGradeBenefits .pd-grade-benefits__title');
        var highlight = document.querySelector('#pdGradeBenefits .pd-grade-benefits__highlight-title');
        var current = document.querySelector('#pdGradeBenefits .pd-grade-tier-card.is-current .pd-grade-tier-card__badge');
        return {
            badge: badge ? badge.textContent.trim() : '',
            title: title ? title.textContent.trim() : '',
            highlight: highlight ? highlight.textContent.trim() : '',
            currentTier: current ? current.textContent.trim() : '',
            cardCount: document.querySelectorAll('#pdGradeBenefits .pd-grade-tier-card').length
        };
    });

    assert(result.partnerDashboard.badge.indexOf('ATELIER') >= 0, 'partner badge should be ATELIER');
    assert(result.partnerDashboard.currentTier === 'ATELIER', 'current incentive tier should be ATELIER');
    assert(result.partnerDashboard.cardCount === 3, 'expected 3 incentive tier cards');

    await page.close();
}

async function runListBenefits(browser, baseUrl, state, result) {
    var page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

    await installMocks(page, state);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/list.html', { waitUntil: 'networkidle' });
    await page.click('#tabBenefits');
    await page.waitForSelector('#benefitClassGrid .benefit-class-card');
    await page.screenshot({ path: LIST_SHOT, fullPage: true });

    result.benefitPriority = await page.evaluate(function() {
        var firstCard = document.querySelector('#benefitClassGrid .benefit-class-card');
        var firstGrade = document.querySelector('#benefitClassGrid .benefit-class-card .benefit-class-card__chip--grade');
        var gradeBadges = Array.prototype.slice.call(document.querySelectorAll('.class-card__trust-badge')).map(function(node) {
            return node.textContent.trim();
        });
        return {
            firstName: firstCard ? firstCard.querySelector('.benefit-class-card__name').textContent.trim() : '',
            firstGrade: firstGrade ? firstGrade.textContent.trim() : '',
            badgeTexts: gradeBadges
        };
    });

    assert(result.benefitPriority.firstGrade.indexOf('AMBASSADOR') >= 0, 'benefit rail should prioritize AMBASSADOR');
    assert(result.benefitPriority.badgeTexts.some(function(text) { return text === 'GARDEN' || text === 'ATELIER' || text === 'AMBASSADOR'; }), 'catalog cards should expose grade badges');

    await page.close();
}

async function runDetailPriority(browser, baseUrl, state, result) {
    var page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

    await installMocks(page, state);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/detail.html?class_id=CL_S32_001', { waitUntil: 'networkidle' });
    await page.waitForSelector('#cdRelatedGrid .cd-related-card');
    await page.screenshot({ path: DETAIL_SHOT, fullPage: true });

    result.detailPriority = await page.evaluate(function() {
        var firstCard = document.querySelector('#cdRelatedGrid .cd-related-card');
        var firstTags = firstCard ? Array.prototype.slice.call(firstCard.querySelectorAll('.cd-related-card__tag')).map(function(node) { return node.textContent.trim(); }) : [];
        return {
            firstName: firstCard ? firstCard.querySelector('.cd-related-card__name').textContent.trim() : '',
            firstTags: firstTags
        };
    });

    assert(result.detailPriority.firstTags.some(function(tag) {
        return tag === 'GARDEN' || tag === 'ATELIER' || tag === 'AMBASSADOR';
    }), 'detail related list should expose GARDEN+ grade tag first');

    await page.close();
}

async function runContentHubPriority(browser, baseUrl, state, result) {
    var page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

    await installMocks(page, state);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/content-hub.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#pchStoriesGrid .pch-story-card');
    await page.screenshot({ path: HUB_SHOT, fullPage: true });

    result.contentHub = await page.evaluate(function() {
        var firstStory = document.querySelector('#pchStoriesGrid .pch-story-card');
        var firstEyebrow = firstStory ? firstStory.querySelector('.pch-story-card__eyebrow').textContent.trim() : '';
        var firstSpotlight = firstStory ? firstStory.querySelector('.pch-story-card__spotlight').textContent.trim() : '';
        return {
            firstEyebrow: firstEyebrow,
            firstSpotlight: firstSpotlight
        };
    });

    assert(result.contentHub.firstEyebrow === 'AMBASSADOR', 'content hub should surface AMBASSADOR first');
    assert(result.contentHub.firstSpotlight === '멘토 파트너', 'content hub spotlight should show mentor label');

    await page.close();
}

async function main() {
    var browser;
    var serverInfo;
    var state = buildState();
    var result = {
        task: 'S3-2',
        generatedAt: new Date().toISOString(),
        partnerDashboard: null,
        benefitPriority: null,
        detailPriority: null,
        contentHub: null
    };

    ensureDir(OUTPUT_DIR);
    buildFixtures();
    serverInfo = await startStaticServer(REPO_ROOT);
    browser = await chromium.launch({ headless: true });

    try {
        await runPartnerDashboard(browser, serverInfo.baseUrl, state, result);
        await runListBenefits(browser, serverInfo.baseUrl, state, result);
        await runDetailPriority(browser, serverInfo.baseUrl, state, result);
        await runContentHubPriority(browser, serverInfo.baseUrl, state, result);
    } finally {
        await browser.close();
        await closeServer(serverInfo.server);
    }

    writeJson(RESULT_PATH, result);
    console.log(JSON.stringify(result, null, 2));
    console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
}

if (require.main === module) {
    main().catch(function(error) {
        console.error(error && error.stack ? error.stack : String(error));
        process.exit(1);
    });
}
