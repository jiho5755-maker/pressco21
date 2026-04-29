#!/usr/bin/env node
/*
 * 바로빌 n8n adapter 로컬 계약 테스트.
 * 실제 CRM/바로빌/운영 네트워크 호출 없이 JSON 구조, Code 노드 문법,
 * fixture 기반 idempotency, SOAP 응답 파서를 검증한다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const automationRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(automationRoot, '..');
const workflowPath = path.join(automationRoot, 'workflows/accounting/CRM-BaroBill-TaxInvoice-Webhook-Adapter.json');
const fixtureDir = path.join(automationRoot, 'fixtures/barobill');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseInteger(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/원/g, '').trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function fnv1a(value) {
  let h = 0x811c9dc5;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function makeProviderMgtKey(invoiceId, invoiceNo, idempotencyKey) {
  const idPart = String(invoiceId).replace(/\D/g, '').slice(-7) || '0';
  const noPart = String(invoiceNo || '').trim().replace(/[^0-9A-Za-z]/g, '').slice(-6) || 'INV';
  const hash = fnv1a(idempotencyKey).slice(0, 8).toUpperCase();
  return `PC${idPart}-${noPart}-${hash}`.slice(0, 24);
}

function normalizeFixtureIssue(fixture) {
  const items = Array.isArray(fixture.items) ? fixture.items : [];
  const itemSupply = items.reduce((sum, item) => sum + parseInteger(item.supplyAmount ?? item.supply_amount), 0);
  const itemTax = items.reduce((sum, item) => sum + parseInteger(item.taxAmount ?? item.tax_amount), 0);
  const amount = fixture.amounts || {};
  assert(fixture.invoiceId > 0, 'fixture invoiceId 누락');
  assert(fixture.idempotencyKey, 'fixture idempotencyKey 누락');
  assert(items.length > 0, 'fixture 품목 누락');
  assert(parseInteger(amount.supplyAmount) === itemSupply, 'fixture 공급가액 합계 불일치');
  assert(parseInteger(amount.taxAmount) === itemTax, 'fixture 세액 합계 불일치');
  assert(parseInteger(amount.totalAmount) === itemSupply + itemTax, 'fixture 합계금액 불일치');
  return {
    providerMgtKey: makeProviderMgtKey(fixture.invoiceId, fixture.invoiceNo, fixture.idempotencyKey),
    payloadHash: fnv1a(JSON.stringify({ invoiceId: fixture.invoiceId, invoiceNo: fixture.invoiceNo, amounts: fixture.amounts, items: fixture.items })),
  };
}

function simulateIdempotency() {
  const fixture = readJson(path.join(fixtureDir, 'tax-invoice-issue-request.fixture.json'));
  const normalized = normalizeFixtureIssue(fixture);
  const log = {};
  function request(payload) {
    const existing = log[payload.idempotencyKey];
    if (existing && ['requesting', 'requested', 'issued', 'provider_existing'].includes(existing.status)) {
      return { duplicate: true, shouldCallProvider: false, existing };
    }
    const entry = {
      request_id: payload.requestId,
      idempotency_key: payload.idempotencyKey,
      invoice_id: payload.invoiceId,
      invoice_no: payload.invoiceNo,
      provider_mgt_key: normalized.providerMgtKey,
      request_payload_hash: normalized.payloadHash,
      status: 'requesting',
    };
    log[payload.idempotencyKey] = entry;
    return { duplicate: false, shouldCallProvider: true, entry };
  }
  const first = request(fixture);
  const second = request(fixture);
  assert(first.shouldCallProvider === true, '첫 발급 요청은 provider 호출 대상이어야 함');
  assert(second.duplicate === true && second.shouldCallProvider === false, '두 번째 같은 idempotencyKey는 중복 차단되어야 함');
  assert(normalized.providerMgtKey.length <= 24, 'provider management key는 24자 이하이어야 함');
  return normalized;
}

function extractXml(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function testSoapParsers() {
  const issueXml = fs.readFileSync(path.join(fixtureDir, 'barobill-issue-success.sample.xml'), 'utf8');
  const statusXml = fs.readFileSync(path.join(fixtureDir, 'barobill-status-issued.sample.xml'), 'utf8');
  const issueResult = Number(extractXml(issueXml, 'RegistAndIssueTaxInvoiceResult'));
  const ntsKey = extractXml(statusXml, 'NTSSendKey');
  const ntsResult = extractXml(statusXml, 'NTSSendResult');
  assert(issueResult > 0, '발급 성공 fixture resultCode 파싱 실패');
  assert(ntsKey, '상태조회 fixture NTS 승인번호 파싱 실패');
  assert(ntsResult.includes('전송완료'), '상태조회 fixture NTS 결과 파싱 실패');
}

function testWorkflowShape(workflow) {
  assert(workflow.name === 'CRM - BaroBill TaxInvoice Webhook Adapter', 'workflow name 불일치');
  assert(workflow.active === false, 'workflow는 기본 비활성(active=false)이어야 함');
  assert(workflow.settings?.saveDataSuccessExecution === 'none', '성공 실행 데이터 저장은 none이어야 함');
  assert(workflow.settings?.saveDataErrorExecution === 'none', '오류 실행 데이터 저장은 none이어야 함');
  const nodes = workflow.nodes || [];
  const byName = new Map(nodes.map((node) => [node.name, node]));
  for (const name of ['발급 요청 웹훅', '상태조회 웹훅', '10분 polling 스케줄', '발급 SOAP 호출', '상태 SOAP 호출', '관리번호 존재 SOAP 호출']) {
    assert(byName.has(name), `필수 노드 누락: ${name}`);
  }
  assert(byName.get('발급 요청 웹훅').parameters.path === 'crm/barobill/tax-invoices/issue', '발급 webhook path 불일치');
  assert(byName.get('상태조회 웹훅').parameters.path === 'crm/barobill/tax-invoices/sync-status', '상태 webhook path 불일치');
  assert(JSON.stringify(workflow).includes('RegistAndIssueTaxInvoice'), 'RegistAndIssueTaxInvoice SOAP action 누락');
  assert(JSON.stringify(workflow).includes('GetTaxInvoiceStateEX'), 'GetTaxInvoiceStateEX SOAP action 누락');
  assert(JSON.stringify(workflow).includes('CheckMgtNumIsExists'), 'CheckMgtNumIsExists SOAP action 누락');
  assert(!JSON.stringify(workflow).match(/(SIxKK9|YWQ0ZT|N8N_API_KEY=|BAROBILL_CERTKEY=)/), 'workflow에 비밀값으로 보이는 문자열이 포함됨');

  const nodeNames = new Set(nodes.map((node) => node.name));
  for (const [sourceName, output] of Object.entries(workflow.connections || {})) {
    assert(nodeNames.has(sourceName), `connection source 노드 누락: ${sourceName}`);
    for (const branch of output.main || []) {
      for (const edge of branch) {
        assert(nodeNames.has(edge.node), `connection target 노드 누락: ${edge.node}`);
      }
    }
  }
}

function testCodeNodeSyntax(workflow) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barobill-code-check-'));
  try {
    for (const node of workflow.nodes || []) {
      if (node.type !== 'n8n-nodes-base.code') continue;
      const jsCode = node.parameters?.jsCode || '';
      const file = path.join(tmpDir, `${node.id}.js`);
      fs.writeFileSync(file, `async function __n8nCodeWrapper() {\n${jsCode}\n}\n`, 'utf8');
      const res = childProcess.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (res.status !== 0) {
        throw new Error(`Code 노드 문법 오류: ${node.name}\n${res.stderr || res.stdout}`);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main() {
  const workflow = readJson(workflowPath);
  testWorkflowShape(workflow);
  testCodeNodeSyntax(workflow);
  const normalized = simulateIdempotency();
  testSoapParsers();
  console.log(JSON.stringify({
    ok: true,
    workflow: path.relative(repoRoot, workflowPath),
    nodes: workflow.nodes.length,
    providerMgtKeyFixture: normalized.providerMgtKey,
    checks: ['json_shape', 'code_node_syntax', 'idempotency_duplicate', 'soap_response_parse'],
  }, null, 2));
}

main();
