#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var annualEventTemplates = require('./lib/partnerclass-annual-event-templates');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-6-event-calendar');
var RESULT_PATH = path.join(OUTPUT_DIR, 'event-calendar-sync-results.json');

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

function parseArgs(argv) {
    var options = {
        mode: 'dry-run',
        year: annualEventTemplates.DEFAULT_EVENT_YEAR
    };
    var i;

    for (i = 2; i < argv.length; i += 1) {
        if (argv[i] === '--apply') {
            options.mode = 'apply';
        } else if (argv[i] === '--dry-run') {
            options.mode = 'dry-run';
        } else if (argv[i] === '--year' && argv[i + 1]) {
            options.year = Number(argv[i + 1]) || annualEventTemplates.DEFAULT_EVENT_YEAR;
            i += 1;
        }
    }

    return options;
}

function buildTableUrl(env, tableId, suffix) {
    return env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + (suffix || '');
}

async function requestJson(method, url, token, body) {
    var response = await fetch(url, {
        method: method,
        headers: {
            'xc-token': token,
            'Content-Type': 'application/json'
        },
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

function normalizeAffiliationStatus(value) {
    var upper = String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!upper) return 'ACTIVE';
    if (upper === 'ACTIVE' || upper === 'OPEN') return 'ACTIVE';
    return upper;
}

async function listAffiliations(env) {
    var response = await requestJson(
        'GET',
        buildTableUrl(env, env.NOCODB_TABLE_AFFILIATIONS, '?limit=100&sort=affiliation_code'),
        env.NOCODB_API_TOKEN
    );

    return (response.list || []).filter(function(row) {
        return normalizeAffiliationStatus(row.status || 'ACTIVE') === 'ACTIVE';
    }).map(function(row) {
        return {
            affiliation_code: String(row.affiliation_code || '').trim(),
            name: String(row.name || row.affiliation_code || '').trim()
        };
    }).filter(function(row) {
        return row.affiliation_code;
    });
}

async function listSeminars(env, seminarsTableId) {
    var response = await requestJson(
        'GET',
        buildTableUrl(env, seminarsTableId, '?limit=400&sort=seminar_date,seminar_time'),
        env.NOCODB_API_TOKEN
    );

    return Array.isArray(response.list) ? response.list : [];
}

async function createSeminar(env, seminarsTableId, row) {
    return requestJson('POST', buildTableUrl(env, seminarsTableId, ''), env.NOCODB_API_TOKEN, row);
}

async function updateSeminar(env, seminarsTableId, rowId, row) {
    return requestJson('PATCH', buildTableUrl(env, seminarsTableId, '/' + rowId), env.NOCODB_API_TOKEN, row);
}

async function main() {
    var options = parseArgs(process.argv);
    var env = loadEnv(ENV_PATH);
    var seminarsTableId = env.NOCODB_TABLE_SEMINARS || annualEventTemplates.DEFAULT_SEMINARS_TABLE_ID;
    var affiliations = [];
    var existingRows = [];
    var existingMap = {};
    var targetRows = [];
    var result = {
        mode: options.mode,
        year: options.year,
        seminars_table_id: seminarsTableId,
        created: 0,
        updated: 0,
        target_count: 0,
        months_covered: [],
        affiliation_codes: [],
        preview: []
    };
    var i;

    if (!env.NOCODB_URL || !env.NOCODB_API_TOKEN || !env.NOCODB_PROJECT_ID || !env.NOCODB_TABLE_AFFILIATIONS) {
        throw new Error('NocoDB 환경변수가 부족합니다.');
    }

    affiliations = await listAffiliations(env);
    existingRows = await listSeminars(env, seminarsTableId);
    existingRows.forEach(function(row) {
        existingMap[String(row.seminar_id || '').trim()] = row;
    });

    targetRows = annualEventTemplates.buildAnnualCalendarRows(affiliations, options.year);
    result.target_count = targetRows.length;
    result.months_covered = annualEventTemplates.getMonthCoverage(targetRows);
    result.affiliation_codes = affiliations.map(function(item) {
        return item.affiliation_code;
    });
    result.preview = targetRows.slice(0, 6).map(function(item) {
        return {
            seminar_id: item.seminar_id,
            title: item.title,
            seminar_date: item.seminar_date,
            affiliation_code: item.affiliation_code,
            location: item.location
        };
    });

    if (options.mode === 'apply') {
        for (i = 0; i < targetRows.length; i += 1) {
            var existing = existingMap[targetRows[i].seminar_id];
            var payload = {
                seminar_id: targetRows[i].seminar_id,
                affiliation_code: targetRows[i].affiliation_code,
                title: targetRows[i].title,
                description: targetRows[i].description,
                seminar_date: targetRows[i].seminar_date,
                seminar_time: targetRows[i].seminar_time,
                location: targetRows[i].location,
                capacity: targetRows[i].capacity,
                status: targetRows[i].status,
                image_url: targetRows[i].image_url
            };

            if (existing && existing.Id) {
                await updateSeminar(env, seminarsTableId, existing.Id, payload);
                result.updated += 1;
            } else {
                await createSeminar(env, seminarsTableId, payload);
                result.created += 1;
            }
        }
    }

    ensureDir(OUTPUT_DIR);
    writeJson(RESULT_PATH, result);
    console.log(JSON.stringify(result, null, 2));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
