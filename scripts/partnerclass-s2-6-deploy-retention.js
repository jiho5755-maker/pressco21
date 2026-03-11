#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_ROOT = path.join(REPO_ROOT, 'output', 'n8n-backups');
var WORKFLOW_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-RETENTION-student-lifecycle.json');
var N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.pressco21.com';

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
    var existing;
    var workflow;
    var remoteWorkflow;
    var backupDir;

    if (!apiKey) {
        throw new Error('N8N_API_KEY not found in environment or .secrets.env');
    }

    workflows = await listWorkflows(apiKey);
    workflow = readJson(WORKFLOW_PATH);
    existing = workflows.find(function(item) {
        return item.name === workflow.name;
    });

    backupDir = path.join(OUTPUT_ROOT, getTimestamp() + '-s2-6-retention');
    fs.mkdirSync(backupDir, { recursive: true });

    if (existing && existing.id) {
        writeJson(path.join(backupDir, existing.id + '-backup.json'), await getWorkflow(apiKey, existing.id));
        remoteWorkflow = await apiRequest(apiKey, 'PUT', '/api/v1/workflows/' + existing.id, stripWorkflowPayload(workflow));
    } else {
        remoteWorkflow = await apiRequest(apiKey, 'POST', '/api/v1/workflows', stripWorkflowPayload(workflow));
    }

    await activateWorkflow(apiKey, remoteWorkflow.id);
    workflow.id = remoteWorkflow.id;
    writeJson(WORKFLOW_PATH, workflow);

    console.log(workflow.name + ' -> ' + remoteWorkflow.id);
    console.log('Backups stored in ' + backupDir);
}

main().catch(function(error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
});
