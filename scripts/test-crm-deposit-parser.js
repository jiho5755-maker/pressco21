#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var parserSource = require('./lib/crm-deposit-parser-source');

var REPO_ROOT = path.resolve(__dirname, '..');
var FIXTURE_ROOT = path.join(REPO_ROOT, 'tests', 'fixtures', 'crm-deposit-parser');
var WORKFLOW_PATH = path.join(REPO_ROOT, 'n8n-automation', 'workflows', 'accounting', 'WF-CRM-02_Gmail_입금알림_수집.json');

function loadFixtureText(fileName) {
  return fs.readFileSync(path.join(FIXTURE_ROOT, fileName), 'utf8');
}

async function runCode(code, sandbox) {
  return vm.runInNewContext('(async () => {\n' + code + '\n})()', sandbox, { timeout: 2000 });
}

async function runParser(emailJson, binary) {
  var items = await runCode(parserSource.buildCrmDepositParserCode(), {
    Buffer: Buffer,
    Date: Date,
    console: console,
    decodeURI: decodeURI,
    escape: escape,
    globalThis: globalThis,
    helpers: null,
    require: require,
    unescape: unescape,
    $itemIndex: 0,
    $input: {
      first: function() {
        return {
          json: emailJson,
          binary: binary || {},
        };
      },
    },
  });

  assert(Array.isArray(items) && items.length === 1, 'parser should return a single n8n item');
  return items[0].json;
}

async function runDepositSummary(parsed, intake) {
  var store = {
    presscoCrmTelegramSent: {},
    presscoCrmFailureLog: [],
  };
  var items = await runCode(parserSource.buildCrmDepositTelegramSummaryCode(), {
    Date: Date,
    console: console,
    $env: {},
    $getWorkflowStaticData: function() {
      return store;
    },
    $: function(nodeName) {
      return {
        first: function() {
          if (nodeName === 'Code: Record Intake Ledger') return { json: parsed };
          if (nodeName === 'HTTP Call Intake Engine') return { json: intake };
          throw new Error('unexpected node lookup: ' + nodeName);
        },
      };
    },
  });

  assert(Array.isArray(items) && items.length === 1, 'deposit summary should return one n8n item');
  return items[0].json;
}

async function runBankSummary(parsed) {
  var store = {
    presscoBankTelegramSent: {},
  };
  var items = await runCode(parserSource.buildCrmBankEventSummaryCode(), {
    Date: Date,
    console: console,
    $env: {},
    $getWorkflowStaticData: function() {
      return store;
    },
    $: function(nodeName) {
      return {
        first: function() {
          if (nodeName === 'Code: Record Intake Ledger') return { json: parsed };
          throw new Error('unexpected node lookup: ' + nodeName);
        },
      };
    },
  });

  assert(Array.isArray(items) && items.length === 1, 'bank summary should return one n8n item');
  return items[0].json;
}

function getConnectionTargets(workflow, nodeName) {
  var connection = workflow.connections && workflow.connections[nodeName];
  if (!connection || !Array.isArray(connection.main)) return [];
  return connection.main
    .reduce(function(list, targets) {
      return list.concat(targets || []);
    }, [])
    .map(function(target) {
      return target && target.node ? String(target.node) : '';
    })
    .filter(Boolean)
    .sort();
}

function assertWorkflowConnections() {
  var workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  assert.deepStrictEqual(
    getConnectionTargets(workflow, 'Code: Parse Deposit Email'),
    ['Code: Record Intake Ledger'],
    'parser output must flow through intake ledger before any summary branch'
  );
  assert.deepStrictEqual(
    getConnectionTargets(workflow, 'Code: Record Intake Ledger'),
    [
      'Build Bank Event Summary',
      'Build Parse Failure Summary',
      'Code: Build Recon Sync From Intake',
      'IF Has Deposits',
    ].sort(),
    'intake ledger must fan out to bank summary, parse failure, intake recon sync, and deposit intake'
  );
}

async function main() {
  var secureDepositText = loadFixtureText('secure-decrypted-deposit-record-only.txt');
  var plainDepositText = loadFixtureText('plain-basic-deposit.txt');
  var secureWithdrawalText = loadFixtureText('secure-decrypted-withdrawal-record-only.txt');

  var secureDepositParsed = await runParser({
    subject: '농협에서 제공하는 입출금 거래내역',
    from: 'webmaster@ums.nonghyup.com',
    date: '2026-04-06T10:06:00+09:00',
    textPlain: secureDepositText,
  });
  assert.strictEqual(secureDepositParsed.parseFailure, false, 'secure deposit table fixture should not fail');
  assert.strictEqual(secureDepositParsed.deposits.length, 1, 'secure deposit table fixture should yield one deposit');
  assert.strictEqual(secureDepositParsed.deposits[0].sender, '김수진서초글');
  assert.strictEqual(secureDepositParsed.deposits[0].amount, 40000);
  assert.match(secureDepositParsed.deposits[0].note, /김수진서초글/);

  var plainDepositParsed = await runParser({
    subject: '입금 알림',
    from: 'webmaster@ums.nonghyup.com',
    date: '2026-04-07T09:12:00+09:00',
    textPlain: plainDepositText,
  });
  assert.strictEqual(plainDepositParsed.parseFailure, false, 'plain deposit fixture should not fail');
  assert.strictEqual(plainDepositParsed.deposits.length, 1, 'plain deposit fixture should yield one deposit');
  assert.strictEqual(plainDepositParsed.deposits[0].sender, '홍길동');
  assert.strictEqual(plainDepositParsed.deposits[0].amount, 35000);

  var utcFallbackParsed = await runParser({
    subject: '농협에서 제공하는 입출금 거래내역',
    from: 'webmaster@ums.nonghyup.com',
    date: '2026-04-07T08:18:00.000Z',
    textPlain: secureDepositText,
  });
  assert.strictEqual(
    utcFallbackParsed.deposits[0].occurredAt,
    '2026-04-06T17:18:00+09:00',
    'UTC fallback timestamps should be rendered back into KST for row-level occurredAt values'
  );

  var secureWithdrawalParsed = await runParser({
    subject: '농협에서 제공하는 입출금 거래내역',
    from: 'webmaster@ums.nonghyup.com',
    date: '2026-04-06T10:10:00+09:00',
    textPlain: secureWithdrawalText,
  });
  assert.strictEqual(secureWithdrawalParsed.parseFailure, false, 'withdrawal table fixture should not fail');
  assert.strictEqual(secureWithdrawalParsed.deposits.length, 0, 'withdrawal fixture should not create deposits');
  assert.strictEqual(secureWithdrawalParsed.transactions.length, 1, 'withdrawal fixture should yield one transaction');
  assert.strictEqual(secureWithdrawalParsed.transactions[0].direction, 'withdrawal');
  assert.strictEqual(secureWithdrawalParsed.transactions[0].party, 'ATM출금');

  var depositSummary = await runDepositSummary(secureDepositParsed, {
    exactActions: [],
    duplicateEntries: [],
    reviewEntries: [],
    unmatchedEntries: [],
    summary: { exact: 0, review: 0, unmatched: 0, duplicate: 0 },
  });
  assert.match(depositSummary._telegramMessage, /\[입금 알림\]/);
  assert.match(depositSummary._telegramMessage, /계좌: 농협 093-01-264177/);
  assert.match(depositSummary._telegramMessage, /통장잔액:/);
  assert.match(depositSummary._telegramMessage, /CRM처리:/);
  assert.doesNotMatch(depositSummary._telegramMessage, /입금별칭추천/);
  assert.doesNotMatch(depositSummary._telegramMessage, /기록:/);

  var intakeFailureSummary = await runDepositSummary(secureDepositParsed, {
    errorMessage: 'crm intake unavailable',
    exactActions: [],
    duplicateEntries: [],
    reviewEntries: [],
    unmatchedEntries: [],
  });
  assert.match(intakeFailureSummary._telegramMessage, /\[입금 알림\]/);
  assert.match(intakeFailureSummary._telegramMessage, /CRM처리: 자동반영 실패/);
  assert.match(intakeFailureSummary._telegramMessage, /안내: 수동 확인 및 재처리가 필요합니다./);
  assert.doesNotMatch(intakeFailureSummary._telegramMessage, /입금 장애 경보/);
  assert.doesNotMatch(intakeFailureSummary._telegramMessage, /오류:/);

  var bankSummary = await runBankSummary(secureWithdrawalParsed);
  assert.match(bankSummary._telegramMessage, /ATM출금/);
  assert.doesNotMatch(bankSummary._telegramMessage, /거래점/);
  assert.doesNotMatch(bankSummary._telegramMessage, /거래은행/);

  assertWorkflowConnections();

  console.log('crm deposit parser regression tests passed');
}

main().catch(function(error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
