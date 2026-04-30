#!/usr/bin/env node
/**
 * 직접거래 과거 완납 명세표 출고확정 운영 CLI.
 *
 * 안전 원칙:
 * - dry-run은 읽기 전용입니다.
 * - apply는 각 건을 적용 직전 fresh read 후 재검증합니다.
 * - 민감한 memo 원문은 git 추적 보고서에 쓰지 않고 output/ 스냅샷에만 저장합니다.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const INVOICE_META_PREFIX = '[ACCOUNTING_INVOICE_META]'
const DEFAULT_PROXY_URL = 'https://n8n.pressco21.com/webhook/crm-proxy'
const DEFAULT_REPORT_DIR = 'offline-crm-v2/docs/reports'
const DEFAULT_SNAPSHOT_DIR = 'output/ops-snapshots/direct-trade-shipment-confirmation'
const PAGE_SIZE = 500
const ACTOR = 'crm-admin'
const APPLY_REASON = '과거 완납 출고확정 승인 적용'

function usage() {
  return `Usage:
  node offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs --dry-run [--output <json>]
  node offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs --apply [--output <json>] [--snapshot-output <json>] [--limit <n>]
  node offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs --verify [--output <json>]

Environment:
  CRM_API_KEY or VITE_CRM_API_KEY must be set.
  CRM_PROXY_URL or VITE_N8N_WEBHOOK_URL can override the proxy endpoint.
`
}

function parseArgs(argv) {
  const args = {
    mode: null,
    output: '',
    snapshotOutput: '',
    limit: Infinity,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') args.mode = 'dry-run'
    else if (arg === '--apply') args.mode = 'apply'
    else if (arg === '--verify') args.mode = 'verify'
    else if (arg === '--output') args.output = argv[++i] ?? ''
    else if (arg === '--snapshot-output') args.snapshotOutput = argv[++i] ?? ''
    else if (arg === '--limit') {
      const value = Number(argv[++i])
      args.limit = Number.isFinite(value) && value > 0 ? Math.trunc(value) : Infinity
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage())
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!args.mode) throw new Error('Mode is required. Use --dry-run, --apply, or --verify.')
  return args
}

function getProxyConfig() {
  const apiKey = process.env.CRM_API_KEY || process.env.VITE_CRM_API_KEY || ''
  const proxyUrl = process.env.CRM_PROXY_URL || process.env.VITE_N8N_WEBHOOK_URL || DEFAULT_PROXY_URL
  if (!apiKey) throw new Error('CRM_API_KEY or VITE_CRM_API_KEY is required.')
  if (!/^https?:\/\//.test(proxyUrl)) {
    throw new Error('CRM_PROXY_URL/VITE_N8N_WEBHOOK_URL must be an absolute URL for this CLI.')
  }
  return { apiKey, proxyUrl }
}

async function proxyRequest(config, req) {
  const res = await fetch(config.proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-key': config.apiKey,
    },
    body: JSON.stringify({
      table: req.table,
      method: req.method || 'GET',
      recordId: req.recordId,
      params: req.params,
      payload: req.payload,
      bulk: req.bulk,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Proxy Error ${res.status}: ${body.slice(0, 500)}`)
  }

  const json = await res.json()
  if (!json.success) {
    throw new Error(`[${json.error?.code || 'PROXY_ERROR'}] ${json.error?.message || 'Unknown proxy error'}`)
  }
  return json.data
}

async function fetchPaidInvoices(config) {
  const rows = []
  let offset = 0
  for (let page = 0; page < 200; page += 1) {
    const data = await proxyRequest(config, {
      table: 'invoices',
      params: {
        where: '(payment_status,eq,paid)',
        fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,status,total_amount,paid_amount,current_balance,payment_status,memo',
        sort: 'invoice_date,Id',
        limit: PAGE_SIZE,
        offset,
      },
    })
    const list = Array.isArray(data?.list) ? data.list : []
    rows.push(...list)
    if (data?.pageInfo?.isLastPage || list.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return rows
}

async function fetchInvoice(config, invoiceId) {
  return proxyRequest(config, {
    table: 'invoices',
    recordId: invoiceId,
  })
}

async function updateInvoiceMemo(config, invoiceId, memo) {
  return proxyRequest(config, {
    table: 'invoices',
    method: 'PATCH',
    recordId: invoiceId,
    payload: { memo },
  })
}

function amount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }
  return 0
}

function normalizeMemo(value) {
  return String(value ?? '').replace(/\r\n/g, '\n')
}

function parseInvoiceMeta(memo) {
  const metaLine = normalizeMemo(memo)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(INVOICE_META_PREFIX))

  if (!metaLine) return {}
  try {
    const parsed = JSON.parse(metaLine.slice(INVOICE_META_PREFIX.length).trim())
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return { __parseError: true }
  }
}

function stripInvoiceMetaLine(memo) {
  return normalizeMemo(memo)
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith(INVOICE_META_PREFIX))
}

function isIsoLike(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
}

function isDateLike(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function shortKey(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : undefined
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex')
}


function invoiceRef(invoiceNo) {
  const value = String(invoiceNo ?? '').trim()
  if (!value) return ''
  return `invref-${sha256(value).slice(0, 12)}`
}

function maskName(name) {
  const value = String(name ?? '').trim()
  if (!value) return ''
  if (value.length <= 2) return `${value[0] ?? ''}*`
  return `${value[0]}${'*'.repeat(Math.min(3, value.length - 2))}${value[value.length - 1]}`
}

function buildShipmentConfirmedMemo(memo, invoice, confirmedAt) {
  const meta = parseInvoiceMeta(memo)
  const invoiceId = Math.trunc(amount(invoice.Id))
  const revenueDate = confirmedAt.slice(0, 10)
  const idempotencyKey = shortKey(meta.salesLedgerIdempotencyKey) || `crm-invoice-${invoiceId}-shipment-confirmed`
  const beforeBase = {
    fulfillmentStatus: meta.fulfillmentStatus,
    revenuePostingStatus: meta.revenuePostingStatus,
    shipmentConfirmedAt: meta.shipmentConfirmedAt,
    revenuePostedAt: meta.revenuePostedAt,
  }
  const nextBase = {
    fulfillmentStatus: 'shipment_confirmed',
    revenuePostingStatus: 'posted',
    shipmentConfirmedAt: confirmedAt,
    revenuePostedAt: confirmedAt,
  }
  const governanceEvent = {
    opId: `${idempotencyKey}:${confirmedAt}`,
    action: 'bulk_shipment_confirm',
    actor: ACTOR,
    at: confirmedAt,
    source: 'migration',
    beforeHash: sha256(JSON.stringify(beforeBase)),
    afterHash: sha256(JSON.stringify(nextBase)),
    amount: Math.max(0, amount(invoice.total_amount)),
    relatedInvoiceId: invoiceId,
    relatedCustomerId: amount(invoice.customer_id) > 0 ? amount(invoice.customer_id) : undefined,
    reason: APPLY_REASON,
  }

  const governanceEvents = Array.isArray(meta.governanceEvents) ? meta.governanceEvents : []
  const nextMeta = {
    ...meta,
    depositUsedAmount: Math.max(0, amount(meta.depositUsedAmount)),
    discountAmount: Math.max(0, amount(meta.discountAmount)),
    fulfillmentStatus: 'shipment_confirmed',
    shipmentConfirmedAt: isIsoLike(confirmedAt) ? confirmedAt : new Date().toISOString(),
    revenueRecognizedDate: isDateLike(revenueDate) ? revenueDate : new Date().toISOString().slice(0, 10),
    revenuePostedAt: isIsoLike(confirmedAt) ? confirmedAt : new Date().toISOString(),
    revenuePostingStatus: 'posted',
    salesLedgerId: shortKey(meta.salesLedgerId) || `sales-ledger-${idempotencyKey}`,
    salesLedgerIdempotencyKey: idempotencyKey,
    taxInvoiceStatus: shortKey(meta.taxInvoiceStatus) || 'not_requested',
    governanceEvents: [...governanceEvents, governanceEvent],
  }
  delete nextMeta.__parseError

  return [...stripInvoiceMetaLine(memo), `${INVOICE_META_PREFIX} ${JSON.stringify(nextMeta)}`].join('\n').trim()
}

function classifyInvoice(invoice) {
  const meta = parseInvoiceMeta(invoice.memo)
  const totalAmount = amount(invoice.total_amount)
  const paidAmount = amount(invoice.paid_amount)
  const currentBalance = amount(invoice.current_balance)
  const depositUsedAmount = amount(meta.depositUsedAmount)
  const computedRemaining = Math.max(0, totalAmount - paidAmount - depositUsedAmount)
  const statusValues = [invoice.status, invoice.receipt_type, meta.fulfillmentStatus]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)

  const reasons = []
  if (amount(invoice.Id) <= 0) reasons.push('missing_id')
  if (String(invoice.payment_status ?? '').trim().toLowerCase() !== 'paid') reasons.push('payment_status_not_paid')
  if (totalAmount <= 0) reasons.push('invalid_total_amount')
  if (paidAmount < totalAmount) reasons.push('paid_amount_below_total')
  if (currentBalance !== 0 && computedRemaining !== 0) reasons.push('balance_not_zero')
  if (meta.fulfillmentStatus === 'shipment_confirmed') reasons.push('already_shipment_confirmed')
  if (meta.revenuePostingStatus === 'posted' && meta.fulfillmentStatus === 'shipment_confirmed') reasons.push('already_revenue_posted')
  if (statusValues.some((value) => ['voided', 'adjusted', 'cancelled', 'canceled', 'deleted'].includes(value))) {
    reasons.push('voided_or_adjusted')
  }
  if (meta.__parseError) reasons.push('invoice_meta_parse_error')

  return {
    eligible: reasons.length === 0,
    reasons,
    meta,
    amounts: {
      totalAmount,
      paidAmount,
      currentBalance,
      depositUsedAmount,
      computedRemaining,
    },
  }
}

function summarizeInvoices(rows) {
  const candidates = []
  const exclusions = {}
  const exclusionsByReasonExamples = {}
  let candidateTotalAmount = 0
  let candidatePaidAmount = 0
  let taxInvoiceImpactCount = 0
  const customerMap = new Map()

  for (const invoice of rows) {
    const classification = classifyInvoice(invoice)
    const totalAmount = classification.amounts.totalAmount
    const paidAmount = classification.amounts.paidAmount
    if (!classification.eligible) {
      for (const reason of classification.reasons) {
        exclusions[reason] = (exclusions[reason] || 0) + 1
        if (!exclusionsByReasonExamples[reason]) {
          exclusionsByReasonExamples[reason] = {
            id: invoice.Id,
            invoiceNoRef: invoiceRef(invoice.invoice_no),
            invoiceDate: invoice.invoice_date ?? '',
          }
        }
      }
      continue
    }

    const candidate = {
      id: amount(invoice.Id),
      invoiceNoRef: invoiceRef(invoice.invoice_no),
      invoiceDate: invoice.invoice_date ?? '',
      customerId: amount(invoice.customer_id) || null,
      customerNameMasked: maskName(invoice.customer_name),
      totalAmount,
      paidAmount,
      currentBalance: classification.amounts.currentBalance,
      computedRemaining: classification.amounts.computedRemaining,
      taxInvoiceStatus: classification.meta.taxInvoiceStatus || 'not_requested',
      expectedChanges: {
        fulfillmentStatus: 'shipment_confirmed',
        revenuePostingStatus: 'posted',
        taxInvoiceStatus: classification.meta.taxInvoiceStatus || 'not_requested',
        governanceEventAction: 'bulk_shipment_confirm',
      },
    }
    candidates.push(candidate)
    candidateTotalAmount += totalAmount
    candidatePaidAmount += paidAmount
    if (!classification.meta.taxInvoiceStatus || classification.meta.taxInvoiceStatus === 'not_requested') {
      taxInvoiceImpactCount += 1
    }

    const customerKey = `${candidate.customerId ?? 'unknown'}:${candidate.customerNameMasked}`
    const prev = customerMap.get(customerKey) || {
      customerId: candidate.customerId,
      customerNameMasked: candidate.customerNameMasked,
      count: 0,
      totalAmount: 0,
      paidAmount: 0,
    }
    prev.count += 1
    prev.totalAmount += totalAmount
    prev.paidAmount += paidAmount
    customerMap.set(customerKey, prev)
  }

  const customerGroups = [...customerMap.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount || b.count - a.count)

  return {
    totalRowsRead: rows.length,
    candidateCount: candidates.length,
    candidateTotalAmount,
    candidatePaidAmount,
    taxInvoiceImpactCount,
    exclusions,
    exclusionsByReasonExamples,
    customerGroups,
    sampleCandidates: candidates.slice(0, 20),
    candidates,
  }
}

function redactedConfig(config) {
  return {
    proxyHost: new URL(config.proxyUrl).host,
    proxyPath: new URL(config.proxyUrl).pathname,
    hasApiKey: true,
  }
}

function defaultOutputPath(mode, generatedAt) {
  const stamp = generatedAt.replace(/[:.]/g, '').replace('T', '-').slice(0, 17)
  return path.join(DEFAULT_REPORT_DIR, `direct-trade-shipment-${mode}-${stamp}.json`)
}

function defaultSnapshotPath(generatedAt) {
  const stamp = generatedAt.replace(/[:.]/g, '').replace('T', '-').slice(0, 17)
  return path.join(DEFAULT_SNAPSHOT_DIR, `apply-sensitive-snapshot-${stamp}.json`)
}

async function writeJson(filePath, data, mode = 0o644) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode })
}

async function runDryRun(config, output, modeLabel = 'dry-run') {
  const generatedAt = new Date().toISOString()
  const rows = await fetchPaidInvoices(config)
  const summary = summarizeInvoices(rows)
  const report = {
    reportType: `direct-trade-shipment-${modeLabel}`,
    generatedAt,
    mode: modeLabel,
    config: redactedConfig(config),
    safety: {
      dryRunReadOnly: true,
      applyRequiresFreshRead: true,
      memoOriginalsStoredInGit: false,
      piiMasking: 'customer_name_masked',
    },
    ...summary,
  }
  const outputPath = output || defaultOutputPath(modeLabel, generatedAt)
  await writeJson(outputPath, report)
  return { report, outputPath }
}

function summarizeForApply(report) {
  const byId = new Map()
  for (const candidate of report.candidates || []) {
    byId.set(Number(candidate.id), candidate)
  }
  return byId
}

async function runApply(config, output, snapshotOutput, limit) {
  const startedAt = new Date().toISOString()
  const { report: freshDryRun, outputPath: freshDryRunPath } = await runDryRun(config, '', 'fresh-dry-run-before-apply')
  const dryRunCandidatesById = summarizeForApply(freshDryRun)
  const candidateIds = [...dryRunCandidatesById.keys()].slice(0, limit)
  const results = []
  const sensitiveSnapshots = []

  for (const invoiceId of candidateIds) {
    const before = await fetchInvoice(config, invoiceId)
    const classification = classifyInvoice(before)
    if (!classification.eligible) {
      results.push({
        id: invoiceId,
        status: 'skipped',
        reasons: classification.reasons,
        beforeHash: sha256(before.memo ?? ''),
      })
      continue
    }

    const confirmedAt = new Date().toISOString()
    const nextMemo = buildShipmentConfirmedMemo(before.memo, before, confirmedAt)
    const beforeMemoHash = sha256(before.memo ?? '')
    const afterMemoHash = sha256(nextMemo)

    try {
      await updateInvoiceMemo(config, invoiceId, nextMemo)
      const after = await fetchInvoice(config, invoiceId)
      const afterMeta = parseInvoiceMeta(after.memo)
      const verified = afterMeta.fulfillmentStatus === 'shipment_confirmed' && afterMeta.revenuePostingStatus === 'posted'
      results.push({
        id: invoiceId,
        invoiceNoRef: invoiceRef(before.invoice_no),
        invoiceDate: before.invoice_date ?? '',
        customerId: amount(before.customer_id) || null,
        customerNameMasked: maskName(before.customer_name),
        totalAmount: amount(before.total_amount),
        status: verified ? 'applied_verified' : 'applied_verify_failed',
        beforeMemoHash,
        afterMemoHash,
        confirmedAt,
        verification: {
          fulfillmentStatus: afterMeta.fulfillmentStatus,
          revenuePostingStatus: afterMeta.revenuePostingStatus,
          taxInvoiceStatus: afterMeta.taxInvoiceStatus || 'not_requested',
        },
      })
      sensitiveSnapshots.push({
        id: invoiceId,
        invoiceNo: before.invoice_no ?? '',
        beforeMemo: before.memo ?? '',
        afterMemo: nextMemo,
        beforeMemoHash,
        afterMemoHash,
        confirmedAt,
      })
    } catch (error) {
      results.push({
        id: invoiceId,
        invoiceNoRef: invoiceRef(before.invoice_no),
        status: 'failed',
        beforeMemoHash,
        afterMemoHash,
        error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      })
    }
  }

  const verificationDryRun = await runDryRun(config, '', 'post-apply-verify-dry-run')
  const finishedAt = new Date().toISOString()
  const statusCounts = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
  const applyReport = {
    reportType: 'direct-trade-shipment-apply',
    startedAt,
    finishedAt,
    mode: 'apply',
    config: redactedConfig(config),
    safety: {
      freshDryRunPath,
      postApplyDryRunPath: verificationDryRun.outputPath,
      sensitiveSnapshotCommitted: false,
      applyReason: APPLY_REASON,
      actor: ACTOR,
    },
    freshDryRunCandidateCount: freshDryRun.candidateCount,
    appliedAttemptCount: results.length,
    statusCounts,
    postApplyCandidateCount: verificationDryRun.report.candidateCount,
    taxInvoiceImpactCountBeforeApply: freshDryRun.taxInvoiceImpactCount,
    remainingCandidateSample: verificationDryRun.report.sampleCandidates,
    results,
  }

  const outputPath = output || defaultOutputPath('apply', startedAt)
  const snapshotPath = snapshotOutput || defaultSnapshotPath(startedAt)
  await writeJson(outputPath, applyReport)
  await writeJson(snapshotPath, {
    reportType: 'direct-trade-shipment-apply-sensitive-snapshot',
    startedAt,
    finishedAt,
    note: '민감한 memo 원문이 포함되어 git commit 대상이 아닙니다. rollback/감사 확인용 로컬 스냅샷입니다.',
    entries: sensitiveSnapshots,
  }, 0o600)

  return { report: applyReport, outputPath, snapshotPath }
}

async function main() {
  const args = parseArgs(process.argv)
  const config = getProxyConfig()

  if (args.mode === 'dry-run' || args.mode === 'verify') {
    const { report, outputPath } = await runDryRun(config, args.output, args.mode)
    console.log(JSON.stringify({
      ok: true,
      mode: args.mode,
      outputPath,
      totalRowsRead: report.totalRowsRead,
      candidateCount: report.candidateCount,
      candidateTotalAmount: report.candidateTotalAmount,
      taxInvoiceImpactCount: report.taxInvoiceImpactCount,
      exclusions: report.exclusions,
    }, null, 2))
    return
  }

  if (args.mode === 'apply') {
    const { report, outputPath, snapshotPath } = await runApply(config, args.output, args.snapshotOutput, args.limit)
    console.log(JSON.stringify({
      ok: true,
      mode: args.mode,
      outputPath,
      snapshotPath,
      freshDryRunCandidateCount: report.freshDryRunCandidateCount,
      appliedAttemptCount: report.appliedAttemptCount,
      statusCounts: report.statusCounts,
      postApplyCandidateCount: report.postApplyCandidateCount,
    }, null, 2))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
