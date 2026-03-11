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
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-6-event-calendar');
var RESULT_PATH = path.join(OUTPUT_DIR, 'event-calendar-results.json');
var SCREENSHOT_PATH = path.join(OUTPUT_DIR, 'admin-event-calendar.png');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');

var CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';
var EVENT_ADMIN_API_URL = 'https://n8n.pressco21.com/webhook/partnerclass-event-calendar-admin';
var N8N_BASE_URL = 'https://n8n.pressco21.com';
var AUTO_WORKFLOW_NAME = 'WF-EVENT D14 Auto Alert';
var ADMIN_WORKFLOW_NAME = 'WF-EVENT Yearly Calendar Admin';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildFixtures() {
    execFileSync(process.execPath, [FIXTURE_BUILDER], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: process.env
    });
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

function getContentType(filePath) {
    if (/\.html$/i.test(filePath)) return 'text/html; charset=utf-8';
    if (/\.json$/i.test(filePath)) return 'application/json; charset=utf-8';
    if (/\.png$/i.test(filePath)) return 'image/png';
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
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Bad Request');
                return;
            }

            if (pathname === '/') {
                pathname = '/output/playwright/fixtures/partnerclass/admin.html';
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

async function postJson(url, payload, token) {
    var response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(payload)
    });
    var text = await response.text();
    var body = null;

    try {
        body = text ? JSON.parse(text) : null;
    } catch (error) {
        body = { raw: text };
    }

    return {
        status: response.status,
        body: body
    };
}

async function postPublicJson(url, payload) {
    var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    var text = await response.text();
    var body = null;

    try {
        body = text ? JSON.parse(text) : null;
    } catch (error) {
        body = { raw: text };
    }

    return {
        status: response.status,
        body: body
    };
}

async function n8nApiRequest(apiKey, pathname) {
    var response = await fetch(N8N_BASE_URL + pathname, {
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        }
    });
    var text = await response.text();
    var body = null;

    try {
        body = text ? JSON.parse(text) : null;
    } catch (error) {
        body = { raw: text };
    }

    if (!response.ok) {
        throw new Error('N8N API failed: ' + response.status + ' ' + pathname);
    }

    return body;
}

function countCoveredMonths(list) {
    var seen = {};
    var months = [];
    var i;

    for (i = 0; i < (list || []).length; i += 1) {
        var monthValue = Number((list[i].month || String(list[i].seminar_date || '').slice(5, 7)).toString().replace(/^0/, ''));
        if (monthValue && !seen[monthValue]) {
            seen[monthValue] = true;
            months.push(monthValue);
        }
    }

    months.sort(function(a, b) { return a - b; });
    return months;
}

async function runPlaywrightUi(baseUrl, liveSeminars, dryRunResponse, syncResponse) {
    var browser = await chromium.launch({ headless: true });
    var page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
    var uiResult = {};

    await page.route('**/webhook/admin-api', function(route) {
        var payload = route.request().postDataJSON() || {};
        var action = payload.action || '';
        var body = { success: true, data: { total: 0, applications: [], classes: [], settlements: [] } };

        if (action === 'getAffilStats') {
            body = { success: true, data: [] };
        } else if (action === 'getSettlements') {
            body = { success: true, data: { total: 0, settlements: [] } };
        } else if (action === 'getSettlementHistory') {
            body = { success: true, data: [] };
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(body)
        });
    });

    await page.route('**/webhook/class-api', function(route) {
        var payload = route.request().postDataJSON() || {};
        var action = payload.action || '';
        var body = { success: true, data: [] };
        var affiliations = [
            {
                affiliation_code: 'KPFA_001',
                name: '한국꽃공예협회',
                discount_rate: 7,
                contact_name: 'PRESSCO21',
                incentive_tiers: [
                    { target: 5000000, incentive: 250000 },
                    { target: 10000000, incentive: 500000 },
                    { target: 20000000, incentive: 1200000 }
                ]
            }
        ];

        if (action === 'getAffiliations') {
            body = { success: true, data: affiliations, total: affiliations.length };
        } else if (action === 'getSeminars') {
            body = liveSeminars;
        }

        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(body)
        });
    });

    await page.route('**/webhook/partnerclass-event-calendar-admin', function(route) {
        var payload = route.request().postDataJSON() || {};
        var body = payload.action === 'syncAnnualCalendar' ? syncResponse.body : dryRunResponse.body;
        route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(body)
        });
    });

    await page.goto(baseUrl + '/output/playwright/fixtures/partnerclass/admin.html', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: '협회 관리' }).click();
    await page.waitForSelector('#tbodyEventCalendar tr');
    await page.getByRole('button', { name: 'D-14 알림 점검' }).click();
    await page.waitForFunction(function() {
        var text = document.getElementById('eventAlertResult');
        return text && text.textContent.indexOf('D-14 알림 점검') >= 0;
    });

    uiResult.eventRows = await page.locator('#tbodyEventCalendar tr').count();
    uiResult.totalCount = await page.locator('#eventCalendarTotalCount').innerText();
    uiResult.upcomingCount = await page.locator('#eventCalendarUpcomingCount').innerText();
    uiResult.dueCount = await page.locator('#eventCalendarDueCount').innerText();
    uiResult.resultText = await page.locator('#eventAlertResult').innerText();

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    await browser.close();
    return uiResult;
}

async function main() {
    var env = loadEnv(ENV_PATH);
    var apiKey = env.N8N_API_KEY || process.env.N8N_API_KEY || '';
    var adminToken = 'pressco21-admin-2026';
    var syncResponse;
    var seminarsResponse;
    var dryRunResponse;
    var workflowList;
    var adminWorkflow;
    var autoWorkflow;
    var serverInfo;
    var result = {};

    ensureDir(OUTPUT_DIR);
    buildFixtures();

    syncResponse = await postJson(EVENT_ADMIN_API_URL, {
        action: 'syncAnnualCalendar',
        year: 2026,
        dry_run: false,
        requested_by: 'runner'
    }, adminToken);
    assert(syncResponse.status === 200, 'syncAnnualCalendar HTTP 실패');
    assert(syncResponse.body && syncResponse.body.success, 'syncAnnualCalendar 응답 실패');

    seminarsResponse = await postPublicJson(CLASS_API_URL, {
        action: 'getSeminars',
        year: 2026,
        limit: 60
    });
    assert(seminarsResponse.status === 200, 'getSeminars HTTP 실패');
    assert(seminarsResponse.body && seminarsResponse.body.success, 'getSeminars 응답 실패');

    dryRunResponse = await postJson(EVENT_ADMIN_API_URL, {
        action: 'runD14Alerts',
        year: 2026,
        today: '2026-03-11',
        dry_run: true,
        requested_by: 'runner'
    }, adminToken);
    assert(dryRunResponse.status === 200, 'runD14Alerts dry-run HTTP 실패');
    assert(dryRunResponse.body && dryRunResponse.body.success, 'runD14Alerts dry-run 응답 실패');

    result.sync = syncResponse.body.data || {};
    result.seminars = {
        total: seminarsResponse.body.total || 0,
        months_covered: countCoveredMonths(seminarsResponse.body.data || []),
        first_titles: (seminarsResponse.body.data || []).slice(0, 5).map(function(item) {
            return item.title;
        })
    };
    result.dry_run = dryRunResponse.body.data || {};

    if (apiKey) {
        workflowList = await n8nApiRequest(apiKey, '/api/v1/workflows?limit=250');
        adminWorkflow = (workflowList.data || []).filter(function(item) { return item.name === ADMIN_WORKFLOW_NAME; })[0] || null;
        autoWorkflow = (workflowList.data || []).filter(function(item) { return item.name === AUTO_WORKFLOW_NAME; })[0] || null;
        result.workflows = {
            admin: adminWorkflow ? { id: adminWorkflow.id, active: adminWorkflow.active } : null,
            auto: autoWorkflow ? { id: autoWorkflow.id, active: autoWorkflow.active } : null
        };
    } else {
        result.workflows = {
            admin: null,
            auto: null
        };
    }

    serverInfo = await startStaticServer(REPO_ROOT);
    try {
        result.ui = await runPlaywrightUi(serverInfo.baseUrl, seminarsResponse.body, dryRunResponse, syncResponse);
    } finally {
        await closeServer(serverInfo.server);
    }

    writeJson(RESULT_PATH, result);
    console.log(JSON.stringify(result, null, 2));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
