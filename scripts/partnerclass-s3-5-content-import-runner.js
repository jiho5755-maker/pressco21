#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var execFileSync = require('child_process').execFileSync;
var playwright = require('playwright');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-5-content-import');
var RESULT_PATH = path.join(OUTPUT_DIR, 'content-import-results.json');
var SCREENSHOT_PATH = path.join(OUTPUT_DIR, 'content-import-hub.png');
var CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';
var IMPORT_URL = 'https://n8n.pressco21.com/webhook/partnerclass-content-import';
var FIXTURE_BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-partnerclass-playwright-fixtures.js');
var FIXTURE_PATH = path.join(REPO_ROOT, 'output', 'playwright', 'fixtures', 'partnerclass', 'content-hub.html');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function postJson(url, body) {
    var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    var text = await response.text();
    var data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch (error) {
        data = { raw: text };
    }

    return {
        status: response.status,
        ok: response.ok,
        body: data
    };
}

async function main() {
    var before = null;
    var dryRun = null;
    var apply = null;
    var after = null;
    var overlapTitles = [];
    var browser = null;
    var page = null;
    var trendTitles = [];
    var guideTitles = [];
    var featureMessage = '';

    ensureDir(OUTPUT_DIR);

    before = await postJson(CLASS_API_URL, { action: 'getContentHub' });
    assert.strictEqual(before.status, 200, 'before content hub status');
    assert.strictEqual(before.body && before.body.success, true, 'before content hub success');

    dryRun = await postJson(IMPORT_URL, {
        affiliation_code: 'KPFA_001',
        limit: 3,
        dry_run: true
    });
    assert.strictEqual(dryRun.status, 200, 'dry run status');
    assert.strictEqual(dryRun.body && dryRun.body.success, true, 'dry run success');
    assert.ok((dryRun.body.data && dryRun.body.data.youtube_count) > 0, 'dry run youtube_count should be > 0');

    apply = await postJson(IMPORT_URL, {
        affiliation_code: 'KPFA_001',
        limit: 3,
        dry_run: false
    });
    assert.strictEqual(apply.status, 200, 'apply status');
    assert.strictEqual(apply.body && apply.body.success, true, 'apply success');
    assert.ok(((apply.body.data && apply.body.data.created) || 0) + ((apply.body.data && apply.body.data.updated) || 0) > 0, 'apply should create or update content');

    after = await postJson(CLASS_API_URL, { action: 'getContentHub' });
    assert.strictEqual(after.status, 200, 'after content hub status');
    assert.strictEqual(after.body && after.body.success, true, 'after content hub success');
    assert.ok((after.body.data.summary && after.body.data.summary.imported_content_count) >= 1, 'imported content count should be >= 1');
    assert.ok(Array.isArray(after.body.data.imported_content_preview), 'imported content preview should exist');
    assert.ok(after.body.data.imported_content_preview.length >= 1, 'imported content preview should be non-empty');

    overlapTitles = (after.body.data.imported_content_preview || []).map(function(item) {
        return item.title;
    }).filter(function(title) {
        return ((apply.body.data && apply.body.data.written_titles) || []).indexOf(title) >= 0;
    });
    assert.ok(overlapTitles.length >= 1, 'content hub preview should include imported titles');

    execFileSync('node', [FIXTURE_BUILD_SCRIPT], {
        cwd: REPO_ROOT,
        stdio: 'pipe'
    });

    browser = await playwright.chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
    await page.route('**/webhook/class-api', async function(route) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(after.body)
        });
    });
    await page.goto('file://' + FIXTURE_PATH);
    await page.waitForSelector('.pch-trend-card__title');
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    featureMessage = await page.textContent('#pchFeatureMessage');
    trendTitles = await page.$$eval('.pch-trend-card__title', function(elements) {
        return elements.map(function(element) {
            return (element.textContent || '').trim();
        }).filter(Boolean);
    });
    guideTitles = await page.$$eval('.pch-guide-card__title', function(elements) {
        return elements.map(function(element) {
            return (element.textContent || '').trim();
        }).filter(Boolean);
    });

    await browser.close();

    writeJson(RESULT_PATH, {
        task: 'S3-5',
        generatedAt: new Date().toISOString(),
        beforeSummary: before.body.data.summary,
        dryRun: dryRun.body.data,
        apply: apply.body.data,
        afterSummary: after.body.data.summary,
        importedPreview: after.body.data.imported_content_preview,
        overlapTitles: overlapTitles,
        featureMessage: featureMessage,
        trendTitles: trendTitles,
        guideTitles: guideTitles,
        screenshot: SCREENSHOT_PATH
    });

    console.log(JSON.stringify({
        dryRun: dryRun.body.data,
        apply: apply.body.data,
        overlapTitles: overlapTitles,
        trendTitles: trendTitles,
        guideTitles: guideTitles
    }, null, 2));
    console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
}

main().catch(async function(error) {
    try {
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
    } catch (closeError) {
    }
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
