#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var parserSource = require('./lib/crm-deposit-parser-source');

var REPO_ROOT = path.resolve(__dirname, '..');
var WORKFLOW_PATH = path.join(REPO_ROOT, 'n8n-automation', 'workflows', 'accounting', 'WF-CRM-02_Gmail_입금알림_수집.json');

function loadWorkflow(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveWorkflow(filePath, workflow) {
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
}

function findNode(workflow, name) {
  return (workflow.nodes || []).find(function(node) {
    return node.name === name;
  }) || null;
}

function main() {
  var workflow = loadWorkflow(WORKFLOW_PATH);
  var parseNode = findNode(workflow, 'Code: Parse Deposit Email');
  var depositSummaryNode = findNode(workflow, 'Build Telegram Deposit Summary');
  var bankSummaryNode = findNode(workflow, 'Build Bank Event Summary');

  if (!parseNode || !depositSummaryNode || !bankSummaryNode) {
    throw new Error('WF-CRM-02 required nodes not found');
  }

  parseNode.parameters.jsCode = parserSource.buildCrmDepositParserCode();
  depositSummaryNode.parameters.jsCode = parserSource.buildCrmDepositTelegramSummaryCode();
  bankSummaryNode.parameters.jsCode = parserSource.buildCrmBankEventSummaryCode();

  saveWorkflow(WORKFLOW_PATH, workflow);
  console.log('Synced WF-CRM-02 parser and Telegram summary nodes.');
}

main();
