#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-3-subscription');
var RESULT_PATH = path.join(OUTPUT_DIR, 'table-create-results.json');
var TABLE_TITLE = 'tbl_Subscriptions';
var TABLE_SPEC = {
    title: TABLE_TITLE,
    columns: [
        { title: 'subscription_id', column_name: 'subscription_id', uidt: 'SingleLineText' },
        { title: 'member_id', column_name: 'member_id', uidt: 'SingleLineText' },
        { title: 'member_name', column_name: 'member_name', uidt: 'SingleLineText' },
        { title: 'member_email', column_name: 'member_email', uidt: 'Email' },
        { title: 'member_phone', column_name: 'member_phone', uidt: 'PhoneNumber' },
        { title: 'class_id', column_name: 'class_id', uidt: 'SingleLineText' },
        { title: 'class_name', column_name: 'class_name', uidt: 'SingleLineText' },
        { title: 'partner_code', column_name: 'partner_code', uidt: 'SingleLineText' },
        { title: 'partner_name', column_name: 'partner_name', uidt: 'SingleLineText' },
        { title: 'kit_bundle_branduid', column_name: 'kit_bundle_branduid', uidt: 'SingleLineText' },
        { title: 'regular_price', column_name: 'regular_price', uidt: 'Number' },
        { title: 'subscriber_price', column_name: 'subscriber_price', uidt: 'Number' },
        { title: 'preview_items_json', column_name: 'preview_items_json', uidt: 'LongText' },
        { title: 'delivery_day', column_name: 'delivery_day', uidt: 'Number' },
        { title: 'cycle_months', column_name: 'cycle_months', uidt: 'Number', cdf: '1' },
        { title: 'status', column_name: 'status', uidt: 'SingleLineText' },
        { title: 'next_order_date', column_name: 'next_order_date', uidt: 'Date' },
        { title: 'last_order_date', column_name: 'last_order_date', uidt: 'Date' },
        { title: 'last_order_ref', column_name: 'last_order_ref', uidt: 'SingleLineText' },
        { title: 'last_batch_month', column_name: 'last_batch_month', uidt: 'SingleLineText' },
        { title: 'order_count', column_name: 'order_count', uidt: 'Number', cdf: '0' },
        { title: 'shipping_zipcode', column_name: 'shipping_zipcode', uidt: 'SingleLineText' },
        { title: 'shipping_address1', column_name: 'shipping_address1', uidt: 'SingleLineText' },
        { title: 'shipping_address2', column_name: 'shipping_address2', uidt: 'SingleLineText' },
        { title: 'started_at', column_name: 'started_at', uidt: 'DateTime' },
        { title: 'cancelled_at', column_name: 'cancelled_at', uidt: 'DateTime' },
        { title: 'notes', column_name: 'notes', uidt: 'LongText' }
    ]
};

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

function validateEnv(env) {
    var requiredKeys = ['NOCODB_URL', 'NOCODB_API_TOKEN', 'NOCODB_PROJECT_ID'];
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

async function metaRequest(env, method, suffix, body) {
    return requestJson(method, env.NOCODB_URL + suffix, {
        'xc-token': env.NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
    }, body);
}

async function listMetaTables(env) {
    var data = await metaRequest(env, 'GET', '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables');
    return Array.isArray(data.list) ? data.list : [];
}

async function getTableDetail(env, tableId) {
    return metaRequest(env, 'GET', '/api/v2/meta/tables/' + tableId);
}

async function createTable(env, spec) {
    return metaRequest(env, 'POST', '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables', spec);
}

async function addColumn(env, tableId, column) {
    return metaRequest(env, 'POST', '/api/v2/meta/tables/' + tableId + '/columns', column);
}

async function ensureTable(env) {
    var tables = await listMetaTables(env);
    var existing = null;
    var detail = null;
    var existingMap = {};
    var addedColumns = [];
    var created = false;

    tables.forEach(function(item) {
        if (item.title === TABLE_TITLE) {
            existing = item;
        }
    });

    if (!existing) {
        existing = await createTable(env, TABLE_SPEC);
        created = true;
    }

    detail = await getTableDetail(env, existing.id);
    (detail.columns || []).forEach(function(column) {
        existingMap[column.column_name] = true;
    });

    for (var i = 0; i < TABLE_SPEC.columns.length; i += 1) {
        if (!existingMap[TABLE_SPEC.columns[i].column_name]) {
            await addColumn(env, existing.id, TABLE_SPEC.columns[i]);
            addedColumns.push(TABLE_SPEC.columns[i].column_name);
        }
    }

    detail = await getTableDetail(env, existing.id);

    return {
        id: existing.id,
        created: created,
        addedColumns: addedColumns,
        columns: (detail.columns || []).map(function(column) { return column.column_name; })
    };
}

async function main() {
    var env = loadEnv(ENV_PATH);
    var result = null;

    validateEnv(env);
    ensureDir(OUTPUT_DIR);
    result = await ensureTable(env);
    writeJson(RESULT_PATH, result);
    console.log(JSON.stringify(result, null, 2));
    console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
