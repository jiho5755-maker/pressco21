#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_PATH = path.join(REPO_ROOT, 'output', 'playwright', 'e0-001-test-data-cleanup.json');
var PROJECT_ID = '';
var API_TOKEN = '';
var TABLE_IDS = {
    partners: 'mp8t0yq15cabmj4',
    classes: 'mpvsno4or6asbxk',
    schedules: 'mschd3d81ad88fb'
};

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

function requestJson(method, pathname, body) {
    return new Promise(function(resolve, reject) {
        var req = https.request({
            hostname: 'nocodb.pressco21.com',
            path: pathname,
            method: method,
            headers: {
                'xc-token': API_TOKEN,
                'Content-Type': 'application/json'
            }
        }, function(res) {
            var raw = '';
            res.on('data', function(chunk) {
                raw += chunk;
            });
            res.on('end', function() {
                var parsed = null;
                try {
                    parsed = raw ? JSON.parse(raw) : {};
                } catch (error) {
                    reject(error);
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(method + ' ' + pathname + ' failed: ' + res.statusCode + ' ' + JSON.stringify(parsed)));
                    return;
                }
                resolve(parsed);
            });
        });
        req.on('error', reject);
        if (typeof body !== 'undefined') {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function dataPath(tableId, suffix) {
    return '/api/v1/db/data/noco/' + PROJECT_ID + '/' + tableId + (suffix || '');
}

function isLegacyTestPartner(row) {
    var text = [
        row && row.partner_code,
        row && row.partner_name,
        row && row.member_id
    ].join(' ');
    if (/^PC_202602_00[1-6]$/.test(String(row && row.partner_code || ''))) {
        return true;
    }
    return /\btest_/i.test(text)
        || /테스트/.test(text)
        || /신청공방/.test(text);
}

function isLegacyTestClass(row, partnerCodes) {
    var classId = String(row && row.class_id || '');
    var partnerCode = String(row && row.partner_code || '');
    var text = [
        classId,
        row && row.class_name,
        row && row.location,
        partnerCode
    ].join(' ');
    if (partnerCodes.indexOf(partnerCode) >= 0) {
        return true;
    }
    if (/\[TEST\]/i.test(text)) {
        return true;
    }
    return /코딩 클래스/.test(text)
        || /검증 필요/.test(text)
        || /테스트/.test(text);
}

function toPatchList(list, field, targetValue) {
    return list.filter(function(row) {
        return String(row[field] || '') !== String(targetValue);
    }).map(function(row) {
        return {
            id: row.Id,
            key: row.class_id || row.partner_code || row.schedule_id || row.Id,
            current: row[field] || '',
            next: targetValue
        };
    });
}

async function patchRows(tableId, rows, field, value) {
    var i;
    for (i = 0; i < rows.length; i += 1) {
        await requestJson('PATCH', dataPath(tableId, '/' + rows[i].id), (function(payloadField, payloadValue) {
            var body = {};
            body[payloadField] = payloadValue;
            return body;
        })(field, value));
    }
}

async function main() {
    var env = loadEnv(ENV_PATH);
    var apply = process.argv.indexOf('--apply') >= 0;
    var partnersResponse;
    var classesResponse;
    var schedulesResponse;
    var testPartners;
    var testPartnerCodes;
    var activeTestClasses;
    var relatedSchedules;
    var report;

    PROJECT_ID = env.NOCODB_PROJECT_ID || '';
    API_TOKEN = env.NOCODB_API_TOKEN || '';

    if (!PROJECT_ID || !API_TOKEN) {
        throw new Error('NocoDB credentials not found in .secrets.env');
    }

    partnersResponse = await requestJson('GET', dataPath(TABLE_IDS.partners, '?limit=200&fields=Id,partner_code,partner_name,member_id,status,location'));
    classesResponse = await requestJson('GET', dataPath(TABLE_IDS.classes, '?limit=300&fields=Id,class_id,class_name,status,partner_code,location'));
    schedulesResponse = await requestJson('GET', dataPath(TABLE_IDS.schedules, '?limit=500&fields=Id,schedule_id,class_id,status,schedule_date,schedule_time'));

    testPartners = (partnersResponse.list || []).filter(isLegacyTestPartner);
    testPartnerCodes = testPartners.map(function(row) { return String(row.partner_code || ''); });

    activeTestClasses = (classesResponse.list || []).filter(function(row) {
        return String(row.status || '').toLowerCase() === 'active' && isLegacyTestClass(row, testPartnerCodes);
    });

    relatedSchedules = (schedulesResponse.list || []).filter(function(row) {
        return String(row.status || '').toLowerCase() === 'active'
            && activeTestClasses.some(function(cls) { return String(cls.class_id || '') === String(row.class_id || ''); });
    });

    report = {
        apply: apply,
        timestamp: new Date().toISOString(),
        partners: {
            detected: testPartners.map(function(row) {
                return {
                    Id: row.Id,
                    partner_code: row.partner_code,
                    member_id: row.member_id,
                    partner_name: row.partner_name,
                    status: row.status
                };
            }),
            patches: toPatchList(testPartners, 'status', 'suspended')
        },
        classes: {
            detected: activeTestClasses.map(function(row) {
                return {
                    Id: row.Id,
                    class_id: row.class_id,
                    partner_code: row.partner_code,
                    class_name: row.class_name,
                    status: row.status,
                    location: row.location
                };
            }),
            patches: toPatchList(activeTestClasses, 'status', 'INACTIVE')
        },
        schedules: {
            detected: relatedSchedules.map(function(row) {
                return {
                    Id: row.Id,
                    schedule_id: row.schedule_id,
                    class_id: row.class_id,
                    status: row.status,
                    schedule_date: row.schedule_date,
                    schedule_time: row.schedule_time
                };
            }),
            patches: toPatchList(relatedSchedules, 'status', 'cancelled')
        }
    };

    if (apply) {
        await patchRows(TABLE_IDS.partners, report.partners.patches, 'status', 'suspended');
        await patchRows(TABLE_IDS.classes, report.classes.patches, 'status', 'INACTIVE');
        await patchRows(TABLE_IDS.schedules, report.schedules.patches, 'status', 'cancelled');
    }

    ensureDir(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

    console.log(JSON.stringify({
        apply: apply,
        partners_detected: report.partners.detected.length,
        partners_patched: report.partners.patches.length,
        classes_detected: report.classes.detected.length,
        classes_patched: report.classes.patches.length,
        schedules_detected: report.schedules.detected.length,
        schedules_patched: report.schedules.patches.length,
        output: OUTPUT_PATH
    }, null, 2));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
