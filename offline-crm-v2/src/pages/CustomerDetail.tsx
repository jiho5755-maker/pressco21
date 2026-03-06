import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getCustomer, getTxHistory, getInvoices, updateCustomer } from '@/lib/api'
import { printPeriodReport } from '@/lib/print'
import { STATUS_COLORS, CUSTOMER_TYPE_LABELS, GRADE_COLORS } from '@/lib/constants'

const TX_PAGE = 50

// ── 날짜 유틸리티 ──────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function thisMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ── 거래내역 쿼리 (모든 tx_type, 페이지네이션) ──────────
function useCustomerTxPage(name: string | undefined, offset: number) {
  return useQuery({
    queryKey: ['txHistoryPage', name, offset],
    queryFn: () =>
      getTxHistory({
        where: `(customer_name,eq,${name})`,
        sort: '-tx_date',
        limit: TX_PAGE,
        offset,
      }),
    enabled: !!name,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

// ── 차트용 출고 전체 (최대 1,000건) ──────────────────────
function useCustomerTxAll(name: string | undefined) {
  return useQuery({
    queryKey: ['txHistoryAll', name],
    queryFn: () =>
      getTxHistory({
        where: `(customer_name,eq,${name})~and(tx_type,eq,출고)`,
        sort: '-tx_date',
        limit: 1000,
      }),
    enabled: !!name,
    staleTime: 10 * 60_000,
  })
}

// TX 유형 배지 색상
const TX_TYPE_STYLE: Record<string, string> = {
  출고: 'bg-blue-50 text-blue-700',
  입금: 'bg-green-50 text-green-700',
  반입: 'bg-orange-50 text-orange-700',
  메모: 'bg-gray-50 text-gray-600',
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerId = Number(id)
  const queryClient = useQueryClient()
  const [txOffset, setTxOffset] = useState(0)
  const [gradeEditMode, setGradeEditMode] = useState(false)
  const [editGrade, setEditGrade] = useState('')
  const [editQual, setEditQual] = useState('')

  // 기간 매출 필터 상태 (명세표 탭)
  const [dateFrom, setDateFrom] = useState(thisMonthStart)
  const [dateTo, setDateTo] = useState(todayStr)

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: !!customerId,
    staleTime: 10 * 60_000,
  })

  const { mutate: saveGrade, isPending: savingGrade } = useMutation({
    mutationFn: () =>
      updateCustomer(customerId, {
        member_grade: editGrade || undefined,
        grade_qualification: editQual,
        is_ambassador: editGrade === 'AMBASSADOR',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setGradeEditMode(false)
    },
  })

  const { data: txAll } = useCustomerTxAll(customer?.name)
  const { data: txPage } = useCustomerTxPage(customer?.name, txOffset)

  // 명세표 + 거래내역 병합용: 최대 500건 페치
  const { data: invoiceData } = useQuery({
    queryKey: ['invoices-customer', customer?.name],
    queryFn: () =>
      getInvoices({
        where: `(customer_name,eq,${customer!.name})`,
        sort: '-invoice_date',
        limit: 500,
      }),
    enabled: !!customer?.name,
  })

  // ── 기간 매출 필터 (명세표 탭) ────────────────────────
  const filteredInvoices = useMemo(
    () =>
      (invoiceData?.list ?? []).filter((inv) => {
        const d = (inv.invoice_date ?? '').slice(0, 10)
        return d >= dateFrom && d <= dateTo
      }),
    [invoiceData, dateFrom, dateTo]
  )

  // 레거시 txHistory 기간 필터 (출고 건만, txAll에서 클라이언트 필터링)
  const filteredLegacyTx = useMemo(
    () =>
      (txAll?.list ?? []).filter((tx) => {
        const d = (tx.tx_date ?? '').slice(0, 10)
        return d >= dateFrom && d <= dateTo
      }),
    [txAll, dateFrom, dateTo]
  )

  const periodStats = useMemo(() => {
    // CRM v2 명세표 합산
    const crmSales = filteredInvoices.reduce((s, inv) => s + (inv.total_amount ?? 0), 0)
    const received = filteredInvoices.reduce((s, inv) => s + (inv.paid_amount ?? 0), 0)
    const outstanding = crmSales - received
    // 레거시 출고 합산 (txAll에서 가져옴)
    const legacySales = filteredLegacyTx.reduce((s, tx) => s + (tx.amount ?? 0), 0)
    return {
      crmSales, received, outstanding,
      crmCount: filteredInvoices.length,
      legacySales,
      legacyCount: filteredLegacyTx.length,
      totalSales: crmSales + legacySales,
    }
  }, [filteredInvoices, filteredLegacyTx])

  // ── 기간 프리셋 ───────────────────────────────────────
  function applyPreset(preset: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear') {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    switch (preset) {
      case 'thisMonth':
        setDateFrom(`${y}-${String(m).padStart(2, '0')}-01`)
        setDateTo(todayStr())
        break
      case 'lastMonth': {
        const lm = m === 1 ? 12 : m - 1
        const ly = m === 1 ? y - 1 : y
        const lastDay = new Date(ly, lm, 0).getDate()
        setDateFrom(`${ly}-${String(lm).padStart(2, '0')}-01`)
        setDateTo(`${ly}-${String(lm).padStart(2, '0')}-${lastDay}`)
        break
      }
      case 'thisQuarter': {
        const q = Math.ceil(m / 3)
        const qStart = (q - 1) * 3 + 1
        setDateFrom(`${y}-${String(qStart).padStart(2, '0')}-01`)
        setDateTo(todayStr())
        break
      }
      case 'thisYear':
        setDateFrom(`${y}-01-01`)
        setDateTo(todayStr())
        break
    }
  }

  // ── 거래내역 탭: CRM 명세표 + 레거시 txHistory 병합 ──
  const mergedHistory = useMemo(() => {
    type Row = {
      key: string
      date: string
      txType: string
      amount: number
      memo: string
      isCrm: boolean
    }

    // 레거시 txHistory (현재 페이지)
    const txRows: Row[] = (txPage?.list ?? []).map((tx) => ({
      key: `tx-${tx.Id}`,
      date: tx.tx_date?.slice(0, 10) ?? '',
      txType: tx.tx_type ?? '-',
      amount: tx.amount ?? 0,
      memo: tx.memo || tx.slip_no || '-',
      isCrm: false,
    }))

    // CRM v2 명세표 → 출고 행
    const invRows: Row[] = []
    for (const inv of invoiceData?.list ?? []) {
      invRows.push({
        key: `inv-${inv.Id}`,
        date: inv.invoice_date?.slice(0, 10) ?? '',
        txType: '출고',
        amount: inv.total_amount ?? 0,
        memo: inv.invoice_no ?? '-',
        isCrm: true,
      })
      // 입금 행 (paid_amount > 0 인 경우)
      if ((inv.paid_amount ?? 0) > 0) {
        invRows.push({
          key: `inv-paid-${inv.Id}`,
          date: inv.invoice_date?.slice(0, 10) ?? '',
          txType: '입금',
          amount: inv.paid_amount ?? 0,
          memo: inv.invoice_no ?? '-',
          isCrm: true,
        })
      }
    }

    // 날짜 내림차순 정렬 후 상위 100건
    return [...invRows, ...txRows]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 100)
  }, [txPage, invoiceData])

  // ── 차트 데이터 ───────────────────────────────────────
  const chartData = (() => {
    const byYear: Record<string, number> = {}
    txAll?.list.forEach((tx) => {
      const year = (tx.tx_date ?? '').slice(0, 4)
      if (year) byYear[year] = (byYear[year] ?? 0) + (tx.amount ?? 0)
    })
    return Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amount]) => ({ year, amount }))
  })()

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground flex items-center gap-2">
        <span className="animate-spin">⏳</span> 불러오는 중...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
        </Button>
        <p className="mt-4 text-red-500">고객 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const status = customer.customer_status
  const effectiveGrade = customer.is_ambassador ? 'AMBASSADOR' : (customer.member_grade ?? '')
  const outstandingBalance = (customer.outstanding_balance as number | undefined) ?? 0

  return (
    <div className="p-6">
      {/* 뒤로 가기 */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
      </Button>

      {/* 헤더 */}
      <div className="flex items-start gap-6 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            {status && STATUS_COLORS[status] && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[status].bg }}
              >
                {STATUS_COLORS[status].label}
              </span>
            )}
            {effectiveGrade && GRADE_COLORS[effectiveGrade] && (
              <span
                className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
              >
                {effectiveGrade === 'AMBASSADOR' && '★'}
                {GRADE_COLORS[effectiveGrade].label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {CUSTOMER_TYPE_LABELS[customer.customer_type ?? ''] ?? customer.customer_type ?? '유형 미분류'}
          </p>
        </div>

        {/* 요약 stat 카드 */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: '총 거래 건수', value: `${(customer.total_order_count ?? 0).toLocaleString()}건`, red: false },
            { label: '총 매출', value: `${(customer.total_order_amount ?? 0).toLocaleString()}원`, red: false },
            { label: '미수금', value: `${outstandingBalance.toLocaleString()}원`, red: outstandingBalance > 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border px-4 py-3 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.red ? 'text-red-600' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="history">거래내역</TabsTrigger>
          <TabsTrigger value="chart">매출차트</TabsTrigger>
          <TabsTrigger value="invoices">명세표 · 기간매출</TabsTrigger>
        </TabsList>

        {/* ─── 기본정보 ─── */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { label: '전화', value: customer.phone },
                  { label: '모바일', value: (customer as Record<string, unknown>)['mobile'] as string },
                  { label: '이메일', value: customer.email },
                  { label: '사업자번호', value: customer.biz_no },
                  { label: '주소', value: customer.address1 },
                  { label: '주소2', value: (customer as Record<string, unknown>)['address2'] as string },
                  { label: '최초거래일', value: customer.first_order_date?.slice(0, 10) },
                  { label: '최종거래일', value: customer.last_order_date?.slice(0, 10) },
                  { label: '메모', value: (customer as Record<string, unknown>)['memo'] as string },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                    <dd className="truncate">{value || '-'}</dd>
                  </div>
                ))}
              </dl>

              {/* 등급 관리 */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">회원 등급</h4>
                  {!gradeEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditGrade(effectiveGrade)
                        setEditQual((customer.grade_qualification as string) ?? '')
                        setGradeEditMode(true)
                      }}
                    >
                      변경
                    </Button>
                  )}
                </div>

                {gradeEditMode ? (
                  <div className="space-y-3">
                    <Select value={editGrade} onValueChange={setEditGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="등급 선택 (없으면 비워두세요)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">등급 없음</SelectItem>
                        {Object.entries(GRADE_COLORS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k === 'AMBASSADOR' ? `★ ${v.label}` : v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="자격 근거 (예: 파트너 계약 완료 2024-01, VIP 기준 충족)"
                      value={editQual}
                      onChange={(e) => setEditQual(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveGrade()} disabled={savingGrade}>
                        {savingGrade ? '저장 중...' : '저장'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setGradeEditMode(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {effectiveGrade && GRADE_COLORS[effectiveGrade] ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
                        >
                          {effectiveGrade === 'AMBASSADOR' && '★'}
                          {GRADE_COLORS[effectiveGrade].label}
                        </span>
                        {(customer.grade_qualification as string) && (
                          <span className="text-muted-foreground text-xs">
                            {customer.grade_qualification as string}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">등급 없음</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 거래내역 (CRM v2 명세표 + 레거시 txHistory 병합) ─── */}
        <TabsContent value="history">
          <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs space-y-1">
            <p className="font-medium text-blue-800">거래내역 기재 기준</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-blue-700 mt-1">
              <span><span className="font-medium">출고</span> — 거래명세표 발행 (CRM) 또는 기존 출고 기록</span>
              <span><span className="font-medium">입금</span> — 수금 처리 시 (명세표의 입금액)</span>
              <span><span className="font-medium">반입</span> — 반품/반입 건 (레거시 데이터)</span>
              <span><span className="font-medium">메모</span> — 참고사항 기재 (레거시 데이터)</span>
            </div>
            <p className="text-blue-600 pt-0.5">
              <span className="font-medium">[CRM]</span> 배지 = 이 시스템에서 발행한 명세표 · 배지 없음 = 기존 거래 데이터
            </p>
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">거래일</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">적요 / 전표번호</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-32">금액</th>
                </tr>
              </thead>
              <tbody>
                {mergedHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      거래내역이 없습니다.
                    </td>
                  </tr>
                )}
                {mergedHistory.map((row) => (
                  <tr key={row.key} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 text-sm">{row.date || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TX_TYPE_STYLE[row.txType] ?? 'bg-gray-50 text-gray-600'}`}>
                        {row.txType}
                      </span>
                      {row.isCrm && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded bg-[#e8f0e8] text-[#3d6b4a] border border-[#b8d4b8]">
                          CRM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {row.memo}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {row.amount.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 레거시 txHistory 페이지네이션 */}
          {txPage && txPage.pageInfo.totalRows > TX_PAGE && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-muted-foreground">
                레거시 데이터 {txOffset + 1}–{Math.min(txOffset + TX_PAGE, txPage.pageInfo.totalRows)} /{' '}
                {txPage.pageInfo.totalRows}건
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset === 0}
                  onClick={() => setTxOffset((o) => Math.max(0, o - TX_PAGE))}
                >
                  이전
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset + TX_PAGE >= txPage.pageInfo.totalRows}
                  onClick={() => setTxOffset((o) => o + TX_PAGE)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── 매출차트 ─── */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">연도별 출고 매출 (레거시)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">차트 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                      tick={{ fontSize: 11 }}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '출고 매출']}
                    />
                    <Bar dataKey="amount" fill="#7d9675" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                * 레거시 출고 건 기준 집계. 최대 1,000건까지 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 명세표 · 기간 매출 ─── */}
        <TabsContent value="invoices">
          {/* 기간 필터 */}
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">기간 매출 조회</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs"
                onClick={() =>
                  printPeriodReport(
                    customer.name ?? '',
                    dateFrom,
                    dateTo,
                    filteredInvoices.map((inv) => ({
                      invoice_no: inv.invoice_no,
                      invoice_date: inv.invoice_date,
                      supply_amount: inv.supply_amount,
                      total_amount: inv.total_amount,
                      paid_amount: inv.paid_amount,
                      status: inv.status,
                    })),
                    filteredLegacyTx.map((tx) => ({
                      tx_date: tx.tx_date,
                      tx_type: tx.tx_type,
                      memo: tx.memo,
                      slip_no: tx.slip_no,
                      amount: tx.amount,
                    })),
                    periodStats,
                  )
                }
              >
                <Printer className="h-3.5 w-3.5" />
                PDF 출력
              </Button>
            </div>

            {/* 프리셋 버튼 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: '이번달', preset: 'thisMonth' as const },
                { label: '지난달', preset: 'lastMonth' as const },
                { label: '이번분기', preset: 'thisQuarter' as const },
                { label: '올해', preset: 'thisYear' as const },
              ].map(({ label, preset }) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(preset)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 날짜 직접 입력 */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm w-36"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>

            {/* KPI 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                {
                  label: '합계 매출',
                  value: `${periodStats.totalSales.toLocaleString()}원`,
                  sub: `CRM ${periodStats.crmCount}건 + 레거시 ${periodStats.legacyCount}건`,
                  red: false,
                },
                { label: 'CRM 명세표', value: `${periodStats.crmSales.toLocaleString()}원`, sub: `${periodStats.crmCount}건`, red: false },
                { label: '레거시 출고', value: `${periodStats.legacySales.toLocaleString()}원`, sub: `${periodStats.legacyCount}건 (최대 1,000건)`, red: false },
                {
                  label: '기간 미수금',
                  value: `${periodStats.outstanding.toLocaleString()}원`,
                  sub: 'CRM 명세표 기준',
                  red: periodStats.outstanding > 0,
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                  <p className={`text-base font-bold ${s.red ? 'text-red-600' : 'text-gray-900'}`}>
                    {s.value}
                  </p>
                  {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* CRM 명세표 목록 */}
          <div className="rounded-lg border bg-white overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2">
              <span className="text-xs font-semibold text-[#3d6b4a]">CRM 거래명세표</span>
              <span className="text-xs text-muted-foreground">{filteredInvoices.length}건</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">발행번호</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">발행일</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">공급가</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">합계</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">입금</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">수금</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                      해당 기간에 발행된 명세표가 없습니다.
                    </td>
                  </tr>
                )}
                {filteredInvoices.map((inv) => (
                  <tr key={inv.Id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {inv.invoice_no ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">{inv.invoice_date?.slice(0, 10) ?? '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-sm">
                      {(inv.supply_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-sm">
                      {(inv.total_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-sm text-green-700">
                      {(inv.paid_amount ?? 0) > 0 ? `${(inv.paid_amount ?? 0).toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-medium ${
                          inv.status === 'paid'
                            ? 'text-green-600'
                            : inv.status === 'partial'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {inv.status === 'paid' ? '완납' : inv.status === 'partial' ? '부분수금' : '미수금'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 레거시 거래내역 목록 (출고) */}
          {filteredLegacyTx.length > 0 && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">레거시 출고 내역</span>
                <span className="text-xs text-muted-foreground">{filteredLegacyTx.length}건</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">거래일</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">적요 / 전표번호</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLegacyTx.map((tx) => (
                    <tr key={tx.Id} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-sm">{(tx.tx_date ?? '').slice(0, 10) || '-'}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {tx.memo || tx.slip_no || '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-sm">
                        {(tx.amount ?? 0).toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
