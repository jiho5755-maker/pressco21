#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-1-schema');
var RESULT_PATH = path.join(OUTPUT_DIR, 'schema-create-results.json');
var DEFAULT_AFFILIATION_CODE = 'KPFA_001';

var TABLE_SPECS = [
    {
        title: 'tbl_Seminars',
        uniqueFields: ['seminar_id'],
        columns: [
            { title: 'seminar_id', column_name: 'seminar_id', uidt: 'SingleLineText' },
            { title: 'affiliation_code', column_name: 'affiliation_code', uidt: 'SingleLineText' },
            { title: 'title', column_name: 'title', uidt: 'SingleLineText' },
            { title: 'description', column_name: 'description', uidt: 'LongText' },
            { title: 'seminar_date', column_name: 'seminar_date', uidt: 'Date' },
            { title: 'seminar_time', column_name: 'seminar_time', uidt: 'SingleLineText' },
            { title: 'location', column_name: 'location', uidt: 'SingleLineText' },
            { title: 'capacity', column_name: 'capacity', uidt: 'Number' },
            { title: 'status', column_name: 'status', uidt: 'SingleLineText' },
            { title: 'image_url', column_name: 'image_url', uidt: 'URL' }
        ]
    },
    {
        title: 'tbl_Affiliation_Products',
        uniqueFields: ['affiliation_code', 'branduid'],
        columns: [
            { title: 'affiliation_code', column_name: 'affiliation_code', uidt: 'SingleLineText' },
            { title: 'branduid', column_name: 'branduid', uidt: 'SingleLineText' },
            { title: 'product_name', column_name: 'product_name', uidt: 'SingleLineText' },
            { title: 'discount_rate', column_name: 'discount_rate', uidt: 'Number' },
            { title: 'is_signature', column_name: 'is_signature', uidt: 'Checkbox', cdf: '0' },
            { title: 'display_order', column_name: 'display_order', uidt: 'Number' },
            { title: 'status', column_name: 'status', uidt: 'SingleLineText' }
        ]
    },
    {
        title: 'tbl_Affiliation_Content',
        uniqueFields: ['affiliation_code', 'content_type', 'title'],
        columns: [
            { title: 'affiliation_code', column_name: 'affiliation_code', uidt: 'SingleLineText' },
            { title: 'content_type', column_name: 'content_type', uidt: 'SingleLineText' },
            { title: 'title', column_name: 'title', uidt: 'SingleLineText' },
            { title: 'body', column_name: 'body', uidt: 'LongText' },
            { title: 'image_url', column_name: 'image_url', uidt: 'URL' },
            { title: 'publish_date', column_name: 'publish_date', uidt: 'Date' },
            { title: 'status', column_name: 'status', uidt: 'SingleLineText' }
        ]
    },
    {
        title: 'tbl_Vocabulary',
        uniqueFields: ['domain', 'code'],
        columns: [
            { title: 'domain', column_name: 'domain', uidt: 'SingleLineText' },
            { title: 'code', column_name: 'code', uidt: 'SingleLineText' },
            { title: 'label_ko', column_name: 'label_ko', uidt: 'SingleLineText' },
            { title: 'label_en', column_name: 'label_en', uidt: 'SingleLineText' },
            { title: 'description', column_name: 'description', uidt: 'LongText' }
        ]
    }
];

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
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

function parseArgs(argv) {
    var options = { dryRun: false };
    var i = 0;

    for (i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--dry-run') {
            options.dryRun = true;
        }
    }

    return options;
}

function validateEnv(env) {
    var requiredKeys = ['NOCODB_URL', 'NOCODB_API_TOKEN', 'NOCODB_PROJECT_ID', 'NOCODB_TABLE_AFFILIATIONS'];
    var missing = requiredKeys.filter(function(key) {
        return !env[key];
    });

    if (missing.length) {
        throw new Error('NocoDB 환경변수가 부족합니다: ' + missing.join(', '));
    }
}

async function requestJson(method, url, headers, body) {
    var response = await fetch(url, {
        method: method,
        headers: headers,
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
        throw new Error(method + ' ' + url + ' failed: ' + response.status + ' ' + JSON.stringify(data));
    }

    return data;
}

function getMetaHeaders(env) {
    return {
        'xc-token': env.NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
    };
}

function getDataHeaders(env) {
    return {
        'xc-token': env.NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
    };
}

async function metaRequest(env, method, suffix, body) {
    return requestJson(method, env.NOCODB_URL + suffix, getMetaHeaders(env), body);
}

async function dataRequest(env, method, tableId, suffix, body) {
    var url = env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + (suffix || '');
    return requestJson(method, url, getDataHeaders(env), body);
}

async function listMetaTables(env) {
    var data = await metaRequest(env, 'GET', '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables');
    return Array.isArray(data.list) ? data.list : [];
}

async function getTableDetail(env, tableId) {
    return metaRequest(env, 'GET', '/api/v2/meta/tables/' + tableId);
}

async function createTable(env, spec) {
    return metaRequest(env, 'POST', '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables', {
        title: spec.title,
        columns: spec.columns
    });
}

async function addColumn(env, tableId, column) {
    return metaRequest(env, 'POST', '/api/v2/meta/tables/' + tableId + '/columns', column);
}

async function listAllRows(env, tableId) {
    var page = 1;
    var rows = [];
    var hasNext = true;

    while (hasNext) {
        var data = await dataRequest(env, 'GET', tableId, '?limit=200&page=' + page);
        var list = Array.isArray(data.list) ? data.list : [];
        var pageInfo = data.pageInfo || {};

        rows = rows.concat(list);
        hasNext = list.length > 0 && pageInfo.isLastPage === false;
        page += 1;
    }

    return rows;
}

function getUniqueKey(row, uniqueFields) {
    return uniqueFields.map(function(fieldName) {
        return String(row[fieldName] || '').trim();
    }).join('||');
}

function pickAffiliationContext(rows) {
    var preferred = null;
    var fallback = null;
    var i = 0;

    for (i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        var code = String(row.affiliation_code || '').trim();

        if (!code) {
            continue;
        }

        if (!fallback) {
            fallback = row;
        }

        if (code === DEFAULT_AFFILIATION_CODE) {
            preferred = row;
            break;
        }
    }

    if (preferred) {
        return {
            affiliationCode: String(preferred.affiliation_code || '').trim(),
            affiliationName: String(preferred.name || '').trim() || DEFAULT_AFFILIATION_CODE,
            discountRate: Number(preferred.discount_rate || 0)
        };
    }

    if (fallback) {
        return {
            affiliationCode: String(fallback.affiliation_code || '').trim(),
            affiliationName: String(fallback.name || '').trim() || String(fallback.affiliation_code || '').trim(),
            discountRate: Number(fallback.discount_rate || 0)
        };
    }

    throw new Error('tbl_Affiliations 에 유효한 affiliation_code 가 없습니다.');
}

function buildSampleRows(context) {
    var code = context.affiliationCode;
    var name = context.affiliationName;
    var discount = context.discountRate || 5;

    return {
        tbl_Seminars: [
            {
                seminar_id: 'SEM_' + code + '_202604_01',
                affiliation_code: code,
                title: name + ' 4월 봄 시즌 세미나',
                description: '<p>' + name + ' 협회원 대상으로 진행하는 봄 시즌 부케 트렌드 세미나입니다.</p>',
                seminar_date: '2026-04-18',
                seminar_time: '14:00',
                location: '서울 성수동 파트너클래스 라운지',
                capacity: 40,
                status: 'ACTIVE',
                image_url: 'https://dummyimage.com/1200x800/e6dccf/3d2c1e.jpg&text=Seminar+01'
            },
            {
                seminar_id: 'SEM_' + code + '_202605_01',
                affiliation_code: code,
                title: name + ' 온라인 운영 세미나',
                description: '<p>협회 일정 홍보와 키트 판매 연계를 함께 다루는 운영 세미나입니다.</p>',
                seminar_date: '2026-05-09',
                seminar_time: '19:30',
                location: '온라인 라이브',
                capacity: 120,
                status: 'ACTIVE',
                image_url: 'https://dummyimage.com/1200x800/d7e2df/3d2c1e.jpg&text=Seminar+02'
            }
        ],
        tbl_Affiliation_Products: [
            {
                affiliation_code: code,
                branduid: 'AFF' + code + 'KIT001',
                product_name: name + ' 협회원 전용 시그니처 키트',
                discount_rate: discount + 10,
                is_signature: true,
                display_order: 1,
                status: 'ACTIVE'
            },
            {
                affiliation_code: code,
                branduid: 'AFF' + code + 'MAT002',
                product_name: name + ' 시즌 재료 패키지',
                discount_rate: discount + 5,
                is_signature: false,
                display_order: 2,
                status: 'ACTIVE'
            },
            {
                affiliation_code: code,
                branduid: 'AFF' + code + 'TOOL003',
                product_name: name + ' 운영 준비 공구 세트',
                discount_rate: discount + 3,
                is_signature: false,
                display_order: 3,
                status: 'ACTIVE'
            }
        ],
        tbl_Affiliation_Content: [
            {
                affiliation_code: code,
                content_type: 'NOTICE',
                title: name + ' 협회원 혜택 안내',
                body: '<p>협회원 전용 할인 상품과 파트너클래스 예약 혜택을 안내합니다.</p>',
                image_url: 'https://dummyimage.com/1200x800/f4ead7/3d2c1e.jpg&text=Notice',
                publish_date: '2026-03-11',
                status: 'PUBLISHED'
            },
            {
                affiliation_code: code,
                content_type: 'EVENT',
                title: name + ' 5월 공동 세미나 참가 모집',
                body: '<p>협회 행사와 온라인 세미나를 한 화면에서 홍보하기 위한 샘플 콘텐츠입니다.</p>',
                image_url: 'https://dummyimage.com/1200x800/dde5ef/3d2c1e.jpg&text=Event',
                publish_date: '2026-04-01',
                status: 'PUBLISHED'
            },
            {
                affiliation_code: code,
                content_type: 'GUIDE',
                title: name + ' 협회원 전용 구매 가이드',
                body: '<p>협회원 전용 상품과 시그니처 제품 구매 흐름을 설명하는 운영 가이드입니다.</p>',
                image_url: 'https://dummyimage.com/1200x800/e5ead6/3d2c1e.jpg&text=Guide',
                publish_date: '2026-03-15',
                status: 'PUBLISHED'
            }
        ],
        tbl_Vocabulary: [
            {
                domain: 'DIFFICULTY',
                code: 'BEGINNER',
                label_ko: '입문',
                label_en: 'Beginner',
                description: '첫 수강자나 취미 입문자를 위한 난이도'
            },
            {
                domain: 'DIFFICULTY',
                code: 'INTERMEDIATE',
                label_ko: '중급',
                label_en: 'Intermediate',
                description: '기초 경험이 있는 수강생 대상 난이도'
            },
            {
                domain: 'GRADE',
                code: 'BLOOM',
                label_ko: '블룸',
                label_en: 'Bloom',
                description: '신규 파트너 기본 성장 단계'
            },
            {
                domain: 'GRADE',
                code: 'GARDEN',
                label_ko: '가든',
                label_en: 'Garden',
                description: '활동성과 후기 지표가 안정적인 파트너 단계'
            },
            {
                domain: 'BOOKING',
                code: 'CONFIRMED',
                label_ko: '예약확정',
                label_en: 'Confirmed',
                description: '결제와 일정이 모두 확정된 예약 상태'
            },
            {
                domain: 'APPROVAL',
                code: 'PENDING_REVIEW',
                label_ko: '승인대기',
                label_en: 'Pending Review',
                description: '운영 승인 전 검토 중인 상태'
            },
            {
                domain: 'CLASS',
                code: 'ONLINE',
                label_ko: '온라인',
                label_en: 'Online',
                description: '지역 제약 없이 수강 가능한 클래스 유형'
            },
            {
                domain: 'REGION',
                code: 'SEOUL',
                label_ko: '서울',
                label_en: 'Seoul',
                description: '오프라인 클래스 주요 탐색 지역'
            }
        ]
    };
}

async function ensureTable(env, spec, dryRun) {
    var metaTables = await listMetaTables(env);
    var table = metaTables.filter(function(item) {
        return item.title === spec.title;
    })[0] || null;
    var detail = null;
    var created = false;
    var addedColumns = [];
    var missingColumns = [];
    var existingColumns = {};
    var i = 0;

    if (!table && !dryRun) {
        table = await createTable(env, spec);
        created = true;
    }

    if (!table) {
        return {
            id: '',
            created: false,
            dryRun: true,
            addedColumns: [],
            missingColumns: spec.columns.map(function(column) { return column.column_name; }),
            columns: []
        };
    }

    detail = await getTableDetail(env, table.id);
    (detail.columns || []).forEach(function(column) {
        existingColumns[column.column_name] = true;
    });

    for (i = 0; i < spec.columns.length; i += 1) {
        if (!existingColumns[spec.columns[i].column_name]) {
            missingColumns.push(spec.columns[i]);
        }
    }

    if (missingColumns.length && !dryRun) {
        for (i = 0; i < missingColumns.length; i += 1) {
            await addColumn(env, table.id, missingColumns[i]);
            addedColumns.push(missingColumns[i].column_name);
        }
        detail = await getTableDetail(env, table.id);
    }

    return {
        id: table.id,
        created: created,
        dryRun: dryRun,
        addedColumns: addedColumns,
        missingColumns: missingColumns.map(function(column) { return column.column_name; }),
        columns: (detail.columns || []).map(function(column) {
            return column.column_name;
        })
    };
}

function buildRowIndex(rows, uniqueFields) {
    var index = {};

    rows.forEach(function(row) {
        var key = getUniqueKey(row, uniqueFields);
        if (key && !index[key]) {
            index[key] = row;
        }
    });

    return index;
}

async function upsertSampleRows(env, tableId, uniqueFields, sampleRows, dryRun) {
    var rows = await listAllRows(env, tableId);
    var rowIndex = buildRowIndex(rows, uniqueFields);
    var inserted = 0;
    var updated = 0;
    var matched = 0;
    var i = 0;

    for (i = 0; i < sampleRows.length; i += 1) {
        var sample = sampleRows[i];
        var key = getUniqueKey(sample, uniqueFields);
        var existing = rowIndex[key];

        if (!existing) {
            if (!dryRun) {
                await dataRequest(env, 'POST', tableId, '', sample);
            }
            inserted += 1;
            continue;
        }

        matched += 1;
        if (!dryRun) {
            await dataRequest(env, 'PATCH', tableId, '/' + existing.Id, sample);
        }
        updated += 1;
    }

    return {
        inserted: inserted,
        updated: updated,
        matched: matched,
        expected: sampleRows.length
    };
}

async function verifySampleRows(env, tableId, uniqueFields, sampleRows) {
    var rows = await listAllRows(env, tableId);
    var rowIndex = buildRowIndex(rows, uniqueFields);
    var matches = [];
    var i = 0;

    for (i = 0; i < sampleRows.length; i += 1) {
        var sample = sampleRows[i];
        var key = getUniqueKey(sample, uniqueFields);
        var existing = rowIndex[key] || null;

        matches.push({
            key: key,
            exists: !!existing
        });
    }

    return {
        totalRows: rows.length,
        matchedRows: matches.filter(function(item) { return item.exists; }).length,
        matches: matches
    };
}

async function run(options) {
    var env = loadEnv(ENV_PATH);
    var affiliationRows;
    var context;
    var samples;
    var result = {
        task: 'S3-1',
        mode: options.dryRun ? 'dry-run' : 'apply',
        generatedAt: new Date().toISOString(),
        affiliation: null,
        tables: {}
    };
    var i = 0;

    validateEnv(env);
    ensureDir(OUTPUT_DIR);

    affiliationRows = await listAllRows(env, env.NOCODB_TABLE_AFFILIATIONS);
    context = pickAffiliationContext(affiliationRows);
    samples = buildSampleRows(context);

    result.affiliation = context;

    for (i = 0; i < TABLE_SPECS.length; i += 1) {
        var spec = TABLE_SPECS[i];
        var ensured = await ensureTable(env, spec, options.dryRun);
        var sampleRows = samples[spec.title] || [];
        var upserted = { inserted: 0, updated: 0, matched: 0, expected: sampleRows.length };
        var verified = { totalRows: 0, matchedRows: 0, matches: [] };

        if (ensured.id) {
            upserted = await upsertSampleRows(env, ensured.id, spec.uniqueFields, sampleRows, options.dryRun);
            if (!options.dryRun) {
                verified = await verifySampleRows(env, ensured.id, spec.uniqueFields, sampleRows);
            }
        }

        result.tables[spec.title] = {
            id: ensured.id,
            created: ensured.created,
            addedColumns: ensured.addedColumns,
            missingColumnsBeforeRun: ensured.missingColumns,
            columns: ensured.columns,
            uniqueFields: spec.uniqueFields.slice(),
            sampleRows: sampleRows.length,
            upserted: upserted,
            verified: verified
        };
    }

    writeJson(RESULT_PATH, result);
    return result;
}

if (require.main === module) {
    run(parseArgs(process.argv.slice(2))).then(function(result) {
        console.log(JSON.stringify(result, null, 2));
        console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
    }).catch(function(error) {
        console.error(error && error.stack ? error.stack : String(error));
        process.exit(1);
    });
}

module.exports = {
    DEFAULT_AFFILIATION_CODE: DEFAULT_AFFILIATION_CODE,
    TABLE_SPECS: TABLE_SPECS,
    RESULT_PATH: RESULT_PATH,
    ENV_PATH: ENV_PATH,
    OUTPUT_DIR: OUTPUT_DIR,
    loadEnv: loadEnv,
    buildSampleRows: buildSampleRows,
    getUniqueKey: getUniqueKey,
    listAllRows: listAllRows,
    run: run
};
