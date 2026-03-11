#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's2-7-partner-churn');
var OUTPUT_PATH = path.join(OUTPUT_DIR, 'churn-results.json');
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

function wait(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

async function requestJson(context, method, url, options) {
    var response = await context.fetch(url, Object.assign({ method: method }, options || {}));
    var bodyText = await response.text();
    var body = null;

    try {
        body = bodyText ? JSON.parse(bodyText) : null;
    } catch (error) {
        body = bodyText;
    }

    return {
        status: response.status(),
        body: body
    };
}

async function getFirstActivePartner(context) {
    var url = 'https://nocodb.pressco21.com/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID
        + '/mp8t0yq15cabmj4?limit=1&sort=partner_code&where=' + encodeURIComponent('(status,eq,active)')
        + '&fields=' + encodeURIComponent('Id,partner_code,partner_name,member_id,email,status,last_active_at');
    var result = await requestJson(context, 'GET', url, {
        headers: {
            'xc-token': env.NOCODB_API_TOKEN
        }
    });

    assert.strictEqual(result.status, 200, '파트너 조회 실패');
    assert(result.body && result.body.list && result.body.list.length > 0, '활성 파트너가 없습니다.');
    return result.body.list[0];
}

async function getPartnerRow(context, partnerCode) {
    var url = 'https://nocodb.pressco21.com/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID
        + '/mp8t0yq15cabmj4?limit=1&where=' + encodeURIComponent('(partner_code,eq,' + partnerCode + ')')
        + '&fields=' + encodeURIComponent('Id,partner_code,partner_name,member_id,last_active_at,CreatedAt,UpdatedAt,status');
    var result = await requestJson(context, 'GET', url, {
        headers: {
            'xc-token': env.NOCODB_API_TOKEN
        }
    });

    assert.strictEqual(result.status, 200, '파트너 row 조회 실패');
    assert(result.body && result.body.list && result.body.list.length > 0, '파트너 row를 찾지 못했습니다.');
    return result.body.list[0];
}

async function waitForPartnerTouch(context, partnerCode, previousValue, expectedValue) {
    var attempt;
    var row;
    var rowValue;
    var expectedTime;
    var rowTime;

    expectedTime = expectedValue ? Date.parse(expectedValue) : NaN;

    for (attempt = 0; attempt < 8; attempt += 1) {
        row = await getPartnerRow(context, partnerCode);
        rowValue = String(row.last_active_at || '');
        rowTime = rowValue ? Date.parse(rowValue) : NaN;

        if (rowValue && rowValue !== String(previousValue || '')) {
            return row;
        }

        if (!isNaN(expectedTime) && !isNaN(rowTime) && rowTime >= expectedTime) {
            return row;
        }

        await wait(500);
    }

    return row || null;
}

async function run() {
    var apiContext;
    var partner;
    var beforeRow;
    var dashboardResponse;
    var afterRow;
    var dashboardTouchAt;
    var dryCurrent;
    var dryFuture;
    var results;

    loadEnv();
    ensureDir(OUTPUT_DIR);

    apiContext = await playwright.request.newContext({
        ignoreHTTPSErrors: true
    });

    partner = await getFirstActivePartner(apiContext);
    beforeRow = await getPartnerRow(apiContext, partner.partner_code);

    dashboardResponse = await requestJson(apiContext, 'POST', 'https://n8n.pressco21.com/webhook/partner-auth', {
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            action: 'getPartnerDashboard',
            member_id: partner.member_id,
            month: '2026-03'
        }
    });

    assert.strictEqual(dashboardResponse.status, 200, 'getPartnerDashboard 응답 코드 이상');
    assert(dashboardResponse.body && dashboardResponse.body.success === true, 'getPartnerDashboard 실패');
    dashboardTouchAt = dashboardResponse.body
        && dashboardResponse.body.data
        && dashboardResponse.body.data.partner
        && dashboardResponse.body.data.partner.last_active_at;

    afterRow = await waitForPartnerTouch(apiContext, partner.partner_code, beforeRow.last_active_at, dashboardTouchAt);
    assert(afterRow.last_active_at, 'last_active_at가 비어 있습니다.');
    assert(
        String(beforeRow.last_active_at || '') !== String(afterRow.last_active_at || '')
        || String(afterRow.last_active_at || '') === String(dashboardTouchAt || ''),
        'last_active_at가 갱신되지 않았습니다.'
    );

    dryCurrent = await requestJson(apiContext, 'POST', 'https://n8n.pressco21.com/webhook/partner-churn-scan', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer pressco21-admin-2026'
        },
        data: {
            dry_run: true,
            include_partner_codes: [partner.partner_code],
            today: '2026-03-11'
        }
    });

    assert.strictEqual(dryCurrent.status, 200, '현재일 dry run 응답 코드 이상');
    assert(dryCurrent.body && dryCurrent.body.success === true, '현재일 dry run 실패');
    assert.strictEqual(dryCurrent.body.data.risk_count, 0, '현재일 기준 위험 파트너가 없어야 합니다.');

    dryFuture = await requestJson(apiContext, 'POST', 'https://n8n.pressco21.com/webhook/partner-churn-scan', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer pressco21-admin-2026'
        },
        data: {
            dry_run: true,
            include_partner_codes: [partner.partner_code],
            today: '2026-06-15'
        }
    });

    assert.strictEqual(dryFuture.status, 200, '미래일 dry run 응답 코드 이상');
    assert(dryFuture.body && dryFuture.body.success === true, '미래일 dry run 실패');
    assert(dryFuture.body.data.risk_count >= 1, '미래일 기준 위험 파트너가 감지되어야 합니다.');

    results = {
        partner: {
            partner_code: partner.partner_code,
            partner_name: partner.partner_name,
            member_id: partner.member_id
        },
        touch: {
            before_last_active_at: beforeRow.last_active_at || null,
            after_last_active_at: afterRow.last_active_at || null,
            dashboard_last_active_at: dashboardTouchAt || null,
            dashboard_status: dashboardResponse.status,
            dashboard_success: dashboardResponse.body && dashboardResponse.body.success
        },
        churnDryRun: {
            current: dryCurrent,
            future: dryFuture
        },
        checkedAt: new Date().toISOString()
    };

    writeJson(OUTPUT_PATH, results);
    console.log('saved ' + path.relative(REPO_ROOT, OUTPUT_PATH));
    await apiContext.dispose();
}

run().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
