#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_DIR = path.join(REPO_ROOT, 'output', 'playwright', 's3-4-scalability');
var RESULT_PATH = path.join(OUTPUT_DIR, 'scalability-results.json');
var SSH_KEY_PATH = '/Users/jangjiho/.ssh/oracle-n8n.key';
var SSH_TARGET = 'ubuntu@158.180.77.201';
var N8N_CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';

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

function percentile(list, pct) {
    var sorted = list.slice().sort(function(a, b) { return a - b; });
    var index = 0;

    if (!sorted.length) {
        return 0;
    }

    index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
    return Number(sorted[index].toFixed(2));
}

function average(list) {
    if (!list.length) {
        return 0;
    }

    return Number((list.reduce(function(total, value) { return total + value; }, 0) / list.length).toFixed(2));
}

async function fetchJsonWithTiming(url, body, timeoutMs) {
    var controller = new AbortController();
    var startedAt = Date.now();
    var timer = setTimeout(function() {
        controller.abort();
    }, timeoutMs);
    var response = null;
    var text = '';
    var parsed = null;

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        text = await response.text();
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch (error) {
            parsed = { raw: text };
        }
        return {
            ok: response.ok,
            status: response.status,
            latencyMs: Date.now() - startedAt,
            body: parsed
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            latencyMs: Date.now() - startedAt,
            error: error && error.message ? error.message : String(error)
        };
    } finally {
        clearTimeout(timer);
    }
}

async function runLoadScenario(name, options) {
    var durationMs = options.durationMs;
    var concurrency = options.concurrency;
    var builder = options.bodyBuilder;
    var timeoutMs = options.timeoutMs || 15000;
    var endTime = Date.now() + durationMs;
    var latencies = [];
    var errorSamples = [];
    var total = 0;
    var success = 0;
    var failed = 0;
    var workers = [];
    var i = 0;

    async function worker() {
        while (Date.now() < endTime) {
            var response = await fetchJsonWithTiming(N8N_CLASS_API_URL, builder(), timeoutMs);
            total += 1;
            latencies.push(response.latencyMs);
            if (response.ok && response.body && response.body.success !== false) {
                success += 1;
            } else {
                failed += 1;
                if (errorSamples.length < 5) {
                    errorSamples.push({
                        status: response.status,
                        error: response.error || (response.body && response.body.message) || 'unknown'
                    });
                }
            }
        }
    }

    for (i = 0; i < concurrency; i += 1) {
        workers.push(worker());
    }

    await Promise.all(workers);

    return {
        name: name,
        concurrency: concurrency,
        durationMs: durationMs,
        totalRequests: total,
        success: success,
        failed: failed,
        successRate: total ? Number(((success / total) * 100).toFixed(2)) : 0,
        avgMs: average(latencies),
        p50Ms: percentile(latencies, 50),
        p95Ms: percentile(latencies, 95),
        p99Ms: percentile(latencies, 99),
        maxMs: latencies.length ? Number(Math.max.apply(null, latencies).toFixed(2)) : 0,
        rps: durationMs ? Number((total / (durationMs / 1000)).toFixed(2)) : 0,
        errorSamples: errorSamples
    };
}

function execSshScript(script) {
    return execFileSync('ssh', [
        '-i',
        SSH_KEY_PATH,
        '-o',
        'StrictHostKeyChecking=no',
        SSH_TARGET,
        'python3 -'
    ], {
        input: script,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
    });
}

function getServerSnapshot() {
    var script = [
        'import json',
        'import subprocess',
        '',
        'def sh(cmd):',
        '    return subprocess.check_output(cmd, shell=True, text=True).strip()',
        '',
        'result = {',
        "  'hostname': sh('hostname'),",
        "  'uptime': sh('uptime'),",
        "  'free_h': sh('free -h'),",
        "  'df_root': sh('df -h /'),",
        "  'docker_stats': sh(\"docker stats --no-stream --format '{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}'\"),",
        "  'docker_ps': sh(\"docker ps --format '{{.Names}}\\t{{.Status}}\\t{{.Ports}}'\")",
        '}',
        'print(json.dumps(result))'
    ].join('\n');

    return JSON.parse(execSshScript(script));
}

function runSyntheticSqliteBenchmark() {
    var script = [
        'import json',
        'import os',
        'import random',
        'import sqlite3',
        'import tempfile',
        'import time',
        '',
        "db_path = os.path.join(tempfile.gettempdir(), 'partnerclass_s3_4_bench.sqlite')",
        'if os.path.exists(db_path):',
        '    os.remove(db_path)',
        '',
        'conn = sqlite3.connect(db_path)',
        'cur = conn.cursor()',
        "cur.execute('CREATE TABLE classes (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id TEXT, status TEXT, region TEXT, level TEXT, partner_code TEXT, price INTEGER, avg_rating REAL, created_at TEXT)')",
        '',
        "regions = ['SEOUL', 'GYEONGGI', 'BUSAN', 'ONLINE']",
        "levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']",
        "statuses = ['ACTIVE', 'PAUSED', 'REJECTED']",
        '',
        'rows = []',
        'for i in range(100000):',
        "    rows.append(('CL_%06d' % i, statuses[0] if i % 10 else statuses[1], regions[i % len(regions)], levels[i % len(levels)], 'PC_%03d' % (i % 300), 30000 + (i % 40) * 1000, 3.8 + ((i % 13) / 10.0), '2026-03-11'))",
        '',
        'started = time.perf_counter()',
        "cur.executemany('INSERT INTO classes (class_id, status, region, level, partner_code, price, avg_rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', rows)",
        'conn.commit()',
        'insert_ms = round((time.perf_counter() - started) * 1000, 2)',
        '',
        'def measure(query, params=(), repeat=8):',
        '    samples = []',
        '    for _ in range(repeat):',
        '        t0 = time.perf_counter()',
        '        list(cur.execute(query, params))',
        '        samples.append((time.perf_counter() - t0) * 1000)',
        '    samples.sort()',
        '    return {',
        "        'avgMs': round(sum(samples) / len(samples), 2),",
        "        'p95Ms': round(samples[min(len(samples) - 1, int(len(samples) * 0.95))], 2),",
        "        'maxMs': round(max(samples), 2)",
        '    }',
        '',
        "baseline = {",
        "  'catalogQuery': measure(\"SELECT class_id, price FROM classes WHERE status='ACTIVE' AND region='SEOUL' AND level='BEGINNER' ORDER BY avg_rating DESC LIMIT 12\"),",
        "  'detailQuery': measure('SELECT * FROM classes WHERE class_id=?', ('CL_050000',)),",
        "  'partnerQuery': measure(\"SELECT COUNT(*) FROM classes WHERE partner_code=? AND status='ACTIVE'\", ('PC_042',))",
        '}',
        '',
        "cur.execute('CREATE INDEX idx_classes_catalog ON classes(status, region, level, avg_rating DESC)')",
        "cur.execute('CREATE INDEX idx_classes_classid ON classes(class_id)')",
        "cur.execute('CREATE INDEX idx_classes_partner_status ON classes(partner_code, status)')",
        'conn.commit()',
        '',
        "indexed = {",
        "  'catalogQuery': measure(\"SELECT class_id, price FROM classes WHERE status='ACTIVE' AND region='SEOUL' AND level='BEGINNER' ORDER BY avg_rating DESC LIMIT 12\"),",
        "  'detailQuery': measure('SELECT * FROM classes WHERE class_id=?', ('CL_050000',)),",
        "  'partnerQuery': measure(\"SELECT COUNT(*) FROM classes WHERE partner_code=? AND status='ACTIVE'\", ('PC_042',))",
        '}',
        '',
        'conn.close()',
        'os.remove(db_path)',
        'print(json.dumps({',
        "  'rowCount': 100000,",
        "  'insertMs': insert_ms,",
        "  'baseline': baseline,",
        "  'indexed': indexed",
        '}))'
    ].join('\n');

    return JSON.parse(execSshScript(script));
}

async function fetchNocoCounts(env) {
    var headers = {
        'xc-token': env.NOCODB_API_TOKEN
    };
    var metaResponse = await fetch(env.NOCODB_URL + '/api/v2/meta/bases/' + env.NOCODB_PROJECT_ID + '/tables', { headers: headers });
    var metaData = await metaResponse.json();
    var targets = ['tbl_Partners', 'tbl_Classes', 'tbl_Schedules', 'tbl_Settlements', 'tbl_Reviews', 'tbl_Subscriptions'];
    var tableMap = {};
    var results = {};
    var i = 0;

    (metaData.list || []).forEach(function(item) {
        tableMap[item.title] = item.id;
    });

    for (i = 0; i < targets.length; i += 1) {
        var title = targets[i];
        var tableId = tableMap[title];
        var response = null;
        var data = null;

        if (!tableId) {
            results[title] = { count: null, reason: 'missing' };
            continue;
        }

        response = await fetch(env.NOCODB_URL + '/api/v1/db/data/noco/' + env.NOCODB_PROJECT_ID + '/' + tableId + '?limit=1', {
            headers: headers
        });
        data = await response.json();
        results[title] = {
            tableId: tableId,
            count: data.pageInfo && typeof data.pageInfo.totalRows === 'number' ? data.pageInfo.totalRows : (data.list || []).length
        };
    }

    return results;
}

async function detectDetailClassId() {
    var response = await fetchJsonWithTiming(N8N_CLASS_API_URL, {
        action: 'getClasses',
        sort: 'popular',
        limit: 10
    }, 10000);
    var classes = response.body && response.body.data && response.body.data.classes ? response.body.data.classes : [];
    return classes.length ? (classes[0].class_id || classes[0].id || '') : '';
}

async function main() {
    var env = loadEnv(ENV_PATH);
    var detailClassId = '';
    var results = {
        task: 'S3-4',
        generatedAt: new Date().toISOString()
    };

    if (!env.NOCODB_URL || !env.NOCODB_API_TOKEN || !env.NOCODB_PROJECT_ID) {
        throw new Error('NocoDB env missing');
    }

    ensureDir(OUTPUT_DIR);
    results.serverSnapshot = getServerSnapshot();
    results.liveCounts = await fetchNocoCounts(env);
    detailClassId = await detectDetailClassId();
    results.detailClassId = detailClassId;

    results.loadTests = [];
    results.loadTests.push(await runLoadScenario('catalog_read_10c_5s', {
        concurrency: 10,
        durationMs: 5000,
        timeoutMs: 12000,
        bodyBuilder: function() {
            return {
                action: 'getClasses',
                sort: 'popular',
                limit: 12,
                region: 'SEOUL'
            };
        }
    }));
    results.loadTests.push(await runLoadScenario('catalog_read_50c_5s', {
        concurrency: 50,
        durationMs: 5000,
        timeoutMs: 12000,
        bodyBuilder: function() {
            return {
                action: 'getClasses',
                sort: 'popular',
                limit: 12,
                region: 'SEOUL'
            };
        }
    }));
    results.loadTests.push(await runLoadScenario('catalog_read_100c_10s', {
        concurrency: 100,
        durationMs: 10000,
        timeoutMs: 12000,
        bodyBuilder: function() {
            return {
                action: 'getClasses',
                sort: 'popular',
                limit: 12,
                region: 'SEOUL'
            };
        }
    }));
    results.loadTests.push(await runLoadScenario('detail_read_100c_10s', {
        concurrency: 100,
        durationMs: 10000,
        timeoutMs: 12000,
        bodyBuilder: function() {
            return {
                action: 'getClassDetail',
                id: detailClassId
            };
        }
    }));
    results.loadTests.push(await runLoadScenario('mixed_read_100c_10s', {
        concurrency: 100,
        durationMs: 10000,
        timeoutMs: 12000,
        bodyBuilder: function() {
            var rand = Math.random();

            if (rand < 0.6) {
                return { action: 'getClasses', sort: 'popular', limit: 12 };
            }
            if (rand < 0.85) {
                return { action: 'getClassDetail', id: detailClassId };
            }
            return { action: 'getContentHub' };
        }
    }));

    results.postLoadSnapshot = getServerSnapshot();
    results.syntheticSqlite = runSyntheticSqliteBenchmark();
    writeJson(RESULT_PATH, results);
    console.log(JSON.stringify(results, null, 2));
    console.log('saved ' + path.relative(REPO_ROOT, RESULT_PATH));
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
