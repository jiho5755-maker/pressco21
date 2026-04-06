'use strict';

function buildCrmDepositParserCode() {
  return String.raw`
const SECURE_MAIL_PASSWORD = '610227';

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|p|div|li|td|th|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\r/g, '')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

function parseAmount(value) {
  const parsed = Number(String(value ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function normalizeDateOnly(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (!match) return '';
  return match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0');
}

function formatOccurredAt(dateOnly, fallbackDate) {
  if (!dateOnly) {
    const fallback = new Date(fallbackDate || Date.now());
    return fallback.toISOString();
  }
  const fallback = fallbackDate ? new Date(fallbackDate) : new Date();
  const hour = String(Number.isFinite(fallback.getHours()) ? fallback.getHours() : 0).padStart(2, '0');
  const minute = String(Number.isFinite(fallback.getMinutes()) ? fallback.getMinutes() : 0).padStart(2, '0');
  const second = String(Number.isFinite(fallback.getSeconds()) ? fallback.getSeconds() : 0).padStart(2, '0');
  return dateOnly + 'T' + hour + ':' + minute + ':' + second + '+09:00';
}

function parsePlainSender(text) {
  const patterns = [
    /입금자명[:\s]*([^\n|/]+)/i,
    /보낸분[:\s]*([^\n|/]+)/i,
    /의뢰인[:\s]*([^\n|/]+)/i,
    /보내는분[:\s]*([^\n|/]+)/i,
    /예금주[:\s]*([^\n|/]+)/i,
    /받는분[:\s]*([^\n|/]+)/i,
    /기록사항[:\s]*([^\n|/]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return String(match[1]).trim();
  }
  return '';
}

function parsePlainOccurredAt(text, fallbackDate) {
  const patterns = [
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const hour = match[4].padStart(2, '0');
    const minute = match[5].padStart(2, '0');
    const second = String(match[6] ?? '00').padStart(2, '0');
    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + '+09:00';
  }
  const date = new Date(fallbackDate || Date.now());
  return date.toISOString();
}

function isVestMailSecureHtml(value) {
  const text = String(value ?? '');
  return text.includes('VestMail') || text.includes('YettieSoft') || text.includes('window.doAction=N') || text.includes('doAction()') || text.includes('fnLoadEncMail');
}

function decryptVestMailSecureHtml(secureHtml, password) {
  const scripts = [...String(secureHtml).matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  if (scripts.length === 0) return '';

  class Element {
    constructor(id = '') {
      this.id = id;
      this.style = {};
      this.children = [];
      this.innerHTML = '';
      this.value = '';
      this.parentNode = { removeChild: () => {} };
      this.contentWindow = {
        document: {
          open() {},
          write(value) { this._written = value; },
          close() {},
          body: { scrollHeight: 0, scrollWidth: 0 },
        },
      };
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
    }
  }

  const elements = new Map();
  function getElement(id) {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  }

  ['password', 'inputform', '__p', 'org', 'pop_content', 'ly_header', 'ly_body2', 'noscript', 'progressdlg'].forEach(getElement);
  const body = new Element('body');
  const document = {
    body,
    documentElement: { lang: 'ko' },
    getElementById(id) { return getElement(id); },
    createElement(tag) { return new Element(tag); },
    write(value) { this._written = (this._written || '') + value; },
    close() {},
  };

  const timers = [];
  const context = {
    console,
    document,
    navigator: {
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 Chrome/122.0.0.0',
      language: 'ko-KR',
      browserLanguage: 'ko-KR',
      userLanguage: 'ko-KR',
    },
    location: { href: '' },
    URL: {
      createObjectURL(blob) {
        context.__blob = blob;
        return 'blob:vestmail';
      },
    },
    Blob: globalThis.Blob ?? class BlobMock {
      constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type ?? '';
      }
    },
    Uint8Array: globalThis.Uint8Array,
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    alert: (message) => {
      context.__alerts = (context.__alerts || []).concat([String(message ?? '')]);
    },
    setTimeout: (fn) => {
      if (typeof fn === 'function') timers.push(fn);
      return timers.length;
    },
    clearTimeout: () => {},
    decodeURI,
    unescape,
    escape,
    PDFView: undefined,
    vestmail_onstart: () => {},
    vestmail_onend: () => {},
    event: { keyCode: 13 },
    org: getElement('org'),
    pop_content: getElement('pop_content'),
  };

  context.window = context;
  context.self = context;

  const boot = new Function('context', 'with (context) { ' + scripts.join('\n') + '; return window.doAction; }');
  const doAction = boot(context);
  if (typeof doAction !== 'function') return '';

  getElement('password').value = String(password ?? '');
  doAction();

  let steps = 0;
  while (timers.length && steps < 200) {
    const task = timers.shift();
    task();
    steps += 1;
  }

  return String(document._written ?? '');
}

function normalizeDirection(kind) {
  const text = String(kind ?? '').trim();
  if (text.includes('입금')) return 'deposit';
  if (text.includes('출금')) return 'withdrawal';
  return '';
}

function isTransactionRowHeader(value) {
  return /^\d+\s+\d{4}[/-]\d{2}[/-]\d{2}$/.test(String(value ?? '').trim());
}

function isTransactionTableLabel(value) {
  return [
    '조회건수',
    '거래일',
    '구분',
    '거래금액',
    '거래후 잔액',
    '거래점',
    '거래은행',
    '기록사항',
  ].includes(String(value ?? '').trim());
}

function collectTransactionTail(lines, startIndex) {
  const tail = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const candidate = String(lines[startIndex + offset] ?? '').trim();
    if (!candidate) continue;
    if (isTransactionRowHeader(candidate) || isTransactionTableLabel(candidate)) break;
    tail.push(candidate);
  }
  return tail;
}

function buildTransactionNote(recordText, branch, bank, balanceText) {
  const parts = [];
  if (recordText) parts.push(recordText);
  if (branch) parts.push('거래점 ' + branch);
  if (bank) parts.push('거래은행 ' + bank);
  if (balanceText) parts.push('잔액 ' + balanceText);
  return parts.join(' / ');
}

function extractTransactionsFromTableText(text, fallbackDate, subject, messageId, from) {
  const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  const transactions = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rowHeader = lines[index];
    const headerMatch = rowHeader.match(/^(\d+)\s+(\d{4}[/-]\d{2}[/-]\d{2})$/);
    if (!headerMatch) continue;

    const kindLabel = lines[index + 1] ?? '';
    const direction = normalizeDirection(kindLabel);
    const amountText = lines[index + 2] ?? '';
    const balanceText = lines[index + 3] ?? '';
    const tail = collectTransactionTail(lines, index + 4);
    const branch = tail[0] ?? '';
    const bank = tail.length >= 3 ? tail[1] : '';
    const recordText = tail.length >= 3
      ? tail.slice(2).join(' / ')
      : (tail.length >= 2 ? tail.slice(1).join(' / ') : (tail[0] ?? ''));
    const party = recordText || tail[tail.length - 1] || '';
    if (!direction || !party) continue;

    const amount = parseAmount(amountText);
    if (amount <= 0) continue;

    const occurredDate = normalizeDateOnly(headerMatch[2]);
    transactions.push({
      direction,
      party,
      sender: direction === 'deposit' ? party : '',
      amount,
      occurredAt: formatOccurredAt(occurredDate, fallbackDate),
      balance: parseAmount(balanceText),
      bank,
      branch,
      note: buildTransactionNote(recordText, branch, bank, balanceText) || subject,
      externalId: (messageId || 'secure-mail') + '-' + headerMatch[1],
      rawFrom: from,
      rawSubject: subject,
      secureMailType: 'tabular_mail',
      kindLabel,
    });
  }

  return transactions;
}

function extractTransactionsFromSecureMailContent(decryptedHtml, fallbackDate, subject, messageId, from) {
  return extractTransactionsFromTableText(stripHtml(decryptedHtml), fallbackDate, subject, messageId, from).map((entry) => ({
    ...entry,
    secureMailType: 'vestmail_attachment',
  }));
}

function extractPlainTransactions(text, fallbackDate, subject, messageId, from) {
  const tabularTransactions = extractTransactionsFromTableText(text, fallbackDate, subject, messageId, from).map((entry) => ({
    ...entry,
    secureMailType: 'plain_table_mail',
  }));
  if (tabularTransactions.length > 0) return tabularTransactions;

  const sender = parsePlainSender(text);
  const direction = /출금/i.test(text) ? 'withdrawal' : (/입금/i.test(text) ? 'deposit' : '');
  const amountPatterns = [
    /입금(?:금액)?[:\s]*([0-9,]+)\s*원?/i,
    /출금(?:금액)?[:\s]*([0-9,]+)\s*원?/i,
    /거래금액[:\s]*([0-9,]+)\s*원?/i,
    /금액[:\s]*([0-9,]+)\s*원?/i,
    /([0-9,]+)\s*원\s*(?:입금|출금)/i,
  ];
  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseAmount(match[1]);
      break;
    }
  }
  const balancePatterns = [
    /(?:입금후|출금후|거래후)?잔액[:\s]*([0-9,]+)\s*원?/i,
    /balance[:\s]*([0-9,]+)/i,
  ];
  let balance = 0;
  for (const pattern of balancePatterns) {
    const match = text.match(pattern);
    if (match) {
      balance = parseAmount(match[1]);
      break;
    }
  }
  if (!sender || amount <= 0 || !direction) return [];
  return [{
    direction,
    party: sender,
    sender: direction === 'deposit' ? sender : '',
    amount,
    occurredAt: parsePlainOccurredAt(text, fallbackDate),
    balance,
    bank: '',
    branch: '',
    note: subject,
    externalId: messageId || ('email-' + Date.now() + '-' + amount),
    rawFrom: from,
    rawSubject: subject,
    secureMailType: 'plain_mail',
    kindLabel: direction === 'deposit' ? '입금' : '출금',
  }];
}

const item = $input.first();
const emailJson = item.json ?? {};
const binary = item.binary ?? {};
const subject = String(emailJson.subject ?? '');
const from = String(emailJson.from?.text ?? emailJson.from ?? '');
const messageId = String(emailJson.messageId ?? emailJson['message-id'] ?? emailJson.attributes?.uid ?? '');
const fallbackDate = emailJson.date;
const htmlBody = String(emailJson.html ?? emailJson.textHtml ?? '');
const attachmentNames = Object.entries(binary).map(([binaryKey, binaryValue]) => String(binaryValue.fileName ?? binaryKey ?? '')).filter(Boolean);
const wrapperHtmlDetected = htmlBody.includes('농협 통합 메시징 서비스') || htmlBody.includes('보안 메일');
const isNhMail = /webmaster@ums\.nonghyup\.com/i.test(from)
  || /농협에서 제공하는 입출금 거래내역/i.test(subject)
  || wrapperHtmlDetected
  || attachmentNames.some((name) => /message\.html/i.test(name));

let secureHtml = '';
const directHtmlCandidates = [
  String(emailJson.textHtml ?? ''),
  String(emailJson.html ?? ''),
  String(emailJson.text ?? ''),
];

for (const candidate of directHtmlCandidates) {
  if (candidate && isVestMailSecureHtml(candidate)) {
    secureHtml = candidate;
    break;
  }
}

if (!secureHtml) {
  const binaryItemIndex = typeof $itemIndex === 'number' ? $itemIndex : 0;
  for (const [binaryKey, binaryValue] of Object.entries(binary)) {
    const fileName = String(binaryValue.fileName ?? binaryKey ?? '');
    const mimeType = String(binaryValue.mimeType ?? '');
    let attachmentText = '';
    const rawData = typeof binaryValue.data === 'string' ? binaryValue.data : '';
    if (rawData === 'filesystem-v2') {
      const binaryHelpers = typeof helpers === 'object' && helpers ? helpers : (typeof this === 'object' && this && typeof this.helpers === 'object' ? this.helpers : null);
      try {
        if (binaryHelpers && typeof binaryHelpers.getBinaryDataBuffer === 'function') {
          const buffer = await binaryHelpers.getBinaryDataBuffer(binaryItemIndex, binaryKey);
          attachmentText = Buffer.from(buffer).toString('utf8');
        }
      } catch {}
      if (!attachmentText) {
        try {
          const fileId = String(binaryValue.id ?? '');
          let filePath = '';
          if (binaryHelpers && typeof binaryHelpers.getBinaryPath === 'function') {
            filePath = String(await binaryHelpers.getBinaryPath(binaryItemIndex, binaryKey) ?? '');
          }
          if (!filePath && fileId.startsWith('filesystem-v2:')) {
            filePath = '/home/node/.n8n/storage/' + fileId.slice('filesystem-v2:'.length);
          }
          const localRequire = typeof require === 'function' ? require : null;
          if (filePath && localRequire) {
            const fs = localRequire('fs');
            attachmentText = fs.readFileSync(filePath, 'utf8');
          }
        } catch {}
      }
    } else if (rawData) {
      attachmentText = Buffer.from(rawData, 'base64').toString('utf8');
    }
    if (!attachmentText) continue;
    if ((fileName.toLowerCase().endsWith('.html') || mimeType.includes('text/html')) && isVestMailSecureHtml(attachmentText)) {
      secureHtml = attachmentText;
      break;
    }
  }
}

let decryptedHtml = '';
let transactions = [];
if (secureHtml) {
  decryptedHtml = decryptVestMailSecureHtml(secureHtml, SECURE_MAIL_PASSWORD);
  if (decryptedHtml) {
    transactions = extractTransactionsFromSecureMailContent(decryptedHtml, fallbackDate, subject, messageId, from);
  }
}

if (transactions.length === 0) {
  const textPlain = String(emailJson.textPlain ?? emailJson.text ?? '');
  const textHtml = String(emailJson.textHtml ?? emailJson.html ?? '');
  const mergedText = [subject, stripHtml(textPlain), stripHtml(textHtml)].filter(Boolean).join('\n');
  transactions = extractPlainTransactions(mergedText, fallbackDate, subject, messageId, from);
}

let parseFailureReason = '';
if (isNhMail && transactions.length === 0) {
  if (!secureHtml && attachmentNames.length > 0) {
    parseFailureReason = 'secure_attachment_not_loaded';
  } else if (secureHtml && !decryptedHtml) {
    parseFailureReason = 'secure_mail_decrypt_failed';
  } else if (secureHtml && decryptedHtml) {
    parseFailureReason = 'secure_mail_no_transactions';
  } else {
    parseFailureReason = 'plain_mail_no_transactions';
  }
}

console.log('[WF-CRM-02 parser]', JSON.stringify({
  subject,
  messageId,
  from,
  binaryKeys: Object.keys(binary),
  attachmentNames,
  directSecureHtml: Boolean(secureHtml && directHtmlCandidates.some((candidate) => candidate && candidate === secureHtml)),
  secureHtmlDetected: Boolean(secureHtml),
  decryptedHtmlDetected: Boolean(decryptedHtml),
  transactionsCount: transactions.length,
  depositsCount: transactions.filter((entry) => entry.direction === 'deposit').length,
  isNhMail,
  parseFailureReason,
}));

const deposits = transactions.filter((entry) => entry.direction === 'deposit').map((entry) => ({
  sender: entry.sender || entry.party || '',
  amount: entry.amount,
  occurredAt: entry.occurredAt,
  balance: Number(entry.balance || 0) || 0,
  note: entry.note,
  externalId: entry.externalId,
  rawFrom: entry.rawFrom,
  rawSubject: entry.rawSubject,
  secureMailType: entry.secureMailType,
}));

return [{
  json: {
    source: secureHtml ? 'email_secure_mail' : 'email_imap',
    transactions,
    deposits,
    messageId,
    subject,
    from,
    binaryKeys: Object.keys(binary),
    attachmentNames,
    directSecureHtml: Boolean(secureHtml && directHtmlCandidates.some((candidate) => candidate && candidate === secureHtml)),
    secureHtmlDetected: Boolean(secureHtml),
    decryptedHtmlDetected: Boolean(decryptedHtml),
    wrapperHtmlDetected,
    isNhMail,
    parseFailure: Boolean(isNhMail && transactions.length === 0),
    parseFailureReason,
  },
}];
  `.trim();
}

function buildCrmDepositTelegramSummaryCode() {
  return String.raw`
const parsed = $('Code: Record Intake Ledger').first().json || {};
const intake = $('HTTP Call Intake Engine').first().json || {};
const accountLabel = String($env.PRESSCO_BANK_ALERT_ACCOUNT_LABEL || $env.PRESSCO_BANK_ACCOUNT_LABEL || '농협 093-01-264177').trim();
const deposits = Array.isArray(parsed.deposits) ? parsed.deposits : [];
const exactActions = Array.isArray(intake.exactActions) ? intake.exactActions : [];
const duplicateEntries = Array.isArray(intake.duplicateEntries) ? intake.duplicateEntries : [];
const reviewEntries = Array.isArray(intake.reviewEntries) ? intake.reviewEntries : [];
const unmatchedEntries = Array.isArray(intake.unmatchedEntries) ? intake.unmatchedEntries : [];
const summary = intake.summary && typeof intake.summary === 'object' ? intake.summary : null;
const intakeErrorMessage = [
  intake.error,
  intake.errorMessage,
  intake.message,
  intake.reason,
  intake.description,
].find((value) => String(value ?? '').trim()) || '';
const intakeFailed = deposits.length > 0 && (!summary || Boolean(String(intakeErrorMessage).trim()));
const staticData = $getWorkflowStaticData('global');
const sentMap = staticData.presscoCrmTelegramSent || {};
const failureLog = Array.isArray(staticData.presscoCrmFailureLog) ? staticData.presscoCrmFailureLog : [];

function formatAmount(value) { return (Number(value) || 0).toLocaleString() + '원'; }
function formatDate(value) { return String(value || '').replace('T', ' ').slice(0, 16) || '-'; }
function summarizeCandidates(entry) {
  const candidates = Array.isArray(entry?.candidates)
    ? entry.candidates.slice(0, 2).map((candidate) => candidate.customerName || candidate.invoiceNo || candidate.kind).filter(Boolean)
    : [];
  return candidates.length > 0 ? '후보 ' + candidates.join(', ') : '';
}
function appendFailureLog(kind, payload) {
  failureLog.push({
    kind,
    loggedAt: new Date().toISOString(),
    ...payload,
  });
  if (failureLog.length > 200) {
    failureLog.splice(0, failureLog.length - 200);
  }
  staticData.presscoCrmFailureLog = failureLog;
}
function buildEventKey(entry) {
  const externalId = String(entry?.externalId || '').trim();
  if (externalId) return externalId;
  const party = String(entry?.sender || entry?.party || '').trim();
  return [
    String(parsed._messageKey || parsed.messageId || 'unknown').trim(),
    String(entry?.direction || 'deposit').trim(),
    party,
    String(Number(entry?.amount || 0) || 0),
    String(entry?.occurredAt || '').trim(),
  ].join('::');
}
if (deposits.length === 0) {
  return [];
}

const leadEntry = deposits[0] || {};
const leadSender = String(leadEntry.sender || '미상').trim() || '미상';
const depositKey = deposits.map((entry) => entry.externalId || [entry.sender || '', entry.amount || 0, entry.occurredAt || ''].join(':')).join('|');
const summaryKey = intakeFailed
  ? ['crm-intake-error', parsed.messageId || leadEntry.externalId || 'unknown', leadEntry.amount || 0].join('::')
  : ['crm', parsed.source || intake.source || 'unknown', depositKey].join('::');
if (sentMap[summaryKey]) {
  return [];
}
if (!intakeFailed && duplicateEntries.length > 0 && exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length === 0) {
  return [];
}

const lines = [
  intakeFailed ? '[입금 장애 경보]' : '[입금 알림]',
  '',
  '계좌: ' + accountLabel,
  '입금자: ' + leadSender,
  '입금별칭추천: ' + leadSender,
  '입금액: ' + formatAmount(leadEntry.amount),
  '거래일시: ' + formatDate(leadEntry.occurredAt),
];
if (Number(leadEntry.balance) > 0) {
  lines.push('통장잔액: ' + formatAmount(leadEntry.balance));
}
if (String(leadEntry.note || '').trim()) {
  lines.push('기록: ' + String(leadEntry.note).trim());
}
if (deposits.length > 1) {
  lines.push('추가입금: ' + String(deposits.length - 1) + '건');
}

let crmResult = 'accepted';
if (intakeFailed) {
  const errorText = String(intakeErrorMessage || '').trim() || '자동반영 엔진 응답이 비정상입니다.';
  lines.push('CRM처리: intake 실패');
  lines.push('메시지ID: ' + String(parsed.messageId || leadEntry.externalId || '-'));
  lines.push('안내: 수동 확인 및 재처리가 필요합니다.');
  lines.push('오류: ' + errorText.slice(0, 240));
  appendFailureLog('intake_failure', {
    messageId: parsed.messageId || '',
    subject: parsed.subject || '',
    from: parsed.from || '',
    sender: leadSender,
    amount: Number(leadEntry.amount || 0) || 0,
    occurredAt: leadEntry.occurredAt || '',
    error: errorText,
  });
  crmResult = 'intake_failure';
}

if (!intakeFailed && exactActions.length > 0) {
  const entry = exactActions[0];
  const target = entry.kind === 'invoice'
    ? (entry.invoiceNo ? '명세표 ' + entry.invoiceNo : 'CRM 명세표')
    : '기존 장부';
  lines.push('CRM처리: 자동반영 완료');
  lines.push('안내: ' + (entry.customerName || entry.sender || '미상') + ' / ' + target + ' 반영');
  crmResult = 'exact';
}

if (!intakeFailed && exactActions.length === 0 && reviewEntries.length > 0) {
  const entry = reviewEntries[0];
  const candidateText = summarizeCandidates(entry);
  lines.push('CRM처리: 검토 필요');
  lines.push('안내: ' + (candidateText || String(entry.reason || '수동 확인이 필요합니다.').trim()));
  crmResult = 'review';
}

if (!intakeFailed && exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length > 0) {
  const entry = unmatchedEntries[0];
  lines.push('CRM처리: 미매칭');
  lines.push('안내: ' + (String(entry.reason || '').trim() || '정확히 일치하는 고객 미수 금액을 찾지 못했습니다.'));
  crmResult = 'unmatched';
}

if (!intakeFailed && exactActions.length === 0 && reviewEntries.length === 0 && unmatchedEntries.length === 0) {
  lines.push('CRM처리: 접수 완료');
  lines.push('안내: 자동화 엔진 응답을 확인하지 못해 운영 로그 점검이 필요합니다.');
}

return [{
  json: {
    _telegramMessage: lines.join('\n'),
    _summaryKey: summaryKey,
    _messageKey: String(parsed._messageKey || parsed.messageId || 'unknown').trim(),
    _eventKeys: deposits.map((entry) => buildEventKey(entry)),
    _crmResult: crmResult,
    _intakeFailed: intakeFailed,
    _intakeError: String(intakeErrorMessage || '').trim(),
  },
}];
  `.trim();
}

function buildCrmBankEventSummaryCode() {
  return String.raw`
const parsed = $('Code: Record Intake Ledger').first().json || {};
const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
const bankOnlyTransactions = transactions.filter((entry) => String(entry.direction || '').trim() !== 'deposit');
const accountLabel = String($env.PRESSCO_BANK_ALERT_ACCOUNT_LABEL || $env.PRESSCO_BANK_ACCOUNT_LABEL || '농협 093-01-264177').trim();
const summaryKey = ['bank-events', parsed.source || 'unknown', bankOnlyTransactions.map((entry) => entry.externalId || [entry.direction || '', entry.party || entry.sender || '', entry.amount || 0, entry.occurredAt || ''].join(':')).join('|')].join('::');
const staticData = $getWorkflowStaticData('global');
const sentMap = staticData.presscoBankTelegramSent || {};
function formatAmount(value) { return (Number(value) || 0).toLocaleString() + '원'; }
function formatDate(value) { return String(value || '').replace('T', ' ').slice(0, 16) || '-'; }
function directionLabel(value) { return value === 'withdrawal' ? '출금' : (value === 'deposit' ? '입금' : '거래'); }
function buildEventKey(entry) {
  const externalId = String(entry?.externalId || '').trim();
  if (externalId) return externalId;
  const party = String(entry?.sender || entry?.party || '').trim();
  return [
    String(parsed._messageKey || parsed.messageId || 'unknown').trim(),
    String(entry?.direction || '').trim(),
    party,
    String(Number(entry?.amount || 0) || 0),
    String(entry?.occurredAt || '').trim(),
  ].join('::');
}
if (bankOnlyTransactions.length === 0 || sentMap[summaryKey]) {
  return [];
}
const lines = [
  '[은행 거래 알림]',
  '',
  '계좌: ' + accountLabel,
];
bankOnlyTransactions.slice(0, 5).forEach((entry) => {
  const label = directionLabel(entry.direction);
  const party = String(entry.party || entry.sender || '미상').trim() || '미상';
  const detail = String(entry.note || '').trim();
  const suffixParts = [];
  if (entry.balance) suffixParts.push('잔액 ' + formatAmount(entry.balance));
  if (detail) suffixParts.push(detail);
  const suffix = suffixParts.length > 0 ? ' / ' + suffixParts.join(' / ') : '';
  lines.push('- [' + label + '] ' + party + ' / ' + formatAmount(entry.amount) + ' / ' + formatDate(entry.occurredAt) + suffix);
});
if (bankOnlyTransactions.length > 5) {
  lines.push('', '... 외 ' + String(bankOnlyTransactions.length - 5) + '건');
}
return [{
  json: {
    _telegramMessage: lines.join('\n'),
    _summaryKey: summaryKey,
    _messageKey: String(parsed._messageKey || parsed.messageId || 'unknown').trim(),
    _eventKeys: bankOnlyTransactions.map((entry) => buildEventKey(entry)),
  },
}];
  `.trim();
}

module.exports = {
  buildCrmBankEventSummaryCode,
  buildCrmDepositParserCode,
  buildCrmDepositTelegramSummaryCode,
};
