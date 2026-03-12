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
import { getFiscalBalanceSnapshots, getLegacyCustomerSnapshots, parseLegacyReceivableMemo, serializeLegacyReceivableMemo } from '@/lib/legacySnapshots'
import { parseCustomerAccountingMeta } from '@/lib/accountingMeta'
import { loadActiveWorkOperatorProfile, loadStoredCrmSettings } from '@/lib/settings'
import { buildCustomerReceivableLedger, buildResolvedReceivableInvoices } from '@/lib/receivables'
import {
  buildAutoDepositMatchResults,
  loadAutoDepositInbox,
  parseAutoDepositFile,
  saveAutoDepositInbox,
  type AutoDepositCandidate,
  type AutoDepositInboxEntry,
} from '@/lib/autoDeposits'

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
  return Math.max(0, (inv.total_amount ?? 0) - (inv.paid_amount ?? 0))
}

function getAutoDepositSourceLabel(value: string | undefined): string {
  if (value === 'bank_api') return '은행 API 연동'
  if (value === 'review_only') return '검토 전용 연결'
  return '수동 파일 업로드'
}

export function DepositInbox() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [entries, setEntries] = useState<AutoDepositInboxEntry[]>(() => loadAutoDepositInbox())
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({})
  const [isApplyingKey, setIsApplyingKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'exact' | 'review' | 'unmatched' | 'applied'>('all')
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
  }), [matchedEntries])

  function persistEntries(nextEntries: AutoDepositInboxEntry[]) {
    setEntries(nextEntries)
    saveAutoDepositInbox(nextEntries)
  }

  async function applyCandidate(entry: AutoDepositInboxEntry, candidate: AutoDepositCandidate) {
    if (candidate.kind === 'invoice') await applyInvoiceCandidate(candidate, entry)
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
    for (const file of Array.from(fileList)) {
      const parsed = await parseAutoDepositFile(file)
      incoming.push(...parsed)
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
          : `${incoming.length}건을 입금 수집함에 추가했습니다.`,
      )
    } else {
      toast.success(`${incoming.length}건을 입금 수집함에 추가했습니다.`)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function refreshAllViews(customerId?: number) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['customer', customerId] }),
      qc.invalidateQueries({ queryKey: ['receivables'] }),
      qc.invalidateQueries({ queryKey: ['receivable-link-customers'] }),
      qc.invalidateQueries({ queryKey: ['dash-receivables'] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['transactions-crm'] }),
      qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] }),
      qc.invalidateQueries({ queryKey: ['deposit-inbox-customers'] }),
      qc.invalidateQueries({ queryKey: ['deposit-inbox-invoices'] }),
      qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0]
          return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
        },
      }),
    ])
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
    const nextPaymentStatus =
      nextRemaining <= 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid'

    await updateInvoice(candidate.invoiceId, {
      paid_amount: nextPaid,
      current_balance: nextRemaining,
      payment_status: nextPaymentStatus,
      payment_method: '계좌이체',
      paid_date: entry.date,
    })
    if (invoice.customer_id) {
      try { await recalcCustomerStats(invoice.customer_id as number) } catch {}
    }
    await refreshAllViews(typeof invoice.customer_id === 'number' ? invoice.customer_id : undefined)
  }

  async function applyLegacyCandidate(candidate: AutoDepositCandidate, entry: AutoDepositInboxEntry) {
    const customer = await getCustomer(candidate.customerId)
    const memoState = parseLegacyReceivableMemo(customer.memo as string | undefined)
    const nextMemo = serializeLegacyReceivableMemo(customer.memo as string | undefined, {
      settledAmount: memoState.settledAmount + entry.amount,
      settlements: [
        ...memoState.settlements,
        {
          amount: entry.amount,
          date: entry.date,
          method: '계좌이체',
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ],
    })
    await updateCustomer(candidate.customerId, { memo: nextMemo })
    await recalcCustomerStats(candidate.customerId)
    await refreshAllViews(candidate.customerId)
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

  function handleRemove(entryId: string) {
    persistEntries(entries.filter((entry) => entry.id !== entryId))
  }

  function getSelectedCandidate(item: typeof filteredEntries[number]): AutoDepositCandidate | undefined {
    const selectedKey = selectedCandidates[item.entry.id] ?? item.candidates[0]?.key
    return item.candidates.find((candidate) => candidate.key === selectedKey) ?? item.candidates[0]
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">입금 수집함</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            농협 파일을 먼저 올리고, 자동으로 잡힌 후보를 검토한 뒤 안전하게 입금 반영합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => { void handleFilesSelected(event.target.files) }}
          />
          <Button type="button" onClick={() => fileInputRef.current?.click()} data-guide-id="deposit-upload-button">
            <Upload className="mr-2 h-4 w-4" />
            입금 파일 업로드
          </Button>
          <Button type="button" variant="outline" onClick={() => persistEntries([])}>
            <Trash2 className="mr-2 h-4 w-4" />
            수집함 비우기
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5" data-guide-id="deposit-summary">
        {[
          { label: '전체 건수', value: `${summary.total}건` },
          { label: '정확 후보', value: `${summary.exact}건` },
          { label: '검토 필요', value: `${summary.review}건` },
          { label: '미매칭', value: `${summary.unmatched}건` },
          { label: '반영 완료', value: `${summary.applied}건` },
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

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between" data-guide-id="deposit-filters">
        <div className="grid gap-3 md:grid-cols-[180px_260px]">
          <div>
            <Label className="text-xs text-muted-foreground">상태</Label>
            <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="exact">정확 후보</SelectItem>
                <SelectItem value="review">검토 필요</SelectItem>
                <SelectItem value="unmatched">미매칭</SelectItem>
                <SelectItem value="applied">반영 완료</SelectItem>
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
          저장된 수집함 다시 불러오기
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
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.status === 'exact'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'review'
                            ? 'bg-amber-100 text-amber-700'
                            : item.status === 'applied'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status === 'exact' ? '정확 후보' : item.status === 'review' ? '검토 필요' : item.status === 'applied' ? '반영 완료' : '미매칭'}
                    </span>
                    {item.entry.appliedAt ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {item.entry.appliedAt.slice(0, 16).replace('T', ' ')}
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
                                {candidate.customerName} · {candidate.kind === 'invoice' ? '새 입력 명세표' : '기존 장부'} · {candidate.amount.toLocaleString()}원
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
                        disabled={!selectedCandidate || item.status === 'applied' || isApplyingKey === item.entry.id}
                        onClick={() => selectedCandidate && void handleApply(item.entry, selectedCandidate)}
                      >
                        {isApplyingKey === item.entry.id ? '반영 중...' : item.status === 'applied' ? '반영 완료' : '입금 반영'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemove(item.entry.id)}
                      >
                        수집함에서 제거
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
