#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

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
  parseNode.parameters.jsCode = [
    "const SECURE_MAIL_PASSWORD = '610227';",
    '',
    "function stripHtml(value) {",
    "  return String(value ?? '')",
    "    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')",
    "    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')",
    "    .replace(/<br\\s*\\/?>/gi, '\\n')",
    "    .replace(/<\\/(tr|p|div|li|td|th|h\\d)>/gi, '\\n')",
    "    .replace(/<[^>]+>/g, ' ')",
    "    .replace(/&nbsp;/g, ' ')",
    "    .replace(/&amp;/g, '&')",
    "    .replace(/\\r/g, '')",
    "    .replace(/\\n\\s+/g, '\\n')",
    "    .replace(/[ \\t]+/g, ' ')",
    "    .replace(/\\n+/g, '\\n')",
    "    .trim();",
    "}",
    '',
    "function parseAmount(value) {",
    "  const parsed = Number(String(value ?? '').replace(/[^\\d-]/g, ''));",
    "  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;",
    "}",
    '',
    "function normalizeDateOnly(value) {",
    "  const text = String(value ?? '').trim();",
    "  const match = text.match(/(\\d{4})[./-](\\d{1,2})[./-](\\d{1,2})/);",
    "  if (!match) return '';",
    "  return match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0');",
    "}",
    '',
    "function formatOccurredAt(dateOnly, fallbackDate) {",
    "  if (!dateOnly) {",
    "    const fallback = new Date(fallbackDate || Date.now());",
    "    return fallback.toISOString();",
    "  }",
    "  const fallback = fallbackDate ? new Date(fallbackDate) : new Date();",
    "  const hour = String(Number.isFinite(fallback.getHours()) ? fallback.getHours() : 0).padStart(2, '0');",
    "  const minute = String(Number.isFinite(fallback.getMinutes()) ? fallback.getMinutes() : 0).padStart(2, '0');",
    "  const second = String(Number.isFinite(fallback.getSeconds()) ? fallback.getSeconds() : 0).padStart(2, '0');",
    "  return dateOnly + 'T' + hour + ':' + minute + ':' + second + '+09:00';",
    "}",
    '',
    "function parsePlainSender(text) {",
    "  const patterns = [",
    "    /입금자명[:\\s]*([^\\n|/]+)/i,",
    "    /보낸분[:\\s]*([^\\n|/]+)/i,",
    "    /의뢰인[:\\s]*([^\\n|/]+)/i,",
    "    /보내는분[:\\s]*([^\\n|/]+)/i,",
    "    /예금주[:\\s]*([^\\n|/]+)/i,",
    "    /받는분[:\\s]*([^\\n|/]+)/i,",
    "  ];",
    "  for (const pattern of patterns) {",
    "    const match = text.match(pattern);",
    "    if (match) return String(match[1]).trim();",
    "  }",
    "  return '';",
    "}",
    '',
    "function parsePlainOccurredAt(text, fallbackDate) {",
    "  const patterns = [",
    "    /(\\d{4})[./-](\\d{1,2})[./-](\\d{1,2})\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?/,",
    "    /(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일\\s*(\\d{1,2}):(\\d{2})(?::(\\d{2}))?/,",
    "  ];",
    "  for (const pattern of patterns) {",
    "    const match = text.match(pattern);",
    "    if (!match) continue;",
    "    const year = match[1];",
    "    const month = match[2].padStart(2, '0');",
    "    const day = match[3].padStart(2, '0');",
    "    const hour = match[4].padStart(2, '0');",
    "    const minute = match[5].padStart(2, '0');",
    "    const second = String(match[6] ?? '00').padStart(2, '0');",
    "    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + '+09:00';",
    "  }",
    "  const date = new Date(fallbackDate || Date.now());",
    "  return date.toISOString();",
    "}",
    '',
    "function isVestMailSecureHtml(value) {",
    "  const text = String(value ?? '');",
    "  return text.includes('VestMail') || text.includes('YettieSoft') || text.includes('window.doAction=N') || text.includes('doAction()') || text.includes('fnLoadEncMail');",
    "}",
    '',
    "function decryptVestMailSecureHtml(secureHtml, password) {",
    "  const scripts = [...String(secureHtml).matchAll(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi)].map((match) => match[1]);",
    "  if (scripts.length === 0) return '';",
    "",
    "  class Element {",
    "    constructor(id = '') {",
    "      this.id = id;",
    "      this.style = {};",
    "      this.children = [];",
    "      this.innerHTML = '';",
    "      this.value = '';",
    "      this.parentNode = { removeChild: () => {} };",
    "      this.contentWindow = {",
    "        document: {",
    "          open() {},",
    "          write(value) { this._written = value; },",
    "          close() {},",
    "          body: { scrollHeight: 0, scrollWidth: 0 },",
    "        },",
    "      };",
    "    }",
    "    appendChild(child) {",
    "      this.children.push(child);",
    "      return child;",
    "    }",
    "    removeChild(child) {",
    "      this.children = this.children.filter((entry) => entry !== child);",
    "    }",
    "  }",
    "",
    "  const elements = new Map();",
    "  function getElement(id) {",
    "    if (!elements.has(id)) elements.set(id, new Element(id));",
    "    return elements.get(id);",
    "  }",
    "",
    "  ['password', 'inputform', '__p', 'org', 'pop_content', 'ly_header', 'ly_body2', 'noscript', 'progressdlg'].forEach(getElement);",
    "  const body = new Element('body');",
    "  const document = {",
    "    body,",
    "    documentElement: { lang: 'ko' },",
    "    getElementById(id) { return getElement(id); },",
    "    createElement(tag) { return new Element(tag); },",
    "    write(value) { this._written = (this._written || '') + value; },",
    "    close() {},",
    "  };",
    "",
    "  const timers = [];",
    "  const context = {",
    "    console,",
    "    document,",
    "    navigator: {",
    "      platform: 'Win32',",
    "      userAgent: 'Mozilla/5.0 Chrome/122.0.0.0',",
    "      language: 'ko-KR',",
    "      browserLanguage: 'ko-KR',",
    "      userLanguage: 'ko-KR',",
    "    },",
    "    location: { href: '' },",
    "    URL: {",
    "      createObjectURL(blob) {",
    "        context.__blob = blob;",
    "        return 'blob:vestmail';",
    "      },",
    "    },",
    "    Blob: globalThis.Blob ?? class BlobMock {",
    "      constructor(parts = [], options = {}) {",
    "        this.parts = parts;",
    "        this.type = options.type ?? '';",
    "      }",
    "    },",
    "    Uint8Array: globalThis.Uint8Array,",
    "    atob: (value) => Buffer.from(value, 'base64').toString('binary'),",
    "    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),",
    "    alert: (message) => {",
    "      context.__alerts = (context.__alerts || []).concat([String(message ?? '')]);",
    "    },",
    "    setTimeout: (fn) => {",
    "      if (typeof fn === 'function') timers.push(fn);",
    "      return timers.length;",
    "    },",
    "    clearTimeout: () => {},",
    "    decodeURI,",
    "    unescape,",
    "    escape,",
    "    PDFView: undefined,",
    "    vestmail_onstart: () => {},",
    "    vestmail_onend: () => {},",
    "    event: { keyCode: 13 },",
    "    org: getElement('org'),",
    "    pop_content: getElement('pop_content'),",
    "  };",
    "",
    "  context.window = context;",
    "  context.self = context;",
    "",
    "  const boot = new Function('context', 'with (context) { ' + scripts.join('\\n') + '; return window.doAction; }');",
    "  const doAction = boot(context);",
    "  if (typeof doAction !== 'function') return '';",
    "",
    "  getElement('password').value = String(password ?? '');",
    "  doAction();",
    "",
    "  let steps = 0;",
    "  while (timers.length && steps < 200) {",
    "    const task = timers.shift();",
    "    task();",
    "    steps += 1;",
    "  }",
    "",
    "  return String(document._written ?? '');",
    "}",
    '',
    "function normalizeDirection(kind) {",
    "  const text = String(kind ?? '').trim();",
    "  if (text.includes('입금')) return 'deposit';",
    "  if (text.includes('출금')) return 'withdrawal';",
    "  return '';",
    "}",
    '',
    "function extractTransactionsFromSecureMailContent(decryptedHtml, fallbackDate, subject, messageId, from) {",
    "  const text = stripHtml(decryptedHtml);",
    "  const lines = text.split('\\n').map((line) => line.trim()).filter(Boolean);",
    "  const transactions = [];",
    "  for (let index = 0; index < lines.length; index += 1) {",
    "    const rowHeader = lines[index];",
    "    const headerMatch = rowHeader.match(/^(\\d+)\\s+(\\d{4}[/-]\\d{2}[/-]\\d{2})$/);",
    "    if (!headerMatch) continue;",
    "    const kindLabel = lines[index + 1] ?? '';",
    "    const direction = normalizeDirection(kindLabel);",
    "    const amountText = lines[index + 2] ?? '';",
    "    const balanceText = lines[index + 3] ?? '';",
    "    const branch = lines[index + 4] ?? '';",
    "    const bank = lines[index + 5] ?? '';",
    "    const party = lines[index + 6] ?? '';",
    "    if (!direction || !party) continue;",
    "    const amount = parseAmount(amountText);",
    "    if (amount <= 0) continue;",
    "    const occurredDate = normalizeDateOnly(headerMatch[2]);",
    "    transactions.push({",
    "      direction,",
    "      party,",
    "      sender: direction === 'deposit' ? party : '',",
    "      amount,",
    "      occurredAt: formatOccurredAt(occurredDate, fallbackDate),",
    "      balance: parseAmount(balanceText),",
    "      bank,",
    "      branch,",
    "      note: [subject, bank, branch, balanceText].filter(Boolean).join(' / '),",
    "      externalId: (messageId || 'secure-mail') + '-' + headerMatch[1],",
    "      rawFrom: from,",
    "      rawSubject: subject,",
    "      secureMailType: 'vestmail_attachment',",
    "      kindLabel,",
    "    });",
    "  }",
    "  return transactions;",
    "}",
    '',
    "function extractPlainTransactions(text, fallbackDate, subject, messageId, from) {",
    "  const sender = parsePlainSender(text);",
    "  const direction = /출금/i.test(text) ? 'withdrawal' : (/입금/i.test(text) ? 'deposit' : '');",
    "  const amountPatterns = [",
    "    /입금(?:금액)?[:\\s]*([0-9,]+)\\s*원?/i,",
    "    /출금(?:금액)?[:\\s]*([0-9,]+)\\s*원?/i,",
    "    /거래금액[:\\s]*([0-9,]+)\\s*원?/i,",
    "    /금액[:\\s]*([0-9,]+)\\s*원?/i,",
    "    /([0-9,]+)\\s*원\\s*(?:입금|출금)/i,",
    "  ];",
    "  let amount = 0;",
    "  for (const pattern of amountPatterns) {",
    "    const match = text.match(pattern);",
    "    if (match) {",
    "      amount = parseAmount(match[1]);",
    "      break;",
    "    }",
    "  }",
    "  const balancePatterns = [",
    "    /(?:입금후|출금후|거래후)?잔액[:\\s]*([0-9,]+)\\s*원?/i,",
    "    /balance[:\\s]*([0-9,]+)/i,",
    "  ];",
    "  let balance = 0;",
    "  for (const pattern of balancePatterns) {",
    "    const match = text.match(pattern);",
    "    if (match) {",
    "      balance = parseAmount(match[1]);",
    "      break;",
    "    }",
    "  }",
    "  if (!sender || amount <= 0 || !direction) return [];",
    "  return [{",
    "    direction,",
    "    party: sender,",
    "    sender: direction === 'deposit' ? sender : '',",
    "    amount,",
    "    occurredAt: parsePlainOccurredAt(text, fallbackDate),",
    "    balance,",
    "    bank: '',",
    "    branch: '',",
    "    note: subject,",
    "    externalId: messageId || ('email-' + Date.now() + '-' + amount),",
    "    rawFrom: from,",
    "    rawSubject: subject,",
    "    secureMailType: 'plain_mail',",
    "    kindLabel: direction === 'deposit' ? '입금' : '출금',",
    "  }];",
    "}",
    '',
    "const item = $input.first();",
    "const emailJson = item.json ?? {};",
    "const binary = item.binary ?? {};",
    "const subject = String(emailJson.subject ?? '');",
    "const from = String(emailJson.from?.text ?? emailJson.from ?? '');",
    "const messageId = String(emailJson.messageId ?? emailJson['message-id'] ?? emailJson.attributes?.uid ?? '');",
    "const fallbackDate = emailJson.date;",
    "",
    "let secureHtml = '';",
    "const directHtmlCandidates = [",
    "  String(emailJson.textHtml ?? ''),",
    "  String(emailJson.html ?? ''),",
    "  String(emailJson.text ?? ''),",
    "];",
    "",
    "for (const candidate of directHtmlCandidates) {",
    "  if (candidate && isVestMailSecureHtml(candidate)) {",
    "    secureHtml = candidate;",
    "    break;",
    "  }",
    "}",
    "",
    "if (!secureHtml) {",
    "  const binaryItemIndex = typeof $itemIndex === 'number' ? $itemIndex : 0;",
    "  for (const [binaryKey, binaryValue] of Object.entries(binary)) {",
    "    const fileName = String(binaryValue.fileName ?? binaryKey ?? '');",
    "    const mimeType = String(binaryValue.mimeType ?? '');",
    "    let attachmentText = '';",
    "    const rawData = typeof binaryValue.data === 'string' ? binaryValue.data : '';",
    "    if (rawData === 'filesystem-v2') {",
    "      const binaryHelpers = typeof helpers === 'object' && helpers ? helpers : (typeof this === 'object' && this && typeof this.helpers === 'object' ? this.helpers : null);",
    "      try {",
    "        if (binaryHelpers && typeof binaryHelpers.getBinaryDataBuffer === 'function') {",
    "          const buffer = await binaryHelpers.getBinaryDataBuffer(binaryItemIndex, binaryKey);",
    "          attachmentText = Buffer.from(buffer).toString('utf8');",
    "        }",
    "      } catch {}",
    "      if (!attachmentText) {",
    "        try {",
    "          const fileId = String(binaryValue.id ?? '');",
    "          let filePath = '';",
    "          if (binaryHelpers && typeof binaryHelpers.getBinaryPath === 'function') {",
    "            filePath = String(await binaryHelpers.getBinaryPath(binaryItemIndex, binaryKey) ?? '');",
    "          }",
    "          if (!filePath && fileId.startsWith('filesystem-v2:')) {",
    "            filePath = '/home/node/.n8n/storage/' + fileId.slice('filesystem-v2:'.length);",
    "          }",
    "          const localRequire = typeof require === 'function' ? require : null;",
    "          if (filePath && localRequire) {",
    "            const fs = localRequire('fs');",
    "            attachmentText = fs.readFileSync(filePath, 'utf8');",
    "          }",
    "        } catch {}",
    "      }",
    "    } else if (rawData) {",
    "      attachmentText = Buffer.from(rawData, 'base64').toString('utf8');",
    "    }",
    "    if (!attachmentText) continue;",
    "    if ((fileName.toLowerCase().endsWith('.html') || mimeType.includes('text/html')) && isVestMailSecureHtml(attachmentText)) {",
    "      secureHtml = attachmentText;",
    "      break;",
    "    }",
    "  }",
    "}",
    "",
    "let transactions = [];",
    "if (secureHtml) {",
    "  const decryptedHtml = decryptVestMailSecureHtml(secureHtml, SECURE_MAIL_PASSWORD);",
    "  if (decryptedHtml) {",
    "    transactions = extractTransactionsFromSecureMailContent(decryptedHtml, fallbackDate, subject, messageId, from);",
    "  }",
    "}",
    "",
    "if (transactions.length === 0) {",
    "  const textPlain = String(emailJson.textPlain ?? emailJson.text ?? '');",
    "  const textHtml = String(emailJson.textHtml ?? emailJson.html ?? '');",
    "  const mergedText = [subject, stripHtml(textPlain), stripHtml(textHtml)].filter(Boolean).join('\\n');",
    "  transactions = extractPlainTransactions(mergedText, fallbackDate, subject, messageId, from);",
    "}",
    "",
    "console.log('[WF-CRM-02 parser]', JSON.stringify({",
    "  subject,",
    "  messageId,",
    "  binaryKeys: Object.keys(binary),",
    "  directSecureHtml: Boolean(secureHtml && directHtmlCandidates.some((candidate) => candidate && candidate === secureHtml)),",
    "  secureHtmlDetected: Boolean(secureHtml),",
    "  transactionsCount: transactions.length,",
    "  depositsCount: transactions.filter((entry) => entry.direction === 'deposit').length,",
    "}));",
    "",
    "if (transactions.length === 0) {",
    "  return [];",
    "}",
    "",
    "const deposits = transactions.filter((entry) => entry.direction === 'deposit').map((entry) => ({",
    "  sender: entry.sender || entry.party || '',",
    "  amount: entry.amount,",
    "  occurredAt: entry.occurredAt,",
    "  balance: Number(entry.balance || 0) || 0,",
    "  note: entry.note,",
    "  externalId: entry.externalId,",
    "  rawFrom: entry.rawFrom,",
    "  rawSubject: entry.rawSubject,",
    "  secureMailType: entry.secureMailType,",
    "}));",
    "",
    "return [{",
    "  json: {",
    "    source: secureHtml ? 'email_secure_mail' : 'email_imap',",
    "    transactions,",
    "    deposits,",
    "  },",
    "}];",
  ].join('\n');
  return workflow;
}

function buildBankEventSummaryCode() {
  return [
    "const parsed = $('Code: Parse Deposit Email').first().json || {};",
    "const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];",
    "const bankOnlyTransactions = transactions.filter((entry) => String(entry.direction || '').trim() !== 'deposit');",
    "const accountLabel = String($env.PRESSCO_BANK_ALERT_ACCOUNT_LABEL || $env.PRESSCO_BANK_ACCOUNT_LABEL || '농협 093-01-264177').trim();",
    "const summaryKey = ['bank-events', parsed.source || 'unknown', bankOnlyTransactions.map((entry) => entry.externalId || [entry.direction || '', entry.party || entry.sender || '', entry.amount || 0, entry.occurredAt || ''].join(':')).join('|')].join('::');",
    "const staticData = $getWorkflowStaticData('global');",
    "const sentMap = staticData.presscoBankTelegramSent || {};",
    "function formatAmount(value) { return (Number(value) || 0).toLocaleString() + '원'; }",
    "function formatDate(value) { return String(value || '').replace('T', ' ').slice(0, 16) || '-'; }",
    "function directionLabel(value) { return value === 'withdrawal' ? '출금' : (value === 'deposit' ? '입금' : '거래'); }",
    "if (bankOnlyTransactions.length === 0 || sentMap[summaryKey]) {",
    "  return [];",
    "}",
    "const lines = [",
    "  '[은행 거래 알림]',",
    "  '',",
    "  '계좌: ' + accountLabel,",
    "];",
    "bankOnlyTransactions.slice(0, 5).forEach((entry) => {",
    "  const label = directionLabel(entry.direction);",
    "  const party = String(entry.party || entry.sender || '미상').trim() || '미상';",
    "  const suffix = entry.balance ? ' / 잔액 ' + formatAmount(entry.balance) : '';",
    "  lines.push('- [' + label + '] ' + party + ' / ' + formatAmount(entry.amount) + ' / ' + formatDate(entry.occurredAt) + suffix);",
    "});",
    "if (bankOnlyTransactions.length > 5) {",
    "  lines.push('', '... 외 ' + String(bankOnlyTransactions.length - 5) + '건');",
    "}",
    "sentMap[summaryKey] = new Date().toISOString();",
    "const sentKeys = Object.keys(sentMap);",
    "if (sentKeys.length > 300) {",
    "  sentKeys.sort((left, right) => String(sentMap[left]).localeCompare(String(sentMap[right]))).slice(0, sentKeys.length - 300).forEach((key) => delete sentMap[key]);",
    "}",
    "staticData.presscoBankTelegramSent = sentMap;",
    "return [{ json: { _telegramMessage: lines.join('\\n'), _summaryKey: summaryKey } }];",
  ].join('\n');
}

function buildTelegramSummaryCode() {
  return [
    "const parsed = $('Code: Parse Deposit Email').first().json || {};",
    "const intake = $('HTTP Call Intake Engine').first().json || {};",
    "const accountLabel = String($env.PRESSCO_BANK_ALERT_ACCOUNT_LABEL || $env.PRESSCO_BANK_ACCOUNT_LABEL || '농협 093-01-264177').trim();",
    'const deposits = Array.isArray(parsed.deposits) ? parsed.deposits : [];',
    'const exactActions = Array.isArray(intake.exactActions) ? intake.exactActions : [];',
    'const duplicateEntries = Array.isArray(intake.duplicateEntries) ? intake.duplicateEntries : [];',
    'const reviewEntries = Array.isArray(intake.reviewEntries) ? intake.reviewEntries : [];',
    'const unmatchedEntries = Array.isArray(intake.unmatchedEntries) ? intake.unmatchedEntries : [];',
    'const summary = intake.summary || {};',
    "const summaryKey = ['crm', parsed.source || intake.source || 'unknown', deposits.map((entry) => entry.externalId || [entry.sender || '', entry.amount || 0, entry.occurredAt || ''].join(':')).join('|'), summary.exact || 0, summary.review || 0, summary.unmatched || 0, summary.duplicate || 0].join('::');",
    "const staticData = $getWorkflowStaticData('global');",
    "const sentMap = staticData.presscoCrmTelegramSent || {};",
    '',
    "function formatAmount(value) { return (Number(value) || 0).toLocaleString() + '원'; }",
    "function formatDate(value) { return String(value || '').replace('T', ' ').slice(0, 16) || '-'; }",
    "function summarizeCandidates(entry) {",
    "  const candidates = Array.isArray(entry?.candidates)",
    "    ? entry.candidates.slice(0, 2).map((candidate) => candidate.customerName || candidate.invoiceNo || candidate.kind).filter(Boolean)",
    "    : [];",
    "  return candidates.length > 0 ? '후보 ' + candidates.join(', ') : '';",
    "}",
    "if (deposits.length === 0 || sentMap[summaryKey]) {",
    "  return [];",
    "}",
    "if (duplicateEntries.length > 0 && exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length === 0) {",
    "  return [];",
    "}",
    '',
    "const leadEntry = deposits[0] || {};",
    "const leadSender = String(leadEntry.sender || '미상').trim() || '미상';",
    'const lines = [',
    "  '[입금 알림]',",
    "  '',",
    "  '계좌: ' + accountLabel,",
    "  '입금자: ' + leadSender,",
    "  '입금별칭추천: ' + leadSender,",
    "  '입금액: ' + formatAmount(leadEntry.amount),",
    "  '거래일시: ' + formatDate(leadEntry.occurredAt),",
    '];',
    "if (Number(leadEntry.balance) > 0) {",
    "  lines.push('통장잔액: ' + formatAmount(leadEntry.balance));",
    "}",
    "if (deposits.length > 1) {",
    "  lines.push('추가입금: ' + String(deposits.length - 1) + '건');",
    "}",
    '',
    'if (exactActions.length > 0) {',
    "  const entry = exactActions[0];",
    "    const target = entry.kind === 'invoice'",
    "      ? (entry.invoiceNo ? '명세표 ' + entry.invoiceNo : 'CRM 명세표')",
    "      : '기존 장부';",
    "  lines.push('CRM처리: 자동반영 완료');",
    "  lines.push('안내: ' + (entry.customerName || entry.sender || '미상') + ' / ' + target + ' 반영');",
    '}',
    '',
    "if (exactActions.length === 0 && reviewEntries.length > 0) {",
    "  const entry = reviewEntries[0];",
    "  const candidateText = summarizeCandidates(entry);",
    "  lines.push('CRM처리: 검토 필요');",
    "  lines.push('안내: ' + (candidateText || String(entry.reason || '수동 확인이 필요합니다.').trim()));",
    "}",
    '',
    "if (exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length > 0) {",
    "  const entry = unmatchedEntries[0];",
    "  lines.push('CRM처리: 미매칭');",
    "  lines.push('안내: ' + (String(entry.reason || '').trim() || '정확히 일치하는 고객 미수 금액을 찾지 못했습니다.'));",
    "}",
    '',
    "if (exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length === 0) {",
    "  lines.push('CRM처리: 접수 완료');",
    "  lines.push('안내: 자동화 엔진 응답을 확인하지 못해 운영 로그 점검이 필요합니다.');",
    '}',
    "sentMap[summaryKey] = new Date().toISOString();",
    "const sentKeys = Object.keys(sentMap);",
    "if (sentKeys.length > 300) {",
    "  sentKeys.sort((left, right) => String(sentMap[left]).localeCompare(String(sentMap[right]))).slice(0, sentKeys.length - 300).forEach((key) => delete sentMap[key]);",
    "}",
    "staticData.presscoCrmTelegramSent = sentMap;",
    '',
    'return [{',
    '  json: {',
    "    _telegramMessage: lines.join('\\n'),",
    "    _summaryKey: summaryKey,",
    '  },',
    '}];',
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
      chatId: "={{ $env.PRESSCO_BANK_CHAT_ID || $env.TELEGRAM_GROUP_ID || $env.TELEGRAM_CHAT_ID || '-5275298126' }}",
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
      chatId: "={{ $env.PRESSCO_BANK_CHAT_ID || $env.TELEGRAM_GROUP_ID || $env.TELEGRAM_CHAT_ID || '-5275298126' }}",
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
