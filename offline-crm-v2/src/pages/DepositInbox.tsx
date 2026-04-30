import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAllCustomers, getAllInvoices, getCustomer, updateCustomer, updateInvoice, recalcCustomerStats } from '@/lib/api'
import type { Invoice } from '@/lib/api'
import {
  getFiscalBalanceSnapshots,
  getLegacyCustomerSnapshots,
  getLegacyReceivableBaselineFromSnapshots,
  parseLegacyReceivableMemo,
  serializeLegacyReceivableMemo,
} from '@/lib/legacySnapshots'
import {
  appendCustomerAccountingEvent,
  appendInvoicePaymentHistory,
  parseCustomerAccountingMeta,
} from '@/lib/accountingMeta'
import { loadActiveWorkOperatorProfile, loadStoredCrmSettings } from '@/lib/settings'
import {
  buildCustomerReceivableLedger,
  buildResolvedReceivableInvoices,
  getInvoiceRemainingAmount,
  getInvoiceSettlementStatus,
} from '@/lib/receivables'
import {
  buildAutoDepositMatchResults,
  dismissAutoDepositReviewQueueItem,
  listAutoDepositReviewQueue,
  loadAutoDepositInbox,
  parseAutoDepositFile,
  saveAutoDepositInbox,
  type AutoDepositCandidate,
  type AutoDepositInboxEntry,
  type AutoDepositMatchedEntry,
  type AutoDepositReviewQueueItem,
} from '@/lib/autoDeposits'

type LocalInboxFilter = 'all' | AutoDepositMatchedEntry['status']

interface DepositInboxProps {
  titleOverride?: string
  descriptionOverride?: string
}

const LOCAL_STATUS_LABELS: Record<AutoDepositMatchedEntry['status'], string> = {
  exact: '정확 후보',
  review: '검토 필요',
  unmatched: '미매칭',
  applied: '반영 완료',
  manual_completed: '수동 완료',
  dismissed: '제외 완료',
  held: '보류',
}

function getLocalStatusClass(status: AutoDepositMatchedEntry['status']): string {
  if (status === 'exact') return 'bg-emerald-100 text-emerald-700'
  if (status === 'review') return 'bg-amber-100 text-amber-700'
  if (status === 'applied') return 'bg-blue-100 text-blue-700'
  if (status === 'manual_completed') return 'bg-violet-100 text-violet-700'
  if (status === 'dismissed') return 'bg-slate-200 text-slate-700'
  if (status === 'held') return 'bg-orange-100 text-orange-700'
  return 'bg-slate-100 text-slate-600'
}
function todayDate(): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

function currentTimestamp(): string {
  return new Date().toISOString()
}

function calcRemaining(inv: Invoice): number {
  return getInvoiceRemainingAmount(inv)
}

function calcPaymentStatus(inv: Invoice): 'paid' | 'partial' | 'unpaid' {
  return getInvoiceSettlementStatus(inv)
}

function getInvoiceDate(inv: Invoice): string {
  return inv.invoice_date?.slice(0, 10) ?? ''
}

function sortInvoicesForSettlement(invoices: Invoice[], preferredInvoiceId?: number): Invoice[] {
  return [...invoices].sort((left, right) => {
    if (preferredInvoiceId) {
      if (left.Id === preferredInvoiceId && right.Id !== preferredInvoiceId) return -1
      if (right.Id === preferredInvoiceId && left.Id !== preferredInvoiceId) return 1
    }
    const dateCompare = getInvoiceDate(left).localeCompare(getInvoiceDate(right))
    if (dateCompare !== 0) return dateCompare
    return left.Id - right.Id
  })
}

function isInvoiceEligibleForDepositDate(inv: Invoice, entryDate: string, preferredInvoiceId?: number): boolean {
  if (preferredInvoiceId && inv.Id === preferredInvoiceId) return true
  const invoiceDate = getInvoiceDate(inv)
  if (!invoiceDate || !entryDate) return true
  return invoiceDate <= entryDate
}

function getAutoDepositSourceLabel(value: string | undefined): string {
  if (value === 'bank_api') return '은행 API 연동'
  if (value === 'email_secure_mail') return 'Gmail 보안메일 연동'
  if (value === 'review_only') return '검토 전용 연결'
  return '수동 파일 업로드'
}

export function DepositInbox({ titleOverride, descriptionOverride }: DepositInboxProps = {}) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [entries, setEntries] = useState<AutoDepositInboxEntry[]>(() => loadAutoDepositInbox())
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({})
  const [selectedReviewCandidates, setSelectedReviewCandidates] = useState<Record<string, string>>({})
  const [isApplyingKey, setIsApplyingKey] = useState<string | null>(null)
  const [isResolvingReviewKey, setIsResolvingReviewKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<LocalInboxFilter>('all')
  const [search, setSearch] = useState('')
  const activeOperator = loadActiveWorkOperatorProfile()
  const settings = loadStoredCrmSettings()
  const { data: customers = [] } = useQuery({
    queryKey: ['deposit-inbox-customers'],
    queryFn: () => getAllCustomers({ sort: 'name' }),
  })
  const { data: invoices = [] } = useQuery({
    queryKey: ['deposit-inbox-invoices'],
    queryFn: () => getAllInvoices({ sort: '-invoice_date' }),
  })
  const { data: legacySnapshots } = useQuery({
    queryKey: ['deposit-inbox-legacy-snapshots'],
    queryFn: getLegacyCustomerSnapshots,
    staleTime: 60 * 60 * 1000,
  })
  const { data: fiscalSnapshots } = useQuery({
    queryKey: ['deposit-inbox-fiscal-snapshots'],
    queryFn: getFiscalBalanceSnapshots,
    staleTime: 60 * 60 * 1000,
  })
  const { data: remoteReviewQueue, refetch: refetchRemoteReviewQueue } = useQuery({
    queryKey: ['deposit-inbox-review-queue'],
    queryFn: listAutoDepositReviewQueue,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const resolvedInvoices = useMemo(
    () => buildResolvedReceivableInvoices(invoices, customers, todayDate()),
    [invoices, customers],
  )

  const ledgers = useMemo(
    () => buildCustomerReceivableLedger(customers, resolvedInvoices, legacySnapshots, fiscalSnapshots),
    [customers, resolvedInvoices, legacySnapshots, fiscalSnapshots],
  )

  const matchedEntries = useMemo(
    () => buildAutoDepositMatchResults(entries, customers, resolvedInvoices, ledgers),
    [entries, customers, resolvedInvoices, ledgers],
  )

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return matchedEntries.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      if (!keyword) return true
      return (
        item.entry.sender.toLowerCase().includes(keyword) ||
        item.entry.note.toLowerCase().includes(keyword) ||
        item.entry.sourceFile.toLowerCase().includes(keyword) ||
        item.candidates.some((candidate) => candidate.customerName.toLowerCase().includes(keyword))
      )
    })
  }, [filter, matchedEntries, search])

  const summary = useMemo(() => ({
    total: matchedEntries.length,
    exact: matchedEntries.filter((item) => item.status === 'exact').length,
    review: matchedEntries.filter((item) => item.status === 'review').length,
    unmatched: matchedEntries.filter((item) => item.status === 'unmatched').length,
    applied: matchedEntries.filter((item) => item.status === 'applied').length,
    manualCompleted: matchedEntries.filter((item) => item.status === 'manual_completed').length,
    dismissed: matchedEntries.filter((item) => item.status === 'dismissed').length,
    held: matchedEntries.filter((item) => item.status === 'held').length,
  }), [matchedEntries])

  const remoteSummary = remoteReviewQueue?.summary ?? {
    total: 0,
    review: 0,
    unmatched: 0,
    resolved: 0,
    dismissed: 0,
  }

  const remoteItems = (remoteReviewQueue?.items ?? []).filter((item) => item.status === 'review' || item.status === 'unmatched')

  function persistEntries(nextEntries: AutoDepositInboxEntry[]) {
    setEntries(nextEntries)
    saveAutoDepositInbox(nextEntries)
  }

  async function applyCandidate(entry: AutoDepositInboxEntry, candidate: AutoDepositCandidate) {
    if (candidate.kind === 'invoice') await applyInvoiceCandidate(candidate, entry)
    else if (candidate.kind === 'customer') await applyCustomerDepositLedger(entry, candidate)
    else await applyLegacyCandidate(candidate, entry)

    return {
      ...entry,
      status: 'applied' as const,
      appliedAt: currentTimestamp(),
      appliedTargetKey: candidate.key,
    }
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    const incoming: AutoDepositInboxEntry[] = []
    try {
      for (const file of Array.from(fileList)) {
        const parsed = await parseAutoDepositFile(file)
        incoming.push(...parsed)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '입금 파일을 읽지 못했습니다.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (!incoming.length) {
      toast.error('업로드 파일에서 입금 데이터를 찾지 못했습니다.')
      return
    }
    const deduped = [...incoming, ...entries].filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index)
    persistEntries(deduped)

    const latestSettings = loadStoredCrmSettings()
    const shouldAutoApply = Boolean(latestSettings.auto_deposit_auto_apply_enabled)

    if (shouldAutoApply) {
      const matched = buildAutoDepositMatchResults(deduped, customers, resolvedInvoices, ledgers)
      const exactTargets = matched.filter((item) =>
        incoming.some((entry) => entry.id === item.entry.id) &&
        item.status === 'exact' &&
        item.candidates.length > 0
      )

      let appliedCount = 0
      let nextEntries = deduped
      for (const target of exactTargets) {
        try {
          const updated = await applyCandidate(target.entry, target.candidates[0])
          nextEntries = nextEntries.map((entry) => entry.id === updated.id ? updated : entry)
          appliedCount += 1
        } catch (error) {
          console.error(error)
        }
      }
      persistEntries(nextEntries)
      toast.success(
        appliedCount > 0
          ? `${incoming.length}건을 수집했고, 정확 일치 ${appliedCount}건은 자동 반영했습니다.`
          : `${incoming.length}건을 입금 반영 목록에 추가했습니다.`,
      )
    } else {
      toast.success(`${incoming.length}건을 입금 반영 목록에 추가했습니다.`)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function refreshAllViews(customerId?: number) {
    const tasks: Promise<unknown>[] = [
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['receivables'] }),
      qc.invalidateQueries({ queryKey: ['receivable-link-customers'] }),
      qc.invalidateQueries({ queryKey: ['dash-receivables'] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['transactions-crm'] }),
      qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] }),
      qc.invalidateQueries({ queryKey: ['deposit-inbox-customers'] }),
      qc.invalidateQueries({ queryKey: ['deposit-inbox-invoices'] }),
      qc.invalidateQueries({ queryKey: ['deposit-inbox-review-queue'] }),
      qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0]
          return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
        },
      }),
    ]
    if (customerId) {
      tasks.push(qc.invalidateQueries({ queryKey: ['customer', customerId] }))
      tasks.push(qc.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] }))
    }
    await Promise.allSettled(tasks)
  }

  function getLiveCandidateDetails(candidate: AutoDepositCandidate): AutoDepositCandidate {
    const customer = customers.find((item) => item.Id === candidate.customerId)
    if (candidate.kind === 'invoice' && candidate.invoiceId) {
      const invoice = resolvedInvoices.find((item) => item.Id === candidate.invoiceId)
      if (invoice) {
        return {
          ...candidate,
          key: candidate.key || `invoice-${candidate.invoiceId}`,
          customerName: candidate.customerName || customer?.name?.trim() || invoice.customer_name?.trim() || invoice.resolvedCustomerName,
          bookName: candidate.bookName ?? customer?.book_name?.trim(),
          remainingAmount: invoice.asOfRemaining,
        }
      }
    }
    if (candidate.kind === 'customer') {
      const ledger = ledgers.find((item) => item.customerId === candidate.customerId)
      if (ledger) {
        return {
          ...candidate,
          key: candidate.key || `customer-${candidate.customerId}`,
          customerName: candidate.customerName || customer?.name?.trim() || ledger.customerName,
          bookName: candidate.bookName ?? customer?.book_name?.trim(),
          remainingAmount: ledger.totalRemaining,
        }
      }
    }
    if (candidate.kind === 'legacy') {
      const ledger = ledgers.find((item) => item.customerId === candidate.customerId)
      if (ledger) {
        return {
          ...candidate,
          key: candidate.key || `legacy-${candidate.customerId}`,
          customerName: candidate.customerName || customer?.name?.trim() || ledger.customerName,
          bookName: candidate.bookName ?? customer?.book_name?.trim(),
          remainingAmount: ledger.legacyBaseline,
        }
      }
    }
    return {
      ...candidate,
      key: candidate.key || `${candidate.kind}-${candidate.invoiceId ?? candidate.customerId}`,
      bookName: candidate.bookName ?? customer?.book_name?.trim(),
    }
  }

  async function applyInvoiceCandidate(candidate: AutoDepositCandidate, entry: AutoDepositInboxEntry) {
    if (!candidate.invoiceId) throw new Error('명세표 대상 정보가 없습니다.')
    const invoice = await qc.ensureQueryData({
      queryKey: ['invoice', candidate.invoiceId],
      queryFn: () => getAllInvoices({ where: `(Id,eq,${candidate.invoiceId})`, limit: 1 }).then((rows) => rows[0] ?? null),
    })
    if (!invoice) throw new Error('명세표를 찾지 못했습니다.')

    const remaining = calcRemaining(invoice)
    if (entry.amount > remaining) throw new Error('현재 미수보다 큰 금액은 자동 반영할 수 없습니다.')

    const nextPaid = Math.min(invoice.total_amount ?? 0, (invoice.paid_amount ?? 0) + entry.amount)
    const nextRemaining = Math.max(0, remaining - entry.amount)
    const nextPaymentStatus = getInvoiceSettlementStatus({
      ...invoice,
      paid_amount: nextPaid,
    })
    const nextMemo = appendInvoicePaymentHistory(invoice.memo as string | undefined, {
      amount: entry.amount,
      date: entry.date,
      method: '계좌이체',
      operator: activeOperator?.operatorName,
      accountId: activeOperator?.id,
      accountLabel: activeOperator?.label,
      createdAt: currentTimestamp(),
      note: `입금 반영 · 입금자 ${entry.sender} · ${entry.sourceFile}`,
    })

    await updateInvoice(candidate.invoiceId, {
      paid_amount: nextPaid,
      current_balance: nextRemaining,
      payment_status: nextPaymentStatus,
      payment_method: '계좌이체',
      memo: nextMemo,
    })
  }

  async function applyCashToInvoice(invoice: Invoice, amount: number, entry: AutoDepositInboxEntry) {
    const remainingBefore = calcRemaining(invoice)
    const appliedAmount = Math.min(amount, remainingBefore)
    if (appliedAmount <= 0) return { appliedAmount: 0, invoice }

    const nextPaid = Math.min(invoice.total_amount ?? 0, (invoice.paid_amount ?? 0) + appliedAmount)
    const nextMemo = appendInvoicePaymentHistory(invoice.memo as string | undefined, {
      amount: appliedAmount,
      date: entry.date,
      method: '계좌이체',
      operator: activeOperator?.operatorName,
      accountId: activeOperator?.id,
      accountLabel: activeOperator?.label,
      createdAt: currentTimestamp(),
      note: `입금 반영 · 입금자 ${entry.sender} · ${entry.sourceFile}`,
    })
    const nextInvoice: Invoice = {
      ...invoice,
      paid_amount: nextPaid,
      memo: nextMemo,
    }
    nextInvoice.current_balance = calcRemaining(nextInvoice)
    nextInvoice.payment_status = calcPaymentStatus(nextInvoice)

    await updateInvoice(invoice.Id, {
      paid_amount: nextInvoice.paid_amount,
      current_balance: nextInvoice.current_balance,
      payment_status: nextInvoice.payment_status,
      payment_method: '계좌이체',
      memo: nextMemo,
    })

    return { appliedAmount, invoice: nextInvoice }
  }

  async function applyCustomerDepositLedger(entry: AutoDepositInboxEntry, candidate: AutoDepositCandidate) {
    const customerId = candidate.customerId
    if (!customerId) throw new Error('고객 대상 정보가 없습니다.')

    const invoices = await getAllInvoices({
      where: `(customer_id,eq,${customerId})`,
      sort: 'invoice_date',
    })
    let openInvoices = sortInvoicesForSettlement(
      invoices.filter((invoice) =>
        calcRemaining(invoice) > 0 &&
        isInvoiceEligibleForDepositDate(invoice, entry.date, candidate.invoiceId)
      ),
      candidate.invoiceId,
    )

    let cashRemaining = entry.amount
    let cashApplied = 0
    const touchedInvoiceIds: number[] = []

    for (const invoice of openInvoices) {
      if (cashRemaining <= 0) break
      const { appliedAmount, invoice: updatedInvoice } = await applyCashToInvoice(invoice, cashRemaining, entry)
      if (appliedAmount <= 0) continue
      cashRemaining -= appliedAmount
      cashApplied += appliedAmount
      touchedInvoiceIds.push(invoice.Id)
      openInvoices = openInvoices.map((item) => item.Id === invoice.Id ? updatedInvoice : item)
    }

    let legacyApplied = 0
    if (cashRemaining > 0) {
      const customerForLegacy = await getCustomer(customerId)
      const legacyRemaining = getLegacyReceivableBaselineFromSnapshots(customerForLegacy, legacySnapshots, fiscalSnapshots)
      legacyApplied = Math.min(cashRemaining, legacyRemaining)
      if (legacyApplied > 0) {
        await appendLegacySettlement(customerId, legacyApplied, entry.date, customerForLegacy)
        cashRemaining -= legacyApplied
      }
    }

    const depositAdded = Math.max(0, cashRemaining)
    if (depositAdded > 0) {
      const latestCustomer = await getCustomer(customerId)
      const latestMeta = parseCustomerAccountingMeta(latestCustomer.memo as string | undefined)
      let nextDepositBalance = latestMeta.depositBalance
      let nextMemo = latestCustomer.memo as string | undefined

      nextDepositBalance += depositAdded
      nextMemo = appendCustomerAccountingEvent(
        nextMemo,
        {
          type: 'deposit_added',
          amount: depositAdded,
          date: entry.date,
          method: '계좌이체',
          operator: activeOperator?.operatorName,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          createdAt: currentTimestamp(),
          relatedInvoiceId: candidate.invoiceId,
          note: `입금 반영 후 남은 금액 ${depositAdded.toLocaleString()}원 · 기존 예치금 자동상계는 MVP에서 차단`,
        },
        { depositBalance: nextDepositBalance },
      )

      await updateCustomer(customerId, { memo: nextMemo })
    }

    try {
      await recalcCustomerStats(customerId)
    } catch (error) {
      console.warn('[DepositInbox] 고객 통계 재계산 실패', error)
    }

    return {
      customerId,
      cashApplied,
      depositUsed: 0,
      legacyApplied,
      depositAdded,
      touchedInvoiceIds: Array.from(new Set(touchedInvoiceIds)),
    }
  }

  async function applyLegacyCandidate(candidate: AutoDepositCandidate, entry: AutoDepositInboxEntry) {
    await appendLegacySettlement(candidate.customerId, entry.amount, entry.date)
  }

  async function appendLegacySettlement(customerId: number, amount: number, date: string, customerOverride?: Awaited<ReturnType<typeof getCustomer>>) {
    const customer = customerOverride ?? await getCustomer(customerId)
    const memoState = parseLegacyReceivableMemo(customer.memo as string | undefined)
    const nextMemo = serializeLegacyReceivableMemo(customer.memo as string | undefined, {
      settledAmount: memoState.settledAmount + amount,
      settlements: [
        ...memoState.settlements,
        {
          amount,
          date,
          method: '계좌이체',
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ],
    })
    await updateCustomer(customerId, { memo: nextMemo })
  }

  async function handleApply(entry: AutoDepositInboxEntry, candidate: AutoDepositCandidate) {
    setIsApplyingKey(entry.id)
    try {
      const updated = await applyCandidate(entry, candidate)
      const nextEntries = entries.map((item) => (item.id === entry.id ? updated : item))
      persistEntries(nextEntries)
      toast.success('입금 반영을 완료했습니다.')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '입금 반영 중 오류가 발생했습니다.')
    } finally {
      setIsApplyingKey(null)
    }
  }

  function resolveLocalEntry(
    entry: AutoDepositInboxEntry,
    status: Extract<AutoDepositInboxEntry['status'], 'manual_completed' | 'dismissed' | 'held'>,
    resolvedReason: string,
  ) {
    const nextEntry: AutoDepositInboxEntry = {
      ...entry,
      status,
      resolvedAt: currentTimestamp(),
      resolvedBy: activeOperator?.label ?? 'manual',
      resolvedReason,
    }
    persistEntries(entries.map((item) => (item.id === entry.id ? nextEntry : item)))
  }

  function promptResolutionReason(title: string): string | null {
    const reason = window.prompt(`${title}\n사유를 입력하세요.`)?.trim() ?? ''
    return reason || null
  }

  function handleManualComplete(entry: AutoDepositInboxEntry) {
    const reason = promptResolutionReason('장부 금액을 바꾸지 않고 수동 완료 처리합니다.')
    if (!reason) {
      toast.error('수동 완료 사유가 필요합니다.')
      return
    }
    resolveLocalEntry(entry, 'manual_completed', reason)
    toast.success('수동 완료로 보관했습니다. 명세표/고객 금액은 변경되지 않았습니다.')
  }

  function handleDismissLocalEntry(entry: AutoDepositInboxEntry) {
    const reason = promptResolutionReason('이 입금을 CRM 반영 대상에서 제외합니다.')
    if (!reason) {
      toast.error('제외 사유가 필요합니다.')
      return
    }
    if (reason === '기타' || reason.length < 2) {
      toast.error('제외 사유를 구체적으로 입력해주세요.')
      return
    }
    if (entry.amount >= 1_000_000) {
      const ok = window.confirm(
        `이 입금을 CRM 반영 대상에서 제외할까요?\n\n입금자: ${entry.sender}\n금액: ${entry.amount.toLocaleString()}원\n제외 사유: ${reason}\n\n은행 원본 내역은 삭제되지 않습니다.\n제외 이력은 마감 점검에서 다시 확인할 수 있습니다.`,
      )
      if (!ok) return
    }
    resolveLocalEntry(entry, 'dismissed', reason)
    toast.success('제외 완료로 보관했습니다. 원본 수집 내역은 삭제하지 않았습니다.')
  }

  function handleHoldEntry(entry: AutoDepositInboxEntry) {
    const reason = promptResolutionReason('고객 확인 전까지 입금 건을 보류합니다.')
    if (!reason) {
      toast.error('보류 사유가 필요합니다.')
      return
    }
    resolveLocalEntry(entry, 'held', reason)
    toast.success('보류 상태로 저장했습니다.')
  }

  function buildEntryFromReviewItem(item: AutoDepositReviewQueueItem): AutoDepositInboxEntry {
    return {
      id: item.queueId,
      date: item.occurredAt?.slice(0, 10) || todayDate(),
      sender: item.sender,
      amount: item.amount,
      note: item.reason || item.source || '자동입금 검토 큐',
      sourceFile: item.source || '자동입금 검토 큐',
      status: 'pending',
    }
  }

  function getSelectedReviewCandidate(item: AutoDepositReviewQueueItem): AutoDepositCandidate | undefined {
    const hydratedCandidates = item.candidates.map(getLiveCandidateDetails)
    const selectedKey = selectedReviewCandidates[item.queueId] ?? hydratedCandidates[0]?.key
    return hydratedCandidates.find((candidate) => candidate.key === selectedKey) ?? hydratedCandidates[0]
  }

  async function handleApplyReviewItem(item: AutoDepositReviewQueueItem, candidate: AutoDepositCandidate) {
    setIsResolvingReviewKey(item.queueId)
    try {
      const entry = buildEntryFromReviewItem(item)
      const liveCandidate = getLiveCandidateDetails(candidate)
      if (liveCandidate.kind === 'invoice' || liveCandidate.kind === 'customer') {
        await applyCustomerDepositLedger(entry, liveCandidate)
      } else {
        await applyCandidate(entry, liveCandidate)
        if (liveCandidate.customerId) {
          try {
            await recalcCustomerStats(liveCandidate.customerId)
          } catch (error) {
            console.warn('[DepositInbox] 고객 통계 재계산 실패', error)
          }
        }
      }
      await dismissAutoDepositReviewQueueItem(item.queueId, activeOperator?.label ?? 'manual', 'CRM 검토 큐에서 입금 반영 완료')
      await refreshAllViews(liveCandidate.customerId)
      await refetchRemoteReviewQueue()
      toast.success('검토 큐 입금 반영을 완료했습니다.')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '검토 큐 입금 반영 중 오류가 발생했습니다.')
    } finally {
      setIsResolvingReviewKey(null)
    }
  }

  async function handleDismissReviewItem(item: AutoDepositReviewQueueItem) {
    setIsResolvingReviewKey(item.queueId)
    try {
      await dismissAutoDepositReviewQueueItem(item.queueId, activeOperator?.label ?? 'manual', 'CRM 검토 큐에서 제외 처리')
      await refetchRemoteReviewQueue()
      toast.success('검토 큐에서 제외했습니다.')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '검토 큐 제외 처리 중 오류가 발생했습니다.')
    } finally {
      setIsResolvingReviewKey(null)
    }
  }

  function handleRemove(entryId: string) {
    const target = entries.find((entry) => entry.id === entryId)
    if (!target) return
    const safeToHide = target.status === 'applied' || target.status === 'manual_completed' || target.status === 'dismissed'
    if (!safeToHide) {
      toast.error('미처리 입금은 삭제하지 말고 수동 완료, 제외 또는 보류로 남겨주세요.')
      return
    }
    persistEntries(entries.filter((entry) => entry.id !== entryId))
  }

  function handleClearInbox() {
    const unsafeCount = entries.filter((entry) =>
      entry.status !== 'applied' &&
      entry.status !== 'manual_completed' &&
      entry.status !== 'dismissed'
    ).length
    if (unsafeCount > 0) {
      const ok = window.confirm(
        `미처리/보류 입금 ${unsafeCount.toLocaleString()}건이 있습니다.\n단순 비우기보다 제외·수동 완료·보류 처리를 권장합니다.\n\n그래도 반영 완료/수동 완료/제외 완료 건만 숨길까요?`,
      )
      if (!ok) return
      persistEntries(entries.filter((entry) =>
        entry.status !== 'applied' &&
        entry.status !== 'manual_completed' &&
        entry.status !== 'dismissed'
      ))
      return
    }
    persistEntries([])
  }

  function getSelectedCandidate(item: typeof filteredEntries[number]): AutoDepositCandidate | undefined {
    const selectedKey = selectedCandidates[item.entry.id] ?? item.candidates[0]?.key
    return item.candidates.find((candidate) => candidate.key === selectedKey) ?? item.candidates[0]
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{titleOverride ?? '입금 반영'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {descriptionOverride ?? '농협 CSV 또는 XLSX 파일을 먼저 올리고, 자동으로 잡힌 후보를 검토한 뒤 안전하게 입금 반영합니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(event) => { void handleFilesSelected(event.target.files) }}
          />
          <Button type="button" onClick={() => fileInputRef.current?.click()} data-guide-id="deposit-upload-button">
            <Upload className="mr-2 h-4 w-4" />
            입금 파일 업로드
          </Button>
          <Button type="button" variant="outline" onClick={handleClearInbox}>
            <Trash2 className="mr-2 h-4 w-4" />
            목록 비우기
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7" data-guide-id="deposit-summary">
        {[
          { label: '전체 건수', value: `${summary.total}건` },
          { label: '정확 후보', value: `${summary.exact}건` },
          { label: '검토 필요', value: `${summary.review}건` },
          { label: '미매칭', value: `${summary.unmatched}건` },
          { label: '반영 완료', value: `${summary.applied}건` },
          { label: '수동 완료', value: `${summary.manualCompleted}건` },
          { label: '제외/보류', value: `${summary.dismissed + summary.held}건` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">자동입금 검토 큐</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              이메일 자동수집에서 정확 일치하지 않은 입금은 여기로 들어옵니다. 부분 입금과 초과 입금은 이 화면에서 고객을 확정하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchRemoteReviewQueue()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            검토 큐 새로고침
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {[
            { label: '대기 전체', value: `${remoteSummary.total}건` },
            { label: '검토 필요', value: `${remoteSummary.review}건` },
            { label: '미매칭', value: `${remoteSummary.unmatched}건` },
            { label: '처리 완료/제외', value: `${remoteSummary.resolved + remoteSummary.dismissed}건` },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border bg-gray-50 px-3 py-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">입금시각</th>
              <th className="px-4 py-3">입금자</th>
              <th className="px-4 py-3">금액</th>
              <th className="px-4 py-3">큐 상태</th>
              <th className="px-4 py-3">후보</th>
              <th className="px-4 py-3">처리</th>
            </tr>
          </thead>
          <tbody>
            {remoteItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  자동입금 검토 큐에 대기 중인 건이 없습니다.
                </td>
              </tr>
            ) : remoteItems.map((item) => {
              const selectedCandidate = getSelectedReviewCandidate(item)
              return (
                <tr key={item.queueId} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(item.occurredAt || '').replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.sender}</div>
                    <div className="text-xs text-muted-foreground">{item.source || 'auto_deposit'}</div>
                    {item.reason ? <div className="mt-1 text-xs text-muted-foreground">{item.reason}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.status === 'review'
                        ? 'bg-amber-100 text-amber-700'
                        : item.status === 'unmatched'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status === 'review' ? '검토 필요' : item.status === 'unmatched' ? '미매칭' : item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[320px]">
                    {item.candidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">후보를 찾지 못했습니다. 고객관리에서 별칭을 보강한 뒤 다시 확인하세요.</p>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={selectedCandidate?.key}
                          onValueChange={(value) => setSelectedReviewCandidates((prev) => ({ ...prev, [item.queueId]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="후보 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.candidates.map((candidate) => {
                              const liveCandidate = getLiveCandidateDetails(candidate)
                              return (
                              <SelectItem key={liveCandidate.key} value={liveCandidate.key}>
                                {liveCandidate.customerName} · {liveCandidate.kind === 'invoice' ? '새 입력 명세표' : liveCandidate.kind === 'customer' ? '고객 전체 정산' : '기존 장부'} · {(liveCandidate.remainingAmount ?? item.amount).toLocaleString()}원
                              </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        {selectedCandidate ? (
                          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                            <div className="font-medium text-gray-900">
                              {selectedCandidate.customerName}
                              {selectedCandidate.bookName ? ` · ${selectedCandidate.bookName}` : ''}
                            </div>
                            <div className="mt-1">{selectedCandidate.reason}</div>
                            <div className="mt-1 text-muted-foreground">
                              {selectedCandidate.kind === 'invoice'
                                ? `새 입력 명세표 ${selectedCandidate.invoiceNo ?? ''} 잔액 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`
                                : selectedCandidate.kind === 'customer'
                                  ? `고객 전체 미수 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`
                                : `기존 장부 받을 돈 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!selectedCandidate || isResolvingReviewKey === item.queueId}
                        onClick={() => selectedCandidate && void handleApplyReviewItem(item, selectedCandidate)}
                      >
                        {isResolvingReviewKey === item.queueId ? '처리 중...' : '검토 반영'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        disabled={isResolvingReviewKey === item.queueId}
                        onClick={() => void handleDismissReviewItem(item)}
                      >
                        검토 제외
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">현재 자동입금 운영 기준</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              설정에서 지정한 계좌와 수집 방식을 기준으로 이 화면의 검토 흐름이 동작합니다.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            현재 작업 계정: <span className="font-medium text-gray-900">{activeOperator?.label ?? '미설정'}</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
          <div>수집 방식: {getAutoDepositSourceLabel(settings.auto_deposit_source as string | undefined)}</div>
          <div>계좌: {[settings.auto_deposit_bank_name, settings.auto_deposit_account_number, settings.auto_deposit_account_holder].filter(Boolean).join(' / ') || '미설정'}</div>
          <div>정확 금액 자동매칭: {settings.auto_deposit_exact_match_enabled ? '사용' : '미사용'}</div>
          <div>정확 일치 자동반영: {settings.auto_deposit_auto_apply_enabled ? '허용' : '검토 후 반영'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#d8e4d6] bg-[#f8faf7] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#2f4d37]">입금 처리 안전장치</h3>
            <p className="mt-1 text-xs text-[#5f6f60]">
              정확 후보도 기본은 운영자 확인 후 반영합니다. 동명이인·다중 후보·가족명의·플랫폼 정산은 검토 필요 또는 제외/보류로 남깁니다.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-[#4f6748] md:grid-cols-3">
            <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">수동 완료: 장부 금액 변경 없음</div>
            <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">제외 완료: 원본 내역 보존</div>
            <div className="rounded-lg border border-white/80 bg-white/80 px-3 py-2">초과분: 예치금/환불대기 분리 검토</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between" data-guide-id="deposit-filters">
        <div className="grid gap-3 md:grid-cols-[180px_260px]">
          <div>
            <Label className="text-xs text-muted-foreground">상태</Label>
            <Select value={filter} onValueChange={(value: LocalInboxFilter) => setFilter(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="exact">정확 후보</SelectItem>
                <SelectItem value="review">검토 필요</SelectItem>
                <SelectItem value="unmatched">미매칭</SelectItem>
                <SelectItem value="applied">반영 완료</SelectItem>
                <SelectItem value="manual_completed">수동 완료</SelectItem>
                <SelectItem value="dismissed">제외 완료</SelectItem>
                <SelectItem value="held">보류</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">검색</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="입금자, 메모, 대상 고객 검색"
              className="mt-1"
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => persistEntries(loadAutoDepositInbox())}>
          <RefreshCw className="mr-2 h-4 w-4" />
          저장된 입금 목록 다시 불러오기
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden" data-guide-id="deposit-table">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">입금일</th>
              <th className="px-4 py-3">입금자</th>
              <th className="px-4 py-3">금액</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">자동 후보</th>
              <th className="px-4 py-3">반영</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  업로드된 입금 데이터가 없습니다.
                </td>
              </tr>
            ) : filteredEntries.map((item) => {
              const selectedCandidate = getSelectedCandidate(item)
              const customerMeta = selectedCandidate ? parseCustomerAccountingMeta(customers.find((customer) => customer.Id === selectedCandidate.customerId)?.memo as string | undefined) : null
              return (
                <tr key={item.entry.id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{item.entry.date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.entry.sender}</div>
                    <div className="text-xs text-muted-foreground">{item.entry.sourceFile}</div>
                    {item.entry.note ? <div className="mt-1 text-xs text-muted-foreground">{item.entry.note}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.entry.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getLocalStatusClass(item.status)}`}
                    >
                      {LOCAL_STATUS_LABELS[item.status]}
                    </span>
                    {item.entry.appliedAt ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {item.entry.appliedAt.slice(0, 16).replace('T', ' ')}
                      </div>
                    ) : null}
                    {item.entry.resolvedReason ? (
                      <div className="mt-2 max-w-40 text-xs text-muted-foreground">
                        사유: {item.entry.resolvedReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 min-w-[320px]">
                    {item.candidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground">자동 후보를 찾지 못했습니다. 고객명이나 금액을 다시 확인하세요.</p>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={selectedCandidate?.key}
                          onValueChange={(value) => setSelectedCandidates((prev) => ({ ...prev, [item.entry.id]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="후보 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.candidates.map((candidate) => (
                              <SelectItem key={candidate.key} value={candidate.key}>
                                {candidate.customerName} · {candidate.kind === 'invoice' ? '새 입력 명세표' : candidate.kind === 'customer' ? '고객 전체 정산' : '기존 장부'} · {candidate.amount.toLocaleString()}원
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedCandidate ? (
                          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                            <div className="font-medium text-gray-900">
                              {selectedCandidate.customerName}
                              {selectedCandidate.bookName ? ` · ${selectedCandidate.bookName}` : ''}
                            </div>
                            <div className="mt-1">{selectedCandidate.reason}</div>
                            <div className="mt-1 text-muted-foreground">
                              {selectedCandidate.kind === 'invoice'
                                ? `새 입력 명세표 ${selectedCandidate.invoiceNo ?? ''} 잔액 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`
                                : selectedCandidate.kind === 'customer'
                                  ? `고객 전체 미수 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`
                                : `기존 장부 받을 돈 ${selectedCandidate.remainingAmount?.toLocaleString() ?? 0}원`}
                            </div>
                            {customerMeta ? (
                              <div className="mt-1 text-muted-foreground">
                                예치금 {customerMeta.depositBalance.toLocaleString()}원 · 환불대기 {customerMeta.refundPendingBalance.toLocaleString()}원
                              </div>
                            ) : null}
                            {customerMeta?.autoDepositPriority ? (
                              <div className="mt-1 text-muted-foreground">
                                자동입금 우선순위: {customerMeta.autoDepositPriority}
                              </div>
                            ) : null}
                            {customerMeta?.depositorAliases?.length ? (
                              <div className="mt-1 text-muted-foreground">
                                입금자명 별칭: {customerMeta.depositorAliases.join(', ')}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!selectedCandidate || item.entry.status !== 'pending' || isApplyingKey === item.entry.id}
                        onClick={() => selectedCandidate && void handleApply(item.entry, selectedCandidate)}
                      >
                        {isApplyingKey === item.entry.id ? '반영 중...' : item.entry.status !== 'pending' ? '처리 완료' : '입금 반영'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={item.entry.status !== 'pending'}
                        onClick={() => handleManualComplete(item.entry)}
                      >
                        수동 완료
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={item.entry.status !== 'pending'}
                        onClick={() => handleHoldEntry(item.entry)}
                      >
                        보류
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        disabled={item.entry.status !== 'pending'}
                        onClick={() => handleDismissLocalEntry(item.entry)}
                      >
                        제외
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-600"
                        onClick={() => handleRemove(item.entry.id)}
                      >
                        완료건 숨기기
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
