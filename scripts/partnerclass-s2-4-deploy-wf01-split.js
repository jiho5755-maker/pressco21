#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.pressco21.com';
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_ROOT = path.join(REPO_ROOT, 'output', 'n8n-backups');
var FILES = [
    '파트너클래스/n8n-workflows/WF-01A-class-read.json',
    '파트너클래스/n8n-workflows/WF-01B-schedule-read.json',
    '파트너클래스/n8n-workflows/WF-01C-affiliation-read.json',
    '파트너클래스/n8n-workflows/WF-01-class-api.json'
];

function pad(value) {
    return String(value).padStart(2, '0');
}

function getTimestamp() {
    var now = new Date();
    return String(now.getFullYear())
        + pad(now.getMonth() + 1)
        + pad(now.getDate())
        + '-'
        + pad(now.getHours())
        + pad(now.getMinutes())
        + pad(now.getSeconds());
}

function loadEnv(filePath) {
    var result = {};
    var text;

    if (!fs.existsSync(filePath)) {
        return result;
    }

    text = fs.readFileSync(filePath, 'utf8');
    text.split(/\r?\n/).forEach(function (line) {
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

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function stripWorkflowPayload(workflow) {
    return {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || { executionOrder: 'v1' }
    };
}

async function apiRequest(apiKey, method, pathname, body) {
    var response = await fetch(N8N_BASE_URL + pathname, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        },
        body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });
    var text = await response.text();
    var data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch (error) {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(method + ' ' + pathname + ' failed: ' + response.status + ' ' + JSON.stringify(data));
    }

    return data;
}

async function listWorkflows(apiKey) {
    var data = await apiRequest(apiKey, 'GET', '/api/v1/workflows?limit=250');
    return Array.isArray(data.data) ? data.data : [];
}

async function getWorkflow(apiKey, workflowId) {
    return apiRequest(apiKey, 'GET', '/api/v1/workflows/' + workflowId);
}

async function saveBackup(apiKey, workflowId, workflowName, backupDir) {
    var workflow = await getWorkflow(apiKey, workflowId);
    var safeName = workflowName.replace(/[^a-zA-Z0-9-_]+/g, '-');
    var filePath = path.join(backupDir, workflowId + '-' + safeName + '.json');

    writeJson(filePath, workflow);
    return filePath;
}

async function activateWorkflow(apiKey, workflowId) {
    try {
        return await apiRequest(apiKey, 'POST', '/api/v1/workflows/' + workflowId + '/activate');
    } catch (error) {
        if (String(error.message || '').indexOf('already active') >= 0) {
            return null;
        }
        throw error;
    }
}

async function main() {
    var loadedEnv = loadEnv(ENV_PATH);
    var apiKey = loadedEnv.N8N_API_KEY || process.env.N8N_API_KEY || '';
    var workflows;
    var workflowIndex = {};
    var backupDir;

    if (!apiKey) {
        throw new Error('N8N_API_KEY not found in environment or .secrets.env');
    }

    workflows = await listWorkflows(apiKey);
    workflows.forEach(function (item) {
        workflowIndex[item.name] = item;
    });

    backupDir = path.join(OUTPUT_ROOT, getTimestamp() + '-s2-4-wf01-split');
    fs.mkdirSync(backupDir, { recursive: true });

    for (var i = 0; i < FILES.length; i += 1) {
        var relativePath = FILES[i];
        var absolutePath = path.join(REPO_ROOT, relativePath);
        var localWorkflow = readJson(absolutePath);
        var existing = localWorkflow.id ? workflowIndex[localWorkflow.name] || { id: localWorkflow.id } : workflowIndex[localWorkflow.name];
        var payload = stripWorkflowPayload(localWorkflow);
        var remoteWorkflow;

        if (existing && existing.id) {
            await saveBackup(apiKey, existing.id, localWorkflow.name, backupDir);
            remoteWorkflow = await apiRequest(apiKey, 'PUT', '/api/v1/workflows/' + existing.id, payload);
        } else {
            remoteWorkflow = await apiRequest(apiKey, 'POST', '/api/v1/workflows', payload);
        }

        await activateWorkflow(apiKey, remoteWorkflow.id);
        localWorkflow.id = remoteWorkflow.id;
        writeJson(absolutePath, localWorkflow);
        workflowIndex[localWorkflow.name] = { id: remoteWorkflow.id, name: localWorkflow.name };
        console.log(localWorkflow.name + ' -> ' + remoteWorkflow.id);
    }

    console.log('Backups stored in ' + backupDir);
}

main().catch(function (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
