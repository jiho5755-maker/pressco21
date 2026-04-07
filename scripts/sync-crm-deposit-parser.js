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

function setSingleConnection(workflow, fromName, toName) {
  if (!workflow.connections) workflow.connections = {};
  workflow.connections[fromName] = {
    main: [[{ node: toName, type: 'main', index: 0 }]],
  };
}

function setMainConnections(workflow, fromName, targets) {
  if (!workflow.connections) workflow.connections = {};
  workflow.connections[fromName] = {
    main: [targets.map(function(target) {
      return {
        node: target.node,
        type: 'main',
        index: typeof target.index === 'number' ? target.index : 0,
      };
    })],
  };
}

function listMainTargets(workflow, fromName) {
  var connection = workflow.connections && workflow.connections[fromName];
  if (!connection || !Array.isArray(connection.main)) return [];
  return connection.main
    .flat()
    .map(function(target) {
      return target && target.node ? String(target.node) : '';
    })
    .filter(Boolean);
}

function assertMainTargets(workflow, fromName, expectedTargets) {
  var actual = listMainTargets(workflow, fromName).sort();
  var expected = expectedTargets.slice().sort();
  var mismatch = actual.length !== expected.length || actual.some(function(name, index) {
    return name !== expected[index];
  });
  if (mismatch) {
    throw new Error('Unexpected connections for ' + fromName + ': expected [' + expected.join(', ') + '] but received [' + actual.join(', ') + ']');
  }
}

function main() {
  var workflow = loadWorkflow(WORKFLOW_PATH);
  var parseNode = findNode(workflow, 'Code: Parse Deposit Email');
  var ledgerNode = findNode(workflow, 'Code: Record Intake Ledger');
  var depositSummaryNode = findNode(workflow, 'Build Telegram Deposit Summary');
  var bankSummaryNode = findNode(workflow, 'Build Bank Event Summary');
  var parseFailureNode = findNode(workflow, 'Build Parse Failure Summary');
  var reconNode = findNode(workflow, 'Code: Build Recon Sync From Intake');

  if (!parseNode || !ledgerNode || !depositSummaryNode || !bankSummaryNode || !parseFailureNode || !reconNode) {
    throw new Error('WF-CRM-02 required nodes not found');
  }

  parseNode.parameters.jsCode = parserSource.buildCrmDepositParserCode();
  depositSummaryNode.parameters.jsCode = parserSource.buildCrmDepositTelegramSummaryCode();
  bankSummaryNode.parameters.jsCode = parserSource.buildCrmBankEventSummaryCode();
  setSingleConnection(workflow, parseNode.name, ledgerNode.name);
  setMainConnections(workflow, ledgerNode.name, [
    { node: 'IF Has Deposits', index: 0 },
    { node: bankSummaryNode.name, index: 0 },
    { node: parseFailureNode.name, index: 0 },
    { node: reconNode.name, index: 0 },
  ]);
  assertMainTargets(workflow, parseNode.name, [ledgerNode.name]);
  assertMainTargets(workflow, ledgerNode.name, [
    'IF Has Deposits',
    bankSummaryNode.name,
    parseFailureNode.name,
    reconNode.name,
  ]);

  saveWorkflow(WORKFLOW_PATH, workflow);
  console.log('Synced WF-CRM-02 parser, summary nodes, and required ledger connections.');
}

main();
