#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var assert = require('assert');
var execFileSync = require('child_process').execFileSync;
var chromium = require('playwright').chromium;
var demoData = require('./partnerclass-s2-10-demo-data.js');

var REPO_ROOT = path.resolve(__dirname, '..');
var FIXTURE_BUILDER = path.join(REPO_ROOT, 'scripts', 'build-partnerclass-playwright-fixtures.js');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-10-demo');
var RESULT_PATH = path.join(OUTPUT_DIR, 'demo-results.json');
var STUDENT_SHOT = path.join(OUTPUT_DIR, 'demo-student-flow.png');
var PARTNER_SHOT = path.join(OUTPUT_DIR, 'demo-partner-flow.png');
var ADMIN_SHOT = path.join(OUTPUT_DIR, 'demo-admin-flow.png');

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
            var targetPath = '';

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

function parseJson(text, fallback) {
    try {
        return JSON.parse(text || 'null');
    } catch (error) {
        return fallback;
    }
}

function parseKitItems(raw) {
    if (Array.isArray(raw)) {
        return raw;
    }
    return parseJson(raw, []) || [];
}

function sum(list, selector) {
    return list.reduce(function(total, item) {
        return total + Number(selector(item) || 0);
    }, 0);
}

function round1(value) {
    return Math.round(value * 10) / 10;
}

function formatPrice(value) {
    return Number(value || 0).toLocaleString('ko-KR');
}

function buildState() {
    var dataset = demoData.buildDataset(demoData.DEFAULT_BATCH, demoData.DEFAULT_TODAY);
    var partnersByCode = {};
    var classesById = {};
    var schedulesByClass = {};
    var reviewsByClass = {};
    var reviewsByPartner = {};
    var settlementsByPartner = {};
    var catalogClasses = [];
    var firstClassId = dataset.classes[0].class_id;
    var firstPartnerCode = dataset.partners[0].partner_code;

    dataset.partners.forEach(function(item) {
        partnersByCode[item.partner_code] = item;
    });
    dataset.classes.forEach(function(item) {
        classesById[item.class_id] = item;
        schedulesByClass[item.class_id] = [];
        reviewsByClass[item.class_id] = [];
    });
    dataset.schedules.forEach(function(item) {
        if (!schedulesByClass[item.class_id]) {
            schedulesByClass[item.class_id] = [];
        }
        schedulesByClass[item.class_id].push(item);
    });
    dataset.reviews.forEach(function(item) {
        if (!reviewsByClass[item.class_id]) {
            reviewsByClass[item.class_id] = [];
        }
        if (!reviewsByPartner[item.partner_code]) {
            reviewsByPartner[item.partner_code] = [];
        }
        reviewsByClass[item.class_id].push(item);
        reviewsByPartner[item.partner_code].push(item);
    });
    dataset.settlements.forEach(function(item) {
        if (!settlementsByPartner[item.partner_code]) {
            settlementsByPartner[item.partner_code] = [];
        }
        settlementsByPartner[item.partner_code].push(item);
    });

    catalogClasses = dataset.classes.map(function(item) {
        var schedules = (schedulesByClass[item.class_id] || []).slice().sort(function(a, b) {
            return String(a.schedule_date + ' ' + a.schedule_time).localeCompare(String(b.schedule_date + ' ' + b.schedule_time));
        });
        var partner = partnersByCode[item.partner_code];
        var totalRemaining = schedules.reduce(function(total, row) {
            return total + Math.max(Number(row.capacity || 0) - Number(row.booked_count || 0), 0);
        }, 0);

        return {
            class_id: item.class_id,
            class_name: item.class_name,
            partner_name: partner.partner_name,
            partner_code: item.partner_code,
            category: item.demo_category || item.category,
            type: item.demo_mode || (String(item.location || '').indexOf('온라인') > -1 ? 'ONLINE' : 'OFFLINE'),
            format: item.type,
            region: item.demo_region || item.region,
            location: item.location,
            level: item.demo_level || String(item.level || '').toUpperCase(),
            price: item.price,
            avg_rating: item.avg_rating,
            class_count: item.class_count,
            total_remaining: totalRemaining,
            thumbnail_url: item.thumbnail_url,
            kit_enabled: item.kit_enabled,
            tags: item.demo_tags || item.tags,
            student_count: sum(dataset.settlements.filter(function(row) { return row.class_id === item.class_id; }), function(row) { return row.student_count; }),
            review_count: (reviewsByClass[item.class_id] || []).length,
            next_date: schedules.length ? schedules[0].schedule_date : ''
        };
    });

    function buildDetailData(classId) {
        var item = classesById[classId];
        var partner = partnersByCode[item.partner_code];
        var schedules = (schedulesByClass[classId] || []).map(function(row) {
            return {
                schedule_id: row.schedule_id,
                schedule_date: row.schedule_date,
                schedule_time: row.schedule_time,
                remaining: Math.max(Number(row.capacity || 0) - Number(row.booked_count || 0), 0),
                booked_count: row.booked_count
            };
        });
        var reviews = (reviewsByClass[classId] || []).slice(0, 6).map(function(row) {
            return {
                name: row.reviewer_name,
                date: String(row.CreatedAt || demoData.DEFAULT_TODAY).slice(0, 10),
                rating: row.rating,
                text: row.content
            };
        });
        var reviewCount = (reviewsByClass[classId] || []).length;

        return {
            class_id: item.class_id,
            id: item.class_id,
            class_name: item.class_name,
            title: item.class_name,
            category: item.demo_category || item.category,
            type: item.demo_mode || (String(item.location || '').indexOf('온라인') > -1 ? 'ONLINE' : 'OFFLINE'),
            region: item.demo_region || item.region,
            location: item.location,
            level: item.demo_level || String(item.level || '').toUpperCase(),
            price: item.price,
            avg_rating: item.avg_rating,
            class_count: item.class_count,
            review_count: reviewCount,
            student_count: sum(dataset.settlements.filter(function(row) { return row.class_id === item.class_id; }), function(row) { return row.student_count; }),
            booked_count: sum(dataset.settlements.filter(function(row) { return row.class_id === item.class_id && row.status === 'PENDING_SETTLEMENT'; }), function(row) { return row.student_count; }),
            total_remaining: schedules.reduce(function(total, row) { return total + row.remaining; }, 0),
            kit_enabled: item.kit_enabled,
            kit_bundle_branduid: item.kit_bundle_branduid,
            kit_items: parseKitItems(item.kit_items),
            description: item.description,
            instructor_bio: item.instructor_bio,
            partner: {
                partner_name: partner.partner_name,
                name: partner.partner_name,
                grade: partner.grade,
                avg_rating: partner.avg_rating,
                location: partner.location
            },
            schedules: schedules,
            curriculum: parseJson(item.curriculum_json, []),
            materials_included: item.materials_included,
            youtube_video_id: item.youtube_video_id,
            reviews: reviews,
            makeshop_product_id: 'DCLASS_' + classId,
            makeshop_brandcode: 'personal',
            makeshop_xcode: 'personal',
            makeshop_mcode: '',
            thumbnail_url: item.thumbnail_url,
            image_urls: parseJson(item.image_urls, []),
            contact_phone: item.contact_phone,
            contact_instagram: item.contact_instagram,
            contact_kakao: item.contact_kakao
        };
    }

    function buildPartnerState(partnerCode) {
        var partner = partnersByCode[partnerCode];
        var partnerClasses = dataset.classes.filter(function(item) { return item.partner_code === partnerCode; });
        var partnerSettlements = (settlementsByPartner[partnerCode] || []).slice();
        var partnerReviews = (reviewsByPartner[partnerCode] || []).slice();
        var unanswered = partnerReviews.filter(function(item) { return !String(item.partner_answer || '').trim(); });
        var availableMonths = ['2026-03', '2026-02'];
        var totalRevenue = sum(partnerSettlements.filter(function(item) { return item.status !== 'CANCELLED'; }), function(item) { return item.order_amount; });
        var totalFee = sum(partnerSettlements.filter(function(item) { return item.status !== 'CANCELLED'; }), function(item) { return item.commission_amount; });
        var futureBookings = partnerSettlements.filter(function(item) { return item.status === 'PENDING_SETTLEMENT'; });
        var todayBookings = futureBookings.filter(function(item) { return item.class_date === demoData.DEFAULT_TODAY; });
        var classesWithMeta = partnerClasses.map(function(item) {
            return {
                class_id: item.class_id,
                class_name: item.class_name,
                category: item.demo_category || item.category,
                status: 'ACTIVE',
                avg_rating: item.avg_rating,
                booking_count: futureBookings.filter(function(row) { return row.class_id === item.class_id; }).length,
                thumbnail_url: item.thumbnail_url,
                kit_enabled: item.kit_enabled,
                kit_items: item.kit_items
            };
        });
        var bookingsPayload = futureBookings.slice(0, 8).map(function(item) {
            var detail = buildDetailData(item.class_id);
            var firstSchedule = detail.schedules[0] || { schedule_time: '14:00' };
            return {
                booking_id: item.order_id,
                class_id: item.class_id,
                class_name: classesById[item.class_id].class_name,
                class_date: item.class_date,
                class_time: firstSchedule.schedule_time,
                participants: item.student_count,
                amount: item.order_amount,
                status: 'CONFIRMED',
                customer_name: item.student_name
            };
        });
        var reviewsPayload = partnerReviews.slice(0, 8).map(function(item) {
            return {
                review_id: item.review_id,
                class_id: item.class_id,
                class_name: classesById[item.class_id].class_name,
                rating: item.rating,
                content: item.content,
                reply_text: item.partner_answer,
                member_name: item.reviewer_name,
                created_at: demoData.DEFAULT_TODAY + ' 10:00:00'
            };
        });

        return {
            auth: {
                success: true,
                data: {
                    partner_code: partner.partner_code,
                    member_id: 'partner-test-001',
                    partner_name: partner.partner_name,
                    grade: partner.canonical_grade || partner.grade,
                    status: String(partner.status || '').toUpperCase(),
                    email: partner.email,
                    phone: partner.phone,
                    instagram: partner.instagram_url,
                    education_completed: partner.education_completed === 'Y'
                }
            },
            education: {
                success: true,
                data: {
                    is_partner: true,
                    education_completed: partner.education_completed === 'Y'
                }
            },
            dashboard: {
                success: true,
                data: {
                    summary: {
                        total_revenue: totalRevenue,
                        total_fee: totalFee,
                        available_reserve: totalRevenue - totalFee,
                        total_bookings: futureBookings.length
                    },
                    available_months: availableMonths,
                    classes: classesWithMeta,
                    revenue_chart: [],
                    revenue_summary: []
                }
            },
            bookings: {
                success: true,
                data: {
                    bookings: bookingsPayload
                }
            },
            reviews: {
                success: true,
                data: {
                    reviews: reviewsPayload,
                    pagination: { page: 1, totalPages: 1 },
                    summary: {
                        avg_rating: partner.avg_rating,
                        total_count: partnerReviews.length,
                        unanswered_count: unanswered.length,
                        rating_distribution: {
                            5: partnerReviews.filter(function(item) { return Number(item.rating) === 5; }).length,
                            4: partnerReviews.filter(function(item) { return Number(item.rating) === 4; }).length,
                            3: 0,
                            2: 0,
                            1: 0
                        }
                    },
                    action_expectation: {
                        today_count: todayBookings.length,
                        kit_count: futureBookings.filter(function(item) { return Number(classesById[item.class_id].kit_enabled) === 1; }).length,
                        review_count: unanswered.length
                    }
                }
            }
        };
    }

    function buildAdminState() {
        var pendingRows = dataset.settlements.filter(function(item) { return item.status === 'PENDING_SETTLEMENT'; }).slice(0, 6);
        var history = dataset.partners.map(function(partner) {
            var items = (settlementsByPartner[partner.partner_code] || []).filter(function(row) { return row.status !== 'CANCELLED'; });
            return {
                statement_id: 'SETB_202603_H1_' + partner.partner_code,
                cycle_label: '2026-03 전반',
                partner_code: partner.partner_code,
                partner_name: partner.partner_name,
                grade: partner.canonical_grade || partner.grade,
                recipient_email: partner.email,
                classes_count: dataset.classes.filter(function(row) { return row.partner_code === partner.partner_code; }).length,
                total_order_amount: sum(items, function(row) { return row.order_amount; }),
                total_commission_amount: sum(items, function(row) { return row.commission_amount; }),
                total_reserve_amount: sum(items, function(row) { return row.reserve_amount; }),
                last_sent_at: ''
            };
        });

        return {
            settlements: {
                success: true,
                data: {
                    settlements: pendingRows.map(function(item) {
                        return {
                            Id: item.order_id.replace(/\D/g, ''),
                            settlement_id: item.settlement_id,
                            partner_code: item.partner_code,
                            partner_name: partnersByCode[item.partner_code].partner_name,
                            class_id: item.class_id,
                            class_name: classesById[item.class_id].class_name,
                            class_date: item.class_date,
                            order_amount: item.order_amount,
                            commission_rate: item.commission_rate,
                            commission_amount: item.commission_amount,
                            reserve_amount: item.reserve_amount,
                            partner_amount: item.reserve_amount,
                            status: item.status,
                            CreatedAt: demoData.DEFAULT_TODAY + ' 00:00:00+00:00'
                        };
                    }),
                    total: pendingRows.length,
                    summary: {
                        total_order_amount: sum(pendingRows, function(item) { return item.order_amount; }),
                        total_commission: sum(pendingRows, function(item) { return item.commission_amount; }),
                        total_partner_amount: sum(pendingRows, function(item) { return item.reserve_amount; })
                    }
                }
            },
            history: {
                success: true,
                data: {
                    history: history,
                    total: history.length,
                    summary: {
                        month: '2026-03',
                        total_order_amount: sum(history, function(item) { return item.total_order_amount; }),
                        total_reserve_amount: sum(history, function(item) { return item.total_reserve_amount; }),
                        sent_count: 0
                    }
                }
            }
        };
    }

    return {
        dataset: dataset,
        catalogClasses: catalogClasses,
        detailData: buildDetailData(firstClassId),
        myBookings: [
            {
                booking_id: 'MB_DEMO_UPCOMING',
                class_id: dataset.settlements[0].class_id,
                class_name: classesById[dataset.settlements[0].class_id].class_name,
                partner_name: partnersByCode[classesById[dataset.settlements[0].class_id].partner_code].partner_name,
                class_date: dataset.settlements[0].class_date,
                participants: dataset.settlements[0].student_count,
                amount: dataset.settlements[0].order_amount,
                status: 'CONFIRMED'
            },
            {
                booking_id: 'MB_DEMO_COMPLETED',
                class_id: dataset.settlements[32].class_id,
                class_name: classesById[dataset.settlements[32].class_id].class_name,
                partner_name: partnersByCode[classesById[dataset.settlements[32].class_id].partner_code].partner_name,
                class_date: dataset.settlements[32].class_date,
                participants: dataset.settlements[32].student_count,
                amount: dataset.settlements[32].order_amount,
                status: 'COMPLETED'
            }
        ],
        partnerState: buildPartnerState(firstPartnerCode),
        adminState: buildAdminState()
    };
}

function parsePayload(route) {
    try {
        return route.request().postDataJSON();
    } catch (error) {
        return {};
    }
}

function buildProductHtml(productName, brandCode, price) {
    return [
        '<!doctype html>',
        '<html lang="ko">',
        '<body>',
        '<form name="form1">',
        '<input type="hidden" name="brandcode" value="' + brandCode + '">',
        '<input type="hidden" name="xcode" value="000">',
        '<input type="hidden" name="mcode" value="000">',
        '<input type="hidden" name="price" value="' + formatPrice(price) + '">',
        '</form>',
        '<div class="goods--title">' + productName + '</div>',
        '<script>var sto_id:\'1\';</script>',
        '</body>',
        '</html>'
    ].join('');
}

async function installMocks(page, state, capture) {
    await page.route('**/webhook/class-api', async function(route) {
        var payload = parsePayload(route);
        var list = state.catalogClasses.slice();

        if (payload.action === 'getCategories') {
            await route.fulfill({ json: { success: true, data: ['부케', '꽃다발', '센터피스', '리스', '코사지'] } });
            return;
        }

        if (payload.action === 'getClasses') {
            if (payload.region) {
                list = list.filter(function(item) { return String(payload.region).split(',').indexOf(item.region) > -1; });
            }
            if (payload.category) {
                list = list.filter(function(item) { return String(payload.category).split(',').indexOf(item.category) > -1; });
            }
            await route.fulfill({ json: { success: true, data: { classes: list, total: list.length, page: 1, totalPages: 1 } } });
            return;
        }

        if (payload.action === 'getClassDetail') {
            await route.fulfill({ json: { success: true, data: state.detailData, timestamp: new Date().toISOString() } });
            return;
        }

        if (payload.action === 'getAffiliations') {
            await route.fulfill({ json: { success: true, total: 2, data: [{ affiliation_code: 'AFF_DEMO_001', name: '데모 협회', contact_name: '홍길동', discount_rate: 10, incentive_tiers: [] }, { affiliation_code: 'AFF_DEMO_002', name: '웨딩 협회', contact_name: '김수연', discount_rate: 12, incentive_tiers: [] }] } });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/record-booking', async function(route) {
        capture.bookingRequests.push(route.request().postDataJSON());
        await route.fulfill({ json: { success: true, data: { settlement_id: 'STL_DEMO_BOOK' } } });
    });

    await page.route('**/webhook/my-bookings', async function(route) {
        await route.fulfill({ json: { success: true, data: { bookings: state.myBookings } } });
    });

    await page.route('**/webhook/partner-auth', async function(route) {
        var payload = parsePayload(route);

        if (payload.action === 'getPartnerAuth') {
            await route.fulfill({ json: state.partnerState.auth });
            return;
        }
        if (payload.action === 'getPartnerDashboard') {
            await route.fulfill({ json: state.partnerState.dashboard });
            return;
        }
        if (payload.action === 'getEducationStatus') {
            await route.fulfill({ json: state.partnerState.education });
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
            await route.fulfill({ json: state.partnerState.bookings });
            return;
        }
        if (payload.action === 'getPartnerReviews') {
            await route.fulfill({ json: state.partnerState.reviews });
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
        await route.fulfill({ json: { success: true, data: { schedule_id: payload.schedule_id || 'SCH_DEMO_NEW' } } });
    });
    await page.route('**/webhook/review-reply', async function(route) {
        await route.fulfill({ json: { success: true, data: { replied: true } } });
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
            await route.fulfill({ json: state.adminState.settlements });
            return;
        }
        if (payload.action === 'getAffilStats') {
            await route.fulfill({ json: { success: true, data: [] } });
            return;
        }
        if (payload.action === 'completeSettlement') {
            await route.fulfill({ json: { success: true, data: { completed_count: 2, total_paid: 184000, not_found_ids: [] } } });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/webhook/settlement-batch', async function(route) {
        var payload = parsePayload(route);

        if (payload.action === 'getSettlementHistory') {
            await route.fulfill({ json: state.adminState.history });
            return;
        }
        if (payload.action === 'runSettlementBatch') {
            await route.fulfill({
                json: {
                    success: false,
                    data: {
                        cycle_label: '2026-03 전반',
                        sent_count: 0,
                        failed_count: 1,
                        total_order_amount: state.adminState.history.data.summary.total_order_amount,
                        total_reserve_amount: state.adminState.history.data.summary.total_reserve_amount,
                        message: '정산서 발송 중 실패가 발생했습니다.'
                    },
                    error: {
                        code: 'SETTLEMENT_EMAIL_FAILED',
                        message: 'Invalid login: 535 5.7.1 Username and Password not accepted'
                    }
                }
            });
            return;
        }

        await route.fulfill({ json: { success: true, data: {} } });
    });

    await page.route('**/shop/shopdetail.html?branduid=*', async function(route) {
        var url = new URL(route.request().url());
        var branduid = url.searchParams.get('branduid') || '';
        var html = '';

        if (branduid.indexOf('DCLASS_') === 0) {
            html = buildProductHtml('데모 클래스 상품', '000000000168', state.detailData.price);
        } else if (branduid.indexOf('KIT_DEMO_') === 0) {
            html = buildProductHtml('데모 묶음 키트', '000000000169', state.detailData.kit_items.reduce(function(sum, item) { return sum + Number(item.price || 0); }, 0));
        } else {
            html = buildProductHtml('데모 재료 상품', '000000000170', 12000);
        }

        await route.fulfill({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: html
        });
    });

    await page.route('**/shop/basket.action.html', async function(route) {
        capture.basketRequests.push(route.request().postData() || '');
        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ status: true, etc_data: { baro_type: 'baro' } })
        });
    });
}

async function setBookingDate(page, dateText) {
    await page.evaluate(function(targetDate) {
        var input = document.getElementById('datePicker');
        if (input && input._flatpickr) {
            input._flatpickr.setDate(targetDate, true);
            return;
        }
        if (input) {
            input.value = targetDate;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, dateText);
}

async function runStudentScenario(baseUrl, browser, state, results) {
    var context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    var page = await context.newPage();
    var capture = { basketRequests: [], bookingRequests: [], dialogs: [] };

    page.on('dialog', async function(dialog) {
        capture.dialogs.push(dialog.message());
        await dialog.accept();
    });

    await installMocks(page, state, capture);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/list.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(function() {
        return document.querySelectorAll('.class-card').length === 15;
    });

    results.student = {
        listBefore: await page.evaluate(function() {
            return {
                totalCards: document.querySelectorAll('.class-card').length,
                firstCard: document.querySelector('.class-card__title').textContent.trim()
            };
        })
    };

    await page.click('.quick-filter-chip[data-quick-key="region"][data-value="서울"]');
    await page.waitForFunction(function() {
        return document.querySelectorAll('.class-card').length === 3;
    });

    results.student.listAfter = await page.evaluate(function() {
        return {
            filteredCards: document.querySelectorAll('.class-card').length,
            activeFilters: Array.from(document.querySelectorAll('.quick-filter-chip.is-active')).map(function(el) { return el.textContent.trim(); })
        };
    });

    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/detail.html?class_id=' + state.detailData.class_id, { waitUntil: 'networkidle' });
    await page.waitForSelector('.booking-option__card[data-booking-mode="WITH_KIT"]');
    await page.click('.booking-option__card[data-booking-mode="WITH_KIT"]');
    await setBookingDate(page, state.detailData.schedules[0].schedule_date);
    await page.click('.cd-time-slot[data-schedule-id="' + state.detailData.schedules[0].schedule_id + '"]');
    await page.waitForFunction(function() {
        var text = document.getElementById('bookingPrice') ? document.getElementById('bookingPrice').textContent || '' : '';
        return text.indexOf('총 결제 금액') > -1;
    });
    var giftDisabled = await page.evaluate(function() {
        var element = document.getElementById('bookingGift');
        return element ? !!element.disabled : null;
    });
    await page.click('#bookingSubmit');
    await page.waitForURL('**/shop/basket.html', { timeout: 3000 }).catch(function() {});

    results.student.detail = {
        bookingMode: capture.bookingRequests[0] ? capture.bookingRequests[0].booking_mode : '',
        bundleBranduid: capture.bookingRequests[0] ? capture.bookingRequests[0].kit_bundle_branduid : '',
        basketRequests: capture.basketRequests.length,
        dialog: capture.dialogs[0] || '',
        giftDisabled: giftDisabled,
        finalUrl: page.url()
    };

    assert.strictEqual(results.student.listBefore.totalCards, 15, '학생 데모 목록은 15개 클래스여야 합니다.');
    assert.strictEqual(results.student.listAfter.filteredCards, 3, '서울 필터 후 3개 클래스가 보여야 합니다.');
    assert.strictEqual(results.student.detail.bookingMode, 'WITH_KIT', '학생 데모는 키트 포함 예약 분기를 보여줘야 합니다.');
    assert.strictEqual(results.student.detail.basketRequests, 2, '키트 포함 예약은 장바구니 2건이어야 합니다.');
    assert.strictEqual(results.student.detail.giftDisabled, true, '키트 포함 예약에서는 선물하기가 막혀야 합니다.');

    await page.screenshot({ path: STUDENT_SHOT, fullPage: true });
    await context.close();
}

async function runPartnerScenario(baseUrl, browser, state, results) {
    var context = await browser.newContext({ viewport: { width: 1440, height: 1800 } });
    var page = await context.newPage();
    var capture = { basketRequests: [], bookingRequests: [], dialogs: [] };

    page.on('dialog', async function(dialog) {
        capture.dialogs.push(dialog.message());
        await dialog.accept();
    });

    await installMocks(page, state, capture);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/partner.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(function() {
        return document.getElementById('pdActionTodayValue') && document.getElementById('pdActionTodayValue').textContent.trim().length > 0;
    });

    if (await page.locator('#pdOnboardingModal').isVisible()) {
        await page.click('#pdOnboardingModal .pd-modal__close');
        await page.waitForFunction(function() {
            return document.getElementById('pdOnboardingModal').style.display === 'none';
        });
    }

    results.partner = await page.evaluate(function() {
        return {
            onboardingProgress: document.getElementById('pdOnboardingCardProgressText').textContent.trim(),
            todayCount: document.getElementById('pdActionTodayValue').textContent.trim(),
            kitCount: document.getElementById('pdActionKitValue').textContent.trim(),
            reviewCount: document.getElementById('pdActionReviewValue').textContent.trim()
        };
    });

    await page.click('#pdActionCardToday');
    await page.waitForFunction(function() {
        return document.getElementById('pdTabBtnSchedules').classList.contains('is-active');
    });
    results.partner.todayTab = await page.evaluate(function() {
        return {
            activeTab: document.querySelector('.pd-tabs__btn.is-active').textContent.trim(),
            selectedClass: document.getElementById('pdScheduleClass').value
        };
    });

    await page.click('#pdActionCardReview');
    await page.waitForFunction(function() {
        return document.getElementById('pdTabBtnReviews').classList.contains('is-active');
    });
    await page.waitForFunction(function() {
        return document.querySelectorAll('.pd-review-card').length > 0;
    });
    results.partner.reviewTab = await page.evaluate(function() {
        return {
            activeTab: document.querySelector('.pd-tabs__btn.is-active').textContent.trim(),
            reviewCards: document.querySelectorAll('.pd-review-card').length
        };
    });

    assert(parseInt(results.partner.todayCount, 10) >= 1, '파트너 오늘 일정 카드에는 1건 이상이 보여야 합니다.');
    assert(parseInt(results.partner.kitCount, 10) >= 1, '파트너 키트 준비 카드에는 1건 이상이 보여야 합니다.');
    assert(parseInt(results.partner.reviewCount, 10) >= 1, '파트너 미답변 후기 카드에는 1건 이상이 보여야 합니다.');
    assert.strictEqual(results.partner.reviewTab.reviewCards > 0, true, '파트너 리뷰 탭에는 리뷰 카드가 있어야 합니다.');

    await page.screenshot({ path: PARTNER_SHOT, fullPage: true });
    await context.close();
}

async function runAdminScenario(baseUrl, browser, state, results) {
    var context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
    var page = await context.newPage();
    var capture = { basketRequests: [], bookingRequests: [], dialogs: [] };

    page.on('dialog', async function(dialog) {
        capture.dialogs.push(dialog.message());
        await dialog.accept();
    });

    await installMocks(page, state, capture);
    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/admin.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(function() {
        return document.getElementById('adMain') && document.getElementById('adMain').style.display !== 'none';
    });

    await page.click('button[data-tab="settlements"]');
    await page.waitForFunction(function() {
        return document.querySelector('button[data-tab="settlements"]').classList.contains('ad-tabs__btn--active');
    });

    results.admin = await page.evaluate(function() {
        return {
            summaryOrder: document.getElementById('settleOrderTotal').textContent.trim(),
            summaryCommission: document.getElementById('settleCommission').textContent.trim(),
            historyRows: document.querySelectorAll('#tbodySettlementHistory tr').length
        };
    });

    await page.click('#btnRunSettlement');
    await page.waitForFunction(function() {
        return document.getElementById('adModal').style.display !== 'none';
    });
    await page.click('#modalConfirm');
    await page.waitForSelector('.ad-toast');
    results.admin.afterRun = await page.evaluate(function() {
        return {
            toastText: document.querySelector('.ad-toast').textContent.trim(),
            historyMeta: document.getElementById('settlementHistoryMeta').textContent.trim()
        };
    });

    assert(results.admin.summaryOrder.indexOf(formatPrice(state.adminState.settlements.data.summary.total_order_amount)) > -1, '어드민 주문 합계가 보여야 합니다.');
    assert.strictEqual(results.admin.historyRows, state.adminState.history.data.history.length, '어드민 이력 행 수가 맞아야 합니다.');
    assert(results.admin.afterRun.toastText.indexOf('정산 실행 실패') > -1, '어드민 데모는 실패 토스트까지 보여줘야 합니다.');

    await page.screenshot({ path: ADMIN_SHOT, fullPage: true });
    await context.close();
}

async function main() {
    var serverInfo = null;
    var browser = null;
    var results = {
        dataset: demoData.buildSummary(demoData.buildDataset(demoData.DEFAULT_BATCH, demoData.DEFAULT_TODAY))
    };
    var state = buildState();

    ensureDir(OUTPUT_DIR);
    buildFixtures();
    serverInfo = await startStaticServer(REPO_ROOT);

    try {
        browser = await chromium.launch({ headless: true });
        await runStudentScenario(serverInfo.baseUrl, browser, state, results);
        await runPartnerScenario(serverInfo.baseUrl, browser, state, results);
        await runAdminScenario(serverInfo.baseUrl, browser, state, results);
        fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf8');
        console.log('saved', path.relative(REPO_ROOT, RESULT_PATH));
        console.log('saved', path.relative(REPO_ROOT, STUDENT_SHOT));
        console.log('saved', path.relative(REPO_ROOT, PARTNER_SHOT));
        console.log('saved', path.relative(REPO_ROOT, ADMIN_SHOT));
    } finally {
        if (browser) {
            await browser.close();
        }
        if (serverInfo) {
            await closeServer(serverInfo.server);
        }
    }
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
