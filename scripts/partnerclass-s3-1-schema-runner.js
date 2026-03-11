#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var playwright = require('playwright');
var schema = require('./partnerclass-s3-1-create-tables.js');

var REPO_ROOT = path.resolve(__dirname, '..');
var RESULT_PATH = path.join(schema.OUTPUT_DIR, 'schema-results.json');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function apiRequest(context, method, url, body) {
    var response = await context.fetch(url, {
        method: method,
        data: body
    });
    var text = await response.text();
    var data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch (error) {
        data = { raw: text };
    }

    if (!response.ok()) {
        throw new Error(method + ' ' + url + ' failed: ' + response.status() + ' ' + JSON.stringify(data));
    }

    return data;
}

async function listMetaTables(context, env) {
    var url = env.NOCODB_URL + '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables';
    var data = await apiRequest(context, 'GET', url);
    return Array.isArray(data.list) ? data.list : [];
}

async function getTableDetail(context, env, tableId) {
    var url = env.NOCODB_URL + '/api/v2/meta/tables/' + tableId;
    return apiRequest(context, 'GET', url);
}

async function listRows(context, env, tableId) {
    var page = 1;
    var rows = [];
    var hasNext = true;

    while (hasNext) {
        var url = env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + '?limit=200&page=' + page;
        var data = await apiRequest(context, 'GET', url);
        var list = Array.isArray(data.list) ? data.list : [];
        var pageInfo = data.pageInfo || {};

        rows = rows.concat(list);
        hasNext = list.length > 0 && pageInfo.isLastPage === false;
        page += 1;
    }

    return rows;
}

function buildIndex(rows, uniqueFields) {
    var index = {};

    rows.forEach(function(row) {
        var key = schema.getUniqueKey(row, uniqueFields);
        if (key) {
            index[key] = row;
        }
    });

    return index;
}

async function main() {
    var env = schema.loadEnv(schema.ENV_PATH);
    var requestContext;
    var metaTables;
    var affiliationRows;
    var affiliationContext;
    var sampleMap;
    var results = {
        task: 'S3-1',
        generatedAt: new Date().toISOString(),
        affiliation: null,
        tables: {}
    };
    var i = 0;

    if (!env.NOCODB_URL || !env.NOCODB_API_TOKEN || !env.NOCODB_PROJECT_ID || !env.NOCODB_TABLE_AFFILIATIONS) {
        throw new Error('NocoDB 환경변수가 부족합니다.');
    }

    ensureDir(schema.OUTPUT_DIR);

    requestContext = await playwright.request.newContext({
        extraHTTPHeaders: {
            'xc-token': env.NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        }
    });

    try {
        metaTables = await listMetaTables(requestContext, env);
        affiliationRows = await listRows(requestContext, env, env.NOCODB_TABLE_AFFILIATIONS);
        affiliationContext = affiliationRows.filter(function(row) {
            return String(row.affiliation_code || '') === schema.DEFAULT_AFFILIATION_CODE;
        })[0] || affiliationRows[0] || null;

        assert(affiliationContext, '검증용 affiliation row가 없습니다.');
        sampleMap = schema.buildSampleRows({
            affiliationCode: String(affiliationContext.affiliation_code || ''),
            affiliationName: String(affiliationContext.name || ''),
            discountRate: Number(affiliationContext.discount_rate || 0)
        });
        results.affiliation = {
            affiliationCode: String(affiliationContext.affiliation_code || ''),
            affiliationName: String(affiliationContext.name || ''),
            discountRate: Number(affiliationContext.discount_rate || 0)
        };

        for (i = 0; i < schema.TABLE_SPECS.length; i += 1) {
            var spec = schema.TABLE_SPECS[i];
            var meta = metaTables.filter(function(item) {
                return item.title === spec.title;
            })[0] || null;
            var detail;
            var rows;
            var rowIndex;
            var sampleRows;
            var expectedColumns;
            var actualColumns;
            var matchKeys = [];
            var matchedCount = 0;
            var j = 0;

            assert(meta, spec.title + ' 테이블이 없습니다.');
            detail = await getTableDetail(requestContext, env, meta.id);
            rows = await listRows(requestContext, env, meta.id);
            rowIndex = buildIndex(rows, spec.uniqueFields);
            sampleRows = sampleMap[spec.title] || [];
            expectedColumns = spec.columns.map(function(column) { return column.column_name; });
            actualColumns = (detail.columns || []).map(function(column) { return column.column_name; });

            expectedColumns.forEach(function(columnName) {
                assert(actualColumns.indexOf(columnName) >= 0, spec.title + ' missing column: ' + columnName);
            });

            for (j = 0; j < sampleRows.length; j += 1) {
                var key = schema.getUniqueKey(sampleRows[j], spec.uniqueFields);
                var row = rowIndex[key] || null;

                matchKeys.push({
                    key: key,
                    exists: !!row
                });

                assert(row, spec.title + ' sample row missing: ' + key);
                matchedCount += 1;
            }

            results.tables[spec.title] = {
                id: meta.id,
                expectedColumns: expectedColumns,
                actualColumns: actualColumns,
                totalRows: rows.length,
                sampleRowsExpected: sampleRows.length,
                sampleRowsMatched: matchedCount,
                keys: matchKeys
            };
        }
    } finally {
        await requestContext.dispose();
    }

    writeJson(RESULT_PATH, results);
    console.log(JSON.stringify(results, null, 2));
    console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
}

if (require.main === module) {
    main().catch(function(error) {
        console.error(error && error.stack ? error.stack : String(error));
        process.exit(1);
    });
}
