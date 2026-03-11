#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-10-demo');
var DATASET_PATH = path.join(OUTPUT_DIR, 'demo-dataset.json');
var SUMMARY_PATH = path.join(OUTPUT_DIR, 'demo-summary.json');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var DEFAULT_BATCH = 'DEMO20260311';
var DEFAULT_TODAY = '2026-03-11';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function loadEnv(filePath) {
    var result = {};

    if (!fs.existsSync(filePath)) {
        return result;
    }

    readFile(filePath).split(/\r?\n/).forEach(function(line) {
        var trimmed = line.trim();
        var index = 0;
        var key = '';
        var value = '';

        if (!trimmed || trimmed.charAt(0) === '#') {
            return;
        }

        index = trimmed.indexOf('=');
        if (index < 1) {
            return;
        }

        key = trimmed.slice(0, index).trim();
        value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
        result[key] = value;
    });

    return result;
}

function parseArgs(argv) {
    var options = {
        mode: 'dry-run',
        batchId: DEFAULT_BATCH,
        today: DEFAULT_TODAY
    };
    var i = 0;

    for (i = 0; i < argv.length; i += 1) {
        var arg = argv[i];
        if (arg === '--apply') {
            options.mode = 'apply';
        } else if (arg === '--cleanup') {
            options.mode = 'cleanup';
        } else if (arg.indexOf('--batch=') === 0) {
            options.batchId = arg.split('=').slice(1).join('=').trim() || DEFAULT_BATCH;
        } else if (arg.indexOf('--today=') === 0) {
            options.today = arg.split('=').slice(1).join('=').trim() || DEFAULT_TODAY;
        }
    }

    return options;
}

function createRng(seedText) {
    var seed = 0;
    var i = 0;

    for (i = 0; i < seedText.length; i += 1) {
        seed = (seed * 31 + seedText.charCodeAt(i)) % 2147483647;
    }
    if (!seed) {
        seed = 1357911;
    }

    return function() {
        seed = seed * 48271 % 2147483647;
        return seed / 2147483647;
    };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function pad2(value) {
    return String(value).padStart(2, '0');
}

function toDate(dateText) {
    return new Date(dateText + 'T09:00:00+09:00');
}

function formatDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function shiftDate(dateText, days) {
    var date = toDate(dateText);
    date.setDate(date.getDate() + days);
    return formatDate(date);
}

function formatDateTime(dateText, hour, minute) {
    return dateText + ' ' + pad2(hour) + ':' + pad2(minute) + ':00+09:00';
}

function round1(value) {
    return Math.round(value * 10) / 10;
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function buildKitItems(classIndex, rng) {
    var base = 17000 + classIndex * 1200;
    var accent = 7000 + Math.floor(rng() * 3000);

    return [
        {
            name: '데모 플라워 키트 메인 세트',
            quantity: 1,
            price: base,
            product_url: '/shop/shopdetail.html?branduid=DMKIT' + pad2(classIndex + 1) + 'A',
            branduid: 'DMKIT' + pad2(classIndex + 1) + 'A'
        },
        {
            name: '데모 포장 부자재 세트',
            quantity: 1,
            price: accent,
            product_url: '/shop/shopdetail.html?branduid=DMKIT' + pad2(classIndex + 1) + 'B',
            branduid: 'DMKIT' + pad2(classIndex + 1) + 'B'
        }
    ];
}

function buildDataset(batchId, todayText) {
    var rng = createRng(batchId + '|' + todayText);
    var partnerBlueprints = [
        { code: 'PC_DEMO_001', name: '서울 보존화 아뜰리에', grade: 'SILVER', canonicalGrade: 'BLOOM', memberId: 'demo_partner_001', location: '서울 성수동', email: 'demo1@pressco21.test', educationCompleted: 'N', commissionRate: 0.24 },
        { code: 'PC_DEMO_002', name: '분당 플라워 클래스룸', grade: 'SILVER', canonicalGrade: 'BLOOM', memberId: 'demo_partner_002', location: '경기 분당구', email: 'demo2@pressco21.test', educationCompleted: 'Y', commissionRate: 0.24 },
        { code: 'PC_DEMO_003', name: '부산 웨딩 플라워 스튜디오', grade: 'GOLD', canonicalGrade: 'GARDEN', memberId: 'demo_partner_003', location: '부산 해운대구', email: 'demo3@pressco21.test', educationCompleted: 'Y', commissionRate: 0.2 },
        { code: 'PC_DEMO_004', name: '대전 프리저브드 랩', grade: 'GOLD', canonicalGrade: 'GARDEN', memberId: 'demo_partner_004', location: '대전 유성구', email: 'demo4@pressco21.test', educationCompleted: 'Y', commissionRate: 0.19 },
        { code: 'PC_DEMO_005', name: '제주 시그니처 플로럴', grade: 'PLATINUM', canonicalGrade: 'ATELIER', memberId: 'demo_partner_005', location: '제주 제주시', email: 'demo5@pressco21.test', educationCompleted: 'Y', commissionRate: 0.16 }
    ];
    var classBlueprints = [
        { title: '시그니처 부케 마스터클래스', category: '부케', dbCategory: '기타', level: 'BEGINNER', region: 'SEOUL', city: '서울 성수동', format: '원데이', mode: 'OFFLINE' },
        { title: '온라인 플라워 컬러 밸런스', category: '꽃다발', dbCategory: '기타', level: 'INTERMEDIATE', region: 'SEOUL', city: '온라인 라이브', format: '온라인', mode: 'ONLINE' },
        { title: '프리저브드 리스 디자인', category: '리스', dbCategory: '압화', level: 'ADVANCED', region: 'SEOUL', city: '서울 성수동', format: '정기', mode: 'OFFLINE' },
        { title: '센터피스 데일리 클래스', category: '센터피스', dbCategory: '기타', level: 'BEGINNER', region: 'GYEONGGI', city: '경기 분당구', format: '원데이', mode: 'OFFLINE' },
        { title: '온라인 꽃다발 패키지 워크숍', category: '꽃다발', dbCategory: '기타', level: 'BEGINNER', region: 'GYEONGGI', city: '온라인 라이브', format: '온라인', mode: 'ONLINE' },
        { title: '웨딩 코사지 집중반', category: '코사지', dbCategory: '기타', level: 'INTERMEDIATE', region: 'GYEONGGI', city: '경기 분당구', format: '원데이', mode: 'OFFLINE' },
        { title: '부산 웨딩 부케 실전반', category: '부케', dbCategory: '기타', level: 'ADVANCED', region: 'BUSAN', city: '부산 해운대구', format: '정기', mode: 'OFFLINE' },
        { title: '온라인 웨딩 데코 세미나', category: '센터피스', dbCategory: '기타', level: 'INTERMEDIATE', region: 'BUSAN', city: '온라인 라이브', format: '온라인', mode: 'ONLINE' },
        { title: '리스 브랜딩 클래스', category: '리스', dbCategory: '압화', level: 'BEGINNER', region: 'BUSAN', city: '부산 해운대구', format: '원데이', mode: 'OFFLINE' },
        { title: '대전 꽃다발 촬영 클래스', category: '꽃다발', dbCategory: '기타', level: 'BEGINNER', region: 'DAEJEON', city: '대전 유성구', format: '원데이', mode: 'OFFLINE' },
        { title: '온라인 코사지 판매 준비반', category: '코사지', dbCategory: '기타', level: 'INTERMEDIATE', region: 'DAEJEON', city: '온라인 라이브', format: '온라인', mode: 'ONLINE' },
        { title: '센터피스 실무 워크숍', category: '센터피스', dbCategory: '기타', level: 'ADVANCED', region: 'DAEJEON', city: '대전 유성구', format: '정기', mode: 'OFFLINE' },
        { title: '제주 리스 여행 클래스', category: '리스', dbCategory: '압화', level: 'BEGINNER', region: 'JEJU', city: '제주 제주시', format: '원데이', mode: 'OFFLINE' },
        { title: '온라인 부케 브랜딩 클래스', category: '부케', dbCategory: '기타', level: 'INTERMEDIATE', region: 'JEJU', city: '온라인 라이브', format: '온라인', mode: 'ONLINE' },
        { title: '시그니처 센터피스 살롱', category: '센터피스', dbCategory: '기타', level: 'ADVANCED', region: 'JEJU', city: '제주 제주시', format: '정기', mode: 'OFFLINE' }
    ];
    var timePool = ['10:30', '11:00', '13:00', '14:00', '16:00'];
    var students = [];
    var partners = [];
    var classes = [];
    var schedules = [];
    var settlements = [];
    var reviews = [];
    var scheduleMap = {};
    var pendingSlots = [];
    var partnerIndex = {};
    var classIndexMap = {};
    var i = 0;

    for (i = 0; i < 50; i += 1) {
        students.push({
            member_id: 'demo_student_' + pad2(i + 1),
            name: '데모수강생' + pad2(i + 1),
            email: 'student' + pad2(i + 1) + '@pressco21.test',
            phone: '010-77' + pad2((i % 30) + 10) + '-' + pad2(10 + i % 90) + pad2((i * 3) % 10)
        });
    }

    partnerBlueprints.forEach(function(item, index) {
        var partner = {
            partner_code: item.code,
            member_id: item.memberId,
            partner_name: '[TEST][DEMO] ' + item.name,
            grade: item.grade,
            canonical_grade: item.canonicalGrade,
            email: item.email,
            phone: '010-4400-55' + pad2(index + 10),
            location: item.location,
            commission_rate: item.commissionRate,
            reserve_rate: 1,
            class_count: 0,
            avg_rating: 0,
            education_completed: item.educationCompleted,
            education_date: item.educationCompleted === 'Y' ? shiftDate(todayText, -(14 + index)) : '',
            education_score: item.educationCompleted === 'Y' ? 13 + (index % 3) : 0,
            portfolio_url: 'https://demo.pressco21.test/portfolio/' + item.code.toLowerCase(),
            instagram_url: 'https://instagram.com/' + item.memberId,
            partner_map_id: 'PMAP_' + item.code,
            kakao_channel: 'https://pf.kakao.com/_demo' + pad2(index + 1),
            approved_date: shiftDate(todayText, -(20 + index)),
            status: 'active',
            notes: '[TEST][DEMO][' + batchId + '] 파트너 섭외 데모용 데이터',
            last_active_at: formatDateTime(todayText, 10 + index, 5)
        };
        partners.push(partner);
        partnerIndex[partner.partner_code] = partner;
    });

    classBlueprints.forEach(function(item, index) {
        var partner = partners[Math.floor(index / 3)];
        var kitEnabled = index < 10 ? 1 : 0;
        var price = 42000 + index * 4500;
        var duration = 90 + (index % 3) * 30;
        var kitItems = kitEnabled ? buildKitItems(index, rng) : [];
        var images = [
            'https://dummyimage.com/1200x800/e8d9c8/3d2c1e.jpg&text=Demo+' + (index + 1),
            'https://dummyimage.com/1200x800/dde7df/3d2c1e.jpg&text=Detail+' + (index + 1)
        ];
        var classRow = {
            class_id: 'CL_DEMO_' + pad2(index + 1),
            makeshop_product_id: '',
            partner_code: partner.partner_code,
            class_name: '[TEST][DEMO] ' + item.title,
            category: item.dbCategory,
            demo_category: item.category,
            level: String(item.level || '').toLowerCase(),
            demo_level: item.level,
            price: price,
            duration_min: duration,
            max_students: 4 + (index % 5),
            description: '<p>[TEST][DEMO] ' + item.title + ' 클래스 설명입니다. 수강생이 지역, 카테고리, 온/오프라인을 쉽게 비교하는 데모용 문구입니다.</p>',
            curriculum_json: JSON.stringify(['도구 소개', '핵심 제작 1단계', '완성 및 포장']),
            schedules_json: '[]',
            instructor_bio: '[TEST][DEMO] ' + partner.partner_name + '의 대표 커리큘럼입니다.',
            thumbnail_url: images[0],
            image_urls: JSON.stringify(images),
            youtube_video_id: '',
            location: item.city,
            materials_included: kitEnabled ? '재료 포함 옵션 가능' : '기본 재료 안내 제공',
            materials_price: kitItems.reduce(function(sum, kit) { return sum + kit.price; }, 0),
            materials_product_ids: kitItems.map(function(kit) { return kit.branduid; }).join(','),
            tags: '',
            demo_tags: ['TEST', 'DEMO', batchId, item.mode, item.format].join(','),
            type: item.format,
            status: 'closed',
            created_date: shiftDate(todayText, -(7 + index)),
            class_count: 0,
            avg_rating: 0,
            contact_instagram: partner.instagram_url,
            contact_phone: partner.phone,
            contact_kakao: partner.kakao_channel,
            kit_enabled: kitEnabled,
            kit_items: kitEnabled ? JSON.stringify(kitItems) : '[]',
            kit_bundle_branduid: kitEnabled ? 'KIT_DEMO_' + pad2(index + 1) : '',
            region: '',
            demo_region: item.region,
            demo_mode: item.mode
        };

        classes.push(classRow);
        classIndexMap[classRow.class_id] = classRow;
    });

    classes.forEach(function(classRow, index) {
        var s = 0;

        for (s = 0; s < 2; s += 1) {
            var dateText = index === 0 && s === 0 ? todayText : shiftDate(todayText, 1 + index + s);
            var timeText = timePool[(index + s) % timePool.length];
            var schedule = {
                schedule_id: 'SCH_DEMO_' + pad2(index + 1) + '_' + pad2(s + 1),
                class_id: classRow.class_id,
                schedule_date: dateText,
                schedule_time: timeText,
                capacity: classRow.max_students,
                booked_count: 0,
                status: 'active'
            };

            schedules.push(schedule);
            pendingSlots.push(schedule);
            if (!scheduleMap[classRow.class_id]) {
                scheduleMap[classRow.class_id] = [];
            }
            scheduleMap[classRow.class_id].push(schedule);
        }
    });

    for (i = 0; i < 50; i += 1) {
        var classRow = classes[i % classes.length];
        var partner = partnerIndex[classRow.partner_code];
        var student = students[i];
        var status = i < 30 ? 'PENDING_SETTLEMENT' : (i < 45 ? 'COMPLETED' : 'CANCELLED');
        var classDate = '';
        var orderAmount = Number(classRow.price) + (classRow.kit_enabled && i % 3 === 0 ? Number(classRow.materials_price || 0) : 0);
        var commissionAmount = Math.round(orderAmount * Number(partner.commission_rate || 0));
        var reserveAmount = orderAmount - commissionAmount;
        var schedule = null;
        var studentCount = 1 + (i % 2);
        var settlement = null;

        if (status === 'PENDING_SETTLEMENT') {
            schedule = pendingSlots[i];
            classDate = schedule.schedule_date;
            schedule.booked_count += studentCount;
        } else if (status === 'COMPLETED') {
            classDate = shiftDate(todayText, -1 * (1 + (i % 10)));
        } else {
            classDate = shiftDate(todayText, -1 * (2 + (i % 6)));
        }

        settlement = {
            settlement_id: 'STL_DEMO_' + pad2(i + 1),
            order_id: 'ORD_DEMO_' + pad2(i + 1),
            partner_code: partner.partner_code,
            class_id: classRow.class_id,
            member_id: student.member_id,
            order_amount: orderAmount,
            commission_rate: round2(partner.commission_rate),
            commission_amount: commissionAmount,
            reserve_rate: 1,
            reserve_amount: reserveAmount,
            class_date: classDate,
            settlement_due_date: shiftDate(classDate, 7),
            student_count: studentCount,
            status: status,
            reserve_paid_date: status === 'COMPLETED' ? shiftDate(classDate, 7) : '',
            reserve_api_response: '',
            error_message: status === 'CANCELLED' ? '취소된 데모 예약' : '',
            student_email_sent: status === 'COMPLETED' ? 'REVIEW_SENT' : '',
            partner_email_sent: status === 'COMPLETED' ? 'Y' : '',
            completed_date: status === 'COMPLETED' ? shiftDate(classDate, 7) : '',
            student_name: student.name,
            student_email: student.email,
            student_phone: student.phone,
            retry_count: 0,
            cancelled_at: status === 'CANCELLED' ? classDate : '',
            cancel_reason: status === 'CANCELLED' ? '데모용 취소 케이스' : '',
            refund_amount: status === 'CANCELLED' ? orderAmount : 0
        };

        settlements.push(settlement);
        classRow.class_count += 1;
    }

    for (i = 0; i < 30; i += 1) {
        var completedSettlement = settlements[30 + (i % 15)];
        var classRow = classIndexMap[completedSettlement.class_id];
        var rating = 4 + (i % 3 === 0 ? 1 : 0);
        var review = {
            review_id: 'RV_DEMO_' + pad2(i + 1),
            class_id: completedSettlement.class_id,
            member_id: completedSettlement.member_id,
            reviewer_name: completedSettlement.student_name,
            rating: rating,
            content: '[TEST][DEMO] ' + classRow.class_name + ' 수강 후기 ' + pad2(i + 1) + '번입니다. 지역 탐색과 예약 전환 데모에서 보여주기 위한 샘플 텍스트입니다.',
            image_urls: '[]',
            partner_code: completedSettlement.partner_code,
            partner_answer: i < 12 ? '데모 후기 답변입니다. 다시 찾아주셔서 감사합니다.' : '',
            answer_at: i < 12 ? formatDateTime(shiftDate(todayText, -(i % 5)), 9 + (i % 4), 20) : '',
            is_admin_created: 0
        };

        reviews.push(review);
    }

    partners.forEach(function(partner) {
        var ownClasses = classes.filter(function(item) { return item.partner_code === partner.partner_code; });
        var ownReviews = reviews.filter(function(item) { return item.partner_code === partner.partner_code; });
        var total = ownReviews.reduce(function(sum, item) { return sum + Number(item.rating || 0); }, 0);

        partner.class_count = ownClasses.length;
        partner.avg_rating = ownReviews.length ? round1(total / ownReviews.length) : 0;
    });

    classes.forEach(function(classRow) {
        var ownReviews = reviews.filter(function(item) { return item.class_id === classRow.class_id; });
        var total = ownReviews.reduce(function(sum, item) { return sum + Number(item.rating || 0); }, 0);

        classRow.avg_rating = ownReviews.length ? round1(total / ownReviews.length) : 0;
    });

    return {
        meta: {
            batch_id: batchId,
            generated_at: new Date().toISOString(),
            today: todayText,
            prefix: '[TEST][DEMO]'
        },
        partners: partners,
        classes: classes,
        schedules: schedules,
        settlements: settlements,
        reviews: reviews
    };
}

function buildSummary(dataset) {
    var summary = {
        batch_id: dataset.meta.batch_id,
        counts: {
            partners: dataset.partners.length,
            classes: dataset.classes.length,
            schedules: dataset.schedules.length,
            settlements: dataset.settlements.length,
            reviews: dataset.reviews.length
        },
        status_breakdown: {
            settlements: {}
        },
        grade_breakdown: {},
        class_preview: dataset.classes.slice(0, 3).map(function(item) {
            return {
                class_id: item.class_id,
                class_name: item.class_name,
                region: item.demo_region || item.region,
                status: String(item.status || '').toUpperCase(),
                kit_enabled: item.kit_enabled
            };
        })
    };

    dataset.partners.forEach(function(item) {
        var gradeKey = item.canonical_grade || item.grade;
        summary.grade_breakdown[gradeKey] = (summary.grade_breakdown[gradeKey] || 0) + 1;
    });
    dataset.settlements.forEach(function(item) {
        summary.status_breakdown.settlements[item.status] = (summary.status_breakdown.settlements[item.status] || 0) + 1;
    });

    return summary;
}

function writeArtifacts(dataset) {
    ensureDir(OUTPUT_DIR);
    fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(buildSummary(dataset), null, 2) + '\n', 'utf8');
}

function getTableMap(env) {
    return {
        partners: env.NOCODB_TABLE_PARTNERS,
        classes: env.NOCODB_TABLE_CLASSES,
        schedules: env.NOCODB_TABLE_SCHEDULES,
        settlements: env.NOCODB_TABLE_SETTLEMENTS,
        reviews: env.NOCODB_TABLE_REVIEWS
    };
}

function getHeaders(env) {
    return {
        'xc-token': env.NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
    };
}

async function requestJson(env, method, tableId, suffix, body) {
    var url = env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + (suffix || '');
    var response = await fetch(url, {
        method: method,
        headers: getHeaders(env),
        body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });
    var text = await response.text();
    var data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch (error) {
        data = { raw: text };
    }

    if (!response.ok) {
        throw new Error(method + ' ' + tableId + ' failed: ' + response.status + ' ' + JSON.stringify(data));
    }

    return data;
}

async function listAll(env, tableId) {
    var page = 1;
    var rows = [];
    var hasNext = true;

    while (hasNext) {
        var data = await requestJson(env, 'GET', tableId, '?limit=200&page=' + page);
        var list = Array.isArray(data.list) ? data.list : [];
        var pageInfo = data.pageInfo || {};

        rows = rows.concat(list);
        hasNext = list.length > 0 && pageInfo.isLastPage === false;
        page += 1;
    }

    return rows;
}

function isDemoRow(tableName, row) {
    if (tableName === 'partners') {
        return String(row.partner_code || '').indexOf('PC_DEMO_') === 0;
    }
    if (tableName === 'classes') {
        return String(row.class_id || '').indexOf('CL_DEMO_') === 0;
    }
    if (tableName === 'schedules') {
        return String(row.schedule_id || '').indexOf('SCH_DEMO_') === 0;
    }
    if (tableName === 'settlements') {
        return String(row.settlement_id || '').indexOf('STL_DEMO_') === 0;
    }
    if (tableName === 'reviews') {
        return String(row.review_id || '').indexOf('RV_DEMO_') === 0;
    }
    return false;
}

function pickFields(tableName, row) {
    if (tableName === 'partners') {
        return {
            partner_code: row.partner_code,
            member_id: row.member_id,
            partner_name: row.partner_name,
            grade: row.grade,
            email: row.email,
            phone: row.phone,
            location: row.location,
            commission_rate: row.commission_rate,
            reserve_rate: row.reserve_rate,
            class_count: row.class_count,
            avg_rating: row.avg_rating,
            education_completed: row.education_completed,
            education_date: row.education_date,
            education_score: row.education_score,
            portfolio_url: row.portfolio_url,
            instagram_url: row.instagram_url,
            partner_map_id: row.partner_map_id,
            kakao_channel: row.kakao_channel,
            approved_date: row.approved_date,
            status: row.status,
            notes: row.notes,
            last_active_at: row.last_active_at
        };
    }
    if (tableName === 'classes') {
        return {
            class_id: row.class_id,
            makeshop_product_id: row.makeshop_product_id,
            partner_code: row.partner_code,
            class_name: row.class_name,
            category: row.category,
            level: row.level,
            price: row.price,
            duration_min: row.duration_min,
            max_students: row.max_students,
            description: row.description,
            curriculum_json: row.curriculum_json,
            schedules_json: row.schedules_json,
            instructor_bio: row.instructor_bio,
            thumbnail_url: row.thumbnail_url,
            image_urls: row.image_urls,
            youtube_video_id: row.youtube_video_id,
            location: row.location,
            materials_included: row.materials_included,
            materials_price: row.materials_price,
            materials_product_ids: row.materials_product_ids,
            tags: row.tags,
            type: row.type,
            status: row.status,
            created_date: row.created_date,
            class_count: row.class_count,
            avg_rating: row.avg_rating,
            contact_instagram: row.contact_instagram,
            contact_phone: row.contact_phone,
            contact_kakao: row.contact_kakao,
            kit_enabled: row.kit_enabled,
            kit_items: row.kit_items,
            kit_bundle_branduid: row.kit_bundle_branduid,
            region: row.region
        };
    }
    if (tableName === 'schedules') {
        return {
            schedule_id: row.schedule_id,
            class_id: row.class_id,
            schedule_date: row.schedule_date,
            schedule_time: row.schedule_time,
            capacity: row.capacity,
            booked_count: row.booked_count,
            status: row.status
        };
    }
    if (tableName === 'settlements') {
        return {
            settlement_id: row.settlement_id,
            order_id: row.order_id,
            partner_code: row.partner_code,
            class_id: row.class_id,
            member_id: row.member_id,
            order_amount: row.order_amount,
            commission_rate: row.commission_rate,
            commission_amount: row.commission_amount,
            reserve_rate: row.reserve_rate,
            reserve_amount: row.reserve_amount,
            class_date: row.class_date,
            settlement_due_date: row.settlement_due_date,
            student_count: row.student_count,
            status: row.status,
            reserve_paid_date: row.reserve_paid_date,
            reserve_api_response: row.reserve_api_response,
            error_message: row.error_message,
            student_email_sent: row.student_email_sent,
            partner_email_sent: row.partner_email_sent,
            completed_date: row.completed_date,
            student_name: row.student_name,
            student_email: row.student_email,
            student_phone: row.student_phone,
            retry_count: row.retry_count,
            cancelled_at: row.cancelled_at,
            cancel_reason: row.cancel_reason,
            refund_amount: row.refund_amount
        };
    }
    if (tableName === 'reviews') {
        return {
            review_id: row.review_id,
            class_id: row.class_id,
            member_id: row.member_id,
            reviewer_name: row.reviewer_name,
            rating: row.rating,
            content: row.content,
            image_urls: row.image_urls,
            partner_code: row.partner_code,
            partner_answer: row.partner_answer,
            answer_at: row.answer_at,
            is_admin_created: row.is_admin_created
        };
    }
    return clone(row);
}

async function cleanupDemoRows(env) {
    var tables = getTableMap(env);
    var order = ['reviews', 'settlements', 'schedules', 'classes', 'partners'];
    var deleted = { reviews: 0, settlements: 0, schedules: 0, classes: 0, partners: 0 };
    var i = 0;

    for (i = 0; i < order.length; i += 1) {
        var tableName = order[i];
        var tableId = tables[tableName];
        var rows = await listAll(env, tableId);
        var demoRows = rows.filter(function(row) { return isDemoRow(tableName, row); });
        var j = 0;

        for (j = 0; j < demoRows.length; j += 1) {
            await requestJson(env, 'DELETE', tableId, '/' + demoRows[j].Id);
            deleted[tableName] += 1;
        }
    }

    return deleted;
}

async function applyDataset(env, dataset) {
    var tables = getTableMap(env);
    var created = { partners: 0, classes: 0, schedules: 0, settlements: 0, reviews: 0 };
    var order = ['partners', 'classes', 'schedules', 'settlements', 'reviews'];
    var i = 0;

    for (i = 0; i < order.length; i += 1) {
        var tableName = order[i];
        var tableId = tables[tableName];
        var rows = dataset[tableName];
        var j = 0;

        for (j = 0; j < rows.length; j += 1) {
            await requestJson(env, 'POST', tableId, '', pickFields(tableName, rows[j]));
            created[tableName] += 1;
        }
    }

    return created;
}

async function verifyCounts(env) {
    var tables = getTableMap(env);
    var result = {};
    var keys = Object.keys(tables);
    var i = 0;

    for (i = 0; i < keys.length; i += 1) {
        var tableName = keys[i];
        var rows = await listAll(env, tables[tableName]);
        result[tableName] = rows.filter(function(row) { return isDemoRow(tableName, row); }).length;
    }

    return result;
}

async function main() {
    var options = parseArgs(process.argv.slice(2));
    var env = loadEnv(ENV_PATH);
    var dataset = buildDataset(options.batchId, options.today);
    var summary = buildSummary(dataset);
    var deleted = null;
    var created = null;
    var verified = null;

    writeArtifacts(dataset);
    console.log('saved', path.relative(REPO_ROOT, DATASET_PATH));
    console.log('saved', path.relative(REPO_ROOT, SUMMARY_PATH));
    console.log(JSON.stringify(summary, null, 2));

    if (options.mode === 'dry-run') {
        return;
    }

    if (!env.NOCODB_URL || !env.NOCODB_PROJECT_ID || !env.NOCODB_API_TOKEN) {
        throw new Error('NocoDB 환경변수가 부족합니다. .secrets.env 확인이 필요합니다.');
    }

    deleted = await cleanupDemoRows(env);
    console.log('cleanup', JSON.stringify(deleted));

    if (options.mode === 'cleanup') {
        verified = await verifyCounts(env);
        console.log('verified', JSON.stringify(verified));
        return;
    }

    created = await applyDataset(env, dataset);
    verified = await verifyCounts(env);
    console.log('created', JSON.stringify(created));
    console.log('verified', JSON.stringify(verified));
}

if (require.main === module) {
    main().catch(function(error) {
        console.error(error && error.stack ? error.stack : String(error));
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_BATCH: DEFAULT_BATCH,
    DEFAULT_TODAY: DEFAULT_TODAY,
    buildDataset: buildDataset,
    buildSummary: buildSummary
};
