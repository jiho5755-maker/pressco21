#!/usr/bin/env node
/*
 * Smoke checks for PRESSCO21 sales workflow channel guards.
 * No external dependencies; this validates the workflow JSON embeds the
 * MakeShop revenue-state rule and the Coupang retry/pacing guardrails that
 * protect daily sales aggregation.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function workflow(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}
function codeOf(wf, name) {
  const node = wf.nodes.find((n) => n.name === name);
  assert(node, `node not found: ${name}`);
  assert(node.parameters && node.parameters.jsCode, `node has no jsCode: ${name}`);
  return node.parameters.jsCode;
}

const f23 = codeOf(workflow('workflows/automation/daily-sales-all-channels.json'), '통합 집계');
const f23Coupang = codeOf(workflow('workflows/automation/daily-sales-all-channels.json'), '쿠팡윙 주문 조회');
const f26 = codeOf(workflow('workflows/automation/daily-sales-f26-weekly-adjustment.json'), '메이크샵 재조회');
const f22 = codeOf(workflow('workflows/automation/daily-sales-report.json'), '매출 분석');
const f23bCandidate = codeOf(workflow('workflows/automation/coupang-pending-backfill-1930.json'), '백필 대상 계산');
const f23b = codeOf(workflow('workflows/automation/coupang-pending-backfill-1930.json'), '백필 결과 요약');

for (const [label, code] of [['F23', f23], ['F26', f26]]) {
  assert(code.includes("const isRevenueStatus = status === 'Y' || status === 'S';"), `${label} must include Y/S as revenue states`);
  assert(code.includes('N/C 등 미입금·취소 상태만 제외'), `${label} must document N/C exclusion`);
  assert(!code.includes("status === 'Y' || (status === 'S' && isPickupCompletedOrder(entry))"), `${label} must not restrict S to pickup-only orders`);
}

assert(f22.includes("const REVENUE_STATES = ['Y', 'S'];"), 'F22 must include Y/S revenue states');
assert(f22.includes('LEGACY_CANCEL_STATES'), 'F22 must keep legacy cancellation guard');

function classify(status) {
  return ['Y', 'S'].includes(String(status || '').toUpperCase());
}
assert.strictEqual(classify('Y'), true, 'Y should be revenue');
assert.strictEqual(classify('S'), true, 'S should be revenue');
assert.strictEqual(classify('N'), false, 'N should be excluded');
assert.strictEqual(classify('C'), false, 'C should be excluded');

// Weekend fixture from MakeShop OpenAPI audit on 2026-04-20.
const saturdayNonPersonalS = 497050;
const sundayStatusSTotal = 2339640;
const sundayCrmMatchedPersonal = 997500;
assert.strictEqual(saturdayNonPersonalS, 497050);
assert.strictEqual(sundayStatusSTotal - sundayCrmMatchedPersonal, 1342140);

assert(f23Coupang.includes("blackoutWindow: 'KST 14:30-19:00'"), 'F23 Coupang blackout must match 14:30~19:00 policy');
assert(f23Coupang.includes('const statusDelayMs = 1200;'), 'F23 Coupang must pace status calls by 1.2s');
assert(f23Coupang.includes('const maxAttempts = 3;'), 'F23 Coupang must retry transient API failures');
assert(f23Coupang.includes('nextToken'), 'F23 Coupang must support paginated responses');
assert(f23Coupang.includes('statusSummary'), 'F23 Coupang must return per-status diagnostics');
assert(f23Coupang.includes('summarizeError'), 'F23 Coupang must preserve sanitized API error details');

assert(f23b.includes('hasUnresolvedCoupang'), 'F23B must classify unresolved Coupang backfill separately');
assert(f23b.includes('needsBackfill'), 'F23B must treat pending Coupang as unresolved');
assert(f23b.includes('unresolvedCount'), 'F23B summary must expose unresolvedCount');
assert(f23b.includes('미해결'), 'F23B alert must show unresolved wording instead of false success');

assert(f23bCandidate.includes('const lookbackDays = 3;'), 'F23B must always inspect the latest 3 closed sales days');
assert(f23bCandidate.includes('targetDates'), 'F23B must enumerate fixed target dates, not only existing NocoDB rows');
assert(f23bCandidate.includes('missing_nocodb_record'), 'F23B must backfill missing NocoDB dates within the 3-day window');
assert(!f23bCandidate.includes('최근 14일'), 'F23B default backfill window must not remain 14 days');

assert(f23bCandidate.includes('beforeTotalRevenue'), 'F23B candidates must keep prior total revenue for correction alerts');
assert(f23bCandidate.includes('beforeCoupangRevenue'), 'F23B candidates must keep prior Coupang revenue for correction alerts');
assert(f23b.includes('매출 백필 정정 알림'), 'F23B alert must be framed as a correction alert');
assert(f23b.includes('총매출') && f23b.includes('쿠팡윙'), 'F23B correction alert must include total and Coupang amount changes');
assert(f23b.includes('문제 후보가 없으면 Telegram 운영알림을 보내지 않는다'), 'F23B must document no-alert behavior when there is no issue');

console.log('sales-status-smoke-test: ok');
