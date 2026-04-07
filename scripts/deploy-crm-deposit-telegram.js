#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var crmDepositParserSource = require('./lib/crm-deposit-parser-source');

var REPO_ROOT = path.resolve(__dirname, '..');
var ENV_PATH = path.join(REPO_ROOT, '.secrets.env');
var OUTPUT_ROOT = path.join(REPO_ROOT, 'output', 'n8n-backups');
var N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.pressco21.com';
var WORKFLOW_SPECS = [
  {
    name: 'WF-CRM-01 입금자동반영 엔진',
    localPath: path.join(REPO_ROOT, 'n8n-automation', 'workflows', 'accounting', 'WF-CRM-01_입금자동반영_엔진.json'),
  },
  {
    name: 'WF-CRM-02 Gmail 입금알림 수집',
    localPath: path.join(REPO_ROOT, 'n8n-automation', 'workflows', 'accounting', 'WF-CRM-02_Gmail_입금알림_수집.json'),
  },
  {
    name: 'WF-CRM-03 입금알림 정합성 감사',
    localPath: path.join(REPO_ROOT, 'n8n-automation', 'workflows', 'accounting', 'WF-CRM-03_입금알림_정합성_감사.json'),
  },
];
var BANK_BOT_CREDENTIAL_NAME = 'PRESSCO_BANK_BOT';
var CRM_AUTOMATION_CREDENTIAL_NAME = 'PRESSCO21 CRM Automation Header';
var CRM_AUTOMATION_HEADER_NAME = process.env.CRM_AUTOMATION_HEADER_NAME || 'X-CRM-Automation-Key';
var CRM_AUTOMATION_SERVER = process.env.CRM_AUTOMATION_SERVER || 'ubuntu@158.180.77.201';
var CRM_AUTOMATION_SSH_KEY = process.env.CRM_AUTOMATION_SSH_KEY || path.join(process.env.HOME || '', '.ssh', 'oracle-n8n.key');
var CRM_AUTOMATION_REMOTE_KEY_FILE = process.env.CRM_AUTOMATION_REMOTE_KEY_FILE || '/etc/pressco21-crm/automation-key';

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
  if (!fs.existsSync(filePath)) return result;

  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach(function(line) {
    var trimmed = line.trim();
    var match;
    if (!trimmed || trimmed.charAt(0) === '#') return;
    match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  });

  return result;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function stripWorkflowPayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: 'v1' },
  };
}

async function apiRequest(apiKey, method, pathname, body) {
  var response = await fetch(N8N_BASE_URL + pathname, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
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

async function listCredentials(apiKey) {
  var data = await apiRequest(apiKey, 'GET', '/api/v1/credentials?limit=250');
  return Array.isArray(data.data) ? data.data : [];
}

async function createCredential(apiKey, payload) {
  return apiRequest(apiKey, 'POST', '/api/v1/credentials', payload);
}

async function updateCredential(apiKey, credentialId, payload) {
  return apiRequest(apiKey, 'PATCH', '/api/v1/credentials/' + credentialId, payload);
}

async function getWorkflow(apiKey, workflowId) {
  return apiRequest(apiKey, 'GET', '/api/v1/workflows/' + workflowId);
}

async function saveBackup(apiKey, workflowId, workflowName, backupDir) {
  var workflow = await getWorkflow(apiKey, workflowId);
  var safeName = workflowName.replace(/[^a-zA-Z0-9-_]+/g, '-');
  var filePath = path.join(backupDir, workflowId + '-' + safeName + '.json');
  writeJson(filePath, workflow);
  return workflow;
}

function findNode(workflow, name) {
  return (workflow.nodes || []).find(function(node) {
    return node.name === name;
  }) || null;
}

function upsertNode(workflow, node) {
  var existing = findNode(workflow, node.name);
  if (existing) {
    existing.parameters = node.parameters;
    existing.type = node.type;
    existing.typeVersion = node.typeVersion;
    existing.position = node.position;
    existing.credentials = node.credentials;
    if (node.onError) existing.onError = node.onError;
    return existing;
  }
  workflow.nodes.push(node);
  return node;
}

function removeNode(workflow, name) {
  var connectionKeys;
  workflow.nodes = (workflow.nodes || []).filter(function(node) {
    return node.name !== name;
  });
  if (!workflow.connections) return;
  delete workflow.connections[name];
  connectionKeys = Object.keys(workflow.connections);
  connectionKeys.forEach(function(key) {
    var connection = workflow.connections[key];
    if (!connection || !Array.isArray(connection.main)) return;
    connection.main = connection.main.map(function(output) {
      return (output || []).filter(function(target) {
        return target && target.node !== name;
      });
    });
  });
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

function setMainConnectionsByOutput(workflow, fromName, outputs) {
  if (!workflow.connections) workflow.connections = {};
  workflow.connections[fromName] = {
    main: outputs.map(function(targets) {
      return (targets || []).map(function(target) {
        return {
          node: target.node,
          type: 'main',
          index: typeof target.index === 'number' ? target.index : 0,
        };
      });
    }),
  };
}

function resolveSetting(env, name, fallback) {
  var value = env[name] || process.env[name] || '';
  return value || fallback || '';
}

function fetchRemoteFile(server, sshKey, remotePath) {
  var args = [];
  if (sshKey) args.push('-i', sshKey);
  args.push(server, 'sudo', 'cat', remotePath);
  return String(childProcess.execFileSync('ssh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }) || '').trim();
}

function resolveCrmAutomationKey(env) {
  var explicitKey = resolveSetting(env, 'CRM_AUTOMATION_KEY', '');
  var server;
  var sshKey;
  var remoteFile;

  if (explicitKey) {
    return explicitKey.trim();
  }

  server = resolveSetting(env, 'CRM_AUTOMATION_SERVER', CRM_AUTOMATION_SERVER);
  sshKey = resolveSetting(env, 'CRM_AUTOMATION_SSH_KEY', CRM_AUTOMATION_SSH_KEY);
  remoteFile = resolveSetting(env, 'CRM_AUTOMATION_REMOTE_KEY_FILE', CRM_AUTOMATION_REMOTE_KEY_FILE);

  try {
    explicitKey = fetchRemoteFile(server, sshKey, remoteFile);
  } catch (error) {
    throw new Error('CRM automation key read failed: ' + (error && error.message ? error.message : String(error)));
  }

  if (!explicitKey) {
    throw new Error('CRM automation key is empty: ' + remoteFile);
  }

  return explicitKey.trim();
}

function applyHeaderCredential(node, credential) {
  node.parameters = node.parameters || {};
  node.parameters.authentication = 'genericCredentialType';
  node.parameters.genericAuthType = 'httpHeaderAuth';
  node.credentials = {
    httpHeaderAuth: {
      id: credential.id,
      name: credential.name,
    },
  };
}

function patchCrmSnapshotAuth(workflow, credential) {
  ['HTTP Get Legacy Snapshots', 'HTTP Get Fiscal Snapshots'].forEach(function(nodeName) {
    var node = findNode(workflow, nodeName);
    if (!node) {
      throw new Error(nodeName + ' node not found');
    }
    applyHeaderCredential(node, credential);
  });

  return workflow;
}

function patchCrmDepositEngine(workflow) {
  var responseNode = findNode(workflow, 'Code: Response Payload');
  if (!responseNode) {
    throw new Error('Code: Response Payload node not found');
  }

  responseNode.parameters.jsCode = [
    "const plan = $('Code: Persist Review Queue').first().json;",
    'const exactActions = Array.isArray(plan.exactActions) ? plan.exactActions.map((action) => ({',
    "  kind: String(action.kind || ''),",
    "  customerId: Number(action.customerId || 0) || null,",
    "  customerName: String(action.customerName || '').trim(),",
    "  invoiceId: Number(action.invoiceId || 0) || null,",
    "  invoiceNo: String(action.invoiceNo || '').trim(),",
    "  amount: Number(action.deposit?.amount || 0) || 0,",
    "  sender: String(action.deposit?.sender || '').trim(),",
    "  occurredAt: String(action.deposit?.occurredAt || '').trim(),",
    "  occurredDate: String(action.deposit?.occurredDate || '').trim(),",
    "  note: String(action.deposit?.note || '').trim(),",
    "  remainingOutstanding: Number(action.customerPatch?.outstanding_balance || 0) || 0,",
    "  paymentStatus: String(action.invoicePatch?.payment_status || '').trim(),",
    "  reason: String(action.reason || '').trim(),",
    '})) : [];',
    'const duplicateEntries = Array.isArray(plan.duplicateEntries) ? plan.duplicateEntries.map((entry) => ({',
    "  sender: String(entry.sender || '').trim(),",
    "  amount: Number(entry.amount || 0) || 0,",
    "  occurredAt: String(entry.occurredAt || '').trim(),",
    "  externalId: String(entry.externalId || '').trim(),",
    "  reason: String(entry.reason || '').trim(),",
    '})) : [];',
    'return [{ json: {',
    '  ok: true,',
    "  source: plan.source,",
    "  summary: plan.summary,",
    "  queueSummary: plan.queueSummary ?? null,",
    '  exactActions,',
    '  duplicateEntries,',
    "  reviewEntries: plan.reviewEntries,",
    "  unmatchedEntries: plan.unmatchedEntries,",
    "  notificationVersion: 'deposit-telegram-v2',",
    '}}];',
  ].join('\n');

  return workflow;
}

function patchCrmDepositPlanMatching(workflow) {
  var planNode = findNode(workflow, 'Code: Build Deposit Plan');
  var currentCode;
  var oldBlock;
  var newBlock;

  if (!planNode || !planNode.parameters || !planNode.parameters.jsCode) {
    throw new Error('Code: Build Deposit Plan node not found');
  }

  currentCode = planNode.parameters.jsCode;
  oldBlock = [
    "  const best = candidates[0];",
    "  const hasUniqueBest = best && (!candidates[1] || best.score > candidates[1].score);",
    "",
    "  if (best && best.confidence === 'exact' && hasUniqueBest) {",
  ].join('\n');
  newBlock = [
    "  const best = candidates[0];",
    "  const exactCandidates = candidates.filter((candidate) => candidate.confidence === 'exact');",
    "  const selectedExact = exactCandidates.length === 1 ? exactCandidates[0] : null;",
    "",
    "  if (selectedExact) {",
    "    const best = selectedExact;",
  ].join('\n');

  if (currentCode.indexOf(oldBlock) === -1) {
    if (currentCode.indexOf(newBlock) !== -1) {
      return workflow;
    }
    throw new Error('Exact-match selection block not found in Code: Build Deposit Plan');
  }

  planNode.parameters.jsCode = currentCode.replace(oldBlock, newBlock);
  return workflow;
}

function patchCrmDepositIdempotency(workflow) {
  var planNode = findNode(workflow, 'Code: Build Deposit Plan');
  var persistNode = findNode(workflow, 'Code: Persist Review Queue');
  var planCode;
  var persistCode;
  var oldPlanBlock;
  var newPlanBlock;
  var oldSummaryBlock;
  var newSummaryBlock;
  var oldPersistBlock;
  var newPersistBlock;

  if (!planNode || !planNode.parameters || !planNode.parameters.jsCode) {
    throw new Error('Code: Build Deposit Plan node not found');
  }
  if (!persistNode || !persistNode.parameters || !persistNode.parameters.jsCode) {
    throw new Error('Code: Persist Review Queue node not found');
  }

  planCode = planNode.parameters.jsCode;
  oldPlanBlock = [
    'const exactActions = [];',
    'const reviewEntries = [];',
    'const unmatchedEntries = [];',
    'const appliedCustomerIds = new Set();',
    '',
    'for (const deposit of normalizedDeposits) {',
  ].join('\n');
  newPlanBlock = [
    "const staticData = $getWorkflowStaticData('global');",
    "const processedExactDepositIds = staticData.processedExactDepositIds && typeof staticData.processedExactDepositIds === 'object'",
    "  ? staticData.processedExactDepositIds",
    "  : {};",
    'const duplicateEntries = [];',
    'const batchSeenDepositIds = new Set();',
    'const pendingDeposits = [];',
    '',
    'for (const deposit of normalizedDeposits) {',
    "  const externalKey = String(deposit.externalId || ('deposit::' + deposit.senderKey + '::' + deposit.amount + '::' + deposit.occurredAt)).trim();",
    '  if (!externalKey) {',
    '    pendingDeposits.push(deposit);',
    '    continue;',
    '  }',
    '  if (batchSeenDepositIds.has(externalKey)) {',
    '    duplicateEntries.push({',
    '      sender: deposit.sender,',
    '      amount: deposit.amount,',
    '      occurredAt: deposit.occurredAt,',
    '      externalId: externalKey,',
    "      reason: '같은 요청 안에서 중복 수집된 입금 이벤트입니다.',",
    '    });',
    '    continue;',
    '  }',
    '  batchSeenDepositIds.add(externalKey);',
    '  if (processedExactDepositIds[externalKey]) {',
    '    duplicateEntries.push({',
    '      sender: deposit.sender,',
    '      amount: deposit.amount,',
    '      occurredAt: deposit.occurredAt,',
    '      externalId: externalKey,',
    "      reason: '이미 자동반영이 완료된 입금 이벤트입니다.',",
    '    });',
    '    continue;',
    '  }',
    '  pendingDeposits.push({',
    '    ...deposit,',
    '    externalId: externalKey,',
    '  });',
    '}',
    '',
    'const exactActions = [];',
    'const reviewEntries = [];',
    'const unmatchedEntries = [];',
    'const appliedCustomerIds = new Set();',
    '',
    'for (const deposit of pendingDeposits) {',
  ].join('\n');

  if (planCode.indexOf(oldPlanBlock) === -1) {
    if (planCode.indexOf('const processedExactDepositIds = staticData.processedExactDepositIds') === -1) {
      throw new Error('Idempotency insertion point not found in Code: Build Deposit Plan');
    }
  } else {
    planCode = planCode.replace(oldPlanBlock, newPlanBlock);
  }

  oldSummaryBlock = [
    '    summary: {',
    '      total: normalizedDeposits.length,',
    '      exact: exactActions.length,',
    '      review: reviewEntries.length,',
    '      unmatched: unmatchedEntries.length,',
    '    },',
  ].join('\n');
  newSummaryBlock = [
    '    duplicateEntries,',
    '    summary: {',
    '      received: normalizedDeposits.length,',
    '      total: pendingDeposits.length,',
    '      duplicate: duplicateEntries.length,',
    '      exact: exactActions.length,',
    '      review: reviewEntries.length,',
    '      unmatched: unmatchedEntries.length,',
    '    },',
  ].join('\n');

  if (planCode.indexOf(oldSummaryBlock) === -1) {
    if (planCode.indexOf('duplicateEntries,') === -1) {
      throw new Error('Summary replacement block not found in Code: Build Deposit Plan');
    }
  } else {
    planCode = planCode.replace(oldSummaryBlock, newSummaryBlock);
  }

  planNode.parameters.jsCode = planCode;

  persistCode = persistNode.parameters.jsCode;
  oldPersistBlock = [
    'let upserted = 0;',
    "for (const entry of plan.reviewEntries || []) upserted += upsertQueueEntry('review', entry);",
    "for (const entry of plan.unmatchedEntries || []) upserted += upsertQueueEntry('unmatched', entry);",
    '',
    'staticData.reviewQueue = queue.slice(0, 500);',
    '',
    'return [{',
  ].join('\n');
  newPersistBlock = [
    'let upserted = 0;',
    "for (const entry of plan.reviewEntries || []) upserted += upsertQueueEntry('review', entry);",
    "for (const entry of plan.unmatchedEntries || []) upserted += upsertQueueEntry('unmatched', entry);",
    '',
    "const processedExactDepositIds = staticData.processedExactDepositIds && typeof staticData.processedExactDepositIds === 'object'",
    "  ? staticData.processedExactDepositIds",
    "  : {};",
    'for (const action of plan.exactActions || []) {',
    "  const externalId = String(action?.deposit?.externalId ?? '').trim();",
    '  if (!externalId) continue;',
    '  processedExactDepositIds[externalId] = now;',
    '}',
    'const processedExactKeys = Object.keys(processedExactDepositIds);',
    'if (processedExactKeys.length > 1000) {',
    "  processedExactKeys.sort((left, right) => String(processedExactDepositIds[left] || '').localeCompare(String(processedExactDepositIds[right] || '')))",
    '    .slice(0, processedExactKeys.length - 1000)',
    '    .forEach((key) => delete processedExactDepositIds[key]);',
    '}',
    'staticData.processedExactDepositIds = processedExactDepositIds;',
    'staticData.reviewQueue = queue.slice(0, 500);',
    '',
    'return [{',
  ].join('\n');

  if (persistCode.indexOf(oldPersistBlock) === -1) {
    if (persistCode.indexOf('staticData.processedExactDepositIds = processedExactDepositIds;') === -1) {
      throw new Error('Persist idempotency block not found in Code: Persist Review Queue');
    }
  } else {
    persistCode = persistCode.replace(oldPersistBlock, newPersistBlock);
  }

  persistNode.parameters.jsCode = persistCode;
  return workflow;
}

function patchCrmDepositReviewQueueApi(workflow) {
  var reviewApiNode = findNode(workflow, 'Code: Handle Review Queue Request');
  var currentCode;
  var oldDismissBlock;
  var newDismissBlock;

  if (!reviewApiNode || !reviewApiNode.parameters || !reviewApiNode.parameters.jsCode) {
    throw new Error('Code: Handle Review Queue Request node not found');
  }

  currentCode = reviewApiNode.parameters.jsCode;
  oldDismissBlock = [
    "if (action === 'dismiss') {",
    '  const index = queue.findIndex((item) => item.queueId === queueId);',
    '  if (index < 0) {',
    "    return [{ json: { ok: false, error: 'QUEUE_NOT_FOUND' } }];",
    '  }',
    '  queue[index] = {',
    '    ...queue[index],',
    "    status: 'dismissed',",
    '    resolvedAt: now,',
    "    resolvedBy: String(body.resolvedBy ?? 'manual').trim() || 'manual',",
    "    resolvedNote: String(body.note ?? '').trim() || null,",
    '    updatedAt: now,',
    '  };',
    '  staticData.reviewQueue = queue;',
    '  return [{ json: { ok: true, item: queue[index], summary: summarize(queue) } }];',
    '}',
  ].join('\n');
  newDismissBlock = [
    "if (action === 'dismiss') {",
    '  const index = queue.findIndex((item) => item.queueId === queueId);',
    '  if (index < 0) {',
    "    return [{ json: { ok: false, error: 'QUEUE_NOT_FOUND' } }];",
    '  }',
    '  queue[index] = {',
    '    ...queue[index],',
    "    status: 'dismissed',",
    '    resolvedAt: now,',
    "    resolvedBy: String(body.resolvedBy ?? 'manual').trim() || 'manual',",
    "    resolvedNote: String(body.note ?? '').trim() || null,",
    '    updatedAt: now,',
    '  };',
    '  if (body.markProcessedExact === true || body.markProcessedExact === \'true\') {',
    "    const processedExactDepositIds = staticData.processedExactDepositIds && typeof staticData.processedExactDepositIds === 'object'",
    "      ? staticData.processedExactDepositIds",
    "      : {};",
    "    const externalId = String(queue[index].externalId ?? '').trim();",
    '    if (externalId) {',
    '      processedExactDepositIds[externalId] = now;',
    '      staticData.processedExactDepositIds = processedExactDepositIds;',
    '    }',
    '  }',
    '  staticData.reviewQueue = queue;',
    '  return [{ json: { ok: true, item: queue[index], summary: summarize(queue) } }];',
    '}',
  ].join('\n');

  if (currentCode.indexOf(oldDismissBlock) === -1) {
    if (currentCode.indexOf('body.markProcessedExact === true') === -1) {
      throw new Error('Dismiss patch block not found in Code: Handle Review Queue Request');
    }
  } else {
    reviewApiNode.parameters.jsCode = currentCode.replace(oldDismissBlock, newDismissBlock);
  }

  return workflow;
}

function patchCollectorParser(workflow) {
  var parseNode = findNode(workflow, 'Code: Parse Deposit Email');

  if (!parseNode || !parseNode.parameters || !parseNode.parameters.jsCode) {
    throw new Error('Code: Parse Deposit Email node not found');
  }
  parseNode.parameters.jsCode = crmDepositParserSource.buildCrmDepositParserCode();
  return workflow;
}

function buildBankEventSummaryCode() {
  return crmDepositParserSource.buildCrmBankEventSummaryCode();
}

function buildTelegramSummaryCode() {
  return crmDepositParserSource.buildCrmDepositTelegramSummaryCode();
}

function buildBankChatIdExpression() {
  return "={{ $env.PRESSCO_BANK_CHAT_ID || $env.TELEGRAM_GROUP_ID || $env.TELEGRAM_CHAT_ID || '-5275298126' }}";
}

function buildAuditChatIdExpression() {
  return "={{ $env.PRESSCO_AUDIT_CHAT_ID || $env.TELEGRAM_CHAT_ID || $env.PRESSCO_BANK_CHAT_ID || $env.TELEGRAM_GROUP_ID || '-5275298126' }}";
}

function buildCrmDepositAuditReportCode() {
  return [
    "const staticData = $getWorkflowStaticData('global');",
    "const mailLedger = Array.isArray(staticData.presscoBankMailLedgerMirror) ? staticData.presscoBankMailLedgerMirror : [];",
    "const txnLedger = Array.isArray(staticData.presscoBankTransactionLedgerMirror) ? staticData.presscoBankTransactionLedgerMirror : [];",
    "const failureLog = Array.isArray(staticData.presscoCrmFailureLogMirror) ? staticData.presscoCrmFailureLogMirror : [];",
    "const issueState = staticData.presscoBankReconIssueState && typeof staticData.presscoBankReconIssueState === 'object'",
    "  ? staticData.presscoBankReconIssueState",
    "  : {};",
    "if (!staticData.reconBaselineStartedAt) {",
    "  staticData.reconBaselineStartedAt = new Date().toISOString();",
    "}",
    "const now = Date.now();",
    "const nowIso = new Date(now).toISOString();",
    "const pendingThresholdMs = 20 * 60 * 1000;",
    "const recentWindowMs = 72 * 60 * 60 * 1000;",
    "const resolvedRetentionMs = 14 * 24 * 60 * 60 * 1000;",
    "const issues = [];",
    "",
    "function toMillis(value) {",
    "  const date = new Date(value || 0);",
    "  const time = date.getTime();",
    "  return Number.isFinite(time) ? time : 0;",
    "}",
    "",
    "function formatDateTime(value) {",
    "  if (!value) return '-';",
    "  const date = new Date(value);",
    "  if (!Number.isFinite(date.getTime())) return String(value);",
    "  return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });",
    "}",
    "",
    "function toKstDate(value) {",
    "  const date = new Date(value || 0);",
    "  if (!Number.isFinite(date.getTime())) return 'unknown';",
    "  return new Intl.DateTimeFormat('sv-SE', {",
    "    timeZone: 'Asia/Seoul',",
    "    year: 'numeric',",
    "    month: '2-digit',",
    "    day: '2-digit',",
    "  }).format(date);",
    "}",
    "",
    "function pushIssue(key, severity, title, detail) {",
    "  issues.push({ key, severity, title, detail });",
    "}",
    "",
    "const baselineAgeMs = now - toMillis(staticData.reconBaselineStartedAt);",
    "if (baselineAgeMs > recentWindowMs && mailLedger.length === 0) {",
    "  pushIssue('mail-ledger-empty', 'critical', '메일 mirror ledger 비어 있음', 'WF-CRM-03 mirror staticData에 presscoBankMailLedgerMirror가 없습니다.');",
    "}",
    "if (baselineAgeMs > recentWindowMs && txnLedger.length === 0) {",
    "  pushIssue('txn-ledger-empty', 'critical', '거래 mirror ledger 비어 있음', 'WF-CRM-03 mirror staticData에 presscoBankTransactionLedgerMirror가 없습니다.');",
    "}",
    "",
    "const recentMail = mailLedger.filter((entry) => now - toMillis(entry.processedAt || entry.receivedAt || entry.mirroredAt) <= recentWindowMs);",
    "const recentTx = txnLedger.filter((entry) => now - toMillis(entry.parsedAt || entry.lastUpdatedAt || entry.createdAt || entry.mirroredAt) <= recentWindowMs);",
    "",
    "for (const entry of recentMail) {",
    "  const ageMs = now - toMillis(entry.processedAt || entry.receivedAt || entry.mirroredAt);",
    "  if (entry.parseFailure === true) {",
    "    if (entry.parseAlertStatus === 'failed') {",
    "      pushIssue('parse-alert-failed::' + entry.messageKey, 'critical', '파싱 실패 경보 Telegram 발송 실패', `${entry.subject || '-'} / ${formatDateTime(entry.processedAt || entry.receivedAt)} / ${entry.parseAlertFailureReason || 'unknown_telegram_error'}`);",
    "    } else if (entry.parseAlertStatus !== 'sent' && ageMs > pendingThresholdMs) {",
    "      pushIssue('parse-alert-pending::' + entry.messageKey, 'critical', '파싱 실패 경보 미발송', `${entry.subject || '-'} / ${formatDateTime(entry.processedAt || entry.receivedAt)} / 사유 ${entry.parseFailureReason || '-'}`);",
    "    }",
    "  }",
    "}",
    "",
    "for (const entry of recentTx) {",
    "  const ageMs = now - toMillis(entry.parsedAt || entry.lastUpdatedAt || entry.createdAt || entry.mirroredAt);",
    "  if (entry.alertStatus === 'failed') {",
    "    pushIssue('tx-alert-failed::' + entry.eventKey, 'critical', '거래 알림 Telegram 발송 실패', `${entry.direction || 'unknown'} / ${entry.party || entry.sender || '-'} / ${(Number(entry.amount) || 0).toLocaleString()}원 / ${formatDateTime(entry.occurredAt || entry.parsedAt)} / ${entry.alertFailureReason || 'unknown_telegram_error'}`);",
    "    continue;",
    "  }",
    "  if (entry.alertStatus !== 'sent' && ageMs > pendingThresholdMs) {",
    "    const label = entry.alertKind === 'crm_deposit' ? '입금 CRM 알림' : '은행 거래 알림';",
    "    pushIssue('tx-alert-pending::' + entry.eventKey, 'critical', label + ' 미확정', `${entry.direction || 'unknown'} / ${entry.party || entry.sender || '-'} / ${(Number(entry.amount) || 0).toLocaleString()}원 / ${formatDateTime(entry.occurredAt || entry.parsedAt)} / 상태 ${entry.alertStatus || 'pending'}`);",
    "  }",
    "}",
    "",
    "const dayMap = new Map();",
    "function getDay(dateKey) {",
    "  if (!dayMap.has(dateKey)) {",
    "    dayMap.set(dateKey, { nhMail: 0, parseFailures: 0, parseFailuresUnsent: 0, deposits: 0, withdrawals: 0, sent: 0, failed: 0, pending: 0 });",
    "  }",
    "  return dayMap.get(dateKey);",
    "}",
    "for (const entry of recentMail) {",
    "  const day = toKstDate(entry.processedAt || entry.receivedAt || entry.mirroredAt);",
    "  const bucket = getDay(day);",
    "  if (entry.isNhMail) bucket.nhMail += 1;",
    "  if (entry.parseFailure) bucket.parseFailures += 1;",
    "  if (entry.parseFailure && entry.parseAlertStatus !== 'sent') bucket.parseFailuresUnsent += 1;",
    "}",
    "for (const entry of recentTx) {",
    "  const day = toKstDate(entry.occurredAt || entry.parsedAt || entry.createdAt || entry.mirroredAt);",
    "  const bucket = getDay(day);",
    "  if (entry.direction === 'deposit') bucket.deposits += 1;",
    "  else bucket.withdrawals += 1;",
    "  if (entry.alertStatus === 'sent') bucket.sent += 1;",
    "  else if (entry.alertStatus === 'failed') bucket.failed += 1;",
    "  else bucket.pending += 1;",
    "}",
    "for (const [day, bucket] of Array.from(dayMap.entries()).sort()) {",
    "  if (bucket.parseFailuresUnsent > 0 || bucket.failed > 0 || bucket.pending > 0) {",
    "    pushIssue('daily-mismatch::' + day, 'high', `일일 정합성 주의 ${day}`, `NH메일 ${bucket.nhMail} / 파싱실패 ${bucket.parseFailures} / 미전송 파싱실패 ${bucket.parseFailuresUnsent} / 입금 ${bucket.deposits} / 출금 ${bucket.withdrawals} / sent ${bucket.sent} / failed ${bucket.failed} / pending ${bucket.pending}`);",
    "  }",
    "}",
    "",
    "const recentFailureLog = failureLog.filter((entry) => now - toMillis(entry.loggedAt || entry.mirroredAt) <= recentWindowMs);",
    "const telegramFailureCount = recentFailureLog.filter((entry) => entry.kind === 'telegram_failure').length;",
    "if (telegramFailureCount > 0) {",
    "  pushIssue('telegram-failure-count::' + telegramFailureCount, 'high', '최근 Telegram 실패 로그 존재', `최근 72시간 Telegram 실패 ${telegramFailureCount}건 / 최근 failure mirror ${recentFailureLog.length}건`);",
    "}",
    "",
    "const activeIssueKeys = new Set(issues.map((issue) => issue.key));",
    "for (const [key, state] of Object.entries(issueState)) {",
    "  if (!activeIssueKeys.has(key) && state && state.status === 'open') {",
    "    issueState[key] = {",
    "      ...state,",
    "      status: 'resolved',",
    "      resolvedAt: nowIso,",
    "      lastSeenAt: state.lastSeenAt || nowIso,",
    "    };",
    "  }",
    "}",
    "",
    "const deliverableIssues = [];",
    "for (const issue of issues) {",
    "  const prev = issueState[issue.key] && typeof issueState[issue.key] === 'object' ? issueState[issue.key] : null;",
    "  const shouldNotify = !prev || prev.status !== 'open';",
    "  issueState[issue.key] = {",
    "    key: issue.key,",
    "    severity: issue.severity,",
    "    title: issue.title,",
    "    detail: issue.detail,",
    "    status: 'open',",
    "    firstDetectedAt: prev && prev.firstDetectedAt ? prev.firstDetectedAt : nowIso,",
    "    lastSeenAt: nowIso,",
    "    notifiedAt: shouldNotify ? nowIso : (prev && prev.notifiedAt ? prev.notifiedAt : nowIso),",
    "    resolvedAt: null,",
    "    reopenCount: prev && prev.status === 'resolved' ? (Number(prev.reopenCount || 0) + 1) : Number(prev && prev.reopenCount || 0),",
    "  };",
    "  if (shouldNotify) deliverableIssues.push(issue);",
    "}",
    "",
    "const issueStateEntries = Object.entries(issueState);",
    "for (const [key, state] of issueStateEntries) {",
    "  const referenceTime = toMillis(state && (state.lastSeenAt || state.resolvedAt || state.notifiedAt));",
    "  if (state && state.status === 'resolved' && referenceTime > 0 && now - referenceTime > resolvedRetentionMs) {",
    "    delete issueState[key];",
    "  }",
    "}",
    "const stateKeys = Object.keys(issueState);",
    "if (stateKeys.length > 500) {",
    "  stateKeys",
    "    .sort((left, right) => {",
    "      const leftState = issueState[left] || {};",
    "      const rightState = issueState[right] || {};",
    "      return toMillis(leftState.lastSeenAt || leftState.resolvedAt || leftState.notifiedAt) - toMillis(rightState.lastSeenAt || rightState.resolvedAt || rightState.notifiedAt);",
    "    })",
    "    .slice(0, stateKeys.length - 500)",
    "    .forEach((key) => {",
    "      if (issueState[key] && issueState[key].status !== 'open') delete issueState[key];",
    "    });",
    "}",
    "staticData.presscoBankReconIssueState = issueState;",
    "",
    "if (deliverableIssues.length === 0) {",
    "  return [];",
    "}",
    "",
    "const severityIcon = (value) => value === 'critical' ? '❌' : '⚠️';",
    "const lines = [",
    "  '[입금 정합성 감사 경보]',",
    "  '',",
    "  `감지 시각: ${new Date(now).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })}`,",
    "  `최근 NH 메일: ${recentMail.length}건 / 최근 거래 ledger: ${recentTx.length}건 / 최근 failure mirror: ${recentFailureLog.length}건`,",
    "  '',",
    "];",
    "deliverableIssues.slice(0, 12).forEach((issue) => {",
    "  lines.push(`${severityIcon(issue.severity)} ${issue.title}`);",
    "  lines.push(issue.detail);",
    "  lines.push('');",
    "});",
    "if (deliverableIssues.length > 12) {",
    "  lines.push(`... 외 ${deliverableIssues.length - 12}건`);",
    "}",
    "return [{ json: { message: lines.join('\\n') } }];",
  ].join('\n');
}

function patchCrmDepositCollector(workflow, telegramCredential) {
  var emailTriggerNode = findNode(workflow, 'Email Trigger (IMAP)');
  var bankSummaryNode = upsertNode(workflow, {
    parameters: {
      jsCode: buildBankEventSummaryCode(),
    },
    id: 'wf-crm02-build-bank-event-summary',
    name: 'Build Bank Event Summary',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [760, 80],
  });

  upsertNode(workflow, {
    parameters: {
      chatId: buildBankChatIdExpression(),
      text: "={{ $json._telegramMessage }}",
      additionalFields: {},
    },
    id: 'wf-crm02-telegram-bank-event-summary',
    name: 'Telegram Bank Event Summary',
    type: 'n8n-nodes-base.telegram',
    typeVersion: 1.2,
    position: [980, 80],
    credentials: {
      telegramApi: {
        id: telegramCredential.id,
        name: telegramCredential.name,
      },
    },
    onError: 'continueRegularOutput',
  });

  var buildNode = upsertNode(workflow, {
    parameters: {
      jsCode: buildTelegramSummaryCode(),
    },
    id: 'wf-crm02-build-telegram-summary',
    name: 'Build Telegram Deposit Summary',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1080, 240],
  });

  upsertNode(workflow, {
    parameters: {
      chatId: buildBankChatIdExpression(),
      text: "={{ $json._telegramMessage }}",
      additionalFields: {},
    },
    id: 'wf-crm02-telegram-deposit-summary',
    name: 'Telegram Deposit Summary',
    type: 'n8n-nodes-base.telegram',
    typeVersion: 1.2,
    position: [1300, 240],
    credentials: {
      telegramApi: {
        id: telegramCredential.id,
        name: telegramCredential.name,
      },
    },
    onError: 'continueRegularOutput',
  });

  if (emailTriggerNode) {
    emailTriggerNode.parameters = emailTriggerNode.parameters || {};
    emailTriggerNode.parameters.format = 'resolved';
    emailTriggerNode.parameters.downloadAttachments = true;
    emailTriggerNode.parameters.dataPropertyAttachmentsPrefixName = 'attachment_';
  }

  removeNode(workflow, 'Build Telegram Auto Apply Summary');
  removeNode(workflow, 'Telegram Auto Apply Summary');

  setMainConnections(workflow, 'Code: Parse Deposit Email', [
    { node: 'IF Has Deposits', index: 0 },
    { node: bankSummaryNode.name, index: 0 },
  ]);
  setSingleConnection(workflow, 'IF Has Deposits', 'HTTP Call Intake Engine');
  setSingleConnection(workflow, bankSummaryNode.name, 'Telegram Bank Event Summary');
  setSingleConnection(workflow, 'HTTP Call Intake Engine', buildNode.name);
  setSingleConnection(workflow, buildNode.name, 'Telegram Deposit Summary');
  return workflow;
}

function patchCrmDepositAudit(workflow, telegramCredential) {
  var reportNode = findNode(workflow, 'Code: Build Reconciliation Report');
  var telegramNode = findNode(workflow, 'Telegram Reconciliation Alert');

  if (!reportNode || !reportNode.parameters || !reportNode.parameters.jsCode) {
    throw new Error('Code: Build Reconciliation Report node not found');
  }
  if (!telegramNode) {
    throw new Error('Telegram Reconciliation Alert node not found');
  }

  reportNode.parameters.jsCode = buildCrmDepositAuditReportCode();
  telegramNode.parameters = telegramNode.parameters || {};
  telegramNode.parameters.chatId = buildAuditChatIdExpression();
  telegramNode.credentials = {
    telegramApi: {
      id: telegramCredential.id,
      name: telegramCredential.name,
    },
  };

  return workflow;
}

async function ensureCrmAutomationCredential(apiKey, env) {
  var explicitId = resolveSetting(env, 'N8N_CRED_PRESSCO_CRM_AUTOMATION', '');
  var headerName = resolveSetting(env, 'CRM_AUTOMATION_HEADER_NAME', CRM_AUTOMATION_HEADER_NAME);
  var credentialName = resolveSetting(env, 'N8N_CRED_PRESSCO_CRM_AUTOMATION_NAME', CRM_AUTOMATION_CREDENTIAL_NAME);
  var automationKey = resolveCrmAutomationKey(env);
  var credentials = await listCredentials(apiKey);
  var existing;

  if (explicitId) {
    existing = credentials.find(function(item) {
      return item.id === explicitId;
    });
    if (!existing) {
      throw new Error('CRM automation credential not found for N8N_CRED_PRESSCO_CRM_AUTOMATION=' + explicitId);
    }
  } else {
    existing = credentials.find(function(item) {
      return item.type === 'httpHeaderAuth' && item.name === credentialName;
    });
  }

  if (existing) {
    if (existing.type !== 'httpHeaderAuth') {
      throw new Error('Credential is not httpHeaderAuth: ' + existing.id + ' (' + existing.name + ')');
    }
    await updateCredential(apiKey, existing.id, {
      name: existing.name,
      type: 'httpHeaderAuth',
      data: {
        name: headerName,
        value: automationKey,
      },
      isPartialData: false,
    });
    return { id: existing.id, name: existing.name };
  }

  existing = await createCredential(apiKey, {
    name: credentialName,
    type: 'httpHeaderAuth',
    data: {
      name: headerName,
      value: automationKey,
    },
  });

  return { id: existing.id, name: existing.name };
}

async function ensureBankTelegramCredential(apiKey, env) {
  var explicitId = env.N8N_CRED_PRESSCO_BANK_TELEGRAM || process.env.N8N_CRED_PRESSCO_BANK_TELEGRAM || '';
  var accessToken = env.PRESSCO_BANK_BOT_TOKEN || process.env.PRESSCO_BANK_BOT_TOKEN || '';
  var credentials;
  var existing;

  credentials = await listCredentials(apiKey);

  if (explicitId) {
    existing = credentials.find(function(item) {
      return item.id === explicitId;
    });
    if (!existing) {
      throw new Error('Telegram credential not found for N8N_CRED_PRESSCO_BANK_TELEGRAM=' + explicitId);
    }
    return { id: existing.id, name: existing.name };
  }

  existing = credentials.find(function(item) {
    return item.type === 'telegramApi' && item.name === BANK_BOT_CREDENTIAL_NAME;
  });
  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  if (!accessToken) {
    throw new Error('PRESSCO_BANK_BOT_TOKEN or N8N_CRED_PRESSCO_BANK_TELEGRAM is required');
  }

  existing = await createCredential(apiKey, {
    name: BANK_BOT_CREDENTIAL_NAME,
    type: 'telegramApi',
    data: {
      accessToken: accessToken,
    },
  });

  return { id: existing.id, name: existing.name };
}

async function main() {
  var env = loadEnv(ENV_PATH);
  var apiKey = env.N8N_API_KEY || process.env.N8N_API_KEY || '';
  var crmAutomationCredential;
  var telegramCredential;
  var workflows;
  var workflowIndex = {};
  var backupDir;
  var targets = [];

  if (!apiKey) {
    throw new Error('N8N_API_KEY not found in environment or .secrets.env');
  }

  crmAutomationCredential = await ensureCrmAutomationCredential(apiKey, env);
  telegramCredential = await ensureBankTelegramCredential(apiKey, env);

  workflows = await listWorkflows(apiKey);
  workflows.forEach(function(item) {
    if (!workflowIndex[item.name] || item.active) {
      workflowIndex[item.name] = item;
    }
  });

  WORKFLOW_SPECS.forEach(function(spec) {
    if (!workflowIndex[spec.name] || !workflowIndex[spec.name].id) {
      throw new Error('Workflow not found: ' + spec.name);
    }
    targets.push({
      id: workflowIndex[spec.name].id,
      name: spec.name,
      localPath: spec.localPath,
    });
  });

  backupDir = path.join(OUTPUT_ROOT, getTimestamp() + '-crm-deposit-telegram');
  fs.mkdirSync(backupDir, { recursive: true });

  for (var i = 0; i < targets.length; i += 1) {
    var target = targets[i];
    var workflow = await saveBackup(apiKey, target.id, target.name, backupDir);
    if (workflow.name === 'WF-CRM-01 입금자동반영 엔진') {
      patchCrmSnapshotAuth(workflow, crmAutomationCredential);
      patchCrmDepositPlanMatching(workflow);
      patchCrmDepositIdempotency(workflow);
      patchCrmDepositReviewQueueApi(workflow);
      patchCrmDepositEngine(workflow);
    } else if (workflow.name === 'WF-CRM-02 Gmail 입금알림 수집') {
      patchCollectorParser(workflow);
      patchCrmDepositCollector(workflow, telegramCredential);
    } else if (workflow.name === 'WF-CRM-03 입금알림 정합성 감사') {
      patchCrmDepositAudit(workflow, telegramCredential);
    }

    var payload = stripWorkflowPayload(workflow);
    if (target.localPath) {
      writeJson(target.localPath, payload);
    }
    await apiRequest(apiKey, 'PUT', '/api/v1/workflows/' + target.id, payload);
    console.log(workflow.name + ' -> ' + target.id);
  }

  console.log('CRM automation credential: ' + crmAutomationCredential.name + ' (' + crmAutomationCredential.id + ')');
  console.log('Telegram credential: ' + telegramCredential.name + ' (' + telegramCredential.id + ')');
  console.log('Backups stored in ' + backupDir);
}

main().catch(function(error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
