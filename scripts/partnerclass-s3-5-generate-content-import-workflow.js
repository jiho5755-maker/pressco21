#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var contentImportHandler = require('./lib/partnerclass-content-import-handler');

var REPO_ROOT = path.resolve(__dirname, '..');
var OUTPUT_PATH = path.join(REPO_ROOT, '파트너클래스', 'n8n-workflows', 'WF-CONTENT-affiliation-content-import.json');

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildWorkflow() {
    return {
        name: 'WF-CONTENT Affiliation Content Import',
        nodes: [
            {
                id: 'wfcontent-schedule',
                name: 'Schedule Daily 05:10',
                type: 'n8n-nodes-base.scheduleTrigger',
                typeVersion: 1.2,
                position: [220, 220],
                parameters: {
                    rule: {
                        interval: [
                            {
                                field: 'cronExpression',
                                expression: '10 5 * * *'
                            }
                        ]
                    }
                }
            },
            {
                id: 'wfcontent-webhook',
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 2,
                position: [220, 420],
                webhookId: 'partnerclass-content-import',
                parameters: {
                    httpMethod: 'POST',
                    path: 'partnerclass-content-import',
                    responseMode: 'responseNode',
                    options: {}
                }
            },
            {
                id: 'wfcontent-schedule-handler',
                name: 'Import From Schedule',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [520, 220],
                parameters: {
                    jsCode: contentImportHandler.buildContentImportHandlerCode()
                }
            },
            {
                id: 'wfcontent-schedule-done',
                name: 'Schedule Result',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [820, 220],
                parameters: {
                    jsCode: "return [{ json: { success: true, source: 'schedule', data: $json.data || null, timestamp: new Date().toISOString() } }];"
                }
            },
            {
                id: 'wfcontent-webhook-handler',
                name: 'Import From Webhook',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [520, 420],
                parameters: {
                    jsCode: contentImportHandler.buildContentImportHandlerCode()
                }
            },
            {
                id: 'wfcontent-respond',
                name: 'Respond Result',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1.1,
                position: [820, 420],
                parameters: {
                    respondWith: 'json',
                    responseBody: '={{ $json }}',
                    options: {
                        responseHeaders: {
                            entries: [
                                {
                                    name: 'Content-Type',
                                    value: 'application/json; charset=utf-8'
                                },
                                {
                                    name: 'Access-Control-Allow-Origin',
                                    value: 'https://foreverlove.co.kr'
                                },
                                {
                                    name: 'Access-Control-Allow-Headers',
                                    value: 'Content-Type'
                                },
                                {
                                    name: 'Access-Control-Allow-Methods',
                                    value: 'POST, OPTIONS'
                                }
                            ]
                        }
                    }
                }
            }
        ],
        connections: {
            'Schedule Daily 05:10': {
                main: [[{ node: 'Import From Schedule', type: 'main', index: 0 }]]
            },
            Webhook: {
                main: [[{ node: 'Import From Webhook', type: 'main', index: 0 }]]
            },
            'Import From Schedule': {
                main: [[{ node: 'Schedule Result', type: 'main', index: 0 }]]
            },
            'Import From Webhook': {
                main: [[{ node: 'Respond Result', type: 'main', index: 0 }]]
            }
        },
        settings: {
            executionOrder: 'v1'
        }
    };
}

writeJson(OUTPUT_PATH, buildWorkflow());
console.log('Generated ' + OUTPUT_PATH);
